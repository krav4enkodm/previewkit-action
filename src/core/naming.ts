/**
 * Generates a deterministic, cloud-safe preview name.
 *
 * Format: <service>-pr-<number>
 *
 * Rules:
 * - Lowercase
 * - Only alphanumeric and hyphens
 * - Must start with a letter (Azure requirement)
 * - No leading/trailing hyphens
 * - Max 63 characters (DNS label limit)
 *
 * Note: SHA is NOT included in the name. This allows the same Container App
 * to be updated on each push instead of creating a new one. To avoid managed
 * identity issues, use a user-assigned managed identity for ACR pull.
 */
export function getPreviewName(serviceName: string, prNumber: number): string {
  if (!serviceName || serviceName.trim() === "") {
    throw new Error("Service name cannot be empty");
  }

  if (prNumber <= 0 || !Number.isInteger(prNumber)) {
    throw new Error("PR number must be a positive integer");
  }

  // Normalize service name
  let normalized = serviceName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  if (normalized === "") {
    throw new Error("Service name must contain at least one alphanumeric character");
  }

  // Azure Container Apps require names to start with a letter
  // If it starts with a number, prefix with 'svc-'
  if (/^[0-9]/.test(normalized)) {
    normalized = `svc-${normalized}`;
  }

  const suffix = `-pr-${prNumber}`;
  const maxServiceLength = 63 - suffix.length;

  // Truncate if necessary
  const truncated = normalized.substring(0, maxServiceLength).replace(/-$/, ""); // Remove trailing hyphen after truncation

  return `${truncated}${suffix}`;
}

/**
 * Normalizes a service name for use as a container name.
 * Container names have similar restrictions to resource names.
 */
export function getContainerName(serviceName: string): string {
  let normalized = serviceName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Must start with a letter
  if (/^[0-9]/.test(normalized)) {
    normalized = `svc-${normalized}`;
  }

  // Max 63 chars for container names
  return normalized.substring(0, 63).replace(/-$/, "");
}

/**
 * Extracts the PR number from a preview name.
 * Returns null if the name doesn't match the expected format.
 */
export function parsePrNumber(previewName: string): number | null {
  const match = previewName.match(/-pr-(\d+)$/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}
