import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { CreateBeyondtrustInstanceBackupCommand } from '../../beyondtrust-instance-backup/commands';
import { BeyondtrustInstanceBackup } from '../../beyondtrust-instance-backup/models';
import { BeyondtrustInstance } from '../../beyondtrust-instance/models';
import { RetrieveBeyondtrustInstancesQuery } from '../../beyondtrust-instance/queries';
import { PaginationUtility, UuidUtility } from '../../shared/utilities';

@Controller('job')
export class JobController implements OnModuleInit {
    private static readonly MAX_BT_INSTANCES_PER_BATCH = 100;

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
                cronExpression: this.appConfigService.cronJob.expressions,
                func: this.createBTInstancesBackups.bind(this),
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

        const beyondtrustInstances = await PaginationUtility.queryUntilLastPage((pageNumber) =>
            this.queryBus.execute<RetrieveBeyondtrustInstancesQuery, BeyondtrustInstance[]>(
                new RetrieveBeyondtrustInstancesQuery(
                    transactionId,
                    JobController.MAX_BT_INSTANCES_PER_BATCH,
                    pageNumber,
                ),
            ),
        );

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
}
