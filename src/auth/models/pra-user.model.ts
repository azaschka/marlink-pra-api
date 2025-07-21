import { BusinessUnit, UserRole } from '../enums';

export interface PraUser {
    id: number;
    username: string;
    password?: string;
    email: string;
    role: UserRole;
    displayName: string;
    businessUnit?: BusinessUnit;
    creationDate: Date;
    lastModificationDate?: Date;
}
