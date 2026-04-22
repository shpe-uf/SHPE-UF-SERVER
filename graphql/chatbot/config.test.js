const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG_PATH = require.resolve('./config');

let originalEnv;

function loadConfig() {
  delete require.cache[CONFIG_PATH];
  return require('./config').getChatbotConfig();
}

test.beforeEach(() => {
  originalEnv = { ...process.env };
  process.env.NODE_ENV = 'test';
});

test.afterEach(() => {
  process.env = originalEnv;
  delete require.cache[CONFIG_PATH];
});

test('uses fixed model and temperature values from config constants', () => {
  const config = loadConfig();

  assert.equal(config.litellmClassifierModel, 'llama-3.1-8b-instruct');
  assert.equal(config.litellmResponseModel, 'llama-3.1-70b-instruct');
  assert.equal(config.classifierTemperature, 0.1);
  assert.equal(config.responseTemperature, 0.2);
});

test('ignores model and temperature env variables', () => {
  process.env.LITELLM_MODEL = 'some-other-model';
  process.env.LITELLM_CLASSIFIER_MODEL = 'another-model';
  process.env.LITELLM_RESPONSE_MODEL = 'another-response-model';
  process.env.LITELLM_CLASSIFIER_TEMPERATURE = '1.9';
  process.env.LITELLM_RESPONSE_TEMPERATURE = '1.7';

  const config = loadConfig();

  assert.equal(config.litellmClassifierModel, 'llama-3.1-8b-instruct');
  assert.equal(config.litellmResponseModel, 'llama-3.1-70b-instruct');
  assert.equal(config.classifierTemperature, 0.1);
  assert.equal(config.responseTemperature, 0.2);
});

test('uses LITELLM_CLASSIFIER_KEY when set, otherwise falls back to response key', () => {
  process.env.LITELLM_RESPONSE_KEY = 'response-key';
  delete process.env.LITELLM_VIRTUAL_KEY;
  delete process.env.LITELLM_CLASSIFIER_KEY;

  let config = loadConfig();
  assert.equal(config.litellmApiKey, 'response-key');
  assert.equal(config.litellmClassifierKey, 'response-key');

  process.env.LITELLM_CLASSIFIER_KEY = 'classifier-key';
  config = loadConfig();
  assert.equal(config.litellmApiKey, 'response-key');
  assert.equal(config.litellmClassifierKey, 'classifier-key');
});

test('falls back to LITELLM_VIRTUAL_KEY when LITELLM_RESPONSE_KEY is missing', () => {
  delete process.env.LITELLM_RESPONSE_KEY;
  process.env.LITELLM_VIRTUAL_KEY = 'legacy-key';

  const config = loadConfig();
  assert.equal(config.litellmApiKey, 'legacy-key');
  assert.equal(config.litellmResponseKey, 'legacy-key');
});
