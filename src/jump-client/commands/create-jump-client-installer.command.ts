import { JumpClientConnectionType, JumpClientGroupType } from '../enums';

export class CreateJumpClientInstallerCommand {
    public readonly commandType = 'create-jump-client-installer';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly jumpGroupId: number,
        public readonly name?: string,
        public readonly jumpGroupType?: JumpClientGroupType,
        public readonly jumpPolicyId?: number,
        public readonly tag?: string,
        public readonly connectionType?: JumpClientConnectionType,
        public readonly sessionPolicyId?: number | null,
        public readonly comments?: string,
        public readonly validDurationInMinutes?: number,
        public readonly shouldElevateInstall?: boolean,
        public readonly shouldElevatePrompt?: boolean,
        public readonly canOverrideJumpGroup?: boolean,
        public readonly canOverrideJumpPolicy?: boolean,
        public readonly canOverrideName?: boolean,
        public readonly canOverrideTag?: boolean,
        public readonly canOverrideComments?: boolean,
        public readonly canOverrideSessionPolicy?: boolean,
        public readonly jumpointProxy?: string | null,
    ) {}
}
