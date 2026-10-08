/**
 * Final state of a scan of one entity type, as reported by the Sync API (3.2 and later). Older Sync API versions
 * do not send it.
 */
export enum DiscrepancyScanState {
    Succeeded = 'succeeded',
    /** Relation scans only: some parents succeeded, others failed. */
    Partial = 'partial',
    Failed = 'failed',
    /** Not attempted, e.g. because the BeyondTrust instance was found unavailable earlier in the cycle. */
    Skipped = 'skipped',
    /** Not finished because the scan budget of the Sync API expired. */
    Aborted = 'aborted',
}
