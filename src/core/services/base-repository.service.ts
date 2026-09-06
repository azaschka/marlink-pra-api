import { DataSource, FindOptionsOrder, FindOptionsWhere } from 'typeorm';

export class BaseRepositoryService<T> {
    constructor(
        private readonly dataSource: DataSource,
        private readonly entity: new () => T,
    ) {}

    public async create(entity: T): Promise<T> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            const createdEntity = queryRunner.manager.create(this.entity, entity);
            await queryRunner.manager.save(createdEntity);
            await queryRunner.commitTransaction();

            return createdEntity;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async createOrUpdate<K extends Extract<keyof T, string>>(
        entityOrEntities: Partial<T> | Partial<T>[],
        conflictPaths: K[],
    ): Promise<void> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager.upsert(this.entity, entityOrEntities, {
                conflictPaths,
            });
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async findOneBy<K extends Extract<keyof T, string>>(where: Pick<T, K>): Promise<T | null> {
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            const entity = await queryRunner.manager.findOne(this.entity, {
                where: where,
            });

            return entity as T | null;
        } finally {
            await queryRunner.release();
        }
    }

    public async findBy<K extends Extract<keyof T, string>>(
        where: Pick<T, K> | FindOptionsWhere<T> | FindOptionsWhere<T>[],
        pageNumber: number | undefined,
        pageSize: number | undefined,
        order?: FindOptionsOrder<() => T>,
    ): Promise<T[]> {
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            const entities = await queryRunner.manager.find(this.entity, {
                where: where,
                skip: pageNumber && pageSize ? (pageNumber - 1) * pageSize : undefined,
                take: pageSize,
                order: order,
            });

            return entities as T[];
        } finally {
            await queryRunner.release();
        }
    }

    public async deleteBy<K extends Extract<keyof T, string>>(where: Pick<T, K> | FindOptionsWhere<T>): Promise<void> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager.delete(this.entity, where);
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    public async countBy<K extends Extract<keyof T, string>>(
        where: Pick<T, K> | FindOptionsWhere<T> | FindOptionsWhere<T>[],
    ): Promise<number> {
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            return await queryRunner.manager.count(this.entity, { where });
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Truncates the underlying table, removing all rows and resetting the
     * AUTO_INCREMENT counter back to its initial value.
     *
     * Note: TRUNCATE performs an implicit commit in MySQL and cannot be rolled
     * back, so it is intentionally not wrapped in an explicit transaction.
     */
    public async truncate(): Promise<void> {
        const queryRunner = await this.createQueryRunnerAndConnect();

        try {
            const tableName = queryRunner.manager.getRepository(this.entity).metadata.tableName;
            await queryRunner.query(`TRUNCATE TABLE \`${tableName}\``);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Use save() instead of upsert() when the entity may contain related entities that also need to be
     * persisted. save() processes configured cascades and can insert or update related entities,
     * whereas upsert() only performs an insert/update on the target entity and does not process relations.
     * await queryRunner.manager.save(this.entity, createdEntity);
     */
    public async save(entity: T): Promise<void> {
        const queryRunner = await this.createQueryRunnerAndConnect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager.save(entity);
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async createQueryRunnerAndConnect() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        return queryRunner;
    }
}
