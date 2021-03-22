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
        define("@angular/compiler-cli/src/ngtsc/imports/src/core", ["require", "exports", "@angular/compiler-cli/src/ngtsc/util/src/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateAndRewriteCoreSymbol = exports.R3SymbolsImportRewriter = exports.NoopImportRewriter = void 0;
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    /**
     * `ImportRewriter` that does no rewriting.
     */
    var NoopImportRewriter = /** @class */ (function () {
        function NoopImportRewriter() {
        }
        NoopImportRewriter.prototype.shouldImportSymbol = function (symbol, specifier) {
            return true;
        };
        NoopImportRewriter.prototype.rewriteSymbol = function (symbol, specifier) {
            return symbol;
        };
        NoopImportRewriter.prototype.rewriteSpecifier = function (specifier, inContextOfFile) {
            return specifier;
        };
        return NoopImportRewriter;
    }());
    exports.NoopImportRewriter = NoopImportRewriter;
    /**
     * A mapping of supported symbols that can be imported from within @angular/core, and the names by
     * which they're exported from r3_symbols.
     */
    var CORE_SUPPORTED_SYMBOLS = new Map([
        ['ɵɵdefineInjectable', 'ɵɵdefineInjectable'],
        ['ɵɵdefineInjector', 'ɵɵdefineInjector'],
        ['ɵɵdefineNgModule', 'ɵɵdefineNgModule'],
        ['ɵɵsetNgModuleScope', 'ɵɵsetNgModuleScope'],
        ['ɵɵinject', 'ɵɵinject'],
        ['ɵɵFactoryDeclaration', 'ɵɵFactoryDeclaration'],
        ['ɵsetClassMetadata', 'setClassMetadata'],
        ['ɵɵInjectableDef', 'ɵɵInjectableDef'],
        ['ɵɵInjectorDeclaration', 'ɵɵInjectorDeclaration'],
        ['ɵɵNgModuleDeclaration', 'ɵɵNgModuleDeclaration'],
        ['ɵNgModuleFactory', 'NgModuleFactory'],
        ['ɵnoSideEffects', 'ɵnoSideEffects'],
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
        R3SymbolsImportRewriter.prototype.shouldImportSymbol = function (symbol, specifier) {
            return true;
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzRUFBd0Q7SUEwQnhEOztPQUVHO0lBQ0g7UUFBQTtRQVlBLENBQUM7UUFYQywrQ0FBa0IsR0FBbEIsVUFBbUIsTUFBYyxFQUFFLFNBQWlCO1lBQ2xELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELDBDQUFhLEdBQWIsVUFBYyxNQUFjLEVBQUUsU0FBaUI7WUFDN0MsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELDZDQUFnQixHQUFoQixVQUFpQixTQUFpQixFQUFFLGVBQXVCO1lBQ3pELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFaRCxJQVlDO0lBWlksZ0RBQWtCO0lBYy9COzs7T0FHRztJQUNILElBQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQWlCO1FBQ3JELENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUM7UUFDNUMsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztRQUN4QyxDQUFDLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDO1FBQ3hDLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUM7UUFDNUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1FBQ3hCLENBQUMsc0JBQXNCLEVBQUUsc0JBQXNCLENBQUM7UUFDaEQsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQztRQUN6QyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO1FBQ3RDLENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUM7UUFDbEQsQ0FBQyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQztRQUNsRCxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDO1FBQ3ZDLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDO0lBRXBDOzs7T0FHRztJQUNIO1FBQ0UsaUNBQW9CLGFBQXFCO1lBQXJCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQUcsQ0FBQztRQUU3QyxvREFBa0IsR0FBbEIsVUFBbUIsTUFBYyxFQUFFLFNBQWlCO1lBQ2xELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELCtDQUFhLEdBQWIsVUFBYyxNQUFjLEVBQUUsU0FBaUI7WUFDN0MsSUFBSSxTQUFTLEtBQUssV0FBVyxFQUFFO2dCQUM3Qiw2Q0FBNkM7Z0JBQzdDLE9BQU8sTUFBTSxDQUFDO2FBQ2Y7WUFFRCxPQUFPLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCxrREFBZ0IsR0FBaEIsVUFBaUIsU0FBaUIsRUFBRSxlQUF1QjtZQUN6RCxJQUFJLFNBQVMsS0FBSyxXQUFXLEVBQUU7Z0JBQzdCLHdDQUF3QztnQkFDeEMsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxJQUFNLHVCQUF1QixHQUFHLDBCQUFtQixDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDekYsSUFBSSx1QkFBdUIsS0FBSyxJQUFJLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQW1DLFdBQVcsVUFBSyxlQUFlLFlBQzlFLElBQUksQ0FBQyxhQUFlLENBQUMsQ0FBQzthQUMzQjtZQUVELE9BQU8sdUJBQXVCLENBQUM7UUFDakMsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQTlCRCxJQThCQztJQTlCWSwwREFBdUI7SUFnQ3BDLFNBQWdCLDRCQUE0QixDQUFDLElBQVk7UUFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUErQixJQUFJLHlCQUFvQixXQUFhLENBQUMsQ0FBQztTQUN2RjtRQUNELE9BQU8sc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO0lBQzNDLENBQUM7SUFMRCxvRUFLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG4vKipcbiAqIFJld3JpdGVzIGltcG9ydHMgb2Ygc3ltYm9scyBiZWluZyB3cml0dGVuIGludG8gZ2VuZXJhdGVkIGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0UmV3cml0ZXIge1xuICAvKipcbiAgICogU2hvdWxkIHRoZSBnaXZlbiBzeW1ib2wgYmUgaW1wb3J0ZWQgYXQgYWxsP1xuICAgKlxuICAgKiBJZiBgdHJ1ZWAsIHRoZSBzeW1ib2wgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gdGhlIGdpdmVuIHNwZWNpZmllci4gSWYgYGZhbHNlYCwgdGhlIHN5bWJvbFxuICAgKiBzaG91bGQgYmUgcmVmZXJlbmNlZCBkaXJlY3RseSwgd2l0aG91dCBhbiBpbXBvcnQuXG4gICAqL1xuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogT3B0aW9uYWxseSByZXdyaXRlIGEgcmVmZXJlbmNlIHRvIGFuIGltcG9ydGVkIHN5bWJvbCwgY2hhbmdpbmcgZWl0aGVyIHRoZSBiaW5kaW5nIHByZWZpeCBvciB0aGVcbiAgICogc3ltYm9sIG5hbWUgaXRzZWxmLlxuICAgKi9cbiAgcmV3cml0ZVN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsbHkgcmV3cml0ZSB0aGUgZ2l2ZW4gbW9kdWxlIHNwZWNpZmllciBpbiB0aGUgY29udGV4dCBvZiBhIGdpdmVuIGZpbGUuXG4gICAqL1xuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBgSW1wb3J0UmV3cml0ZXJgIHRoYXQgZG9lcyBubyByZXdyaXRpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb29wSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcGVjaWZpZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIG1hcHBpbmcgb2Ygc3VwcG9ydGVkIHN5bWJvbHMgdGhhdCBjYW4gYmUgaW1wb3J0ZWQgZnJvbSB3aXRoaW4gQGFuZ3VsYXIvY29yZSwgYW5kIHRoZSBuYW1lcyBieVxuICogd2hpY2ggdGhleSdyZSBleHBvcnRlZCBmcm9tIHIzX3N5bWJvbHMuXG4gKi9cbmNvbnN0IENPUkVfU1VQUE9SVEVEX1NZTUJPTFMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPihbXG4gIFsnybXJtWRlZmluZUluamVjdGFibGUnLCAnybXJtWRlZmluZUluamVjdGFibGUnXSxcbiAgWyfJtcm1ZGVmaW5lSW5qZWN0b3InLCAnybXJtWRlZmluZUluamVjdG9yJ10sXG4gIFsnybXJtWRlZmluZU5nTW9kdWxlJywgJ8m1ybVkZWZpbmVOZ01vZHVsZSddLFxuICBbJ8m1ybVzZXROZ01vZHVsZVNjb3BlJywgJ8m1ybVzZXROZ01vZHVsZVNjb3BlJ10sXG4gIFsnybXJtWluamVjdCcsICfJtcm1aW5qZWN0J10sXG4gIFsnybXJtUZhY3RvcnlEZWNsYXJhdGlvbicsICfJtcm1RmFjdG9yeURlY2xhcmF0aW9uJ10sXG4gIFsnybVzZXRDbGFzc01ldGFkYXRhJywgJ3NldENsYXNzTWV0YWRhdGEnXSxcbiAgWyfJtcm1SW5qZWN0YWJsZURlZicsICfJtcm1SW5qZWN0YWJsZURlZiddLFxuICBbJ8m1ybVJbmplY3RvckRlY2xhcmF0aW9uJywgJ8m1ybVJbmplY3RvckRlY2xhcmF0aW9uJ10sXG4gIFsnybXJtU5nTW9kdWxlRGVjbGFyYXRpb24nLCAnybXJtU5nTW9kdWxlRGVjbGFyYXRpb24nXSxcbiAgWyfJtU5nTW9kdWxlRmFjdG9yeScsICdOZ01vZHVsZUZhY3RvcnknXSxcbiAgWyfJtW5vU2lkZUVmZmVjdHMnLCAnybVub1NpZGVFZmZlY3RzJ10sXG5dKTtcblxuY29uc3QgQ09SRV9NT0RVTEUgPSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogYEltcG9ydFJld3JpdGVyYCB0aGF0IHJld3JpdGVzIGltcG9ydHMgZnJvbSAnQGFuZ3VsYXIvY29yZScgdG8gYmUgaW1wb3J0ZWQgZnJvbSB0aGUgcjNfc3ltYm9scy50c1xuICogZmlsZSBpbnN0ZWFkLlxuICovXG5leHBvcnQgY2xhc3MgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcjNTeW1ib2xzUGF0aDogc3RyaW5nKSB7fVxuXG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAoc3BlY2lmaWVyICE9PSBDT1JFX01PRFVMRSkge1xuICAgICAgLy8gVGhpcyBpbXBvcnQgaXNuJ3QgZnJvbSBjb3JlLCBzbyBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZGF0ZUFuZFJld3JpdGVDb3JlU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gQ09SRV9NT0RVTEUpIHtcbiAgICAgIC8vIFRoaXMgbW9kdWxlIGlzbid0IGNvcmUsIHNvIGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBzcGVjaWZpZXI7XG4gICAgfVxuXG4gICAgY29uc3QgcmVsYXRpdmVQYXRoVG9SM1N5bWJvbHMgPSByZWxhdGl2ZVBhdGhCZXR3ZWVuKGluQ29udGV4dE9mRmlsZSwgdGhpcy5yM1N5bWJvbHNQYXRoKTtcbiAgICBpZiAocmVsYXRpdmVQYXRoVG9SM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJld3JpdGUgaW1wb3J0IGluc2lkZSAke0NPUkVfTU9EVUxFfTogJHtpbkNvbnRleHRPZkZpbGV9IC0+ICR7XG4gICAgICAgICAgdGhpcy5yM1N5bWJvbHNQYXRofWApO1xuICAgIH1cblxuICAgIHJldHVybiByZWxhdGl2ZVBhdGhUb1IzU3ltYm9scztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIUNPUkVfU1VQUE9SVEVEX1NZTUJPTFMuaGFzKG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnRpbmcgdW5leHBlY3RlZCBzeW1ib2wgJHtuYW1lfSB3aGlsZSBjb21waWxpbmcgJHtDT1JFX01PRFVMRX1gKTtcbiAgfVxuICByZXR1cm4gQ09SRV9TVVBQT1JURURfU1lNQk9MUy5nZXQobmFtZSkhO1xufVxuIl19