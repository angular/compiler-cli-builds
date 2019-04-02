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
        ['ɵsetNgModuleScope', 'setNgModuleScope'],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHNFQUF3RDtJQTBCeEQ7O09BRUc7SUFDSDtRQUFBO1FBTUEsQ0FBQztRQUxDLCtDQUFrQixHQUFsQixVQUFtQixNQUFjLEVBQUUsU0FBaUIsSUFBYSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0UsMENBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQixJQUFZLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUzRSw2Q0FBZ0IsR0FBaEIsVUFBaUIsU0FBaUIsRUFBRSxlQUF1QixJQUFZLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM1Rix5QkFBQztJQUFELENBQUMsQUFORCxJQU1DO0lBTlksZ0RBQWtCO0lBUS9COzs7T0FHRztJQUNILElBQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQWlCO1FBQ3JELENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUM7UUFDeEMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQztRQUNwQyxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDO1FBQ3JDLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUM7UUFDekMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1FBQ3BCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUM7UUFDekMsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUM7UUFDbkMsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDO1FBQy9CLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLENBQUM7UUFDL0MsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQztLQUN4QyxDQUFDLENBQUM7SUFFSCxJQUFNLFdBQVcsR0FBRyxlQUFlLENBQUM7SUFFcEM7OztPQUdHO0lBQ0g7UUFDRSxpQ0FBb0IsYUFBcUI7WUFBckIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFBRyxDQUFDO1FBRTdDLG9EQUFrQixHQUFsQixVQUFtQixNQUFjLEVBQUUsU0FBaUIsSUFBYSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0UsK0NBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQjtZQUM3QyxJQUFJLFNBQVMsS0FBSyxXQUFXLEVBQUU7Z0JBQzdCLDZDQUE2QztnQkFDN0MsT0FBTyxNQUFNLENBQUM7YUFDZjtZQUVELE9BQU8sNEJBQTRCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELGtEQUFnQixHQUFoQixVQUFpQixTQUFpQixFQUFFLGVBQXVCO1lBQ3pELElBQUksU0FBUyxLQUFLLFdBQVcsRUFBRTtnQkFDN0Isd0NBQXdDO2dCQUN4QyxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELElBQU0sdUJBQXVCLEdBQUcsMEJBQW1CLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN6RixJQUFJLHVCQUF1QixLQUFLLElBQUksRUFBRTtnQkFDcEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsV0FBVyxVQUFLLGVBQWUsWUFBTyxJQUFJLENBQUMsYUFBZSxDQUFDLENBQUM7YUFDcEc7WUFFRCxPQUFPLHVCQUF1QixDQUFDO1FBQ2pDLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUE1QkQsSUE0QkM7SUE1QlksMERBQXVCO0lBOEJwQyxTQUFnQiw0QkFBNEIsQ0FBQyxJQUFZO1FBQ3ZELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBK0IsSUFBSSx5QkFBb0IsV0FBYSxDQUFDLENBQUM7U0FDdkY7UUFDRCxPQUFPLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQztJQUM1QyxDQUFDO0lBTEQsb0VBS0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7cmVsYXRpdmVQYXRoQmV0d2Vlbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5cbi8qKlxuICogUmV3cml0ZXMgaW1wb3J0cyBvZiBzeW1ib2xzIGJlaW5nIHdyaXR0ZW4gaW50byBnZW5lcmF0ZWQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRSZXdyaXRlciB7XG4gIC8qKlxuICAgKiBTaG91bGQgdGhlIGdpdmVuIHN5bWJvbCBiZSBpbXBvcnRlZCBhdCBhbGw/XG4gICAqXG4gICAqIElmIGB0cnVlYCwgdGhlIHN5bWJvbCBzaG91bGQgYmUgaW1wb3J0ZWQgZnJvbSB0aGUgZ2l2ZW4gc3BlY2lmaWVyLiBJZiBgZmFsc2VgLCB0aGUgc3ltYm9sXG4gICAqIHNob3VsZCBiZSByZWZlcmVuY2VkIGRpcmVjdGx5LCB3aXRob3V0IGFuIGltcG9ydC5cbiAgICovXG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbGx5IHJld3JpdGUgYSByZWZlcmVuY2UgdG8gYW4gaW1wb3J0ZWQgc3ltYm9sLCBjaGFuZ2luZyBlaXRoZXIgdGhlIGJpbmRpbmcgcHJlZml4IG9yIHRoZVxuICAgKiBzeW1ib2wgbmFtZSBpdHNlbGYuXG4gICAqL1xuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWxseSByZXdyaXRlIHRoZSBnaXZlbiBtb2R1bGUgc3BlY2lmaWVyIGluIHRoZSBjb250ZXh0IG9mIGEgZ2l2ZW4gZmlsZS5cbiAgICovXG4gIHJld3JpdGVTcGVjaWZpZXIoc3BlY2lmaWVyOiBzdHJpbmcsIGluQ29udGV4dE9mRmlsZTogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIGBJbXBvcnRSZXdyaXRlcmAgdGhhdCBkb2VzIG5vIHJld3JpdGluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vb3BJbXBvcnRSZXdyaXRlciBpbXBsZW1lbnRzIEltcG9ydFJld3JpdGVyIHtcbiAgc2hvdWxkSW1wb3J0U3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdHJ1ZTsgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIHN5bWJvbDsgfVxuXG4gIHJld3JpdGVTcGVjaWZpZXIoc3BlY2lmaWVyOiBzdHJpbmcsIGluQ29udGV4dE9mRmlsZTogc3RyaW5nKTogc3RyaW5nIHsgcmV0dXJuIHNwZWNpZmllcjsgfVxufVxuXG4vKipcbiAqIEEgbWFwcGluZyBvZiBzdXBwb3J0ZWQgc3ltYm9scyB0aGF0IGNhbiBiZSBpbXBvcnRlZCBmcm9tIHdpdGhpbiBAYW5ndWxhci9jb3JlLCBhbmQgdGhlIG5hbWVzIGJ5XG4gKiB3aGljaCB0aGV5J3JlIGV4cG9ydGVkIGZyb20gcjNfc3ltYm9scy5cbiAqL1xuY29uc3QgQ09SRV9TVVBQT1JURURfU1lNQk9MUyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KFtcbiAgWydkZWZpbmVJbmplY3RhYmxlJywgJ2RlZmluZUluamVjdGFibGUnXSxcbiAgWydkZWZpbmVJbmplY3RvcicsICdkZWZpbmVJbmplY3RvciddLFxuICBbJ8m1ZGVmaW5lTmdNb2R1bGUnLCAnZGVmaW5lTmdNb2R1bGUnXSxcbiAgWyfJtXNldE5nTW9kdWxlU2NvcGUnLCAnc2V0TmdNb2R1bGVTY29wZSddLFxuICBbJ2luamVjdCcsICdpbmplY3QnXSxcbiAgWyfJtXNldENsYXNzTWV0YWRhdGEnLCAnc2V0Q2xhc3NNZXRhZGF0YSddLFxuICBbJ8m1SW5qZWN0YWJsZURlZicsICdJbmplY3RhYmxlRGVmJ10sXG4gIFsnybVJbmplY3RvckRlZicsICdJbmplY3RvckRlZiddLFxuICBbJ8m1TmdNb2R1bGVEZWZXaXRoTWV0YScsICdOZ01vZHVsZURlZldpdGhNZXRhJ10sXG4gIFsnybVOZ01vZHVsZUZhY3RvcnknLCAnTmdNb2R1bGVGYWN0b3J5J10sXG5dKTtcblxuY29uc3QgQ09SRV9NT0RVTEUgPSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogYEltcG9ydFJld3JpdGVyYCB0aGF0IHJld3JpdGVzIGltcG9ydHMgZnJvbSAnQGFuZ3VsYXIvY29yZScgdG8gYmUgaW1wb3J0ZWQgZnJvbSB0aGUgcjNfc3ltYm9scy50c1xuICogZmlsZSBpbnN0ZWFkLlxuICovXG5leHBvcnQgY2xhc3MgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcjNTeW1ib2xzUGF0aDogc3RyaW5nKSB7fVxuXG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRydWU7IH1cblxuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gQ09SRV9NT0RVTEUpIHtcbiAgICAgIC8vIFRoaXMgaW1wb3J0IGlzbid0IGZyb20gY29yZSwgc28gaWdub3JlIGl0LlxuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChzcGVjaWZpZXIgIT09IENPUkVfTU9EVUxFKSB7XG4gICAgICAvLyBUaGlzIG1vZHVsZSBpc24ndCBjb3JlLCBzbyBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gc3BlY2lmaWVyO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID0gcmVsYXRpdmVQYXRoQmV0d2VlbihpbkNvbnRleHRPZkZpbGUsIHRoaXMucjNTeW1ib2xzUGF0aCk7XG4gICAgaWYgKHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEZhaWxlZCB0byByZXdyaXRlIGltcG9ydCBpbnNpZGUgJHtDT1JFX01PRFVMRX06ICR7aW5Db250ZXh0T2ZGaWxlfSAtPiAke3RoaXMucjNTeW1ib2xzUGF0aH1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoVG9SM1N5bWJvbHM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQW5kUmV3cml0ZUNvcmVTeW1ib2wobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFDT1JFX1NVUFBPUlRFRF9TWU1CT0xTLmhhcyhuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0aW5nIHVuZXhwZWN0ZWQgc3ltYm9sICR7bmFtZX0gd2hpbGUgY29tcGlsaW5nICR7Q09SRV9NT0RVTEV9YCk7XG4gIH1cbiAgcmV0dXJuIENPUkVfU1VQUE9SVEVEX1NZTUJPTFMuZ2V0KG5hbWUpICE7XG59XG4iXX0=