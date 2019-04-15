/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/src/context" />
import { BoundTarget } from '@angular/compiler';
import * as ts from 'typescript';
import { ReferenceEmitter } from '../../imports';
import { ClassDeclaration } from '../../reflection';
import { TypeCheckableDirectiveMeta, TypeCtorMetadata } from './api';
/**
 * A template type checking context for a program.
 *
 * The `TypeCheckContext` allows registration of components and their templates which need to be
 * type checked. It also allows generation of modified `ts.SourceFile`s which contain the type
 * checking code.
 */
export declare class TypeCheckContext {
    private refEmitter;
    constructor(refEmitter: ReferenceEmitter);
    /**
     * A `Map` of `ts.SourceFile`s that the context has seen to the operations (additions of methods
     * or type-check blocks) that need to be eventually performed on that file.
     */
    private opMap;
    /**
     * Record a template for the given component `node`, with a `SelectorMatcher` for directive
     * matching.
     *
     * @param node class of the node being recorded.
     * @param template AST nodes of the template being recorded.
     * @param matcher `SelectorMatcher` which tracks directives that are in scope for this template.
     */
    addTemplate(node: ClassDeclaration<ts.ClassDeclaration>, boundTarget: BoundTarget<TypeCheckableDirectiveMeta>): void;
    /**
     * Record a type constructor for the given `node` with the given `ctorMetadata`.
     */
    addTypeCtor(sf: ts.SourceFile, node: ClassDeclaration<ts.ClassDeclaration>, ctorMeta: TypeCtorMetadata): void;
    /**
     * Transform a `ts.SourceFile` into a version that includes type checking code.
     *
     * If this particular source file has no directives that require type constructors, or components
     * that require type check blocks, then it will be returned directly. Otherwise, a new
     * `ts.SourceFile` is parsed from modified text of the original. This is necessary to ensure the
     * added code has correct positional information associated with it.
     */
    transform(sf: ts.SourceFile): ts.SourceFile;
    private addTypeCheckBlock;
}
