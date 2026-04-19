import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../../../app-config/services/app-config.service';
import { UrlUtility } from '../../../../shared/utilities';
import { JumpointNode, JumpointNodeIsoContent } from '../../models';
import { RetrieveJumpointNodeByIdQuery } from '../retrieve-jumpoint-node-by-id.query';
import { RetrieveJumpointNodeIsoByIdQuery } from '../retrieve-jumpoint-node-iso-by-id.query';

@QueryHandler(RetrieveJumpointNodeIsoByIdQuery)
export class RetrieveJumpointNodeIsoByIdQueryHandler implements IQueryHandler<RetrieveJumpointNodeIsoByIdQuery> {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly appConfigService: AppConfigService,
    ) {}

    public async execute(query: RetrieveJumpointNodeIsoByIdQuery): Promise<JumpointNodeIsoContent> {
        const jumpointNode = await this.queryBus.execute<RetrieveJumpointNodeByIdQuery, JumpointNode>(
            new RetrieveJumpointNodeByIdQuery(query.transactionId, query.id),
        );

        if (!jumpointNode.isoFilePath) {
            throw new NotFoundException(`ISO file path not found for Jumpoint node with id ${query.id}.`);
        }

        const absoluteFilePath = UrlUtility.join(this.appConfigService.storage.rootPath, jumpointNode.isoFilePath);

        if (!this.doesIsoFileExist(absoluteFilePath)) {
            throw new NotFoundException(`ISO file not found at path ${absoluteFilePath}.`);
        }

        const fileBuffer = await this.readIsoFile(absoluteFilePath);

        return {
            filename: path.basename(absoluteFilePath),
            buffer: fileBuffer,
        };
    }

    private doesIsoFileExist(absoluteFilePath: string): boolean {
        return fs.existsSync(absoluteFilePath);
    }

    private readIsoFile(absoluteFilePath: string): Promise<Buffer> {
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
