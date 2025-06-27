import { UuidUtility } from './uuid.utility';

// Mocking the uuid library
jest.mock('uuid', () => ({ v4: () => '123456789' }));

describe('UuidUtility', () => {
    describe('generate', () => {
        it('should generate a value from uuidv4', () => {
            const value = UuidUtility.generate();

            expect(value).toBe('123456789');
        });
    });
});
