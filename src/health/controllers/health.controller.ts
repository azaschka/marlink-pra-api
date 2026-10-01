import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from '../services/health.service';

/**
 * Health contract (see the R3.2 stability plan, section 4):
 * - GET /health/live: process answers (liveness and startup probes)
 * - GET /health/ready: database reachable (readiness probe); 503 otherwise
 * - GET /health: diagnostics with overallStatus healthy, degraded or unavailable; 503 only when unavailable
 * Responses are sent with their status code directly, without the exception filter, and are never written to
 * the system log or the monitoring tables.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOkResponse({ description: 'healthy or degraded' })
    @ApiServiceUnavailableResponse({ description: 'unavailable: the database is down or the service shuts down' })
    public async checkHealth(@Res({ passthrough: true }) response: Response) {
        const { httpStatus, body } = await this.healthService.report();
        response.status(httpStatus);

        return body;
    }

    @Get('ready')
    @ApiOkResponse({ description: 'ready to serve requests' })
    @ApiServiceUnavailableResponse({ description: 'the database is not reachable' })
    public async checkReadiness(@Res({ passthrough: true }) response: Response) {
        const { httpStatus, body } = await this.healthService.ready();
        response.status(httpStatus);

        return body;
    }

    @Get('live')
    @ApiOkResponse({ description: 'the process answers' })
    public checkLiveness(@Res({ passthrough: true }) response: Response) {
        const { httpStatus, body } = this.healthService.live();
        response.status(httpStatus);

        return body;
    }
}
