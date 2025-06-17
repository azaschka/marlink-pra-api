import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfigModule } from '../app-config/app-config.module';
import { HealthController } from './controllers/health.controller';

@Module({
    imports: [AppConfigModule, TerminusModule],
    controllers: [HealthController],
})
export class HealthModule {}
