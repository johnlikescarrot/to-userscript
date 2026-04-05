import { z } from 'zod';

export const ContentScriptSchema = z.object({
  matches: z.array(z.string()).optional(),
  js: z.array(z.string()).optional(),
  css: z.array(z.string()).optional(),
  run_at: z.enum(['document_start', 'document_end', 'document_idle', 'document-start', 'document-end', 'document-idle']).optional(),
  all_frames: z.boolean().optional(),
});

export const ManifestV2Schema = z.object({
  manifest_version: z.literal(2),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  default_locale: z.string().optional(),
  icons: z.record(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  optional_permissions: z.array(z.string()).optional(),
  content_scripts: z.array(ContentScriptSchema).optional(),
  background: z.object({
    scripts: z.array(z.string()).optional(),
    persistent: z.boolean().optional(),
  }).optional(),
  browser_action: z.object({
    default_popup: z.string().optional(),
    default_icon: z.union([z.string(), z.record(z.string())]).optional(),
  }).optional(),
  page_action: z.object({
    default_popup: z.string().optional(),
  }).optional(),
  options_ui: z.object({
    page: z.string().optional(),
    open_in_tab: z.boolean().optional(),
  }).optional(),
  options_page: z.string().optional(),
  web_accessible_resources: z.array(z.string()).optional(),
});

export const ManifestV3Schema = z.object({
  manifest_version: z.literal(3),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  default_locale: z.string().optional(),
  icons: z.record(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  optional_permissions: z.array(z.string()).optional(),
  host_permissions: z.array(z.string()).optional(),
  content_scripts: z.array(ContentScriptSchema).optional(),
  background: z.object({
    service_worker: z.string().optional(),
    type: z.enum(['module']).optional(),
  }).optional(),
  action: z.object({
    default_popup: z.string().optional(),
    default_icon: z.union([z.string(), z.record(z.string())]).optional(),
  }).optional(),
  options_ui: z.object({
    page: z.string().optional(),
    open_in_tab: z.boolean().optional(),
  }).optional(),
  side_panel: z.object({
    default_path: z.string().optional(),
  }).optional(),
  web_accessible_resources: z.array(z.object({
    resources: z.array(z.string()),
    matches: z.array(z.string()).optional(),
  })).optional(),
});

export const ManifestSchema = z.union([ManifestV2Schema, ManifestV3Schema]);

export interface NormalizedManifest {
  manifest_version: 2 | 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  icons: Record<string, string>;
  content_scripts: z.infer<typeof ContentScriptSchema>[];
  action: {
    default_popup?: string;
    default_icon?: string | Record<string, string>;
  };
  options_page?: string;
  background_scripts: string[];
  web_accessible_resources: string[];
  raw: any;
}

export type ContentScript = z.infer<typeof ContentScriptSchema>;
export type ManifestV2 = z.infer<typeof ManifestV2Schema>;
export type ManifestV3 = z.infer<typeof ManifestV3Schema>;
export type Manifest = z.infer<typeof ManifestSchema>;
