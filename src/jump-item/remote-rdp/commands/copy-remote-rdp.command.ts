import { JumpGroupType } from '../enums';

export class CopyRemoteRdpCommand {
    public readonly commandType = 'copy-remote-rdp';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly id: number,
        public readonly jumpGroupId: number,
        public readonly jumpGroupType: JumpGroupType,
        public readonly name: string,
    ) {}
}
