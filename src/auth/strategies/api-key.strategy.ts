import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Strategies
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

// Services
import { AuthService } from '../services/auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
    private static readonly API_KEY_HEADER_KEY = 'x-api-key';

    constructor(private readonly authService: AuthService) {
        super({ header: ApiKeyStrategy.API_KEY_HEADER_KEY, prefix: '' }, false);
    }

    public async validate(apiKey: string): Promise<boolean> {
        if (this.authService.validateApiKey(apiKey)) {
            return Promise.resolve(true);
        }

        return Promise.reject(new UnauthorizedException('Invalid API Key'));
    }
}
