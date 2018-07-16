/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/host/esm5_host" />
import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { ClassMember } from '../../../ngtsc/host/src/reflection';
import { Esm2015ReflectionHost } from './esm2015_host';
/**
 * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
 *
 * ```
 * var CommonModule = (function () {
 *  function CommonModule() {
 *  }
 *  CommonModule.decorators = [ ... ];
 * ```
 *
 * * "Classes" are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctorParameters`.
 *
 */
export declare class Esm5ReflectionHost extends Esm2015ReflectionHost {
    constructor(checker: ts.TypeChecker);
    /**
     * Examine a declaration which should be of a class, and return metadata about the members of the
     * class.
     *
     * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
     * reflect. If the source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the
     * source is in ES5 format, this might be a `ts.VariableDeclaration` as classes in ES5 are
     * represented as the result of an IIFE execution.
     *
     * @returns an array of `ClassMember` metadata representing the members of the class.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    /**
     * Check whether the given declaration node actually represents a class.
     */
    isClass(node: ts.Declaration): boolean;
    /**
     * In ESM5 the implementation of a class is a function expression that is hidden inside an IIFE.
     * So we need to dig around inside to get hold of the "class" symbol.
     * @param declaration the top level declaration that represents an exported class.
     */
    getClassSymbol(declaration: ts.Declaration): ts.Symbol | undefined;
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     * In ESM5 there is no "class" so the constructor that we want is actually the declaration
     * function itself.
     */
    protected getConstructorParameterDeclarations(classSymbol: ts.Symbol): ts.ParameterDeclaration[];
    /**
     * Constructors parameter decorators are declared in the body of static method of the constructor
     * function in ES5. Note that unlike ESM2105 this is a function expression rather than an arrow
     * function:
     *
     * ```
     * SomeDirective.ctorParameters = function() { return [
     *   { type: ViewContainerRef, },
     *   { type: TemplateRef, },
     *   { type: IterableDiffers, },
     *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
     * ]; };
     * ```
     */
    protected getConstructorDecorators(classSymbol: ts.Symbol): (Map<string, ts.Expression> | null)[];
    protected reflectMember(symbol: ts.Symbol, decorators?: Decorator[], isStatic?: boolean): ClassMember | null;
}
