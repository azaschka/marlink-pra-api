import { ApiProperty } from '@nestjs/swagger';
import { ErrorReport } from '../../error-reports';
import { Site, SiteProcessingResult } from '../../models';
import { ErrorReportDtoOutput } from './error-report.dto-output';
import { SiteCreatedDtoOutput } from './site-created.dto-output';

export class SiteProcessingResultDtoOutput implements SiteProcessingResult {
    @ApiProperty({
        required: true,
        type: SiteCreatedDtoOutput,
        description: 'The site that was processed.',
    })
    public site!: Site;

    @ApiProperty({
        required: true,
        type: ErrorReportDtoOutput,
        description: 'The error report generated during site processing.',
    })
    public errorReport!: ErrorReport;
}
