import { AccessScope } from '../models/access-scope.model';

export class CreateAccessCommand {
    public readonly commandType = 'create-access';

    constructor(
        public readonly transactionId: string,
        public readonly key: string,
        public readonly name: string,
        public readonly value: AccessScope,
    ) {}
}
