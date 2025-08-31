import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { AppConfigService } from '../app-config/services/app-config.service';
import { CommandHandlers } from './commands/handlers';
import { EmailService } from './services/email.service';

@Module({
    imports: [
        AppConfigModule,
        MailerModule.forRootAsync({
            imports: [AppConfigModule],
            inject: [AppConfigService],
            useFactory: (appConfigService: AppConfigService) => ({
                transport: {
                    host: appConfigService.smtp.host,
                    port: appConfigService.smtp.port,
                    secure: false,
                    requireTLS: true,
                    auth: { user: appConfigService.smtp.username, pass: appConfigService.smtp.password },
                },
            }),
        }),
    ],
    providers: [EmailService, ...CommandHandlers],
})
export class EmailModule {}
