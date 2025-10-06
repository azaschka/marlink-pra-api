import { JumpClientInstallerPlatformType } from '../enums';

export class RetrieveJumpClientInstallerPlatformQuery {
    public readonly queryType = 'retrieve-jump-client-installer-platform';

    constructor(
        public readonly transactionId: string,
        public readonly tenantId: number,
        public readonly installerId: string,
        public readonly platformType: JumpClientInstallerPlatformType,
    ) {}
}
