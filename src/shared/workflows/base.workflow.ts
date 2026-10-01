/**
 * TDeleteResult defaults to void so workflows that simply tear something down keep their signature.
 * SiteWorkflow returns an ErrorReport instead: deleting a site touches many BeyondTrust artefacts, and a
 * failure on one of them has to reach the caller rather than only the pod log.
 */
export interface BaseWorkflow<T, TDeleteResult = void> {
    getOrCreate(): Promise<T>;
    delete(): Promise<TDeleteResult>;
}
