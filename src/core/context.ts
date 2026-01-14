import * as core from "@actions/core";
import { PullRequestMetadata } from "../github/pullRequest";

export type ServiceType = "frontend" | "backend";
export type CloudProvider = "azure" | "aws" | "gcp";

export interface PreviewContext {
  // Repository info
  repo: string;
  owner: string;
  prNumber: number;
  sha: string;

  // Service info
  serviceName: string;
  serviceType: ServiceType;
  runtime: string;

  // Cloud provider
  cloud: CloudProvider;

  // Environment variables to inject
  env: Record<string, string>;

  // Optional TTL
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
export function getActionInputs(): ActionInputs {
  const serviceName = core.getInput("service-name", { required: true });
  const serviceTypeRaw = core.getInput("service-type", { required: true });
  const runtime = core.getInput("runtime", { required: true });
  const cloudRaw = core.getInput("cloud") || "azure";
  const ttlHoursRaw = core.getInput("ttl-hours");

  // Validate service-type
  if (serviceTypeRaw !== "frontend" && serviceTypeRaw !== "backend") {
    throw new Error(`Invalid service-type: '${serviceTypeRaw}'. Must be 'frontend' or 'backend'`);
  }

  // Validate cloud
  const validClouds: CloudProvider[] = ["azure", "aws", "gcp"];
  if (!validClouds.includes(cloudRaw as CloudProvider)) {
    throw new Error(`Invalid cloud: '${cloudRaw}'. Must be one of: ${validClouds.join(", ")}`);
  }

  // Parse TTL if provided
  let ttlHours: number | undefined;
  if (ttlHoursRaw) {
    ttlHours = parseInt(ttlHoursRaw, 10);
    if (isNaN(ttlHours) || ttlHours <= 0) {
      throw new Error(`Invalid ttl-hours: '${ttlHoursRaw}'. Must be a positive integer`);
    }
  }

  return {
    serviceName,
    serviceType: serviceTypeRaw as ServiceType,
    runtime,
    cloud: cloudRaw as CloudProvider,
    ttlHours,
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
    serviceType: inputs.serviceType,
    runtime: inputs.runtime,
    cloud: inputs.cloud,
    env: inputs.env ?? {},
    ttlHours: inputs.ttlHours,
  };
}
