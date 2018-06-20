/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata/src/reflector';
import { NgccReflectionHost } from './ngcc_host';
/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are static properties on the class. For example:
 *
 * ```
 * class NgForOf {
 * }
 * NgForOf.decorators = [
 *     { type: Directive, args: [{ selector: '[ngFor][ngForOf]' },] }
 * ];
 * NgForOf.ctorParameters = () => [
 *   { type: ViewContainerRef, },
 *   { type: TemplateRef, },
 *   { type: IterableDiffers, },
 * ];
 * NgForOf.propDecorators = {
 *   "ngForOf": [{ type: Input },],
 *   "ngForTrackBy": [{ type: Input },],
 *   "ngForTemplate": [{ type: Input },],
 * };
 * ```
 *
 * Items are decorated if they have a static property called `decorators`.
 *
 */
export declare class Esm2015ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
    constructor(checker: ts.TypeChecker);
    /**
     * Parse the declaration and find the decorators that were attached to it.
     * @param declaration A declaration, whose decorators we want.
     */
    getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[] | null;
    isClass(node: ts.Node): node is ts.Declaration;
    getClassDecorators(classSymbol: ts.Symbol): Decorator[];
    getMemberDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    /**
     * Parse the declaration and find the decorators that were attached to the constructor.
     * @param declaration The declaration of the constructor, whose decorators we want.
     */
    getConstructorParamDecorators(classSymbol: ts.Symbol): Map<string, Decorator[]>;
    private getDecorators(decoratorsArray);
}
