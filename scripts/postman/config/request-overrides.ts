/* eslint-disable @typescript-eslint/naming-convention -- object keys are HTTP routes and DTO property paths */
import { JumpClientInstallerPlatformType } from '../../../src/jump-client/enums/jump-client-installer-platform-type.enum';

/**
 * Per-operation additions that code cannot express: example bodies for constraints the generic example
 * builder cannot satisfy, query values with a business meaning, and documentation of handler behaviour.
 *
 * Keys are `METHOD /path` exactly as listed in postman/reports/coverage-manifest.json. The generator fails
 * on keys that do not match a registered route, and validates every example body against the route's pipes.
 * Use synthetic data only (example.com, TEST-NET addresses, placeholder secrets).
 */

export interface RequestOverride {
    /** Markdown appended to the generated request description. */
    description?: string;
    /** Replaces the generated minimal body. */
    minimalBody?: Record<string, unknown>;
    /** Replaces the generated full example body. */
    fullBody?: Record<string, unknown>;
    /** Field used as the single-field minimum when a PATCH body must not be empty. */
    minimalPatchField?: string;
    /** Example values for query parameters (strings, as sent on the wire). */
    queryValues?: Record<string, string>;
    /** Literal example values for path parameters that are not resource ids (for example enum members). */
    pathValues?: Record<string, string>;
    /** Enum object of a path parameter that Swagger does not describe (values are read from code). */
    pathEnums?: Record<string, object>;
}

export const REQUEST_OVERRIDES: Record<string, RequestOverride> = {
    'GET /jump-clients/installers/:installerId/platforms/:platformType': {
        pathEnums: { platformType: JumpClientInstallerPlatformType },
        pathValues: { platformType: JumpClientInstallerPlatformType.Windows64Msi },
    },
    'POST /maintenance/reset-data': {
        minimalBody: { dryRun: true },
        fullBody: { dryRun: true, confirm: 'replace-with-confirmation-phrase' },
        description:
            'Destructive: with `dryRun: false` and the confirmation phrase the handler expects in `confirm` (`RESET-DATA`, checked in code), the reset truncates the platform data and deletes backup files. The examples keep `dryRun: true`, which only returns the preview. Use it only on non-production environments.',
    },
};

/**
 * Example values for single DTO properties, keyed by `<DtoClass>.<property>`. They apply wherever the class
 * is used (also nested) and are validated together with the generated bodies.
 */
export const FIELD_EXAMPLES: Record<string, unknown> = {
    'JumpointIpRangeDtoInput.start': '192.0.2.1',
    'JumpointIpRangeDtoInput.end': '192.0.2.254',
    'CreateProtocolTunnelJumpDtoInput.tunnelListenAddress': '127.0.0.1',
    'ModifyProtocolTunnelJumpDtoInput.tunnelListenAddress': '127.0.0.1',
};
