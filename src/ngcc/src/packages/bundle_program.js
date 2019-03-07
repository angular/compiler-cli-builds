(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/bundle_program", ["require", "exports", "tslib", "canonical-path", "fs", "typescript"], factory);
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
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var ts = require("typescript");
    /**
     * Create a bundle program.
     */
    function makeBundleProgram(isCore, path, r3FileName, options, host) {
        var r3SymbolsPath = isCore ? findR3SymbolsPath(canonical_path_1.dirname(path), r3FileName) : null;
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
    function findR3SymbolsPath(directory, filename) {
        var e_1, _a;
        var r3SymbolsFilePath = canonical_path_1.resolve(directory, filename);
        if (fs_1.existsSync(r3SymbolsFilePath)) {
            return r3SymbolsFilePath;
        }
        var subDirectories = fs_1.readdirSync(directory)
            // Not interested in hidden files
            .filter(function (p) { return !p.startsWith('.'); })
            // Ignore node_modules
            .filter(function (p) { return p !== 'node_modules'; })
            // Only interested in directories (and only those that are not symlinks)
            .filter(function (p) {
            var stat = fs_1.lstatSync(canonical_path_1.resolve(directory, p));
            return stat.isDirectory() && !stat.isSymbolicLink();
        });
        try {
            for (var subDirectories_1 = tslib_1.__values(subDirectories), subDirectories_1_1 = subDirectories_1.next(); !subDirectories_1_1.done; subDirectories_1_1 = subDirectories_1.next()) {
                var subDirectory = subDirectories_1_1.value;
                var r3SymbolsFilePath_1 = findR3SymbolsPath(canonical_path_1.resolve(directory, subDirectory), filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUFnRDtJQUNoRCx5QkFBc0Q7SUFDdEQsK0JBQWlDO0lBb0JqQzs7T0FFRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixNQUFlLEVBQUUsSUFBWSxFQUFFLFVBQWtCLEVBQUUsT0FBMkIsRUFDOUUsSUFBcUI7UUFDdkIsSUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBTyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDbkYsSUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRSxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUcsQ0FBQztRQUMzQyxJQUFNLGFBQWEsR0FBRyxhQUFhLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUM7UUFFcEYsT0FBTyxFQUFDLE9BQU8sU0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLGFBQWEsZUFBQSxFQUFFLGFBQWEsZUFBQSxFQUFDLENBQUM7SUFDNUUsQ0FBQztJQVZELDhDQVVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxTQUFpQixFQUFFLFFBQWdCOztRQUNuRSxJQUFNLGlCQUFpQixHQUFHLHdCQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksZUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDakMsT0FBTyxpQkFBaUIsQ0FBQztTQUMxQjtRQUVELElBQU0sY0FBYyxHQUNoQixnQkFBVyxDQUFDLFNBQVMsQ0FBQztZQUNsQixpQ0FBaUM7YUFDaEMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUFDO1lBQ2hDLHNCQUFzQjthQUNyQixNQUFNLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEtBQUssY0FBYyxFQUFwQixDQUFvQixDQUFDO1lBQ2xDLHdFQUF3RTthQUN2RSxNQUFNLENBQUMsVUFBQSxDQUFDO1lBQ1AsSUFBTSxJQUFJLEdBQUcsY0FBUyxDQUFDLHdCQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7O1lBRVgsS0FBMkIsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7Z0JBQXRDLElBQU0sWUFBWSwyQkFBQTtnQkFDckIsSUFBTSxtQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyx3QkFBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDMUYsSUFBSSxtQkFBaUIsRUFBRTtvQkFDckIsT0FBTyxtQkFBaUIsQ0FBQztpQkFDMUI7YUFDRjs7Ozs7Ozs7O1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBMUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7ZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtleGlzdHNTeW5jLCBsc3RhdFN5bmMsIHJlYWRkaXJTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuLyoqXG4qIEFuIGVudHJ5IHBvaW50IGJ1bmRsZSBjb250YWlucyBvbmUgb3IgdHdvIHByb2dyYW1zLCBlLmcuIGBzcmNgIGFuZCBgZHRzYCxcbiogdGhhdCBhcmUgY29tcGlsZWQgdmlhIFR5cGVTY3JpcHQuXG4qXG4qIFRvIGFpZCB3aXRoIHByb2Nlc3NpbmcgdGhlIHByb2dyYW0sIHRoaXMgaW50ZXJmYWNlIGV4cG9zZXMgdGhlIHByb2dyYW0gaXRzZWxmLFxuKiBhcyB3ZWxsIGFzIHBhdGggYW5kIFRTIGZpbGUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBwcm9ncmFtIGFuZCB0aGUgcjNTeW1ib2xzXG4qIGZpbGUsIGlmIGFwcHJvcHJpYXRlLlxuKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlUHJvZ3JhbSB7XG4gIHByb2dyYW06IHRzLlByb2dyYW07XG4gIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucztcbiAgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwYXRoOiBzdHJpbmc7XG4gIGZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIHIzU3ltYm9sc1BhdGg6IHN0cmluZ3xudWxsO1xuICByM1N5bWJvbHNGaWxlOiB0cy5Tb3VyY2VGaWxlfG51bGw7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYnVuZGxlIHByb2dyYW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQnVuZGxlUHJvZ3JhbShcbiAgICBpc0NvcmU6IGJvb2xlYW4sIHBhdGg6IHN0cmluZywgcjNGaWxlTmFtZTogc3RyaW5nLCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgaG9zdDogdHMuQ29tcGlsZXJIb3N0KTogQnVuZGxlUHJvZ3JhbSB7XG4gIGNvbnN0IHIzU3ltYm9sc1BhdGggPSBpc0NvcmUgPyBmaW5kUjNTeW1ib2xzUGF0aChkaXJuYW1lKHBhdGgpLCByM0ZpbGVOYW1lKSA6IG51bGw7XG4gIGNvbnN0IHJvb3RQYXRocyA9IHIzU3ltYm9sc1BhdGggPyBbcGF0aCwgcjNTeW1ib2xzUGF0aF0gOiBbcGF0aF07XG4gIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RQYXRocywgb3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUocGF0aCkgITtcbiAgY29uc3QgcjNTeW1ib2xzRmlsZSA9IHIzU3ltYm9sc1BhdGggJiYgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHIzU3ltYm9sc1BhdGgpIHx8IG51bGw7XG5cbiAgcmV0dXJuIHtwcm9ncmFtLCBvcHRpb25zLCBob3N0LCBwYXRoLCBmaWxlLCByM1N5bWJvbHNQYXRoLCByM1N5bWJvbHNGaWxlfTtcbn1cblxuLyoqXG4gKiBTZWFyY2ggdGhlIGdpdmVuIGRpcmVjdG9yeSBoaWVyYXJjaHkgdG8gZmluZCB0aGUgcGF0aCB0byB0aGUgYHIzX3N5bWJvbHNgIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUjNTeW1ib2xzUGF0aChkaXJlY3Rvcnk6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgcjNTeW1ib2xzRmlsZVBhdGggPSByZXNvbHZlKGRpcmVjdG9yeSwgZmlsZW5hbWUpO1xuICBpZiAoZXhpc3RzU3luYyhyM1N5bWJvbHNGaWxlUGF0aCkpIHtcbiAgICByZXR1cm4gcjNTeW1ib2xzRmlsZVBhdGg7XG4gIH1cblxuICBjb25zdCBzdWJEaXJlY3RvcmllcyA9XG4gICAgICByZWFkZGlyU3luYyhkaXJlY3RvcnkpXG4gICAgICAgICAgLy8gTm90IGludGVyZXN0ZWQgaW4gaGlkZGVuIGZpbGVzXG4gICAgICAgICAgLmZpbHRlcihwID0+ICFwLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgICAgLmZpbHRlcihwID0+IHAgIT09ICdub2RlX21vZHVsZXMnKVxuICAgICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBkaXJlY3RvcmllcyAoYW5kIG9ubHkgdGhvc2UgdGhhdCBhcmUgbm90IHN5bWxpbmtzKVxuICAgICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gbHN0YXRTeW5jKHJlc29sdmUoZGlyZWN0b3J5LCBwKSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgICAgfSk7XG5cbiAgZm9yIChjb25zdCBzdWJEaXJlY3Rvcnkgb2Ygc3ViRGlyZWN0b3JpZXMpIHtcbiAgICBjb25zdCByM1N5bWJvbHNGaWxlUGF0aCA9IGZpbmRSM1N5bWJvbHNQYXRoKHJlc29sdmUoZGlyZWN0b3J5LCBzdWJEaXJlY3RvcnksICksIGZpbGVuYW1lKTtcbiAgICBpZiAocjNTeW1ib2xzRmlsZVBhdGgpIHtcbiAgICAgIHJldHVybiByM1N5bWJvbHNGaWxlUGF0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==