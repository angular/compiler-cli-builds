/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/ng_module" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { R3NgModuleMetadata } from '@angular/compiler';
import * as ts from 'typescript';
import { Decorator } from '../../host';
import { AnalysisOutput, CompileResult, DecoratorHandler } from '../../transform';
import { SelectorScopeRegistry } from './selector_scope';
/**
 * Compiles @NgModule annotations to ngModuleDef fields.
 *
 * TODO(alxhub): handle injector side of things as well.
 */
export declare class NgModuleDecoratorHandler implements DecoratorHandler<R3NgModuleMetadata> {
    private checker;
    private scopeRegistry;
    constructor(checker: ts.TypeChecker, scopeRegistry: SelectorScopeRegistry);
    detect(decorators: Decorator[]): Decorator | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<R3NgModuleMetadata>;
    compile(node: ts.ClassDeclaration, analysis: R3NgModuleMetadata): CompileResult;
}
