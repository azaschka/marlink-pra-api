import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BillingType } from '../../enums';
import { Customer } from '../../models';

@Entity({ name: 'pra_customers' })
export class CustomerEntity implements Customer {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'key', type: 'varchar', unique: true })
    public key!: string;

    @Column({ name: 'name', type: 'varchar', unique: true })
    public name!: string;

    @Column({ name: 'is_deactivated', type: 'boolean' })
    public isDeactivated!: boolean;

    @Column({ name: 'billing_type', type: 'enum', enum: BillingType })
    public billingType!: BillingType;

    @Column({ name: 'admin_group_policy_id', type: 'int' })
    public adminGroupPolicyId!: number;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static create(
        id: number,
        key: string,
        name: string,
        isDeactivated: boolean,
        billingType: BillingType,
        adminGroupPolicyId: number,
    ): CustomerEntity {
        const entity = new CustomerEntity();
        entity.id = id;
        entity.key = key;
        entity.name = name;
        entity.isDeactivated = isDeactivated;
        entity.billingType = billingType;
        entity.adminGroupPolicyId = adminGroupPolicyId;

        return entity;
    }

    public static createWithoutId(
        key: string,
        name: string,
        isDeactivated: boolean,
        billingType: BillingType,
        adminGroupPolicyId: number,
    ): CustomerEntity {
        const entity = new CustomerEntity();
        entity.key = key;
        entity.name = name;
        entity.isDeactivated = isDeactivated;
        entity.billingType = billingType;
        entity.adminGroupPolicyId = adminGroupPolicyId;

        return entity;
    }
}
