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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/generator", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FlatIndexGenerator = void 0;
    /// <reference types="node" />
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var FlatIndexGenerator = /** @class */ (function () {
        function FlatIndexGenerator(entryPoint, relativeFlatIndexPath, moduleName) {
            this.entryPoint = entryPoint;
            this.moduleName = moduleName;
            this.shouldEmit = true;
            this.flatIndexPath =
                file_system_1.join(file_system_1.dirname(entryPoint), relativeFlatIndexPath).replace(/\.js$/, '') + '.ts';
        }
        FlatIndexGenerator.prototype.makeTopLevelShim = function () {
            var relativeEntryPoint = path_1.relativePathBetween(this.flatIndexPath, this.entryPoint);
            var contents = "/**\n * Generated bundle index. Do not edit.\n */\n\nexport * from '" + relativeEntryPoint + "';\n";
            var genFile = ts.createSourceFile(this.flatIndexPath, contents, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
            if (this.moduleName !== null) {
                genFile.moduleName = this.moduleName;
            }
            return genFile;
        };
        return FlatIndexGenerator;
    }());
    exports.FlatIndexGenerator = FlatIndexGenerator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9lbnRyeV9wb2ludC9zcmMvZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QiwrQkFBaUM7SUFFakMsMkVBQWdFO0lBRWhFLHNFQUF3RDtJQUV4RDtRQUlFLDRCQUNhLFVBQTBCLEVBQUUscUJBQTZCLEVBQ3pELFVBQXVCO1lBRHZCLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQzFCLGVBQVUsR0FBVixVQUFVLENBQWE7WUFKM0IsZUFBVSxHQUFHLElBQUksQ0FBQztZQUt6QixJQUFJLENBQUMsYUFBYTtnQkFDZCxrQkFBSSxDQUFDLHFCQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUNwRixDQUFDO1FBRUQsNkNBQWdCLEdBQWhCO1lBQ0UsSUFBTSxrQkFBa0IsR0FBRywwQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwRixJQUFNLFFBQVEsR0FBRyx5RUFJSixrQkFBa0IsU0FDbEMsQ0FBQztZQUNFLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDL0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEYsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDNUIsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTFCRCxJQTBCQztJQTFCWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIGpvaW59IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VG9wTGV2ZWxTaGltR2VuZXJhdG9yfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgRmxhdEluZGV4R2VuZXJhdG9yIGltcGxlbWVudHMgVG9wTGV2ZWxTaGltR2VuZXJhdG9yIHtcbiAgcmVhZG9ubHkgZmxhdEluZGV4UGF0aDogc3RyaW5nO1xuICByZWFkb25seSBzaG91bGRFbWl0ID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRoLCByZWxhdGl2ZUZsYXRJbmRleFBhdGg6IHN0cmluZyxcbiAgICAgIHJlYWRvbmx5IG1vZHVsZU5hbWU6IHN0cmluZ3xudWxsKSB7XG4gICAgdGhpcy5mbGF0SW5kZXhQYXRoID1cbiAgICAgICAgam9pbihkaXJuYW1lKGVudHJ5UG9pbnQpLCByZWxhdGl2ZUZsYXRJbmRleFBhdGgpLnJlcGxhY2UoL1xcLmpzJC8sICcnKSArICcudHMnO1xuICB9XG5cbiAgbWFrZVRvcExldmVsU2hpbSgpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICBjb25zdCByZWxhdGl2ZUVudHJ5UG9pbnQgPSByZWxhdGl2ZVBhdGhCZXR3ZWVuKHRoaXMuZmxhdEluZGV4UGF0aCwgdGhpcy5lbnRyeVBvaW50KTtcbiAgICBjb25zdCBjb250ZW50cyA9IGAvKipcbiAqIEdlbmVyYXRlZCBidW5kbGUgaW5kZXguIERvIG5vdCBlZGl0LlxuICovXG5cbmV4cG9ydCAqIGZyb20gJyR7cmVsYXRpdmVFbnRyeVBvaW50fSc7XG5gO1xuICAgIGNvbnN0IGdlbkZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICB0aGlzLmZsYXRJbmRleFBhdGgsIGNvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgICBpZiAodGhpcy5tb2R1bGVOYW1lICE9PSBudWxsKSB7XG4gICAgICBnZW5GaWxlLm1vZHVsZU5hbWUgPSB0aGlzLm1vZHVsZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiBnZW5GaWxlO1xuICB9XG59XG4iXX0=