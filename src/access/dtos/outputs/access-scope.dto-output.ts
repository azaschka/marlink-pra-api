import { ApiProperty } from '@nestjs/swagger';
import { BusinessUnit } from '../../../beyondtrust-instance/enums';
import { AccessScope } from '../../models/access-scope.model';

export class AccessScopeDtoOutput implements AccessScope {
    @ApiProperty({
        required: true,
        isArray: true,
        enum: BusinessUnit,
        description: 'The business units included in the access scope.',
    })
    public businessUnits!: BusinessUnit[];
}
