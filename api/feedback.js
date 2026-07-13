const MAX_BODY_BYTES = 4096;
const MAX_MESSAGE_LENGTH = 1000;
const REQUEST_TIMEOUT_MS = 5000;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_ORIGINS = new Set([
  'https://valorandle.com',
  'https://www.valorandle.com',
]);
const ALLOWED_HOSTNAMES = new Set(['valorandle.com', 'www.valorandle.com']);

const json = (body, status = 200, extraHeaders = {}) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  },
});

class PayloadTooLargeError extends Error {}

async function readJsonBody(request) {
  if (!request.body) throw new SyntaxError('Missing body');

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let totalBytes = 0;
  let bodyText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      bodyText += decoder.decode(value, { stream: true });
    }
    bodyText += decoder.decode();
    return JSON.parse(bodyText);
  } finally {
    reader.releaseLock();
  }
}

function normalizeMessage(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function normalizePage(value) {
  if (typeof value !== 'string' || value.length > 120) return '/';
  return /^\/[A-Za-z0-9/_-]*$/.test(value) ? value : '/';
}

function isDiscordWebhook(value) {
  try {
    const url = new URL(value);
    const allowedHost = url.hostname === 'discord.com'
      || url.hostname.endsWith('.discord.com')
      || url.hostname === 'discordapp.com'
      || url.hostname.endsWith('.discordapp.com');
    const parts = url.pathname.split('/').filter(Boolean);
    return url.protocol === 'https:'
      && allowedHost
      && parts.length === 4
      && parts[0] === 'api'
      && parts[1] === 'webhooks'
      && /^\d+$/.test(parts[2])
      && parts[3].length >= 20;
  } catch {
    return false;
  }
}

function requestIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || forwarded
    || '';
  return candidate.slice(0, 64);
}

async function verifyTurnstile({ token, request, secret, fetchImpl, timeoutMs }) {
  const form = new URLSearchParams({ secret, response: token });
  const ip = requestIp(request);
  if (ip) form.set('remoteip', ip);

  const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) return false;
  const result = await response.json();
  return result?.success === true
    && result.action === 'feedback'
    && ALLOWED_HOSTNAMES.has(result.hostname);
}

export function createFeedbackHandler({
  fetchImpl = globalThis.fetch,
  env = process.env,
  timeoutMs = REQUEST_TIMEOUT_MS,
  logger = console,
} = {}) {
  return {
    async fetch(request) {
      if (request.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
      }

      if (!ALLOWED_ORIGINS.has(request.headers.get('origin'))) {
        return json({ error: 'forbidden' }, 403);
      }

      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return json({ error: 'unsupported_media_type' }, 415);
      }

      let body;
      try {
        body = await readJsonBody(request);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          return json({ error: 'payload_too_large' }, 413);
        }
        return json({ error: 'invalid_json' }, 400);
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return json({ error: 'invalid_payload' }, 400);
      }

      // Deliberately make automated honeypot submissions look successful.
      if (typeof body.website === 'string' && body.website.length > 0) {
        return json({ ok: true });
      }

      const message = normalizeMessage(body.message);
      if (message.length < 3 || message.length > MAX_MESSAGE_LENGTH) {
        return json({ error: 'invalid_message' }, 400);
      }

      const turnstileToken = typeof body.turnstileToken === 'string'
        ? body.turnstileToken.trim()
        : '';
      if (!turnstileToken || turnstileToken.length > 2048) {
        return json({ error: 'verification_required' }, 400);
      }

      const turnstileSecret = env.TURNSTILE_SECRET_KEY;
      const webhookUrl = env.DISCORD_FEEDBACK_WEBHOOK_URL;
      if (!turnstileSecret || !isDiscordWebhook(webhookUrl)) {
        logger.error('Feedback service is not configured correctly');
        return json({ error: 'service_unavailable' }, 503);
      }

      try {
        const verified = await verifyTurnstile({
          token: turnstileToken,
          request,
          secret: turnstileSecret,
          fetchImpl,
          timeoutMs,
        });
        if (!verified) return json({ error: 'verification_failed' }, 400);
      } catch (error) {
        logger.error('Turnstile verification failed', error?.name || 'Error');
        return json({ error: 'verification_unavailable' }, 503);
      }

      const lang = body.lang === 'en' ? 'EN' : 'PT-BR';
      const page = normalizePage(body.page);

      try {
        const discordResponse = await fetchImpl(webhookUrl, {
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
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!discordResponse.ok) {
          logger.error('Discord webhook failed', discordResponse.status);
          return json({ error: 'delivery_failed' }, 502);
        }
      } catch (error) {
        logger.error('Discord webhook request failed', error?.name || 'Error');
        return json({ error: 'delivery_failed' }, 502);
      }

      return json({ ok: true });
    },
  };
}

export default createFeedbackHandler();
