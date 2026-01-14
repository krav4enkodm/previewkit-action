export type PullRequestAction = "opened" | "synchronize" | "closed" | "reopened";
export interface PullRequestMetadata {
    owner: string;
    repo: string;
    prNumber: number;
    sha: string;
    action: PullRequestAction;
    baseBranch: string;
    headBranch: string;
}
/**
 * Extracts Pull Request metadata from GitHub Actions context.
 * Returns null if not running in a PR context.
 */
export declare function getPullRequestMetadata(): PullRequestMetadata | null;
/**
 * Returns true if the current event should trigger a preview deployment.
 */
export declare function shouldDeploy(metadata: PullRequestMetadata): boolean;
/**
 * Returns true if the current event should trigger preview destruction.
 */
export declare function shouldDestroy(metadata: PullRequestMetadata): boolean;
//# sourceMappingURL=pullRequest.d.ts.map