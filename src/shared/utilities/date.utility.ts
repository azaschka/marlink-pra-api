export abstract class DateUtility {
    public static addSeconds(date: Date, seconds: number): Date {
        const newDate = new Date(date);
        newDate.setSeconds(newDate.getSeconds() + seconds);

        return newDate;
    }

    public static getCurrentUtcDate(): Date {
        return new Date(new Date().toISOString());
    }
}
