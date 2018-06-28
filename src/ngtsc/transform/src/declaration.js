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
        define("@angular/compiler-cli/src/ngtsc/transform/src/declaration", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    /**
     * Processes .d.ts file text and adds static field declarations, with types.
     */
    var DtsFileTransformer = /** @class */ (function () {
        function DtsFileTransformer(coreImportsFrom) {
            this.coreImportsFrom = coreImportsFrom;
            this.ivyFields = new Map();
            this.imports = new translator_1.ImportManager(coreImportsFrom !== null);
        }
        /**
         * Track that a static field was added to the code for a class.
         */
        DtsFileTransformer.prototype.recordStaticField = function (name, decls) { this.ivyFields.set(name, decls); };
        /**
         * Process the .d.ts text for a file and add any declarations which were recorded.
         */
        DtsFileTransformer.prototype.transform = function (dts, tsPath) {
            var _this = this;
            var dtsFile = ts.createSourceFile('out.d.ts', dts, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
            for (var i = dtsFile.statements.length - 1; i >= 0; i--) {
                var stmt = dtsFile.statements[i];
                if (ts.isClassDeclaration(stmt) && stmt.name !== undefined &&
                    this.ivyFields.has(stmt.name.text)) {
                    var decls = this.ivyFields.get(stmt.name.text);
                    var before = dts.substring(0, stmt.end - 1);
                    var after = dts.substring(stmt.end - 1);
                    dts = before +
                        decls
                            .map(function (decl) {
                            var type = translator_1.translateType(decl.type, _this.imports);
                            return "    static " + decl.name + ": " + type + ";\n";
                        })
                            .join('') +
                        after;
                }
            }
            var imports = this.imports.getAllImports(tsPath, this.coreImportsFrom);
            if (imports.length !== 0) {
                dts = imports.map(function (i) { return "import * as " + i.as + " from '" + i.name + "';\n"; }).join() + dts;
            }
            return dts;
        };
        return DtsFileTransformer;
    }());
    exports.DtsFileTransformer = DtsFileTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFLakMsdUZBQTBEO0lBSTFEOztPQUVHO0lBQ0g7UUFJRSw0QkFBb0IsZUFBbUM7WUFBbkMsb0JBQWUsR0FBZixlQUFlLENBQW9CO1lBSC9DLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUlyRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksMEJBQWEsQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVEOztXQUVHO1FBQ0gsOENBQWlCLEdBQWpCLFVBQWtCLElBQVksRUFBRSxLQUFzQixJQUFVLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEc7O1dBRUc7UUFDSCxzQ0FBUyxHQUFULFVBQVUsR0FBVyxFQUFFLE1BQWM7WUFBckMsaUJBNkJDO1lBNUJDLElBQU0sT0FBTyxHQUNULEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRTFGLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3ZELElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUztvQkFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDdEMsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUcsQ0FBQztvQkFDbkQsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDOUMsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUUxQyxHQUFHLEdBQUcsTUFBTTt3QkFDUixLQUFLOzZCQUNBLEdBQUcsQ0FBQyxVQUFBLElBQUk7NEJBQ1AsSUFBTSxJQUFJLEdBQUcsMEJBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFDcEQsT0FBTyxnQkFBYyxJQUFJLENBQUMsSUFBSSxVQUFLLElBQUksUUFBSyxDQUFDO3dCQUMvQyxDQUFDLENBQUM7NkJBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDYixLQUFLLENBQUM7aUJBQ1g7YUFDRjtZQUVELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDekUsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDeEIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxpQkFBZSxDQUFDLENBQUMsRUFBRSxlQUFVLENBQUMsQ0FBQyxJQUFJLFNBQU0sRUFBekMsQ0FBeUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQzthQUNoRjtZQUVELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTlDRCxJQThDQztJQTlDWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi90cmFuc2xhdG9yJztcblxuXG5cbi8qKlxuICogUHJvY2Vzc2VzIC5kLnRzIGZpbGUgdGV4dCBhbmQgYWRkcyBzdGF0aWMgZmllbGQgZGVjbGFyYXRpb25zLCB3aXRoIHR5cGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHRzRmlsZVRyYW5zZm9ybWVyIHtcbiAgcHJpdmF0ZSBpdnlGaWVsZHMgPSBuZXcgTWFwPHN0cmluZywgQ29tcGlsZVJlc3VsdFtdPigpO1xuICBwcml2YXRlIGltcG9ydHM6IEltcG9ydE1hbmFnZXI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbCkge1xuICAgIHRoaXMuaW1wb3J0cyA9IG5ldyBJbXBvcnRNYW5hZ2VyKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2sgdGhhdCBhIHN0YXRpYyBmaWVsZCB3YXMgYWRkZWQgdG8gdGhlIGNvZGUgZm9yIGEgY2xhc3MuXG4gICAqL1xuICByZWNvcmRTdGF0aWNGaWVsZChuYW1lOiBzdHJpbmcsIGRlY2xzOiBDb21waWxlUmVzdWx0W10pOiB2b2lkIHsgdGhpcy5pdnlGaWVsZHMuc2V0KG5hbWUsIGRlY2xzKTsgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSAuZC50cyB0ZXh0IGZvciBhIGZpbGUgYW5kIGFkZCBhbnkgZGVjbGFyYXRpb25zIHdoaWNoIHdlcmUgcmVjb3JkZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oZHRzOiBzdHJpbmcsIHRzUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBkdHNGaWxlID1cbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZSgnb3V0LmQudHMnLCBkdHMsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLlRTKTtcblxuICAgIGZvciAobGV0IGkgPSBkdHNGaWxlLnN0YXRlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IHN0bXQgPSBkdHNGaWxlLnN0YXRlbWVudHNbaV07XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpICYmIHN0bXQubmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgdGhpcy5pdnlGaWVsZHMuaGFzKHN0bXQubmFtZS50ZXh0KSkge1xuICAgICAgICBjb25zdCBkZWNscyA9IHRoaXMuaXZ5RmllbGRzLmdldChzdG10Lm5hbWUudGV4dCkgITtcbiAgICAgICAgY29uc3QgYmVmb3JlID0gZHRzLnN1YnN0cmluZygwLCBzdG10LmVuZCAtIDEpO1xuICAgICAgICBjb25zdCBhZnRlciA9IGR0cy5zdWJzdHJpbmcoc3RtdC5lbmQgLSAxKTtcblxuICAgICAgICBkdHMgPSBiZWZvcmUgK1xuICAgICAgICAgICAgZGVjbHNcbiAgICAgICAgICAgICAgICAubWFwKGRlY2wgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbC50eXBlLCB0aGlzLmltcG9ydHMpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGAgICAgc3RhdGljICR7ZGVjbC5uYW1lfTogJHt0eXBlfTtcXG5gO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmpvaW4oJycpICtcbiAgICAgICAgICAgIGFmdGVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydHMgPSB0aGlzLmltcG9ydHMuZ2V0QWxsSW1wb3J0cyh0c1BhdGgsIHRoaXMuY29yZUltcG9ydHNGcm9tKTtcbiAgICBpZiAoaW1wb3J0cy5sZW5ndGggIT09IDApIHtcbiAgICAgIGR0cyA9IGltcG9ydHMubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKS5qb2luKCkgKyBkdHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGR0cztcbiAgfVxufSJdfQ==