const { geocodeAlumni } = require('./geocode-alumni');

describe('Geoapify alumni lookup', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEOAPIFY_API_KEY;
  const location = { city: ' Gainesville ', state: ' FL ', country: 'United States' };

  beforeEach(() => {
    process.env.GEOAPIFY_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEOAPIFY_API_KEY;
    else process.env.GEOAPIFY_API_KEY = originalKey;
  });

  test('uses structured city/state/country and returns coordinates', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ lat: 29.65, lon: -82.32 }] }) });
    await expect(geocodeAlumni(location)).resolves.toEqual({ latitude: 29.65, longitude: -82.32 });
    const url = fetch.mock.calls[0][0];
    expect(url.origin).toBe('https://api.geoapify.com');
    expect(Object.fromEntries(url.searchParams)).toEqual({ city: 'Gainesville', state: 'FL', country: 'United States', type: 'city', format: 'json', limit: '1', apiKey: 'test-key' });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test('supports international locations without a state', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ lat: 48.85, lon: 2.35 }] }) });
    await geocodeAlumni({ city: 'Paris', country: 'France' });
    expect(fetch.mock.calls[0][0].searchParams.has('state')).toBe(false);
  });

  test('fails before requesting when key is missing', async () => {
    delete process.env.GEOAPIFY_API_KEY;
    await expect(geocodeAlumni(location)).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([401, 403, 429, 500])('classifies HTTP %s as a service failure', async status => {
    fetch.mockResolvedValue({ ok: false, status });
    await expect(geocodeAlumni(location)).rejects.toMatchObject({ code: 'HTTP_ERROR', status });
  });

  test('distinguishes no matches from service failures', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
    await expect(geocodeAlumni(location)).rejects.toMatchObject({ code: 'LOCATION_NOT_FOUND' });
  });

  test.each([{}, { results: [{ lat: null, lon: 2 }] }, { results: [{ lat: 91, lon: 2 }] }])('rejects malformed coordinates %j', async data => {
    fetch.mockResolvedValue({ ok: true, json: async () => data });
    await expect(geocodeAlumni(location)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  test('sanitizes network and timeout errors', async () => {
    fetch.mockRejectedValue(new Error('URL contains test-key'));
    await expect(geocodeAlumni(location)).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', message: 'SERVICE_UNAVAILABLE' });
  });
});
