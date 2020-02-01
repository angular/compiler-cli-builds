(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/cached_file_system", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * A wrapper around `FileSystem` that caches hits to `exists()` and
     * `readFile()` to improve performance.
     *
     * Be aware that any changes to the file system from outside of this
     * class could break the cache, leaving it with stale values.
     */
    var CachedFileSystem = /** @class */ (function () {
        function CachedFileSystem(delegate) {
            this.delegate = delegate;
            this.existsCache = new Map();
            this.readFileCache = new Map();
        }
        CachedFileSystem.prototype.exists = function (path) {
            if (!this.existsCache.has(path)) {
                this.existsCache.set(path, this.delegate.exists(path));
            }
            return this.existsCache.get(path);
        };
        CachedFileSystem.prototype.readFile = function (path) {
            if (!this.readFileCache.has(path)) {
                try {
                    if (this.lstat(path).isSymbolicLink()) {
                        // don't cache the value of a symbolic link
                        return this.delegate.readFile(path);
                    }
                    this.readFileCache.set(path, this.delegate.readFile(path));
                }
                catch (e) {
                    this.readFileCache.set(path, e);
                }
            }
            var result = this.readFileCache.get(path);
            if (typeof result === 'string') {
                return result;
            }
            else {
                throw result;
            }
        };
        CachedFileSystem.prototype.writeFile = function (path, data, exclusive) {
            this.delegate.writeFile(path, data, exclusive);
            this.readFileCache.set(path, data);
            this.existsCache.set(path, true);
        };
        CachedFileSystem.prototype.removeFile = function (path) {
            this.delegate.removeFile(path);
            this.readFileCache.delete(path);
            this.existsCache.set(path, false);
        };
        CachedFileSystem.prototype.symlink = function (target, path) {
            this.delegate.symlink(target, path);
            this.existsCache.set(path, true);
        };
        CachedFileSystem.prototype.copyFile = function (from, to) {
            this.delegate.copyFile(from, to);
            this.existsCache.set(to, true);
        };
        CachedFileSystem.prototype.moveFile = function (from, to) {
            this.delegate.moveFile(from, to);
            this.existsCache.set(from, false);
            if (this.readFileCache.has(from)) {
                this.readFileCache.set(to, this.readFileCache.get(from));
                this.readFileCache.delete(from);
            }
            this.existsCache.set(to, true);
        };
        CachedFileSystem.prototype.ensureDir = function (path) {
            this.delegate.ensureDir(path);
            while (!this.isRoot(path)) {
                this.existsCache.set(path, true);
                path = this.dirname(path);
            }
        };
        CachedFileSystem.prototype.removeDeep = function (path) {
            var e_1, _a;
            this.delegate.removeDeep(path);
            try {
                // Clear out all children of this directory from the exists cache.
                for (var _b = tslib_1.__values(this.existsCache.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var p = _c.value;
                    if (p.startsWith(path)) {
                        this.existsCache.set(path, false);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        CachedFileSystem.prototype.lstat = function (path) {
            var stat = this.delegate.lstat(path);
            // if the `path` does not exist then `lstat` will thrown an error.
            this.existsCache.set(path, true);
            return stat;
        };
        CachedFileSystem.prototype.stat = function (path) {
            var stat = this.delegate.stat(path);
            // if the `path` does not exist then `stat` will thrown an error.
            this.existsCache.set(path, true);
            return stat;
        };
        // The following methods simply call through to the delegate.
        CachedFileSystem.prototype.readdir = function (path) { return this.delegate.readdir(path); };
        CachedFileSystem.prototype.pwd = function () { return this.delegate.pwd(); };
        CachedFileSystem.prototype.chdir = function (path) { this.delegate.chdir(path); };
        CachedFileSystem.prototype.extname = function (path) { return this.delegate.extname(path); };
        CachedFileSystem.prototype.isCaseSensitive = function () { return this.delegate.isCaseSensitive(); };
        CachedFileSystem.prototype.isRoot = function (path) { return this.delegate.isRoot(path); };
        CachedFileSystem.prototype.isRooted = function (path) { return this.delegate.isRooted(path); };
        CachedFileSystem.prototype.resolve = function () {
            var _a;
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return (_a = this.delegate).resolve.apply(_a, tslib_1.__spread(paths));
        };
        CachedFileSystem.prototype.dirname = function (file) { return this.delegate.dirname(file); };
        CachedFileSystem.prototype.join = function (basePath) {
            var _a;
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return (_a = this.delegate).join.apply(_a, tslib_1.__spread([basePath], paths));
        };
        CachedFileSystem.prototype.relative = function (from, to) {
            return this.delegate.relative(from, to);
        };
        CachedFileSystem.prototype.basename = function (filePath, extension) {
            return this.delegate.basename(filePath, extension);
        };
        CachedFileSystem.prototype.realpath = function (filePath) { return this.delegate.realpath(filePath); };
        CachedFileSystem.prototype.getDefaultLibLocation = function () { return this.delegate.getDefaultLibLocation(); };
        CachedFileSystem.prototype.normalize = function (path) { return this.delegate.normalize(path); };
        return CachedFileSystem;
    }());
    exports.CachedFileSystem = CachedFileSystem;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkX2ZpbGVfc3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbS9zcmMvY2FjaGVkX2ZpbGVfc3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVVBOzs7Ozs7T0FNRztJQUNIO1FBSUUsMEJBQW9CLFFBQW9CO1lBQXBCLGFBQVEsR0FBUixRQUFRLENBQVk7WUFIaEMsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUNqRCxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRVosQ0FBQztRQUU1QyxpQ0FBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN4RDtZQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUM7UUFDdEMsQ0FBQztRQUVELG1DQUFRLEdBQVIsVUFBUyxJQUFvQjtZQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pDLElBQUk7b0JBQ0YsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO3dCQUNyQywyQ0FBMkM7d0JBQzNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3JDO29CQUNELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJ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Q0FBUSxHQUFSLFVBQStCLElBQU8sRUFBRSxFQUFLO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxtQ0FBUSxHQUFSLFVBQVMsUUFBZ0IsRUFBRSxTQUE0QjtZQUNyRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsbUNBQVEsR0FBUixVQUFTLFFBQXdCLElBQW9CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLGdEQUFxQixHQUFyQixjQUEwQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekYsb0NBQVMsR0FBVCxVQUFnQyxJQUFPLElBQU8sT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsdUJBQUM7SUFBRCxDQUFDLEFBeEhELElBd0hDO0lBeEhZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTdGF0cywgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuXG5cbi8qKlxuICogQSB3cmFwcGVyIGFyb3VuZCBgRmlsZVN5c3RlbWAgdGhhdCBjYWNoZXMgaGl0cyB0byBgZXhpc3RzKClgIGFuZFxuICogYHJlYWRGaWxlKClgIHRvIGltcHJvdmUgcGVyZm9ybWFuY2UuXG4gKlxuICogQmUgYXdhcmUgdGhhdCBhbnkgY2hhbmdlcyB0byB0aGUgZmlsZSBzeXN0ZW0gZnJvbSBvdXRzaWRlIG9mIHRoaXNcbiAqIGNsYXNzIGNvdWxkIGJyZWFrIHRoZSBjYWNoZSwgbGVhdmluZyBpdCB3aXRoIHN0YWxlIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENhY2hlZEZpbGVTeXN0ZW0gaW1wbGVtZW50cyBGaWxlU3lzdGVtIHtcbiAgcHJpdmF0ZSBleGlzdHNDYWNoZSA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIGJvb2xlYW4+KCk7XG4gIHByaXZhdGUgcmVhZEZpbGVDYWNoZSA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIGFueT4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGRlbGVnYXRlOiBGaWxlU3lzdGVtKSB7fVxuXG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIGlmICghdGhpcy5leGlzdHNDYWNoZS5oYXMocGF0aCkpIHtcbiAgICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHBhdGgsIHRoaXMuZGVsZWdhdGUuZXhpc3RzKHBhdGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZXhpc3RzQ2FjaGUuZ2V0KHBhdGgpICE7XG4gIH1cblxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgaWYgKCF0aGlzLnJlYWRGaWxlQ2FjaGUuaGFzKHBhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodGhpcy5sc3RhdChwYXRoKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgLy8gZG9uJ3QgY2FjaGUgdGhlIHZhbHVlIG9mIGEgc3ltYm9saWMgbGlua1xuICAgICAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShwYXRoKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucmVhZEZpbGVDYWNoZS5nZXQocGF0aCk7XG4gICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyByZXN1bHQ7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmcsIGV4Y2x1c2l2ZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShwYXRoLCBkYXRhLCBleGNsdXNpdmUpO1xuICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgZGF0YSk7XG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdHJ1ZSk7XG4gIH1cblxuICByZW1vdmVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5kZWxlZ2F0ZS5yZW1vdmVGaWxlKHBhdGgpO1xuICAgIHRoaXMucmVhZEZpbGVDYWNoZS5kZWxldGUocGF0aCk7XG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgZmFsc2UpO1xuICB9XG5cbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUuc3ltbGluayh0YXJnZXQsIHBhdGgpO1xuICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHBhdGgsIHRydWUpO1xuICB9XG5cbiAgY29weUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUuY29weUZpbGUoZnJvbSwgdG8pO1xuICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHRvLCB0cnVlKTtcbiAgfVxuXG4gIG1vdmVGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLm1vdmVGaWxlKGZyb20sIHRvKTtcbiAgICB0aGlzLmV4aXN0c0NhY2hlLnNldChmcm9tLCBmYWxzZSk7XG4gICAgaWYgKHRoaXMucmVhZEZpbGVDYWNoZS5oYXMoZnJvbSkpIHtcbiAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQodG8sIHRoaXMucmVhZEZpbGVDYWNoZS5nZXQoZnJvbSkpO1xuICAgICAgdGhpcy5yZWFkRmlsZUNhY2hlLmRlbGV0ZShmcm9tKTtcbiAgICB9XG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQodG8sIHRydWUpO1xuICB9XG5cbiAgZW5zdXJlRGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5kZWxlZ2F0ZS5lbnN1cmVEaXIocGF0aCk7XG4gICAgd2hpbGUgKCF0aGlzLmlzUm9vdChwYXRoKSkge1xuICAgICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdHJ1ZSk7XG4gICAgICBwYXRoID0gdGhpcy5kaXJuYW1lKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZURlZXAocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLnJlbW92ZURlZXAocGF0aCk7XG4gICAgLy8gQ2xlYXIgb3V0IGFsbCBjaGlsZHJlbiBvZiB0aGlzIGRpcmVjdG9yeSBmcm9tIHRoZSBleGlzdHMgY2FjaGUuXG4gICAgZm9yIChjb25zdCBwIG9mIHRoaXMuZXhpc3RzQ2FjaGUua2V5cygpKSB7XG4gICAgICBpZiAocC5zdGFydHNXaXRoKHBhdGgpKSB7XG4gICAgICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHBhdGgsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIGxzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHtcbiAgICBjb25zdCBzdGF0ID0gdGhpcy5kZWxlZ2F0ZS5sc3RhdChwYXRoKTtcbiAgICAvLyBpZiB0aGUgYHBhdGhgIGRvZXMgbm90IGV4aXN0IHRoZW4gYGxzdGF0YCB3aWxsIHRocm93biBhbiBlcnJvci5cbiAgICB0aGlzLmV4aXN0c0NhY2hlLnNldChwYXRoLCB0cnVlKTtcbiAgICByZXR1cm4gc3RhdDtcbiAgfVxuXG4gIHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIGNvbnN0IHN0YXQgPSB0aGlzLmRlbGVnYXRlLnN0YXQocGF0aCk7XG4gICAgLy8gaWYgdGhlIGBwYXRoYCBkb2VzIG5vdCBleGlzdCB0aGVuIGBzdGF0YCB3aWxsIHRocm93biBhbiBlcnJvci5cbiAgICB0aGlzLmV4aXN0c0NhY2hlLnNldChwYXRoLCB0cnVlKTtcbiAgICByZXR1cm4gc3RhdDtcbiAgfVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgbWV0aG9kcyBzaW1wbHkgY2FsbCB0aHJvdWdoIHRvIHRoZSBkZWxlZ2F0ZS5cbiAgcmVhZGRpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFBhdGhTZWdtZW50W10geyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkZGlyKHBhdGgpOyB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLnB3ZCgpOyB9XG4gIGNoZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IHRoaXMuZGVsZWdhdGUuY2hkaXIocGF0aCk7IH1cbiAgZXh0bmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudCk6IHN0cmluZyB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmV4dG5hbWUocGF0aCk7IH1cbiAgaXNDYXNlU2Vuc2l0aXZlKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5pc0Nhc2VTZW5zaXRpdmUoKTsgfVxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUuaXNSb290KHBhdGgpOyB9XG4gIGlzUm9vdGVkKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5pc1Jvb3RlZChwYXRoKTsgfVxuICByZXNvbHZlKC4uLnBhdGhzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRoIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVzb2x2ZSguLi5wYXRocyk7IH1cbiAgZGlybmFtZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZmlsZTogVCk6IFQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5kaXJuYW1lKGZpbGUpOyB9XG4gIGpvaW48VCBleHRlbmRzIFBhdGhTdHJpbmc+KGJhc2VQYXRoOiBULCAuLi5wYXRoczogc3RyaW5nW10pOiBUIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5qb2luKGJhc2VQYXRoLCAuLi5wYXRocyk7XG4gIH1cbiAgcmVsYXRpdmU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZyb206IFQsIHRvOiBUKTogUGF0aFNlZ21lbnQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlbGF0aXZlKGZyb20sIHRvKTtcbiAgfVxuICBiYXNlbmFtZShmaWxlUGF0aDogc3RyaW5nLCBleHRlbnNpb24/OiBzdHJpbmd8dW5kZWZpbmVkKTogUGF0aFNlZ21lbnQge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmJhc2VuYW1lKGZpbGVQYXRoLCBleHRlbnNpb24pO1xuICB9XG4gIHJlYWxwYXRoKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHsgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVhbHBhdGgoZmlsZVBhdGgpOyB9XG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiB0aGlzLmRlbGVnYXRlLmdldERlZmF1bHRMaWJMb2NhdGlvbigpOyB9XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IFQgeyByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5ub3JtYWxpemUocGF0aCk7IH1cbn1cbiJdfQ==