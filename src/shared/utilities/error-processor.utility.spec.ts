import { ErrorProcessorUtility } from './error-processor.utility';

describe('ErrorProcessorUtility', () => {
    describe('stringify', () => {
        describe('not an error type', () => {
            it.each([
                {
                    input: 'An error occurred',
                    expectedOutput: '"An error occurred"',
                },
                {
                    input: { obj: 1, obj2: 'test' },
                    expectedOutput: '{"obj":1,"obj2":"test"}',
                },
            ])('should return as expected', ({ input, expectedOutput }) => {
                const result = ErrorProcessorUtility.stringify(input);

                expect(result).toEqual(expectedOutput);
            });
        });

        describe('error type', () => {
            it.each([
                {
                    input: new Error('An error occurred'),
                    expectedOutput: 'Error: An error occurred',
                },
                {
                    input: new Error('An error occurred', { cause: 'test' }),
                    expectedOutput: 'Error: An error occurred',
                },
                {
                    input: new TypeError('An error occurred'),
                    expectedOutput: 'TypeError: An error occurred',
                },
            ])('should return as expected', ({ input, expectedOutput }) => {
                const result = ErrorProcessorUtility.stringify(input);

                expect(result).toEqual(expect.stringContaining(expectedOutput));
            });
        });
    });
});
