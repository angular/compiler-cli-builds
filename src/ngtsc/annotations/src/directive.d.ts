/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/src/directive" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { R3DirectiveMetadata } from '@angular/compiler';
import * as ts from 'typescript';
import { Decorator } from '../../metadata';
import { AnalysisOutput, CompileResult, DecoratorHandler } from '../../transform';
import { SelectorScopeRegistry } from './selector_scope';
export declare class DirectiveDecoratorHandler implements DecoratorHandler<R3DirectiveMetadata> {
    private checker;
    private scopeRegistry;
    constructor(checker: ts.TypeChecker, scopeRegistry: SelectorScopeRegistry);
    detect(decorators: Decorator[]): Decorator | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<R3DirectiveMetadata>;
    compile(node: ts.ClassDeclaration, analysis: R3DirectiveMetadata): CompileResult;
}
/**
 * Helper function to extract metadata from a `Directive` or `Component`.
 */
export declare function extractDirectiveMetadata(clazz: ts.ClassDeclaration, decorator: Decorator, checker: ts.TypeChecker): R3DirectiveMetadata | undefined;
