const { calculatePercentiles } = require('./users');
const User = require('../../models/User');

jest.mock('../../models/User');

describe('calculatePercentiles', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('calculates the 75th percentile correctly for fall semester', async () => {
        const mockUsers = [
            { _id: '1' },
            { _id: '2' },
            { _id: '3' },
            { _id: '4' },
        ];
        
        const mockUser = {
            username: 'testuser',
            fallPoints: 75,
        };

        const mockBelowUsers = [
            { fallPoints: 50 },
            { fallPoints: 50 },
            { fallPoints: 60 },
        ];

        User.find = jest.fn()
            .mockResolvedValueOnce(mockUsers)
            .mockReturnValueOnce({
                where: jest.fn().mockReturnValueOnce({
                    lt: jest.fn().mockResolvedValueOnce(mockBelowUsers)
                })
            });
        User.findOneAndUpdate = jest.fn().mockResolvedValueOnce({});

        jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(10);

        await calculatePercentiles(mockUser);

        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            { username: 'testuser' },
            { $set: { fallPercentile: 75 } },
            { new: true }
        );
    });
});