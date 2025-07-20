export class ModifyBeyondtrustInstanceCommand {
    public readonly commandType = 'modify-beyondtrust-instance';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly name?: string,
        public readonly authClientId?: string,
        public readonly authClientSecret?: string,
        public readonly oauth2TokenUrl?: string,
        public readonly apiBaseUrl?: string,
        public readonly backupApiUrl?: string,
    ) {}
}
