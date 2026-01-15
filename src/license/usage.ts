import * as core from "@actions/core";

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
export async function reportUsage(event: UsageEvent): Promise<void> {
  // api-url is undocumented, used for internal testing only
  const apiUrl = core.getInput("api-url") || "https://previewkit.dev/api";
  const endpoint = `${apiUrl}/v1/usage`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PreviewKit-Action/1.0",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      core.warning(`Usage tracking failed: ${response.status} - ${errorText}`);
      return;
    }

    const result = (await response.json()) as { message?: string };
    core.info(`Usage event recorded: ${event.event} (${result.message || "success"})`);
  } catch (error) {
    // Don't fail the action if usage tracking fails
    core.warning(`Usage tracking error: ${error}`);
  }
}
