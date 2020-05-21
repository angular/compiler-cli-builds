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
    exports.InvalidFileSystem = void 0;
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
        InvalidFileSystem.prototype.exists = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.readFile = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.readFileBuffer = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.writeFile = function (path, data, exclusive) {
            throw makeError();
        };
        InvalidFileSystem.prototype.removeFile = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.symlink = function (target, path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.readdir = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.lstat = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.stat = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.pwd = function () {
            throw makeError();
        };
        InvalidFileSystem.prototype.chdir = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.extname = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.copyFile = function (from, to) {
            throw makeError();
        };
        InvalidFileSystem.prototype.moveFile = function (from, to) {
            throw makeError();
        };
        InvalidFileSystem.prototype.ensureDir = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.removeDeep = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.isCaseSensitive = function () {
            throw makeError();
        };
        InvalidFileSystem.prototype.resolve = function () {
            var paths = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                paths[_i] = arguments[_i];
            }
            throw makeError();
        };
        InvalidFileSystem.prototype.dirname = function (file) {
            throw makeError();
        };
        InvalidFileSystem.prototype.join = function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            throw makeError();
        };
        InvalidFileSystem.prototype.isRoot = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.isRooted = function (path) {
            throw makeError();
        };
        InvalidFileSystem.prototype.relative = function (from, to) {
            throw makeError();
        };
        InvalidFileSystem.prototype.basename = function (filePath, extension) {
            throw makeError();
        };
        InvalidFileSystem.prototype.realpath = function (filePath) {
            throw makeError();
        };
        InvalidFileSystem.prototype.getDefaultLibLocation = function () {
            throw makeError();
        };
        InvalidFileSystem.prototype.normalize = function (path) {
            throw makeError();
        };
        return InvalidFileSystem;
    }());
    exports.InvalidFileSystem = InvalidFileSystem;
    function makeError() {
        return new Error('FileSystem has not been configured. Please call `setFileSystem()` before calling this method.');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52YWxpZF9maWxlX3N5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2ludmFsaWRfZmlsZV9zeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0E7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7UUFrRkEsQ0FBQztRQWpGQyxrQ0FBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0Qsb0NBQVEsR0FBUixVQUFTLElBQW9CO1lBQzNCLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELDBDQUFjLEdBQWQsVUFBZSxJQUFvQjtZQUNqQyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxxQ0FBUyxHQUFULFVBQVUsSUFBb0IsRUFBRSxJQUFtQixFQUFFLFNBQW1CO1lBQ3RFLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELHNDQUFVLEdBQVYsVUFBVyxJQUFvQjtZQUM3QixNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxtQ0FBTyxHQUFQLFVBQVEsTUFBc0IsRUFBRSxJQUFvQjtZQUNsRCxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxtQ0FBTyxHQUFQLFVBQVEsSUFBb0I7WUFDMUIsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0QsaUNBQUssR0FBTCxVQUFNLElBQW9CO1lBQ3hCLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELGdDQUFJLEdBQUosVUFBSyxJQUFvQjtZQUN2QixNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCwrQkFBRyxHQUFIO1lBQ0UsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0QsaUNBQUssR0FBTCxVQUFNLElBQW9CO1lBQ3hCLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELG1DQUFPLEdBQVAsVUFBUSxJQUFnQztZQUN0QyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxvQ0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxFQUFrQjtZQUMvQyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxvQ0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxFQUFrQjtZQUMvQyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxxQ0FBUyxHQUFULFVBQVUsSUFBb0I7WUFDNUIsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0Qsc0NBQVUsR0FBVixVQUFXLElBQW9CO1lBQzdCLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELDJDQUFlLEdBQWY7WUFDRSxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxtQ0FBTyxHQUFQO1lBQVEsZUFBa0I7aUJBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtnQkFBbEIsMEJBQWtCOztZQUN4QixNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxtQ0FBTyxHQUFQLFVBQThCLElBQU87WUFDbkMsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0QsZ0NBQUksR0FBSixVQUEyQixRQUFXO1lBQUUsZUFBa0I7aUJBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtnQkFBbEIsOEJBQWtCOztZQUN4RCxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxrQ0FBTSxHQUFOLFVBQU8sSUFBb0I7WUFDekIsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0Qsb0NBQVEsR0FBUixVQUFTLElBQVk7WUFDbkIsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0Qsb0NBQVEsR0FBUixVQUErQixJQUFPLEVBQUUsRUFBSztZQUMzQyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxvQ0FBUSxHQUFSLFVBQVMsUUFBZ0IsRUFBRSxTQUFrQjtZQUMzQyxNQUFNLFNBQVMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxvQ0FBUSxHQUFSLFVBQVMsUUFBd0I7WUFDL0IsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0QsaURBQXFCLEdBQXJCO1lBQ0UsTUFBTSxTQUFTLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBQ0QscUNBQVMsR0FBVCxVQUFnQyxJQUFPO1lBQ3JDLE1BQU0sU0FBUyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQWxGRCxJQWtGQztJQWxGWSw4Q0FBaUI7SUFvRjlCLFNBQVMsU0FBUztRQUNoQixPQUFPLElBQUksS0FBSyxDQUNaLCtGQUErRixDQUFDLENBQUM7SUFDdkcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTdGF0cywgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGBGaWxlU3lzdGVtYCB0aGF0IHdpbGwgYWx3YXlzIGZhaWwuXG4gKlxuICogVGhpcyBpcyBhIHdheSBvZiBlbnN1cmluZyB0aGF0IHRoZSBkZXZlbG9wZXIgY29uc2Npb3VzbHkgY2hvb3NlcyBhbmRcbiAqIGNvbmZpZ3VyZXMgdGhlIGBGaWxlU3lzdGVtYCBiZWZvcmUgdXNpbmcgaXQ7IHBhcnRpY3VsYXJseSBpbXBvcnRhbnQgd2hlblxuICogY29uc2lkZXJpbmcgc3RhdGljIGZ1bmN0aW9ucyBsaWtlIGBhYnNvbHV0ZUZyb20oKWAgd2hpY2ggcmVseSBvblxuICogdGhlIGBGaWxlU3lzdGVtYCB1bmRlciB0aGUgaG9vZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRGaWxlU3lzdGVtIGltcGxlbWVudHMgRmlsZVN5c3RlbSB7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHJlYWRGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICByZWFkRmlsZUJ1ZmZlcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEJ1ZmZlciB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgd3JpdGVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBzdHJpbmd8QnVmZmVyLCBleGNsdXNpdmU/OiBib29sZWFuKTogdm9pZCB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgcmVtb3ZlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHN5bWxpbmsodGFyZ2V0OiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXSB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHMge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgY2hkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBleHRuYW1lKHBhdGg6IEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50KTogc3RyaW5nIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBjb3B5RmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgbW92ZUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIGVuc3VyZURpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHJlbW92ZURlZXAocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBpc0Nhc2VTZW5zaXRpdmUoKTogYm9vbGVhbiB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgcmVzb2x2ZSguLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgZGlybmFtZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZmlsZTogVCk6IFQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIGpvaW48VCBleHRlbmRzIFBhdGhTdHJpbmc+KGJhc2VQYXRoOiBULCAuLi5wYXRoczogc3RyaW5nW10pOiBUIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICByZWxhdGl2ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZnJvbTogVCwgdG86IFQpOiBQYXRoU2VnbWVudCB7XG4gICAgdGhyb3cgbWFrZUVycm9yKCk7XG4gIH1cbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIHJlYWxwYXRoKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICB0aHJvdyBtYWtlRXJyb3IoKTtcbiAgfVxuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IFQge1xuICAgIHRocm93IG1ha2VFcnJvcigpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VFcnJvcigpIHtcbiAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICAgICdGaWxlU3lzdGVtIGhhcyBub3QgYmVlbiBjb25maWd1cmVkLiBQbGVhc2UgY2FsbCBgc2V0RmlsZVN5c3RlbSgpYCBiZWZvcmUgY2FsbGluZyB0aGlzIG1ldGhvZC4nKTtcbn1cbiJdfQ==