class GeocodingError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function geocodeAlumni(location) {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) throw new GeocodingError("MISSING_API_KEY");

  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.search = new URLSearchParams({
    city: location.city.trim(),
    country: location.country.trim(),
    ...(location.state?.trim() ? { state: location.state.trim() } : {}),
    type: "city",
    format: "json",
    limit: "1",
    apiKey,
  }).toString();

  let result;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new GeocodingError("HTTP_ERROR", response.status);
    result = await response.json();
  } catch (err) {
    // Never propagate provider errors/URLs: they can contain the API key.
    if (err instanceof GeocodingError) throw err;
    throw new GeocodingError("SERVICE_UNAVAILABLE");
  }

  if (!Array.isArray(result?.results)) {
    throw new GeocodingError("INVALID_RESPONSE");
  }
  if (!result.results.length) throw new GeocodingError("LOCATION_NOT_FOUND");
  const { lat, lon } = result.results[0];
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new GeocodingError("INVALID_RESPONSE");
  }
  return { latitude: lat, longitude: lon };
}

module.exports = { geocodeAlumni };
