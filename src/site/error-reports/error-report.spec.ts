import { SiteUserType } from '../enums';
import { UserNotFoundException } from '../exceptions';
import { ErrorReport } from './error-report';

describe('ErrorReport', () => {
    it('should take role and email from a site user exception', () => {
        const report = new ErrorReport();

        report.add(new UserNotFoundException(SiteUserType.SiteManager, undefined, 'manager@example.com'));

        expect(report.items).toEqual([
            {
                type: 'UserNotFoundException',
                message: 'User with username undefined and email manager@example.com not found.',
                siteUserType: SiteUserType.SiteManager,
                email: 'manager@example.com',
            },
        ]);
    });

    it('should attach the user context to an error that does not know its user (EXT-02)', () => {
        const report = new ErrorReport();

        report.add(new Error('connect ECONNREFUSED pra-sync-api:3000'), {
            siteUserType: SiteUserType.SiteSupportTeamMember,
            email: 'member@example.com',
            operation: 'add',
        });

        expect(report.items).toEqual([
            {
                type: 'Error',
                message: 'connect ECONNREFUSED pra-sync-api:3000',
                siteUserType: SiteUserType.SiteSupportTeamMember,
                email: 'member@example.com',
                operation: 'add',
            },
        ]);
    });

    it('should prefer the fields of a site user exception and still record the operation', () => {
        const report = new ErrorReport();

        report.add(new UserNotFoundException(SiteUserType.SiteAuditor, undefined, 'auditor@example.com'), {
            siteUserType: SiteUserType.SiteManager,
            email: 'other@example.com',
            operation: 'remove',
        });

        expect(report.items[0]).toEqual(
            expect.objectContaining({
                siteUserType: SiteUserType.SiteAuditor,
                email: 'auditor@example.com',
                operation: 'remove',
            }),
        );
    });

    it('should report non-Error values as UnknownError', () => {
        const report = new ErrorReport();

        report.add('boom');

        expect(report.items).toEqual([{ type: 'UnknownError', message: 'boom' }]);
    });
});
