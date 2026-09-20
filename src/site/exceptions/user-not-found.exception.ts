import { HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';
import { SiteUserException } from './site-user.exception';

export class UserNotFoundException extends SiteUserException {
    constructor(
        siteUserType: SiteUserType,
        public readonly username: string | undefined,
        email: string,
    ) {
        super(
            siteUserType,
            email,
            `User with username ${username ?? 'undefined'} and email ${email} not found.`,
            HttpStatus.NOT_FOUND,
        );
    }
}
