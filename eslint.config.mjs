// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            ecmaVersion: 5,
            sourceType: 'module',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            // This would brings unjustified complexity to logging
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/naming-convention': [
                'error',
                // Interface should not be prefixed with an I
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: false,
                    },
                },
                // No underscore prefix (see Confluence for motivated exceptions)
                {
                    selector: 'memberLike',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'forbid',
                },
                // static readonly (constant variables) should be upper case
                {
                    selector: 'memberLike',
                    modifiers: ['static', 'readonly'],
                    format: ['UPPER_CASE'],
                    leadingUnderscore: 'forbid',
                },
            ],
            // Prevent future unintentional reassignment when possible
            '@typescript-eslint/prefer-readonly': 'error',
            // Static method can, by definition, be referenced without being bound to an instance
            '@typescript-eslint/unbound-method': [
                'error',
                {
                    ignoreStatic: true,
                },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'explicit',
                    overrides: {
                        accessors: 'explicit',
                        constructors: 'no-public',
                        methods: 'explicit',
                        properties: 'explicit',
                        parameterProperties: 'explicit',
                    },
                },
            ],
        },
    },
);
