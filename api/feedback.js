const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

function allowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && (
      hostname === 'valorandle.com' ||
      hostname === 'www.valorandle.com' ||
      hostname.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!allowedOrigin(request.headers.get('origin'))) return json({ error: 'forbidden' }, 403);

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 4096) return json({ error: 'payload_too_large' }, 413);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    if (body?.website) return json({ ok: true });
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message.length < 3 || message.length > 1000) return json({ error: 'invalid_message' }, 400);

    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('DISCORD_FEEDBACK_WEBHOOK_URL is not configured');
      return json({ error: 'service_unavailable' }, 503);
    }

    const lang = body?.lang === 'en' ? 'EN' : 'PT-BR';
    const page = typeof body?.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 120) : '/';
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Valorandle Feedback',
        allowed_mentions: { parse: [] },
        embeds: [{
          title: 'Novo feedback',
          description: message,
          color: 16729685,
          fields: [
            { name: 'Idioma', value: lang, inline: true },
            { name: 'Página', value: page, inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    if (!discordResponse.ok) {
      console.error('Discord webhook failed', discordResponse.status);
      return json({ error: 'delivery_failed' }, 502);
    }
    return json({ ok: true });
  },
};
