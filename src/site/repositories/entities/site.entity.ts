import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Site, SiteAdministrator, SiteManager, SiteSupportTeamMember } from '../../models';
import { SiteAdministratorEntity } from './site-administrator.entity';
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

    @OneToMany(() => SiteAdministratorEntity, (siteAdministratorEntity) => siteAdministratorEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteAdministrators!: SiteAdministrator[];

    @OneToMany(() => SiteSupportTeamMemberEntity, (siteSupportTeamMemberEntity) => siteSupportTeamMemberEntity.site, {
        eager: true,
        cascade: true,
    })
    public siteSupportTeamMembers!: SiteSupportTeamMember[];

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    public static createWithoutId(
        key: string,
        name: string,
        customerKey: string,
        siteManagers: SiteManager[],
        siteAdministrators: SiteAdministrator[],
        siteSupportTeamMembers: SiteSupportTeamMember[],
    ): SiteEntity {
        const entity = new SiteEntity();
        entity.key = key;
        entity.name = name;
        entity.customerKey = customerKey;
        entity.siteManagers = siteManagers;
        entity.siteAdministrators = siteAdministrators;
        entity.siteSupportTeamMembers = siteSupportTeamMembers;

        return entity;
    }
}
