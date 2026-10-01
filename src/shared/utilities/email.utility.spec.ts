import { EmailUtility } from './email.utility';

describe('EmailUtility', () => {
    describe('merge', () => {
        it('should add and remove case-insensitively and keep the spelling of existing entries', () => {
            expect(
                EmailUtility.merge(
                    ['Manager@Example.com', 'old@example.com'],
                    ['manager@example.com', 'new@example.com'],
                    ['OLD@example.com'],
                ),
            ).toEqual(['Manager@Example.com', 'new@example.com']);
        });

        it('should not add an address that is removed in the same call', () => {
            expect(EmailUtility.merge([], ['a@example.com'], ['A@example.com'])).toEqual([]);
        });
    });

    describe('haveSameMembers', () => {
        it('should ignore case and order', () => {
            expect(EmailUtility.haveSameMembers(['A@x.test', 'b@x.test'], ['B@x.test', 'a@x.test'])).toBe(true);
            expect(EmailUtility.haveSameMembers(['a@x.test'], ['a@x.test', 'b@x.test'])).toBe(false);
        });
    });
});
