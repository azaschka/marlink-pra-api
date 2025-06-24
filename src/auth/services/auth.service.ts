import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

// Services
import { AppConfigService } from '../../app-config/services/app-config.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly jwtService: JwtService,
    ) {}

    public validateApiKey(apiKey: string): boolean {
        return this.appConfigService.auth.apiKey === apiKey;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async validateUser(username: string, plainTextPassword: string): Promise<any> {
        // Fetch user by username
        // const user = await this.userService.findOneBy(username);
        const user = { username, password: '' };

        if (user && (await this.verifyPassword(plainTextPassword, user.password))) {
            // Remove the password from the user object before returning it
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
            const { password, ...result } = user;

            return result;
        }

        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async login(user: any): Promise<{ accessToken: string }> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const payload = { username: user.username, role: user.role, displayName: user.displayName };

        return Promise.resolve({
            accessToken: this.jwtService.sign(payload),
        });
    }

    private async verifyPassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainTextPassword, hashedPassword);
    }
}
