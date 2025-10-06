import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BusinessUnit } from '../../enums';
import { Customer } from '../../models';

@Entity({ name: 'pra_customers' })
export class CustomerEntity implements Customer {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'key', type: 'varchar', unique: true })
    public key!: string;

    @Column({ name: 'name', type: 'varchar', unique: true })
    public name!: string;

    @Column({ name: 'business_unit', type: 'enum', enum: BusinessUnit })
    public businessUnit!: BusinessUnit;

    @Column({ name: 'is_deactivated', type: 'boolean' })
    public isDeactivated!: boolean;

    // TODO remove default value. This is only for backward compatibility with existing databases that do not have this column yet.
    @Column({ name: 'beyondtrust_instance_id', type: 'int', default: 1 })
    public beyondtrustInstanceId!: number;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static create(
        id: number,
        key: string,
        name: string,
        businessUnit: BusinessUnit,
        isDeactivated: boolean,
        beyondtrustInstanceId: number,
    ): CustomerEntity {
        const entity = new CustomerEntity();
        entity.id = id;
        entity.key = key;
        entity.name = name;
        entity.businessUnit = businessUnit;
        entity.isDeactivated = isDeactivated;
        entity.beyondtrustInstanceId = beyondtrustInstanceId;

        return entity;
    }

    public static createWithoutId(
        key: string,
        name: string,
        businessUnit: BusinessUnit,
        isDeactivated: boolean,
        beyondtrustInstanceId: number,
    ): CustomerEntity {
        const entity = new CustomerEntity();
        entity.key = key;
        entity.name = name;
        entity.businessUnit = businessUnit;
        entity.isDeactivated = isDeactivated;
        entity.beyondtrustInstanceId = beyondtrustInstanceId;

        return entity;
    }
}
