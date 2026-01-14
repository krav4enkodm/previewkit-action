import * as core from "@actions/core";
import { DefaultAzureCredential } from "@azure/identity";
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
export function getAzureConfig(): AzureConfig {
  const subscriptionId = core.getInput("azure-subscription-id", {
    required: true,
  });
  const resourceGroup = core.getInput("azure-resource-group", {
    required: true,
  });
  const location = core.getInput("azure-location") || "eastus";
  const containerAppEnvironment = core.getInput("azure-container-app-environment", {
    required: true,
  });

  return {
    subscriptionId,
    resourceGroup,
    location,
    containerAppEnvironment,
  };
}

/**
 * Create an authenticated Azure Container Apps client.
 * Uses OIDC when ACTIONS_ID_TOKEN_REQUEST_TOKEN is set.
 */
export function createContainerAppsClient(config: AzureConfig): ContainerAppsAPIClient {
  // DefaultAzureCredential automatically handles:
  // - OIDC in GitHub Actions (via federated identity)
  // - Managed Identity in Azure
  // - Azure CLI credentials locally
  const credential = new DefaultAzureCredential();

  return new ContainerAppsAPIClient(credential, config.subscriptionId);
}
