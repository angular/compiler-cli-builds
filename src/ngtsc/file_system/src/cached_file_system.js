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
        CachedFileSystem.prototype.invalidateCaches = function (path) {
            this.readFileCache.delete(path);
            this.existsCache.delete(path);
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
            this.existsCache.set(to, true);
            if (this.readFileCache.has(from)) {
                this.readFileCache.set(to, this.readFileCache.get(from));
                this.readFileCache.delete(from);
            }
            else {
                this.readFileCache.delete(to);
            }
        };
        CachedFileSystem.prototype.ensureDir = function (path) {
            this.delegate.ensureDir(path);
            while (!this.isRoot(path)) {
                this.existsCache.set(path, true);
                path = this.dirname(path);
            }
        };
        CachedFileSystem.prototype.removeDeep = function (path) {
            var e_1, _a, e_2, _b;
            this.delegate.removeDeep(path);
            try {
                // Clear out this directory and all its children from the `exists` cache.
                for (var _c = tslib_1.__values(this.existsCache.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var p = _d.value;
                    if (p.startsWith(path)) {
                        this.existsCache.set(p, false);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                // Clear out this directory and all its children from the `readFile` cache.
                for (var _e = tslib_1.__values(this.readFileCache.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var p = _f.value;
                    if (p.startsWith(path)) {
                        this.readFileCache.delete(p);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
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
        CachedFileSystem.prototype.readdir = function (path) {
            return this.delegate.readdir(path);
        };
        CachedFileSystem.prototype.pwd = function () {
            return this.delegate.pwd();
        };
        CachedFileSystem.prototype.chdir = function (path) {
            this.delegate.chdir(path);
        };
        CachedFileSystem.prototype.extname = function (path) {
            return this.delegate.extname(path);
        };
        CachedFileSystem.prototype.isCaseSensitive = function () {
            return this.delegate.isCaseSensitive();
        };
        CachedFileSystem.prototype.isRoot = function (path) {
            return this.delegate.isRoot(path);
        };
        CachedFileSystem.prototype.isRooted = function (path) {
            return this.delegate.isRooted(path);
        };
        CachedFileSystem.prototype.resolve = function () {
            var _a;
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            return (_a = this.delegate).resolve.apply(_a, tslib_1.__spread(paths));
        };
        CachedFileSystem.prototype.dirname = function (file) {
            return this.delegate.dirname(file);
        };
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
        CachedFileSystem.prototype.realpath = function (filePath) {
            return this.delegate.realpath(filePath);
        };
        CachedFileSystem.prototype.getDefaultLibLocation = function () {
            return this.delegate.getDefaultLibLocation();
        };
        CachedFileSystem.prototype.normalize = function (path) {
            return this.delegate.normalize(path);
        };
        return CachedFileSystem;
    }());
    exports.CachedFileSystem = CachedFileSystem;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkX2ZpbGVfc3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9maWxlX3N5c3RlbS9zcmMvY2FjaGVkX2ZpbGVfc3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVVBOzs7Ozs7T0FNRztJQUNIO1FBSUUsMEJBQW9CLFFBQW9CO1lBQXBCLGFBQVEsR0FBUixRQUFRLENBQVk7WUFIaEMsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUNqRCxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRVosQ0FBQztRQUU1QyxpQ0FBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN4RDtZQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7UUFDckMsQ0FBQztRQUVELDJDQUFnQixHQUFoQixVQUFpQixJQUFvQjtZQUNuQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBRUQsbUNBQVEsR0FBUixVQUFTLElBQW9CO1lBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakMsSUFBSTtvQkFDRixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENB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LElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFqS0QsSUFpS0M7SUFqS1ksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN0YXRzLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgUGF0aFN0cmluZ30gZnJvbSAnLi90eXBlcyc7XG5cblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGBGaWxlU3lzdGVtYCB0aGF0IGNhY2hlcyBoaXRzIHRvIGBleGlzdHMoKWAgYW5kXG4gKiBgcmVhZEZpbGUoKWAgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZS5cbiAqXG4gKiBCZSBhd2FyZSB0aGF0IGFueSBjaGFuZ2VzIHRvIHRoZSBmaWxlIHN5c3RlbSBmcm9tIG91dHNpZGUgb2YgdGhpc1xuICogY2xhc3MgY291bGQgYnJlYWsgdGhlIGNhY2hlLCBsZWF2aW5nIGl0IHdpdGggc3RhbGUgdmFsdWVzLlxuICovXG5leHBvcnQgY2xhc3MgQ2FjaGVkRmlsZVN5c3RlbSBpbXBsZW1lbnRzIEZpbGVTeXN0ZW0ge1xuICBwcml2YXRlIGV4aXN0c0NhY2hlID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgYm9vbGVhbj4oKTtcbiAgcHJpdmF0ZSByZWFkRmlsZUNhY2hlID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgYW55PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZGVsZWdhdGU6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgZXhpc3RzKHBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLmV4aXN0c0NhY2hlLmhhcyhwYXRoKSkge1xuICAgICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdGhpcy5kZWxlZ2F0ZS5leGlzdHMocGF0aCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5leGlzdHNDYWNoZS5nZXQocGF0aCkhO1xuICB9XG5cbiAgaW52YWxpZGF0ZUNhY2hlcyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMucmVhZEZpbGVDYWNoZS5kZWxldGUocGF0aCk7XG4gICAgdGhpcy5leGlzdHNDYWNoZS5kZWxldGUocGF0aCk7XG4gIH1cblxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7XG4gICAgaWYgKCF0aGlzLnJlYWRGaWxlQ2FjaGUuaGFzKHBhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodGhpcy5sc3RhdChwYXRoKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgLy8gZG9uJ3QgY2FjaGUgdGhlIHZhbHVlIG9mIGEgc3ltYm9saWMgbGlua1xuICAgICAgICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnJlYWRGaWxlKHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgdGhpcy5kZWxlZ2F0ZS5yZWFkRmlsZShwYXRoKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucmVhZEZpbGVDYWNoZS5nZXQocGF0aCk7XG4gICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyByZXN1bHQ7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmcsIGV4Y2x1c2l2ZT86IGJvb2xlYW4pOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLndyaXRlRmlsZShwYXRoLCBkYXRhLCBleGNsdXNpdmUpO1xuICAgIHRoaXMucmVhZEZpbGVDYWNoZS5zZXQocGF0aCwgZGF0YSk7XG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdHJ1ZSk7XG4gIH1cblxuICByZW1vdmVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5kZWxlZ2F0ZS5yZW1vdmVGaWxlKHBhdGgpO1xuICAgIHRoaXMucmVhZEZpbGVDYWNoZS5kZWxldGUocGF0aCk7XG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgZmFsc2UpO1xuICB9XG5cbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUuc3ltbGluayh0YXJnZXQsIHBhdGgpO1xuICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHBhdGgsIHRydWUpO1xuICB9XG5cbiAgY29weUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUuY29weUZpbGUoZnJvbSwgdG8pO1xuICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KHRvLCB0cnVlKTtcbiAgfVxuXG4gIG1vdmVGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLm1vdmVGaWxlKGZyb20sIHRvKTtcblxuICAgIHRoaXMuZXhpc3RzQ2FjaGUuc2V0KGZyb20sIGZhbHNlKTtcbiAgICB0aGlzLmV4aXN0c0NhY2hlLnNldCh0bywgdHJ1ZSk7XG5cbiAgICBpZiAodGhpcy5yZWFkRmlsZUNhY2hlLmhhcyhmcm9tKSkge1xuICAgICAgdGhpcy5yZWFkRmlsZUNhY2hlLnNldCh0bywgdGhpcy5yZWFkRmlsZUNhY2hlLmdldChmcm9tKSk7XG4gICAgICB0aGlzLnJlYWRGaWxlQ2FjaGUuZGVsZXRlKGZyb20pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlYWRGaWxlQ2FjaGUuZGVsZXRlKHRvKTtcbiAgICB9XG4gIH1cblxuICBlbnN1cmVEaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLmVuc3VyZURpcihwYXRoKTtcbiAgICB3aGlsZSAoIXRoaXMuaXNSb290KHBhdGgpKSB7XG4gICAgICB0aGlzLmV4aXN0c0NhY2hlLnNldChwYXRoLCB0cnVlKTtcbiAgICAgIHBhdGggPSB0aGlzLmRpcm5hbWUocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlRGVlcChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUucmVtb3ZlRGVlcChwYXRoKTtcblxuICAgIC8vIENsZWFyIG91dCB0aGlzIGRpcmVjdG9yeSBhbmQgYWxsIGl0cyBjaGlsZHJlbiBmcm9tIHRoZSBgZXhpc3RzYCBjYWNoZS5cbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5leGlzdHNDYWNoZS5rZXlzKCkpIHtcbiAgICAgIGlmIChwLnN0YXJ0c1dpdGgocGF0aCkpIHtcbiAgICAgICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENsZWFyIG91dCB0aGlzIGRpcmVjdG9yeSBhbmQgYWxsIGl0cyBjaGlsZHJlbiBmcm9tIHRoZSBgcmVhZEZpbGVgIGNhY2hlLlxuICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnJlYWRGaWxlQ2FjaGUua2V5cygpKSB7XG4gICAgICBpZiAocC5zdGFydHNXaXRoKHBhdGgpKSB7XG4gICAgICAgIHRoaXMucmVhZEZpbGVDYWNoZS5kZWxldGUocCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICBsc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cyB7XG4gICAgY29uc3Qgc3RhdCA9IHRoaXMuZGVsZWdhdGUubHN0YXQocGF0aCk7XG4gICAgLy8gaWYgdGhlIGBwYXRoYCBkb2VzIG5vdCBleGlzdCB0aGVuIGBsc3RhdGAgd2lsbCB0aHJvd24gYW4gZXJyb3IuXG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdHJ1ZSk7XG4gICAgcmV0dXJuIHN0YXQ7XG4gIH1cblxuICBzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHtcbiAgICBjb25zdCBzdGF0ID0gdGhpcy5kZWxlZ2F0ZS5zdGF0KHBhdGgpO1xuICAgIC8vIGlmIHRoZSBgcGF0aGAgZG9lcyBub3QgZXhpc3QgdGhlbiBgc3RhdGAgd2lsbCB0aHJvd24gYW4gZXJyb3IuXG4gICAgdGhpcy5leGlzdHNDYWNoZS5zZXQocGF0aCwgdHJ1ZSk7XG4gICAgcmV0dXJuIHN0YXQ7XG4gIH1cblxuICAvLyBUaGUgZm9sbG93aW5nIG1ldGhvZHMgc2ltcGx5IGNhbGwgdGhyb3VnaCB0byB0aGUgZGVsZWdhdGUuXG4gIHJlYWRkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBQYXRoU2VnbWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWFkZGlyKHBhdGgpO1xuICB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucHdkKCk7XG4gIH1cbiAgY2hkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLmNoZGlyKHBhdGgpO1xuICB9XG4gIGV4dG5hbWUocGF0aDogQWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmV4dG5hbWUocGF0aCk7XG4gIH1cbiAgaXNDYXNlU2Vuc2l0aXZlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmlzQ2FzZVNlbnNpdGl2ZSgpO1xuICB9XG4gIGlzUm9vdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmlzUm9vdChwYXRoKTtcbiAgfVxuICBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5pc1Jvb3RlZChwYXRoKTtcbiAgfVxuICByZXNvbHZlKC4uLnBhdGhzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZXNvbHZlKC4uLnBhdGhzKTtcbiAgfVxuICBkaXJuYW1lPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmaWxlOiBUKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZGlybmFtZShmaWxlKTtcbiAgfVxuICBqb2luPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihiYXNlUGF0aDogVCwgLi4ucGF0aHM6IHN0cmluZ1tdKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuam9pbihiYXNlUGF0aCwgLi4ucGF0aHMpO1xuICB9XG4gIHJlbGF0aXZlPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmcm9tOiBULCB0bzogVCk6IFBhdGhTZWdtZW50IHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5yZWxhdGl2ZShmcm9tLCB0byk7XG4gIH1cbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nfHVuZGVmaW5lZCk6IFBhdGhTZWdtZW50IHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5iYXNlbmFtZShmaWxlUGF0aCwgZXh0ZW5zaW9uKTtcbiAgfVxuICByZWFscGF0aChmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUucmVhbHBhdGgoZmlsZVBhdGgpO1xuICB9XG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0RGVmYXVsdExpYkxvY2F0aW9uKCk7XG4gIH1cbiAgbm9ybWFsaXplPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihwYXRoOiBUKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUubm9ybWFsaXplKHBhdGgpO1xuICB9XG59XG4iXX0=