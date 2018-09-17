/// <amd-module name="@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import MagicString from 'magic-string';
import { AnalyzedClass } from '../analyzer';
import { Renderer } from './renderer';
export declare class Esm2015Renderer extends Renderer {
    /**
     *  Add the imports at the top of the file
     */
    addImports(output: MagicString, imports: {
        name: string;
        as: string;
    }[]): void;
    addConstants(output: MagicString, constants: string, file: ts.SourceFile): void;
    /**
     * Add the definitions to each decorated class
     */
    addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string): void;
    /**
     * Remove static decorator properties from classes
     */
    removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
    rewriteSwitchableDeclarations(outputText: MagicString, sourceFile: ts.SourceFile): void;
}
