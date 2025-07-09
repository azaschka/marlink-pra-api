import { JumpItemType } from '../enums';
import { BaseLicenseUsageSourceData } from './base-license-usage-source-data.model';

export interface AssetLicenseUsageSourceData extends BaseLicenseUsageSourceData {
    groupPolicyJumpGroupLastSyncDate: Date;
    jumpGroupId: number;
    jumpGroupName: string;
    jumpGroupLastSyncDate: Date;
    jumpItemType: JumpItemType;
    jumpItemId: number;
    jumpItemName?: string;
    jumpItemJumpointId?: number;
    jumpItemHostname?: string;
    jumpItemEndpointUrl?: string;
    jumpItemFqdn?: string;
    jumpItemLastSyncDate: Date;
}
