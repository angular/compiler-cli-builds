/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", ["require", "exports", "tslib", "canonical-path", "fs", "shelljs", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var shelljs_1 = require("shelljs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var NGCC_DIRECTORY = '__ivy_ngcc__';
    /**
     * This FileWriter creates a copy of the original entry-point, then writes the transformed
     * files onto the files in this copy, and finally updates the package.json with a new
     * entry-point format property that points to this new entry-point.
     *
     * If there are transformed typings files in this bundle, they are updated in-place (see the
     * `InPlaceFileWriter`).
     */
    var NewEntryPointFileWriter = /** @class */ (function (_super) {
        tslib_1.__extends(NewEntryPointFileWriter, _super);
        function NewEntryPointFileWriter() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        NewEntryPointFileWriter.prototype.writeBundle = function (entryPoint, bundle, transformedFiles) {
            var _this = this;
            // The new folder is at the root of the overall package
            var relativeEntryPointPath = canonical_path_1.relative(entryPoint.package, entryPoint.path);
            var relativeNewDir = canonical_path_1.join(NGCC_DIRECTORY, relativeEntryPointPath);
            var newDir = path_1.AbsoluteFsPath.fromUnchecked(canonical_path_1.join(entryPoint.package, relativeNewDir));
            this.copyBundle(bundle, entryPoint.path, newDir);
            transformedFiles.forEach(function (file) { return _this.writeFile(file, entryPoint.path, newDir); });
            this.updatePackageJson(entryPoint, bundle.formatProperty, newDir);
        };
        NewEntryPointFileWriter.prototype.copyBundle = function (bundle, entryPointPath, newDir) {
            bundle.src.program.getSourceFiles().forEach(function (sourceFile) {
                var relativePath = canonical_path_1.relative(entryPointPath, sourceFile.fileName);
                var newFilePath = canonical_path_1.join(newDir, relativePath);
                shelljs_1.mkdir('-p', canonical_path_1.dirname(newFilePath));
                shelljs_1.cp(sourceFile.fileName, newFilePath);
            });
        };
        NewEntryPointFileWriter.prototype.writeFile = function (file, entryPointPath, newDir) {
            if (typescript_1.isDtsPath(file.path)) {
                _super.prototype.writeFileAndBackup.call(this, file);
            }
            else {
                var relativePath = canonical_path_1.relative(entryPointPath, file.path);
                var newFilePath = canonical_path_1.join(newDir, relativePath);
                shelljs_1.mkdir('-p', canonical_path_1.dirname(newFilePath));
                fs_1.writeFileSync(newFilePath, file.contents, 'utf8');
            }
        };
        NewEntryPointFileWriter.prototype.updatePackageJson = function (entryPoint, formatProperty, newDir) {
            var bundlePath = entryPoint.packageJson[formatProperty];
            var newBundlePath = canonical_path_1.relative(entryPoint.path, canonical_path_1.join(newDir, bundlePath));
            entryPoint.packageJson[formatProperty + '_ivy_ngcc'] = newBundlePath;
            fs_1.writeFileSync(canonical_path_1.join(entryPoint.path, 'package.json'), JSON.stringify(entryPoint.packageJson));
        };
        return NewEntryPointFileWriter;
    }(in_place_file_writer_1.InPlaceFileWriter));
    exports.NewEntryPointFileWriter = NewEntryPointFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILGlEQUF1RDtJQUN2RCx5QkFBaUM7SUFDakMsbUNBQWtDO0lBRWxDLDZEQUF1RDtJQUN2RCxrRkFBaUU7SUFLakUsb0dBQXlEO0lBRXpELElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUV0Qzs7Ozs7OztPQU9HO0lBQ0g7UUFBNkMsbURBQWlCO1FBQTlEOztRQXdDQSxDQUFDO1FBdkNDLDZDQUFXLEdBQVgsVUFBWSxVQUFzQixFQUFFLE1BQXdCLEVBQUUsZ0JBQTRCO1lBQTFGLGlCQVFDO1lBUEMsdURBQXVEO1lBQ3ZELElBQU0sc0JBQXNCLEdBQUcseUJBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3RSxJQUFNLGNBQWMsR0FBRyxxQkFBSSxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3BFLElBQU0sTUFBTSxHQUFHLHFCQUFjLENBQUMsYUFBYSxDQUFDLHFCQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBN0MsQ0FBNkMsQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRVMsNENBQVUsR0FBcEIsVUFDSSxNQUF3QixFQUFFLGNBQThCLEVBQUUsTUFBc0I7WUFDbEYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDcEQsSUFBTSxZQUFZLEdBQUcseUJBQVEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRSxJQUFNLFdBQVcsR0FBRyxxQkFBSSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDL0MsZUFBSyxDQUFDLElBQUksRUFBRSx3QkFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVTLDJDQUFTLEdBQW5CLFVBQW9CLElBQWMsRUFBRSxjQUE4QixFQUFFLE1BQXNCO1lBRXhGLElBQUksc0JBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hCLGlCQUFNLGtCQUFrQixZQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLElBQU0sWUFBWSxHQUFHLHlCQUFRLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekQsSUFBTSxXQUFXLEdBQUcscUJBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQy9DLGVBQUssQ0FBQyxJQUFJLEVBQUUsd0JBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxrQkFBYSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ25EO1FBQ0gsQ0FBQztRQUVTLG1EQUFpQixHQUEzQixVQUNJLFVBQXNCLEVBQUUsY0FBc0MsRUFBRSxNQUFzQjtZQUN4RixJQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBRyxDQUFDO1lBQzVELElBQU0sYUFBYSxHQUFHLHlCQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxxQkFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLFVBQVUsQ0FBQyxXQUFtQixDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxhQUFhLENBQUM7WUFDOUUsa0JBQWEsQ0FBQyxxQkFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBeENELENBQTZDLHdDQUFpQixHQXdDN0Q7SUF4Q1ksMERBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7ZGlybmFtZSwgam9pbiwgcmVsYXRpdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7d3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtjcCwgbWtkaXJ9IGZyb20gJ3NoZWxsanMnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge2lzRHRzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0ZpbGVJbmZvfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcblxuY29uc3QgTkdDQ19ESVJFQ1RPUlkgPSAnX19pdnlfbmdjY19fJztcblxuLyoqXG4gKiBUaGlzIEZpbGVXcml0ZXIgY3JlYXRlcyBhIGNvcHkgb2YgdGhlIG9yaWdpbmFsIGVudHJ5LXBvaW50LCB0aGVuIHdyaXRlcyB0aGUgdHJhbnNmb3JtZWRcbiAqIGZpbGVzIG9udG8gdGhlIGZpbGVzIGluIHRoaXMgY29weSwgYW5kIGZpbmFsbHkgdXBkYXRlcyB0aGUgcGFja2FnZS5qc29uIHdpdGggYSBuZXdcbiAqIGVudHJ5LXBvaW50IGZvcm1hdCBwcm9wZXJ0eSB0aGF0IHBvaW50cyB0byB0aGlzIG5ldyBlbnRyeS1wb2ludC5cbiAqXG4gKiBJZiB0aGVyZSBhcmUgdHJhbnNmb3JtZWQgdHlwaW5ncyBmaWxlcyBpbiB0aGlzIGJ1bmRsZSwgdGhleSBhcmUgdXBkYXRlZCBpbi1wbGFjZSAoc2VlIHRoZVxuICogYEluUGxhY2VGaWxlV3JpdGVyYCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlciBleHRlbmRzIEluUGxhY2VGaWxlV3JpdGVyIHtcbiAgd3JpdGVCdW5kbGUoZW50cnlQb2ludDogRW50cnlQb2ludCwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzOiBGaWxlSW5mb1tdKSB7XG4gICAgLy8gVGhlIG5ldyBmb2xkZXIgaXMgYXQgdGhlIHJvb3Qgb2YgdGhlIG92ZXJhbGwgcGFja2FnZVxuICAgIGNvbnN0IHJlbGF0aXZlRW50cnlQb2ludFBhdGggPSByZWxhdGl2ZShlbnRyeVBvaW50LnBhY2thZ2UsIGVudHJ5UG9pbnQucGF0aCk7XG4gICAgY29uc3QgcmVsYXRpdmVOZXdEaXIgPSBqb2luKE5HQ0NfRElSRUNUT1JZLCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoKTtcbiAgICBjb25zdCBuZXdEaXIgPSBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGpvaW4oZW50cnlQb2ludC5wYWNrYWdlLCByZWxhdGl2ZU5ld0RpcikpO1xuICAgIHRoaXMuY29weUJ1bmRsZShidW5kbGUsIGVudHJ5UG9pbnQucGF0aCwgbmV3RGlyKTtcbiAgICB0cmFuc2Zvcm1lZEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlLCBlbnRyeVBvaW50LnBhdGgsIG5ld0RpcikpO1xuICAgIHRoaXMudXBkYXRlUGFja2FnZUpzb24oZW50cnlQb2ludCwgYnVuZGxlLmZvcm1hdFByb3BlcnR5LCBuZXdEaXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvcHlCdW5kbGUoXG4gICAgICBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUsIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgbmV3RGlyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc291cmNlRmlsZSA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShlbnRyeVBvaW50UGF0aCwgc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgICBjb25zdCBuZXdGaWxlUGF0aCA9IGpvaW4obmV3RGlyLCByZWxhdGl2ZVBhdGgpO1xuICAgICAgbWtkaXIoJy1wJywgZGlybmFtZShuZXdGaWxlUGF0aCkpO1xuICAgICAgY3Aoc291cmNlRmlsZS5maWxlTmFtZSwgbmV3RmlsZVBhdGgpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHdyaXRlRmlsZShmaWxlOiBGaWxlSW5mbywgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoLCBuZXdEaXI6IEFic29sdXRlRnNQYXRoKTpcbiAgICAgIHZvaWQge1xuICAgIGlmIChpc0R0c1BhdGgoZmlsZS5wYXRoKSkge1xuICAgICAgc3VwZXIud3JpdGVGaWxlQW5kQmFja3VwKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShlbnRyeVBvaW50UGF0aCwgZmlsZS5wYXRoKTtcbiAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gam9pbihuZXdEaXIsIHJlbGF0aXZlUGF0aCk7XG4gICAgICBta2RpcignLXAnLCBkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICB3cml0ZUZpbGVTeW5jKG5ld0ZpbGVQYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCB1cGRhdGVQYWNrYWdlSnNvbihcbiAgICAgIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5OiBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBuZXdEaXI6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgY29uc3QgYnVuZGxlUGF0aCA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldICE7XG4gICAgY29uc3QgbmV3QnVuZGxlUGF0aCA9IHJlbGF0aXZlKGVudHJ5UG9pbnQucGF0aCwgam9pbihuZXdEaXIsIGJ1bmRsZVBhdGgpKTtcbiAgICAoZW50cnlQb2ludC5wYWNrYWdlSnNvbiBhcyBhbnkpW2Zvcm1hdFByb3BlcnR5ICsgJ19pdnlfbmdjYyddID0gbmV3QnVuZGxlUGF0aDtcbiAgICB3cml0ZUZpbGVTeW5jKGpvaW4oZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KGVudHJ5UG9pbnQucGFja2FnZUpzb24pKTtcbiAgfVxufVxuIl19