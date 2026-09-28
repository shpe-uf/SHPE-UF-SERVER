const { Query } = require('./shpewrapped');
const User = require('../../models/User');

jest.mock('../../models/User');

describe('shpewrapped resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('lastMontOfYear', () => {
        // Documents existing behavior: Date#getMonth() only ever returns 0-11, so
        // the `=== 12` check can never be true and this always resolves to false,
        // even in December (month index 11).
        test('always resolves false, including in December', async () => {
            jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(11);

            const result = await Query.lastMontOfYear();

            expect(result).toBe(false);
        });
    });

    describe('getMostActiveMonth', () => {
        test('returns the month with the most events for the user', async () => {
            const mockUser = {
                events: [
                    { createdAt: '2026-09-01T00:00:00.000Z' },
                    { createdAt: '2026-09-15T00:00:00.000Z' },
                    { createdAt: '2026-10-01T00:00:00.000Z' },
                ],
            };
            User.findById = jest.fn().mockResolvedValueOnce(mockUser);

            const result = await Query.getMostActiveMonth(undefined, { userId: 'user-1' });

            expect(User.findById).toHaveBeenCalledWith('user-1');
            expect(result).toBe('09');
        });

        // Documents existing behavior: the "User not found." branch calls
        // `handleGeneralError`, which is never imported in this file, so a
        // missing user throws a ReferenceError instead of a graceful
        // GraphQLError.
        test('throws when the user does not exist', async () => {
            User.findById = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Query.getMostActiveMonth(undefined, { userId: 'missing-user' })
            ).rejects.toThrow(ReferenceError);
        });
    });
});
