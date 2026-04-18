import { JumpointNodeBusinessUnit, JumpointNodeHypervisorType } from '../enums';

export class CreateJumpointNodeCommand {
    public readonly commandType = 'create-jumpoint-node';

    constructor(
        public readonly transactionId: string,
        public readonly siteKey: string,
        public readonly businessUnit: JumpointNodeBusinessUnit,
        public readonly hypervisorId?: string,
        public readonly hypervisorType?: JumpointNodeHypervisorType,
        public readonly vmId?: number,
    ) {}
}
