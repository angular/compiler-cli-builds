/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/imports/src/core", ["require", "exports", "@angular/compiler-cli/src/ngtsc/util/src/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    /**
     * `ImportRewriter` that does no rewriting.
     */
    var NoopImportRewriter = /** @class */ (function () {
        function NoopImportRewriter() {
        }
        NoopImportRewriter.prototype.shouldImportSymbol = function (symbol, specifier) { return true; };
        NoopImportRewriter.prototype.rewriteSymbol = function (symbol, specifier) { return symbol; };
        NoopImportRewriter.prototype.rewriteSpecifier = function (specifier, inContextOfFile) { return specifier; };
        return NoopImportRewriter;
    }());
    exports.NoopImportRewriter = NoopImportRewriter;
    /**
     * A mapping of supported symbols that can be imported from within @angular/core, and the names by
     * which they're exported from r3_symbols.
     */
    var CORE_SUPPORTED_SYMBOLS = new Map([
        ['ΔdefineInjectable', 'ΔdefineInjectable'],
        ['ΔdefineInjector', 'ΔdefineInjector'],
        ['ΔdefineNgModule', 'ΔdefineNgModule'],
        ['ΔsetNgModuleScope', 'ΔsetNgModuleScope'],
        ['Δinject', 'Δinject'],
        ['ɵsetClassMetadata', 'setClassMetadata'],
        ['ΔInjectableDef', 'ΔInjectableDef'],
        ['ΔInjectorDef', 'ΔInjectorDef'],
        ['ΔNgModuleDefWithMeta', 'ΔNgModuleDefWithMeta'],
        ['ɵNgModuleFactory', 'NgModuleFactory'],
    ]);
    var CORE_MODULE = '@angular/core';
    /**
     * `ImportRewriter` that rewrites imports from '@angular/core' to be imported from the r3_symbols.ts
     * file instead.
     */
    var R3SymbolsImportRewriter = /** @class */ (function () {
        function R3SymbolsImportRewriter(r3SymbolsPath) {
            this.r3SymbolsPath = r3SymbolsPath;
        }
        R3SymbolsImportRewriter.prototype.shouldImportSymbol = function (symbol, specifier) { return true; };
        R3SymbolsImportRewriter.prototype.rewriteSymbol = function (symbol, specifier) {
            if (specifier !== CORE_MODULE) {
                // This import isn't from core, so ignore it.
                return symbol;
            }
            return validateAndRewriteCoreSymbol(symbol);
        };
        R3SymbolsImportRewriter.prototype.rewriteSpecifier = function (specifier, inContextOfFile) {
            if (specifier !== CORE_MODULE) {
                // This module isn't core, so ignore it.
                return specifier;
            }
            var relativePathToR3Symbols = path_1.relativePathBetween(inContextOfFile, this.r3SymbolsPath);
            if (relativePathToR3Symbols === null) {
                throw new Error("Failed to rewrite import inside " + CORE_MODULE + ": " + inContextOfFile + " -> " + this.r3SymbolsPath);
            }
            return relativePathToR3Symbols;
        };
        return R3SymbolsImportRewriter;
    }());
    exports.R3SymbolsImportRewriter = R3SymbolsImportRewriter;
    function validateAndRewriteCoreSymbol(name) {
        if (!CORE_SUPPORTED_SYMBOLS.has(name)) {
            throw new Error("Importing unexpected symbol " + name + " while compiling " + CORE_MODULE);
        }
        return CORE_SUPPORTED_SYMBOLS.get(name);
    }
    exports.validateAndRewriteCoreSymbol = validateAndRewriteCoreSymbol;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHNFQUF3RDtJQTBCeEQ7O09BRUc7SUFDSDtRQUFBO1FBTUEsQ0FBQztRQUxDLCtDQUFrQixHQUFsQixVQUFtQixNQUFjLEVBQUUsU0FBaUIsSUFBYSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0UsMENBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQixJQUFZLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUzRSw2Q0FBZ0IsR0FBaEIsVUFBaUIsU0FBaUIsRUFBRSxlQUF1QixJQUFZLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1Rix5QkFBQztJQUFELENBQUMsQUFORCxJQU1DO0lBTlksZ0RBQWtCO0lBUS9COzs7T0FHRztJQUNILElBQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQWlCO1FBQ3JELENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUM7UUFDMUMsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztRQUN0QyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO1FBQ3RDLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUM7UUFDMUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO1FBQ3RCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUM7UUFDekMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQztRQUNwQyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUM7UUFDaEMsQ0FBQyxzQkFBc0IsRUFBRSxzQkFBc0IsQ0FBQztRQUNoRCxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDO0tBQ3hDLENBQUMsQ0FBQztJQUVILElBQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQztJQUVwQzs7O09BR0c7SUFDSDtRQUNFLGlDQUFvQixhQUFxQjtZQUFyQixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUFHLENBQUM7UUFFN0Msb0RBQWtCLEdBQWxCLFVBQW1CLE1BQWMsRUFBRSxTQUFpQixJQUFhLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUUvRSwrQ0FBYSxHQUFiLFVBQWMsTUFBYyxFQUFFLFNBQWlCO1lBQzdDLElBQUksU0FBUyxLQUFLLFdBQVcsRUFBRTtnQkFDN0IsNkNBQTZDO2dCQUM3QyxPQUFPLE1BQU0sQ0FBQzthQUNmO1lBRUQsT0FBTyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsa0RBQWdCLEdBQWhCLFVBQWlCLFNBQWlCLEVBQUUsZUFBdUI7WUFDekQsSUFBSSxTQUFTLEtBQUssV0FBVyxFQUFFO2dCQUM3Qix3Q0FBd0M7Z0JBQ3hDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBTSx1QkFBdUIsR0FBRywwQkFBbUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3pGLElBQUksdUJBQXVCLEtBQUssSUFBSSxFQUFFO2dCQUNwQyxNQUFNLElBQUksS0FBSyxDQUNYLHFDQUFtQyxXQUFXLFVBQUssZUFBZSxZQUFPLElBQUksQ0FBQyxhQUFlLENBQUMsQ0FBQzthQUNwRztZQUVELE9BQU8sdUJBQXVCLENBQUM7UUFDakMsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQTVCRCxJQTRCQztJQTVCWSwwREFBdUI7SUE4QnBDLFNBQWdCLDRCQUE0QixDQUFDLElBQVk7UUFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUErQixJQUFJLHlCQUFvQixXQUFhLENBQUMsQ0FBQztTQUN2RjtRQUNELE9BQU8sc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFDO0lBQzVDLENBQUM7SUFMRCxvRUFLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZWxhdGl2ZVBhdGhCZXR3ZWVufSBmcm9tICcuLi8uLi91dGlsL3NyYy9wYXRoJztcblxuLyoqXG4gKiBSZXdyaXRlcyBpbXBvcnRzIG9mIHN5bWJvbHMgYmVpbmcgd3JpdHRlbiBpbnRvIGdlbmVyYXRlZCBjb2RlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydFJld3JpdGVyIHtcbiAgLyoqXG4gICAqIFNob3VsZCB0aGUgZ2l2ZW4gc3ltYm9sIGJlIGltcG9ydGVkIGF0IGFsbD9cbiAgICpcbiAgICogSWYgYHRydWVgLCB0aGUgc3ltYm9sIHNob3VsZCBiZSBpbXBvcnRlZCBmcm9tIHRoZSBnaXZlbiBzcGVjaWZpZXIuIElmIGBmYWxzZWAsIHRoZSBzeW1ib2xcbiAgICogc2hvdWxkIGJlIHJlZmVyZW5jZWQgZGlyZWN0bHksIHdpdGhvdXQgYW4gaW1wb3J0LlxuICAgKi9cbiAgc2hvdWxkSW1wb3J0U3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsbHkgcmV3cml0ZSBhIHJlZmVyZW5jZSB0byBhbiBpbXBvcnRlZCBzeW1ib2wsIGNoYW5naW5nIGVpdGhlciB0aGUgYmluZGluZyBwcmVmaXggb3IgdGhlXG4gICAqIHN5bWJvbCBuYW1lIGl0c2VsZi5cbiAgICovXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbGx5IHJld3JpdGUgdGhlIGdpdmVuIG1vZHVsZSBzcGVjaWZpZXIgaW4gdGhlIGNvbnRleHQgb2YgYSBnaXZlbiBmaWxlLlxuICAgKi9cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogYEltcG9ydFJld3JpdGVyYCB0aGF0IGRvZXMgbm8gcmV3cml0aW5nLlxuICovXG5leHBvcnQgY2xhc3MgTm9vcEltcG9ydFJld3JpdGVyIGltcGxlbWVudHMgSW1wb3J0UmV3cml0ZXIge1xuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiB0cnVlOyB9XG5cbiAgcmV3cml0ZVN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gc3ltYm9sOyB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcgeyByZXR1cm4gc3BlY2lmaWVyOyB9XG59XG5cbi8qKlxuICogQSBtYXBwaW5nIG9mIHN1cHBvcnRlZCBzeW1ib2xzIHRoYXQgY2FuIGJlIGltcG9ydGVkIGZyb20gd2l0aGluIEBhbmd1bGFyL2NvcmUsIGFuZCB0aGUgbmFtZXMgYnlcbiAqIHdoaWNoIHRoZXkncmUgZXhwb3J0ZWQgZnJvbSByM19zeW1ib2xzLlxuICovXG5jb25zdCBDT1JFX1NVUFBPUlRFRF9TWU1CT0xTID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oW1xuICBbJ86UZGVmaW5lSW5qZWN0YWJsZScsICfOlGRlZmluZUluamVjdGFibGUnXSxcbiAgWyfOlGRlZmluZUluamVjdG9yJywgJ86UZGVmaW5lSW5qZWN0b3InXSxcbiAgWyfOlGRlZmluZU5nTW9kdWxlJywgJ86UZGVmaW5lTmdNb2R1bGUnXSxcbiAgWyfOlHNldE5nTW9kdWxlU2NvcGUnLCAnzpRzZXROZ01vZHVsZVNjb3BlJ10sXG4gIFsnzpRpbmplY3QnLCAnzpRpbmplY3QnXSxcbiAgWyfJtXNldENsYXNzTWV0YWRhdGEnLCAnc2V0Q2xhc3NNZXRhZGF0YSddLFxuICBbJ86USW5qZWN0YWJsZURlZicsICfOlEluamVjdGFibGVEZWYnXSxcbiAgWyfOlEluamVjdG9yRGVmJywgJ86USW5qZWN0b3JEZWYnXSxcbiAgWyfOlE5nTW9kdWxlRGVmV2l0aE1ldGEnLCAnzpROZ01vZHVsZURlZldpdGhNZXRhJ10sXG4gIFsnybVOZ01vZHVsZUZhY3RvcnknLCAnTmdNb2R1bGVGYWN0b3J5J10sXG5dKTtcblxuY29uc3QgQ09SRV9NT0RVTEUgPSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogYEltcG9ydFJld3JpdGVyYCB0aGF0IHJld3JpdGVzIGltcG9ydHMgZnJvbSAnQGFuZ3VsYXIvY29yZScgdG8gYmUgaW1wb3J0ZWQgZnJvbSB0aGUgcjNfc3ltYm9scy50c1xuICogZmlsZSBpbnN0ZWFkLlxuICovXG5leHBvcnQgY2xhc3MgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcjNTeW1ib2xzUGF0aDogc3RyaW5nKSB7fVxuXG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRydWU7IH1cblxuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gQ09SRV9NT0RVTEUpIHtcbiAgICAgIC8vIFRoaXMgaW1wb3J0IGlzbid0IGZyb20gY29yZSwgc28gaWdub3JlIGl0LlxuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChzcGVjaWZpZXIgIT09IENPUkVfTU9EVUxFKSB7XG4gICAgICAvLyBUaGlzIG1vZHVsZSBpc24ndCBjb3JlLCBzbyBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gc3BlY2lmaWVyO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID0gcmVsYXRpdmVQYXRoQmV0d2VlbihpbkNvbnRleHRPZkZpbGUsIHRoaXMucjNTeW1ib2xzUGF0aCk7XG4gICAgaWYgKHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEZhaWxlZCB0byByZXdyaXRlIGltcG9ydCBpbnNpZGUgJHtDT1JFX01PRFVMRX06ICR7aW5Db250ZXh0T2ZGaWxlfSAtPiAke3RoaXMucjNTeW1ib2xzUGF0aH1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoVG9SM1N5bWJvbHM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQW5kUmV3cml0ZUNvcmVTeW1ib2wobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFDT1JFX1NVUFBPUlRFRF9TWU1CT0xTLmhhcyhuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0aW5nIHVuZXhwZWN0ZWQgc3ltYm9sICR7bmFtZX0gd2hpbGUgY29tcGlsaW5nICR7Q09SRV9NT0RVTEV9YCk7XG4gIH1cbiAgcmV0dXJuIENPUkVfU1VQUE9SVEVEX1NZTUJPTFMuZ2V0KG5hbWUpICE7XG59XG4iXX0=