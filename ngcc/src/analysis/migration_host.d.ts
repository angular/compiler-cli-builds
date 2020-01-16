/// <amd-module name="@angular/compiler-cli/ngcc/src/analysis/migration_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../../src/ngtsc/file_system';
import { MetadataReader } from '../../../src/ngtsc/metadata';
import { PartialEvaluator } from '../../../src/ngtsc/partial_evaluator';
import { ClassDeclaration, Decorator } from '../../../src/ngtsc/reflection';
import { DecoratorHandler, HandlerFlags } from '../../../src/ngtsc/transform';
import { NgccReflectionHost } from '../host/ngcc_host';
import { MigrationHost } from '../migrations/migration';
import { AnalyzedFile } from './types';
/**
 * The standard implementation of `MigrationHost`, which is created by the
 * `DecorationAnalyzer`.
 */
export declare class DefaultMigrationHost implements MigrationHost {
    readonly reflectionHost: NgccReflectionHost;
    readonly metadata: MetadataReader;
    readonly evaluator: PartialEvaluator;
    private handlers;
    private entryPointPath;
    private analyzedFiles;
    private diagnosticHandler;
    constructor(reflectionHost: NgccReflectionHost, metadata: MetadataReader, evaluator: PartialEvaluator, handlers: DecoratorHandler<unknown, unknown, unknown>[], entryPointPath: AbsoluteFsPath, analyzedFiles: AnalyzedFile[], diagnosticHandler: (error: ts.Diagnostic) => void);
    injectSyntheticDecorator(clazz: ClassDeclaration, decorator: Decorator, flags?: HandlerFlags): void;
    getAllDecorators(clazz: ClassDeclaration): Decorator[] | null;
    isInScope(clazz: ClassDeclaration): boolean;
}
