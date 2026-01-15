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
export declare function validateLicense(request: LicenseValidationRequest): Promise<LicenseValidationResult>;
/**
 * Check if action should proceed based on license validation.
 */
export declare function shouldProceed(result: LicenseValidationResult): boolean;
//# sourceMappingURL=validation.d.ts.map