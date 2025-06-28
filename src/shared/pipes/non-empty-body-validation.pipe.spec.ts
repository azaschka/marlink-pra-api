import { BadRequestException } from '@nestjs/common';
import { NonEmptyBodyPipe } from './non-empty-body-validation.pipe';

describe('NonEmptyBodyPipe', () => {
    let pipe: NonEmptyBodyPipe;

    beforeEach(() => {
        pipe = new NonEmptyBodyPipe();
    });

    it.each([
        { foo: 'bar' },
        { foo: null },
        [{ foo: 'bar' }],
        { a: undefined, b: 1 },
        [{ a: undefined, b: 1 }],
        { a: undefined, b: { c: { d: undefined } } },
        [1, 2, 3],
        [[1, 2, 3]],
        ['hello'],
        // A comment for new line formatting
    ])('should return the value if valid: %p', (input) => {
        const result = pipe.transform(input);
        expect(result).toBe(input);
    });

    it.each([
        null,
        undefined,
        {},
        { a: undefined, b: undefined },
        // A comment for new line formatting
    ])('should throw BadRequestException for invalid value: %p', (input) => {
        expect(() => pipe.transform(input)).toThrow(BadRequestException);
    });
});
