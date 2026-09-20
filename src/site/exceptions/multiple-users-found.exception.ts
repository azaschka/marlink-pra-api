import { HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';
import { SiteUserException } from './site-user.exception';

export class MultipleUsersFoundException extends SiteUserException {
    constructor(
        siteUserType: SiteUserType,
        public readonly username: string | undefined,
        email: string,
        public readonly userIds: number[],
    ) {
        super(
            siteUserType,
            email,
            `Found ${userIds.length} users matching username ${username ?? 'undefined'} or email ${email}.`,
            HttpStatus.CONFLICT,
        );
    }
}
