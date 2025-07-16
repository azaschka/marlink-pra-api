export interface BaseWorkflow<T> {
    getOrCreate(): Promise<T>;
    delete(): Promise<void>;
}
