/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { NgCompiler } from './core';
import { UnifiedModulesHost } from './core/api';
/**
 * A `ts.CompilerHost` which also returns a list of input files, out of which the `ts.Program`
 * should be created.
 *
 * Currently mirrored from @bazel/concatjs/internal/tsc_wrapped/plugin_api (with the naming of
 * `fileNameToModuleName` corrected).
 */
export interface PluginCompilerHost extends ts.CompilerHost, Partial<UnifiedModulesHost> {
    readonly inputFiles: ReadonlyArray<string>;
}
/**
 * Mirrors the plugin interface from tsc_wrapped which is currently under active development. To
 * enable progress to be made in parallel, the upstream interface isn't implemented directly.
 * Instead, `TscPlugin` here is structurally assignable to what tsc_wrapped expects.
 */
interface TscPlugin {
    readonly name: string;
    wrapHost(host: ts.CompilerHost & Partial<UnifiedModulesHost>, inputFiles: ReadonlyArray<string>, options: ts.CompilerOptions): PluginCompilerHost;
    setupCompilation(program: ts.Program, oldProgram?: ts.Program): {
        ignoreForDiagnostics: Set<ts.SourceFile>;
        ignoreForEmit: Set<ts.SourceFile>;
    };
    getDiagnostics(file?: ts.SourceFile): ts.Diagnostic[];
    getOptionDiagnostics(): ts.Diagnostic[];
    getNextProgram(): ts.Program;
    createTransformers(): ts.CustomTransformers;
}
/**
 * A plugin for `tsc_wrapped` which allows Angular compilation from a plain `ts_library`.
 */
export declare class NgTscPlugin implements TscPlugin {
    private ngOptions;
    name: string;
    private options;
    private host;
    private _compiler;
    get compiler(): NgCompiler;
    constructor(ngOptions: {});
    wrapHost(host: ts.CompilerHost & Partial<UnifiedModulesHost>, inputFiles: readonly string[], options: ts.CompilerOptions): PluginCompilerHost;
    setupCompilation(program: ts.Program, oldProgram?: ts.Program): {
        ignoreForDiagnostics: Set<ts.SourceFile>;
        ignoreForEmit: Set<ts.SourceFile>;
    };
    getDiagnostics(file?: ts.SourceFile): ts.Diagnostic[];
    getOptionDiagnostics(): ts.Diagnostic[];
    getNextProgram(): ts.Program;
    createTransformers(): ts.CustomTransformers;
}
export {};
