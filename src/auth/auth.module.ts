import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

// Modules
import { AppConfigModule } from '../app-config/app-config.module';

// Services
import { AppConfigService } from '../app-config/services/app-config.service';
import { AuthService } from './services/auth.service';

// Controllers
import { AuthController } from './controllers/auth.controller';

// Strategies
import { ApiKeyStrategy, JwtStrategy, LocalStrategy } from './strategies';

@Module({
    imports: [
        AppConfigModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [AppConfigModule],
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
    providers: [AuthService, ApiKeyStrategy, LocalStrategy, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule {}
