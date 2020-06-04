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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReusedProgramStrategy = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/api");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    /**
     * Implements a template type-checking program using `ts.createProgram` and TypeScript's program
     * reuse functionality.
     */
    var ReusedProgramStrategy = /** @class */ (function () {
        function ReusedProgramStrategy(program, originalHost, options, shimExtensionPrefixes) {
            this.program = program;
            this.originalHost = originalHost;
            this.options = options;
            this.shimExtensionPrefixes = shimExtensionPrefixes;
            /**
             * A map of source file paths to replacement `ts.SourceFile`s for those paths.
             *
             * Effectively, this tracks the delta between the user's program (represented by the
             * `originalHost`) and the template type-checking program being managed.
             */
            this.sfMap = new Map();
        }
        ReusedProgramStrategy.prototype.getProgram = function () {
            return this.program;
        };
        ReusedProgramStrategy.prototype.updateFiles = function (contents, updateMode) {
            var e_1, _a;
            if (updateMode === api_1.UpdateMode.Complete) {
                this.sfMap.clear();
            }
            try {
                for (var _b = tslib_1.__values(contents.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), filePath = _d[0], text = _d[1];
                    this.sfMap.set(filePath, ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var host = new host_1.TypeCheckProgramHost(this.sfMap, this.originalHost, this.shimExtensionPrefixes);
            this.program = ts.createProgram({
                host: host,
                rootNames: this.program.getRootFileNames(),
                options: this.options,
                oldProgram: this.program,
            });
            host.postProgramCreationCleanup();
        };
        return ReusedProgramStrategy;
    }());
    exports.ReusedProgramStrategy = ReusedProgramStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXVnbWVudGVkX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvYXVnbWVudGVkX3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUlqQyx5RUFBOEQ7SUFDOUQsMkVBQTRDO0lBRTVDOzs7T0FHRztJQUNIO1FBU0UsK0JBQ1ksT0FBbUIsRUFBVSxZQUE2QixFQUMxRCxPQUEyQixFQUFVLHFCQUErQjtZQURwRSxZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQWlCO1lBQzFELFlBQU8sR0FBUCxPQUFPLENBQW9CO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFVO1lBVmhGOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1FBSWtDLENBQUM7UUFFcEYsMENBQVUsR0FBVjtZQUNFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFDO1FBRUQsMkNBQVcsR0FBWCxVQUFZLFFBQXFDLEVBQUUsVUFBc0I7O1lBQ3ZFLElBQUksVUFBVSxLQUFLLGdCQUFVLENBQUMsUUFBUSxFQUFFO2dCQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3BCOztnQkFFRCxLQUErQixJQUFBLEtBQUEsaUJBQUEsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBLGdCQUFBLDRCQUFFO29CQUF4QyxJQUFBLEtBQUEsMkJBQWdCLEVBQWYsUUFBUSxRQUFBLEVBQUUsSUFBSSxRQUFBO29CQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDN0Y7Ozs7Ozs7OztZQUVELElBQU0sSUFBSSxHQUNOLElBQUksMkJBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDOUIsSUFBSSxNQUFBO2dCQUNKLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFO2dCQUMxQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTzthQUN6QixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBcENELElBb0NDO0lBcENZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge1R5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSwgVXBkYXRlTW9kZX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUeXBlQ2hlY2tQcm9ncmFtSG9zdH0gZnJvbSAnLi9ob3N0JztcblxuLyoqXG4gKiBJbXBsZW1lbnRzIGEgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIHVzaW5nIGB0cy5jcmVhdGVQcm9ncmFtYCBhbmQgVHlwZVNjcmlwdCdzIHByb2dyYW1cbiAqIHJldXNlIGZ1bmN0aW9uYWxpdHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXVzZWRQcm9ncmFtU3RyYXRlZ3kgaW1wbGVtZW50cyBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kge1xuICAvKipcbiAgICogQSBtYXAgb2Ygc291cmNlIGZpbGUgcGF0aHMgdG8gcmVwbGFjZW1lbnQgYHRzLlNvdXJjZUZpbGVgcyBmb3IgdGhvc2UgcGF0aHMuXG4gICAqXG4gICAqIEVmZmVjdGl2ZWx5LCB0aGlzIHRyYWNrcyB0aGUgZGVsdGEgYmV0d2VlbiB0aGUgdXNlcidzIHByb2dyYW0gKHJlcHJlc2VudGVkIGJ5IHRoZVxuICAgKiBgb3JpZ2luYWxIb3N0YCkgYW5kIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHByb2dyYW0gYmVpbmcgbWFuYWdlZC5cbiAgICovXG4gIHByaXZhdGUgc2ZNYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBvcmlnaW5hbEhvc3Q6IHRzLkNvbXBpbGVySG9zdCxcbiAgICAgIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcml2YXRlIHNoaW1FeHRlbnNpb25QcmVmaXhlczogc3RyaW5nW10pIHt9XG5cbiAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5wcm9ncmFtO1xuICB9XG5cbiAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPiwgdXBkYXRlTW9kZTogVXBkYXRlTW9kZSk6IHZvaWQge1xuICAgIGlmICh1cGRhdGVNb2RlID09PSBVcGRhdGVNb2RlLkNvbXBsZXRlKSB7XG4gICAgICB0aGlzLnNmTWFwLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbZmlsZVBhdGgsIHRleHRdIG9mIGNvbnRlbnRzLmVudHJpZXMoKSkge1xuICAgICAgdGhpcy5zZk1hcC5zZXQoZmlsZVBhdGgsIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZVBhdGgsIHRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpKTtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID1cbiAgICAgICAgbmV3IFR5cGVDaGVja1Byb2dyYW1Ib3N0KHRoaXMuc2ZNYXAsIHRoaXMub3JpZ2luYWxIb3N0LCB0aGlzLnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG4gICAgdGhpcy5wcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICBob3N0LFxuICAgICAgcm9vdE5hbWVzOiB0aGlzLnByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgb2xkUHJvZ3JhbTogdGhpcy5wcm9ncmFtLFxuICAgIH0pO1xuICAgIGhvc3QucG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTtcbiAgfVxufVxuIl19