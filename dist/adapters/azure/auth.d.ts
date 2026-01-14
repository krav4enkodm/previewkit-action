import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
/**
 * Azure authentication configuration.
 * Uses OIDC (federated identity) when running in GitHub Actions.
 * Falls back to DefaultAzureCredential for local development.
 */
export interface AzureConfig {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    containerAppEnvironment: string;
}
/**
 * Read Azure configuration from action inputs.
 */
export declare function getAzureConfig(): AzureConfig;
/**
 * Create an authenticated Azure Container Apps client.
 * Uses OIDC when ACTIONS_ID_TOKEN_REQUEST_TOKEN is set.
 */
export declare function createContainerAppsClient(config: AzureConfig): ContainerAppsAPIClient;
//# sourceMappingURL=auth.d.ts.map