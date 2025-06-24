import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Request } from 'express';

// Services
import { AuthService } from '../services/auth.service';

// Guards
import { ApiKeyAuthGuard, LocalAuthGuard } from '../guards';

@Controller('auth')
@UseGuards(ApiKeyAuthGuard, LocalAuthGuard)
@ApiExcludeController()
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    public async login(@Req() request: Request): Promise<{ accessToken: string }> {
        return this.authService.login(request.user);
    }
}
