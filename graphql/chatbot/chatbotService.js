// graphql/chatbot/chatbotService.js
const { buildSystemPrompt } = require("./systemprompt");
const { getChatbotConfig } = require("./config");
const { createChatCompletion } = require("./litellmClient");
const { fetchCalendarEvents } = require("./calendarTool");
const {
  classifyIntent,
  shouldUseCalendarIntent,
  shouldUseRag,
} = require("./intentClassifier");
const logger = require("./logger");

const OUT_OF_SCOPE_PATTERNS = [];

const DOC_TOPIC_RULES = [
  {
    id: "professionalism-resume",
    match: /\bresume\b|\bprofessionalism\b|\bep\b|\bbullet\b/i,
    name: "Professionalism, Resume, and EP",
    link: "https://drive.google.com/file/d/12Ty7Xt6nVeqyVoR2epwMescmw0ZW5TqB/view?usp=sharing",
  },
  {
    id: "interviews-101",
    match: /\binterview\b|\bstar\b/i,
    name: "Interviews 101",
    link: "https://drive.google.com/file/d/1g4RzZWSWotNginnI4ynZZEDvDXJf8F6f/view?usp=sharing",
  },
  {
    id: "networking-linkedin",
    match: /\bnetwork\b|\blinkedin\b|\belevator pitch\b/i,
    name: "Networking & Linkedin",
    link: "https://drive.google.com/file/d/18Jwm10muiHDA3_R5d_jiWbDcTzRAwl0_/view?usp=sharing",
  },
  {
    id: "behavioral-questions",
    match: /\bbehavioral\b/i,
    name: "Behavioral Interview Sample Questions",
    link: "https://docs.google.com/document/d/1FDaX5KXw-qCzMjeL3UH7F-DRkjxpKg3CjN_XMcGqHsk/edit?tab=t.0",
  },
  {
    id: "cover-letter",
    match: /\bcover letter\b/i,
    name: "Cover Letter Template",
    link: "https://docs.google.com/document/d/1dMTamT5LZ25CJB8L8o1tWuPmUOGeCw0S6YbEXrXHOmE/edit?tab=t.0",
  },
  {
    id: "corporate-database",
    match: /\bcorporate\b|\bsponsor\b|\bcontacts\b/i,
    name: "SHPE-UF Corporate Database",
    link: "https://drive.google.com/file/d/1lolTWTDZ1vlMygtQnoSbnyZUOgj9jU4L/view",
  },
  {
    id: "national-convention",
    match: /\bconvention\b/i,
    name: "National Convention",
    link: "https://drive.google.com/file/d/1W6CtxhqhKVky85b5VE57MgfcEoV6zJTN/view?usp=sharing",
  },
];

function isOutOfScopeQuestion(question) {
  const q = String(question || "");
  return OUT_OF_SCOPE_PATTERNS.some((re) => re.test(q));
}

function detectDocTopic(question) {
  const q = String(question || "");
  return DOC_TOPIC_RULES.find((r) => r.match.test(q)) || null;
}

function buildExtraBody(vectorStoreIds) {
  if (!vectorStoreIds.length) {
    return undefined;
  }

  return {
    metadata: {
      vector_stores: vectorStoreIds,
    },
  };
}

function formatCalendarEventsForPrompt(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return "No upcoming events are currently scheduled.";
  }

  return events
    .map((e) => {
      const title = e?.summary ? String(e.summary) : "Event";
      const when = e?.start ? String(e.start) : "TBA";
      const where = e?.location ? String(e.location) : "TBA";
      return `- ${title} | ${when} | ${where}`;
    })
    .join("\n");
}

function buildCalendarContextMessage(events) {
  return {
    role: "system",
    content: `Official SHPE UF calendar events (authoritative):\n${formatCalendarEventsForPrompt(
      events,
    )}`,
  };
}

function countSentences(text) {
  const s = String(text || "").trim();
  if (!s) return 0;
  return s
    .split(/[.!?]+/) // rough
    .map((x) => x.trim())
    .filter(Boolean).length;
}

function truncateToSentences(text, maxSentences) {
  const s = String(text || "").trim();
  if (!s) return "";

  const parts = s.split(/([.!?]+\s+)/);
  let out = "";
  let count = 0;

  for (let i = 0; i < parts.length; i += 2) {
    const sentence = (parts[i] || "").trim();
    const punct = parts[i + 1] || "";
    if (!sentence) continue;
    out += (out ? " " : "") + sentence + (punct.trim() ? punct.trim() : ".");
    count += 1;
    if (count >= maxSentences) break;
  }

  return out.trim();
}

function approxTokens(text) {
  const s = String(text || "").trim();
  if (!s) return 0;
  // Rough but stable: ~4 chars/token.
  return Math.ceil(s.length / 4);
}

function shrinkToBulletsAndSentences(text, maxItems) {
  const lines = String(text || "").split("\n");
  const hasNumberedList = lines.some((l) => /^\s*\d+\.\s+/.test(l));

  const out = [];

  if (hasNumberedList) {
    let itemCount = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const line = String(lines[i] || "");
      const isNumbered = /^\s*\d+\.\s+/.test(line);
      const isSubBullet = /^\s{2,}[-*•]\s+/.test(line);

      if (isSubBullet) continue;

      if (isNumbered) {
        itemCount += 1;
        if (itemCount > maxItems) continue;

        let merged = line;
        const next = String(lines[i + 1] || "");
        const nextIsList = /^\s*([*-•]|\d+\.)\s+/.test(next);
        if (next.trim() && !nextIsList && next.trim().length < 140) {
          merged = `${line} ${next.trim()}`;
          i += 1;
        }

        out.push(
          merged.length > 180 ? `${merged.slice(0, 177).trimEnd()}…` : merged,
        );
        continue;
      }

      out.push(line);
    }
  } else {
    let itemCount = 0;

    for (const rawLine of lines) {
      const line = String(rawLine || "");
      const isBullet = /^\s*[-*•]\s+/.test(line);

      if (isBullet) {
        itemCount += 1;
        if (itemCount > maxItems) continue;
        out.push(line.length > 180 ? `${line.slice(0, 177).trimEnd()}…` : line);
        continue;
      }

      out.push(line);
    }
  }

  // Drop example blocks (common verbosity source).
  return out
    .join("\n")
    .replace(/\n\s*Example:\s*[\s\S]*$/i, "")
    .trim();
}

function shrinkToTokenBudget(text, budgetTokens) {
  let out = String(text || "").trim();
  if (!out) return "";

  // First pass: remove obvious verbosity.
  out = shrinkToBulletsAndSentences(out, 5);

  // Second pass: if still too long, collapse to <=3 sentences.
  if (approxTokens(out) > budgetTokens) {
    out = truncateToSentences(out.replace(/\n+/g, " "), 3);
  }

  // Final pass: hard trim by characters if needed.
  if (approxTokens(out) > budgetTokens) {
    const maxChars = Math.max(1, budgetTokens * 4);
    out = out.slice(0, maxChars);
    out = out.replace(/\s+\S*$/, "").trim();
  }

  return out.trim();
}

function getDeterministicAnswer(_question) {
  // Intentionally disabled: deterministic answers should live in shared config/prompting.
  return null;
}

function postProcessAnswer({ content, docTopic }) {
  let text = String(content || "").trim();
  if (!text) return "";

  if (docTopic && docTopic.link && !text.includes(docTopic.link)) {
    text = `${docTopic.name}\n${docTopic.link}\n\n${text}`.trim();
  }

  const hasOfficialLink =
    /https:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(text);
  const hasList = /(^|\n)\s*(?:[-*•]|\d+\.)\s+/.test(text);

  // Enforce mobile brevity for non-list answers.
  if (!hasList && countSentences(text) > 3) {
    text = truncateToSentences(text, 3);
  }

  // Hard mobile budget: allow a small exception when a link/list is present.
  const budget = hasOfficialLink || hasList ? 220 : 200;
  if (approxTokens(text) > budget) {
    text = shrinkToTokenBudget(text, budget);
  }

  return text;
}

async function queryRAG(question, persona) {
  try {
    const config = getChatbotConfig();

    // Runtime validation: these must exist to query chatbot
    if (!config.litellmApiKey) {
      logger.error("runtime-validation-failed", {
        missing: "LITELLM_RESPONSE_KEY",
        hint: "Set LITELLM_RESPONSE_KEY (or legacy LITELLM_VIRTUAL_KEY) env var to use chatbot",
      });
      return "I'm having trouble answering right now. Please try again later.";
    }

    if (isOutOfScopeQuestion(question)) {
      return "I can help with SHPE UF (events, chapter info, and career resources). I can’t help with that topic.";
    }

    const deterministic = getDeterministicAnswer(question);
    if (deterministic) {
      return postProcessAnswer({
        content: deterministic,
        docTopic: detectDocTopic(question),
      });
    }

    const docTopic = detectDocTopic(question);

    logger.info("intent-classification-start");
    let classification;
    try {
      classification = await classifyIntent({
        question,
        apiUrl: config.litellmApiUrl,
        apiKey: config.litellmClassifierKey || config.litellmApiKey,
        model: config.litellmClassifierModel,
        temperature: config.classifierTemperature,
        timeoutMs: config.llmTimeoutMs,
        retries: config.llmRetries,
      });
    } catch (error) {
      logger.warn("intent-classification-failed-fallback-general", {
        reason: error.response?.status || error.message,
      });
      classification = {
        intent: "general",
        confidence: 0,
        needs_rag: false,
        params: {},
      };
    }

    logger.info("intent-classification-result", {
      intent: classification.intent,
      confidence: classification.confidence,
      needs_rag: Boolean(classification.needs_rag),
    });

    const isOutOfScope =
      classification.intent === "out_of_scope" &&
      Number(classification.confidence) >=
        Number(config.classificationConfidenceThreshold);

    if (isOutOfScope) {
      logger.info("out-of-scope-refusal", {
        confidence: classification.confidence,
      });
      return "I can help with SHPE UF (events, chapter info, and career resources). I can’t help with that topic.";
    }

    const baseMessages = [
      { role: "system", content: buildSystemPrompt(persona) },
      ...(docTopic
        ? [
            {
              role: "system",
              content: `If this question matches an official SHPE document topic, you MUST include this exact link verbatim on its own line (do not shorten it):\n${docTopic.link}\nUse the document name: ${docTopic.name}.`,
            },
          ]
        : []),
      { role: "user", content: question },
    ];

    const shouldUseCalendar = shouldUseCalendarIntent(
      classification,
      config.classificationConfidenceThreshold,
    );
    const shouldAttachRag =
      shouldUseRag(classification, config.classificationConfidenceThreshold) &&
      config.vectorStoreIds.length > 0;

    if (classification.needs_rag && !shouldAttachRag) {
      logger.warn("rag-request-skipped", {
        reason: config.vectorStoreIds.length
          ? "low-confidence-or-non-general-intent"
          : "missing-vector-store-ids",
      });
    }

    let finalMessages = baseMessages;
    if (shouldUseCalendar) {
      if (!config.googleApiKey) {
        logger.error("runtime-validation-failed", {
          missing: "GOOGLE_CALENDAR_API_KEY",
          hint: "Set GOOGLE_CALENDAR_API_KEY env var to answer calendar questions",
        });
        return "I can’t access the chapter calendar right now. Please check SHPE UF’s Linktree or Instagram for the latest updates.";
      }

      logger.info("calendar-execution-start");
      const events = await fetchCalendarEvents({
        googleApiKey: config.googleApiKey,
        calendarId: config.shpeCalendarId,
        maxResults: classification.params.max_results,
        timeoutMs: config.calendarTimeoutMs,
        retries: config.calendarRetries,
      });
      finalMessages = [...baseMessages, buildCalendarContextMessage(events)];
      logger.info("calendar-execution-finished", {
        eventsCount: events.length,
      });
    }

    logger.info("final-answer-generation-start");
    const finalResponse = await createChatCompletion({
      apiUrl: config.litellmApiUrl,
      apiKey: config.litellmApiKey,
      timeoutMs: config.llmTimeoutMs,
      retries: config.llmRetries,
      payload: {
        model: config.litellmResponseModel,
        temperature: config.responseTemperature,
        max_tokens: 200,
        messages: finalMessages,
        extra_body: shouldAttachRag
          ? buildExtraBody(config.vectorStoreIds)
          : undefined,
      },
    });

    const content = finalResponse?.data?.choices?.[0]?.message?.content;
    if (!content) {
      return "I'm having trouble answering right now. Please try again later.";
    }

    const finalText = postProcessAnswer({ content, docTopic });
    return (
      finalText ||
      "I'm having trouble answering right now. Please try again later."
    );
  } catch (error) {
    logger.error("queryRAG-failed", error);
    return "I'm having trouble answering right now. Please try again later.";
  }
}

module.exports = { queryRAG };
