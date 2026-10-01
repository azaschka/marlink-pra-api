import { HttpException, HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';

/**
 * Base class for failures that concern one specific site user.
 *
 * R3.2-A003, 3.1(2) requires an error to be recorded and reported for each user that cannot be matched.
 * Carrying the role and the email on the exception lets ErrorReport build a typed entry out of it instead of
 * copying whatever properties happen to sit on the error object.
 */
export abstract class SiteUserException extends HttpException {
    protected constructor(
        public readonly siteUserType: SiteUserType,
        public readonly email: string | undefined,
        message: string,
        status: HttpStatus,
    ) {
        super(message, status);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
