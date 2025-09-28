
import ts from 'typescript';
import * as tsickle from 'tsickle';
import * as fs from 'fs';

export type TsickleHostConfig = {
    /** rootModulePath: often the rootDir in a tsconfig.json file */
    rootModulePath: string;
    /** if we are in es5 mode */
    es5Mode: boolean;
    /** paths to ignore warnings for */
    ignoreWarningsPath: string[];
    /** types to not emit in d.ts files */
    typeBlackListPaths: string[];
    /** If provided, a set of paths whose types should always generate as {?} */
    unknownTypesPaths: string[];
    /** optional: the prefix where node_modules are? */
    nodeModulesPrefix?: string;
}

export function loadTsickleHostConfig(filename: string): TsickleHostConfig {
    const jsonContent = fs.readFileSync(filename, 'utf8');
    return JSON.parse(jsonContent) as TsickleHostConfig;
}

/**
 * TsickleHost implements tsickle.TsickleHost according to (hopefully) same
 * semantics as tscc.
 */
export abstract class TsickleHost implements tsickle.TsickleHost {
    constructor(
        protected cfg: TsickleHostConfig,
        private logger: Console = console,
    ) {
    }

    // *********************************************************
    // Public API
    // *********************************************************

    /**
     * @override tsickle.TsickleHost
     */
    abstract options: ts.CompilerOptions;

    /**
     * @override tsickle.TsickleHost
     */
    transformDecorators?: boolean | undefined = true;

    /**
     * @override tsickle.TsickleHost
     */
    transformTypesToClosure?: boolean | undefined = true;

    /**
     * Not present in tscc.  Returning false as I don't think I need them.
     * 
     * @override tsickle.TsickleHost
     */
    generateTsMigrationExportsShim?: boolean | undefined = false;

    /**
     * not present in tscc.  Also, don't think I need them.
     * @override tsickle.TsickleHost
     */
    addDtsClutzAliases?: boolean | undefined = false;

    /**
     * @override tsickle.TsickleHost
     */
    shouldSkipTsickleProcessing(fileName: string): boolean {
        // TODO(pcj): implement the fileNamesSet and dependency graph.
        return false;
    }

    /**
     * controls whether a warning will cause compilation failure.
     * 
     * @override tsickle.TsickleHost
     */
    shouldIgnoreWarningsForPath(filePath: string): boolean {
        return false; // tscc returns `true`.
    }

    /**
     * @override tsickle.TsickleHost
     */
    googmodule = true;

    /**
     * Not sure what this is currently, but returning false.
     *
     * @override tsickle.TsickleHost
     */
    useDeclarationMergingTransformation?: boolean | undefined = false;

    /**
     * Not present in tscc.  In tsickle, the demo.ts is true, so using that for now.
     * 
     * @override tsickle.TsickleHost
     */
    generateExtraSuppressions: boolean = true;

    /**
     * 
     * @override tsickle.TsickleHost
     */
    pathToModuleName(context: string, importPath: string): string {
        return tsickle.pathToModuleName(this.cfg.rootModulePath, context, importPath);
    }
    /**
     * tscc has some extra semantics around this, including using tsc's internal
     * resolver. for now, using the same semantics as tsc_wrapped.
     *
     * @override tsickle.TsickleHost
     */
    fileNameToModuleId(fileName: string): string {
        return this.relativeOutputPath(
            fileName.substring(0, fileName.lastIndexOf('.')));
    }

    /**
     * not present in tscc.  Customize later, but probably don't want this.
     * @override tsickle.TsickleHost
     */
    isJsTranspilation?: boolean | undefined = false;

    /**
     * unconditionally true in tscc, but considered obsolete in
     * https://github.com/angular/tsickle/issues/376.
     *
     * @override tsickle.TsickleHost
     */
    convertIndexImportShorthand?: boolean | undefined = false;

    /**
     * @override tsickle.TsickleHost
     */
    get moduleResolutionHost(): ts.ModuleResolutionHost {
        return this.compilerHost
    };

    /**
     * required since tsickle 0.41.0, currently only used in transpiling
     * `goog.tsMigration*ExportsShim`.
     *
     * @override tsickle.TsickleHost
     */
    rootDirsRelative(fileName: string): string {
        return fileName;
    }

    /**
     * @override tsickle.TsickleHost
     */
    logWarning?: ((warning: ts.Diagnostic) => void) | undefined = this.logWarningInternal;

    /**
     * unconditionally false in tscc.  Configurable in rules_typescript, but
     * defaults to false.
     *
     * @override tsickle.TsickleHost
     */
    untyped?: boolean | undefined = false;

    /**
     * types declared in these files will never be mentioned in generated .d.ts.
     * @override tsickle.TsickleHost
     */
    get typeBlackListPaths(): Set<string> | undefined {
        return new Set(this.cfg.typeBlackListPaths);
    }

    /**
     *  If provided, a set of paths whose types should always generate as {?}.
     *  not present in tscc. 
     * @override tsickle.TsickleHost
     */
    get unknownTypesPaths(): Set<string> | undefined {
        return new Set(this.cfg.unknownTypesPaths);
    }

    /**
     * Whether tsickle should insert goog.provide() calls into the externs
     * generated for `.d.ts` files that are external modules.
     *
     * not present in provideExternalModuleDtsNamespace.  
     *
     * In a non-shimmed module, create a global namespace. This exists purely
     * for backwards compatiblity, in the medium term all code using tsickle
     * should always use `goog.module`s, so global names should not be
     * neccessary.
     *
     * @override tsickle.TsickleHost
     */
    provideExternalModuleDtsNamespace?: boolean | undefined = false;

    // *********************************************************
    // Protected API
    // *********************************************************

    /**
     * Using as abstract field because tsc_wrapper is implemented as a class
     * that implements both CompilerHost and TsickleHost.
     */
    protected abstract compilerHost: ts.CompilerHost;

    // *********************************************************
    // Private API
    // *********************************************************

    /**
     * For the given potentially absolute input file path (typically .ts), returns
     * the relative output path. For example, for
     * /path/to/root/blaze-out/k8-fastbuild/genfiles/my/file.ts, will return
     * my/file.js or my/file.mjs (depending on ES5 mode).
     */
    private relativeOutputPath(fileName: string) {
        let result = this.rootDirsRelative(fileName);
        result = result.replace(/(\.d)?\.[jt]sx?$/, '');
        if (!this.cfg.es5Mode) {
            result += '.closure';
        }
        return result + '.js';
    }

    /**
     * Just log to the console.  tsc_wrapper has options about ignoring files
     * based on a configuration.
     * @param warning 
     */
    private logWarningInternal(warning: ts.Diagnostic) {
        if (warning.file) {
            let { fileName } = warning.file;
            for (let i = 0, l = this.cfg.ignoreWarningsPath.length; i < l; i++) {
                if (fileName.indexOf(this.cfg.ignoreWarningsPath[i]) !== -1) return;
            }
        }
        this.logger.log(ts.formatDiagnostic(warning, this.compilerHost));
    }
}
