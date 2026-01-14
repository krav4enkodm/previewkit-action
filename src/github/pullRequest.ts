import * as github from "@actions/github";
import * as core from "@actions/core";

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
export function getPullRequestMetadata(): PullRequestMetadata | null {
  const { context } = github;

  // Only handle pull_request events
  if (context.eventName !== "pull_request") {
    core.warning(`Event '${context.eventName}' is not a pull_request event`);
    return null;
  }

  const payload = context.payload;

  // Validate PR payload exists
  if (!payload.pull_request) {
    core.warning("No pull_request payload found");
    return null;
  }

  const pr = payload.pull_request;
  const action = payload.action as PullRequestAction;

  // Validate action is one we handle
  const validActions: PullRequestAction[] = ["opened", "synchronize", "closed", "reopened"];
  if (!validActions.includes(action)) {
    core.warning(`Unhandled pull_request action: ${action}`);
    return null;
  }

  const metadata: PullRequestMetadata = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    prNumber: pr.number,
    sha: pr.head.sha,
    action,
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
  };

  // Log extracted data
  core.info("Pull Request metadata:");
  core.info(`  Owner: ${metadata.owner}`);
  core.info(`  Repo: ${metadata.repo}`);
  core.info(`  PR #${metadata.prNumber}`);
  core.info(`  SHA: ${metadata.sha.substring(0, 7)}`);
  core.info(`  Action: ${metadata.action}`);
  core.info(`  Branch: ${metadata.headBranch} → ${metadata.baseBranch}`);

  return metadata;
}

/**
 * Returns true if the current event should trigger a preview deployment.
 */
export function shouldDeploy(metadata: PullRequestMetadata): boolean {
  return (
    metadata.action === "opened" ||
    metadata.action === "synchronize" ||
    metadata.action === "reopened"
  );
}

/**
 * Returns true if the current event should trigger preview destruction.
 */
export function shouldDestroy(metadata: PullRequestMetadata): boolean {
  return metadata.action === "closed";
}
