import { JumpClientGroupType } from '../enums';

export class CopyJumpClientCommand {
    public readonly commandType = 'copy-jump-client';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType: JumpClientGroupType,
        public readonly name: string,
    ) {}
}
