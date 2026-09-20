import { SiteUserType } from '../enums';

export interface ErrorReportItem {
    type: string;
    message: string;
    /** Set when the failure concerns one specific site user. */
    siteUserType?: SiteUserType;
    /** Email of the affected site user, so the caller can correct the ingestion row. */
    email?: string;
}
