import { JumpClientEndpointAgreementPolicyType, JumpClientGroupType } from '../enums';

export class ModifyJumpClientCommand {
    public readonly commandType = 'modify-jump-client';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId?: number,
        public readonly jumpGroupType?: JumpClientGroupType,
        public readonly name?: string,
        public readonly tag?: string,
        public readonly comments?: string,
        public readonly jumpPolicyId?: number | null,
        public readonly sessionPolicyId?: number | null,
        public readonly maxOfflineDurationInMinutes?: number,
        public readonly endpointAgreementPolicyType?: JumpClientEndpointAgreementPolicyType,
    ) {}
}
