/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Diagnostic } from './api';
export declare const GENERATED_FILES: RegExp;
export declare const EXT: RegExp;
export declare const enum StructureIsReused {
    Not = 0,
    SafeModules = 1,
    Completely = 2,
}
export declare function tsStructureIsReused(program: ts.Program): StructureIsReused;
export declare function createMessageDiagnostic(messageText: string): ts.Diagnostic & Diagnostic;
export declare function isGeneratedFile(fileName: string): boolean;
