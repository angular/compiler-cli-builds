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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5QkFBb0U7SUFDcEUsNkJBQW1DO0lBRW5DLHdHQUFtRTtJQUVuRSxTQUFnQixRQUFRLENBQUMsSUFBYztRQUNyQyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUNqRixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO1FBRXRELElBQU0sV0FBVyxHQUFHLElBQUksd0NBQWtCLEVBQUUsQ0FBQztRQUM3QyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsV0FBVztZQUM5QixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsTUFBTTtnQkFDcEIsNkJBQTZCO2dCQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWEsV0FBVyxXQUFNLE1BQVEsQ0FBQyxDQUFDO2dCQUNyRCxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7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SSxDQUFDLENBQUM7UUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtleGlzdHNTeW5jLCBsc3RhdFN5bmMsIHJlYWRGaWxlU3luYywgcmVhZGRpclN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7cG9zaXggYXMgcGF0aH0gZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7UGFja2FnZVRyYW5zZm9ybWVyfSBmcm9tICcuL3RyYW5zZm9ybS9wYWNrYWdlX3RyYW5zZm9ybWVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKGFyZ3M6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgY29uc3QgZm9ybWF0cyA9IGFyZ3NbMF0gPyBhcmdzWzBdLnNwbGl0KCcsJykgOiBbJ2Zlc20yMDE1JywgJ2VzbTIwMTUnLCAnZmVzbTUnLCAnZXNtNSddO1xuICBjb25zdCBwYWNrYWdlUGF0aHMgPSBhcmdzWzFdID8gW3BhdGgucmVzb2x2ZShhcmdzWzFdKV0gOiBmaW5kUGFja2FnZXNUb0NvbXBpbGUoKTtcbiAgY29uc3QgdGFyZ2V0UGF0aCA9IGFyZ3NbMl0gPyBhcmdzWzJdIDogJ25vZGVfbW9kdWxlcyc7XG5cbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgUGFja2FnZVRyYW5zZm9ybWVyKCk7XG4gIHBhY2thZ2VQYXRocy5mb3JFYWNoKHBhY2thZ2VQYXRoID0+IHtcbiAgICBmb3JtYXRzLmZvckVhY2goZm9ybWF0ID0+IHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBiZWZvcmUgZmxpZ2h0XG4gICAgICBjb25zb2xlLndhcm4oYENvbXBpbGluZyAke3BhY2thZ2VQYXRofSA6ICR7Zm9ybWF0fWApO1xuICAgICAgdHJhbnNmb3JtZXIudHJhbnNmb3JtKHBhY2thZ2VQYXRoLCBmb3JtYXQsIHRhcmdldFBhdGgpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gMDtcbn1cblxuLy8gVE9ETyAtIGNvbnNpZGVyIG5lc3RlZCBub2RlX21vZHVsZXNcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBmb2xkZXIgbmVlZHMgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIG5nY2MgY29tcGlsYXRpb24uXG4gKiBXZSBkbyBub3QgY2FyZSBhYm91dCBmb2xkZXJzIHRoYXQgYXJlOlxuICpcbiAqIC0gc3ltbGlua3NcbiAqIC0gbm9kZV9tb2R1bGVzXG4gKiAtIGRvIG5vdCBjb250YWluIGEgcGFja2FnZS5qc29uXG4gKiAtIGRvIG5vdCBoYXZlIGEgdHlwaW5ncyBwcm9wZXJ0eSBpbiBwYWNrYWdlLmpzb25cbiAqIC0gZG8gbm90IGhhdmUgYW4gYXBwcm9wcmlhdGUgbWV0YWRhdGEuanNvbiBmaWxlXG4gKlxuICogQHBhcmFtIGZvbGRlclBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGZvbGRlci5cbiAqL1xuZnVuY3Rpb24gaGFzTWV0YWRhdGFGaWxlKGZvbGRlclBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBmb2xkZXJOYW1lID0gcGF0aC5iYXNlbmFtZShmb2xkZXJQYXRoKTtcbiAgaWYgKGZvbGRlck5hbWUgPT09ICdub2RlX21vZHVsZXMnIHx8IGxzdGF0U3luYyhmb2xkZXJQYXRoKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGguam9pbihmb2xkZXJQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGlmICghZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmOCcpKTtcbiAgaWYgKCFwYWNrYWdlSnNvbi50eXBpbmdzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIFRPRE86IGF2b2lkIGlmIHBhY2thZ2VKc29uIGNvbnRhaW5zIGJ1aWx0IG1hcmtlclxuICBjb25zdCBtZXRhZGF0YVBhdGggPVxuICAgICAgcGF0aC5qb2luKGZvbGRlclBhdGgsIHBhY2thZ2VKc29uLnR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcubWV0YWRhdGEuanNvbicpKTtcbiAgcmV0dXJuIGV4aXN0c1N5bmMobWV0YWRhdGFQYXRoKTtcbn1cblxuLyoqXG4gKiBMb29rIGZvciBwYWNrYWdlcyB0aGF0IG5lZWQgdG8gYmUgY29tcGlsZWQuXG4gKiBUaGUgZnVuY3Rpb24gd2lsbCByZWN1cnNlIGludG8gZm9sZGVycyB0aGF0IHN0YXJ0IHdpdGggYEAuLi5gLCBlLmcuIGBAYW5ndWxhci8uLi5gLlxuICogV2l0aG91dCBhbiBhcmd1bWVudCBpdCBzdGFydHMgYXQgYG5vZGVfbW9kdWxlc2AuXG4gKi9cbmZ1bmN0aW9uIGZpbmRQYWNrYWdlc1RvQ29tcGlsZShmb2xkZXI6IHN0cmluZyA9ICdub2RlX21vZHVsZXMnKTogc3RyaW5nW10ge1xuICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShmb2xkZXIpO1xuICBjb25zdCBwYWNrYWdlc1RvQ29tcGlsZTogc3RyaW5nW10gPSBbXTtcbiAgcmVhZGRpclN5bmMoZnVsbFBhdGgpXG4gICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgLmZpbHRlcihwID0+IGxzdGF0U3luYyhwYXRoLmpvaW4oZnVsbFBhdGgsIHApKS5pc0RpcmVjdG9yeSgpKVxuICAgICAgLmZvckVhY2gocCA9PiB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gcGF0aC5qb2luKGZ1bGxQYXRoLCBwKTtcbiAgICAgICAgaWYgKHAuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAgICAgcGFja2FnZXNUb0NvbXBpbGUucHVzaCguLi5maW5kUGFja2FnZXNUb0NvbXBpbGUocGFja2FnZVBhdGgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYWNrYWdlc1RvQ29tcGlsZS5wdXNoKHBhY2thZ2VQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgcmV0dXJuIHBhY2thZ2VzVG9Db21waWxlLmZpbHRlcihwYXRoID0+IHJlY3Vyc2l2ZURpclRlc3QocGF0aCwgaGFzTWV0YWRhdGFGaWxlKSk7XG59XG5cbmZ1bmN0aW9uIHJlY3Vyc2l2ZURpclRlc3QoZGlyOiBzdHJpbmcsIHRlc3Q6IChkaXI6IHN0cmluZykgPT4gYm9vbGVhbik6IGJvb2xlYW4ge1xuICByZXR1cm4gdGVzdChkaXIpIHx8IHJlYWRkaXJTeW5jKGRpcikuc29tZShzZWdtZW50ID0+IHtcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIHNlZ21lbnQpO1xuICAgIHJldHVybiBsc3RhdFN5bmMoZnVsbFBhdGgpLmlzRGlyZWN0b3J5KCkgJiYgcmVjdXJzaXZlRGlyVGVzdChmdWxsUGF0aCwgdGVzdCk7XG4gIH0pO1xufVxuIl19