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
export declare function getPreviewName(serviceName: string, prNumber: number): string;
/**
 * Normalizes a service name for use as a container name.
 * Container names have similar restrictions to resource names.
 */
export declare function getContainerName(serviceName: string): string;
/**
 * Extracts the PR number from a preview name.
 * Returns null if the name doesn't match the expected format.
 */
export declare function parsePrNumber(previewName: string): number | null;
//# sourceMappingURL=naming.d.ts.map