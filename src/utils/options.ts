interface LoadOptions {
    base: string;
    input: string;
    output: string;
    content: string[];
    sourcemap: string[];
}

interface ChainOptions {
    inline: boolean;
    absolutePath: boolean;
    sourcePathTemplate: string;
    includeContent: boolean;
    existingContentOnly: boolean; // true
    flatten: boolean; // true
}