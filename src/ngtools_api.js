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
        define("@angular/compiler-cli/src/ngtools_api", ["require", "exports", "tslib", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/entry_points"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    var entry_points_1 = require("@angular/compiler-cli/src/transformers/entry_points");
    /**
     * @internal
     * @deprecatd Use ngtools_api2 instead!
     */
    var NgTools_InternalApi_NG_2 = /** @class */ (function () {
        function NgTools_InternalApi_NG_2() {
        }
        /**
         * @internal
         */
        NgTools_InternalApi_NG_2.codeGen = function (options) {
            throw throwNotSupportedError();
        };
        /**
         * @internal
         */
        NgTools_InternalApi_NG_2.listLazyRoutes = function (options) {
            // TODO(tbosch): Also throwNotSupportedError once Angular CLI 1.5.1 ships,
            // as we only needed this to support Angular CLI 1.5.0 rc.*
            var ngProgram = entry_points_1.createProgram({
                rootNames: options.program.getRootFileNames(),
                options: tslib_1.__assign({}, options.angularCompilerOptions, { collectAllErrors: true }),
                host: options.host
            });
            var lazyRoutes = ngProgram.listLazyRoutes(options.entryModule);
            try {
                // reset the referencedFiles that the ng.Program added to the SourceFiles
                // as the host might be caching the source files!
                for (var _a = tslib_1.__values(options.program.getSourceFiles()), _b = _a.next(); !_b.done; _b = _a.next()) {
                    var sourceFile = _b.value;
                    var originalReferences = compiler_host_1.getOriginalReferences(sourceFile);
                    if (originalReferences) {
                        sourceFile.referencedFiles = originalReferences;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var result = {};
            lazyRoutes.forEach(function (lazyRoute) {
                var route = lazyRoute.route;
                var referencedFilePath = lazyRoute.referencedModule.filePath;
                if (result[route] && result[route] != referencedFilePath) {
                    throw new Error("Duplicated path in loadChildren detected: \"" + route + "\" is used in 2 loadChildren, " +
                        ("but they point to different modules \"(" + result[route] + " and ") +
                        ("\"" + referencedFilePath + "\"). Webpack cannot distinguish on context and would fail to ") +
                        'load the proper one.');
                }
                result[route] = referencedFilePath;
            });
            return result;
            var e_1, _c;
        };
        /**
         * @internal
         */
        NgTools_InternalApi_NG_2.extractI18n = function (options) {
            throw throwNotSupportedError();
        };
        return NgTools_InternalApi_NG_2;
    }());
    exports.NgTools_InternalApi_NG_2 = NgTools_InternalApi_NG_2;
    function throwNotSupportedError() {
        throw new Error("Please update @angular/cli. Angular 5+ requires at least Angular CLI 1.5+");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd0b29sc19hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndG9vbHNfYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQWtCSCxzRkFBbUU7SUFDbkUsb0ZBQTBEO0lBNkMxRDs7O09BR0c7SUFDSDtRQUFBO1FBc0RBLENBQUM7UUFyREM7O1dBRUc7UUFDSSxnQ0FBTyxHQUFkLFVBQWUsT0FBZ0Q7WUFDN0QsTUFBTSxzQkFBc0IsRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFFRDs7V0FFRztRQUNJLHVDQUFjLEdBQXJCLFVBQXNCLE9BQXVEO1lBRTNFLDBFQUEwRTtZQUMxRSwyREFBMkQ7WUFDM0QsSUFBTSxTQUFTLEdBQUcsNEJBQWEsQ0FBQztnQkFDOUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQzdDLE9BQU8sdUJBQU0sT0FBTyxDQUFDLHNCQUFzQixJQUFFLGdCQUFnQixFQUFFLElBQUksR0FBQztnQkFDcEUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2FBQ25CLENBQUMsQ0FBQztZQUNILElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDOztnQkFFakUseUVBQXlFO2dCQUN6RSxpREFBaUQ7Z0JBQ2pELEtBQXlCLElBQUEsS0FBQSxpQkFBQSxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBO29CQUFwRCxJQUFNLFVBQVUsV0FBQTtvQkFDbkIsSUFBTSxrQkFBa0IsR0FBRyxxQ0FBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDN0QsSUFBSSxrQkFBa0IsRUFBRTt3QkFDdEIsVUFBVSxDQUFDLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQztxQkFDakQ7aUJBQ0Y7Ozs7Ozs7OztZQUVELElBQU0sTUFBTSxHQUEwQyxFQUFFLENBQUM7WUFDekQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7Z0JBQzFCLElBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7Z0JBQzlCLElBQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztnQkFDL0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLGtCQUFrQixFQUFFO29CQUN4RCxNQUFNLElBQUksS0FBSyxDQUNYLGlEQUE4QyxLQUFLLG1DQUErQjt5QkFDbEYsNENBQXlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBTyxDQUFBO3lCQUM3RCxPQUFJLGtCQUFrQixrRUFBOEQsQ0FBQTt3QkFDcEYsc0JBQXNCLENBQUMsQ0FBQztpQkFDN0I7Z0JBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLGtCQUFrQixDQUFDO1lBQ3JDLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxNQUFNLENBQUM7O1FBQ2hCLENBQUM7UUFFRDs7V0FFRztRQUNJLG9DQUFXLEdBQWxCLFVBQW1CLE9BQW9EO1lBQ3JFLE1BQU0sc0JBQXNCLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBdERELElBc0RDO0lBdERZLDREQUF3QjtJQXdEckM7UUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7SUFDL0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBUaGlzIGlzIGEgcHJpdmF0ZSBBUEkgZm9yIHRoZSBuZ3Rvb2xzIHRvb2xraXQuXG4gKlxuICogVGhpcyBBUEkgc2hvdWxkIGJlIHN0YWJsZSBmb3IgTkcgMi4gSXQgY2FuIGJlIHJlbW92ZWQgaW4gTkcgNC4uLiwgYnV0IHNob3VsZCBiZSByZXBsYWNlZCBieVxuICogc29tZXRoaW5nIGVsc2UuXG4gKi9cblxuLyoqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBDaGFuZ2VzIHRvIHRoaXMgZmlsZSBuZWVkIHRvIGJlIGFwcHJvdmVkIGJ5IHRoZSBBbmd1bGFyIENMSSB0ZWFtLiAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcGlsZXJIb3N0LCBDb21waWxlck9wdGlvbnMsIExhenlSb3V0ZX0gZnJvbSAnLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7Z2V0T3JpZ2luYWxSZWZlcmVuY2VzfSBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21waWxlcl9ob3N0JztcbmltcG9ydCB7Y3JlYXRlUHJvZ3JhbX0gZnJvbSAnLi90cmFuc2Zvcm1lcnMvZW50cnlfcG9pbnRzJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ1Rvb2xzX0ludGVybmFsQXBpX05HMl9Db2RlR2VuX09wdGlvbnMge1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucztcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuXG4gIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucztcblxuICAvLyBpMThuIG9wdGlvbnMuXG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5GaWxlPzogc3RyaW5nO1xuICBsb2NhbGU/OiBzdHJpbmc7XG4gIG1pc3NpbmdUcmFuc2xhdGlvbj86IHN0cmluZztcblxuICByZWFkUmVzb3VyY2U6IChmaWxlTmFtZTogc3RyaW5nKSA9PiBQcm9taXNlPHN0cmluZz47XG5cbiAgLy8gRXZlcnkgbmV3IHByb3BlcnR5IHVuZGVyIHRoaXMgbGluZSBzaG91bGQgYmUgb3B0aW9uYWwuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdUb29sc19JbnRlcm5hbEFwaV9ORzJfTGlzdExhenlSb3V0ZXNfT3B0aW9ucyB7XG4gIHByb2dyYW06IHRzLlByb2dyYW07XG4gIGhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcbiAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICBlbnRyeU1vZHVsZTogc3RyaW5nO1xuXG4gIC8vIEV2ZXJ5IG5ldyBwcm9wZXJ0eSB1bmRlciB0aGlzIGxpbmUgc2hvdWxkIGJlIG9wdGlvbmFsLlxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nVG9vbHNfSW50ZXJuYWxBcGlfTkdfMl9MYXp5Um91dGVNYXAgeyBbcm91dGU6IHN0cmluZ106IHN0cmluZzsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nVG9vbHNfSW50ZXJuYWxBcGlfTkcyX0V4dHJhY3RJMThuX09wdGlvbnMge1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICBjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucztcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIGkxOG5Gb3JtYXQ/OiBzdHJpbmc7XG4gIHJlYWRSZXNvdXJjZTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IFByb21pc2U8c3RyaW5nPjtcbiAgLy8gRXZlcnkgbmV3IHByb3BlcnR5IHVuZGVyIHRoaXMgbGluZSBzaG91bGQgYmUgb3B0aW9uYWwuXG4gIGxvY2FsZT86IHN0cmluZztcbiAgb3V0RmlsZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBkZXByZWNhdGQgVXNlIG5ndG9vbHNfYXBpMiBpbnN0ZWFkIVxuICovXG5leHBvcnQgY2xhc3MgTmdUb29sc19JbnRlcm5hbEFwaV9OR18yIHtcbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc3RhdGljIGNvZGVHZW4ob3B0aW9uczogTmdUb29sc19JbnRlcm5hbEFwaV9ORzJfQ29kZUdlbl9PcHRpb25zKTogUHJvbWlzZTxhbnk+IHtcbiAgICB0aHJvdyB0aHJvd05vdFN1cHBvcnRlZEVycm9yKCk7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzdGF0aWMgbGlzdExhenlSb3V0ZXMob3B0aW9uczogTmdUb29sc19JbnRlcm5hbEFwaV9ORzJfTGlzdExhenlSb3V0ZXNfT3B0aW9ucyk6XG4gICAgICBOZ1Rvb2xzX0ludGVybmFsQXBpX05HXzJfTGF6eVJvdXRlTWFwIHtcbiAgICAvLyBUT0RPKHRib3NjaCk6IEFsc28gdGhyb3dOb3RTdXBwb3J0ZWRFcnJvciBvbmNlIEFuZ3VsYXIgQ0xJIDEuNS4xIHNoaXBzLFxuICAgIC8vIGFzIHdlIG9ubHkgbmVlZGVkIHRoaXMgdG8gc3VwcG9ydCBBbmd1bGFyIENMSSAxLjUuMCByYy4qXG4gICAgY29uc3QgbmdQcm9ncmFtID0gY3JlYXRlUHJvZ3JhbSh7XG4gICAgICByb290TmFtZXM6IG9wdGlvbnMucHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCksXG4gICAgICBvcHRpb25zOiB7Li4ub3B0aW9ucy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLCBjb2xsZWN0QWxsRXJyb3JzOiB0cnVlfSxcbiAgICAgIGhvc3Q6IG9wdGlvbnMuaG9zdFxuICAgIH0pO1xuICAgIGNvbnN0IGxhenlSb3V0ZXMgPSBuZ1Byb2dyYW0ubGlzdExhenlSb3V0ZXMob3B0aW9ucy5lbnRyeU1vZHVsZSk7XG5cbiAgICAvLyByZXNldCB0aGUgcmVmZXJlbmNlZEZpbGVzIHRoYXQgdGhlIG5nLlByb2dyYW0gYWRkZWQgdG8gdGhlIFNvdXJjZUZpbGVzXG4gICAgLy8gYXMgdGhlIGhvc3QgbWlnaHQgYmUgY2FjaGluZyB0aGUgc291cmNlIGZpbGVzIVxuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiBvcHRpb25zLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWZlcmVuY2VzID0gZ2V0T3JpZ2luYWxSZWZlcmVuY2VzKHNvdXJjZUZpbGUpO1xuICAgICAgaWYgKG9yaWdpbmFsUmVmZXJlbmNlcykge1xuICAgICAgICBzb3VyY2VGaWxlLnJlZmVyZW5jZWRGaWxlcyA9IG9yaWdpbmFsUmVmZXJlbmNlcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQ6IE5nVG9vbHNfSW50ZXJuYWxBcGlfTkdfMl9MYXp5Um91dGVNYXAgPSB7fTtcbiAgICBsYXp5Um91dGVzLmZvckVhY2gobGF6eVJvdXRlID0+IHtcbiAgICAgIGNvbnN0IHJvdXRlID0gbGF6eVJvdXRlLnJvdXRlO1xuICAgICAgY29uc3QgcmVmZXJlbmNlZEZpbGVQYXRoID0gbGF6eVJvdXRlLnJlZmVyZW5jZWRNb2R1bGUuZmlsZVBhdGg7XG4gICAgICBpZiAocmVzdWx0W3JvdXRlXSAmJiByZXN1bHRbcm91dGVdICE9IHJlZmVyZW5jZWRGaWxlUGF0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRHVwbGljYXRlZCBwYXRoIGluIGxvYWRDaGlsZHJlbiBkZXRlY3RlZDogXCIke3JvdXRlfVwiIGlzIHVzZWQgaW4gMiBsb2FkQ2hpbGRyZW4sIGAgK1xuICAgICAgICAgICAgYGJ1dCB0aGV5IHBvaW50IHRvIGRpZmZlcmVudCBtb2R1bGVzIFwiKCR7cmVzdWx0W3JvdXRlXX0gYW5kIGAgK1xuICAgICAgICAgICAgYFwiJHtyZWZlcmVuY2VkRmlsZVBhdGh9XCIpLiBXZWJwYWNrIGNhbm5vdCBkaXN0aW5ndWlzaCBvbiBjb250ZXh0IGFuZCB3b3VsZCBmYWlsIHRvIGAgK1xuICAgICAgICAgICAgJ2xvYWQgdGhlIHByb3BlciBvbmUuJyk7XG4gICAgICB9XG4gICAgICByZXN1bHRbcm91dGVdID0gcmVmZXJlbmNlZEZpbGVQYXRoO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHN0YXRpYyBleHRyYWN0STE4bihvcHRpb25zOiBOZ1Rvb2xzX0ludGVybmFsQXBpX05HMl9FeHRyYWN0STE4bl9PcHRpb25zKTogUHJvbWlzZTxhbnk+IHtcbiAgICB0aHJvdyB0aHJvd05vdFN1cHBvcnRlZEVycm9yKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGhyb3dOb3RTdXBwb3J0ZWRFcnJvcigpIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBQbGVhc2UgdXBkYXRlIEBhbmd1bGFyL2NsaS4gQW5ndWxhciA1KyByZXF1aXJlcyBhdCBsZWFzdCBBbmd1bGFyIENMSSAxLjUrYCk7XG59XG4iXX0=