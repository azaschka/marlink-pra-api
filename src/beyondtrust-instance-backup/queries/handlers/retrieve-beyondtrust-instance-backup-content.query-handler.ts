import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../../app-config/services/app-config.service';
import { UrlUtility } from '../../../shared/utilities';
import { BeyondtrustInstanceBackup, BeyondtrustInstanceBackupContent } from '../../models';
import { RetrieveBeyondtrustInstanceBackupByIdQuery } from '../retrieve-beyondtrust-instance-backup-by-id.query';
import { RetrieveBeyondtrustInstanceBackupContentQuery } from '../retrieve-beyondtrust-instance-backup-content.query';

@QueryHandler(RetrieveBeyondtrustInstanceBackupContentQuery)
export class RetrieveBeyondtrustInstanceBackupContentQueryHandler implements IQueryHandler<RetrieveBeyondtrustInstanceBackupContentQuery> {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly appConfigService: AppConfigService,
    ) {}

    public async execute(
        query: RetrieveBeyondtrustInstanceBackupContentQuery,
    ): Promise<BeyondtrustInstanceBackupContent> {
        const backup = await this.queryBus.execute<
            RetrieveBeyondtrustInstanceBackupByIdQuery,
            BeyondtrustInstanceBackup
        >(new RetrieveBeyondtrustInstanceBackupByIdQuery(query.transactionId, query.beyondtrustInstanceId, query.id));

        const absoluteFilePath = UrlUtility.join(this.appConfigService.storage.rootPath, backup.backupFilePath);

        if (!this.doesBackupFileExist(absoluteFilePath)) {
            throw new NotFoundException(`Backup file not found.`);
        }

        const fileBuffer = await this.readBackupFile(absoluteFilePath);

        return {
            filename: path.basename(absoluteFilePath),
            buffer: fileBuffer,
        };
    }

    private doesBackupFileExist(absoluteFilePath: string): boolean {
        return fs.existsSync(absoluteFilePath);
    }

    private readBackupFile(absoluteFilePath: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            fs.readFile(absoluteFilePath, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }
}
