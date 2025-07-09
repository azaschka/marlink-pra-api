import { BaseLicenseUsageSourceData } from './base-license-usage-source-data.model';

export interface UserLicenseUsageSourceData extends BaseLicenseUsageSourceData {
    groupPolicyMemberLastSyncDate: Date;
    memberId: number;
    userId: number;
    username?: string;
    userLastSyncDate: Date;
}
