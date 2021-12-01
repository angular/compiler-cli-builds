/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/transformers/util" />
import ts from 'typescript';
import { Diagnostic } from './api';
export declare const GENERATED_FILES: RegExp;
export declare function error(msg: string): never;
export declare function createMessageDiagnostic(messageText: string): ts.Diagnostic & Diagnostic;
/**
 * Converts a ng.Diagnostic into a ts.Diagnostic.
 * This looses some information, and also uses an incomplete object as `file`.
 *
 * I.e. only use this where the API allows only a ts.Diagnostic.
 */
export declare function ngToTsDiagnostic(ng: Diagnostic): ts.Diagnostic;
