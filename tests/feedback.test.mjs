import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/feedback.js';

test('feedback endpoint rejects requests from another origin', async () => {
  const response = await handler.fetch(new Request('https://valorandle.com/api/feedback', {
    method: 'POST', headers: { origin: 'https://example.com' }, body: JSON.stringify({ message: 'hello' }),
  }));
  assert.equal(response.status, 403);
});

test('feedback endpoint validates message length before delivery', async () => {
  const response = await handler.fetch(new Request('https://valorandle.com/api/feedback', {
    method: 'POST', headers: { origin: 'https://valorandle.com' }, body: JSON.stringify({ message: 'x' }),
  }));
  assert.equal(response.status, 400);
});

test('honeypot submissions are silently discarded', async () => {
  const response = await handler.fetch(new Request('https://valorandle.com/api/feedback', {
    method: 'POST', headers: { origin: 'https://valorandle.com' }, body: JSON.stringify({ message: 'spam message', website: 'bot' }),
  }));
  assert.equal(response.status, 200);
});
