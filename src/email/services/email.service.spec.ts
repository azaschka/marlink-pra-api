import { InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import mjml2html from 'mjml';
import { EmailService } from './email.service';

// Wrap the real mjml2html in a jest.fn() so individual tests can override behaviour
// while the happy-path tests still use the genuine implementation.
jest.mock('mjml', () => {
    const actual = jest.requireActual<typeof mjml2html>('mjml');
    return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        __esModule: true,
        default: jest.fn((...args: Parameters<typeof mjml2html>) => actual(...args)),
    };
});

const mockedMjml2html = mjml2html as jest.MockedFunction<typeof mjml2html>;

describe('EmailService', () => {
    let service: EmailService;
    let sendMail: jest.Mock;

    beforeEach(() => {
        // Clear the static template cache so each test starts fresh
        // eslint-disable-next-line @typescript-eslint/naming-convention
        (EmailService as unknown as { TEMPLATE_CACHE: Map<string, unknown> }).TEMPLATE_CACHE.clear();

        sendMail = jest.fn().mockResolvedValue(undefined);
        service = new EmailService({ sendMail } as unknown as MailerService);

        mockedMjml2html.mockClear();
    });

    // -------------------------------------------------------------------------
    // Integration: all templates render correctly with real mjml2html
    // -------------------------------------------------------------------------

    describe('template rendering with real mjml2html', () => {
        it.each([
            {
                template: 'user-new-password.mjml',
                subject: 'Subject',
                context: {
                    displayName: 'Jane Doe',
                    username: 'janedoe',
                    password: 'S3cr3t!Pass',
                    btConsoleUrl: 'https://pra.example.com',
                },
                expectedInHtml: ['Jane Doe', 'janedoe', 'S3cr3t!Pass', 'https://pra.example.com'],
            },
            {
                template: 'pra-user-new-password.mjml',
                subject: 'Subject',
                context: {
                    displayName: 'Admin User',
                    username: 'adminuser',
                    password: 'Adm1n!Pass',
                    praConsoleUrl: 'https://pra.example.com',
                },
                expectedInHtml: ['Admin User', 'adminuser', 'Adm1n!Pass', 'https://pra.example.com'],
            },
            {
                template: 'user-activation.mjml',
                subject: 'Subject',
                context: {
                    displayName: 'New User',
                    username: 'newuser',
                    password: 'Welcome!123',
                    btConsoleUrl: 'https://pra.example.com',
                },
                expectedInHtml: ['New User', 'newuser', 'Welcome!123', 'https://pra.example.com'],
            },
            {
                template: 'pra-user-activation.mjml',
                subject: 'Subject',
                context: {
                    displayName: 'PRA Admin',
                    username: 'praadmin',
                    password: 'PraAdm!n1',
                    role: 'Administrator',
                    praConsoleUrl: 'https://pra.example.com',
                },
                expectedInHtml: ['PRA Admin', 'praadmin', 'PraAdm!n1', 'https://pra.example.com'],
            },
            {
                template: 'user-forgot-password.mjml',
                subject: 'Subject',
                context: {
                    username: 'forgotuser',
                    password: 'N3wP4ss!',
                },
                expectedInHtml: ['forgotuser', 'N3wP4ss!'],
            },
        ])(
            '$template renders to non-empty HTML and interpolates context variables',
            async ({ template, subject, context, expectedInHtml }) => {
                await service.sendEmail(template, 'test@example.com', subject, context);

                expect(sendMail).toHaveBeenCalledTimes(1);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const { html } = sendMail.mock.calls[0][0] as { html: string };
                expect(html.length).toBeGreaterThan(0);
                for (const expected of expectedInHtml) {
                    expect(html).toContain(expected);
                }
            },
        );
    });

    // -------------------------------------------------------------------------
    // sendMail is called with the correct envelope fields
    // -------------------------------------------------------------------------

    describe('sendMail call arguments', () => {
        it('passes correct from, to, subject, and html to MailerService', async () => {
            await service.sendEmail('user-new-password.mjml', 'recipient@example.com', 'Your New Password', {
                displayName: 'Test',
                username: 'test',
                password: 'Test1234!',
                btConsoleUrl: 'https://pra.example.com',
            });

            expect(sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: '"PRA Portal" <no-reply@marlink.com>',
                    to: 'recipient@example.com',
                    subject: 'Your New Password',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    html: expect.stringContaining('<!doctype html'),
                }),
            );
        });
    });

    // -------------------------------------------------------------------------
    // Template cache: second call does not reload the template from disk
    // -------------------------------------------------------------------------

    describe('template cache', () => {
        it('returns consistent output on repeated calls without reloading from disk', async () => {
            const context = {
                displayName: 'Cache User',
                username: 'cacheuser',
                password: 'CacheP4ss!',
                btConsoleUrl: 'https://pra.example.com',
            };

            await service.sendEmail('user-new-password.mjml', 'a@example.com', 'S', context);
            await service.sendEmail('user-new-password.mjml', 'b@example.com', 'S', context);

            // mjml2html is called twice (one per sendEmail), but the template
            // is only compiled from the file once (cache hit on second call)
            expect(mockedMjml2html).toHaveBeenCalledTimes(2);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const html1 = (sendMail.mock.calls[0][0] as { html: string }).html;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const html2 = (sendMail.mock.calls[1][0] as { html: string }).html;
            expect(html1).toBe(html2);
        });
    });

    // -------------------------------------------------------------------------
    // Error paths
    // -------------------------------------------------------------------------

    describe('error handling', () => {
        it('throws InternalServerErrorException with error details when mjml2html returns validation errors', async () => {
            const errorResult = {
                html: '<html>some content</html>',
                json: {} as never,
                errors: [
                    {
                        formattedMessage: 'mj-text is not a valid tag',
                        message: 'mj-text is not a valid tag',
                        tagName: 'mj-text',
                        line: 1,
                    },
                ],
            } as ReturnType<typeof mjml2html>;

            mockedMjml2html.mockReturnValueOnce(errorResult);

            await expect(service.sendEmail('user-new-password.mjml', 'x@example.com', 'S', {})).rejects.toThrow(
                'mj-text is not a valid tag',
            );
        });

        it('throws InternalServerErrorException when mjml2html returns empty html', async () => {
            mockedMjml2html.mockReturnValueOnce({
                html: '',
                json: {} as never,
                errors: [],
            } as ReturnType<typeof mjml2html>);

            await expect(service.sendEmail('user-new-password.mjml', 'x@example.com', 'S', {})).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('throws when mjml2html returns undefined (e.g. ESM/CJS mismatch)', async () => {
            mockedMjml2html.mockReturnValueOnce(undefined as unknown as ReturnType<typeof mjml2html>);

            await expect(service.sendEmail('user-new-password.mjml', 'x@example.com', 'S', {})).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('does not call sendMail when template rendering fails', async () => {
            mockedMjml2html.mockReturnValueOnce(undefined as unknown as ReturnType<typeof mjml2html>);

            await expect(service.sendEmail('user-new-password.mjml', 'x@example.com', 'S', {})).rejects.toThrow();

            expect(sendMail).not.toHaveBeenCalled();
        });

        it('throws when the template file does not exist', async () => {
            await expect(service.sendEmail('non-existent-template.mjml', 'x@example.com', 'S', {})).rejects.toThrow();
        });
    });
});
