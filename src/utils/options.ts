interface LoadOptions {
    input: string;
    content: string[];
    sourcemap: string[];
}

interface ChainOptions {
    base: string;
    output: string;
    inline: boolean;
    absolutePath: boolean;
    sourceMappingStorage: 'inline' | '[absolute-path]' | '[base-path]' | '[relative-path]';
    sourcePathTemplate: '[absolute-path]' | '[base-path]' | '[relative-path]' | string;
    includeContent: boolean;
    existingContentOnly: boolean; // true
    flatten: 'full' | 'existing' | false
}