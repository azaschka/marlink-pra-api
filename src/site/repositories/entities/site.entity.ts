import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import {
    PartialSiteAuditorWithUserId,
    PartialSiteApprover,
    PartialSiteManagerWithUserId,
    PartialSiteSupportTeamMemberWithUserId,
    Site,
    SiteAuditor,
    SiteManager,
    SiteSupportTeamMember,
} from '../../models';
import { SiteAuditorEntity } from './site-auditor.entity';
import { SiteApproverEntity } from './site-approver.entity';
import { SiteManagerEntity } from './site-manager.entity';
import { SiteSupportTeamMemberEntity } from './site-support-team-member.entity';

@Entity({ name: 'pra_sites' })
export class SiteEntity implements Site {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'key', type: 'varchar', unique: true })
    public key!: string;

    @Column({ name: 'name', type: 'varchar' })
    public name!: string;

    @Column({ name: 'customer_key', type: 'varchar' })
    public customerKey!: string;

    @OneToMany(() => SiteManagerEntity, (siteManagerEntity) => siteManagerEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteManagers!: SiteManager[];

    @OneToMany(() => SiteAuditorEntity, (siteAuditorEntity) => siteAuditorEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteAuditors!: SiteAuditor[];

    @OneToMany(() => SiteSupportTeamMemberEntity, (siteSupportTeamMemberEntity) => siteSupportTeamMemberEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteSupportTeamMembers!: SiteSupportTeamMember[];

    @OneToMany(() => SiteApproverEntity, (siteApproverEntity) => siteApproverEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteApprovers!: SiteApproverEntity[];

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static createWithoutId(
        key: string,
        name: string,
        customerKey: string,
        siteManagers: (SiteManagerEntity | PartialSiteManagerWithUserId)[],
        siteAuditors: (SiteAuditorEntity | PartialSiteAuditorWithUserId)[],
        siteSupportTeamMembers: (SiteSupportTeamMemberEntity | PartialSiteSupportTeamMemberWithUserId)[],
        siteApprovers: (SiteApproverEntity | PartialSiteApprover)[],
    ): SiteEntity {
        const entity = new SiteEntity();
        entity.key = key;
        entity.name = name;
        entity.customerKey = customerKey;
        entity.siteManagers = siteManagers as SiteManagerEntity[];
        entity.siteAuditors = siteAuditors as SiteAuditorEntity[];
        entity.siteSupportTeamMembers = siteSupportTeamMembers as SiteSupportTeamMemberEntity[];
        entity.siteApprovers = siteApprovers as SiteApproverEntity[];

        return entity;
    }
}
