const { Query, Mutation } = require('./reimbursements');
const Reimbursement = require('../../models/Reimbursement');

jest.mock('../../models/Reimbursement');
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
}));

describe('reimbursements resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getReimbursements', () => {
        test('returns reimbursements sorted by last/first name', async () => {
            const mockReimbursements = [{ lastName: 'Doe' }, { lastName: 'Smith' }];
            const sort = jest.fn().mockResolvedValueOnce(mockReimbursements);
            Reimbursement.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getReimbursements();

            expect(sort).toHaveBeenCalledWith({ lastName: 1, firstName: 1 });
            expect(result).toEqual(mockReimbursements);
        });
    });

    describe('reimbursementRequest', () => {
        const validInput = {
            firstName: 'Jane',
            lastName: 'Doe',
            eventFlyer: 'flyer.png',
            email: 'jane@ufl.edu',
            studentId: '12345678',
            address: '123 Main St',
            company: 'Acme Corp',
            event: 'Career Fair',
            description: 'Travel reimbursement',
            reimbursed: 'pending',
            amount: '50',
            ufEmployee: false,
            receiptPhoto: 'receipt.png',
            execute: true,
        };

        test('creates and saves a new reimbursement request', async () => {
            const save = jest.fn().mockResolvedValueOnce();
            Reimbursement.mockImplementation((data) => ({
                ...data,
                id: 'reimbursement-1',
                save,
            }));

            const result = await Mutation.reimbursementRequest(undefined, {
                reimbursementInput: validInput,
            });

            expect(save).toHaveBeenCalled();
            expect(result).toMatchObject({
                firstName: 'Jane',
                lastName: 'Doe',
                amount: '50',
            });
        });

        test('rejects when required fields are missing', async () => {
            const invalidInput = { ...validInput, firstName: '' };

            await expect(
                Mutation.reimbursementRequest(undefined, { reimbursementInput: invalidInput })
            ).rejects.toMatchObject({
                extensions: {
                    exception: {
                        code: 'BAD_USER_INPUT',
                        errors: { firstName: 'First name is required.' },
                    },
                },
            });
            expect(Reimbursement).not.toHaveBeenCalled();
        });
    });

    describe('resolveReimbursement', () => {
        test('marks the reimbursement as resolved', async () => {
            const updated = { _id: 'id-1', reimbursed: 'resolved' };
            Reimbursement.findByIdAndUpdate = jest.fn().mockResolvedValueOnce(updated);

            const result = await Mutation.resolveReimbursement(undefined, {
                id: 'id-1',
                email: 'jane@ufl.edu',
            });

            expect(Reimbursement.findByIdAndUpdate).toHaveBeenCalledWith('id-1', {
                reimbursed: 'resolved',
            });
            expect(result).toEqual(updated);
        });

        test('rejects when the update fails', async () => {
            Reimbursement.findByIdAndUpdate = jest.fn().mockRejectedValueOnce(new Error('bad id'));

            await expect(
                Mutation.resolveReimbursement(undefined, { id: 'bad-id', email: 'jane@ufl.edu' })
            ).rejects.toMatchObject({
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('unresolveReimbursement', () => {
        test('marks the reimbursement as pending', async () => {
            const updated = { _id: 'id-1', reimbursed: 'pending' };
            Reimbursement.findByIdAndUpdate = jest.fn().mockResolvedValueOnce(updated);

            const result = await Mutation.unresolveReimbursement(undefined, {
                id: 'id-1',
                email: 'jane@ufl.edu',
            });

            expect(Reimbursement.findByIdAndUpdate).toHaveBeenCalledWith('id-1', {
                reimbursed: 'pending',
            });
            expect(result).toEqual(updated);
        });

        test('rejects when the update fails', async () => {
            Reimbursement.findByIdAndUpdate = jest.fn().mockRejectedValueOnce(new Error('bad id'));

            await expect(
                Mutation.unresolveReimbursement(undefined, { id: 'bad-id', email: 'jane@ufl.edu' })
            ).rejects.toMatchObject({
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('cancelReimbursement', () => {
        test('marks the reimbursement as cancelled', async () => {
            const updated = { _id: 'id-1', reimbursed: 'cancelled' };
            Reimbursement.findByIdAndUpdate = jest.fn().mockResolvedValueOnce(updated);

            const result = await Mutation.cancelReimbursement(undefined, {
                id: 'id-1',
                email: 'jane@ufl.edu',
            });

            expect(Reimbursement.findByIdAndUpdate).toHaveBeenCalledWith('id-1', {
                reimbursed: 'cancelled',
            });
            expect(result).toEqual(updated);
        });

        test('rejects when the update fails', async () => {
            Reimbursement.findByIdAndUpdate = jest.fn().mockRejectedValueOnce(new Error('bad id'));

            await expect(
                Mutation.cancelReimbursement(undefined, { id: 'bad-id', email: 'jane@ufl.edu' })
            ).rejects.toMatchObject({
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('uncancelReimbursement', () => {
        test('marks the reimbursement as pending', async () => {
            const updated = { _id: 'id-1', reimbursed: 'pending' };
            Reimbursement.findByIdAndUpdate = jest.fn().mockResolvedValueOnce(updated);

            const result = await Mutation.uncancelReimbursement(undefined, {
                id: 'id-1',
                email: 'jane@ufl.edu',
            });

            expect(Reimbursement.findByIdAndUpdate).toHaveBeenCalledWith('id-1', {
                reimbursed: 'pending',
            });
            expect(result).toEqual(updated);
        });

        test('rejects when the update fails', async () => {
            Reimbursement.findByIdAndUpdate = jest.fn().mockRejectedValueOnce(new Error('bad id'));

            await expect(
                Mutation.uncancelReimbursement(undefined, { id: 'bad-id', email: 'jane@ufl.edu' })
            ).rejects.toMatchObject({
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });
});
