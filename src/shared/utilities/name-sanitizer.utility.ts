const SPECIAL_CHAR_MAP: { [key: string]: string } = {
    // German (Umlauts, ß)
    '\u00e4': 'ae', // ä
    '\u00c4': 'Ae', // Ä
    '\u00f6': 'oe', // ö
    '\u00d6': 'Oe', // Ö
    '\u00fc': 'ue', // ü
    '\u00dc': 'Ue', // Ü
    '\u00df': 'ss', // ß

    // French/Italian/Spanish/Scandinavian etc.
    '\u00e0': 'a', // à
    '\u00e1': 'a', // á
    '\u00e2': 'a', // â
    '\u00e3': 'a', // ã
    '\u00e5': 'a', // å
    '\u00e6': 'ae', // æ
    '\u0105': 'a', // ą

    '\u00e7': 'c', // ç
    '\u0107': 'c', // ć
    '\u010d': 'c', // č

    '\u00e8': 'e', // è
    '\u00e9': 'e', // é
    '\u00ea': 'e', // ê
    '\u00eb': 'e', // ë
    '\u0119': 'e', // ę
    '\u011b': 'e', // ě

    '\u00ec': 'i', // ì
    '\u00ed': 'i', // í
    '\u00ee': 'i', // î
    '\u00ef': 'i', // ï
    '\u0131': 'i', // ı

    '\u0142': 'l', // ł

    '\u00f1': 'n', // ñ
    '\u0144': 'n', // ń

    '\u00f2': 'o', // ò
    '\u00f3': 'o', // ó
    '\u00f4': 'o', // ô
    '\u00f5': 'o', // õ
    '\u00f8': 'o', // ø
    '\u0153': 'oe', // œ

    '\u015b': 's', // ś
    '\u0161': 's', // š

    '\u00fa': 'u', // ú
    '\u00fb': 'u', // û
    '\u00f9': 'u', // ù
    '\u016f': 'u', // ů
    '\u0171': 'u', // ű

    '\u00fd': 'y', // ý
    '\u00ff': 'y', // ÿ

    '\u017a': 'z', // ź
    '\u017c': 'z', // ż
    '\u017e': 'z', // ž

    // Uppercase variants
    '\u00c0': 'A', // À
    '\u00c1': 'A', // Á
    '\u00c2': 'A', // Â
    '\u00c3': 'A', // Ã
    '\u00c5': 'A', // Å
    '\u00c6': 'Ae', // Æ
    '\u0104': 'A', // Ą

    '\u00c7': 'C', // Ç
    '\u0106': 'C', // Ć
    '\u010c': 'C', // Č

    '\u00c8': 'E', // È
    '\u00c9': 'E', // É
    '\u00ca': 'E', // Ê
    '\u00cb': 'E', // Ë
    '\u0118': 'E', // Ę
    '\u011a': 'E', // Ě

    '\u00cc': 'I', // Ì
    '\u00cd': 'I', // Í
    '\u00ce': 'I', // Î
    '\u00cf': 'I', // Ï
    '\u0130': 'I', // İ

    '\u0141': 'L', // Ł

    '\u00d1': 'N', // Ñ
    '\u0143': 'N', // Ń

    '\u00d2': 'O', // Ò
    '\u00d3': 'O', // Ó
    '\u00d4': 'O', // Ô
    '\u00d5': 'O', // Õ
    '\u00d8': 'O', // Ø
    '\u0152': 'Oe', // Œ

    '\u015a': 'S', // Ś
    '\u0160': 'S', // Š

    '\u00da': 'U', // Ú
    '\u00db': 'U', // Û
    '\u00d9': 'U', // Ù
    '\u016e': 'U', // Ů
    '\u0170': 'U', // Ű

    '\u00dd': 'Y', // Ý

    '\u0179': 'Z', // Ź
    '\u017b': 'Z', // Ż
    '\u017d': 'Z', // Ž
};

function applySpecialCharMap(value: string): string {
    return value
        .split('')
        .map((char) => SPECIAL_CHAR_MAP[char] ?? char)
        .join('');
}

export abstract class NameSanitizerUtility {
    /**
     * Sanitizes a name for use in BeyondTrust-compatible identifiers.
     * Trim -> spaces -> _ -> hyphens -> _ -> SPECIAL_CHAR_MAP -> remove non-[a-zA-Z0-9_] -> UPPERCASE
     */
    public static sanitizeName(value: unknown): string {
        if (typeof value !== 'string') return '';
        return applySpecialCharMap(value.trim().replace(/ /g, '_').replace(/-/g, '_'))
            .replace(/[^a-zA-Z0-9_]/g, '')
            .toUpperCase();
    }

    /**
     * Sanitizes a key for use as a unique identifier.
     * Trim -> SPECIAL_CHAR_MAP -> remove non-[a-zA-Z0-9_]
     * Note: spaces and hyphens are removed (not replaced) to preserve key uniqueness semantics.
     */
    public static sanitizeKey(value: unknown): string {
        if (typeof value !== 'string') return '';
        return applySpecialCharMap(value.trim()).replace(/[^a-zA-Z0-9_]/g, '');
    }
}
