import { HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';
import { SiteUserException } from './site-user.exception';

/**
 * A site user may still hold the SAML default group policy of the Business Unit although nothing failed. The role is
 * in place, so this is an entry of the ingestion report and is not thrown.
 */
export class BuSamlDefaultGroupPolicyRetainedException extends SiteUserException {
    constructor(siteUserType: SiteUserType, email: string, groupPolicyName: string, reason: string) {
        super(siteUserType, email, `${groupPolicyName} of ${email}: ${reason}`, HttpStatus.BAD_GATEWAY);
    }
}
