import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { LogActionType } from '../../enums';
import { Log } from '../../models';

/**
 * pra_logs is shared by PRA API and Sync API, and both synchronise its schema with their own LogEntity. Both
 * definitions must therefore stay identical, otherwise each start of one service changes the table again
 * (TypeORM changes a varchar length by DROP and ADD COLUMN, which loses the values).
 */
@Entity({ name: 'pra_logs' })
@Index('IDX_pra_logs_creation_date', ['creationDate'])
export class LogEntity implements Log {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'service_name', type: 'varchar' })
    public serviceName!: string;

    @Column({ name: 'action_type', type: 'enum', enum: LogActionType })
    public actionType!: LogActionType;

    @Column({ name: 'action_name', type: 'varchar', length: 1000 })
    public actionName!: string;

    @Column({ name: 'transaction_id', type: 'varchar' })
    public transactionId!: string;

    @Column({ name: 'initiated_by', type: 'varchar', nullable: true })
    public initiatedBy?: string;

    // Declared as MariaDB materialises the first NOT NULL timestamp column of a table when it has no explicit
    // default (explicit_defaults_for_timestamp=OFF), so that schema synchronisation sees no difference.
    @Column({
        name: 'creation_date',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    public creationDate!: Date;

    @Column({ name: 'payload', type: 'text' })
    public payload!: string;

    public static createWithoutId(
        serviceName: string,
        actionType: LogActionType,
        actionName: string,
        transactionId: string,
        initiatedBy: string | undefined,
        creationDate: Date,
        payload: string,
    ): LogEntity {
        const entity = new LogEntity();
        entity.serviceName = serviceName;
        entity.actionType = actionType;
        entity.actionName = actionName;
        entity.transactionId = transactionId;
        entity.initiatedBy = initiatedBy;
        entity.creationDate = creationDate;
        entity.payload = payload;

        return entity;
    }
}
