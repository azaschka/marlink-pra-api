import { ApiProperty } from '@nestjs/swagger';
import { JumpClientInstallerPlatformType } from '../../enums';
import { JumpClientInstallerKeyInfo } from '../../models';

export class JumpClientInstallerKeyInfoDtoOutput implements JumpClientInstallerKeyInfo {
    @ApiProperty({
        required: true,
        enum: JumpClientInstallerPlatformType,
        description: 'The platform type for which this installer key info is applicable.',
    })
    public platformType!: JumpClientInstallerPlatformType;

    @ApiProperty({
        required: false,
        type: String,
        description:
            'The information needed to deploy an installer. Only included in the response when creating a new installer.',
    })
    public encodedInfo?: string;

    @ApiProperty({ required: false, type: String, description: 'The installer filename.' })
    public filename?: string;

    @ApiProperty({ required: false, type: String, description: 'The location where the installer file is located.' })
    public installerPath?: string;
}
