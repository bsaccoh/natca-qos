function normalisePhone(phone) {
  // Best-effort: strip spaces, ensure it starts with +
  const p = String(phone).replace(/\s+/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('232')) return `+${p}`;
  if (p.startsWith('0'))   return `+232${p.slice(1)}`;
  return `+${p}`;
}

export async function sendSms(phone, message) {
  const to = normalisePhone(phone);

  const username = process.env.AT_USERNAME;
  const apiKey   = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID;

  if (!username || !apiKey) {
    console.log(`[SMS STUB] To: ${to} | Message: ${message}`);
    return { stub: true };
  }

  try {
    const AfricasTalking = (await import('africastalking')).default;
    const client = AfricasTalking({ username, apiKey });
    const opts = { to: [to], message };
    if (senderId) opts.from = senderId;
    const res = await client.SMS.send(opts);
    return { provider: 'africastalking', response: res };
  } catch (err) {
    console.error('[SMS ERROR]', err?.message || err);
    throw err;
  }
}
