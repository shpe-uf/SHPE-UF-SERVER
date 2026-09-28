const nodegeocoder = require('node-geocoder');
const { Query, Mutation } = require('./alumnis');
const Alumni = require('../../models/Alumni');

jest.mock('../../models/Alumni');
jest.mock('node-geocoder', () => jest.fn());

describe('alumnis resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAlumnis', () => {
        test('returns alumni sorted by last/first name', async () => {
            const mockAlumni = [{ lastName: 'Doe' }, { lastName: 'Smith' }];
            const sort = jest.fn().mockResolvedValueOnce(mockAlumni);
            Alumni.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getAlumnis();

            expect(sort).toHaveBeenCalledWith({ lastName: 1, firstName: 1 });
            expect(result).toEqual(mockAlumni);
        });
    });

    describe('registerAlumni', () => {
        // The resolver mutates registerAlumniInput.grad.year in place, so each
        // test needs its own fresh copy rather than a shared object reference.
        const buildValidInput = () => ({
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            undergrad: { university: 'University of Florida', year: '2020', major: 'Computer Science' },
            grad: { university: '', year: '', major: '' },
            employer: 'Acme Corp',
            position: 'Engineer',
            location: { city: 'Gainesville', state: 'FL', country: 'United States' },
            linkedin: 'https://linkedin.com/in/janedoe',
        });

        test('registers a new alumni when input is valid and email is unique', async () => {
            const validInput = buildValidInput();
            const save = jest.fn().mockResolvedValueOnce();
            Alumni.findOne = jest.fn().mockResolvedValueOnce(null);
            Alumni.mockImplementation((data) => ({ ...data, save }));
            nodegeocoder.mockReturnValue({
                geocode: jest.fn().mockResolvedValueOnce([{ latitude: 29.6516, longitude: -82.3248 }]),
            });

            const result = await Mutation.registerAlumni(undefined, {
                registerAlumniInput: validInput,
            });

            expect(Alumni.findOne).toHaveBeenCalledWith({ email: validInput.email });
            expect(save).toHaveBeenCalled();
            expect(result).toMatchObject({ firstName: 'Jane', lastName: 'Doe', email: validInput.email });
        });

        test('rejects when the email is already registered', async () => {
            const validInput = buildValidInput();
            Alumni.findOne = jest.fn().mockResolvedValueOnce({ email: validInput.email });

            await expect(
                Mutation.registerAlumni(undefined, { registerAlumniInput: validInput })
            ).rejects.toThrow('that email already exists.');
            expect(nodegeocoder).not.toHaveBeenCalled();
        });
    });
});
