(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/node_js_file_system", ["require", "exports", "tslib", "fs", "fs-extra", "path", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers"], factory);
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
    var fsExtra = require("fs-extra");
    var p = require("path");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    /**
     * A wrapper around the Node.js file-system (i.e the `fs` package).
     */
    var NodeJSFileSystem = /** @class */ (function () {
        function NodeJSFileSystem() {
            this._caseSensitive = undefined;
        }
        NodeJSFileSystem.prototype.exists = function (path) {
            return fs.existsSync(path);
        };
        NodeJSFileSystem.prototype.readFile = function (path) {
            return fs.readFileSync(path, 'utf8');
        };
        NodeJSFileSystem.prototype.readFileBuffer = function (path) {
            return fs.readFileSync(path);
        };
        NodeJSFileSystem.prototype.writeFile = function (path, data, exclusive) {
            if (exclusive === void 0) { exclusive = false; }
            fs.writeFileSync(path, data, exclusive ? { flag: 'wx' } : undefined);
        };
        NodeJSFileSystem.prototype.removeFile = function (path) {
            fs.unlinkSync(path);
        };
        NodeJSFileSystem.prototype.symlink = function (target, path) {
            fs.symlinkSync(target, path);
        };
        NodeJSFileSystem.prototype.readdir = function (path) {
            return fs.readdirSync(path);
        };
        NodeJSFileSystem.prototype.lstat = function (path) {
            return fs.lstatSync(path);
        };
        NodeJSFileSystem.prototype.stat = function (path) {
            return fs.statSync(path);
        };
        NodeJSFileSystem.prototype.pwd = function () {
            return this.normalize(process.cwd());
        };
        NodeJSFileSystem.prototype.chdir = function (dir) {
            process.chdir(dir);
        };
        NodeJSFileSystem.prototype.copyFile = function (from, to) {
            fs.copyFileSync(from, to);
        };
        NodeJSFileSystem.prototype.moveFile = function (from, to) {
            fs.renameSync(from, to);
        };
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
        NodeJSFileSystem.prototype.removeDeep = function (path) {
            fsExtra.removeSync(path);
        };
        NodeJSFileSystem.prototype.isCaseSensitive = function () {
            if (this._caseSensitive === undefined) {
                // Note the use of the real file-system is intentional:
                // `this.exists()` relies upon `isCaseSensitive()` so that would cause an infinite recursion.
                this._caseSensitive = !fs.existsSync(togglePathCase(__filename));
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
        NodeJSFileSystem.prototype.dirname = function (file) {
            return this.normalize(p.dirname(file));
        };
        NodeJSFileSystem.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return this.normalize(p.join.apply(p, tslib_1.__spread([basePath], paths)));
        };
        NodeJSFileSystem.prototype.isRoot = function (path) {
            return this.dirname(path) === this.normalize(path);
        };
        NodeJSFileSystem.prototype.isRooted = function (path) {
            return p.isAbsolute(path);
        };
        NodeJSFileSystem.prototype.relative = function (from, to) {
            return helpers_1.relativeFrom(this.normalize(p.relative(from, to)));
        };
        NodeJSFileSystem.prototype.basename = function (filePath, extension) {
            return p.basename(filePath, extension);
        };
        NodeJSFileSystem.prototype.extname = function (path) {
            return p.extname(path);
        };
        NodeJSFileSystem.prototype.realpath = function (path) {
            return this.resolve(fs.realpathSync(path));
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9qc19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL25vZGVfanNfZmlsZV9zeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOEJBQThCO0lBQzlCLHVCQUF5QjtJQUN6QixrQ0FBb0M7SUFDcEMsd0JBQTBCO0lBQzFCLG1GQUFxRDtJQUdyRDs7T0FFRztJQUNIO1FBQUE7WUFDVSxtQkFBYyxHQUFzQixTQUFTLENBQUM7UUE0R3hELENBQUM7UUEzR0MsaUNBQU0sR0FBTixVQUFPLElBQW9CO1lBQ3pCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0QsbUNBQVEsR0FBUixVQUFTLElBQW9CO1lBQzNCLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELHlDQUFjLEdBQWQsVUFBZSxJQUFvQjtZQUNqQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELG9DQUFTLEdBQVQsVUFBVSxJQUFvQixFQUFFLElBQW1CLEVBQUUsU0FBMEI7WUFBMUIsMEJBQUEsRUFBQSxpQkFBMEI7WUFDN0UsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFDRCxxQ0FBVSxHQUFWLFVBQVcsSUFBb0I7WUFDN0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBQ0Qs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R0FBakIsVUFBa0IsSUFBb0I7WUFDcEMsSUFBSTtnQkFDRixFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BCO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osMEVBQTBFO2dCQUMxRSxzQkFBc0I7Z0JBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtvQkFDeEQsTUFBTSxHQUFHLENBQUM7aUJBQ1g7YUFDRjtRQUNILENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUE3R0QsSUE2R0M7SUE3R1ksNENBQWdCO0lBK0c3Qjs7T0FFRztJQUNILFNBQVMsY0FBYyxDQUFDLEdBQVc7UUFDakMsT0FBTyxzQkFBWSxDQUNmLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQTdELENBQTZELENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgZnNFeHRyYSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBwIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlRnJvbX0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTdGF0cywgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgdGhlIE5vZGUuanMgZmlsZS1zeXN0ZW0gKGkuZSB0aGUgYGZzYCBwYWNrYWdlKS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVKU0ZpbGVTeXN0ZW0gaW1wbGVtZW50cyBGaWxlU3lzdGVtIHtcbiAgcHJpdmF0ZSBfY2FzZVNlbnNpdGl2ZTogYm9vbGVhbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmcy5leGlzdHNTeW5jKHBhdGgpO1xuICB9XG4gIHJlYWRGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gIH1cbiAgcmVhZEZpbGVCdWZmZXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBCdWZmZXIge1xuICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMocGF0aCk7XG4gIH1cbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmd8QnVmZmVyLCBleGNsdXNpdmU6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xuICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aCwgZGF0YSwgZXhjbHVzaXZlID8ge2ZsYWc6ICd3eCd9IDogdW5kZWZpbmVkKTtcbiAgfVxuICByZW1vdmVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgZnMudW5saW5rU3luYyhwYXRoKTtcbiAgfVxuICBzeW1saW5rKHRhcmdldDogQWJzb2x1dGVGc1BhdGgsIHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgZnMuc3ltbGlua1N5bmModGFyZ2V0LCBwYXRoKTtcbiAgfVxuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXSB7XG4gICAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKHBhdGgpIGFzIFBhdGhTZWdtZW50W107XG4gIH1cbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIHJldHVybiBmcy5sc3RhdFN5bmMocGF0aCk7XG4gIH1cbiAgc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cyB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKHBhdGgpO1xuICB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMubm9ybWFsaXplKHByb2Nlc3MuY3dkKCkpIGFzIEFic29sdXRlRnNQYXRoO1xuICB9XG4gIGNoZGlyKGRpcjogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBwcm9jZXNzLmNoZGlyKGRpcik7XG4gIH1cbiAgY29weUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLmNvcHlGaWxlU3luYyhmcm9tLCB0byk7XG4gIH1cbiAgbW92ZUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLnJlbmFtZVN5bmMoZnJvbSwgdG8pO1xuICB9XG4gIGVuc3VyZURpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IHBhcmVudHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgICB3aGlsZSAoIXRoaXMuaXNSb290KHBhdGgpICYmICF0aGlzLmV4aXN0cyhwYXRoKSkge1xuICAgICAgcGFyZW50cy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHRoaXMuZGlybmFtZShwYXRoKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhcmVudHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnNhZmVNa2RpcihwYXJlbnRzLnBvcCgpISk7XG4gICAgfVxuICB9XG4gIHJlbW92ZURlZXAocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBmc0V4dHJhLnJlbW92ZVN5bmMocGF0aCk7XG4gIH1cbiAgaXNDYXNlU2Vuc2l0aXZlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9jYXNlU2Vuc2l0aXZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE5vdGUgdGhlIHVzZSBvZiB0aGUgcmVhbCBmaWxlLXN5c3RlbSBpcyBpbnRlbnRpb25hbDpcbiAgICAgIC8vIGB0aGlzLmV4aXN0cygpYCByZWxpZXMgdXBvbiBgaXNDYXNlU2Vuc2l0aXZlKClgIHNvIHRoYXQgd291bGQgY2F1c2UgYW4gaW5maW5pdGUgcmVjdXJzaW9uLlxuICAgICAgdGhpcy5fY2FzZVNlbnNpdGl2ZSA9ICFmcy5leGlzdHNTeW5jKHRvZ2dsZVBhdGhDYXNlKF9fZmlsZW5hbWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2Nhc2VTZW5zaXRpdmU7XG4gIH1cbiAgcmVzb2x2ZSguLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMubm9ybWFsaXplKHAucmVzb2x2ZSguLi5wYXRocykpIGFzIEFic29sdXRlRnNQYXRoO1xuICB9XG5cbiAgZGlybmFtZTxUIGV4dGVuZHMgc3RyaW5nPihmaWxlOiBUKTogVCB7XG4gICAgcmV0dXJuIHRoaXMubm9ybWFsaXplKHAuZGlybmFtZShmaWxlKSkgYXMgVDtcbiAgfVxuICBqb2luPFQgZXh0ZW5kcyBzdHJpbmc+KGJhc2VQYXRoOiBULCAuLi5wYXRoczogc3RyaW5nW10pOiBUIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUocC5qb2luKGJhc2VQYXRoLCAuLi5wYXRocykpIGFzIFQ7XG4gIH1cbiAgaXNSb290KHBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZGlybmFtZShwYXRoKSA9PT0gdGhpcy5ub3JtYWxpemUocGF0aCk7XG4gIH1cbiAgaXNSb290ZWQocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHAuaXNBYnNvbHV0ZShwYXRoKTtcbiAgfVxuICByZWxhdGl2ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZnJvbTogVCwgdG86IFQpOiBQYXRoU2VnbWVudCB7XG4gICAgcmV0dXJuIHJlbGF0aXZlRnJvbSh0aGlzLm5vcm1hbGl6ZShwLnJlbGF0aXZlKGZyb20sIHRvKSkpO1xuICB9XG4gIGJhc2VuYW1lKGZpbGVQYXRoOiBzdHJpbmcsIGV4dGVuc2lvbj86IHN0cmluZyk6IFBhdGhTZWdtZW50IHtcbiAgICByZXR1cm4gcC5iYXNlbmFtZShmaWxlUGF0aCwgZXh0ZW5zaW9uKSBhcyBQYXRoU2VnbWVudDtcbiAgfVxuICBleHRuYW1lKHBhdGg6IEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50KTogc3RyaW5nIHtcbiAgICByZXR1cm4gcC5leHRuYW1lKHBhdGgpO1xuICB9XG4gIHJlYWxwYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUoZnMucmVhbHBhdGhTeW5jKHBhdGgpKTtcbiAgfVxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUocmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksICcuLicpO1xuICB9XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgc3RyaW5nPihwYXRoOiBUKTogVCB7XG4gICAgLy8gQ29udmVydCBiYWNrc2xhc2hlcyB0byBmb3J3YXJkIHNsYXNoZXNcbiAgICByZXR1cm4gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJykgYXMgVDtcbiAgfVxuXG4gIHByaXZhdGUgc2FmZU1rZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGZzLm1rZGlyU3luYyhwYXRoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIC8vIElnbm9yZSB0aGUgZXJyb3IsIGlmIHRoZSBwYXRoIGFscmVhZHkgZXhpc3RzIGFuZCBwb2ludHMgdG8gYSBkaXJlY3RvcnkuXG4gICAgICAvLyBSZS10aHJvdyBvdGhlcndpc2UuXG4gICAgICBpZiAoIXRoaXMuZXhpc3RzKHBhdGgpIHx8ICF0aGlzLnN0YXQocGF0aCkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVG9nZ2xlIHRoZSBjYXNlIG9mIGVhY2ggY2hhcmFjdGVyIGluIGEgZmlsZSBwYXRoLlxuICovXG5mdW5jdGlvbiB0b2dnbGVQYXRoQ2FzZShzdHI6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHtcbiAgcmV0dXJuIGFic29sdXRlRnJvbShcbiAgICAgIHN0ci5yZXBsYWNlKC9cXHcvZywgY2ggPT4gY2gudG9VcHBlckNhc2UoKSA9PT0gY2ggPyBjaC50b0xvd2VyQ2FzZSgpIDogY2gudG9VcHBlckNhc2UoKSkpO1xufVxuIl19