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
    exports.NewEntryPointFileWriter = exports.NGCC_PROPERTY_EXTENSION = exports.NGCC_DIRECTORY = void 0;
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
    exports.NGCC_DIRECTORY = '__ivy_ngcc__';
    exports.NGCC_PROPERTY_EXTENSION = '_ivy_ngcc';
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
        function NewEntryPointFileWriter(fs, logger, errorOnFailedEntryPoint, pkgJsonUpdater) {
            var _this = _super.call(this, fs, logger, errorOnFailedEntryPoint) || this;
            _this.pkgJsonUpdater = pkgJsonUpdater;
            return _this;
        }
        NewEntryPointFileWriter.prototype.writeBundle = function (bundle, transformedFiles, formatProperties) {
            var _this = this;
            // The new folder is at the root of the overall package
            var entryPoint = bundle.entryPoint;
            var ngccFolder = file_system_1.join(entryPoint.package, exports.NGCC_DIRECTORY);
            this.copyBundle(bundle, entryPoint.package, ngccFolder);
            transformedFiles.forEach(function (file) { return _this.writeFile(file, entryPoint.package, ngccFolder); });
            this.updatePackageJson(entryPoint, formatProperties, ngccFolder);
        };
        NewEntryPointFileWriter.prototype.revertBundle = function (entryPoint, transformedFilePaths, formatProperties) {
            // IMPLEMENTATION NOTE:
            //
            // The changes made by `copyBundle()` are not reverted here. The non-transformed copied files
            // are identical to the original ones and they will be overwritten when re-processing the
            // entry-point anyway.
            //
            // This way, we avoid the overhead of having to inform the master process about all source files
            // being copied in `copyBundle()`.
            var e_1, _a;
            try {
                // Revert the transformed files.
                for (var transformedFilePaths_1 = tslib_1.__values(transformedFilePaths), transformedFilePaths_1_1 = transformedFilePaths_1.next(); !transformedFilePaths_1_1.done; transformedFilePaths_1_1 = transformedFilePaths_1.next()) {
                    var filePath = transformedFilePaths_1_1.value;
                    this.revertFile(filePath, entryPoint.package);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (transformedFilePaths_1_1 && !transformedFilePaths_1_1.done && (_a = transformedFilePaths_1.return)) _a.call(transformedFilePaths_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Revert any changes to `package.json`.
            this.revertPackageJson(entryPoint, formatProperties);
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
        NewEntryPointFileWriter.prototype.revertFile = function (filePath, packagePath) {
            if (typescript_1.isDtsPath(filePath.replace(/\.map$/, ''))) {
                // This is either `.d.ts` or `.d.ts.map` file
                _super.prototype.revertFileAndBackup.call(this, filePath);
            }
            else if (this.fs.exists(filePath)) {
                var relativePath = file_system_1.relative(packagePath, filePath);
                var newFilePath = file_system_1.join(packagePath, exports.NGCC_DIRECTORY, relativePath);
                this.fs.removeFile(newFilePath);
            }
        };
        NewEntryPointFileWriter.prototype.updatePackageJson = function (entryPoint, formatProperties, ngccFolder) {
            var e_2, _a;
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
                    update.addChange(["" + formatProperty + exports.NGCC_PROPERTY_EXTENSION], newFormatPath, { before: formatProperty });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (formatProperties_1_1 && !formatProperties_1_1.done && (_a = formatProperties_1.return)) _a.call(formatProperties_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            update.writeChanges(packageJsonPath, packageJson);
        };
        NewEntryPointFileWriter.prototype.revertPackageJson = function (entryPoint, formatProperties) {
            var e_3, _a;
            if (formatProperties.length === 0) {
                // No format properties need reverting.
                return;
            }
            var packageJson = entryPoint.packageJson;
            var packageJsonPath = file_system_1.join(entryPoint.path, 'package.json');
            // Revert all properties in `package.json` (both in memory and on disk).
            // Since `updatePackageJson()` only adds properties, it is safe to just remove them (if they
            // exist).
            var update = this.pkgJsonUpdater.createUpdate();
            try {
                for (var formatProperties_2 = tslib_1.__values(formatProperties), formatProperties_2_1 = formatProperties_2.next(); !formatProperties_2_1.done; formatProperties_2_1 = formatProperties_2.next()) {
                    var formatProperty = formatProperties_2_1.value;
                    update.addChange(["" + formatProperty + exports.NGCC_PROPERTY_EXTENSION], undefined);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (formatProperties_2_1 && !formatProperties_2_1.done && (_a = formatProperties_2.return)) _a.call(formatProperties_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
            update.writeChanges(packageJsonPath, packageJson);
        };
        return NewEntryPointFileWriter;
    }(in_place_file_writer_1.InPlaceFileWriter));
    exports.NewEntryPointFileWriter = NewEntryPointFileWriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFDQTs7Ozs7O09BTUc7SUFDSCwyRUFBMkg7SUFDM0gsa0ZBQWlFO0lBTWpFLG9HQUF5RDtJQUc1QyxRQUFBLGNBQWMsR0FBRyxjQUFjLENBQUM7SUFDaEMsUUFBQSx1QkFBdUIsR0FBRyxXQUFXLENBQUM7SUFFbkQ7Ozs7Ozs7T0FPRztJQUNIO1FBQTZDLG1EQUFpQjtRQUM1RCxpQ0FDSSxFQUFjLEVBQUUsTUFBYyxFQUFFLHVCQUFnQyxFQUN4RCxjQUFrQztZQUY5QyxZQUdFLGtCQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUMsU0FDM0M7WUFGVyxvQkFBYyxHQUFkLGNBQWMsQ0FBb0I7O1FBRTlDLENBQUM7UUFFRCw2Q0FBVyxHQUFYLFVBQ0ksTUFBd0IsRUFBRSxnQkFBK0IsRUFDekQsZ0JBQTBDO1lBRjlDLGlCQVNDO1lBTkMsdURBQXVEO1lBQ3ZELElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFDckMsSUFBTSxVQUFVLEdBQUcsa0JBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLHNCQUFjLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3hELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQXBELENBQW9ELENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCw4Q0FBWSxHQUFaLFVBQ0ksVUFBc0IsRUFBRSxvQkFBc0MsRUFDOUQsZ0JBQTBDO1lBQzVDLHVCQUF1QjtZQUN2QixFQUFFO1lBQ0YsNkZBQTZGO1lBQzdGLHlGQUF5RjtZQUN6RixzQkFBc0I7WUFDdEIsRUFBRTtZQUNGLGdHQUFnRztZQUNoRyxrQ0FBa0M7OztnQkFFbEMsZ0NBQWdDO2dCQUNoQyxLQUF1QixJQUFBLHlCQUFBLGlCQUFBLG9CQUFvQixDQUFBLDBEQUFBLDRGQUFFO29CQUF4QyxJQUFNLFFBQVEsaUNBQUE7b0JBQ2pCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDL0M7Ozs7Ozs7OztZQUVELHdDQUF3QztZQUN4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVTLDRDQUFVLEdBQXBCLFVBQ0ksTUFBd0IsRUFBRSxXQUEyQixFQUFFLFVBQTBCO1lBRHJGLGlCQVdDO1lBVEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDcEQsSUFBTSxZQUFZLEdBQUcsc0JBQVEsQ0FBQyxXQUFXLEVBQUUsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDL0UsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixJQUFJLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ3RELElBQU0sV0FBVyxHQUFHLGtCQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNuRCxLQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxxQkFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLEtBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLG9DQUFzQixDQUFDLFVBQVUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUNuRTtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVTLDJDQUFTLEdBQW5CLFVBQW9CLElBQWlCLEVBQUUsV0FBMkIsRUFBRSxVQUEwQjtZQUU1RixJQUFJLHNCQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlDLDZDQUE2QztnQkFDN0MsaUJBQU0sa0JBQWtCLFlBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ0wsSUFBTSxZQUFZLEdBQUcsc0JBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxJQUFNLFdBQVcsR0FBRyxrQkFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQztRQUVTLDRDQUFVLEdBQXBCLFVBQXFCLFFBQXdCLEVBQUUsV0FBMkI7WUFDeEUsSUFBSSxzQkFBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzdDLDZDQUE2QztnQkFDN0MsaUJBQU0sbUJBQW1CLFlBQUMsUUFBUSxDQUFDLENBQUM7YUFDckM7aUJBQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbkMsSUFBTSxZQUFZLEdBQUcsc0JBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3JELElBQU0sV0FBVyxHQUFHLGtCQUFJLENBQUMsV0FBVyxFQUFFLHNCQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3BFLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ2pDO1FBQ0gsQ0FBQztRQUVTLG1EQUFpQixHQUEzQixVQUNJLFVBQXNCLEVBQUUsZ0JBQTBDLEVBQ2xFLFVBQTBCOztZQUM1QixJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLHNDQUFzQztnQkFDdEMsT0FBTzthQUNSO1lBRUQsSUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUMzQyxJQUFNLGVBQWUsR0FBRyxrQkFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFOUQsdURBQXVEO1lBQ3ZELElBQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBRSxDQUFDO1lBQzNDLElBQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUUsQ0FBQztZQUNsRCxJQUFNLGdCQUFnQixHQUFHLGtCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM5RCxJQUFNLGdCQUFnQixHQUFHLGtCQUFJLENBQUMsVUFBVSxFQUFFLHNCQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDMUYsSUFBTSxhQUFhLEdBQUcsc0JBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFFbEUsd0VBQXdFO1lBQ3hFLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7O2dCQUVsRCxLQUE2QixJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO29CQUExQyxJQUFNLGNBQWMsNkJBQUE7b0JBQ3ZCLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLGFBQWEsRUFBRTt3QkFDakQsTUFBTSxJQUFJLEtBQUssQ0FDWCx1QkFBcUIsZUFBZSwwQkFBdUI7NkJBQzNELE1BQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3Q0FBcUMsQ0FBQSxDQUFDLENBQUM7cUJBQzNFO29CQUVELE1BQU0sQ0FBQyxTQUFTLENBQ1osQ0FBQyxLQUFHLGNBQWMsR0FBRywrQkFBeUIsQ0FBQyxFQUFFLGFBQWEsRUFBRSxFQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUMsQ0FBQyxDQUFDO2lCQUMvRjs7Ozs7Ozs7O1lBRUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVTLG1EQUFpQixHQUEzQixVQUE0QixVQUFzQixFQUFFLGdCQUEwQzs7WUFDNUYsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyx1Q0FBdUM7Z0JBQ3ZDLE9BQU87YUFDUjtZQUVELElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDM0MsSUFBTSxlQUFlLEdBQUcsa0JBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBRTlELHdFQUF3RTtZQUN4RSw0RkFBNEY7WUFDNUYsVUFBVTtZQUNWLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7O2dCQUVsRCxLQUE2QixJQUFBLHFCQUFBLGlCQUFBLGdCQUFnQixDQUFBLGtEQUFBLGdGQUFFO29CQUExQyxJQUFNLGNBQWMsNkJBQUE7b0JBQ3ZCLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFHLGNBQWMsR0FBRywrQkFBeUIsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2lCQUM5RTs7Ozs7Ozs7O1lBRUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQW5JRCxDQUE2Qyx3Q0FBaUIsR0FtSTdEO0lBbklZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgZGlybmFtZSwgRmlsZVN5c3RlbSwgam9pbiwgcmVsYXRpdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzRHRzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi4vcmVuZGVyaW5nL3V0aWxzJztcblxuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5cbmV4cG9ydCBjb25zdCBOR0NDX0RJUkVDVE9SWSA9ICdfX2l2eV9uZ2NjX18nO1xuZXhwb3J0IGNvbnN0IE5HQ0NfUFJPUEVSVFlfRVhURU5TSU9OID0gJ19pdnlfbmdjYyc7XG5cbi8qKlxuICogVGhpcyBGaWxlV3JpdGVyIGNyZWF0ZXMgYSBjb3B5IG9mIHRoZSBvcmlnaW5hbCBlbnRyeS1wb2ludCwgdGhlbiB3cml0ZXMgdGhlIHRyYW5zZm9ybWVkXG4gKiBmaWxlcyBvbnRvIHRoZSBmaWxlcyBpbiB0aGlzIGNvcHksIGFuZCBmaW5hbGx5IHVwZGF0ZXMgdGhlIHBhY2thZ2UuanNvbiB3aXRoIGEgbmV3XG4gKiBlbnRyeS1wb2ludCBmb3JtYXQgcHJvcGVydHkgdGhhdCBwb2ludHMgdG8gdGhpcyBuZXcgZW50cnktcG9pbnQuXG4gKlxuICogSWYgdGhlcmUgYXJlIHRyYW5zZm9ybWVkIHR5cGluZ3MgZmlsZXMgaW4gdGhpcyBidW5kbGUsIHRoZXkgYXJlIHVwZGF0ZWQgaW4tcGxhY2UgKHNlZSB0aGVcbiAqIGBJblBsYWNlRmlsZVdyaXRlcmApLlxuICovXG5leHBvcnQgY2xhc3MgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIgZXh0ZW5kcyBJblBsYWNlRmlsZVdyaXRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludDogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcikge1xuICAgIHN1cGVyKGZzLCBsb2dnZXIsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50KTtcbiAgfVxuXG4gIHdyaXRlQnVuZGxlKFxuICAgICAgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzOiBGaWxlVG9Xcml0ZVtdLFxuICAgICAgZm9ybWF0UHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgLy8gVGhlIG5ldyBmb2xkZXIgaXMgYXQgdGhlIHJvb3Qgb2YgdGhlIG92ZXJhbGwgcGFja2FnZVxuICAgIGNvbnN0IGVudHJ5UG9pbnQgPSBidW5kbGUuZW50cnlQb2ludDtcbiAgICBjb25zdCBuZ2NjRm9sZGVyID0gam9pbihlbnRyeVBvaW50LnBhY2thZ2UsIE5HQ0NfRElSRUNUT1JZKTtcbiAgICB0aGlzLmNvcHlCdW5kbGUoYnVuZGxlLCBlbnRyeVBvaW50LnBhY2thZ2UsIG5nY2NGb2xkZXIpO1xuICAgIHRyYW5zZm9ybWVkRmlsZXMuZm9yRWFjaChmaWxlID0+IHRoaXMud3JpdGVGaWxlKGZpbGUsIGVudHJ5UG9pbnQucGFja2FnZSwgbmdjY0ZvbGRlcikpO1xuICAgIHRoaXMudXBkYXRlUGFja2FnZUpzb24oZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllcywgbmdjY0ZvbGRlcik7XG4gIH1cblxuICByZXZlcnRCdW5kbGUoXG4gICAgICBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCB0cmFuc2Zvcm1lZEZpbGVQYXRoczogQWJzb2x1dGVGc1BhdGhbXSxcbiAgICAgIGZvcm1hdFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSk6IHZvaWQge1xuICAgIC8vIElNUExFTUVOVEFUSU9OIE5PVEU6XG4gICAgLy9cbiAgICAvLyBUaGUgY2hhbmdlcyBtYWRlIGJ5IGBjb3B5QnVuZGxlKClgIGFyZSBub3QgcmV2ZXJ0ZWQgaGVyZS4gVGhlIG5vbi10cmFuc2Zvcm1lZCBjb3BpZWQgZmlsZXNcbiAgICAvLyBhcmUgaWRlbnRpY2FsIHRvIHRoZSBvcmlnaW5hbCBvbmVzIGFuZCB0aGV5IHdpbGwgYmUgb3ZlcndyaXR0ZW4gd2hlbiByZS1wcm9jZXNzaW5nIHRoZVxuICAgIC8vIGVudHJ5LXBvaW50IGFueXdheS5cbiAgICAvL1xuICAgIC8vIFRoaXMgd2F5LCB3ZSBhdm9pZCB0aGUgb3ZlcmhlYWQgb2YgaGF2aW5nIHRvIGluZm9ybSB0aGUgbWFzdGVyIHByb2Nlc3MgYWJvdXQgYWxsIHNvdXJjZSBmaWxlc1xuICAgIC8vIGJlaW5nIGNvcGllZCBpbiBgY29weUJ1bmRsZSgpYC5cblxuICAgIC8vIFJldmVydCB0aGUgdHJhbnNmb3JtZWQgZmlsZXMuXG4gICAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiB0cmFuc2Zvcm1lZEZpbGVQYXRocykge1xuICAgICAgdGhpcy5yZXZlcnRGaWxlKGZpbGVQYXRoLCBlbnRyeVBvaW50LnBhY2thZ2UpO1xuICAgIH1cblxuICAgIC8vIFJldmVydCBhbnkgY2hhbmdlcyB0byBgcGFja2FnZS5qc29uYC5cbiAgICB0aGlzLnJldmVydFBhY2thZ2VKc29uKGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvcHlCdW5kbGUoXG4gICAgICBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBidW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUocGFja2FnZVBhdGgsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSkpO1xuICAgICAgY29uc3QgaXNPdXRzaWRlUGFja2FnZSA9IHJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKCcuLicpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFpc091dHNpZGVQYWNrYWdlKSB7XG4gICAgICAgIGNvbnN0IG5ld0ZpbGVQYXRoID0gam9pbihuZ2NjRm9sZGVyLCByZWxhdGl2ZVBhdGgpO1xuICAgICAgICB0aGlzLmZzLmVuc3VyZURpcihkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICAgIHRoaXMuZnMuY29weUZpbGUoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKSwgbmV3RmlsZVBhdGgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHdyaXRlRmlsZShmaWxlOiBGaWxlVG9Xcml0ZSwgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBuZ2NjRm9sZGVyOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICB2b2lkIHtcbiAgICBpZiAoaXNEdHNQYXRoKGZpbGUucGF0aC5yZXBsYWNlKC9cXC5tYXAkLywgJycpKSkge1xuICAgICAgLy8gVGhpcyBpcyBlaXRoZXIgYC5kLnRzYCBvciBgLmQudHMubWFwYCBmaWxlXG4gICAgICBzdXBlci53cml0ZUZpbGVBbmRCYWNrdXAoZmlsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKHBhY2thZ2VQYXRoLCBmaWxlLnBhdGgpO1xuICAgICAgY29uc3QgbmV3RmlsZVBhdGggPSBqb2luKG5nY2NGb2xkZXIsIHJlbGF0aXZlUGF0aCk7XG4gICAgICB0aGlzLmZzLmVuc3VyZURpcihkaXJuYW1lKG5ld0ZpbGVQYXRoKSk7XG4gICAgICB0aGlzLmZzLndyaXRlRmlsZShuZXdGaWxlUGF0aCwgZmlsZS5jb250ZW50cyk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHJldmVydEZpbGUoZmlsZVBhdGg6IEFic29sdXRlRnNQYXRoLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBpZiAoaXNEdHNQYXRoKGZpbGVQYXRoLnJlcGxhY2UoL1xcLm1hcCQvLCAnJykpKSB7XG4gICAgICAvLyBUaGlzIGlzIGVpdGhlciBgLmQudHNgIG9yIGAuZC50cy5tYXBgIGZpbGVcbiAgICAgIHN1cGVyLnJldmVydEZpbGVBbmRCYWNrdXAoZmlsZVBhdGgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mcy5leGlzdHMoZmlsZVBhdGgpKSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShwYWNrYWdlUGF0aCwgZmlsZVBhdGgpO1xuICAgICAgY29uc3QgbmV3RmlsZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBOR0NDX0RJUkVDVE9SWSwgcmVsYXRpdmVQYXRoKTtcbiAgICAgIHRoaXMuZnMucmVtb3ZlRmlsZShuZXdGaWxlUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHVwZGF0ZVBhY2thZ2VKc29uKFxuICAgICAgZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLFxuICAgICAgbmdjY0ZvbGRlcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBpZiAoZm9ybWF0UHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIE5vIGZvcm1hdCBwcm9wZXJ0aWVzIG5lZWQgdXBkYXRpbmcuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4oZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICAvLyBBbGwgZm9ybWF0IHByb3BlcnRpZXMgcG9pbnQgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGguXG4gICAgY29uc3Qgb2xkRm9ybWF0UHJvcCA9IGZvcm1hdFByb3BlcnRpZXNbMF0hO1xuICAgIGNvbnN0IG9sZEZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltvbGRGb3JtYXRQcm9wXSE7XG4gICAgY29uc3Qgb2xkQWJzRm9ybWF0UGF0aCA9IGpvaW4oZW50cnlQb2ludC5wYXRoLCBvbGRGb3JtYXRQYXRoKTtcbiAgICBjb25zdCBuZXdBYnNGb3JtYXRQYXRoID0gam9pbihuZ2NjRm9sZGVyLCByZWxhdGl2ZShlbnRyeVBvaW50LnBhY2thZ2UsIG9sZEFic0Zvcm1hdFBhdGgpKTtcbiAgICBjb25zdCBuZXdGb3JtYXRQYXRoID0gcmVsYXRpdmUoZW50cnlQb2ludC5wYXRoLCBuZXdBYnNGb3JtYXRQYXRoKTtcblxuICAgIC8vIFVwZGF0ZSBhbGwgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCAoYm90aCBpbiBtZW1vcnkgYW5kIG9uIGRpc2spLlxuICAgIGNvbnN0IHVwZGF0ZSA9IHRoaXMucGtnSnNvblVwZGF0ZXIuY3JlYXRlVXBkYXRlKCk7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1hdFByb3BlcnR5IG9mIGZvcm1hdFByb3BlcnRpZXMpIHtcbiAgICAgIGlmIChwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV0gIT09IG9sZEZvcm1hdFBhdGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYFVuYWJsZSB0byB1cGRhdGUgJyR7cGFja2FnZUpzb25QYXRofSc6IEZvcm1hdCBwcm9wZXJ0aWVzIGAgK1xuICAgICAgICAgICAgYCgke2Zvcm1hdFByb3BlcnRpZXMuam9pbignLCAnKX0pIG1hcCB0byBtb3JlIHRoYW4gb25lIGZvcm1hdC1wYXRoLmApO1xuICAgICAgfVxuXG4gICAgICB1cGRhdGUuYWRkQ2hhbmdlKFxuICAgICAgICAgIFtgJHtmb3JtYXRQcm9wZXJ0eX0ke05HQ0NfUFJPUEVSVFlfRVhURU5TSU9OfWBdLCBuZXdGb3JtYXRQYXRoLCB7YmVmb3JlOiBmb3JtYXRQcm9wZXJ0eX0pO1xuICAgIH1cblxuICAgIHVwZGF0ZS53cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoLCBwYWNrYWdlSnNvbik7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmV2ZXJ0UGFja2FnZUpzb24oZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgaWYgKGZvcm1hdFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBObyBmb3JtYXQgcHJvcGVydGllcyBuZWVkIHJldmVydGluZy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gam9pbihlbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKTtcblxuICAgIC8vIFJldmVydCBhbGwgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCAoYm90aCBpbiBtZW1vcnkgYW5kIG9uIGRpc2spLlxuICAgIC8vIFNpbmNlIGB1cGRhdGVQYWNrYWdlSnNvbigpYCBvbmx5IGFkZHMgcHJvcGVydGllcywgaXQgaXMgc2FmZSB0byBqdXN0IHJlbW92ZSB0aGVtIChpZiB0aGV5XG4gICAgLy8gZXhpc3QpLlxuICAgIGNvbnN0IHVwZGF0ZSA9IHRoaXMucGtnSnNvblVwZGF0ZXIuY3JlYXRlVXBkYXRlKCk7XG5cbiAgICBmb3IgKGNvbnN0IGZvcm1hdFByb3BlcnR5IG9mIGZvcm1hdFByb3BlcnRpZXMpIHtcbiAgICAgIHVwZGF0ZS5hZGRDaGFuZ2UoW2Ake2Zvcm1hdFByb3BlcnR5fSR7TkdDQ19QUk9QRVJUWV9FWFRFTlNJT059YF0sIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgdXBkYXRlLndyaXRlQ2hhbmdlcyhwYWNrYWdlSnNvblBhdGgsIHBhY2thZ2VKc29uKTtcbiAgfVxufVxuIl19