import { DateUtility } from './date.utility';

describe('DateUtility', () => {
    let currentDate: Date;

    beforeEach(() => {
        currentDate = new Date('2025-10-01T00:00:00Z');
    });

    describe('addSeconds', () => {
        it.each([
            {
                seconds: -3600,
                expectedDate: new Date('2025-09-30T23:00:00Z'),
            },
            {
                seconds: 0,
                expectedDate: new Date('2025-10-01T00:00:00Z'),
            },
            {
                seconds: 3600,
                expectedDate: new Date('2025-10-01T01:00:00Z'),
            },
        ])('should return as expected', (param: { seconds: number; expectedDate: Date }) => {
            const result = DateUtility.addSeconds(currentDate, param.seconds);

            expect(result).toEqual(param.expectedDate);
        });
    });

    describe('getCurrentUtcDate', () => {
        it('should return as expected)', () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-10-01T07:00:00+07:00').getTime());

            const result = DateUtility.getCurrentUtcDate();

            expect(result.toISOString()).toEqual('2025-10-01T00:00:00.000Z');
        });
    });
});
