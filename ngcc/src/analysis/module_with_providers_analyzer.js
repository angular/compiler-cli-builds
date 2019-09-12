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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyxtRUFBcUQ7SUFHckQsOERBQXNEO0lBZ0J6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUNFLHFDQUFvQixJQUF3QixFQUFVLGtCQUFzQztZQUF4RSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFBRyxDQUFDO1FBRWhHLG9EQUFjLEdBQWQsVUFBZSxPQUFtQjtZQUFsQyxpQkFzQ0M7WUFyQ0MsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ25ELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7Z0JBQ2pCLElBQU0sR0FBRyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUEsRUFBRTtvQkFDbkIsSUFBTSxLQUFLLEdBQUcsS0FBSSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxJQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3dCQUMxRCxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFD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SSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ3BFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBRHRCLENBQ3NCLENBQW1CLENBQUMsQ0FBQztvQkFDN0QsSUFBSSxDQUFDO2FBQ1Y7aUJBQU07Z0JBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3JEO1lBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDVixNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFpQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxnQkFBYSxDQUFDLENBQUM7YUFDekY7WUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQWlDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLDRCQUF1QixLQUFLLENBQUMsT0FBTyxFQUFJLENBQUMsQ0FBQzthQUN4RztZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQXZFRCxJQXVFQztJQXZFWSxrRUFBMkI7SUEwRXhDLFNBQVMsa0JBQWtCLENBQUMsV0FBMkI7UUFFckQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFzQjtRQUMxQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2Fubm90YXRpb25zJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENvbmNyZXRlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uLCBOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aGFzTmFtZUlkZW50aWZpZXIsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiAoaW4gdGhlIC5kLnRzIGZpbGUpIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYSBgTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3QsIGJ1dCBoYXMgYSBzaWduYXR1cmUgdGhhdCBuZWVkc1xuICAgKiBhIHR5cGUgcGFyYW1ldGVyIGFkZGluZy5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiB0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAvKipcbiAgICogVGhlIE5nTW9kdWxlIGNsYXNzIGRlY2xhcmF0aW9uIChpbiB0aGUgLmQudHMgZmlsZSkgdG8gYWRkIGFzIGEgdHlwZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBuZ01vZHVsZTogQ29uY3JldGVEZWNsYXJhdGlvbjxDbGFzc0RlY2xhcmF0aW9uPjtcbn1cblxuZXhwb3J0IHR5cGUgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gTWFwPHRzLlNvdXJjZUZpbGUsIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10+O1xuZXhwb3J0IGNvbnN0IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDtcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5KSB7fVxuXG4gIGFuYWx5emVQcm9ncmFtKHByb2dyYW06IHRzLlByb2dyYW0pOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMge1xuICAgIGNvbnN0IGFuYWx5c2VzID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcygpO1xuICAgIGNvbnN0IHJvb3RGaWxlcyA9IHRoaXMuZ2V0Um9vdEZpbGVzKHByb2dyYW0pO1xuICAgIHJvb3RGaWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgY29uc3QgZm5zID0gdGhpcy5ob3N0LmdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZik7XG4gICAgICBmbnMgJiYgZm5zLmZvckVhY2goZm4gPT4ge1xuICAgICAgICBjb25zdCBkdHNGbiA9IHRoaXMuZ2V0RHRzRGVjbGFyYXRpb25Gb3JGdW5jdGlvbihmbik7XG4gICAgICAgIGNvbnN0IHR5cGVQYXJhbSA9IGR0c0ZuLnR5cGUgJiYgdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkdHNGbi50eXBlKSAmJlxuICAgICAgICAgICAgICAgIGR0c0ZuLnR5cGUudHlwZUFyZ3VtZW50cyAmJiBkdHNGbi50eXBlLnR5cGVBcmd1bWVudHNbMF0gfHxcbiAgICAgICAgICAgIG51bGw7XG4gICAgICAgIGlmICghdHlwZVBhcmFtIHx8IGlzQW55S2V5d29yZCh0eXBlUGFyYW0pKSB7XG4gICAgICAgICAgLy8gRWl0aGVyIHdlIGRvIG5vdCBoYXZlIGEgcGFyYW1ldGVyaXplZCB0eXBlIG9yIHRoZSB0eXBlIGlzIGBhbnlgLlxuICAgICAgICAgIGxldCBuZ01vZHVsZSA9IGZuLm5nTW9kdWxlO1xuICAgICAgICAgIC8vIEZvciBpbnRlcm5hbCAobm9uLWxpYnJhcnkpIG1vZHVsZSByZWZlcmVuY2VzLCByZWRpcmVjdCB0aGUgbW9kdWxlJ3MgdmFsdWUgZGVjbGFyYXRpb25cbiAgICAgICAgICAvLyB0byBpdHMgdHlwZSBkZWNsYXJhdGlvbi5cbiAgICAgICAgICBpZiAobmdNb2R1bGUudmlhTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBkdHNOZ01vZHVsZSA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihuZ01vZHVsZS5ub2RlKTtcbiAgICAgICAgICAgIGlmICghZHRzTmdNb2R1bGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYE5vIHR5cGluZ3MgZGVjbGFyYXRpb24gY2FuIGJlIGZvdW5kIGZvciB0aGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBjbGFzcyBpbiAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0uYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNOZ01vZHVsZSkgfHwgIWhhc05hbWVJZGVudGlmaWVyKGR0c05nTW9kdWxlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgVGhlIHJlZmVyZW5jZWQgTmdNb2R1bGUgaW4gJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG5vdCBhIG5hbWVkIGNsYXNzIGRlY2xhcmF0aW9uIGluIHRoZSB0eXBpbmdzIHByb2dyYW07IGluc3RlYWQgd2UgZ2V0ICR7ZHRzTmdNb2R1bGUuZ2V0VGV4dCgpfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVjb3JkIHRoZSB1c2FnZSBvZiB0aGUgaW50ZXJuYWwgbW9kdWxlIGFzIGl0IG5lZWRzIHRvIGJlY29tZSBhbiBleHBvcnRlZCBzeW1ib2xcbiAgICAgICAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChuZ01vZHVsZS5ub2RlLCBuZXcgUmVmZXJlbmNlKG5nTW9kdWxlLm5vZGUpKTtcblxuICAgICAgICAgICAgbmdNb2R1bGUgPSB7bm9kZTogZHRzTmdNb2R1bGUsIHZpYU1vZHVsZTogbnVsbH07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNGbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgY29uc3QgYW5hbHlzaXMgPSBhbmFseXNlcy5oYXMoZHRzRmlsZSkgPyBhbmFseXNlcy5nZXQoZHRzRmlsZSkgOiBbXTtcbiAgICAgICAgICBhbmFseXNpcy5wdXNoKHtkZWNsYXJhdGlvbjogZHRzRm4sIG5nTW9kdWxlfSk7XG4gICAgICAgICAgYW5hbHlzZXMuc2V0KGR0c0ZpbGUsIGFuYWx5c2lzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuYWx5c2VzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290RmlsZXMocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gICAgcmV0dXJuIHByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLm1hcChmID0+IHByb2dyYW0uZ2V0U291cmNlRmlsZShmKSkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICBwcml2YXRlIGdldER0c0RlY2xhcmF0aW9uRm9yRnVuY3Rpb24oZm46IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbikge1xuICAgIGxldCBkdHNGbjogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgY29uc3QgY29udGFpbmVyQ2xhc3MgPSBmbi5jb250YWluZXIgJiYgdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGZuLmNvbnRhaW5lcik7XG4gICAgaWYgKGNvbnRhaW5lckNsYXNzKSB7XG4gICAgICBjb25zdCBkdHNDbGFzcyA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihjb250YWluZXJDbGFzcy5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgIC8vIEdldCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIG1hdGNoaW5nIHN0YXRpYyBtZXRob2RcbiAgICAgIGR0c0ZuID0gZHRzQ2xhc3MgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0NsYXNzKSA/XG4gICAgICAgICAgZHRzQ2xhc3MubWVtYmVyc1xuICAgICAgICAgICAgICAuZmluZChcbiAgICAgICAgICAgICAgICAgIG1lbWJlciA9PiB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG1lbWJlcikgJiYgdHMuaXNJZGVudGlmaWVyKG1lbWJlci5uYW1lKSAmJlxuICAgICAgICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLnRleHQgPT09IGZuLm5hbWUpIGFzIHRzLkRlY2xhcmF0aW9uIDpcbiAgICAgICAgICBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBkdHNGbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihmbi5kZWNsYXJhdGlvbik7XG4gICAgfVxuICAgIGlmICghZHRzRm4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF0Y2hpbmcgdHlwZSBkZWNsYXJhdGlvbiBmb3IgJHtmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG1pc3NpbmdgKTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uT3JNZXRob2QoZHRzRm4pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE1hdGNoaW5nIHR5cGUgZGVjbGFyYXRpb24gZm9yICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpcyBub3QgYSBmdW5jdGlvbjogJHtkdHNGbi5nZXRUZXh0KCl9YCk7XG4gICAgfVxuICAgIHJldHVybiBkdHNGbjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBkZWNsYXJhdGlvbiBpcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG59XG5cbmZ1bmN0aW9uIGlzQW55S2V5d29yZCh0eXBlUGFyYW06IHRzLlR5cGVOb2RlKTogdHlwZVBhcmFtIGlzIHRzLktleXdvcmRUeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlUGFyYW0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5BbnlLZXl3b3JkO1xufVxuIl19