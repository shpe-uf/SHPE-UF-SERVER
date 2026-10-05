const { Query, Mutation } = require('./partners');
const Partner = require('../../models/Partner');

jest.mock('../../models/Partner');

describe('partners resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPartners', () => {
        test('returns partners sorted by name', async () => {
            const mockPartners = [{ name: 'A Partner' }, { name: 'B Partner' }];
            const sort = jest.fn().mockResolvedValueOnce(mockPartners);
            Partner.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getPartners();

            expect(sort).toHaveBeenCalledWith({ name: 1 });
            expect(result).toEqual(mockPartners);
        });
    });

    describe('createPartner', () => {
        const validInput = { name: 'Acme Corp', photo: 'logo.png', tier: 'Gold' };

        test('creates a new partner when input is valid and name is unique', async () => {
            const save = jest.fn().mockResolvedValueOnce({ ...validInput, _id: 'partner-1' });
            Partner.findOne = jest.fn().mockResolvedValueOnce(null);
            Partner.mockImplementation((data) => ({ ...data, save }));

            const result = await Mutation.createPartner(undefined, {
                createPartnerInput: validInput,
            });

            expect(Partner.findOne).toHaveBeenCalledWith({ name: validInput.name });
            expect(save).toHaveBeenCalled();
            expect(result).toEqual({ ...validInput, _id: 'partner-1' });
        });

        test('rejects when the partner name already exists', async () => {
            Partner.findOne = jest.fn().mockResolvedValueOnce({ name: 'Acme Corp' });

            await expect(
                Mutation.createPartner(undefined, { createPartnerInput: validInput })
            ).rejects.toThrow('This partner is already in our database.');
        });
    });
});
