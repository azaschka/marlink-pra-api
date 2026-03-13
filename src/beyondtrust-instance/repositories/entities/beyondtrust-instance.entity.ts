import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BillingType, BusinessUnit } from '../../enums';
import { BeyondtrustInstance } from '../../models';

@Entity({ name: 'beyondtrust_instances' })
export class BeyondtrustInstanceEntity implements BeyondtrustInstance {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'name', type: 'varchar' })
    public name!: string;

    @Column({ name: 'auth_client_id', type: 'varchar' })
    public authClientId!: string;

    @Column({ name: 'auth_client_secret', type: 'varchar' })
    public authClientSecret!: string;

    @Column({ name: 'oauth2_token_url', type: 'varchar' })
    public oauth2TokenUrl!: string;

    @Column({ name: 'api_base_url', type: 'varchar' })
    public apiBaseUrl!: string;

    @Column({ name: 'billing_type', type: 'enum', enum: BillingType, default: BillingType.Asset })
    public billingType!: BillingType;

    @Column({ name: 'business_unit', type: 'enum', enum: BusinessUnit, nullable: true })
    public businessUnit!: BusinessUnit;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static create(
        id: number,
        name: string,
        authClientId: string,
        authClientSecret: string,
        oauth2TokenUrl: string,
        apiBaseUrl: string,
        billingType: BillingType,
        businessUnit: BusinessUnit,
    ): BeyondtrustInstanceEntity {
        const entity = new BeyondtrustInstanceEntity();
        entity.id = id;
        entity.name = name;
        entity.authClientId = authClientId;
        entity.authClientSecret = authClientSecret;
        entity.oauth2TokenUrl = oauth2TokenUrl;
        entity.apiBaseUrl = apiBaseUrl;
        entity.billingType = billingType;
        entity.businessUnit = businessUnit;

        return entity;
    }

    public static createWithoutId(
        name: string,
        authClientId: string,
        authClientSecret: string,
        oauth2TokenUrl: string,
        apiBaseUrl: string,
        billingType: BillingType,
        businessUnit: BusinessUnit,
    ): BeyondtrustInstanceEntity {
        const entity = new BeyondtrustInstanceEntity();
        entity.name = name;
        entity.authClientId = authClientId;
        entity.authClientSecret = authClientSecret;
        entity.oauth2TokenUrl = oauth2TokenUrl;
        entity.apiBaseUrl = apiBaseUrl;
        entity.billingType = billingType;
        entity.businessUnit = businessUnit;

        return entity;
    }
}
