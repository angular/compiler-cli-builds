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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/shim", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckShimGenerator = void 0;
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * A `ShimGenerator` which adds type-checking files to the `ts.Program`.
     *
     * This is a requirement for performant template type-checking, as TypeScript will only reuse
     * information in the main program when creating the type-checking program if the set of files in
     * each are exactly the same. Thus, the main program also needs the synthetic type-checking files.
     */
    var TypeCheckShimGenerator = /** @class */ (function () {
        function TypeCheckShimGenerator() {
            this.extensionPrefix = 'ngtypecheck';
            this.shouldEmit = false;
        }
        TypeCheckShimGenerator.prototype.generateShimForFile = function (sf, genFilePath, priorShimSf) {
            if (priorShimSf !== null) {
                // If this shim existed in the previous program, reuse it now. It might not be correct, but
                // reusing it in the main program allows the shape of its imports to potentially remain the
                // same and TS can then use the fastest path for incremental program creation. Later during
                // the type-checking phase it's going to either be reused, or replaced anyways. Thus there's
                // no harm in reuse here even if it's out of date.
                return priorShimSf;
            }
            return ts.createSourceFile(genFilePath, 'export const USED_FOR_NG_TYPE_CHECKING = true;', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        };
        TypeCheckShimGenerator.shimFor = function (fileName) {
            return (0, file_system_1.absoluteFrom)(fileName.replace(/\.tsx?$/, '.ngtypecheck.ts'));
        };
        return TypeCheckShimGenerator;
    }());
    exports.TypeCheckShimGenerator = TypeCheckShimGenerator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9zaGltLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBcUY7SUFHckY7Ozs7OztPQU1HO0lBQ0g7UUFBQTtZQUNXLG9CQUFlLEdBQUcsYUFBYSxDQUFDO1lBQ2hDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFxQjlCLENBQUM7UUFuQkMsb0RBQW1CLEdBQW5CLFVBQ0ksRUFBaUIsRUFBRSxXQUEyQixFQUM5QyxXQUErQjtZQUNqQyxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLDJGQUEyRjtnQkFDM0YsMkZBQTJGO2dCQUMzRiwyRkFBMkY7Z0JBQzNGLDRGQUE0RjtnQkFDNUYsa0RBQWtEO2dCQUNsRCxPQUFPLFdBQVcsQ0FBQzthQUNwQjtZQUNELE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUN0QixXQUFXLEVBQUUsZ0RBQWdELEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUMzRixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFFTSw4QkFBTyxHQUFkLFVBQWUsUUFBd0I7WUFDckMsT0FBTyxJQUFBLDBCQUFZLEVBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUF2QkQsSUF1QkM7SUF2Qlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGgsIGdldFNvdXJjZUZpbGVPckVycm9yfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BlckZpbGVTaGltR2VuZXJhdG9yLCBUb3BMZXZlbFNoaW1HZW5lcmF0b3J9IGZyb20gJy4uLy4uL3NoaW1zL2FwaSc7XG5cbi8qKlxuICogQSBgU2hpbUdlbmVyYXRvcmAgd2hpY2ggYWRkcyB0eXBlLWNoZWNraW5nIGZpbGVzIHRvIHRoZSBgdHMuUHJvZ3JhbWAuXG4gKlxuICogVGhpcyBpcyBhIHJlcXVpcmVtZW50IGZvciBwZXJmb3JtYW50IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcsIGFzIFR5cGVTY3JpcHQgd2lsbCBvbmx5IHJldXNlXG4gKiBpbmZvcm1hdGlvbiBpbiB0aGUgbWFpbiBwcm9ncmFtIHdoZW4gY3JlYXRpbmcgdGhlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBpZiB0aGUgc2V0IG9mIGZpbGVzIGluXG4gKiBlYWNoIGFyZSBleGFjdGx5IHRoZSBzYW1lLiBUaHVzLCB0aGUgbWFpbiBwcm9ncmFtIGFsc28gbmVlZHMgdGhlIHN5bnRoZXRpYyB0eXBlLWNoZWNraW5nIGZpbGVzLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrU2hpbUdlbmVyYXRvciBpbXBsZW1lbnRzIFBlckZpbGVTaGltR2VuZXJhdG9yIHtcbiAgcmVhZG9ubHkgZXh0ZW5zaW9uUHJlZml4ID0gJ25ndHlwZWNoZWNrJztcbiAgcmVhZG9ubHkgc2hvdWxkRW1pdCA9IGZhbHNlO1xuXG4gIGdlbmVyYXRlU2hpbUZvckZpbGUoXG4gICAgICBzZjogdHMuU291cmNlRmlsZSwgZ2VuRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpb3JTaGltU2Y6IHRzLlNvdXJjZUZpbGV8bnVsbCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGlmIChwcmlvclNoaW1TZiAhPT0gbnVsbCkge1xuICAgICAgLy8gSWYgdGhpcyBzaGltIGV4aXN0ZWQgaW4gdGhlIHByZXZpb3VzIHByb2dyYW0sIHJldXNlIGl0IG5vdy4gSXQgbWlnaHQgbm90IGJlIGNvcnJlY3QsIGJ1dFxuICAgICAgLy8gcmV1c2luZyBpdCBpbiB0aGUgbWFpbiBwcm9ncmFtIGFsbG93cyB0aGUgc2hhcGUgb2YgaXRzIGltcG9ydHMgdG8gcG90ZW50aWFsbHkgcmVtYWluIHRoZVxuICAgICAgLy8gc2FtZSBhbmQgVFMgY2FuIHRoZW4gdXNlIHRoZSBmYXN0ZXN0IHBhdGggZm9yIGluY3JlbWVudGFsIHByb2dyYW0gY3JlYXRpb24uIExhdGVyIGR1cmluZ1xuICAgICAgLy8gdGhlIHR5cGUtY2hlY2tpbmcgcGhhc2UgaXQncyBnb2luZyB0byBlaXRoZXIgYmUgcmV1c2VkLCBvciByZXBsYWNlZCBhbnl3YXlzLiBUaHVzIHRoZXJlJ3NcbiAgICAgIC8vIG5vIGhhcm0gaW4gcmV1c2UgaGVyZSBldmVuIGlmIGl0J3Mgb3V0IG9mIGRhdGUuXG4gICAgICByZXR1cm4gcHJpb3JTaGltU2Y7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICBnZW5GaWxlUGF0aCwgJ2V4cG9ydCBjb25zdCBVU0VEX0ZPUl9OR19UWVBFX0NIRUNLSU5HID0gdHJ1ZTsnLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlLFxuICAgICAgICB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgfVxuXG4gIHN0YXRpYyBzaGltRm9yKGZpbGVOYW1lOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICByZXR1cm4gYWJzb2x1dGVGcm9tKGZpbGVOYW1lLnJlcGxhY2UoL1xcLnRzeD8kLywgJy5uZ3R5cGVjaGVjay50cycpKTtcbiAgfVxufVxuIl19