import { HttpException, HttpStatus } from '@nestjs/common';
import { GroupPolicyMembershipFailure } from '../../group-policy-member/workflows';

/**
 * Raised when some group policy changes of a non-local user could not be applied. Every requested change was
 * attempted; the ones listed here failed and can be retried, the others are in place.
 */
export class NonLocalGroupPolicyChangeFailedException extends HttpException {
    constructor(
        public readonly userId: number,
        public readonly failures: GroupPolicyMembershipFailure[],
    ) {
        super(
            {
                message:
                    `${failures.length} group policy change(s) for user ${userId} could not be applied: ` +
                    failures
                        .map((failure) => `${failure.operation} ${failure.groupPolicyId} (${failure.message})`)
                        .join('; '),
                failures: failures,
            },
            HttpStatus.BAD_GATEWAY,
        );
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
