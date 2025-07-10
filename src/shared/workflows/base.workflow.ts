export interface BaseWorkflow<T> {
    getOrCreate(): Promise<T>;
}
