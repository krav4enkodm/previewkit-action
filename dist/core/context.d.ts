import { PullRequestMetadata } from "../github/pullRequest";
export type ServiceType = "frontend" | "backend";
export type CloudProvider = "azure" | "aws" | "gcp";
export interface PreviewContext {
    repo: string;
    owner: string;
    prNumber: number;
    sha: string;
    serviceName: string;
    serviceType: ServiceType;
    runtime: string;
    cloud: CloudProvider;
    env: Record<string, string>;
    ttlHours?: number;
}
export interface ActionInputs {
    serviceName: string;
    serviceType: ServiceType;
    runtime: string;
    cloud: CloudProvider;
    ttlHours?: number;
    env?: Record<string, string>;
}
/**
 * Reads and validates action inputs.
 */
export declare function getActionInputs(): ActionInputs;
/**
 * Builds PreviewContext from PR metadata and action inputs.
 */
export declare function buildPreviewContext(pr: PullRequestMetadata, inputs: ActionInputs): PreviewContext;
//# sourceMappingURL=context.d.ts.map