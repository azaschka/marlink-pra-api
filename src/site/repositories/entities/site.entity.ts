import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Site } from '../../models';

@Entity({ name: 'sites' })
export class SiteEntity implements Site {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'key', type: 'varchar', unique: true })
    public key!: string;

    @Column({ name: 'name', type: 'varchar' })
    public name!: string;

    @Column({ name: 'customer_key', type: 'varchar' })
    public customerKey!: string;

    @Column({ name: 'approver_username', type: 'varchar' })
    public approverUsername!: string;

    @Column({ name: 'approver_email', type: 'varchar' })
    public approverEmail!: string;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static create(
        id: number,
        key: string,
        name: string,
        customerKey: string,
        approverUsername: string,
        approverEmail: string,
    ): SiteEntity {
        const entity = new SiteEntity();
        entity.id = id;
        entity.key = key;
        entity.name = name;
        entity.customerKey = customerKey;
        entity.approverUsername = approverUsername;
        entity.approverEmail = approverEmail;

        return entity;
    }

    public static createWithoutId(
        key: string,
        name: string,
        customerKey: string,
        approverUsername: string,
        approverEmail: string,
    ): SiteEntity {
        const entity = new SiteEntity();
        entity.key = key;
        entity.name = name;
        entity.customerKey = customerKey;
        entity.approverUsername = approverUsername;
        entity.approverEmail = approverEmail;

        return entity;
    }
}
