import { ApiProperty } from '@nestjs/swagger';
import { LogRetrievedDtoOutput } from './log-retrieved.dto-output';

export class LogsRetrievedDtoOutput {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The total number of all logs.',
    })
    public totalCount!: number;

    @ApiProperty({
        required: true,
        type: [LogRetrievedDtoOutput],
        description: 'The logs retrieved.',
    })
    public logs!: LogRetrievedDtoOutput[];
}
