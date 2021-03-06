(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_linker", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9saW5rZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9wYXJ0aWFsX2xpbmtlcnMvcGFydGlhbF9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2wsIFIzUGFydGlhbERlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QXN0T2JqZWN0fSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcblxuLyoqXG4gKiBBbiBpbnRlcmZhY2UgZm9yIGNsYXNzZXMgdGhhdCBjYW4gbGluayBwYXJ0aWFsIGRlY2xhcmF0aW9ucyBpbnRvIGZ1bGwgZGVmaW5pdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICAvKipcbiAgICogTGluayB0aGUgcGFydGlhbCBkZWNsYXJhdGlvbiBgbWV0YU9iamAgaW5mb3JtYXRpb24gdG8gZ2VuZXJhdGUgYSBmdWxsIGRlZmluaXRpb24gZXhwcmVzc2lvbi5cbiAgICpcbiAgICogQHBhcmFtIG1ldGFPYmogQW4gb2JqZWN0IHRoYXQgZml0cyBvbmUgb2YgdGhlIGBSM0RlY2xhcmVEaXJlY3RpdmVNZXRhZGF0YWAgb3JcbiAgICogICAgIGBSM0RlY2xhcmVDb21wb25lbnRNZXRhZGF0YWAgaW50ZXJmYWNlcy5cbiAgICovXG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uO1xufVxuIl19