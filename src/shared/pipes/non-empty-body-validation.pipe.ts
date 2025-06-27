import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class NonEmptyBodyPipe implements PipeTransform {
    public transform(value: unknown) {
        if (!value || Object.values(value).every((v) => v === undefined)) {
            throw new BadRequestException('Payload must contain at least one field');
        }

        return value;
    }
}
