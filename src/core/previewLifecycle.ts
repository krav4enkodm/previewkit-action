import * as core from "@actions/core";
import { PreviewContext, CloudProvider } from "./context";
import { getPreviewName } from "./naming";
import { PreviewAdapter, PreviewResult } from "../adapters/PreviewAdapter";

// Adapter registry - populated at runtime
const adapters: Map<CloudProvider, () => PreviewAdapter> = new Map();

/**
 * Register a preview adapter for a cloud provider.
 */
export function registerAdapter(cloud: CloudProvider, factory: () => PreviewAdapter): void {
  adapters.set(cloud, factory);
}

/**
 * Get the adapter for the specified cloud provider.
 */
function getAdapter(cloud: CloudProvider): PreviewAdapter {
  const factory = adapters.get(cloud);
  if (!factory) {
    const available = Array.from(adapters.keys()).join(", ") || "none";
    throw new Error(`No adapter registered for cloud '${cloud}'. Available: ${available}`);
  }
  return factory();
}

/**
 * Validate preview context before operations.
 */
function validateContext(context: PreviewContext): void {
  if (!context.serviceName) {
    throw new Error("PreviewContext: serviceName is required");
  }
  if (!context.prNumber || context.prNumber <= 0) {
    throw new Error("PreviewContext: prNumber must be a positive integer");
  }
  if (!context.sha) {
    throw new Error("PreviewContext: sha is required");
  }
  if (!context.cloud) {
    throw new Error("PreviewContext: cloud provider is required");
  }
}

/**
 * Create or update a preview environment.
 */
export async function createPreview(context: PreviewContext): Promise<PreviewResult> {
  validateContext(context);

  const previewName = getPreviewName(context.serviceName, context.prNumber);
  core.info(`Creating/updating preview: ${previewName}`);
  core.info(`  Cloud: ${context.cloud}`);
  core.info(`  Service: ${context.serviceName} (${context.serviceType})`);
  core.info(`  Commit: ${context.sha.substring(0, 7)}`);

  const adapter = getAdapter(context.cloud);

  try {
    const result = await adapter.deployPreview(context);

    core.info(`Preview deployed successfully`);
    core.info(`  ID: ${result.previewId}`);
    core.info(`  URL: ${result.url}`);

    // Set outputs
    core.setOutput("preview-url", result.url);
    core.setOutput("preview-id", result.previewId);

    return result;
  } catch (error) {
    core.error(`Failed to deploy preview: ${previewName}`);
    throw error;
  }
}

/**
 * Destroy a preview environment.
 */
export async function destroyPreview(context: PreviewContext): Promise<void> {
  validateContext(context);

  const previewId = getPreviewName(context.serviceName, context.prNumber);
  core.info(`Destroying preview: ${previewId}`);

  const adapter = getAdapter(context.cloud);

  try {
    await adapter.destroyPreview(previewId);
    core.info(`Preview destroyed successfully: ${previewId}`);
  } catch (error) {
    core.error(`Failed to destroy preview: ${previewId}`);
    throw error;
  }
}
