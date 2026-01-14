/**
 * Generates a deterministic, cloud-safe preview name.
 *
 * Format: <service>-pr-<number>-<hash>
 *
 * Rules:
 * - Lowercase
 * - Only alphanumeric and hyphens
 * - Must start with a letter (Azure requirement)
 * - No leading/trailing hyphens
 * - Max 63 characters (DNS label limit)
 * - Includes short hash to avoid AAD identity collisions on re-deploy
 */
export declare function getPreviewName(serviceName: string, prNumber: number, sha?: string): string;
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