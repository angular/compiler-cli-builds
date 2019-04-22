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
                if (!sourceFile.isDeclarationFile) {
                    var relativePath = canonical_path_1.relative(entryPointPath, sourceFile.fileName);
                    var newFilePath = canonical_path_1.join(newDir, relativePath);
                    shelljs_1.mkdir('-p', canonical_path_1.dirname(newFilePath));
                    shelljs_1.cp(sourceFile.fileName, newFilePath);
                }
            });
        };
        NewEntryPointFileWriter.prototype.writeFile = function (file, entryPointPath, newDir) {
            if (typescript_1.isDtsPath(file.path.replace(/\.map$/, ''))) {
                // This is either `.d.ts` or `.d.ts.map` file
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILGlEQUF1RDtJQUN2RCx5QkFBaUM7SUFDakMsbUNBQWtDO0lBRWxDLDZEQUF1RDtJQUN2RCxrRkFBaUU7SUFLakUsb0dBQXlEO0lBRXpELElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUV0Qzs7Ozs7OztPQU9HO0lBQ0g7UUFBNkMsbURBQWlCO1FBQTlEOztRQTJDQSxDQUFDO1FBMUNDLDZDQUFXLEdBQVgsVUFBWSxVQUFzQixFQUFFLE1BQXdCLEVBQUUsZ0JBQTRCO1lBQTFGLGlCQVFDO1lBUEMsdURBQXVEO1lBQ3ZELElBQU0sc0JBQXNCLEdBQUcseUJBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3RSxJQUFNLGNBQWMsR0FBRyxxQkFBSSxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3BFLElBQU0sTUFBTSxHQUFHLHFCQUFjLENBQUMsYUFBYSxDQUFDLHFCQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBN0MsQ0FBNkMsQ0FBQyxDQUFDO1lBQ2hGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRVMsNENBQVUsR0FBcEIsVUFDSSxNQUF3QixFQUFFLGNBQThCLEVBQUUsTUFBc0I7WUFDbEYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDcEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtvQkFDakMsSUFBTSxZQUFZLEdBQUcseUJBQVEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNuRSxJQUFNLFdBQVcsR0FBRyxxQkFBSSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDL0MsZUFBSyxDQUFDLElBQUksRUFBRSx3QkFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUN0QztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVTLDJDQUFTLEdBQW5CLFVBQW9CLElBQWMsRUFBRSxjQUE4QixFQUFFLE1BQXNCO1lBRXhGLElBQUksc0JBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDOUMsNkNBQTZDO2dCQUM3QyxpQkFBTSxrQkFBa0IsWUFBQyxJQUFJLENBQUMsQ0FBQzthQUNoQztpQkFBTTtnQkFDTCxJQUFNLFlBQVksR0FBRyx5QkFBUSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQU0sV0FBVyxHQUFHLHFCQUFJLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUMvQyxlQUFLLENBQUMsSUFBSSxFQUFFLHdCQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsa0JBQWEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuRDtRQUNILENBQUM7UUFFUyxtREFBaUIsR0FBM0IsVUFDSSxVQUFzQixFQUFFLGNBQXNDLEVBQUUsTUFBc0I7WUFDeEYsSUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUcsQ0FBQztZQUM1RCxJQUFNLGFBQWEsR0FBRyx5QkFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUscUJBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN6RSxVQUFVLENBQUMsV0FBbUIsQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsYUFBYSxDQUFDO1lBQzlFLGtCQUFhLENBQUMscUJBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQTNDRCxDQUE2Qyx3Q0FBaUIsR0EyQzdEO0lBM0NZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2Rpcm5hbWUsIGpvaW4sIHJlbGF0aXZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge3dyaXRlRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7Y3AsIG1rZGlyfSBmcm9tICdzaGVsbGpzJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtpc0R0c1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtGaWxlSW5mb30gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5cbmNvbnN0IE5HQ0NfRElSRUNUT1JZID0gJ19faXZ5X25nY2NfXyc7XG5cbi8qKlxuICogVGhpcyBGaWxlV3JpdGVyIGNyZWF0ZXMgYSBjb3B5IG9mIHRoZSBvcmlnaW5hbCBlbnRyeS1wb2ludCwgdGhlbiB3cml0ZXMgdGhlIHRyYW5zZm9ybWVkXG4gKiBmaWxlcyBvbnRvIHRoZSBmaWxlcyBpbiB0aGlzIGNvcHksIGFuZCBmaW5hbGx5IHVwZGF0ZXMgdGhlIHBhY2thZ2UuanNvbiB3aXRoIGEgbmV3XG4gKiBlbnRyeS1wb2ludCBmb3JtYXQgcHJvcGVydHkgdGhhdCBwb2ludHMgdG8gdGhpcyBuZXcgZW50cnktcG9pbnQuXG4gKlxuICogSWYgdGhlcmUgYXJlIHRyYW5zZm9ybWVkIHR5cGluZ3MgZmlsZXMgaW4gdGhpcyBidW5kbGUsIHRoZXkgYXJlIHVwZGF0ZWQgaW4tcGxhY2UgKHNlZSB0aGVcbiAqIGBJblBsYWNlRmlsZVdyaXRlcmApLlxuICovXG5leHBvcnQgY2xhc3MgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIgZXh0ZW5kcyBJblBsYWNlRmlsZVdyaXRlciB7XG4gIHdyaXRlQnVuZGxlKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlczogRmlsZUluZm9bXSkge1xuICAgIC8vIFRoZSBuZXcgZm9sZGVyIGlzIGF0IHRoZSByb290IG9mIHRoZSBvdmVyYWxsIHBhY2thZ2VcbiAgICBjb25zdCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoID0gcmVsYXRpdmUoZW50cnlQb2ludC5wYWNrYWdlLCBlbnRyeVBvaW50LnBhdGgpO1xuICAgIGNvbnN0IHJlbGF0aXZlTmV3RGlyID0gam9pbihOR0NDX0RJUkVDVE9SWSwgcmVsYXRpdmVFbnRyeVBvaW50UGF0aCk7XG4gICAgY29uc3QgbmV3RGlyID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChqb2luKGVudHJ5UG9pbnQucGFja2FnZSwgcmVsYXRpdmVOZXdEaXIpKTtcbiAgICB0aGlzLmNvcHlCdW5kbGUoYnVuZGxlLCBlbnRyeVBvaW50LnBhdGgsIG5ld0Rpcik7XG4gICAgdHJhbnNmb3JtZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGUoZmlsZSwgZW50cnlQb2ludC5wYXRoLCBuZXdEaXIpKTtcbiAgICB0aGlzLnVwZGF0ZVBhY2thZ2VKc29uKGVudHJ5UG9pbnQsIGJ1bmRsZS5mb3JtYXRQcm9wZXJ0eSwgbmV3RGlyKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjb3B5QnVuZGxlKFxuICAgICAgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIG5ld0RpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBidW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKGVudHJ5UG9pbnRQYXRoLCBzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgY29uc3QgbmV3RmlsZVBhdGggPSBqb2luKG5ld0RpciwgcmVsYXRpdmVQYXRoKTtcbiAgICAgICAgbWtkaXIoJy1wJywgZGlybmFtZShuZXdGaWxlUGF0aCkpO1xuICAgICAgICBjcChzb3VyY2VGaWxlLmZpbGVOYW1lLCBuZXdGaWxlUGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIG5ld0RpcjogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKGlzRHRzUGF0aChmaWxlLnBhdGgucmVwbGFjZSgvXFwubWFwJC8sICcnKSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgZWl0aGVyIGAuZC50c2Agb3IgYC5kLnRzLm1hcGAgZmlsZVxuICAgICAgc3VwZXIud3JpdGVGaWxlQW5kQmFja3VwKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShlbnRyeVBvaW50UGF0aCwgZmlsZS5wYXRoKTtcbiAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gam9pbihuZXdEaXIsIHJlbGF0aXZlUGF0aCk7XG4gICAgICBta2RpcignLXAnLCBkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICB3cml0ZUZpbGVTeW5jKG5ld0ZpbGVQYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCB1cGRhdGVQYWNrYWdlSnNvbihcbiAgICAgIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5OiBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBuZXdEaXI6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgY29uc3QgYnVuZGxlUGF0aCA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldICE7XG4gICAgY29uc3QgbmV3QnVuZGxlUGF0aCA9IHJlbGF0aXZlKGVudHJ5UG9pbnQucGF0aCwgam9pbihuZXdEaXIsIGJ1bmRsZVBhdGgpKTtcbiAgICAoZW50cnlQb2ludC5wYWNrYWdlSnNvbiBhcyBhbnkpW2Zvcm1hdFByb3BlcnR5ICsgJ19pdnlfbmdjYyddID0gbmV3QnVuZGxlUGF0aDtcbiAgICB3cml0ZUZpbGVTeW5jKGpvaW4oZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KGVudHJ5UG9pbnQucGFja2FnZUpzb24pKTtcbiAgfVxufVxuIl19