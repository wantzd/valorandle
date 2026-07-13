import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackHandler } from '../api/feedback.js';

const TEST_ENV = {
  TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
  DISCORD_FEEDBACK_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456/test_token',
};
const SILENT_LOGGER = { error() {} };

function createHandler(options = {}) {
  return createFeedbackHandler({ env: TEST_ENV, logger: SILENT_LOGGER, ...options });
}

function feedbackRequest(body, {
  origin = 'https://valorandle.com',
  method = 'POST',
  contentType = 'application/json',
} = {}) {
  const headers = { origin };
  if (contentType) headers['content-type'] = contentType;
  return new Request('https://valorandle.com/api/feedback', {
    method,
    headers,
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}

function successfulFetch(calls = []) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/turnstile/v0/siteverify')) {
      return Response.json({ success: true, action: 'feedback', hostname: 'valorandle.com' });
    }
    return new Response(null, { status: 204 });
  };
}

function validBody(overrides = {}) {
  return {
    message: 'Helpful feedback',
    lang: 'en',
    page: '/en',
    website: '',
    turnstileToken: 'valid-token',
    ...overrides,
  };
}

test('rejects methods other than POST and advertises the allowed method', async () => {
  const handler = createHandler({ fetchImpl: successfulFetch() });
  const response = await handler.fetch(feedbackRequest(null, { method: 'GET' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('rejects untrusted and arbitrary Vercel origins', async () => {
  const handler = createHandler({ fetchImpl: successfulFetch() });
  for (const origin of ['https://example.com', 'https://attacker.vercel.app']) {
    const response = await handler.fetch(feedbackRequest(validBody(), { origin }));
    assert.equal(response.status, 403);
  }
});

test('accepts the canonical www origin', async () => {
  const calls = [];
  const handler = createHandler({ fetchImpl: successfulFetch(calls) });
  const response = await handler.fetch(feedbackRequest(validBody(), { origin: 'https://www.valorandle.com' }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
});

test('requires JSON content type', async () => {
  const handler = createHandler({ fetchImpl: successfulFetch() });
  const response = await handler.fetch(feedbackRequest('{}', { contentType: 'text/plain' }));
  assert.equal(response.status, 415);
});

test('rejects malformed JSON', async () => {
  const handler = createHandler({ fetchImpl: successfulFetch() });
  const response = await handler.fetch(feedbackRequest('{not-json'));
  assert.equal(response.status, 400);
});

test('enforces the body limit without relying on Content-Length', async () => {
  const handler = createHandler({ fetchImpl: successfulFetch() });
  const request = feedbackRequest(validBody({ message: 'x'.repeat(5000) }));
  assert.equal(request.headers.has('content-length'), false);
  const response = await handler.fetch(request);
  assert.equal(response.status, 413);
});

test('validates message length before external requests', async () => {
  const calls = [];
  const handler = createHandler({ fetchImpl: successfulFetch(calls) });
  const response = await handler.fetch(feedbackRequest(validBody({ message: 'x' })));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test('silently discards honeypot submissions without external requests', async () => {
  const calls = [];
  const handler = createHandler({ fetchImpl: successfulFetch(calls) });
  const response = await handler.fetch(feedbackRequest(validBody({ website: 'bot' })));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 0);
});

test('requires a Turnstile token', async () => {
  const calls = [];
  const handler = createHandler({ fetchImpl: successfulFetch(calls) });
  const response = await handler.fetch(feedbackRequest(validBody({ turnstileToken: '' })));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test('rejects failed, wrong-action, and wrong-hostname Turnstile results', async () => {
  const results = [
    { success: false, action: 'feedback', hostname: 'valorandle.com' },
    { success: true, action: 'login', hostname: 'valorandle.com' },
    { success: true, action: 'feedback', hostname: 'attacker.example' },
  ];

  for (const result of results) {
    const handler = createHandler({
      fetchImpl: async () => Response.json(result),
    });
    const response = await handler.fetch(feedbackRequest(validBody()));
    assert.equal(response.status, 400);
  }
});

test('delivers verified feedback without Discord mentions', async () => {
  const calls = [];
  const handler = createHandler({ fetchImpl: successfulFetch(calls) });
  const response = await handler.fetch(feedbackRequest(validBody({ message: '@everyone useful idea' })));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /turnstile\/v0\/siteverify$/);
  const discordBody = JSON.parse(calls[1].options.body);
  assert.deepEqual(discordBody.allowed_mentions, { parse: [] });
  assert.equal(discordBody.embeds[0].description, '@everyone useful idea');
});

test('fails closed when Turnstile is unavailable', async () => {
  const handler = createHandler({
    fetchImpl: async () => { throw new DOMException('timed out', 'TimeoutError'); },
  });
  const response = await handler.fetch(feedbackRequest(validBody()));
  assert.equal(response.status, 503);
});

test('handles Discord delivery failures without exposing details', async () => {
  let call = 0;
  const handler = createHandler({
    fetchImpl: async () => {
      call += 1;
      if (call === 1) return Response.json({ success: true, action: 'feedback', hostname: 'valorandle.com' });
      throw new DOMException('timed out', 'TimeoutError');
    },
  });
  const response = await handler.fetch(feedbackRequest(validBody()));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'delivery_failed' });
});

test('fails closed when required secrets are missing or malformed', async () => {
  const handler = createFeedbackHandler({
    env: { TURNSTILE_SECRET_KEY: 'secret', DISCORD_FEEDBACK_WEBHOOK_URL: 'https://example.com/hook' },
    fetchImpl: successfulFetch(),
    logger: SILENT_LOGGER,
  });
  const response = await handler.fetch(feedbackRequest(validBody()));
  assert.equal(response.status, 503);
});
