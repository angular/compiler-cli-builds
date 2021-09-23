(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/cleaning/cleaning_strategies", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/cleaning/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BackupFileCleaner = exports.NgccDirectoryCleaner = exports.PackageJsonCleaner = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/utils");
    /**
     * A CleaningStrategy that reverts changes to package.json files by removing the build marker and
     * other properties.
     */
    var PackageJsonCleaner = /** @class */ (function () {
        function PackageJsonCleaner(fs) {
            this.fs = fs;
        }
        PackageJsonCleaner.prototype.canClean = function (_path, basename) {
            return basename === 'package.json';
        };
        PackageJsonCleaner.prototype.clean = function (path, _basename) {
            var packageJson = JSON.parse(this.fs.readFile(path));
            if ((0, build_marker_1.cleanPackageJson)(packageJson)) {
                this.fs.writeFile(path, JSON.stringify(packageJson, null, 2) + "\n");
            }
        };
        return PackageJsonCleaner;
    }());
    exports.PackageJsonCleaner = PackageJsonCleaner;
    /**
     * A CleaningStrategy that removes the extra directory containing generated entry-point formats.
     */
    var NgccDirectoryCleaner = /** @class */ (function () {
        function NgccDirectoryCleaner(fs) {
            this.fs = fs;
        }
        NgccDirectoryCleaner.prototype.canClean = function (path, basename) {
            return basename === new_entry_point_file_writer_1.NGCC_DIRECTORY && (0, utils_1.isLocalDirectory)(this.fs, path);
        };
        NgccDirectoryCleaner.prototype.clean = function (path, _basename) {
            this.fs.removeDeep(path);
        };
        return NgccDirectoryCleaner;
    }());
    exports.NgccDirectoryCleaner = NgccDirectoryCleaner;
    /**
     * A CleaningStrategy that reverts files that were overwritten and removes the backup files that
     * ngcc created.
     */
    var BackupFileCleaner = /** @class */ (function () {
        function BackupFileCleaner(fs) {
            this.fs = fs;
        }
        BackupFileCleaner.prototype.canClean = function (path, basename) {
            return this.fs.extname(basename) === in_place_file_writer_1.NGCC_BACKUP_EXTENSION &&
                this.fs.exists((0, file_system_1.absoluteFrom)(path.replace(in_place_file_writer_1.NGCC_BACKUP_EXTENSION, '')));
        };
        BackupFileCleaner.prototype.clean = function (path, _basename) {
            this.fs.moveFile(path, (0, file_system_1.absoluteFrom)(path.replace(in_place_file_writer_1.NGCC_BACKUP_EXTENSION, '')));
        };
        return BackupFileCleaner;
    }());
    exports.BackupFileCleaner = BackupFileCleaner;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW5pbmdfc3RyYXRlZ2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy93cml0aW5nL2NsZWFuaW5nL2NsZWFuaW5nX3N0cmF0ZWdpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXdHO0lBQ3hHLHFGQUE2RDtJQUU3RCxvR0FBOEQ7SUFDOUQsa0hBQThEO0lBRTlELCtFQUF5QztJQVV6Qzs7O09BR0c7SUFDSDtRQUNFLDRCQUFvQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFDdEMscUNBQVEsR0FBUixVQUFTLEtBQXFCLEVBQUUsUUFBcUI7WUFDbkQsT0FBTyxRQUFRLEtBQUssY0FBYyxDQUFDO1FBQ3JDLENBQUM7UUFDRCxrQ0FBSyxHQUFMLFVBQU0sSUFBb0IsRUFBRSxTQUFzQjtZQUNoRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUEwQixDQUFDO1lBQ2hGLElBQUksSUFBQSwrQkFBZ0IsRUFBQyxXQUFXLENBQUMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBSSxDQUFDLENBQUM7YUFDdEU7UUFDSCxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBWEQsSUFXQztJQVhZLGdEQUFrQjtJQWEvQjs7T0FFRztJQUNIO1FBQ0UsOEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQUcsQ0FBQztRQUN0Qyx1Q0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxRQUFxQjtZQUNsRCxPQUFPLFFBQVEsS0FBSyw0Q0FBYyxJQUFJLElBQUEsd0JBQWdCLEVBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQ0Qsb0NBQUssR0FBTCxVQUFNLElBQW9CLEVBQUUsU0FBc0I7WUFDaEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFSWSxvREFBb0I7SUFVakM7OztPQUdHO0lBQ0g7UUFDRSwyQkFBb0IsRUFBYztZQUFkLE9BQUUsR0FBRixFQUFFLENBQVk7UUFBRyxDQUFDO1FBQ3RDLG9DQUFRLEdBQVIsVUFBUyxJQUFvQixFQUFFLFFBQXFCO1lBQ2xELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssNENBQXFCO2dCQUN0RCxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFBLDBCQUFZLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUNELGlDQUFLLEdBQUwsVUFBTSxJQUFvQixFQUFFLFNBQXNCO1lBQ2hELElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFBLDBCQUFZLEVBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQVRELElBU0M7SUFUWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2NsZWFuUGFja2FnZUpzb259IGZyb20gJy4uLy4uL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRQYWNrYWdlSnNvbn0gZnJvbSAnLi4vLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtOR0NDX0JBQ0tVUF9FWFRFTlNJT059IGZyb20gJy4uL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TkdDQ19ESVJFQ1RPUll9IGZyb20gJy4uL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cbmltcG9ydCB7aXNMb2NhbERpcmVjdG9yeX0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogSW1wbGVtZW50IHRoaXMgaW50ZXJmYWNlIHRvIGV4dGVuZCB0aGUgY2xlYW5pbmcgc3RyYXRlZ2llcyBvZiB0aGUgYFBhY2thZ2VDbGVhbmVyYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY2FuQ2xlYW4ocGF0aDogQWJzb2x1dGVGc1BhdGgsIGJhc2VuYW1lOiBQYXRoU2VnbWVudCk6IGJvb2xlYW47XG4gIGNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiB2b2lkO1xufVxuXG4vKipcbiAqIEEgQ2xlYW5pbmdTdHJhdGVneSB0aGF0IHJldmVydHMgY2hhbmdlcyB0byBwYWNrYWdlLmpzb24gZmlsZXMgYnkgcmVtb3ZpbmcgdGhlIGJ1aWxkIG1hcmtlciBhbmRcbiAqIG90aGVyIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYWNrYWdlSnNvbkNsZWFuZXIgaW1wbGVtZW50cyBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuQ2xlYW4oX3BhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYmFzZW5hbWUgPT09ICdwYWNrYWdlLmpzb24nO1xuICB9XG4gIGNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBfYmFzZW5hbWU6IFBhdGhTZWdtZW50KTogdm9pZCB7XG4gICAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHRoaXMuZnMucmVhZEZpbGUocGF0aCkpIGFzIEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcbiAgICBpZiAoY2xlYW5QYWNrYWdlSnNvbihwYWNrYWdlSnNvbikpIHtcbiAgICAgIHRoaXMuZnMud3JpdGVGaWxlKHBhdGgsIGAke0pTT04uc3RyaW5naWZ5KHBhY2thZ2VKc29uLCBudWxsLCAyKX1cXG5gKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIENsZWFuaW5nU3RyYXRlZ3kgdGhhdCByZW1vdmVzIHRoZSBleHRyYSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NEaXJlY3RvcnlDbGVhbmVyIGltcGxlbWVudHMgQ2xlYW5pbmdTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG4gIGNhbkNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYmFzZW5hbWUgPT09IE5HQ0NfRElSRUNUT1JZICYmIGlzTG9jYWxEaXJlY3RvcnkodGhpcy5mcywgcGF0aCk7XG4gIH1cbiAgY2xlYW4ocGF0aDogQWJzb2x1dGVGc1BhdGgsIF9iYXNlbmFtZTogUGF0aFNlZ21lbnQpOiB2b2lkIHtcbiAgICB0aGlzLmZzLnJlbW92ZURlZXAocGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIENsZWFuaW5nU3RyYXRlZ3kgdGhhdCByZXZlcnRzIGZpbGVzIHRoYXQgd2VyZSBvdmVyd3JpdHRlbiBhbmQgcmVtb3ZlcyB0aGUgYmFja3VwIGZpbGVzIHRoYXRcbiAqIG5nY2MgY3JlYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEJhY2t1cEZpbGVDbGVhbmVyIGltcGxlbWVudHMgQ2xlYW5pbmdTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0pIHt9XG4gIGNhbkNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mcy5leHRuYW1lKGJhc2VuYW1lKSA9PT0gTkdDQ19CQUNLVVBfRVhURU5TSU9OICYmXG4gICAgICAgIHRoaXMuZnMuZXhpc3RzKGFic29sdXRlRnJvbShwYXRoLnJlcGxhY2UoTkdDQ19CQUNLVVBfRVhURU5TSU9OLCAnJykpKTtcbiAgfVxuICBjbGVhbihwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgX2Jhc2VuYW1lOiBQYXRoU2VnbWVudCk6IHZvaWQge1xuICAgIHRoaXMuZnMubW92ZUZpbGUocGF0aCwgYWJzb2x1dGVGcm9tKHBhdGgucmVwbGFjZShOR0NDX0JBQ0tVUF9FWFRFTlNJT04sICcnKSkpO1xuICB9XG59XG4iXX0=