import { JumpGroupType, WebJumpUsernameFormatType } from '../enums';

export class ModifyWebJumpCommand {
    public readonly commandType = 'modify-web-jump';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly name?: string,
        public readonly jumpointId?: number,
        public readonly url?: string,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpGroupType,
        public readonly usernameFormatType?: WebJumpUsernameFormatType,
        public readonly mustVerifyCertificate?: boolean,
        public readonly authenticationTimeoutInSeconds?: number,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly usernameField?: string | null,
        public readonly passwordField?: string | null,
        public readonly submitField?: string | null,
        public readonly sessionPolicyId?: number | null,
    ) {}
}
