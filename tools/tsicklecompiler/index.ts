
import * as path from 'path';
import { promises as fs } from 'fs';
import ts from 'typescript';
import { loadTsickleHostConfig, TsickleHostConfig } from './tsicklehost';
import { CompilerHost, loadTsConfigFromPath } from './compilerhost';

const DEBUG = true;

async function main() {
    const cwd = process.cwd()
    const execroot = process.env.JS_BINARY__EXECROOT || '.';
    const pkgdir = process.env.BAZEL_PACKAGE!;
    const bindir = process.env.BAZEL_BINDIR!;
    const outdir = path.join(execroot, bindir, pkgdir);
    // const outdir = path.join(execroot, pkgdir);
    const tsickleConfigFile = process.env.TSICKLE_CONFIG_FILE!;
    // const tsConfigFile = `${execroot}/${process.env.TS_CONFIG_FILE!}`;
    const tsConfigFile = `tsconfig.json`;
    const args = process.argv.slice(2);

    if (DEBUG) {
        console.log('env:', process.env);
        console.log('pwd:', cwd);
        console.log('args:', args);
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

    const tsickleHostConfig = loadTsickleHostConfig(tsickleConfigFile);
    const inputFiles = args.map(arg => `${execroot}/${arg}`);

    if (inputFiles.length === 0) {
        console.error('Usage: tsicklecompiler <input.ts> [input2.ts] ...');
        process.exit(1);
    }

    let compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.CommonJS,
        outDir: outdir,
        declaration: true,
        strict: true
    };

    if (!tsConfigFile) {
        throw new Error(`tsconfig.json file not set`);
    }

    const { parsedConfig } = loadTsConfigFromPath(tsConfigFile);
    compilerOptions = parsedConfig.options;
    compilerOptions.outDir = outdir;
    if (tsickleHostConfig) {
        await runTsickle(tsickleHostConfig, compilerOptions, inputFiles);
    } else {
        await runVanillaTsc(compilerOptions, inputFiles);
    }
}

async function runTsickle(
    tsickleHostConfig: TsickleHostConfig,
    compilerOptions: ts.CompilerOptions,
    inputFiles: string[],
) {
    const delegate = ts.createCompilerHost(compilerOptions);
    const host = new CompilerHost(tsickleHostConfig, compilerOptions, delegate);

    const program = ts.createProgram(inputFiles, compilerOptions, host);

    const emittedFiles: string[] = [];
    const emitResult = program.emit(undefined, (fileName, data) => {
        emittedFiles.push(fileName);
        host.writeFile(fileName, data, false);
    });

    const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    diagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });

    if (DEBUG) {
        if (emittedFiles.length > 0) {
            console.log('Emitted files:');
            emittedFiles.forEach(file => console.log(`  ${file}`));
        } else {
            console.log('No files were emitted');
        }
    }

    const exitCode = emitResult.emitSkipped ? 1 : 0;
    process.exit(exitCode);
}

async function runVanillaTsc(
    compilerOptions: ts.CompilerOptions,
    inputFiles: string[],
) {
    const host = ts.createCompilerHost(compilerOptions);
    const program = ts.createProgram(inputFiles, compilerOptions, host);

    const emittedFiles: string[] = [];
    const emitResult = program.emit(undefined, (fileName, data) => {
        emittedFiles.push(fileName);
        host.writeFile(fileName, data, false);
    });

    const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    diagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });

    if (DEBUG) {
        if (emittedFiles.length > 0) {
            console.log('Emitted files:');
            emittedFiles.forEach(file => console.log(`  ${file}`));
        } else {
            console.log('No files were emitted');
        }
    }

    const exitCode = emitResult.emitSkipped ? 1 : 0;
    process.exit(exitCode);
}

async function listFiles(dir: string): Promise<string[]> {
    return fs.readdir(dir, { recursive: true });
}

void main()

