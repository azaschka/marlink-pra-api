import { ApiProperty } from '@nestjs/swagger';
import { LogActionType } from '../../enums';
import { Log } from '../../models';

export class LogRetrievedDtoOutput implements Log {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of this resource.',
    })
    public id!: number;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the service that generated this log entry.',
    })
    public serviceName!: string;

    @ApiProperty({
        required: true,
        enum: LogActionType,
        description: 'The type of the action that resulted in this log entry.',
    })
    public actionType!: LogActionType;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The name of the action.',
    })
    public actionName!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The unique identifier for the transaction.',
    })
    public transactionId!: string;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The user who triggered the action.',
    })
    public triggeredBy?: string;

    @ApiProperty({
        required: true,
        type: Date,
        description: 'The date when the log entry was created.',
    })
    public creationDate!: Date;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The payload of the log entry.',
    })
    public payload!: string;
}
