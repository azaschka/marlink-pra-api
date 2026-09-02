export interface ErrorReportItem {
    type: string;
    message: string;
    context?: Record<string, unknown>;
}
