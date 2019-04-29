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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5fcGxhY2VfZmlsZV93cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDZEQUF1RDtJQU92RDs7O09BR0c7SUFDSDtRQUNFLDJCQUFzQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFFeEMsdUNBQVcsR0FBWCxVQUFZLFdBQXVCLEVBQUUsT0FBeUIsRUFBRSxnQkFBNEI7WUFBNUYsaUJBRUM7WUFEQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxLQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQTdCLENBQTZCLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRVMsOENBQWtCLEdBQTVCLFVBQTZCLElBQWM7WUFDekMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckQsSUFBTSxRQUFRLEdBQUcscUJBQWMsQ0FBQyxhQUFhLENBQUksSUFBSSxDQUFDLElBQUksb0JBQWlCLENBQUMsQ0FBQztZQUM3RSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksS0FBSyxDQUNYLHdCQUFzQixRQUFRLHFEQUFrRCxDQUFDLENBQUM7YUFDdkY7WUFDRCxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN2QztZQUNELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFuQkQsSUFtQkM7SUFuQlksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtGaWxlSW5mb30gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi9maWxlX3dyaXRlcic7XG5cbi8qKlxuICogVGhpcyBGaWxlV3JpdGVyIG92ZXJ3cml0ZXMgdGhlIHRyYW5zZm9ybWVkIGZpbGUsIGluLXBsYWNlLCB3aGlsZSBjcmVhdGluZ1xuICogYSBiYWNrLXVwIG9mIHRoZSBvcmlnaW5hbCBmaWxlIHdpdGggYW4gZXh0cmEgYC5iYWtgIGV4dGVuc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIEluUGxhY2VGaWxlV3JpdGVyIGltcGxlbWVudHMgRmlsZVdyaXRlciB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSkge31cblxuICB3cml0ZUJ1bmRsZShfZW50cnlQb2ludDogRW50cnlQb2ludCwgX2J1bmRsZTogRW50cnlQb2ludEJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlczogRmlsZUluZm9bXSkge1xuICAgIHRyYW5zZm9ybWVkRmlsZXMuZm9yRWFjaChmaWxlID0+IHRoaXMud3JpdGVGaWxlQW5kQmFja3VwKGZpbGUpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCB3cml0ZUZpbGVBbmRCYWNrdXAoZmlsZTogRmlsZUluZm8pOiB2b2lkIHtcbiAgICB0aGlzLmZzLmVuc3VyZURpcihBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKGZpbGUucGF0aCkpO1xuICAgIGNvbnN0IGJhY2tQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChgJHtmaWxlLnBhdGh9Ll9faXZ5X25nY2NfYmFrYCk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGJhY2tQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcmllZCB0byBvdmVyd3JpdGUgJHtiYWNrUGF0aH0gd2l0aCBhbiBuZ2NjIGJhY2sgdXAgZmlsZSwgd2hpY2ggaXMgZGlzYWxsb3dlZC5gKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGZpbGUucGF0aCkpIHtcbiAgICAgIHRoaXMuZnMubW92ZUZpbGUoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHRoaXMuZnMud3JpdGVGaWxlKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cyk7XG4gIH1cbn1cbiJdfQ==