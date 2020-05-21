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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXJfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2NvbXBpbGVyX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBQzlCLHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsbUZBQXVDO0lBR3ZDO1FBQ0UsMkJBQXNCLEVBQWMsRUFBWSxPQUFnQztZQUFoQyx3QkFBQSxFQUFBLFlBQWdDO1lBQTFELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBWSxZQUFPLEdBQVAsT0FBTyxDQUF5QjtRQUFHLENBQUM7UUFFcEYseUNBQWEsR0FBYixVQUFjLFFBQWdCLEVBQUUsZUFBZ0M7WUFDOUQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxPQUFPLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxTQUFTLENBQUM7UUFDeEMsQ0FBQztRQUVELGlEQUFxQixHQUFyQixVQUFzQixPQUEyQjtZQUMvQyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxpREFBcUIsR0FBckI7WUFDRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUN6QyxDQUFDO1FBRUQscUNBQVMsR0FBVCxVQUNJLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUE4QyxFQUM5QyxXQUEwQztZQUM1QyxJQUFNLElBQUksR0FBRyxzQkFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCwrQ0FBbUIsR0FBbkI7WUFDRSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVELGdEQUFvQixHQUFwQixVQUFxQixRQUFnQjtZQUNuQyxPQUFPLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM5RSxDQUFDO1FBRUQscURBQXlCLEdBQXpCO1lBQ0UsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFFRCxzQ0FBVSxHQUFWO1lBQ0UsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDNUIsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLHNCQUFzQjtvQkFDeEMsT0FBTyxNQUFNLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRO29CQUMxQixPQUFPLElBQUksQ0FBQztnQkFDZDtvQkFDRSxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDakI7UUFDSCxDQUFDO1FBRUQsc0NBQVUsR0FBVixVQUFXLFFBQWdCO1lBQ3pCLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkUsQ0FBQztRQUVELG9DQUFRLEdBQVIsVUFBUyxRQUFnQjtZQUN2QixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDN0IsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUE3REQsSUE2REM7SUE3RFksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tfSBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIE5ndHNjQ29tcGlsZXJIb3N0IGltcGxlbWVudHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZzOiBGaWxlU3lzdGVtLCBwcm90ZWN0ZWQgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0ge30pIHt9XG5cbiAgZ2V0U291cmNlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCk6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5yZWFkRmlsZShmaWxlTmFtZSk7XG4gICAgcmV0dXJuIHRleHQgIT09IHVuZGVmaW5lZCA/IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZU5hbWUsIHRleHQsIGxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXREZWZhdWx0TGliRmlsZU5hbWUob3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mcy5qb2luKHRoaXMuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCksIHRzLmdldERlZmF1bHRMaWJGaWxlTmFtZShvcHRpb25zKSk7XG4gIH1cblxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mcy5nZXREZWZhdWx0TGliTG9jYXRpb24oKTtcbiAgfVxuXG4gIHdyaXRlRmlsZShcbiAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZUZpbGVzPzogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPik6IHZvaWQge1xuICAgIGNvbnN0IHBhdGggPSBhYnNvbHV0ZUZyb20oZmlsZU5hbWUpO1xuICAgIHRoaXMuZnMuZW5zdXJlRGlyKHRoaXMuZnMuZGlybmFtZShwYXRoKSk7XG4gICAgdGhpcy5mcy53cml0ZUZpbGUocGF0aCwgZGF0YSk7XG4gIH1cblxuICBnZXRDdXJyZW50RGlyZWN0b3J5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZnMucHdkKCk7XG4gIH1cblxuICBnZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCkgPyBmaWxlTmFtZSA6IGZpbGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmZzLmlzQ2FzZVNlbnNpdGl2ZSgpO1xuICB9XG5cbiAgZ2V0TmV3TGluZSgpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAodGhpcy5vcHRpb25zLm5ld0xpbmUpIHtcbiAgICAgIGNhc2UgdHMuTmV3TGluZUtpbmQuQ2FycmlhZ2VSZXR1cm5MaW5lRmVlZDpcbiAgICAgICAgcmV0dXJuICdcXHJcXG4nO1xuICAgICAgY2FzZSB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZDpcbiAgICAgICAgcmV0dXJuICdcXG4nO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG9zLkVPTDtcbiAgICB9XG4gIH1cblxuICBmaWxlRXhpc3RzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBhYnNQYXRoID0gdGhpcy5mcy5yZXNvbHZlKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gdGhpcy5mcy5leGlzdHMoYWJzUGF0aCkgJiYgdGhpcy5mcy5zdGF0KGFic1BhdGgpLmlzRmlsZSgpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGFic1BhdGggPSB0aGlzLmZzLnJlc29sdmUoZmlsZU5hbWUpO1xuICAgIGlmICghdGhpcy5maWxlRXhpc3RzKGFic1BhdGgpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZShhYnNQYXRoKTtcbiAgfVxufVxuIl19