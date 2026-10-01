import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { UserSourceType } from '../../../user/enums';
import { SiteSupportTeamAccessLevel, SiteSupportTeamTrustLevel } from '../../enums';
import { CreateSiteDtoInput } from './create-site.dto-input';

/**
 * Backwards compatibility guard for PRA Console 3.1.
 *
 * R3.2 added sourceType to the three site user types. The console does not send it, so the property has to
 * default to internal rather than fail validation, otherwise site creation from the existing console breaks.
 */
describe('CreateSiteDtoInput', () => {
    const validationPipe = new ValidationPipe({ transform: true });
    const metadata: ArgumentMetadata = { type: 'body', metatype: CreateSiteDtoInput, data: undefined };

    /** Exactly the shape PRA Console 3.1 posts, without any source type. */
    const consolePayload = {
        key: 'SITE1',
        name: 'Site One',
        customerKey: 'CUST1',
        siteManagers: [{ username: 'manager', email: 'manager@example.com' }],
        siteAuditors: [{ username: 'auditor', email: 'auditor@example.com', isAdminOperator: false }],
        siteSupportTeamMembers: [
            {
                firstname: 'First',
                lastname: 'Last',
                email: 'support@example.com',
                supportTeamName: 'Support Team',
                supportTeamAccessLevel: SiteSupportTeamAccessLevel.Limited,
                supportTeamTrustLevel: SiteSupportTeamTrustLevel.RequireAuth,
            },
        ],
        siteApprovers: ['approver@example.com'],
    };

    it('should accept a payload without a source type and default every site user to internal', async () => {
        const result = (await validationPipe.transform(consolePayload, metadata)) as CreateSiteDtoInput;

        expect(result.siteManagers[0]?.sourceType).toBe(UserSourceType.Internal);
        expect(result.siteAuditors?.[0]?.sourceType).toBe(UserSourceType.Internal);
        expect(result.siteSupportTeamMembers?.[0]?.sourceType).toBe(UserSourceType.Internal);
    });

    it('should keep an explicitly supplied source type', async () => {
        const payload = {
            ...consolePayload,
            siteManagers: [{ username: 'manager', email: 'manager@example.com', sourceType: UserSourceType.External }],
        };

        const result = (await validationPipe.transform(payload, metadata)) as CreateSiteDtoInput;

        expect(result.siteManagers[0]?.sourceType).toBe(UserSourceType.External);
    });

    it('should reject an unknown source type', async () => {
        const payload = {
            ...consolePayload,
            siteManagers: [{ username: 'manager', email: 'manager@example.com', sourceType: 'ldap' }],
        };

        await expect(validationPipe.transform(payload, metadata)).rejects.toThrow();
    });
});
