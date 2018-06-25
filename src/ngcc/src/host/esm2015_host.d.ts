/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ClassMember, Decorator, Import, Parameter } from '../../../ngtsc/host';
import { NgccReflectionHost } from './ngcc_host';
/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are defined via static properties on the class. For example:
 *
 * ```
 * class SomeDirective {
 * }
 * SomeDirective.decorators = [
 *     { type: Directive, args: [{ selector: '[someDirective]' },] }
 * ];
 * SomeDirective.ctorParameters = () => [
 *   { type: ViewContainerRef, },
 *   { type: TemplateRef, },
 *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
 * ];
 * SomeDirective.propDecorators = {
 *   "input1": [{ type: Input },],
 *   "input2": [{ type: Input },],
 * };
 * ```
 *
 * * Classes are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctrParameters`.
 */
export declare class Esm2015ReflectionHost implements NgccReflectionHost {
    protected checker: ts.TypeChecker;
    constructor(checker: ts.TypeChecker);
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
    getMembersOfClass(clazz: ts.Declaration): ClassMember[];
    getConstructorParameters(clazz: ts.Declaration): Parameter[] | null;
    getImportOfIdentifier(id: ts.Identifier): Import | null;
    isClass(node: ts.Node): node is ts.Declaration;
    /**
     * Member decorators are declared as static properties of the class in ES2015:
     *
     * ```
     * SomeDirective.propDecorators = {
     *   "ngForOf": [{ type: Input },],
     *   "ngForTrackBy": [{ type: Input },],
     *   "ngForTemplate": [{ type: Input },],
     * };
     * ```
     */
    protected getMemberDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    protected getDecorators(decoratorsArray: ts.Expression): Decorator[];
    protected getClassSymbol(declaration: ts.Declaration): ts.Symbol | undefined;
}
