const path = require('node:path');
const fs = require('node:fs');

try {
  // Allow chatbot-specific env file (gitignored) for local/dev + eval runs.
  // Does not override already-set process.env values.
  // Skip during tests to keep unit tests deterministic.
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line global-require
    const dotenv = require('dotenv');
    const chatbotEnvPath = path.join(__dirname, '.env');
    if (fs.existsSync(chatbotEnvPath)) {
      dotenv.config({ path: chatbotEnvPath });
    }
  }
} catch {
  // Ignore if dotenv isn't available.
}

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
  const responseKey = process.env.LITELLM_RESPONSE_KEY || process.env.LITELLM_VIRTUAL_KEY || '';
  const classifierKey = process.env.LITELLM_CLASSIFIER_KEY || responseKey;

  return {
    litellmApiUrl: LITELLM_API_URL,
    litellmApiKey: responseKey,
    litellmResponseKey: responseKey,
    litellmClassifierKey: classifierKey,
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
