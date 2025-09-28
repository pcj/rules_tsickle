
import * as path from 'path';
import * as fs from 'fs';
import { promises as asyncfs } from 'fs';
import ts from 'typescript';
import * as tsickle from 'tsickle';

const DEBUG = true;

function getExecRoot(): string {
    return process.env.JS_BINARY__EXECROOT || '.';
}

function getBazelBinDir(): string {
    const binDir = process.env.BAZEL_BINDIR!;
    return path.join(getExecRoot(), binDir);
}

function getOutDir(execRoot: string): string {
    const pkgdir = process.env.BAZEL_PACKAGE!;
    const bindir = process.env.BAZEL_BINDIR!;
    return path.join(execRoot, bindir, pkgdir);
}

async function listFiles(dir: string): Promise<string[]> {
    return asyncfs.readdir(dir, { recursive: true });
}

async function listExecrootFiles() {
    const execroot = process.env.JS_BINARY__EXECROOT || '.';
    for (const filename of await listFiles(execroot)) {
        if (filename.indexOf('.aspect_rules_js') >= 0) {
            continue;
        }
        if (filename.indexOf('tsconfig.json') < 0) {
            continue;
        }
        console.log(`{execroot}/${filename}`);
    }
}

function getInputFiles(execRoot: string, args: string[]): string[] {
    const inputFiles = args.map(arg => `${execRoot}/${arg}`);
    if (inputFiles.length === 0) {
        console.error('Usage: tsicklecompiler <input.ts> [input2.ts] ...');
        process.exit(1);
    }
    return inputFiles;
}

function getTsCompilerOptions(): ts.CompilerOptions {
    return {
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.CommonJS,
        outDir: getBazelBinDir(),
        rootDir: getExecRoot(),
        declaration: true,
        strict: true
    };
}

/**
 * Determine the lowest-level common parent directory of the given list of files.
 */
function getCommonParentDirectory(fileNames: string[]): string {
    const pathSplitter = /[\/\\]+/;
    const commonParent = fileNames[0].split(pathSplitter);
    for (let i = 1; i < fileNames.length; i++) {
        const thisPath = fileNames[i].split(pathSplitter);
        let j = 0;
        while (thisPath[j] === commonParent[j]) {
            j++;
        }
        commonParent.length = j;  // Truncate without copying the array
    }
    if (commonParent.length === 0) {
        return '/';
    } else {
        return commonParent.join(path.sep);
    }
}

async function main() {
    const execRoot = getExecRoot();
    const outDir = getOutDir(execRoot);
    const args = process.argv.slice(2);
    const inputFiles = getInputFiles(execRoot, args);
    // const inputFiles = args;
    const compilerOptions = getTsCompilerOptions();

    if (DEBUG) {
        const cwd = process.cwd()
        // console.log('env:', process.env);
        console.log('pwd:', cwd);
        console.log('args:', args);
        console.log('files:', inputFiles);
        console.log('compilerOptions:', compilerOptions);
    }

    const result = run(compilerOptions, inputFiles, (filePath: string, contents: string) => {
        console.log('emitted file:', filePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, contents, { encoding: 'utf-8' });
    });

    if (result.diagnostics.length) {
        console.error(ts.formatDiagnostics(result.diagnostics, ts.createCompilerHost(compilerOptions)));
        return 1;
    }

    // if (settings.externsPath) {
    //     fs.mkdirSync(path.dirname(settings.externsPath), { recursive: true });
    //     fs.writeFileSync(
    //         settings.externsPath,
    //         tsickle.getGeneratedExterns(result.externs, config.options.rootDir || ''));
    // }

    return 0;

}

function run(
    options: ts.CompilerOptions,
    absoluteFileNames: string[],
    writeFile: ts.WriteFileCallback,
): tsickle.EmitResult {
    // Use absolute paths to determine what files to process since files may be imported using
    // relative or absolute paths
    // const absoluteFileNames = fileNames.map(i => path.resolve(i));

    const compilerHost = ts.createCompilerHost(options);
    const program = ts.createProgram(absoluteFileNames, options, compilerHost);
    const filesToProcess = new Set(absoluteFileNames);
    const rootModulePath = options.rootDir || getCommonParentDirectory(absoluteFileNames);
    const transformerHost: tsickle.TsickleHost = {
        rootDirsRelative: (f: string) => f,
        shouldSkipTsickleProcessing: (fileName: string) => {
            return !filesToProcess.has(path.resolve(fileName));
        },
        shouldIgnoreWarningsForPath: (fileName: string) => false,
        pathToModuleName: (context, fileName) =>
            tsickle.pathToModuleName(rootModulePath, context, fileName),
        fileNameToModuleId: (fileName) => path.relative(rootModulePath, fileName),
        googmodule: true,
        transformDecorators: true,
        transformTypesToClosure: true,
        typeBlackListPaths: new Set(),
        untyped: false,
        logWarning: (warning) =>
            console.error(ts.formatDiagnostics([warning], compilerHost)),
        options,
        generateExtraSuppressions: true,
        // transformDynamicImport: 'nodejs',
        moduleResolutionHost: compilerHost,
    };
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
        return {
            tsMigrationExportsShimFiles: new Map(),
            diagnostics,
            modulesManifest: new tsickle.ModulesManifest(),
            externs: {},
            emitSkipped: true,
            emittedFiles: [],
            // fileSummaries: new Map(),
        };
    }
    return tsickle.emit(program, transformerHost, writeFile);
}

void main()
