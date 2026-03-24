const axios = require('axios');

function shouldRetry(error) {
  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  return status === 429 || status >= 500;
}

async function createChatCompletion({
  apiUrl,
  apiKey,
  payload,
  timeoutMs,
  retries,
}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let attempt = 0;
  while (true) {
    try {
      return await axios.post(apiUrl, payload, {
        headers,
        timeout: timeoutMs,
      });
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      attempt += 1;
    }
  }
}

module.exports = {
  createChatCompletion,
};
