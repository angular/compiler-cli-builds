/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/host/fesm2015_host" />
import * as ts from 'typescript';
import { ClassMember, CtorParameter, Decorator } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata';
import { NgccReflectionHost, SwitchableVariableDeclaration } from './ngcc_host';
export declare const DECORATORS: ts.__String;
export declare const PROP_DECORATORS: ts.__String;
export declare const CONSTRUCTOR: ts.__String;
export declare const CONSTRUCTOR_PARAMS: ts.__String;
/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are defined via static properties on the class. For example:
 *
 * ```
 * class SomeDirective {
 * }
 * SomeDirective.decorators = [
 *   { type: Directive, args: [{ selector: '[someDirective]' },] }
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
 *   a static method called `ctorParameters`.
 */
export declare class Fesm2015ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
    constructor(checker: ts.TypeChecker);
    /**
     * Examine a declaration (for example, of a class or function) and return metadata about any
     * decorators present on the declaration.
     *
     * @param declaration a TypeScript `ts.Declaration` node representing the class or function over
     * which to reflect. For example, if the intent is to reflect the decorators of a class and the
     * source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the source is in ES5
     * format, this might be a `ts.VariableDeclaration` as classes in ES5 are represented as the
     * result of an IIFE execution.
     *
     * @returns an array of `Decorator` metadata if decorators are present on the declaration, or
     * `null` if either no decorators were present or if the declaration is not of a decoratable type.
     */
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
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
    getMembersOfClass(clazz: ts.Declaration): ClassMember[];
    /**
     * Reflect over the constructor of a class and return metadata about its parameters.
     *
     * This method only looks at the constructor of a class directly and not at any inherited
     * constructors.
     *
     * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
     * reflect. If the source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the
     * source is in ES5 format, this might be a `ts.VariableDeclaration` as classes in ES5 are
     * represented as the result of an IIFE execution.
     *
     * @returns an array of `Parameter` metadata representing the parameters of the constructor, if
     * a constructor exists. If the constructor exists and has 0 parameters, this array will be empty.
     * If the class has no constructor, this method returns `null`.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    getConstructorParameters(clazz: ts.Declaration): CtorParameter[] | null;
    /**
     * Find a symbol for a node that we think is a class.
     * @param node The node whose symbol we are finding.
     * @returns The symbol for the node or `undefined` if it is not a "class" or has no symbol.
     */
    getClassSymbol(declaration: ts.Node): ts.Symbol | undefined;
    /**
     * Search the given module for variable declarations in which the initializer
     * is an identifier marked with the `PRE_NGCC_MARKER`.
     * @param module The module in which to search for switchable declarations.
     * @returns An array of variable declarations that match.
     */
    getSwitchableDeclarations(module: ts.Node): SwitchableVariableDeclaration[];
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
    /**
     * Reflect over the given expression and extract decorator information.
     * @param decoratorsArray An expression that contains decorator information.
     */
    protected reflectDecorators(decoratorsArray: ts.Expression): Decorator[];
    protected reflectMember(symbol: ts.Symbol, decorators?: Decorator[], isStatic?: boolean): ClassMember | null;
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     * @param classSymbol the class whose parameters we want to find.
     * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
     * the
     * class's constructor or null if there is no constructor.
     */
    protected getConstructorParameterDeclarations(classSymbol: ts.Symbol): ts.ParameterDeclaration[] | null;
    /**
     * Constructors parameter decorators are declared in the body of static method of the class in
     * ES2015:
     *
     * ```
     * SomeDirective.ctorParameters = () => [
     *   { type: ViewContainerRef, },
     *   { type: TemplateRef, },
     *   { type: IterableDiffers, },
     *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
     * ];
     * ```
     */
    protected getConstructorDecorators(classSymbol: ts.Symbol): (Map<string, ts.Expression> | null)[];
}
/**
 * Helper method to extract the value of a property given the property's "symbol",
 * which is actually the symbol of the identifier of the property.
 */
export declare function getPropertyValueFromSymbol(propSymbol: ts.Symbol): ts.Expression | undefined;
