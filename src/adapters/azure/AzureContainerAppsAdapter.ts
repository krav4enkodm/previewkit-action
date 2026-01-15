import * as core from "@actions/core";
import { ContainerAppsAPIClient, ContainerApp } from "@azure/arm-appcontainers";
import { PreviewAdapter, PreviewResult, PreviewStatus } from "../PreviewAdapter";
import { PreviewContext } from "../../core/context";
import { getPreviewName, getContainerName } from "../../core/naming";
import { AzureConfig, createContainerAppsClient, getAzureConfig } from "./auth";

export class AzureContainerAppsAdapter implements PreviewAdapter {
  private client: ContainerAppsAPIClient;
  private config: AzureConfig;

  constructor(config?: AzureConfig) {
    this.config = config ?? getAzureConfig();
    this.client = createContainerAppsClient(this.config);
  }

  async deployPreview(context: PreviewContext): Promise<PreviewResult> {
    const previewName = getPreviewName(context.serviceName, context.prNumber);
    const containerName = getContainerName(context.serviceName);

    core.info(`Deploying Container App: ${previewName}`);

    // Build container image reference
    const imageTag = context.sha.substring(0, 7);
    const image = core.getInput("image") || `${context.serviceName}:${imageTag}`;

    // Build environment variables
    const envVars = Object.entries(context.env).map(([name, value]) => ({
      name,
      value,
    }));

    // Add standard preview env vars
    envVars.push(
      { name: "PREVIEW_PR_NUMBER", value: String(context.prNumber) },
      { name: "PREVIEW_SHA", value: context.sha },
      { name: "PREVIEW_SERVICE", value: context.serviceName }
    );

    const containerApp: ContainerApp = {
      location: this.config.location,
      managedEnvironmentId: this.getEnvironmentId(),
      identity: this.getIdentityConfig(),
      configuration: {
        ingress: {
          external: true,
          targetPort: this.getTargetPort(),
          transport: "auto",
        },
        registries: this.getRegistryConfig(),
        secrets: this.getSecrets(),
      },
      template: {
        containers: [
          {
            name: containerName,
            image,
            env: envVars,
            resources: {
              cpu: 0.5,
              memory: "1Gi",
            },
          },
        ],
        scale: {
          minReplicas: 0,
          maxReplicas: 1,
        },
      },
    };

    // Deploy (create or update)
    const poller = await this.client.containerApps.beginCreateOrUpdate(
      this.config.resourceGroup,
      previewName,
      containerApp
    );

    core.info("Waiting for deployment to complete...");
    const result = await poller.pollUntilDone();

    // Access properties directly on ContainerApp (not under .properties)
    const fqdn = result.configuration?.ingress?.fqdn;
    if (!fqdn) {
      throw new Error("Deployment completed but no FQDN returned");
    }

    const url = `https://${fqdn}`;

    return {
      previewId: previewName,
      url,
    };
  }

  async destroyPreview(previewId: string): Promise<void> {
    core.info(`Destroying Container App: ${previewId}`);

    try {
      const poller = await this.client.containerApps.beginDelete(
        this.config.resourceGroup,
        previewId
      );
      await poller.pollUntilDone();
      core.info(`Container App deleted: ${previewId}`);
    } catch (error: unknown) {
      // Ignore 404 - resource already deleted
      if (this.isNotFoundError(error)) {
        core.info(`Container App already deleted: ${previewId}`);
        return;
      }
      throw error;
    }
  }

  async getPreviewStatus(previewId: string): Promise<PreviewStatus | null> {
    try {
      const app = await this.client.containerApps.get(this.config.resourceGroup, previewId);

      // Access properties directly on ContainerApp
      const fqdn = app.configuration?.ingress?.fqdn;
      const provisioningState = app.provisioningState;

      let state: PreviewStatus["state"] = "unknown";
      if (provisioningState === "Succeeded") {
        state = "ready";
      } else if (provisioningState === "Failed") {
        state = "failed";
      } else if (provisioningState === "InProgress") {
        state = "deploying";
      }

      return {
        previewId,
        url: fqdn ? `https://${fqdn}` : "",
        state,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private getEnvironmentId(): string {
    return `/subscriptions/${this.config.subscriptionId}/resourceGroups/${this.config.resourceGroup}/providers/Microsoft.App/managedEnvironments/${this.config.containerAppEnvironment}`;
  }

  private getTargetPort(): number {
    const portInput = core.getInput("port", { required: true });
    return parseInt(portInput, 10);
  }

  private getIdentityConfig():
    | {
        type: "SystemAssigned" | "UserAssigned" | "SystemAssigned,UserAssigned" | "None";
        userAssignedIdentities?: Record<string, Record<string, never>>;
      }
    | undefined {
    const identityId = core.getInput("azure-registry-identity");
    if (identityId) {
      // Use user-assigned managed identity for ACR pull
      return {
        type: "UserAssigned",
        userAssignedIdentities: { [identityId]: {} },
      };
    }
    // No managed identity - will use admin credentials or public image
    return undefined;
  }

  private getRegistryConfig():
    | Array<{
        server: string;
        identity?: string;
        username?: string;
        passwordSecretRef?: string;
      }>
    | undefined {
    const registryServer = core.getInput("azure-registry-server");
    if (!registryServer) {
      return undefined;
    }

    // Option 1: User-assigned managed identity (recommended)
    const identityId = core.getInput("azure-registry-identity");
    if (identityId) {
      core.info("Using user-assigned managed identity for ACR pull");
      return [{ server: registryServer, identity: identityId }];
    }

    // Option 2: Admin credentials
    const username = core.getInput("azure-registry-username");
    const password = core.getInput("azure-registry-password");
    if (username && password) {
      core.info("Using admin credentials for ACR pull");
      return [
        {
          server: registryServer,
          username,
          passwordSecretRef: "acr-password",
        },
      ];
    }

    // No credentials provided - assume image is publicly accessible
    core.warning("No ACR credentials provided. Image must be publicly accessible.");
    return undefined;
  }

  private getSecrets(): Array<{ name: string; value: string }> | undefined {
    const password = core.getInput("azure-registry-password");
    if (password) {
      return [{ name: "acr-password", value: password }];
    }
    return undefined;
  }

  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === "object" && "statusCode" in error) {
      return (error as { statusCode: number }).statusCode === 404;
    }
    return false;
  }
}
