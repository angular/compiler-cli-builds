/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser" />
import * as ts from 'typescript';
import { NgccReflectionHost } from '../host/ngcc_host';
import { FileParser } from './file_parser';
import { ParsedFile } from './parsed_file';
/**
 * Parses ESM5 package files for decoratrs classes.
 * ESM5 "classes" are actually functions wrapped by and returned
 * from an IFEE.
 */
export declare class Esm5FileParser implements FileParser {
    protected program: ts.Program;
    protected host: NgccReflectionHost;
    checker: ts.TypeChecker;
    constructor(program: ts.Program, host: NgccReflectionHost);
    parseFile(file: ts.SourceFile): ParsedFile[];
}
