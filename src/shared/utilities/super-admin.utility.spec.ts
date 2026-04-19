import { SuperAdminUtility } from './super-admin.utility';

describe('SuperAdminUtility', () => {
    describe('isSuperAdmin', () => {
        it.each([
            {
                description: 'all 5 business units',
                businessUnits: ['MT', 'OA', 'MC', 'EG', 'TE'],
                expected: true,
            },
            {
                description: 'all 5 business units in a different order',
                businessUnits: ['TE', 'EG', 'MC', 'OA', 'MT'],
                expected: true,
            },
            {
                description: 'all 5 business units plus an extra one',
                businessUnits: ['MT', 'OA', 'MC', 'EG', 'TE', 'XX'],
                expected: true,
            },
            {
                description: 'only 4 of 5 business units',
                businessUnits: ['MT', 'OA', 'MC', 'EG'],
                expected: false,
            },
            {
                description: 'a single business unit',
                businessUnits: ['MT'],
                expected: false,
            },
            {
                description: 'an empty array',
                businessUnits: [],
                expected: false,
            },
        ])('should return $expected for $description', ({ businessUnits, expected }) => {
            const result = SuperAdminUtility.isSuperAdmin(businessUnits);
            expect(result).toBe(expected);
        });
    });
});
