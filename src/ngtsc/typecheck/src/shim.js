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
            return file_system_1.absoluteFrom(fileName.replace(/\.tsx?$/, '.ngtypecheck.ts'));
        };
        return TypeCheckShimGenerator;
    }());
    exports.TypeCheckShimGenerator = TypeCheckShimGenerator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9zaGltLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQywyRUFBcUY7SUFHckY7Ozs7OztPQU1HO0lBQ0g7UUFBQTtZQUNXLG9CQUFlLEdBQUcsYUFBYSxDQUFDO1lBQ2hDLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFxQjlCLENBQUM7UUFuQkMsb0RBQW1CLEdBQW5CLFVBQ0ksRUFBaUIsRUFBRSxXQUEyQixFQUM5QyxXQUErQjtZQUNqQyxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLDJGQUEyRjtnQkFDM0YsMkZBQTJGO2dCQUMzRiwyRkFBMkY7Z0JBQzNGLDRGQUE0RjtnQkFDNUYsa0RBQWtEO2dCQUNsRCxPQUFPLFdBQVcsQ0FBQzthQUNwQjtZQUNELE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUN0QixXQUFXLEVBQUUsZ0RBQWdELEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUMzRixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFFTSw4QkFBTyxHQUFkLFVBQWUsUUFBd0I7WUFDckMsT0FBTywwQkFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBdkJELElBdUJDO0lBdkJZLHdEQUFzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0U291cmNlRmlsZU9yRXJyb3J9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGVyRmlsZVNoaW1HZW5lcmF0b3IsIFRvcExldmVsU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcblxuLyoqXG4gKiBBIGBTaGltR2VuZXJhdG9yYCB3aGljaCBhZGRzIHR5cGUtY2hlY2tpbmcgZmlsZXMgdG8gdGhlIGB0cy5Qcm9ncmFtYC5cbiAqXG4gKiBUaGlzIGlzIGEgcmVxdWlyZW1lbnQgZm9yIHBlcmZvcm1hbnQgdGVtcGxhdGUgdHlwZS1jaGVja2luZywgYXMgVHlwZVNjcmlwdCB3aWxsIG9ubHkgcmV1c2VcbiAqIGluZm9ybWF0aW9uIGluIHRoZSBtYWluIHByb2dyYW0gd2hlbiBjcmVhdGluZyB0aGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIGlmIHRoZSBzZXQgb2YgZmlsZXMgaW5cbiAqIGVhY2ggYXJlIGV4YWN0bHkgdGhlIHNhbWUuIFRodXMsIHRoZSBtYWluIHByb2dyYW0gYWxzbyBuZWVkcyB0aGUgc3ludGhldGljIHR5cGUtY2hlY2tpbmcgZmlsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yIGltcGxlbWVudHMgUGVyRmlsZVNoaW1HZW5lcmF0b3Ige1xuICByZWFkb25seSBleHRlbnNpb25QcmVmaXggPSAnbmd0eXBlY2hlY2snO1xuICByZWFkb25seSBzaG91bGRFbWl0ID0gZmFsc2U7XG5cbiAgZ2VuZXJhdGVTaGltRm9yRmlsZShcbiAgICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcmlvclNoaW1TZjogdHMuU291cmNlRmlsZXxudWxsKTogdHMuU291cmNlRmlsZSB7XG4gICAgaWYgKHByaW9yU2hpbVNmICE9PSBudWxsKSB7XG4gICAgICAvLyBJZiB0aGlzIHNoaW0gZXhpc3RlZCBpbiB0aGUgcHJldmlvdXMgcHJvZ3JhbSwgcmV1c2UgaXQgbm93LiBJdCBtaWdodCBub3QgYmUgY29ycmVjdCwgYnV0XG4gICAgICAvLyByZXVzaW5nIGl0IGluIHRoZSBtYWluIHByb2dyYW0gYWxsb3dzIHRoZSBzaGFwZSBvZiBpdHMgaW1wb3J0cyB0byBwb3RlbnRpYWxseSByZW1haW4gdGhlXG4gICAgICAvLyBzYW1lIGFuZCBUUyBjYW4gdGhlbiB1c2UgdGhlIGZhc3Rlc3QgcGF0aCBmb3IgaW5jcmVtZW50YWwgcHJvZ3JhbSBjcmVhdGlvbi4gTGF0ZXIgZHVyaW5nXG4gICAgICAvLyB0aGUgdHlwZS1jaGVja2luZyBwaGFzZSBpdCdzIGdvaW5nIHRvIGVpdGhlciBiZSByZXVzZWQsIG9yIHJlcGxhY2VkIGFueXdheXMuIFRodXMgdGhlcmUnc1xuICAgICAgLy8gbm8gaGFybSBpbiByZXVzZSBoZXJlIGV2ZW4gaWYgaXQncyBvdXQgb2YgZGF0ZS5cbiAgICAgIHJldHVybiBwcmlvclNoaW1TZjtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGdlbkZpbGVQYXRoLCAnZXhwb3J0IGNvbnN0IFVTRURfRk9SX05HX1RZUEVfQ0hFQ0tJTkcgPSB0cnVlOycsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUsXG4gICAgICAgIHRzLlNjcmlwdEtpbmQuVFMpO1xuICB9XG5cbiAgc3RhdGljIHNoaW1Gb3IoZmlsZU5hbWU6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIHJldHVybiBhYnNvbHV0ZUZyb20oZmlsZU5hbWUucmVwbGFjZSgvXFwudHN4PyQvLCAnLm5ndHlwZWNoZWNrLnRzJykpO1xuICB9XG59XG4iXX0=