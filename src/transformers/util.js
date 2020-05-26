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
        define("@angular/compiler-cli/src/transformers/util", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/transformers/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ngToTsDiagnostic = exports.relativeToRootDirs = exports.isInRootDir = exports.createMessageDiagnostic = exports.userError = exports.error = exports.tsStructureIsReused = exports.TS = exports.DTS = exports.GENERATED_FILES = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
    var api_1 = require("@angular/compiler-cli/src/transformers/api");
    exports.GENERATED_FILES = /(.*?)\.(ngfactory|shim\.ngstyle|ngstyle|ngsummary)\.(js|d\.ts|ts)$/;
    exports.DTS = /\.d\.ts$/;
    exports.TS = /^(?!.*\.d\.ts$).*\.ts$/;
    // Note: This is an internal property in TypeScript. Use it only for assertions and tests.
    function tsStructureIsReused(program) {
        return program.structureIsReused;
    }
    exports.tsStructureIsReused = tsStructureIsReused;
    function error(msg) {
        throw new Error("Internal error: " + msg);
    }
    exports.error = error;
    function userError(msg) {
        throw compiler_1.syntaxError(msg);
    }
    exports.userError = userError;
    function createMessageDiagnostic(messageText) {
        return {
            file: undefined,
            start: undefined,
            length: undefined,
            category: ts.DiagnosticCategory.Message,
            messageText: messageText,
            code: api_1.DEFAULT_ERROR_CODE,
            source: api_1.SOURCE,
        };
    }
    exports.createMessageDiagnostic = createMessageDiagnostic;
    function isInRootDir(fileName, options) {
        return !options.rootDir || pathStartsWithPrefix(options.rootDir, fileName);
    }
    exports.isInRootDir = isInRootDir;
    function relativeToRootDirs(filePath, rootDirs) {
        var e_1, _a;
        if (!filePath)
            return filePath;
        try {
            for (var _b = tslib_1.__values(rootDirs || []), _c = _b.next(); !_c.done; _c = _b.next()) {
                var dir = _c.value;
                var rel = pathStartsWithPrefix(dir, filePath);
                if (rel) {
                    return rel;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return filePath;
    }
    exports.relativeToRootDirs = relativeToRootDirs;
    function pathStartsWithPrefix(prefix, fullPath) {
        var rel = path.relative(prefix, fullPath);
        return rel.startsWith('..') ? null : rel;
    }
    /**
     * Converts a ng.Diagnostic into a ts.Diagnostic.
     * This looses some information, and also uses an incomplete object as `file`.
     *
     * I.e. only use this where the API allows only a ts.Diagnostic.
     */
    function ngToTsDiagnostic(ng) {
        var file;
        var start;
        var length;
        if (ng.span) {
            // Note: We can't use a real ts.SourceFile,
            // but we can at least mirror the properties `fileName` and `text`, which
            // are mostly used for error reporting.
            file = { fileName: ng.span.start.file.url, text: ng.span.start.file.content };
            start = ng.span.start.offset;
            length = ng.span.end.offset - start;
        }
        return {
            file: file,
            messageText: ng.messageText,
            category: ng.category,
            code: ng.code,
            start: start,
            length: length,
        };
    }
    exports.ngToTsDiagnostic = ngToTsDiagnostic;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE4QztJQUM5QywyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLGtFQUE4RTtJQUVqRSxRQUFBLGVBQWUsR0FBRyxvRUFBb0UsQ0FBQztJQUN2RixRQUFBLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDakIsUUFBQSxFQUFFLEdBQUcsd0JBQXdCLENBQUM7SUFRM0MsMEZBQTBGO0lBQzFGLFNBQWdCLG1CQUFtQixDQUFDLE9BQW1CO1FBQ3JELE9BQVEsT0FBZSxDQUFDLGlCQUFpQixDQUFDO0lBQzVDLENBQUM7SUFGRCxrREFFQztJQUVELFNBQWdCLEtBQUssQ0FBQyxHQUFXO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQW1CLEdBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFGRCxzQkFFQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxHQUFXO1FBQ25DLE1BQU0sc0JBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRkQsOEJBRUM7SUFFRCxTQUFnQix1QkFBdUIsQ0FBQyxXQUFtQjtRQUN6RCxPQUFPO1lBQ0wsSUFBSSxFQUFFLFNBQVM7WUFDZixLQUFLLEVBQUUsU0FBUztZQUNoQixNQUFNLEVBQUUsU0FBUztZQUNqQixRQUFRLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU87WUFDdkMsV0FBVyxhQUFBO1lBQ1gsSUFBSSxFQUFFLHdCQUFrQjtZQUN4QixNQUFNLEVBQUUsWUFBTTtTQUNmLENBQUM7SUFDSixDQUFDO0lBVkQsMERBVUM7SUFFRCxTQUFnQixXQUFXLENBQUMsUUFBZ0IsRUFBRSxPQUF3QjtRQUNwRSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFGRCxrQ0FFQztJQUVELFNBQWdCLGtCQUFrQixDQUFDLFFBQWdCLEVBQUUsUUFBa0I7O1FBQ3JFLElBQUksQ0FBQyxRQUFRO1lBQUUsT0FBTyxRQUFRLENBQUM7O1lBQy9CLEtBQWtCLElBQUEsS0FBQSxpQkFBQSxRQUFRLElBQUksRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUE3QixJQUFNLEdBQUcsV0FBQTtnQkFDWixJQUFNLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELElBQUksR0FBRyxFQUFFO29CQUNQLE9BQU8sR0FBRyxDQUFDO2lCQUNaO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFURCxnREFTQztJQUVELFNBQVMsb0JBQW9CLENBQUMsTUFBYyxFQUFFLFFBQWdCO1FBQzVELElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDM0MsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsRUFBYztRQUM3QyxJQUFJLElBQTZCLENBQUM7UUFDbEMsSUFBSSxLQUF1QixDQUFDO1FBQzVCLElBQUksTUFBd0IsQ0FBQztRQUM3QixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7WUFDWCwyQ0FBMkM7WUFDM0MseUVBQXlFO1lBQ3pFLHVDQUF1QztZQUN2QyxJQUFJLEdBQUcsRUFBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBa0IsQ0FBQztZQUM3RixLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzdCLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1NBQ3JDO1FBQ0QsT0FBTztZQUNMLElBQUksTUFBQTtZQUNKLFdBQVcsRUFBRSxFQUFFLENBQUMsV0FBVztZQUMzQixRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVE7WUFDckIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO1lBQ2IsS0FBSyxPQUFBO1lBQ0wsTUFBTSxRQUFBO1NBQ1AsQ0FBQztJQUNKLENBQUM7SUFwQkQsNENBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3N5bnRheEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zLCBERUZBVUxUX0VSUk9SX0NPREUsIERpYWdub3N0aWMsIFNPVVJDRX0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgY29uc3QgR0VORVJBVEVEX0ZJTEVTID0gLyguKj8pXFwuKG5nZmFjdG9yeXxzaGltXFwubmdzdHlsZXxuZ3N0eWxlfG5nc3VtbWFyeSlcXC4oanN8ZFxcLnRzfHRzKSQvO1xuZXhwb3J0IGNvbnN0IERUUyA9IC9cXC5kXFwudHMkLztcbmV4cG9ydCBjb25zdCBUUyA9IC9eKD8hLipcXC5kXFwudHMkKS4qXFwudHMkLztcblxuZXhwb3J0IGNvbnN0IGVudW0gU3RydWN0dXJlSXNSZXVzZWQge1xuICBOb3QgPSAwLFxuICBTYWZlTW9kdWxlcyA9IDEsXG4gIENvbXBsZXRlbHkgPSAyXG59XG5cbi8vIE5vdGU6IFRoaXMgaXMgYW4gaW50ZXJuYWwgcHJvcGVydHkgaW4gVHlwZVNjcmlwdC4gVXNlIGl0IG9ubHkgZm9yIGFzc2VydGlvbnMgYW5kIHRlc3RzLlxuZXhwb3J0IGZ1bmN0aW9uIHRzU3RydWN0dXJlSXNSZXVzZWQocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IFN0cnVjdHVyZUlzUmV1c2VkIHtcbiAgcmV0dXJuIChwcm9ncmFtIGFzIGFueSkuc3RydWN0dXJlSXNSZXVzZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvcihtc2c6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBlcnJvcjogJHttc2d9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1c2VyRXJyb3IobXNnOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IHN5bnRheEVycm9yKG1zZyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhtZXNzYWdlVGV4dDogc3RyaW5nKTogdHMuRGlhZ25vc3RpYyZEaWFnbm9zdGljIHtcbiAgcmV0dXJuIHtcbiAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgbWVzc2FnZVRleHQsXG4gICAgY29kZTogREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgIHNvdXJjZTogU09VUkNFLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJblJvb3REaXIoZmlsZU5hbWU6IHN0cmluZywgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zKSB7XG4gIHJldHVybiAhb3B0aW9ucy5yb290RGlyIHx8IHBhdGhTdGFydHNXaXRoUHJlZml4KG9wdGlvbnMucm9vdERpciwgZmlsZU5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmVUb1Jvb3REaXJzKGZpbGVQYXRoOiBzdHJpbmcsIHJvb3REaXJzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmICghZmlsZVBhdGgpIHJldHVybiBmaWxlUGF0aDtcbiAgZm9yIChjb25zdCBkaXIgb2Ygcm9vdERpcnMgfHwgW10pIHtcbiAgICBjb25zdCByZWwgPSBwYXRoU3RhcnRzV2l0aFByZWZpeChkaXIsIGZpbGVQYXRoKTtcbiAgICBpZiAocmVsKSB7XG4gICAgICByZXR1cm4gcmVsO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmlsZVBhdGg7XG59XG5cbmZ1bmN0aW9uIHBhdGhTdGFydHNXaXRoUHJlZml4KHByZWZpeDogc3RyaW5nLCBmdWxsUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICBjb25zdCByZWwgPSBwYXRoLnJlbGF0aXZlKHByZWZpeCwgZnVsbFBhdGgpO1xuICByZXR1cm4gcmVsLnN0YXJ0c1dpdGgoJy4uJykgPyBudWxsIDogcmVsO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgbmcuRGlhZ25vc3RpYyBpbnRvIGEgdHMuRGlhZ25vc3RpYy5cbiAqIFRoaXMgbG9vc2VzIHNvbWUgaW5mb3JtYXRpb24sIGFuZCBhbHNvIHVzZXMgYW4gaW5jb21wbGV0ZSBvYmplY3QgYXMgYGZpbGVgLlxuICpcbiAqIEkuZS4gb25seSB1c2UgdGhpcyB3aGVyZSB0aGUgQVBJIGFsbG93cyBvbmx5IGEgdHMuRGlhZ25vc3RpYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5nVG9Uc0RpYWdub3N0aWMobmc6IERpYWdub3N0aWMpOiB0cy5EaWFnbm9zdGljIHtcbiAgbGV0IGZpbGU6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkO1xuICBsZXQgc3RhcnQ6IG51bWJlcnx1bmRlZmluZWQ7XG4gIGxldCBsZW5ndGg6IG51bWJlcnx1bmRlZmluZWQ7XG4gIGlmIChuZy5zcGFuKSB7XG4gICAgLy8gTm90ZTogV2UgY2FuJ3QgdXNlIGEgcmVhbCB0cy5Tb3VyY2VGaWxlLFxuICAgIC8vIGJ1dCB3ZSBjYW4gYXQgbGVhc3QgbWlycm9yIHRoZSBwcm9wZXJ0aWVzIGBmaWxlTmFtZWAgYW5kIGB0ZXh0YCwgd2hpY2hcbiAgICAvLyBhcmUgbW9zdGx5IHVzZWQgZm9yIGVycm9yIHJlcG9ydGluZy5cbiAgICBmaWxlID0ge2ZpbGVOYW1lOiBuZy5zcGFuLnN0YXJ0LmZpbGUudXJsLCB0ZXh0OiBuZy5zcGFuLnN0YXJ0LmZpbGUuY29udGVudH0gYXMgdHMuU291cmNlRmlsZTtcbiAgICBzdGFydCA9IG5nLnNwYW4uc3RhcnQub2Zmc2V0O1xuICAgIGxlbmd0aCA9IG5nLnNwYW4uZW5kLm9mZnNldCAtIHN0YXJ0O1xuICB9XG4gIHJldHVybiB7XG4gICAgZmlsZSxcbiAgICBtZXNzYWdlVGV4dDogbmcubWVzc2FnZVRleHQsXG4gICAgY2F0ZWdvcnk6IG5nLmNhdGVnb3J5LFxuICAgIGNvZGU6IG5nLmNvZGUsXG4gICAgc3RhcnQsXG4gICAgbGVuZ3RoLFxuICB9O1xufVxuIl19