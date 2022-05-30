interface LoadOptions {
    input: string;
    content: { [file: string]: string };
    sourcemaps: { [file: string]: string };
    sourceRootResolution: string; // base path of the sources relative path of the map
}

interface SaveOptions {
    output: string;
    inline: boolean;        // deprecated: sourceMappingStorage === 'inline'
    absolutePath: boolean;  // deprecated: sourceMappingStorage === '[absolute-path]'
    sourceMappingStorage: 'inline' | '[absolute-path]' | '[base-path]' | '[relative-path]';
    sourcePathTemplate: '[absolute-path]' | '[relative-path]' | string;
    sourceRoot: string;
    excludeContent: boolean;
    existingContentOnly: boolean; // true
    flatten: 'full' | 'existing' | false
}

interface ChainOptions extends LoadOptions, SaveOptions {
}
