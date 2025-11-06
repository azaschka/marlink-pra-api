import { JumpGroupType } from '../enums';

export class CopyRemoteVncCommand {
    public readonly commandType = 'copy-remote-vnc';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType: JumpGroupType,
        public readonly name: string,
    ) {}
}
