import { PullRequestMetadata } from "../github/pullRequest";
export type CloudProvider = "azure" | "aws" | "gcp";
export interface PreviewContext {
    repo: string;
    owner: string;
    prNumber: number;
    sha: string;
    serviceName: string;
    cloud: CloudProvider;
    env: Record<string, string>;
}
export interface ActionInputs {
    serviceName: string;
    cloud: CloudProvider;
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