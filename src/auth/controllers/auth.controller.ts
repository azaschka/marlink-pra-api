import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiKeyAuthGuard, JwtAuthGuard, LocalAuthGuard } from '../guards';
import { JWTUser } from '../models';

@Controller('auth')
@UseGuards(ApiKeyAuthGuard)
@ApiExcludeController()
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    public async login(@Req() request: Request): Promise<{ accessToken: string }> {
        return this.authService.login(request.user as JWTUser);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    public profile(@Req() request: Request): JWTUser {
        return request.user as JWTUser;
    }
}
