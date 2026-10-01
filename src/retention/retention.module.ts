import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { RetentionService } from './services/retention.service';

@Module({
    imports: [AppConfigModule],
    providers: [RetentionService],
    exports: [RetentionService],
})
export class RetentionModule {}
