/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/** The module name for Angular core. */
export declare const CORE_MODULE = "@angular/core";
/**
 * Validates that an imported symbol is a supported Angular core symbol and returns
 * the symbol name by which it is exported from `r3_symbols`.
 */
export declare function validateAndRewriteCoreSymbol(name: string): string;
