import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { JWTUser } from '../../auth/models';

/**
 * Authorizes the destructive data-reset endpoint.
 *
 * Must run AFTER the JWT auth guard so that `request.user` is populated.
 * Only usernames present in the configured allow-list
 * (`RESET_ALLOWED_USERNAMES`) may proceed. This is the server-side gate — the
 * console-side visibility check is only cosmetic.
 */
@Injectable()
export class ResetAuthorizationGuard implements CanActivate {
    constructor(private readonly appConfigService: AppConfigService) {}

    public canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user as JWTUser | undefined;

        const allowedUsernames = this.appConfigService.maintenance.resetAllowedUsernames;

        if (!user?.username || !allowedUsernames.includes(user.username)) {
            throw new ForbiddenException('You are not authorized to perform this operation.');
        }

        return true;
    }
}
