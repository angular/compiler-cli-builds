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
        DtsFileTransformer.prototype.recordStaticField = function (name, decls) { this.ivyFields.set(name, decls); };
        /**
         * Process the .d.ts text for a file and add any declarations which were recorded.
         */
        DtsFileTransformer.prototype.transform = function (dts) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjbGFyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvZGVjbGFyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsdUZBQTBEO0lBSTFEOztPQUVHO0lBQ0g7UUFBQTtZQUNVLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztZQUMvQyxZQUFPLEdBQUcsSUFBSSwwQkFBYSxFQUFFLENBQUM7UUF3Q3hDLENBQUM7UUF0Q0M7O1dBRUc7UUFDSCw4Q0FBaUIsR0FBakIsVUFBa0IsSUFBWSxFQUFFLEtBQXNCLElBQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsRzs7V0FFRztRQUNILHNDQUFTLEdBQVQsVUFBVSxHQUFXO1lBQXJCLGlCQTZCQztZQTVCQyxJQUFNLE9BQU8sR0FDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUUxRixLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN2RCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVM7b0JBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3RDLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUM7b0JBQ25ELElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFFMUMsR0FBRyxHQUFHLE1BQU07d0JBQ1IsS0FBSzs2QkFDQSxHQUFHLENBQUMsVUFBQSxJQUFJOzRCQUNQLElBQU0sSUFBSSxHQUFHLDBCQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7NEJBQ3BELE9BQU8sZ0JBQWMsSUFBSSxDQUFDLElBQUksVUFBSyxJQUFJLFFBQUssQ0FBQzt3QkFDL0MsQ0FBQyxDQUFDOzZCQUNELElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ2IsS0FBSyxDQUFDO2lCQUNYO2FBQ0Y7WUFFRCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzdDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3hCLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsaUJBQWUsQ0FBQyxDQUFDLEVBQUUsZUFBVSxDQUFDLENBQUMsSUFBSSxTQUFNLEVBQXpDLENBQXlDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUM7YUFDaEY7WUFFRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUExQ0QsSUEwQ0M7SUExQ1ksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4vdHJhbnNsYXRvcic7XG5cblxuXG4vKipcbiAqIFByb2Nlc3NlcyAuZC50cyBmaWxlIHRleHQgYW5kIGFkZHMgc3RhdGljIGZpZWxkIGRlY2xhcmF0aW9ucywgd2l0aCB0eXBlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gIHByaXZhdGUgaXZ5RmllbGRzID0gbmV3IE1hcDxzdHJpbmcsIENvbXBpbGVSZXN1bHRbXT4oKTtcbiAgcHJpdmF0ZSBpbXBvcnRzID0gbmV3IEltcG9ydE1hbmFnZXIoKTtcblxuICAvKipcbiAgICogVHJhY2sgdGhhdCBhIHN0YXRpYyBmaWVsZCB3YXMgYWRkZWQgdG8gdGhlIGNvZGUgZm9yIGEgY2xhc3MuXG4gICAqL1xuICByZWNvcmRTdGF0aWNGaWVsZChuYW1lOiBzdHJpbmcsIGRlY2xzOiBDb21waWxlUmVzdWx0W10pOiB2b2lkIHsgdGhpcy5pdnlGaWVsZHMuc2V0KG5hbWUsIGRlY2xzKTsgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSAuZC50cyB0ZXh0IGZvciBhIGZpbGUgYW5kIGFkZCBhbnkgZGVjbGFyYXRpb25zIHdoaWNoIHdlcmUgcmVjb3JkZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oZHRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGR0c0ZpbGUgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKCdvdXQuZC50cycsIGR0cywgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuVFMpO1xuXG4gICAgZm9yIChsZXQgaSA9IGR0c0ZpbGUuc3RhdGVtZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3Qgc3RtdCA9IGR0c0ZpbGUuc3RhdGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkgJiYgc3RtdC5uYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICB0aGlzLml2eUZpZWxkcy5oYXMoc3RtdC5uYW1lLnRleHQpKSB7XG4gICAgICAgIGNvbnN0IGRlY2xzID0gdGhpcy5pdnlGaWVsZHMuZ2V0KHN0bXQubmFtZS50ZXh0KSAhO1xuICAgICAgICBjb25zdCBiZWZvcmUgPSBkdHMuc3Vic3RyaW5nKDAsIHN0bXQuZW5kIC0gMSk7XG4gICAgICAgIGNvbnN0IGFmdGVyID0gZHRzLnN1YnN0cmluZyhzdG10LmVuZCAtIDEpO1xuXG4gICAgICAgIGR0cyA9IGJlZm9yZSArXG4gICAgICAgICAgICBkZWNsc1xuICAgICAgICAgICAgICAgIC5tYXAoZGVjbCA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gdHJhbnNsYXRlVHlwZShkZWNsLnR5cGUsIHRoaXMuaW1wb3J0cyk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gYCAgICBzdGF0aWMgJHtkZWNsLm5hbWV9OiAke3R5cGV9O1xcbmA7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuam9pbignJykgK1xuICAgICAgICAgICAgYWZ0ZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0cyA9IHRoaXMuaW1wb3J0cy5nZXRBbGxJbXBvcnRzKCk7XG4gICAgaWYgKGltcG9ydHMubGVuZ3RoICE9PSAwKSB7XG4gICAgICBkdHMgPSBpbXBvcnRzLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kuYXN9IGZyb20gJyR7aS5uYW1lfSc7XFxuYCkuam9pbigpICsgZHRzO1xuICAgIH1cblxuICAgIHJldHVybiBkdHM7XG4gIH1cbn0iXX0=