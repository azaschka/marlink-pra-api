import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { SiteApprover } from '../../models';
import { SiteEntity } from './site.entity';

@Unique(['siteId', 'email'])
@Entity({ name: 'pra_site_approvers' })
export class SiteApproverEntity implements SiteApprover {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'site_id', type: 'int' })
    public siteId!: number;

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

    public static createWithoutId(siteId: number, email: string): SiteApproverEntity {
        const entity = new SiteApproverEntity();
        entity.siteId = siteId;
        entity.email = email;

        return entity;
    }
}
