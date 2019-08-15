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
                    var dtsFn = _this.getDtsDeclarationForFunction(fn);
                    var typeParam = dtsFn.type && ts.isTypeReferenceNode(dtsFn.type) &&
                        dtsFn.type.typeArguments && dtsFn.type.typeArguments[0] ||
                        null;
                    if (!typeParam || isAnyKeyword(typeParam)) {
                        // Either we do not have a parameterized type or the type is `any`.
                        var ngModule = fn.ngModule;
                        // For internal (non-library) module references, redirect the module's value declaration
                        // to its type declaration.
                        if (ngModule.viaModule === null) {
                            var dtsNgModule = _this.host.getDtsDeclaration(ngModule.node);
                            if (!dtsNgModule) {
                                throw new Error("No typings declaration can be found for the referenced NgModule class in " + fn.declaration.getText() + ".");
                            }
                            if (!ts.isClassDeclaration(dtsNgModule) || !utils_1.hasNameIdentifier(dtsNgModule)) {
                                throw new Error("The referenced NgModule in " + fn.declaration.getText() + " is not a named class declaration in the typings program; instead we get " + dtsNgModule.getText());
                            }
                            // Record the usage of the internal module as it needs to become an exported symbol
                            _this.referencesRegistry.add(ngModule.node, new imports_1.Reference(ngModule.node));
                            ngModule = { node: dtsNgModule, viaModule: null };
                        }
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
                var dtsClass = this.host.getDtsDeclaration(containerClass.valueDeclaration);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyxtRUFBcUQ7SUFHckQsOERBQXNEO0lBZ0J6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUNFLHFDQUFvQixJQUF3QixFQUFVLGtCQUFzQztZQUF4RSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFBRyxDQUFDO1FBRWhHLG9EQUFjLEdBQWQsVUFBZSxPQUFtQjtZQUFsQyxpQkFzQ0M7WUFyQ0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ25ELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2pCLElBQU0sR0FBRyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRTtvQkFDbkIsSUFBTSxLQUFLLEdBQUcsS0FBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxJQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3dCQUMxRCxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFD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QyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFEdEIsQ0FDc0IsQ0FBbUIsQ0FBQyxDQUFDO29CQUM3RCxJQUFJLENBQUM7YUFDVjtpQkFBTTtnQkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQWlDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLGdCQUFhLENBQUMsQ0FBQzthQUN6RjtZQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FDWCxtQ0FBaUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsNEJBQXVCLEtBQUssQ0FBQyxPQUFPLEVBQUksQ0FBQyxDQUFDO2FBQ3hHO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0gsa0NBQUM7SUFBRCxDQUFDLEFBdkVELElBdUVDO0lBdkVZLGtFQUEyQjtJQTBFeEMsU0FBUyxrQkFBa0IsQ0FBQyxXQUEyQjtRQUVyRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLFNBQXNCO1FBQzFDLE9BQU8sU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztJQUNyRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ29uY3JldGVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24sIE5nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlV2l0aFByb3ZpZGVyc0luZm8ge1xuICAvKipcbiAgICogVGhlIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgcmV0dXJuc1xuICAgKiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzIG9iamVjdCwgYnV0IGhhcyBhIHNpZ25hdHVyZSB0aGF0IG5lZWRzXG4gICAqIGEgdHlwZSBwYXJhbWV0ZXIgYWRkaW5nLlxuICAgKi9cbiAgZGVjbGFyYXRpb246IHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gIC8qKlxuICAgKiBUaGUgTmdNb2R1bGUgY2xhc3MgZGVjbGFyYXRpb24gKGluIHRoZSAuZC50cyBmaWxlKSB0byBhZGQgYXMgYSB0eXBlIHBhcmFtZXRlci5cbiAgICovXG4gIG5nTW9kdWxlOiBDb25jcmV0ZURlY2xhcmF0aW9uPENsYXNzRGVjbGFyYXRpb24+O1xufVxuXG5leHBvcnQgdHlwZSBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXT47XG5leHBvcnQgY29uc3QgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gTWFwO1xuXG5leHBvcnQgY2xhc3MgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnkpIHt9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyB7XG4gICAgY29uc3QgYW5hbHlzZXMgPSBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzKCk7XG4gICAgY29uc3Qgcm9vdEZpbGVzID0gdGhpcy5nZXRSb290RmlsZXMocHJvZ3JhbSk7XG4gICAgcm9vdEZpbGVzLmZvckVhY2goZiA9PiB7XG4gICAgICBjb25zdCBmbnMgPSB0aGlzLmhvc3QuZ2V0TW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ucyhmKTtcbiAgICAgIGZucyAmJiBmbnMuZm9yRWFjaChmbiA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0ZuID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbkZvckZ1bmN0aW9uKGZuKTtcbiAgICAgICAgY29uc3QgdHlwZVBhcmFtID0gZHRzRm4udHlwZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGR0c0ZuLnR5cGUpICYmXG4gICAgICAgICAgICAgICAgZHRzRm4udHlwZS50eXBlQXJndW1lbnRzICYmIGR0c0ZuLnR5cGUudHlwZUFyZ3VtZW50c1swXSB8fFxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKCF0eXBlUGFyYW0gfHwgaXNBbnlLZXl3b3JkKHR5cGVQYXJhbSkpIHtcbiAgICAgICAgICAvLyBFaXRoZXIgd2UgZG8gbm90IGhhdmUgYSBwYXJhbWV0ZXJpemVkIHR5cGUgb3IgdGhlIHR5cGUgaXMgYGFueWAuXG4gICAgICAgICAgbGV0IG5nTW9kdWxlID0gZm4ubmdNb2R1bGU7XG4gICAgICAgICAgLy8gRm9yIGludGVybmFsIChub24tbGlicmFyeSkgbW9kdWxlIHJlZmVyZW5jZXMsIHJlZGlyZWN0IHRoZSBtb2R1bGUncyB2YWx1ZSBkZWNsYXJhdGlvblxuICAgICAgICAgIC8vIHRvIGl0cyB0eXBlIGRlY2xhcmF0aW9uLlxuICAgICAgICAgIGlmIChuZ01vZHVsZS52aWFNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGR0c05nTW9kdWxlID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKG5nTW9kdWxlLm5vZGUpO1xuICAgICAgICAgICAgaWYgKCFkdHNOZ01vZHVsZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgTm8gdHlwaW5ncyBkZWNsYXJhdGlvbiBjYW4gYmUgZm91bmQgZm9yIHRoZSByZWZlcmVuY2VkIE5nTW9kdWxlIGNsYXNzIGluICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfS5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c05nTW9kdWxlKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZHRzTmdNb2R1bGUpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBUaGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbm90IGEgbmFtZWQgY2xhc3MgZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbTsgaW5zdGVhZCB3ZSBnZXQgJHtkdHNOZ01vZHVsZS5nZXRUZXh0KCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNvcmQgdGhlIHVzYWdlIG9mIHRoZSBpbnRlcm5hbCBtb2R1bGUgYXMgaXQgbmVlZHMgdG8gYmVjb21lIGFuIGV4cG9ydGVkIHN5bWJvbFxuICAgICAgICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKG5nTW9kdWxlLm5vZGUsIG5ldyBSZWZlcmVuY2UobmdNb2R1bGUubm9kZSkpO1xuXG4gICAgICAgICAgICBuZ01vZHVsZSA9IHtub2RlOiBkdHNOZ01vZHVsZSwgdmlhTW9kdWxlOiBudWxsfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0ZuLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2VzLmhhcyhkdHNGaWxlKSA/IGFuYWx5c2VzLmdldChkdHNGaWxlKSA6IFtdO1xuICAgICAgICAgIGFuYWx5c2lzLnB1c2goe2RlY2xhcmF0aW9uOiBkdHNGbiwgbmdNb2R1bGV9KTtcbiAgICAgICAgICBhbmFseXNlcy5zZXQoZHRzRmlsZSwgYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYW5hbHlzZXM7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RGaWxlcyhwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZVtdIHtcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCkubWFwKGYgPT4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGYpKS5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RHRzRGVjbGFyYXRpb25Gb3JGdW5jdGlvbihmbjogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uKSB7XG4gICAgbGV0IGR0c0ZuOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgICBjb25zdCBjb250YWluZXJDbGFzcyA9IGZuLmNvbnRhaW5lciAmJiB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woZm4uY29udGFpbmVyKTtcbiAgICBpZiAoY29udGFpbmVyQ2xhc3MpIHtcbiAgICAgIGNvbnN0IGR0c0NsYXNzID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbnRhaW5lckNsYXNzLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgLy8gR2V0IHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgbWF0Y2hpbmcgc3RhdGljIG1ldGhvZFxuICAgICAgZHRzRm4gPSBkdHNDbGFzcyAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzQ2xhc3MpID9cbiAgICAgICAgICBkdHNDbGFzcy5tZW1iZXJzXG4gICAgICAgICAgICAgIC5maW5kKFxuICAgICAgICAgICAgICAgICAgbWVtYmVyID0+IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obWVtYmVyKSAmJiB0cy5pc0lkZW50aWZpZXIobWVtYmVyLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUudGV4dCA9PT0gZm4ubmFtZSkgYXMgdHMuRGVjbGFyYXRpb24gOlxuICAgICAgICAgIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGR0c0ZuID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGZuLmRlY2xhcmF0aW9uKTtcbiAgICB9XG4gICAgaWYgKCFkdHNGbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbWlzc2luZ2ApO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZChkdHNGbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgTWF0Y2hpbmcgdHlwZSBkZWNsYXJhdGlvbiBmb3IgJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG5vdCBhIGZ1bmN0aW9uOiAke2R0c0ZuLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGR0c0ZuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gaXNGdW5jdGlvbk9yTWV0aG9kKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IGRlY2xhcmF0aW9uIGlzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgdHMuTWV0aG9kRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gaXNBbnlLZXl3b3JkKHR5cGVQYXJhbTogdHMuVHlwZU5vZGUpOiB0eXBlUGFyYW0gaXMgdHMuS2V5d29yZFR5cGVOb2RlIHtcbiAgcmV0dXJuIHR5cGVQYXJhbS5raW5kID09PSB0cy5TeW50YXhLaW5kLkFueUtleXdvcmQ7XG59XG4iXX0=