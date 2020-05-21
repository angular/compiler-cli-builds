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
     * Copyright Google Inc. All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19jb21waWxlcl9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL25nY2NfY29tcGlsZXJfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJFQUE2RTtJQUM3RSw4REFBd0M7SUFFeEM7Ozs7O09BS0c7SUFDSDtRQUE2QyxtREFBaUI7UUFJNUQsaUNBQVksRUFBYyxFQUFFLE9BQTJCLEVBQVksY0FBc0I7WUFBekYsWUFDRSxrQkFBTSxFQUFFLEVBQUUsT0FBTyxDQUFDLFNBQ25CO1lBRmtFLG9CQUFjLEdBQWQsY0FBYyxDQUFRO1lBSGpGLFdBQUssR0FBRyxFQUFFLENBQUMsMkJBQTJCLENBQzFDLEtBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUEvQixDQUErQixDQUFDLENBQUM7O1FBSXpFLENBQUM7UUFFRCxvREFBa0IsR0FBbEIsVUFDSSxXQUFxQixFQUFFLGNBQXNCLEVBQUUsV0FBc0IsRUFDckUsbUJBQWlEO1lBRnJELGlCQXFCQztZQWxCQyxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVO2dCQUN4QixJQUFBLGNBQWMsR0FBSSxFQUFFLENBQUMsaUJBQWlCLENBQ3pDLFVBQVUsRUFBRSxjQUFjLEVBQUUsS0FBSSxDQUFDLE9BQU8sRUFBRSxLQUFJLEVBQUUsS0FBSSxDQUFDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxlQUQvRCxDQUNnRTtnQkFFckYsdUZBQXVGO2dCQUN2RiwwRkFBMEY7Z0JBQzFGLHFGQUFxRjtnQkFDckYsNEZBQTRGO2dCQUM1Riw0RUFBNEU7Z0JBQzVFLElBQUksY0FBYyxLQUFLLFNBQVMsSUFBSSxjQUFjLENBQUMsU0FBUyxLQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRztvQkFDN0UsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxzQkFBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNoRSxJQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDMUUsSUFBSSxLQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUMzQiw2Q0FBVyxjQUFjLEtBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBRTtxQkFDbEY7aUJBQ0Y7Z0JBQ0QsT0FBTyxjQUFjLENBQUM7WUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBOUJELENBQTZDLCtCQUFpQixHQThCN0Q7SUE5QlksMERBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmlsZVN5c3RlbSwgTmd0c2NDb21waWxlckhvc3R9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzUmVsYXRpdmVQYXRofSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbXBpbGVyIGhvc3QgdGhhdCByZXNvbHZlcyBhIG1vZHVsZSBpbXBvcnQgYXMgYSBKYXZhU2NyaXB0IHNvdXJjZSBmaWxlIGlmXG4gKiBhdmFpbGFibGUsIGluc3RlYWQgb2YgdGhlIC5kLnRzIHR5cGluZ3MgZmlsZSB0aGF0IHdvdWxkIGhhdmUgYmVlbiByZXNvbHZlZCBieSBUeXBlU2NyaXB0LiBUaGlzXG4gKiBpcyBuZWNlc3NhcnkgZm9yIHBhY2thZ2VzIHRoYXQgaGF2ZSB0aGVpciB0eXBpbmdzIGluIHRoZSBzYW1lIGRpcmVjdG9yeSBhcyB0aGUgc291cmNlcywgd2hpY2hcbiAqIHdvdWxkIG90aGVyd2lzZSBsZXQgVHlwZVNjcmlwdCBwcmVmZXIgdGhlIC5kLnRzIGZpbGUgaW5zdGVhZCBvZiB0aGUgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NTb3VyY2VzQ29tcGlsZXJIb3N0IGV4dGVuZHMgTmd0c2NDb21waWxlckhvc3Qge1xuICBwcml2YXRlIGNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgdGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGUgPT4gdGhpcy5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlKSk7XG5cbiAgY29uc3RydWN0b3IoZnM6IEZpbGVTeXN0ZW0sIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgcHJvdGVjdGVkIGVudHJ5UG9pbnRQYXRoOiBzdHJpbmcpIHtcbiAgICBzdXBlcihmcywgb3B0aW9ucyk7XG4gIH1cblxuICByZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICBtb2R1bGVOYW1lczogc3RyaW5nW10sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcsIHJldXNlZE5hbWVzPzogc3RyaW5nW10sXG4gICAgICByZWRpcmVjdGVkUmVmZXJlbmNlPzogdHMuUmVzb2x2ZWRQcm9qZWN0UmVmZXJlbmNlKTogQXJyYXk8dHMuUmVzb2x2ZWRNb2R1bGV8dW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIG1vZHVsZU5hbWVzLm1hcChtb2R1bGVOYW1lID0+IHtcbiAgICAgIGNvbnN0IHtyZXNvbHZlZE1vZHVsZX0gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICBtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLCB0aGlzLmNhY2hlLCByZWRpcmVjdGVkUmVmZXJlbmNlKTtcblxuICAgICAgLy8gSWYgdGhlIG1vZHVsZSByZXF1ZXN0IG9yaWdpbmF0ZWQgZnJvbSBhIHJlbGF0aXZlIGltcG9ydCBpbiBhIEphdmFTY3JpcHQgc291cmNlIGZpbGUsXG4gICAgICAvLyBUeXBlU2NyaXB0IG1heSBoYXZlIHJlc29sdmVkIHRoZSBtb2R1bGUgdG8gaXRzIC5kLnRzIGRlY2xhcmF0aW9uIGZpbGUgaWYgdGhlIC5qcyBzb3VyY2VcbiAgICAgIC8vIGZpbGUgd2FzIGluIHRoZSBzYW1lIGRpcmVjdG9yeS4gVGhpcyBpcyB1bmRlc2lyYWJsZSwgYXMgd2UgbmVlZCB0byBoYXZlIHRoZSBhY3R1YWxcbiAgICAgIC8vIEphdmFTY3JpcHQgYmVpbmcgcHJlc2VudCBpbiB0aGUgcHJvZ3JhbS4gVGhpcyBsb2dpYyByZWNvZ25pemVzIHRoaXMgc2NlbmFyaW8gYW5kIHJld3JpdGVzXG4gICAgICAvLyB0aGUgcmVzb2x2ZWQgLmQudHMgZGVjbGFyYXRpb24gZmlsZSB0byBpdHMgLmpzIGNvdW50ZXJwYXJ0LCBpZiBpdCBleGlzdHMuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUgIT09IHVuZGVmaW5lZCAmJiByZXNvbHZlZE1vZHVsZS5leHRlbnNpb24gPT09IHRzLkV4dGVuc2lvbi5EdHMgJiZcbiAgICAgICAgICBjb250YWluaW5nRmlsZS5lbmRzV2l0aCgnLmpzJykgJiYgaXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZSkpIHtcbiAgICAgICAgY29uc3QganNGaWxlID0gcmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZS5yZXBsYWNlKC9cXC5kXFwudHMkLywgJy5qcycpO1xuICAgICAgICBpZiAodGhpcy5maWxlRXhpc3RzKGpzRmlsZSkpIHtcbiAgICAgICAgICByZXR1cm4gey4uLnJlc29sdmVkTW9kdWxlLCByZXNvbHZlZEZpbGVOYW1lOiBqc0ZpbGUsIGV4dGVuc2lvbjogdHMuRXh0ZW5zaW9uLkpzfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc29sdmVkTW9kdWxlO1xuICAgIH0pO1xuICB9XG59XG4iXX0=