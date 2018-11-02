/// <amd-module name="@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import MagicString from 'magic-string';
import { NgccReflectionHost } from '../host/ngcc_host';
import { CompiledClass } from '../analysis/decoration_analyzer';
import { EsmRenderer } from './esm_renderer';
export declare class Esm5Renderer extends EsmRenderer {
    protected host: NgccReflectionHost;
    protected isCore: boolean;
    protected rewriteCoreImportsTo: ts.SourceFile | null;
    protected sourcePath: string;
    protected targetPath: string;
    constructor(host: NgccReflectionHost, isCore: boolean, rewriteCoreImportsTo: ts.SourceFile | null, sourcePath: string, targetPath: string, transformDts: boolean);
    /**
     * Add the definitions to each decorated class
     */
    addDefinitions(output: MagicString, compiledClass: CompiledClass, definitions: string): void;
}
