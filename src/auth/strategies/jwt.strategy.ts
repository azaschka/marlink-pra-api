import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { JWTUser } from '../models';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(appConfigService: AppConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: appConfigService.auth.jwtSecret,
        });
    }

    public async validate(payload: JWTUser): Promise<JWTUser> {
        return Promise.resolve({
            username: payload.username,
            role: payload.role,
            displayName: payload.displayName,
            businessUnit: payload.businessUnit,
            canManagePraUsers: payload.canManagePraUsers,
        });
    }
}
