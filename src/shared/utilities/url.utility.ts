export abstract class UrlUtility {
    public static join(baseUrl: string, ...paths: string[]): string {
        // Remove trailing slashes from base URL
        const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

        // Clean and filter paths: remove empty, null, or undefined, and trim slashes
        const normalizedPaths = paths
            .filter((path) => !!path && path.trim() !== '') // Remove empty, null, or undefined
            .map((path) => path.replace(/^\/+|\/+$/g, '')); // Trim slashes

        return [normalizedBaseUrl, ...normalizedPaths].join('/');
    }
}
