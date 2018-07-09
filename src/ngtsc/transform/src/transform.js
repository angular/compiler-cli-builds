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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsdUZBQWdFO0lBRWhFLDZCQUFvQyxXQUEyQjtRQUU3RCxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVBELGtEQU9DO0lBRUQ7O09BRUc7SUFDSCxnQ0FDSSxXQUEyQixFQUFFLE9BQWlDLEVBQzlELElBQW1CO1FBQ3JCLElBQU0sYUFBYSxHQUFHLElBQUksMEJBQWEsRUFBRSxDQUFDO1FBRTFDLDRGQUE0RjtRQUM1RixJQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0IsNkNBQTZDO1FBQzdDLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxHQUFHLENBQzdDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsRUFBRSxDQUFDLHVCQUF1QixDQUMzQixTQUFTLEVBQUUsU0FBUyxFQUNwQixFQUFFLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDckYsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFIeEIsQ0FHd0IsQ0FBQyxDQUFDO1FBRW5DLDZCQUE2QjtRQUM3QixJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEVBQUUsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsa0JBQUssT0FBTyxFQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUNwRTtRQUNELE9BQU8sRUFBRSxDQUFDO1FBRVYsa0RBQWtEO1FBQ2xELCtCQUErQixJQUF5QjtZQUN0RCx5RkFBeUY7WUFDekYsMEJBQTBCO1lBQzFCLElBQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7Z0JBQ3JCLGtGQUFrRjtnQkFDbEYsSUFBTSxRQUFRLEdBQUcsZ0NBQW1CLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFFckUsMERBQTBEO2dCQUMxRCxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUM5QixTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQ3pGLFFBQVEsQ0FBQyxDQUFDO2dCQUVkLHlEQUF5RDtnQkFDekQsSUFBSSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsQ0FDNUIsSUFBSTtnQkFDSixtRkFBbUY7Z0JBQ25GLG9CQUFvQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUcsQ0FBQyxFQUMxRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsZUFBZSxJQUFJLEVBQUUsbUJBQ3RFLElBQUksQ0FBQyxPQUFPLEdBQUUsUUFBUSxHQUFFLENBQUM7YUFDbEM7WUFFRCxrRkFBa0Y7WUFDbEYsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFBLEtBQUssSUFBSSxPQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBaEIsQ0FBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBSUQsbUJBQW1CLElBQWE7WUFDOUIsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQy9CLE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFBLEtBQUssSUFBSSxPQUFBLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBaEIsQ0FBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNwRTtRQUNILENBQUM7SUFDSCxDQUFDO0lBQ0QsOEJBQ0ksVUFBaUQsRUFDakQsUUFBc0I7UUFDeEIsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxFQUFwQyxDQUFvQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUNELE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1dyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vY29tcGlsYXRpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVFeHByZXNzaW9ufSBmcm9tICcuL3RyYW5zbGF0b3InO1xuXG5leHBvcnQgZnVuY3Rpb24gaXZ5VHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24pOlxuICAgIHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4gPT4ge1xuICAgIHJldHVybiAoZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybUl2eVNvdXJjZUZpbGUoY29tcGlsYXRpb24sIGNvbnRleHQsIGZpbGUpO1xuICAgIH07XG4gIH07XG59XG5cbi8qKlxuICogQSB0cmFuc2Zvcm1lciB3aGljaCBvcGVyYXRlcyBvbiB0cy5Tb3VyY2VGaWxlcyBhbmQgYXBwbGllcyBjaGFuZ2VzIGZyb20gYW4gYEl2eUNvbXBpbGF0aW9uYC5cbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtSXZ5U291cmNlRmlsZShcbiAgICBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb24sIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCxcbiAgICBmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcigpO1xuXG4gIC8vIFJlY3Vyc2l2ZWx5IHNjYW4gdGhyb3VnaCB0aGUgQVNUIGFuZCBwZXJmb3JtIGFueSB1cGRhdGVzIHJlcXVlc3RlZCBieSB0aGUgSXZ5Q29tcGlsYXRpb24uXG4gIGNvbnN0IHNmID0gdmlzaXROb2RlKGZpbGUpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBpbXBvcnQgc3RhdGVtZW50cyB0byBwcmVwZW5kLlxuICBjb25zdCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKCkubWFwKFxuICAgICAgaSA9PiB0cy5jcmVhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICB0cy5jcmVhdGVJbXBvcnRDbGF1c2UodW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lc3BhY2VJbXBvcnQodHMuY3JlYXRlSWRlbnRpZmllcihpLmFzKSkpLFxuICAgICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoaS5uYW1lKSkpO1xuXG4gIC8vIFByZXBlbmQgaW1wb3J0cyBpZiBuZWVkZWQuXG4gIGlmIChpbXBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICBzZi5zdGF0ZW1lbnRzID0gdHMuY3JlYXRlTm9kZUFycmF5KFsuLi5pbXBvcnRzLCAuLi5zZi5zdGF0ZW1lbnRzXSk7XG4gIH1cbiAgcmV0dXJuIHNmO1xuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBwcm9jZXNzIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gIGZ1bmN0aW9uIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY2xhc3MgaGFzIGFuIEl2eSBmaWVsZCB0aGF0IG5lZWRzIHRvIGJlIGFkZGVkLCBhbmQgY29tcGlsZSB0aGUgZmllbGRcbiAgICAvLyB0byBhbiBleHByZXNzaW9uIGlmIHNvLlxuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGF0aW9uLmNvbXBpbGVJdnlGaWVsZEZvcihub2RlKTtcbiAgICBpZiAocmVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZXJlIGlzIGEgZmllbGQgdG8gYWRkLiBUcmFuc2xhdGUgdGhlIGluaXRpYWxpemVyIGZvciB0aGUgZmllbGQgaW50byBUUyBub2Rlcy5cbiAgICAgIGNvbnN0IGV4cHJOb2RlID0gdHJhbnNsYXRlRXhwcmVzc2lvbihyZXMuaW5pdGlhbGl6ZXIsIGltcG9ydE1hbmFnZXIpO1xuXG4gICAgICAvLyBDcmVhdGUgYSBzdGF0aWMgcHJvcGVydHkgZGVjbGFyYXRpb24gZm9yIHRoZSBuZXcgZmllbGQuXG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IHRzLmNyZWF0ZVByb3BlcnR5KFxuICAgICAgICAgIHVuZGVmaW5lZCwgW3RzLmNyZWF0ZVRva2VuKHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCldLCByZXMuZmllbGQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICAgIGV4cHJOb2RlKTtcblxuICAgICAgLy8gUmVwbGFjZSB0aGUgY2xhc3MgZGVjbGFyYXRpb24gd2l0aCBhbiB1cGRhdGVkIHZlcnNpb24uXG4gICAgICBub2RlID0gdHMudXBkYXRlQ2xhc3NEZWNsYXJhdGlvbihcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgZGVjb3JhdG9yIHdoaWNoIHRyaWdnZXJlZCB0aGlzIGNvbXBpbGF0aW9uLCBsZWF2aW5nIHRoZSBvdGhlcnMgYWxvbmUuXG4gICAgICAgICAgbWF5YmVGaWx0ZXJEZWNvcmF0b3Iobm9kZS5kZWNvcmF0b3JzLCBjb21waWxhdGlvbi5pdnlEZWNvcmF0b3JGb3Iobm9kZSkgISksXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMsIG5vZGUubmFtZSwgbm9kZS50eXBlUGFyYW1ldGVycywgbm9kZS5oZXJpdGFnZUNsYXVzZXMgfHwgW10sXG4gICAgICAgICAgWy4uLm5vZGUubWVtYmVycywgcHJvcGVydHldKTtcbiAgICB9XG5cbiAgICAvLyBSZWN1cnNlIGludG8gdGhlIGNsYXNzIGRlY2xhcmF0aW9uIGluIGNhc2UgdGhlcmUgYXJlIG5lc3RlZCBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAgcmV0dXJuIHRzLnZpc2l0RWFjaENoaWxkKG5vZGUsIGNoaWxkID0+IHZpc2l0Tm9kZShjaGlsZCksIGNvbnRleHQpO1xuICB9XG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRoYXQgcmVjdXJzZXMgdGhyb3VnaCB0aGUgbm9kZXMgYW5kIHByb2Nlc3NlcyBlYWNoIG9uZS5cbiAgZnVuY3Rpb24gdmlzaXROb2RlPFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBUKTogVDtcbiAgZnVuY3Rpb24gdmlzaXROb2RlKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdmlzaXRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgY2hpbGQgPT4gdmlzaXROb2RlKGNoaWxkKSwgY29udGV4dCk7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiBtYXliZUZpbHRlckRlY29yYXRvcihcbiAgICBkZWNvcmF0b3JzOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnwgdW5kZWZpbmVkLFxuICAgIHRvUmVtb3ZlOiB0cy5EZWNvcmF0b3IpOiB0cy5Ob2RlQXJyYXk8dHMuRGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICBpZiAoZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBmaWx0ZXJlZCA9IGRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiB0cy5nZXRPcmlnaW5hbE5vZGUoZGVjKSAhPT0gdG9SZW1vdmUpO1xuICBpZiAoZmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlTm9kZUFycmF5KGZpbHRlcmVkKTtcbn1cbiJdfQ==