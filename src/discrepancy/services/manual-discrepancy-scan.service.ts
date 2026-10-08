import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ErrorProcessorUtility } from '../../shared/utilities';
import { ScanDiscrepancyCommand } from '../commands';
import { ScanEntityTypeFailureDtoOutput } from '../dtos/outputs';
import { DiscrepancyEntityType, DiscrepancyScanState } from '../enums';
import { DiscrepancyOverview } from '../models';
import { DiscrepancyScanStatusService } from './discrepancy-scan-status.service';

/**
 * Runs a manual "scan all": every entity type of the tenant, one after another, through the Sync API, in the
 * background. The status is kept by DiscrepancyScanStatusService, which also makes the scan single-flight per
 * tenant.
 *
 * A failing entity type never stops the others, with one exception: when the Sync API did not answer within the
 * scan timeout, the remaining types are not attempted (each would wait for the same timeout, 25 min by default),
 * so a hanging Sync API cannot keep the tenant's manual scan running for hours.
 */
@Injectable()
export class ManualDiscrepancyScanService {
    public static readonly ENTITY_TYPE_ORDER: readonly DiscrepancyEntityType[] = [
        DiscrepancyEntityType.User,
        DiscrepancyEntityType.GroupPolicy,
        DiscrepancyEntityType.Team,
        DiscrepancyEntityType.Jumpoint,
        DiscrepancyEntityType.JumpPolicy,
        DiscrepancyEntityType.SessionPolicy,
        DiscrepancyEntityType.JumpGroup,
        DiscrepancyEntityType.JumpItemProtocolTunnelJump,
        DiscrepancyEntityType.JumpItemRemoteRdp,
        DiscrepancyEntityType.JumpItemRemoteVnc,
        DiscrepancyEntityType.JumpItemShellJump,
        DiscrepancyEntityType.JumpItemWebJump,
        DiscrepancyEntityType.JumpClient,
        DiscrepancyEntityType.JumpClientInstaller,
    ];
    private static readonly REASON_MAX_LENGTH = 200;
    private static readonly NOT_ATTEMPTED_REASON = 'not scanned: the PRA Sync API did not answer in time';

    private readonly logger = new Logger(ManualDiscrepancyScanService.name);

    constructor(
        private readonly commandBus: CommandBus,
        private readonly discrepancyScanStatusService: DiscrepancyScanStatusService,
    ) {}

    /** Starts the scan in the background, or returns the scan that is already running for the tenant. */
    public start(transactionId: string, tenantId: number): { scanId: string } {
        const { scanId, started } = this.discrepancyScanStatusService.begin(tenantId, transactionId);

        if (started) {
            void this.run(scanId, tenantId);
        } else {
            this.logger.log(
                `[manual scan ${scanId}] tenant ${tenantId}: already running, returning it for request ${transactionId}`,
            );
        }

        return { scanId };
    }

    /** Never rejects: every outcome ends in the status service. Public for tests that await the run. */
    public async run(scanId: string, tenantId: number): Promise<void> {
        const entityTypes = ManualDiscrepancyScanService.ENTITY_TYPE_ORDER;
        const startedAt = Date.now();
        this.logger.log(`[manual scan ${scanId}] tenant ${tenantId} started (${entityTypes.length} entity types)`);

        try {
            const failures: ScanEntityTypeFailureDtoOutput[] = [];

            for (const [index, entityType] of entityTypes.entries()) {
                const failure = await this.scanEntityType(scanId, tenantId, entityType);

                if (!failure) {
                    continue;
                }

                failures.push(failure);

                if (failure.syncApiDidNotAnswer) {
                    failures.push(
                        ...entityTypes.slice(index + 1).map((notAttempted) => ({
                            entityType: notAttempted,
                            state: DiscrepancyScanState.Aborted,
                            reason: ManualDiscrepancyScanService.NOT_ATTEMPTED_REASON,
                        })),
                    );
                    break;
                }
            }

            const reported = failures.map(({ entityType, state, reason }) => ({ entityType, state, reason }));
            this.discrepancyScanStatusService.complete(tenantId, scanId, entityTypes.length, reported);
            this.logSummary(scanId, tenantId, entityTypes.length, reported, Date.now() - startedAt);
        } catch (error) {
            this.logger.error(
                `[manual scan ${scanId}] tenant ${tenantId}: unexpected error: ${ManualDiscrepancyScanService.describe(error)}`,
            );
            this.discrepancyScanStatusService.fail(tenantId, scanId, error);
        }
    }

    /** Scans one entity type; returns why it did not succeed, or undefined. */
    private async scanEntityType(
        scanId: string,
        tenantId: number,
        entityType: DiscrepancyEntityType,
    ): Promise<(ScanEntityTypeFailureDtoOutput & { syncApiDidNotAnswer?: boolean }) | undefined> {
        try {
            const overview = await this.commandBus.execute<ScanDiscrepancyCommand, DiscrepancyOverview>(
                new ScanDiscrepancyCommand(scanId, tenantId, entityType),
            );

            // Sync API versions before 3.2 send no state; their result counts as succeeded, as before.
            if (overview.state === undefined || overview.state === DiscrepancyScanState.Succeeded) {
                return undefined;
            }

            return { entityType, state: overview.state, reason: overview.failureKind };
        } catch (error) {
            return {
                entityType,
                state: DiscrepancyScanState.Failed,
                reason: ManualDiscrepancyScanService.describe(error),
                syncApiDidNotAnswer: ErrorProcessorUtility.isResponseTimeout(error),
            };
        }
    }

    private logSummary(
        scanId: string,
        tenantId: number,
        total: number,
        failures: ScanEntityTypeFailureDtoOutput[],
        durationInMs: number,
    ): void {
        const details = failures
            .map((failure) => `${failure.entityType}: ${failure.state}${failure.reason ? `, ${failure.reason}` : ''}`)
            .join('; ');
        const line = `[manual scan ${scanId}] tenant ${tenantId} finished in ${Math.round(durationInMs / 1000)}s: ${
            total - failures.length
        } succeeded, ${failures.length} failed${failures.length > 0 ? ` (${details})` : ''}`;

        if (failures.length > 0) {
            this.logger.warn(line);
        } else {
            this.logger.log(line);
        }
    }

    private static describe(error: unknown): string {
        const text =
            error instanceof HttpException
                ? `HTTP ${error.getStatus()}: ${error.message}`
                : error instanceof Error
                  ? error.message
                  : String(error);

        return text.length > ManualDiscrepancyScanService.REASON_MAX_LENGTH
            ? `${text.slice(0, ManualDiscrepancyScanService.REASON_MAX_LENGTH - 3)}...`
            : text;
    }
}
