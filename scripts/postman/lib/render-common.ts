import { v5 as uuidv5 } from 'uuid';
import { AuthScheme, InputParam, Operation } from './model';

/**
 * Rendering helpers shared by the native v3 writer and the Collection v2.1 exporter, so that both formats
 * describe each request identically.
 */

const STATUS_TEXT = new Map<number, string>([
    [200, 'OK'],
    [201, 'Created'],
    [202, 'Accepted'],
    [204, 'No Content'],
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [503, 'Service Unavailable'],
]);

export function statusText(status: number): string {
    return STATUS_TEXT.get(status) ?? 'OK';
}

/** String form of a documented value; objects and arrays as JSON. */
export function displayValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }

    return JSON.stringify(value) ?? '';
}

export class IdFactory {
    constructor(private readonly namespace: string) {}

    /** Deterministic UUID (v5) for a stable name, for example `request:GET /sites`. */
    public id(name: string): string {
        return uuidv5(name, this.namespace);
    }
}

export interface PostmanAuthSpec {
    type: 'noauth' | 'apikey' | 'bearer';
    key?: string;
    value?: string;
    token?: string;
}

/** Postman auth that expresses a scheme set; a second credential is an explicit header row. */
export function authSpec(schemes: AuthScheme[]): PostmanAuthSpec {
    if (schemes.length === 0) {
        return { type: 'noauth' };
    }

    if (schemes.includes('jwt')) {
        return { type: 'bearer', token: '{{jwtToken}}' };
    }

    if (schemes.includes('apiKey')) {
        return { type: 'apikey', key: 'X-API-Key', value: '{{apiKey}}' };
    }

    return { type: 'apikey', key: 'X-Access-Key', value: '{{accessKey}}' };
}

/** `{{baseUrl}}/sites/:id/managers` plus the enabled query parameters, in row order. */
export function rawUrl(operation: Operation): string {
    const enabled = operation.queryParams.filter((param) => param.required);
    const query = enabled.map((param) => `${param.name}=${encodeQueryValue(param.value)}`).join('&');

    return `{{baseUrl}}${operation.path === '/' ? '/' : operation.path}${query ? `?${query}` : ''}`;
}

/** Keeps `{{variables}}` readable and encodes everything else that is not URL safe. */
export function encodeQueryValue(value: string): string {
    return value
        .split(/(\{\{[^}]+\}\})/)
        .map((part) => (part.startsWith('{{') ? part : encodeURIComponent(part)))
        .join('');
}

export function paramDescription(param: InputParam): string {
    const parts = [param.description];

    if (param.enumValues?.length) {
        parts.push(`One of: ${param.enumValues.join(', ')}.`);
    }

    if (param.defaultValue !== undefined) {
        parts.push(`Default: ${displayValue(param.defaultValue)}.`);
    }

    if (param.required) {
        parts.push('Required.');
    } else if (!/^optional/i.test(param.description)) {
        parts.push('Optional.');
    }

    return parts.filter(Boolean).join(' ');
}

export function bodyJson(value: Record<string, unknown>): string {
    return JSON.stringify(value, null, 2);
}

export function hasDistinctFullExample(operation: Operation): boolean {
    return Boolean(operation.body) && JSON.stringify(operation.body?.full) !== JSON.stringify(operation.body?.minimal);
}

export function successStatus(operation: Operation): number {
    return operation.responses.find((response) => response.status >= 200 && response.status < 300)?.status ?? 200;
}
