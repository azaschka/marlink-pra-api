import { ApiProperty } from '@nestjs/swagger';
import { Access } from '../../models';
import { AccessScope } from '../../models/access-scope.model';
import { AccessScopeDtoOutput } from './access-scope.dto-output';

export class AccessRetrievedDtoOutput implements Access {
    @ApiProperty({
        required: true,
        type: Number,
        description: 'The unique identifier of the access.',
    })
    public id!: number;

    @ApiProperty({ required: true, type: String, description: 'The key of the access.' })
    public key!: string;

    @ApiProperty({ required: true, type: String, description: 'The name of the access.' })
    public name!: string;

    @ApiProperty({ required: true, type: AccessScopeDtoOutput, description: 'The access.' })
    public value!: AccessScope;

    @ApiProperty({ required: true, type: Date, description: 'The creation date of the access.' })
    public creationDate!: Date;

    @ApiProperty({ required: false, type: Date, description: 'The last modification date of the access.' })
    public lastModificationDate?: Date;
}
