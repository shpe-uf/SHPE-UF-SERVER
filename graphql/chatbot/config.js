const LITELLM_API_URL = 'https://api.ai.it.ufl.edu/v1/chat/completions';
const SHPE_CALENDAR_ID = 'calendar.shpeuf@gmail.com';

const DEFAULT_CLASSIFIER_MODEL = 'llama-3.1-8b-instruct';
const DEFAULT_RESPONSE_MODEL = 'llama-3.1-70b-instruct';
const DEFAULT_CLASSIFIER_TEMPERATURE = 0.1;

function parseVectorStoreIds(rawValue) {
  return (rawValue || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseTemperature(rawValue, fallbackValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallbackValue;
  }

  if (parsed < 0) {
    return 0;
  }

  if (parsed > 2) {
    return 2;
  }

  return parsed;
}

function getChatbotConfig() {
  const sharedModel = process.env.LITELLM_MODEL || '';

  return {
    litellmApiUrl: LITELLM_API_URL,
    litellmApiKey: process.env.LITELLM_VIRTUAL_KEY || '',
    litellmClassifierModel:
      process.env.LITELLM_CLASSIFIER_MODEL ||
      sharedModel ||
      DEFAULT_CLASSIFIER_MODEL,
    litellmResponseModel:
      process.env.LITELLM_RESPONSE_MODEL ||
      sharedModel ||
      DEFAULT_RESPONSE_MODEL,
    litellmModel: sharedModel || DEFAULT_RESPONSE_MODEL,
    classifierTemperature: parseTemperature(
      process.env.LITELLM_CLASSIFIER_TEMPERATURE,
      DEFAULT_CLASSIFIER_TEMPERATURE
    ),
    vectorStoreIds: parseVectorStoreIds(process.env.LITELLM_VECTOR_STORE_IDS),
    googleApiKey: process.env.GOOGLE_CALENDAR_API_KEY || '',
    shpeCalendarId: SHPE_CALENDAR_ID,
    classificationConfidenceThreshold: 0.6,
    llmTimeoutMs: 12000,
    calendarTimeoutMs: 8000,
    llmRetries: 1,
    calendarRetries: 1,
  };
}

module.exports = {
  getChatbotConfig,
};
