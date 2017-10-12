/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Extract i18n messages from source code
 */
import 'reflect-metadata';
import * as compiler from '@angular/compiler';
import * as ts from 'typescript';
import { CompilerHost, CompilerHostContext } from './compiler_host';
import { CompilerOptions } from './transformers/api';
export declare class Extractor {
    private options;
    private ngExtractor;
    host: ts.CompilerHost;
    private ngCompilerHost;
    private program;
    constructor(options: CompilerOptions, ngExtractor: compiler.Extractor, host: ts.CompilerHost, ngCompilerHost: CompilerHost, program: ts.Program);
    extract(formatName: string, outFile: string | null): Promise<string[]>;
    extractBundle(): Promise<compiler.MessageBundle>;
    serialize(bundle: compiler.MessageBundle, formatName: string): string;
    getExtension(formatName: string): string;
    static create(options: CompilerOptions, program: ts.Program, tsCompilerHost: ts.CompilerHost, locale?: string | null, compilerHostContext?: CompilerHostContext, ngCompilerHost?: CompilerHost): Extractor;
}
