/// <amd-module name="@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer" />
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
import { AnalyzedClass } from '../analyzer';
import { Renderer } from './renderer';
export declare class Esm2015Renderer extends Renderer {
    protected host: NgccReflectionHost;
    constructor(host: NgccReflectionHost);
    /**
     *  Add the imports at the top of the file
     */
    addImports(output: MagicString, imports: {
        name: string;
        as: string;
    }[]): void;
    /**
     * Add the definitions to each decorated class
     */
    addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string): void;
    /**
     * Remove static decorator properties from classes
     */
    removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>): void;
}
