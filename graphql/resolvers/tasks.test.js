const { Query, Mutation } = require('./tasks');
const Task = require('../../models/Task');
const User = require('../../models/User');
const Request = require('../../models/Request');

jest.mock('../../models/Task');
jest.mock('../../models/User');
jest.mock('../../models/Request');

describe('tasks resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTasks', () => {
        test('returns tasks sorted by createdAt ascending', async () => {
            const mockTasks = [{ name: 'Task A' }, { name: 'Task B' }];
            const sort = jest.fn().mockResolvedValueOnce(mockTasks);
            Task.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getTasks();

            expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
            expect(result).toEqual(mockTasks);
        });
    });

    describe('createTask', () => {
        const validInput = {
            name: 'Test Task',
            startDate: '09/29/2026',
            endDate: '09/30/2026',
            description: 'Do the task',
            points: 5,
        };

        test('creates a new task when input is valid and name is unique', async () => {
            const createdTask = { name: 'Test Task' };
            Task.findOne = jest.fn()
                .mockResolvedValueOnce(null) // duplicate check
                .mockResolvedValueOnce(createdTask); // findOne after save
            Task.prototype.save = jest.fn().mockResolvedValueOnce();

            const result = await Mutation.createTask(undefined, {
                createTaskInput: validInput,
            });

            expect(Task.findOne).toHaveBeenCalledWith({ name: validInput.name });
            expect(result).toEqual(createdTask);
        });

        test('rejects when a task with that name already exists', async () => {
            Task.findOne = jest.fn().mockResolvedValueOnce({ name: 'Test Task' });

            await expect(
                Mutation.createTask(undefined, { createTaskInput: validInput })
            ).rejects.toThrow('A task with that name already exists.');
        });
    });

    describe('manualTaskInput', () => {
        const input = { username: 'testuser', taskName: 'Test Task' };

        test('adds the task to the user and increments their points', async () => {
            const mockUser = {
                firstName: 'Jane',
                lastName: 'Doe',
                username: 'testuser',
                email: 'jane@ufl.edu',
                tasks: [],
            };
            const mockTask = {
                name: 'Test Task',
                startDate: 'Tue Sep 29 2026',
                points: 3,
                semester: 'Fall Semester',
            };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Task.findOne = jest.fn()
                .mockResolvedValueOnce(mockTask) // lookup by taskName
                .mockResolvedValueOnce(mockTask); // final findOne to return
            Request.findOne = jest.fn().mockResolvedValueOnce(null);
            User.findOneAndUpdate = jest.fn().mockResolvedValueOnce({ ...mockUser });
            Task.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockTask);

            const result = await Mutation.manualTaskInput(undefined, {
                manualTaskInputInput: input,
            });

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: input.username },
                {
                    $push: {
                        tasks: {
                            $each: [
                                {
                                    name: mockTask.name,
                                    startDate: mockTask.startDate,
                                    points: mockTask.points,
                                },
                            ],
                            $sort: { createdAt: 1 },
                        },
                    },
                    $inc: { points: mockTask.points, fallPoints: mockTask.points },
                },
                { new: true }
            );
            expect(result).toEqual(mockTask);
        });

        test('rejects when the user does not exist', async () => {
            User.findOne = jest.fn().mockResolvedValueOnce(null);
            Task.findOne = jest.fn().mockResolvedValueOnce({ name: 'Test Task' });
            Request.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.manualTaskInput(undefined, { manualTaskInputInput: input })
            ).rejects.toThrow('User not found.');
        });
    });

    describe('removeUserFromTask', () => {
        const input = { username: 'testuser', taskName: 'Test Task' };

        test('removes the task from the user and decrements attendance', async () => {
            const mockTask = {
                name: 'Test Task',
                semester: 'Fall Semester',
                points: 3,
                attendance: 2,
                users: [{ username: 'testuser' }],
            };
            const mockUser = {
                username: 'testuser',
                points: 10,
                fallPoints: 10,
                tasks: [{ name: 'Test Task' }],
            };
            const updatedTask = { ...mockTask, attendance: 1, users: [] };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Task.findOne = jest.fn().mockResolvedValueOnce(mockTask);
            User.findOneAndUpdate = jest.fn().mockResolvedValueOnce(mockUser);
            Task.findOneAndUpdate = jest.fn().mockResolvedValueOnce(updatedTask);

            const result = await Mutation.removeUserFromTask(undefined, {
                manualTaskInputInput: input,
            });

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { username: input.username },
                { tasks: [], points: 7, fallPoints: 7 }
            );
            expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
                { name: input.taskName },
                { users: [], attendance: 1 },
                { new: true }
            );
            expect(result).toEqual(updatedTask);
        });

        test('rejects when the user is not a member of the task', async () => {
            const mockTask = {
                name: 'Test Task',
                semester: 'Fall Semester',
                points: 3,
                attendance: 2,
                users: [],
            };
            const mockUser = {
                username: 'testuser',
                points: 10,
                fallPoints: 10,
                tasks: [],
            };

            User.findOne = jest.fn().mockResolvedValueOnce(mockUser);
            Task.findOne = jest.fn().mockResolvedValueOnce(mockTask);

            await expect(
                Mutation.removeUserFromTask(undefined, { manualTaskInputInput: input })
            ).rejects.toThrow('User is not member of task.');
        });
    });

    describe('deleteTask', () => {
        test('deletes the task and pulls it from all users', async () => {
            const mockTask = { name: 'Test Task', semester: 'Fall Semester', points: 3 };
            const remainingTasks = [{ name: 'Other Task' }];

            User.find = jest.fn().mockResolvedValueOnce([{ username: 'testuser' }]);
            Task.findOne = jest.fn().mockResolvedValueOnce(mockTask);
            Task.deleteOne = jest.fn().mockResolvedValueOnce({});
            User.updateMany = jest.fn().mockResolvedValueOnce({});
            Task.find = jest.fn().mockResolvedValueOnce(remainingTasks);

            const result = await Mutation.deleteTask(undefined, { taskId: 'task-1' });

            expect(Task.deleteOne).toHaveBeenCalledWith({ _id: 'task-1' });
            expect(User.updateMany).toHaveBeenCalledWith(
                { tasks: { $elemMatch: { name: 'Test Task' } } },
                { $pull: { tasks: { name: 'Test Task' } }, $inc: { points: -3, fallPoints: -3 } }
            );
            expect(result).toEqual(remainingTasks);
        });

        // Documents existing behavior: the "Task not found." branch references an
        // `errors` variable that is never declared in this function, so a missing
        // task throws a ReferenceError instead of a graceful GraphQLError.
        test('throws when the task does not exist', async () => {
            User.find = jest.fn().mockResolvedValueOnce([{ username: 'testuser' }]);
            Task.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.deleteTask(undefined, { taskId: 'missing-task' })
            ).rejects.toThrow(ReferenceError);
        });
    });
});
