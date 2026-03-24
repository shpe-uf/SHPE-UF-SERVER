const axios = require('axios');

function clampMaxResults(value, fallback = 5) {
  return Math.min(Math.max(Number(value) || fallback, 1), 10);
}

async function fetchCalendarEvents({
  googleApiKey,
  calendarId,
  maxResults,
  timeoutMs,
  retries,
}) {
  const safeMaxResults = clampMaxResults(maxResults);
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events?key=${googleApiKey}&timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=${safeMaxResults}`;

  let attempt = 0;
  while (true) {
    try {
      const calResponse = await axios.get(url, { timeout: timeoutMs });
      return (calResponse.data.items || []).map((e) => ({
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        location: e.location || 'TBA',
      }));
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
    }
  }
}

module.exports = {
  fetchCalendarEvents,
  clampMaxResults,
};
