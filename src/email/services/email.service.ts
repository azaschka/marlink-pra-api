import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { join } from 'path';

@Injectable()
export class EmailService {
    private static readonly DEFAULT_EMAIL_FROM = '"PRA Portal" <no-reply@marlink.com>';
    private static readonly TEMPLATE_CACHE: Map<string, Handlebars.TemplateDelegate> = new Map();

    private readonly templateDir = join(__dirname, '..', 'templates');

    constructor(private readonly mailerService: MailerService) {}

    public async sendEmail(
        templateFilename: string,
        sendTo: string,
        subject: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        const compiledTemplate = this.loadCompiledTemplate(templateFilename);
        const mjmlContent = compiledTemplate(context);

        let html: string;
        try {
            const result = mjml2html(mjmlContent, { validationLevel: 'soft' });
            if (result?.errors?.length) {
                throw new InternalServerErrorException(
                    `MJML validation errors in template "${templateFilename}": ${result.errors.map((e) => e.formattedMessage).join(', ')}`,
                );
            }
            html = result?.html;
            if (!html) {
                throw new InternalServerErrorException(`MJML produced empty HTML for template "${templateFilename}"`);
            }
        } catch (error) {
            console.error(`EmailService: failed to render template "${templateFilename}":`, error);
            throw error;
        }

        await this.mailerService.sendMail({
            from: EmailService.DEFAULT_EMAIL_FROM,
            to: sendTo,
            subject,
            html,
        });
    }

    private loadCompiledTemplate(filename: string): Handlebars.TemplateDelegate {
        if (EmailService.TEMPLATE_CACHE.has(filename)) {
            return EmailService.TEMPLATE_CACHE.get(filename) as Handlebars.TemplateDelegate;
        }

        const filePath = join(this.templateDir, filename);
        const fileContent = readFileSync(filePath, 'utf8');
        const compiledTemplate = Handlebars.compile(fileContent);

        EmailService.TEMPLATE_CACHE.set(filename, compiledTemplate);

        return compiledTemplate;
    }
}
