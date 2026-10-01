import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * R3.2-A003, 3.1(2) and 3.1(4): user creation and identity lifecycle management are outside the scope of this
 * system, and a non-local user cannot be deleted. Removing the record in BeyondTrust would not delete the
 * identity either, it would come back with a new user id on the next login and leave our references dangling.
 */
export class NonLocalUserDeletionException extends HttpException {
    constructor(public readonly userId: number) {
        super(
            {
                message:
                    `User ${userId} is provisioned by an external identity provider and cannot be deleted here. ` +
                    'Remove the user from its sites to drop all memberships, or disable the account by setting isLoginAllowed to false.',
                userId: userId,
            },
            HttpStatus.CONFLICT,
        );
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
