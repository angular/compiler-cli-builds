(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter", ["require", "exports", "tslib", "canonical-path", "typescript", "@angular/compiler-cli/ngcc/src/host/commonjs_host", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    var commonjs_host_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_host");
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
                    if (ts.isExpressionStatement(statement) && commonjs_host_1.isRequireCall(statement.expression)) {
                        continue;
                    }
                    var declarations = ts.isVariableStatement(statement) ?
                        Array.from(statement.declarationList.declarations) :
                        [];
                    if (declarations.some(function (d) { return !d.initializer || !commonjs_host_1.isRequireCall(d.initializer); })) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfcmVuZGVyaW5nX2Zvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9yZW5kZXJpbmcvY29tbW9uanNfcmVuZGVyaW5nX2Zvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpREFBaUQ7SUFDakQsK0JBQWlDO0lBS2pDLG1GQUFvRDtJQUVwRCw4R0FBa0U7SUFDbEUsd0VBQXVDO0lBRXZDOzs7O09BSUc7SUFDSDtRQUFnRCxzREFBc0I7UUFDcEUsb0NBQXNCLFlBQWdDLEVBQUUsTUFBZTtZQUF2RSxZQUNFLGtCQUFNLFlBQVksRUFBRSxNQUFNLENBQUMsU0FDNUI7WUFGcUIsa0JBQVksR0FBWixZQUFZLENBQW9COztRQUV0RCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCwrQ0FBVSxHQUFWLFVBQVcsTUFBbUIsRUFBRSxPQUFpQixFQUFFLElBQW1CO1lBQ3BFLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxJQUFNLGVBQWUsR0FDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLFNBQU8sQ0FBQyxDQUFDLFNBQVMsb0JBQWUsQ0FBQyxDQUFDLFNBQVMsVUFBTyxFQUFuRCxDQUFtRCxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25GLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRDs7V0FFRztRQUNILCtDQUFVLEdBQVYsVUFDSSxNQUFtQixFQUFFLGtCQUEwQixFQUFFLE9BQXFCLEVBQ3RFLGFBQTRCLEVBQUUsSUFBbUI7WUFDbkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2YsSUFBTSxRQUFRLEdBQUcsc0JBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDLElBQU0sWUFBWSxHQUFHLElBQUksR0FBRyx5QkFBUSxDQUFDLHdCQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDNUUsSUFBTSxXQUFXLEdBQUcsa0JBQWtCLEtBQUssUUFBUSxDQUFDLENBQUM7b0JBQ2pELGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELEVBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBQyxDQUFDO2dCQUMvQyxJQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBSSxXQUFXLENBQUMsWUFBWSxNQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdkYsSUFBTSxTQUFTLEdBQUcsZUFBYSxDQUFDLENBQUMsVUFBVSxXQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsTUFBTSxNQUFHLENBQUM7Z0JBQ3pGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQscURBQWdCLEdBQWhCLFVBQ0ksTUFBbUIsRUFBRSxPQUFtQixFQUFFLGFBQTRCLEVBQ3RFLElBQW1COzs7Z0JBQ3JCLEtBQWdCLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7b0JBQXBCLElBQU0sQ0FBQyxvQkFBQTtvQkFDVixJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ2xGLElBQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFJLFdBQVcsQ0FBQyxZQUFZLE1BQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN2RixJQUFNLFNBQVMsR0FBRyxlQUFhLENBQUMsQ0FBQyxPQUFPLFdBQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxNQUFNLE1BQUcsQ0FBQztvQkFDdEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDMUI7Ozs7Ozs7OztRQUNILENBQUM7UUFFUyxxREFBZ0IsR0FBMUIsVUFBMkIsRUFBaUI7OztnQkFDMUMsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQWxDLElBQU0sU0FBUyxXQUFBO29CQUNsQixJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSw2QkFBYSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDOUUsU0FBUztxQkFDVjtvQkFDRCxJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDcEQsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7d0JBQ3BELEVBQUUsQ0FBQztvQkFDUCxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsQ0FBQyxXQUFXLElBQUksQ0FBQyw2QkFBYSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBL0MsQ0FBK0MsQ0FBQyxFQUFFO3dCQUMzRSxPQUFPLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztxQkFDN0I7aUJBQ0Y7Ozs7Ozs7OztZQUNELE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQTFERCxDQUFnRCxpREFBc0IsR0EwRHJFO0lBMURZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge1JlZXhwb3J0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0ltcG9ydCwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge2lzUmVxdWlyZUNhbGx9IGZyb20gJy4uL2hvc3QvY29tbW9uanNfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc201UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuL2VzbTVfcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBIFJlbmRlcmluZ0Zvcm1hdHRlciB0aGF0IHdvcmtzIHdpdGggQ29tbW9uSlMgZmlsZXMsIGluc3RlYWQgb2YgYGltcG9ydGAgYW5kIGBleHBvcnRgIHN0YXRlbWVudHNcbiAqIHRoZSBtb2R1bGUgaXMgYW4gSUlGRSB3aXRoIGEgZmFjdG9yeSBmdW5jdGlvbiBjYWxsIHdpdGggZGVwZW5kZW5jaWVzLCB3aGljaCBhcmUgZGVmaW5lZCBpbiBhXG4gKiB3cmFwcGVyIGZ1bmN0aW9uIGZvciBBTUQsIENvbW1vbkpTIGFuZCBnbG9iYWwgbW9kdWxlIGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlciBleHRlbmRzIEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY29tbW9uSnNIb3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbikge1xuICAgIHN1cGVyKGNvbW1vbkpzSG9zdCwgaXNDb3JlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgQWRkIHRoZSBpbXBvcnRzIGJlbG93IGFueSBpbiBzaXR1IGltcG9ydHMgYXMgYHJlcXVpcmVgIGNhbGxzLlxuICAgKi9cbiAgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiBJbXBvcnRbXSwgZmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGluc2VydGlvblBvaW50ID0gdGhpcy5maW5kRW5kT2ZJbXBvcnRzKGZpbGUpO1xuICAgIGNvbnN0IHJlbmRlcmVkSW1wb3J0cyA9XG4gICAgICAgIGltcG9ydHMubWFwKGkgPT4gYHZhciAke2kucXVhbGlmaWVyfSA9IHJlcXVpcmUoJyR7aS5zcGVjaWZpZXJ9Jyk7XFxuYCkuam9pbignJyk7XG4gICAgb3V0cHV0LmFwcGVuZExlZnQoaW5zZXJ0aW9uUG9pbnQsIHJlbmRlcmVkSW1wb3J0cyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBleHBvcnRzIHRvIHRoZSBib3R0b20gb2YgdGhlIGZpbGUuXG4gICAqL1xuICBhZGRFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZW50cnlQb2ludEJhc2VQYXRoOiBzdHJpbmcsIGV4cG9ydHM6IEV4cG9ydEluZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBleHBvcnRzLmZvckVhY2goZSA9PiB7XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGUuZnJvbSk7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSAnLi8nICsgcmVsYXRpdmUoZGlybmFtZShlbnRyeVBvaW50QmFzZVBhdGgpLCBiYXNlUGF0aCk7XG4gICAgICBjb25zdCBuYW1lZEltcG9ydCA9IGVudHJ5UG9pbnRCYXNlUGF0aCAhPT0gYmFzZVBhdGggP1xuICAgICAgICAgIGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChyZWxhdGl2ZVBhdGgsIGUuaWRlbnRpZmllcikgOlxuICAgICAgICAgIHtzeW1ib2w6IGUuaWRlbnRpZmllciwgbW9kdWxlSW1wb3J0OiBudWxsfTtcbiAgICAgIGNvbnN0IGltcG9ydE5hbWVzcGFjZSA9IG5hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydCA/IGAke25hbWVkSW1wb3J0Lm1vZHVsZUltcG9ydH0uYCA6ICcnO1xuICAgICAgY29uc3QgZXhwb3J0U3RyID0gYFxcbmV4cG9ydHMuJHtlLmlkZW50aWZpZXJ9ID0gJHtpbXBvcnROYW1lc3BhY2V9JHtuYW1lZEltcG9ydC5zeW1ib2x9O2A7XG4gICAgICBvdXRwdXQuYXBwZW5kKGV4cG9ydFN0cik7XG4gICAgfSk7XG4gIH1cblxuICBhZGREaXJlY3RFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZXhwb3J0czogUmVleHBvcnRbXSwgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcixcbiAgICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZXhwb3J0cykge1xuICAgICAgY29uc3QgbmFtZWRJbXBvcnQgPSBpbXBvcnRNYW5hZ2VyLmdlbmVyYXRlTmFtZWRJbXBvcnQoZS5mcm9tTW9kdWxlLCBlLnN5bWJvbE5hbWUpO1xuICAgICAgY29uc3QgaW1wb3J0TmFtZXNwYWNlID0gbmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0ID8gYCR7bmFtZWRJbXBvcnQubW9kdWxlSW1wb3J0fS5gIDogJyc7XG4gICAgICBjb25zdCBleHBvcnRTdHIgPSBgXFxuZXhwb3J0cy4ke2UuYXNBbGlhc30gPSAke2ltcG9ydE5hbWVzcGFjZX0ke25hbWVkSW1wb3J0LnN5bWJvbH07YDtcbiAgICAgIG91dHB1dC5hcHBlbmQoZXhwb3J0U3RyKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZmluZEVuZE9mSW1wb3J0cyhzZjogdHMuU291cmNlRmlsZSk6IG51bWJlciB7XG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzUmVxdWlyZUNhbGwoc3RhdGVtZW50LmV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbGFyYXRpb25zID0gdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpID9cbiAgICAgICAgICBBcnJheS5mcm9tKHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSA6XG4gICAgICAgICAgW107XG4gICAgICBpZiAoZGVjbGFyYXRpb25zLnNvbWUoZCA9PiAhZC5pbml0aWFsaXplciB8fCAhaXNSZXF1aXJlQ2FsbChkLmluaXRpYWxpemVyKSkpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlbWVudC5nZXRTdGFydCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19