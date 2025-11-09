import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { BeyondtrustInstanceBackup } from '../../beyondtrust-instance-backup/models';
import { BeyondtrustInstance } from '../../beyondtrust-instance/models';
import { RetrieveBeyondtrustInstancesQuery } from '../../beyondtrust-instance/queries';
import { SyncDiscrepancyCommand } from '../../discrepancy/commands';
import { DiscrepancySyncType } from '../../discrepancy/enums';
import { Discrepancy } from '../../discrepancy/models';
import { RetrieveDiscrepanciesQuery } from '../../discrepancy/queries';
import { RetrieveGroupPoliciesQuery } from '../../group-policy/queries';
import { PaginationUtility, UuidUtility } from '../../shared/utilities';
import { RetrieveUsersQuery } from '../../user/queries';

@Controller('job')
export class JobController implements OnModuleInit {
    private static readonly MAX_PAGE_SIZE_PER_BATCH = 100;

    private readonly logger = new Logger(JobController.name);

    constructor(
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly appConfigService: AppConfigService,
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    public onModuleInit(): void {
        const cronJobMap = [
            {
                name: 'createBTInstancesBackups',
                cronExpression: this.appConfigService.cronJob.btInstanceBackup,
                func: this.createBTInstancesBackups.bind(this),
            },
            {
                name: 'ensureBTRelatedDBTablesPopulated',
                cronExpression: this.appConfigService.cronJob.btDataPopulationIfEmpty,
                func: this.ensureBTRelatedDBTablesPopulated.bind(this),
            },
        ];

        cronJobMap.forEach(({ name, cronExpression, func }) => {
            const job = new CronJob(
                cronExpression,
                async () => {
                    this.logger.log(`[${name}] started`);
                    try {
                        await func();
                        this.logger.log(`[${name}] finished`);
                    } catch (err) {
                        // IMPORTANT: Do not throw the error, otherwise it will kill the process
                        this.logger.error(`[${name}] failed: ${(err as Error).message}`, err as Error);
                    }
                },
                null,
                undefined,
                this.appConfigService.cronJob.timezone,
            );

            this.schedulerRegistry.addCronJob(name, job);
            job.start();
        });
    }

    private async createBTInstancesBackups() {
        const transactionId = UuidUtility.generate();
        const beyondtrustInstances = await this.getAllBTInstances(transactionId);

        for (const beyondtrustInstance of beyondtrustInstances) {
            try {
                await this.commandBus.execute<CreateBeyondtrustInstanceBackupCommand, BeyondtrustInstanceBackup>(
                    new CreateBeyondtrustInstanceBackupCommand(transactionId, beyondtrustInstance.id),
                );
            } catch (error) {
                this.logger.error(
                    `Failed to create backup for BeyondTrust Instance with ID ${beyondtrustInstance.id}: ${
                        (error as Error).message
                    }`,
                    error as Error,
                );
            }
        }
    }

    // Use users and group policies as indicators for all other BT related DB tables are empty
    private async ensureBTRelatedDBTablesPopulated() {
        const transactionId = UuidUtility.generate();
        const beyondtrustInstances = await this.getAllBTInstances(transactionId);

        for (const beyondtrustInstance of beyondtrustInstances) {
            try {
                const users = await this.queryBus.execute<RetrieveUsersQuery, []>(
                    new RetrieveUsersQuery(transactionId, beyondtrustInstance.id, 1, 1),
                );
                const groupPolicies = await this.queryBus.execute<RetrieveGroupPoliciesQuery, []>(
                    new RetrieveGroupPoliciesQuery(transactionId, beyondtrustInstance.id, 1, 1),
                );

                if (users.length !== 0 || groupPolicies.length !== 0) {
                    continue;
                }

                // Populate data using scanned discrepancies
                const discrepancies = await PaginationUtility.queryUntilLastPage((pageNumber) =>
                    this.queryBus.execute<RetrieveDiscrepanciesQuery, Discrepancy[]>(
                        new RetrieveDiscrepanciesQuery(
                            transactionId,
                            beyondtrustInstance.id,
                            JobController.MAX_PAGE_SIZE_PER_BATCH,
                            pageNumber,
                        ),
                    ),
                );

                for (const discrepancy of discrepancies) {
                    try {
                        await this.commandBus.execute<SyncDiscrepancyCommand, void>(
                            new SyncDiscrepancyCommand(
                                transactionId,
                                beyondtrustInstance.id,
                                discrepancy.id,
                                DiscrepancySyncType.ExternalToInternal,
                            ),
                        );
                    } catch (error) {
                        this.logger.error(
                            `Failed to ensure DB record population for BT Instance ID ${beyondtrustInstance.id}, Discrepancy ID: ${discrepancy.id}`,
                            error as Error,
                        );
                    }
                }
            } catch (error) {
                this.logger.error(
                    `Failed to ensure DB record population for BT Instance ID ${beyondtrustInstance.id}: ${
                        (error as Error).message
                    }`,
                    error as Error,
                );
            }
        }
    }

    private async getAllBTInstances(transactionId: string) {
        return await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveBeyondtrustInstancesQuery, BeyondtrustInstance[]>(
                new RetrieveBeyondtrustInstancesQuery(transactionId, JobController.MAX_PAGE_SIZE_PER_BATCH, pageNumber),
            ),
        );
    }
}
