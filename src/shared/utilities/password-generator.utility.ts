export class PasswordGenerator {
    private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
    private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    private static readonly NUMBERS = '0123456789';
    private static readonly SPECIALS = '!$%^&*()_+|~-=`{}[]:";\'<>?,/.';

    /**
     * Generate a secure password with at least one character from each category:
     * lowercase, uppercase, numbers, and specials.
     * @param length The desired length of the password (minimum 8 characters).
     * @throws Error if the length is less than 8.
     * @returns A randomly generated password string.
     * @example
     * PasswordGenerator.generate(16); // Generates a 16-character password
     * PasswordGenerator.generate(); // Generates a default 12-character password
     */
    public static generate(length: number = 12): string {
        if (length < 8) {
            throw new Error('Password length must be at least 8 characters');
        }

        const getRandom = (charset: string) => charset[Math.floor(Math.random() * charset.length)];

        // Ensure at least one character from each category is included
        const required = [
            getRandom(this.LOWERCASE),
            getRandom(this.UPPERCASE),
            getRandom(this.NUMBERS),
            getRandom(this.SPECIALS),
        ];

        // Fill the rest of the password length with random characters
        const allChars = this.LOWERCASE + this.UPPERCASE + this.NUMBERS + this.SPECIALS;
        const remaining = Array.from({ length: length - required.length }, () => getRandom(allChars));

        // Shuffle the final password array to ensure randomness
        const passwordArray = [...required, ...remaining];
        for (let i = passwordArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
        }

        return passwordArray.join('');
    }
}
