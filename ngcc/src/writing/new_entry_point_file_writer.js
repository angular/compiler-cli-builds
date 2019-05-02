(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer"], factory);
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
            var ngccFolder = path_1.AbsoluteFsPath.join(entryPoint.package, NGCC_DIRECTORY);
            this.copyBundle(bundle, entryPoint.package, ngccFolder);
            transformedFiles.forEach(function (file) { return _this.writeFile(file, entryPoint.package, ngccFolder); });
            this.updatePackageJson(entryPoint, bundle.formatProperty, ngccFolder);
        };
        NewEntryPointFileWriter.prototype.copyBundle = function (bundle, packagePath, ngccFolder) {
            var _this = this;
            bundle.src.program.getSourceFiles().forEach(function (sourceFile) {
                var relativePath = path_1.PathSegment.relative(packagePath, path_1.AbsoluteFsPath.fromSourceFile(sourceFile));
                var isOutsidePackage = relativePath.startsWith('..');
                if (!sourceFile.isDeclarationFile && !isOutsidePackage) {
                    var newFilePath = path_1.AbsoluteFsPath.join(ngccFolder, relativePath);
                    _this.fs.ensureDir(path_1.AbsoluteFsPath.dirname(newFilePath));
                    _this.fs.copyFile(path_1.AbsoluteFsPath.fromSourceFile(sourceFile), newFilePath);
                }
            });
        };
        NewEntryPointFileWriter.prototype.writeFile = function (file, packagePath, ngccFolder) {
            if (typescript_1.isDtsPath(file.path.replace(/\.map$/, ''))) {
                // This is either `.d.ts` or `.d.ts.map` file
                _super.prototype.writeFileAndBackup.call(this, file);
            }
            else {
                var relativePath = path_1.PathSegment.relative(packagePath, file.path);
                var newFilePath = path_1.AbsoluteFsPath.join(ngccFolder, relativePath);
                this.fs.ensureDir(path_1.AbsoluteFsPath.dirname(newFilePath));
                this.fs.writeFile(newFilePath, file.contents);
            }
        };
        NewEntryPointFileWriter.prototype.updatePackageJson = function (entryPoint, formatProperty, ngccFolder) {
            var formatPath = path_1.AbsoluteFsPath.join(entryPoint.path, entryPoint.packageJson[formatProperty]);
            var newFormatPath = path_1.AbsoluteFsPath.join(ngccFolder, path_1.PathSegment.relative(entryPoint.package, formatPath));
            var newFormatProperty = formatProperty + '_ivy_ngcc';
            entryPoint.packageJson[newFormatProperty] =
                path_1.PathSegment.relative(entryPoint.path, newFormatPath);
            this.fs.writeFile(path_1.AbsoluteFsPath.join(entryPoint.path, 'package.json'), JSON.stringify(entryPoint.packageJson));
        };
        return NewEntryPointFileWriter;
    }(in_place_file_writer_1.InPlaceFileWriter));
    exports.NewEntryPointFileWriter = NewEntryPointFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDZEQUFvRTtJQUNwRSxrRkFBaUU7SUFLakUsb0dBQXlEO0lBRXpELElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUV0Qzs7Ozs7OztPQU9HO0lBQ0g7UUFBNkMsbURBQWlCO1FBQTlEOztRQWlEQSxDQUFDO1FBaERDLDZDQUFXLEdBQVgsVUFBWSxVQUFzQixFQUFFLE1BQXdCLEVBQUUsZ0JBQTRCO1lBQTFGLGlCQU1DO1lBTEMsdURBQXVEO1lBQ3ZELElBQU0sVUFBVSxHQUFHLHFCQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN4RCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxLQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFwRCxDQUFvRCxDQUFDLENBQUM7WUFDdkYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFUyw0Q0FBVSxHQUFwQixVQUNJLE1BQXdCLEVBQUUsV0FBMkIsRUFBRSxVQUEwQjtZQURyRixpQkFZQztZQVZDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFVBQVU7Z0JBQ3BELElBQU0sWUFBWSxHQUNkLGtCQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxxQkFBYyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixJQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDdEQsSUFBTSxXQUFXLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNsRSxLQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUN2RCxLQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxxQkFBYyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztpQkFDMUU7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFUywyQ0FBUyxHQUFuQixVQUFvQixJQUFjLEVBQUUsV0FBMkIsRUFBRSxVQUEwQjtZQUV6RixJQUFJLHNCQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlDLDZDQUE2QztnQkFDN0MsaUJBQU0sa0JBQWtCLFlBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsSUFBTSxZQUFZLEdBQUcsa0JBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEUsSUFBTSxXQUFXLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQztRQUVTLG1EQUFpQixHQUEzQixVQUNJLFVBQXNCLEVBQUUsY0FBc0MsRUFBRSxVQUEwQjtZQUM1RixJQUFNLFVBQVUsR0FDWixxQkFBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFHLENBQUMsQ0FBQztZQUNuRixJQUFNLGFBQWEsR0FDZixxQkFBYyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsa0JBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzFGLElBQU0saUJBQWlCLEdBQUcsY0FBYyxHQUFHLFdBQVcsQ0FBQztZQUN0RCxVQUFVLENBQUMsV0FBbUIsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDOUMsa0JBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FDYixxQkFBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUFqREQsQ0FBNkMsd0NBQWlCLEdBaUQ3RDtJQWpEWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIFBhdGhTZWdtZW50fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge2lzRHRzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0ZpbGVJbmZvfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcblxuY29uc3QgTkdDQ19ESVJFQ1RPUlkgPSAnX19pdnlfbmdjY19fJztcblxuLyoqXG4gKiBUaGlzIEZpbGVXcml0ZXIgY3JlYXRlcyBhIGNvcHkgb2YgdGhlIG9yaWdpbmFsIGVudHJ5LXBvaW50LCB0aGVuIHdyaXRlcyB0aGUgdHJhbnNmb3JtZWRcbiAqIGZpbGVzIG9udG8gdGhlIGZpbGVzIGluIHRoaXMgY29weSwgYW5kIGZpbmFsbHkgdXBkYXRlcyB0aGUgcGFja2FnZS5qc29uIHdpdGggYSBuZXdcbiAqIGVudHJ5LXBvaW50IGZvcm1hdCBwcm9wZXJ0eSB0aGF0IHBvaW50cyB0byB0aGlzIG5ldyBlbnRyeS1wb2ludC5cbiAqXG4gKiBJZiB0aGVyZSBhcmUgdHJhbnNmb3JtZWQgdHlwaW5ncyBmaWxlcyBpbiB0aGlzIGJ1bmRsZSwgdGhleSBhcmUgdXBkYXRlZCBpbi1wbGFjZSAoc2VlIHRoZVxuICogYEluUGxhY2VGaWxlV3JpdGVyYCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlciBleHRlbmRzIEluUGxhY2VGaWxlV3JpdGVyIHtcbiAgd3JpdGVCdW5kbGUoZW50cnlQb2ludDogRW50cnlQb2ludCwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzOiBGaWxlSW5mb1tdKSB7XG4gICAgLy8gVGhlIG5ldyBmb2xkZXIgaXMgYXQgdGhlIHJvb3Qgb2YgdGhlIG92ZXJhbGwgcGFja2FnZVxuICAgIGNvbnN0IG5nY2NGb2xkZXIgPSBBYnNvbHV0ZUZzUGF0aC5qb2luKGVudHJ5UG9pbnQucGFja2FnZSwgTkdDQ19ESVJFQ1RPUlkpO1xuICAgIHRoaXMuY29weUJ1bmRsZShidW5kbGUsIGVudHJ5UG9pbnQucGFja2FnZSwgbmdjY0ZvbGRlcik7XG4gICAgdHJhbnNmb3JtZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGUoZmlsZSwgZW50cnlQb2ludC5wYWNrYWdlLCBuZ2NjRm9sZGVyKSk7XG4gICAgdGhpcy51cGRhdGVQYWNrYWdlSnNvbihlbnRyeVBvaW50LCBidW5kbGUuZm9ybWF0UHJvcGVydHksIG5nY2NGb2xkZXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvcHlCdW5kbGUoXG4gICAgICBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBidW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID1cbiAgICAgICAgICBQYXRoU2VnbWVudC5yZWxhdGl2ZShwYWNrYWdlUGF0aCwgQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSkpO1xuICAgICAgY29uc3QgaXNPdXRzaWRlUGFja2FnZSA9IHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKCcuLicpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFpc091dHNpZGVQYWNrYWdlKSB7XG4gICAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gQWJzb2x1dGVGc1BhdGguam9pbihuZ2NjRm9sZGVyLCByZWxhdGl2ZVBhdGgpO1xuICAgICAgICB0aGlzLmZzLmVuc3VyZURpcihBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICAgIHRoaXMuZnMuY29weUZpbGUoQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSksIG5ld0ZpbGVQYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCB3cml0ZUZpbGUoZmlsZTogRmlsZUluZm8sIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKGlzRHRzUGF0aChmaWxlLnBhdGgucmVwbGFjZSgvXFwubWFwJC8sICcnKSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgZWl0aGVyIGAuZC50c2Agb3IgYC5kLnRzLm1hcGAgZmlsZVxuICAgICAgc3VwZXIud3JpdGVGaWxlQW5kQmFja3VwKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBQYXRoU2VnbWVudC5yZWxhdGl2ZShwYWNrYWdlUGF0aCwgZmlsZS5wYXRoKTtcbiAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gQWJzb2x1dGVGc1BhdGguam9pbihuZ2NjRm9sZGVyLCByZWxhdGl2ZVBhdGgpO1xuICAgICAgdGhpcy5mcy5lbnN1cmVEaXIoQWJzb2x1dGVGc1BhdGguZGlybmFtZShuZXdGaWxlUGF0aCkpO1xuICAgICAgdGhpcy5mcy53cml0ZUZpbGUobmV3RmlsZVBhdGgsIGZpbGUuY29udGVudHMpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCB1cGRhdGVQYWNrYWdlSnNvbihcbiAgICAgIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5OiBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBuZ2NjRm9sZGVyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPVxuICAgICAgICBBYnNvbHV0ZUZzUGF0aC5qb2luKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludC5wYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV0gISk7XG4gICAgY29uc3QgbmV3Rm9ybWF0UGF0aCA9XG4gICAgICAgIEFic29sdXRlRnNQYXRoLmpvaW4obmdjY0ZvbGRlciwgUGF0aFNlZ21lbnQucmVsYXRpdmUoZW50cnlQb2ludC5wYWNrYWdlLCBmb3JtYXRQYXRoKSk7XG4gICAgY29uc3QgbmV3Rm9ybWF0UHJvcGVydHkgPSBmb3JtYXRQcm9wZXJ0eSArICdfaXZ5X25nY2MnO1xuICAgIChlbnRyeVBvaW50LnBhY2thZ2VKc29uIGFzIGFueSlbbmV3Rm9ybWF0UHJvcGVydHldID1cbiAgICAgICAgUGF0aFNlZ21lbnQucmVsYXRpdmUoZW50cnlQb2ludC5wYXRoLCBuZXdGb3JtYXRQYXRoKTtcbiAgICB0aGlzLmZzLndyaXRlRmlsZShcbiAgICAgICAgQWJzb2x1dGVGc1BhdGguam9pbihlbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKSxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoZW50cnlQb2ludC5wYWNrYWdlSnNvbikpO1xuICB9XG59XG4iXX0=