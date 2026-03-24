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
