import { UrlUtility } from './url.utility';

describe('UrlUtility', () => {
    describe('join', () => {
        it.each(['http://url.com', 'http://url.com/'])('should join multiple paths correctly', (baseUrl: string) => {
            const result = UrlUtility.join(baseUrl, 'path1', 'path2', 'path3');
            expect(result).toBe('http://url.com/path1/path2/path3');
        });

        it.each(['http://url.com', 'http://url.com/'])(
            'should handle paths leading and trailing slashes',
            (baseUrl: string) => {
                const result = UrlUtility.join(baseUrl, '/path1', 'path2/', '/path3/');
                expect(result).toBe('http://url.com/path1/path2/path3');
            },
        );

        it.each(['http://url.com', 'http://url.com/'])('should remove duplicate slashes', (baseUrl: string) => {
            const result = UrlUtility.join(baseUrl, 'path1//', 'path2///', 'path3');
            expect(result).toBe('http://url.com/path1/path2/path3');
        });

        it.each(['http://url.com', 'http://url.com/'])('should handle empty path', (baseUrl: string) => {
            const result = UrlUtility.join(baseUrl, 'path1', '', 'path3');
            expect(result).toBe('http://url.com/path1/path3');
        });
    });
});
