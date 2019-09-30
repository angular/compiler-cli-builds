(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    exports.ModuleWithProvidersAnalyses = Map;
    var ModuleWithProvidersAnalyzer = /** @class */ (function () {
        function ModuleWithProvidersAnalyzer(host, referencesRegistry) {
            this.host = host;
            this.referencesRegistry = referencesRegistry;
        }
        ModuleWithProvidersAnalyzer.prototype.analyzeProgram = function (program) {
            var _this = this;
            var analyses = new exports.ModuleWithProvidersAnalyses();
            var rootFiles = this.getRootFiles(program);
            rootFiles.forEach(function (f) {
                var fns = _this.host.getModuleWithProvidersFunctions(f);
                fns && fns.forEach(function (fn) {
                    if (fn.ngModule.viaModule === null) {
                        // Record the usage of an internal module as it needs to become an exported symbol
                        _this.referencesRegistry.add(fn.ngModule.node, new imports_1.Reference(fn.ngModule.node));
                    }
                    var dtsFn = _this.getDtsDeclarationForFunction(fn);
                    var typeParam = dtsFn.type && ts.isTypeReferenceNode(dtsFn.type) &&
                        dtsFn.type.typeArguments && dtsFn.type.typeArguments[0] ||
                        null;
                    if (!typeParam || isAnyKeyword(typeParam)) {
                        var ngModule = _this.resolveNgModuleReference(fn);
                        var dtsFile = dtsFn.getSourceFile();
                        var analysis = analyses.has(dtsFile) ? analyses.get(dtsFile) : [];
                        analysis.push({ declaration: dtsFn, ngModule: ngModule });
                        analyses.set(dtsFile, analysis);
                    }
                });
            });
            return analyses;
        };
        ModuleWithProvidersAnalyzer.prototype.getRootFiles = function (program) {
            return program.getRootFileNames().map(function (f) { return program.getSourceFile(f); }).filter(utils_1.isDefined);
        };
        ModuleWithProvidersAnalyzer.prototype.getDtsDeclarationForFunction = function (fn) {
            var dtsFn = null;
            var containerClass = fn.container && this.host.getClassSymbol(fn.container);
            if (containerClass) {
                var dtsClass = this.host.getDtsDeclaration(containerClass.declaration.valueDeclaration);
                // Get the declaration of the matching static method
                dtsFn = dtsClass && ts.isClassDeclaration(dtsClass) ?
                    dtsClass.members
                        .find(function (member) { return ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) &&
                        member.name.text === fn.name; }) :
                    null;
            }
            else {
                dtsFn = this.host.getDtsDeclaration(fn.declaration);
            }
            if (!dtsFn) {
                throw new Error("Matching type declaration for " + fn.declaration.getText() + " is missing");
            }
            if (!isFunctionOrMethod(dtsFn)) {
                throw new Error("Matching type declaration for " + fn.declaration.getText() + " is not a function: " + dtsFn.getText());
            }
            return dtsFn;
        };
        ModuleWithProvidersAnalyzer.prototype.resolveNgModuleReference = function (fn) {
            var ngModule = fn.ngModule;
            // For external module references, use the declaration as is.
            if (ngModule.viaModule !== null) {
                return ngModule;
            }
            // For internal (non-library) module references, redirect the module's value declaration
            // to its type declaration.
            var dtsNgModule = this.host.getDtsDeclaration(ngModule.node);
            if (!dtsNgModule) {
                throw new Error("No typings declaration can be found for the referenced NgModule class in " + fn.declaration.getText() + ".");
            }
            if (!ts.isClassDeclaration(dtsNgModule) || !utils_1.hasNameIdentifier(dtsNgModule)) {
                throw new Error("The referenced NgModule in " + fn.declaration.getText() + " is not a named class declaration in the typings program; instead we get " + dtsNgModule.getText());
            }
            return { node: dtsNgModule, viaModule: null };
        };
        return ModuleWithProvidersAnalyzer;
    }());
    exports.ModuleWithProvidersAnalyzer = ModuleWithProvidersAnalyzer;
    function isFunctionOrMethod(declaration) {
        return ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration);
    }
    function isAnyKeyword(typeParam) {
        return typeParam.kind === ts.SyntaxKind.AnyKeyword;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyxtRUFBcUQ7SUFHckQsOERBQXNEO0lBZ0J6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUNFLHFDQUFvQixJQUF3QixFQUFVLGtCQUFzQztZQUF4RSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFBRyxDQUFDO1FBRWhHLG9EQUFjLEdBQWQsVUFBZSxPQUFtQjtZQUFsQyxpQkF5QkM7WUF4QkMsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ25ELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2pCLElBQU0sR0FBRyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRTtvQkFDbkIsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxJQUFJLEVBQUU7d0JBQ2xDLGtGQUFrRjt3QkFDbEYsS0FBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLG1CQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUNoRjtvQkFFRCxJQUFNLEtBQUssR0FBRyxLQUFJLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3BELElBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxDQUFDO29CQUNULElBQUksQ0FBQyxTQUFTLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFO3dCQUN6QyxJQUFNLFFBQVEsR0FBRyxLQUFJLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25ELElBQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDdEMsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUNwRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLFVBQUEsRUFBQyxDQUFDLENBQUM7d0JBQzlDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3FCQUNqQztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVPLGtEQUFZLEdBQXBCLFVBQXFCLE9BQW1CO1lBQ3RDLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVPLGtFQUE0QixHQUFwQyxVQUFxQyxFQUErQjtZQUNsRSxJQUFJLEtBQUssR0FBd0IsSUFBSSxDQUFDO1lBQ3RDLElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzlFLElBQUksY0FBYyxFQUFFO2dCQUNsQixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDMUYsb0RBQW9EO2dCQUNwRCxLQUFLLEdBQUcsUUFBUSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUNqRCxRQUFRLENBQUMsT0FBTzt5QkFDWCxJQUFJLENBQ0QsVUFBQSxNQUFNLElBQUksT0FBQSxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNwRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsSUFBSSxFQUR0QixDQUNzQixDQUFtQixDQUFDLENBQUM7b0JBQzdELElBQUksQ0FBQzthQUNWO2lCQUFNO2dCQUNMLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUNyRDtZQUNELElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBaUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsZ0JBQWEsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUNYLG1DQUFpQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSw0QkFBdUIsS0FBSyxDQUFDLE9BQU8sRUFBSSxDQUFDLENBQUM7YUFDeEc7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFTyw4REFBd0IsR0FBaEMsVUFBaUMsRUFBK0I7WUFFOUQsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUU3Qiw2REFBNkQ7WUFDN0QsSUFBSSxRQUFRLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDL0IsT0FBTyxRQUFRLENBQUM7YUFDakI7WUFFRCx3RkFBd0Y7WUFDeEYsMkJBQTJCO1lBQzNCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQ1gsOEVBQTRFLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQUcsQ0FBQyxDQUFDO2FBQzlHO1lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUFpQixDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUMxRSxNQUFNLElBQUksS0FBSyxDQUNYLGdDQUE4QixFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxpRkFBNEUsV0FBVyxDQUFDLE9BQU8sRUFBSSxDQUFDLENBQUM7YUFDaEs7WUFFRCxPQUFPLEVBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQWxGRCxJQWtGQztJQWxGWSxrRUFBMkI7SUFxRnhDLFNBQVMsa0JBQWtCLENBQUMsV0FBMkI7UUFFckQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFzQjtRQUMxQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENvbmNyZXRlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uLCBOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aGFzTmFtZUlkZW50aWZpZXIsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiAoaW4gdGhlIC5kLnRzIGZpbGUpIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYSBgTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3QsIGJ1dCBoYXMgYSBzaWduYXR1cmUgdGhhdCBuZWVkc1xuICAgKiBhIHR5cGUgcGFyYW1ldGVyIGFkZGluZy5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiB0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAvKipcbiAgICogVGhlIE5nTW9kdWxlIGNsYXNzIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgdG8gYWRkIGFzIGEgdHlwZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBuZ01vZHVsZTogQ29uY3JldGVEZWNsYXJhdGlvbjxDbGFzc0RlY2xhcmF0aW9uPjtcbn1cblxuZXhwb3J0IHR5cGUgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gTWFwPHRzLlNvdXJjZUZpbGUsIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10+O1xuZXhwb3J0IGNvbnN0IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDtcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5KSB7fVxuXG4gIGFuYWx5emVQcm9ncmFtKHByb2dyYW06IHRzLlByb2dyYW0pOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMge1xuICAgIGNvbnN0IGFuYWx5c2VzID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcygpO1xuICAgIGNvbnN0IHJvb3RGaWxlcyA9IHRoaXMuZ2V0Um9vdEZpbGVzKHByb2dyYW0pO1xuICAgIHJvb3RGaWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgY29uc3QgZm5zID0gdGhpcy5ob3N0LmdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZik7XG4gICAgICBmbnMgJiYgZm5zLmZvckVhY2goZm4gPT4ge1xuICAgICAgICBpZiAoZm4ubmdNb2R1bGUudmlhTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gUmVjb3JkIHRoZSB1c2FnZSBvZiBhbiBpbnRlcm5hbCBtb2R1bGUgYXMgaXQgbmVlZHMgdG8gYmVjb21lIGFuIGV4cG9ydGVkIHN5bWJvbFxuICAgICAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChmbi5uZ01vZHVsZS5ub2RlLCBuZXcgUmVmZXJlbmNlKGZuLm5nTW9kdWxlLm5vZGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGR0c0ZuID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbkZvckZ1bmN0aW9uKGZuKTtcbiAgICAgICAgY29uc3QgdHlwZVBhcmFtID0gZHRzRm4udHlwZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGR0c0ZuLnR5cGUpICYmXG4gICAgICAgICAgICAgICAgZHRzRm4udHlwZS50eXBlQXJndW1lbnRzICYmIGR0c0ZuLnR5cGUudHlwZUFyZ3VtZW50c1swXSB8fFxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKCF0eXBlUGFyYW0gfHwgaXNBbnlLZXl3b3JkKHR5cGVQYXJhbSkpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMucmVzb2x2ZU5nTW9kdWxlUmVmZXJlbmNlKGZuKTtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRm4uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IGFuYWx5c2lzID0gYW5hbHlzZXMuaGFzKGR0c0ZpbGUpID8gYW5hbHlzZXMuZ2V0KGR0c0ZpbGUpIDogW107XG4gICAgICAgICAgYW5hbHlzaXMucHVzaCh7ZGVjbGFyYXRpb246IGR0c0ZuLCBuZ01vZHVsZX0pO1xuICAgICAgICAgIGFuYWx5c2VzLnNldChkdHNGaWxlLCBhbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBhbmFseXNlcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Um9vdEZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBwcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKS5tYXAoZiA9PiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZikpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREdHNEZWNsYXJhdGlvbkZvckZ1bmN0aW9uKGZuOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24pIHtcbiAgICBsZXQgZHRzRm46IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGNvbnRhaW5lckNsYXNzID0gZm4uY29udGFpbmVyICYmIHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChmbi5jb250YWluZXIpO1xuICAgIGlmIChjb250YWluZXJDbGFzcykge1xuICAgICAgY29uc3QgZHRzQ2xhc3MgPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oY29udGFpbmVyQ2xhc3MuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAvLyBHZXQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBtYXRjaGluZyBzdGF0aWMgbWV0aG9kXG4gICAgICBkdHNGbiA9IGR0c0NsYXNzICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNDbGFzcykgP1xuICAgICAgICAgIGR0c0NsYXNzLm1lbWJlcnNcbiAgICAgICAgICAgICAgLmZpbmQoXG4gICAgICAgICAgICAgICAgICBtZW1iZXIgPT4gdHMuaXNNZXRob2REZWNsYXJhdGlvbihtZW1iZXIpICYmIHRzLmlzSWRlbnRpZmllcihtZW1iZXIubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICBtZW1iZXIubmFtZS50ZXh0ID09PSBmbi5uYW1lKSBhcyB0cy5EZWNsYXJhdGlvbiA6XG4gICAgICAgICAgbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZHRzRm4gPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZm4uZGVjbGFyYXRpb24pO1xuICAgIH1cbiAgICBpZiAoIWR0c0ZuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1hdGNoaW5nIHR5cGUgZGVjbGFyYXRpb24gZm9yICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpcyBtaXNzaW5nYCk7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kKGR0c0ZuKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbm90IGEgZnVuY3Rpb246ICR7ZHRzRm4uZ2V0VGV4dCgpfWApO1xuICAgIH1cbiAgICByZXR1cm4gZHRzRm47XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVOZ01vZHVsZVJlZmVyZW5jZShmbjogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uKTpcbiAgICAgIENvbmNyZXRlRGVjbGFyYXRpb248Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IG5nTW9kdWxlID0gZm4ubmdNb2R1bGU7XG5cbiAgICAvLyBGb3IgZXh0ZXJuYWwgbW9kdWxlIHJlZmVyZW5jZXMsIHVzZSB0aGUgZGVjbGFyYXRpb24gYXMgaXMuXG4gICAgaWYgKG5nTW9kdWxlLnZpYU1vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5nTW9kdWxlO1xuICAgIH1cblxuICAgIC8vIEZvciBpbnRlcm5hbCAobm9uLWxpYnJhcnkpIG1vZHVsZSByZWZlcmVuY2VzLCByZWRpcmVjdCB0aGUgbW9kdWxlJ3MgdmFsdWUgZGVjbGFyYXRpb25cbiAgICAvLyB0byBpdHMgdHlwZSBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCBkdHNOZ01vZHVsZSA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihuZ01vZHVsZS5ub2RlKTtcbiAgICBpZiAoIWR0c05nTW9kdWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE5vIHR5cGluZ3MgZGVjbGFyYXRpb24gY2FuIGJlIGZvdW5kIGZvciB0aGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBjbGFzcyBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0uYCk7XG4gICAgfVxuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c05nTW9kdWxlKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZHRzTmdNb2R1bGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFRoZSByZWZlcmVuY2VkIE5nTW9kdWxlIGluICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpcyBub3QgYSBuYW1lZCBjbGFzcyBkZWNsYXJhdGlvbiBpbiB0aGUgdHlwaW5ncyBwcm9ncmFtOyBpbnN0ZWFkIHdlIGdldCAke2R0c05nTW9kdWxlLmdldFRleHQoKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGU6IGR0c05nTW9kdWxlLCB2aWFNb2R1bGU6IG51bGx9O1xuICB9XG59XG5cblxuZnVuY3Rpb24gaXNGdW5jdGlvbk9yTWV0aG9kKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IGRlY2xhcmF0aW9uIGlzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgdHMuTWV0aG9kRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gaXNBbnlLZXl3b3JkKHR5cGVQYXJhbTogdHMuVHlwZU5vZGUpOiB0eXBlUGFyYW0gaXMgdHMuS2V5d29yZFR5cGVOb2RlIHtcbiAgcmV0dXJuIHR5cGVQYXJhbS5raW5kID09PSB0cy5TeW50YXhLaW5kLkFueUtleXdvcmQ7XG59XG4iXX0=