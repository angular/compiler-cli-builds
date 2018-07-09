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
        define("@angular/compiler-cli/src/transformers/r3_metadata_transform", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/metadata/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var index_1 = require("@angular/compiler-cli/src/metadata/index");
    var PartialModuleMetadataTransformer = /** @class */ (function () {
        function PartialModuleMetadataTransformer(modules) {
            this.moduleMap = new Map(modules.map(function (m) { return [m.fileName, m]; }));
        }
        PartialModuleMetadataTransformer.prototype.start = function (sourceFile) {
            var partialModule = this.moduleMap.get(sourceFile.fileName);
            if (partialModule) {
                var classMap_1 = new Map(partialModule.statements.filter(isClassStmt).map(function (s) { return [s.name, s]; }));
                if (classMap_1.size > 0) {
                    return function (value, node) {
                        // For class metadata that is going to be transformed to have a static method ensure the
                        // metadata contains a static declaration the new static method.
                        if (index_1.isClassMetadata(value) && node.kind === ts.SyntaxKind.ClassDeclaration) {
                            var classDeclaration = node;
                            if (classDeclaration.name) {
                                var partialClass = classMap_1.get(classDeclaration.name.text);
                                if (partialClass) {
                                    try {
                                        for (var _a = tslib_1.__values(partialClass.fields), _b = _a.next(); !_b.done; _b = _a.next()) {
                                            var field = _b.value;
                                            if (field.name && field.modifiers &&
                                                field.modifiers.some(function (modifier) { return modifier === compiler_1.StmtModifier.Static; })) {
                                                value.statics = tslib_1.__assign({}, (value.statics || {}), (_c = {}, _c[field.name] = {}, _c));
                                            }
                                        }
                                    }
                                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                    finally {
                                        try {
                                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                    }
                                }
                            }
                        }
                        return value;
                        var e_1, _d, _c;
                    };
                }
            }
        };
        return PartialModuleMetadataTransformer;
    }());
    exports.PartialModuleMetadataTransformer = PartialModuleMetadataTransformer;
    function isClassStmt(v) {
        return v instanceof compiler_1.ClassStmt;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicjNfbWV0YWRhdGFfdHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvcjNfbWV0YWRhdGFfdHJhbnNmb3JtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFvRjtJQUNwRiwrQkFBaUM7SUFFakMsa0VBQW9HO0lBSXBHO1FBR0UsMENBQVksT0FBd0I7WUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUEwQixVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxnREFBSyxHQUFMLFVBQU0sVUFBeUI7WUFDN0IsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlELElBQUksYUFBYSxFQUFFO2dCQUNqQixJQUFNLFVBQVEsR0FBRyxJQUFJLEdBQUcsQ0FDcEIsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFzQixVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBWCxDQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLFVBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO29CQUNyQixPQUFPLFVBQUMsS0FBb0IsRUFBRSxJQUFhO3dCQUN6Qyx3RkFBd0Y7d0JBQ3hGLGdFQUFnRTt3QkFDaEUsSUFBSSx1QkFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTs0QkFDMUUsSUFBTSxnQkFBZ0IsR0FBRyxJQUEyQixDQUFDOzRCQUNyRCxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRTtnQ0FDekIsSUFBTSxZQUFZLEdBQUcsVUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQzlELElBQUksWUFBWSxFQUFFOzt3Q0FDaEIsS0FBb0IsSUFBQSxLQUFBLGlCQUFBLFlBQVksQ0FBQyxNQUFNLENBQUEsZ0JBQUE7NENBQWxDLElBQU0sS0FBSyxXQUFBOzRDQUNkLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsU0FBUztnREFDN0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxRQUFRLElBQUksT0FBQSxRQUFRLEtBQUssdUJBQVksQ0FBQyxNQUFNLEVBQWhDLENBQWdDLENBQUMsRUFBRTtnREFDdEUsS0FBSyxDQUFDLE9BQU8sd0JBQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxlQUFHLEtBQUssQ0FBQyxJQUFJLElBQUcsRUFBRSxNQUFDLENBQUM7NkNBQzlEO3lDQUNGOzs7Ozs7Ozs7aUNBQ0Y7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsT0FBTyxLQUFLLENBQUM7O29CQUNmLENBQUMsQ0FBQztpQkFDSDthQUNGO1FBQ0gsQ0FBQztRQUNILHVDQUFDO0lBQUQsQ0FBQyxBQW5DRCxJQW1DQztJQW5DWSw0RUFBZ0M7SUFxQzdDLHFCQUFxQixDQUFZO1FBQy9CLE9BQU8sQ0FBQyxZQUFZLG9CQUFTLENBQUM7SUFDaEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDbGFzc1N0bXQsIFBhcnRpYWxNb2R1bGUsIFN0YXRlbWVudCwgU3RtdE1vZGlmaWVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtNZXRhZGF0YUNvbGxlY3RvciwgTWV0YWRhdGFWYWx1ZSwgTW9kdWxlTWV0YWRhdGEsIGlzQ2xhc3NNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuXG5pbXBvcnQge01ldGFkYXRhVHJhbnNmb3JtZXIsIFZhbHVlVHJhbnNmb3JtfSBmcm9tICcuL21ldGFkYXRhX2NhY2hlJztcblxuZXhwb3J0IGNsYXNzIFBhcnRpYWxNb2R1bGVNZXRhZGF0YVRyYW5zZm9ybWVyIGltcGxlbWVudHMgTWV0YWRhdGFUcmFuc2Zvcm1lciB7XG4gIHByaXZhdGUgbW9kdWxlTWFwOiBNYXA8c3RyaW5nLCBQYXJ0aWFsTW9kdWxlPjtcblxuICBjb25zdHJ1Y3Rvcihtb2R1bGVzOiBQYXJ0aWFsTW9kdWxlW10pIHtcbiAgICB0aGlzLm1vZHVsZU1hcCA9IG5ldyBNYXAobW9kdWxlcy5tYXA8W3N0cmluZywgUGFydGlhbE1vZHVsZV0+KG0gPT4gW20uZmlsZU5hbWUsIG1dKSk7XG4gIH1cblxuICBzdGFydChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVmFsdWVUcmFuc2Zvcm18dW5kZWZpbmVkIHtcbiAgICBjb25zdCBwYXJ0aWFsTW9kdWxlID0gdGhpcy5tb2R1bGVNYXAuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIGlmIChwYXJ0aWFsTW9kdWxlKSB7XG4gICAgICBjb25zdCBjbGFzc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBDbGFzc1N0bXQ+KFxuICAgICAgICAgIHBhcnRpYWxNb2R1bGUuc3RhdGVtZW50cy5maWx0ZXIoaXNDbGFzc1N0bXQpLm1hcDxbc3RyaW5nLCBDbGFzc1N0bXRdPihzID0+IFtzLm5hbWUsIHNdKSk7XG4gICAgICBpZiAoY2xhc3NNYXAuc2l6ZSA+IDApIHtcbiAgICAgICAgcmV0dXJuICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSk6IE1ldGFkYXRhVmFsdWUgPT4ge1xuICAgICAgICAgIC8vIEZvciBjbGFzcyBtZXRhZGF0YSB0aGF0IGlzIGdvaW5nIHRvIGJlIHRyYW5zZm9ybWVkIHRvIGhhdmUgYSBzdGF0aWMgbWV0aG9kIGVuc3VyZSB0aGVcbiAgICAgICAgICAvLyBtZXRhZGF0YSBjb250YWlucyBhIHN0YXRpYyBkZWNsYXJhdGlvbiB0aGUgbmV3IHN0YXRpYyBtZXRob2QuXG4gICAgICAgICAgaWYgKGlzQ2xhc3NNZXRhZGF0YSh2YWx1ZSkgJiYgbm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb24gPSBub2RlIGFzIHRzLkNsYXNzRGVjbGFyYXRpb247XG4gICAgICAgICAgICBpZiAoY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcnRpYWxDbGFzcyA9IGNsYXNzTWFwLmdldChjbGFzc0RlY2xhcmF0aW9uLm5hbWUudGV4dCk7XG4gICAgICAgICAgICAgIGlmIChwYXJ0aWFsQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHBhcnRpYWxDbGFzcy5maWVsZHMpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChmaWVsZC5uYW1lICYmIGZpZWxkLm1vZGlmaWVycyAmJlxuICAgICAgICAgICAgICAgICAgICAgIGZpZWxkLm1vZGlmaWVycy5zb21lKG1vZGlmaWVyID0+IG1vZGlmaWVyID09PSBTdG10TW9kaWZpZXIuU3RhdGljKSkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5zdGF0aWNzID0gey4uLih2YWx1ZS5zdGF0aWNzIHx8IHt9KSwgW2ZpZWxkLm5hbWVdOiB7fX07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNDbGFzc1N0bXQodjogU3RhdGVtZW50KTogdiBpcyBDbGFzc1N0bXQge1xuICByZXR1cm4gdiBpbnN0YW5jZW9mIENsYXNzU3RtdDtcbn1cbiJdfQ==