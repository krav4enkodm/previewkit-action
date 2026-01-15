import * as core from "@actions/core";
import { PullRequestMetadata } from "../github/pullRequest";

export type CloudProvider = "azure" | "aws" | "gcp";

export interface PreviewContext {
  // Repository info
  repo: string;
  owner: string;
  prNumber: number;
  sha: string;

  // Service info
  serviceName: string;

  // Cloud provider
  cloud: CloudProvider;

  // Environment variables to inject
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
export function getActionInputs(): ActionInputs {
  const serviceName = core.getInput("service-name", { required: true });
  const cloudRaw = core.getInput("cloud") || "azure";

  // Validate cloud
  const validClouds: CloudProvider[] = ["azure", "aws", "gcp"];
  if (!validClouds.includes(cloudRaw as CloudProvider)) {
    throw new Error(`Invalid cloud: '${cloudRaw}'. Must be one of: ${validClouds.join(", ")}`);
  }

  return {
    serviceName,
    cloud: cloudRaw as CloudProvider,
  };
}

/**
 * Builds PreviewContext from PR metadata and action inputs.
 */
export function buildPreviewContext(pr: PullRequestMetadata, inputs: ActionInputs): PreviewContext {
  return {
    owner: pr.owner,
    repo: pr.repo,
    prNumber: pr.prNumber,
    sha: pr.sha,
    serviceName: inputs.serviceName,
    cloud: inputs.cloud,
    env: inputs.env ?? {},
  };
}
