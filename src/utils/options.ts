interface LoadOptions {
    input: string;
    content: string[];
    sourcemap: string[];
}

interface ChainOptions {
    base: string; // basr path of the sources relative path of the map
    output: string;
    inline: boolean;
    absolutePath: boolean;
    sourceMappingStorage: 'inline' | '[absolute-path]' | '[base-path]' | '[relative-path]';
    sourcePathTemplate: '[absolute-path]' | '[base-path]' | '[relative-path]' | string;
    sourceRoot: string;
    excludeContent: boolean;
    existingContentOnly: boolean; // true
    flatten: 'full' | 'existing' | false
}