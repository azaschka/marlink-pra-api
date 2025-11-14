import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';
import { AppConfigService } from '../app-config/services/app-config.service';
import { PraUserRepositoryService } from './repositories/services/pra-user-repository.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { PraUserController } from './controllers/pra-user.controller';
import { ApiKeyStrategy, JwtStrategy, LocalStrategy } from './strategies';
import { PraUserEntity } from './repositories/entities';

@Module({
    imports: [
        AppConfigModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [AppConfigModule, TypeOrmModule.forFeature([PraUserEntity])],
            useFactory: (appConfigService: AppConfigService): JwtModuleOptions => ({
                secret: appConfigService.auth.jwtSecret,
                signOptions: {
                    // Type assertion needed due to strict typing in @nestjs/jwt@11.0.1
                    // The expiresIn value from config is a valid time string (e.g., "1h", "7d")
                    expiresIn: appConfigService.auth.jwtExpiry as never,
                },
            }),
            inject: [AppConfigService],
        }),
    ],
    controllers: [AuthController, PraUserController],
    providers: [
        AuthService,
        ApiKeyStrategy,
        LocalStrategy,
        JwtStrategy,
        ...CommandHandlers,
        ...QueryHandlers,
        PraUserRepositoryService,
    ],
    exports: [AuthService],
})
export class AuthModule {}
