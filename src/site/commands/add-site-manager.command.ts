import { UserSourceType } from '../enums';

export class AddSiteManagerCommand {
    public readonly commandType = 'add-site-manager';

    constructor(
        public readonly transactionId: string,
        public readonly siteId: number,
        public readonly username: string,
        public readonly email: string,
        public readonly sourceType: UserSourceType,
    ) {}
}
