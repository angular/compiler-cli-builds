/// <amd-module name="@angular/compiler-cli/src/ngtsc/metadata/src/reflector" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
/**
 * reflector.ts implements static reflection of declarations using the TypeScript `ts.TypeChecker`.
 */
/**
 * A reflected parameter of a function, method, or constructor, indicating the name, any
 * decorators, and an expression representing a reference to the value side of the parameter's
 * declared type, if applicable.
 */
export interface Parameter {
    /**
     * Name of the parameter as a `ts.BindingName`, which allows the parameter name to be identified
     * via sourcemaps.
     */
    name: ts.BindingName;
    /**
     * A `ts.Expression` which represents a reference to the value side of the parameter's type.
     */
    typeValueExpr: ts.Expression | null;
    /**
     * Array of decorators present on the parameter.
     */
    decorators: Decorator[];
}
/**
 * A reflected decorator, indicating the name, where it was imported from, and any arguments if the
 * decorator is a call expression.
 */
export interface Decorator {
    /**
     * Name of the decorator, extracted from the decoration expression.
     */
    name: string;
    /**
     * Import path (relative to the decorator's file) of the decorator itself.
     */
    from: string;
    /**
     * The decorator node itself (useful for printing sourcemap based references to the decorator).
     */
    node: ts.Decorator;
    /**
     * Any arguments of a call expression, if one is present. If the decorator was not a call
     * expression, then this will be an empty array.
     */
    args: ts.Expression[];
}
/**
 * Reflect a `ts.ClassDeclaration` and determine the list of parameters.
 *
 * Note that this only reflects the referenced class and not any potential parent class - that must
 * be handled by the caller.
 *
 * @param node the `ts.ClassDeclaration` to reflect
 * @param checker a `ts.TypeChecker` used for reflection
 * @returns a `Parameter` instance for each argument of the constructor, or `null` if no constructor
 */
export declare function reflectConstructorParameters(node: ts.ClassDeclaration, checker: ts.TypeChecker): Parameter[] | null;
/**
 * Reflect a decorator and return a structure describing where it comes from and any arguments.
 *
 * Only imported decorators are considered, not locally defined decorators.
 */
export declare function reflectDecorator(decorator: ts.Decorator, checker: ts.TypeChecker): Decorator | null;
export declare function reflectObjectLiteral(node: ts.ObjectLiteralExpression): Map<string, ts.Expression>;
export declare function reflectImportedIdentifier(id: ts.Identifier, checker: ts.TypeChecker): {
    name: string;
    from: string;
} | null;
