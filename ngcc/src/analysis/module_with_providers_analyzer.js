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
        function ModuleWithProvidersAnalyzer(host, referencesRegistry, processDts) {
            this.host = host;
            this.referencesRegistry = referencesRegistry;
            this.processDts = processDts;
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
                    // Only when processing the dts files do we need to determine which declaration to update.
                    if (_this.processDts) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyxtRUFBcUQ7SUFHckQsOERBQXNEO0lBZ0J6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUNFLHFDQUNZLElBQXdCLEVBQVUsa0JBQXNDLEVBQ3hFLFVBQW1CO1lBRG5CLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUN4RSxlQUFVLEdBQVYsVUFBVSxDQUFTO1FBQUcsQ0FBQztRQUVuQyxvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFBbEMsaUJBNEJDO1lBM0JDLElBQU0sUUFBUSxHQUFHLElBQUksbUNBQTJCLEVBQUUsQ0FBQztZQUNuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDO2dCQUNqQixJQUFNLEdBQUcsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7b0JBQ25CLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO3dCQUNsQyxrRkFBa0Y7d0JBQ2xGLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxtQkFBUyxDQUFDLEVBQUUsQ0FBQyxR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QUFXLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLFNBQXNCO1FBQzFDLE9BQU8sU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztJQUNyRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ29uY3JldGVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24sIE5nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlV2l0aFByb3ZpZGVyc0luZm8ge1xuICAvKipcbiAgICogVGhlIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgcmV0dXJuc1xuICAgKiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzIG9iamVjdCwgYnV0IGhhcyBhIHNpZ25hdHVyZSB0aGF0IG5lZWRzXG4gICAqIGEgdHlwZSBwYXJhbWV0ZXIgYWRkaW5nLlxuICAgKi9cbiAgZGVjbGFyYXRpb246IHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRGVjbGFyYXRpb247XG4gIC8qKlxuICAgKiBUaGUgTmdNb2R1bGUgY2xhc3MgZGVjbGFyYXRpb24gKGluIHRoZSAuZC50cyBmaWxlKSB0byBhZGQgYXMgYSB0eXBlIHBhcmFtZXRlci5cbiAgICovXG4gIG5nTW9kdWxlOiBDb25jcmV0ZURlY2xhcmF0aW9uPENsYXNzRGVjbGFyYXRpb24+O1xufVxuXG5leHBvcnQgdHlwZSBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXT47XG5leHBvcnQgY29uc3QgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gTWFwO1xuXG5leHBvcnQgY2xhc3MgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcHJvY2Vzc0R0czogYm9vbGVhbikge31cblxuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzIHtcbiAgICBjb25zdCBhbmFseXNlcyA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMoKTtcbiAgICBjb25zdCByb290RmlsZXMgPSB0aGlzLmdldFJvb3RGaWxlcyhwcm9ncmFtKTtcbiAgICByb290RmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgIGNvbnN0IGZucyA9IHRoaXMuaG9zdC5nZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGYpO1xuICAgICAgZm5zICYmIGZucy5mb3JFYWNoKGZuID0+IHtcbiAgICAgICAgaWYgKGZuLm5nTW9kdWxlLnZpYU1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIFJlY29yZCB0aGUgdXNhZ2Ugb2YgYW4gaW50ZXJuYWwgbW9kdWxlIGFzIGl0IG5lZWRzIHRvIGJlY29tZSBhbiBleHBvcnRlZCBzeW1ib2xcbiAgICAgICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQoZm4ubmdNb2R1bGUubm9kZSwgbmV3IFJlZmVyZW5jZShmbi5uZ01vZHVsZS5ub2RlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IHdoZW4gcHJvY2Vzc2luZyB0aGUgZHRzIGZpbGVzIGRvIHdlIG5lZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGRlY2xhcmF0aW9uIHRvIHVwZGF0ZS5cbiAgICAgICAgaWYgKHRoaXMucHJvY2Vzc0R0cykge1xuICAgICAgICAgIGNvbnN0IGR0c0ZuID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbkZvckZ1bmN0aW9uKGZuKTtcbiAgICAgICAgICBjb25zdCB0eXBlUGFyYW0gPSBkdHNGbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZHRzRm4udHlwZSkgJiZcbiAgICAgICAgICAgICAgICAgIGR0c0ZuLnR5cGUudHlwZUFyZ3VtZW50cyAmJiBkdHNGbi50eXBlLnR5cGVBcmd1bWVudHNbMF0gfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBpZiAoIXR5cGVQYXJhbSB8fCBpc0FueUtleXdvcmQodHlwZVBhcmFtKSkge1xuICAgICAgICAgICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLnJlc29sdmVOZ01vZHVsZVJlZmVyZW5jZShmbik7XG4gICAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRm4uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgICAgY29uc3QgYW5hbHlzaXMgPSBhbmFseXNlcy5oYXMoZHRzRmlsZSkgPyBhbmFseXNlcy5nZXQoZHRzRmlsZSkgOiBbXTtcbiAgICAgICAgICAgIGFuYWx5c2lzLnB1c2goe2RlY2xhcmF0aW9uOiBkdHNGbiwgbmdNb2R1bGV9KTtcbiAgICAgICAgICAgIGFuYWx5c2VzLnNldChkdHNGaWxlLCBhbmFseXNpcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYW5hbHlzZXM7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RGaWxlcyhwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZVtdIHtcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKCkubWFwKGYgPT4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGYpKS5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RHRzRGVjbGFyYXRpb25Gb3JGdW5jdGlvbihmbjogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uKSB7XG4gICAgbGV0IGR0c0ZuOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgICBjb25zdCBjb250YWluZXJDbGFzcyA9IGZuLmNvbnRhaW5lciAmJiB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woZm4uY29udGFpbmVyKTtcbiAgICBpZiAoY29udGFpbmVyQ2xhc3MpIHtcbiAgICAgIGNvbnN0IGR0c0NsYXNzID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbnRhaW5lckNsYXNzLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgLy8gR2V0IHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgbWF0Y2hpbmcgc3RhdGljIG1ldGhvZFxuICAgICAgZHRzRm4gPSBkdHNDbGFzcyAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzQ2xhc3MpID9cbiAgICAgICAgICBkdHNDbGFzcy5tZW1iZXJzXG4gICAgICAgICAgICAgIC5maW5kKFxuICAgICAgICAgICAgICAgICAgbWVtYmVyID0+IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obWVtYmVyKSAmJiB0cy5pc0lkZW50aWZpZXIobWVtYmVyLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUudGV4dCA9PT0gZm4ubmFtZSkgYXMgdHMuRGVjbGFyYXRpb24gOlxuICAgICAgICAgIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGR0c0ZuID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGZuLmRlY2xhcmF0aW9uKTtcbiAgICB9XG4gICAgaWYgKCFkdHNGbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbWlzc2luZ2ApO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZChkdHNGbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgTWF0Y2hpbmcgdHlwZSBkZWNsYXJhdGlvbiBmb3IgJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG5vdCBhIGZ1bmN0aW9uOiAke2R0c0ZuLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGR0c0ZuO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTmdNb2R1bGVSZWZlcmVuY2UoZm46IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbik6XG4gICAgICBDb25jcmV0ZURlY2xhcmF0aW9uPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBuZ01vZHVsZSA9IGZuLm5nTW9kdWxlO1xuXG4gICAgLy8gRm9yIGV4dGVybmFsIG1vZHVsZSByZWZlcmVuY2VzLCB1c2UgdGhlIGRlY2xhcmF0aW9uIGFzIGlzLlxuICAgIGlmIChuZ01vZHVsZS52aWFNb2R1bGUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBuZ01vZHVsZTtcbiAgICB9XG5cbiAgICAvLyBGb3IgaW50ZXJuYWwgKG5vbi1saWJyYXJ5KSBtb2R1bGUgcmVmZXJlbmNlcywgcmVkaXJlY3QgdGhlIG1vZHVsZSdzIHZhbHVlIGRlY2xhcmF0aW9uXG4gICAgLy8gdG8gaXRzIHR5cGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgZHRzTmdNb2R1bGUgPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24obmdNb2R1bGUubm9kZSk7XG4gICAgaWYgKCFkdHNOZ01vZHVsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBObyB0eXBpbmdzIGRlY2xhcmF0aW9uIGNhbiBiZSBmb3VuZCBmb3IgdGhlIHJlZmVyZW5jZWQgTmdNb2R1bGUgY2xhc3MgaW4gJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9LmApO1xuICAgIH1cbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNOZ01vZHVsZSkgfHwgIWhhc05hbWVJZGVudGlmaWVyKGR0c05nTW9kdWxlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUaGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbm90IGEgbmFtZWQgY2xhc3MgZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbTsgaW5zdGVhZCB3ZSBnZXQgJHtkdHNOZ01vZHVsZS5nZXRUZXh0KCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtub2RlOiBkdHNOZ01vZHVsZSwgdmlhTW9kdWxlOiBudWxsfTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBkZWNsYXJhdGlvbiBpcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG59XG5cbmZ1bmN0aW9uIGlzQW55S2V5d29yZCh0eXBlUGFyYW06IHRzLlR5cGVOb2RlKTogdHlwZVBhcmFtIGlzIHRzLktleXdvcmRUeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlUGFyYW0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5BbnlLZXl3b3JkO1xufVxuIl19