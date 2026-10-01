import { HttpStatus } from '@nestjs/common';
import { UserSourceType } from '../../user/enums';
import { SiteUserType } from '../enums';
import { SiteUserException } from './site-user.exception';

/**
 * Raised when the source type supplied for a site user does not match what BeyondTrust reports for the
 * resolved account. The source type is declared by the caller and is not otherwise verifiable, so this is
 * the only point at which a wrongly flagged ingestion row can be detected.
 */
export class SourceTypeMismatchException extends SiteUserException {
    constructor(
        siteUserType: SiteUserType,
        email: string,
        public readonly expectedSourceType: UserSourceType,
        public readonly actualSourceType: UserSourceType,
    ) {
        super(
            siteUserType,
            email,
            `User with email ${email} was supplied as "${expectedSourceType}" but BeyondTrust reports "${actualSourceType}".`,
            HttpStatus.CONFLICT,
        );
    }
}
