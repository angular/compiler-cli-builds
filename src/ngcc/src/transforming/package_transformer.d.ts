/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/transforming/package_transformer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { NgccReflectionHost } from '../host/ngcc_host';
import { FileParser } from '../parsing/file_parser';
import { FileInfo, Renderer } from '../rendering/renderer';
/**
 * A Package is stored in a directory on disk and that directory can contain one or more package formats - e.g. fesm2015, UMD, etc.
 *
 * Each of these formats exposes one or more entry points, which are source files that need to be
 * parsed to identify the decorated exported classes that need to be analyzed and compiled by one or
 * more `DecoratorHandler` objects.
 *
 * Each entry point to a package is identified by a `SourceFile` that can be parsed and analyzed
 * to identify classes that need to be transformed; and then finally rendered and written to disk.

 * The actual file which needs to be transformed depends upon the package format.
 *
 * - Flat file packages have all the classes in a single file.
 * - Other packages may re-export classes from other non-entry point files.
 * - Some formats may contain multiple "modules" in a single file.
 */
export declare class PackageTransformer {
    transform(packagePath: string, format: string): void;
    getHost(format: string, program: ts.Program): NgccReflectionHost;
    getFileParser(format: string, program: ts.Program, host: NgccReflectionHost): FileParser;
    getRenderer(format: string, program: ts.Program, host: NgccReflectionHost): Renderer;
    findNodeModulesPath(src: string): string;
    writeFile(file: FileInfo): void;
}
