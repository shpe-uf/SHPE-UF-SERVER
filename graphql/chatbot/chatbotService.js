// graphql/chatbot/ragService.js
const axios = require('axios');
const { SYSTEM_PROMPT } = require('./prompt');

// Configuration
const LITELLM_API_URL = 'https://api.ai.it.ufl.edu/v1/chat/completions';
const LITELLM_API_KEY = process.env.LITELLM_VIRTUAL_KEY; 
const GOOGLE_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY; 
const SHPE_CALENDAR_ID = 'calendar.shpeuf@gmail.com';

async function queryRAG(question) {
    try {
        // 1. Initialize conversation with the imported Master Prompt
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: question }
        ];
        
        const headers = { 
            'Authorization': `Bearer ${LITELLM_API_KEY}`,
            'Content-Type': 'application/json'
        };

        // 1. Initial Call: Inform the AI it has the 'get_calendar_events' tool
        const response1 = await axios.post(LITELLM_API_URL, {
            model: "llama3.2-70b-instruct",
            messages,
            tools: [{
                type: "function",
                function: {
                    name: "get_calendar_events",
                    description: "Fetch upcoming public events from the SHPE UF Master Calendar."
                }
            }]
        }, { headers });

        const message = response1.data.choices[0].message;

        // 2. Handle Tool Call (if the AI thinks it needs the calendar)
        if (message.tool_calls) {
            messages.push(message);
            const toolCall = message.tool_calls[0];

            // 3. Native Fetch: Get public events directly from Google (No OAuth needed!)
            const now = new Date().toISOString();
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(SHPE_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=5`;
            
            const calResponse = await axios.get(url);
            const events = calResponse.data.items.map(e => ({
                summary: e.summary,
                start: e.start.dateTime || e.start.date,
                location: e.location || 'TBA'
            }));

            // 4. Send the result back to the AI
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(events)
            });

            // 5. Final Call: Get the natural language answer
            const response2 = await axios.post(LITELLM_API_URL, {
                model: "llama3.2-70b-instruct",
                messages
            }, { headers });

            return response2.data.choices[0].message.content;
        }

        return message.content;

    } catch (error) {
        console.error('Bot Error:', error.response?.data || error.message);
        return "I'm having trouble checking the calendar right now. Please try again later.";
    }
}

module.exports = { queryRAG };
