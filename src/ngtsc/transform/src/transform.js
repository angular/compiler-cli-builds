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
        define("@angular/compiler-cli/src/ngtsc/transform/src/transform", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/visitor", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var visitor_1 = require("@angular/compiler-cli/src/ngtsc/util/src/visitor");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    function ivyTransformFactory(compilation) {
        return function (context) {
            return function (file) {
                return transformIvySourceFile(compilation, context, file);
            };
        };
    }
    exports.ivyTransformFactory = ivyTransformFactory;
    var IvyVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(IvyVisitor, _super);
        function IvyVisitor(compilation, importManager) {
            var _this = _super.call(this) || this;
            _this.compilation = compilation;
            _this.importManager = importManager;
            return _this;
        }
        IvyVisitor.prototype.visitClassDeclaration = function (node) {
            var _this = this;
            // Determine if this class has an Ivy field that needs to be added, and compile the field
            // to an expression if so.
            var res = this.compilation.compileIvyFieldFor(node);
            if (res !== undefined) {
                // There is at least one field to add.
                var statements_1 = [];
                var members_1 = tslib_1.__spread(node.members);
                res.forEach(function (field) {
                    // Translate the initializer for the field into TS nodes.
                    var exprNode = translator_1.translateExpression(field.initializer, _this.importManager);
                    // Create a static property declaration for the new field.
                    var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], field.name, undefined, undefined, exprNode);
                    field.statements.map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager); })
                        .forEach(function (stmt) { return statements_1.push(stmt); });
                    members_1.push(property);
                });
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, this.compilation.ivyDecoratorFor(node).node), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], members_1);
                return { node: node, before: statements_1 };
            }
            return { node: node };
        };
        return IvyVisitor;
    }(visitor_1.Visitor));
    /**
     * A transformer which operates on ts.SourceFiles and applies changes from an `IvyCompilation`.
     */
    function transformIvySourceFile(compilation, context, file) {
        var importManager = new translator_1.ImportManager();
        // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
        var sf = visitor_1.visit(file, new IvyVisitor(compilation, importManager), context);
        // Generate the import statements to prepend.
        var imports = importManager.getAllImports().map(function (i) { return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(i.as))), ts.createLiteral(i.name)); });
        // Prepend imports if needed.
        if (imports.length > 0) {
            sf.statements = ts.createNodeArray(tslib_1.__spread(imports, sf.statements));
        }
        return sf;
    }
    function maybeFilterDecorator(decorators, toRemove) {
        if (decorators === undefined) {
            return undefined;
        }
        var filtered = decorators.filter(function (dec) { return ts.getOriginalNode(dec) !== toRemove; });
        if (filtered.length === 0) {
            return undefined;
        }
        return ts.createNodeArray(filtered);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsNEVBQTRFO0lBSTVFLHVGQUFvRjtJQUVwRiw2QkFBb0MsV0FBMkI7UUFFN0QsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLE9BQU8sVUFBQyxJQUFtQjtnQkFDekIsT0FBTyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFQRCxrREFPQztJQUVEO1FBQXlCLHNDQUFPO1FBQzlCLG9CQUFvQixXQUEyQixFQUFVLGFBQTRCO1lBQXJGLFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixpQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxtQkFBYSxHQUFiLGFBQWEsQ0FBZTs7UUFFckYsQ0FBQztRQUVELDBDQUFxQixHQUFyQixVQUFzQixJQUF5QjtZQUEvQyxpQkFxQ0M7WUFuQ0MseUZBQXlGO1lBQ3pGLDBCQUEwQjtZQUMxQixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXRELElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtnQkFDckIsc0NBQXNDO2dCQUN0QyxJQUFNLFlBQVUsR0FBbUIsRUFBRSxDQUFDO2dCQUN0QyxJQUFNLFNBQU8sb0JBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVsQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztvQkFDZix5REFBeUQ7b0JBQ3pELElBQU0sUUFBUSxHQUFHLGdDQUFtQixDQUFDLEtBQUss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QUFRLEVBQXBDLENBQW9DLENBQUMsQ0FBQztRQUNoRixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7V3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtWaXNpdExpc3RFbnRyeVJlc3VsdCwgVmlzaXRvciwgdmlzaXR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Zpc2l0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vY29tcGlsYXRpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4vdHJhbnNsYXRvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBpdnlUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbik6XG4gICAgdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5UcmFuc2Zvcm1lcjx0cy5Tb3VyY2VGaWxlPiA9PiB7XG4gICAgcmV0dXJuIChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShjb21waWxhdGlvbiwgY29udGV4dCwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuY2xhc3MgSXZ5VmlzaXRvciBleHRlbmRzIFZpc2l0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgcHJpdmF0ZSBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIFZpc2l0TGlzdEVudHJ5UmVzdWx0PHRzLlN0YXRlbWVudCwgdHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIC8vIERldGVybWluZSBpZiB0aGlzIGNsYXNzIGhhcyBhbiBJdnkgZmllbGQgdGhhdCBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIGNvbXBpbGUgdGhlIGZpZWxkXG4gICAgLy8gdG8gYW4gZXhwcmVzc2lvbiBpZiBzby5cbiAgICBjb25zdCByZXMgPSB0aGlzLmNvbXBpbGF0aW9uLmNvbXBpbGVJdnlGaWVsZEZvcihub2RlKTtcblxuICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlcmUgaXMgYXQgbGVhc3Qgb25lIGZpZWxkIHRvIGFkZC5cbiAgICAgIGNvbnN0IHN0YXRlbWVudHM6IHRzLlN0YXRlbWVudFtdID0gW107XG4gICAgICBjb25zdCBtZW1iZXJzID0gWy4uLm5vZGUubWVtYmVyc107XG5cbiAgICAgIHJlcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgLy8gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICAgIGNvbnN0IGV4cHJOb2RlID0gdHJhbnNsYXRlRXhwcmVzc2lvbihmaWVsZC5pbml0aWFsaXplciwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBzdGF0aWMgcHJvcGVydHkgZGVjbGFyYXRpb24gZm9yIHRoZSBuZXcgZmllbGQuXG4gICAgICAgIGNvbnN0IHByb3BlcnR5ID0gdHMuY3JlYXRlUHJvcGVydHkoXG4gICAgICAgICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgZmllbGQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdW5kZWZpbmVkLCBleHByTm9kZSk7XG5cbiAgICAgICAgZmllbGQuc3RhdGVtZW50cy5tYXAoc3RtdCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgdGhpcy5pbXBvcnRNYW5hZ2VyKSlcbiAgICAgICAgICAgIC5mb3JFYWNoKHN0bXQgPT4gc3RhdGVtZW50cy5wdXNoKHN0bXQpKTtcblxuICAgICAgICBtZW1iZXJzLnB1c2gocHJvcGVydHkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFJlcGxhY2UgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggYW4gdXBkYXRlZCB2ZXJzaW9uLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGRlY29yYXRvciB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjb21waWxhdGlvbiwgbGVhdmluZyB0aGUgb3RoZXJzIGFsb25lLlxuICAgICAgICAgIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgICAgICAgICAgICBub2RlLmRlY29yYXRvcnMsIHRoaXMuY29tcGlsYXRpb24uaXZ5RGVjb3JhdG9yRm9yKG5vZGUpICEubm9kZSBhcyB0cy5EZWNvcmF0b3IpLFxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsIG5vZGUudHlwZVBhcmFtZXRlcnMsIG5vZGUuaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLCBtZW1iZXJzKTtcbiAgICAgIHJldHVybiB7bm9kZSwgYmVmb3JlOiBzdGF0ZW1lbnRzfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGV9O1xuICB9XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCxcbiAgICBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcigpO1xuXG4gIC8vIFJlY3Vyc2l2ZWx5IHNjYW4gdGhyb3VnaCB0aGUgQVNUIGFuZCBwZXJmb3JtIGFueSB1cGRhdGVzIHJlcXVlc3RlZCBieSB0aGUgSXZ5Q29tcGlsYXRpb24uXG4gIGNvbnN0IHNmID0gdmlzaXQoZmlsZSwgbmV3IEl2eVZpc2l0b3IoY29tcGlsYXRpb24sIGltcG9ydE1hbmFnZXIpLCBjb250ZXh0KTtcblxuICAvLyBHZW5lcmF0ZSB0aGUgaW1wb3J0IHN0YXRlbWVudHMgdG8gcHJlcGVuZC5cbiAgY29uc3QgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cygpLm1hcChcbiAgICAgIGkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdHMuY3JlYXRlSW1wb3J0Q2xhdXNlKHVuZGVmaW5lZCwgdHMuY3JlYXRlTmFtZXNwYWNlSW1wb3J0KHRzLmNyZWF0ZUlkZW50aWZpZXIoaS5hcykpKSxcbiAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGkubmFtZSkpKTtcblxuICAvLyBQcmVwZW5kIGltcG9ydHMgaWYgbmVlZGVkLlxuICBpZiAoaW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgc2Yuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheShbLi4uaW1wb3J0cywgLi4uc2Yuc3RhdGVtZW50c10pO1xuICB9XG4gIHJldHVybiBzZjtcbn1cblxuZnVuY3Rpb24gbWF5YmVGaWx0ZXJEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yczogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58IHVuZGVmaW5lZCxcbiAgICB0b1JlbW92ZTogdHMuRGVjb3JhdG9yKTogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgaWYgKGRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgZmlsdGVyZWQgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gdHMuZ2V0T3JpZ2luYWxOb2RlKGRlYykgIT09IHRvUmVtb3ZlKTtcbiAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU5vZGVBcnJheShmaWx0ZXJlZCk7XG59XG4iXX0=