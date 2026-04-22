const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseIntentClassification,
  shouldUseCalendarIntent,
  shouldUseRag,
} = require('./intentClassifier');

test('parseIntentClassification parses valid JSON payload', () => {
  const parsed = parseIntentClassification(
    JSON.stringify({
      intent: 'calendar',
      confidence: 0.91,
      needs_rag: false,
      params: { max_results: 9 },
    })
  );

  assert.deepEqual(parsed, {
    intent: 'calendar',
    confidence: 0.91,
    needs_rag: false,
    params: { max_results: 9 },
  });
});

test('parseIntentClassification handles wrapped markdown JSON', () => {
  const parsed = parseIntentClassification(
    '```json\n{"intent":"general","confidence":0.88,"needs_rag":true,"params":{}}\n```'
  );

  assert.equal(parsed.intent, 'general');
  assert.equal(parsed.confidence, 0.88);
  assert.equal(parsed.needs_rag, true);
  assert.deepEqual(parsed.params, {});
});

test('parseIntentClassification degrades safely on malformed payload', () => {
  const parsed = parseIntentClassification('{not-json}');

  assert.deepEqual(parsed, {
    intent: 'general',
    confidence: 0,
    needs_rag: false,
    params: {},
  });
});

test('parseIntentClassification clamps out-of-range params and confidence', () => {
  const parsed = parseIntentClassification(
    JSON.stringify({
      intent: 'calendar',
      confidence: 5,
      needs_rag: 'yes',
      params: { max_results: 99 },
    })
  );

  assert.equal(parsed.intent, 'calendar');
  assert.equal(parsed.confidence, 1);
  assert.equal(parsed.needs_rag, false);
  assert.deepEqual(parsed.params, { max_results: 10 });
});

test('shouldUseCalendarIntent requires calendar intent and confidence threshold', () => {
  assert.equal(
    shouldUseCalendarIntent(
      { intent: 'calendar', confidence: 0.8, params: {} },
      0.6
    ),
    true
  );

  assert.equal(
    shouldUseCalendarIntent(
      { intent: 'calendar', confidence: 0.2, params: {} },
      0.6
    ),
    false
  );

  assert.equal(
    shouldUseCalendarIntent(
      { intent: 'general', confidence: 0.99, params: {} },
      0.6
    ),
    false
  );
});

test('shouldUseRag requires general intent, rag=true and confidence threshold', () => {
  assert.equal(
    shouldUseRag(
      { intent: 'general', confidence: 0.95, needs_rag: true, params: {} },
      0.6
    ),
    true
  );

  assert.equal(
    shouldUseRag(
      { intent: 'general', confidence: 0.4, needs_rag: true, params: {} },
      0.6
    ),
    false
  );

  assert.equal(
    shouldUseRag(
      { intent: 'calendar', confidence: 0.99, needs_rag: true, params: {} },
      0.6
    ),
    false
  );

  assert.equal(
    shouldUseRag(
      { intent: 'general', confidence: 0.99, needs_rag: false, params: {} },
      0.6
    ),
    false
  );
});

test('parseIntentClassification accepts out_of_scope and forces needs_rag=false', () => {
  const parsed = parseIntentClassification(
    JSON.stringify({
      intent: 'out_of_scope',
      confidence: 0.9,
      needs_rag: true,
      params: {},
    })
  );

  assert.deepEqual(parsed, {
    intent: 'out_of_scope',
    confidence: 0.9,
    needs_rag: false,
    params: {},
  });
});
