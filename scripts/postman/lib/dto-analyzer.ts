import { TransformationType } from 'class-transformer';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { getMetadataStorage, ValidationTypes } from 'class-validator';
import { ValidationMetadata } from 'class-validator/types/metadata/ValidationMetadata';
import { SWAGGER_METADATA } from './swagger-metadata';
import { ClassRef, DtoDoc, FieldDoc } from './model';
import { SourceIndex } from './source-index';

/**
 * Describes request DTOs from the metadata that ValidationPipe and class-transformer actually use.
 *
 * Validation metadata includes inherited and mapped-type (PartialType, PickType, ...) rules, because those
 * helpers copy the metadata at class creation time. Swagger metadata supplies descriptions and is compared
 * with the effective validation. Properties that only exist in source (no decorator) are reported, because
 * they are accepted by the API without being validated or documented.
 */

interface SwaggerPropertyMetadata {
    type?: unknown;
    required?: boolean;
    description?: string;
    enum?: unknown;
    isArray?: boolean;
    default?: unknown;
    example?: unknown;
    nullable?: boolean;
    readOnly?: boolean;
    format?: string;
}

interface TransformerTypeMetadata {
    typeFunction: () => unknown;
}

interface TransformerExposeMetadata {
    options?: { name?: string };
}

const MAX_DEPTH = 6;

const TRANSLATED_CONSTRAINTS = new Set([
    'isOptional',
    'isDefined',
    'isNotEmpty',
    'isString',
    'isInt',
    'isNumber',
    'isNumberString',
    'isBoolean',
    'isEnum',
    'isIn',
    'isArray',
    'isObject',
    'isEmail',
    'isUrl',
    'isUUID',
    'isIP',
    'isFQDN',
    'isDate',
    'isDateString',
    'isISO8601',
    'minLength',
    'maxLength',
    'isLength',
    'min',
    'max',
    'isPositive',
    'isNegative',
    'arrayNotEmpty',
    'arrayMinSize',
    'arrayMaxSize',
    'arrayUnique',
    'matches',
    'isPort',
    'isNotEmptyObject',
]);

function enumValues(entity: unknown): Array<string | number> {
    if (Array.isArray(entity)) {
        return entity as Array<string | number>;
    }

    if (typeof entity !== 'object' || entity === null) {
        return [];
    }

    const record = entity as Record<string, string | number>;

    // Numeric enums carry a reverse mapping (value -> name); keep the real members only.
    return Object.keys(record)
        .filter((key) => Number.isNaN(Number(key)))
        .map((key) => record[key])
        .filter((value): value is string | number => value !== undefined);
}

function primitiveName(reference: unknown): string | undefined {
    if (reference === String) {
        return 'string';
    }

    if (reference === Number) {
        return 'number';
    }

    if (reference === Boolean) {
        return 'boolean';
    }

    if (reference === Date) {
        return 'string';
    }

    if (typeof reference === 'string') {
        return reference;
    }

    return undefined;
}

function isClassReference(reference: unknown): reference is ClassRef {
    return (
        typeof reference === 'function' &&
        reference !== String &&
        reference !== Number &&
        reference !== Boolean &&
        reference !== Date &&
        reference !== Array &&
        reference !== Object
    );
}

function prototypeChain(cls: ClassRef): ClassRef[] {
    const chain: ClassRef[] = [];
    let current: unknown = cls;

    while (typeof current === 'function' && current !== Function.prototype && current.name !== '') {
        chain.push(current);
        current = Object.getPrototypeOf(current);
    }

    return chain;
}

export class DtoAnalyzer {
    private readonly cache = new Map<ClassRef, DtoDoc>();

    constructor(private readonly sourceIndex?: SourceIndex) {}

    public analyze(cls: ClassRef): DtoDoc {
        const cached = this.cache.get(cls);

        if (cached) {
            return cached;
        }

        const unmapped = new Set<string>();
        const undecorated = new Set<string>();
        const fields = this.describeClass(cls, '', 0, new Set(), unmapped, undecorated);
        const doc: DtoDoc = {
            className: cls.name,
            fields,
            undecoratedProperties: [...undecorated].sort(),
            unmappedConstraints: [...unmapped].sort(),
        };

        this.cache.set(cls, doc);

        return doc;
    }

    /** Wire names of the top-level properties, in declaration order. */
    public propertyNames(cls: ClassRef): string[] {
        return this.orderedProperties(cls);
    }

    private orderedProperties(cls: ClassRef): string[] {
        const prototype = cls.prototype as object;
        const names: string[] = [];
        const add = (name: string) => {
            if (!names.includes(name)) {
                names.push(name);
            }
        };

        // Swagger keeps declaration order, parents first.
        for (const entry of (Reflect.getMetadata(SWAGGER_METADATA.apiModelPropertiesArray, prototype) as
            | string[]
            | undefined) ?? []) {
            add(entry.replace(/^:/, ''));
        }

        for (const metadata of this.validationMetadatas(cls)) {
            add(metadata.propertyName);
        }

        for (const name of this.transformerPropertyNames(cls)) {
            add(name);
        }

        return names;
    }

    private validationMetadatas(cls: ClassRef): ValidationMetadata[] {
        return getMetadataStorage().getTargetValidationMetadatas(cls, '', false, false);
    }

    private transformerPropertyNames(cls: ClassRef): string[] {
        const storage = defaultMetadataStorage as unknown as {
            getExposedProperties(target: ClassRef, transformationType: TransformationType): string[];
            getStrategy(target: ClassRef): string;
        };

        return storage.getExposedProperties(cls, TransformationType.PLAIN_TO_CLASS);
    }

    private sourcePropertyNames(cls: ClassRef): string[] {
        if (!this.sourceIndex) {
            return [];
        }

        return prototypeChain(cls).flatMap(
            (entry) => this.sourceIndex?.findClass(entry.name)?.properties.map((property) => property.name) ?? [],
        );
    }

    private describeClass(
        cls: ClassRef,
        prefix: string,
        depth: number,
        visiting: Set<ClassRef>,
        unmapped: Set<string>,
        undecorated: Set<string>,
    ): FieldDoc[] {
        if (depth > MAX_DEPTH || visiting.has(cls)) {
            return [];
        }

        visiting.add(cls);

        const names = this.orderedProperties(cls);
        const fields: FieldDoc[] = [];
        const instance = this.instantiate(cls);

        for (const sourceName of this.sourcePropertyNames(cls)) {
            if (!names.includes(sourceName)) {
                undecorated.add(`${prefix}${sourceName}`);
            }
        }

        for (const propertyName of names) {
            const field = this.describeProperty(cls, propertyName, prefix, instance, unmapped);

            fields.push(field);

            if (field.nestedClass) {
                const childPrefix = `${prefix}${field.name}${field.isArray ? '[]' : ''}.`;

                fields.push(
                    ...this.describeClass(field.nestedClass, childPrefix, depth + 1, visiting, unmapped, undecorated),
                );
            }
        }

        visiting.delete(cls);

        return fields;
    }

    private instantiate(cls: ClassRef): Record<string, unknown> | undefined {
        try {
            return new (cls as new () => Record<string, unknown>)();
        } catch {
            return undefined;
        }
    }

    private describeProperty(
        cls: ClassRef,
        propertyName: string,
        prefix: string,
        instance: Record<string, unknown> | undefined,
        unmapped: Set<string>,
    ): FieldDoc {
        const prototype = cls.prototype as object;
        const metadatas = this.validationMetadatas(cls).filter((metadata) => metadata.propertyName === propertyName);
        const swagger = Reflect.getMetadata(SWAGGER_METADATA.apiModelProperties, prototype, propertyName) as
            | SwaggerPropertyMetadata
            | undefined;
        const designType = Reflect.getMetadata('design:type', prototype, propertyName) as unknown;
        const typeMetadata = defaultMetadataStorage.findTypeMetadata(cls, propertyName) as
            | TransformerTypeMetadata
            | undefined;
        const exposeMetadata = defaultMetadataStorage.findExposeMetadata(cls, propertyName) as
            | TransformerExposeMetadata
            | undefined;
        const transforms = defaultMetadataStorage.findTransformMetadatas(
            cls,
            propertyName,
            TransformationType.PLAIN_TO_CLASS,
        );
        const transformedType = typeMetadata ? this.safeCall(typeMetadata.typeFunction) : undefined;
        const name = exposeMetadata?.options?.name ?? propertyName;
        const constraints: string[] = [];
        const notes: string[] = [];
        let type: string | undefined;
        let itemType: string | undefined;
        let format: string | undefined;
        let values: Array<string | number> | undefined;
        let isArray = designType === Array || Boolean(swagger?.isArray) || Array.isArray(swagger?.type);
        let optional = false;
        let conditional = false;
        let defined = false;
        let validated = false;

        for (const metadata of metadatas) {
            const constraintName = this.constraintName(metadata);

            if (metadata.type === ValidationTypes.CONDITIONAL_VALIDATION) {
                if (constraintName === 'isOptional') {
                    optional = true;
                } else {
                    conditional = true;
                    constraints.push('validated only when a condition on other fields holds (@ValidateIf)');
                }

                continue;
            }

            if (metadata.type === ValidationTypes.WHITELIST) {
                continue;
            }

            validated = true;

            if (metadata.type === ValidationTypes.IS_DEFINED) {
                defined = true;
                constraints.push('must be defined');
                continue;
            }

            if (metadata.type === ValidationTypes.NESTED_VALIDATION) {
                type = type ?? 'object';
                continue;
            }

            const each = Boolean(metadata.each);

            if (each) {
                isArray = true;
            }
            const args = metadata.constraints ?? [];
            const target = each ? 'each item' : undefined;
            const scoped = (text: string) => (target ? `${target}: ${text}` : text);
            const setType = (value: string) => {
                if (each) {
                    itemType = value;
                } else {
                    type = value;
                }
            };

            if (!TRANSLATED_CONSTRAINTS.has(constraintName)) {
                unmapped.add(constraintName);
                constraints.push(scoped(`custom rule "${constraintName}"`));
                continue;
            }

            switch (constraintName) {
                case 'isNotEmpty':
                    constraints.push(scoped('not empty'));
                    break;
                case 'isString':
                    setType('string');
                    break;
                case 'isInt':
                    setType('integer');
                    break;
                case 'isNumber':
                    setType('number');
                    break;
                case 'isNumberString':
                    setType('string');
                    constraints.push(scoped('numeric string'));
                    break;
                case 'isBoolean':
                    setType('boolean');
                    break;
                case 'isEnum':
                case 'isIn':
                    values = enumValues(args[0]);
                    if (each) {
                        isArray = true;
                        itemType = 'enum';
                    } else {
                        type = 'enum';
                    }
                    break;
                case 'isArray':
                    isArray = true;
                    break;
                case 'isObject':
                case 'isNotEmptyObject':
                    type = type ?? 'object';
                    if (constraintName === 'isNotEmptyObject') {
                        constraints.push(scoped('non-empty object'));
                    }
                    break;
                case 'isEmail':
                    format = 'email';
                    break;
                case 'isUrl':
                    format = 'uri';
                    break;
                case 'isUUID':
                    format = 'uuid';
                    break;
                case 'isIP':
                    format = 'ip address';
                    break;
                case 'isFQDN':
                    format = 'hostname';
                    break;
                case 'isPort':
                    format = 'port';
                    break;
                case 'isDate':
                case 'isDateString':
                case 'isISO8601':
                    format = 'date-time';
                    break;
                case 'minLength':
                    constraints.push(scoped(`min length ${String(args[0])}`));
                    break;
                case 'maxLength':
                    constraints.push(scoped(`max length ${String(args[0])}`));
                    break;
                case 'isLength':
                    constraints.push(scoped(`length ${String(args[0])} to ${String(args[1] ?? 'unbounded')}`));
                    break;
                case 'min':
                    constraints.push(scoped(`minimum ${String(args[0])}`));
                    break;
                case 'max':
                    constraints.push(scoped(`maximum ${String(args[0])}`));
                    break;
                case 'isPositive':
                    constraints.push(scoped('positive'));
                    break;
                case 'isNegative':
                    constraints.push(scoped('negative'));
                    break;
                case 'arrayNotEmpty':
                    isArray = true;
                    constraints.push('at least one item');
                    break;
                case 'arrayMinSize':
                    isArray = true;
                    constraints.push(`at least ${String(args[0])} items`);
                    break;
                case 'arrayMaxSize':
                    isArray = true;
                    constraints.push(`at most ${String(args[0])} items`);
                    break;
                case 'arrayUnique':
                    isArray = true;
                    constraints.push('unique items');
                    break;
                case 'matches':
                    constraints.push(scoped(`pattern ${String(args[0])}`));
                    break;
                default:
                    break;
            }
        }

        const swaggerType: unknown = swagger?.type;
        const swaggerArrayItem: unknown = Array.isArray(swaggerType) ? (swaggerType as unknown[])[0] : undefined;
        const nestedClass = isClassReference(transformedType)
            ? transformedType
            : isClassReference(swaggerType)
              ? swaggerType
              : isClassReference(swaggerArrayItem)
                ? swaggerArrayItem
                : undefined;

        if (transformedType === Date || designType === Date || swagger?.type === Date) {
            format = format ?? 'date-time';
            type = type ?? 'string';
        }

        if (!values && swagger?.enum !== undefined) {
            values = enumValues(swagger.enum);
            type = type ?? (isArray ? type : 'enum');
            if (isArray) {
                itemType = itemType ?? 'enum';
            }
        }

        const swaggerItem: unknown = swaggerArrayItem ?? (swagger?.isArray ? swaggerType : undefined);
        const fallbackPrimitive =
            primitiveName(transformedType) ??
            (isArray ? undefined : primitiveName(swagger?.type)) ??
            primitiveName(designType === Array ? undefined : designType);

        if (nestedClass) {
            if (isArray) {
                itemType = 'object';
            } else {
                type = 'object';
            }
        }

        if (isArray) {
            itemType = itemType ?? primitiveName(swaggerItem) ?? primitiveName(transformedType) ?? 'unknown';
            type = `array<${itemType === 'integer' || itemType === 'number' || itemType === 'string' || itemType === 'boolean' || itemType === 'object' || itemType === 'enum' ? itemType : 'unknown'}>`;
        } else {
            type = type ?? fallbackPrimitive ?? (designType === Object ? 'object' : 'unknown');
        }

        const defaultValue = instance?.[propertyName];
        const hasDefault = defaultValue !== undefined;

        if (transforms.length > 0) {
            notes.push('Normalised by a @Transform rule before validation.');
        }

        if (!validated) {
            notes.push(
                optional
                    ? 'Only @IsOptional: the value is not otherwise validated.'
                    : 'Not validated: no class-validator rule on this property.',
            );
        }

        let required: FieldDoc['required'];

        if (conditional) {
            required = 'conditional';
        } else if (optional || (!validated && !defined)) {
            required = 'optional';
        } else if (hasDefault && !defined) {
            required = 'optional';
            notes.push('Defaults to the value shown when omitted (the DTO initialiser runs during transformation).');
        } else {
            required = 'required';
        }

        if (swagger?.required !== undefined && swagger.required !== (required === 'required')) {
            notes.push(
                `Swagger declares required: ${String(swagger.required)}; effective validation makes it ${required}.`,
            );
        }

        if (swagger?.nullable && !optional) {
            notes.push('Swagger declares nullable, but validation rejects null.');
        }

        if (!swagger && (validated || optional)) {
            notes.push('Swagger: property not documented (no @ApiProperty).');
        }

        return {
            path: `${prefix}${name}`,
            name,
            ownerClass: cls.name,
            type,
            required,
            acceptsNull: optional,
            defaultValue: hasDefault ? defaultValue : undefined,
            enumValues: values,
            format,
            constraints: [...new Set(constraints)],
            description: swagger?.description,
            swaggerRequired: swagger?.required,
            readOnly: swagger?.readOnly,
            nestedClass,
            isArray,
            hasTransform: transforms.length > 0,
            notes,
        };
    }

    private constraintName(metadata: ValidationMetadata): string {
        if (metadata.name) {
            return metadata.name;
        }

        if (metadata.type === ValidationTypes.CUSTOM_VALIDATION && metadata.constraintCls) {
            const constraints = getMetadataStorage().getTargetValidatorConstraints(metadata.constraintCls);

            return constraints[0]?.name ?? metadata.constraintCls.name;
        }

        return metadata.type;
    }

    private safeCall(factory: () => unknown): unknown {
        try {
            return factory();
        } catch {
            return undefined;
        }
    }
}
