import { HttpException, HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';

export class UserNotFoundException extends HttpException {
    constructor(
        public readonly siteUserType: SiteUserType,
        public readonly username: string | undefined,
        public readonly email: string,
    ) {
        super(`User with username ${username ?? 'undefined'} and email ${email} not found.`, HttpStatus.NOT_FOUND);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
