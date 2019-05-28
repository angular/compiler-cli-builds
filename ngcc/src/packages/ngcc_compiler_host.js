(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", ["require", "exports", "tslib", "os", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/utils"], factory);
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
    var os = require("os");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var NgccCompilerHost = /** @class */ (function () {
        function NgccCompilerHost(fs, options) {
            this.fs = fs;
            this.options = options;
            this._caseSensitive = this.fs.exists(path_1.AbsoluteFsPath.fromUnchecked(__filename.toUpperCase()));
        }
        NgccCompilerHost.prototype.getSourceFile = function (fileName, languageVersion) {
            var text = this.readFile(fileName);
            return text !== undefined ? ts.createSourceFile(fileName, text, languageVersion) : undefined;
        };
        NgccCompilerHost.prototype.getDefaultLibFileName = function (options) {
            return this.getDefaultLibLocation() + '/' + ts.getDefaultLibFileName(options);
        };
        NgccCompilerHost.prototype.getDefaultLibLocation = function () {
            var nodeLibPath = path_1.AbsoluteFsPath.from(require.resolve('typescript'));
            return path_1.AbsoluteFsPath.join(nodeLibPath, '..');
        };
        NgccCompilerHost.prototype.writeFile = function (fileName, data) {
            this.fs.writeFile(path_1.AbsoluteFsPath.fromUnchecked(fileName), data);
        };
        NgccCompilerHost.prototype.getCurrentDirectory = function () { return this.fs.pwd(); };
        NgccCompilerHost.prototype.getCanonicalFileName = function (fileName) {
            return this.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        };
        NgccCompilerHost.prototype.useCaseSensitiveFileNames = function () { return this._caseSensitive; };
        NgccCompilerHost.prototype.getNewLine = function () {
            switch (this.options.newLine) {
                case ts.NewLineKind.CarriageReturnLineFeed:
                    return '\r\n';
                case ts.NewLineKind.LineFeed:
                    return '\n';
                default:
                    return os.EOL;
            }
        };
        NgccCompilerHost.prototype.fileExists = function (fileName) {
            return this.fs.exists(path_1.AbsoluteFsPath.fromUnchecked(fileName));
        };
        NgccCompilerHost.prototype.readFile = function (fileName) {
            if (!this.fileExists(fileName)) {
                return undefined;
            }
            return this.fs.readFile(path_1.AbsoluteFsPath.fromUnchecked(fileName));
        };
        return NgccCompilerHost;
    }());
    exports.NgccCompilerHost = NgccCompilerHost;
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
                        return tslib_1.__assign({}, resolvedModule, { resolvedFileName: jsFile, extension: ts.Extension.Js });
                    }
                }
                return resolvedModule;
            });
        };
        return NgccSourcesCompilerHost;
    }(NgccCompilerHost));
    exports.NgccSourcesCompilerHost = NgccSourcesCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19jb21waWxlcl9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL25nY2NfY29tcGlsZXJfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx1QkFBeUI7SUFDekIsK0JBQWlDO0lBRWpDLDZEQUF1RDtJQUV2RCw4REFBd0M7SUFFeEM7UUFHRSwwQkFBc0IsRUFBYyxFQUFZLE9BQTJCO1lBQXJELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBWSxZQUFPLEdBQVAsT0FBTyxDQUFvQjtZQUZuRSxtQkFBYyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLHFCQUFjLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEIsQ0FBQztRQUUvRSx3Q0FBYSxHQUFiLFVBQWMsUUFBZ0IsRUFBRSxlQUFnQztZQUM5RCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMvRixDQUFDO1FBRUQsZ0RBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsZ0RBQXFCLEdBQXJCO1lBQ0UsSUFBTSxXQUFXLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMs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O29CQUMxRSxJQUFJLEtBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7d0JBQzNCLDRCQUFXLGNBQWMsSUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFFO3FCQUNsRjtpQkFDRjtnQkFDRCxPQUFPLGNBQWMsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUE5QkQsQ0FBNkMsZ0JBQWdCLEdBOEI1RDtJQTlCWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzUmVsYXRpdmVQYXRofSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBOZ2NjQ29tcGlsZXJIb3N0IGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgcHJpdmF0ZSBfY2FzZVNlbnNpdGl2ZSA9IHRoaXMuZnMuZXhpc3RzKEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoX19maWxlbmFtZS50b1VwcGVyQ2FzZSgpKSk7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZzOiBGaWxlU3lzdGVtLCBwcm90ZWN0ZWQgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKSB7fVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGV4dCA9IHRoaXMucmVhZEZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiB0ZXh0ICE9PSB1bmRlZmluZWQgPyB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCB0ZXh0LCBsYW5ndWFnZVZlcnNpb24pIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCkgKyAnLycgKyB0cy5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucyk7XG4gIH1cblxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogc3RyaW5nIHtcbiAgICBjb25zdCBub2RlTGliUGF0aCA9IEFic29sdXRlRnNQYXRoLmZyb20ocmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JykpO1xuICAgIHJldHVybiBBYnNvbHV0ZUZzUGF0aC5qb2luKG5vZGVMaWJQYXRoLCAnLi4nKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmZzLndyaXRlRmlsZShBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGZpbGVOYW1lKSwgZGF0YSk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmZzLnB3ZCgpOyB9XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyA/IGZpbGVOYW1lIDogZmlsZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLl9jYXNlU2Vuc2l0aXZlOyB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAodGhpcy5vcHRpb25zLm5ld0xpbmUpIHtcbiAgICAgIGNhc2UgdHMuTmV3TGluZUtpbmQuQ2FycmlhZ2VSZXR1cm5MaW5lRmVlZDpcbiAgICAgICAgcmV0dXJuICdcXHJcXG4nO1xuICAgICAgY2FzZSB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZDpcbiAgICAgICAgcmV0dXJuICdcXG4nO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG9zLkVPTDtcbiAgICB9XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mcy5leGlzdHMoQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChmaWxlTmFtZSkpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5maWxlRXhpc3RzKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUoQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChmaWxlTmFtZSkpO1xuICB9XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNvbXBpbGVyIGhvc3QgdGhhdCByZXNvbHZlcyBhIG1vZHVsZSBpbXBvcnQgYXMgYSBKYXZhU2NyaXB0IHNvdXJjZSBmaWxlIGlmXG4gKiBhdmFpbGFibGUsIGluc3RlYWQgb2YgdGhlIC5kLnRzIHR5cGluZ3MgZmlsZSB0aGF0IHdvdWxkIGhhdmUgYmVlbiByZXNvbHZlZCBieSBUeXBlU2NyaXB0LiBUaGlzXG4gKiBpcyBuZWNlc3NhcnkgZm9yIHBhY2thZ2VzIHRoYXQgaGF2ZSB0aGVpciB0eXBpbmdzIGluIHRoZSBzYW1lIGRpcmVjdG9yeSBhcyB0aGUgc291cmNlcywgd2hpY2hcbiAqIHdvdWxkIG90aGVyd2lzZSBsZXQgVHlwZVNjcmlwdCBwcmVmZXIgdGhlIC5kLnRzIGZpbGUgaW5zdGVhZCBvZiB0aGUgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NTb3VyY2VzQ29tcGlsZXJIb3N0IGV4dGVuZHMgTmdjY0NvbXBpbGVySG9zdCB7XG4gIHByaXZhdGUgY2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICB0aGlzLmdldEN1cnJlbnREaXJlY3RvcnkoKSwgZmlsZSA9PiB0aGlzLmdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGUpKTtcblxuICBjb25zdHJ1Y3RvcihmczogRmlsZVN5c3RlbSwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcm90ZWN0ZWQgZW50cnlQb2ludFBhdGg6IHN0cmluZykge1xuICAgIHN1cGVyKGZzLCBvcHRpb25zKTtcbiAgfVxuXG4gIHJlc29sdmVNb2R1bGVOYW1lcyhcbiAgICAgIG1vZHVsZU5hbWVzOiBzdHJpbmdbXSwgY29udGFpbmluZ0ZpbGU6IHN0cmluZywgcmV1c2VkTmFtZXM/OiBzdHJpbmdbXSxcbiAgICAgIHJlZGlyZWN0ZWRSZWZlcmVuY2U/OiB0cy5SZXNvbHZlZFByb2plY3RSZWZlcmVuY2UpOiBBcnJheTx0cy5SZXNvbHZlZE1vZHVsZXx1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gbW9kdWxlTmFtZXMubWFwKG1vZHVsZU5hbWUgPT4ge1xuICAgICAgY29uc3Qge3Jlc29sdmVkTW9kdWxlfSA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMsIHRoaXMuY2FjaGUsIHJlZGlyZWN0ZWRSZWZlcmVuY2UpO1xuXG4gICAgICAvLyBJZiB0aGUgbW9kdWxlIHJlcXVlc3Qgb3JpZ2luYXRlZCBmcm9tIGEgcmVsYXRpdmUgaW1wb3J0IGluIGEgSmF2YVNjcmlwdCBzb3VyY2UgZmlsZSxcbiAgICAgIC8vIFR5cGVTY3JpcHQgbWF5IGhhdmUgcmVzb2x2ZWQgdGhlIG1vZHVsZSB0byBpdHMgLmQudHMgZGVjbGFyYXRpb24gZmlsZSBpZiB0aGUgLmpzIHNvdXJjZVxuICAgICAgLy8gZmlsZSB3YXMgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LiBUaGlzIGlzIHVuZGVzaXJhYmxlLCBhcyB3ZSBuZWVkIHRvIGhhdmUgdGhlIGFjdHVhbFxuICAgICAgLy8gSmF2YVNjcmlwdCBiZWluZyBwcmVzZW50IGluIHRoZSBwcm9ncmFtLiBUaGlzIGxvZ2ljIHJlY29nbml6ZXMgdGhpcyBzY2VuYXJpbyBhbmQgcmV3cml0ZXNcbiAgICAgIC8vIHRoZSByZXNvbHZlZCAuZC50cyBkZWNsYXJhdGlvbiBmaWxlIHRvIGl0cyAuanMgY291bnRlcnBhcnQsIGlmIGl0IGV4aXN0cy5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSAhPT0gdW5kZWZpbmVkICYmIHJlc29sdmVkTW9kdWxlLmV4dGVuc2lvbiA9PT0gdHMuRXh0ZW5zaW9uLkR0cyAmJlxuICAgICAgICAgIGNvbnRhaW5pbmdGaWxlLmVuZHNXaXRoKCcuanMnKSAmJiBpc1JlbGF0aXZlUGF0aChtb2R1bGVOYW1lKSkge1xuICAgICAgICBjb25zdCBqc0ZpbGUgPSByZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnLmpzJyk7XG4gICAgICAgIGlmICh0aGlzLmZpbGVFeGlzdHMoanNGaWxlKSkge1xuICAgICAgICAgIHJldHVybiB7Li4ucmVzb2x2ZWRNb2R1bGUsIHJlc29sdmVkRmlsZU5hbWU6IGpzRmlsZSwgZXh0ZW5zaW9uOiB0cy5FeHRlbnNpb24uSnN9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzb2x2ZWRNb2R1bGU7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==