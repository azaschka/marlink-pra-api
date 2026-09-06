import { ArgumentMetadata, ForbiddenException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SocFilterDtoInput } from '../dtos/inputs';
import { SocScopeUtility } from '../utilities';

/**
 * Rejects requests that explicitly ask for a customer the access key may not see.
 *
 * Only the explicit filter is validated here. Everything else is enforced by the scope
 * filter inside the query handlers, which is the authoritative check — this pipe merely
 * turns an obviously forbidden request into a 403 instead of a silently empty result.
 */
@Injectable()
export class SocRequestPipe implements PipeTransform {
    constructor(@Inject(REQUEST) private readonly request: Request) {}

    public transform(value: unknown, metadata: ArgumentMetadata): unknown {
        if (metadata.type !== 'query') {
            return value;
        }

        const { customerKey } = (value ?? {}) as SocFilterDtoInput;

        if (!customerKey) {
            return value;
        }

        const scope = SocScopeUtility.resolve(
            this.request.authInfo?.access?.value?.businessUnits ?? [],
            this.request.customers ?? [],
        );

        if (!scope.isPlatformWide && !scope.customerKeys.includes(customerKey)) {
            throw new ForbiddenException(`Forbidden customer access with customer key: ${customerKey}`);
        }

        return value;
    }
}
