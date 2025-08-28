import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from '../app-config/app-config.module';
import { JobController } from './controllers/job.controller';

@Module({
    imports: [ScheduleModule.forRoot(), AppConfigModule],
    controllers: [JobController],
})
export class JobModule {}
