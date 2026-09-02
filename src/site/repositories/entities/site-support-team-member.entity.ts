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
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel, UserSourceType } from '../../enums';
import { SiteSupportTeamMember } from '../../models';
import { SiteEntity } from './site.entity';

@Unique(['siteId', 'userId'])
@Entity({ name: 'pra_site_support_team_members' })
export class SiteSupportTeamMemberEntity implements SiteSupportTeamMember {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    public id!: number;

    @Column({ name: 'site_id', type: 'int' })
    public siteId!: number;

    @Column({ name: 'user_id', type: 'int' })
    public userId!: number;

    @Column({ name: 'source_type', type: 'enum', enum: UserSourceType })
    public sourceType!: UserSourceType;

    @Column({ name: 'firstname', type: 'varchar' })
    public firstname!: string;

    @Column({ name: 'lastname', type: 'varchar' })
    public lastname!: string;

    @Column({ name: 'email', type: 'varchar' })
    public email!: string;

    @Column({ name: 'support_team_name', type: 'varchar' })
    public supportTeamName!: string;

    @Column({ name: 'support_team_access_level', type: 'enum', enum: SiteSupportTeamAccessLevel })
    public supportTeamAccessLevel!: SiteSupportTeamAccessLevel;

    @Column({ name: 'support_team_trust_level', type: 'enum', enum: SiteSupportTeamTrustLevel })
    public supportTeamTrustLevel!: SiteSupportTeamTrustLevel;

    @CreateDateColumn({ name: 'creation_date', type: 'timestamp' })
    public creationDate!: Date;

    @UpdateDateColumn({ name: 'last_modification_date', type: 'timestamp', nullable: true })
    public lastModificationDate?: Date;

    @ManyToOne(() => SiteEntity, (site) => site.siteSupportTeamMembers, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'site_id' })
    public site!: SiteEntity;

    public static createWithoutId(
        siteId: number,
        userId: number,
        sourceType: UserSourceType,
        firstname: string,
        lastname: string,
        email: string,
        supportTeamName: string,
        supportTeamAccessLevel: SiteSupportTeamAccessLevel,
        supportTeamTrustLevel: SiteSupportTeamTrustLevel,
    ): SiteSupportTeamMemberEntity {
        const entity = new SiteSupportTeamMemberEntity();
        entity.siteId = siteId;
        entity.userId = userId;
        entity.sourceType = sourceType;
        entity.firstname = firstname;
        entity.lastname = lastname;
        entity.email = email;
        entity.supportTeamName = supportTeamName;
        entity.supportTeamAccessLevel = supportTeamAccessLevel;
        entity.supportTeamTrustLevel = supportTeamTrustLevel;

        return entity;
    }
}
