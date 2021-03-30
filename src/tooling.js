/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/tooling", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GLOBAL_DEFS_FOR_TERSER_WITH_AOT = exports.GLOBAL_DEFS_FOR_TERSER = void 0;
    var tslib_1 = require("tslib");
    /**
     * @fileoverview
     * This file is used as a private API channel to shared Angular FW APIs with @angular/cli.
     *
     * Any changes to this file should be discussed with the Angular CLI team.
     */
    /**
     * Known values for global variables in `@angular/core` that Terser should set using
     * https://github.com/terser-js/terser#conditional-compilation
     */
    exports.GLOBAL_DEFS_FOR_TERSER = {
        ngDevMode: false,
        ngI18nClosureMode: false,
    };
    exports.GLOBAL_DEFS_FOR_TERSER_WITH_AOT = tslib_1.__assign(tslib_1.__assign({}, exports.GLOBAL_DEFS_FOR_TERSER), { ngJitMode: false });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdG9vbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUg7Ozs7O09BS0c7SUFJSDs7O09BR0c7SUFDVSxRQUFBLHNCQUFzQixHQUFHO1FBQ3BDLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLGlCQUFpQixFQUFFLEtBQUs7S0FDekIsQ0FBQztJQUVXLFFBQUEsK0JBQStCLHlDQUN2Qyw4QkFBc0IsS0FDekIsU0FBUyxFQUFFLEtBQUssSUFDaEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3XG4gKiBUaGlzIGZpbGUgaXMgdXNlZCBhcyBhIHByaXZhdGUgQVBJIGNoYW5uZWwgdG8gc2hhcmVkIEFuZ3VsYXIgRlcgQVBJcyB3aXRoIEBhbmd1bGFyL2NsaS5cbiAqXG4gKiBBbnkgY2hhbmdlcyB0byB0aGlzIGZpbGUgc2hvdWxkIGJlIGRpc2N1c3NlZCB3aXRoIHRoZSBBbmd1bGFyIENMSSB0ZWFtLlxuICovXG5cblxuXG4vKipcbiAqIEtub3duIHZhbHVlcyBmb3IgZ2xvYmFsIHZhcmlhYmxlcyBpbiBgQGFuZ3VsYXIvY29yZWAgdGhhdCBUZXJzZXIgc2hvdWxkIHNldCB1c2luZ1xuICogaHR0cHM6Ly9naXRodWIuY29tL3RlcnNlci1qcy90ZXJzZXIjY29uZGl0aW9uYWwtY29tcGlsYXRpb25cbiAqL1xuZXhwb3J0IGNvbnN0IEdMT0JBTF9ERUZTX0ZPUl9URVJTRVIgPSB7XG4gIG5nRGV2TW9kZTogZmFsc2UsXG4gIG5nSTE4bkNsb3N1cmVNb2RlOiBmYWxzZSxcbn07XG5cbmV4cG9ydCBjb25zdCBHTE9CQUxfREVGU19GT1JfVEVSU0VSX1dJVEhfQU9UID0ge1xuICAuLi5HTE9CQUxfREVGU19GT1JfVEVSU0VSLFxuICBuZ0ppdE1vZGU6IGZhbHNlLFxufTtcbiJdfQ==