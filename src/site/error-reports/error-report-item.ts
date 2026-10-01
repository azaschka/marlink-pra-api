import { SiteUserType } from '../enums';

export interface ErrorReportItem {
    type: string;
    message: string;
    /** Set when the failure concerns one specific site user. */
    siteUserType?: SiteUserType;
    /** Email of the affected site user, so the caller can correct the ingestion row. */
    email?: string;
    /** Whether the failure happened while adding/updating the user or while removing it. */
    operation?: SiteUserOperation;
}

export type SiteUserOperation = 'add' | 'remove';

/** Who an error belongs to when the error itself does not say it (transport errors, unexpected failures). */
export interface SiteUserErrorContext {
    siteUserType: SiteUserType;
    email: string | undefined;
    operation: SiteUserOperation;
}
