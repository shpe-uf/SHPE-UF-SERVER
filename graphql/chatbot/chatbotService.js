// graphql/chatbot/chatbotService.js
const { buildSystemPrompt } = require('./systemprompt');
const { getChatbotConfig } = require('./config');
const { createChatCompletion } = require('./litellmClient');
const { fetchCalendarEvents } = require('./calendarTool');
const {
    classifyIntent,
    shouldUseCalendarIntent,
    shouldUseRag,
} = require('./intentClassifier');
const logger = require('./logger');

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

function buildCalendarContextMessage(events) {
    return {
        role: 'system',
        content: `Calendar data from backend API. Use this data as authoritative for event scheduling questions.\n${JSON.stringify(events)}`,
    };
}

async function queryRAG(question, persona) {
    try {
        const config = getChatbotConfig();

        // Runtime validation: these must exist to query chatbot
        if (!config.litellmApiKey) {
            logger.error('runtime-validation-failed', {
                missing: 'LITELLM_VIRTUAL_KEY',
                hint: 'Set LITELLM_VIRTUAL_KEY env var to use chatbot',
            });
            return "I'm having trouble answering right now. Please try again later.";
        }

        if (!config.googleApiKey) {
            logger.error('runtime-validation-failed', {
                missing: 'GOOGLE_CALENDAR_API_KEY',
                hint: 'Set GOOGLE_CALENDAR_API_KEY env var to use chatbot',
            });
            return "I'm having trouble answering right now. Please try again later.";
        }

        logger.info('intent-classification-start');
        let classification;
        try {
            classification = await classifyIntent({
                question,
                apiUrl: config.litellmApiUrl,
                apiKey: config.litellmApiKey,
                model: config.litellmClassifierModel,
                temperature: config.classifierTemperature,
                timeoutMs: config.llmTimeoutMs,
                retries: config.llmRetries,
            });
        } catch (error) {
            logger.warn('intent-classification-failed-fallback-general', {
                reason: error.response?.status || error.message,
            });
            classification = { intent: 'general', confidence: 0, needs_rag: false, params: {} };
        }

        logger.info('intent-classification-result', {
            intent: classification.intent,
            confidence: classification.confidence,
            needs_rag: Boolean(classification.needs_rag),
        });

        const baseMessages = [
            { role: 'system', content: buildSystemPrompt(persona) },
            { role: 'user', content: question },
        ];

        const shouldUseCalendar = shouldUseCalendarIntent(
            classification,
            config.classificationConfidenceThreshold
        );
        const shouldAttachRag = shouldUseRag(
            classification,
            config.classificationConfidenceThreshold
        ) && config.vectorStoreIds.length > 0;

        if (classification.needs_rag && !shouldAttachRag) {
            logger.warn('rag-request-skipped', {
                reason: config.vectorStoreIds.length ? 'low-confidence-or-non-general-intent' : 'missing-vector-store-ids',
            });
        }

        let finalMessages = baseMessages;
        if (shouldUseCalendar) {
            logger.info('calendar-execution-start');
            const events = await fetchCalendarEvents({
                googleApiKey: config.googleApiKey,
                calendarId: config.shpeCalendarId,
                maxResults: classification.params.max_results,
                timeoutMs: config.calendarTimeoutMs,
                retries: config.calendarRetries,
            });
            finalMessages = [...baseMessages, buildCalendarContextMessage(events)];
            logger.info('calendar-execution-finished', { eventsCount: events.length });
        }

        logger.info('final-answer-generation-start');
        const finalResponse = await createChatCompletion({
            apiUrl: config.litellmApiUrl,
            apiKey: config.litellmApiKey,
            timeoutMs: config.llmTimeoutMs,
            retries: config.llmRetries,
            payload: {
                model: config.litellmResponseModel,
                temperature: config.responseTemperature,
                messages: finalMessages,
                extra_body: shouldAttachRag ? buildExtraBody(config.vectorStoreIds) : undefined,
            },
        });

        const content = finalResponse?.data?.choices?.[0]?.message?.content;
        if (!content) {
            return "I'm having trouble answering right now. Please try again later.";
        }

        return content;

    } catch (error) {
        logger.error('queryRAG-failed', error);
        return "I'm having trouble answering right now. Please try again later.";
    }
}

module.exports = { queryRAG };
