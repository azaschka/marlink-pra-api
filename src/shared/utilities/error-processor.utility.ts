export abstract class ErrorProcessorUtility {
    public static stringify(error: unknown): string {
        if (error instanceof Error) {
            return error.stack ?? error.message;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
}
