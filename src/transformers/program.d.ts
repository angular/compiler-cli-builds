/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { MessageBundle } from '@angular/compiler';
import * as ts from 'typescript';
import { CompilerHost, CompilerOptions, Program } from './api';
export declare function createProgram({rootNames, options, host, oldProgram}: {
    rootNames: string[];
    options: CompilerOptions;
    host: CompilerHost;
    oldProgram?: Program;
}): Program;
export declare function i18nExtract(formatName: string | null, outFile: string | null, host: ts.CompilerHost, options: CompilerOptions, bundle: MessageBundle): string[];
export declare function i18nSerialize(bundle: MessageBundle, formatName: string, options: CompilerOptions): string;
export declare function i18nGetExtension(formatName: string): string;
