import { z } from 'zod';

declare class Logger {
    private context;
    private spinner;
    constructor(context: string);
    info(message: string): void;
    success(message: string): void;
    warn(message: string): void;
    error(message: string, error?: unknown): void;
    startSpinner(message: string): void;
    stopSpinner(success?: boolean, message?: string): void;
}

interface ConversionConfig {
    inputDir: string;
    outputFile: string;
    target: 'userscript' | 'vanilla';
    locale?: string;
    ignoredAssets?: string;
    minify?: boolean;
    beautify?: boolean;
    force?: boolean;
}
declare class ConversionContext {
    readonly config: ConversionConfig;
    readonly logger: Logger;
    state: Record<string, any>;
    constructor(config: ConversionConfig);
    set<T>(key: string, value: T): void;
    get<T>(key: string): T;
}

interface AssetMap {
    [path: string]: string;
}
interface ScriptContents {
    [path: string]: string;
}
interface ResourceResult {
    jsContents: ScriptContents;
    cssContents: ScriptContents;
}
interface ConversionResult {
    success: boolean;
    outputFile: string;
    target: string;
    extension: {
        name: string;
        version: string;
        description?: string;
    };
    stats: {
        jsFiles: number;
        cssFiles: number;
        backgroundScripts: number;
        outputSize: number;
    };
}

declare const ContentScriptSchema: z.ZodObject<{
    matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    js: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    css: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    run_at: z.ZodOptional<z.ZodEnum<["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]>>;
    all_frames: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    matches?: string[] | undefined;
    js?: string[] | undefined;
    css?: string[] | undefined;
    run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
    all_frames?: boolean | undefined;
}, {
    matches?: string[] | undefined;
    js?: string[] | undefined;
    css?: string[] | undefined;
    run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
    all_frames?: boolean | undefined;
}>;
declare const ManifestV2Schema: z.ZodObject<{
    manifest_version: z.ZodLiteral<2>;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    default_locale: z.ZodOptional<z.ZodString>;
    icons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    optional_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    content_scripts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        js: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        css: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        run_at: z.ZodOptional<z.ZodEnum<["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]>>;
        all_frames: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }>, "many">>;
    background: z.ZodOptional<z.ZodObject<{
        scripts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        persistent: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    }, {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    }>>;
    browser_action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
        default_icon: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }>>;
    page_action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
    }, {
        default_popup?: string | undefined;
    }>>;
    options_ui: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodString>;
        open_in_tab: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }>>;
    options_page: z.ZodOptional<z.ZodString>;
    web_accessible_resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    manifest_version: 2;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    } | undefined;
    browser_action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
    page_action?: {
        default_popup?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    options_page?: string | undefined;
    web_accessible_resources?: string[] | undefined;
}, {
    manifest_version: 2;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    } | undefined;
    browser_action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
    page_action?: {
        default_popup?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    options_page?: string | undefined;
    web_accessible_resources?: string[] | undefined;
}>;
declare const ManifestV3Schema: z.ZodObject<{
    manifest_version: z.ZodLiteral<3>;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    default_locale: z.ZodOptional<z.ZodString>;
    icons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    optional_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    host_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    content_scripts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        js: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        css: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        run_at: z.ZodOptional<z.ZodEnum<["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]>>;
        all_frames: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }>, "many">>;
    background: z.ZodOptional<z.ZodObject<{
        service_worker: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["module"]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    }, {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    }>>;
    action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
        default_icon: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }>>;
    options_ui: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodString>;
        open_in_tab: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }>>;
    web_accessible_resources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        resources: z.ZodArray<z.ZodString, "many">;
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        resources: string[];
        matches?: string[] | undefined;
    }, {
        resources: string[];
        matches?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    manifest_version: 3;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    web_accessible_resources?: {
        resources: string[];
        matches?: string[] | undefined;
    }[] | undefined;
    host_permissions?: string[] | undefined;
    action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
}, {
    manifest_version: 3;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    web_accessible_resources?: {
        resources: string[];
        matches?: string[] | undefined;
    }[] | undefined;
    host_permissions?: string[] | undefined;
    action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
}>;
declare const ManifestSchema: z.ZodUnion<[z.ZodObject<{
    manifest_version: z.ZodLiteral<2>;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    default_locale: z.ZodOptional<z.ZodString>;
    icons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    optional_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    content_scripts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        js: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        css: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        run_at: z.ZodOptional<z.ZodEnum<["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]>>;
        all_frames: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }>, "many">>;
    background: z.ZodOptional<z.ZodObject<{
        scripts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        persistent: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    }, {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    }>>;
    browser_action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
        default_icon: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }>>;
    page_action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
    }, {
        default_popup?: string | undefined;
    }>>;
    options_ui: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodString>;
        open_in_tab: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }>>;
    options_page: z.ZodOptional<z.ZodString>;
    web_accessible_resources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    manifest_version: 2;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    } | undefined;
    browser_action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
    page_action?: {
        default_popup?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    options_page?: string | undefined;
    web_accessible_resources?: string[] | undefined;
}, {
    manifest_version: 2;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        scripts?: string[] | undefined;
        persistent?: boolean | undefined;
    } | undefined;
    browser_action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
    page_action?: {
        default_popup?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    options_page?: string | undefined;
    web_accessible_resources?: string[] | undefined;
}>, z.ZodObject<{
    manifest_version: z.ZodLiteral<3>;
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    default_locale: z.ZodOptional<z.ZodString>;
    icons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    optional_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    host_permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    content_scripts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        js: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        css: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        run_at: z.ZodOptional<z.ZodEnum<["document_start", "document_end", "document_idle", "document-start", "document-end", "document-idle"]>>;
        all_frames: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }, {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }>, "many">>;
    background: z.ZodOptional<z.ZodObject<{
        service_worker: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["module"]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    }, {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    }>>;
    action: z.ZodOptional<z.ZodObject<{
        default_popup: z.ZodOptional<z.ZodString>;
        default_icon: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
    }, "strip", z.ZodTypeAny, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }, {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    }>>;
    options_ui: z.ZodOptional<z.ZodObject<{
        page: z.ZodOptional<z.ZodString>;
        open_in_tab: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }, {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    }>>;
    web_accessible_resources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        resources: z.ZodArray<z.ZodString, "many">;
        matches: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        resources: string[];
        matches?: string[] | undefined;
    }, {
        resources: string[];
        matches?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    manifest_version: 3;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    web_accessible_resources?: {
        resources: string[];
        matches?: string[] | undefined;
    }[] | undefined;
    host_permissions?: string[] | undefined;
    action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
}, {
    manifest_version: 3;
    name: string;
    version: string;
    description?: string | undefined;
    default_locale?: string | undefined;
    icons?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
    optional_permissions?: string[] | undefined;
    content_scripts?: {
        matches?: string[] | undefined;
        js?: string[] | undefined;
        css?: string[] | undefined;
        run_at?: "document_start" | "document_end" | "document_idle" | "document-start" | "document-end" | "document-idle" | undefined;
        all_frames?: boolean | undefined;
    }[] | undefined;
    background?: {
        type?: "module" | undefined;
        service_worker?: string | undefined;
    } | undefined;
    options_ui?: {
        page?: string | undefined;
        open_in_tab?: boolean | undefined;
    } | undefined;
    web_accessible_resources?: {
        resources: string[];
        matches?: string[] | undefined;
    }[] | undefined;
    host_permissions?: string[] | undefined;
    action?: {
        default_popup?: string | undefined;
        default_icon?: string | Record<string, string> | undefined;
    } | undefined;
}>]>;
interface NormalizedManifest {
    manifest_version: 2 | 3;
    name: string;
    version: string;
    description: string;
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
type ContentScript = z.infer<typeof ContentScriptSchema>;
type ManifestV2 = z.infer<typeof ManifestV2Schema>;
type ManifestV3 = z.infer<typeof ManifestV3Schema>;
type Manifest = z.infer<typeof ManifestSchema>;

declare function convertExtension(config: ConversionConfig): Promise<{
    success: boolean;
    outputFile: string;
    extension: {
        name: string;
        version: string;
        description: string;
    };
    stats: {
        jsFiles: number;
        cssFiles: number;
        assets: number;
    };
}>;

export { type AssetMap, type ContentScript, ContentScriptSchema, type ConversionConfig, ConversionContext, type ConversionResult, type Manifest, ManifestSchema, type ManifestV2, ManifestV2Schema, type ManifestV3, ManifestV3Schema, type NormalizedManifest, type ResourceResult, type ScriptContents, convertExtension };
