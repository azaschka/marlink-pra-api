import { v4 as uuidv4 } from 'uuid';

export abstract class UuidUtility {
    public static generate(): string {
        return uuidv4();
    }
}
