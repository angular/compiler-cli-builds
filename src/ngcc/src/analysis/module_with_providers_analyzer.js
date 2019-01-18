(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/module_with_providers_analyzer", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
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
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
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
                    var dtsFn = _this.getDtsDeclaration(fn.declaration);
                    var typeParam = dtsFn.type && ts.isTypeReferenceNode(dtsFn.type) &&
                        dtsFn.type.typeArguments && dtsFn.type.typeArguments[0] ||
                        null;
                    if (!typeParam || isAnyKeyword(typeParam)) {
                        // Either we do not have a parameterized type or the type is `any`.
                        var ngModule = _this.host.getDeclarationOfIdentifier(fn.ngModule);
                        if (!ngModule) {
                            throw new Error("Cannot find a declaration for NgModule " + fn.ngModule.text + " referenced in " + fn.declaration.getText());
                        }
                        // For internal (non-library) module references, redirect the module's value declaration
                        // to its type declaration.
                        if (ngModule.viaModule === null) {
                            var dtsNgModule = _this.host.getDtsDeclaration(ngModule.node);
                            if (!dtsNgModule) {
                                throw new Error("No typings declaration can be found for the referenced NgModule class in " + fn.declaration.getText() + ".");
                            }
                            if (!ts.isClassDeclaration(dtsNgModule)) {
                                throw new Error("The referenced NgModule in " + fn.declaration.getText() + " is not a class declaration in the typings program; instead we get " + dtsNgModule.getText());
                            }
                            // Record the usage of the internal module as it needs to become an exported symbol
                            _this.referencesRegistry.add(ngModule.node, new imports_1.ResolvedReference(ngModule.node, fn.ngModule));
                            ngModule = { node: dtsNgModule, viaModule: null };
                        }
                        var dtsFile = dtsFn.getSourceFile();
                        var analysis = analyses.get(dtsFile) || [];
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
        ModuleWithProvidersAnalyzer.prototype.getDtsDeclaration = function (fn) {
            var dtsFn = null;
            var containerClass = this.host.getClassSymbol(fn.parent);
            var fnName = fn.name && ts.isIdentifier(fn.name) && fn.name.text;
            if (containerClass && fnName) {
                var dtsClass = this.host.getDtsDeclaration(containerClass.valueDeclaration);
                // Get the declaration of the matching static method
                dtsFn = dtsClass && ts.isClassDeclaration(dtsClass) ?
                    dtsClass.members
                        .find(function (member) { return ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) &&
                        member.name.text === fnName; }) :
                    null;
            }
            else {
                dtsFn = this.host.getDtsDeclaration(fn);
            }
            if (!dtsFn) {
                throw new Error("Matching type declaration for " + fn.getText() + " is missing");
            }
            if (!isFunctionOrMethod(dtsFn)) {
                throw new Error("Matching type declaration for " + fn.getText() + " is not a function: " + dtsFn.getText());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFHakMsbUVBQXlEO0lBR3pELGtFQUFtQztJQWdCdEIsUUFBQSwyQkFBMkIsR0FBRyxHQUFHLENBQUM7SUFFL0M7UUFDRSxxQ0FBb0IsSUFBd0IsRUFBVSxrQkFBc0M7WUFBeEUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQUcsQ0FBQztRQUVoRyxvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFBbEMsaUJBMkNDO1lBMUNDLElBQU0sUUFBUSxHQUFHLElBQUksbUNBQTJCLEVBQUUsQ0FBQztZQUNuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDO2dCQUNqQixJQUFNLEdBQUcsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7b0JBQ25CLElBQU0sS0FBSyxHQUFHLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ3JELElBQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLEtB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QUMxQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtSZXNvbHZlZFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiAoaW4gdGhlIC5kLnRzIGZpbGUpIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYSBgTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3QsIGJ1dCBoYXMgYSBzaWduYXR1cmUgdGhhdCBuZWVkc1xuICAgKiBhIHR5cGUgcGFyYW1ldGVyIGFkZGluZy5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiB0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAvKipcbiAgICogVGhlIE5nTW9kdWxlIGNsYXNzIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgdG8gYWRkIGFzIGEgdHlwZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBuZ01vZHVsZTogRGVjbGFyYXRpb247XG59XG5cbmV4cG9ydCB0eXBlIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDx0cy5Tb3VyY2VGaWxlLCBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdPjtcbmV4cG9ydCBjb25zdCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSkge31cblxuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzIHtcbiAgICBjb25zdCBhbmFseXNlcyA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMoKTtcbiAgICBjb25zdCByb290RmlsZXMgPSB0aGlzLmdldFJvb3RGaWxlcyhwcm9ncmFtKTtcbiAgICByb290RmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgIGNvbnN0IGZucyA9IHRoaXMuaG9zdC5nZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGYpO1xuICAgICAgZm5zICYmIGZucy5mb3JFYWNoKGZuID0+IHtcbiAgICAgICAgY29uc3QgZHRzRm4gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGZuLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgY29uc3QgdHlwZVBhcmFtID0gZHRzRm4udHlwZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGR0c0ZuLnR5cGUpICYmXG4gICAgICAgICAgICAgICAgZHRzRm4udHlwZS50eXBlQXJndW1lbnRzICYmIGR0c0ZuLnR5cGUudHlwZUFyZ3VtZW50c1swXSB8fFxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKCF0eXBlUGFyYW0gfHwgaXNBbnlLZXl3b3JkKHR5cGVQYXJhbSkpIHtcbiAgICAgICAgICAvLyBFaXRoZXIgd2UgZG8gbm90IGhhdmUgYSBwYXJhbWV0ZXJpemVkIHR5cGUgb3IgdGhlIHR5cGUgaXMgYGFueWAuXG4gICAgICAgICAgbGV0IG5nTW9kdWxlID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGZuLm5nTW9kdWxlKTtcbiAgICAgICAgICBpZiAoIW5nTW9kdWxlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYENhbm5vdCBmaW5kIGEgZGVjbGFyYXRpb24gZm9yIE5nTW9kdWxlICR7Zm4ubmdNb2R1bGUudGV4dH0gcmVmZXJlbmNlZCBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gRm9yIGludGVybmFsIChub24tbGlicmFyeSkgbW9kdWxlIHJlZmVyZW5jZXMsIHJlZGlyZWN0IHRoZSBtb2R1bGUncyB2YWx1ZSBkZWNsYXJhdGlvblxuICAgICAgICAgIC8vIHRvIGl0cyB0eXBlIGRlY2xhcmF0aW9uLlxuICAgICAgICAgIGlmIChuZ01vZHVsZS52aWFNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGR0c05nTW9kdWxlID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKG5nTW9kdWxlLm5vZGUpO1xuICAgICAgICAgICAgaWYgKCFkdHNOZ01vZHVsZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgTm8gdHlwaW5ncyBkZWNsYXJhdGlvbiBjYW4gYmUgZm91bmQgZm9yIHRoZSByZWZlcmVuY2VkIE5nTW9kdWxlIGNsYXNzIGluICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfS5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c05nTW9kdWxlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgVGhlIHJlZmVyZW5jZWQgTmdNb2R1bGUgaW4gJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG5vdCBhIGNsYXNzIGRlY2xhcmF0aW9uIGluIHRoZSB0eXBpbmdzIHByb2dyYW07IGluc3RlYWQgd2UgZ2V0ICR7ZHRzTmdNb2R1bGUuZ2V0VGV4dCgpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVjb3JkIHRoZSB1c2FnZSBvZiB0aGUgaW50ZXJuYWwgbW9kdWxlIGFzIGl0IG5lZWRzIHRvIGJlY29tZSBhbiBleHBvcnRlZCBzeW1ib2xcbiAgICAgICAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChcbiAgICAgICAgICAgICAgICBuZ01vZHVsZS5ub2RlLCBuZXcgUmVzb2x2ZWRSZWZlcmVuY2UobmdNb2R1bGUubm9kZSwgZm4ubmdNb2R1bGUpKTtcblxuICAgICAgICAgICAgbmdNb2R1bGUgPSB7bm9kZTogZHRzTmdNb2R1bGUsIHZpYU1vZHVsZTogbnVsbH07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNGbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgY29uc3QgYW5hbHlzaXMgPSBhbmFseXNlcy5nZXQoZHRzRmlsZSkgfHwgW107XG4gICAgICAgICAgYW5hbHlzaXMucHVzaCh7ZGVjbGFyYXRpb246IGR0c0ZuLCBuZ01vZHVsZX0pO1xuICAgICAgICAgIGFuYWx5c2VzLnNldChkdHNGaWxlLCBhbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBhbmFseXNlcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Um9vdEZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBwcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKS5tYXAoZiA9PiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZikpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREdHNEZWNsYXJhdGlvbihmbjogdHMuU2lnbmF0dXJlRGVjbGFyYXRpb24pIHtcbiAgICBsZXQgZHRzRm46IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGNvbnRhaW5lckNsYXNzID0gdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGZuLnBhcmVudCk7XG4gICAgY29uc3QgZm5OYW1lID0gZm4ubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIoZm4ubmFtZSkgJiYgZm4ubmFtZS50ZXh0O1xuICAgIGlmIChjb250YWluZXJDbGFzcyAmJiBmbk5hbWUpIHtcbiAgICAgIGNvbnN0IGR0c0NsYXNzID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbnRhaW5lckNsYXNzLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgLy8gR2V0IHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgbWF0Y2hpbmcgc3RhdGljIG1ldGhvZFxuICAgICAgZHRzRm4gPSBkdHNDbGFzcyAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzQ2xhc3MpID9cbiAgICAgICAgICBkdHNDbGFzcy5tZW1iZXJzXG4gICAgICAgICAgICAgIC5maW5kKFxuICAgICAgICAgICAgICAgICAgbWVtYmVyID0+IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obWVtYmVyKSAmJiB0cy5pc0lkZW50aWZpZXIobWVtYmVyLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUudGV4dCA9PT0gZm5OYW1lKSBhcyB0cy5EZWNsYXJhdGlvbiA6XG4gICAgICAgICAgbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZHRzRm4gPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZm4pO1xuICAgIH1cbiAgICBpZiAoIWR0c0ZuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1hdGNoaW5nIHR5cGUgZGVjbGFyYXRpb24gZm9yICR7Zm4uZ2V0VGV4dCgpfSBpcyBtaXNzaW5nYCk7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kKGR0c0ZuKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke2ZuLmdldFRleHQoKX0gaXMgbm90IGEgZnVuY3Rpb246ICR7ZHRzRm4uZ2V0VGV4dCgpfWApO1xuICAgIH1cbiAgICByZXR1cm4gZHRzRm47XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uT3JNZXRob2QoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogZGVjbGFyYXRpb24gaXMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnxcbiAgICB0cy5NZXRob2REZWNsYXJhdGlvbiB7XG4gIHJldHVybiB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xufVxuXG5mdW5jdGlvbiBpc0FueUtleXdvcmQodHlwZVBhcmFtOiB0cy5UeXBlTm9kZSk6IHR5cGVQYXJhbSBpcyB0cy5LZXl3b3JkVHlwZU5vZGUge1xuICByZXR1cm4gdHlwZVBhcmFtLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQW55S2V5d29yZDtcbn1cbiJdfQ==