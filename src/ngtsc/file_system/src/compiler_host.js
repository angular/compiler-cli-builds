/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.NgtscCompilerHost = void 0;
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
            var path = (0, helpers_1.absoluteFrom)(fileName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBQzlCLHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsbUZBQXVDO0lBR3ZDO1FBQ0UsMkJBQXNCLEVBQWMsRUFBWSxPQUFnQztZQUFoQyx3QkFBQSxFQUFBLFlBQWdDO1lBQTFELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBWSxZQUFPLEdBQVAsT0FBTyxDQUF5QjtRQUFHLENBQUM7UUFFcEYseUNBQWEsR0FBYixVQUFjLFFBQWdCLEVBQUUsZUFBZ0M7WUFDOUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxPQUFPLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxTQUFTLENBQUM7UUFDeEMsQ0FBQztRQUVELGlEQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxpREFBcUIsR0FBckI7WUFDRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUN6QyxDQUFDO1FBRUQscUNBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUEwQztZQUM1QyxJQUFNLElBQUksR0FBRyxJQUFBLHNCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELCtDQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBRUQsZ0RBQW9CLEdBQXBCLFVBQXFCLFFBQWdCO1lBQ25DLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlFLENBQUM7UUFFRCxxREFBeUIsR0FBekI7WUFDRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELHNDQUFVLEdBQVY7WUFDRSxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUM1QixLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCO29CQUN4QyxPQUFPLE1BQU0sQ0FBQztnQkFDaEIsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVE7b0JBQzFCLE9BQU8sSUFBSSxDQUFDO2dCQUNkO29CQUNFLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNqQjtRQUNILENBQUM7UUFFRCxzQ0FBVSxHQUFWLFVBQVcsUUFBZ0I7WUFDekIsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuRSxDQUFDO1FBRUQsb0NBQVEsR0FBUixVQUFTLFFBQWdCO1lBQ3ZCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM3QixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQTdERCxJQTZEQztJQTdEWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbX0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBOZ3RzY0NvbXBpbGVySG9zdCBpbXBsZW1lbnRzIHRzLkNvbXBpbGVySG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHt9KSB7fVxuXG4gIGdldFNvdXJjZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQpOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdGV4dCA9IHRoaXMucmVhZEZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiB0ZXh0ICE9PSB1bmRlZmluZWQgPyB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCB0ZXh0LCBsYW5ndWFnZVZlcnNpb24sIHRydWUpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lKG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZnMuam9pbih0aGlzLmdldERlZmF1bHRMaWJMb2NhdGlvbigpLCB0cy5nZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9ucykpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZnMuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCk7XG4gIH1cblxuICB3cml0ZUZpbGUoXG4gICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICBzb3VyY2VGaWxlcz86IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4pOiB2b2lkIHtcbiAgICBjb25zdCBwYXRoID0gYWJzb2x1dGVGcm9tKGZpbGVOYW1lKTtcbiAgICB0aGlzLmZzLmVuc3VyZURpcih0aGlzLmZzLmRpcm5hbWUocGF0aCkpO1xuICAgIHRoaXMuZnMud3JpdGVGaWxlKHBhdGgsIGRhdGEpO1xuICB9XG5cbiAgZ2V0Q3VycmVudERpcmVjdG9yeSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmZzLnB3ZCgpO1xuICB9XG5cbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpID8gZmlsZU5hbWUgOiBmaWxlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mcy5pc0Nhc2VTZW5zaXRpdmUoKTtcbiAgfVxuXG4gIGdldE5ld0xpbmUoKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHRoaXMub3B0aW9ucy5uZXdMaW5lKSB7XG4gICAgICBjYXNlIHRzLk5ld0xpbmVLaW5kLkNhcnJpYWdlUmV0dXJuTGluZUZlZWQ6XG4gICAgICAgIHJldHVybiAnXFxyXFxuJztcbiAgICAgIGNhc2UgdHMuTmV3TGluZUtpbmQuTGluZUZlZWQ6XG4gICAgICAgIHJldHVybiAnXFxuJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBvcy5FT0w7XG4gICAgfVxuICB9XG5cbiAgZmlsZUV4aXN0cyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgYWJzUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShmaWxlTmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuZnMuZXhpc3RzKGFic1BhdGgpICYmIHRoaXMuZnMuc3RhdChhYnNQYXRoKS5pc0ZpbGUoKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBhYnNQYXRoID0gdGhpcy5mcy5yZXNvbHZlKGZpbGVOYW1lKTtcbiAgICBpZiAoIXRoaXMuZmlsZUV4aXN0cyhhYnNQYXRoKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUoYWJzUGF0aCk7XG4gIH1cbn1cbiJdfQ==