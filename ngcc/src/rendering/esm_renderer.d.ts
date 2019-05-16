/// <amd-module name="@angular/compiler-cli/ngcc/src/rendering/esm_renderer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import MagicString from 'magic-string';
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../../src/ngtsc/path';
import { Import } from '../../../src/ngtsc/translator';
import { CompiledClass } from '../analysis/decoration_analyzer';
import { ExportInfo } from '../analysis/private_declarations_analyzer';
import { FileSystem } from '../file_system/file_system';
import { NgccReflectionHost, SwitchableVariableDeclaration } from '../host/ngcc_host';
import { Logger } from '../logging/logger';
import { EntryPointBundle } from '../packages/entry_point_bundle';
import { RedundantDecoratorMap, Renderer } from './renderer';
export declare class EsmRenderer extends Renderer {
    constructor(fs: FileSystem, logger: Logger, host: NgccReflectionHost, isCore: boolean, bundle: EntryPointBundle);
    /**
     *  Add the imports at the top of the file
     */
    addImports(output: MagicString, imports: Import[], sf: ts.SourceFile): void;
    addExports(output: MagicString, entryPointBasePath: AbsoluteFsPath, exports: ExportInfo[]): void;
    addConstants(output: MagicString, constants: string, file: ts.SourceFile): void;
    /**
     * Add the definitions to each decorated class
     */
    addDefinitions(output: MagicString, compiledClass: CompiledClass, definitions: string): void;
    /**
     * Remove static decorator properties from classes
     */
    removeDecorators(output: MagicString, decoratorsToRemove: RedundantDecoratorMap): void;
    rewriteSwitchableDeclarations(outputText: MagicString, sourceFile: ts.SourceFile, declarations: SwitchableVariableDeclaration[]): void;
}
