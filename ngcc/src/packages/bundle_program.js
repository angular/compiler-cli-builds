(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/bundle_program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/path"], factory);
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
    /**
     * Create a bundle program.
     */
    function makeBundleProgram(fs, isCore, path, r3FileName, options, host) {
        var r3SymbolsPath = isCore ? findR3SymbolsPath(fs, path_1.AbsoluteFsPath.dirname(path), r3FileName) : null;
        var rootPaths = r3SymbolsPath ? [path, r3SymbolsPath] : [path];
        var program = ts.createProgram(rootPaths, options, host);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDZEQUF1RDtJQXFCdkQ7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsRUFBYyxFQUFFLE1BQWUsRUFBRSxJQUFvQixFQUFFLFVBQWtCLEVBQ3pFLE9BQTJCLEVBQUUsSUFBcUI7UUFDcEQsSUFBTSxhQUFhLEdBQ2YsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUscUJBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRixJQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBRyxDQUFDO1FBQzNDLElBQU0sYUFBYSxHQUFHLGFBQWEsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUVwRixPQUFPLEVBQUMsT0FBTyxTQUFBLEVBQUUsT0FBTyxTQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsYUFBYSxlQUFBLEVBQUUsYUFBYSxlQUFBLEVBQUMsQ0FBQztJQUM1RSxDQUFDO0lBWEQsOENBV0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixFQUFjLEVBQUUsU0FBeUIsRUFBRSxRQUFnQjs7UUFDN0QsSUFBTSxpQkFBaUIsR0FBRyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDaEMsT0FBTyxpQkFBaUIsQ0FBQztTQUMxQjtRQUVELElBQU0sY0FBYyxHQUNoQixFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNqQixpQ0FBaUM7YUFDaEMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUFDO1lBQ2hDLHNCQUFzQjthQUNyQixNQUFNLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEtBQUssY0FBYyxFQUFwQixDQUFvQixDQUFDO1lBQ2xDLHdFQUF3RTthQUN2RSxNQUFNLENBQUMsVUFBQSxDQUFDO1lBQ1AsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQzs7WUFFWCxLQUEyQixJQUFBLG1CQUFBLGlCQUFBLGNBQWMsQ0FBQSw4Q0FBQSwwRUFBRTtnQkFBdEMsSUFBTSxZQUFZLDJCQUFBO2dCQUNyQixJQUFNLG1CQUFpQixHQUNuQixpQkFBaUIsQ0FBQyxFQUFFLEVBQUUscUJBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNyRixJQUFJLG1CQUFpQixFQUFFO29CQUNyQixPQUFPLG1CQUFpQixDQUFDO2lCQUMxQjthQUNGOzs7Ozs7Ozs7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUE1QkQsOENBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuXG4vKipcbiogQW4gZW50cnkgcG9pbnQgYnVuZGxlIGNvbnRhaW5zIG9uZSBvciB0d28gcHJvZ3JhbXMsIGUuZy4gYHNyY2AgYW5kIGBkdHNgLFxuKiB0aGF0IGFyZSBjb21waWxlZCB2aWEgVHlwZVNjcmlwdC5cbipcbiogVG8gYWlkIHdpdGggcHJvY2Vzc2luZyB0aGUgcHJvZ3JhbSwgdGhpcyBpbnRlcmZhY2UgZXhwb3NlcyB0aGUgcHJvZ3JhbSBpdHNlbGYsXG4qIGFzIHdlbGwgYXMgcGF0aCBhbmQgVFMgZmlsZSBvZiB0aGUgZW50cnktcG9pbnQgdG8gdGhlIHByb2dyYW0gYW5kIHRoZSByM1N5bWJvbHNcbiogZmlsZSwgaWYgYXBwcm9wcmlhdGUuXG4qL1xuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVQcm9ncmFtIHtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zO1xuICBob3N0OiB0cy5Db21waWxlckhvc3Q7XG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICBmaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICByM1N5bWJvbHNQYXRoOiBBYnNvbHV0ZUZzUGF0aHxudWxsO1xuICByM1N5bWJvbHNGaWxlOiB0cy5Tb3VyY2VGaWxlfG51bGw7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYnVuZGxlIHByb2dyYW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQnVuZGxlUHJvZ3JhbShcbiAgICBmczogRmlsZVN5c3RlbSwgaXNDb3JlOiBib29sZWFuLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcjNGaWxlTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgaG9zdDogdHMuQ29tcGlsZXJIb3N0KTogQnVuZGxlUHJvZ3JhbSB7XG4gIGNvbnN0IHIzU3ltYm9sc1BhdGggPVxuICAgICAgaXNDb3JlID8gZmluZFIzU3ltYm9sc1BhdGgoZnMsIEFic29sdXRlRnNQYXRoLmRpcm5hbWUocGF0aCksIHIzRmlsZU5hbWUpIDogbnVsbDtcbiAgY29uc3Qgcm9vdFBhdGhzID0gcjNTeW1ib2xzUGF0aCA/IFtwYXRoLCByM1N5bWJvbHNQYXRoXSA6IFtwYXRoXTtcbiAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0ocm9vdFBhdGhzLCBvcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShwYXRoKSAhO1xuICBjb25zdCByM1N5bWJvbHNGaWxlID0gcjNTeW1ib2xzUGF0aCAmJiBwcm9ncmFtLmdldFNvdXJjZUZpbGUocjNTeW1ib2xzUGF0aCkgfHwgbnVsbDtcblxuICByZXR1cm4ge3Byb2dyYW0sIG9wdGlvbnMsIGhvc3QsIHBhdGgsIGZpbGUsIHIzU3ltYm9sc1BhdGgsIHIzU3ltYm9sc0ZpbGV9O1xufVxuXG4vKipcbiAqIFNlYXJjaCB0aGUgZ2l2ZW4gZGlyZWN0b3J5IGhpZXJhcmNoeSB0byBmaW5kIHRoZSBwYXRoIHRvIHRoZSBgcjNfc3ltYm9sc2AgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRSM1N5bWJvbHNQYXRoKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBkaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCBmaWxlbmFtZTogc3RyaW5nKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gIGNvbnN0IHIzU3ltYm9sc0ZpbGVQYXRoID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShkaXJlY3RvcnksIGZpbGVuYW1lKTtcbiAgaWYgKGZzLmV4aXN0cyhyM1N5bWJvbHNGaWxlUGF0aCkpIHtcbiAgICByZXR1cm4gcjNTeW1ib2xzRmlsZVBhdGg7XG4gIH1cblxuICBjb25zdCBzdWJEaXJlY3RvcmllcyA9XG4gICAgICBmcy5yZWFkZGlyKGRpcmVjdG9yeSlcbiAgICAgICAgICAvLyBOb3QgaW50ZXJlc3RlZCBpbiBoaWRkZW4gZmlsZXNcbiAgICAgICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAgIC8vIElnbm9yZSBub2RlX21vZHVsZXNcbiAgICAgICAgICAuZmlsdGVyKHAgPT4gcCAhPT0gJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAgICAgLmZpbHRlcihwID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5sc3RhdChBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGRpcmVjdG9yeSwgcCkpO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSAmJiAhc3RhdC5pc1N5bWJvbGljTGluaygpO1xuICAgICAgICAgIH0pO1xuXG4gIGZvciAoY29uc3Qgc3ViRGlyZWN0b3J5IG9mIHN1YkRpcmVjdG9yaWVzKSB7XG4gICAgY29uc3QgcjNTeW1ib2xzRmlsZVBhdGggPVxuICAgICAgICBmaW5kUjNTeW1ib2xzUGF0aChmcywgQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShkaXJlY3RvcnksIHN1YkRpcmVjdG9yeSksIGZpbGVuYW1lKTtcbiAgICBpZiAocjNTeW1ib2xzRmlsZVBhdGgpIHtcbiAgICAgIHJldHVybiByM1N5bWJvbHNGaWxlUGF0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==