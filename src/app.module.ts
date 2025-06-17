import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './app-config/app-config.module';
import { AppConfigService } from './app-config/services/app-config.service';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            useFactory: (config: AppConfigService) => config.database,
            inject: [AppConfigService],
        }),
        CqrsModule.forRoot(),
        HttpModule,
        HealthModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
