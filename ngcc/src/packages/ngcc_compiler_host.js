(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/analysis/util", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccDtsCompilerHost = exports.NgccSourcesCompilerHost = void 0;
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
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * Represents a compiler host that resolves a module import as a JavaScript source file if
     * available, instead of the .d.ts typings file that would have been resolved by TypeScript. This
     * is necessary for packages that have their typings in the same directory as the sources, which
     * would otherwise let TypeScript prefer the .d.ts file instead of the JavaScript source file.
     */
    var NgccSourcesCompilerHost = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(NgccSourcesCompilerHost, _super);
        function NgccSourcesCompilerHost(fs, options, cache, moduleResolutionCache, packagePath) {
            var _this = _super.call(this, fs, options) || this;
            _this.cache = cache;
            _this.moduleResolutionCache = moduleResolutionCache;
            _this.packagePath = packagePath;
            return _this;
        }
        NgccSourcesCompilerHost.prototype.getSourceFile = function (fileName, languageVersion) {
            return this.cache.getCachedSourceFile(fileName, languageVersion);
        };
        NgccSourcesCompilerHost.prototype.resolveModuleNames = function (moduleNames, containingFile, reusedNames, redirectedReference) {
            var _this = this;
            return moduleNames.map(function (moduleName) {
                var resolvedModule = ts.resolveModuleName(moduleName, containingFile, _this.options, _this, _this.moduleResolutionCache, redirectedReference).resolvedModule;
                // If the module request originated from a relative import in a JavaScript source file,
                // TypeScript may have resolved the module to its .d.ts declaration file if the .js source
                // file was in the same directory. This is undesirable, as we need to have the actual
                // JavaScript being present in the program. This logic recognizes this scenario and rewrites
                // the resolved .d.ts declaration file to its .js counterpart, if it exists.
                if ((resolvedModule === null || resolvedModule === void 0 ? void 0 : resolvedModule.extension) === ts.Extension.Dts && containingFile.endsWith('.js') &&
                    (0, utils_1.isRelativePath)(moduleName)) {
                    var jsFile = resolvedModule.resolvedFileName.replace(/\.d\.ts$/, '.js');
                    if (_this.fileExists(jsFile)) {
                        return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, resolvedModule), { resolvedFileName: jsFile, extension: ts.Extension.Js });
                    }
                }
                // Prevent loading JavaScript source files outside of the package root, which would happen for
                // packages that don't have .d.ts files. As ngcc should only operate on the .js files
                // contained within the package, any files outside the package are simply discarded. This does
                // result in a partial program with error diagnostics, however ngcc won't gather diagnostics
                // for the program it creates so these diagnostics won't be reported.
                if ((resolvedModule === null || resolvedModule === void 0 ? void 0 : resolvedModule.extension) === ts.Extension.Js &&
                    !(0, util_1.isWithinPackage)(_this.packagePath, _this.fs.resolve(resolvedModule.resolvedFileName))) {
                    return undefined;
                }
                return resolvedModule;
            });
        };
        return NgccSourcesCompilerHost;
    }(file_system_1.NgtscCompilerHost));
    exports.NgccSourcesCompilerHost = NgccSourcesCompilerHost;
    /**
     * A compiler host implementation that is used for the typings program. It leverages the entry-point
     * cache for source files and module resolution, as these results can be reused across the sources
     * program.
     */
    var NgccDtsCompilerHost = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(NgccDtsCompilerHost, _super);
        function NgccDtsCompilerHost(fs, options, cache, moduleResolutionCache) {
            var _this = _super.call(this, fs, options) || this;
            _this.cache = cache;
            _this.moduleResolutionCache = moduleResolutionCache;
            return _this;
        }
        NgccDtsCompilerHost.prototype.getSourceFile = function (fileName, languageVersion) {
            return this.cache.getCachedSourceFile(fileName, languageVersion);
        };
        NgccDtsCompilerHost.prototype.resolveModuleNames = function (moduleNames, containingFile, reusedNames, redirectedReference) {
            var _this = this;
            return moduleNames.map(function (moduleName) {
                var resolvedModule = ts.resolveModuleName(moduleName, containingFile, _this.options, _this, _this.moduleResolutionCache, redirectedReference).resolvedModule;
                return resolvedModule;
            });
        };
        return NgccDtsCompilerHost;
    }(file_system_1.NgtscCompilerHost));
    exports.NgccDtsCompilerHost = NgccDtsCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19jb21waWxlcl9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL25nY2NfY29tcGlsZXJfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUE2RjtJQUM3RixxRUFBaUQ7SUFDakQsOERBQXdDO0lBR3hDOzs7OztPQUtHO0lBQ0g7UUFBNkMsd0RBQWlCO1FBQzVELGlDQUNJLEVBQWMsRUFBRSxPQUEyQixFQUFVLEtBQTBCLEVBQ3ZFLHFCQUErQyxFQUM3QyxXQUEyQjtZQUh6QyxZQUlFLGtCQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsU0FDbkI7WUFKd0QsV0FBSyxHQUFMLEtBQUssQ0FBcUI7WUFDdkUsMkJBQXFCLEdBQXJCLHFCQUFxQixDQUEwQjtZQUM3QyxpQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7O1FBRXpDLENBQUM7UUFFUSwrQ0FBYSxHQUF0QixVQUF1QixRQUFnQixFQUFFLGVBQWdDO1lBRXZFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELG9EQUFrQixHQUFsQixVQUNJLFdBQXFCLEVBQUUsY0FBc0IsRUFBRSxXQUFzQixFQUNyRSxtQkFBaUQ7WUFGckQsaUJBaUNDO1lBOUJDLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFBLFVBQVU7Z0JBQ3hCLElBQUEsY0FBYyxHQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDekMsVUFBVSxFQUFFLGNBQWMsRUFBRSxLQUFJLENBQUMsT0FBTyxFQUFFLEtBQUksRUFBRSxLQUFJLENBQUMscUJBQXFCLEVBQzFFLG1CQUFtQixDQUFDLGVBRkgsQ0FFSTtnQkFFekIsdUZBQXVGO2dCQUN2RiwwRkFBMEY7Z0JBQzFGLHFGQUFxRjtnQkFDckYsNEZBQTRGO2dCQUM1Riw0RUFBNEU7Z0JBQzVFLElBQUksQ0FBQSxjQUFjLGFBQWQsY0FBYyx1QkFBZCxjQUFjLENBQUUsU0FBUyxNQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUNoRixJQUFBLHNCQUFjLEVBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQzlCLElBQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMxRSxJQUFJLEtBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQzNCLHVEQUFXLGNBQWMsS0FBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFFO3FCQUNsRjtpQkFDRjtnQkFFRCw4RkFBOEY7Z0JBQzlGLHFGQUFxRjtnQkFDckYsOEZBQThGO2dCQUM5Riw0RkFBNEY7Z0JBQzVGLHFFQUFxRTtnQkFDckUsSUFBSSxDQUFBLGNBQWMsYUFBZCxjQUFjLHVCQUFkLGNBQWMsQ0FBRSxTQUFTLE1BQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFO29CQUM3QyxDQUFDLElBQUEsc0JBQWUsRUFBQyxLQUFJLENBQUMsV0FBVyxFQUFFLEtBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUU7b0JBQ3hGLE9BQU8sU0FBUyxDQUFDO2lCQUNsQjtnQkFFRCxPQUFPLGNBQWMsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUEvQ0QsQ0FBNkMsK0JBQWlCLEdBK0M3RDtJQS9DWSwwREFBdUI7SUFpRHBDOzs7O09BSUc7SUFDSDtRQUF5QyxvREFBaUI7UUFDeEQsNkJBQ0ksRUFBYyxFQUFFLE9BQTJCLEVBQVUsS0FBMEIsRUFDdkUscUJBQStDO1lBRjNELFlBR0Usa0JBQU0sRUFBRSxFQUFFLE9BQU8sQ0FBQyxTQUNuQjtZQUh3RCxXQUFLLEdBQUwsS0FBSyxDQUFxQjtZQUN2RSwyQkFBcUIsR0FBckIscUJBQXFCLENBQTBCOztRQUUzRCxDQUFDO1FBRVEsMkNBQWEsR0FBdEIsVUFBdUIsUUFBZ0IsRUFBRSxlQUFnQztZQUV2RSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxnREFBa0IsR0FBbEIsVUFDSSxXQUFxQixFQUFFLGNBQXNCLEVBQUUsV0FBc0IsRUFDckUsbUJBQWlEO1lBRnJELGlCQVNDO1lBTkMsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsVUFBVTtnQkFDeEIsSUFBQSxjQUFjLEdBQUksRUFBRSxDQUFDLGlCQUFpQixDQUN6QyxVQUFVLEVBQUUsY0FBYyxFQUFFLEtBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSSxFQUFFLEtBQUksQ0FBQyxxQkFBcUIsRUFDMUUsbUJBQW1CLENBQUMsZUFGSCxDQUVJO2dCQUN6QixPQUFPLGNBQWMsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUF0QkQsQ0FBeUMsK0JBQWlCLEdBc0J6RDtJQXRCWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBOZ3RzY0NvbXBpbGVySG9zdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuLi9hbmFseXNpcy91dGlsJztcbmltcG9ydCB7aXNSZWxhdGl2ZVBhdGh9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7RW50cnlQb2ludEZpbGVDYWNoZX0gZnJvbSAnLi9zb3VyY2VfZmlsZV9jYWNoZSc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbXBpbGVyIGhvc3QgdGhhdCByZXNvbHZlcyBhIG1vZHVsZSBpbXBvcnQgYXMgYSBKYXZhU2NyaXB0IHNvdXJjZSBmaWxlIGlmXG4gKiBhdmFpbGFibGUsIGluc3RlYWQgb2YgdGhlIC5kLnRzIHR5cGluZ3MgZmlsZSB0aGF0IHdvdWxkIGhhdmUgYmVlbiByZXNvbHZlZCBieSBUeXBlU2NyaXB0LiBUaGlzXG4gKiBpcyBuZWNlc3NhcnkgZm9yIHBhY2thZ2VzIHRoYXQgaGF2ZSB0aGVpciB0eXBpbmdzIGluIHRoZSBzYW1lIGRpcmVjdG9yeSBhcyB0aGUgc291cmNlcywgd2hpY2hcbiAqIHdvdWxkIG90aGVyd2lzZSBsZXQgVHlwZVNjcmlwdCBwcmVmZXIgdGhlIC5kLnRzIGZpbGUgaW5zdGVhZCBvZiB0aGUgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NTb3VyY2VzQ29tcGlsZXJIb3N0IGV4dGVuZHMgTmd0c2NDb21waWxlckhvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGZzOiBGaWxlU3lzdGVtLCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIHByaXZhdGUgY2FjaGU6IEVudHJ5UG9pbnRGaWxlQ2FjaGUsXG4gICAgICBwcml2YXRlIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlLFxuICAgICAgcHJvdGVjdGVkIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHN1cGVyKGZzLCBvcHRpb25zKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXRDYWNoZWRTb3VyY2VGaWxlKGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24pO1xuICB9XG5cbiAgcmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgbW9kdWxlTmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nLCByZXVzZWROYW1lcz86IHN0cmluZ1tdLFxuICAgICAgcmVkaXJlY3RlZFJlZmVyZW5jZT86IHRzLlJlc29sdmVkUHJvamVjdFJlZmVyZW5jZSk6IEFycmF5PHRzLlJlc29sdmVkTW9kdWxlfHVuZGVmaW5lZD4ge1xuICAgIHJldHVybiBtb2R1bGVOYW1lcy5tYXAobW9kdWxlTmFtZSA9PiB7XG4gICAgICBjb25zdCB7cmVzb2x2ZWRNb2R1bGV9ID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUsIHRoaXMub3B0aW9ucywgdGhpcywgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUsXG4gICAgICAgICAgcmVkaXJlY3RlZFJlZmVyZW5jZSk7XG5cbiAgICAgIC8vIElmIHRoZSBtb2R1bGUgcmVxdWVzdCBvcmlnaW5hdGVkIGZyb20gYSByZWxhdGl2ZSBpbXBvcnQgaW4gYSBKYXZhU2NyaXB0IHNvdXJjZSBmaWxlLFxuICAgICAgLy8gVHlwZVNjcmlwdCBtYXkgaGF2ZSByZXNvbHZlZCB0aGUgbW9kdWxlIHRvIGl0cyAuZC50cyBkZWNsYXJhdGlvbiBmaWxlIGlmIHRoZSAuanMgc291cmNlXG4gICAgICAvLyBmaWxlIHdhcyBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuIFRoaXMgaXMgdW5kZXNpcmFibGUsIGFzIHdlIG5lZWQgdG8gaGF2ZSB0aGUgYWN0dWFsXG4gICAgICAvLyBKYXZhU2NyaXB0IGJlaW5nIHByZXNlbnQgaW4gdGhlIHByb2dyYW0uIFRoaXMgbG9naWMgcmVjb2duaXplcyB0aGlzIHNjZW5hcmlvIGFuZCByZXdyaXRlc1xuICAgICAgLy8gdGhlIHJlc29sdmVkIC5kLnRzIGRlY2xhcmF0aW9uIGZpbGUgdG8gaXRzIC5qcyBjb3VudGVycGFydCwgaWYgaXQgZXhpc3RzLlxuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlPy5leHRlbnNpb24gPT09IHRzLkV4dGVuc2lvbi5EdHMgJiYgY29udGFpbmluZ0ZpbGUuZW5kc1dpdGgoJy5qcycpICYmXG4gICAgICAgICAgaXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZSkpIHtcbiAgICAgICAgY29uc3QganNGaWxlID0gcmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZS5yZXBsYWNlKC9cXC5kXFwudHMkLywgJy5qcycpO1xuICAgICAgICBpZiAodGhpcy5maWxlRXhpc3RzKGpzRmlsZSkpIHtcbiAgICAgICAgICByZXR1cm4gey4uLnJlc29sdmVkTW9kdWxlLCByZXNvbHZlZEZpbGVOYW1lOiBqc0ZpbGUsIGV4dGVuc2lvbjogdHMuRXh0ZW5zaW9uLkpzfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQcmV2ZW50IGxvYWRpbmcgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZXMgb3V0c2lkZSBvZiB0aGUgcGFja2FnZSByb290LCB3aGljaCB3b3VsZCBoYXBwZW4gZm9yXG4gICAgICAvLyBwYWNrYWdlcyB0aGF0IGRvbid0IGhhdmUgLmQudHMgZmlsZXMuIEFzIG5nY2Mgc2hvdWxkIG9ubHkgb3BlcmF0ZSBvbiB0aGUgLmpzIGZpbGVzXG4gICAgICAvLyBjb250YWluZWQgd2l0aGluIHRoZSBwYWNrYWdlLCBhbnkgZmlsZXMgb3V0c2lkZSB0aGUgcGFja2FnZSBhcmUgc2ltcGx5IGRpc2NhcmRlZC4gVGhpcyBkb2VzXG4gICAgICAvLyByZXN1bHQgaW4gYSBwYXJ0aWFsIHByb2dyYW0gd2l0aCBlcnJvciBkaWFnbm9zdGljcywgaG93ZXZlciBuZ2NjIHdvbid0IGdhdGhlciBkaWFnbm9zdGljc1xuICAgICAgLy8gZm9yIHRoZSBwcm9ncmFtIGl0IGNyZWF0ZXMgc28gdGhlc2UgZGlhZ25vc3RpY3Mgd29uJ3QgYmUgcmVwb3J0ZWQuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGU/LmV4dGVuc2lvbiA9PT0gdHMuRXh0ZW5zaW9uLkpzICYmXG4gICAgICAgICAgIWlzV2l0aGluUGFja2FnZSh0aGlzLnBhY2thZ2VQYXRoLCB0aGlzLmZzLnJlc29sdmUocmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSkpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXNvbHZlZE1vZHVsZTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29tcGlsZXIgaG9zdCBpbXBsZW1lbnRhdGlvbiB0aGF0IGlzIHVzZWQgZm9yIHRoZSB0eXBpbmdzIHByb2dyYW0uIEl0IGxldmVyYWdlcyB0aGUgZW50cnktcG9pbnRcbiAqIGNhY2hlIGZvciBzb3VyY2UgZmlsZXMgYW5kIG1vZHVsZSByZXNvbHV0aW9uLCBhcyB0aGVzZSByZXN1bHRzIGNhbiBiZSByZXVzZWQgYWNyb3NzIHRoZSBzb3VyY2VzXG4gKiBwcm9ncmFtLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY0R0c0NvbXBpbGVySG9zdCBleHRlbmRzIE5ndHNjQ29tcGlsZXJIb3N0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBmczogRmlsZVN5c3RlbSwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcml2YXRlIGNhY2hlOiBFbnRyeVBvaW50RmlsZUNhY2hlLFxuICAgICAgcHJpdmF0ZSBtb2R1bGVSZXNvbHV0aW9uQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZSkge1xuICAgIHN1cGVyKGZzLCBvcHRpb25zKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXRDYWNoZWRTb3VyY2VGaWxlKGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24pO1xuICB9XG5cbiAgcmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgbW9kdWxlTmFtZXM6IHN0cmluZ1tdLCBjb250YWluaW5nRmlsZTogc3RyaW5nLCByZXVzZWROYW1lcz86IHN0cmluZ1tdLFxuICAgICAgcmVkaXJlY3RlZFJlZmVyZW5jZT86IHRzLlJlc29sdmVkUHJvamVjdFJlZmVyZW5jZSk6IEFycmF5PHRzLlJlc29sdmVkTW9kdWxlfHVuZGVmaW5lZD4ge1xuICAgIHJldHVybiBtb2R1bGVOYW1lcy5tYXAobW9kdWxlTmFtZSA9PiB7XG4gICAgICBjb25zdCB7cmVzb2x2ZWRNb2R1bGV9ID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUsIHRoaXMub3B0aW9ucywgdGhpcywgdGhpcy5tb2R1bGVSZXNvbHV0aW9uQ2FjaGUsXG4gICAgICAgICAgcmVkaXJlY3RlZFJlZmVyZW5jZSk7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRNb2R1bGU7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==