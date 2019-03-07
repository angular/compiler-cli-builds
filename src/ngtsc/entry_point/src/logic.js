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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/logic", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
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
                    if (tsFile.endsWith('/index.ts') &&
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
        return resolvedEntryPoint ? path_1.normalizeSeparators(resolvedEntryPoint) : null;
    }
    exports.findFlatIndexEntryPoint = findFlatIndexEntryPoint;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2VudHJ5X3BvaW50L3NyYy9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxzRUFBd0Q7SUFDeEQsa0ZBQWlFO0lBRWpFLFNBQWdCLHVCQUF1QixDQUFDLFNBQWdDOztRQUN0RSwyRUFBMkU7UUFDM0UsaUNBQWlDO1FBQ2pDLHdGQUF3RjtRQUN4RixJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsbUNBQXNCLENBQUMsSUFBSSxDQUFDLEVBQTVCLENBQTRCLENBQUMsQ0FBQztRQUN2RSxJQUFJLGtCQUFrQixHQUFnQixJQUFJLENBQUM7UUFFM0MsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4Qix5REFBeUQ7WUFDekQsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pDO2FBQU07O2dCQUNMLHVGQUF1RjtnQkFDdkYsMkZBQTJGO2dCQUMzRiwrQkFBK0I7Z0JBQy9CLEVBQUU7Z0JBQ0YsMEVBQTBFO2dCQUMxRSxLQUFxQixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO29CQUF6QixJQUFNLE1BQU0sb0JBQUE7b0JBQ2YsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDNUIsQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDL0Usa0JBQWtCLEdBQUcsTUFBTSxDQUFDO3FCQUM3QjtpQkFDRjs7Ozs7Ozs7O1NBQ0Y7UUFFRCxPQUFPLGtCQUFrQixDQUFDLENBQUMsQ0FBQywwQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDN0UsQ0FBQztJQXpCRCwwREF5QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2lzTm9uRGVjbGFyYXRpb25Uc1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZEZsYXRJbmRleEVudHJ5UG9pbnQocm9vdEZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4pOiBzdHJpbmd8bnVsbCB7XG4gIC8vIFRoZXJlIGFyZSB0d28gd2F5cyBmb3IgYSBmaWxlIHRvIGJlIHJlY29nbml6ZWQgYXMgdGhlIGZsYXQgbW9kdWxlIGluZGV4OlxuICAvLyAxKSBpZiBpdCdzIHRoZSBvbmx5IGZpbGUhISEhISFcbiAgLy8gMikgKGRlcHJlY2F0ZWQpIGlmIGl0J3MgbmFtZWQgJ2luZGV4LnRzJyBhbmQgaGFzIHRoZSBzaG9ydGVzdCBwYXRoIG9mIGFsbCBzdWNoIGZpbGVzLlxuICBjb25zdCB0c0ZpbGVzID0gcm9vdEZpbGVzLmZpbHRlcihmaWxlID0+IGlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoZmlsZSkpO1xuICBsZXQgcmVzb2x2ZWRFbnRyeVBvaW50OiBzdHJpbmd8bnVsbCA9IG51bGw7XG5cbiAgaWYgKHRzRmlsZXMubGVuZ3RoID09PSAxKSB7XG4gICAgLy8gVGhlcmUncyBvbmx5IG9uZSBmaWxlIC0gdGhpcyBpcyB0aGUgZmxhdCBtb2R1bGUgaW5kZXguXG4gICAgcmVzb2x2ZWRFbnRyeVBvaW50ID0gdHNGaWxlc1swXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBJbiB0aGUgZXZlbnQgdGhlcmUncyBtb3JlIHRoYW4gb25lIFRTIGZpbGUsIG9uZSBvZiB0aGVtIGNhbiBzdGlsbCBiZSBzZWxlY3RlZCBhcyB0aGVcbiAgICAvLyBmbGF0IG1vZHVsZSBpbmRleCBpZiBpdCdzIG5hbWVkICdpbmRleC50cycuIElmIHRoZXJlJ3MgbW9yZSB0aGFuIG9uZSAnaW5kZXgudHMnLCB0aGUgb25lXG4gICAgLy8gd2l0aCB0aGUgc2hvcnRlc3QgcGF0aCB3aW5zLlxuICAgIC8vXG4gICAgLy8gVGhpcyBiZWhhdmlvciBpcyBERVBSRUNBVEVEIGFuZCBvbmx5IGV4aXN0cyB0byBzdXBwb3J0IGV4aXN0aW5nIHVzYWdlcy5cbiAgICBmb3IgKGNvbnN0IHRzRmlsZSBvZiB0c0ZpbGVzKSB7XG4gICAgICBpZiAodHNGaWxlLmVuZHNXaXRoKCcvaW5kZXgudHMnKSAmJlxuICAgICAgICAgIChyZXNvbHZlZEVudHJ5UG9pbnQgPT09IG51bGwgfHwgdHNGaWxlLmxlbmd0aCA8PSByZXNvbHZlZEVudHJ5UG9pbnQubGVuZ3RoKSkge1xuICAgICAgICByZXNvbHZlZEVudHJ5UG9pbnQgPSB0c0ZpbGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc29sdmVkRW50cnlQb2ludCA/IG5vcm1hbGl6ZVNlcGFyYXRvcnMocmVzb2x2ZWRFbnRyeVBvaW50KSA6IG51bGw7XG59XG4iXX0=