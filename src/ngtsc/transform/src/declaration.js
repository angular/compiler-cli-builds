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
        define("@angular/compiler-cli/src/ngtsc/transform/src/declaration", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    /**
     * Processes .d.ts file text and adds static field declarations, with types.
     */
    var DtsFileTransformer = /** @class */ (function () {
        function DtsFileTransformer(importRewriter, importPrefix) {
            this.importRewriter = importRewriter;
            this.ivyFields = new Map();
            this.imports = new translator_1.ImportManager(importRewriter, importPrefix);
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
            var imports = this.imports.getAllImports(tsPath);
            if (imports.length !== 0) {
                dts = imports.map(function (i) { return "import * as " + i.as + " from '" + i.name + "';\n"; }).join('') + dts;
            }
            return dts;
        };
        return DtsFileTransformer;
    }());
    exports.DtsFileTransformer = DtsFileTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMseUVBQThEO0lBTTlEOztPQUVHO0lBQ0g7UUFJRSw0QkFBb0IsY0FBOEIsRUFBRSxZQUFxQjtZQUFyRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7WUFIMUMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1lBSXJELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSwwQkFBYSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQ7O1dBRUc7UUFDSCw4Q0FBaUIsR0FBakIsVUFBa0IsSUFBWSxFQUFFLEtBQXNCLElBQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsRzs7V0FFRztRQUNILHNDQUFTLEdBQVQsVUFBVSxHQUFXLEVBQUUsTUFBYztZQUFyQyxpQkE2QkM7WUE1QkMsSUFBTSxPQUFPLEdBQ1QsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFMUYsS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDdkQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTO29CQUN0RCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN0QyxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRyxDQUFDO29CQUNuRCxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBRTFDLEdBQUcsR0FBRyxNQUFNO3dCQUNSLEtBQUs7NkJBQ0EsR0FBRyxDQUFDLFVBQUEsSUFBSTs0QkFDUCxJQUFNLElBQUksR0FBRywwQkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUNwRCxPQUFPLGdCQUFjLElBQUksQ0FBQyxJQUFJLFVBQUssSUFBSSxRQUFLLENBQUM7d0JBQy9DLENBQUMsQ0FBQzs2QkFDRCxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUNiLEtBQUssQ0FBQztpQkFDWDthQUNGO1lBRUQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDeEIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxpQkFBZSxDQUFDLENBQUMsRUFBRSxlQUFVLENBQUMsQ0FBQyxJQUFJLFNBQU0sRUFBekMsQ0FBeUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUM7YUFDbEY7WUFFRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUE5Q0QsSUE4Q0M7SUE5Q1ksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcblxuXG5cbi8qKlxuICogUHJvY2Vzc2VzIC5kLnRzIGZpbGUgdGV4dCBhbmQgYWRkcyBzdGF0aWMgZmllbGQgZGVjbGFyYXRpb25zLCB3aXRoIHR5cGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHRzRmlsZVRyYW5zZm9ybWVyIHtcbiAgcHJpdmF0ZSBpdnlGaWVsZHMgPSBuZXcgTWFwPHN0cmluZywgQ29tcGlsZVJlc3VsdFtdPigpO1xuICBwcml2YXRlIGltcG9ydHM6IEltcG9ydE1hbmFnZXI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIsIGltcG9ydFByZWZpeD86IHN0cmluZykge1xuICAgIHRoaXMuaW1wb3J0cyA9IG5ldyBJbXBvcnRNYW5hZ2VyKGltcG9ydFJld3JpdGVyLCBpbXBvcnRQcmVmaXgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNrIHRoYXQgYSBzdGF0aWMgZmllbGQgd2FzIGFkZGVkIHRvIHRoZSBjb2RlIGZvciBhIGNsYXNzLlxuICAgKi9cbiAgcmVjb3JkU3RhdGljRmllbGQobmFtZTogc3RyaW5nLCBkZWNsczogQ29tcGlsZVJlc3VsdFtdKTogdm9pZCB7IHRoaXMuaXZ5RmllbGRzLnNldChuYW1lLCBkZWNscyk7IH1cblxuICAvKipcbiAgICogUHJvY2VzcyB0aGUgLmQudHMgdGV4dCBmb3IgYSBmaWxlIGFuZCBhZGQgYW55IGRlY2xhcmF0aW9ucyB3aGljaCB3ZXJlIHJlY29yZGVkLlxuICAgKi9cbiAgdHJhbnNmb3JtKGR0czogc3RyaW5nLCB0c1BhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgZHRzRmlsZSA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ291dC5kLnRzJywgZHRzLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5UUyk7XG5cbiAgICBmb3IgKGxldCBpID0gZHRzRmlsZS5zdGF0ZW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBjb25zdCBzdG10ID0gZHRzRmlsZS5zdGF0ZW1lbnRzW2ldO1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdG10KSAmJiBzdG10Lm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIHRoaXMuaXZ5RmllbGRzLmhhcyhzdG10Lm5hbWUudGV4dCkpIHtcbiAgICAgICAgY29uc3QgZGVjbHMgPSB0aGlzLml2eUZpZWxkcy5nZXQoc3RtdC5uYW1lLnRleHQpICE7XG4gICAgICAgIGNvbnN0IGJlZm9yZSA9IGR0cy5zdWJzdHJpbmcoMCwgc3RtdC5lbmQgLSAxKTtcbiAgICAgICAgY29uc3QgYWZ0ZXIgPSBkdHMuc3Vic3RyaW5nKHN0bXQuZW5kIC0gMSk7XG5cbiAgICAgICAgZHRzID0gYmVmb3JlICtcbiAgICAgICAgICAgIGRlY2xzXG4gICAgICAgICAgICAgICAgLm1hcChkZWNsID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlY2wudHlwZSwgdGhpcy5pbXBvcnRzKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBgICAgIHN0YXRpYyAke2RlY2wubmFtZX06ICR7dHlwZX07XFxuYDtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5qb2luKCcnKSArXG4gICAgICAgICAgICBhZnRlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRzID0gdGhpcy5pbXBvcnRzLmdldEFsbEltcG9ydHModHNQYXRoKTtcbiAgICBpZiAoaW1wb3J0cy5sZW5ndGggIT09IDApIHtcbiAgICAgIGR0cyA9IGltcG9ydHMubWFwKGkgPT4gYGltcG9ydCAqIGFzICR7aS5hc30gZnJvbSAnJHtpLm5hbWV9JztcXG5gKS5qb2luKCcnKSArIGR0cztcbiAgICB9XG5cbiAgICByZXR1cm4gZHRzO1xuICB9XG59XG4iXX0=