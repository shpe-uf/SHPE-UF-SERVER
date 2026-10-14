jest.mock('../../models/Alumni');
jest.mock('../../util/geocode-alumni');
const Alumni = require('../../models/Alumni');
const { geocodeAlumni } = require('../../util/geocode-alumni');
const { Mutation } = require('./alumnis');

const input = () => ({ registerAlumniInput: {
  firstName: 'Maria', lastName: 'Garcia', email: 'maria@example.com',
  undergrad: { university: 'UF', year: '2020', major: 'Engineering' },
  grad: { university: '', year: '', major: '' },
  employer: 'Example', position: 'Engineer',
  location: { city: 'Gainesville', state: 'FL', country: 'United States' },
  linkedin: 'https://www.linkedin.com/in/example'
} });

describe('alumni registration geocoding', () => {
  let save;
  beforeEach(() => {
    jest.clearAllMocks();
    save = jest.fn().mockResolvedValue(undefined);
    Alumni.mockImplementation(data => ({ ...data, save }));
    Alumni.findOne.mockResolvedValue(null);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('saves usable coordinates after a successful lookup', async () => {
    geocodeAlumni.mockResolvedValue({ latitude: 29.65, longitude: -82.32 });
    const alumni = await Mutation.registerAlumni(null, input());
    expect(save).toHaveBeenCalledTimes(1);
    expect(alumni.coordinates.latitude).toBeCloseTo(29.65, 1);
    expect(alumni.coordinates.longitude).toBeCloseTo(-82.32, 1);
  });

  test.each([
    ['LOCATION_NOT_FOUND', 'BAD_USER_INPUT', 'Location not found'],
    ['HTTP_ERROR', 'INTERNAL_SERVER_ERROR', 'temporarily unavailable'],
    ['MISSING_API_KEY', 'INTERNAL_SERVER_ERROR', 'temporarily unavailable'],
    ['SERVICE_UNAVAILABLE', 'INTERNAL_SERVER_ERROR', 'temporarily unavailable'],
  ])('%s prevents saving and reports the appropriate error', async (code, expectedCode, message) => {
    geocodeAlumni.mockRejectedValue(Object.assign(new Error(code), { code }));
    await expect(Mutation.registerAlumni(null, input())).rejects.toMatchObject({
      message: expect.stringContaining(message),
      extensions: { exception: { code: expectedCode } }
    });
    expect(save).not.toHaveBeenCalled();
  });
});
