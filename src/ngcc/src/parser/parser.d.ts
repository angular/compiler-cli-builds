/// <amd-module name="angular/packages/compiler-cli/src/ngcc/src/parser/parser" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
export declare class DecoratedClass {
    name: string;
    declaration: ts.Declaration;
    decorators: Decorator[];
    constructor(name: string, declaration: ts.Declaration, decorators: Decorator[]);
}
export interface PackageParser {
    /**
     * Parse a source file and identify all the declarations that represent exported classes,
     * which are also decorated.
     *
     * Identifying classes can be different depending upon the format of the source file.
     *
     * For example:
     *
     * - ES2015 files contain `class Xxxx {...}` style declarations
     * - ES5 files contain `var Xxxx = (function () { function Xxxx() { ... }; return Xxxx; })();` style
     *   declarations
     * - UMD have similar declarations to ES5 files but the whole thing is wrapped in IIFE module wrapper
     *   function.
     *
     * @param sourceFile the file containing classes to parse.
     * @returns an array of TypeScript declaration nodes that represent the exported classes.
     */
    getDecoratedClasses(sourceFile: ts.SourceFile): DecoratedClass[];
}
