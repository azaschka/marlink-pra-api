import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { NameSanitizerUtility } from '../utilities';

const NORMALIZATION_DESCRIPTION =
    'The value is normalized to the canonical form: whitespace and hyphens become underscores, ' +
    'special characters are mapped or removed, only A-Z, 0-9 and _ remain, and the result is UPPERCASE. ' +
    'A tag that is empty after normalization is rejected.';

const REQUIRED_DESCRIPTION = `Mandatory. ${NORMALIZATION_DESCRIPTION}`;
const OPTIONAL_DESCRIPTION = `Optional. If omitted, the existing tag is left unchanged. If provided, it must not be empty. ${NORMALIZATION_DESCRIPTION}`;

export interface AssetTagOptions {
    /** Describes what the tag belongs to. The normalization rule is appended automatically. */
    description?: string;
    /**
     * `true` (default) for create requests: the tag must be provided.
     * `false` for modify (PATCH) requests: the tag may be omitted to leave it unchanged, but if it is sent
     * (including `null`) it must not be empty after normalization, so an update can never blank the tag.
     */
    required?: boolean;
}

/**
 * Single definition of the asset tag input rule (Jump Items, Jump Clients, Jump Client Installers).
 * Must be used on every input DTO that carries a tag, for create as well as modify requests.
 *
 * The transform runs before validation, so the emptiness check is applied to the canonical value.
 * Input such as "   " or "###" therefore ends up as "" and is rejected instead of being forwarded to BeyondTrust.
 * Non-string values are left untouched by the transform and are rejected by `@IsString()`.
 *
 * Requires `ValidationPipe({ transform: true })` on the controller.
 * Regression guard: `src/shared/utilities/tag-dto-normalization.spec.ts`.
 */
export function AssetTag(options: AssetTagOptions = {}): PropertyDecorator {
    const required = options.required ?? true;
    const subject = options.description ?? 'The tag of the asset.';
    const rule = required ? REQUIRED_DESCRIPTION : OPTIONAL_DESCRIPTION;

    return applyDecorators(
        ApiProperty({ required, type: String, description: `${subject} ${rule}`, example: 'ACME_SITE_01' }),
        Transform(({ value }) => NameSanitizerUtility.sanitizeTag(value)),
        // Only an omitted property skips validation. null, '' and other values are still validated.
        ...(required ? [] : [ValidateIf((_object: unknown, value: unknown) => value !== undefined)]),
        IsNotEmpty({ message: 'tag must contain at least one letter, digit or underscore after normalization' }),
        IsString(),
    );
}
