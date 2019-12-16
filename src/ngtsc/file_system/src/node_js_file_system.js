(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/node_js_file_system", ["require", "exports", "tslib", "fs", "path", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers"], factory);
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
    /// <reference types="node" />
    var fs = require("fs");
    var p = require("path");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    /**
     * A wrapper around the Node.js file-system (i.e the `fs` package).
     */
    var NodeJSFileSystem = /** @class */ (function () {
        function NodeJSFileSystem() {
            this._caseSensitive = undefined;
        }
        NodeJSFileSystem.prototype.exists = function (path) { return fs.existsSync(path); };
        NodeJSFileSystem.prototype.readFile = function (path) { return fs.readFileSync(path, 'utf8'); };
        NodeJSFileSystem.prototype.writeFile = function (path, data) {
            return fs.writeFileSync(path, data, 'utf8');
        };
        NodeJSFileSystem.prototype.symlink = function (target, path) { fs.symlinkSync(target, path); };
        NodeJSFileSystem.prototype.readdir = function (path) { return fs.readdirSync(path); };
        NodeJSFileSystem.prototype.lstat = function (path) { return fs.lstatSync(path); };
        NodeJSFileSystem.prototype.stat = function (path) { return fs.statSync(path); };
        NodeJSFileSystem.prototype.pwd = function () { return this.normalize(process.cwd()); };
        NodeJSFileSystem.prototype.chdir = function (dir) { process.chdir(dir); };
        NodeJSFileSystem.prototype.copyFile = function (from, to) { fs.copyFileSync(from, to); };
        NodeJSFileSystem.prototype.moveFile = function (from, to) { fs.renameSync(from, to); };
        NodeJSFileSystem.prototype.ensureDir = function (path) {
            var parents = [];
            while (!this.isRoot(path) && !this.exists(path)) {
                parents.push(path);
                path = this.dirname(path);
            }
            while (parents.length) {
                this.safeMkdir(parents.pop());
            }
        };
        NodeJSFileSystem.prototype.isCaseSensitive = function () {
            if (this._caseSensitive === undefined) {
                this._caseSensitive = this.exists(togglePathCase(__filename));
            }
            return this._caseSensitive;
        };
        NodeJSFileSystem.prototype.resolve = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return this.normalize(p.resolve.apply(p, tslib_1.__spread(paths)));
        };
        NodeJSFileSystem.prototype.dirname = function (file) { return this.normalize(p.dirname(file)); };
        NodeJSFileSystem.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return this.normalize(p.join.apply(p, tslib_1.__spread([basePath], paths)));
        };
        NodeJSFileSystem.prototype.isRoot = function (path) { return this.dirname(path) === this.normalize(path); };
        NodeJSFileSystem.prototype.isRooted = function (path) { return p.isAbsolute(path); };
        NodeJSFileSystem.prototype.relative = function (from, to) {
            return helpers_1.relativeFrom(this.normalize(p.relative(from, to)));
        };
        NodeJSFileSystem.prototype.basename = function (filePath, extension) {
            return p.basename(filePath, extension);
        };
        NodeJSFileSystem.prototype.extname = function (path) { return p.extname(path); };
        NodeJSFileSystem.prototype.realpath = function (path) { return this.resolve(fs.realpathSync(path)); };
        NodeJSFileSystem.prototype.getDefaultLibLocation = function () {
            return this.resolve(require.resolve('typescript'), '..');
        };
        NodeJSFileSystem.prototype.normalize = function (path) {
            // Convert backslashes to forward slashes
            return path.replace(/\\/g, '/');
        };
        NodeJSFileSystem.prototype.safeMkdir = function (path) {
            try {
                fs.mkdirSync(path);
            }
            catch (err) {
                // Ignore the error, if the path already exists and points to a directory.
                // Re-throw otherwise.
                if (!this.exists(path) || !this.stat(path).isDirectory()) {
                    throw err;
                }
            }
        };
        return NodeJSFileSystem;
    }());
    exports.NodeJSFileSystem = NodeJSFileSystem;
    /**
     * Toggle the case of each character in a file path.
     */
    function togglePathCase(str) {
        return helpers_1.absoluteFrom(str.replace(/\w/g, function (ch) { return ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase(); }));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9qc19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL25vZGVfanNfZmlsZV9zeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOEJBQThCO0lBQzlCLHVCQUF5QjtJQUN6Qix3QkFBMEI7SUFDMUIsbUZBQXFEO0lBR3JEOztPQUVHO0lBQ0g7UUFBQTtZQUNVLG1CQUFjLEdBQXNCLFNBQVMsQ0FBQztRQW1FeEQsQ0FBQztRQWxFQyxpQ0FBTSxHQUFOLFVBQU8sSUFBb0IsSUFBYSxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLG1DQUFRLEdBQVIsVUFBUyxJQUFvQixJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLG9DQUFTLEdBQVQsVUFBVSxJQUFvQixFQUFFLElBQVk7WUFDMUMsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNELGtDQUFPLEdBQVAsVUFBUSxNQUFzQixFQUFFLElBQW9CLElBQVUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLGtDQUFPLEdBQVAsVUFBUSxJQUFvQixJQUFtQixPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFrQixDQUFDLENBQUMsQ0FBQztRQUM5RixnQ0FBSyxHQUFMLFVBQU0sSUFBb0IsSUFBZSxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLCtC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QUFPLENBQUMsS0FBSyxFQUFFLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQTdELENBQTZELENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcCBmcm9tICdwYXRoJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCByZWxhdGl2ZUZyb219IGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3RhdHMsIEZpbGVTeXN0ZW0sIFBhdGhTZWdtZW50LCBQYXRoU3RyaW5nfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIHRoZSBOb2RlLmpzIGZpbGUtc3lzdGVtIChpLmUgdGhlIGBmc2AgcGFja2FnZSkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlSlNGaWxlU3lzdGVtIGltcGxlbWVudHMgRmlsZVN5c3RlbSB7XG4gIHByaXZhdGUgX2Nhc2VTZW5zaXRpdmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBleGlzdHMocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHsgcmV0dXJuIGZzLmV4aXN0c1N5bmMocGF0aCk7IH1cbiAgcmVhZEZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmcgeyByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7IH1cbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmcpOiB2b2lkIHtcbiAgICByZXR1cm4gZnMud3JpdGVGaWxlU3luYyhwYXRoLCBkYXRhLCAndXRmOCcpO1xuICB9XG4gIHN5bWxpbmsodGFyZ2V0OiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHsgZnMuc3ltbGlua1N5bmModGFyZ2V0LCBwYXRoKTsgfVxuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXSB7IHJldHVybiBmcy5yZWFkZGlyU3luYyhwYXRoKSBhcyBQYXRoU2VnbWVudFtdOyB9XG4gIGxzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHsgcmV0dXJuIGZzLmxzdGF0U3luYyhwYXRoKTsgfVxuICBzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHsgcmV0dXJuIGZzLnN0YXRTeW5jKHBhdGgpOyB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiB0aGlzLm5vcm1hbGl6ZShwcm9jZXNzLmN3ZCgpKSBhcyBBYnNvbHV0ZUZzUGF0aDsgfVxuICBjaGRpcihkaXI6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IHByb2Nlc3MuY2hkaXIoZGlyKTsgfVxuICBjb3B5RmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IGZzLmNvcHlGaWxlU3luYyhmcm9tLCB0byk7IH1cbiAgbW92ZUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQgeyBmcy5yZW5hbWVTeW5jKGZyb20sIHRvKTsgfVxuICBlbnN1cmVEaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBjb25zdCBwYXJlbnRzOiBBYnNvbHV0ZUZzUGF0aFtdID0gW107XG4gICAgd2hpbGUgKCF0aGlzLmlzUm9vdChwYXRoKSAmJiAhdGhpcy5leGlzdHMocGF0aCkpIHtcbiAgICAgIHBhcmVudHMucHVzaChwYXRoKTtcbiAgICAgIHBhdGggPSB0aGlzLmRpcm5hbWUocGF0aCk7XG4gICAgfVxuICAgIHdoaWxlIChwYXJlbnRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5zYWZlTWtkaXIocGFyZW50cy5wb3AoKSAhKTtcbiAgICB9XG4gIH1cbiAgaXNDYXNlU2Vuc2l0aXZlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9jYXNlU2Vuc2l0aXZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2Nhc2VTZW5zaXRpdmUgPSB0aGlzLmV4aXN0cyh0b2dnbGVQYXRoQ2FzZShfX2ZpbGVuYW1lKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jYXNlU2Vuc2l0aXZlO1xuICB9XG4gIHJlc29sdmUoLi4ucGF0aHM6IHN0cmluZ1tdKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZShwLnJlc29sdmUoLi4ucGF0aHMpKSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgfVxuXG4gIGRpcm5hbWU8VCBleHRlbmRzIHN0cmluZz4oZmlsZTogVCk6IFQgeyByZXR1cm4gdGhpcy5ub3JtYWxpemUocC5kaXJuYW1lKGZpbGUpKSBhcyBUOyB9XG4gIGpvaW48VCBleHRlbmRzIHN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZShwLmpvaW4oYmFzZVBhdGgsIC4uLnBhdGhzKSkgYXMgVDtcbiAgfVxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGlybmFtZShwYXRoKSA9PT0gdGhpcy5ub3JtYWxpemUocGF0aCk7IH1cbiAgaXNSb290ZWQocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiBwLmlzQWJzb2x1dGUocGF0aCk7IH1cbiAgcmVsYXRpdmU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZyb206IFQsIHRvOiBUKTogUGF0aFNlZ21lbnQge1xuICAgIHJldHVybiByZWxhdGl2ZUZyb20odGhpcy5ub3JtYWxpemUocC5yZWxhdGl2ZShmcm9tLCB0bykpKTtcbiAgfVxuICBiYXNlbmFtZShmaWxlUGF0aDogc3RyaW5nLCBleHRlbnNpb24/OiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7XG4gICAgcmV0dXJuIHAuYmFzZW5hbWUoZmlsZVBhdGgsIGV4dGVuc2lvbikgYXMgUGF0aFNlZ21lbnQ7XG4gIH1cbiAgZXh0bmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudCk6IHN0cmluZyB7IHJldHVybiBwLmV4dG5hbWUocGF0aCk7IH1cbiAgcmVhbHBhdGgocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiB0aGlzLnJlc29sdmUoZnMucmVhbHBhdGhTeW5jKHBhdGgpKTsgfVxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUocmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksICcuLicpO1xuICB9XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgc3RyaW5nPihwYXRoOiBUKTogVCB7XG4gICAgLy8gQ29udmVydCBiYWNrc2xhc2hlcyB0byBmb3J3YXJkIHNsYXNoZXNcbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJykgYXMgVDtcbiAgfVxuXG4gIHByaXZhdGUgc2FmZU1rZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGZzLm1rZGlyU3luYyhwYXRoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIElnbm9yZSB0aGUgZXJyb3IsIGlmIHRoZSBwYXRoIGFscmVhZHkgZXhpc3RzIGFuZCBwb2ludHMgdG8gYSBkaXJlY3RvcnkuXG4gICAgICAvLyBSZS10aHJvdyBvdGhlcndpc2UuXG4gICAgICBpZiAoIXRoaXMuZXhpc3RzKHBhdGgpIHx8ICF0aGlzLnN0YXQocGF0aCkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVG9nZ2xlIHRoZSBjYXNlIG9mIGVhY2ggY2hhcmFjdGVyIGluIGEgZmlsZSBwYXRoLlxuICovXG5mdW5jdGlvbiB0b2dnbGVQYXRoQ2FzZShzdHI6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHtcbiAgcmV0dXJuIGFic29sdXRlRnJvbShcbiAgICAgIHN0ci5yZXBsYWNlKC9cXHcvZywgY2ggPT4gY2gudG9VcHBlckNhc2UoKSA9PT0gY2ggPyBjaC50b0xvd2VyQ2FzZSgpIDogY2gudG9VcHBlckNhc2UoKSkpO1xufVxuIl19