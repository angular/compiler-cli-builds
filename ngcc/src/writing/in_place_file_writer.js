(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * This FileWriter overwrites the transformed file, in-place, while creating
     * a back-up of the original file with an extra `.bak` extension.
     */
    var InPlaceFileWriter = /** @class */ (function () {
        function InPlaceFileWriter(fs) {
            this.fs = fs;
        }
        InPlaceFileWriter.prototype.writeBundle = function (_bundle, transformedFiles, _formatProperties) {
            var _this = this;
            transformedFiles.forEach(function (file) { return _this.writeFileAndBackup(file); });
        };
        InPlaceFileWriter.prototype.writeFileAndBackup = function (file) {
            this.fs.ensureDir(file_system_1.dirname(file.path));
            var backPath = file_system_1.absoluteFrom(file.path + ".__ivy_ngcc_bak");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5fcGxhY2VfZmlsZV93cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDJFQUFpRjtJQU1qRjs7O09BR0c7SUFDSDtRQUNFLDJCQUFzQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFFeEMsdUNBQVcsR0FBWCxVQUNJLE9BQXlCLEVBQUUsZ0JBQStCLEVBQzFELGlCQUE0QztZQUZoRCxpQkFJQztZQURDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBN0IsQ0FBNkIsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFUyw4Q0FBa0IsR0FBNUIsVUFBNkIsSUFBaUI7WUFDNUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN0QyxJQUFNLFFBQVEsR0FBRywwQkFBWSxDQUFJLElBQUksQ0FBQyxJQUFJLG9CQUFpQixDQUFDLENBQUM7WUFDN0QsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxJQUFJLEtBQUssQ0FDWCx3QkFBc0IsUUFBUSxxREFBa0QsQ0FBQyxDQUFDO2FBQ3ZGO1lBQ0QsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDdkM7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBckJELElBcUJDO0lBckJZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnRKc29uUHJvcGVydHl9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4uL3JlbmRlcmluZy91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoaXMgRmlsZVdyaXRlciBvdmVyd3JpdGVzIHRoZSB0cmFuc2Zvcm1lZCBmaWxlLCBpbi1wbGFjZSwgd2hpbGUgY3JlYXRpbmdcbiAqIGEgYmFjay11cCBvZiB0aGUgb3JpZ2luYWwgZmlsZSB3aXRoIGFuIGV4dHJhIGAuYmFrYCBleHRlbnNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBJblBsYWNlRmlsZVdyaXRlciBpbXBsZW1lbnRzIEZpbGVXcml0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgd3JpdGVCdW5kbGUoXG4gICAgICBfYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzOiBGaWxlVG9Xcml0ZVtdLFxuICAgICAgX2Zvcm1hdFByb3BlcnRpZXM/OiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICB0cmFuc2Zvcm1lZEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZUFuZEJhY2t1cChmaWxlKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgd3JpdGVGaWxlQW5kQmFja3VwKGZpbGU6IEZpbGVUb1dyaXRlKTogdm9pZCB7XG4gICAgdGhpcy5mcy5lbnN1cmVEaXIoZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGFic29sdXRlRnJvbShgJHtmaWxlLnBhdGh9Ll9faXZ5X25nY2NfYmFrYCk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGJhY2tQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcmllZCB0byBvdmVyd3JpdGUgJHtiYWNrUGF0aH0gd2l0aCBhbiBuZ2NjIGJhY2sgdXAgZmlsZSwgd2hpY2ggaXMgZGlzYWxsb3dlZC5gKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGZpbGUucGF0aCkpIHtcbiAgICAgIHRoaXMuZnMubW92ZUZpbGUoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHRoaXMuZnMud3JpdGVGaWxlKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cyk7XG4gIH1cbn1cbiJdfQ==