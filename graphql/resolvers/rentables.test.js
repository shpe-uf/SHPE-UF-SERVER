// Rentable/Receipt are mocked with explicit factories (not bare
// jest.mock(path) automocks) because the real model files open a Mongoose
// connection at import time using process.env.DB_URI, which is undefined in
// CI and would crash the whole suite before any test runs.
jest.mock('../../models/Rentable', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
}));
jest.mock('../../models/Receipt', () => {
    const ReceiptMock = jest.fn();
    ReceiptMock.find = jest.fn();
    ReceiptMock.findOne = jest.fn();
    ReceiptMock.findById = jest.fn();
    ReceiptMock.findOneAndUpdate = jest.fn();
    return ReceiptMock;
});
jest.mock('../../models/User');
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
}));

const { Query, Mutation } = require('./rentables');
const Rentable = require('../../models/Rentable');
const Receipt = require('../../models/Receipt');
const User = require('../../models/User');

describe('rentables resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getInventory', () => {
        test('returns the full inventory', async () => {
            const mockInventory = [{ item: 'Calculator' }, { item: 'Laptop' }];
            Rentable.find = jest.fn().mockResolvedValueOnce(mockInventory);

            const result = await Query.getInventory();

            expect(result).toEqual(mockInventory);
        });
    });

    describe('getItem', () => {
        test('returns the matching rentable item', async () => {
            const mockItem = { item: 'Calculator', quantity: 3 };
            Rentable.findOne = jest.fn().mockResolvedValueOnce(mockItem);

            const result = await Query.getItem(undefined, { item: 'Calculator' });

            expect(Rentable.findOne).toHaveBeenCalledWith({ item: 'Calculator' });
            expect(result).toEqual(mockItem);
        });
    });

    describe('getReceipts', () => {
        test('returns all receipts', async () => {
            const mockReceipts = [{ item: 'Calculator' }];
            Receipt.find = jest.fn().mockResolvedValueOnce(mockReceipts);

            const result = await Query.getReceipts(undefined, { item: 'Calculator' });

            expect(result).toEqual(mockReceipts);
        });
    });

    describe('checkOutItem', () => {
        const checkoutData = {
            data: {
                item: 'Calculator',
                username: 'testuser',
                numberOfItems: 1,
                email: 'jane@ufl.edu',
            },
        };

        test('checks out an item and creates a receipt for a valid user', async () => {
            const rentableSave = jest.fn().mockResolvedValueOnce();
            const mockRentable = { item: 'Calculator', quantity: 5, renters: [], save: rentableSave };
            const receiptSave = jest.fn().mockResolvedValueOnce();
            const updatedInventory = [{ item: 'Calculator', quantity: 5, renters: ['testuser'] }];

            Rentable.findOne = jest.fn().mockResolvedValueOnce(mockRentable);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });
            Receipt.mockImplementation((data) => ({ ...data, save: receiptSave }));
            Rentable.find = jest.fn().mockResolvedValueOnce(updatedInventory);

            const result = await Mutation.checkOutItem(undefined, checkoutData);

            expect(rentableSave).toHaveBeenCalled();
            expect(receiptSave).toHaveBeenCalled();
            expect(mockRentable.renters).toEqual(['testuser']);
            expect(result).toEqual(updatedInventory);
        });

        // Documents an existing bug: `errors` is only declared later in this
        // function via `let { errors, valid } = validateRentalRequest(...)`, so
        // referencing `errors.general` in the "not a valid user" guard above that
        // line hits the `let` temporal dead zone. The whole function is wrapped
        // in try/catch, so this surfaces as a generic INTERNAL_SERVER_ERROR
        // instead of the intended "That's not a valid user." message.
        test('throws a generic error instead of "not a valid user" when the user is missing', async () => {
            Rentable.findOne = jest.fn().mockResolvedValueOnce({ item: 'Calculator', quantity: 5, renters: [] });
            User.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.checkOutItem(undefined, checkoutData)
            ).rejects.toMatchObject({
                message: "Cannot access 'errors' before initialization",
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });

        // Documents a second existing bug: the "not a valid rental item" guard
        // has a typo (`erorrs` instead of `errors`), which throws its own
        // ReferenceError, again surfaced as a generic INTERNAL_SERVER_ERROR.
        test('throws a generic error instead of "not a valid rental item" when the item is missing', async () => {
            Rentable.findOne = jest.fn().mockResolvedValueOnce(null);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });

            await expect(
                Mutation.checkOutItem(undefined, checkoutData)
            ).rejects.toMatchObject({
                message: 'erorrs is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('pickUpItem', () => {
        test('marks the receipt as picked up', async () => {
            const updatedReceipt = { _id: 'receipt-1', datePickedUp: '2026-09-28T00:00:00.000Z' };
            Receipt.findOne = jest.fn().mockResolvedValueOnce({ _id: 'receipt-1' });
            Receipt.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedReceipt);

            const result = await Mutation.pickUpItem(undefined, { receiptID: 'receipt-1' });

            expect(result).toEqual(updatedReceipt);
        });

        // Documents an existing bug: `errors` is never declared in this
        // function, so a missing receipt throws a ReferenceError. It is caught
        // by the surrounding try/catch and re-surfaced as a generic
        // INTERNAL_SERVER_ERROR instead of the intended "not a valid receipt"
        // message.
        test('throws a generic error instead of "not a valid receipt" when the receipt is missing', async () => {
            Receipt.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.pickUpItem(undefined, { receiptID: 'missing-receipt' })
            ).rejects.toMatchObject({
                message: 'errors is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('returnItem', () => {
        test('removes the renter and closes the receipt', async () => {
            const receipt = { _id: 'receipt-1', item: 'Calculator', username: 'testuser', quantity: 2 };
            const rentable = { item: 'Calculator', renters: ['testuser', 'testuser', 'otheruser'] };
            const updatedReceipt = { ...receipt, dateClosed: '2026-09-28T00:00:00.000Z' };

            Receipt.findById = jest.fn().mockResolvedValueOnce(receipt);
            Rentable.findOne = jest.fn().mockResolvedValueOnce(rentable);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });
            Rentable.findOneAndUpdate = jest.fn().mockResolvedValueOnce({});
            Receipt.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedReceipt);

            const result = await Mutation.returnItem(undefined, { receiptID: 'receipt-1' });

            expect(Rentable.findOneAndUpdate).toHaveBeenCalledWith(
                { item: 'Calculator' },
                { renters: ['otheruser'] }
            );
            expect(result).toEqual(updatedReceipt);
        });

        // Documents an existing bug: `errors` is never declared in this
        // function either, so a missing receipt throws a ReferenceError that
        // the surrounding try/catch turns into a generic INTERNAL_SERVER_ERROR.
        test('throws a generic error instead of "not a valid receipt" when the receipt is missing', async () => {
            Receipt.findById = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.returnItem(undefined, { receiptID: 'missing-receipt' })
            ).rejects.toMatchObject({
                message: 'errors is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('unPickUpItem', () => {
        test('clears the pick-up date on a picked-up receipt', async () => {
            const receipt = { _id: 'receipt-1', datePickedUp: '2026-09-27T00:00:00.000Z' };
            const updatedReceipt = { ...receipt, datePickedUp: null };
            Receipt.findOne = jest.fn().mockResolvedValueOnce(receipt);
            Receipt.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedReceipt);

            const result = await Mutation.unPickUpItem(undefined, { receiptID: 'receipt-1' });

            expect(Receipt.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'receipt-1' },
                { datePickedUp: null },
                { new: true }
            );
            expect(result).toEqual(updatedReceipt);
        });

        // Documents an existing bug: `errors` is never declared in this
        // function, so a receipt that was never picked up throws a
        // ReferenceError that the surrounding try/catch turns into a generic
        // INTERNAL_SERVER_ERROR instead of the intended "not a valid receipt"
        // message.
        test('throws a generic error instead of a validation message when the receipt was never picked up', async () => {
            Receipt.findOne = jest.fn().mockResolvedValueOnce({ _id: 'receipt-1', datePickedUp: null });

            await expect(
                Mutation.unPickUpItem(undefined, { receiptID: 'receipt-1' })
            ).rejects.toMatchObject({
                message: 'errors is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('unReturnItem', () => {
        test('re-adds the renter and reopens a closed receipt', async () => {
            const receipt = {
                _id: 'receipt-1',
                item: 'Calculator',
                username: 'testuser',
                quantity: 1,
                dateClosed: '2026-09-27T00:00:00.000Z',
            };
            const rentable = { item: 'Calculator', renters: ['otheruser'] };
            const updatedReceipt = { ...receipt, dateClosed: null };

            Receipt.findById = jest.fn().mockResolvedValueOnce(receipt);
            Rentable.findOne = jest.fn().mockResolvedValueOnce(rentable);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });
            Rentable.findOneAndUpdate = jest.fn().mockResolvedValueOnce({});
            Receipt.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedReceipt);

            const result = await Mutation.unReturnItem(undefined, { receiptID: 'receipt-1' });

            expect(Rentable.findOneAndUpdate).toHaveBeenCalledWith(
                { item: 'Calculator' },
                { $push: { renters: ['testuser'] } }
            );
            expect(result).toEqual(updatedReceipt);
        });

        // Documents an existing bug: `errors` is never declared in this
        // function, so trying to un-return a receipt that was never closed
        // throws a ReferenceError that the surrounding try/catch turns into a
        // generic INTERNAL_SERVER_ERROR instead of the intended
        // "not a closed receipt" message.
        test('throws a generic error instead of a validation message when the receipt was never closed', async () => {
            Receipt.findById = jest.fn().mockResolvedValueOnce({ _id: 'receipt-1', dateClosed: null });

            await expect(
                Mutation.unReturnItem(undefined, { receiptID: 'receipt-1' })
            ).rejects.toMatchObject({
                message: 'errors is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });

    describe('deleteReceipt', () => {
        test('removes the renter and marks an open receipt deleted', async () => {
            const receipt = {
                _id: 'receipt-1',
                item: 'Calculator',
                username: 'testuser',
                quantity: 1,
                dateClosed: null,
            };
            const rentable = { item: 'Calculator', renters: ['testuser', 'otheruser'] };
            const updatedReceipt = { ...receipt, deleted: true };

            Receipt.findById = jest.fn().mockResolvedValueOnce(receipt);
            Rentable.findOne = jest.fn().mockResolvedValueOnce(rentable);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });
            Rentable.findOneAndUpdate = jest.fn().mockResolvedValueOnce({});
            Receipt.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedReceipt);

            const result = await Mutation.deleteReceipt(undefined, { receiptID: 'receipt-1' });

            expect(Rentable.findOneAndUpdate).toHaveBeenCalledWith(
                { item: 'Calculator' },
                { renters: ['otheruser'] }
            );
            expect(result).toEqual(updatedReceipt);
        });

        // Documents an existing bug: `errors` is never declared in this
        // function, so a missing receipt throws a ReferenceError that the
        // surrounding try/catch turns into a generic INTERNAL_SERVER_ERROR
        // instead of the intended "not a valid receipt" message.
        test('throws a generic error instead of "not a valid receipt" when the receipt is missing', async () => {
            Receipt.findById = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.deleteReceipt(undefined, { receiptID: 'missing-receipt' })
            ).rejects.toMatchObject({
                message: 'errors is not defined',
                extensions: { exception: { code: 'INTERNAL_SERVER_ERROR' } },
            });
        });
    });
});
