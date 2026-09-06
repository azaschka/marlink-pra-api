import { ErrorReportItem } from './error-report-item';

export class ErrorReport {
    private readonly errors: ErrorReportItem[] = [];

    public add(error: unknown) {
        if (error instanceof Error) {
            this.errors.push({
                type: error.name,
                message: error.message,
                context: this.extractContext(error),
            });
        } else {
            this.errors.push({
                type: 'UnknownError',
                message: String(error),
            });
        }
    }

    public append(otherReport: ErrorReport) {
        this.errors.push(...otherReport.items);
    }

    public get items() {
        return this.errors;
    }

    private extractContext(error: Error): Record<string, unknown> | undefined {
        // Strip standard Error properties and keep custom fields.
        const { ...context } = error as Error & Record<string, unknown>;

        return Object.keys(context).length ? context : undefined;
    }
}
