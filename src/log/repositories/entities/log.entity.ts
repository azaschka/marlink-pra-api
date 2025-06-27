import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { LogActionType } from '../../enums';
import { Log } from '../../models';

@Entity({ name: 'pra_logs' })
export class LogEntity implements Log {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'service_name', type: 'varchar' })
    public serviceName!: string;

    @Column({ name: 'action_type', type: 'enum', enum: LogActionType })
    public actionType!: LogActionType;

    @Column({ name: 'action_name', type: 'varchar' })
    public actionName!: string;

    @Column({ name: 'transaction_id', type: 'varchar' })
    public transactionId!: string;

    @Column({ name: 'triggered_by', type: 'varchar', nullable: true })
    public triggeredBy?: string;

    @Column({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @Column({ name: 'payload', type: 'text' })
    public payload!: string;

    public static createWithoutId(
        serviceName: string,
        actionType: LogActionType,
        actionName: string,
        transactionId: string,
        triggeredBy: string | undefined,
        creationDate: Date,
        payload: string,
    ): LogEntity {
        const entity = new LogEntity();
        entity.serviceName = serviceName;
        entity.actionType = actionType;
        entity.actionName = actionName;
        entity.transactionId = transactionId;
        entity.triggeredBy = triggeredBy;
        entity.creationDate = creationDate;
        entity.payload = payload;

        return entity;
    }
}
