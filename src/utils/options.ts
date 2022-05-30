interface LoadOptions {
    input: string;
    content: { [file: string]: string };
    sourcemaps: { [file: string]: string };
    sourceRootResolution: string; // base path of the relative sources path in the map
}

interface SaveOptions {
    output: string;
    inline: boolean;        // deprecated: sourceMappingURL === 'inline'
    absolutePath: boolean;  // deprecated: sourceMappingURL === '[absolute-path]'
    sourceMappingURL: 'inline' | '[absolute-path]' | '[base-path]' | '[relative-path]';
    sourcePathTemplate: '[absolute-path]' | '[relative-path]' | string;
    sourceRoot: string;
    excludeContent: boolean;
    flatten: 'full' | 'existing' | false
}

interface ChainOptions extends LoadOptions, SaveOptions {
}
