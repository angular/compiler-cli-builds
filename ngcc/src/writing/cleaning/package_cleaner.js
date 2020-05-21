(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/writing/cleaning/cleaning_strategies", "@angular/compiler-cli/ngcc/src/writing/cleaning/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cleanOutdatedPackages = exports.PackageCleaner = void 0;
    var tslib_1 = require("tslib");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var cleaning_strategies_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/cleaning_strategies");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/utils");
    /**
     * A class that can clean ngcc artifacts from a directory.
     */
    var PackageCleaner = /** @class */ (function () {
        function PackageCleaner(fs, cleaners) {
            this.fs = fs;
            this.cleaners = cleaners;
        }
        /**
         * Recurse through the file-system cleaning files and directories as determined by the configured
         * cleaning-strategies.
         *
         * @param directory the current directory to clean
         */
        PackageCleaner.prototype.clean = function (directory) {
            var e_1, _a, e_2, _b;
            var basenames = this.fs.readdir(directory);
            try {
                for (var basenames_1 = tslib_1.__values(basenames), basenames_1_1 = basenames_1.next(); !basenames_1_1.done; basenames_1_1 = basenames_1.next()) {
                    var basename = basenames_1_1.value;
                    if (basename === 'node_modules') {
                        continue;
                    }
                    var path = this.fs.resolve(directory, basename);
                    try {
                        for (var _c = (e_2 = void 0, tslib_1.__values(this.cleaners)), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var cleaner = _d.value;
                            if (cleaner.canClean(path, basename)) {
                                cleaner.clean(path, basename);
                                break;
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    // Recurse into subdirectories (note that a cleaner may have removed this path)
                    if (utils_1.isLocalDirectory(this.fs, path)) {
                        this.clean(path);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (basenames_1_1 && !basenames_1_1.done && (_a = basenames_1.return)) _a.call(basenames_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        return PackageCleaner;
    }());
    exports.PackageCleaner = PackageCleaner;
    /**
     * Iterate through the given `entryPoints` identifying the package for each that has at least one
     * outdated processed format, then cleaning those packages.
     *
     * Note that we have to clean entire packages because there is no clear file-system boundary
     * between entry-points within a package. So if one entry-point is outdated we have to clean
     * everything within that package.
     *
     * @param fileSystem the current file-system
     * @param entryPoints the entry-points that have been collected for this run of ngcc
     * @returns true if packages needed to be cleaned.
     */
    function cleanOutdatedPackages(fileSystem, entryPoints) {
        var e_3, _a, e_4, _b;
        var packagesToClean = new Set();
        try {
            for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                var entryPoint = entryPoints_1_1.value;
                if (build_marker_1.needsCleaning(entryPoint.packageJson)) {
                    packagesToClean.add(entryPoint.package);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (entryPoints_1_1 && !entryPoints_1_1.done && (_a = entryPoints_1.return)) _a.call(entryPoints_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var cleaner = new PackageCleaner(fileSystem, [
            new cleaning_strategies_1.PackageJsonCleaner(fileSystem),
            new cleaning_strategies_1.NgccDirectoryCleaner(fileSystem),
            new cleaning_strategies_1.BackupFileCleaner(fileSystem),
        ]);
        try {
            for (var packagesToClean_1 = tslib_1.__values(packagesToClean), packagesToClean_1_1 = packagesToClean_1.next(); !packagesToClean_1_1.done; packagesToClean_1_1 = packagesToClean_1.next()) {
                var packagePath = packagesToClean_1_1.value;
                cleaner.clean(packagePath);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (packagesToClean_1_1 && !packagesToClean_1_1.done && (_b = packagesToClean_1.return)) _b.call(packagesToClean_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return packagesToClean.size > 0;
    }
    exports.cleanOutdatedPackages = cleanOutdatedPackages;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV9jbGVhbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3dyaXRpbmcvY2xlYW5pbmcvcGFja2FnZV9jbGVhbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFRQSxxRkFBMEQ7SUFHMUQsMkdBQW9IO0lBQ3BILCtFQUF5QztJQUV6Qzs7T0FFRztJQUNIO1FBQ0Usd0JBQW9CLEVBQWMsRUFBVSxRQUE0QjtZQUFwRCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFBRyxDQUFDO1FBRTVFOzs7OztXQUtHO1FBQ0gsOEJBQUssR0FBTCxVQUFNLFNBQXlCOztZQUM3QixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQzs7Z0JBQzdDLEtBQXVCLElBQUEsY0FBQSxpQkFBQSxTQUFTLENBQUEsb0NBQUEsMkRBQUU7b0JBQTdCLElBQU0sUUFBUSxzQkFBQTtvQkFDakIsSUFBSSxRQUFRLEtBQUssY0FBYyxFQUFFO3dCQUMvQixTQUFTO3FCQUNWO29CQUVELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQzs7d0JBQ2xELEtBQXNCLElBQUEsb0JBQUEsaUJBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQSxDQUFBLGdCQUFBLDRCQUFFOzRCQUFoQyxJQUFNLE9BQU8sV0FBQTs0QkFDaEIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRTtnQ0FDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0NBQzlCLE1BQU07NkJBQ1A7eUJBQ0Y7Ozs7Ozs7OztvQkFDRCwrRUFBK0U7b0JBQy9FLElBQUksd0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTt3QkFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDbEI7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUE3QkQsSUE2QkM7SUE3Qlksd0NBQWM7SUFnQzNCOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQUMsVUFBc0IsRUFBRSxXQUF5Qjs7UUFDckYsSUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7O1lBQ2xELEtBQXlCLElBQUEsZ0JBQUEsaUJBQUEsV0FBVyxDQUFBLHdDQUFBLGlFQUFFO2dCQUFqQyxJQUFNLFVBQVUsd0JBQUE7Z0JBQ25CLElBQUksNEJBQWEsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQ3pDLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUN6QzthQUNGOzs7Ozs7Ozs7UUFFRCxJQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxVQUFVLEVBQUU7WUFDN0MsSUFBSSx3Q0FBa0IsQ0FBQyxVQUFVLENBQUM7WUFDbEMsSUFBSSwwQ0FBb0IsQ0FBQyxVQUFVLENBQUM7WUFDcEMsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLENBQUM7U0FDbEMsQ0FBQyxDQUFDOztZQUNILEtBQTBCLElBQUEsb0JBQUEsaUJBQUEsZUFBZSxDQUFBLGdEQUFBLDZFQUFFO2dCQUF0QyxJQUFNLFdBQVcsNEJBQUE7Z0JBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDNUI7Ozs7Ozs7OztRQUVELE9BQU8sZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQWxCRCxzREFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtuZWVkc0NsZWFuaW5nfSBmcm9tICcuLi8uLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50fSBmcm9tICcuLi8uLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5cbmltcG9ydCB7QmFja3VwRmlsZUNsZWFuZXIsIENsZWFuaW5nU3RyYXRlZ3ksIE5nY2NEaXJlY3RvcnlDbGVhbmVyLCBQYWNrYWdlSnNvbkNsZWFuZXJ9IGZyb20gJy4vY2xlYW5pbmdfc3RyYXRlZ2llcyc7XG5pbXBvcnQge2lzTG9jYWxEaXJlY3Rvcnl9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgY2xhc3MgdGhhdCBjYW4gY2xlYW4gbmdjYyBhcnRpZmFjdHMgZnJvbSBhIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhY2thZ2VDbGVhbmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjbGVhbmVyczogQ2xlYW5pbmdTdHJhdGVneVtdKSB7fVxuXG4gIC8qKlxuICAgKiBSZWN1cnNlIHRocm91Z2ggdGhlIGZpbGUtc3lzdGVtIGNsZWFuaW5nIGZpbGVzIGFuZCBkaXJlY3RvcmllcyBhcyBkZXRlcm1pbmVkIGJ5IHRoZSBjb25maWd1cmVkXG4gICAqIGNsZWFuaW5nLXN0cmF0ZWdpZXMuXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RvcnkgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IHRvIGNsZWFuXG4gICAqL1xuICBjbGVhbihkaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgY29uc3QgYmFzZW5hbWVzID0gdGhpcy5mcy5yZWFkZGlyKGRpcmVjdG9yeSk7XG4gICAgZm9yIChjb25zdCBiYXNlbmFtZSBvZiBiYXNlbmFtZXMpIHtcbiAgICAgIGlmIChiYXNlbmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmZzLnJlc29sdmUoZGlyZWN0b3J5LCBiYXNlbmFtZSk7XG4gICAgICBmb3IgKGNvbnN0IGNsZWFuZXIgb2YgdGhpcy5jbGVhbmVycykge1xuICAgICAgICBpZiAoY2xlYW5lci5jYW5DbGVhbihwYXRoLCBiYXNlbmFtZSkpIHtcbiAgICAgICAgICBjbGVhbmVyLmNsZWFuKHBhdGgsIGJhc2VuYW1lKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gUmVjdXJzZSBpbnRvIHN1YmRpcmVjdG9yaWVzIChub3RlIHRoYXQgYSBjbGVhbmVyIG1heSBoYXZlIHJlbW92ZWQgdGhpcyBwYXRoKVxuICAgICAgaWYgKGlzTG9jYWxEaXJlY3RvcnkodGhpcy5mcywgcGF0aCkpIHtcbiAgICAgICAgdGhpcy5jbGVhbihwYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuXG4vKipcbiAqIEl0ZXJhdGUgdGhyb3VnaCB0aGUgZ2l2ZW4gYGVudHJ5UG9pbnRzYCBpZGVudGlmeWluZyB0aGUgcGFja2FnZSBmb3IgZWFjaCB0aGF0IGhhcyBhdCBsZWFzdCBvbmVcbiAqIG91dGRhdGVkIHByb2Nlc3NlZCBmb3JtYXQsIHRoZW4gY2xlYW5pbmcgdGhvc2UgcGFja2FnZXMuXG4gKlxuICogTm90ZSB0aGF0IHdlIGhhdmUgdG8gY2xlYW4gZW50aXJlIHBhY2thZ2VzIGJlY2F1c2UgdGhlcmUgaXMgbm8gY2xlYXIgZmlsZS1zeXN0ZW0gYm91bmRhcnlcbiAqIGJldHdlZW4gZW50cnktcG9pbnRzIHdpdGhpbiBhIHBhY2thZ2UuIFNvIGlmIG9uZSBlbnRyeS1wb2ludCBpcyBvdXRkYXRlZCB3ZSBoYXZlIHRvIGNsZWFuXG4gKiBldmVyeXRoaW5nIHdpdGhpbiB0aGF0IHBhY2thZ2UuXG4gKlxuICogQHBhcmFtIGZpbGVTeXN0ZW0gdGhlIGN1cnJlbnQgZmlsZS1zeXN0ZW1cbiAqIEBwYXJhbSBlbnRyeVBvaW50cyB0aGUgZW50cnktcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGNvbGxlY3RlZCBmb3IgdGhpcyBydW4gb2YgbmdjY1xuICogQHJldHVybnMgdHJ1ZSBpZiBwYWNrYWdlcyBuZWVkZWQgdG8gYmUgY2xlYW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuT3V0ZGF0ZWRQYWNrYWdlcyhmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50czogRW50cnlQb2ludFtdKTogYm9vbGVhbiB7XG4gIGNvbnN0IHBhY2thZ2VzVG9DbGVhbiA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgIGlmIChuZWVkc0NsZWFuaW5nKGVudHJ5UG9pbnQucGFja2FnZUpzb24pKSB7XG4gICAgICBwYWNrYWdlc1RvQ2xlYW4uYWRkKGVudHJ5UG9pbnQucGFja2FnZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY2xlYW5lciA9IG5ldyBQYWNrYWdlQ2xlYW5lcihmaWxlU3lzdGVtLCBbXG4gICAgbmV3IFBhY2thZ2VKc29uQ2xlYW5lcihmaWxlU3lzdGVtKSxcbiAgICBuZXcgTmdjY0RpcmVjdG9yeUNsZWFuZXIoZmlsZVN5c3RlbSksXG4gICAgbmV3IEJhY2t1cEZpbGVDbGVhbmVyKGZpbGVTeXN0ZW0pLFxuICBdKTtcbiAgZm9yIChjb25zdCBwYWNrYWdlUGF0aCBvZiBwYWNrYWdlc1RvQ2xlYW4pIHtcbiAgICBjbGVhbmVyLmNsZWFuKHBhY2thZ2VQYXRoKTtcbiAgfVxuXG4gIHJldHVybiBwYWNrYWdlc1RvQ2xlYW4uc2l6ZSA+IDA7XG59XG4iXX0=