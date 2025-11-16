/**
 * Utility class for implementing retry logic and delays in async operations.
 * Useful for handling transient failures in API calls and database operations.
 */
export class RetryUtility {
    public static readonly DEFAULT_MAX_RETRIES = 5;
    public static readonly DEFAULT_RETRY_DELAY_MS = 2000;

    /**
     * Delays execution for the specified number of milliseconds.
     *
     * @param ms - Delay in milliseconds
     * @returns Promise that resolves after the delay
     */
    public static async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Executes an async operation with retry logic and delay between attempts.
     *
     * @param operation - The async operation to execute
     * @param operationName - Name of the operation for logging
     * @param maxRetries - Maximum number of retry attempts (default: 5)
     * @param delayMs - Delay in milliseconds between retry attempts (default: 2000ms)
     * @returns The result of the operation
     * @throws The last error if all retry attempts fail
     */
    public static async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = RetryUtility.DEFAULT_MAX_RETRIES,
        delayMs: number = RetryUtility.DEFAULT_RETRY_DELAY_MS,
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                if (attempt > 1) {
                    console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
                }
                return result;
            } catch (error) {
                lastError = error;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️ ${operationName} failed on attempt ${attempt}/${maxRetries}: ${errorMessage}`);

                if (attempt < maxRetries) {
                    console.log(`⏳ Retrying in ${delayMs}ms...`);
                    await RetryUtility.delay(delayMs);
                }
            }
        }

        // All retries exhausted
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        console.error(`❌ ${operationName} failed after ${maxRetries} attempts: ${errorMessage}`);
        throw lastError;
    }
}
