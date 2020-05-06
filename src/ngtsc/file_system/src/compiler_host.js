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
        define("@angular/compiler-cli/src/ngtsc/file_system/src/compiler_host", ["require", "exports", "os", "typescript", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference types="node" />
    var os = require("os");
    var ts = require("typescript");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    var NgtscCompilerHost = /** @class */ (function () {
        function NgtscCompilerHost(fs, options) {
            if (options === void 0) { options = {}; }
            this.fs = fs;
            this.options = options;
        }
        NgtscCompilerHost.prototype.getSourceFile = function (fileName, languageVersion) {
            var text = this.readFile(fileName);
            return text !== undefined ? ts.createSourceFile(fileName, text, languageVersion, true) :
                undefined;
        };
        NgtscCompilerHost.prototype.getDefaultLibFileName = function (options) {
            return this.fs.join(this.getDefaultLibLocation(), ts.getDefaultLibFileName(options));
        };
        NgtscCompilerHost.prototype.getDefaultLibLocation = function () {
            return this.fs.getDefaultLibLocation();
        };
        NgtscCompilerHost.prototype.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
            var path = helpers_1.absoluteFrom(fileName);
            this.fs.ensureDir(this.fs.dirname(path));
            this.fs.writeFile(path, data);
        };
        NgtscCompilerHost.prototype.getCurrentDirectory = function () {
            return this.fs.pwd();
        };
        NgtscCompilerHost.prototype.getCanonicalFileName = function (fileName) {
            return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
        };
        NgtscCompilerHost.prototype.useCaseSensitiveFileNames = function () {
            return this.fs.isCaseSensitive();
        };
        NgtscCompilerHost.prototype.getNewLine = function () {
            switch (this.options.newLine) {
                case ts.NewLineKind.CarriageReturnLineFeed:
                    return '\r\n';
                case ts.NewLineKind.LineFeed:
                    return '\n';
                default:
                    return os.EOL;
            }
        };
        NgtscCompilerHost.prototype.fileExists = function (fileName) {
            var absPath = this.fs.resolve(fileName);
            return this.fs.exists(absPath) && this.fs.stat(absPath).isFile();
        };
        NgtscCompilerHost.prototype.readFile = function (fileName) {
            var absPath = this.fs.resolve(fileName);
            if (!this.fileExists(absPath)) {
                return undefined;
            }
            return this.fs.readFile(absPath);
        };
        return NgtscCompilerHost;
    }());
    exports.NgtscCompilerHost = NgtscCompilerHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4QkFBOEI7SUFDOUIsdUJBQXlCO0lBQ3pCLCtCQUFpQztJQUVqQyxtRkFBdUM7SUFHdkM7UUFDRSwyQkFBc0IsRUFBYyxFQUFZLE9BQWdDO1lBQWhDLHdCQUFBLEVBQUEsWUFBZ0M7WUFBMUQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFZLFlBQU8sR0FBUCxPQUFPLENBQXlCO1FBQUcsQ0FBQztRQUVwRix5Q0FBYSxHQUFiLFVBQWMsUUFBZ0IsRUFBRSxlQUFnQztZQUM5RCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzVELFNBQVMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsaURBQXFCLEdBQXJCLFVBQXNCLE9BQTJCO1lBQy9DLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELGlEQUFxQixHQUFyQjtZQUNFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3pDLENBQUM7UUFFRCxxQ0FBUyxHQUFULFVBQ0ksUUFBZ0IsRUFBRSxJQUFZLEVBQUUsa0JBQTJCLEVBQzNELE9BQThDLEVBQzlDLFdBQTBDO1lBQzVDLElBQU0sSUFBSSxHQUFHLHNCQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELCtDQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBRUQsZ0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlFLENBQUM7UUFFRCxxREFBeUIsR0FBekI7WUFDRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELHNDQUFVLEdBQVY7WUFDRSxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUM1QixLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCO29CQUN4QyxPQUFPLE1BQU0sQ0FBQztnQkFDaEIsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVE7b0JBQzFCLE9BQU8sSUFBSSxDQUFDO2dCQUNkO29CQUNFLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNqQjtRQUNILENBQUM7UUFFRCxzQ0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuRSxDQUFDO1FBRUQsb0NBQVEsR0FBUixVQUFTLFFBQWdCO1lBQ3ZCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM3QixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQTdERCxJQTZEQztJQTdEWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb219IGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgTmd0c2NDb21waWxlckhvc3QgaW1wbGVtZW50cyB0cy5Db21waWxlckhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0sIHByb3RlY3RlZCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7fSkge31cblxuICBnZXRTb3VyY2VGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0KTogdHMuU291cmNlRmlsZXx1bmRlZmluZWQge1xuICAgIGNvbnN0IHRleHQgPSB0aGlzLnJlYWRGaWxlKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gdGV4dCAhPT0gdW5kZWZpbmVkID8gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlTmFtZSwgdGV4dCwgbGFuZ3VhZ2VWZXJzaW9uLCB0cnVlKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZzLmpvaW4odGhpcy5nZXREZWZhdWx0TGliTG9jYXRpb24oKSwgdHMuZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnMpKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZzLmdldERlZmF1bHRMaWJMb2NhdGlvbigpO1xuICB9XG5cbiAgd3JpdGVGaWxlKFxuICAgICAgZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgc291cmNlRmlsZXM/OiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+KTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IGFic29sdXRlRnJvbShmaWxlTmFtZSk7XG4gICAgdGhpcy5mcy5lbnN1cmVEaXIodGhpcy5mcy5kaXJuYW1lKHBhdGgpKTtcbiAgICB0aGlzLmZzLndyaXRlRmlsZShwYXRoLCBkYXRhKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mcy5wd2QoKTtcbiAgfVxuXG4gIGdldENhbm9uaWNhbEZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKSA/IGZpbGVOYW1lIDogZmlsZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZnMuaXNDYXNlU2Vuc2l0aXZlKCk7XG4gIH1cblxuICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgc3dpdGNoICh0aGlzLm9wdGlvbnMubmV3TGluZSkge1xuICAgICAgY2FzZSB0cy5OZXdMaW5lS2luZC5DYXJyaWFnZVJldHVybkxpbmVGZWVkOlxuICAgICAgICByZXR1cm4gJ1xcclxcbic7XG4gICAgICBjYXNlIHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkOlxuICAgICAgICByZXR1cm4gJ1xcbic7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gb3MuRU9MO1xuICAgIH1cbiAgfVxuXG4gIGZpbGVFeGlzdHMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGFic1BhdGggPSB0aGlzLmZzLnJlc29sdmUoZmlsZU5hbWUpO1xuICAgIHJldHVybiB0aGlzLmZzLmV4aXN0cyhhYnNQYXRoKSAmJiB0aGlzLmZzLnN0YXQoYWJzUGF0aCkuaXNGaWxlKCk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYWJzUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShmaWxlTmFtZSk7XG4gICAgaWYgKCF0aGlzLmZpbGVFeGlzdHMoYWJzUGF0aCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKGFic1BhdGgpO1xuICB9XG59XG4iXX0=