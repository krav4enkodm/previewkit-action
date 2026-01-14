export type PreviewState = "deploying" | "ready" | "failed" | "destroyed";
export interface CommentOptions {
    owner: string;
    repo: string;
    prNumber: number;
    serviceName: string;
    state: PreviewState;
    url?: string;
    error?: string;
    tier?: "free" | "team" | "business" | "enterprise";
}
/**
 * Create or update the preview comment on a PR.
 * Only maintains one comment per PR (updates if exists).
 */
export declare function upsertPreviewComment(options: CommentOptions): Promise<void>;
//# sourceMappingURL=comments.d.ts.map