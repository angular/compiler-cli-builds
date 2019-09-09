(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
        function NewEntryPointFileWriter(fs, pkgJsonUpdater) {
            var _this = _super.call(this, fs) || this;
            _this.pkgJsonUpdater = pkgJsonUpdater;
            return _this;
        }
        NewEntryPointFileWriter.prototype.writeBundle = function (bundle, transformedFiles, formatProperties) {
            var _this = this;
            // The new folder is at the root of the overall package
            var entryPoint = bundle.entryPoint;
            var ngccFolder = file_system_1.join(entryPoint.package, NGCC_DIRECTORY);
            this.copyBundle(bundle, entryPoint.package, ngccFolder);
            transformedFiles.forEach(function (file) { return _this.writeFile(file, entryPoint.package, ngccFolder); });
            this.updatePackageJson(entryPoint, formatProperties, ngccFolder);
        };
        NewEntryPointFileWriter.prototype.copyBundle = function (bundle, packagePath, ngccFolder) {
            var _this = this;
            bundle.src.program.getSourceFiles().forEach(function (sourceFile) {
                var relativePath = file_system_1.relative(packagePath, file_system_1.absoluteFromSourceFile(sourceFile));
                var isOutsidePackage = relativePath.startsWith('..');
                if (!sourceFile.isDeclarationFile && !isOutsidePackage) {
                    var newFilePath = file_system_1.join(ngccFolder, relativePath);
                    _this.fs.ensureDir(file_system_1.dirname(newFilePath));
                    _this.fs.copyFile(file_system_1.absoluteFromSourceFile(sourceFile), newFilePath);
                }
            });
        };
        NewEntryPointFileWriter.prototype.writeFile = function (file, packagePath, ngccFolder) {
            if (typescript_1.isDtsPath(file.path.replace(/\.map$/, ''))) {
                // This is either `.d.ts` or `.d.ts.map` file
                _super.prototype.writeFileAndBackup.call(this, file);
            }
            else {
                var relativePath = file_system_1.relative(packagePath, file.path);
                var newFilePath = file_system_1.join(ngccFolder, relativePath);
                this.fs.ensureDir(file_system_1.dirname(newFilePath));
                this.fs.writeFile(newFilePath, file.contents);
            }
        };
        NewEntryPointFileWriter.prototype.updatePackageJson = function (entryPoint, formatProperties, ngccFolder) {
            var e_1, _a;
            if (formatProperties.length === 0) {
                // No format properties need updating.
                return;
            }
            var packageJson = entryPoint.packageJson;
            var packageJsonPath = file_system_1.join(entryPoint.path, 'package.json');
            // All format properties point to the same format-path.
            var oldFormatProp = formatProperties[0];
            var oldFormatPath = packageJson[oldFormatProp];
            var oldAbsFormatPath = file_system_1.join(entryPoint.path, oldFormatPath);
            var newAbsFormatPath = file_system_1.join(ngccFolder, file_system_1.relative(entryPoint.package, oldAbsFormatPath));
            var newFormatPath = file_system_1.relative(entryPoint.path, newAbsFormatPath);
            // Update all properties in `package.json` (both in memory and on disk).
            var update = this.pkgJsonUpdater.createUpdate();
            try {
                for (var formatProperties_1 = tslib_1.__values(formatProperties), formatProperties_1_1 = formatProperties_1.next(); !formatProperties_1_1.done; formatProperties_1_1 = formatProperties_1.next()) {
                    var formatProperty = formatProperties_1_1.value;
                    if (packageJson[formatProperty] !== oldFormatPath) {
                        throw new Error("Unable to update '" + packageJsonPath + "': Format properties " +
                            ("(" + formatProperties.join(', ') + ") map to more than one format-path."));
                    }
                    update.addChange([formatProperty + "_ivy_ngcc"], newFormatPath);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (formatProperties_1_1 && !formatProperties_1_1.done && (_a = formatProperties_1.return)) _a.call(formatProperties_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            update.writeChanges(packageJsonPath, packageJson);
        };
        return NewEntryPointFileWriter;
    }(in_place_file_writer_1.InPlaceFileWriter));
    exports.NewEntryPointFileWriter = NewEntryPointFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDJFQUEySDtJQUMzSCxrRkFBaUU7SUFLakUsb0dBQXlEO0lBR3pELElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUV0Qzs7Ozs7OztPQU9HO0lBQ0g7UUFBNkMsbURBQWlCO1FBQzVELGlDQUFZLEVBQWMsRUFBVSxjQUFrQztZQUF0RSxZQUEwRSxrQkFBTSxFQUFFLENBQUMsU0FBRztZQUFsRCxvQkFBYyxHQUFkLGNBQWMsQ0FBb0I7O1FBQWUsQ0FBQztRQUV0Riw2Q0FBVyxHQUFYLFVBQ0ksTUFBd0IsRUFBRSxnQkFBK0IsRUFDekQsZ0JBQTBDO1lBRjlDLGlCQVNDO1lBTkMsdURBQXVEO1lBQ3ZELElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFDckMsSUFBTSxVQUFVLEdBQUcsa0JBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsRUFBcEQsQ0FBb0QsQ0FBQyxDQUFDO1lBQ3ZGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVTLDRDQUFVLEdBQXBCLFVBQ0ksTUFBd0IsRUFBRSxXQUEyQixFQUFFLFVBQTBCO1lBRHJGLGlCQVdDO1lBVEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDcEQsSUFBTSxZQUFZLEdBQUcsc0JBQVEsQ0FBQyxXQUFXLEVBQUUsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDL0UsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixJQUFJLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ3RELElBQU0sV0FBVyxHQUFHLGtCQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNuRCxLQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLEtBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLG9DQUFzQixDQUFDLFVBQVUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUNuRTtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVTLDJDQUFTLEdBQW5CLFVBQW9CLElBQWlCLEVBQUUsV0FBMkIsRUFBRSxVQUEwQjtZQUU1RixJQUFJLHNCQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlDLDZDQUE2QztnQkFDN0MsaUJBQU0sa0JBQWtCLFlBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsSUFBTSxZQUFZLEdBQUcsc0JBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxJQUFNLFdBQVcsR0FBRyxrQkFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQztRQUVTLG1EQUFpQixHQUEzQixVQUNJLFVBQXNCLEVBQUUsZ0JBQTBDLEVBQ2xFLFVBQTBCOztZQUM1QixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLHNDQUFzQztnQkFDdEMsT0FBTzthQUNSO1lBRUQsSUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUMzQyxJQUFNLGVBQWUsR0FBRyxrQkFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFOUQsdURBQXVEO1lBQ3ZELElBQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBRyxDQUFDO1lBQzVDLElBQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUcsQ0FBQztZQUNuRCxJQUFNLGdCQUFnQixHQUFHLGtCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM5RCxJQUFNLGdCQUFnQixHQUFHLGtCQUFJLENBQUMsVUFBVSxFQUFFLHNCQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDMUYsSUFBTSxhQUFhLEdBQUcsc0JBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFFbEUsd0VBQXdFO1lBQ3hFLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7O2dCQUVsRCxLQUE2QixJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO29CQUExQyxJQUFNLGNBQWMsNkJBQUE7b0JBQ3ZCLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLGFBQWEsRUFBRTt3QkFDakQsTUFBTSxJQUFJLEtBQUssQ0FDWCx1QkFBcUIsZUFBZSwwQkFBdUI7NkJBQzNELE1BQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3Q0FBcUMsQ0FBQSxDQUFDLENBQUM7cUJBQzNFO29CQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBSSxjQUFjLGNBQVcsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO2lCQUNqRTs7Ozs7Ozs7O1lBRUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQXpFRCxDQUE2Qyx3Q0FBaUIsR0F5RTdEO0lBekVZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgZGlybmFtZSwgam9pbiwgcmVsYXRpdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzRHRzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0ZpbGVUb1dyaXRlfSBmcm9tICcuLi9yZW5kZXJpbmcvdXRpbHMnO1xuXG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuY29uc3QgTkdDQ19ESVJFQ1RPUlkgPSAnX19pdnlfbmdjY19fJztcblxuLyoqXG4gKiBUaGlzIEZpbGVXcml0ZXIgY3JlYXRlcyBhIGNvcHkgb2YgdGhlIG9yaWdpbmFsIGVudHJ5LXBvaW50LCB0aGVuIHdyaXRlcyB0aGUgdHJhbnNmb3JtZWRcbiAqIGZpbGVzIG9udG8gdGhlIGZpbGVzIGluIHRoaXMgY29weSwgYW5kIGZpbmFsbHkgdXBkYXRlcyB0aGUgcGFja2FnZS5qc29uIHdpdGggYSBuZXdcbiAqIGVudHJ5LXBvaW50IGZvcm1hdCBwcm9wZXJ0eSB0aGF0IHBvaW50cyB0byB0aGlzIG5ldyBlbnRyeS1wb2ludC5cbiAqXG4gKiBJZiB0aGVyZSBhcmUgdHJhbnNmb3JtZWQgdHlwaW5ncyBmaWxlcyBpbiB0aGlzIGJ1bmRsZSwgdGhleSBhcmUgdXBkYXRlZCBpbi1wbGFjZSAoc2VlIHRoZVxuICogYEluUGxhY2VGaWxlV3JpdGVyYCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlciBleHRlbmRzIEluUGxhY2VGaWxlV3JpdGVyIHtcbiAgY29uc3RydWN0b3IoZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcikgeyBzdXBlcihmcyk7IH1cblxuICB3cml0ZUJ1bmRsZShcbiAgICAgIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlczogRmlsZVRvV3JpdGVbXSxcbiAgICAgIGZvcm1hdFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSkge1xuICAgIC8vIFRoZSBuZXcgZm9sZGVyIGlzIGF0IHRoZSByb290IG9mIHRoZSBvdmVyYWxsIHBhY2thZ2VcbiAgICBjb25zdCBlbnRyeVBvaW50ID0gYnVuZGxlLmVudHJ5UG9pbnQ7XG4gICAgY29uc3QgbmdjY0ZvbGRlciA9IGpvaW4oZW50cnlQb2ludC5wYWNrYWdlLCBOR0NDX0RJUkVDVE9SWSk7XG4gICAgdGhpcy5jb3B5QnVuZGxlKGJ1bmRsZSwgZW50cnlQb2ludC5wYWNrYWdlLCBuZ2NjRm9sZGVyKTtcbiAgICB0cmFuc2Zvcm1lZEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlLCBlbnRyeVBvaW50LnBhY2thZ2UsIG5nY2NGb2xkZXIpKTtcbiAgICB0aGlzLnVwZGF0ZVBhY2thZ2VKc29uKGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXMsIG5nY2NGb2xkZXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvcHlCdW5kbGUoXG4gICAgICBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBidW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUocGFja2FnZVBhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSkpO1xuICAgICAgY29uc3QgaXNPdXRzaWRlUGFja2FnZSA9IHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKCcuLicpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFpc091dHNpZGVQYWNrYWdlKSB7XG4gICAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gam9pbihuZ2NjRm9sZGVyLCByZWxhdGl2ZVBhdGgpO1xuICAgICAgICB0aGlzLmZzLmVuc3VyZURpcihkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICAgIHRoaXMuZnMuY29weUZpbGUoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKSwgbmV3RmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHdyaXRlRmlsZShmaWxlOiBGaWxlVG9Xcml0ZSwgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBuZ2NjRm9sZGVyOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICB2b2lkIHtcbiAgICBpZiAoaXNEdHNQYXRoKGZpbGUucGF0aC5yZXBsYWNlKC9cXC5tYXAkLywgJycpKSkge1xuICAgICAgLy8gVGhpcyBpcyBlaXRoZXIgYC5kLnRzYCBvciBgLmQudHMubWFwYCBmaWxlXG4gICAgICBzdXBlci53cml0ZUZpbGVBbmRCYWNrdXAoZmlsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKHBhY2thZ2VQYXRoLCBmaWxlLnBhdGgpO1xuICAgICAgY29uc3QgbmV3RmlsZVBhdGggPSBqb2luKG5nY2NGb2xkZXIsIHJlbGF0aXZlUGF0aCk7XG4gICAgICB0aGlzLmZzLmVuc3VyZURpcihkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICB0aGlzLmZzLndyaXRlRmlsZShuZXdGaWxlUGF0aCwgZmlsZS5jb250ZW50cyk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHVwZGF0ZVBhY2thZ2VKc29uKFxuICAgICAgZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLFxuICAgICAgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBpZiAoZm9ybWF0UHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIE5vIGZvcm1hdCBwcm9wZXJ0aWVzIG5lZWQgdXBkYXRpbmcuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4oZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBBbGwgZm9ybWF0IHByb3BlcnRpZXMgcG9pbnQgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGguXG4gICAgY29uc3Qgb2xkRm9ybWF0UHJvcCA9IGZvcm1hdFByb3BlcnRpZXNbMF0gITtcbiAgICBjb25zdCBvbGRGb3JtYXRQYXRoID0gcGFja2FnZUpzb25bb2xkRm9ybWF0UHJvcF0gITtcbiAgICBjb25zdCBvbGRBYnNGb3JtYXRQYXRoID0gam9pbihlbnRyeVBvaW50LnBhdGgsIG9sZEZvcm1hdFBhdGgpO1xuICAgIGNvbnN0IG5ld0Fic0Zvcm1hdFBhdGggPSBqb2luKG5nY2NGb2xkZXIsIHJlbGF0aXZlKGVudHJ5UG9pbnQucGFja2FnZSwgb2xkQWJzRm9ybWF0UGF0aCkpO1xuICAgIGNvbnN0IG5ld0Zvcm1hdFBhdGggPSByZWxhdGl2ZShlbnRyeVBvaW50LnBhdGgsIG5ld0Fic0Zvcm1hdFBhdGgpO1xuXG4gICAgLy8gVXBkYXRlIGFsbCBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIChib3RoIGluIG1lbW9yeSBhbmQgb24gZGlzaykuXG4gICAgY29uc3QgdXBkYXRlID0gdGhpcy5wa2dKc29uVXBkYXRlci5jcmVhdGVVcGRhdGUoKTtcblxuICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgZm9ybWF0UHJvcGVydGllcykge1xuICAgICAgaWYgKHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XSAhPT0gb2xkRm9ybWF0UGF0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgVW5hYmxlIHRvIHVwZGF0ZSAnJHtwYWNrYWdlSnNvblBhdGh9JzogRm9ybWF0IHByb3BlcnRpZXMgYCArXG4gICAgICAgICAgICBgKCR7Zm9ybWF0UHJvcGVydGllcy5qb2luKCcsICcpfSkgbWFwIHRvIG1vcmUgdGhhbiBvbmUgZm9ybWF0LXBhdGguYCk7XG4gICAgICB9XG5cbiAgICAgIHVwZGF0ZS5hZGRDaGFuZ2UoW2Ake2Zvcm1hdFByb3BlcnR5fV9pdnlfbmdjY2BdLCBuZXdGb3JtYXRQYXRoKTtcbiAgICB9XG5cbiAgICB1cGRhdGUud3JpdGVDaGFuZ2VzKHBhY2thZ2VKc29uUGF0aCwgcGFja2FnZUpzb24pO1xuICB9XG59XG4iXX0=