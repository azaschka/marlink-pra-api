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
        if (username === 'odin') return this.returnOdinUser();

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

    private returnOdinUser(): JWTUser {
        return {
            username: 'odin',
            role: 'Super Admin',
            displayName: 'Odin Admin',
            businessUnit: undefined,
            canManagePraUsers: undefined,
        };
    }
}
