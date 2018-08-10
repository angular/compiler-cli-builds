/// <amd-module name="@angular/compiler-cli/src/ngcc/src/analyzer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ConstantPool } from '@angular/compiler';
import * as ts from 'typescript';
import { ResourceLoader, SelectorScopeRegistry } from '../../ngtsc/annotations';
import { Decorator } from '../../ngtsc/host';
import { CompileResult, DecoratorHandler } from '../../ngtsc/transform';
import { NgccReflectionHost } from './host/ngcc_host';
import { ParsedClass } from './parsing/parsed_class';
import { ParsedFile } from './parsing/parsed_file';
export interface AnalyzedClass<T = any> extends ParsedClass {
    handler: DecoratorHandler<T>;
    analysis: any;
    diagnostics?: ts.Diagnostic[];
    compilation: CompileResult[];
}
export interface AnalyzedFile {
    analyzedClasses: AnalyzedClass[];
    sourceFile: ts.SourceFile;
    constantPool: ConstantPool;
}
export interface MatchingHandler<T> {
    handler: DecoratorHandler<T>;
    decorator: Decorator;
}
/**
 * `ResourceLoader` which directly uses the filesystem to resolve resources synchronously.
 */
export declare class FileResourceLoader implements ResourceLoader {
    load(url: string): string;
}
export declare class Analyzer {
    private typeChecker;
    private host;
    resourceLoader: FileResourceLoader;
    scopeRegistry: SelectorScopeRegistry;
    handlers: DecoratorHandler<any>[];
    constructor(typeChecker: ts.TypeChecker, host: NgccReflectionHost);
    /**
     * Analyize a parsed file to generate the information about decorated classes that
     * should be converted to use ivy definitions.
     * @param file The file to be analysed for decorated classes.
     */
    analyzeFile(file: ParsedFile): AnalyzedFile;
    protected analyzeClass(file: ts.SourceFile, pool: ConstantPool, clazz: ParsedClass): AnalyzedClass | undefined;
}
