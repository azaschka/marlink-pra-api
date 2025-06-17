import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    DiskHealthIndicator,
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    HttpHealthIndicator,
    MemoryHealthIndicator,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AppConfigService } from '../../app-config/services/app-config.service';

@ApiTags('Health')
@Controller('health')
@UsePipes(new ValidationPipe({ transform: true }))
export class HealthController {
    constructor(
        private readonly appConfigService: AppConfigService,
        private readonly healthCheckService: HealthCheckService,
        private readonly typeOrmHealthIndicator: TypeOrmHealthIndicator,
        private readonly diskHealthIndicator: DiskHealthIndicator,
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
        private readonly httpHealthIndicator: HttpHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    public async checkHealth(): Promise<HealthCheckResult> {
        return await this.healthCheckService.check([
            async () => this.typeOrmHealthIndicator.pingCheck('database'),
            async () =>
                this.diskHealthIndicator.checkStorage('storage', {
                    thresholdPercent: this.appConfigService.health.diskStorageUsageThresholdInPercent / 100,
                    path: '/',
                }),
            async () =>
                this.memoryHealthIndicator.checkHeap(
                    'memory_heap',
                    this.appConfigService.health.memoryHeapUsageThresholdInMB * 1024 * 1024, // Convert MB to bytes
                ),
            async () =>
                this.httpHealthIndicator.pingCheck('pra-sync-api', this.appConfigService.health.pingCheckPraSyncApiUrl),
        ]);
    }
}
