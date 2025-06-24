import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Strategies
import { ExtractJwt, Strategy } from 'passport-jwt';

// Services
import { AppConfigService } from '../../app-config/services/app-config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(appConfigService: AppConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: appConfigService.auth.jwtSecret,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async validate(payload: any): Promise<any> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        return Promise.resolve({ username: payload.username, role: payload.role, displayName: payload.displayName });
    }
}
