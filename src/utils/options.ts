interface LoadOptions {
    input: string;
    content: string[];
    sourcemap: string[];
}

interface ReadOptions {
    sourceRootResolution: string; // base path of the sources relative path of the map
}

interface WriteOptions {
    output: string;
    inline: boolean;        // deprecated
    absolutePath: boolean;
    sourceMappingStorage: 'inline' | '[absolute-path]' | '[base-path]' | '[relative-path]';
    sourcePathTemplate: '[absolute-path]' | '[relative-path]' | string;
    sourceRoot: string;
    excludeContent: boolean;
    existingContentOnly: boolean; // true
    flatten: 'full' | 'existing' | false
}

interface ChainOptions extends ReadOptions, WriteOptions {
}
