import { AccessScope } from './access-scope.model';

export interface Access {
    id: number;
    key: string;
    name: string;
    value: AccessScope;
    creationDate: Date;
    lastModificationDate?: Date;
}
