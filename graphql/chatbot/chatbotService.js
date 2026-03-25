// graphql/chatbot/chatbotService.js
const { SYSTEM_PROMPT } = require('./systemprompt');
const { getChatbotConfig } = require('./config');
const { createChatCompletion } = require('./litellmClient');
const { fetchCalendarEvents } = require('./calendarTool');
const {
    classifyIntent,
    shouldUseCalendarIntent,
} = require('./intentClassifier');
const logger = require('./logger');

function buildCalendarContextMessage(events) {
    return {
        role: 'system',
        content: `Calendar data from backend API. Use this data as authoritative for event scheduling questions.\n${JSON.stringify(events)}`,
    };
}

async function queryRAG(question) {
    try {
        const config = getChatbotConfig();

        // Runtime validation: these must exist to query chatbot
        if (!config.litellmClassifierApiKey) {
            logger.error('runtime-validation-failed', {
                missing: 'LITELLM_CLASSIFIER_VIRTUAL_KEY',
                hint: 'Set LITELLM_CLASSIFIER_VIRTUAL_KEY env var to use chatbot classifier',
            });
            return "I'm having trouble answering right now. Please try again later.";
        }

        if (!config.litellmResponseApiKey) {
            logger.error('runtime-validation-failed', {
                missing: 'LITELLM_RESPONSE_VIRTUAL_KEY',
                hint: 'Set LITELLM_RESPONSE_VIRTUAL_KEY env var to use chatbot response generation',
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
                apiKey: config.litellmClassifierApiKey,
                model: config.litellmClassifierModel,
                temperature: config.classifierTemperature,
                timeoutMs: config.llmTimeoutMs,
                retries: config.llmRetries,
            });
        } catch (error) {
            logger.warn('intent-classification-failed-fallback-general', {
                reason: error.response?.status || error.message,
            });
            classification = { intent: 'general', confidence: 0,  params: {} };
        }

        logger.info('intent-classification-result', {
            intent: classification.intent,
            confidence: classification.confidence,
        });

        const baseMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
        ];

        const shouldUseCalendar = shouldUseCalendarIntent(
            classification,
            config.classificationConfidenceThreshold
        );

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
            apiKey: config.litellmResponseApiKey,
            timeoutMs: config.llmTimeoutMs,
            retries: config.llmRetries,
            payload: {
                model: config.litellmResponseModel,
                temperature: config.responseTemperature,
                messages: finalMessages,
                vector_store_ids: config.vectorStoreIds,
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
