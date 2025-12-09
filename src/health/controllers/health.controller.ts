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
import { MonitoringRequestPipe } from '../../monitoring/pipes';

@ApiTags('Health')
@Controller('health')
@UsePipes(MonitoringRequestPipe)
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
        try {
            return await this.healthCheckService.check([
                // Database check - critical for operation
                async () => this.typeOrmHealthIndicator.pingCheck('database', { timeout: 5000 }),

                // Disk storage check - warn if usage is high
                async () =>
                    this.diskHealthIndicator.checkStorage('storage', {
                        thresholdPercent: this.appConfigService.health.diskStorageUsageThresholdInPercent / 100,
                        path: '/',
                    }),

                // Memory heap check - warn if memory usage is high
                async () =>
                    this.memoryHealthIndicator.checkHeap(
                        'memoryHeap',
                        this.appConfigService.health.memoryHeapUsageThresholdInMB * 1024 * 1024,
                    ),

                // External API check - graceful degradation if unavailable
                async () => {
                    try {
                        return await this.httpHealthIndicator.pingCheck(
                            'praSyncApi',
                            this.appConfigService.health.pingCheckPraSyncApiUrl,
                            { timeout: 3000 },
                        );
                    } catch (error) {
                        // Don't fail health check if external API is down
                        console.warn('⚠️  PRA Sync API health check failed (non-critical):', error);
                        return {
                            praSyncApi: {
                                status: 'down',
                                message: 'External API unavailable',
                            },
                        };
                    }
                },
            ]);
        } catch (error) {
            console.error('❌ Health check failed:', error);
            throw error;
        }
    }

    @Get('ready')
    public async checkReadiness(): Promise<{ status: string }> {
        // Readiness probe - checks if app can handle traffic
        try {
            await this.typeOrmHealthIndicator.pingCheck('database', { timeout: 3000 });
            return { status: 'ready' };
        } catch (error) {
            console.error('❌ Readiness check failed:', error);
            throw error;
        }
    }

    @Get('live')
    public checkLiveness(): { status: string; uptime: number; memory: { used: number; total: number } } {
        // Liveness probe - checks if app is alive (lightweight)
        return {
            status: 'alive',
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            },
        };
    }
}
