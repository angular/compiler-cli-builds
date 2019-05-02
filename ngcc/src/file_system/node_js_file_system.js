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
        define("@angular/compiler-cli/ngcc/src/file_system/node_js_file_system", ["require", "exports", "fs", "shelljs", "@angular/compiler-cli/src/ngtsc/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs = require("fs");
    var shelljs_1 = require("shelljs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    /**
     * A wrapper around the Node.js file-system (i.e the `fs` package).
     */
    var NodeJSFileSystem = /** @class */ (function () {
        function NodeJSFileSystem() {
        }
        NodeJSFileSystem.prototype.exists = function (path) { return fs.existsSync(path); };
        NodeJSFileSystem.prototype.readFile = function (path) { return fs.readFileSync(path, 'utf8'); };
        NodeJSFileSystem.prototype.writeFile = function (path, data) {
            return fs.writeFileSync(path, data, 'utf8');
        };
        NodeJSFileSystem.prototype.readdir = function (path) { return fs.readdirSync(path); };
        NodeJSFileSystem.prototype.lstat = function (path) { return fs.lstatSync(path); };
        NodeJSFileSystem.prototype.stat = function (path) { return fs.statSync(path); };
        NodeJSFileSystem.prototype.pwd = function () { return path_1.AbsoluteFsPath.fromUnchecked(process.cwd()); };
        NodeJSFileSystem.prototype.copyFile = function (from, to) { shelljs_1.cp(from, to); };
        NodeJSFileSystem.prototype.moveFile = function (from, to) { shelljs_1.mv(from, to); };
        NodeJSFileSystem.prototype.ensureDir = function (path) { shelljs_1.mkdir('-p', path); };
        return NodeJSFileSystem;
    }());
    exports.NodeJSFileSystem = NodeJSFileSystem;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZV9qc19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9maWxlX3N5c3RlbS9ub2RlX2pzX2ZpbGVfc3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsdUJBQXlCO0lBQ3pCLG1DQUFzQztJQUN0Qyw2REFBb0U7SUFHcEU7O09BRUc7SUFDSDtRQUFBO1FBYUEsQ0FBQztRQVpDLGlDQUFNLEdBQU4sVUFBTyxJQUFvQixJQUFhLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckUsbUNBQVEsR0FBUixVQUFTLElBQW9CLElBQVksT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEYsb0NBQVMsR0FBVCxVQUFVLElBQW9CLEVBQUUsSUFBWTtZQUMxQyxPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0Qsa0NBQU8sR0FBUCxVQUFRLElBQW9CLElBQW1CLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzlGLGdDQUFLLEdBQUwsVUFBTSxJQUFvQixJQUFjLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsK0JBQUksR0FBSixVQUFLLElBQW9CLElBQWMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSw4QkFBRyxHQUFILGNBQVEsT0FBTyxxQkFBYyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsbUNBQVEsR0FBUixVQUFTLElBQW9CLEVBQUUsRUFBa0IsSUFBVSxZQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxtQ0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxFQUFrQixJQUFVLFlBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLG9DQUFTLEdBQVQsVUFBVSxJQUFvQixJQUFVLGVBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELHVCQUFDO0lBQUQsQ0FBQyxBQWJELElBYUM7SUFiWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Y3AsIG1rZGlyLCBtdn0gZnJvbSAnc2hlbGxqcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtJztcblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIHRoZSBOb2RlLmpzIGZpbGUtc3lzdGVtIChpLmUgdGhlIGBmc2AgcGFja2FnZSkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlSlNGaWxlU3lzdGVtIGltcGxlbWVudHMgRmlsZVN5c3RlbSB7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4geyByZXR1cm4gZnMuZXhpc3RzU3luYyhwYXRoKTsgfVxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKTsgfVxuICB3cml0ZUZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IHN0cmluZyk6IHZvaWQge1xuICAgIHJldHVybiBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGRhdGEsICd1dGY4Jyk7XG4gIH1cbiAgcmVhZGRpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFBhdGhTZWdtZW50W10geyByZXR1cm4gZnMucmVhZGRpclN5bmMocGF0aCkgYXMgUGF0aFNlZ21lbnRbXTsgfVxuICBsc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGZzLlN0YXRzIHsgcmV0dXJuIGZzLmxzdGF0U3luYyhwYXRoKTsgfVxuICBzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogZnMuU3RhdHMgeyByZXR1cm4gZnMuc3RhdFN5bmMocGF0aCk7IH1cbiAgcHdkKCkgeyByZXR1cm4gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChwcm9jZXNzLmN3ZCgpKTsgfVxuICBjb3B5RmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IGNwKGZyb20sIHRvKTsgfVxuICBtb3ZlRmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IG12KGZyb20sIHRvKTsgfVxuICBlbnN1cmVEaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHsgbWtkaXIoJy1wJywgcGF0aCk7IH1cbn1cbiJdfQ==