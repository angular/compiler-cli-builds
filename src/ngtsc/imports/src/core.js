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
        ['defineInjectable', 'defineInjectable'],
        ['defineInjector', 'defineInjector'],
        ['ɵdefineNgModule', 'defineNgModule'],
        ['inject', 'inject'],
        ['ɵsetClassMetadata', 'setClassMetadata'],
        ['ɵInjectableDef', 'InjectableDef'],
        ['ɵInjectorDef', 'InjectorDef'],
        ['ɵNgModuleDefWithMeta', 'NgModuleDefWithMeta'],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHNFQUF3RDtJQTBCeEQ7O09BRUc7SUFDSDtRQUFBO1FBTUEsQ0FBQztRQUxDLCtDQUFrQixHQUFsQixVQUFtQixNQUFjLEVBQUUsU0FBaUIsSUFBYSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0UsMENBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQixJQUFZLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUzRSw2Q0FBZ0IsR0FBaEIsVUFBaUIsU0FBaUIsRUFBRSxlQUF1QixJQUFZLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1Rix5QkFBQztJQUFELENBQUMsQUFORCxJQU1DO0lBTlksZ0RBQWtCO0lBUS9COzs7T0FHRztJQUNILElBQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQWlCO1FBQ3JELENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUM7UUFDeEMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQztRQUNwQyxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDO1FBQ3JDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztRQUNwQixDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDO1FBQ3pDLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDO1FBQ25DLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQztRQUMvQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixDQUFDO1FBQy9DLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUM7S0FDeEMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDO0lBRXBDOzs7T0FHRztJQUNIO1FBQ0UsaUNBQW9CLGFBQXFCO1lBQXJCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQUcsQ0FBQztRQUU3QyxvREFBa0IsR0FBbEIsVUFBbUIsTUFBYyxFQUFFLFNBQWlCLElBQWEsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRS9FLCtDQUFhLEdBQWIsVUFBYyxNQUFjLEVBQUUsU0FBaUI7WUFDN0MsSUFBSSxTQUFTLEtBQUssV0FBVyxFQUFFO2dCQUM3Qiw2Q0FBNkM7Z0JBQzdDLE9BQU8sTUFBTSxDQUFDO2FBQ2Y7WUFFRCxPQUFPLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCxrREFBZ0IsR0FBaEIsVUFBaUIsU0FBaUIsRUFBRSxlQUF1QjtZQUN6RCxJQUFJLFNBQVMsS0FBSyxXQUFXLEVBQUU7Z0JBQzdCLHdDQUF3QztnQkFDeEMsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxJQUFNLHVCQUF1QixHQUFHLDBCQUFtQixDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDekYsSUFBSSx1QkFBdUIsS0FBSyxJQUFJLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQ1gscUNBQW1DLFdBQVcsVUFBSyxlQUFlLFlBQU8sSUFBSSxDQUFDLGFBQWUsQ0FBQyxDQUFDO2FBQ3BHO1lBRUQsT0FBTyx1QkFBdUIsQ0FBQztRQUNqQyxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBNUJELElBNEJDO0lBNUJZLDBEQUF1QjtJQThCcEMsU0FBZ0IsNEJBQTRCLENBQUMsSUFBWTtRQUN2RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQStCLElBQUkseUJBQW9CLFdBQWEsQ0FBQyxDQUFDO1NBQ3ZGO1FBQ0QsT0FBTyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUM7SUFDNUMsQ0FBQztJQUxELG9FQUtDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG4vKipcbiAqIFJld3JpdGVzIGltcG9ydHMgb2Ygc3ltYm9scyBiZWluZyB3cml0dGVuIGludG8gZ2VuZXJhdGVkIGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0UmV3cml0ZXIge1xuICAvKipcbiAgICogU2hvdWxkIHRoZSBnaXZlbiBzeW1ib2wgYmUgaW1wb3J0ZWQgYXQgYWxsP1xuICAgKlxuICAgKiBJZiBgdHJ1ZWAsIHRoZSBzeW1ib2wgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gdGhlIGdpdmVuIHNwZWNpZmllci4gSWYgYGZhbHNlYCwgdGhlIHN5bWJvbFxuICAgKiBzaG91bGQgYmUgcmVmZXJlbmNlZCBkaXJlY3RseSwgd2l0aG91dCBhbiBpbXBvcnQuXG4gICAqL1xuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogT3B0aW9uYWxseSByZXdyaXRlIGEgcmVmZXJlbmNlIHRvIGFuIGltcG9ydGVkIHN5bWJvbCwgY2hhbmdpbmcgZWl0aGVyIHRoZSBiaW5kaW5nIHByZWZpeCBvciB0aGVcbiAgICogc3ltYm9sIG5hbWUgaXRzZWxmLlxuICAgKi9cbiAgcmV3cml0ZVN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsbHkgcmV3cml0ZSB0aGUgZ2l2ZW4gbW9kdWxlIHNwZWNpZmllciBpbiB0aGUgY29udGV4dCBvZiBhIGdpdmVuIGZpbGUuXG4gICAqL1xuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBgSW1wb3J0UmV3cml0ZXJgIHRoYXQgZG9lcyBubyByZXdyaXRpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb29wSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRydWU7IH1cblxuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBzeW1ib2w7IH1cblxuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBzcGVjaWZpZXI7IH1cbn1cblxuLyoqXG4gKiBBIG1hcHBpbmcgb2Ygc3VwcG9ydGVkIHN5bWJvbHMgdGhhdCBjYW4gYmUgaW1wb3J0ZWQgZnJvbSB3aXRoaW4gQGFuZ3VsYXIvY29yZSwgYW5kIHRoZSBuYW1lcyBieVxuICogd2hpY2ggdGhleSdyZSBleHBvcnRlZCBmcm9tIHIzX3N5bWJvbHMuXG4gKi9cbmNvbnN0IENPUkVfU1VQUE9SVEVEX1NZTUJPTFMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPihbXG4gIFsnZGVmaW5lSW5qZWN0YWJsZScsICdkZWZpbmVJbmplY3RhYmxlJ10sXG4gIFsnZGVmaW5lSW5qZWN0b3InLCAnZGVmaW5lSW5qZWN0b3InXSxcbiAgWyfJtWRlZmluZU5nTW9kdWxlJywgJ2RlZmluZU5nTW9kdWxlJ10sXG4gIFsnaW5qZWN0JywgJ2luamVjdCddLFxuICBbJ8m1c2V0Q2xhc3NNZXRhZGF0YScsICdzZXRDbGFzc01ldGFkYXRhJ10sXG4gIFsnybVJbmplY3RhYmxlRGVmJywgJ0luamVjdGFibGVEZWYnXSxcbiAgWyfJtUluamVjdG9yRGVmJywgJ0luamVjdG9yRGVmJ10sXG4gIFsnybVOZ01vZHVsZURlZldpdGhNZXRhJywgJ05nTW9kdWxlRGVmV2l0aE1ldGEnXSxcbiAgWyfJtU5nTW9kdWxlRmFjdG9yeScsICdOZ01vZHVsZUZhY3RvcnknXSxcbl0pO1xuXG5jb25zdCBDT1JFX01PRFVMRSA9ICdAYW5ndWxhci9jb3JlJztcblxuLyoqXG4gKiBgSW1wb3J0UmV3cml0ZXJgIHRoYXQgcmV3cml0ZXMgaW1wb3J0cyBmcm9tICdAYW5ndWxhci9jb3JlJyB0byBiZSBpbXBvcnRlZCBmcm9tIHRoZSByM19zeW1ib2xzLnRzXG4gKiBmaWxlIGluc3RlYWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciBpbXBsZW1lbnRzIEltcG9ydFJld3JpdGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByM1N5bWJvbHNQYXRoOiBzdHJpbmcpIHt9XG5cbiAgc2hvdWxkSW1wb3J0U3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdHJ1ZTsgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAoc3BlY2lmaWVyICE9PSBDT1JFX01PRFVMRSkge1xuICAgICAgLy8gVGhpcyBpbXBvcnQgaXNuJ3QgZnJvbSBjb3JlLCBzbyBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZGF0ZUFuZFJld3JpdGVDb3JlU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gQ09SRV9NT0RVTEUpIHtcbiAgICAgIC8vIFRoaXMgbW9kdWxlIGlzbid0IGNvcmUsIHNvIGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBzcGVjaWZpZXI7XG4gICAgfVxuXG4gICAgY29uc3QgcmVsYXRpdmVQYXRoVG9SM1N5bWJvbHMgPSByZWxhdGl2ZVBhdGhCZXR3ZWVuKGluQ29udGV4dE9mRmlsZSwgdGhpcy5yM1N5bWJvbHNQYXRoKTtcbiAgICBpZiAocmVsYXRpdmVQYXRoVG9SM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIHJld3JpdGUgaW1wb3J0IGluc2lkZSAke0NPUkVfTU9EVUxFfTogJHtpbkNvbnRleHRPZkZpbGV9IC0+ICR7dGhpcy5yM1N5bWJvbHNQYXRofWApO1xuICAgIH1cblxuICAgIHJldHVybiByZWxhdGl2ZVBhdGhUb1IzU3ltYm9scztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIUNPUkVfU1VQUE9SVEVEX1NZTUJPTFMuaGFzKG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnRpbmcgdW5leHBlY3RlZCBzeW1ib2wgJHtuYW1lfSB3aGlsZSBjb21waWxpbmcgJHtDT1JFX01PRFVMRX1gKTtcbiAgfVxuICByZXR1cm4gQ09SRV9TVVBQT1JURURfU1lNQk9MUy5nZXQobmFtZSkgITtcbn1cbiJdfQ==