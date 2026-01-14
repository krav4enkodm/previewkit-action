import * as core from "@actions/core";
import { getPullRequestMetadata, shouldDeploy, shouldDestroy } from "./github/pullRequest";
import { getActionInputs, buildPreviewContext } from "./core/context";
import { createPreview, destroyPreview, registerAdapter } from "./core/previewLifecycle";
import { upsertPreviewComment } from "./github/comments";
import { AzureContainerAppsAdapter } from "./adapters/azure/AzureContainerAppsAdapter";
import { validateLicense, shouldProceed, LicenseValidationResult, reportUsage } from "./license";
import { getPreviewName } from "./core/naming";

// Register available adapters
registerAdapter("azure", () => new AzureContainerAppsAdapter());

async function run(): Promise<void> {
  try {
    core.info("PreviewKit Action started");

    // Get PR metadata
    const prMetadata = getPullRequestMetadata();
    if (!prMetadata) {
      core.info("Not a pull_request event or unhandled action, skipping");
      return;
    }

    // Get and validate action inputs
    const inputs = getActionInputs();

    // Validate license before proceeding
    const licenseKey = core.getInput("license-key");
    const license = await validateLicense({
      licenseKey: licenseKey || undefined,
      repository: `${prMetadata.owner}/${prMetadata.repo}`,
      owner: prMetadata.owner,
      serviceType: inputs.serviceType,
    });

    if (!shouldProceed(license)) {
      core.setFailed(`License validation failed: ${license.error || "Invalid license"}`);
      return;
    }

    // Set license info as output for visibility
    core.setOutput("license-tier", license.tier);

    // Build preview context
    const context = buildPreviewContext(prMetadata, inputs);

    // Handle PR events
    if (shouldDeploy(prMetadata)) {
      await handleDeploy(context, license);
    } else if (shouldDestroy(prMetadata)) {
      await handleDestroy(context);
    } else {
      core.info(`No action needed for PR event: ${prMetadata.action}`);
    }

    core.info("PreviewKit Action completed");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

async function handleDeploy(
  context: Parameters<typeof createPreview>[0],
  license: LicenseValidationResult
): Promise<void> {
  // Post "deploying" comment with tier info
  await upsertPreviewComment({
    owner: context.owner,
    repo: context.repo,
    prNumber: context.prNumber,
    serviceName: context.serviceName,
    state: "deploying",
    tier: license.tier,
  });

  try {
    // Deploy preview
    const result = await createPreview(context);

    // Report usage to API
    const previewName = getPreviewName(context.serviceName, context.prNumber);
    await reportUsage({
      event: "deploy",
      previewName,
      repository: `${context.owner}/${context.repo}`,
      organization: context.owner,
      serviceName: context.serviceName,
      prNumber: context.prNumber,
      sha: context.sha,
      url: result.url,
    });

    // Update comment with success
    await upsertPreviewComment({
      owner: context.owner,
      repo: context.repo,
      prNumber: context.prNumber,
      serviceName: context.serviceName,
      state: "ready",
      url: result.url,
      tier: license.tier,
    });
  } catch (error) {
    // Update comment with failure
    await upsertPreviewComment({
      owner: context.owner,
      repo: context.repo,
      prNumber: context.prNumber,
      serviceName: context.serviceName,
      state: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function handleDestroy(context: Parameters<typeof destroyPreview>[0]): Promise<void> {
  try {
    await destroyPreview(context);

    // Report usage to API
    const previewName = getPreviewName(context.serviceName, context.prNumber);
    await reportUsage({
      event: "destroy",
      previewName,
      repository: `${context.owner}/${context.repo}`,
      organization: context.owner,
      serviceName: context.serviceName,
      prNumber: context.prNumber,
    });

    // Update comment
    await upsertPreviewComment({
      owner: context.owner,
      repo: context.repo,
      prNumber: context.prNumber,
      serviceName: context.serviceName,
      state: "destroyed",
    });
  } catch (error) {
    core.warning(`Failed to destroy preview: ${error}`);
    // Don't fail the action on destroy errors - the PR is closing anyway
  }
}

run();
