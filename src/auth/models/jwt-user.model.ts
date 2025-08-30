import { BusinessUnit } from '../enums';

export interface JWTUser {
    username: string;
    password?: string;
    role?: string;
    displayName?: string;
    businessUnit?: BusinessUnit;
}
