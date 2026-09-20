import { NameSanitizerUtility } from './name-sanitizer.utility';

describe('NameSanitizerUtility', () => {
    describe('sanitizeName', () => {
        it('should replace hyphens with underscores', () => {
            expect(NameSanitizerUtility.sanitizeName('XC-OT')).toBe('XC_OT');
        });

        it('should replace spaces with underscores', () => {
            expect(NameSanitizerUtility.sanitizeName('UR 27')).toBe('UR_27');
        });

        it('should replace both hyphens and spaces with underscores', () => {
            expect(NameSanitizerUtility.sanitizeName('UR 27 XC-OT')).toBe('UR_27_XC_OT');
        });

        it('should convert to uppercase', () => {
            expect(NameSanitizerUtility.sanitizeName('vessel')).toBe('VESSEL');
        });

        it('should trim leading and trailing whitespace', () => {
            expect(NameSanitizerUtility.sanitizeName('  VESSEL  ')).toBe('VESSEL');
        });

        it('should map German umlauts correctly', () => {
            expect(NameSanitizerUtility.sanitizeName('Düsseldorf')).toBe('DUESSELDORF');
            expect(NameSanitizerUtility.sanitizeName('Österreich')).toBe('OESTERREICH');
            expect(NameSanitizerUtility.sanitizeName('Übersee')).toBe('UEBERSEE');
            expect(NameSanitizerUtility.sanitizeName('straße')).toBe('STRASSE');
        });

        it('should map French accented characters correctly', () => {
            expect(NameSanitizerUtility.sanitizeName('Côte')).toBe('COTE');
            expect(NameSanitizerUtility.sanitizeName('élève')).toBe('ELEVE');
        });

        it('should handle mixed hyphens, spaces, umlauts and special chars', () => {
            // Apostrophe is removed (not replaced), hyphen → _, ô → o
            expect(NameSanitizerUtility.sanitizeName("Côte-d'Ivoire")).toBe('COTE_DIVOIRE');
        });

        it('should remove characters not in [a-zA-Z0-9_] after mapping', () => {
            expect(NameSanitizerUtility.sanitizeName('VESSEL@123!')).toBe('VESSEL123');
        });

        it('should produce the correct Jumpoint-compatible name for a real example', () => {
            // Site ingestion case from JIRA: customer "UR27", site "XC-OT"
            expect(NameSanitizerUtility.sanitizeName('XC-OT')).toBe('XC_OT');
        });

        it('should handle already clean input without modification', () => {
            expect(NameSanitizerUtility.sanitizeName('VESSEL_NAME_123')).toBe('VESSEL_NAME_123');
        });

        it('should handle empty string', () => {
            expect(NameSanitizerUtility.sanitizeName('')).toBe('');
        });
    });

    describe('sanitizeKey', () => {
        it('should remove hyphens (not replace with underscore)', () => {
            expect(NameSanitizerUtility.sanitizeKey('XC-OT')).toBe('XCOT');
        });

        it('should remove spaces (not replace with underscore)', () => {
            expect(NameSanitizerUtility.sanitizeKey('UR 27')).toBe('UR27');
        });

        it('should map German umlauts correctly', () => {
            expect(NameSanitizerUtility.sanitizeKey('ür')).toBe('uer');
        });

        it('should preserve underscores', () => {
            expect(NameSanitizerUtility.sanitizeKey('SITE_KEY_01')).toBe('SITE_KEY_01');
        });

        it('should trim leading and trailing whitespace', () => {
            expect(NameSanitizerUtility.sanitizeKey('  KEY  ')).toBe('KEY');
        });

        it('should remove special characters', () => {
            expect(NameSanitizerUtility.sanitizeKey('KEY@123!')).toBe('KEY123');
        });

        it('should handle already clean input without modification', () => {
            expect(NameSanitizerUtility.sanitizeKey('SITE_01')).toBe('SITE_01');
        });

        it('should handle empty string', () => {
            expect(NameSanitizerUtility.sanitizeKey('')).toBe('');
        });
    });

    describe('sanitizeTag', () => {
        it('should convert to uppercase', () => {
            expect(NameSanitizerUtility.sanitizeTag('acme_site')).toBe('ACME_SITE');
        });

        it('should replace whitespace runs with a single underscore', () => {
            expect(NameSanitizerUtility.sanitizeTag('acme   site\tone')).toBe('ACME_SITE_ONE');
        });

        it('should replace hyphens with underscores', () => {
            expect(NameSanitizerUtility.sanitizeTag('acme-site')).toBe('ACME_SITE');
        });

        it('should map special characters and remove the remaining ones', () => {
            expect(NameSanitizerUtility.sanitizeTag('Düsseldorf @ Hafen!')).toBe('DUESSELDORF__HAFEN');
        });

        it('should trim leading and trailing whitespace', () => {
            expect(NameSanitizerUtility.sanitizeTag('  acme  ')).toBe('ACME');
        });

        it('should be idempotent', () => {
            const once = NameSanitizerUtility.sanitizeTag('Acme Site-01') as string;
            expect(NameSanitizerUtility.sanitizeTag(once)).toBe(once);
            expect(once).toBe('ACME_SITE_01');
        });

        it('should keep an empty string empty', () => {
            expect(NameSanitizerUtility.sanitizeTag('')).toBe('');
        });

        it('should return non-string values untouched', () => {
            expect(NameSanitizerUtility.sanitizeTag(undefined)).toBeUndefined();
            expect(NameSanitizerUtility.sanitizeTag(null)).toBeNull();
            expect(NameSanitizerUtility.sanitizeTag(42)).toBe(42);
        });
    });
});
