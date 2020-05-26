(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer", ["require", "exports", "typescript", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.restoreGetExpandoInitializer = exports.patchTsGetExpandoInitializer = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * Consider the following ES5 code that may have been generated for a class:
     *
     * ```
     * var A = (function(){
     *   function A() {}
     *   return A;
     * }());
     * A.staticProp = true;
     * ```
     *
     * Here, TypeScript marks the symbol for "A" as a so-called "expando symbol", which causes
     * "staticProp" to be added as an export of the "A" symbol.
     *
     * In the example above, symbol "A" has been assigned some flags to indicate that it represents a
     * class. Due to this flag, the symbol is considered an expando symbol and as such, "staticProp" is
     * stored in `ts.Symbol.exports`.
     *
     * A problem arises when "A" is not at the top-level, i.e. in UMD bundles. In that case, the symbol
     * does not have the flag that marks the symbol as a class. Therefore, TypeScript inspects "A"'s
     * initializer expression, which is an IIFE in the above example. Unfortunately however, only IIFEs
     * of the form `(function(){})()` qualify as initializer for an "expando symbol"; the slightly
     * different form seen in the example above, `(function(){}())`, does not. This prevents the "A"
     * symbol from being considered an expando symbol, in turn preventing "staticProp" from being stored
     * in `ts.Symbol.exports`.
     *
     * The logic for identifying symbols as "expando symbols" can be found here:
     * https://github.com/microsoft/TypeScript/blob/v3.4.5/src/compiler/binder.ts#L2656-L2685
     *
     * Notice how the `getExpandoInitializer` function is available on the "ts" namespace in the
     * compiled bundle, so we are able to override this function to accommodate for the alternative
     * IIFE notation. The original implementation can be found at:
     * https://github.com/Microsoft/TypeScript/blob/v3.4.5/src/compiler/utilities.ts#L1864-L1887
     *
     * Issue tracked in https://github.com/microsoft/TypeScript/issues/31778
     *
     * @returns the function to pass to `restoreGetExpandoInitializer` to undo the patch, or null if
     * the issue is known to have been fixed.
     */
    function patchTsGetExpandoInitializer() {
        if (isTs31778GetExpandoInitializerFixed()) {
            return null;
        }
        var originalGetExpandoInitializer = ts.getExpandoInitializer;
        if (originalGetExpandoInitializer === undefined) {
            throw makeUnsupportedTypeScriptError();
        }
        // Override the function to add support for recognizing the IIFE structure used in ES5 bundles.
        ts.getExpandoInitializer = function (initializer, isPrototypeAssignment) {
            // If the initializer is a call expression within parenthesis, unwrap the parenthesis
            // upfront such that unsupported IIFE syntax `(function(){}())` becomes `function(){}()`,
            // which is supported.
            if (ts.isParenthesizedExpression(initializer) && ts.isCallExpression(initializer.expression)) {
                initializer = initializer.expression;
            }
            return originalGetExpandoInitializer(initializer, isPrototypeAssignment);
        };
        return originalGetExpandoInitializer;
    }
    exports.patchTsGetExpandoInitializer = patchTsGetExpandoInitializer;
    function restoreGetExpandoInitializer(originalGetExpandoInitializer) {
        if (originalGetExpandoInitializer !== null) {
            ts.getExpandoInitializer = originalGetExpandoInitializer;
        }
    }
    exports.restoreGetExpandoInitializer = restoreGetExpandoInitializer;
    var ts31778FixedResult = null;
    function isTs31778GetExpandoInitializerFixed() {
        // If the result has already been computed, return early.
        if (ts31778FixedResult !== null) {
            return ts31778FixedResult;
        }
        // Determine if the issue has been fixed by checking if an expando property is present in a
        // minimum reproduction using unpatched TypeScript.
        ts31778FixedResult = checkIfExpandoPropertyIsPresent();
        // If the issue does not appear to have been fixed, verify that applying the patch has the desired
        // effect.
        if (!ts31778FixedResult) {
            var originalGetExpandoInitializer = patchTsGetExpandoInitializer();
            try {
                var patchIsSuccessful = checkIfExpandoPropertyIsPresent();
                if (!patchIsSuccessful) {
                    throw makeUnsupportedTypeScriptError();
                }
            }
            finally {
                restoreGetExpandoInitializer(originalGetExpandoInitializer);
            }
        }
        return ts31778FixedResult;
    }
    /**
     * Verifies whether TS issue 31778 has been fixed by inspecting a symbol from a minimum
     * reproduction. If the symbol does in fact have the "expando" as export, the issue has been fixed.
     *
     * See https://github.com/microsoft/TypeScript/issues/31778 for details.
     */
    function checkIfExpandoPropertyIsPresent() {
        var sourceText = "\n    (function() {\n      var A = (function() {\n        function A() {}\n        return A;\n      }());\n      A.expando = true;\n    }());";
        var sourceFile = ts.createSourceFile('test.js', sourceText, ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);
        var host = {
            getSourceFile: function () {
                return sourceFile;
            },
            fileExists: function () {
                return true;
            },
            readFile: function () {
                return '';
            },
            writeFile: function () { },
            getDefaultLibFileName: function () {
                return '';
            },
            getCurrentDirectory: function () {
                return '';
            },
            getDirectories: function () {
                return [];
            },
            getCanonicalFileName: function (fileName) {
                return fileName;
            },
            useCaseSensitiveFileNames: function () {
                return true;
            },
            getNewLine: function () {
                return '\n';
            },
        };
        var options = { noResolve: true, noLib: true, noEmit: true, allowJs: true };
        var program = ts.createProgram(['test.js'], options, host);
        function visitor(node) {
            if (ts.isVariableDeclaration(node) && utils_1.hasNameIdentifier(node) && node.name.text === 'A') {
                return node;
            }
            return ts.forEachChild(node, visitor);
        }
        var declaration = ts.forEachChild(sourceFile, visitor);
        if (declaration === undefined) {
            throw new Error('Unable to find declaration of outer A');
        }
        var symbol = program.getTypeChecker().getSymbolAtLocation(declaration.name);
        if (symbol === undefined) {
            throw new Error('Unable to resolve symbol of outer A');
        }
        return symbol.exports !== undefined && symbol.exports.has('expando');
    }
    function makeUnsupportedTypeScriptError() {
        return new Error('The TypeScript version used is not supported by ngcc.');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2hfdHNfZXhwYW5kb19pbml0aWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9wYXRjaF90c19leHBhbmRvX2luaXRpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyw4REFBMkM7SUFFM0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bc0NHO0lBQ0gsU0FBZ0IsNEJBQTRCO1FBQzFDLElBQUksbUNBQW1DLEVBQUUsRUFBRTtZQUN6QyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSw2QkFBNkIsR0FBSSxFQUFVLENBQUMscUJBQXFCLENBQUM7UUFDeEUsSUFBSSw2QkFBNkIsS0FBSyxTQUFTLEVBQUU7WUFDL0MsTUFBTSw4QkFBOEIsRUFBRSxDQUFDO1NBQ3hDO1FBRUQsK0ZBQStGO1FBQzlGLEVBQVUsQ0FBQyxxQkFBcUIsR0FBRyxVQUFDLFdBQW9CLEVBQ3BCLHFCQUE4QjtZQUNqRSxxRkFBcUY7WUFDckYseUZBQXlGO1lBQ3pGLHNCQUFzQjtZQUN0QixJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM1RixXQUFXLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQzthQUN0QztZQUNELE9BQU8sNkJBQTZCLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDO1FBQ0YsT0FBTyw2QkFBNkIsQ0FBQztJQUN2QyxDQUFDO0lBdEJELG9FQXNCQztJQUVELFNBQWdCLDRCQUE0QixDQUFDLDZCQUFzQztRQUNqRixJQUFJLDZCQUE2QixLQUFLLElBQUksRUFB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Q0FBdUMsQ0FBQyxDQUFDO1NBQzFEO1FBRUQsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsT0FBTyxNQUFNLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUF3QixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsOEJBQThCO1FBQ3JDLE9BQU8sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztJQUM1RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2hhc05hbWVJZGVudGlmaWVyfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogQ29uc2lkZXIgdGhlIGZvbGxvd2luZyBFUzUgY29kZSB0aGF0IG1heSBoYXZlIGJlZW4gZ2VuZXJhdGVkIGZvciBhIGNsYXNzOlxuICpcbiAqIGBgYFxuICogdmFyIEEgPSAoZnVuY3Rpb24oKXtcbiAqICAgZnVuY3Rpb24gQSgpIHt9XG4gKiAgIHJldHVybiBBO1xuICogfSgpKTtcbiAqIEEuc3RhdGljUHJvcCA9IHRydWU7XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCBUeXBlU2NyaXB0IG1hcmtzIHRoZSBzeW1ib2wgZm9yIFwiQVwiIGFzIGEgc28tY2FsbGVkIFwiZXhwYW5kbyBzeW1ib2xcIiwgd2hpY2ggY2F1c2VzXG4gKiBcInN0YXRpY1Byb3BcIiB0byBiZSBhZGRlZCBhcyBhbiBleHBvcnQgb2YgdGhlIFwiQVwiIHN5bWJvbC5cbiAqXG4gKiBJbiB0aGUgZXhhbXBsZSBhYm92ZSwgc3ltYm9sIFwiQVwiIGhhcyBiZWVuIGFzc2lnbmVkIHNvbWUgZmxhZ3MgdG8gaW5kaWNhdGUgdGhhdCBpdCByZXByZXNlbnRzIGFcbiAqIGNsYXNzLiBEdWUgdG8gdGhpcyBmbGFnLCB0aGUgc3ltYm9sIGlzIGNvbnNpZGVyZWQgYW4gZXhwYW5kbyBzeW1ib2wgYW5kIGFzIHN1Y2gsIFwic3RhdGljUHJvcFwiIGlzXG4gKiBzdG9yZWQgaW4gYHRzLlN5bWJvbC5leHBvcnRzYC5cbiAqXG4gKiBBIHByb2JsZW0gYXJpc2VzIHdoZW4gXCJBXCIgaXMgbm90IGF0IHRoZSB0b3AtbGV2ZWwsIGkuZS4gaW4gVU1EIGJ1bmRsZXMuIEluIHRoYXQgY2FzZSwgdGhlIHN5bWJvbFxuICogZG9lcyBub3QgaGF2ZSB0aGUgZmxhZyB0aGF0IG1hcmtzIHRoZSBzeW1ib2wgYXMgYSBjbGFzcy4gVGhlcmVmb3JlLCBUeXBlU2NyaXB0IGluc3BlY3RzIFwiQVwiJ3NcbiAqIGluaXRpYWxpemVyIGV4cHJlc3Npb24sIHdoaWNoIGlzIGFuIElJRkUgaW4gdGhlIGFib3ZlIGV4YW1wbGUuIFVuZm9ydHVuYXRlbHkgaG93ZXZlciwgb25seSBJSUZFc1xuICogb2YgdGhlIGZvcm0gYChmdW5jdGlvbigpe30pKClgIHF1YWxpZnkgYXMgaW5pdGlhbGl6ZXIgZm9yIGFuIFwiZXhwYW5kbyBzeW1ib2xcIjsgdGhlIHNsaWdodGx5XG4gKiBkaWZmZXJlbnQgZm9ybSBzZWVuIGluIHRoZSBleGFtcGxlIGFib3ZlLCBgKGZ1bmN0aW9uKCl7fSgpKWAsIGRvZXMgbm90LiBUaGlzIHByZXZlbnRzIHRoZSBcIkFcIlxuICogc3ltYm9sIGZyb20gYmVpbmcgY29uc2lkZXJlZCBhbiBleHBhbmRvIHN5bWJvbCwgaW4gdHVybiBwcmV2ZW50aW5nIFwic3RhdGljUHJvcFwiIGZyb20gYmVpbmcgc3RvcmVkXG4gKiBpbiBgdHMuU3ltYm9sLmV4cG9ydHNgLlxuICpcbiAqIFRoZSBsb2dpYyBmb3IgaWRlbnRpZnlpbmcgc3ltYm9scyBhcyBcImV4cGFuZG8gc3ltYm9sc1wiIGNhbiBiZSBmb3VuZCBoZXJlOlxuICogaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuNC41L3NyYy9jb21waWxlci9iaW5kZXIudHMjTDI2NTYtTDI2ODVcbiAqXG4gKiBOb3RpY2UgaG93IHRoZSBgZ2V0RXhwYW5kb0luaXRpYWxpemVyYCBmdW5jdGlvbiBpcyBhdmFpbGFibGUgb24gdGhlIFwidHNcIiBuYW1lc3BhY2UgaW4gdGhlXG4gKiBjb21waWxlZCBidW5kbGUsIHNvIHdlIGFyZSBhYmxlIHRvIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gdG8gYWNjb21tb2RhdGUgZm9yIHRoZSBhbHRlcm5hdGl2ZVxuICogSUlGRSBub3RhdGlvbi4gVGhlIG9yaWdpbmFsIGltcGxlbWVudGF0aW9uIGNhbiBiZSBmb3VuZCBhdDpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjQuNS9zcmMvY29tcGlsZXIvdXRpbGl0aWVzLnRzI0wxODY0LUwxODg3XG4gKlxuICogSXNzdWUgdHJhY2tlZCBpbiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMxNzc4XG4gKlxuICogQHJldHVybnMgdGhlIGZ1bmN0aW9uIHRvIHBhc3MgdG8gYHJlc3RvcmVHZXRFeHBhbmRvSW5pdGlhbGl6ZXJgIHRvIHVuZG8gdGhlIHBhdGNoLCBvciBudWxsIGlmXG4gKiB0aGUgaXNzdWUgaXMga25vd24gdG8gaGF2ZSBiZWVuIGZpeGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hUc0dldEV4cGFuZG9Jbml0aWFsaXplcigpOiB1bmtub3duIHtcbiAgaWYgKGlzVHMzMTc3OEdldEV4cGFuZG9Jbml0aWFsaXplckZpeGVkKCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IG9yaWdpbmFsR2V0RXhwYW5kb0luaXRpYWxpemVyID0gKHRzIGFzIGFueSkuZ2V0RXhwYW5kb0luaXRpYWxpemVyO1xuICBpZiAob3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG1ha2VVbnN1cHBvcnRlZFR5cGVTY3JpcHRFcnJvcigpO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgdGhlIGZ1bmN0aW9uIHRvIGFkZCBzdXBwb3J0IGZvciByZWNvZ25pemluZyB0aGUgSUlGRSBzdHJ1Y3R1cmUgdXNlZCBpbiBFUzUgYnVuZGxlcy5cbiAgKHRzIGFzIGFueSkuZ2V0RXhwYW5kb0luaXRpYWxpemVyID0gKGluaXRpYWxpemVyOiB0cy5Ob2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNQcm90b3R5cGVBc3NpZ25tZW50OiBib29sZWFuKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQgPT4ge1xuICAgIC8vIElmIHRoZSBpbml0aWFsaXplciBpcyBhIGNhbGwgZXhwcmVzc2lvbiB3aXRoaW4gcGFyZW50aGVzaXMsIHVud3JhcCB0aGUgcGFyZW50aGVzaXNcbiAgICAvLyB1cGZyb250IHN1Y2ggdGhhdCB1bnN1cHBvcnRlZCBJSUZFIHN5bnRheCBgKGZ1bmN0aW9uKCl7fSgpKWAgYmVjb21lcyBgZnVuY3Rpb24oKXt9KClgLFxuICAgIC8vIHdoaWNoIGlzIHN1cHBvcnRlZC5cbiAgICBpZiAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihpbml0aWFsaXplcikgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihpbml0aWFsaXplci5leHByZXNzaW9uKSkge1xuICAgICAgaW5pdGlhbGl6ZXIgPSBpbml0aWFsaXplci5leHByZXNzaW9uO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIoaW5pdGlhbGl6ZXIsIGlzUHJvdG90eXBlQXNzaWdubWVudCk7XG4gIH07XG4gIHJldHVybiBvcmlnaW5hbEdldEV4cGFuZG9Jbml0aWFsaXplcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVHZXRFeHBhbmRvSW5pdGlhbGl6ZXIob3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXI6IHVua25vd24pOiB2b2lkIHtcbiAgaWYgKG9yaWdpbmFsR2V0RXhwYW5kb0luaXRpYWxpemVyICE9PSBudWxsKSB7XG4gICAgKHRzIGFzIGFueSkuZ2V0RXhwYW5kb0luaXRpYWxpemVyID0gb3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXI7XG4gIH1cbn1cblxubGV0IHRzMzE3NzhGaXhlZFJlc3VsdDogYm9vbGVhbnxudWxsID0gbnVsbDtcblxuZnVuY3Rpb24gaXNUczMxNzc4R2V0RXhwYW5kb0luaXRpYWxpemVyRml4ZWQoKTogYm9vbGVhbiB7XG4gIC8vIElmIHRoZSByZXN1bHQgaGFzIGFscmVhZHkgYmVlbiBjb21wdXRlZCwgcmV0dXJuIGVhcmx5LlxuICBpZiAodHMzMTc3OEZpeGVkUmVzdWx0ICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHRzMzE3NzhGaXhlZFJlc3VsdDtcbiAgfVxuXG4gIC8vIERldGVybWluZSBpZiB0aGUgaXNzdWUgaGFzIGJlZW4gZml4ZWQgYnkgY2hlY2tpbmcgaWYgYW4gZXhwYW5kbyBwcm9wZXJ0eSBpcyBwcmVzZW50IGluIGFcbiAgLy8gbWluaW11bSByZXByb2R1Y3Rpb24gdXNpbmcgdW5wYXRjaGVkIFR5cGVTY3JpcHQuXG4gIHRzMzE3NzhGaXhlZFJlc3VsdCA9IGNoZWNrSWZFeHBhbmRvUHJvcGVydHlJc1ByZXNlbnQoKTtcblxuICAvLyBJZiB0aGUgaXNzdWUgZG9lcyBub3QgYXBwZWFyIHRvIGhhdmUgYmVlbiBmaXhlZCwgdmVyaWZ5IHRoYXQgYXBwbHlpbmcgdGhlIHBhdGNoIGhhcyB0aGUgZGVzaXJlZFxuICAvLyBlZmZlY3QuXG4gIGlmICghdHMzMTc3OEZpeGVkUmVzdWx0KSB7XG4gICAgY29uc3Qgb3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIgPSBwYXRjaFRzR2V0RXhwYW5kb0luaXRpYWxpemVyKCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhdGNoSXNTdWNjZXNzZnVsID0gY2hlY2tJZkV4cGFuZG9Qcm9wZXJ0eUlzUHJlc2VudCgpO1xuICAgICAgaWYgKCFwYXRjaElzU3VjY2Vzc2Z1bCkge1xuICAgICAgICB0aHJvdyBtYWtlVW5zdXBwb3J0ZWRUeXBlU2NyaXB0RXJyb3IoKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgcmVzdG9yZUdldEV4cGFuZG9Jbml0aWFsaXplcihvcmlnaW5hbEdldEV4cGFuZG9Jbml0aWFsaXplcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRzMzE3NzhGaXhlZFJlc3VsdDtcbn1cblxuLyoqXG4gKiBWZXJpZmllcyB3aGV0aGVyIFRTIGlzc3VlIDMxNzc4IGhhcyBiZWVuIGZpeGVkIGJ5IGluc3BlY3RpbmcgYSBzeW1ib2wgZnJvbSBhIG1pbmltdW1cbiAqIHJlcHJvZHVjdGlvbi4gSWYgdGhlIHN5bWJvbCBkb2VzIGluIGZhY3QgaGF2ZSB0aGUgXCJleHBhbmRvXCIgYXMgZXhwb3J0LCB0aGUgaXNzdWUgaGFzIGJlZW4gZml4ZWQuXG4gKlxuICogU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzE3NzggZm9yIGRldGFpbHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrSWZFeHBhbmRvUHJvcGVydHlJc1ByZXNlbnQoKTogYm9vbGVhbiB7XG4gIGNvbnN0IHNvdXJjZVRleHQgPSBgXG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIEEgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIGZ1bmN0aW9uIEEoKSB7fVxuICAgICAgICByZXR1cm4gQTtcbiAgICAgIH0oKSk7XG4gICAgICBBLmV4cGFuZG8gPSB0cnVlO1xuICAgIH0oKSk7YDtcbiAgY29uc3Qgc291cmNlRmlsZSA9XG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKCd0ZXN0LmpzJywgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkVTNSwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5KUyk7XG4gIGNvbnN0IGhvc3Q6IHRzLkNvbXBpbGVySG9zdCA9IHtcbiAgICBnZXRTb3VyY2VGaWxlKCk6IHRzLlNvdXJjZUZpbGUgfFxuICAgICAgICB1bmRlZmluZWQge1xuICAgICAgICAgIHJldHVybiBzb3VyY2VGaWxlO1xuICAgICAgICB9LFxuICAgIGZpbGVFeGlzdHMoKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIHJlYWRGaWxlKCk6IHN0cmluZyB8XG4gICAgICAgIHVuZGVmaW5lZCB7XG4gICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9LFxuICAgIHdyaXRlRmlsZSgpIHt9LFxuICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZSgpOiBzdHJpbmcge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgZ2V0RGlyZWN0b3JpZXMoKTogc3RyaW5nW10ge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH0sXG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICByZXR1cm4gZmlsZU5hbWU7XG4gICAgfSxcbiAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCk6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgICByZXR1cm4gJ1xcbic7XG4gICAgfSxcbiAgfTtcbiAgY29uc3Qgb3B0aW9ucyA9IHtub1Jlc29sdmU6IHRydWUsIG5vTGliOiB0cnVlLCBub0VtaXQ6IHRydWUsIGFsbG93SnM6IHRydWV9O1xuICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShbJ3Rlc3QuanMnXSwgb3B0aW9ucywgaG9zdCk7XG5cbiAgZnVuY3Rpb24gdmlzaXRvcihub2RlOiB0cy5Ob2RlKTogdHMuVmFyaWFibGVEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgJiYgaGFzTmFtZUlkZW50aWZpZXIobm9kZSkgJiYgbm9kZS5uYW1lLnRleHQgPT09ICdBJykge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIHJldHVybiB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgdmlzaXRvcik7XG4gIH1cblxuICBjb25zdCBkZWNsYXJhdGlvbiA9IHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCB2aXNpdG9yKTtcbiAgaWYgKGRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIGRlY2xhcmF0aW9uIG9mIG91dGVyIEEnKTtcbiAgfVxuXG4gIGNvbnN0IHN5bWJvbCA9IHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byByZXNvbHZlIHN5bWJvbCBvZiBvdXRlciBBJyk7XG4gIH1cbiAgcmV0dXJuIHN5bWJvbC5leHBvcnRzICE9PSB1bmRlZmluZWQgJiYgc3ltYm9sLmV4cG9ydHMuaGFzKCdleHBhbmRvJyBhcyB0cy5fX1N0cmluZyk7XG59XG5cbmZ1bmN0aW9uIG1ha2VVbnN1cHBvcnRlZFR5cGVTY3JpcHRFcnJvcigpOiBFcnJvciB7XG4gIHJldHVybiBuZXcgRXJyb3IoJ1RoZSBUeXBlU2NyaXB0IHZlcnNpb24gdXNlZCBpcyBub3Qgc3VwcG9ydGVkIGJ5IG5nY2MuJyk7XG59XG4iXX0=