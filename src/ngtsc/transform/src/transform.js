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
                // There is a field to add. Translate the initializer for the field into TS nodes.
                var exprNode = translator_1.translateExpression(res.initializer, this.importManager);
                // Create a static property declaration for the new field.
                var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], res.field, undefined, undefined, exprNode);
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, this.compilation.ivyDecoratorFor(node).node), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], tslib_1.__spread(node.members, [property]));
                var statements = res.statements.map(function (stmt) { return translator_1.translateStatement(stmt, _this.importManager); });
                return { node: node, before: statements };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsNEVBQTRFO0lBRzVFLHVGQUFvRjtJQUVwRiw2QkFBb0MsV0FBMkI7UUFFN0QsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLE9BQU8sVUFBQyxJQUFtQjtnQkFDekIsT0FBTyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVELENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFQRCxrREFPQztJQUVEO1FBQXlCLHNDQUFPO1FBQzlCLG9CQUFvQixXQUEyQixFQUFVLGFBQTRCO1lBQXJGLFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixpQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSxtQkFBYSxHQUFiLGFBQWEsQ0FBZTs7UUFFckYsQ0FBQztRQUVELDBDQUFxQixHQUFyQixVQUFzQixJQUF5QjtZQUEvQyxpQkEyQkM7WUF6QkMseUZBQXlGO1lBQ3pGLDBCQUEwQjtZQUMxQixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RELElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtnQkFDckIsa0ZBQWtGO2dCQUNsRixJQUFNLFFBQVEsR0FBRyxnQ0FBbUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFFMUUsMERBQTBEO2dCQUMxRCxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUM5QixTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQ3pGLFFBQVEsQ0FBQyxDQUFDO2dCQUVkLHlEQUF5RDtnQkFDekQsSUFBSSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDNUIsSUFBSTtnQkFDSixtRkFBbUY7Z0JBQ25GLG9CQUFvQixDQUNoQixJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBRyxDQUFDLElBQW9CLENBQUMsRUFDbkYsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGVBQWUsSUFBSSxFQUFFLG1CQUN0RSxJQUFJLENBQUMsT0FBTyxHQUFFLFFBQVEsR0FBRSxDQUFDO2dCQUNqQyxJQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLCtCQUFrQixDQUFDLElBQUksRUFBRSxLQUFJLENBQUMsYUFBYSxDQUFDLEVBQTVDLENBQTRDLENBQUMsQ0FBQztnQkFDNUYsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUMsQ0FBQzthQUNuQztZQUVELE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBQyxDQUFDO1FBQ2hCLENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFqQ0QsQ0FBeUIsaUJBQU8sR0FpQy9CO0lBRUQ7O09BRUc7SUFDSCxnQ0FDSSxXQUEyQixFQUFFLE9BQWlDLEVBQzlELElBQW1CO1FBQ3JCLElBQU0sYUFBYSxHQUFHLElBQUksMEJBQWEsRUFBRSxDQUFDO1FBRTFDLDRGQUE0RjtRQUM1RixJQUFNLEVBQUUsR0FBRyxlQUFLLENBQUMsSUFBSSxFQUFFLElBQUksVUFBVSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUU1RSw2Q0FBNkM7UUFDN0MsSUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLEdBQUcsQ0FDN0MsVUFBQSxDQUFDLElBQUksT0FBQSxFQUFFLENBQUMsdUJBQXVCLENBQzNCLFNBQVMsRUFBRSxTQUFTLEVBQ3BCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNyRixFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUh4QixDQUd3QixDQUFDLENBQUM7UUFFbkMsNkJBQTZCO1FBQzdCLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdEIsRUFBRSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZSxrQkFBSyxPQUFPLEVBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDO1NBQ3BFO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQsOEJBQ0ksVUFBaUQsRUFDakQsUUFBc0I7UUFDeEIsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxFQUFwQyxDQUFvQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1dyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7VmlzaXRMaXN0RW50cnlSZXN1bHQsIFZpc2l0b3IsIHZpc2l0fSBmcm9tICcuLi8uLi91dGlsL3NyYy92aXNpdG9yJztcblxuaW1wb3J0IHtJdnlDb21waWxhdGlvbn0gZnJvbSAnLi9jb21waWxhdGlvbic7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZUV4cHJlc3Npb24sIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi90cmFuc2xhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGl2eVRyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uKTpcbiAgICB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKGNvbXBpbGF0aW9uLCBjb250ZXh0LCBmaWxlKTtcbiAgICB9O1xuICB9O1xufVxuXG5jbGFzcyBJdnlWaXNpdG9yIGV4dGVuZHMgVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCBwcml2YXRlIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgVmlzaXRMaXN0RW50cnlSZXN1bHQ8dHMuU3RhdGVtZW50LCB0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY2xhc3MgaGFzIGFuIEl2eSBmaWVsZCB0aGF0IG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgY29tcGlsZSB0aGUgZmllbGRcbiAgICAvLyB0byBhbiBleHByZXNzaW9uIGlmIHNvLlxuICAgIGNvbnN0IHJlcyA9IHRoaXMuY29tcGlsYXRpb24uY29tcGlsZUl2eUZpZWxkRm9yKG5vZGUpO1xuICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlcmUgaXMgYSBmaWVsZCB0byBhZGQuIFRyYW5zbGF0ZSB0aGUgaW5pdGlhbGl6ZXIgZm9yIHRoZSBmaWVsZCBpbnRvIFRTIG5vZGVzLlxuICAgICAgY29uc3QgZXhwck5vZGUgPSB0cmFuc2xhdGVFeHByZXNzaW9uKHJlcy5pbml0aWFsaXplciwgdGhpcy5pbXBvcnRNYW5hZ2VyKTtcblxuICAgICAgLy8gQ3JlYXRlIGEgc3RhdGljIHByb3BlcnR5IGRlY2xhcmF0aW9uIGZvciB0aGUgbmV3IGZpZWxkLlxuICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgcmVzLmZpZWxkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICBleHByTm9kZSk7XG5cbiAgICAgIC8vIFJlcGxhY2UgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggYW4gdXBkYXRlZCB2ZXJzaW9uLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGRlY29yYXRvciB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjb21waWxhdGlvbiwgbGVhdmluZyB0aGUgb3RoZXJzIGFsb25lLlxuICAgICAgICAgIG1heWJlRmlsdGVyRGVjb3JhdG9yKFxuICAgICAgICAgICAgICBub2RlLmRlY29yYXRvcnMsIHRoaXMuY29tcGlsYXRpb24uaXZ5RGVjb3JhdG9yRm9yKG5vZGUpICEubm9kZSBhcyB0cy5EZWNvcmF0b3IpLFxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsIG5vZGUudHlwZVBhcmFtZXRlcnMsIG5vZGUuaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLFxuICAgICAgICAgIFsuLi5ub2RlLm1lbWJlcnMsIHByb3BlcnR5XSk7XG4gICAgICBjb25zdCBzdGF0ZW1lbnRzID0gcmVzLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIHRoaXMuaW1wb3J0TWFuYWdlcikpO1xuICAgICAgcmV0dXJuIHtub2RlLCBiZWZvcmU6IHN0YXRlbWVudHN9O1xuICAgIH1cblxuICAgIHJldHVybiB7bm9kZX07XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRyYW5zZm9ybWVyIHdoaWNoIG9wZXJhdGVzIG9uIHRzLlNvdXJjZUZpbGVzIGFuZCBhcHBsaWVzIGNoYW5nZXMgZnJvbSBhbiBgSXZ5Q29tcGlsYXRpb25gLlxuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKFxuICAgIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbiwgY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0LFxuICAgIGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKCk7XG5cbiAgLy8gUmVjdXJzaXZlbHkgc2NhbiB0aHJvdWdoIHRoZSBBU1QgYW5kIHBlcmZvcm0gYW55IHVwZGF0ZXMgcmVxdWVzdGVkIGJ5IHRoZSBJdnlDb21waWxhdGlvbi5cbiAgY29uc3Qgc2YgPSB2aXNpdChmaWxlLCBuZXcgSXZ5VmlzaXRvcihjb21waWxhdGlvbiwgaW1wb3J0TWFuYWdlciksIGNvbnRleHQpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBpbXBvcnQgc3RhdGVtZW50cyB0byBwcmVwZW5kLlxuICBjb25zdCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKCkubWFwKFxuICAgICAgaSA9PiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICB0cy5jcmVhdGVJbXBvcnRDbGF1c2UodW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lc3BhY2VJbXBvcnQodHMuY3JlYXRlSWRlbnRpZmllcihpLmFzKSkpLFxuICAgICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoaS5uYW1lKSkpO1xuXG4gIC8vIFByZXBlbmQgaW1wb3J0cyBpZiBuZWVkZWQuXG4gIGlmIChpbXBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICBzZi5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KFsuLi5pbXBvcnRzLCAuLi5zZi5zdGF0ZW1lbnRzXSk7XG4gIH1cbiAgcmV0dXJuIHNmO1xufVxuXG5mdW5jdGlvbiBtYXliZUZpbHRlckRlY29yYXRvcihcbiAgICBkZWNvcmF0b3JzOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnwgdW5kZWZpbmVkLFxuICAgIHRvUmVtb3ZlOiB0cy5EZWNvcmF0b3IpOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICBpZiAoZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBmaWx0ZXJlZCA9IGRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiB0cy5nZXRPcmlnaW5hbE5vZGUoZGVjKSAhPT0gdG9SZW1vdmUpO1xuICBpZiAoZmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbn1cbiJdfQ==