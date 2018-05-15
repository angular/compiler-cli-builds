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
        define("@angular/compiler-cli/src/ngtsc/transform/src/transform", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    function ivyTransformFactory(compilation) {
        return function (context) {
            return function (file) {
                return transformIvySourceFile(compilation, context, file);
            };
        };
    }
    exports.ivyTransformFactory = ivyTransformFactory;
    /**
     * A transformer which operates on ts.SourceFiles and applies changes from an `IvyCompilation`.
     */
    function transformIvySourceFile(compilation, context, file) {
        var importManager = new translator_1.ImportManager();
        // Recursively scan through the AST and perform any updates requested by the IvyCompilation.
        var sf = visitNode(file);
        // Generate the import statements to prepend.
        var imports = importManager.getAllImports().map(function (i) { return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(i.as))), ts.createLiteral(i.name)); });
        // Prepend imports if needed.
        if (imports.length > 0) {
            sf.statements = ts.createNodeArray(tslib_1.__spread(imports, sf.statements));
        }
        return sf;
        // Helper function to process a class declaration.
        function visitClassDeclaration(node) {
            // Determine if this class has an Ivy field that needs to be added, and compile the field
            // to an expression if so.
            var res = compilation.compileIvyFieldFor(node);
            if (res !== undefined) {
                // There is a field to add. Translate the initializer for the field into TS nodes.
                var exprNode = translator_1.translateExpression(res.initializer, importManager);
                // Create a static property declaration for the new field.
                var property = ts.createProperty(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], res.field, undefined, undefined, exprNode);
                // Replace the class declaration with an updated version.
                node = ts.updateClassDeclaration(node, 
                // Remove the decorator which triggered this compilation, leaving the others alone.
                maybeFilterDecorator(node.decorators, compilation.ivyDecoratorFor(node)), node.modifiers, node.name, node.typeParameters, node.heritageClauses || [], tslib_1.__spread(node.members, [property]));
            }
            // Recurse into the class declaration in case there are nested class declarations.
            return ts.visitEachChild(node, function (child) { return visitNode(child); }, context);
        }
        function visitNode(node) {
            if (ts.isClassDeclaration(node)) {
                return visitClassDeclaration(node);
            }
            else {
                return ts.visitEachChild(node, function (child) { return visitNode(child); }, context);
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsdUZBQWdFO0lBRWhFLDZCQUFvQyxXQUEyQjtRQUU3RCxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVBELGtEQU9DO0lBRUQ7O09BRUc7SUFDSCxnQ0FDSSxXQUEyQixFQUFFLE9BQWlDLEVBQzlELElBQW1CO1FBQ3JCLElBQU0sYUFBYSxHQUFHLElBQUksMEJBQWEsRUFBRSxDQUFDO1FBRTFDLDRGQUE0RjtRQUM1RixJQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0IsNkNBQTZDO1FBQzdDLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxHQUFHLENBQzdDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsRUFBRSxDQUFDLHVCQUF1QixDQUMzQixTQUFTLEVBQUUsU0FBUyxFQUNwQixFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDckYsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFIeEIsQ0FHd0IsQ0FBQyxDQUFDO1FBRW5DLDZCQUE2QjtRQUM3QixJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEVBQUUsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsa0JBQUssT0FBTyxFQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUNwRTtRQUNELE9BQU8sRUFBRSxDQUFDO1FBRVYsa0RBQWtEO1FBQ2xELCtCQUErQixJQUF5QjtZQUN0RCx5RkFBeUY7WUFDekYsMEJBQTBCO1lBQzFCLElBQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7Z0JBQ3JCLGtGQUFrRjtnQkFDbEYsSUFBTSxRQUFRLEdBQUcsZ0NBQW1CLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFFckUsMERBQTBEO2dCQUMxRCxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUM5QixTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQ3pGLFFBQVEsQ0FBQyxDQUFDO2dCQUVkLHlEQUF5RDtnQkFDekQsSUFBSSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDNUIsSUFBSTtnQkFDSixtRkFBbUY7Z0JBQ25GLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUcsQ0FBQyxFQUMxRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsZUFBZSxJQUFJLEVBQUUsbUJBQ3RFLElBQUksQ0FBQyxPQUFPLEdBQUUsUUFBUSxHQUFFLENBQUM7YUFDbEM7WUFFRCxrRkFBa0Y7WUFDbEYsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFBLEtBQUssSUFBSSxPQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBaEIsQ0FBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBSUQsbUJBQW1CLElBQWE7WUFDOUIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQy9CLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFBLEtBQUssSUFBSSxPQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBaEIsQ0FBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNwRTtRQUNILENBQUM7SUFDSCxDQUFDO0lBQ0QsOEJBQ0ksVUFBaUQsRUFDakQsUUFBc0I7UUFDeEIsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxFQUFwQyxDQUFvQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1dyYXBwZWROb2RlRXhwciwgY29tcGlsZUl2eUluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0l2eUNvbXBpbGF0aW9ufSBmcm9tICcuL2NvbXBpbGF0aW9uJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlRXhwcmVzc2lvbn0gZnJvbSAnLi90cmFuc2xhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGl2eVRyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uKTpcbiAgICB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlRyYW5zZm9ybWVyPHRzLlNvdXJjZUZpbGU+ID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1JdnlTb3VyY2VGaWxlKGNvbXBpbGF0aW9uLCBjb250ZXh0LCBmaWxlKTtcbiAgICB9O1xuICB9O1xufVxuXG4vKipcbiAqIEEgdHJhbnNmb3JtZXIgd2hpY2ggb3BlcmF0ZXMgb24gdHMuU291cmNlRmlsZXMgYW5kIGFwcGxpZXMgY2hhbmdlcyBmcm9tIGFuIGBJdnlDb21waWxhdGlvbmAuXG4gKi9cbmZ1bmN0aW9uIHRyYW5zZm9ybUl2eVNvdXJjZUZpbGUoXG4gICAgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9uLCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsXG4gICAgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoKTtcblxuICAvLyBSZWN1cnNpdmVseSBzY2FuIHRocm91Z2ggdGhlIEFTVCBhbmQgcGVyZm9ybSBhbnkgdXBkYXRlcyByZXF1ZXN0ZWQgYnkgdGhlIEl2eUNvbXBpbGF0aW9uLlxuICBjb25zdCBzZiA9IHZpc2l0Tm9kZShmaWxlKTtcblxuICAvLyBHZW5lcmF0ZSB0aGUgaW1wb3J0IHN0YXRlbWVudHMgdG8gcHJlcGVuZC5cbiAgY29uc3QgaW1wb3J0cyA9IGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cygpLm1hcChcbiAgICAgIGkgPT4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdHMuY3JlYXRlSW1wb3J0Q2xhdXNlKHVuZGVmaW5lZCwgdHMuY3JlYXRlTmFtZXNwYWNlSW1wb3J0KHRzLmNyZWF0ZUlkZW50aWZpZXIoaS5hcykpKSxcbiAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGkubmFtZSkpKTtcblxuICAvLyBQcmVwZW5kIGltcG9ydHMgaWYgbmVlZGVkLlxuICBpZiAoaW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgc2Yuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheShbLi4uaW1wb3J0cywgLi4uc2Yuc3RhdGVtZW50c10pO1xuICB9XG4gIHJldHVybiBzZjtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gcHJvY2VzcyBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICBmdW5jdGlvbiB2aXNpdENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICAgIC8vIERldGVybWluZSBpZiB0aGlzIGNsYXNzIGhhcyBhbiBJdnkgZmllbGQgdGhhdCBuZWVkcyB0byBiZSBhZGRlZCwgYW5kIGNvbXBpbGUgdGhlIGZpZWxkXG4gICAgLy8gdG8gYW4gZXhwcmVzc2lvbiBpZiBzby5cbiAgICBjb25zdCByZXMgPSBjb21waWxhdGlvbi5jb21waWxlSXZ5RmllbGRGb3Iobm9kZSk7XG4gICAgaWYgKHJlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGVyZSBpcyBhIGZpZWxkIHRvIGFkZC4gVHJhbnNsYXRlIHRoZSBpbml0aWFsaXplciBmb3IgdGhlIGZpZWxkIGludG8gVFMgbm9kZXMuXG4gICAgICBjb25zdCBleHByTm9kZSA9IHRyYW5zbGF0ZUV4cHJlc3Npb24ocmVzLmluaXRpYWxpemVyLCBpbXBvcnRNYW5hZ2VyKTtcblxuICAgICAgLy8gQ3JlYXRlIGEgc3RhdGljIHByb3BlcnR5IGRlY2xhcmF0aW9uIGZvciB0aGUgbmV3IGZpZWxkLlxuICAgICAgY29uc3QgcHJvcGVydHkgPSB0cy5jcmVhdGVQcm9wZXJ0eShcbiAgICAgICAgICB1bmRlZmluZWQsIFt0cy5jcmVhdGVUb2tlbih0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpXSwgcmVzLmZpZWxkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICBleHByTm9kZSk7XG5cbiAgICAgIC8vIFJlcGxhY2UgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggYW4gdXBkYXRlZCB2ZXJzaW9uLlxuICAgICAgbm9kZSA9IHRzLnVwZGF0ZUNsYXNzRGVjbGFyYXRpb24oXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGRlY29yYXRvciB3aGljaCB0cmlnZ2VyZWQgdGhpcyBjb21waWxhdGlvbiwgbGVhdmluZyB0aGUgb3RoZXJzIGFsb25lLlxuICAgICAgICAgIG1heWJlRmlsdGVyRGVjb3JhdG9yKG5vZGUuZGVjb3JhdG9ycywgY29tcGlsYXRpb24uaXZ5RGVjb3JhdG9yRm9yKG5vZGUpICEpLFxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLCBub2RlLm5hbWUsIG5vZGUudHlwZVBhcmFtZXRlcnMsIG5vZGUuaGVyaXRhZ2VDbGF1c2VzIHx8IFtdLFxuICAgICAgICAgIFsuLi5ub2RlLm1lbWJlcnMsIHByb3BlcnR5XSk7XG4gICAgfVxuXG4gICAgLy8gUmVjdXJzZSBpbnRvIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiBpbiBjYXNlIHRoZXJlIGFyZSBuZXN0ZWQgY2xhc3MgZGVjbGFyYXRpb25zLlxuICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCBjaGlsZCA9PiB2aXNpdE5vZGUoY2hpbGQpLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0aGF0IHJlY3Vyc2VzIHRocm91Z2ggdGhlIG5vZGVzIGFuZCBwcm9jZXNzZXMgZWFjaCBvbmUuXG4gIGZ1bmN0aW9uIHZpc2l0Tm9kZTxUIGV4dGVuZHMgdHMuTm9kZT4obm9kZTogVCk6IFQ7XG4gIGZ1bmN0aW9uIHZpc2l0Tm9kZShub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGNoaWxkID0+IHZpc2l0Tm9kZShjaGlsZCksIGNvbnRleHQpO1xuICAgIH1cbiAgfVxufVxuZnVuY3Rpb24gbWF5YmVGaWx0ZXJEZWNvcmF0b3IoXG4gICAgZGVjb3JhdG9yczogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58IHVuZGVmaW5lZCxcbiAgICB0b1JlbW92ZTogdHMuRGVjb3JhdG9yKTogdHMuTm9kZUFycmF5PHRzLkRlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgaWYgKGRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgZmlsdGVyZWQgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4gdHMuZ2V0T3JpZ2luYWxOb2RlKGRlYykgIT09IHRvUmVtb3ZlKTtcbiAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZU5vZGVBcnJheShmaWx0ZXJlZCk7XG59XG4iXX0=