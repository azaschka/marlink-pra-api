import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { SiteManager } from '../../models';
import { SiteEntity } from './site.entity';

@Entity({ name: 'pra_site_managers' })
export class SiteManagerEntity implements SiteManager {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'site_id', type: 'int' })
    public siteId!: number;

    @Column({ name: 'user_id', type: 'int' })
    public userId!: number;

    @Column({ name: 'username', type: 'varchar' })
    public username!: string;

    @Column({ name: 'email', type: 'varchar' })
    public email!: string;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    @ManyToOne(() => SiteEntity, (site) => site.siteManagers, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'site_id' })
    public site!: SiteEntity;

    public static createWithoutId(userId: number, username: string, email: string): SiteManagerEntity {
        const entity = new SiteManagerEntity();
        entity.userId = userId;
        entity.username = username;
        entity.email = email;

        return entity;
    }
}
