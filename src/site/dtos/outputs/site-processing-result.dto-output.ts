import { ApiProperty } from '@nestjs/swagger';
import { ErrorReport } from '../../error-reports';
import { SiteProcessingResult } from '../../models';
import { ErrorReportDtoOutput } from './error-report.dto-output';
import { SiteCreatedDtoOutput } from './site-created.dto-output';

/**
 * The processed site plus the errors that occurred while processing it.
 *
 * The site fields stay at the top level so existing clients keep working. R3.2-A003, 3.1(2) requires the
 * ingestion to continue past a user that cannot be matched, which means a successful response can now carry
 * failures, and errorReport is how they are reported.
 */
export class SiteProcessingResultDtoOutput extends SiteCreatedDtoOutput {
    @ApiProperty({
        required: true,
        type: ErrorReportDtoOutput,
        description: 'The errors that occurred while processing the site. Empty when everything was applied.',
    })
    public errorReport!: ErrorReportDtoOutput;

    public static create(siteProcessingResult: SiteProcessingResult): SiteProcessingResultDtoOutput {
        return {
            ...siteProcessingResult.site,
            errorReport: SiteProcessingResultDtoOutput.toErrorReportDtoOutput(siteProcessingResult.errorReport),
        } as SiteProcessingResultDtoOutput;
    }

    private static toErrorReportDtoOutput(errorReport: ErrorReport): ErrorReportDtoOutput {
        return { items: errorReport.items };
    }
}
