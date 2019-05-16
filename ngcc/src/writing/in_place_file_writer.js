(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", ["require", "exports", "@angular/compiler-cli/src/ngtsc/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    /**
     * This FileWriter overwrites the transformed file, in-place, while creating
     * a back-up of the original file with an extra `.bak` extension.
     */
    var InPlaceFileWriter = /** @class */ (function () {
        function InPlaceFileWriter(fs) {
            this.fs = fs;
        }
        InPlaceFileWriter.prototype.writeBundle = function (_entryPoint, _bundle, transformedFiles) {
            var _this = this;
            transformedFiles.forEach(function (file) { return _this.writeFileAndBackup(file); });
        };
        InPlaceFileWriter.prototype.writeFileAndBackup = function (file) {
            this.fs.ensureDir(path_1.AbsoluteFsPath.dirname(file.path));
            var backPath = path_1.AbsoluteFsPath.fromUnchecked(file.path + ".__ivy_ngcc_bak");
            if (this.fs.exists(backPath)) {
                throw new Error("Tried to overwrite " + backPath + " with an ngcc back up file, which is disallowed.");
            }
            if (this.fs.exists(file.path)) {
                this.fs.moveFile(file.path, backPath);
            }
            this.fs.writeFile(file.path, file.contents);
        };
        return InPlaceFileWriter;
    }());
    exports.InPlaceFileWriter = InPlaceFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5fcGxhY2VfZmlsZV93cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDZEQUF1RDtJQU92RDs7O09BR0c7SUFDSDtRQUNFLDJCQUFzQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFFeEMsdUNBQVcsR0FBWCxVQUFZLFdBQXVCLEVBQUUsT0FBeUIsRUFBRSxnQkFBK0I7WUFBL0YsaUJBRUM7WUFEQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxLQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQTdCLENBQTZCLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRVMsOENBQWtCLEdBQTVCLFVBQTZCLElBQWlCO1lBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLHFCQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JELElBQU0sUUFBUSxHQUFHLHFCQUFjLENBQUMsYUFBYSxDQUFJLElBQUksQ0FBQyxJQUFJLG9CQUFpQixDQUFDLENBQUM7WUFDN0UsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxJQUFJLEtBQUssQ0FDWCx3QkFBc0IsUUFBUSxxREFBa0QsQ0FBQyxDQUFDO2FBQ3ZGO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDdkM7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBbkJELElBbUJDO0lBbkJZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4uL3JlbmRlcmluZy91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoaXMgRmlsZVdyaXRlciBvdmVyd3JpdGVzIHRoZSB0cmFuc2Zvcm1lZCBmaWxlLCBpbi1wbGFjZSwgd2hpbGUgY3JlYXRpbmdcbiAqIGEgYmFjay11cCBvZiB0aGUgb3JpZ2luYWwgZmlsZSB3aXRoIGFuIGV4dHJhIGAuYmFrYCBleHRlbnNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBJblBsYWNlRmlsZVdyaXRlciBpbXBsZW1lbnRzIEZpbGVXcml0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgd3JpdGVCdW5kbGUoX2VudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIF9idW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUsIHRyYW5zZm9ybWVkRmlsZXM6IEZpbGVUb1dyaXRlW10pIHtcbiAgICB0cmFuc2Zvcm1lZEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZUFuZEJhY2t1cChmaWxlKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgd3JpdGVGaWxlQW5kQmFja3VwKGZpbGU6IEZpbGVUb1dyaXRlKTogdm9pZCB7XG4gICAgdGhpcy5mcy5lbnN1cmVEaXIoQWJzb2x1dGVGc1BhdGguZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoYCR7ZmlsZS5wYXRofS5fX2l2eV9uZ2NjX2Jha2ApO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhiYWNrUGF0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVHJpZWQgdG8gb3ZlcndyaXRlICR7YmFja1BhdGh9IHdpdGggYW4gbmdjYyBiYWNrIHVwIGZpbGUsIHdoaWNoIGlzIGRpc2FsbG93ZWQuYCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhmaWxlLnBhdGgpKSB7XG4gICAgICB0aGlzLmZzLm1vdmVGaWxlKGZpbGUucGF0aCwgYmFja1BhdGgpO1xuICAgIH1cbiAgICB0aGlzLmZzLndyaXRlRmlsZShmaWxlLnBhdGgsIGZpbGUuY29udGVudHMpO1xuICB9XG59XG4iXX0=