import { HttpException, HttpStatus } from '@nestjs/common';
import { BusinessUnit } from '../../beyondtrust-instance/enums';

/**
 * EXT-21: the SAML default group policy of the customer's Business Unit does not exist on the BeyondTrust
 * instance. The policy is created manually, so the ingestion cannot repair this. It is reported once per run and
 * does not fail the external users: their role-specific memberships are applied regardless.
 */
export class BuSamlDefaultGroupPolicyNotFoundException extends HttpException {
    constructor(
        public readonly groupPolicyName: string | undefined,
        public readonly businessUnit: BusinessUnit,
        public readonly beyondtrustInstanceId: number,
    ) {
        super(
            `Group policy "${groupPolicyName ?? 'undefined'}" (default policy for external users of Business Unit ` +
                `${businessUnit}) was not found on BeyondTrust instance ${beyondtrustInstanceId}. The external users ` +
                'of this site were processed without it and are not visible to BU Admins through this policy. ' +
                'Create the policy in BeyondTrust and run the import again.',
            HttpStatus.NOT_FOUND,
        );
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
