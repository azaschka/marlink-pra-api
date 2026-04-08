import { PasswordGeneratorUtility } from './password-generator.utility';

describe('PasswordGeneratorUtility', () => {
    it('should throw an error if password length is less than 8', () => {
        expect(() => PasswordGeneratorUtility.generate(7)).toThrow('Password length must be at least 14 characters');
    });

    it('should generate a password with at least 14 characters', () => {
        const password = PasswordGeneratorUtility.generate(14);
        expect(password.length).toBeGreaterThanOrEqual(14);
    });

    it('should generate a password with all required character types', () => {
        const password = PasswordGeneratorUtility.generate(14);
        expect(/[a-z]/.test(password)).toBeTruthy(); // at least one lowercase
        expect(/[A-Z]/.test(password)).toBeTruthy(); // at least one uppercase
        expect(/[0-9]/.test(password)).toBeTruthy(); // at least one digit
        expect(/[!$%^&*()_+|~\-=`{}[\]:";'<>?,/.]/.test(password)).toBeTruthy(); // at least one special
    });

    it('should generate different passwords for consecutive calls', () => {
        const pwd1 = PasswordGeneratorUtility.generate(14);
        const pwd2 = PasswordGeneratorUtility.generate(14);
        expect(pwd1).not.toEqual(pwd2);
    });

    it('should work with longer passwords (e.g., 20 characters)', () => {
        const password = PasswordGeneratorUtility.generate(20);
        expect(password.length).toBe(20);
        expect(/[a-z]/.test(password)).toBeTruthy();
        expect(/[A-Z]/.test(password)).toBeTruthy();
        expect(/[0-9]/.test(password)).toBeTruthy();
        expect(/[!$%^&*()_+|~\-=`{}[\]:";'<>?,/.]/.test(password)).toBeTruthy();
    });
});
