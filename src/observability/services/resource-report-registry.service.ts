import { Injectable } from '@nestjs/common';

export type ResourceReportContributor = () => Record<string, unknown>;

/** Lets feature modules add their figures to the periodic resource report without a dependency on them. */
@Injectable()
export class ResourceReportRegistry {
    private readonly contributors = new Map<string, ResourceReportContributor>();

    public register(name: string, contributor: ResourceReportContributor): void {
        this.contributors.set(name, contributor);
    }

    public collect(): Record<string, unknown> {
        const report: Record<string, unknown> = {};

        for (const [name, contributor] of this.contributors) {
            try {
                report[name] = contributor();
            } catch (error) {
                report[name] = { error: error instanceof Error ? error.message : String(error) };
            }
        }

        return report;
    }
}
