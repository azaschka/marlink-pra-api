import { RetrieveBeyondtrustInstanceBackupByIdQueryHandler } from './retrieve-beyondtrust-instance-backup-by-id.query-handler';
import { RetrieveBeyondtrustInstanceBackupContentQueryHandler } from './retrieve-beyondtrust-instance-backup-content.query-handler';
import { RetrieveBeyondtrustInstanceBackupsQueryHandler } from './retrieve-beyondtrust-instance-backups.query-handler';

export const QueryHandlers = [
    RetrieveBeyondtrustInstanceBackupsQueryHandler,
    RetrieveBeyondtrustInstanceBackupContentQueryHandler,
    RetrieveBeyondtrustInstanceBackupByIdQueryHandler,
];
