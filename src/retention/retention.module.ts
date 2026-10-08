import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { RetentionService } from './services/retention.service';

@Module({
    imports: [AppConfigModule],
    providers: [RetentionService, ...CommandHandlers],
    exports: [RetentionService],
})
export class RetentionModule {}
