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
/**
 * The results of rendering an analyzed file.
 */
export interface RenderResult {
    /**
     * The file that has been rendered.
     */
    file: AnalyzedFile;
    /**
     * The rendered source file.
     */
    source: FileInfo;
    /**
     * The rendered source map file.
     */
    map: FileInfo;
}
/**
 * Information about a file that has been rendered.
 */
export interface FileInfo {
    /**
     * Path to where the file should be written.
     */
    path: string;
    /**
     * The contents of the file to be be written.
     */
    contents: string;
}
/**
 * A base-class for rendering an `AnalyzedClass`.
 * Package formats have output files that must be rendered differently,
 * Concrete sub-classes must implement the `addImports`, `addDefinitions` and
 * `removeDecorators` abstract methods.
 */
export declare abstract class Renderer {
    /**
     * Render the source code and source-map for an Analyzed file.
     * @param file The analyzed file to render.
     * @param targetPath The absolute path where the rendered file will be written.
     */
    renderFile(file: AnalyzedFile, targetPath: string): RenderResult;
    protected abstract addImports(output: MagicString, imports: {
        name: string;
        as: string;
    }[]): void;
    protected abstract addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string): void;
    protected abstract removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
    protected trackDecorators(decorators: Decorator[], decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
}
