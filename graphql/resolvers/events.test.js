const { Query, Mutation } = require('./events');
const Event = require('../../models/Event');
const User = require('../../models/User');
const Request = require('../../models/Request');

jest.mock('../../models/Event');
jest.mock('../../models/User');
jest.mock('../../models/Request');

describe('events resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getEvents', () => {
        test('returns events sorted by createdAt ascending', async () => {
            const mockEvents = [{ name: 'Event A' }, { name: 'Event B' }];
            const sort = jest.fn().mockResolvedValueOnce(mockEvents);
            Event.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getEvents();

            expect(Event.find).toHaveBeenCalled();
            expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('getEventsReversed', () => {
        test('returns events sorted by createdAt descending', async () => {
            const mockEvents = [{ name: 'Event B' }, { name: 'Event A' }];
            const sort = jest.fn().mockResolvedValueOnce(mockEvents);
            Event.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getEventsReversed();

            expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('createEvent', () => {
        const validInput = {
            name: 'Test Event',
            code: 'abc123',
            category: 'Workshop',
            expiration: '24',
            request: 'false',
            points: 5,
        };

        test('creates a new event when input is valid and name/code are unique', async () => {
            const mockEvents = [{ name: 'Test Event' }];
            Event.findOne = jest.fn()
                .mockResolvedValueOnce(null) // name duplicate check
                .mockResolvedValueOnce(null); // code duplicate check
            Event.find = jest.fn().mockResolvedValueOnce(mockEvents);
            Event.prototype.save = jest.fn().mockResolvedValueOnce();

            const result = await Mutation.createEvent(undefined, {
                createEventInput: validInput,
            });

            expect(Event.findOne).toHaveBeenCalledWith({ name: validInput.name });
            expect(Event.findOne).toHaveBeenCalledWith({ code: validInput.code });
            expect(result).toEqual(mockEvents);
        });

        test('rejects when an event with that name already exists', async () => {
            Event.findOne = jest.fn().mockResolvedValueOnce({ name: 'Test Event' });

            await expect(
                Mutation.createEvent(undefined, { createEventInput: validInput })
            ).rejects.toThrow('An event with that name already exists.');
        });
    });

    describe('manualInput', () => {
        const input = { username: 'testuser', eventName: 'Test Event' };

        test('adds the event to the user and increments their points', async () => {
            const mockUser = {
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'testuser',
                email: 'jane@ufl.edu',
                events: [],
            };
            const mockEvent = {
                name: 'Test Event',
                category: 'Workshop',
                points: 1,
                semester: 'Fall Semester',
                createdAt: '2026-09-01T00:00:00.000Z',
            };
            const updatedUser = { ...mockUser, message: undefined };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);
            Request.findOne = jest.fn().mockResolvedValueOnce(null);
            User.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedUser);
            Event.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockEvent);
            Event.find = jest.fn().mockResolvedValueOnce([mockEvent]);

            const result = await Mutation.manualInput(undefined, {
                manualInputInput: input,
            });

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: input.username },
                {
                    $push: {
                        events: {
                            $each: [
                                {
                                    name: mockEvent.name,
                                    category: mockEvent.category,
                                    createdAt: mockEvent.createdAt,
                                    points: mockEvent.points,
                                },
                            ],
                            $sort: { createdAt: 1 },
                        },
                    },
                    $inc: { points: mockEvent.points, fallPoints: mockEvent.points },
                },
                { new: true }
            );
            expect(result).toEqual([mockEvent]);
        });

        test('rejects when the user does not exist', async () => {
            User.findOne = jest.fn().mockResolvedValueOnce(null);
            Event.findOne = jest.fn().mockResolvedValueOnce({ name: 'Test Event' });
            Request.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.manualInput(undefined, { manualInputInput: input })
            ).rejects.toThrow('User not found.');
        });
    });

    describe('removeUserFromEvent', () => {
        const input = { username: 'testuser', eventName: 'Test Event' };

        test('removes the event from the user and decrements attendance', async () => {
            const mockEvent = {
                name: 'Test Event',
                semester: 'Fall Semester',
                points: 1,
                attendance: 3,
                users: [{ username: 'testuser' }],
            };
            const mockUser = {
                username: 'testuser',
                points: 5,
                fallPoints: 5,
                events: [{ name: 'Test Event' }],
            };
            const updatedEvent = { ...mockEvent, attendance: 2, users: [] };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);
            User.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockUser);
            Event.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedEvent);

            const result = await Mutation.removeUserFromEvent(undefined, {
                manualInputInput: input,
            });

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: input.username },
                {
                    events: [],
                    points: 4,
                    fallPoints: 4,
                }
            );
            expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
                { name: input.eventName },
                { users: [], attendance: 2 },
                { new: true }
            );
            expect(result).toEqual(updatedEvent);
        });

        test('rejects when the user is not a member of the event', async () => {
            const mockEvent = {
                name: 'Test Event',
                semester: 'Fall Semester',
                points: 1,
                attendance: 3,
                users: [],
            };
            const mockUser = {
                username: 'testuser',
                points: 5,
                fallPoints: 5,
                events: [],
            };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);

            await expect(
                Mutation.removeUserFromEvent(undefined, { manualInputInput: input })
            ).rejects.toThrow('User is not member of event.');
        });
    });

    describe('deleteEvent', () => {
        test('deletes the event and pulls it from all users', async () => {
            const mockEvent = { name: 'Test Event', semester: 'Fall Semester', points: 2 };
            const remainingEvents = [{ name: 'Other Event' }];

            User.find = jest.fn().mockResolvedValueOnce([{ username: 'testuser' }]);
            Event.findOne = jest.fn().mockResolvedValueOnce(mockEvent);
            Event.deleteOne = jest.fn().mockResolvedValueOnce({});
            User.updateMany = jest.fn().mockResolvedValueOnce({});
            Event.find = jest.fn().mockResolvedValueOnce(remainingEvents);

            const result = await Mutation.deleteEvent(undefined, {
                eventName: 'Test Event',
            });

            expect(Event.deleteOne).toHaveBeenCalledWith({ name: 'Test Event' });
            expect(User.updateMany).toHaveBeenCalledWith(
                {
                    events: { $elemMatch: { name: 'Test Event' } },
                },
                {
                    $pull: { events: { name: 'Test Event' } },
                    $inc: { points: -2, fallPoints: -2 },
                }
            );
            expect(result).toEqual(remainingEvents);
        });

        test('rejects when the event does not exist', async () => {
            User.find = jest.fn().mockResolvedValueOnce([{ username: 'testuser' }]);
            Event.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.deleteEvent(undefined, { eventName: 'Missing Event' })
            ).rejects.toThrow('Event not found.');
        });
    });
});
