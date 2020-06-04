(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccSourcesCompilerHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * Represents a compiler host that resolves a module import as a JavaScript source file if
     * available, instead of the .d.ts typings file that would have been resolved by TypeScript. This
     * is necessary for packages that have their typings in the same directory as the sources, which
     * would otherwise let TypeScript prefer the .d.ts file instead of the JavaScript source file.
     */
    var NgccSourcesCompilerHost = /** @class */ (function (_super) {
        tslib_1.__extends(NgccSourcesCompilerHost, _super);
        function NgccSourcesCompilerHost(fs, options, entryPointPath) {
            var _this = _super.call(this, fs, options) || this;
            _this.entryPointPath = entryPointPath;
            _this.cache = ts.createModuleResolutionCache(_this.getCurrentDirectory(), function (file) { return _this.getCanonicalFileName(file); });
            return _this;
        }
        NgccSourcesCompilerHost.prototype.resolveModuleNames = function (moduleNames, containingFile, reusedNames, redirectedReference) {
            var _this = this;
            return moduleNames.map(function (moduleName) {
                var resolvedModule = ts.resolveModuleName(moduleName, containingFile, _this.options, _this, _this.cache, redirectedReference).resolvedModule;
                // If the module request originated from a relative import in a JavaScript source file,
                // TypeScript may have resolved the module to its .d.ts declaration file if the .js source
                // file was in the same directory. This is undesirable, as we need to have the actual
                // JavaScript being present in the program. This logic recognizes this scenario and rewrites
                // the resolved .d.ts declaration file to its .js counterpart, if it exists.
                if (resolvedModule !== undefined && resolvedModule.extension === ts.Extension.Dts &&
                    containingFile.endsWith('.js') && utils_1.isRelativePath(moduleName)) {
                    var jsFile = resolvedModule.resolvedFileName.replace(/\.d\.ts$/, '.js');
                    if (_this.fileExists(jsFile)) {
                        return tslib_1.__assign(tslib_1.__assign({}, resolvedModule), { resolvedFileName: jsFile, extension: ts.Extension.Js });
                    }
                }
                return resolvedModule;
            });
        };
        return NgccSourcesCompilerHost;
    }(file_system_1.NgtscCompilerHost));
    exports.NgccSourcesCompilerHost = NgccSourcesCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19jb21waWxlcl9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL25nY2NfY29tcGlsZXJfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUE2RTtJQUM3RSw4REFBd0M7SUFFeEM7Ozs7O09BS0c7SUFDSDtRQUE2QyxtREFBaUI7UUFJNUQsaUNBQVksRUFBYyxFQUFFLE9BQTJCLEVBQVksY0FBc0I7WUFBekYsWUFDRSxrQkFBTSxFQUFFLEVBQUUsT0FBTyxDQUFDLFNBQ25CO1lBRmtFLG9CQUFjLEdBQWQsY0FBYyxDQUFRO1lBSGpGLFdBQUssR0FBRyxFQUFFLENBQUMsMkJBQTJCLENBQzFDLEtBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUM7O1FBSXpFLENBQUM7UUFFRCxvREFBa0IsR0FBbEIsVUFDSSxXQUFxQixFQUFFLGNBQXNCLEVBQUUsV0FBc0IsRUFDckUsbUJBQWlEO1lBRnJELGlCQXFCQztZQWxCQyxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVO2dCQUN4QixJQUFBLGNBQWMsR0FBSSxFQUFFLENBQUMsaUJBQWlCLENBQ3pDLFVBQVUsRUFBRSxjQUFjLEVBQUUsS0FBSSxDQUFDLE9BQU8sRUFBRSxLQUFJLEVBQUUsS0FBSSxDQUFDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxlQUQvRCxDQUNnRTtnQkFFckYsdUZBQXVGO2dCQUN2RiwwRkFBMEY7Z0JBQzFGLHFGQUFxRjtnQkFDckYsNEZBQTRGO2dCQUM1Riw0RUFBNEU7Z0JBQzVFLElBQUksY0FBYyxLQUFLLFNBQVMsSUFBSSxjQUFjLENBQUMsU0FBUyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRztvQkFDN0UsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxzQkFBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNoRSxJQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDMUUsSUFBSSxLQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUMzQiw2Q0FBVyxjQUFjLEtBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBRTtxQkFDbEY7aUJBQ0Y7Z0JBQ0QsT0FBTyxjQUFjLENBQUM7WUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBOUJELENBQTZDLCtCQUFpQixHQThCN0Q7SUE5QlksMERBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlU3lzdGVtLCBOZ3RzY0NvbXBpbGVySG9zdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNSZWxhdGl2ZVBhdGh9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY29tcGlsZXIgaG9zdCB0aGF0IHJlc29sdmVzIGEgbW9kdWxlIGltcG9ydCBhcyBhIEphdmFTY3JpcHQgc291cmNlIGZpbGUgaWZcbiAqIGF2YWlsYWJsZSwgaW5zdGVhZCBvZiB0aGUgLmQudHMgdHlwaW5ncyBmaWxlIHRoYXQgd291bGQgaGF2ZSBiZWVuIHJlc29sdmVkIGJ5IFR5cGVTY3JpcHQuIFRoaXNcbiAqIGlzIG5lY2Vzc2FyeSBmb3IgcGFja2FnZXMgdGhhdCBoYXZlIHRoZWlyIHR5cGluZ3MgaW4gdGhlIHNhbWUgZGlyZWN0b3J5IGFzIHRoZSBzb3VyY2VzLCB3aGljaFxuICogd291bGQgb3RoZXJ3aXNlIGxldCBUeXBlU2NyaXB0IHByZWZlciB0aGUgLmQudHMgZmlsZSBpbnN0ZWFkIG9mIHRoZSBKYXZhU2NyaXB0IHNvdXJjZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY1NvdXJjZXNDb21waWxlckhvc3QgZXh0ZW5kcyBOZ3RzY0NvbXBpbGVySG9zdCB7XG4gIHByaXZhdGUgY2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICB0aGlzLmdldEN1cnJlbnREaXJlY3RvcnkoKSwgZmlsZSA9PiB0aGlzLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGUpKTtcblxuICBjb25zdHJ1Y3RvcihmczogRmlsZVN5c3RlbSwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcm90ZWN0ZWQgZW50cnlQb2ludFBhdGg6IHN0cmluZykge1xuICAgIHN1cGVyKGZzLCBvcHRpb25zKTtcbiAgfVxuXG4gIHJlc29sdmVNb2R1bGVOYW1lcyhcbiAgICAgIG1vZHVsZU5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZywgcmV1c2VkTmFtZXM/OiBzdHJpbmdbXSxcbiAgICAgIHJlZGlyZWN0ZWRSZWZlcmVuY2U/OiB0cy5SZXNvbHZlZFByb2plY3RSZWZlcmVuY2UpOiBBcnJheTx0cy5SZXNvbHZlZE1vZHVsZXx1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gbW9kdWxlTmFtZXMubWFwKG1vZHVsZU5hbWUgPT4ge1xuICAgICAgY29uc3Qge3Jlc29sdmVkTW9kdWxlfSA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMsIHRoaXMuY2FjaGUsIHJlZGlyZWN0ZWRSZWZlcmVuY2UpO1xuXG4gICAgICAvLyBJZiB0aGUgbW9kdWxlIHJlcXVlc3Qgb3JpZ2luYXRlZCBmcm9tIGEgcmVsYXRpdmUgaW1wb3J0IGluIGEgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZSxcbiAgICAgIC8vIFR5cGVTY3JpcHQgbWF5IGhhdmUgcmVzb2x2ZWQgdGhlIG1vZHVsZSB0byBpdHMgLmQudHMgZGVjbGFyYXRpb24gZmlsZSBpZiB0aGUgLmpzIHNvdXJjZVxuICAgICAgLy8gZmlsZSB3YXMgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LiBUaGlzIGlzIHVuZGVzaXJhYmxlLCBhcyB3ZSBuZWVkIHRvIGhhdmUgdGhlIGFjdHVhbFxuICAgICAgLy8gSmF2YVNjcmlwdCBiZWluZyBwcmVzZW50IGluIHRoZSBwcm9ncmFtLiBUaGlzIGxvZ2ljIHJlY29nbml6ZXMgdGhpcyBzY2VuYXJpbyBhbmQgcmV3cml0ZXNcbiAgICAgIC8vIHRoZSByZXNvbHZlZCAuZC50cyBkZWNsYXJhdGlvbiBmaWxlIHRvIGl0cyAuanMgY291bnRlcnBhcnQsIGlmIGl0IGV4aXN0cy5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSAhPT0gdW5kZWZpbmVkICYmIHJlc29sdmVkTW9kdWxlLmV4dGVuc2lvbiA9PT0gdHMuRXh0ZW5zaW9uLkR0cyAmJlxuICAgICAgICAgIGNvbnRhaW5pbmdGaWxlLmVuZHNXaXRoKCcuanMnKSAmJiBpc1JlbGF0aXZlUGF0aChtb2R1bGVOYW1lKSkge1xuICAgICAgICBjb25zdCBqc0ZpbGUgPSByZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnLmpzJyk7XG4gICAgICAgIGlmICh0aGlzLmZpbGVFeGlzdHMoanNGaWxlKSkge1xuICAgICAgICAgIHJldHVybiB7Li4ucmVzb2x2ZWRNb2R1bGUsIHJlc29sdmVkRmlsZU5hbWU6IGpzRmlsZSwgZXh0ZW5zaW9uOiB0cy5FeHRlbnNpb24uSnN9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb2x2ZWRNb2R1bGU7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==