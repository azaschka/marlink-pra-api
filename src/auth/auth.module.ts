import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../app-config/app-config.module';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';
import { AppConfigService } from '../app-config/services/app-config.service';
import { PraUserRepositoryService } from './repositories/services/pra-user-repository.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { ApiKeyStrategy, JwtStrategy, LocalStrategy } from './strategies';
import { PraUserEntity } from './repositories/entities';

@Module({
    imports: [
        AppConfigModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [AppConfigModule, TypeOrmModule.forFeature([PraUserEntity])],
            // eslint-disable-next-line @typescript-eslint/require-await
            useFactory: async (appConfigService: AppConfigService) => ({
                secret: appConfigService.auth.jwtSecret,
                signOptions: {
                    expiresIn: appConfigService.auth.jwtExpiry,
                },
            }),
            inject: [AppConfigService],
        }),
    ],
    controllers: [AuthController],
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
