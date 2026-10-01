import { SiteUserException } from '../exceptions';
import { ErrorReportItem, SiteUserErrorContext } from './error-report-item';

export class ErrorReport {
    private readonly errors: ErrorReportItem[] = [];

    /**
     * Builds a typed entry from the error.
     *
     * A previous version copied every own property of the error object into a free-form context. That pulled
     * internals of HttpException into the API response and made the entry impossible to process
     * programmatically. Failures that concern a site user carry the role and email themselves, which is what
     * R3.2-A003, 3.1(2) asks to be reported per user that cannot be matched.
     *
     * Errors that do not know their user (a Sync API timeout during a lookup, a failed removal command) get the
     * role and email from the context the caller passes, so that every entry produced while processing a user
     * names that user (EXT-02).
     */
    public add(error: unknown, context?: SiteUserErrorContext) {
        const userFields = {
            ...(context ? { siteUserType: context.siteUserType, email: context.email } : {}),
            ...(error instanceof SiteUserException
                ? { siteUserType: error.siteUserType, email: error.email ?? context?.email }
                : {}),
            ...(context ? { operation: context.operation } : {}),
        };

        if (error instanceof Error) {
            this.errors.push({
                type: error.name,
                message: error.message,
                ...userFields,
            });

            return;
        }

        this.errors.push({
            type: 'UnknownError',
            message: String(error),
            ...userFields,
        });
    }

    public append(otherReport: ErrorReport) {
        this.errors.push(...otherReport.items);
    }

    public get items() {
        return this.errors;
    }
}
