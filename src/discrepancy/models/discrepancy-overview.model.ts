import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';

export interface DiscrepancyOverview {
    entityType: DiscrepancyEntityType;
    totalBtData: number;
    totalDbData: number;
    identicalIds: number[];
    onlyInExternalIds: number[];
    onlyInInternalIds: number[];
    mismatchedIds: number[];
    parentId?: number; // Only applicable for relational data. This id is the parent and all other ids are the children.
    /** Sent by the Sync API from 3.2 on; absent from older versions. Anything but "succeeded" means incomplete data. */
    state?: DiscrepancyScanState;
    /** Error kind when the state is "failed" or "skipped", e.g. NotFound, UnexpectedResponse, InstanceUnavailable. */
    failureKind?: string;
}
