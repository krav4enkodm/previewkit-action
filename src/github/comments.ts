import * as core from "@actions/core";
import * as github from "@actions/github";

const COMMENT_MARKER = "<!-- previewkit-comment -->";

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
 * Build the comment body based on preview state.
 */
function buildCommentBody(options: CommentOptions): string {
  const { serviceName, state, url, error } = options;
  const lines: string[] = [COMMENT_MARKER];

  switch (state) {
    case "deploying":
      lines.push(`## ⏳ Preview Deploying`);
      lines.push("");
      lines.push(`**Service:** \`${serviceName}\``);
      lines.push("");
      lines.push("Deployment in progress...");
      break;

    case "ready":
      lines.push(`## ✅ Preview Ready`);
      lines.push("");
      lines.push(`**Service:** \`${serviceName}\``);
      lines.push("");
      if (url) {
        lines.push(`🔗 **[Open Preview](${url})**`);
        lines.push("");
        lines.push(`\`\`\``);
        lines.push(url);
        lines.push(`\`\`\``);
      }
      break;

    case "failed":
      lines.push(`## ❌ Preview Failed`);
      lines.push("");
      lines.push(`**Service:** \`${serviceName}\``);
      lines.push("");
      if (error) {
        lines.push("```");
        lines.push(error);
        lines.push("```");
      }
      break;

    case "destroyed":
      lines.push(`## 🗑️ Preview Destroyed`);
      lines.push("");
      lines.push(`**Service:** \`${serviceName}\``);
      lines.push("");
      lines.push("The preview environment has been cleaned up.");
      break;
  }

  lines.push("");
  lines.push(`---`);

  const tierBadge = options.tier === "free" ? " • Free tier" : "";
  lines.push(
    `<sub>Deployed by [PreviewKit](https://previewkit.dev)${tierBadge}</sub>`
  );

  return lines.join("\n");
}

/**
 * Find existing PreviewKit comment on a PR.
 */
async function findExistingComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<number | null> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existingComment = comments.find((comment) => comment.body?.includes(COMMENT_MARKER));

  return existingComment?.id ?? null;
}

/**
 * Create or update the preview comment on a PR.
 * Only maintains one comment per PR (updates if exists).
 */
export async function upsertPreviewComment(options: CommentOptions): Promise<void> {
  const token = core.getInput("github-token") || process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning("No GitHub token available, skipping PR comment");
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo, prNumber } = options;
  const body = buildCommentBody(options);

  try {
    const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);

    if (existingCommentId) {
      // Update existing comment
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingCommentId,
        body,
      });
      core.info(`Updated PR comment #${existingCommentId}`);
    } else {
      // Create new comment
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      core.info(`Created PR comment #${data.id}`);
    }
  } catch (error) {
    core.warning(`Failed to update PR comment: ${error}`);
    // Don't fail the action if commenting fails
  }
}
