import { PreviewContext } from "../core/context";

export interface PreviewResult {
  previewId: string;
  url: string;
}

/**
 * Cloud-agnostic adapter interface for preview environments.
 *
 * Implementations must:
 * - Be idempotent
 * - Be safe to retry
 * - Operate within a pre-defined scope (resource group / project)
 *
 * Implementations must NOT:
 * - Create networks
 * - Manage IAM beyond required permissions
 * - Provision databases
 * - Orchestrate other services
 */
export interface PreviewAdapter {
  /**
   * Deploy a preview environment for the given context.
   * Should be idempotent - calling twice with same context updates the existing preview.
   */
  deployPreview(context: PreviewContext): Promise<PreviewResult>;

  /**
   * Destroy a preview environment.
   * Should be safe to call even if the preview doesn't exist.
   */
  destroyPreview(previewId: string): Promise<void>;

  /**
   * Check if a preview environment exists and is healthy.
   * Returns null if the preview doesn't exist.
   */
  getPreviewStatus?(previewId: string): Promise<PreviewStatus | null>;
}

export interface PreviewStatus {
  previewId: string;
  url: string;
  state: "deploying" | "ready" | "failed" | "unknown";
  createdAt?: Date;
}
