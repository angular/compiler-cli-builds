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
        define("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isFolder = exports.isSymLink = exports.isFile = exports.SymLink = exports.MockFileSystem = void 0;
    var tslib_1 = require("tslib");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    /**
     * An in-memory file system that can be used in unit tests.
     */
    var MockFileSystem = /** @class */ (function () {
        function MockFileSystem(_isCaseSensitive, cwd) {
            if (_isCaseSensitive === void 0) { _isCaseSensitive = false; }
            if (cwd === void 0) { cwd = '/'; }
            this._isCaseSensitive = _isCaseSensitive;
            this._fileTree = {};
            this._cwd = this.normalize(cwd);
        }
        MockFileSystem.prototype.isCaseSensitive = function () {
            return this._isCaseSensitive;
        };
        MockFileSystem.prototype.exists = function (path) {
            return this.findFromPath(path).entity !== null;
        };
        MockFileSystem.prototype.readFile = function (path) {
            var entity = this.findFromPath(path).entity;
            if (isFile(entity)) {
                return entity.toString();
            }
            else {
                throw new MockFileSystemError('ENOENT', path, "File \"" + path + "\" does not exist.");
            }
        };
        MockFileSystem.prototype.readFileBuffer = function (path) {
            var entity = this.findFromPath(path).entity;
            if (isFile(entity)) {
                return Buffer.isBuffer(entity) ? entity : new Buffer(entity);
            }
            else {
                throw new MockFileSystemError('ENOENT', path, "File \"" + path + "\" does not exist.");
            }
        };
        MockFileSystem.prototype.writeFile = function (path, data, exclusive) {
            if (exclusive === void 0) { exclusive = false; }
            var _a = tslib_1.__read(this.splitIntoFolderAndFile(path), 2), folderPath = _a[0], basename = _a[1];
            var entity = this.findFromPath(folderPath).entity;
            if (entity === null || !isFolder(entity)) {
                throw new MockFileSystemError('ENOENT', path, "Unable to write file \"" + path + "\". The containing folder does not exist.");
            }
            if (exclusive && entity[basename] !== undefined) {
                throw new MockFileSystemError('EEXIST', path, "Unable to exclusively write file \"" + path + "\". The file already exists.");
            }
            entity[basename] = data;
        };
        MockFileSystem.prototype.removeFile = function (path) {
            var _a = tslib_1.__read(this.splitIntoFolderAndFile(path), 2), folderPath = _a[0], basename = _a[1];
            var entity = this.findFromPath(folderPath).entity;
            if (entity === null || !isFolder(entity)) {
                throw new MockFileSystemError('ENOENT', path, "Unable to remove file \"" + path + "\". The containing folder does not exist.");
            }
            if (isFolder(entity[basename])) {
                throw new MockFileSystemError('EISDIR', path, "Unable to remove file \"" + path + "\". The path to remove is a folder.");
            }
            delete entity[basename];
        };
        MockFileSystem.prototype.symlink = function (target, path) {
            var _a = tslib_1.__read(this.splitIntoFolderAndFile(path), 2), folderPath = _a[0], basename = _a[1];
            var entity = this.findFromPath(folderPath).entity;
            if (entity === null || !isFolder(entity)) {
                throw new MockFileSystemError('ENOENT', path, "Unable to create symlink at \"" + path + "\". The containing folder does not exist.");
            }
            entity[basename] = new SymLink(target);
        };
        MockFileSystem.prototype.readdir = function (path) {
            var entity = this.findFromPath(path).entity;
            if (entity === null) {
                throw new MockFileSystemError('ENOENT', path, "Unable to read directory \"" + path + "\". It does not exist.");
            }
            if (isFile(entity)) {
                throw new MockFileSystemError('ENOTDIR', path, "Unable to read directory \"" + path + "\". It is a file.");
            }
            return Object.keys(entity);
        };
        MockFileSystem.prototype.lstat = function (path) {
            var entity = this.findFromPath(path).entity;
            if (entity === null) {
                throw new MockFileSystemError('ENOENT', path, "File \"" + path + "\" does not exist.");
            }
            return new MockFileStats(entity);
        };
        MockFileSystem.prototype.stat = function (path) {
            var entity = this.findFromPath(path, { followSymLinks: true }).entity;
            if (entity === null) {
                throw new MockFileSystemError('ENOENT', path, "File \"" + path + "\" does not exist.");
            }
            return new MockFileStats(entity);
        };
        MockFileSystem.prototype.copyFile = function (from, to) {
            this.writeFile(to, this.readFile(from));
        };
        MockFileSystem.prototype.moveFile = function (from, to) {
            this.writeFile(to, this.readFile(from));
            var result = this.findFromPath(helpers_1.dirname(from));
            var folder = result.entity;
            var name = helpers_1.basename(from);
            delete folder[name];
        };
        MockFileSystem.prototype.ensureDir = function (path) {
            var e_1, _a;
            var _this = this;
            var segments = this.splitPath(path).map(function (segment) { return _this.getCanonicalPath(segment); });
            var current = this._fileTree;
            // Convert the root folder to a canonical empty string `''` (on Windows it would be `'C:'`).
            segments[0] = '';
            try {
                for (var segments_1 = tslib_1.__values(segments), segments_1_1 = segments_1.next(); !segments_1_1.done; segments_1_1 = segments_1.next()) {
                    var segment = segments_1_1.value;
                    if (isFile(current[segment])) {
                        throw new Error("Folder already exists as a file.");
                    }
                    if (!current[segment]) {
                        current[segment] = {};
                    }
                    current = current[segment];
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (segments_1_1 && !segments_1_1.done && (_a = segments_1.return)) _a.call(segments_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        MockFileSystem.prototype.removeDeep = function (path) {
            var _a = tslib_1.__read(this.splitIntoFolderAndFile(path), 2), folderPath = _a[0], basename = _a[1];
            var entity = this.findFromPath(folderPath).entity;
            if (entity === null || !isFolder(entity)) {
                throw new MockFileSystemError('ENOENT', path, "Unable to remove folder \"" + path + "\". The containing folder does not exist.");
            }
            delete entity[basename];
        };
        MockFileSystem.prototype.isRoot = function (path) {
            return this.dirname(path) === path;
        };
        MockFileSystem.prototype.extname = function (path) {
            var match = /.+(\.[^.]*)$/.exec(path);
            return match !== null ? match[1] : '';
        };
        MockFileSystem.prototype.realpath = function (filePath) {
            var result = this.findFromPath(filePath, { followSymLinks: true });
            if (result.entity === null) {
                throw new MockFileSystemError('ENOENT', filePath, "Unable to find the real path of \"" + filePath + "\". It does not exist.");
            }
            else {
                return result.path;
            }
        };
        MockFileSystem.prototype.pwd = function () {
            return this._cwd;
        };
        MockFileSystem.prototype.chdir = function (path) {
            this._cwd = this.normalize(path);
        };
        MockFileSystem.prototype.getDefaultLibLocation = function () {
            // Mimic the node module resolution algorithm and start in the current directory, then look
            // progressively further up the tree until reaching the FS root.
            // E.g. if the current directory is /foo/bar, look in /foo/bar/node_modules, then
            // /foo/node_modules, then /node_modules.
            var path = 'node_modules/typescript/lib';
            var resolvedPath = this.resolve(path);
            // Construct a path for the top-level node_modules to identify the stopping point.
            var topLevelNodeModules = this.resolve('/' + path);
            while (resolvedPath !== topLevelNodeModules) {
                if (this.exists(resolvedPath)) {
                    return resolvedPath;
                }
                // Not here, look one level higher.
                path = '../' + path;
                resolvedPath = this.resolve(path);
            }
            // The loop exits before checking the existence of /node_modules/typescript at the top level.
            // This is intentional - if no /node_modules/typescript exists anywhere in the tree, there's
            // nothing this function can do about it, and TS may error later if it looks for a lib.d.ts file
            // within this directory. It might be okay, though, if TS never checks for one.
            return topLevelNodeModules;
        };
        MockFileSystem.prototype.dump = function () {
            return this.cloneFolder(this._fileTree);
        };
        MockFileSystem.prototype.init = function (folder) {
            this._fileTree = this.cloneFolder(folder);
        };
        MockFileSystem.prototype.cloneFolder = function (folder) {
            var clone = {};
            for (var path in folder) {
                var item = folder[path];
                var canonicalPath = this.getCanonicalPath(path);
                if (isSymLink(item)) {
                    clone[canonicalPath] = new SymLink(this.getCanonicalPath(item.path));
                }
                else if (isFolder(item)) {
                    clone[canonicalPath] = this.cloneFolder(item);
                }
                else {
                    clone[canonicalPath] = folder[path];
                }
            }
            return clone;
        };
        MockFileSystem.prototype.findFromPath = function (path, options) {
            var followSymLinks = !!options && options.followSymLinks;
            var segments = this.splitPath(path);
            if (segments.length > 1 && segments[segments.length - 1] === '') {
                // Remove a trailing slash (unless the path was only `/`)
                segments.pop();
            }
            // Convert the root folder to a canonical empty string `""` (on Windows it would be `C:`).
            segments[0] = '';
            var current = this._fileTree;
            while (segments.length) {
                current = current[this.getCanonicalPath(segments.shift())];
                if (current === undefined) {
                    return { path: path, entity: null };
                }
                if (segments.length > 0 && (!isFolder(current))) {
                    current = null;
                    break;
                }
                if (isFile(current)) {
                    break;
                }
                if (isSymLink(current)) {
                    if (followSymLinks) {
                        return this.findFromPath(helpers_1.resolve.apply(void 0, tslib_1.__spread([current.path], segments)), { followSymLinks: followSymLinks });
                    }
                    else {
                        break;
                    }
                }
            }
            return { path: path, entity: current };
        };
        MockFileSystem.prototype.splitIntoFolderAndFile = function (path) {
            var segments = this.splitPath(this.getCanonicalPath(path));
            var file = segments.pop();
            return [path.substring(0, path.length - file.length - 1), file];
        };
        MockFileSystem.prototype.getCanonicalPath = function (p) {
            return this.isCaseSensitive() ? p : p.toLowerCase();
        };
        return MockFileSystem;
    }());
    exports.MockFileSystem = MockFileSystem;
    var SymLink = /** @class */ (function () {
        function SymLink(path) {
            this.path = path;
        }
        return SymLink;
    }());
    exports.SymLink = SymLink;
    var MockFileStats = /** @class */ (function () {
        function MockFileStats(entity) {
            this.entity = entity;
        }
        MockFileStats.prototype.isFile = function () {
            return isFile(this.entity);
        };
        MockFileStats.prototype.isDirectory = function () {
            return isFolder(this.entity);
        };
        MockFileStats.prototype.isSymbolicLink = function () {
            return isSymLink(this.entity);
        };
        return MockFileStats;
    }());
    var MockFileSystemError = /** @class */ (function (_super) {
        tslib_1.__extends(MockFileSystemError, _super);
        function MockFileSystemError(code, path, message) {
            var _this = _super.call(this, message) || this;
            _this.code = code;
            _this.path = path;
            return _this;
        }
        return MockFileSystemError;
    }(Error));
    function isFile(item) {
        return Buffer.isBuffer(item) || typeof item === 'string';
    }
    exports.isFile = isFile;
    function isSymLink(item) {
        return item instanceof SymLink;
    }
    exports.isSymLink = isSymLink;
    function isFolder(item) {
        return item !== null && !isFile(item) && !isSymLink(item);
    }
    exports.isFolder = isFolder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vdGVzdGluZy9zcmMvbW9ja19maWxlX3N5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsbUZBQTZEO0lBRzdEOztPQUVHO0lBQ0g7UUFLRSx3QkFBb0IsZ0JBQXdCLEVBQUUsR0FBMkM7WUFBckUsaUNBQUEsRUFBQSx3QkFBd0I7WUFBRSxvQkFBQSxFQUFBLE1BQXNCLEdBQXFCO1lBQXJFLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtZQUpwQyxjQUFTLEdBQVcsRUFBRSxDQUFDO1lBSzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsd0NBQWUsR0FBZjtZQUNFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQy9CLENBQUM7UUFFRCwrQkFBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUM7UUFDakQsQ0FBQztRQUVELGlDQUFRLEdBQVIsVUFBUyxJQUFvQjtZQUNwQixJQUFBLE1BQU0sR0FBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUEzQixDQUE0QjtZQUN6QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEIsT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDMUI7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBUyxJQUFJLHVCQUFtQixDQUFDLENBQUM7YUFDakY7UUFDSCxDQUFDO1FB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QUFELENBQUMsQUFYRCxJQVdDO0lBRUQ7UUFBa0MsK0NBQUs7UUFDckMsNkJBQW1CLElBQVksRUFBUyxJQUFZLEVBQUUsT0FBZTtZQUFyRSxZQUNFLGtCQUFNLE9BQU8sQ0FBQyxTQUNmO1lBRmtCLFVBQUksR0FBSixJQUFJLENBQVE7WUFBUyxVQUFJLEdBQUosSUFBSSxDQUFROztRQUVwRCxDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBa0MsS0FBSyxHQUl0QztJQUVELFNBQWdCLE1BQU0sQ0FBQyxJQUFpQjtRQUN0QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDO0lBQzNELENBQUM7SUFGRCx3QkFFQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxJQUFpQjtRQUN6QyxPQUFPLElBQUksWUFBWSxPQUFPLENBQUM7SUFDakMsQ0FBQztJQUZELDhCQUVDO0lBRUQsU0FBZ0IsUUFBUSxDQUFDLElBQWlCO1FBQ3hDLE9BQU8sSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRkQsNEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtiYXNlbmFtZSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL2hlbHBlcnMnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN0YXRzLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgUGF0aFN0cmluZ30gZnJvbSAnLi4vLi4vc3JjL3R5cGVzJztcblxuLyoqXG4gKiBBbiBpbi1tZW1vcnkgZmlsZSBzeXN0ZW0gdGhhdCBjYW4gYmUgdXNlZCBpbiB1bml0IHRlc3RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9ja0ZpbGVTeXN0ZW0gaW1wbGVtZW50cyBGaWxlU3lzdGVtIHtcbiAgcHJpdmF0ZSBfZmlsZVRyZWU6IEZvbGRlciA9IHt9O1xuICBwcml2YXRlIF9jd2Q6IEFic29sdXRlRnNQYXRoO1xuXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfaXNDYXNlU2Vuc2l0aXZlID0gZmFsc2UsIGN3ZDogQWJzb2x1dGVGc1BhdGggPSAnLycgYXMgQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLl9jd2QgPSB0aGlzLm5vcm1hbGl6ZShjd2QpO1xuICB9XG5cbiAgaXNDYXNlU2Vuc2l0aXZlKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Nhc2VTZW5zaXRpdmU7XG4gIH1cblxuICBleGlzdHMocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5maW5kRnJvbVBhdGgocGF0aCkuZW50aXR5ICE9PSBudWxsO1xuICB9XG5cbiAgcmVhZEZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCk7XG4gICAgaWYgKGlzRmlsZShlbnRpdHkpKSB7XG4gICAgICByZXR1cm4gZW50aXR5LnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKCdFTk9FTlQnLCBwYXRoLCBgRmlsZSBcIiR7cGF0aH1cIiBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gIH1cblxuICByZWFkRmlsZUJ1ZmZlcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEJ1ZmZlciB7XG4gICAgY29uc3Qge2VudGl0eX0gPSB0aGlzLmZpbmRGcm9tUGF0aChwYXRoKTtcbiAgICBpZiAoaXNGaWxlKGVudGl0eSkpIHtcbiAgICAgIHJldHVybiBCdWZmZXIuaXNCdWZmZXIoZW50aXR5KSA/IGVudGl0eSA6IG5ldyBCdWZmZXIoZW50aXR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoJ0VOT0VOVCcsIHBhdGgsIGBGaWxlIFwiJHtwYXRofVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogc3RyaW5nfEJ1ZmZlciwgZXhjbHVzaXZlOiBib29sZWFuID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBbZm9sZGVyUGF0aCwgYmFzZW5hbWVdID0gdGhpcy5zcGxpdEludG9Gb2xkZXJBbmRGaWxlKHBhdGgpO1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCB8fCAhaXNGb2xkZXIoZW50aXR5KSkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VOT0VOVCcsIHBhdGgsIGBVbmFibGUgdG8gd3JpdGUgZmlsZSBcIiR7cGF0aH1cIi4gVGhlIGNvbnRhaW5pbmcgZm9sZGVyIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBpZiAoZXhjbHVzaXZlICYmIGVudGl0eVtiYXNlbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VFWElTVCcsIHBhdGgsIGBVbmFibGUgdG8gZXhjbHVzaXZlbHkgd3JpdGUgZmlsZSBcIiR7cGF0aH1cIi4gVGhlIGZpbGUgYWxyZWFkeSBleGlzdHMuYCk7XG4gICAgfVxuICAgIGVudGl0eVtiYXNlbmFtZV0gPSBkYXRhO1xuICB9XG5cbiAgcmVtb3ZlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IFtmb2xkZXJQYXRoLCBiYXNlbmFtZV0gPSB0aGlzLnNwbGl0SW50b0ZvbGRlckFuZEZpbGUocGF0aCk7XG4gICAgY29uc3Qge2VudGl0eX0gPSB0aGlzLmZpbmRGcm9tUGF0aChmb2xkZXJQYXRoKTtcbiAgICBpZiAoZW50aXR5ID09PSBudWxsIHx8ICFpc0ZvbGRlcihlbnRpdHkpKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRU5PRU5UJywgcGF0aCwgYFVuYWJsZSB0byByZW1vdmUgZmlsZSBcIiR7cGF0aH1cIi4gVGhlIGNvbnRhaW5pbmcgZm9sZGVyIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBpZiAoaXNGb2xkZXIoZW50aXR5W2Jhc2VuYW1lXSkpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFSVNESVInLCBwYXRoLCBgVW5hYmxlIHRvIHJlbW92ZSBmaWxlIFwiJHtwYXRofVwiLiBUaGUgcGF0aCB0byByZW1vdmUgaXMgYSBmb2xkZXIuYCk7XG4gICAgfVxuICAgIGRlbGV0ZSBlbnRpdHlbYmFzZW5hbWVdO1xuICB9XG5cbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IFtmb2xkZXJQYXRoLCBiYXNlbmFtZV0gPSB0aGlzLnNwbGl0SW50b0ZvbGRlckFuZEZpbGUocGF0aCk7XG4gICAgY29uc3Qge2VudGl0eX0gPSB0aGlzLmZpbmRGcm9tUGF0aChmb2xkZXJQYXRoKTtcbiAgICBpZiAoZW50aXR5ID09PSBudWxsIHx8ICFpc0ZvbGRlcihlbnRpdHkpKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRU5PRU5UJywgcGF0aCxcbiAgICAgICAgICBgVW5hYmxlIHRvIGNyZWF0ZSBzeW1saW5rIGF0IFwiJHtwYXRofVwiLiBUaGUgY29udGFpbmluZyBmb2xkZXIgZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuICAgIGVudGl0eVtiYXNlbmFtZV0gPSBuZXcgU3ltTGluayh0YXJnZXQpO1xuICB9XG5cbiAgcmVhZGRpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFBhdGhTZWdtZW50W10ge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VOT0VOVCcsIHBhdGgsIGBVbmFibGUgdG8gcmVhZCBkaXJlY3RvcnkgXCIke3BhdGh9XCIuIEl0IGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBpZiAoaXNGaWxlKGVudGl0eSkpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFTk9URElSJywgcGF0aCwgYFVuYWJsZSB0byByZWFkIGRpcmVjdG9yeSBcIiR7cGF0aH1cIi4gSXQgaXMgYSBmaWxlLmApO1xuICAgIH1cbiAgICByZXR1cm4gT2JqZWN0LmtleXMoZW50aXR5KSBhcyBQYXRoU2VnbWVudFtdO1xuICB9XG5cbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoJ0VOT0VOVCcsIHBhdGgsIGBGaWxlIFwiJHtwYXRofVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE1vY2tGaWxlU3RhdHMoZW50aXR5KTtcbiAgfVxuXG4gIHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCwge2ZvbGxvd1N5bUxpbmtzOiB0cnVlfSk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoJ0VOT0VOVCcsIHBhdGgsIGBGaWxlIFwiJHtwYXRofVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE1vY2tGaWxlU3RhdHMoZW50aXR5KTtcbiAgfVxuXG4gIGNvcHlGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLndyaXRlRmlsZSh0bywgdGhpcy5yZWFkRmlsZShmcm9tKSk7XG4gIH1cblxuICBtb3ZlRmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy53cml0ZUZpbGUodG8sIHRoaXMucmVhZEZpbGUoZnJvbSkpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZmluZEZyb21QYXRoKGRpcm5hbWUoZnJvbSkpO1xuICAgIGNvbnN0IGZvbGRlciA9IHJlc3VsdC5lbnRpdHkgYXMgRm9sZGVyO1xuICAgIGNvbnN0IG5hbWUgPSBiYXNlbmFtZShmcm9tKTtcbiAgICBkZWxldGUgZm9sZGVyW25hbWVdO1xuICB9XG5cbiAgZW5zdXJlRGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnNwbGl0UGF0aChwYXRoKS5tYXAoc2VnbWVudCA9PiB0aGlzLmdldENhbm9uaWNhbFBhdGgoc2VnbWVudCkpO1xuICAgIGxldCBjdXJyZW50OiBGb2xkZXIgPSB0aGlzLl9maWxlVHJlZTtcblxuICAgIC8vIENvbnZlcnQgdGhlIHJvb3QgZm9sZGVyIHRvIGEgY2Fub25pY2FsIGVtcHR5IHN0cmluZyBgJydgIChvbiBXaW5kb3dzIGl0IHdvdWxkIGJlIGAnQzonYCkuXG4gICAgc2VnbWVudHNbMF0gPSAnJztcbiAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgIGlmIChpc0ZpbGUoY3VycmVudFtzZWdtZW50XSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGb2xkZXIgYWxyZWFkeSBleGlzdHMgYXMgYSBmaWxlLmApO1xuICAgICAgfVxuICAgICAgaWYgKCFjdXJyZW50W3NlZ21lbnRdKSB7XG4gICAgICAgIGN1cnJlbnRbc2VnbWVudF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3NlZ21lbnRdIGFzIEZvbGRlcjtcbiAgICB9XG4gIH1cblxuICByZW1vdmVEZWVwKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgY29uc3QgW2ZvbGRlclBhdGgsIGJhc2VuYW1lXSA9IHRoaXMuc3BsaXRJbnRvRm9sZGVyQW5kRmlsZShwYXRoKTtcbiAgICBjb25zdCB7ZW50aXR5fSA9IHRoaXMuZmluZEZyb21QYXRoKGZvbGRlclBhdGgpO1xuICAgIGlmIChlbnRpdHkgPT09IG51bGwgfHwgIWlzRm9sZGVyKGVudGl0eSkpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFTk9FTlQnLCBwYXRoLFxuICAgICAgICAgIGBVbmFibGUgdG8gcmVtb3ZlIGZvbGRlciBcIiR7cGF0aH1cIi4gVGhlIGNvbnRhaW5pbmcgZm9sZGVyIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBkZWxldGUgZW50aXR5W2Jhc2VuYW1lXTtcbiAgfVxuXG4gIGlzUm9vdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRpcm5hbWUocGF0aCkgPT09IHBhdGg7XG4gIH1cblxuICBleHRuYW1lKHBhdGg6IEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXRjaCA9IC8uKyhcXC5bXi5dKikkLy5leGVjKHBhdGgpO1xuICAgIHJldHVybiBtYXRjaCAhPT0gbnVsbCA/IG1hdGNoWzFdIDogJyc7XG4gIH1cblxuICByZWFscGF0aChmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5maW5kRnJvbVBhdGgoZmlsZVBhdGgsIHtmb2xsb3dTeW1MaW5rczogdHJ1ZX0pO1xuICAgIGlmIChyZXN1bHQuZW50aXR5ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRU5PRU5UJywgZmlsZVBhdGgsIGBVbmFibGUgdG8gZmluZCB0aGUgcmVhbCBwYXRoIG9mIFwiJHtmaWxlUGF0aH1cIi4gSXQgZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByZXN1bHQucGF0aDtcbiAgICB9XG4gIH1cblxuICBwd2QoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiB0aGlzLl9jd2Q7XG4gIH1cblxuICBjaGRpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuX2N3ZCA9IHRoaXMubm9ybWFsaXplKHBhdGgpO1xuICB9XG5cbiAgZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICAvLyBNaW1pYyB0aGUgbm9kZSBtb2R1bGUgcmVzb2x1dGlvbiBhbGdvcml0aG0gYW5kIHN0YXJ0IGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeSwgdGhlbiBsb29rXG4gICAgLy8gcHJvZ3Jlc3NpdmVseSBmdXJ0aGVyIHVwIHRoZSB0cmVlIHVudGlsIHJlYWNoaW5nIHRoZSBGUyByb290LlxuICAgIC8vIEUuZy4gaWYgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IGlzIC9mb28vYmFyLCBsb29rIGluIC9mb28vYmFyL25vZGVfbW9kdWxlcywgdGhlblxuICAgIC8vIC9mb28vbm9kZV9tb2R1bGVzLCB0aGVuIC9ub2RlX21vZHVsZXMuXG5cbiAgICBsZXQgcGF0aCA9ICdub2RlX21vZHVsZXMvdHlwZXNjcmlwdC9saWInO1xuICAgIGxldCByZXNvbHZlZFBhdGggPSB0aGlzLnJlc29sdmUocGF0aCk7XG5cbiAgICAvLyBDb25zdHJ1Y3QgYSBwYXRoIGZvciB0aGUgdG9wLWxldmVsIG5vZGVfbW9kdWxlcyB0byBpZGVudGlmeSB0aGUgc3RvcHBpbmcgcG9pbnQuXG4gICAgY29uc3QgdG9wTGV2ZWxOb2RlTW9kdWxlcyA9IHRoaXMucmVzb2x2ZSgnLycgKyBwYXRoKTtcblxuICAgIHdoaWxlIChyZXNvbHZlZFBhdGggIT09IHRvcExldmVsTm9kZU1vZHVsZXMpIHtcbiAgICAgIGlmICh0aGlzLmV4aXN0cyhyZXNvbHZlZFBhdGgpKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlZFBhdGg7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vdCBoZXJlLCBsb29rIG9uZSBsZXZlbCBoaWdoZXIuXG4gICAgICBwYXRoID0gJy4uLycgKyBwYXRoO1xuICAgICAgcmVzb2x2ZWRQYXRoID0gdGhpcy5yZXNvbHZlKHBhdGgpO1xuICAgIH1cblxuICAgIC8vIFRoZSBsb29wIGV4aXRzIGJlZm9yZSBjaGVja2luZyB0aGUgZXhpc3RlbmNlIG9mIC9ub2RlX21vZHVsZXMvdHlwZXNjcmlwdCBhdCB0aGUgdG9wIGxldmVsLlxuICAgIC8vIFRoaXMgaXMgaW50ZW50aW9uYWwgLSBpZiBubyAvbm9kZV9tb2R1bGVzL3R5cGVzY3JpcHQgZXhpc3RzIGFueXdoZXJlIGluIHRoZSB0cmVlLCB0aGVyZSdzXG4gICAgLy8gbm90aGluZyB0aGlzIGZ1bmN0aW9uIGNhbiBkbyBhYm91dCBpdCwgYW5kIFRTIG1heSBlcnJvciBsYXRlciBpZiBpdCBsb29rcyBmb3IgYSBsaWIuZC50cyBmaWxlXG4gICAgLy8gd2l0aGluIHRoaXMgZGlyZWN0b3J5LiBJdCBtaWdodCBiZSBva2F5LCB0aG91Z2gsIGlmIFRTIG5ldmVyIGNoZWNrcyBmb3Igb25lLlxuICAgIHJldHVybiB0b3BMZXZlbE5vZGVNb2R1bGVzO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVzb2x2ZSguLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aDtcbiAgYWJzdHJhY3QgZGlybmFtZTxUIGV4dGVuZHMgc3RyaW5nPihmaWxlOiBUKTogVDtcbiAgYWJzdHJhY3Qgam9pbjxUIGV4dGVuZHMgc3RyaW5nPihiYXNlUGF0aDogVCwgLi4ucGF0aHM6IHN0cmluZ1tdKTogVDtcbiAgYWJzdHJhY3QgcmVsYXRpdmU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZyb206IFQsIHRvOiBUKTogUGF0aFNlZ21lbnR8QWJzb2x1dGVGc1BhdGg7XG4gIGFic3RyYWN0IGJhc2VuYW1lKGZpbGVQYXRoOiBzdHJpbmcsIGV4dGVuc2lvbj86IHN0cmluZyk6IFBhdGhTZWdtZW50O1xuICBhYnN0cmFjdCBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuO1xuICBhYnN0cmFjdCBub3JtYWxpemU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KHBhdGg6IFQpOiBUO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3Qgc3BsaXRQYXRoPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihwYXRoOiBUKTogc3RyaW5nW107XG5cbiAgZHVtcCgpOiBGb2xkZXIge1xuICAgIHJldHVybiB0aGlzLmNsb25lRm9sZGVyKHRoaXMuX2ZpbGVUcmVlKTtcbiAgfVxuICBpbml0KGZvbGRlcjogRm9sZGVyKTogdm9pZCB7XG4gICAgdGhpcy5fZmlsZVRyZWUgPSB0aGlzLmNsb25lRm9sZGVyKGZvbGRlcik7XG4gIH1cblxuICBwcml2YXRlIGNsb25lRm9sZGVyKGZvbGRlcjogRm9sZGVyKTogRm9sZGVyIHtcbiAgICBjb25zdCBjbG9uZTogRm9sZGVyID0ge307XG4gICAgZm9yIChjb25zdCBwYXRoIGluIGZvbGRlcikge1xuICAgICAgY29uc3QgaXRlbSA9IGZvbGRlcltwYXRoXTtcbiAgICAgIGNvbnN0IGNhbm9uaWNhbFBhdGggPSB0aGlzLmdldENhbm9uaWNhbFBhdGgocGF0aCk7XG4gICAgICBpZiAoaXNTeW1MaW5rKGl0ZW0pKSB7XG4gICAgICAgIGNsb25lW2Nhbm9uaWNhbFBhdGhdID0gbmV3IFN5bUxpbmsodGhpcy5nZXRDYW5vbmljYWxQYXRoKGl0ZW0ucGF0aCkpO1xuICAgICAgfSBlbHNlIGlmIChpc0ZvbGRlcihpdGVtKSkge1xuICAgICAgICBjbG9uZVtjYW5vbmljYWxQYXRoXSA9IHRoaXMuY2xvbmVGb2xkZXIoaXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbG9uZVtjYW5vbmljYWxQYXRoXSA9IGZvbGRlcltwYXRoXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG5cblxuICBwcm90ZWN0ZWQgZmluZEZyb21QYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoLCBvcHRpb25zPzoge2ZvbGxvd1N5bUxpbmtzOiBib29sZWFufSk6IEZpbmRSZXN1bHQge1xuICAgIGNvbnN0IGZvbGxvd1N5bUxpbmtzID0gISFvcHRpb25zICYmIG9wdGlvbnMuZm9sbG93U3ltTGlua3M7XG4gICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnNwbGl0UGF0aChwYXRoKTtcbiAgICBpZiAoc2VnbWVudHMubGVuZ3RoID4gMSAmJiBzZWdtZW50c1tzZWdtZW50cy5sZW5ndGggLSAxXSA9PT0gJycpIHtcbiAgICAgIC8vIFJlbW92ZSBhIHRyYWlsaW5nIHNsYXNoICh1bmxlc3MgdGhlIHBhdGggd2FzIG9ubHkgYC9gKVxuICAgICAgc2VnbWVudHMucG9wKCk7XG4gICAgfVxuICAgIC8vIENvbnZlcnQgdGhlIHJvb3QgZm9sZGVyIHRvIGEgY2Fub25pY2FsIGVtcHR5IHN0cmluZyBgXCJcImAgKG9uIFdpbmRvd3MgaXQgd291bGQgYmUgYEM6YCkuXG4gICAgc2VnbWVudHNbMF0gPSAnJztcbiAgICBsZXQgY3VycmVudDogRW50aXR5fG51bGwgPSB0aGlzLl9maWxlVHJlZTtcbiAgICB3aGlsZSAoc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgICBjdXJyZW50ID0gY3VycmVudFt0aGlzLmdldENhbm9uaWNhbFBhdGgoc2VnbWVudHMuc2hpZnQoKSEpXTtcbiAgICAgIGlmIChjdXJyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHtwYXRoLCBlbnRpdHk6IG51bGx9O1xuICAgICAgfVxuICAgICAgaWYgKHNlZ21lbnRzLmxlbmd0aCA+IDAgJiYgKCFpc0ZvbGRlcihjdXJyZW50KSkpIHtcbiAgICAgICAgY3VycmVudCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGlzRmlsZShjdXJyZW50KSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChpc1N5bUxpbmsoY3VycmVudCkpIHtcbiAgICAgICAgaWYgKGZvbGxvd1N5bUxpbmtzKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmluZEZyb21QYXRoKHJlc29sdmUoY3VycmVudC5wYXRoLCAuLi5zZWdtZW50cyksIHtmb2xsb3dTeW1MaW5rc30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7cGF0aCwgZW50aXR5OiBjdXJyZW50fTtcbiAgfVxuXG4gIHByb3RlY3RlZCBzcGxpdEludG9Gb2xkZXJBbmRGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogW0Fic29sdXRlRnNQYXRoLCBzdHJpbmddIHtcbiAgICBjb25zdCBzZWdtZW50cyA9IHRoaXMuc3BsaXRQYXRoKHRoaXMuZ2V0Q2Fub25pY2FsUGF0aChwYXRoKSk7XG4gICAgY29uc3QgZmlsZSA9IHNlZ21lbnRzLnBvcCgpITtcbiAgICByZXR1cm4gW3BhdGguc3Vic3RyaW5nKDAsIHBhdGgubGVuZ3RoIC0gZmlsZS5sZW5ndGggLSAxKSBhcyBBYnNvbHV0ZUZzUGF0aCwgZmlsZV07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q2Fub25pY2FsUGF0aDxUIGV4dGVuZHMgc3RyaW5nPihwOiBUKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuaXNDYXNlU2Vuc2l0aXZlKCkgPyBwIDogcC50b0xvd2VyQ2FzZSgpIGFzIFQ7XG4gIH1cbn1cbmV4cG9ydCBpbnRlcmZhY2UgRmluZFJlc3VsdCB7XG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICBlbnRpdHk6IEVudGl0eXxudWxsO1xufVxuZXhwb3J0IHR5cGUgRW50aXR5ID0gRm9sZGVyfEZpbGV8U3ltTGluaztcbmV4cG9ydCBpbnRlcmZhY2UgRm9sZGVyIHtcbiAgW3BhdGhTZWdtZW50czogc3RyaW5nXTogRW50aXR5O1xufVxuZXhwb3J0IHR5cGUgRmlsZSA9IHN0cmluZ3xCdWZmZXI7XG5leHBvcnQgY2xhc3MgU3ltTGluayB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYXRoOiBBYnNvbHV0ZUZzUGF0aCkge31cbn1cblxuY2xhc3MgTW9ja0ZpbGVTdGF0cyBpbXBsZW1lbnRzIEZpbGVTdGF0cyB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZW50aXR5OiBFbnRpdHkpIHt9XG4gIGlzRmlsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNGaWxlKHRoaXMuZW50aXR5KTtcbiAgfVxuICBpc0RpcmVjdG9yeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNGb2xkZXIodGhpcy5lbnRpdHkpO1xuICB9XG4gIGlzU3ltYm9saWNMaW5rKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc1N5bUxpbmsodGhpcy5lbnRpdHkpO1xuICB9XG59XG5cbmNsYXNzIE1vY2tGaWxlU3lzdGVtRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb2RlOiBzdHJpbmcsIHB1YmxpYyBwYXRoOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0ZpbGUoaXRlbTogRW50aXR5fG51bGwpOiBpdGVtIGlzIEZpbGUge1xuICByZXR1cm4gQnVmZmVyLmlzQnVmZmVyKGl0ZW0pIHx8IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltTGluayhpdGVtOiBFbnRpdHl8bnVsbCk6IGl0ZW0gaXMgU3ltTGluayB7XG4gIHJldHVybiBpdGVtIGluc3RhbmNlb2YgU3ltTGluaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRm9sZGVyKGl0ZW06IEVudGl0eXxudWxsKTogaXRlbSBpcyBGb2xkZXIge1xuICByZXR1cm4gaXRlbSAhPT0gbnVsbCAmJiAhaXNGaWxlKGl0ZW0pICYmICFpc1N5bUxpbmsoaXRlbSk7XG59XG4iXX0=