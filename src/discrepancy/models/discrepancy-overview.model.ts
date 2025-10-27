import { DiscrepancyEntityType } from '../enums';

export interface DiscrepancyOverview {
    entityType: DiscrepancyEntityType;
    totalBtData: number;
    totalDbData: number;
    identicalIds: number[];
    onlyInExternalIds: number[];
    onlyInInternalIds: number[];
    mismatchedIds: number[];
    parentId?: number; // Only applicable for relational data. This id is the parent and all other ids are the children.
}
