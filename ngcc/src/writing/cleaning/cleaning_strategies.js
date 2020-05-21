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
     * Copyright Google Inc. All Rights Reserved.
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
            if (build_marker_1.cleanPackageJson(packageJson)) {
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
            return basename === new_entry_point_file_writer_1.NGCC_DIRECTORY && utils_1.isLocalDirectory(this.fs, path);
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
                this.fs.exists(file_system_1.absoluteFrom(path.replace(in_place_file_writer_1.NGCC_BACKUP_EXTENSION, '')));
        };
        BackupFileCleaner.prototype.clean = function (path, _basename) {
            this.fs.moveFile(path, file_system_1.absoluteFrom(path.replace(in_place_file_writer_1.NGCC_BACKUP_EXTENSION, '')));
        };
        return BackupFileCleaner;
    }());
    exports.BackupFileCleaner = BackupFileCleaner;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW5pbmdfc3RyYXRlZ2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy93cml0aW5nL2NsZWFuaW5nL2NsZWFuaW5nX3N0cmF0ZWdpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXdHO0lBQ3hHLHFGQUE2RDtJQUM3RCxvR0FBOEQ7SUFDOUQsa0hBQThEO0lBRTlELCtFQUF5QztJQVV6Qzs7O09BR0c7SUFDSDtRQUNFLDRCQUFvQixFQUFjO1lBQWQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUFHLENBQUM7UUFDdEMscUNBQVEsR0FBUixVQUFTLEtBQXFCLEVBQUUsUUFBcUI7WUFDbkQsT0FBTyxRQUFRLEtBQUssY0FBYyxDQUFDO1FBQ3JDLENBQUM7UUFDRCxrQ0FBSyxHQUFMLFVBQU0sSUFBb0IsRUFBRSxTQUFzQjtZQUNoRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSwrQkFBZ0IsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBSSxDQUFDLENBQUM7YUFDdEU7UUFDSCxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBWEQsSUFXQztJQVhZLGdEQUFrQjtJQWEvQjs7T0FFRztJQUNIO1FBQ0UsOEJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQUcsQ0FBQztRQUN0Qyx1Q0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxRQUFxQjtZQUNsRCxPQUFPLFFBQVEsS0FBSyw0Q0FBYyxJQUFJLHdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNELG9DQUFLLEdBQUwsVUFBTSxJQUFvQixFQUFFLFNBQXNCO1lBQ2hELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFSRCxJQVFDO0lBUlksb0RBQW9CO0lBVWpDOzs7T0FHRztJQUNIO1FBQ0UsMkJBQW9CLEVBQWM7WUFBZCxPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQUcsQ0FBQztRQUN0QyxvQ0FBUSxHQUFSLFVBQVMsSUFBb0IsRUFBRSxRQUFxQjtZQUNsRCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLDRDQUFxQjtnQkFDdEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsMEJBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRDQUFxQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBQ0QsaUNBQUssR0FBTCxVQUFNLElBQW9CLEVBQUUsU0FBc0I7WUFDaEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDBCQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0Q0FBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQVRELElBU0M7SUFUWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIFBhdGhTZWdtZW50fSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtjbGVhblBhY2thZ2VKc29ufSBmcm9tICcuLi8uLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOR0NDX0JBQ0tVUF9FWFRFTlNJT059IGZyb20gJy4uL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TkdDQ19ESVJFQ1RPUll9IGZyb20gJy4uL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cbmltcG9ydCB7aXNMb2NhbERpcmVjdG9yeX0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogSW1wbGVtZW50IHRoaXMgaW50ZXJmYWNlIHRvIGV4dGVuZCB0aGUgY2xlYW5pbmcgc3RyYXRlZ2llcyBvZiB0aGUgYFBhY2thZ2VDbGVhbmVyYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY2FuQ2xlYW4ocGF0aDogQWJzb2x1dGVGc1BhdGgsIGJhc2VuYW1lOiBQYXRoU2VnbWVudCk6IGJvb2xlYW47XG4gIGNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiB2b2lkO1xufVxuXG4vKipcbiAqIEEgQ2xlYW5pbmdTdHJhdGVneSB0aGF0IHJldmVydHMgY2hhbmdlcyB0byBwYWNrYWdlLmpzb24gZmlsZXMgYnkgcmVtb3ZpbmcgdGhlIGJ1aWxkIG1hcmtlciBhbmRcbiAqIG90aGVyIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYWNrYWdlSnNvbkNsZWFuZXIgaW1wbGVtZW50cyBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuQ2xlYW4oX3BhdGg6IEFic29sdXRlRnNQYXRoLCBiYXNlbmFtZTogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYmFzZW5hbWUgPT09ICdwYWNrYWdlLmpzb24nO1xuICB9XG4gIGNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBfYmFzZW5hbWU6IFBhdGhTZWdtZW50KTogdm9pZCB7XG4gICAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHRoaXMuZnMucmVhZEZpbGUocGF0aCkpO1xuICAgIGlmIChjbGVhblBhY2thZ2VKc29uKHBhY2thZ2VKc29uKSkge1xuICAgICAgdGhpcy5mcy53cml0ZUZpbGUocGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpfVxcbmApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEEgQ2xlYW5pbmdTdHJhdGVneSB0aGF0IHJlbW92ZXMgdGhlIGV4dHJhIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBlbnRyeS1wb2ludCBmb3JtYXRzLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY0RpcmVjdG9yeUNsZWFuZXIgaW1wbGVtZW50cyBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuQ2xlYW4ocGF0aDogQWJzb2x1dGVGc1BhdGgsIGJhc2VuYW1lOiBQYXRoU2VnbWVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBiYXNlbmFtZSA9PT0gTkdDQ19ESVJFQ1RPUlkgJiYgaXNMb2NhbERpcmVjdG9yeSh0aGlzLmZzLCBwYXRoKTtcbiAgfVxuICBjbGVhbihwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgX2Jhc2VuYW1lOiBQYXRoU2VnbWVudCk6IHZvaWQge1xuICAgIHRoaXMuZnMucmVtb3ZlRGVlcChwYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgQ2xlYW5pbmdTdHJhdGVneSB0aGF0IHJldmVydHMgZmlsZXMgdGhhdCB3ZXJlIG92ZXJ3cml0dGVuIGFuZCByZW1vdmVzIHRoZSBiYWNrdXAgZmlsZXMgdGhhdFxuICogbmdjYyBjcmVhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgQmFja3VwRmlsZUNsZWFuZXIgaW1wbGVtZW50cyBDbGVhbmluZ1N0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSkge31cbiAgY2FuQ2xlYW4ocGF0aDogQWJzb2x1dGVGc1BhdGgsIGJhc2VuYW1lOiBQYXRoU2VnbWVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmZzLmV4dG5hbWUoYmFzZW5hbWUpID09PSBOR0NDX0JBQ0tVUF9FWFRFTlNJT04gJiZcbiAgICAgICAgdGhpcy5mcy5leGlzdHMoYWJzb2x1dGVGcm9tKHBhdGgucmVwbGFjZShOR0NDX0JBQ0tVUF9FWFRFTlNJT04sICcnKSkpO1xuICB9XG4gIGNsZWFuKHBhdGg6IEFic29sdXRlRnNQYXRoLCBfYmFzZW5hbWU6IFBhdGhTZWdtZW50KTogdm9pZCB7XG4gICAgdGhpcy5mcy5tb3ZlRmlsZShwYXRoLCBhYnNvbHV0ZUZyb20ocGF0aC5yZXBsYWNlKE5HQ0NfQkFDS1VQX0VYVEVOU0lPTiwgJycpKSk7XG4gIH1cbn1cbiJdfQ==