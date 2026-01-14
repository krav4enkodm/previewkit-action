import { PreviewAdapter, PreviewResult, PreviewStatus } from "../PreviewAdapter";
import { PreviewContext } from "../../core/context";
import { AzureConfig } from "./auth";
export declare class AzureContainerAppsAdapter implements PreviewAdapter {
    private client;
    private config;
    constructor(config?: AzureConfig);
    deployPreview(context: PreviewContext): Promise<PreviewResult>;
    destroyPreview(previewId: string): Promise<void>;
    getPreviewStatus(previewId: string): Promise<PreviewStatus | null>;
    private getEnvironmentId;
    private getTargetPort;
    private getIdentityConfig;
    private getRegistryConfig;
    private getSecrets;
    private isNotFoundError;
}
//# sourceMappingURL=AzureContainerAppsAdapter.d.ts.map