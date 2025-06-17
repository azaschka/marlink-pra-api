import {
    DiskHealthIndicator,
    HealthCheckResult,
    HealthCheckService,
    HttpHealthIndicator,
    MemoryHealthIndicator,
    TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AppConfigService } from '../../app-config/services/app-config.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    let appConfigService: AppConfigService;
    let healthCheckService: HealthCheckService;
    let typeOrmHealthIndicator: TypeOrmHealthIndicator;
    let diskHealthIndicator: DiskHealthIndicator;
    let memoryHealthIndicator: MemoryHealthIndicator;
    let httpHealthIndicator: HttpHealthIndicator;
    let controller: HealthController;

    beforeEach(() => {
        appConfigService = mockAppConfigService();
        healthCheckService = mockHealthCheckService();
        typeOrmHealthIndicator = mockTypeOrmHealthIndicator();
        diskHealthIndicator = mockDiskHealthIndicator();
        memoryHealthIndicator = mockMemoryHealthIndicator();
        httpHealthIndicator = mockHttpHealthIndicator();

        controller = new HealthController(
            appConfigService,
            healthCheckService,
            typeOrmHealthIndicator,
            diskHealthIndicator,
            memoryHealthIndicator,
            httpHealthIndicator,
        );
    });

    describe('checkHealth', () => {
        it('should call health check once', async () => {
            const expectedResult = {} as HealthCheckResult;
            const healthCheckServiceCheckMethod = jest
                .spyOn(healthCheckService, 'check')
                .mockResolvedValue(expectedResult);

            const result = await controller.checkHealth();

            expect(result).toBe(expectedResult);
            expect(healthCheckServiceCheckMethod).toHaveBeenCalledTimes(1);
        });
    });
});

function mockAppConfigService(): AppConfigService {
    const service = {
        health: {
            diskStorageUsageThresholdInPercent: 80,
            memoryHeapUsageThresholdInMB: 512,
        },
    } as unknown as AppConfigService;

    return service;
}

function mockHealthCheckService() {
    return {
        check: jest.fn(),
    } as unknown as HealthCheckService;
}

function mockTypeOrmHealthIndicator() {
    return {} as TypeOrmHealthIndicator;
}

function mockDiskHealthIndicator() {
    return {} as DiskHealthIndicator;
}

function mockMemoryHealthIndicator() {
    return {} as MemoryHealthIndicator;
}

function mockHttpHealthIndicator() {
    return {} as HttpHealthIndicator;
}
