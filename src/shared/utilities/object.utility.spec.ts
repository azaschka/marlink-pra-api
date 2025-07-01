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

    describe('stripProperties', () => {
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
                stripProperties: ['b' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, c: 'test-1', d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2' },
                stripProperties: ['c' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, b: 2, d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, c: 'test-1' },
                stripProperties: ['b' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, c: 'test-1' }, // No change since b is not present
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } },
                stripProperties: ['e' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2' },
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } },
                stripProperties: ['g' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } }, // No change since g is not a direct property of the input object
            },
            {
                input: <TestClass>{ a: 1, b: 2, c: 'test-1', d: 'test-2', e: { f: 'test-3', g: 4 } },
                stripProperties: ['b' as keyof TestClass, 'e' as keyof TestClass],
                expectedOutput: <TestClass>{ a: 1, c: 'test-1', d: 'test-2' },
            },
        ])(
            'should return $expected when stripping property $stripProperties from $input',
            ({ input, stripProperties, expectedOutput }) => {
                const result = ObjectUtility.stripProperties(input, ...stripProperties);
                expect(result).toEqual(expectedOutput);
            },
        );
    });
});
