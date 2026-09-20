import { ApiProperty } from '@nestjs/swagger';
import { ErrorReport } from '../../error-reports';
import { ErrorReportDtoOutput } from './error-report.dto-output';

/**
 * R3.2-A005: deleting a site also detaches its BeyondTrust users, including non-local ones. That cleanup can
 * partially fail, and the endpoint used to answer 204 regardless, which hid memberships that were left behind.
 */
export class SiteDeletedDtoOutput {
    @ApiProperty({
        required: true,
        type: ErrorReportDtoOutput,
        description:
            'The errors that occurred while removing the BeyondTrust artefacts of the site. Empty when everything was removed.',
    })
    public errorReport!: ErrorReportDtoOutput;

    public static create(errorReport: ErrorReport): SiteDeletedDtoOutput {
        return { errorReport: { items: errorReport.items } };
    }
}
