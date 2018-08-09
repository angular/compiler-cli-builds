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
        var packagePaths = args[1] ? [path_1.resolve(args[1])] : findPackagesToCompile();
        var targetPath = args[2] ? args[2] : 'node_modules';
        var transformer = new package_transformer_1.PackageTransformer();
        packagePaths.forEach(function (packagePath) {
            formats.forEach(function (format) {
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
     * @param folderName The final segment of the folder path.
     */
    function hasMetadataFile(folderPath) {
        var folderName = path_1.basename(folderPath);
        if (fs_1.lstatSync(folderPath).isSymbolicLink() || folderName === 'node_modules') {
            return false;
        }
        var packageJsonPath = path_1.resolve(folderPath, 'package.json');
        if (!fs_1.existsSync(packageJsonPath)) {
            return false;
        }
        var packageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, 'utf8'));
        if (!packageJson.typings) {
            return false;
        }
        // TODO: avoid if packageJson contains built marker
        var metadataPath = path_1.resolve(folderPath, packageJson.typings.replace(/\.d\.ts$/, '.metadata.json'));
        return fs_1.existsSync(metadataPath);
    }
    /**
     * Look for packages that need to be compiled.
     * The function will recurse into folders that start with `@...`, e.g. `@angular/...`.
     *  Without an argument it starts at `node_modules`.
     */
    function findPackagesToCompile(folder) {
        if (folder === void 0) { folder = 'node_modules'; }
        var path = path_1.resolve(folder);
        var packagesToCompile = [];
        fs_1.readdirSync(path).filter(function (p) { return !p.startsWith('.'); }).forEach(function (p) {
            var packagePath = path_1.resolve(path, p);
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
            var path = path_1.resolve(dir, segment);
            return fs_1.lstatSync(path).isDirectory() && recursiveDirTest(path, test);
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5QkFBb0U7SUFDcEUsNkJBQXVDO0lBRXZDLHdHQUFtRTtJQUVuRSxrQkFBeUIsSUFBYztRQUNyQyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzVFLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7UUFFdEQsSUFBTSxXQUFXLEdBQUcsSUFBSSx3Q0FBa0IsRUFBRSxDQUFDO1FBQzdDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxXQUFXO1lBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxNQUFNO2dCQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWEsV0FBVyxXQUFNLE1BQVEsQ0FBQyxDQUFDO2dCQUNyRCxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQWRELDRCQWNDO0lBRUQsc0NBQXNDO0lBRXRDOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILHlCQUF5QixVQUFrQjtRQUN6QyxJQUFNLFVBQVUsR0FBRyxlQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEMsSUFBSSxjQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsY0FBYyxFQUFFLElBQUksVUFBVSxLQUFLLGNBQWMsRUFBRTtZQUMzRSxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsSUFBTSxlQUFlLEdBQUcsY0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsZUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ2hDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUU7WUFDeEIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELG1EQUFtRDtRQUNuRCxJQUFNLFlBQVksR0FDZCxjQUFPLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDbkYsT0FBTyxlQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwrQkFBK0IsTUFBK0I7UUFBL0IsdUJBQUEsRUFBQSx1QkFBK0I7UUFDNUQsSUFBTSxJQUFJLEdBQUcsY0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLElBQU0saUJBQWlCLEdBQWEsRUFBRSxDQUFDO1FBQ3ZDLGdCQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztZQUN6RCxJQUFNLFdBQVcsR0FBRyxjQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDckIsaUJBQWlCLENBQUMsSUFBSSxPQUF0QixpQkFBaUIsbUJBQVMscUJBQXFCLENBQUMsV0FBVyxDQUFDLEdBQUU7YUFDL0Q7aUJBQU07Z0JBQ0wsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFRCwwQkFBMEIsR0FBVyxFQUFFLElBQThCO1FBQ25FLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsT0FBTztZQUMvQyxJQUFNLElBQUksR0FBRyxjQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25DLE9BQU8sY0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2V4aXN0c1N5bmMsIGxzdGF0U3luYywgcmVhZEZpbGVTeW5jLCByZWFkZGlyU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtiYXNlbmFtZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7UGFja2FnZVRyYW5zZm9ybWVyfSBmcm9tICcuL3RyYW5zZm9ybS9wYWNrYWdlX3RyYW5zZm9ybWVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKGFyZ3M6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgY29uc3QgZm9ybWF0cyA9IGFyZ3NbMF0gPyBhcmdzWzBdLnNwbGl0KCcsJykgOiBbJ2Zlc20yMDE1JywgJ2VzbTIwMTUnLCAnZmVzbTUnLCAnZXNtNSddO1xuICBjb25zdCBwYWNrYWdlUGF0aHMgPSBhcmdzWzFdID8gW3Jlc29sdmUoYXJnc1sxXSldIDogZmluZFBhY2thZ2VzVG9Db21waWxlKCk7XG4gIGNvbnN0IHRhcmdldFBhdGggPSBhcmdzWzJdID8gYXJnc1syXSA6ICdub2RlX21vZHVsZXMnO1xuXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhY2thZ2VUcmFuc2Zvcm1lcigpO1xuICBwYWNrYWdlUGF0aHMuZm9yRWFjaChwYWNrYWdlUGF0aCA9PiB7XG4gICAgZm9ybWF0cy5mb3JFYWNoKGZvcm1hdCA9PiB7XG4gICAgICBjb25zb2xlLndhcm4oYENvbXBpbGluZyAke3BhY2thZ2VQYXRofSA6ICR7Zm9ybWF0fWApO1xuICAgICAgdHJhbnNmb3JtZXIudHJhbnNmb3JtKHBhY2thZ2VQYXRoLCBmb3JtYXQsIHRhcmdldFBhdGgpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gMDtcbn1cblxuLy8gVE9ETyAtIGNvbnNpZGVyIG5lc3RlZCBub2RlX21vZHVsZXNcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBmb2xkZXIgbmVlZHMgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIG5nY2MgY29tcGlsYXRpb24uXG4gKiBXZSBkbyBub3QgY2FyZSBhYm91dCBmb2xkZXJzIHRoYXQgYXJlOlxuICpcbiAqIC0gc3ltbGlua3NcbiAqIC0gbm9kZV9tb2R1bGVzXG4gKiAtIGRvIG5vdCBjb250YWluIGEgcGFja2FnZS5qc29uXG4gKiAtIGRvIG5vdCBoYXZlIGEgdHlwaW5ncyBwcm9wZXJ0eSBpbiBwYWNrYWdlLmpzb25cbiAqIC0gZG8gbm90IGhhdmUgYW4gYXBwcm9wcmlhdGUgbWV0YWRhdGEuanNvbiBmaWxlXG4gKlxuICogQHBhcmFtIGZvbGRlclBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGZvbGRlci5cbiAqIEBwYXJhbSBmb2xkZXJOYW1lIFRoZSBmaW5hbCBzZWdtZW50IG9mIHRoZSBmb2xkZXIgcGF0aC5cbiAqL1xuZnVuY3Rpb24gaGFzTWV0YWRhdGFGaWxlKGZvbGRlclBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBmb2xkZXJOYW1lID0gYmFzZW5hbWUoZm9sZGVyUGF0aCk7XG4gIGlmIChsc3RhdFN5bmMoZm9sZGVyUGF0aCkuaXNTeW1ib2xpY0xpbmsoKSB8fCBmb2xkZXJOYW1lID09PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKGZvbGRlclBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICBpZiAoIXBhY2thZ2VKc29uLnR5cGluZ3MpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gVE9ETzogYXZvaWQgaWYgcGFja2FnZUpzb24gY29udGFpbnMgYnVpbHQgbWFya2VyXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9XG4gICAgICByZXNvbHZlKGZvbGRlclBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcubWV0YWRhdGEuanNvbicpKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMobWV0YWRhdGFQYXRoKTtcbn1cblxuLyoqXG4gKiBMb29rIGZvciBwYWNrYWdlcyB0aGF0IG5lZWQgdG8gYmUgY29tcGlsZWQuXG4gKiBUaGUgZnVuY3Rpb24gd2lsbCByZWN1cnNlIGludG8gZm9sZGVycyB0aGF0IHN0YXJ0IHdpdGggYEAuLi5gLCBlLmcuIGBAYW5ndWxhci8uLi5gLlxuICogIFdpdGhvdXQgYW4gYXJndW1lbnQgaXQgc3RhcnRzIGF0IGBub2RlX21vZHVsZXNgLlxuICovXG5mdW5jdGlvbiBmaW5kUGFja2FnZXNUb0NvbXBpbGUoZm9sZGVyOiBzdHJpbmcgPSAnbm9kZV9tb2R1bGVzJyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGF0aCA9IHJlc29sdmUoZm9sZGVyKTtcbiAgY29uc3QgcGFja2FnZXNUb0NvbXBpbGU6IHN0cmluZ1tdID0gW107XG4gIHJlYWRkaXJTeW5jKHBhdGgpLmZpbHRlcihwID0+ICFwLnN0YXJ0c1dpdGgoJy4nKSkuZm9yRWFjaChwID0+IHtcbiAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHJlc29sdmUocGF0aCwgcCk7XG4gICAgaWYgKHAuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICBwYWNrYWdlc1RvQ29tcGlsZS5wdXNoKC4uLmZpbmRQYWNrYWdlc1RvQ29tcGlsZShwYWNrYWdlUGF0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrYWdlc1RvQ29tcGlsZS5wdXNoKHBhY2thZ2VQYXRoKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYWNrYWdlc1RvQ29tcGlsZS5maWx0ZXIocGF0aCA9PiByZWN1cnNpdmVEaXJUZXN0KHBhdGgsIGhhc01ldGFkYXRhRmlsZSkpO1xufVxuXG5mdW5jdGlvbiByZWN1cnNpdmVEaXJUZXN0KGRpcjogc3RyaW5nLCB0ZXN0OiAoZGlyOiBzdHJpbmcpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHRlc3QoZGlyKSB8fCByZWFkZGlyU3luYyhkaXIpLnNvbWUoc2VnbWVudCA9PiB7XG4gICAgY29uc3QgcGF0aCA9IHJlc29sdmUoZGlyLCBzZWdtZW50KTtcbiAgICByZXR1cm4gbHN0YXRTeW5jKHBhdGgpLmlzRGlyZWN0b3J5KCkgJiYgcmVjdXJzaXZlRGlyVGVzdChwYXRoLCB0ZXN0KTtcbiAgfSk7XG59XG4iXX0=