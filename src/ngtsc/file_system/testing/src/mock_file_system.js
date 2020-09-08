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
                return entity instanceof Uint8Array ? entity : new Buffer(entity);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja19maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vdGVzdGluZy9zcmMvbW9ja19maWxlX3N5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsbUZBQTZEO0lBRzdEOztPQUVHO0lBQ0g7UUFLRSx3QkFBb0IsZ0JBQXdCLEVBQUUsR0FBMkM7WUFBckUsaUNBQUEsRUFBQSx3QkFBd0I7WUFBRSxvQkFBQSxFQUFBLE1BQXNCLEdBQXFCO1lBQXJFLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtZQUpwQyxjQUFTLEdBQVcsRUFBRSxDQUFDO1lBSzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsd0NBQWUsR0FBZjtZQUNFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQy9CLENBQUM7UUFFRCwrQkFBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUM7UUFDakQsQ0FBQztRQUVELGlDQUFRLEdBQVIsVUFBUyxJQUFvQjtZQUNwQixJQUFBLE1BQU0sR0FBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUEzQixDQUE0QjtZQUN6QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEIsT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDMUI7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBUyxJQUFJLHVCQUFtQixDQUFDLENBQUM7YUFDakY7UUFDSCxDQUFDO1FB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QVdDO0lBRUQ7UUFBa0MsK0NBQUs7UUFDckMsNkJBQW1CLElBQVksRUFBUyxJQUFZLEVBQUUsT0FBZTtZQUFyRSxZQUNFLGtCQUFNLE9BQU8sQ0FBQyxTQUNmO1lBRmtCLFVBQUksR0FBSixJQUFJLENBQVE7WUFBUyxVQUFJLEdBQUosSUFBSSxDQUFROztRQUVwRCxDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBa0MsS0FBSyxHQUl0QztJQUVELFNBQWdCLE1BQU0sQ0FBQyxJQUFpQjtRQUN0QyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDO0lBQzNELENBQUM7SUFGRCx3QkFFQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxJQUFpQjtRQUN6QyxPQUFPLElBQUksWUFBWSxPQUFPLENBQUM7SUFDakMsQ0FBQztJQUZELDhCQUVDO0lBRUQsU0FBZ0IsUUFBUSxDQUFDLElBQWlCO1FBQ3hDLE9BQU8sSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRkQsNEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtiYXNlbmFtZSwgZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL2hlbHBlcnMnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN0YXRzLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgUGF0aFN0cmluZ30gZnJvbSAnLi4vLi4vc3JjL3R5cGVzJztcblxuLyoqXG4gKiBBbiBpbi1tZW1vcnkgZmlsZSBzeXN0ZW0gdGhhdCBjYW4gYmUgdXNlZCBpbiB1bml0IHRlc3RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTW9ja0ZpbGVTeXN0ZW0gaW1wbGVtZW50cyBGaWxlU3lzdGVtIHtcbiAgcHJpdmF0ZSBfZmlsZVRyZWU6IEZvbGRlciA9IHt9O1xuICBwcml2YXRlIF9jd2Q6IEFic29sdXRlRnNQYXRoO1xuXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfaXNDYXNlU2Vuc2l0aXZlID0gZmFsc2UsIGN3ZDogQWJzb2x1dGVGc1BhdGggPSAnLycgYXMgQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLl9jd2QgPSB0aGlzLm5vcm1hbGl6ZShjd2QpO1xuICB9XG5cbiAgaXNDYXNlU2Vuc2l0aXZlKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Nhc2VTZW5zaXRpdmU7XG4gIH1cblxuICBleGlzdHMocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5maW5kRnJvbVBhdGgocGF0aCkuZW50aXR5ICE9PSBudWxsO1xuICB9XG5cbiAgcmVhZEZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCk7XG4gICAgaWYgKGlzRmlsZShlbnRpdHkpKSB7XG4gICAgICByZXR1cm4gZW50aXR5LnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKCdFTk9FTlQnLCBwYXRoLCBgRmlsZSBcIiR7cGF0aH1cIiBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gIH1cblxuICByZWFkRmlsZUJ1ZmZlcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgocGF0aCk7XG4gICAgaWYgKGlzRmlsZShlbnRpdHkpKSB7XG4gICAgICByZXR1cm4gZW50aXR5IGluc3RhbmNlb2YgVWludDhBcnJheSA/IGVudGl0eSA6IG5ldyBCdWZmZXIoZW50aXR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoJ0VOT0VOVCcsIHBhdGgsIGBGaWxlIFwiJHtwYXRofVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogc3RyaW5nfFVpbnQ4QXJyYXksIGV4Y2x1c2l2ZTogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XG4gICAgY29uc3QgW2ZvbGRlclBhdGgsIGJhc2VuYW1lXSA9IHRoaXMuc3BsaXRJbnRvRm9sZGVyQW5kRmlsZShwYXRoKTtcbiAgICBjb25zdCB7ZW50aXR5fSA9IHRoaXMuZmluZEZyb21QYXRoKGZvbGRlclBhdGgpO1xuICAgIGlmIChlbnRpdHkgPT09IG51bGwgfHwgIWlzRm9sZGVyKGVudGl0eSkpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFTk9FTlQnLCBwYXRoLCBgVW5hYmxlIHRvIHdyaXRlIGZpbGUgXCIke3BhdGh9XCIuIFRoZSBjb250YWluaW5nIGZvbGRlciBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgaWYgKGV4Y2x1c2l2ZSAmJiBlbnRpdHlbYmFzZW5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFRVhJU1QnLCBwYXRoLCBgVW5hYmxlIHRvIGV4Y2x1c2l2ZWx5IHdyaXRlIGZpbGUgXCIke3BhdGh9XCIuIFRoZSBmaWxlIGFscmVhZHkgZXhpc3RzLmApO1xuICAgIH1cbiAgICBlbnRpdHlbYmFzZW5hbWVdID0gZGF0YTtcbiAgfVxuXG4gIHJlbW92ZUZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBjb25zdCBbZm9sZGVyUGF0aCwgYmFzZW5hbWVdID0gdGhpcy5zcGxpdEludG9Gb2xkZXJBbmRGaWxlKHBhdGgpO1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCB8fCAhaXNGb2xkZXIoZW50aXR5KSkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VOT0VOVCcsIHBhdGgsIGBVbmFibGUgdG8gcmVtb3ZlIGZpbGUgXCIke3BhdGh9XCIuIFRoZSBjb250YWluaW5nIGZvbGRlciBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgaWYgKGlzRm9sZGVyKGVudGl0eVtiYXNlbmFtZV0pKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRUlTRElSJywgcGF0aCwgYFVuYWJsZSB0byByZW1vdmUgZmlsZSBcIiR7cGF0aH1cIi4gVGhlIHBhdGggdG8gcmVtb3ZlIGlzIGEgZm9sZGVyLmApO1xuICAgIH1cbiAgICBkZWxldGUgZW50aXR5W2Jhc2VuYW1lXTtcbiAgfVxuXG4gIHN5bWxpbmsodGFyZ2V0OiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBjb25zdCBbZm9sZGVyUGF0aCwgYmFzZW5hbWVdID0gdGhpcy5zcGxpdEludG9Gb2xkZXJBbmRGaWxlKHBhdGgpO1xuICAgIGNvbnN0IHtlbnRpdHl9ID0gdGhpcy5maW5kRnJvbVBhdGgoZm9sZGVyUGF0aCk7XG4gICAgaWYgKGVudGl0eSA9PT0gbnVsbCB8fCAhaXNGb2xkZXIoZW50aXR5KSkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VOT0VOVCcsIHBhdGgsXG4gICAgICAgICAgYFVuYWJsZSB0byBjcmVhdGUgc3ltbGluayBhdCBcIiR7cGF0aH1cIi4gVGhlIGNvbnRhaW5pbmcgZm9sZGVyIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBlbnRpdHlbYmFzZW5hbWVdID0gbmV3IFN5bUxpbmsodGFyZ2V0KTtcbiAgfVxuXG4gIHJlYWRkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBQYXRoU2VnbWVudFtdIHtcbiAgICBjb25zdCB7ZW50aXR5fSA9IHRoaXMuZmluZEZyb21QYXRoKHBhdGgpO1xuICAgIGlmIChlbnRpdHkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKFxuICAgICAgICAgICdFTk9FTlQnLCBwYXRoLCBgVW5hYmxlIHRvIHJlYWQgZGlyZWN0b3J5IFwiJHtwYXRofVwiLiBJdCBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgaWYgKGlzRmlsZShlbnRpdHkpKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRU5PVERJUicsIHBhdGgsIGBVbmFibGUgdG8gcmVhZCBkaXJlY3RvcnkgXCIke3BhdGh9XCIuIEl0IGlzIGEgZmlsZS5gKTtcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGVudGl0eSkgYXMgUGF0aFNlZ21lbnRbXTtcbiAgfVxuXG4gIGxzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHtcbiAgICBjb25zdCB7ZW50aXR5fSA9IHRoaXMuZmluZEZyb21QYXRoKHBhdGgpO1xuICAgIGlmIChlbnRpdHkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKCdFTk9FTlQnLCBwYXRoLCBgRmlsZSBcIiR7cGF0aH1cIiBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBNb2NrRmlsZVN0YXRzKGVudGl0eSk7XG4gIH1cblxuICBzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHtcbiAgICBjb25zdCB7ZW50aXR5fSA9IHRoaXMuZmluZEZyb21QYXRoKHBhdGgsIHtmb2xsb3dTeW1MaW5rczogdHJ1ZX0pO1xuICAgIGlmIChlbnRpdHkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBNb2NrRmlsZVN5c3RlbUVycm9yKCdFTk9FTlQnLCBwYXRoLCBgRmlsZSBcIiR7cGF0aH1cIiBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBNb2NrRmlsZVN0YXRzKGVudGl0eSk7XG4gIH1cblxuICBjb3B5RmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy53cml0ZUZpbGUodG8sIHRoaXMucmVhZEZpbGUoZnJvbSkpO1xuICB9XG5cbiAgbW92ZUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMud3JpdGVGaWxlKHRvLCB0aGlzLnJlYWRGaWxlKGZyb20pKTtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmZpbmRGcm9tUGF0aChkaXJuYW1lKGZyb20pKTtcbiAgICBjb25zdCBmb2xkZXIgPSByZXN1bHQuZW50aXR5IGFzIEZvbGRlcjtcbiAgICBjb25zdCBuYW1lID0gYmFzZW5hbWUoZnJvbSk7XG4gICAgZGVsZXRlIGZvbGRlcltuYW1lXTtcbiAgfVxuXG4gIGVuc3VyZURpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocGF0aCkubWFwKHNlZ21lbnQgPT4gdGhpcy5nZXRDYW5vbmljYWxQYXRoKHNlZ21lbnQpKTtcbiAgICBsZXQgY3VycmVudDogRm9sZGVyID0gdGhpcy5fZmlsZVRyZWU7XG5cbiAgICAvLyBDb252ZXJ0IHRoZSByb290IGZvbGRlciB0byBhIGNhbm9uaWNhbCBlbXB0eSBzdHJpbmcgYCcnYCAob24gV2luZG93cyBpdCB3b3VsZCBiZSBgJ0M6J2ApLlxuICAgIHNlZ21lbnRzWzBdID0gJyc7XG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICBpZiAoaXNGaWxlKGN1cnJlbnRbc2VnbWVudF0pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRm9sZGVyIGFscmVhZHkgZXhpc3RzIGFzIGEgZmlsZS5gKTtcbiAgICAgIH1cbiAgICAgIGlmICghY3VycmVudFtzZWdtZW50XSkge1xuICAgICAgICBjdXJyZW50W3NlZ21lbnRdID0ge307XG4gICAgICB9XG4gICAgICBjdXJyZW50ID0gY3VycmVudFtzZWdtZW50XSBhcyBGb2xkZXI7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlRGVlcChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGNvbnN0IFtmb2xkZXJQYXRoLCBiYXNlbmFtZV0gPSB0aGlzLnNwbGl0SW50b0ZvbGRlckFuZEZpbGUocGF0aCk7XG4gICAgY29uc3Qge2VudGl0eX0gPSB0aGlzLmZpbmRGcm9tUGF0aChmb2xkZXJQYXRoKTtcbiAgICBpZiAoZW50aXR5ID09PSBudWxsIHx8ICFpc0ZvbGRlcihlbnRpdHkpKSB7XG4gICAgICB0aHJvdyBuZXcgTW9ja0ZpbGVTeXN0ZW1FcnJvcihcbiAgICAgICAgICAnRU5PRU5UJywgcGF0aCxcbiAgICAgICAgICBgVW5hYmxlIHRvIHJlbW92ZSBmb2xkZXIgXCIke3BhdGh9XCIuIFRoZSBjb250YWluaW5nIGZvbGRlciBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgZGVsZXRlIGVudGl0eVtiYXNlbmFtZV07XG4gIH1cblxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kaXJuYW1lKHBhdGgpID09PSBwYXRoO1xuICB9XG5cbiAgZXh0bmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgbWF0Y2ggPSAvLisoXFwuW14uXSopJC8uZXhlYyhwYXRoKTtcbiAgICByZXR1cm4gbWF0Y2ggIT09IG51bGwgPyBtYXRjaFsxXSA6ICcnO1xuICB9XG5cbiAgcmVhbHBhdGgoZmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZmluZEZyb21QYXRoKGZpbGVQYXRoLCB7Zm9sbG93U3ltTGlua3M6IHRydWV9KTtcbiAgICBpZiAocmVzdWx0LmVudGl0eSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IE1vY2tGaWxlU3lzdGVtRXJyb3IoXG4gICAgICAgICAgJ0VOT0VOVCcsIGZpbGVQYXRoLCBgVW5hYmxlIHRvIGZpbmQgdGhlIHJlYWwgcGF0aCBvZiBcIiR7ZmlsZVBhdGh9XCIuIEl0IGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmVzdWx0LnBhdGg7XG4gICAgfVxuICB9XG5cbiAgcHdkKCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5fY3dkO1xuICB9XG5cbiAgY2hkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLl9jd2QgPSB0aGlzLm5vcm1hbGl6ZShwYXRoKTtcbiAgfVxuXG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgLy8gTWltaWMgdGhlIG5vZGUgbW9kdWxlIHJlc29sdXRpb24gYWxnb3JpdGhtIGFuZCBzdGFydCBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnksIHRoZW4gbG9va1xuICAgIC8vIHByb2dyZXNzaXZlbHkgZnVydGhlciB1cCB0aGUgdHJlZSB1bnRpbCByZWFjaGluZyB0aGUgRlMgcm9vdC5cbiAgICAvLyBFLmcuIGlmIHRoZSBjdXJyZW50IGRpcmVjdG9yeSBpcyAvZm9vL2JhciwgbG9vayBpbiAvZm9vL2Jhci9ub2RlX21vZHVsZXMsIHRoZW5cbiAgICAvLyAvZm9vL25vZGVfbW9kdWxlcywgdGhlbiAvbm9kZV9tb2R1bGVzLlxuXG4gICAgbGV0IHBhdGggPSAnbm9kZV9tb2R1bGVzL3R5cGVzY3JpcHQvbGliJztcbiAgICBsZXQgcmVzb2x2ZWRQYXRoID0gdGhpcy5yZXNvbHZlKHBhdGgpO1xuXG4gICAgLy8gQ29uc3RydWN0IGEgcGF0aCBmb3IgdGhlIHRvcC1sZXZlbCBub2RlX21vZHVsZXMgdG8gaWRlbnRpZnkgdGhlIHN0b3BwaW5nIHBvaW50LlxuICAgIGNvbnN0IHRvcExldmVsTm9kZU1vZHVsZXMgPSB0aGlzLnJlc29sdmUoJy8nICsgcGF0aCk7XG5cbiAgICB3aGlsZSAocmVzb2x2ZWRQYXRoICE9PSB0b3BMZXZlbE5vZGVNb2R1bGVzKSB7XG4gICAgICBpZiAodGhpcy5leGlzdHMocmVzb2x2ZWRQYXRoKSkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQYXRoO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3QgaGVyZSwgbG9vayBvbmUgbGV2ZWwgaGlnaGVyLlxuICAgICAgcGF0aCA9ICcuLi8nICsgcGF0aDtcbiAgICAgIHJlc29sdmVkUGF0aCA9IHRoaXMucmVzb2x2ZShwYXRoKTtcbiAgICB9XG5cbiAgICAvLyBUaGUgbG9vcCBleGl0cyBiZWZvcmUgY2hlY2tpbmcgdGhlIGV4aXN0ZW5jZSBvZiAvbm9kZV9tb2R1bGVzL3R5cGVzY3JpcHQgYXQgdGhlIHRvcCBsZXZlbC5cbiAgICAvLyBUaGlzIGlzIGludGVudGlvbmFsIC0gaWYgbm8gL25vZGVfbW9kdWxlcy90eXBlc2NyaXB0IGV4aXN0cyBhbnl3aGVyZSBpbiB0aGUgdHJlZSwgdGhlcmUnc1xuICAgIC8vIG5vdGhpbmcgdGhpcyBmdW5jdGlvbiBjYW4gZG8gYWJvdXQgaXQsIGFuZCBUUyBtYXkgZXJyb3IgbGF0ZXIgaWYgaXQgbG9va3MgZm9yIGEgbGliLmQudHMgZmlsZVxuICAgIC8vIHdpdGhpbiB0aGlzIGRpcmVjdG9yeS4gSXQgbWlnaHQgYmUgb2theSwgdGhvdWdoLCBpZiBUUyBuZXZlciBjaGVja3MgZm9yIG9uZS5cbiAgICByZXR1cm4gdG9wTGV2ZWxOb2RlTW9kdWxlcztcbiAgfVxuXG4gIGFic3RyYWN0IHJlc29sdmUoLi4ucGF0aHM6IHN0cmluZ1tdKTogQWJzb2x1dGVGc1BhdGg7XG4gIGFic3RyYWN0IGRpcm5hbWU8VCBleHRlbmRzIHN0cmluZz4oZmlsZTogVCk6IFQ7XG4gIGFic3RyYWN0IGpvaW48VCBleHRlbmRzIHN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQ7XG4gIGFic3RyYWN0IHJlbGF0aXZlPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmcm9tOiBULCB0bzogVCk6IFBhdGhTZWdtZW50fEFic29sdXRlRnNQYXRoO1xuICBhYnN0cmFjdCBiYXNlbmFtZShmaWxlUGF0aDogc3RyaW5nLCBleHRlbnNpb24/OiBzdHJpbmcpOiBQYXRoU2VnbWVudDtcbiAgYWJzdHJhY3QgaXNSb290ZWQocGF0aDogc3RyaW5nKTogYm9vbGVhbjtcbiAgYWJzdHJhY3Qgbm9ybWFsaXplPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihwYXRoOiBUKTogVDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHNwbGl0UGF0aDxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IHN0cmluZ1tdO1xuXG4gIGR1bXAoKTogRm9sZGVyIHtcbiAgICByZXR1cm4gdGhpcy5jbG9uZUZvbGRlcih0aGlzLl9maWxlVHJlZSk7XG4gIH1cbiAgaW5pdChmb2xkZXI6IEZvbGRlcik6IHZvaWQge1xuICAgIHRoaXMuX2ZpbGVUcmVlID0gdGhpcy5jbG9uZUZvbGRlcihmb2xkZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBjbG9uZUZvbGRlcihmb2xkZXI6IEZvbGRlcik6IEZvbGRlciB7XG4gICAgY29uc3QgY2xvbmU6IEZvbGRlciA9IHt9O1xuICAgIGZvciAoY29uc3QgcGF0aCBpbiBmb2xkZXIpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBmb2xkZXJbcGF0aF07XG4gICAgICBjb25zdCBjYW5vbmljYWxQYXRoID0gdGhpcy5nZXRDYW5vbmljYWxQYXRoKHBhdGgpO1xuICAgICAgaWYgKGlzU3ltTGluayhpdGVtKSkge1xuICAgICAgICBjbG9uZVtjYW5vbmljYWxQYXRoXSA9IG5ldyBTeW1MaW5rKHRoaXMuZ2V0Q2Fub25pY2FsUGF0aChpdGVtLnBhdGgpKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNGb2xkZXIoaXRlbSkpIHtcbiAgICAgICAgY2xvbmVbY2Fub25pY2FsUGF0aF0gPSB0aGlzLmNsb25lRm9sZGVyKGl0ZW0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xvbmVbY2Fub25pY2FsUGF0aF0gPSBmb2xkZXJbcGF0aF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG5cbiAgcHJvdGVjdGVkIGZpbmRGcm9tUGF0aChwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgb3B0aW9ucz86IHtmb2xsb3dTeW1MaW5rczogYm9vbGVhbn0pOiBGaW5kUmVzdWx0IHtcbiAgICBjb25zdCBmb2xsb3dTeW1MaW5rcyA9ICEhb3B0aW9ucyAmJiBvcHRpb25zLmZvbGxvd1N5bUxpbmtzO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocGF0aCk7XG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCA+IDEgJiYgc2VnbWVudHNbc2VnbWVudHMubGVuZ3RoIC0gMV0gPT09ICcnKSB7XG4gICAgICAvLyBSZW1vdmUgYSB0cmFpbGluZyBzbGFzaCAodW5sZXNzIHRoZSBwYXRoIHdhcyBvbmx5IGAvYClcbiAgICAgIHNlZ21lbnRzLnBvcCgpO1xuICAgIH1cbiAgICAvLyBDb252ZXJ0IHRoZSByb290IGZvbGRlciB0byBhIGNhbm9uaWNhbCBlbXB0eSBzdHJpbmcgYFwiXCJgIChvbiBXaW5kb3dzIGl0IHdvdWxkIGJlIGBDOmApLlxuICAgIHNlZ21lbnRzWzBdID0gJyc7XG4gICAgbGV0IGN1cnJlbnQ6IEVudGl0eXxudWxsID0gdGhpcy5fZmlsZVRyZWU7XG4gICAgd2hpbGUgKHNlZ21lbnRzLmxlbmd0aCkge1xuICAgICAgY3VycmVudCA9IGN1cnJlbnRbdGhpcy5nZXRDYW5vbmljYWxQYXRoKHNlZ21lbnRzLnNoaWZ0KCkhKV07XG4gICAgICBpZiAoY3VycmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB7cGF0aCwgZW50aXR5OiBudWxsfTtcbiAgICAgIH1cbiAgICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAwICYmICghaXNGb2xkZXIoY3VycmVudCkpKSB7XG4gICAgICAgIGN1cnJlbnQgPSBudWxsO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChpc0ZpbGUoY3VycmVudCkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoaXNTeW1MaW5rKGN1cnJlbnQpKSB7XG4gICAgICAgIGlmIChmb2xsb3dTeW1MaW5rcykge1xuICAgICAgICAgIHJldHVybiB0aGlzLmZpbmRGcm9tUGF0aChyZXNvbHZlKGN1cnJlbnQucGF0aCwgLi4uc2VnbWVudHMpLCB7Zm9sbG93U3ltTGlua3N9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge3BhdGgsIGVudGl0eTogY3VycmVudH07XG4gIH1cblxuICBwcm90ZWN0ZWQgc3BsaXRJbnRvRm9sZGVyQW5kRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFtBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nXSB7XG4gICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnNwbGl0UGF0aCh0aGlzLmdldENhbm9uaWNhbFBhdGgocGF0aCkpO1xuICAgIGNvbnN0IGZpbGUgPSBzZWdtZW50cy5wb3AoKSE7XG4gICAgcmV0dXJuIFtwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxlbmd0aCAtIGZpbGUubGVuZ3RoIC0gMSkgYXMgQWJzb2x1dGVGc1BhdGgsIGZpbGVdO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldENhbm9uaWNhbFBhdGg8VCBleHRlbmRzIHN0cmluZz4ocDogVCk6IFQge1xuICAgIHJldHVybiB0aGlzLmlzQ2FzZVNlbnNpdGl2ZSgpID8gcCA6IHAudG9Mb3dlckNhc2UoKSBhcyBUO1xuICB9XG59XG5leHBvcnQgaW50ZXJmYWNlIEZpbmRSZXN1bHQge1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgZW50aXR5OiBFbnRpdHl8bnVsbDtcbn1cbmV4cG9ydCB0eXBlIEVudGl0eSA9IEZvbGRlcnxGaWxlfFN5bUxpbms7XG5leHBvcnQgaW50ZXJmYWNlIEZvbGRlciB7XG4gIFtwYXRoU2VnbWVudHM6IHN0cmluZ106IEVudGl0eTtcbn1cbmV4cG9ydCB0eXBlIEZpbGUgPSBzdHJpbmd8VWludDhBcnJheTtcbmV4cG9ydCBjbGFzcyBTeW1MaW5rIHtcbiAgY29uc3RydWN0b3IocHVibGljIHBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxufVxuXG5jbGFzcyBNb2NrRmlsZVN0YXRzIGltcGxlbWVudHMgRmlsZVN0YXRzIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBlbnRpdHk6IEVudGl0eSkge31cbiAgaXNGaWxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc0ZpbGUodGhpcy5lbnRpdHkpO1xuICB9XG4gIGlzRGlyZWN0b3J5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc0ZvbGRlcih0aGlzLmVudGl0eSk7XG4gIH1cbiAgaXNTeW1ib2xpY0xpbmsoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzU3ltTGluayh0aGlzLmVudGl0eSk7XG4gIH1cbn1cblxuY2xhc3MgTW9ja0ZpbGVTeXN0ZW1FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIGNvZGU6IHN0cmluZywgcHVibGljIHBhdGg6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRmlsZShpdGVtOiBFbnRpdHl8bnVsbCk6IGl0ZW0gaXMgRmlsZSB7XG4gIHJldHVybiBCdWZmZXIuaXNCdWZmZXIoaXRlbSkgfHwgdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1MaW5rKGl0ZW06IEVudGl0eXxudWxsKTogaXRlbSBpcyBTeW1MaW5rIHtcbiAgcmV0dXJuIGl0ZW0gaW5zdGFuY2VvZiBTeW1MaW5rO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGb2xkZXIoaXRlbTogRW50aXR5fG51bGwpOiBpdGVtIGlzIEZvbGRlciB7XG4gIHJldHVybiBpdGVtICE9PSBudWxsICYmICFpc0ZpbGUoaXRlbSkgJiYgIWlzU3ltTGluayhpdGVtKTtcbn1cbiJdfQ==