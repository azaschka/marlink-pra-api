import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Access } from '../../models';
import { AccessScope } from '../../models/access-scope.model';

@Entity({ name: 'pra_access' })
export class AccessEntity implements Access {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'key', type: 'varchar', unique: true })
    public key!: string;

    @Column({ name: 'name', type: 'varchar' })
    public name!: string;

    @Column({ name: 'value', type: 'json' })
    public value!: AccessScope;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp', precision: 3 })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', precision: 3, nullable: true })
    public lastModificationDate?: Date;

    public static createWithoutId(key: string, name: string, value: AccessScope): AccessEntity {
        const entity = new AccessEntity();
        entity.key = key;
        entity.name = name;
        entity.value = value;

        return entity;
    }
}
