/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/rendering/renderer" />
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
import { Decorator } from '../../../ngtsc/host';
export interface RenderResult {
    file: AnalyzedFile;
    source: FileInfo;
    map: FileInfo;
}
export interface FileInfo {
    path: string;
    contents: string;
}
export declare abstract class Renderer {
    renderFile(file: AnalyzedFile, targetPath: string): RenderResult;
    abstract addImports(output: MagicString, imports: {
        name: string;
        as: string;
    }[]): void;
    abstract addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string): void;
    abstract removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
    protected trackDecorators(decorators: Decorator[], decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
}
