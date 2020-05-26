(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/bundle_program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findR3SymbolsPath = exports.makeBundleProgram = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var patch_ts_expando_initializer_1 = require("@angular/compiler-cli/ngcc/src/packages/patch_ts_expando_initializer");
    /**
     * Create a bundle program.
     */
    function makeBundleProgram(fs, isCore, pkg, path, r3FileName, options, host, additionalFiles) {
        if (additionalFiles === void 0) { additionalFiles = []; }
        var r3SymbolsPath = isCore ? findR3SymbolsPath(fs, file_system_1.dirname(path), r3FileName) : null;
        var rootPaths = r3SymbolsPath ? tslib_1.__spread([path, r3SymbolsPath], additionalFiles) : tslib_1.__spread([path], additionalFiles);
        var originalGetExpandoInitializer = patch_ts_expando_initializer_1.patchTsGetExpandoInitializer();
        var program = ts.createProgram(rootPaths, options, host);
        // Ask for the typeChecker to trigger the binding phase of the compilation.
        // This will then exercise the patched function.
        program.getTypeChecker();
        patch_ts_expando_initializer_1.restoreGetExpandoInitializer(originalGetExpandoInitializer);
        var file = program.getSourceFile(path);
        var r3SymbolsFile = r3SymbolsPath && program.getSourceFile(r3SymbolsPath) || null;
        return { program: program, options: options, host: host, package: pkg, path: path, file: file, r3SymbolsPath: r3SymbolsPath, r3SymbolsFile: r3SymbolsFile };
    }
    exports.makeBundleProgram = makeBundleProgram;
    /**
     * Search the given directory hierarchy to find the path to the `r3_symbols` file.
     */
    function findR3SymbolsPath(fs, directory, filename) {
        var e_1, _a;
        var r3SymbolsFilePath = file_system_1.resolve(directory, filename);
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
            var stat = fs.lstat(file_system_1.resolve(directory, p));
            return stat.isDirectory() && !stat.isSymbolicLink();
        });
        try {
            for (var subDirectories_1 = tslib_1.__values(subDirectories), subDirectories_1_1 = subDirectories_1.next(); !subDirectories_1_1.done; subDirectories_1_1 = subDirectories_1.next()) {
                var subDirectory = subDirectories_1_1.value;
                var r3SymbolsFilePath_1 = findR3SymbolsPath(fs, file_system_1.resolve(directory, subDirectory), filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBNEY7SUFFNUYscUhBQTBHO0lBcUIxRzs7T0FFRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixFQUFjLEVBQUUsTUFBZSxFQUFFLEdBQW1CLEVBQUUsSUFBb0IsRUFBRSxVQUFrQixFQUM5RixPQUEyQixFQUFFLElBQXFCLEVBQ2xELGVBQXNDO1FBQXRDLGdDQUFBLEVBQUEsb0JBQXNDO1FBQ3hDLElBQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLHFCQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN2RixJQUFJLFNBQVMsR0FDVCxhQUFhLENBQUMsQ0FBQyxtQkFBRSxJQUFJLEVBQUUsYUFBYSxHQUFLLGVBQWUsRUFBRSxDQUFDLG1CQUFFLElBQUksR0FBSyxlQUFlLENBQUMsQ0FBQztRQUUzRixJQUFNLDZCQUE2QixHQUFHLDJEQUE0QixFQUFFLENBQUM7UUFDckUsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNELDJFQUEyRTtRQUMzRSxnREFBZ0Q7UUFDaEQsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pCLDJEQUE0QixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFNUQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUMxQyxJQUFNLGFBQWEsR0FBRyxhQUFhLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUM7UUFFcEYsT0FBTyxFQUFDLE9BQU8sU0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLElBQUksTUFBQSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsYUFBYSxlQUFBLEVBQUUsYUFBYSxlQUFBLEVBQUMsQ0FBQztJQUMxRixDQUFDO0lBbkJELDhDQW1CQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxTQUF5QixFQUFFLFFBQWdCOztRQUM3RCxJQUFNLGlCQUFpQixHQUFHLHFCQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ2hDLE9BQU8saUJBQWlCLENBQUM7U0FDMUI7UUFFRCxJQUFNLGNBQWMsR0FDaEIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDakIsaUNBQWlDO2FBQ2hDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBbEIsQ0FBa0IsQ0FBQztZQUNoQyxzQkFBc0I7YUFDckIsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxLQUFLLGNBQWMsRUFBcEIsQ0FBb0IsQ0FBQztZQUNsQyx3RUFBd0U7YUFDdkUsTUFBTSxDQUFDLFVBQUEsQ0FBQztZQUNQLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMscUJBQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQzs7WUFFWCxLQUEyQixJQUFBLG1CQUFBLGlCQUFBLGNBQWMsQ0FBQSw4Q0FBQSwwRUFBRTtnQkFBdEMsSUFBTSxZQUFZLDJCQUFBO2dCQUNyQixJQUFNLG1CQUFpQixHQUFHLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxxQkFBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDNUYsSUFBSSxtQkFBaUIsRUFBRTtvQkFDckIsT0FBTyxtQkFBaUIsQ0FBQztpQkFDMUI7YUFDRjs7Ozs7Ozs7O1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBM0JELDhDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBkaXJuYW1lLCBGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge3BhdGNoVHNHZXRFeHBhbmRvSW5pdGlhbGl6ZXIsIHJlc3RvcmVHZXRFeHBhbmRvSW5pdGlhbGl6ZXJ9IGZyb20gJy4vcGF0Y2hfdHNfZXhwYW5kb19pbml0aWFsaXplcic7XG5cbi8qKlxuICogQW4gZW50cnkgcG9pbnQgYnVuZGxlIGNvbnRhaW5zIG9uZSBvciB0d28gcHJvZ3JhbXMsIGUuZy4gYHNyY2AgYW5kIGBkdHNgLFxuICogdGhhdCBhcmUgY29tcGlsZWQgdmlhIFR5cGVTY3JpcHQuXG4gKlxuICogVG8gYWlkIHdpdGggcHJvY2Vzc2luZyB0aGUgcHJvZ3JhbSwgdGhpcyBpbnRlcmZhY2UgZXhwb3NlcyB0aGUgcHJvZ3JhbSBpdHNlbGYsXG4gKiBhcyB3ZWxsIGFzIHBhdGggYW5kIFRTIGZpbGUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBwcm9ncmFtIGFuZCB0aGUgcjNTeW1ib2xzXG4gKiBmaWxlLCBpZiBhcHByb3ByaWF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVQcm9ncmFtIHtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zO1xuICBob3N0OiB0cy5Db21waWxlckhvc3Q7XG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICBmaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICBwYWNrYWdlOiBBYnNvbHV0ZUZzUGF0aDtcbiAgcjNTeW1ib2xzUGF0aDogQWJzb2x1dGVGc1BhdGh8bnVsbDtcbiAgcjNTeW1ib2xzRmlsZTogdHMuU291cmNlRmlsZXxudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGJ1bmRsZSBwcm9ncmFtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGlzQ29yZTogYm9vbGVhbiwgcGtnOiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgsIHIzRmlsZU5hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICBhZGRpdGlvbmFsRmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXSk6IEJ1bmRsZVByb2dyYW0ge1xuICBjb25zdCByM1N5bWJvbHNQYXRoID0gaXNDb3JlID8gZmluZFIzU3ltYm9sc1BhdGgoZnMsIGRpcm5hbWUocGF0aCksIHIzRmlsZU5hbWUpIDogbnVsbDtcbiAgbGV0IHJvb3RQYXRocyA9XG4gICAgICByM1N5bWJvbHNQYXRoID8gW3BhdGgsIHIzU3ltYm9sc1BhdGgsIC4uLmFkZGl0aW9uYWxGaWxlc10gOiBbcGF0aCwgLi4uYWRkaXRpb25hbEZpbGVzXTtcblxuICBjb25zdCBvcmlnaW5hbEdldEV4cGFuZG9Jbml0aWFsaXplciA9IHBhdGNoVHNHZXRFeHBhbmRvSW5pdGlhbGl6ZXIoKTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdFBhdGhzLCBvcHRpb25zLCBob3N0KTtcbiAgLy8gQXNrIGZvciB0aGUgdHlwZUNoZWNrZXIgdG8gdHJpZ2dlciB0aGUgYmluZGluZyBwaGFzZSBvZiB0aGUgY29tcGlsYXRpb24uXG4gIC8vIFRoaXMgd2lsbCB0aGVuIGV4ZXJjaXNlIHRoZSBwYXRjaGVkIGZ1bmN0aW9uLlxuICBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gIHJlc3RvcmVHZXRFeHBhbmRvSW5pdGlhbGl6ZXIob3JpZ2luYWxHZXRFeHBhbmRvSW5pdGlhbGl6ZXIpO1xuXG4gIGNvbnN0IGZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUocGF0aCkhO1xuICBjb25zdCByM1N5bWJvbHNGaWxlID0gcjNTeW1ib2xzUGF0aCAmJiBwcm9ncmFtLmdldFNvdXJjZUZpbGUocjNTeW1ib2xzUGF0aCkgfHwgbnVsbDtcblxuICByZXR1cm4ge3Byb2dyYW0sIG9wdGlvbnMsIGhvc3QsIHBhY2thZ2U6IHBrZywgcGF0aCwgZmlsZSwgcjNTeW1ib2xzUGF0aCwgcjNTeW1ib2xzRmlsZX07XG59XG5cbi8qKlxuICogU2VhcmNoIHRoZSBnaXZlbiBkaXJlY3RvcnkgaGllcmFyY2h5IHRvIGZpbmQgdGhlIHBhdGggdG8gdGhlIGByM19zeW1ib2xzYCBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFIzU3ltYm9sc1BhdGgoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGRpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIGZpbGVuYW1lOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgY29uc3QgcjNTeW1ib2xzRmlsZVBhdGggPSByZXNvbHZlKGRpcmVjdG9yeSwgZmlsZW5hbWUpO1xuICBpZiAoZnMuZXhpc3RzKHIzU3ltYm9sc0ZpbGVQYXRoKSkge1xuICAgIHJldHVybiByM1N5bWJvbHNGaWxlUGF0aDtcbiAgfVxuXG4gIGNvbnN0IHN1YkRpcmVjdG9yaWVzID1cbiAgICAgIGZzLnJlYWRkaXIoZGlyZWN0b3J5KVxuICAgICAgICAgIC8vIE5vdCBpbnRlcmVzdGVkIGluIGhpZGRlbiBmaWxlc1xuICAgICAgICAgIC5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgLy8gSWdub3JlIG5vZGVfbW9kdWxlc1xuICAgICAgICAgIC5maWx0ZXIocCA9PiBwICE9PSAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gZGlyZWN0b3JpZXMgKGFuZCBvbmx5IHRob3NlIHRoYXQgYXJlIG5vdCBzeW1saW5rcylcbiAgICAgICAgICAuZmlsdGVyKHAgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLmxzdGF0KHJlc29sdmUoZGlyZWN0b3J5LCBwKSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgICAgfSk7XG5cbiAgZm9yIChjb25zdCBzdWJEaXJlY3Rvcnkgb2Ygc3ViRGlyZWN0b3JpZXMpIHtcbiAgICBjb25zdCByM1N5bWJvbHNGaWxlUGF0aCA9IGZpbmRSM1N5bWJvbHNQYXRoKGZzLCByZXNvbHZlKGRpcmVjdG9yeSwgc3ViRGlyZWN0b3J5KSwgZmlsZW5hbWUpO1xuICAgIGlmIChyM1N5bWJvbHNGaWxlUGF0aCkge1xuICAgICAgcmV0dXJuIHIzU3ltYm9sc0ZpbGVQYXRoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19