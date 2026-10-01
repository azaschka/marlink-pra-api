/**
 * Runs a check at most once per time-to-live and lets concurrent callers share the run in flight
 * (single-flight), so health polling from several clients cannot multiply the load on a dependency.
 */
export class CachedCheck<T> {
    private value: T | undefined;
    private expiresAt = 0;
    private inFlight: Promise<T> | undefined;

    constructor(
        private readonly ttlInMs: number,
        private readonly run: () => Promise<T>,
        private readonly now: () => number = Date.now,
    ) {}

    public get(): Promise<T> {
        if (this.value !== undefined && this.now() < this.expiresAt) {
            return Promise.resolve(this.value);
        }

        if (!this.inFlight) {
            this.inFlight = this.run()
                .then((value) => {
                    this.value = value;
                    this.expiresAt = this.now() + this.ttlInMs;

                    return value;
                })
                .finally(() => {
                    this.inFlight = undefined;
                });
        }

        return this.inFlight;
    }
}

/** Resolves with the fallback when the promise does not settle in time. The promise itself keeps running. */
export function withTimeout<T>(promise: Promise<T>, timeoutInMs: number, onTimeout: () => T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout()), timeoutInMs);
        timer.unref();
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
