/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Transform template html and css into executable code.
 * Intended to be used in a build step.
 */
import * as compiler from '@angular/compiler';
import * as ts from 'typescript';
import { CompilerHost, CompilerHostContext } from './compiler_host';
import { CompilerOptions } from './transformers/api';
export interface CodeGeneratorI18nOptions {
    i18nFormat: string | null;
    i18nFile: string | null;
    locale: string | null;
    missingTranslation: string | null;
}
export declare class CodeGenerator {
    private options;
    private program;
    host: ts.CompilerHost;
    private compiler;
    private ngCompilerHost;
    constructor(options: CompilerOptions, program: ts.Program, host: ts.CompilerHost, compiler: compiler.AotCompiler, ngCompilerHost: CompilerHost);
    codegen(): Promise<string[]>;
    codegenSync(): string[];
    private emit(analyzedModules);
    static create(options: CompilerOptions, i18nOptions: CodeGeneratorI18nOptions, program: ts.Program, tsCompilerHost: ts.CompilerHost, compilerHostContext?: CompilerHostContext, ngCompilerHost?: CompilerHost): CodeGenerator;
}
