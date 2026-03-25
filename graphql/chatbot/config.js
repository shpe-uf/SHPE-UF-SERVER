const LITELLM_API_URL = 'https://api.ai.it.ufl.edu/v1/chat/completions';
const SHPE_CALENDAR_ID = 'calendar.shpeuf@gmail.com';

const CLASSIFIER_MODEL = 'llama-3.1-8b-instruct';
const RESPONSE_MODEL = 'llama-3.1-70b-instruct';
const CLASSIFIER_TEMPERATURE = 0.1;
const RESPONSE_TEMPERATURE = 0.2;

function parseVectorStoreIds(rawValue) {
  return (rawValue || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function getChatbotConfig() {
  return {
    litellmApiUrl: LITELLM_API_URL,
    litellmClassifierApiKey: process.env.LITELLM_CLASSIFIER_VIRTUAL_KEY || '',
    litellmResponseApiKey: process.env.LITELLM_RESPONSE_VIRTUAL_KEY || '',
    litellmClassifierModel: CLASSIFIER_MODEL,
    litellmResponseModel: RESPONSE_MODEL,
    classifierTemperature: CLASSIFIER_TEMPERATURE,
    responseTemperature: RESPONSE_TEMPERATURE,
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
