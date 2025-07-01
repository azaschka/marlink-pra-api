import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepositoryService } from '../../../core/services/base-repository.service';
import { CustomerEntity } from '../entities';

@Injectable()
export class CustomerRepositoryService extends BaseRepositoryService<CustomerEntity> {
    constructor(dataSource: DataSource) {
        super(dataSource, CustomerEntity);
    }

    public async createOrUpdateById(entity: Partial<CustomerEntity>): Promise<void> {
        await super.createOrUpdate(entity, ['id']);
    }

    public async findOneById(id: number): Promise<CustomerEntity | null> {
        return await super.findOneBy({ id: id });
    }

    public async deleteById(id: number): Promise<void> {
        return await super.deleteBy({ id: id });
    }
}
