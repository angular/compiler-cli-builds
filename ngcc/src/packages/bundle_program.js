(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/bundle_program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer"], factory);
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
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var patch_ts_expando_initializer_1 = require("@angular/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer");
    /**
     * Create a bundle program.
     */
    function makeBundleProgram(fs, isCore, path, r3FileName, options, host) {
        var r3SymbolsPath = isCore ? findR3SymbolsPath(fs, path_1.AbsoluteFsPath.dirname(path), r3FileName) : null;
        var rootPaths = r3SymbolsPath ? [path, r3SymbolsPath] : [path];
        var originalGetExpandoInitializer = patch_ts_expando_initializer_1.patchTsGetExpandoInitializer();
        var program = ts.createProgram(rootPaths, options, host);
        patch_ts_expando_initializer_1.restoreGetExpandoInitializer(originalGetExpandoInitializer);
        var file = program.getSourceFile(path);
        var r3SymbolsFile = r3SymbolsPath && program.getSourceFile(r3SymbolsPath) || null;
        return { program: program, options: options, host: host, path: path, file: file, r3SymbolsPath: r3SymbolsPath, r3SymbolsFile: r3SymbolsFile };
    }
    exports.makeBundleProgram = makeBundleProgram;
    /**
     * Search the given directory hierarchy to find the path to the `r3_symbols` file.
     */
    function findR3SymbolsPath(fs, directory, filename) {
        var e_1, _a;
        var r3SymbolsFilePath = path_1.AbsoluteFsPath.resolve(directory, filename);
        if (fs.exists(r3SymbolsFilePath)) {
            return r3SymbolsFilePath;
        }
        var subDirectories = fs.readdir(directory)
            // Not interested in hidden files
            .filter(function (p) { return !p.startsWith('.'); })
            // Ignore node_modules
            .filter(function (p) { return p !== 'node_modules'; })
            // Only interested in directories (and only those that are not symlinks)
            .filter(function (p) {
            var stat = fs.lstat(path_1.AbsoluteFsPath.resolve(directory, p));
            return stat.isDirectory() && !stat.isSymbolicLink();
        });
        try {
            for (var subDirectories_1 = tslib_1.__values(subDirectories), subDirectories_1_1 = subDirectories_1.next(); !subDirectories_1_1.done; subDirectories_1_1 = subDirectories_1.next()) {
                var subDirectory = subDirectories_1_1.value;
                var r3SymbolsFilePath_1 = findR3SymbolsPath(fs, path_1.AbsoluteFsPath.resolve(directory, subDirectory), filename);
                if (r3SymbolsFilePath_1) {
                    return r3SymbolsFilePath_1;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (subDirectories_1_1 && !subDirectories_1_1.done && (_a = subDirectories_1.return)) _a.call(subDirectories_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    }
    exports.findR3SymbolsPath = findR3SymbolsPath;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDZEQUF1RDtJQUV2RCxxSEFBMEc7SUFvQjFHOztPQUVHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxNQUFlLEVBQUUsSUFBb0IsRUFBRSxVQUFrQixFQUN6RSxPQUEyQixFQUFFLElBQXFCO1FBQ3BELElBQU0sYUFBYSxHQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLHFCQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDcEYsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqRSxJQUFNLDZCQUE2QixHQUFHLDJEQUE0QixFQUFFLENBQUM7UUFDckUsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNELDJEQUE0QixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFNUQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUcsQ0FBQztRQUMzQyxJQUFNLGFBQWEsR0FBRyxhQUFhLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUM7UUFFcEYsT0FBTyxFQUFDLE9BQU8sU0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLGFBQWEsZUFBQSxFQUFFLGFBQWEsZUFBQSxFQUFDLENBQUM7SUFDNUUsQ0FBQztJQWZELDhDQWVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsRUFBYyxFQUFFLFNBQXlCLEVBQUUsUUFBZ0I7O1FBQzdELElBQU0saUJBQWlCLEdBQUcscUJBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ2hDLE9BQU8saUJBQWlCLENBQUM7U0FDMUI7UUFFRCxJQUFNLGNBQWMsR0FDaEIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDakIsaUNBQWlDO2FBQ2hDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBbEIsQ0FBa0IsQ0FBQztZQUNoQyxzQkFBc0I7YUFDckIsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxLQUFLLGNBQWMsRUFBcEIsQ0FBb0IsQ0FBQztZQUNsQyx3RUFBd0U7YUFDdkUsTUFBTSxDQUFDLFVBQUEsQ0FBQztZQUNQLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMscUJBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7O1lBRVgsS0FBMkIsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7Z0JBQXRDLElBQU0sWUFBWSwyQkFBQTtnQkFDckIsSUFBTSxtQkFBaUIsR0FDbkIsaUJBQWlCLENBQUMsRUFBRSxFQUFFLHFCQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDckYsSUFBSSxtQkFBaUIsRUFBRTtvQkFDckIsT0FBTyxtQkFBaUIsQ0FBQztpQkFDMUI7YUFDRjs7Ozs7Ozs7O1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBNUJELDhDQTRCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7cGF0Y2hUc0dldEV4cGFuZG9Jbml0aWFsaXplciwgcmVzdG9yZUdldEV4cGFuZG9Jbml0aWFsaXplcn0gZnJvbSAnLi9wYXRjaF90c19leHBhbmRvX2luaXRpYWxpemVyJztcblxuLyoqXG4qIEFuIGVudHJ5IHBvaW50IGJ1bmRsZSBjb250YWlucyBvbmUgb3IgdHdvIHByb2dyYW1zLCBlLmcuIGBzcmNgIGFuZCBgZHRzYCxcbiogdGhhdCBhcmUgY29tcGlsZWQgdmlhIFR5cGVTY3JpcHQuXG4qXG4qIFRvIGFpZCB3aXRoIHByb2Nlc3NpbmcgdGhlIHByb2dyYW0sIHRoaXMgaW50ZXJmYWNlIGV4cG9zZXMgdGhlIHByb2dyYW0gaXRzZWxmLFxuKiBhcyB3ZWxsIGFzIHBhdGggYW5kIFRTIGZpbGUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBwcm9ncmFtIGFuZCB0aGUgcjNTeW1ib2xzXG4qIGZpbGUsIGlmIGFwcHJvcHJpYXRlLlxuKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUHJvZ3JhbSB7XG4gIHByb2dyYW06IHRzLlByb2dyYW07XG4gIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucztcbiAgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgZmlsZTogdHMuU291cmNlRmlsZTtcbiAgcjNTeW1ib2xzUGF0aDogQWJzb2x1dGVGc1BhdGh8bnVsbDtcbiAgcjNTeW1ib2xzRmlsZTogdHMuU291cmNlRmlsZXxudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGJ1bmRsZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGlzQ29yZTogYm9vbGVhbiwgcGF0aDogQWJzb2x1dGVGc1BhdGgsIHIzRmlsZU5hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCk6IEJ1bmRsZVByb2dyYW0ge1xuICBjb25zdCByM1N5bWJvbHNQYXRoID1cbiAgICAgIGlzQ29yZSA/IGZpbmRSM1N5bWJvbHNQYXRoKGZzLCBBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKHBhdGgpLCByM0ZpbGVOYW1lKSA6IG51bGw7XG4gIGNvbnN0IHJvb3RQYXRocyA9IHIzU3ltYm9sc1BhdGggPyBbcGF0aCwgcjNTeW1ib2xzUGF0aF0gOiBbcGF0aF07XG5cbiAgY29uc3Qgb3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIgPSBwYXRjaFRzR2V0RXhwYW5kb0luaXRpYWxpemVyKCk7XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RQYXRocywgb3B0aW9ucywgaG9zdCk7XG4gIHJlc3RvcmVHZXRFeHBhbmRvSW5pdGlhbGl6ZXIob3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIpO1xuXG4gIGNvbnN0IGZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUocGF0aCkgITtcbiAgY29uc3QgcjNTeW1ib2xzRmlsZSA9IHIzU3ltYm9sc1BhdGggJiYgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHIzU3ltYm9sc1BhdGgpIHx8IG51bGw7XG5cbiAgcmV0dXJuIHtwcm9ncmFtLCBvcHRpb25zLCBob3N0LCBwYXRoLCBmaWxlLCByM1N5bWJvbHNQYXRoLCByM1N5bWJvbHNGaWxlfTtcbn1cblxuLyoqXG4gKiBTZWFyY2ggdGhlIGdpdmVuIGRpcmVjdG9yeSBoaWVyYXJjaHkgdG8gZmluZCB0aGUgcGF0aCB0byB0aGUgYHIzX3N5bWJvbHNgIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUjNTeW1ib2xzUGF0aChcbiAgICBmczogRmlsZVN5c3RlbSwgZGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCwgZmlsZW5hbWU6IHN0cmluZyk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICBjb25zdCByM1N5bWJvbHNGaWxlUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUoZGlyZWN0b3J5LCBmaWxlbmFtZSk7XG4gIGlmIChmcy5leGlzdHMocjNTeW1ib2xzRmlsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHIzU3ltYm9sc0ZpbGVQYXRoO1xuICB9XG5cbiAgY29uc3Qgc3ViRGlyZWN0b3JpZXMgPVxuICAgICAgZnMucmVhZGRpcihkaXJlY3RvcnkpXG4gICAgICAgICAgLy8gTm90IGludGVyZXN0ZWQgaW4gaGlkZGVuIGZpbGVzXG4gICAgICAgICAgLmZpbHRlcihwID0+ICFwLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgICAgLmZpbHRlcihwID0+IHAgIT09ICdub2RlX21vZHVsZXMnKVxuICAgICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBkaXJlY3RvcmllcyAoYW5kIG9ubHkgdGhvc2UgdGhhdCBhcmUgbm90IHN5bWxpbmtzKVxuICAgICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMubHN0YXQoQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShkaXJlY3RvcnksIHApKTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0LmlzRGlyZWN0b3J5KCkgJiYgIXN0YXQuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICAgICAgICB9KTtcblxuICBmb3IgKGNvbnN0IHN1YkRpcmVjdG9yeSBvZiBzdWJEaXJlY3Rvcmllcykge1xuICAgIGNvbnN0IHIzU3ltYm9sc0ZpbGVQYXRoID1cbiAgICAgICAgZmluZFIzU3ltYm9sc1BhdGgoZnMsIEFic29sdXRlRnNQYXRoLnJlc29sdmUoZGlyZWN0b3J5LCBzdWJEaXJlY3RvcnkpLCBmaWxlbmFtZSk7XG4gICAgaWYgKHIzU3ltYm9sc0ZpbGVQYXRoKSB7XG4gICAgICByZXR1cm4gcjNTeW1ib2xzRmlsZVBhdGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=