import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { PraUserRepositoryService } from '../repositories/services/pra-user-repository.service';
import { JWTUser } from '../models';

@Injectable()
export class AuthService {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly jwtService: JwtService,
        private readonly praUserRepositoryService: PraUserRepositoryService,
    ) {}

    public validateApiKey(apiKey: string): boolean {
        return this.appConfigService.auth.apiKey === apiKey;
    }

    public async validateUser(username: string, plainTextPassword: string): Promise<JWTUser | null> {
        // Check fallback admin first (emergency access when DB is down)
        const fallbackConfig = this.appConfigService.auth.fallbackAdmin;
        if (
            fallbackConfig.enabled &&
            fallbackConfig.username &&
            fallbackConfig.passwordHash &&
            username === fallbackConfig.username
        ) {
            const isValidPassword = await this.verifyPassword(plainTextPassword, fallbackConfig.passwordHash);
            if (isValidPassword) {
                return {
                    username: fallbackConfig.username,
                    role: 'Super Admin',
                    displayName: 'System Administrator',
                    businessUnit: undefined,
                    canManagePraUsers: true,
                } as JWTUser;
            }
            // If password doesn't match, fall through to database check
        }

        const praUser = await this.praUserRepositoryService.findOneByUsername(username);
        if (praUser && (await this.verifyPassword(plainTextPassword, praUser.password))) {
            // Return the jwt user object without the md5 hash password
            return {
                username: praUser.username,
                role: praUser.role,
                displayName: praUser.displayName,
                businessUnit: praUser.businessUnit,
                canManagePraUsers: praUser.canManagePraUsers,
            } as JWTUser;
        }

        return null;
    }

    public async login(user: JWTUser): Promise<{ accessToken: string }> {
        const payload = {
            username: user.username,
            role: user.role,
            displayName: user.displayName,
            businessUnit: user.businessUnit,
            canManagePraUsers: user.canManagePraUsers,
        };

        return Promise.resolve({
            accessToken: this.jwtService.sign(payload),
        });
    }

    private async verifyPassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainTextPassword, hashedPassword);
    }
}
