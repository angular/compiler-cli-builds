(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/sourcemaps", ["require", "exports", "@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file", "@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file_loader"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var source_file_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file");
    Object.defineProperty(exports, "SourceFile", { enumerable: true, get: function () { return source_file_1.SourceFile; } });
    var source_file_loader_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file_loader");
    Object.defineProperty(exports, "SourceFileLoader", { enumerable: true, get: function () { return source_file_loader_1.SourceFileLoader; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NvdXJjZW1hcHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFRQSwwRkFBc0Q7SUFBckMseUdBQUEsVUFBVSxPQUFBO0lBQzNCLHdHQUEwRDtJQUFsRCxzSEFBQSxnQkFBZ0IsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuZXhwb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJy4vc3JjL3Jhd19zb3VyY2VfbWFwJztcbmV4cG9ydCB7TWFwcGluZywgU291cmNlRmlsZX0gZnJvbSAnLi9zcmMvc291cmNlX2ZpbGUnO1xuZXhwb3J0IHtTb3VyY2VGaWxlTG9hZGVyfSBmcm9tICcuL3NyYy9zb3VyY2VfZmlsZV9sb2FkZXInO1xuIl19