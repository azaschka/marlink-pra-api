import { SiteApprover } from '../models';

export class CreateSiteCommand {
    public readonly commandType = 'create-site';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly customerKey: string,
        public readonly approvers: SiteApprover[],
    ) {}
}
