import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MonitoringRecord } from '../../models';

@Entity({ name: 'pra_monitorings' })
export class MonitoringRecordEntity implements MonitoringRecord {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'endpoint_path', type: 'varchar' })
    public endpointPath!: string;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    public static createWithoutId(endpointPath: string, creationDate?: Date): MonitoringRecordEntity {
        const entity = new MonitoringRecordEntity();
        entity.endpointPath = endpointPath;
        if (creationDate) {
            entity.creationDate = creationDate;
        }

        return entity;
    }
}
