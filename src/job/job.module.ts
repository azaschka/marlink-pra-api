import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from '../app-config/app-config.module';
import { RetentionModule } from '../retention/retention.module';
import { JobController } from './controllers/job.controller';

@Module({
    imports: [ScheduleModule.forRoot(), AppConfigModule, RetentionModule],
    controllers: [JobController],
})
export class JobModule {}
