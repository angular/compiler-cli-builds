(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter", ["require", "exports", "tslib", "canonical-path", "typescript", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CommonJsRenderingFormatter = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var canonical_path_1 = require("canonical-path");
    var ts = require("typescript");
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var esm5_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    /**
     * A RenderingFormatter that works with CommonJS files, instead of `import` and `export` statements
     * the module is an IIFE with a factory function call with dependencies, which are defined in a
     * wrapper function for AMD, CommonJS and global module formats.
     */
    var CommonJsRenderingFormatter = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsRenderingFormatter, _super);
        function CommonJsRenderingFormatter(commonJsHost, isCore) {
            var _this = _super.call(this, commonJsHost, isCore) || this;
            _this.commonJsHost = commonJsHost;
            return _this;
        }
        /**
         *  Add the imports below any in situ imports as `require` calls.
         */
        CommonJsRenderingFormatter.prototype.addImports = function (output, imports, file) {
            // Avoid unnecessary work if there are no imports to add.
            if (imports.length === 0) {
                return;
            }
            var insertionPoint = this.findEndOfImports(file);
            var renderedImports = imports.map(function (i) { return "var " + i.qualifier + " = require('" + i.specifier + "');\n"; }).join('');
            output.appendLeft(insertionPoint, renderedImports);
        };
        /**
         * Add the exports to the bottom of the file.
         */
        CommonJsRenderingFormatter.prototype.addExports = function (output, entryPointBasePath, exports, importManager, file) {
            exports.forEach(function (e) {
                var basePath = utils_1.stripExtension(e.from);
                var relativePath = './' + canonical_path_1.relative(canonical_path_1.dirname(entryPointBasePath), basePath);
                var namedImport = entryPointBasePath !== basePath ?
                    importManager.generateNamedImport(relativePath, e.identifier) :
                    { symbol: e.identifier, moduleImport: null };
                var importNamespace = namedImport.moduleImport ? namedImport.moduleImport + "." : '';
                var exportStr = "\nexports." + e.identifier + " = " + importNamespace + namedImport.symbol + ";";
                output.append(exportStr);
            });
        };
        CommonJsRenderingFormatter.prototype.addDirectExports = function (output, exports, importManager, file) {
            var e_1, _a;
            try {
                for (var exports_1 = tslib_1.__values(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                    var e = exports_1_1.value;
                    var namedImport = importManager.generateNamedImport(e.fromModule, e.symbolName);
                    var importNamespace = namedImport.moduleImport ? namedImport.moduleImport + "." : '';
                    var exportStr = "\nexports." + e.asAlias + " = " + importNamespace + namedImport.symbol + ";";
                    output.append(exportStr);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        CommonJsRenderingFormatter.prototype.findEndOfImports = function (sf) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(sf.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var statement = _c.value;
                    if (ts.isExpressionStatement(statement) && commonjs_umd_utils_1.isRequireCall(statement.expression)) {
                        continue;
                    }
                    var declarations = ts.isVariableStatement(statement) ?
                        Array.from(statement.declarationList.declarations) :
                        [];
                    if (declarations.some(function (d) { return !d.initializer || !commonjs_umd_utils_1.isRequireCall(d.initializer); })) {
                        return statement.getStart();
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return 0;
        };
        return CommonJsRenderingFormatter;
    }(esm5_rendering_formatter_1.Esm5RenderingFormatter));
    exports.CommonJsRenderingFormatter = CommonJsRenderingFormatter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfcmVuZGVyaW5nX2Zvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9yZW5kZXJpbmcvY29tbW9uanNfcmVuZGVyaW5nX2Zvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQWlEO0lBRWpELCtCQUFpQztJQUtqQyw2RkFBeUQ7SUFHekQsOEdBQWtFO0lBQ2xFLHdFQUF1QztJQUV2Qzs7OztPQUlHO0lBQ0g7UUFBZ0Qsc0RBQXNCO1FBQ3BFLG9DQUFzQixZQUFnQyxFQUFFLE1BQWU7WUFBdkUsWUFDRSxrQkFBTSxZQUFZLEVBQUUsTUFBTSxDQUFDLFNBQzVCO1lBRnFCLGtCQUFZLEdBQVosWUFBWSxDQUFvQjs7UUFFdEQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsK0NBQVUsR0FBVixVQUFXLE1BQW1CLEVBQUUsT0FBaUIsRUFBRSxJQUFtQjtZQUNwRSx5REFBeUQ7WUFDekQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDeEIsT0FBTzthQUNSO1lBRUQsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25ELElBQU0sZUFBZSxHQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsU0FBTyxDQUFDLENBQUMsU0FBUyxvQkFBZSxDQUFDLENBQUMsU0FBUyxVQUFPLEVBQW5ELENBQW1ELENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsK0NBQVUsR0FBVixVQUNJLE1BQW1CLEVBQUUsa0JBQTBCLEVBQUUs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ZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtJbXBvcnQsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7RXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtpc1JlcXVpcmVDYWxsfSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX3VtZF91dGlscyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuXG5pbXBvcnQge0VzbTVSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgUmVuZGVyaW5nRm9ybWF0dGVyIHRoYXQgd29ya3Mgd2l0aCBDb21tb25KUyBmaWxlcywgaW5zdGVhZCBvZiBgaW1wb3J0YCBhbmQgYGV4cG9ydGAgc3RhdGVtZW50c1xuICogdGhlIG1vZHVsZSBpcyBhbiBJSUZFIHdpdGggYSBmYWN0b3J5IGZ1bmN0aW9uIGNhbGwgd2l0aCBkZXBlbmRlbmNpZXMsIHdoaWNoIGFyZSBkZWZpbmVkIGluIGFcbiAqIHdyYXBwZXIgZnVuY3Rpb24gZm9yIEFNRCwgQ29tbW9uSlMgYW5kIGdsb2JhbCBtb2R1bGUgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1vbkpzUmVuZGVyaW5nRm9ybWF0dGVyIGV4dGVuZHMgRXNtNVJlbmRlcmluZ0Zvcm1hdHRlciB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBjb21tb25Kc0hvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoY29tbW9uSnNIb3N0LCBpc0NvcmUpO1xuICB9XG5cbiAgLyoqXG4gICAqICBBZGQgdGhlIGltcG9ydHMgYmVsb3cgYW55IGluIHNpdHUgaW1wb3J0cyBhcyBgcmVxdWlyZWAgY2FsbHMuXG4gICAqL1xuICBhZGRJbXBvcnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGltcG9ydHM6IEltcG9ydFtdLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgLy8gQXZvaWQgdW5uZWNlc3Nhcnkgd29yayBpZiB0aGVyZSBhcmUgbm8gaW1wb3J0cyB0byBhZGQuXG4gICAgaWYgKGltcG9ydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaW5zZXJ0aW9uUG9pbnQgPSB0aGlzLmZpbmRFbmRPZkltcG9ydHMoZmlsZSk7XG4gICAgY29uc3QgcmVuZGVyZWRJbXBvcnRzID1cbiAgICAgICAgaW1wb3J0cy5tYXAoaSA9PiBgdmFyICR7aS5xdWFsaWZpZXJ9ID0gcmVxdWlyZSgnJHtpLnNwZWNpZmllcn0nKTtcXG5gKS5qb2luKCcnKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgcmVuZGVyZWRJbXBvcnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGV4cG9ydHMgdG8gdGhlIGJvdHRvbSBvZiB0aGUgZmlsZS5cbiAgICovXG4gIGFkZEV4cG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBlbnRyeVBvaW50QmFzZVBhdGg6IHN0cmluZywgZXhwb3J0czogRXhwb3J0SW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGV4cG9ydHMuZm9yRWFjaChlID0+IHtcbiAgICAgIGNvbnN0IGJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24oZS5mcm9tKTtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9ICcuLycgKyByZWxhdGl2ZShkaXJuYW1lKGVudHJ5UG9pbnRCYXNlUGF0aCksIGJhc2VQYXRoKTtcbiAgICAgIGNvbnN0IG5hbWVkSW1wb3J0ID0gZW50cnlQb2ludEJhc2VQYXRoICE9PSBiYXNlUGF0aCA/XG4gICAgICAgICAgaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KHJlbGF0aXZlUGF0aCwgZS5pZGVudGlmaWVyKSA6XG4gICAgICAgICAge3N5bWJvbDogZS5pZGVudGlmaWVyLCBtb2R1bGVJbXBvcnQ6IG51bGx9O1xuICAgICAgY29uc3QgaW1wb3J0TmFtZXNwYWNlID0gbmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0ID8gYCR7bmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0fS5gIDogJyc7XG4gICAgICBjb25zdCBleHBvcnRTdHIgPSBgXFxuZXhwb3J0cy4ke2UuaWRlbnRpZmllcn0gPSAke2ltcG9ydE5hbWVzcGFjZX0ke25hbWVkSW1wb3J0LnN5bWJvbH07YDtcbiAgICAgIG91dHB1dC5hcHBlbmQoZXhwb3J0U3RyKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFkZERpcmVjdEV4cG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBleHBvcnRzOiBSZWV4cG9ydFtdLCBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLFxuICAgICAgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZSBvZiBleHBvcnRzKSB7XG4gICAgICBjb25zdCBuYW1lZEltcG9ydCA9IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChlLmZyb21Nb2R1bGUsIGUuc3ltYm9sTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnROYW1lc3BhY2UgPSBuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnQgPyBgJHtuYW1lZEltcG9ydC5tb2R1bGVJbXBvcnR9LmAgOiAnJztcbiAgICAgIGNvbnN0IGV4cG9ydFN0ciA9IGBcXG5leHBvcnRzLiR7ZS5hc0FsaWFzfSA9ICR7aW1wb3J0TmFtZXNwYWNlfSR7bmFtZWRJbXBvcnQuc3ltYm9sfTtgO1xuICAgICAgb3V0cHV0LmFwcGVuZChleHBvcnRTdHIpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBmaW5kRW5kT2ZJbXBvcnRzKHNmOiB0cy5Tb3VyY2VGaWxlKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNSZXF1aXJlQ2FsbChzdGF0ZW1lbnQuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkgP1xuICAgICAgICAgIEFycmF5LmZyb20oc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMpIDpcbiAgICAgICAgICBbXTtcbiAgICAgIGlmIChkZWNsYXJhdGlvbnMuc29tZShkID0+ICFkLmluaXRpYWxpemVyIHx8ICFpc1JlcXVpcmVDYWxsKGQuaW5pdGlhbGl6ZXIpKSkge1xuICAgICAgICByZXR1cm4gc3RhdGVtZW50LmdldFN0YXJ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG59XG4iXX0=