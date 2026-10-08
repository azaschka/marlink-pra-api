import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { HealthContributorRegistry } from './services/health-contributor-registry.service';
import { ResourceReportRegistry } from './services/resource-report-registry.service';
import { ResourceReporterService } from './services/resource-reporter.service';
import { RuntimeMetricsService } from './services/runtime-metrics.service';

@Global()
@Module({
    imports: [AppConfigModule],
    providers: [RuntimeMetricsService, ResourceReportRegistry, ResourceReporterService, HealthContributorRegistry],
    exports: [RuntimeMetricsService, ResourceReportRegistry, HealthContributorRegistry],
})
export class ObservabilityModule {}
