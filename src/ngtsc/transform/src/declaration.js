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
        function DtsFileTransformer() {
            this.ivyFields = new Map();
            this.imports = new translator_1.ImportManager();
        }
        /**
         * Track that a static field was added to the code for a class.
         */
        DtsFileTransformer.prototype.recordStaticField = function (name, decl) {
            this.ivyFields.set(name, decl);
        };
        /**
         * Process the .d.ts text for a file and add any declarations which were recorded.
         */
        DtsFileTransformer.prototype.transform = function (dts) {
            var dtsFile = ts.createSourceFile('out.d.ts', dts, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
            for (var i = dtsFile.statements.length - 1; i >= 0; i--) {
                var stmt = dtsFile.statements[i];
                if (ts.isClassDeclaration(stmt) && stmt.name !== undefined &&
                    this.ivyFields.has(stmt.name.text)) {
                    var desc = this.ivyFields.get(stmt.name.text);
                    var before = dts.substring(0, stmt.end - 1);
                    var after = dts.substring(stmt.end - 1);
                    var type = translator_1.translateType(desc.type, this.imports);
                    dts = before + ("    static " + desc.field + ": " + type + ";\n") + after;
                }
            }
            var imports = this.imports.getAllImports();
            if (imports.length !== 0) {
                dts = imports.map(function (i) { return "import * as " + i.as + " from '" + i.name + "';\n"; }).join() + dts;
            }
            return dts;
        };
        return DtsFileTransformer;
    }());
    exports.DtsFileTransformer = DtsFileTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsdUZBQTBEO0lBSTFEOztPQUVHO0lBQ0g7UUFBQTtZQUNVLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztZQUN6RCxZQUFPLEdBQUcsSUFBSSwwQkFBYSxFQUFFLENBQUM7UUFtQ3hDLENBQUM7UUFqQ0M7O1dBRUc7UUFDSCw4Q0FBaUIsR0FBakIsVUFBa0IsSUFBWSxFQUFFLElBQStCO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxzQ0FBUyxHQUFULFVBQVUsR0FBVztZQUNuQixJQUFNLE9BQU8sR0FDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUUxRixLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN2RCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVM7b0JBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3RDLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUM7b0JBQ2xELElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDMUMsSUFBTSxJQUFJLEdBQUcsMEJBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDcEQsR0FBRyxHQUFHLE1BQU0sSUFBRyxnQkFBYyxJQUFJLENBQUMsS0FBSyxVQUFLLElBQUksUUFBSyxDQUFBLEdBQUcsS0FBSyxDQUFDO2lCQUMvRDthQUNGO1lBRUQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM3QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLGlCQUFlLENBQUMsQ0FBQyxFQUFFLGVBQVUsQ0FBQyxDQUFDLElBQUksU0FBTSxFQUF6QyxDQUF5QyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDO2FBQ2hGO1lBRUQsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBckNELElBcUNDO0lBckNZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWRkU3RhdGljRmllbGRJbnN0cnVjdGlvbn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVUeXBlfSBmcm9tICcuL3RyYW5zbGF0b3InO1xuXG5cblxuLyoqXG4gKiBQcm9jZXNzZXMgLmQudHMgZmlsZSB0ZXh0IGFuZCBhZGRzIHN0YXRpYyBmaWVsZCBkZWNsYXJhdGlvbnMsIHdpdGggdHlwZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNGaWxlVHJhbnNmb3JtZXIge1xuICBwcml2YXRlIGl2eUZpZWxkcyA9IG5ldyBNYXA8c3RyaW5nLCBBZGRTdGF0aWNGaWVsZEluc3RydWN0aW9uPigpO1xuICBwcml2YXRlIGltcG9ydHMgPSBuZXcgSW1wb3J0TWFuYWdlcigpO1xuXG4gIC8qKlxuICAgKiBUcmFjayB0aGF0IGEgc3RhdGljIGZpZWxkIHdhcyBhZGRlZCB0byB0aGUgY29kZSBmb3IgYSBjbGFzcy5cbiAgICovXG4gIHJlY29yZFN0YXRpY0ZpZWxkKG5hbWU6IHN0cmluZywgZGVjbDogQWRkU3RhdGljRmllbGRJbnN0cnVjdGlvbik6IHZvaWQge1xuICAgIHRoaXMuaXZ5RmllbGRzLnNldChuYW1lLCBkZWNsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSAuZC50cyB0ZXh0IGZvciBhIGZpbGUgYW5kIGFkZCBhbnkgZGVjbGFyYXRpb25zIHdoaWNoIHdlcmUgcmVjb3JkZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oZHRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGR0c0ZpbGUgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKCdvdXQuZC50cycsIGR0cywgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuVFMpO1xuXG4gICAgZm9yIChsZXQgaSA9IGR0c0ZpbGUuc3RhdGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3Qgc3RtdCA9IGR0c0ZpbGUuc3RhdGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkgJiYgc3RtdC5uYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICB0aGlzLml2eUZpZWxkcy5oYXMoc3RtdC5uYW1lLnRleHQpKSB7XG4gICAgICAgIGNvbnN0IGRlc2MgPSB0aGlzLml2eUZpZWxkcy5nZXQoc3RtdC5uYW1lLnRleHQpICE7XG4gICAgICAgIGNvbnN0IGJlZm9yZSA9IGR0cy5zdWJzdHJpbmcoMCwgc3RtdC5lbmQgLSAxKTtcbiAgICAgICAgY29uc3QgYWZ0ZXIgPSBkdHMuc3Vic3RyaW5nKHN0bXQuZW5kIC0gMSk7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlc2MudHlwZSwgdGhpcy5pbXBvcnRzKTtcbiAgICAgICAgZHRzID0gYmVmb3JlICsgYCAgICBzdGF0aWMgJHtkZXNjLmZpZWxkfTogJHt0eXBlfTtcXG5gICsgYWZ0ZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0cyA9IHRoaXMuaW1wb3J0cy5nZXRBbGxJbXBvcnRzKCk7XG4gICAgaWYgKGltcG9ydHMubGVuZ3RoICE9PSAwKSB7XG4gICAgICBkdHMgPSBpbXBvcnRzLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kuYXN9IGZyb20gJyR7aS5uYW1lfSc7XFxuYCkuam9pbigpICsgZHRzO1xuICAgIH1cblxuICAgIHJldHVybiBkdHM7XG4gIH1cbn0iXX0=