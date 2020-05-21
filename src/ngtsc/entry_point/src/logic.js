/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/logic", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findFlatIndexEntryPoint = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    function findFlatIndexEntryPoint(rootFiles) {
        var e_1, _a;
        // There are two ways for a file to be recognized as the flat module index:
        // 1) if it's the only file!!!!!!
        // 2) (deprecated) if it's named 'index.ts' and has the shortest path of all such files.
        var tsFiles = rootFiles.filter(function (file) { return typescript_1.isNonDeclarationTsPath(file); });
        var resolvedEntryPoint = null;
        if (tsFiles.length === 1) {
            // There's only one file - this is the flat module index.
            resolvedEntryPoint = tsFiles[0];
        }
        else {
            try {
                // In the event there's more than one TS file, one of them can still be selected as the
                // flat module index if it's named 'index.ts'. If there's more than one 'index.ts', the one
                // with the shortest path wins.
                //
                // This behavior is DEPRECATED and only exists to support existing usages.
                for (var tsFiles_1 = tslib_1.__values(tsFiles), tsFiles_1_1 = tsFiles_1.next(); !tsFiles_1_1.done; tsFiles_1_1 = tsFiles_1.next()) {
                    var tsFile = tsFiles_1_1.value;
                    if (file_system_1.getFileSystem().basename(tsFile) === 'index.ts' &&
                        (resolvedEntryPoint === null || tsFile.length <= resolvedEntryPoint.length)) {
                        resolvedEntryPoint = tsFile;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (tsFiles_1_1 && !tsFiles_1_1.done && (_a = tsFiles_1.return)) _a.call(tsFiles_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return resolvedEntryPoint;
    }
    exports.findFlatIndexEntryPoint = findFlatIndexEntryPoint;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2VudHJ5X3BvaW50L3NyYy9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQWdFO0lBQ2hFLGtGQUFpRTtJQUVqRSxTQUFnQix1QkFBdUIsQ0FBQyxTQUF3Qzs7UUFFOUUsMkVBQTJFO1FBQzNFLGlDQUFpQztRQUNqQyx3RkFBd0Y7UUFDeEYsSUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLG1DQUFzQixDQUFDLElBQUksQ0FBQyxFQUE1QixDQUE0QixDQUFDLENBQUM7UUFDdkUsSUFBSSxrQkFBa0IsR0FBd0IsSUFBSSxDQUFDO1FBRW5ELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDeEIseURBQXlEO1lBQ3pELGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQzthQUFNOztnQkFDTCx1RkFBdUY7Z0JBQ3ZGLDJGQUEyRjtnQkFDM0YsK0JBQStCO2dCQUMvQixFQUFFO2dCQUNGLDBFQUEwRTtnQkFDMUUsS0FBcUIsSUFBQSxZQUFBLGlCQUFBLE9BQU8sQ0FBQSxnQ0FBQSxxREFBRTtvQkFBekIsSUFBTSxNQUFNLG9CQUFBO29CQUNmLElBQUksMkJBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVO3dCQUMvQyxDQUFDLGtCQUFrQixLQUFLLElBQUksSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUMvRSxrQkFBa0IsR0FBRyxNQUFNLENBQUM7cUJBQzdCO2lCQUNGOzs7Ozs7Ozs7U0FDRjtRQUVELE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztJQTFCRCwwREEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGdldEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7aXNOb25EZWNsYXJhdGlvblRzUGF0aH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kRmxhdEluZGV4RW50cnlQb2ludChyb290RmlsZXM6IFJlYWRvbmx5QXJyYXk8QWJzb2x1dGVGc1BhdGg+KTogQWJzb2x1dGVGc1BhdGh8XG4gICAgbnVsbCB7XG4gIC8vIFRoZXJlIGFyZSB0d28gd2F5cyBmb3IgYSBmaWxlIHRvIGJlIHJlY29nbml6ZWQgYXMgdGhlIGZsYXQgbW9kdWxlIGluZGV4OlxuICAvLyAxKSBpZiBpdCdzIHRoZSBvbmx5IGZpbGUhISEhISFcbiAgLy8gMikgKGRlcHJlY2F0ZWQpIGlmIGl0J3MgbmFtZWQgJ2luZGV4LnRzJyBhbmQgaGFzIHRoZSBzaG9ydGVzdCBwYXRoIG9mIGFsbCBzdWNoIGZpbGVzLlxuICBjb25zdCB0c0ZpbGVzID0gcm9vdEZpbGVzLmZpbHRlcihmaWxlID0+IGlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoZmlsZSkpO1xuICBsZXQgcmVzb2x2ZWRFbnRyeVBvaW50OiBBYnNvbHV0ZUZzUGF0aHxudWxsID0gbnVsbDtcblxuICBpZiAodHNGaWxlcy5sZW5ndGggPT09IDEpIHtcbiAgICAvLyBUaGVyZSdzIG9ubHkgb25lIGZpbGUgLSB0aGlzIGlzIHRoZSBmbGF0IG1vZHVsZSBpbmRleC5cbiAgICByZXNvbHZlZEVudHJ5UG9pbnQgPSB0c0ZpbGVzWzBdO1xuICB9IGVsc2Uge1xuICAgIC8vIEluIHRoZSBldmVudCB0aGVyZSdzIG1vcmUgdGhhbiBvbmUgVFMgZmlsZSwgb25lIG9mIHRoZW0gY2FuIHN0aWxsIGJlIHNlbGVjdGVkIGFzIHRoZVxuICAgIC8vIGZsYXQgbW9kdWxlIGluZGV4IGlmIGl0J3MgbmFtZWQgJ2luZGV4LnRzJy4gSWYgdGhlcmUncyBtb3JlIHRoYW4gb25lICdpbmRleC50cycsIHRoZSBvbmVcbiAgICAvLyB3aXRoIHRoZSBzaG9ydGVzdCBwYXRoIHdpbnMuXG4gICAgLy9cbiAgICAvLyBUaGlzIGJlaGF2aW9yIGlzIERFUFJFQ0FURUQgYW5kIG9ubHkgZXhpc3RzIHRvIHN1cHBvcnQgZXhpc3RpbmcgdXNhZ2VzLlxuICAgIGZvciAoY29uc3QgdHNGaWxlIG9mIHRzRmlsZXMpIHtcbiAgICAgIGlmIChnZXRGaWxlU3lzdGVtKCkuYmFzZW5hbWUodHNGaWxlKSA9PT0gJ2luZGV4LnRzJyAmJlxuICAgICAgICAgIChyZXNvbHZlZEVudHJ5UG9pbnQgPT09IG51bGwgfHwgdHNGaWxlLmxlbmd0aCA8PSByZXNvbHZlZEVudHJ5UG9pbnQubGVuZ3RoKSkge1xuICAgICAgICByZXNvbHZlZEVudHJ5UG9pbnQgPSB0c0ZpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc29sdmVkRW50cnlQb2ludDtcbn1cbiJdfQ==