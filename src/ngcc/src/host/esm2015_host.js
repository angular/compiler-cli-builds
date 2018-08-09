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
        define("@angular/compiler-cli/src/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "fs", "typescript", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var fs_1 = require("fs");
    var ts = require("typescript");
    var fesm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host");
    var Esm2015ReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015ReflectionHost, _super);
        function Esm2015ReflectionHost(checker, dtsMapper) {
            var _this = _super.call(this, checker) || this;
            _this.dtsMapper = dtsMapper;
            return _this;
        }
        /**
         * Get the number of generic type parameters of a given class.
         *
         * @returns the number of type parameters of the class, if known, or `null` if the declaration
         * is not a class or has an unknown number of type parameters.
         */
        Esm2015ReflectionHost.prototype.getGenericArityOfClass = function (clazz) {
            if (ts.isClassDeclaration(clazz) && clazz.name) {
                var sourcePath = clazz.getSourceFile();
                var dtsPath = this.dtsMapper.getDtsFileNameFor(sourcePath.fileName);
                var dtsContents = fs_1.readFileSync(dtsPath, 'utf8');
                var dtsFile = ts.createSourceFile(dtsPath, dtsContents, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
                for (var i = dtsFile.statements.length - 1; i >= 0; i--) {
                    var stmt = dtsFile.statements[i];
                    if (ts.isClassDeclaration(stmt) && stmt.name !== undefined &&
                        stmt.name.text === clazz.name.text) {
                        return stmt.typeParameters ? stmt.typeParameters.length : 0;
                    }
                }
            }
            return null;
        };
        return Esm2015ReflectionHost;
    }(fesm2015_host_1.Fesm2015ReflectionHost));
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCx5QkFBZ0M7SUFDaEMsK0JBQWlDO0lBR2pDLHVGQUF1RDtJQUV2RDtRQUEyQyxpREFBc0I7UUFDL0QsK0JBQVksT0FBdUIsRUFBWSxTQUFvQjtZQUFuRSxZQUF1RSxrQkFBTSxPQUFPLENBQUMsU0FBRztZQUF6QyxlQUFTLEdBQVQsU0FBUyxDQUFXOztRQUFvQixDQUFDO1FBRXhGOzs7OztXQUtHO1FBQ0gsc0RBQXNCLEdBQXRCLFVBQXVCLEtBQXFCO1lBQzFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQzlDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekMsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RFLElBQU0sV0FBVyxHQUFHLGlCQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNsRCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQy9CLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRTNFLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ3ZELElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUzt3QkFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ3RDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDN0Q7aUJBQ0Y7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQTNCRCxDQUEyQyxzQ0FBc0IsR0EyQmhFO0lBM0JZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0R0c01hcHBlcn0gZnJvbSAnLi9kdHNfbWFwcGVyJztcbmltcG9ydCB7RmVzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9mZXNtMjAxNV9ob3N0JztcblxuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEZlc20yMDE1UmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3RvcihjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJvdGVjdGVkIGR0c01hcHBlcjogRHRzTWFwcGVyKSB7IHN1cGVyKGNoZWNrZXIpOyB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbnVtYmVyIG9mIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZ2l2ZW4gY2xhc3MuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcywgaWYga25vd24sIG9yIGBudWxsYCBpZiB0aGUgZGVjbGFyYXRpb25cbiAgICogaXMgbm90IGEgY2xhc3Mgb3IgaGFzIGFuIHVua25vd24gbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycy5cbiAgICovXG4gIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopICYmIGNsYXp6Lm5hbWUpIHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBjb25zdCBkdHNQYXRoID0gdGhpcy5kdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlUGF0aC5maWxlTmFtZSk7XG4gICAgICBjb25zdCBkdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhkdHNQYXRoLCAndXRmOCcpO1xuICAgICAgY29uc3QgZHRzRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgICAgZHRzUGF0aCwgZHRzQ29udGVudHMsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLlRTKTtcblxuICAgICAgZm9yIChsZXQgaSA9IGR0c0ZpbGUuc3RhdGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBjb25zdCBzdG10ID0gZHRzRmlsZS5zdGF0ZW1lbnRzW2ldO1xuICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpICYmIHN0bXQubmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICBzdG10Lm5hbWUudGV4dCA9PT0gY2xhenoubmFtZS50ZXh0KSB7XG4gICAgICAgICAgcmV0dXJuIHN0bXQudHlwZVBhcmFtZXRlcnMgPyBzdG10LnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==