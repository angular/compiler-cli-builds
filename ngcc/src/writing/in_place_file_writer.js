(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InPlaceFileWriter = exports.NGCC_BACKUP_EXTENSION = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    exports.NGCC_BACKUP_EXTENSION = '.__ivy_ngcc_bak';
    /**
     * This FileWriter overwrites the transformed file, in-place, while creating
     * a back-up of the original file with an extra `.__ivy_ngcc_bak` extension.
     */
    var InPlaceFileWriter = /** @class */ (function () {
        function InPlaceFileWriter(fs, logger, errorOnFailedEntryPoint) {
            this.fs = fs;
            this.logger = logger;
            this.errorOnFailedEntryPoint = errorOnFailedEntryPoint;
        }
        InPlaceFileWriter.prototype.writeBundle = function (_bundle, transformedFiles, _formatProperties) {
            var _this = this;
            transformedFiles.forEach(function (file) { return _this.writeFileAndBackup(file); });
        };
        InPlaceFileWriter.prototype.revertBundle = function (_entryPoint, transformedFilePaths, _formatProperties) {
            var e_1, _a;
            try {
                for (var transformedFilePaths_1 = tslib_1.__values(transformedFilePaths), transformedFilePaths_1_1 = transformedFilePaths_1.next(); !transformedFilePaths_1_1.done; transformedFilePaths_1_1 = transformedFilePaths_1.next()) {
                    var filePath = transformedFilePaths_1_1.value;
                    this.revertFileAndBackup(filePath);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (transformedFilePaths_1_1 && !transformedFilePaths_1_1.done && (_a = transformedFilePaths_1.return)) _a.call(transformedFilePaths_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        InPlaceFileWriter.prototype.writeFileAndBackup = function (file) {
            this.fs.ensureDir(file_system_1.dirname(file.path));
            var backPath = file_system_1.absoluteFrom("" + file.path + exports.NGCC_BACKUP_EXTENSION);
            if (this.fs.exists(backPath)) {
                if (this.errorOnFailedEntryPoint) {
                    throw new Error("Tried to overwrite " + backPath + " with an ngcc back up file, which is disallowed.");
                }
                else {
                    this.logger.error("Tried to write " + backPath + " with an ngcc back up file but it already exists so not writing, nor backing up, " + file.path + ".\n" +
                        "This error may be because two or more entry-points overlap and ngcc has been asked to process some files more than once.\n" +
                        "You should check other entry-points in this package and set up a config to ignore any that you are not using.");
                }
            }
            else {
                if (this.fs.exists(file.path)) {
                    this.fs.moveFile(file.path, backPath);
                }
                this.fs.writeFile(file.path, file.contents);
            }
        };
        InPlaceFileWriter.prototype.revertFileAndBackup = function (filePath) {
            if (this.fs.exists(filePath)) {
                this.fs.removeFile(filePath);
                var backPath = file_system_1.absoluteFrom("" + filePath + exports.NGCC_BACKUP_EXTENSION);
                if (this.fs.exists(backPath)) {
                    this.fs.moveFile(backPath, filePath);
                }
            }
        };
        return InPlaceFileWriter;
    }());
    exports.InPlaceFileWriter = InPlaceFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5fcGxhY2VfZmlsZV93cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQWlHO0lBUXBGLFFBQUEscUJBQXFCLEdBQUcsaUJBQWlCLENBQUM7SUFDdkQ7OztPQUdHO0lBQ0g7UUFDRSwyQkFDYyxFQUFjLEVBQVksTUFBYyxFQUN4Qyx1QkFBZ0M7WUFEaEMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFZLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDeEMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFTO1FBQUcsQ0FBQztRQUVsRCx1Q0FBVyxHQUFYLFVBQ0ksT0FBeUIsRUFBRSxnQkFBK0IsRUFDMUQsaUJBQTRDO1lBRmhELGlCQUlDO1lBREMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUE3QixDQUE2QixDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVELHdDQUFZLEdBQVosVUFDSSxXQUF1QixFQUFFLG9CQUFzQyxFQUMvRCxpQkFBMkM7OztnQkFDN0MsS0FBdUIsSUFBQSx5QkFBQSxpQkFBQSxvQkFBb0IsQ0FBQSwwREFBQSw0RkFBRTtvQkFBeEMsSUFBTSxRQUFRLGlDQUFBO29CQUNqQixJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3BDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRVMsOENBQWtCLEdBQTVCLFVBQTZCLElBQWlCO1lBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLHFCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEMsSUFBTSxRQUFRLEdBQUcsMEJBQVksQ0FBQyxLQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsNkJBQXVCLENBQUMsQ0FBQztZQUN0RSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QixJQUFJLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtvQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FDWCx3QkFBc0IsUUFBUSxxREFBa0QsQ0FBQyxDQUFDO2lCQUN2RjtxQkFBTTtvQkFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDYixvQkFDSSxRQUFRLHlGQUNSLElBQUksQ0FBQyxJQUFJLFFBQUs7d0JBQ2xCLDRIQUE0SDt3QkFDNUgsK0dBQStHLENBQUMsQ0FBQztpQkFDdEg7YUFDRjtpQkFBTTtnQkFDTCxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDN0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztpQkFDdkM7Z0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDN0M7UUFDSCxDQUFDO1FBRVMsK0NBQW1CLEdBQTdCLFVBQThCLFFBQXdCO1lBQ3BELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUU3QixJQUFNLFFBQVEsR0FBRywwQkFBWSxDQUFDLEtBQUcsUUFBUSxHQUFHLDZCQUF1QixDQUFDLENBQUM7Z0JBQ3JFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztpQkFDdEM7YUFDRjtRQUNILENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFwREQsSUFvREM7SUFwRFksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBkaXJuYW1lLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi4vcmVuZGVyaW5nL3V0aWxzJztcblxuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL2ZpbGVfd3JpdGVyJztcblxuZXhwb3J0IGNvbnN0IE5HQ0NfQkFDS1VQX0VYVEVOU0lPTiA9ICcuX19pdnlfbmdjY19iYWsnO1xuLyoqXG4gKiBUaGlzIEZpbGVXcml0ZXIgb3ZlcndyaXRlcyB0aGUgdHJhbnNmb3JtZWQgZmlsZSwgaW4tcGxhY2UsIHdoaWxlIGNyZWF0aW5nXG4gKiBhIGJhY2stdXAgb2YgdGhlIG9yaWdpbmFsIGZpbGUgd2l0aCBhbiBleHRyYSBgLl9faXZ5X25nY2NfYmFrYCBleHRlbnNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBJblBsYWNlRmlsZVdyaXRlciBpbXBsZW1lbnRzIEZpbGVXcml0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJvdGVjdGVkIGVycm9yT25GYWlsZWRFbnRyeVBvaW50OiBib29sZWFuKSB7fVxuXG4gIHdyaXRlQnVuZGxlKFxuICAgICAgX2J1bmRsZTogRW50cnlQb2ludEJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlczogRmlsZVRvV3JpdGVbXSxcbiAgICAgIF9mb3JtYXRQcm9wZXJ0aWVzPzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgdHJhbnNmb3JtZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGVBbmRCYWNrdXAoZmlsZSkpO1xuICB9XG5cbiAgcmV2ZXJ0QnVuZGxlKFxuICAgICAgX2VudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIHRyYW5zZm9ybWVkRmlsZVBhdGhzOiBBYnNvbHV0ZUZzUGF0aFtdLFxuICAgICAgX2Zvcm1hdFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgdHJhbnNmb3JtZWRGaWxlUGF0aHMpIHtcbiAgICAgIHRoaXMucmV2ZXJ0RmlsZUFuZEJhY2t1cChmaWxlUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHdyaXRlRmlsZUFuZEJhY2t1cChmaWxlOiBGaWxlVG9Xcml0ZSk6IHZvaWQge1xuICAgIHRoaXMuZnMuZW5zdXJlRGlyKGRpcm5hbWUoZmlsZS5wYXRoKSk7XG4gICAgY29uc3QgYmFja1BhdGggPSBhYnNvbHV0ZUZyb20oYCR7ZmlsZS5wYXRofSR7TkdDQ19CQUNLVVBfRVhURU5TSU9OfWApO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhiYWNrUGF0aCkpIHtcbiAgICAgIGlmICh0aGlzLmVycm9yT25GYWlsZWRFbnRyeVBvaW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBUcmllZCB0byBvdmVyd3JpdGUgJHtiYWNrUGF0aH0gd2l0aCBhbiBuZ2NjIGJhY2sgdXAgZmlsZSwgd2hpY2ggaXMgZGlzYWxsb3dlZC5gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgYFRyaWVkIHRvIHdyaXRlICR7XG4gICAgICAgICAgICAgICAgYmFja1BhdGh9IHdpdGggYW4gbmdjYyBiYWNrIHVwIGZpbGUgYnV0IGl0IGFscmVhZHkgZXhpc3RzIHNvIG5vdCB3cml0aW5nLCBub3IgYmFja2luZyB1cCwgJHtcbiAgICAgICAgICAgICAgICBmaWxlLnBhdGh9LlxcbmAgK1xuICAgICAgICAgICAgYFRoaXMgZXJyb3IgbWF5IGJlIGJlY2F1c2UgdHdvIG9yIG1vcmUgZW50cnktcG9pbnRzIG92ZXJsYXAgYW5kIG5nY2MgaGFzIGJlZW4gYXNrZWQgdG8gcHJvY2VzcyBzb21lIGZpbGVzIG1vcmUgdGhhbiBvbmNlLlxcbmAgK1xuICAgICAgICAgICAgYFlvdSBzaG91bGQgY2hlY2sgb3RoZXIgZW50cnktcG9pbnRzIGluIHRoaXMgcGFja2FnZSBhbmQgc2V0IHVwIGEgY29uZmlnIHRvIGlnbm9yZSBhbnkgdGhhdCB5b3UgYXJlIG5vdCB1c2luZy5gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGZpbGUucGF0aCkpIHtcbiAgICAgICAgdGhpcy5mcy5tb3ZlRmlsZShmaWxlLnBhdGgsIGJhY2tQYXRoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZnMud3JpdGVGaWxlKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cyk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHJldmVydEZpbGVBbmRCYWNrdXAoZmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGZpbGVQYXRoKSkge1xuICAgICAgdGhpcy5mcy5yZW1vdmVGaWxlKGZpbGVQYXRoKTtcblxuICAgICAgY29uc3QgYmFja1BhdGggPSBhYnNvbHV0ZUZyb20oYCR7ZmlsZVBhdGh9JHtOR0NDX0JBQ0tVUF9FWFRFTlNJT059YCk7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMoYmFja1BhdGgpKSB7XG4gICAgICAgIHRoaXMuZnMubW92ZUZpbGUoYmFja1BhdGgsIGZpbGVQYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==