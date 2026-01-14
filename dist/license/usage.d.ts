export interface UsageEvent {
    event: "deploy" | "destroy";
    previewName: string;
    repository: string;
    organization: string;
    serviceName: string;
    prNumber: number;
    sha?: string;
    url?: string;
}
/**
 * Report a usage event to the PreviewKit API.
 * This is used for tracking and enforcing limits.
 */
export declare function reportUsage(event: UsageEvent): Promise<void>;
//# sourceMappingURL=usage.d.ts.map