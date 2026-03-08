import { BusinessUnit } from '../../beyondtrust-instance/enums';

export interface JWTUser {
    username: string;
    password?: string;
    role?: string;
    displayName?: string;
    businessUnit?: BusinessUnit;
    canManagePraUsers?: boolean;
}
