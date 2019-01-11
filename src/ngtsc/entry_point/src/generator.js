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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/generator", ["require", "exports", "path", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference types="node" />
    var path = require("path");
    var ts = require("typescript");
    var FlatIndexGenerator = /** @class */ (function () {
        function FlatIndexGenerator(entryPoint, relativeFlatIndexPath, moduleName) {
            this.entryPoint = entryPoint;
            this.moduleName = moduleName;
            this.flatIndexPath = path.posix.join(path.posix.dirname(entryPoint), relativeFlatIndexPath)
                .replace(/\.js$/, '') +
                '.ts';
        }
        FlatIndexGenerator.prototype.recognize = function (fileName) { return fileName === this.flatIndexPath; };
        FlatIndexGenerator.prototype.generate = function () {
            var relativeEntryPoint = './' +
                path.posix.relative(path.posix.dirname(this.flatIndexPath), this.entryPoint)
                    .replace(/\.tsx?$/, '');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9lbnRyeV9wb2ludC9zcmMvZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLDJCQUE2QjtJQUM3QiwrQkFBaUM7SUFJakM7UUFHRSw0QkFDYSxVQUFrQixFQUFFLHFCQUE2QixFQUNqRCxVQUF1QjtZQUR2QixlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQ2xCLGVBQVUsR0FBVixVQUFVLENBQWE7WUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxxQkFBcUIsQ0FBQztpQkFDakUsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzFDLEtBQUssQ0FBQztRQUNaLENBQUM7UUFFRCxzQ0FBUyxHQUFULFVBQVUsUUFBZ0IsSUFBYSxPQUFPLFFBQVEsS0FBSyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUVoRixxQ0FBUSxHQUFSO1lBQ0UsSUFBTSxrQkFBa0IsR0FBRyxJQUFJO2dCQUMzQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQztxQkFDdkUsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUVoQyxJQUFNLFFBQVEsR0FBRyx5RUFJSixrQkFBa0IsU0FDbEMsQ0FBQztZQUNFLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDL0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEYsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDNUIsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2FBQ3RDO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQS9CRCxJQStCQztJQS9CWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtTaGltR2VuZXJhdG9yfSBmcm9tICcuLi8uLi9zaGltcyc7XG5cbmV4cG9ydCBjbGFzcyBGbGF0SW5kZXhHZW5lcmF0b3IgaW1wbGVtZW50cyBTaGltR2VuZXJhdG9yIHtcbiAgcmVhZG9ubHkgZmxhdEluZGV4UGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZW50cnlQb2ludDogc3RyaW5nLCByZWxhdGl2ZUZsYXRJbmRleFBhdGg6IHN0cmluZyxcbiAgICAgIHJlYWRvbmx5IG1vZHVsZU5hbWU6IHN0cmluZ3xudWxsKSB7XG4gICAgdGhpcy5mbGF0SW5kZXhQYXRoID0gcGF0aC5wb3NpeC5qb2luKHBhdGgucG9zaXguZGlybmFtZShlbnRyeVBvaW50KSwgcmVsYXRpdmVGbGF0SW5kZXhQYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwuanMkLywgJycpICtcbiAgICAgICAgJy50cyc7XG4gIH1cblxuICByZWNvZ25pemUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gZmlsZU5hbWUgPT09IHRoaXMuZmxhdEluZGV4UGF0aDsgfVxuXG4gIGdlbmVyYXRlKCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIGNvbnN0IHJlbGF0aXZlRW50cnlQb2ludCA9ICcuLycgK1xuICAgICAgICBwYXRoLnBvc2l4LnJlbGF0aXZlKHBhdGgucG9zaXguZGlybmFtZSh0aGlzLmZsYXRJbmRleFBhdGgpLCB0aGlzLmVudHJ5UG9pbnQpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFwudHN4PyQvLCAnJyk7XG5cbiAgICBjb25zdCBjb250ZW50cyA9IGAvKipcbiAqIEdlbmVyYXRlZCBidW5kbGUgaW5kZXguIERvIG5vdCBlZGl0LlxuICovXG5cbmV4cG9ydCAqIGZyb20gJyR7cmVsYXRpdmVFbnRyeVBvaW50fSc7XG5gO1xuICAgIGNvbnN0IGdlbkZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICB0aGlzLmZsYXRJbmRleFBhdGgsIGNvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgICBpZiAodGhpcy5tb2R1bGVOYW1lICE9PSBudWxsKSB7XG4gICAgICBnZW5GaWxlLm1vZHVsZU5hbWUgPSB0aGlzLm1vZHVsZU5hbWU7XG4gICAgfVxuICAgIHJldHVybiBnZW5GaWxlO1xuICB9XG59XG4iXX0=