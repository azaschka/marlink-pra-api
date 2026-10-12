import { FIELD_EXAMPLES } from '../config/request-overrides';
import { FieldDoc } from './model';

/**
 * Builds synthetic example values from DTO field descriptions.
 *
 * Values are deterministic, respect the documented constraints where they can be expressed generically and
 * never contain real data: example.com addresses, TEST-NET IP addresses, placeholder secrets. Constraints the
 * builder cannot satisfy generically (patterns, custom rules) surface as validation failures and need an
 * explicit override in `config/request-overrides.ts`.
 */

export type ExampleMode = 'minimal' | 'full';

const SECRET_NAME = /(password|secret|token|apikey|api_key|credential)/i;

function numberFromConstraint(field: FieldDoc, label: string): number | undefined {
    for (const constraint of field.constraints) {
        const match = new RegExp(`^(?:each item: )?${label} (-?\\d+(?:\\.\\d+)?)$`).exec(constraint);

        if (match?.[1] !== undefined) {
            return Number(match[1]);
        }
    }

    return undefined;
}

function kebab(name: string): string {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase();
}

export function stringExample(field: FieldDoc): string {
    const name = field.name;
    let value: string;

    if (/field$/i.test(name)) {
        value = `example-${kebab(name)}`;
    } else if (/language$/i.test(name)) {
        value = 'en-US';
    } else if (field.format === 'email' || /e?mail(s|address)?$/i.test(name) || /approvers?$/i.test(name)) {
        value = 'user@example.com';
    } else if (field.format === 'uri' || /url$|uri$/i.test(name)) {
        value = 'https://pra.example.com';
    } else if (field.format === 'date-time' || /(date|time)(from|to)?$|^date/i.test(name)) {
        value = '2026-01-01T00:00:00.000Z';
    } else if (field.format === 'uuid') {
        value = '00000000-0000-4000-8000-000000000000';
    } else if (field.format === 'ip address' || /ip(address)?$/i.test(name)) {
        value = '192.0.2.10';
    } else if (field.format === 'hostname' || /hostname$|host$|cname$|fqdn$/i.test(name)) {
        value = 'host.example.com';
    } else if (SECRET_NAME.test(name)) {
        value = 'replace-with-secret';
    } else if (/key$/i.test(name)) {
        value = `EXAMPLE_${
            kebab(name)
                .replace(/-?key$/, '')
                .replace(/-/g, '_')
                .toUpperCase() || 'KEY'
        }`;
    } else if (/username$/i.test(name)) {
        value = 'example.user';
    } else if (/name$/i.test(name)) {
        value = `Example ${kebab(name).replace(/-/g, ' ')}`;
    } else {
        value = `example-${kebab(name)}`;
    }

    const minLength = numberFromConstraint(field, 'min length');
    const maxLength = numberFromConstraint(field, 'max length');

    if (minLength !== undefined && value.length < minLength) {
        value = value.padEnd(minLength, 'x');
    }

    if (maxLength !== undefined && value.length > maxLength) {
        value = value.slice(0, maxLength);
    }

    return value;
}

function numberExample(field: FieldDoc): number {
    const minimum = numberFromConstraint(field, 'minimum');
    const maximum = numberFromConstraint(field, 'maximum');

    if (typeof field.defaultValue === 'number') {
        return field.defaultValue;
    }

    if (minimum !== undefined) {
        return minimum;
    }

    if (maximum !== undefined && maximum < 1) {
        return maximum;
    }

    return 1;
}

function configuredExample(field: FieldDoc): unknown {
    return FIELD_EXAMPLES[`${field.ownerClass}.${field.name}`];
}

function scalarExample(field: FieldDoc, itemType: string): unknown {
    const configured = configuredExample(field);

    if (configured !== undefined) {
        return configured;
    }

    if (
        field.defaultValue !== undefined &&
        !Array.isArray(field.defaultValue) &&
        typeof field.defaultValue !== 'object'
    ) {
        return field.defaultValue;
    }

    if ((itemType === 'enum' || field.enumValues) && field.enumValues?.length) {
        return field.enumValues[0];
    }

    switch (itemType) {
        case 'integer':
        case 'number':
            return numberExample(field);
        case 'boolean':
            return false;
        case 'string':
        case 'unknown':
            return stringExample(field);
        default:
            return stringExample(field);
    }
}

/** Direct children of a field in the flattened list. */
export function childFields(fields: FieldDoc[], parent: FieldDoc | undefined): FieldDoc[] {
    const prefix = parent ? `${parent.path}${parent.isArray ? '[]' : ''}.` : '';

    return fields.filter((field) => {
        if (!field.path.startsWith(prefix)) {
            return false;
        }

        const rest = field.path.slice(prefix.length);

        return rest.length > 0 && !rest.includes('.');
    });
}

function include(field: FieldDoc, mode: ExampleMode): boolean {
    if (field.readOnly) {
        return false;
    }

    return mode === 'full' || field.required === 'required';
}

function valueFor(field: FieldDoc, fields: FieldDoc[], mode: ExampleMode): unknown {
    const itemType = field.isArray ? (/^array<(.+)>$/.exec(field.type)?.[1] ?? 'unknown') : field.type;
    const children = childFields(fields, field);
    const single =
        children.length > 0 || field.nestedClass ? buildObject(fields, field, mode) : scalarExample(field, itemType);

    if (field.isArray) {
        if (Array.isArray(field.defaultValue)) {
            return field.defaultValue as unknown[];
        }

        return [single];
    }

    return single;
}

function buildObject(fields: FieldDoc[], parent: FieldDoc | undefined, mode: ExampleMode): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const field of childFields(fields, parent)) {
        if (include(field, mode)) {
            result[field.name] = valueFor(field, fields, mode);
        }
    }

    return result;
}

/** Example body with the required fields (`minimal`) or with every writable field (`full`). */
export function buildExample(fields: FieldDoc[], mode: ExampleMode): Record<string, unknown> {
    return buildObject(fields, undefined, mode);
}

/** Example value of a single field, used for query parameters and for the one-field PATCH minimum. */
export function buildFieldExample(fields: FieldDoc[], field: FieldDoc): unknown {
    return valueFor(field, fields, 'full');
}

/** String form of a query parameter value (arrays use their first item; repeat the key for more values). */
export function queryValueString(value: unknown): string {
    if (Array.isArray(value)) {
        return queryValueString(value[0]);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }

    return String(value);
}
