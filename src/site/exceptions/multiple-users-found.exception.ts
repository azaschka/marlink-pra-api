import { HttpException, HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';

export class MultipleUsersFoundException extends HttpException {
    constructor(
        public readonly siteUserType: SiteUserType,
        public readonly username: string | undefined,
        public readonly email: string,
        public readonly userIds: number[],
    ) {
        super(`Found ${userIds.length} users.`, HttpStatus.CONFLICT);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
