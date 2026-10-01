import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * R3.2-A004: a non-local account is owned by the identity provider. BeyondTrust rejects changes to the
 * properties it synchronises from there, and forwarding such a request only produces an opaque upstream error.
 */
export class NonLocalUserModificationException extends HttpException {
    constructor(public readonly properties: string[]) {
        super(
            {
                message:
                    `The following properties cannot be changed on a non-local user: ${properties.join(', ')}. ` +
                    'They are owned by the identity provider the account is provisioned from.',
                properties: properties,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
