import { SiteUserException } from '../exceptions';
import { ErrorReportItem } from './error-report-item';

export class ErrorReport {
    private readonly errors: ErrorReportItem[] = [];

    /**
     * Builds a typed entry from the error.
     *
     * A previous version copied every own property of the error object into a free-form context. That pulled
     * internals of HttpException into the API response and made the entry impossible to process
     * programmatically. Failures that concern a site user carry the role and email themselves, which is what
     * R3.2-A003, 3.1(2) asks to be reported per user that cannot be matched.
     */
    public add(error: unknown) {
        if (error instanceof SiteUserException) {
            this.errors.push({
                type: error.name,
                message: error.message,
                siteUserType: error.siteUserType,
                email: error.email,
            });

            return;
        }

        if (error instanceof Error) {
            this.errors.push({
                type: error.name,
                message: error.message,
            });

            return;
        }

        this.errors.push({
            type: 'UnknownError',
            message: String(error),
        });
    }

    public append(otherReport: ErrorReport) {
        this.errors.push(...otherReport.items);
    }

    public get items() {
        return this.errors;
    }
}
