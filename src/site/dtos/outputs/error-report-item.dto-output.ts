import { ApiProperty } from '@nestjs/swagger';
import { ErrorReportItem } from '../../error-reports';

export class ErrorReportItemDtoOutput implements ErrorReportItem {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The type of the error report item.',
    })
    public type!: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The message of the error report item.',
    })
    public message!: string;

    @ApiProperty({
        required: false,
        type: Object,
        description: 'The context of the error report item.',
    })
    public context?: Record<string, unknown> | undefined;
}
