const { Query, Mutation } = require('./resources');
const Resource = require('../../models/Resource');

jest.mock('../../models/Resource');

describe('resources resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getResources', () => {
        test('returns resources sorted by createdAt ascending', async () => {
            const mockResources = [{ title: 'Resource A' }, { title: 'Resource B' }];
            const sort = jest.fn().mockResolvedValueOnce(mockResources);
            Resource.find = jest.fn().mockReturnValueOnce({ sort });

            const result = await Query.getResources();

            expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
            expect(result).toEqual(mockResources);
        });
    });

    describe('createResource', () => {
        const validInput = {
            title: 'Resume Guide',
            link: 'https://example.com/resume-guide',
            description: 'How to write a resume',
            image: 'guide.png',
            podcast: false,
        };

        test('creates a new resource when input is valid and title is unique', async () => {
            const updatedResources = [{ title: 'Resume Guide' }];
            Resource.findOne = jest.fn().mockResolvedValueOnce(null);
            Resource.find = jest.fn().mockResolvedValueOnce(updatedResources);
            Resource.prototype.save = jest.fn().mockResolvedValueOnce();

            const result = await Mutation.createResource(undefined, {
                createResourceInput: validInput,
            });

            expect(Resource.findOne).toHaveBeenCalledWith({ title: validInput.title });
            expect(result).toEqual(updatedResources);
        });

        test('rejects when a resource with that title already exists', async () => {
            Resource.findOne = jest.fn().mockResolvedValueOnce({ title: 'Resume Guide' });

            await expect(
                Mutation.createResource(undefined, { createResourceInput: validInput })
            ).rejects.toThrow('A resource with that name already exists.');
        });
    });

    describe('deleteResource', () => {
        test('deletes the resource and returns the remaining list', async () => {
            const remainingResources = [{ title: 'Other Resource' }];
            Resource.findOne = jest.fn().mockResolvedValueOnce({ _id: 'resource-1' });
            Resource.deleteOne = jest.fn().mockResolvedValueOnce({});
            Resource.find = jest.fn().mockResolvedValueOnce(remainingResources);

            const result = await Mutation.deleteResource(undefined, {
                resourceId: 'resource-1',
            });

            expect(Resource.deleteOne).toHaveBeenCalledWith({ _id: 'resource-1' });
            expect(result).toEqual(remainingResources);
        });

        // Documents existing behavior: the "Resource not found." branch references
        // an `errors` variable that is never declared in this function, so a
        // missing resource throws a ReferenceError instead of a graceful
        // GraphQLError.
        test('throws when the resource does not exist', async () => {
            Resource.findOne = jest.fn().mockResolvedValueOnce(null);

            await expect(
                Mutation.deleteResource(undefined, { resourceId: 'missing-resource' })
            ).rejects.toThrow(ReferenceError);
        });
    });
});
