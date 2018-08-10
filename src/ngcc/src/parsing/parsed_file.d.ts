/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngcc/src/parsing/parsed_file" />
import * as ts from 'typescript';
import { ParsedClass } from './parsed_class';
/**
 * Information about a source file that has been parsed to
 * extract all the decorated exported classes.
 */
export declare class ParsedFile {
    sourceFile: ts.SourceFile;
    /**
     * The decorated exported classes that have been parsed out
     * from the file.
     */
    decoratedClasses: ParsedClass[];
    constructor(sourceFile: ts.SourceFile);
}
