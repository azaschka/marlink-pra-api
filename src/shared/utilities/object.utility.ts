export abstract class ObjectUtility {
    public static contain(source: number[], target: number[]): boolean {
        return source.some((item) => target.includes(item));
    }

    public static stripProperties<T extends object, K extends keyof T>(source: T, ...properties: K[]): Omit<T, K> {
        // Create a shallow copy with the target properties removed
        const rest = { ...source } as Record<string, unknown>;
        for (const property of properties) {
            delete rest[property as string];
        }

        // Create a new object with the same prototype
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
        const result = Object.create(Object.getPrototypeOf(source));

        // Assign the rest of the properties into the new instance
        Object.assign(result, rest);

        // Return the properly typed object
        return result as Omit<T, K>;
    }

    public static filterUnique<T>(array: T[]): T[] {
        const seen = new Set<string>();

        return array.filter((item) => {
            const key = JSON.stringify(item);

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);

            return true;
        });
    }
}
