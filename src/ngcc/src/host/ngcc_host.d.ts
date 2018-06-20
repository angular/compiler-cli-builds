/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/host/ngcc_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Decorator, ReflectionHost } from '../../../ngtsc/host';
export interface DecoratedClass {
    classNode: ts.Node;
    decorators: Decorator[];
}
/**
 * A reflection host that has extra methods for looking at non-Typescript package formats
 */
export interface NgccReflectionHost extends ReflectionHost {
    /**
     * Test whether a node represents a class.
     *
     * In JS this may not actually be a class declaration. It could be a function declaration
     * or even the left side of an assignment.
     * @param node The node to test for classiness.
     */
    isClass(node: ts.Node): node is ts.Declaration;
    /**
     * Parse a class and find the decorators attached it.
     * @param classSymbol A symbol that idenfities a class, whose decorators we want.
     */
    getClassDecorators(classSymbol: ts.Symbol): Decorator[];
    /**
     * Parse a class and find the decorators that are attached to the class's members.
     * @param classSymbol A symbol that idenfities a class, whose member decorators we want.
     * @returns A map of members to decorators, where the keys are the member names.
     */
    getMemberDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    /**
     * Parse a class and find the decorators of parameters of the class's constructor.
     * @param classSymbol A symbol that idenfities a class, whose constructor param decorators we want.
     * @returns A map of property names to decorators for the property.
     */
    getConstructorParamDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
}
