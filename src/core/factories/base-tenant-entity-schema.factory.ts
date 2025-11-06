import { EntitySchema } from 'typeorm';

export interface BaseTenantEntitySchemaFactory<T> {
    create(tenantId: number): EntitySchema<T>;
}
