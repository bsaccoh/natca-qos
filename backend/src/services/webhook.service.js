/**
 * NatCA CMS — Operator Webhook Dispatcher & Ticket Synchronization Service
 * Handles outbound HMAC-signed event notifications and inbound ticket updates.
 */
import crypto from 'crypto';
import { query, queryOne } from '../config/db.js';
import * as complaintSvc from '../modules/complaints/complaints.service.js';

/**
 * Register or update an operator's outbound webhook configuration.
 */
export async function setOperatorWebhook({ operatorId, targetUrl, secretKey, events = ['complaint.escalated', 'complaint.sla_warning'] }) {
  const [row] = await query(
    `INSERT INTO operator_webhooks (operator_id, target_url, secret_key, events, is_active, updated_at)
     VALUES (:operatorId, :targetUrl, :secretKey, :events, TRUE, NOW())
     ON CONFLICT (webhook_id) DO UPDATE SET
       target_url = EXCLUDED.target_url,
       secret_key = EXCLUDED.secret_key,
       events     = EXCLUDED.events,
       is_active  = TRUE,
       updated_at = NOW()
     RETURNING *`,
    {
      operatorId,
      targetUrl,
      secretKey: secretKey || crypto.randomBytes(24).toString('hex'),
      events,
    }
  );
  return row;
}

/**
 * Retrieve active webhook configuration for an operator.
 */
export async function getOperatorWebhooks(operatorId) {
  return query(
    `SELECT webhook_id, operator_id, target_url, events, is_active, created_at, updated_at
     FROM operator_webhooks
     WHERE operator_id = :operatorId`,
    { operatorId }
  );
}

/**
 * Dispatches an HMAC-signed event to registered operator webhooks.
 */
export async function dispatchWebhookEvent(operatorId, eventName, payload) {
  try {
    const webhooks = await query(
      `SELECT * FROM operator_webhooks
       WHERE operator_id = :operatorId
         AND is_active = TRUE
         AND :eventName = ANY(events)`,
      { operatorId, eventName }
    );

    for (const wh of webhooks) {
      const payloadStr = JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const signature = crypto
        .createHmac('sha256', wh.secret_key)
        .update(payloadStr)
        .digest('hex');

      try {
        const resp = await fetch(wh.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-NatCA-Signature': `sha256=${signature}`,
            'X-NatCA-Event': eventName,
            'User-Agent': 'NatCA-Regulator-Webhook/1.0',
          },
          body: payloadStr,
          signal: AbortSignal.timeout(6000), // 6-second timeout
        });

        const resBody = await resp.text().catch(() => '');

        await query(
          `INSERT INTO webhook_delivery_logs (webhook_id, event_name, payload, response_code, response_body, success, delivered_at)
           VALUES (:webhookId, :eventName, :payload, :code, :body, :success, NOW())`,
          {
            webhookId: wh.webhook_id,
            eventName,
            payload: payloadStr,
            code: resp.status,
            body: resBody.slice(0, 1000),
            success: resp.ok,
          }
        );
      } catch (err) {
        await query(
          `INSERT INTO webhook_delivery_logs (webhook_id, event_name, payload, response_code, response_body, success, delivered_at)
           VALUES (:webhookId, :eventName, :payload, 0, :errorMsg, FALSE, NOW())`,
          {
            webhookId: wh.webhook_id,
            eventName,
            payload: payloadStr,
            errorMsg: err.message?.slice(0, 500) || 'Connection failed',
          }
        );
      }
    }
  } catch (err) {
    console.error('Webhook dispatch error:', err);
  }
}

/**
 * Inbound sync from Operator systems (Jira / ServiceNow / Remedy).
 * Allows operator to update their internal ticket reference and resolution root cause.
 */
export async function syncInboundTicket({ operatorId, complaintRef, externalTicketId, status, rcaNote, io }) {
  const complaint = await queryOne(
    `SELECT complaint_id, operator_id, status FROM complaints WHERE complaint_ref = :complaintRef`,
    { complaintRef }
  );

  if (!complaint) {
    throw new Error(`Complaint reference ${complaintRef} not found`);
  }

  if (complaint.operator_id && String(complaint.operator_id) !== String(operatorId)) {
    throw new Error('Complaint does not belong to this operator');
  }

  // Update internal note with Root Cause Analysis
  const noteText = `[Operator Sync: ${externalTicketId || 'CRM'}] Status: ${status || 'UPDATED'}\nRCA: ${rcaNote || 'No RCA provided'}`;
  await complaintSvc.addNote(complaint.complaint_id, {
    note: noteText,
    isPublic: false,
    actorName: 'Operator Automated Sync',
  });

  if (status && ['UNDER_REVIEW', 'RESOLVED', 'CLOSED'].includes(status.toUpperCase())) {
    await complaintSvc.updateComplaint(
      complaint.complaint_id,
      {
        status: status.toUpperCase(),
        resolutionNote: rcaNote || undefined,
      },
      io
    );
  }

  return { synced: true, complaint_ref: complaintRef, external_ticket_id: externalTicketId };
}
