import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { SiteAuditor } from '../../models';
import { SiteEntity } from './site.entity';

@Unique(['siteId', 'userId'])
@Entity({ name: 'pra_site_auditors' })
export class SiteAuditorEntity implements SiteAuditor {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @PrimaryColumn({ name: 'site_id', type: 'int' })
    public siteId!: number;

    @PrimaryColumn({ name: 'user_id', type: 'int' })
    public userId!: number;

    @Column({ name: 'username', type: 'varchar' })
    public username!: string;

    @Column({ name: 'email', type: 'varchar' })
    public email!: string;

    @Column({ name: 'is_admin_operator', type: 'boolean' })
    public isAdminOperator!: boolean;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    @ManyToOne(() => SiteEntity, (site) => site.siteAuditors, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'site_id' })
    public site!: SiteEntity;

    public static createWithoutId(
        siteId: number,
        userId: number,
        username: string,
        email: string,
        isAdminOperator: boolean,
    ): SiteAuditorEntity {
        const entity = new SiteAuditorEntity();
        entity.siteId = siteId;
        entity.userId = userId;
        entity.username = username;
        entity.email = email;
        entity.isAdminOperator = isAdminOperator;

        return entity;
    }
}
