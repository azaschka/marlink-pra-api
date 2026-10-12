/**
 * Metadata keys written by @nestjs/swagger decorators.
 *
 * The package does not export its constants module (`exports` map), so the keys are repeated here. A unit
 * test applies the real decorators and fails when a key changes in a future @nestjs/swagger release.
 */
export const SWAGGER_METADATA = {
    apiOperation: 'swagger/apiOperation',
    apiResponse: 'swagger/apiResponse',
    apiParameters: 'swagger/apiParameters',
    apiHeaders: 'swagger/apiHeaders',
    apiModelProperties: 'swagger/apiModelProperties',
    apiModelPropertiesArray: 'swagger/apiModelPropertiesArray',
    apiExcludeEndpoint: 'swagger/apiExcludeEndpoint',
    apiExcludeController: 'swagger/apiExcludeController',
} as const;
