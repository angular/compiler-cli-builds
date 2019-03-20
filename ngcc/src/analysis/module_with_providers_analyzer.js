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
                            var reference = new imports_1.Reference(ngModule.node);
                            reference.addIdentifier(fn.ngModule);
                            _this.referencesRegistry.add(ngModule.node, reference);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyxtRUFBcUQ7SUFHckQsOERBQW1DO0lBZ0J0QixRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUNFLHFDQUFvQixJQUF3QixFQUFVLGtCQUFzQztZQUF4RSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFBRyxDQUFDO1FBRWhHLG9EQUFjLEdBQWQsVUFBZSxPQUFtQjtZQUFsQyxpQkE0Q0M7WUEzQ0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ25ELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2pCLElBQU0sR0FBRyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRTtvQkFDbkIsSUFBTSxLQUFLLEdBQUcsS0FBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxJQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3dCQUMxRCxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFD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QUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbiwgTmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiAoaW4gdGhlIC5kLnRzIGZpbGUpIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYSBgTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3QsIGJ1dCBoYXMgYSBzaWduYXR1cmUgdGhhdCBuZWVkc1xuICAgKiBhIHR5cGUgcGFyYW1ldGVyIGFkZGluZy5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiB0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAvKipcbiAgICogVGhlIE5nTW9kdWxlIGNsYXNzIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgdG8gYWRkIGFzIGEgdHlwZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBuZ01vZHVsZTogRGVjbGFyYXRpb247XG59XG5cbmV4cG9ydCB0eXBlIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDx0cy5Tb3VyY2VGaWxlLCBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdPjtcbmV4cG9ydCBjb25zdCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSkge31cblxuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzIHtcbiAgICBjb25zdCBhbmFseXNlcyA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMoKTtcbiAgICBjb25zdCByb290RmlsZXMgPSB0aGlzLmdldFJvb3RGaWxlcyhwcm9ncmFtKTtcbiAgICByb290RmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgIGNvbnN0IGZucyA9IHRoaXMuaG9zdC5nZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGYpO1xuICAgICAgZm5zICYmIGZucy5mb3JFYWNoKGZuID0+IHtcbiAgICAgICAgY29uc3QgZHRzRm4gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uRm9yRnVuY3Rpb24oZm4pO1xuICAgICAgICBjb25zdCB0eXBlUGFyYW0gPSBkdHNGbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZHRzRm4udHlwZSkgJiZcbiAgICAgICAgICAgICAgICBkdHNGbi50eXBlLnR5cGVBcmd1bWVudHMgJiYgZHRzRm4udHlwZS50eXBlQXJndW1lbnRzWzBdIHx8XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBpZiAoIXR5cGVQYXJhbSB8fCBpc0FueUtleXdvcmQodHlwZVBhcmFtKSkge1xuICAgICAgICAgIC8vIEVpdGhlciB3ZSBkbyBub3QgaGF2ZSBhIHBhcmFtZXRlcml6ZWQgdHlwZSBvciB0aGUgdHlwZSBpcyBgYW55YC5cbiAgICAgICAgICBsZXQgbmdNb2R1bGUgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZm4ubmdNb2R1bGUpO1xuICAgICAgICAgIGlmICghbmdNb2R1bGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgQ2Fubm90IGZpbmQgYSBkZWNsYXJhdGlvbiBmb3IgTmdNb2R1bGUgJHtmbi5uZ01vZHVsZS50ZXh0fSByZWZlcmVuY2VkIGluICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBGb3IgaW50ZXJuYWwgKG5vbi1saWJyYXJ5KSBtb2R1bGUgcmVmZXJlbmNlcywgcmVkaXJlY3QgdGhlIG1vZHVsZSdzIHZhbHVlIGRlY2xhcmF0aW9uXG4gICAgICAgICAgLy8gdG8gaXRzIHR5cGUgZGVjbGFyYXRpb24uXG4gICAgICAgICAgaWYgKG5nTW9kdWxlLnZpYU1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgZHRzTmdNb2R1bGUgPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24obmdNb2R1bGUubm9kZSk7XG4gICAgICAgICAgICBpZiAoIWR0c05nTW9kdWxlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBObyB0eXBpbmdzIGRlY2xhcmF0aW9uIGNhbiBiZSBmb3VuZCBmb3IgdGhlIHJlZmVyZW5jZWQgTmdNb2R1bGUgY2xhc3MgaW4gJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9LmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzTmdNb2R1bGUpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBUaGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbm90IGEgY2xhc3MgZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbTsgaW5zdGVhZCB3ZSBnZXQgJHtkdHNOZ01vZHVsZS5nZXRUZXh0KCl9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNvcmQgdGhlIHVzYWdlIG9mIHRoZSBpbnRlcm5hbCBtb2R1bGUgYXMgaXQgbmVlZHMgdG8gYmVjb21lIGFuIGV4cG9ydGVkIHN5bWJvbFxuICAgICAgICAgICAgY29uc3QgcmVmZXJlbmNlID0gbmV3IFJlZmVyZW5jZShuZ01vZHVsZS5ub2RlKTtcbiAgICAgICAgICAgIHJlZmVyZW5jZS5hZGRJZGVudGlmaWVyKGZuLm5nTW9kdWxlKTtcbiAgICAgICAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChuZ01vZHVsZS5ub2RlLCByZWZlcmVuY2UpO1xuXG4gICAgICAgICAgICBuZ01vZHVsZSA9IHtub2RlOiBkdHNOZ01vZHVsZSwgdmlhTW9kdWxlOiBudWxsfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0ZuLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2VzLmdldChkdHNGaWxlKSB8fCBbXTtcbiAgICAgICAgICBhbmFseXNpcy5wdXNoKHtkZWNsYXJhdGlvbjogZHRzRm4sIG5nTW9kdWxlfSk7XG4gICAgICAgICAgYW5hbHlzZXMuc2V0KGR0c0ZpbGUsIGFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuYWx5c2VzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290RmlsZXMocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gICAgcmV0dXJuIHByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLm1hcChmID0+IHByb2dyYW0uZ2V0U291cmNlRmlsZShmKSkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICBwcml2YXRlIGdldER0c0RlY2xhcmF0aW9uRm9yRnVuY3Rpb24oZm46IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbikge1xuICAgIGxldCBkdHNGbjogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgY29uc3QgY29udGFpbmVyQ2xhc3MgPSBmbi5jb250YWluZXIgJiYgdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGZuLmNvbnRhaW5lcik7XG4gICAgaWYgKGNvbnRhaW5lckNsYXNzKSB7XG4gICAgICBjb25zdCBkdHNDbGFzcyA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihjb250YWluZXJDbGFzcy52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgIC8vIEdldCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIG1hdGNoaW5nIHN0YXRpYyBtZXRob2RcbiAgICAgIGR0c0ZuID0gZHRzQ2xhc3MgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0NsYXNzKSA/XG4gICAgICAgICAgZHRzQ2xhc3MubWVtYmVyc1xuICAgICAgICAgICAgICAuZmluZChcbiAgICAgICAgICAgICAgICAgIG1lbWJlciA9PiB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG1lbWJlcikgJiYgdHMuaXNJZGVudGlmaWVyKG1lbWJlci5uYW1lKSAmJlxuICAgICAgICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLnRleHQgPT09IGZuLm5hbWUpIGFzIHRzLkRlY2xhcmF0aW9uIDpcbiAgICAgICAgICBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBkdHNGbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihmbi5kZWNsYXJhdGlvbik7XG4gICAgfVxuICAgIGlmICghZHRzRm4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF0Y2hpbmcgdHlwZSBkZWNsYXJhdGlvbiBmb3IgJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG1pc3NpbmdgKTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uT3JNZXRob2QoZHRzRm4pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE1hdGNoaW5nIHR5cGUgZGVjbGFyYXRpb24gZm9yICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpcyBub3QgYSBmdW5jdGlvbjogJHtkdHNGbi5nZXRUZXh0KCl9YCk7XG4gICAgfVxuICAgIHJldHVybiBkdHNGbjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBkZWNsYXJhdGlvbiBpcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG59XG5cbmZ1bmN0aW9uIGlzQW55S2V5d29yZCh0eXBlUGFyYW06IHRzLlR5cGVOb2RlKTogdHlwZVBhcmFtIGlzIHRzLktleXdvcmRUeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlUGFyYW0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5BbnlLZXl3b3JkO1xufVxuIl19