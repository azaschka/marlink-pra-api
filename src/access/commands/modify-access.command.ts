import { AccessScope } from '../models/access-scope.model';

export class ModifyAccessCommand {
    public readonly commandType = 'modify-access';

    constructor(
        public readonly transactionId: string,
        public readonly id: number,
        public readonly key?: string,
        public readonly name?: string,
        public readonly value?: AccessScope,
    ) {}
}
