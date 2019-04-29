(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", ["require", "exports", "os", "typescript", "@angular/compiler-cli/src/ngtsc/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
            var nodeLibPath = path_1.AbsoluteFsPath.fromUnchecked(require.resolve('typescript'));
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19jb21waWxlcl9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL25nY2NfY29tcGlsZXJfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsNkRBQXVEO0lBR3ZEO1FBR0UsMEJBQW9CLEVBQWMsRUFBVSxPQUEyQjtZQUFuRCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7WUFGL0QsbUJBQWMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxxQkFBYyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRCLENBQUM7UUFFM0Usd0NBQWEsR0FBYixVQUFjLFFBQWdCLEVBQUUsZUFBZ0M7WUFDOUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxPQUFPLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDL0YsQ0FBQztRQUVELGdEQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELGdEQUFxQixHQUFyQjtZQUNFLElBQU0sV0FBVyxHQUFHLHFCQUFjLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNoRixPQUFPLHFCQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBRUQsb0NBQVMsR0FBVCxVQUFVLFFBQWdCLEVBQUUsSUFBWTtZQUN0QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBYyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRUQsOENBQW1CLEdBQW5CLGNBQWdDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdkQsK0NBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM1RSxDQUFDO1FBRUQsb0RBQXlCLEdBQXpCLGNBQXVDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFFcEUscUNBQVUsR0FBVjtZQUNFLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQzVCLEtBQUssRUFBRSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0I7b0JBQ3hDLE9BQU8sTUFBTSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUTtvQkFDMUIsT0FBTyxJQUFJLENBQUM7Z0JBQ2Q7b0JBQ0UsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2FBQ2pCO1FBQ0gsQ0FBQztRQUVELHFDQUFVLEdBQVYsVUFBVyxRQUFnQjtZQUN6QixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLHFCQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELG1DQUFRLEdBQVIsVUFBUyxRQUFnQjtZQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHFCQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXBERCxJQW9EQztJQXBEWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5cbmV4cG9ydCBjbGFzcyBOZ2NjQ29tcGlsZXJIb3N0IGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgcHJpdmF0ZSBfY2FzZVNlbnNpdGl2ZSA9IHRoaXMuZnMuZXhpc3RzKEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoX19maWxlbmFtZS50b1VwcGVyQ2FzZSgpKSk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHt9XG5cbiAgZ2V0U291cmNlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5yZWFkRmlsZShmaWxlTmFtZSk7XG4gICAgcmV0dXJuIHRleHQgIT09IHVuZGVmaW5lZCA/IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZU5hbWUsIHRleHQsIGxhbmd1YWdlVmVyc2lvbikgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXREZWZhdWx0TGliTG9jYXRpb24oKSArICcvJyArIHRzLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5vZGVMaWJQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChyZXF1aXJlLnJlc29sdmUoJ3R5cGVzY3JpcHQnKSk7XG4gICAgcmV0dXJuIEFic29sdXRlRnNQYXRoLmpvaW4obm9kZUxpYlBhdGgsICcuLicpO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuZnMud3JpdGVGaWxlKEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoZmlsZU5hbWUpLCBkYXRhKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuZnMucHdkKCk7IH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzID8gZmlsZU5hbWUgOiBmaWxlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuX2Nhc2VTZW5zaXRpdmU7IH1cblxuICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgc3dpdGNoICh0aGlzLm9wdGlvbnMubmV3TGluZSkge1xuICAgICAgY2FzZSB0cy5OZXdMaW5lS2luZC5DYXJyaWFnZVJldHVybkxpbmVGZWVkOlxuICAgICAgICByZXR1cm4gJ1xcclxcbic7XG4gICAgICBjYXNlIHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkOlxuICAgICAgICByZXR1cm4gJ1xcbic7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gb3MuRU9MO1xuICAgIH1cbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmZzLmV4aXN0cyhBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGZpbGVOYW1lKSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmZpbGVFeGlzdHMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGZpbGVOYW1lKSk7XG4gIH1cbn1cbiJdfQ==