/// <amd-module name="@angular/compiler-cli/src/ngtsc/shims/src/factory_generator" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { ImportRewriter } from '../../imports';
import { PerFileShimGenerator } from '../api';
/**
 * Maintains a mapping of which symbols in a .ngfactory file have been used.
 *
 * .ngfactory files are generated with one symbol per defined class in the source file, regardless
 * of whether the classes in the source files are NgModules (because that isn't known at the time
 * the factory files are generated). A `FactoryTracker` supports removing factory symbols which
 * didn't end up being NgModules, by tracking the ones which are.
 */
export interface FactoryTracker {
    readonly sourceInfo: Map<string, FactoryInfo>;
    track(sf: ts.SourceFile, factorySymbolName: string): void;
}
/**
 * Generates ts.SourceFiles which contain variable declarations for NgFactories for every exported
 * class of an input ts.SourceFile.
 */
export declare class FactoryGenerator implements PerFileShimGenerator, FactoryTracker {
    readonly sourceInfo: Map<string, FactoryInfo>;
    private sourceToFactorySymbols;
    readonly shouldEmit = true;
    readonly extensionPrefix = "ngfactory";
    generateShimForFile(sf: ts.SourceFile, genFilePath: AbsoluteFsPath): ts.SourceFile;
    track(sf: ts.SourceFile, factorySymbolName: string): void;
}
export interface FactoryInfo {
    sourceFilePath: string;
    moduleSymbolNames: Set<string>;
}
export declare function generatedFactoryTransform(factoryMap: Map<string, FactoryInfo>, importRewriter: ImportRewriter): ts.TransformerFactory<ts.SourceFile>;
