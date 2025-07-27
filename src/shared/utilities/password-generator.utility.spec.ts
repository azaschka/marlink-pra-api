import { PasswordGenerator } from './password-generator.utility';

describe('PasswordGenerator', () => {
    it('should throw an error if password length is less than 8', () => {
        expect(() => PasswordGenerator.generate(7)).toThrowError('Password length must be at least 8 characters');
    });

    it('should generate a password with at least 8 characters', () => {
        const password = PasswordGenerator.generate(8);
        expect(password.length).toBeGreaterThanOrEqual(8);
    });

    it('should generate a password with all required character types', () => {
        const password = PasswordGenerator.generate(12);
        expect(/[a-z]/.test(password)).toBeTruthy(); // at least one lowercase
        expect(/[A-Z]/.test(password)).toBeTruthy(); // at least one uppercase
        expect(/[0-9]/.test(password)).toBeTruthy(); // at least one digit
        expect(/[!$%^&*()_+|~\-=`{}[\]:";'<>?,/.]/.test(password)).toBeTruthy(); // at least one special
    });

    it('should generate different passwords for consecutive calls', () => {
        const pwd1 = PasswordGenerator.generate(12);
        const pwd2 = PasswordGenerator.generate(12);
        expect(pwd1).not.toEqual(pwd2);
    });

    it('should work with longer passwords (e.g., 20 characters)', () => {
        const password = PasswordGenerator.generate(20);
        expect(password.length).toBe(20);
        expect(/[a-z]/.test(password)).toBeTruthy();
        expect(/[A-Z]/.test(password)).toBeTruthy();
        expect(/[0-9]/.test(password)).toBeTruthy();
        expect(/[!$%^&*()_+|~\-=`{}[\]:";'<>?,/.]/.test(password)).toBeTruthy();
    });
});
