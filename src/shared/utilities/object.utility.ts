export abstract class ObjectUtility {
    public static contain(source: number[], target: number[]): boolean {
        return source.some((item) => target.includes(item));
    }

    public static stripProperty<T extends object, K extends keyof T>(source: T, property: K): Omit<T, K> {
        // Create a shallow copy with the target property removed
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [property]: _, ...rest } = source as Record<string, unknown>;

        // Create a new object with the same prototype
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
        const result = Object.create(Object.getPrototypeOf(source));

        // Assign the rest of the properties into the new instance
        Object.assign(result, rest);

        // Return the properly typed object
        return result as Omit<T, K>;
    }
}
