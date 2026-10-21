const { Query, Mutation } = require('./corporations');
const Corporation = require('../../models/Corporation');

jest.mock('../../models/Corporation');

describe('corporations resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCorporations', () => {
        test('returns corporations sorted by name', async () => {
            const mockCorporations = [{ name: 'A Corp' }, { name: 'B Corp' }];
            const sort = jest.fn().mockResolvedValueOnce(mockCorporations);
            Corporation.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getCorporations();

            expect(sort).toHaveBeenCalledWith({ name: 1 });
            expect(result).toEqual(mockCorporations);
        });
    });

    const validCreateInput = {
        name: 'Acme Corp',
        logo: 'logo.png',
        slogan: 'We build things',
        majors: ['Computer Science'],
        industries: ['Technology'],
        overview: 'An overview',
        mission: 'A mission',
        goals: 'Some goals',
        businessModel: 'B2B',
        newsLink: 'https://acme.example.com/news',
        applyLink: 'https://acme.example.com/apply',
        academia: false,
        govContractor: false,
        nonProfit: false,
        visaSponsor: true,
        shpeSponsor: true,
        industryPartnership: false,
        fallBBQ: false,
        springBBQ: false,
        nationalConvention: false,
        recruitmentDay: false,
        signUpLink: '',
    };

    describe('createCorporation', () => {
        test('creates a new corporation when input is valid and name is unique', async () => {
            const mockCorporations = [{ name: 'Acme Corp' }];
            Corporation.findOne = jest.fn().mockResolvedValueOnce(null);
            Corporation.find = jest.fn().mockResolvedValueOnce(mockCorporations);
            Corporation.prototype.save = jest.fn().mockResolvedValueOnce();

            const result = await Mutation.createCorporation(undefined, {
                createCorporationInput: validCreateInput,
            });

            expect(Corporation.findOne).toHaveBeenCalledWith({ name: validCreateInput.name });
            expect(result).toEqual(mockCorporations);
        });

        test('rejects when required fields are missing', async () => {
            const invalidInput = { ...validCreateInput, name: '' };

            await expect(
                Mutation.createCorporation(undefined, { createCorporationInput: invalidInput })
            ).rejects.toMatchObject({
                extensions: {
                    exception: {
                        code: 'BAD_USER_INPUT',
                        errors: { name: 'No name was provided.' },
                    },
                },
            });
            expect(Corporation.findOne).not.toHaveBeenCalled();
        });

        test('rejects when the corporation name already exists', async () => {
            Corporation.findOne = jest.fn().mockResolvedValueOnce({ name: 'Acme Corp' });

            await expect(
                Mutation.createCorporation(undefined, { createCorporationInput: validCreateInput })
            ).rejects.toThrow('This corporation is already in our database.');
        });
    });

    describe('editCorporation', () => {
        const editInput = { ...validCreateInput, id: 'corp-1' };

        test('updates the corporation when it exists', async () => {
            const updatedCorporation = { ...editInput };
            Corporation.findOne = jest.fn().mockResolvedValueOnce({ _id: 'corp-1' });
            Corporation.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedCorporation);

            const result = await Mutation.editCorporation(undefined, {
                editCorporationInput: editInput,
            });

            expect(Corporation.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'corp-1' },
                expect.objectContaining({ name: editInput.name }),
                { new: true }
            );
            expect(result).toEqual(updatedCorporation);
        });

        test('rejects when the corporation does not exist', async () => {
            Corporation.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.editCorporation(undefined, { editCorporationInput: editInput })
            ).rejects.toThrow('Company not found.');
        });
    });

    describe('deleteCorporation', () => {
        test('deletes the corporation and returns the remaining list', async () => {
            const remainingCorporations = [{ name: 'Other Corp' }];
            Corporation.deleteOne = jest.fn().mockResolvedValueOnce({});
            Corporation.find = jest.fn().mockResolvedValueOnce(remainingCorporations);

            const result = await Mutation.deleteCorporation(undefined, {
                corporationId: 'corp-1',
            });

            expect(Corporation.deleteOne).toHaveBeenCalledWith({ _id: 'corp-1' });
            expect(result).toEqual(remainingCorporations);
        });

        test('rejects when the delete operation fails', async () => {
            Corporation.deleteOne = jest.fn().mockRejectedValueOnce(new Error('db down'));

            await expect(
                Mutation.deleteCorporation(undefined, { corporationId: 'corp-1' })
            ).rejects.toMatchObject({
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });
});
