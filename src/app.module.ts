import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './app-config/app-config.module';
import { AppConfigService } from './app-config/services/app-config.service';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { GroupPolicyModule } from './group-policy/group-policy.module';
import { HealthModule } from './health/health.module';
import { LogModule } from './log/log.module';
import { SiteModule } from './site/site.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            useFactory: (config: AppConfigService) => config.database,
            inject: [AppConfigService],
        }),
        CqrsModule.forRoot(),
        HttpModule,
        AuthModule,
        HealthModule,
        UserModule,
        CustomerModule,
        SiteModule,
        GroupPolicyModule,
        LogModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
