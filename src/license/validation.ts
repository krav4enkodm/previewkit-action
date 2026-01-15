import * as core from "@actions/core";

export interface LicenseLimits {
  maxConcurrentPreviews: number;
  maxPreviewsPerMonth: number;
}

export interface LicenseValidationResult {
  valid: boolean;
  tier: "free" | "team" | "business" | "enterprise";
  limits: LicenseLimits;
  message?: string;
  error?: string;
}

export interface LicenseValidationRequest {
  licenseKey?: string;
  repository: string;
  owner: string;
}

/**
 * Validate license key against the PreviewKit API.
 *
 * Returns license tier and limits. If no license key is provided,
 * returns free tier limits.
 */
export async function validateLicense(
  request: LicenseValidationRequest
): Promise<LicenseValidationResult> {
  // api-url is undocumented, used for internal testing only
  const apiUrl = core.getInput("api-url") || "https://previewkit.dev/api";
  const endpoint = `${apiUrl}/v1/license/validate`;

  core.info("Validating license...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PreviewKit-Action/1.0",
      },
      body: JSON.stringify({
        licenseKey: request.licenseKey || null,
        repository: request.repository,
        organization: request.owner,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      core.warning(`License API returned ${response.status}: ${errorText}`);

      // If API is unreachable, allow free tier usage
      if (response.status >= 500) {
        core.warning("License API unavailable, proceeding with free tier limits");
        return getFreeTierResult();
      }

      return {
        valid: false,
        tier: "free",
        limits: { maxConcurrentPreviews: 0, maxPreviewsPerMonth: 0 },
        error: `License validation failed: ${response.status}`,
      };
    }

    const result = (await response.json()) as LicenseValidationResult;

    if (result.valid) {
      core.info(`License valid: ${result.tier} tier`);
      core.info(
        `Limits: ${result.limits.maxConcurrentPreviews} concurrent, ${result.limits.maxPreviewsPerMonth}/month`
      );
    } else {
      core.warning(`License invalid: ${result.error || result.message}`);
    }

    return result;
  } catch (error) {
    // Network error - allow free tier usage to avoid blocking users
    core.warning(`License validation error: ${error}`);
    core.warning("Proceeding with free tier limits");
    return getFreeTierResult();
  }
}

/**
 * Get free tier result (used when no license key or API error).
 */
function getFreeTierResult(): LicenseValidationResult {
  return {
    valid: true,
    tier: "free",
    limits: {
      maxConcurrentPreviews: 3,
      maxPreviewsPerMonth: 50,
    },
    message: "Free tier - no license key provided",
  };
}

/**
 * Check if action should proceed based on license validation.
 */
export function shouldProceed(result: LicenseValidationResult): boolean {
  if (!result.valid) {
    return false;
  }

  // Check if limits are exhausted (0 means blocked)
  if (result.limits.maxConcurrentPreviews === 0) {
    return false;
  }

  return true;
}
