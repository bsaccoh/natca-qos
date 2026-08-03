const BRAND = 'NatCA';

function trackUrlFor(ref) {
  const base = process.env.PUBLIC_CITIZEN_URL || 'https://natca-citizen.onrender.com';
  return `${base.replace(/\/$/, '')}/track?ref=${encodeURIComponent(ref)}`;
}

const humanStatus = {
  NEW:          'received',
  UNDER_REVIEW: 'under review',
  ACKNOWLEDGED: 'acknowledged by our team',
  ASSIGNED:     'assigned to an investigator',
  ESCALATED:    'escalated for priority handling',
  RESOLVED:     'resolved',
  CLOSED:       'closed',
};

export function submissionSms({ complaintRef, status }) {
  const human = humanStatus[status] || status.toLowerCase();
  return `${BRAND}: Your complaint ${complaintRef} has been ${human}. Track: ${trackUrlFor(complaintRef)}`;
}

export function statusUpdateSms({ complaintRef, status }) {
  const human = humanStatus[status] || status.toLowerCase();
  return `${BRAND}: Complaint ${complaintRef} is now ${human}. Details: ${trackUrlFor(complaintRef)}`;
}

function emailShell({ title, intro, ref, status, cta }) {
  const trackUrl = trackUrlFor(ref);
  return `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06)">
        <tr><td style="background:#0d9488;padding:20px 24px;color:#fff">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85">${BRAND}</div>
          <div style="font-size:20px;font-weight:700;margin-top:4px">${title}</div>
        </td></tr>
        <tr><td style="padding:24px">
          <p style="margin:0 0 16px;line-height:1.5">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Reference</td>
                <td style="padding:8px 0;font-family:monospace;font-weight:700;text-align:right">${ref}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb">Status</td>
                <td style="padding:8px 0;font-weight:700;text-align:right;border-top:1px solid #e5e7eb">${status}</td></tr>
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="${trackUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 22px;border-radius:8px;font-weight:600;text-decoration:none">${cta}</a>
          </div>
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;text-align:center">
            National Communication Authority · Sierra Leone
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function submissionEmail({ complaintRef, status, citizenName }) {
  const greet = citizenName ? `Hi ${citizenName},` : 'Hello,';
  return {
    subject: `${BRAND} — Complaint received (${complaintRef})`,
    html: emailShell({
      title: 'Complaint received',
      intro: `${greet} we have received your complaint and it will be investigated by our team. Please keep the reference below for your records.`,
      ref: complaintRef,
      status,
      cta: 'Track your complaint',
    }),
    text: `${greet}\n\nYour complaint ${complaintRef} has been received.\nStatus: ${status}\nTrack: ${trackUrlFor(complaintRef)}\n\n— ${BRAND}`,
  };
}

export function statusUpdateEmail({ complaintRef, status, citizenName }) {
  const greet = citizenName ? `Hi ${citizenName},` : 'Hello,';
  const human = humanStatus[status] || status.toLowerCase();
  return {
    subject: `${BRAND} — Complaint ${complaintRef} is now ${status}`,
    html: emailShell({
      title: 'Status update',
      intro: `${greet} your complaint ${complaintRef} is now <strong>${human}</strong>.`,
      ref: complaintRef,
      status,
      cta: 'View details',
    }),
    text: `${greet}\n\nYour complaint ${complaintRef} is now ${human}.\nDetails: ${trackUrlFor(complaintRef)}\n\n— ${BRAND}`,
  };
}
