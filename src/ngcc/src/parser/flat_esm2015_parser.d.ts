/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/parser/flat_esm2015_parser" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { NgccReflectionHost } from '../host/ngcc_host';
import { DecoratedClass, PackageParser } from './parser';
export declare class FlatEsm2015PackageParser implements PackageParser {
    protected checker: ts.TypeChecker;
    protected host: NgccReflectionHost;
    constructor(checker: ts.TypeChecker, host: NgccReflectionHost);
    getDecoratedClasses(sourceFile: ts.SourceFile): DecoratedClass[];
}
