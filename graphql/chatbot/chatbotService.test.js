const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const SERVICE_PATH = require.resolve('./chatbotService');

const BASE_ENV = {
  LITELLM_VIRTUAL_KEY: 'test-litellm-key',
  LITELLM_VECTOR_STORE_IDS: 'vs_test_1,vs_test_2',
  GOOGLE_CALENDAR_API_KEY: 'test-google-key',
};

let originalEnv;
let originalPost;
let originalGet;

function loadServiceWithEnv(overrides = {}) {
  process.env.LITELLM_VIRTUAL_KEY = overrides.LITELLM_VIRTUAL_KEY ?? BASE_ENV.LITELLM_VIRTUAL_KEY;
  process.env.LITELLM_VECTOR_STORE_IDS = overrides.LITELLM_VECTOR_STORE_IDS ?? BASE_ENV.LITELLM_VECTOR_STORE_IDS;
  process.env.GOOGLE_CALENDAR_API_KEY = overrides.GOOGLE_CALENDAR_API_KEY ?? BASE_ENV.GOOGLE_CALENDAR_API_KEY;

  delete require.cache[SERVICE_PATH];
  return require('./chatbotService');
}

function makeLiteLLMMessage({ content = '', tool_calls }) {
  return {
    data: {
      choices: [
        {
          message: {
            content,
            tool_calls,
          },
        },
      ],
    },
  };
}

function makeLiteLLMText(content) {
  return makeLiteLLMMessage({ content, tool_calls: undefined });
}

test.beforeEach(() => {
  originalEnv = { ...process.env };
  originalPost = axios.post;
  originalGet = axios.get;
});

test.afterEach(() => {
  axios.post = originalPost;
  axios.get = originalGet;
  process.env = originalEnv;
  delete require.cache[SERVICE_PATH];
});

test('returns fallback response when LiteLLM key is missing', async () => {
  const { queryRAG } = loadServiceWithEnv({ LITELLM_VIRTUAL_KEY: '' });

  const response = await queryRAG('What is SHPE UF?');

  assert.equal(response, "I'm having trouble answering right now. Please try again later.");
  assert.equal(response.includes('test-litellm-key'), false);
});

test('missing vector store IDs does not hard-fail general path', async () => {
  const { queryRAG } = loadServiceWithEnv({ LITELLM_VECTOR_STORE_IDS: '' });

  let postCount = 0;
  axios.post = async () => {
    postCount += 1;
    if (postCount === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'general',
          confidence: 0.93,
          needs_rag: true,
          params: {},
        })
      );
    }

    return makeLiteLLMText('General answer without RAG because no vector stores are configured.');
  };

  const response = await queryRAG('Tell me about SHPE goals for tomorrow.');

  assert.equal(response, 'General answer without RAG because no vector stores are configured.');
  assert.equal(postCount, 2);
});

test('general conversation path does not call Google Calendar API and always attaches vector store', async () => {
  const { queryRAG } = loadServiceWithEnv();

  const postCalls = [];
  let calendarGetCalls = 0;

  axios.post = async (url, payload) => {
    postCalls.push({ url, payload });

    // First call: intent classification
    if (postCalls.length === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'general',
          confidence: 0.95,
          needs_rag: false,
          params: {},
        })
      );
    }

    // Second call: final answer
    return makeLiteLLMText('General response from model.');
  };

  axios.get = async () => {
    calendarGetCalls += 1;
    return { data: { items: [] } };
  };

  const response = await queryRAG('Tell me about SHPE UF.');

  assert.equal(response, 'General response from model.');
  assert.equal(postCalls.length, 2);
  assert.equal(calendarGetCalls, 0);
  // Vector store is always attached when IDs are configured, regardless of classifier output
  assert.deepEqual(postCalls[1].payload.extra_body.metadata.vector_stores, ['vs_test_1', 'vs_test_2']);
  assert.equal(postCalls[0].payload.extra_body, undefined);
  assert.equal(postCalls[0].payload.model, 'llama-3.1-8b-instruct');
  assert.equal(postCalls[1].payload.model, 'llama-3.1-70b-instruct');
  assert.equal(postCalls[0].payload.temperature, 0.1);
  assert.equal(postCalls[1].payload.temperature, 0.2);

  // No tool-based routing payload is used in Option B.
  assert.equal(postCalls[0].payload.tools, undefined);
  assert.equal(postCalls[1].payload.tools, undefined);

  // Ensure first call is classifier-oriented and second call contains user prompt for answer generation.
  assert.match(postCalls[0].payload.messages[0].content, /intent classifier/i);
  assert.equal(postCalls[1].payload.messages[1].content, 'Tell me about SHPE UF.');
});

test('calendar intent path executes calendar fetch and returns final model response', async () => {
  const { queryRAG } = loadServiceWithEnv();

  const postCalls = [];
  const getCalls = [];

  axios.post = async (url, payload) => {
    postCalls.push({ url, payload });

    // First call: intent classification
    if (postCalls.length === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'calendar',
          confidence: 0.9,
          needs_rag: false,
          params: { max_results: 3 },
        })
      );
    }

    // Second call: final answer with calendar context
    return makeLiteLLMText('Here are your upcoming events.');
  };

  axios.get = async (url) => {
    getCalls.push(url);
    return {
      data: {
        items: [
          {
            summary: 'GM Meeting',
            start: { dateTime: '2026-03-25T17:00:00Z' },
            location: 'Marston',
          },
        ],
      },
    };
  };

  const response = await queryRAG('What events are upcoming this week?');

  assert.equal(response, 'Here are your upcoming events.');
  assert.equal(postCalls.length, 2);
  assert.equal(getCalls.length, 1);
  assert.match(getCalls[0], /maxResults=3/);
  assert.equal(postCalls[0].payload.extra_body, undefined);
  // Calendar path still attaches vector store on final answer call
  assert.deepEqual(postCalls[1].payload.extra_body.metadata.vector_stores, ['vs_test_1', 'vs_test_2']);
  assert.equal(postCalls[0].payload.model, 'llama-3.1-8b-instruct');
  assert.equal(postCalls[1].payload.model, 'llama-3.1-70b-instruct');
  assert.equal(postCalls[0].payload.temperature, 0.1);
  assert.equal(postCalls[1].payload.temperature, 0.2);

  const secondCallMessages = postCalls[1].payload.messages.map((m) => m.content).join('\n');
  assert.match(secondCallMessages, /GM Meeting/);
  assert.match(secondCallMessages, /calendar data/i);
});

test('invalid classifier JSON falls back to general response path safely', async () => {
  const { queryRAG } = loadServiceWithEnv();

  const postCalls = [];
  let calendarGetCalls = 0;

  axios.post = async (url, payload) => {
    postCalls.push({ url, payload });
    if (postCalls.length === 1) {
      return makeLiteLLMText('{not-json}');
    }

    return makeLiteLLMText('General fallback response after invalid classifier output.');
  };

  axios.get = async () => {
    calendarGetCalls += 1;
    return { data: { items: [] } };
  };

  const response = await queryRAG('What events are upcoming this week?');

  assert.equal(response, 'General fallback response after invalid classifier output.');
  assert.equal(postCalls.length, 2);
  assert.equal(calendarGetCalls, 0);
  // Vector store is always attached when IDs are configured
  assert.deepEqual(postCalls[1].payload.extra_body.metadata.vector_stores, ['vs_test_1', 'vs_test_2']);
});

test('low-confidence calendar classifier output degrades to general path', async () => {
  const { queryRAG } = loadServiceWithEnv();

  let postCount = 0;
  let calendarGetCalls = 0;

  axios.post = async () => {
    postCount += 1;
    if (postCount === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'calendar',
          confidence: 0.2,
          needs_rag: true,
          params: { max_results: 10 },
        })
      );
    }

    return makeLiteLLMText('General answer chosen due to low confidence.');
  };

  axios.get = async () => {
    calendarGetCalls += 1;
    return { data: { items: [] } };
  };

  const response = await queryRAG('What upcoming events are there?');

  assert.equal(response, 'General answer chosen due to low confidence.');
  assert.equal(postCount, 2);
  assert.equal(calendarGetCalls, 0);
});

test('vector store is attached for general queries regardless of needs_rag flag', async () => {
  const { queryRAG } = loadServiceWithEnv();

  const postCalls = [];
  let calendarGetCalls = 0;

  axios.post = async (url, payload) => {
    postCalls.push({ url, payload });
    if (postCalls.length === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'general',
          confidence: 0.92,
          needs_rag: true,
          params: {},
        })
      );
    }

    return makeLiteLLMText('RAG-backed general answer.');
  };

  axios.get = async () => {
    calendarGetCalls += 1;
    return { data: { items: [] } };
  };

  const response = await queryRAG('Can you answer from SHPE docs about convention prep?');

  assert.equal(response, 'RAG-backed general answer.');
  assert.equal(postCalls.length, 2);
  assert.equal(calendarGetCalls, 0);
  assert.equal(postCalls[0].payload.extra_body, undefined);
  assert.deepEqual(postCalls[1].payload.extra_body.metadata.vector_stores, ['vs_test_1', 'vs_test_2']);
  assert.equal(postCalls[0].payload.model, 'llama-3.1-8b-instruct');
  assert.equal(postCalls[1].payload.model, 'llama-3.1-70b-instruct');
  assert.equal(postCalls[0].payload.temperature, 0.1);
  assert.equal(postCalls[1].payload.temperature, 0.2);
});

test('vector store is attached even when classifier returns needs_rag=false', async () => {
  const { queryRAG } = loadServiceWithEnv();

  const postCalls = [];

  axios.post = async (url, payload) => {
    postCalls.push({ url, payload });
    if (postCalls.length === 1) {
      return makeLiteLLMText(
        JSON.stringify({
          intent: 'general',
          confidence: 0.95,
          needs_rag: false,
          params: {},
        })
      );
    }

    return makeLiteLLMText('Answer using vector store context for national convention team.');
  };

  const response = await queryRAG('Who is on the team for national convention?');

  assert.equal(response, 'Answer using vector store context for national convention team.');
  assert.equal(postCalls.length, 2);
  // Key assertion: vector store MUST be attached even when classifier says needs_rag=false
  assert.deepEqual(postCalls[1].payload.extra_body.metadata.vector_stores, ['vs_test_1', 'vs_test_2']);
});
