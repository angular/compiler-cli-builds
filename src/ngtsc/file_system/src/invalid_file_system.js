(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/invalid_file_system", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The default `FileSystem` that will always fail.
     *
     * This is a way of ensuring that the developer consciously chooses and
     * configures the `FileSystem` before using it; particularly important when
     * considering static functions like `absoluteFrom()` which rely on
     * the `FileSystem` under the hood.
     */
    var InvalidFileSystem = /** @class */ (function () {
        function InvalidFileSystem() {
        }
        InvalidFileSystem.prototype.exists = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.readFile = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.writeFile = function (path, data, exclusive) { throw makeError(); };
        InvalidFileSystem.prototype.removeFile = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.symlink = function (target, path) { throw makeError(); };
        InvalidFileSystem.prototype.readdir = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.lstat = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.stat = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.pwd = function () { throw makeError(); };
        InvalidFileSystem.prototype.chdir = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.extname = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.copyFile = function (from, to) { throw makeError(); };
        InvalidFileSystem.prototype.moveFile = function (from, to) { throw makeError(); };
        InvalidFileSystem.prototype.ensureDir = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.isCaseSensitive = function () { throw makeError(); };
        InvalidFileSystem.prototype.resolve = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            throw makeError();
        };
        InvalidFileSystem.prototype.dirname = function (file) { throw makeError(); };
        InvalidFileSystem.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            throw makeError();
        };
        InvalidFileSystem.prototype.isRoot = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.isRooted = function (path) { throw makeError(); };
        InvalidFileSystem.prototype.relative = function (from, to) { throw makeError(); };
        InvalidFileSystem.prototype.basename = function (filePath, extension) { throw makeError(); };
        InvalidFileSystem.prototype.realpath = function (filePath) { throw makeError(); };
        InvalidFileSystem.prototype.getDefaultLibLocation = function () { throw makeError(); };
        InvalidFileSystem.prototype.normalize = function (path) { throw makeError(); };
        return InvalidFileSystem;
    }());
    exports.InvalidFileSystem = InvalidFileSystem;
    function makeError() {
        return new Error('FileSystem has not been configured. Please call `setFileSystem()` before calling this method.');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52YWxpZF9maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2ludmFsaWRfZmlsZV9zeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQTs7Ozs7OztPQU9HO0lBQ0g7UUFBQTtRQTBCQSxDQUFDO1FBekJDLGtDQUFNLEdBQU4sVUFBTyxJQUFvQixJQUFhLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELG9DQUFRLEdBQVIsVUFBUyxJQUFvQixJQUFZLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELHFDQUFTLEdBQVQsVUFBVSxJQUFvQixFQUFFLElBQVksRUFBRSxTQUFtQixJQUFVLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9GLHNDQUFVLEdBQVYsVUFBVyxJQUFvQixJQUFVLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELG1DQUFPLEdBQVAsVUFBUSxNQUFzQixFQUFFLElBQW9CLElBQVUsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEYsbUNBQU8sR0FBUCxVQUFRLElBQW9CLElBQW1CLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25FLGlDQUFLLEdBQUwsVUFBTSxJQUFvQixJQUFlLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdELGdDQUFJLEdBQUosVUFBSyxJQUFvQixJQUFlLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELCtCQUFHLEdBQUgsY0FBd0IsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsaUNBQUssR0FBTCxVQUFNLElBQW9CLElBQVUsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEQsbUNBQU8sR0FBUCxVQUFRLElBQWdDLElBQVksTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEUsb0NBQVEsR0FBUixVQUFTLElBQW9CLEVBQUUsRUFBa0IsSUFBVSxNQUFNLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRSxvQ0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxFQUFrQixJQUFVLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLHFDQUFTLEdBQVQsVUFBVSxJQUFvQixJQUFVLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELDJDQUFlLEdBQWYsY0FBNkIsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakQsbUNBQU8sR0FBUDtZQUFRLGVBQWtCO2lCQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7Z0JBQWxCLDBCQUFrQjs7WUFBb0IsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUFDLENBQUM7UUFDbEUsbUNBQU8sR0FBUCxVQUE4QixJQUFPLElBQU8sTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEUsZ0NBQUksR0FBSixVQUEyQixRQUFXO1lBQUUsZUFBa0I7aUJBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtnQkFBbEIsOEJBQWtCOztZQUFPLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFBQyxDQUFDO1FBQ3JGLGtDQUFNLEdBQU4sVUFBTyxJQUFvQixJQUFhLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVELG9DQUFRLEdBQVIsVUFBUyxJQUFZLElBQWEsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsb0NBQVEsR0FBUixVQUErQixJQUFPLEVBQUUsRUFBSyxJQUFpQixNQUFNLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixvQ0FBUSxHQUFSLFVBQVMsUUFBZ0IsRUFBRSxTQUFrQixJQUFpQixNQUFNLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixvQ0FBUSxHQUFSLFVBQVMsUUFBd0IsSUFBb0IsTUFBTSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsaURBQXFCLEdBQXJCLGNBQTBDLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELHFDQUFTLEdBQVQsVUFBZ0MsSUFBTyxJQUFPLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLHdCQUFDO0lBQUQsQ0FBQyxBQTFCRCxJQTBCQztJQTFCWSw4Q0FBaUI7SUE0QjlCLFNBQVMsU0FBUztRQUNoQixPQUFPLElBQUksS0FBSyxDQUNaLCtGQUErRixDQUFDLENBQUM7SUFDdkcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTdGF0cywgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGBGaWxlU3lzdGVtYCB0aGF0IHdpbGwgYWx3YXlzIGZhaWwuXG4gKlxuICogVGhpcyBpcyBhIHdheSBvZiBlbnN1cmluZyB0aGF0IHRoZSBkZXZlbG9wZXIgY29uc2Npb3VzbHkgY2hvb3NlcyBhbmRcbiAqIGNvbmZpZ3VyZXMgdGhlIGBGaWxlU3lzdGVtYCBiZWZvcmUgdXNpbmcgaXQ7IHBhcnRpY3VsYXJseSBpbXBvcnRhbnQgd2hlblxuICogY29uc2lkZXJpbmcgc3RhdGljIGZ1bmN0aW9ucyBsaWtlIGBhYnNvbHV0ZUZyb20oKWAgd2hpY2ggcmVseSBvblxuICogdGhlIGBGaWxlU3lzdGVtYCB1bmRlciB0aGUgaG9vZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRGaWxlU3lzdGVtIGltcGxlbWVudHMgRmlsZVN5c3RlbSB7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4geyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxuICByZWFkRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZyB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIHdyaXRlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogc3RyaW5nLCBleGNsdXNpdmU/OiBib29sZWFuKTogdm9pZCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIHJlbW92ZUZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQgeyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXSB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGxzdGF0KHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVN0YXRzIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cyB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGNoZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGV4dG5hbWUocGF0aDogQWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQpOiBzdHJpbmcgeyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxuICBjb3B5RmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIG1vdmVGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgZW5zdXJlRGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGlzQ2FzZVNlbnNpdGl2ZSgpOiBib29sZWFuIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgcmVzb2x2ZSguLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGRpcm5hbWU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZpbGU6IFQpOiBUIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgam9pbjxUIGV4dGVuZHMgUGF0aFN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQgeyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgaXNSb290ZWQocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIHJlbGF0aXZlPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmcm9tOiBULCB0bzogVCk6IFBhdGhTZWdtZW50IHsgdGhyb3cgbWFrZUVycm9yKCk7IH1cbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQgeyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxuICByZWFscGF0aChmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBBYnNvbHV0ZUZzUGF0aCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIGdldERlZmF1bHRMaWJMb2NhdGlvbigpOiBBYnNvbHV0ZUZzUGF0aCB7IHRocm93IG1ha2VFcnJvcigpOyB9XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IFQgeyB0aHJvdyBtYWtlRXJyb3IoKTsgfVxufVxuXG5mdW5jdGlvbiBtYWtlRXJyb3IoKSB7XG4gIHJldHVybiBuZXcgRXJyb3IoXG4gICAgICAnRmlsZVN5c3RlbSBoYXMgbm90IGJlZW4gY29uZmlndXJlZC4gUGxlYXNlIGNhbGwgYHNldEZpbGVTeXN0ZW0oKWAgYmVmb3JlIGNhbGxpbmcgdGhpcyBtZXRob2QuJyk7XG59XG4iXX0=