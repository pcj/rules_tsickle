
import * as path from 'path';
import ts from 'typescript';
import { TsickleHost, TsickleHostConfig } from './tsicklehost';


/**
 * CompilerHost implements ts.CompilerHost according a hybrid of rules_typescript
 * and tscc.
 */
export class CompilerHost extends TsickleHost implements ts.CompilerHost {
    constructor(
        tsickleHostConfig: TsickleHostConfig,
        private compilerOptions: ts.CompilerOptions,
        private delegate: ts.CompilerHost,
        private hostLogger: Console = console,
    ) {
        super(tsickleHostConfig, hostLogger);

        if (this.delegate.getSourceFileByPath) {
            this.getSourceFileByPath = delegate.getSourceFileByPath!.bind(delegate);
        }
        // getCancelationToken is an optional method on the delegate. If we
        // unconditionally implement the method, we will be forced to return null,
        // in the absense of the delegate method. That won't match the return type.
        // Instead, we optionally set a function to a field with the same name.
        if (this.delegate.getCancellationToken) {
            this.getCancellationToken = delegate.getCancellationToken!.bind(delegate);
        }
        this.writeFile = delegate.writeFile!.bind(delegate);
        if (this.delegate.readDirectory) {
            this.readDirectory = delegate.readDirectory!.bind(delegate);
        }
        if (this.delegate.resolveModuleNames) {
            this.resolveModuleNames = delegate.resolveModuleNames!.bind(delegate);
        }
        if (this.delegate.getModuleResolutionCache) {
            this.getModuleResolutionCache = delegate.getModuleResolutionCache!.bind(delegate);
        }
        if (this.delegate.resolveTypeReferenceDirectives) {
            this.resolveTypeReferenceDirectives = delegate.resolveTypeReferenceDirectives!.bind(delegate);
        }
        if (this.delegate.resolveModuleNameLiterals) {
            this.resolveModuleNameLiterals = delegate.resolveModuleNameLiterals!.bind(delegate);
        }
        if (this.delegate.resolveTypeReferenceDirectiveReferences) {
            this.resolveTypeReferenceDirectiveReferences = delegate.resolveTypeReferenceDirectiveReferences!.bind(delegate);
        }
        if (this.delegate.getEnvironmentVariable) {
            this.getEnvironmentVariable = delegate.getEnvironmentVariable!.bind(delegate);
        }
        if (this.delegate.hasInvalidatedResolutions) {
            this.hasInvalidatedResolutions = delegate.hasInvalidatedResolutions!.bind(delegate);
        }
        if (this.delegate.createHash) {
            this.createHash = delegate.createHash!.bind(delegate);
        }
        if (this.delegate.getParsedCommandLine) {
            this.getParsedCommandLine = delegate.getParsedCommandLine!.bind(delegate);
        }
        if (this.delegate.jsDocParsingMode) {
            this.jsDocParsingMode = delegate.jsDocParsingMode;
        }
        if (this.delegate.trace) {
            this.trace = delegate.trace!.bind(delegate);
        }
        if (this.delegate.directoryExists) {
            this.directoryExists = delegate.directoryExists!.bind(delegate);
        }
        if (this.delegate.getDirectories) {
            this.getDirectories = delegate.getDirectories!.bind(delegate);
        }
    }

    // *********************************************************
    // Inherited API
    // *********************************************************

    /**
     * @override TsickleHost
     */
    get options(): ts.CompilerOptions {
        return this.compilerOptions;
    };

    protected override compilerHost: ts.CompilerHost = this;

    // *********************************************************
    // Public API
    // *********************************************************

    /**
     * @override ts.CompilerHost
     */
    getSourceFile(fileName: string, languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): ts.SourceFile | undefined {
        return this.delegate.getSourceFile(fileName, languageVersionOrOptions, onError);
    }

    /**
     * @override ts.CompilerHost
     */
    getSourceFileByPath?(fileName: string, path: ts.Path, languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): ts.SourceFile | undefined;

    /**
     * Delegated.
     * 
     * @override ts.CompilerHost
     */
    getCancellationToken?(): ts.CancellationToken;

    /**
     * @override ts.CompilerHost
     */
    getDefaultLibFileName(options: ts.CompilerOptions): string {
        if (this.cfg.nodeModulesPrefix) {
            return path.join(
                this.cfg.nodeModulesPrefix, 'typescript/lib',
                ts.getDefaultLibFileName({ target: ts.ScriptTarget.ES5 }));
        }
        return this.delegate.getDefaultLibFileName(options);
    }

    /**
     * @override ts.CompilerHost
     */
    getDefaultLibLocation?(): string {
        // Since we override getDefaultLibFileName, we must also provide the
        // directory containing the file. Otherwise TypeScript looks in
        // C:\lib.xxx.d.ts for the default lib.
        return path.dirname(
            this.getDefaultLibFileName({ target: ts.ScriptTarget.ES5 }));
    }

    /**
     * @override ts.CompilerHost
     */
    writeFile: ts.WriteFileCallback;

    /**
     * @override ts.CompilerHost
     */
    getCurrentDirectory(): string {
        return this.delegate.getCurrentDirectory();
    }

    /**
     * @override ts.CompilerHost
     */
    getCanonicalFileName(fileName: string): string {
        return this.delegate.getCanonicalFileName(fileName);

    }

    /**
     * @override ts.CompilerHost
     */
    useCaseSensitiveFileNames(): boolean {
        return this.delegate.useCaseSensitiveFileNames();
    }

    /**
     * @override ts.CompilerHost
     */
    getNewLine(): string {
        return this.delegate.getNewLine();
    }

    /**
     * @override ts.CompilerHost
     */
    readDirectory?(rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number): string[];

    /**
     * @override ts.CompilerHost
     */
    resolveModuleNames?(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile?: ts.SourceFile): (ts.ResolvedModule | undefined)[];

    /**
     * @override ts.CompilerHost
     */
    getModuleResolutionCache?(): ts.ModuleResolutionCache | undefined;

    /**
     * @override ts.CompilerHost
     */
    resolveTypeReferenceDirectives?(typeReferenceDirectiveNames: string[] | readonly ts.FileReference[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingFileMode?: ts.ResolutionMode): (ts.ResolvedTypeReferenceDirective | undefined)[];

    /**
     * @override ts.CompilerHost
     */
    resolveModuleNameLiterals?(moduleLiterals: readonly ts.StringLiteralLike[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile: ts.SourceFile, reusedNames: readonly ts.StringLiteralLike[] | undefined): readonly ts.ResolvedModuleWithFailedLookupLocations[];

    /**
     * @override ts.CompilerHost
     */
    resolveTypeReferenceDirectiveReferences?<T extends ts.FileReference | string>(typeDirectiveReferences: readonly T[], containingFile: string, redirectedReference: ts.ResolvedProjectReference | undefined, options: ts.CompilerOptions, containingSourceFile: ts.SourceFile | undefined, reusedNames: readonly T[] | undefined): readonly ts.ResolvedTypeReferenceDirectiveWithFailedLookupLocations[];

    /**
     * @override ts.CompilerHost
     */
    getEnvironmentVariable?(name: string): string | undefined;

    /**
     * @override ts.CompilerHost
     */
    hasInvalidatedResolutions?(filePath: ts.Path): boolean;

    /**
     * @override ts.CompilerHost
     */
    createHash?(data: string): string;

    /**
     * @override ts.CompilerHost
     */
    getParsedCommandLine?(fileName: string): ts.ParsedCommandLine | undefined;

    /**
     * @override ts.CompilerHost
     */
    jsDocParsingMode?: ts.JSDocParsingMode | undefined;

    /**
     * @override ts.CompilerHost
     */
    fileExists(fileName: string): boolean {
        return this.delegate.fileExists(fileName);
    }

    /**
     * @override ts.CompilerHost
     */
    readFile(fileName: string): string | undefined {
        return this.delegate.readFile(fileName);
    }

    /**
     * @override ts.CompilerHost
     */
    trace?(s: string): void;

    /**
     * @override ts.CompilerHost
     */
    directoryExists?(directoryName: string): boolean;

    /**
     * @override ts.CompilerHost
     */
    realpath?(path: string): string {
        // TypeScript will try to resolve symlinks during module resolution which
        // makes our checks fail: the path we resolved as an input isn't the same
        // one the module resolver will look for.
        // See https://github.com/Microsoft/TypeScript/pull/12020
        // So we simply turn off symlink resolution.
        return path;
    }

    /**
     * @override ts.CompilerHost
     */
    getDirectories?(path: string): string[];

    // *********************************************************
    // Private API
    // *********************************************************

}

export function loadTsConfigFromPath(configFileName: string, specRoot?: string, compilerOptions?: object): { projectRoot: string, parsedConfig: ts.ParsedCommandLine } {
    let options: ts.CompilerOptions = {}, errors: ts.Diagnostic[];
    if (compilerOptions) {
        ({ options, errors } = ts.convertCompilerOptionsFromJson(
            compilerOptions, path.dirname(configFileName)
        ));
        if (errors.length) {
            throw new TsError(errors);
        }
    }
    return loadTsConfigFromResolvedPath(configFileName, options);
}

function loadTsConfigFromResolvedPath(configFileName: string, options: ts.CompilerOptions): { projectRoot: string, parsedConfig: ts.ParsedCommandLine } {
    const compilerHost: ts.ParseConfigFileHost = Object.create(ts.sys);
    compilerHost.onUnRecoverableConfigFileDiagnostic = (diagnostic) => { throw new TsError([diagnostic]); }
    const parsedConfig = ts.getParsedCommandLineOfConfigFile(configFileName, options, compilerHost)!;
    // if (parsedConfig.errors.length) {
    //     throw new TsError(parsedConfig.errors);
    // }
    const projectRoot = path.dirname(configFileName);
    return { projectRoot, parsedConfig };
}

class TsError extends Error {
    constructor(
        public diagnostics: ReadonlyArray<ts.Diagnostic>
    ) {
        super(ts.formatDiagnostics(diagnostics, ts.createCompilerHost({})));
    }
}