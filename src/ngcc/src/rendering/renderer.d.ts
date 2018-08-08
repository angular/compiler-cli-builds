/// <amd-module name="@angular/compiler-cli/src/ngcc/src/rendering/renderer" />
import { SourceMapConverter } from 'convert-source-map';
import MagicString from 'magic-string';
import { RawSourceMap } from 'source-map';
import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { ImportManager } from '../../../ngtsc/transform';
import { AnalyzedClass, AnalyzedFile } from '../analyzer';
import { NgccReflectionHost } from '../host/ngcc_host';
interface SourceMapInfo {
    source: string;
    map: SourceMapConverter | null;
    isInline: boolean;
}
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
    map: FileInfo | null;
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
 * A base-class for rendering an `AnalyzedFile`.
 *
 * Package formats have output files that must be rendered differently. Concrete sub-classes must
 * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
 */
export declare abstract class Renderer {
    protected host: NgccReflectionHost;
    constructor(host: NgccReflectionHost);
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
    /**
     * Add the decorator nodes that are to be removed to a map
     * So that we can tell if we should remove the entire decorator property
     */
    protected trackDecorators(decorators: Decorator[], decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
    /**
     * Get the map from the source (note whether it is inline or external)
     */
    protected extractSourceMap(file: ts.SourceFile): SourceMapInfo;
    /**
     * Merge the input and output source-maps, replacing the source-map comment in the output file
     * with an appropriate source-map comment pointing to the merged source-map.
     */
    protected renderSourceAndMap(file: AnalyzedFile, input: SourceMapInfo, output: MagicString, outputPath: string): RenderResult;
}
/**
 * Merge the two specified source-maps into a single source-map that hides the intermediate
 * source-map.
 * E.g. Consider these mappings:
 *
 * ```
 * OLD_SRC -> OLD_MAP -> INTERMEDIATE_SRC -> NEW_MAP -> NEW_SRC
 * ```
 *
 * this will be replaced with:
 *
 * ```
 * OLD_SRC -> MERGED_MAP -> NEW_SRC
 * ```
 */
export declare function mergeSourceMaps(oldMap: RawSourceMap | null, newMap: RawSourceMap): SourceMapConverter;
/**
 * Render the definitions as source code for the given class.
 * @param sourceFile The file containing the class to process.
 * @param clazz The class whose definitions are to be rendered.
 * @param compilation The results of analyzing the class - this is used to generate the rendered
 * definitions.
 * @param imports An object that tracks the imports that are needed by the rendered definitions.
 */
export declare function renderDefinitions(sourceFile: ts.SourceFile, analyzedClass: AnalyzedClass, imports: ImportManager): string;
export {};
