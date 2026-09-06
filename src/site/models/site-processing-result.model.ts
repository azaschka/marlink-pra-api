import { ErrorReport } from '../error-reports';
import { Site } from './site.model';

export interface SiteProcessingResult {
    site: Site;
    errorReport: ErrorReport;
}
