import {
    ArgumentMetadata,
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CustomerLicenseUsageRequestPipe implements PipeTransform {
    constructor(@Inject(REQUEST) private readonly request: Request) {}

    public transform(value: unknown, metadata: ArgumentMetadata) {
        // Skip if this isn't an HTTP request body, query, param.
        if (metadata.type !== 'query' && metadata.type !== 'body' && metadata.type !== 'param') {
            return value;
        }

        const customerScopes = this.request.customers!;

        const requestParamId = Number(this.request.params['id']);

        if (!requestParamId) {
            throw new BadRequestException('Missing customer ID parameter');
        }

        if (!customerScopes.map((c) => c.id).includes(requestParamId)) {
            throw new ForbiddenException('Forbidden customer access');
        }

        return value;
    }
}
