/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import MagicString from 'magic-string';
import { AnalyzedClass, AnalyzedFile } from '../analyzer';
import { Renderer } from './renderer';
export interface RenderedFile {
    file: AnalyzedFile;
    content: string;
    map: string;
}
export declare class Esm2015Renderer extends Renderer {
    addImports(output: MagicString, imports: {
        name: string;
        as: string;
    }[]): void;
    addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string): void;
    removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
}
