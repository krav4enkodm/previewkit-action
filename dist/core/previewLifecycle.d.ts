import { PreviewContext, CloudProvider } from "./context";
import { PreviewAdapter, PreviewResult } from "../adapters/PreviewAdapter";
/**
 * Register a preview adapter for a cloud provider.
 */
export declare function registerAdapter(cloud: CloudProvider, factory: () => PreviewAdapter): void;
/**
 * Create or update a preview environment.
 */
export declare function createPreview(context: PreviewContext): Promise<PreviewResult>;
/**
 * Destroy a preview environment.
 */
export declare function destroyPreview(context: PreviewContext): Promise<void>;
//# sourceMappingURL=previewLifecycle.d.ts.map