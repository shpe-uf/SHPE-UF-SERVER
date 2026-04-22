const { createChatCompletion } = require('./litellmClient');

const SUPPORTED_INTENTS = new Set(['calendar', 'general', 'out_of_scope']);

const INTENT_CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for SHPE UF chatbot routing.
Return JSON only with this exact schema:
{
  "intent": "calendar" | "general" | "out_of_scope",
  "confidence": number between 0 and 1,
  "needs_rag": boolean,
  "params": {
    "max_results": integer from 1 to 10 (optional, only for calendar)
  }
}
No markdown. No extra keys.
Choose "calendar" only when the user asks for schedules, meetings, event dates, event times, event locations, or upcoming chapter events.
Choose "out_of_scope" when the user asks for something unrelated to SHPE UF, student org info, UF chapter info, events, or SHPE career resources (e.g., cooking, travel planning, relationship advice, medical/legal advice, entertainment, or solving homework problems).
Choose "general" for everything else.
Set "needs_rag" to true only for "general" when the user likely needs an official document answer.`;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeClassification(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { intent: 'general', confidence: 0, needs_rag: false, params: {} };
  }

  const rawIntent = typeof parsed.intent === 'string' ? parsed.intent.toLowerCase().trim() : '';
  const intent = SUPPORTED_INTENTS.has(rawIntent) ? rawIntent : 'general';

  const confidence = Number.isFinite(Number(parsed.confidence))
    ? clamp(Number(parsed.confidence), 0, 1)
    : 0;

  const needsRag = intent === 'general' ? Boolean(parsed.needs_rag) : false;

  const params = {};
  if (parsed.params && typeof parsed.params === 'object' && parsed.params.max_results !== undefined) {
    params.max_results = clamp(Number(parsed.params.max_results) || 5, 1, 10);
  }

  return { intent, confidence, needs_rag: needsRag, params };
}

function tryParseJsonObject(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    // Try extracting the first object-looking block.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = text.slice(start, end + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function parseIntentClassification(rawText) {
  const parsed = tryParseJsonObject(rawText);
  return normalizeClassification(parsed);
}

function shouldUseCalendarIntent(classification, threshold) {
  return (
    classification.intent === 'calendar' &&
    Number(classification.confidence) >= Number(threshold)
  );
}

function shouldUseRag(classification, threshold) {
  return (
    classification.intent === 'general' &&
    Boolean(classification.needs_rag) &&
    Number(classification.confidence) >= Number(threshold)
  );
}

async function classifyIntent({
  question,
  apiUrl,
  apiKey,
  model,
  temperature,
  timeoutMs,
  retries,
}) {
  const response = await createChatCompletion({
    apiUrl,
    apiKey,
    timeoutMs,
    retries,
    payload: {
      model,
      temperature,
      messages: [
        { role: 'system', content: INTENT_CLASSIFIER_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
    },
  });

  const content = response?.data?.choices?.[0]?.message?.content || '';
  return parseIntentClassification(content);
}

module.exports = {
  classifyIntent,
  parseIntentClassification,
  shouldUseCalendarIntent,
  shouldUseRag,
};
