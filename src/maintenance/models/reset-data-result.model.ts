export interface ResetDataResult {
    /** Whether this was a dry-run (no changes were made). */
    dryRun: boolean;
    /** Tables that were (or would be) truncated. */
    truncatedTables: string[];
    /** Tables that were explicitly preserved (keep-list). */
    keptTables: string[];
}
