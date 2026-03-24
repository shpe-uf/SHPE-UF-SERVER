# SHPE-UF Chatbot Developer Guide

## Overview

This document covers development and operational patterns for the classifier-driven chatbot system. The chatbot is **optional** for server startup—it only requires configuration when used.

---

## Architecture

### High-Level Flow

```
HTTP Request (chatBot mutation)
    ↓
[classifyIntent] → JSON classification (intent, confidence, needs_rag)
    ↓
[dispatcher] → decide: calendar | RAG | general
    ↓
[tool executor] → fetch calendar events (if calendar) | attach vector stores (if RAG approved)
    ↓
[LiteLLM API] → generate response
    ↓
HTTP Response
```

### Key Design Decisions

1. **Intent Classification First**: Model classifies intent before any tool execution. This avoids speculative tool calls and reduces latency.
2. **Conditional RAG**: Vector-store metadata only attached when:
   - Classifier says `needs_rag: true`
   - Confidence ≥ `classificationConfidenceThreshold` (default: 0.6)
   - Intent is `general` (not `calendar`)
   - Vector stores are configured
3. **Graceful Degradation**: If any tool fails (calendar, RAG, LiteLLM), service falls back to a generic error message. Server continues operating.
4. **Non-Blocking**: Chatbot config errors do not prevent server startup. Only runtime chatbot queries fail if config is missing.

---

## Configuration

### Environment Variables

All chatbot env vars are **optional** unless the chatbot is actually queried:

| Variable | Required for Startup | Required if Using Chatbot | Example | Purpose |
|----------|:---:|:---:|---|---|
| `LITELLM_VIRTUAL_KEY` | ❌ | ✅ | `sk-...` | API authentication to LiteLLM proxy |
| `GOOGLE_CALENDAR_API_KEY` | ❌ | ✅ | `AIzaSy...` | Google Calendar API for fetching SHPE events |
| `LITELLM_VECTOR_STORE_IDS` | ❌ | ❌* | `vs_abc,vs_def` | Comma-separated ChromaDB vector store IDs; RAG skipped if missing |
| `LITELLM_MODEL` | ❌ | ❌ | `llama-2-70b` | Model ID override (default: `llama-3.1-70b-instruct`) |

*Vector stores are optional; if missing, RAG is automatically disabled even if classifier recommends it.

### Setup Script

```bash
# Create .env file with required keys
cat > .env << 'EOF'
LITELLM_VIRTUAL_KEY=<your_key>
GOOGLE_CALENDAR_API_KEY=<your_key>
LITELLM_VECTOR_STORE_IDS=vs_store_1,vs_store_2
# LITELLM_MODEL=llama-2-70b  # optional; defaults to llama-3.1-70b-instruct
EOF

# Start server (chatbot optional)
npm start
```

---

## Testing

### Running Tests

```bash
# Run all chatbot tests (deterministic, no external calls)
npx -y node@20 --test graphql/chatbot/*.test.js

# Expected: 13+ tests, 0 failures, ~150ms runtime

# Run specific test file
npx -y node@20 --test graphql/chatbot/intentClassifier.test.js
npx -y node@20 --test graphql/chatbot/chatbotService.test.js
```

### Test Coverage

**intentClassifier.test.js** (6 tests):
- ✅ Parses valid JSON classification
- ✅ Extracts markdown-wrapped JSON
- ✅ Handles malformed JSON with fallback
- ✅ Clamps confidence [0, 1] and max_results [1, 10]
- ✅ `shouldUseCalendarIntent()` correctly gates by intent + confidence
- ✅ `shouldUseRag()` correctly gates by intent + needs_rag + confidence + vector stores

**chatbotService.test.js** (8 tests):
- ✅ General intent flow without RAG
- ✅ Calendar intent flow (no RAG attachment)
- ✅ Invalid classifier JSON falls back to generic response
- ✅ Low confidence (< 0.6) skips RAG attachment
- ✅ High-confidence `needs_rag` general intent attaches vector-store metadata only on final answer call (not classifier call)
- ✅ Classifier call has zero vector-store metadata
- ✅ Missing vector stores degrade gracefully (no error, just skip RAG)
- ✅ Missing API key returns a user-friendly error

### Key Test Patterns

All tests **deliberately avoid**:
- Network calls (mocked via `axios` stub)
- Real API credentials (only `MOCK_KEY` used)
- Non-deterministic behavior (fixed seeds, stub timings)
- Hardcoded credentials anywhere in test or production code

### Debugging a Test

```bash
# Run with verbose output (Node test runner built-in)
node --test --test-verbose graphql/chatbot/intentClassifier.test.js

# Inspect logs in test output for [chatbot] prefixed messages
```

---

## File Organization

### Core Modules

```
graphql/chatbot/
├── chatbotService.js          # Main orchestrator (routes by intent)
├── intentClassifier.js        # Parses model output → normalized schema
├── config.js                  # Loads env vars, thresholds
├── litellmClient.js           # LiteLLM HTTP client (timeout, retry)
├── calendarTool.js            # Google Calendar API wrapper
├── logger.js                  # Secret-safe structured logging
├── systemprompt.js            # System prompt template
├── chatbotService.test.js     # Integration tests
└── intentClassifier.test.js   # Unit tests
```

### Interfaces

**chatbotService.queryRAG(question: string) → Promise<string>**
- Entry point for chatbot requests
- Returns user-friendly response or error message
- Never throws; always returns a string

**classifyIntent(options) → Promise<IntentClassification>**
- Calls LiteLLM API to get model classification
- Options: `{ question, apiUrl, apiKey, model, timeoutMs, retries }`
- Returns: `{ intent, confidence, needs_rag, params }`

**IntentClassification Schema**
```javascript
{
  intent: 'general' | 'calendar',           // Required
  confidence: number,                       // 0–1 (clamped)
  needs_rag: boolean,                       // Only for general intent
  params: {
    max_results?: number                    // 1–10 (clamped), calendar only
  }
}
```

---

## Runtime Behavior

### Startup

1. Server starts without checking chatbot config (non-blocking)
2. Startup log shows `[chatbot]` prefixed messages:
   ```
   [chatbot] LiteLLM API Key: set
   [chatbot] Google Calendar API Key: set
   [chatbot] Vector Store IDs: 2 configured
   [chatbot] Config status: ready
   ```
   Or (missing keys):
   ```
   [chatbot] LiteLLM API Key: missing
   [chatbot] Google Calendar API Key: missing
   [chatbot] Config status: degraded (chatbot will error if queried)
   ```

### Query Time (First Chatbot Request)

1. Validate config keys exist; return error message if missing
2. Call classifier (no vector-store metadata on this call)
3. Decide routing: calendar | general + RAG | general
4. Execute tool or construct request with conditional metadata
5. Call LiteLLM for final answer
6. Return response or graceful error

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing `LITELLM_VIRTUAL_KEY` | User sees "I'm having trouble answering right now..." |
| Missing `GOOGLE_CALENDAR_API_KEY` | User sees "I'm having trouble answering right now..." |
| Missing `LITELLM_VECTOR_STORE_IDS` | RAG skipped; general answer still works |
| LiteLLM timeout (12s) | Retry once; if still fails, return error |
| Calendar API timeout (8s) | Retry once; if still fails, skip calendar data |
| Invalid model response JSON | Parse fallback; general response without tool data |

---

## Adding a New Intent or Tool

### Step 1: Update Intent Schema

Edit `intentClassifier.js` → `INTENT_CLASSIFIER_SYSTEM_PROMPT`:

```javascript
const INTENT_CLASSIFIER_SYSTEM_PROMPT = `
You are a routing classifier. The user asks a question.
Return JSON: { "intent": "calendar" | "general" | "new_tool", "confidence": 0.5, "needs_rag": boolean, "params": {...} }

For new_tool intent:
- Set intent: "new_tool"
- Set confidence: how sure you are (0–1)
- Set needs_rag: false (or true if this tool needs RAG context)
- Set params.special_param: extracted value
`;
```

### Step 2: Add Decision Logic

Edit `intentClassifier.js` → add helper:

```javascript
function shouldUseNewTool(classification, threshold) {
  return classification.intent === 'new_tool' && 
         classification.confidence >= threshold;
}

module.exports = { ..., shouldUseNewTool };
```

### Step 3: Create Tool Module

Create `graphql/chatbot/newTool.js`:

```javascript
async function executeNewTool(options) {
  const { param1, timeoutMs, retries } = options;
  // Your implementation
  return { result: '...' };
}

module.exports = { executeNewTool };
```

### Step 4: Wire Into Dispatcher

Edit `chatbotService.js`:

```javascript
const { shouldUseNewTool } = require('./intentClassifier');
const { executeNewTool } = require('./newTool');

async function queryRAG(question) {
  // ... earlier code ...
  const shouldUseTool = shouldUseNewTool(classification, config.classificationConfidenceThreshold);
  
  let finalMessages = baseMessages;
  if (shouldUseTool) {
    logger.info('new-tool-execution-start');
    const toolResult = await executeNewTool({ /* options */ });
    finalMessages = [
      ...baseMessages,
      { role: 'system', content: `Tool output: ${JSON.stringify(toolResult)}` }
    ];
    logger.info('new-tool-execution-finished');
  }
  // ... rest of function ...
}
```

### Step 5: Add Tests

Create or update test files:

```javascript
// In chatbotService.test.js
test('new tool intent flow', async (t) => {
  // Mock classifyIntent to return new_tool intent
  // Verify executeNewTool is called
  // Verify tool output is in final messages
});
```

---

## Logging & Observability

### Log Format

All chatbot logs are prefixed with `[chatbot]` for easy grep:

```
[chatbot] intent-classification-start
[chatbot] intent-classification-result { intent: 'calendar', confidence: 0.95, needs_rag: false }
[chatbot] calendar-execution-start
[chatbot] calendar-execution-finished { eventsCount: 3 }
[chatbot] rag-request-skipped { reason: 'low-confidence-or-non-general-intent' }
[chatbot] final-answer-generation-start
```

### Sensitive Data

**Never logged**:
- API keys
- User questions (logged as event count, not text)
- LLM response content (only generation status)
- Vector store data

Safe to grep for metrics:
```bash
grep -E '\[chatbot\] (intent|calendar|rag|final)-' server.log
```

---

## Troubleshooting

### "I'm having trouble answering right now..."

This is the universal fallback. To debug:

1. **Check logs** for `[chatbot] queryRAG-failed` with error details
2. **Verify config**:
   ```bash
   echo "LITELLM_VIRTUAL_KEY: ${LITELLM_VIRTUAL_KEY:?unset}"
   echo "GOOGLE_CALENDAR_API_KEY: ${GOOGLE_CALENDAR_API_KEY:?unset}"
   ```
3. **Test the intent classifier** (if available):
   ```bash
   npx -y node@20 --test graphql/chatbot/intentClassifier.test.js
   ```
4. **Check LiteLLM API status**: `curl https://api.ai.it.ufl.edu/v1/models`

### Chatbot not called in tests

Ensure `axios` mock stubs are active. Check test setup:
```javascript
const axios = require('axios');
test.mock('axios', { default: { post: mockPost } });
```

### Calendar or RAG unexpectedly skipped

Check confidence threshold and `needs_rag` flag:
```bash
grep "\[chatbot\] rag-request-skipped" server.log
```
If reason is `low-confidence-or-non-general-intent`, the classifier didn't recommend RAG (expected).

---

## Deployment Checklist

- [ ] All 13+ tests passing: `npx node@20 --test graphql/chatbot/*.test.js`
- [ ] No hardcoded secrets in code or logs
- [ ] `.env` file has `LITELLM_VIRTUAL_KEY` and `GOOGLE_CALENDAR_API_KEY`
- [ ] `LITELLM_VECTOR_STORE_IDS` set (or accept RAG will be disabled)
- [ ] Logs rotate or are archived (chatbot logs contain no PII)
- [ ] Timeouts configured appropriately for your LiteLLM instance (defaults: 12s LLM, 8s Calendar)

---

## FAQ

**Q: Does the server need `LITELLM_VIRTUAL_KEY` to start?**
A: No. Missing chatbot config does not block startup. Server will error only if someone queries the chatbot.

**Q: What if I don't have vector stores?**
A: Set `LITELLM_VECTOR_STORE_IDS` to an empty string or leave it unset. RAG will be automatically disabled; general answers will still work.

**Q: Can I use a different LiteLLM model?**
A: Yes. Set `LITELLM_MODEL` to any model ID (e.g., `llama-2-70b`). Default is `llama-3.1-70b-instruct`.

**Q: How do I test the chatbot locally?**
A: Run tests: `npx node@20 --test graphql/chatbot/*.test.js`. All external APIs are mocked. No real API keys needed for tests.

**Q: Is the chatbot required for SHPE UF server?**
A: No. It's an optional feature. Server is fully functional without chatbot config.

**Q: What's the confidence threshold?**
A: Default 0.6. Only intents with confidence ≥ 0.6 trigger tool/RAG execution. Adjust in `config.js` → `classificationConfidenceThreshold`.

---

## References

- **LiteLLM Proxy**: https://api.ai.it.ufl.edu/v1/chat/completions
- **Google Calendar API**: https://developers.google.com/calendar/api
- **Node Test Runner**: https://nodejs.org/api/test.html
- **Project Structure**: See [architecture](#architecture) section above
