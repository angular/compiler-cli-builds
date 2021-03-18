(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/node_js_file_system", ["require", "exports", "tslib", "fs", "fs-extra", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NodeJSFileSystem = exports.NodeJSReadonlyFileSystem = exports.NodeJSPathManipulation = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    /// <reference types="node" />
    var fs = require("fs");
    var fsExtra = require("fs-extra");
    var p = require("path");
    /**
     * A wrapper around the Node.js file-system that supports path manipulation.
     */
    var NodeJSPathManipulation = /** @class */ (function () {
        function NodeJSPathManipulation() {
        }
        NodeJSPathManipulation.prototype.pwd = function () {
            return this.normalize(process.cwd());
        };
        NodeJSPathManipulation.prototype.chdir = function (dir) {
            process.chdir(dir);
        };
        NodeJSPathManipulation.prototype.resolve = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return this.normalize(p.resolve.apply(p, tslib_1.__spreadArray([], tslib_1.__read(paths))));
        };
        NodeJSPathManipulation.prototype.dirname = function (file) {
            return this.normalize(p.dirname(file));
        };
        NodeJSPathManipulation.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return this.normalize(p.join.apply(p, tslib_1.__spreadArray([basePath], tslib_1.__read(paths))));
        };
        NodeJSPathManipulation.prototype.isRoot = function (path) {
            return this.dirname(path) === this.normalize(path);
        };
        NodeJSPathManipulation.prototype.isRooted = function (path) {
            return p.isAbsolute(path);
        };
        NodeJSPathManipulation.prototype.relative = function (from, to) {
            return this.normalize(p.relative(from, to));
        };
        NodeJSPathManipulation.prototype.basename = function (filePath, extension) {
            return p.basename(filePath, extension);
        };
        NodeJSPathManipulation.prototype.extname = function (path) {
            return p.extname(path);
        };
        NodeJSPathManipulation.prototype.normalize = function (path) {
            // Convert backslashes to forward slashes
            return path.replace(/\\/g, '/');
        };
        return NodeJSPathManipulation;
    }());
    exports.NodeJSPathManipulation = NodeJSPathManipulation;
    /**
     * A wrapper around the Node.js file-system that supports readonly operations and path manipulation.
     */
    var NodeJSReadonlyFileSystem = /** @class */ (function (_super) {
        tslib_1.__extends(NodeJSReadonlyFileSystem, _super);
        function NodeJSReadonlyFileSystem() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._caseSensitive = undefined;
            return _this;
        }
        NodeJSReadonlyFileSystem.prototype.isCaseSensitive = function () {
            if (this._caseSensitive === undefined) {
                // Note the use of the real file-system is intentional:
                // `this.exists()` relies upon `isCaseSensitive()` so that would cause an infinite recursion.
                this._caseSensitive = !fs.existsSync(this.normalize(toggleCase(__filename)));
            }
            return this._caseSensitive;
        };
        NodeJSReadonlyFileSystem.prototype.exists = function (path) {
            return fs.existsSync(path);
        };
        NodeJSReadonlyFileSystem.prototype.readFile = function (path) {
            return fs.readFileSync(path, 'utf8');
        };
        NodeJSReadonlyFileSystem.prototype.readFileBuffer = function (path) {
            return fs.readFileSync(path);
        };
        NodeJSReadonlyFileSystem.prototype.readdir = function (path) {
            return fs.readdirSync(path);
        };
        NodeJSReadonlyFileSystem.prototype.lstat = function (path) {
            return fs.lstatSync(path);
        };
        NodeJSReadonlyFileSystem.prototype.stat = function (path) {
            return fs.statSync(path);
        };
        NodeJSReadonlyFileSystem.prototype.realpath = function (path) {
            return this.resolve(fs.realpathSync(path));
        };
        NodeJSReadonlyFileSystem.prototype.getDefaultLibLocation = function () {
            return this.resolve(require.resolve('typescript'), '..');
        };
        return NodeJSReadonlyFileSystem;
    }(NodeJSPathManipulation));
    exports.NodeJSReadonlyFileSystem = NodeJSReadonlyFileSystem;
    /**
     * A wrapper around the Node.js file-system (i.e. the `fs` package).
     */
    var NodeJSFileSystem = /** @class */ (function (_super) {
        tslib_1.__extends(NodeJSFileSystem, _super);
        function NodeJSFileSystem() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
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
    }(NodeJSReadonlyFileSystem));
    exports.NodeJSFileSystem = NodeJSFileSystem;
    /**
     * Toggle the case of each character in a string.
     */
    function toggleCase(str) {
        return str.replace(/\w/g, function (ch) { return ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase(); });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9qc19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL25vZGVfanNfZmlsZV9zeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhCQUE4QjtJQUM5Qix1QkFBeUI7SUFDekIsa0NBQW9DO0lBQ3BDLHdCQUEwQjtJQUcxQjs7T0FFRztJQUNIO1FBQUE7UUFvQ0EsQ0FBQztRQW5DQyxvQ0FBRyxHQUFIO1lBQ0UsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBbUIsQ0FBQztRQUN6RCxDQUFDO1FBQ0Qsc0NBQUssR0FBTCxVQUFNLEdBQW1CO1lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUNELHdDQUFPLEdBQVA7WUFBUSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiwwQkFBa0I7O1lBQ3hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxPQUFULENBQUMsMkNBQVksS0FBSyxJQUFvQixDQUFDO1FBQy9ELENBQUM7UUFFRCx3Q0FBTyxHQUFQLFVBQTBCLElBQU87WUFDL0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQU0sQ0FBQztRQUM5QyxDQUFDO1FBQ0QscUNBQUksR0FBSixVQUF1QixRQUFXO1lBQUUsZUFBa0I7aUJBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtnQkFBbEIsOEJBQWtCOztZQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTixDQUFD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QUFDLElBQUksQ0FBQyxDQUFDO2FBQzNCO1lBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUcsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQztRQUNELHFDQUFVLEdBQVYsVUFBVyxJQUFvQjtZQUM3QixPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFTyxvQ0FBUyxHQUFqQixVQUFrQixJQUFvQjtZQUNwQyxJQUFJO2dCQUNGLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEI7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWiwwRUFBMEU7Z0JBQzFFLHNCQUFzQjtnQkFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUN4RCxNQUFNLEdBQUcsQ0FBQztpQkFDWDthQUNGO1FBQ0gsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXpDRCxDQUFzQyx3QkFBd0IsR0F5QzdEO0lBekNZLDRDQUFnQjtJQTJDN0I7O09BRUc7SUFDSCxTQUFTLFVBQVUsQ0FBQyxHQUFXO1FBQzdCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsVUFBQSxFQUFFLElBQUksT0FBQSxFQUFFLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBN0QsQ0FBNkQsQ0FBQyxDQUFDO0lBQ2pHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBmc0V4dHJhIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHAgZnJvbSAncGF0aCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3RhdHMsIEZpbGVTeXN0ZW0sIFBhdGhNYW5pcHVsYXRpb24sIFBhdGhTZWdtZW50LCBQYXRoU3RyaW5nLCBSZWFkb25seUZpbGVTeXN0ZW19IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgdGhlIE5vZGUuanMgZmlsZS1zeXN0ZW0gdGhhdCBzdXBwb3J0cyBwYXRoIG1hbmlwdWxhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVKU1BhdGhNYW5pcHVsYXRpb24gaW1wbGVtZW50cyBQYXRoTWFuaXB1bGF0aW9uIHtcbiAgcHdkKCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUocHJvY2Vzcy5jd2QoKSkgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH1cbiAgY2hkaXIoZGlyOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHByb2Nlc3MuY2hkaXIoZGlyKTtcbiAgfVxuICByZXNvbHZlKC4uLnBhdGhzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUocC5yZXNvbHZlKC4uLnBhdGhzKSkgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH1cblxuICBkaXJuYW1lPFQgZXh0ZW5kcyBzdHJpbmc+KGZpbGU6IFQpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUocC5kaXJuYW1lKGZpbGUpKSBhcyBUO1xuICB9XG4gIGpvaW48VCBleHRlbmRzIHN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQge1xuICAgIHJldHVybiB0aGlzLm5vcm1hbGl6ZShwLmpvaW4oYmFzZVBhdGgsIC4uLnBhdGhzKSkgYXMgVDtcbiAgfVxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kaXJuYW1lKHBhdGgpID09PSB0aGlzLm5vcm1hbGl6ZShwYXRoKTtcbiAgfVxuICBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcC5pc0Fic29sdXRlKHBhdGgpO1xuICB9XG4gIHJlbGF0aXZlPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmcm9tOiBULCB0bzogVCk6IFBhdGhTZWdtZW50fEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5ub3JtYWxpemUocC5yZWxhdGl2ZShmcm9tLCB0bykpIGFzIFBhdGhTZWdtZW50IHwgQWJzb2x1dGVGc1BhdGg7XG4gIH1cbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQge1xuICAgIHJldHVybiBwLmJhc2VuYW1lKGZpbGVQYXRoLCBleHRlbnNpb24pIGFzIFBhdGhTZWdtZW50O1xuICB9XG4gIGV4dG5hbWUocGF0aDogQWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQpOiBzdHJpbmcge1xuICAgIHJldHVybiBwLmV4dG5hbWUocGF0aCk7XG4gIH1cbiAgbm9ybWFsaXplPFQgZXh0ZW5kcyBzdHJpbmc+KHBhdGg6IFQpOiBUIHtcbiAgICAvLyBDb252ZXJ0IGJhY2tzbGFzaGVzIHRvIGZvcndhcmQgc2xhc2hlc1xuICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKSBhcyBUO1xuICB9XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCB0aGUgTm9kZS5qcyBmaWxlLXN5c3RlbSB0aGF0IHN1cHBvcnRzIHJlYWRvbmx5IG9wZXJhdGlvbnMgYW5kIHBhdGggbWFuaXB1bGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZUpTUmVhZG9ubHlGaWxlU3lzdGVtIGV4dGVuZHMgTm9kZUpTUGF0aE1hbmlwdWxhdGlvbiBpbXBsZW1lbnRzIFJlYWRvbmx5RmlsZVN5c3RlbSB7XG4gIHByaXZhdGUgX2Nhc2VTZW5zaXRpdmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBpc0Nhc2VTZW5zaXRpdmUoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2Nhc2VTZW5zaXRpdmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gTm90ZSB0aGUgdXNlIG9mIHRoZSByZWFsIGZpbGUtc3lzdGVtIGlzIGludGVudGlvbmFsOlxuICAgICAgLy8gYHRoaXMuZXhpc3RzKClgIHJlbGllcyB1cG9uIGBpc0Nhc2VTZW5zaXRpdmUoKWAgc28gdGhhdCB3b3VsZCBjYXVzZSBhbiBpbmZpbml0ZSByZWN1cnNpb24uXG4gICAgICB0aGlzLl9jYXNlU2Vuc2l0aXZlID0gIWZzLmV4aXN0c1N5bmModGhpcy5ub3JtYWxpemUodG9nZ2xlQ2FzZShfX2ZpbGVuYW1lKSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2FzZVNlbnNpdGl2ZTtcbiAgfVxuICBleGlzdHMocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZnMuZXhpc3RzU3luYyhwYXRoKTtcbiAgfVxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpO1xuICB9XG4gIHJlYWRGaWxlQnVmZmVyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoKTtcbiAgfVxuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXSB7XG4gICAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKHBhdGgpIGFzIFBhdGhTZWdtZW50W107XG4gIH1cbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIHJldHVybiBmcy5sc3RhdFN5bmMocGF0aCk7XG4gIH1cbiAgc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cyB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKHBhdGgpO1xuICB9XG4gIHJlYWxwYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUoZnMucmVhbHBhdGhTeW5jKHBhdGgpKTtcbiAgfVxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUocmVxdWlyZS5yZXNvbHZlKCd0eXBlc2NyaXB0JyksICcuLicpO1xuICB9XG59XG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCB0aGUgTm9kZS5qcyBmaWxlLXN5c3RlbSAoaS5lLiB0aGUgYGZzYCBwYWNrYWdlKS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vZGVKU0ZpbGVTeXN0ZW0gZXh0ZW5kcyBOb2RlSlNSZWFkb25seUZpbGVTeXN0ZW0gaW1wbGVtZW50cyBGaWxlU3lzdGVtIHtcbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmd8VWludDhBcnJheSwgZXhjbHVzaXZlOiBib29sZWFuID0gZmFsc2UpOiB2b2lkIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGRhdGEsIGV4Y2x1c2l2ZSA/IHtmbGFnOiAnd3gnfSA6IHVuZGVmaW5lZCk7XG4gIH1cbiAgcmVtb3ZlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLnVubGlua1N5bmMocGF0aCk7XG4gIH1cbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLnN5bWxpbmtTeW5jKHRhcmdldCwgcGF0aCk7XG4gIH1cbiAgY29weUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLmNvcHlGaWxlU3luYyhmcm9tLCB0byk7XG4gIH1cbiAgbW92ZUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGZzLnJlbmFtZVN5bmMoZnJvbSwgdG8pO1xuICB9XG4gIGVuc3VyZURpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IHBhcmVudHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgICB3aGlsZSAoIXRoaXMuaXNSb290KHBhdGgpICYmICF0aGlzLmV4aXN0cyhwYXRoKSkge1xuICAgICAgcGFyZW50cy5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IHRoaXMuZGlybmFtZShwYXRoKTtcbiAgICB9XG4gICAgd2hpbGUgKHBhcmVudHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnNhZmVNa2RpcihwYXJlbnRzLnBvcCgpISk7XG4gICAgfVxuICB9XG4gIHJlbW92ZURlZXAocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBmc0V4dHJhLnJlbW92ZVN5bmMocGF0aCk7XG4gIH1cblxuICBwcml2YXRlIHNhZmVNa2RpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBmcy5ta2RpclN5bmMocGF0aCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBJZ25vcmUgdGhlIGVycm9yLCBpZiB0aGUgcGF0aCBhbHJlYWR5IGV4aXN0cyBhbmQgcG9pbnRzIHRvIGEgZGlyZWN0b3J5LlxuICAgICAgLy8gUmUtdGhyb3cgb3RoZXJ3aXNlLlxuICAgICAgaWYgKCF0aGlzLmV4aXN0cyhwYXRoKSB8fCAhdGhpcy5zdGF0KHBhdGgpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRvZ2dsZSB0aGUgY2FzZSBvZiBlYWNoIGNoYXJhY3RlciBpbiBhIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gdG9nZ2xlQ2FzZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXFx3L2csIGNoID0+IGNoLnRvVXBwZXJDYXNlKCkgPT09IGNoID8gY2gudG9Mb3dlckNhc2UoKSA6IGNoLnRvVXBwZXJDYXNlKCkpO1xufVxuIl19