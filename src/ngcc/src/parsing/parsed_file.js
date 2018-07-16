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
        define("@angular/compiler-cli/src/ngcc/src/parsing/parsed_file", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ParsedFile = /** @class */ (function () {
        function ParsedFile(sourceFile) {
            this.sourceFile = sourceFile;
            this.decoratedClasses = [];
        }
        return ParsedFile;
    }());
    exports.ParsedFile = ParsedFile;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VkX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvcGFyc2VkX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFLSDtRQUVFLG9CQUFtQixVQUF5QjtZQUF6QixlQUFVLEdBQVYsVUFBVSxDQUFlO1lBRHJDLHFCQUFnQixHQUFrQixFQUFFLENBQUM7UUFDRyxDQUFDO1FBQ2xELGlCQUFDO0lBQUQsQ0FBQyxBQUhELElBR0M7SUFIWSxnQ0FBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1BhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNlZF9jbGFzcyc7XG5cbmV4cG9ydCBjbGFzcyBQYXJzZWRGaWxlIHtcbiAgcHVibGljIGRlY29yYXRlZENsYXNzZXM6IFBhcnNlZENsYXNzW10gPSBbXTtcbiAgY29uc3RydWN0b3IocHVibGljIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpIHt9XG59XG4iXX0=