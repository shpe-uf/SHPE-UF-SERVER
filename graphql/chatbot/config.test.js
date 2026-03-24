const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG_PATH = require.resolve('./config');

let originalEnv;

function loadConfigWithEnv(overrides = {}) {
  process.env.LITELLM_MODEL = overrides.LITELLM_MODEL ?? '';
  process.env.LITELLM_CLASSIFIER_MODEL = overrides.LITELLM_CLASSIFIER_MODEL ?? '';
  process.env.LITELLM_RESPONSE_MODEL = overrides.LITELLM_RESPONSE_MODEL ?? '';
  process.env.LITELLM_CLASSIFIER_TEMPERATURE =
    overrides.LITELLM_CLASSIFIER_TEMPERATURE ?? '';

  delete require.cache[CONFIG_PATH];
  return require('./config').getChatbotConfig();
}

test.beforeEach(() => {
  originalEnv = { ...process.env };
});

test.afterEach(() => {
  process.env = originalEnv;
  delete require.cache[CONFIG_PATH];
});

test('uses dedicated classifier and response models when provided', () => {
  const config = loadConfigWithEnv({
    LITELLM_CLASSIFIER_MODEL: 'llama-3.1-8b-instruct',
    LITELLM_RESPONSE_MODEL: 'llama-3.1-70b-instruct',
    LITELLM_CLASSIFIER_TEMPERATURE: '0.05',
  });

  assert.equal(config.litellmClassifierModel, 'llama-3.1-8b-instruct');
  assert.equal(config.litellmResponseModel, 'llama-3.1-70b-instruct');
  assert.equal(config.classifierTemperature, 0.05);
});

test('falls back to shared model for both classifier and response when set', () => {
  const config = loadConfigWithEnv({
    LITELLM_MODEL: 'llama-3.1-70b-instruct',
  });

  assert.equal(config.litellmClassifierModel, 'llama-3.1-70b-instruct');
  assert.equal(config.litellmResponseModel, 'llama-3.1-70b-instruct');
});

test('uses sensible defaults and clamps classifier temperature', () => {
  const low = loadConfigWithEnv({ LITELLM_CLASSIFIER_TEMPERATURE: '-5' });
  assert.equal(low.classifierTemperature, 0);
  assert.equal(low.litellmClassifierModel, 'llama-3.1-8b-instruct');
  assert.equal(low.litellmResponseModel, 'llama-3.1-70b-instruct');

  const high = loadConfigWithEnv({ LITELLM_CLASSIFIER_TEMPERATURE: '9' });
  assert.equal(high.classifierTemperature, 2);

  const invalid = loadConfigWithEnv({ LITELLM_CLASSIFIER_TEMPERATURE: 'NaN' });
  assert.equal(invalid.classifierTemperature, 0.1);
});
