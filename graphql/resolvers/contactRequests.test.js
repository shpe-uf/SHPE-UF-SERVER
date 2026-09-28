jest.mock('@aws-sdk/client-sesv2', () => ({
    SESv2Client: jest.fn(() => ({})),
    SendEmailCommand: jest.fn(),
}));
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue(),
    })),
}));
jest.mock('../../models/ContactRequest');

const { Mutation } = require('./contactRequests');
const ContactRequest = require('../../models/ContactRequest');

describe('contactRequests resolvers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('submitContactRequest', () => {
        const validInput = {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            messageType: 'Bug Report',
            message: 'Something is broken.',
        };

        test('saves and returns a new contact request when input is valid', async () => {
            const save = jest.fn().mockResolvedValueOnce();
            ContactRequest.mockImplementation((data) => ({ ...data, save }));

            const result = await Mutation.submitContactRequest(undefined, validInput);

            expect(save).toHaveBeenCalled();
            expect(result).toMatchObject(validInput);
        });

        test('rejects when required fields are missing', async () => {
            const invalidInput = { ...validInput, message: '' };

            await expect(
                Mutation.submitContactRequest(undefined, invalidInput)
            ).rejects.toMatchObject({
                extensions: {
                    exception: {
                        code: 'BAD_USER_INPUT',
                        errors: { message: 'Message is required.' },
                    },
                },
            });
            expect(ContactRequest).not.toHaveBeenCalled();
        });
    });
});
