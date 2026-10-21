const { Query, Mutation } = require('./requests');
const Request = require('../../models/Request');
const Event = require('../../models/Event');
const Task = require('../../models/Task');
const User = require('../../models/User');

jest.mock('../../models/Request');
jest.mock('../../models/Event');
jest.mock('../../models/Task');
jest.mock('../../models/User');

describe('requests resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRequests', () => {
        test('returns requests sorted by createdAt ascending', async () => {
            const mockRequests = [{ name: 'Request A' }, { name: 'Request B' }];
            const sort = jest.fn().mockResolvedValueOnce(mockRequests);
            Request.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getRequests();

            expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
            expect(result).toEqual(mockRequests);
        });
    });

    describe('rejectRequest', () => {
        test('deletes the matching request and returns the remaining list', async () => {
            const input = { username: 'testuser', name: 'Test Event', type: 'Event' };
            const remainingRequests = [{ name: 'Other Request' }];
            const sort = jest.fn().mockResolvedValueOnce(remainingRequests);
            Request.deleteOne = jest.fn().mockResolvedValueOnce({ deletedCount: 1 });
            Request.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Mutation.rejectRequest(undefined, {
                approveRejectRequestInput: input,
            });

            expect(Request.deleteOne).toHaveBeenCalledWith(input);
            expect(result).toEqual(remainingRequests);
        });
    });

    describe('approveRequest', () => {
        const input = { username: 'testuser', name: 'Test Event', type: 'Event' };

        test('awards event points to the user for a recognized semester', async () => {
            const mockEvent = {
                name: 'Test Event',
                category: 'Workshop',
                createdAt: '2026-09-01T00:00:00.000Z',
                points: 2,
                semester: 'Fall Semester',
            };
            const mockUser = {
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'testuser',
                email: 'jane@ufl.edu',
            };
            const remainingRequests = [{ name: 'Other Request' }];
            const sort = jest.fn().mockResolvedValueOnce(remainingRequests);

            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);
            Task.findOne = jest.fn().mockResolvedValueOnce(null);
            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            User.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockUser);
            Event.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockEvent);
            Request.deleteOne = jest.fn().mockResolvedValueOnce({ deletedCount: 1 });
            Request.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Mutation.approveRequest(undefined, {
                approveRejectRequestInput: input,
            });

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: input.username },
                expect.objectContaining({
                    $inc: { points: mockEvent.points, fallPoints: mockEvent.points },
                }),
                { new: true }
            );
            expect(Request.deleteOne).toHaveBeenCalledWith({
                username: input.username,
                name: input.name,
            });
            expect(result).toEqual(remainingRequests);
        });

        // Documents existing behavior: the "Invalid event." branch references an
        // `errors` variable that is never declared in this function, so an
        // unrecognized semester throws a ReferenceError instead of a graceful
        // GraphQLError. Flagging this as a pre-existing bug rather than fixing it.
        test('throws when the event has an unrecognized semester', async () => {
            const mockEvent = { name: 'Test Event', semester: 'Unknown Semester' };

            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);
            Task.findOne = jest.fn().mockResolvedValueOnce(null);
            User.findOne = jest.fn().mockResolvedValueOnce({ username: 'testuser' });

            await expect(
                Mutation.approveRequest(undefined, { approveRejectRequestInput: input })
            ).rejects.toThrow(ReferenceError);
        });
    });
});
