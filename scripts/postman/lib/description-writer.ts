import { AuthScheme, FieldDoc, InputParam, Operation } from './model';
import { displayValue } from './render-common';

/**
 * Markdown documentation of a request, rendered into the Postman request description.
 */

const SCHEME_TEXT: Record<AuthScheme, string> = {
    accessKey: 'X-Access-Key header (`{{accessKey}}`)',
    apiKey: 'X-API-Key header (`{{apiKey}}`, static internal key)',
    jwt: 'Bearer token (`Authorization: Bearer {{jwtToken}}`, from POST /auth/login)',
    localCredentials: 'username and password in the JSON body',
};

export function authenticationText(schemes: AuthScheme[]): string {
    if (schemes.length === 0) {
        return 'None. The route has no authentication guard.';
    }

    return schemes.map((scheme) => SCHEME_TEXT[scheme]).join(' and ');
}

export function cell(value: unknown): string {
    return displayValue(value ?? '')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
        .trim();
}

function code(value: unknown): string {
    return `\`${typeof value === 'string' ? value : JSON.stringify(value)}\``;
}

function details(entry: {
    enumValues?: Array<string | number>;
    format?: string;
    defaultValue?: unknown;
    constraints: string[];
    description?: string;
}): string {
    const parts: string[] = [];

    if (entry.description) {
        parts.push(entry.description.replace(/\.?\s*$/, '.'));
    }

    if (entry.enumValues?.length) {
        parts.push(`One of ${entry.enumValues.map(code).join(', ')}.`);
    }

    if (entry.format) {
        parts.push(`Format: ${entry.format}.`);
    }

    if (entry.defaultValue !== undefined) {
        parts.push(`Default ${code(entry.defaultValue)}.`);
    }

    if (entry.constraints.length) {
        parts.push(`Rules: ${entry.constraints.join(', ')}.`);
    }

    return cell(parts.join(' '));
}

function paramTable(title: string, params: InputParam[], footnote?: string): string[] {
    if (params.length === 0) {
        return [];
    }

    const lines = [
        `**${title}**`,
        '',
        '| Name | Type | Required | Details |',
        '|---|---|---|---|',
        ...params.map(
            (param) =>
                `| \`${param.name}\` | ${cell(param.isArray && !param.type.startsWith('array') ? `array<${param.type}>` : param.type)} | ${param.required ? 'yes' : 'no'} | ${details(param)} |`,
        ),
    ];

    if (footnote) {
        lines.push('', footnote);
    }

    lines.push('');

    return lines;
}

function fieldRequired(field: FieldDoc): string {
    if (field.required === 'conditional') {
        return 'conditional';
    }

    return field.required === 'required' ? 'yes' : 'no';
}

function fieldTable(fields: FieldDoc[]): string[] {
    return [
        '| Field | Type | Required | Null accepted | Details |',
        '|---|---|---|---|---|',
        ...fields
            .filter((field) => !field.readOnly)
            .map((field) => {
                const notes = field.notes.filter((note) => !note.startsWith('Swagger'));
                const text = [details(field), cell(notes.join(' '))].filter(Boolean).join(' ');

                return `| \`${field.path}\` | ${cell(field.type)} | ${fieldRequired(field)} | ${field.acceptsNull ? 'yes' : 'no'} | ${text} |`;
            }),
    ];
}

export function describeOperation(operation: Operation): string {
    const lines: string[] = [];
    const source = operation.sourceFile
        ? `\`${operation.controllerName}.${operation.handlerName}()\` in \`${operation.sourceFile}\``
        : `\`${operation.controllerName}.${operation.handlerName}()\``;
    const exportText =
        operation.customerExport.status === 'included'
            ? 'included'
            : `not included. ${operation.customerExport.reason}`;

    lines.push(`${operation.label}.`, '');
    lines.push('| | |', '|---|---|');
    lines.push(`| Source | ${source} (module \`${operation.moduleName}\`) |`);
    lines.push(`| Authentication | ${cell(authenticationText(operation.auth.schemes))} |`);
    lines.push(
        `| Swagger | ${operation.swaggerExcluded ? 'excluded (`@ApiExcludeController` or `@ApiExcludeEndpoint`)' : 'documented in /open-api'} |`,
    );
    lines.push(`| Customer export | ${cell(exportText)} |`, '');

    if (operation.auth.authorizationNotes.length) {
        lines.push(
            '**Authorisation and scope**',
            '',
            ...operation.auth.authorizationNotes.map((note) => `- ${note}`),
            '',
        );
    }

    lines.push(...paramTable('Path parameters', operation.pathParams));
    lines.push(
        ...paramTable(
            'Headers',
            operation.headers,
            operation.headers.some((header) => !header.required)
                ? 'Optional headers are present but disabled; enable them when needed.'
                : undefined,
        ),
    );
    lines.push(
        ...paramTable(
            'Query parameters',
            operation.queryParams,
            operation.queryParams.some((param) => !param.required)
                ? 'Optional query parameters are present but disabled; enable them when needed.'
                : undefined,
        ),
    );

    if (operation.body) {
        const body = operation.body;

        lines.push(
            `**Body** (\`${body.mediaType}\`, \`${body.dtoName}\`, ${body.validationEnforced ? 'validated by ValidationPipe' : 'NOT validated on this route'})`,
            '',
        );
        lines.push(...fieldTable(body.fields), '');
        lines.push(
            '- The request body is the minimal valid body: required fields only.',
            '- The saved example "Full body" sends every writable field with representative nested objects and arrays.',
            '- JSON properties cannot be disabled individually: delete optional properties you do not want to send. Omitting a property and sending `null` are different; "Null accepted" shows what validation allows.',
            ...body.notes.map((note) => `- ${note}`),
            '',
        );
    }

    lines.push(
        '**Responses**',
        '',
        ...operation.responses.map(
            (response) => `- ${response.status}${response.description ? `: ${response.description}` : ''}`,
        ),
        '',
    );

    if (operation.notes.length) {
        lines.push('**Notes**', '', ...operation.notes.map((note) => `- ${note}`), '');
    }

    if (operation.discrepancies.length) {
        lines.push(
            '**Contract notes** (effective behaviour in code versus Swagger metadata)',
            '',
            ...operation.discrepancies.map((note) => `- ${note}`),
            '',
        );
    }

    return lines.join('\n').trimEnd();
}
