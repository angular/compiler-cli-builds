/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/parsing/parsed_file" />
import * as ts from 'typescript';
import { ParsedClass } from './parsed_class';
export declare class ParsedFile {
    sourceFile: ts.SourceFile;
    decoratedClasses: ParsedClass[];
    constructor(sourceFile: ts.SourceFile);
}
