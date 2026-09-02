import { ApiProperty } from '@nestjs/swagger';
import { ErrorReportItem } from '../../error-reports';
import { ErrorReportItemDtoOutput } from './error-report-item.dto-output';

export class ErrorReportDtoOutput {
    @ApiProperty({
        required: true,
        type: [ErrorReportItemDtoOutput],
        description: 'The list of error report items.',
    })
    public items!: ErrorReportItem[];
}
