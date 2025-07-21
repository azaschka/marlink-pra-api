import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PraUser } from '../../models';
import { UserRole, BusinessUnit } from '../../enums';

@Entity({ name: 'pra_user' })
export class PraUserEntity implements PraUser {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'username', type: 'varchar', length: 100, unique: true })
    public username!: string;

    @Column({ name: 'password', type: 'varchar' })
    public password!: string;

    @Column({ name: 'email', type: 'varchar', length: 100 })
    public email!: string;

    @Column({ name: 'role', type: 'varchar', length: 50 })
    public role!: UserRole;

    @Column({ name: 'display_name', type: 'varchar', length: 100 })
    public displayName!: string;

    @Column({ name: 'business_unit', type: 'varchar', length: 50, nullable: true })
    public businessUnit?: BusinessUnit;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate!: Date;

    public static create(
        id: number,
        username: string,
        password: string,
        email: string,
        role: UserRole,
        displayName: string,
        businessUnit?: BusinessUnit,
    ): PraUserEntity {
        const entity = new PraUserEntity();
        entity.id = id;
        entity.username = username;
        entity.password = password;
        entity.email = email;
        entity.role = role;
        entity.displayName = displayName;
        entity.businessUnit = businessUnit;

        return entity;
    }

    public static createWithoutId(
        username: string,
        password: string,
        email: string,
        role: UserRole,
        displayName: string,
        businessUnit?: BusinessUnit,
    ): PraUserEntity {
        const entity = new PraUserEntity();
        entity.username = username;
        entity.password = password;
        entity.email = email;
        entity.role = role;
        entity.displayName = displayName;
        entity.businessUnit = businessUnit;

        return entity;
    }
}
