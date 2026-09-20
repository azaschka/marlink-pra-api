import { ApiProperty } from '@nestjs/swagger';
import { SiteUserType } from '../../enums';
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
        enum: SiteUserType,
        description: 'The role of the site user the error refers to, if the error concerns a specific user.',
    })
    public siteUserType?: SiteUserType;

    @ApiProperty({
        required: false,
        type: String,
        description: 'The email of the site user the error refers to, if the error concerns a specific user.',
    })
    public email?: string;
}
