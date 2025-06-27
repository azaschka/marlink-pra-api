import { ObjectUtility } from './object.utility';

describe('ObjectUtility', () => {
    describe('contain', () => {
        it.each([
            {
                source: [1, 2, 3],
                target: [2, 3, 4],
                expected: true,
            },
            {
                source: [1, 2, 3],
                target: [4, 5, 6],
                expected: false,
            },
            {
                source: [],
                target: [1, 2, 3],
                expected: false,
            },
            {
                source: [1, 2, 3],
                target: [],
                expected: false,
            },
            {
                source: [],
                target: [],
                expected: false,
            },
        ])('should return $expected when source is $source and target is $target', ({ source, target, expected }) => {
            const result = ObjectUtility.contain(source, target);
            expect(result).toBe(expected);
        });
    });

    describe('stripProperty', () => {
        interface TestClass {
            a: number;
            b?: number;
            c: string;
            d?: string;
            e: {
                f: string;
                g?: number;
            };
        }

        it.each([
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2' },
                stripProperty: 'b' as keyof TestClass,
                expectedOutput: <TestClass>{ a: 1, c: 'test-1', d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2' },
                stripProperty: 'c' as keyof TestClass,
                expectedOutput: <TestClass>{ a: 1, b: 2, d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, c: 'test-1' },
                stripProperty: 'b' as keyof TestClass,
                expectedOutput: <TestClass>{ a: 1, c: 'test-1' }, // No change since b is not present
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } },
                stripProperty: 'e' as keyof TestClass,
                expectedOutput: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } },
                stripProperty: 'g' as keyof TestClass,
                expectedOutput: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } }, // No change since g is not a direct property of the input object
            },
        ])(
            'should return $expected when stripping property $stripProperty from $input',
            ({ input, stripProperty, expectedOutput }) => {
                const result = ObjectUtility.stripProperty(input, stripProperty);
                expect(result).toEqual(expectedOutput);
            },
        );
    });
});
