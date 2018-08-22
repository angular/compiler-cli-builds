(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/main", ["require", "exports", "tslib", "fs", "path", "@angular/compiler-cli/src/ngcc/src/transform/package_transformer"], factory);
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
    var fs_1 = require("fs");
    var path_1 = require("path");
    var package_transformer_1 = require("@angular/compiler-cli/src/ngcc/src/transform/package_transformer");
    function mainNgcc(args) {
        var formats = args[0] ? args[0].split(',') : ['fesm2015', 'esm2015', 'fesm5', 'esm5'];
        var packagePaths = args[1] ? [path_1.posix.resolve(args[1])] : findPackagesToCompile();
        var targetPath = args[2] ? args[2] : 'node_modules';
        var transformer = new package_transformer_1.PackageTransformer();
        packagePaths.forEach(function (packagePath) {
            formats.forEach(function (format) {
                // TODO: remove before flight
                console.warn("Compiling " + packagePath + " : " + format);
                transformer.transform(packagePath, format, targetPath);
            });
        });
        return 0;
    }
    exports.mainNgcc = mainNgcc;
    // TODO - consider nested node_modules
    /**
     * Check whether the given folder needs to be included in the ngcc compilation.
     * We do not care about folders that are:
     *
     * - symlinks
     * - node_modules
     * - do not contain a package.json
     * - do not have a typings property in package.json
     * - do not have an appropriate metadata.json file
     *
     * @param folderPath The absolute path to the folder.
     */
    function hasMetadataFile(folderPath) {
        var folderName = path_1.posix.basename(folderPath);
        if (folderName === 'node_modules' || fs_1.lstatSync(folderPath).isSymbolicLink()) {
            return false;
        }
        var packageJsonPath = path_1.posix.join(folderPath, 'package.json');
        if (!fs_1.existsSync(packageJsonPath)) {
            return false;
        }
        var packageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, 'utf8'));
        if (!packageJson.typings) {
            return false;
        }
        // TODO: avoid if packageJson contains built marker
        var metadataPath = path_1.posix.join(folderPath, packageJson.typings.replace(/\.d\.ts$/, '.metadata.json'));
        return fs_1.existsSync(metadataPath);
    }
    /**
     * Look for packages that need to be compiled.
     * The function will recurse into folders that start with `@...`, e.g. `@angular/...`.
     * Without an argument it starts at `node_modules`.
     */
    function findPackagesToCompile(folder) {
        if (folder === void 0) { folder = 'node_modules'; }
        var fullPath = path_1.posix.resolve(folder);
        var packagesToCompile = [];
        fs_1.readdirSync(fullPath)
            .filter(function (p) { return !p.startsWith('.'); })
            .filter(function (p) { return fs_1.lstatSync(path_1.posix.join(fullPath, p)).isDirectory(); })
            .forEach(function (p) {
            var packagePath = path_1.posix.join(fullPath, p);
            if (p.startsWith('@')) {
                packagesToCompile.push.apply(packagesToCompile, tslib_1.__spread(findPackagesToCompile(packagePath)));
            }
            else {
                packagesToCompile.push(packagePath);
            }
        });
        return packagesToCompile.filter(function (path) { return recursiveDirTest(path, hasMetadataFile); });
    }
    function recursiveDirTest(dir, test) {
        return test(dir) || fs_1.readdirSync(dir).some(function (segment) {
            var fullPath = path_1.posix.join(dir, segment);
            return fs_1.lstatSync(fullPath).isDirectory() && recursiveDirTest(fullPath, test);
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5QkFBb0U7SUFDcEUsNkJBQW1DO0lBRW5DLHdHQUFtRTtJQUVuRSxrQkFBeUIsSUFBYztRQUNyQyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNqRixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO1FBRXRELElBQU0sV0FBVyxHQUFHLElBQUksd0NBQWtCLEVBQUUsQ0FBQztRQUM3QyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsV0FBVztZQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsTUFBTTtnQkFDcEIsNkJBQTZCO2dCQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWEsV0FBVyxXQUFNLE1BQVEsQ0FBQyxDQUFDO2dCQUNyRCxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekQsQ0FB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LENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2V4aXN0c1N5bmMsIGxzdGF0U3luYywgcmVhZEZpbGVTeW5jLCByZWFkZGlyU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtwb3NpeCBhcyBwYXRofSBmcm9tICdwYXRoJztcblxuaW1wb3J0IHtQYWNrYWdlVHJhbnNmb3JtZXJ9IGZyb20gJy4vdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoYXJnczogc3RyaW5nW10pOiBudW1iZXIge1xuICBjb25zdCBmb3JtYXRzID0gYXJnc1swXSA/IGFyZ3NbMF0uc3BsaXQoJywnKSA6IFsnZmVzbTIwMTUnLCAnZXNtMjAxNScsICdmZXNtNScsICdlc201J107XG4gIGNvbnN0IHBhY2thZ2VQYXRocyA9IGFyZ3NbMV0gPyBbcGF0aC5yZXNvbHZlKGFyZ3NbMV0pXSA6IGZpbmRQYWNrYWdlc1RvQ29tcGlsZSgpO1xuICBjb25zdCB0YXJnZXRQYXRoID0gYXJnc1syXSA/IGFyZ3NbMl0gOiAnbm9kZV9tb2R1bGVzJztcblxuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBQYWNrYWdlVHJhbnNmb3JtZXIoKTtcbiAgcGFja2FnZVBhdGhzLmZvckVhY2gocGFja2FnZVBhdGggPT4ge1xuICAgIGZvcm1hdHMuZm9yRWFjaChmb3JtYXQgPT4ge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGJlZm9yZSBmbGlnaHRcbiAgICAgIGNvbnNvbGUud2FybihgQ29tcGlsaW5nICR7cGFja2FnZVBhdGh9IDogJHtmb3JtYXR9YCk7XG4gICAgICB0cmFuc2Zvcm1lci50cmFuc2Zvcm0ocGFja2FnZVBhdGgsIGZvcm1hdCwgdGFyZ2V0UGF0aCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiAwO1xufVxuXG4vLyBUT0RPIC0gY29uc2lkZXIgbmVzdGVkIG5vZGVfbW9kdWxlc1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIGZvbGRlciBuZWVkcyB0byBiZSBpbmNsdWRlZCBpbiB0aGUgbmdjYyBjb21waWxhdGlvbi5cbiAqIFdlIGRvIG5vdCBjYXJlIGFib3V0IGZvbGRlcnMgdGhhdCBhcmU6XG4gKlxuICogLSBzeW1saW5rc1xuICogLSBub2RlX21vZHVsZXNcbiAqIC0gZG8gbm90IGNvbnRhaW4gYSBwYWNrYWdlLmpzb25cbiAqIC0gZG8gbm90IGhhdmUgYSB0eXBpbmdzIHByb3BlcnR5IGluIHBhY2thZ2UuanNvblxuICogLSBkbyBub3QgaGF2ZSBhbiBhcHByb3ByaWF0ZSBtZXRhZGF0YS5qc29uIGZpbGVcbiAqXG4gKiBAcGFyYW0gZm9sZGVyUGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgZm9sZGVyLlxuICovXG5mdW5jdGlvbiBoYXNNZXRhZGF0YUZpbGUoZm9sZGVyUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGZvbGRlck5hbWUgPSBwYXRoLmJhc2VuYW1lKGZvbGRlclBhdGgpO1xuICBpZiAoZm9sZGVyTmFtZSA9PT0gJ25vZGVfbW9kdWxlcycgfHwgbHN0YXRTeW5jKGZvbGRlclBhdGgpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5qb2luKGZvbGRlclBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICBpZiAoIXBhY2thZ2VKc29uLnR5cGluZ3MpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gVE9ETzogYXZvaWQgaWYgcGFja2FnZUpzb24gY29udGFpbnMgYnVpbHQgbWFya2VyXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9XG4gICAgICBwYXRoLmpvaW4oZm9sZGVyUGF0aCwgcGFja2FnZUpzb24udHlwaW5ncy5yZXBsYWNlKC9cXC5kXFwudHMkLywgJy5tZXRhZGF0YS5qc29uJykpO1xuICByZXR1cm4gZXhpc3RzU3luYyhtZXRhZGF0YVBhdGgpO1xufVxuXG4vKipcbiAqIExvb2sgZm9yIHBhY2thZ2VzIHRoYXQgbmVlZCB0byBiZSBjb21waWxlZC5cbiAqIFRoZSBmdW5jdGlvbiB3aWxsIHJlY3Vyc2UgaW50byBmb2xkZXJzIHRoYXQgc3RhcnQgd2l0aCBgQC4uLmAsIGUuZy4gYEBhbmd1bGFyLy4uLmAuXG4gKiBXaXRob3V0IGFuIGFyZ3VtZW50IGl0IHN0YXJ0cyBhdCBgbm9kZV9tb2R1bGVzYC5cbiAqL1xuZnVuY3Rpb24gZmluZFBhY2thZ2VzVG9Db21waWxlKGZvbGRlcjogc3RyaW5nID0gJ25vZGVfbW9kdWxlcycpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKGZvbGRlcik7XG4gIGNvbnN0IHBhY2thZ2VzVG9Db21waWxlOiBzdHJpbmdbXSA9IFtdO1xuICByZWFkZGlyU3luYyhmdWxsUGF0aClcbiAgICAgIC5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAuZmlsdGVyKHAgPT4gbHN0YXRTeW5jKHBhdGguam9pbihmdWxsUGF0aCwgcCkpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAuZm9yRWFjaChwID0+IHtcbiAgICAgICAgY29uc3QgcGFja2FnZVBhdGggPSBwYXRoLmpvaW4oZnVsbFBhdGgsIHApO1xuICAgICAgICBpZiAocC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgICBwYWNrYWdlc1RvQ29tcGlsZS5wdXNoKC4uLmZpbmRQYWNrYWdlc1RvQ29tcGlsZShwYWNrYWdlUGF0aCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhY2thZ2VzVG9Db21waWxlLnB1c2gocGFja2FnZVBhdGgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICByZXR1cm4gcGFja2FnZXNUb0NvbXBpbGUuZmlsdGVyKHBhdGggPT4gcmVjdXJzaXZlRGlyVGVzdChwYXRoLCBoYXNNZXRhZGF0YUZpbGUpKTtcbn1cblxuZnVuY3Rpb24gcmVjdXJzaXZlRGlyVGVzdChkaXI6IHN0cmluZywgdGVzdDogKGRpcjogc3RyaW5nKSA9PiBib29sZWFuKTogYm9vbGVhbiB7XG4gIHJldHVybiB0ZXN0KGRpcikgfHwgcmVhZGRpclN5bmMoZGlyKS5zb21lKHNlZ21lbnQgPT4ge1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgc2VnbWVudCk7XG4gICAgcmV0dXJuIGxzdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKSAmJiByZWN1cnNpdmVEaXJUZXN0KGZ1bGxQYXRoLCB0ZXN0KTtcbiAgfSk7XG59XG4iXX0=