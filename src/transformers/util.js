/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.stripComment = exports.ngToTsDiagnostic = exports.relativeToRootDirs = exports.isInRootDir = exports.createMessageDiagnostic = exports.userError = exports.error = exports.tsStructureIsReused = exports.TS = exports.DTS = exports.GENERATED_FILES = void 0;
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
        throw (0, compiler_1.syntaxError)(msg);
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
            for (var _b = (0, tslib_1.__values)(rootDirs || []), _c = _b.next(); !_c.done; _c = _b.next()) {
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
    /**
     * Strip multiline comment start and end markers from the `commentText` string.
     *
     * This will also strip the JSDOC comment start marker (`/**`).
     */
    function stripComment(commentText) {
        return commentText.replace(/^\/\*\*?/, '').replace(/\*\/$/, '').trim();
    }
    exports.stripComment = stripComment;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE4QztJQUM5QywyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLGtFQUE4RTtJQUVqRSxRQUFBLGVBQWUsR0FBRyxvRUFBb0UsQ0FBQztJQUN2RixRQUFBLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDakIsUUFBQSxFQUFFLEdBQUcsd0JBQXdCLENBQUM7SUFRM0MsMEZBQTBGO0lBQzFGLFNBQWdCLG1CQUFtQixDQUFDLE9BQW1CO1FBQ3JELE9BQVEsT0FBZSxDQUFDLGlCQUFpQixDQUFDO0lBQzVDLENBQUM7SUFGRCxrREFFQztJQUVELFNBQWdCLEtBQUssQ0FBQyxHQUFXO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQW1CLEdBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFGRCxzQkFFQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxHQUFXO1FBQ25DLE1BQU0sSUFBQSxzQkFBVyxFQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFGRCw4QkFFQztJQUVELFNBQWdCLHVCQUF1QixDQUFDLFdBQW1CO1FBQ3pELE9BQU87WUFDTCxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztZQUN2QyxXQUFXLGFBQUE7WUFDWCxJQUFJLEVBQUUsd0JBQWtCO1lBQ3hCLE1BQU0sRUFBRSxZQUFNO1NBQ2YsQ0FBQztJQUNKLENBQUM7SUFWRCwwREFVQztJQUVELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLE9BQXdCO1FBQ3BFLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUZELGtDQUVDO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUMsUUFBZ0IsRUFBRSxRQUFrQjs7UUFDckUsSUFBSSxDQUFDLFFBQVE7WUFBRSxPQUFPLFFBQVEsQ0FBQzs7WUFDL0IsS0FBa0IsSUFBQSxLQUFBLHNCQUFBLFFBQVEsSUFBSSxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQTdCLElBQU0sR0FBRyxXQUFBO2dCQUNaLElBQU0sR0FBRyxHQUFHLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsT0FBTyxHQUFHLENBQUM7aUJBQ1o7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQVRELGdEQVNDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBQyxNQUFjLEVBQUUsUUFBZ0I7UUFDNUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUMsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUMzQyxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxFQUFjO1FBQzdDLElBQUksSUFBNkIsQ0FBQztRQUNsQyxJQUFJLEtBQXVCLENBQUM7UUFDNUIsSUFBSSxNQUF3QixDQUFDO1FBQzdCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRTtZQUNYLDJDQUEyQztZQUMzQyx5RUFBeUU7WUFDekUsdUNBQXVDO1lBQ3ZDLElBQUksR0FBRyxFQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFrQixDQUFDO1lBQzdGLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDN0IsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7U0FDckM7UUFDRCxPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXO1lBQzNCLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUTtZQUNyQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7WUFDYixLQUFLLE9BQUE7WUFDTCxNQUFNLFFBQUE7U0FDUCxDQUFDO0lBQ0osQ0FBQztJQXBCRCw0Q0FvQkM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBZ0IsWUFBWSxDQUFDLFdBQW1CO1FBQzlDLE9BQU8sV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6RSxDQUFDO0lBRkQsb0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtzeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NvbXBpbGVyT3B0aW9ucywgREVGQVVMVF9FUlJPUl9DT0RFLCBEaWFnbm9zdGljLCBTT1VSQ0V9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGNvbnN0IEdFTkVSQVRFRF9GSUxFUyA9IC8oLio/KVxcLihuZ2ZhY3Rvcnl8c2hpbVxcLm5nc3R5bGV8bmdzdHlsZXxuZ3N1bW1hcnkpXFwuKGpzfGRcXC50c3x0cykkLztcbmV4cG9ydCBjb25zdCBEVFMgPSAvXFwuZFxcLnRzJC87XG5leHBvcnQgY29uc3QgVFMgPSAvXig/IS4qXFwuZFxcLnRzJCkuKlxcLnRzJC87XG5cbmV4cG9ydCBjb25zdCBlbnVtIFN0cnVjdHVyZUlzUmV1c2VkIHtcbiAgTm90ID0gMCxcbiAgU2FmZU1vZHVsZXMgPSAxLFxuICBDb21wbGV0ZWx5ID0gMlxufVxuXG4vLyBOb3RlOiBUaGlzIGlzIGFuIGludGVybmFsIHByb3BlcnR5IGluIFR5cGVTY3JpcHQuIFVzZSBpdCBvbmx5IGZvciBhc3NlcnRpb25zIGFuZCB0ZXN0cy5cbmV4cG9ydCBmdW5jdGlvbiB0c1N0cnVjdHVyZUlzUmV1c2VkKHByb2dyYW06IHRzLlByb2dyYW0pOiBTdHJ1Y3R1cmVJc1JldXNlZCB7XG4gIHJldHVybiAocHJvZ3JhbSBhcyBhbnkpLnN0cnVjdHVyZUlzUmV1c2VkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3IobXNnOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3I6ICR7bXNnfWApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlckVycm9yKG1zZzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBzeW50YXhFcnJvcihtc2cpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVzc2FnZURpYWdub3N0aWMobWVzc2FnZVRleHQ6IHN0cmluZyk6IHRzLkRpYWdub3N0aWMmRGlhZ25vc3RpYyB7XG4gIHJldHVybiB7XG4gICAgZmlsZTogdW5kZWZpbmVkLFxuICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgIG1lc3NhZ2VUZXh0LFxuICAgIGNvZGU6IERFRkFVTFRfRVJST1JfQ09ERSxcbiAgICBzb3VyY2U6IFNPVVJDRSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5Sb290RGlyKGZpbGVOYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucykge1xuICByZXR1cm4gIW9wdGlvbnMucm9vdERpciB8fCBwYXRoU3RhcnRzV2l0aFByZWZpeChvcHRpb25zLnJvb3REaXIsIGZpbGVOYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbGF0aXZlVG9Sb290RGlycyhmaWxlUGF0aDogc3RyaW5nLCByb290RGlyczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAoIWZpbGVQYXRoKSByZXR1cm4gZmlsZVBhdGg7XG4gIGZvciAoY29uc3QgZGlyIG9mIHJvb3REaXJzIHx8IFtdKSB7XG4gICAgY29uc3QgcmVsID0gcGF0aFN0YXJ0c1dpdGhQcmVmaXgoZGlyLCBmaWxlUGF0aCk7XG4gICAgaWYgKHJlbCkge1xuICAgICAgcmV0dXJuIHJlbDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZpbGVQYXRoO1xufVxuXG5mdW5jdGlvbiBwYXRoU3RhcnRzV2l0aFByZWZpeChwcmVmaXg6IHN0cmluZywgZnVsbFBhdGg6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgcmVsID0gcGF0aC5yZWxhdGl2ZShwcmVmaXgsIGZ1bGxQYXRoKTtcbiAgcmV0dXJuIHJlbC5zdGFydHNXaXRoKCcuLicpID8gbnVsbCA6IHJlbDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIG5nLkRpYWdub3N0aWMgaW50byBhIHRzLkRpYWdub3N0aWMuXG4gKiBUaGlzIGxvb3NlcyBzb21lIGluZm9ybWF0aW9uLCBhbmQgYWxzbyB1c2VzIGFuIGluY29tcGxldGUgb2JqZWN0IGFzIGBmaWxlYC5cbiAqXG4gKiBJLmUuIG9ubHkgdXNlIHRoaXMgd2hlcmUgdGhlIEFQSSBhbGxvd3Mgb25seSBhIHRzLkRpYWdub3N0aWMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBuZ1RvVHNEaWFnbm9zdGljKG5nOiBEaWFnbm9zdGljKTogdHMuRGlhZ25vc3RpYyB7XG4gIGxldCBmaWxlOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZDtcbiAgbGV0IHN0YXJ0OiBudW1iZXJ8dW5kZWZpbmVkO1xuICBsZXQgbGVuZ3RoOiBudW1iZXJ8dW5kZWZpbmVkO1xuICBpZiAobmcuc3Bhbikge1xuICAgIC8vIE5vdGU6IFdlIGNhbid0IHVzZSBhIHJlYWwgdHMuU291cmNlRmlsZSxcbiAgICAvLyBidXQgd2UgY2FuIGF0IGxlYXN0IG1pcnJvciB0aGUgcHJvcGVydGllcyBgZmlsZU5hbWVgIGFuZCBgdGV4dGAsIHdoaWNoXG4gICAgLy8gYXJlIG1vc3RseSB1c2VkIGZvciBlcnJvciByZXBvcnRpbmcuXG4gICAgZmlsZSA9IHtmaWxlTmFtZTogbmcuc3Bhbi5zdGFydC5maWxlLnVybCwgdGV4dDogbmcuc3Bhbi5zdGFydC5maWxlLmNvbnRlbnR9IGFzIHRzLlNvdXJjZUZpbGU7XG4gICAgc3RhcnQgPSBuZy5zcGFuLnN0YXJ0Lm9mZnNldDtcbiAgICBsZW5ndGggPSBuZy5zcGFuLmVuZC5vZmZzZXQgLSBzdGFydDtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGUsXG4gICAgbWVzc2FnZVRleHQ6IG5nLm1lc3NhZ2VUZXh0LFxuICAgIGNhdGVnb3J5OiBuZy5jYXRlZ29yeSxcbiAgICBjb2RlOiBuZy5jb2RlLFxuICAgIHN0YXJ0LFxuICAgIGxlbmd0aCxcbiAgfTtcbn1cblxuLyoqXG4gKiBTdHJpcCBtdWx0aWxpbmUgY29tbWVudCBzdGFydCBhbmQgZW5kIG1hcmtlcnMgZnJvbSB0aGUgYGNvbW1lbnRUZXh0YCBzdHJpbmcuXG4gKlxuICogVGhpcyB3aWxsIGFsc28gc3RyaXAgdGhlIEpTRE9DIGNvbW1lbnQgc3RhcnQgbWFya2VyIChgLyoqYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcENvbW1lbnQoY29tbWVudFRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21tZW50VGV4dC5yZXBsYWNlKC9eXFwvXFwqXFwqPy8sICcnKS5yZXBsYWNlKC9cXCpcXC8kLywgJycpLnRyaW0oKTtcbn1cbiJdfQ==