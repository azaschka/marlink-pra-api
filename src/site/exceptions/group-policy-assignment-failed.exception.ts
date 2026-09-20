import { HttpException, HttpStatus } from '@nestjs/common';
import { SiteUserType } from '../enums';

export interface GroupPolicyAssignmentFailure {
    groupPolicyId: number;
    operation: 'add' | 'remove';
    message: string;
}

/**
 * Raised after every group policy of a user has been attempted, carrying the ones that failed.
 *
 * A single unreachable group policy must not stop the remaining ones from being processed, otherwise a
 * repeated ingestion run would keep re-applying the same partial state. Collecting the failures and raising
 * them at the end keeps the user itself reported as failed, which would be lost if the failures were only
 * logged.
 */
export class GroupPolicyAssignmentFailedException extends HttpException {
    constructor(
        public readonly siteUserType: SiteUserType,
        public readonly userId: number,
        public readonly failures: GroupPolicyAssignmentFailure[],
    ) {
        super(
            `Failed to apply ${failures.length} group policy change(s) for user ${userId}: ` +
                failures
                    .map((failure) => `${failure.operation} ${failure.groupPolicyId} (${failure.message})`)
                    .join('; '),
            HttpStatus.BAD_GATEWAY,
        );
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
