(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModuleWithProvidersAnalyzer = exports.ModuleWithProvidersAnalyses = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    exports.ModuleWithProvidersAnalyses = Map;
    var ModuleWithProvidersAnalyzer = /** @class */ (function () {
        function ModuleWithProvidersAnalyzer(host, typeChecker, referencesRegistry, processDts) {
            this.host = host;
            this.typeChecker = typeChecker;
            this.referencesRegistry = referencesRegistry;
            this.processDts = processDts;
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.host, this.typeChecker, null);
        }
        ModuleWithProvidersAnalyzer.prototype.analyzeProgram = function (program) {
            var _this = this;
            var analyses = new exports.ModuleWithProvidersAnalyses();
            var rootFiles = this.getRootFiles(program);
            rootFiles.forEach(function (f) {
                var fns = _this.getModuleWithProvidersFunctions(f);
                fns && fns.forEach(function (fn) {
                    if (fn.ngModule.bestGuessOwningModule === null) {
                        // Record the usage of an internal module as it needs to become an exported symbol
                        _this.referencesRegistry.add(fn.ngModule.node, new imports_1.Reference(fn.ngModule.node));
                    }
                    // Only when processing the dts files do we need to determine which declaration to update.
                    if (_this.processDts) {
                        var dtsFn = _this.getDtsModuleWithProvidersFunction(fn);
                        var dtsFnType = dtsFn.declaration.type;
                        var typeParam = dtsFnType && ts.isTypeReferenceNode(dtsFnType) &&
                            dtsFnType.typeArguments && dtsFnType.typeArguments[0] ||
                            null;
                        if (!typeParam || isAnyKeyword(typeParam)) {
                            var dtsFile = dtsFn.declaration.getSourceFile();
                            var analysis = analyses.has(dtsFile) ? analyses.get(dtsFile) : [];
                            analysis.push(dtsFn);
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
        ModuleWithProvidersAnalyzer.prototype.getModuleWithProvidersFunctions = function (f) {
            var _this = this;
            var exports = this.host.getExportsOfModule(f);
            if (!exports)
                return [];
            var infos = [];
            exports.forEach(function (declaration) {
                if (declaration.node === null) {
                    return;
                }
                if (_this.host.isClass(declaration.node)) {
                    _this.host.getMembersOfClass(declaration.node).forEach(function (member) {
                        if (member.isStatic) {
                            var info = _this.parseForModuleWithProviders(member.name, member.node, member.implementation, declaration.node);
                            if (info) {
                                infos.push(info);
                            }
                        }
                    });
                }
                else {
                    if (utils_1.hasNameIdentifier(declaration.node)) {
                        var info = _this.parseForModuleWithProviders(declaration.node.name.text, declaration.node);
                        if (info) {
                            infos.push(info);
                        }
                    }
                }
            });
            return infos;
        };
        /**
         * Parse a function/method node (or its implementation), to see if it returns a
         * `ModuleWithProviders` object.
         * @param name The name of the function.
         * @param node the node to check - this could be a function, a method or a variable declaration.
         * @param implementation the actual function expression if `node` is a variable declaration.
         * @param container the class that contains the function, if it is a method.
         * @returns info about the function if it does return a `ModuleWithProviders` object; `null`
         * otherwise.
         */
        ModuleWithProvidersAnalyzer.prototype.parseForModuleWithProviders = function (name, node, implementation, container) {
            if (implementation === void 0) { implementation = node; }
            if (container === void 0) { container = null; }
            if (implementation === null ||
                (!ts.isFunctionDeclaration(implementation) && !ts.isMethodDeclaration(implementation) &&
                    !ts.isFunctionExpression(implementation))) {
                return null;
            }
            var declaration = implementation;
            var definition = this.host.getDefinitionOfFunction(declaration);
            if (definition === null) {
                return null;
            }
            var body = definition.body;
            if (body === null || body.length === 0) {
                return null;
            }
            // Get hold of the return statement expression for the function
            var lastStatement = body[body.length - 1];
            if (!ts.isReturnStatement(lastStatement) || lastStatement.expression === undefined) {
                return null;
            }
            // Evaluate this expression and extract the `ngModule` reference
            var result = this.evaluator.evaluate(lastStatement.expression);
            if (!(result instanceof Map) || !result.has('ngModule')) {
                return null;
            }
            var ngModuleRef = result.get('ngModule');
            if (!(ngModuleRef instanceof imports_1.Reference)) {
                return null;
            }
            if (!reflection_1.isNamedClassDeclaration(ngModuleRef.node) &&
                !reflection_1.isNamedVariableDeclaration(ngModuleRef.node)) {
                throw new Error("The identity given by " + ngModuleRef.debugName + " referenced in \"" + declaration.getText() + "\" doesn't appear to be a \"class\" declaration.");
            }
            var ngModule = ngModuleRef;
            return { name: name, ngModule: ngModule, declaration: declaration, container: container };
        };
        ModuleWithProvidersAnalyzer.prototype.getDtsModuleWithProvidersFunction = function (fn) {
            var dtsFn = null;
            var containerClass = fn.container && this.host.getClassSymbol(fn.container);
            if (containerClass) {
                var dtsClass = this.host.getDtsDeclaration(containerClass.declaration.valueDeclaration);
                // Get the declaration of the matching static method
                dtsFn = dtsClass && ts.isClassDeclaration(dtsClass) ?
                    dtsClass.members.find(function (member) { return ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) &&
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
            var container = containerClass ? containerClass.declaration.valueDeclaration : null;
            var ngModule = this.resolveNgModuleReference(fn);
            return { name: fn.name, container: container, declaration: dtsFn, ngModule: ngModule };
        };
        ModuleWithProvidersAnalyzer.prototype.resolveNgModuleReference = function (fn) {
            var ngModule = fn.ngModule;
            // For external module references, use the declaration as is.
            if (ngModule.bestGuessOwningModule !== null) {
                return ngModule;
            }
            // For internal (non-library) module references, redirect the module's value declaration
            // to its type declaration.
            var dtsNgModule = this.host.getDtsDeclaration(ngModule.node);
            if (!dtsNgModule) {
                throw new Error("No typings declaration can be found for the referenced NgModule class in " + fn.declaration.getText() + ".");
            }
            if (!reflection_1.isNamedClassDeclaration(dtsNgModule)) {
                throw new Error("The referenced NgModule in " + fn.declaration
                    .getText() + " is not a named class declaration in the typings program; instead we get " + dtsNgModule.getText());
            }
            return new imports_1.Reference(dtsNgModule, null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFHakMsbUVBQXFEO0lBQ3JELHVGQUFzRTtJQUN0RSx5RUFBb0g7SUFFcEgsOERBQXNEO0lBMkJ6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUdFLHFDQUNZLElBQXdCLEVBQVUsV0FBMkIsRUFDN0Qsa0JBQXNDLEVBQVUsVUFBbUI7WUFEbkUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFDN0QsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQVM7WUFKdkUsY0FBUyxHQUFHLElBQUksb0NBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBSU0sQ0FBQztRQUVuRixvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFBbEMsaUJBNEJDO1lBM0JDLElBQU0sUUFBUSxHQUFnQyxJQUFJLG1DQUEyQixFQUFFLENBQUM7WUFDaEYsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDakIsSUFBTSxHQUFHLEdBQUcsS0FBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7b0JBQ25CLElBQUksRUFBRSxD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QUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsU0FBc0I7UUFDMUMsT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO0lBQ3JELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2hhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBBIHN0cnVjdHVyZSByZXR1cm5lZCBmcm9tIGBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKClgIHRoYXQgZGVzY3JpYmVzIGZ1bmN0aW9uc1xuICogdGhhdCByZXR1cm4gTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3RzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBkZWNsYXJlZCBmdW5jdGlvbi5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0LlxuICAgKi9cbiAgZGVjbGFyYXRpb246IHRzLlNpZ25hdHVyZURlY2xhcmF0aW9uO1xuICAvKipcbiAgICogRGVjbGFyYXRpb24gb2YgdGhlIGNvbnRhaW5pbmcgY2xhc3MgKGlmIHRoaXMgaXMgYSBtZXRob2QpXG4gICAqL1xuICBjb250YWluZXI6IHRzLkRlY2xhcmF0aW9ufG51bGw7XG4gIC8qKlxuICAgKiBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIHRoYXQgdGhlIGBuZ01vZHVsZWAgcHJvcGVydHkgb24gdGhlIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3RcbiAgICogcmVmZXJzIHRvLlxuICAgKi9cbiAgbmdNb2R1bGU6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbn1cblxuZXhwb3J0IHR5cGUgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gTWFwPHRzLlNvdXJjZUZpbGUsIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10+O1xuZXhwb3J0IGNvbnN0IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDtcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciB7XG4gIHByaXZhdGUgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5ob3N0LCB0aGlzLnR5cGVDaGVja2VyLCBudWxsKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnksIHByaXZhdGUgcHJvY2Vzc0R0czogYm9vbGVhbikge31cblxuICBhbmFseXplUHJvZ3JhbShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzIHtcbiAgICBjb25zdCBhbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcygpO1xuICAgIGNvbnN0IHJvb3RGaWxlcyA9IHRoaXMuZ2V0Um9vdEZpbGVzKHByb2dyYW0pO1xuICAgIHJvb3RGaWxlcy5mb3JFYWNoKGYgPT4ge1xuICAgICAgY29uc3QgZm5zID0gdGhpcy5nZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGYpO1xuICAgICAgZm5zICYmIGZucy5mb3JFYWNoKGZuID0+IHtcbiAgICAgICAgaWYgKGZuLm5nTW9kdWxlLmJlc3RHdWVzc093bmluZ01vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIFJlY29yZCB0aGUgdXNhZ2Ugb2YgYW4gaW50ZXJuYWwgbW9kdWxlIGFzIGl0IG5lZWRzIHRvIGJlY29tZSBhbiBleHBvcnRlZCBzeW1ib2xcbiAgICAgICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQoZm4ubmdNb2R1bGUubm9kZSwgbmV3IFJlZmVyZW5jZShmbi5uZ01vZHVsZS5ub2RlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IHdoZW4gcHJvY2Vzc2luZyB0aGUgZHRzIGZpbGVzIGRvIHdlIG5lZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIGRlY2xhcmF0aW9uIHRvIHVwZGF0ZS5cbiAgICAgICAgaWYgKHRoaXMucHJvY2Vzc0R0cykge1xuICAgICAgICAgIGNvbnN0IGR0c0ZuID0gdGhpcy5nZXREdHNNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24oZm4pO1xuICAgICAgICAgIGNvbnN0IGR0c0ZuVHlwZSA9IGR0c0ZuLmRlY2xhcmF0aW9uLnR5cGU7XG4gICAgICAgICAgY29uc3QgdHlwZVBhcmFtID0gZHRzRm5UeXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZHRzRm5UeXBlKSAmJlxuICAgICAgICAgICAgICAgICAgZHRzRm5UeXBlLnR5cGVBcmd1bWVudHMgJiYgZHRzRm5UeXBlLnR5cGVBcmd1bWVudHNbMF0gfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBpZiAoIXR5cGVQYXJhbSB8fCBpc0FueUtleXdvcmQodHlwZVBhcmFtKSkge1xuICAgICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0ZuLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICAgIGNvbnN0IGFuYWx5c2lzID0gYW5hbHlzZXMuaGFzKGR0c0ZpbGUpID8gYW5hbHlzZXMuZ2V0KGR0c0ZpbGUpISA6IFtdO1xuICAgICAgICAgICAgYW5hbHlzaXMucHVzaChkdHNGbik7XG4gICAgICAgICAgICBhbmFseXNlcy5zZXQoZHRzRmlsZSwgYW5hbHlzaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFuYWx5c2VzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290RmlsZXMocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gICAgcmV0dXJuIHByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpLm1hcChmID0+IHByb2dyYW0uZ2V0U291cmNlRmlsZShmKSkuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICBwcml2YXRlIGdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZjogdHMuU291cmNlRmlsZSk6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10ge1xuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdID0gW107XG4gICAgZXhwb3J0cy5mb3JFYWNoKChkZWNsYXJhdGlvbikgPT4ge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICAgIHRoaXMuaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLCBtZW1iZXIubm9kZSwgbWVtYmVyLmltcGxlbWVudGF0aW9uLCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICAgIGNvbnN0IGluZm8gPVxuICAgICAgICAgICAgICB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhkZWNsYXJhdGlvbi5ub2RlLm5hbWUudGV4dCwgZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGluZm9zO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24vbWV0aG9kIG5vZGUgKG9yIGl0cyBpbXBsZW1lbnRhdGlvbiksIHRvIHNlZSBpZiBpdCByZXR1cm5zIGFcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdC5cbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0byBjaGVjayAtIHRoaXMgY291bGQgYmUgYSBmdW5jdGlvbiwgYSBtZXRob2Qgb3IgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGltcGxlbWVudGF0aW9uIHRoZSBhY3R1YWwgZnVuY3Rpb24gZXhwcmVzc2lvbiBpZiBgbm9kZWAgaXMgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGNvbnRhaW5lciB0aGUgY2xhc3MgdGhhdCBjb250YWlucyB0aGUgZnVuY3Rpb24sIGlmIGl0IGlzIGEgbWV0aG9kLlxuICAgKiBAcmV0dXJucyBpbmZvIGFib3V0IHRoZSBmdW5jdGlvbiBpZiBpdCBkb2VzIHJldHVybiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3Q7IGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhcbiAgICAgIG5hbWU6IHN0cmluZywgbm9kZTogdHMuTm9kZXxudWxsLCBpbXBsZW1lbnRhdGlvbjogdHMuTm9kZXxudWxsID0gbm9kZSxcbiAgICAgIGNvbnRhaW5lcjogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGwpOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb3xudWxsIHtcbiAgICBpZiAoaW1wbGVtZW50YXRpb24gPT09IG51bGwgfHxcbiAgICAgICAgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmICF0cy5pc01ldGhvZERlY2xhcmF0aW9uKGltcGxlbWVudGF0aW9uKSAmJlxuICAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGltcGxlbWVudGF0aW9uKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGltcGxlbWVudGF0aW9uO1xuICAgIGNvbnN0IGRlZmluaXRpb24gPSB0aGlzLmhvc3QuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChkZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBib2R5ID0gZGVmaW5pdGlvbi5ib2R5O1xuICAgIGlmIChib2R5ID09PSBudWxsIHx8IGJvZHkubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBHZXQgaG9sZCBvZiB0aGUgcmV0dXJuIHN0YXRlbWVudCBleHByZXNzaW9uIGZvciB0aGUgZnVuY3Rpb25cbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID0gYm9keVtib2R5Lmxlbmd0aCAtIDFdO1xuICAgIGlmICghdHMuaXNSZXR1cm5TdGF0ZW1lbnQobGFzdFN0YXRlbWVudCkgfHwgbGFzdFN0YXRlbWVudC5leHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEV2YWx1YXRlIHRoaXMgZXhwcmVzc2lvbiBhbmQgZXh0cmFjdCB0aGUgYG5nTW9kdWxlYCByZWZlcmVuY2VcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShsYXN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xuICAgIGlmICghKHJlc3VsdCBpbnN0YW5jZW9mIE1hcCkgfHwgIXJlc3VsdC5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlUmVmID0gcmVzdWx0LmdldCgnbmdNb2R1bGUnKSE7XG4gICAgaWYgKCEobmdNb2R1bGVSZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5nTW9kdWxlUmVmLm5vZGUpICYmXG4gICAgICAgICFpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihuZ01vZHVsZVJlZi5ub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgaWRlbnRpdHkgZ2l2ZW4gYnkgJHtuZ01vZHVsZVJlZi5kZWJ1Z05hbWV9IHJlZmVyZW5jZWQgaW4gXCIke1xuICAgICAgICAgIGRlY2xhcmF0aW9uIS5nZXRUZXh0KCl9XCIgZG9lc24ndCBhcHBlYXIgdG8gYmUgYSBcImNsYXNzXCIgZGVjbGFyYXRpb24uYCk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGUgPSBuZ01vZHVsZVJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj47XG4gICAgcmV0dXJuIHtuYW1lLCBuZ01vZHVsZSwgZGVjbGFyYXRpb24sIGNvbnRhaW5lcn07XG4gIH1cblxuICBwcml2YXRlIGdldER0c01vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbihmbjogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm8pOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mbyB7XG4gICAgbGV0IGR0c0ZuOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgICBjb25zdCBjb250YWluZXJDbGFzcyA9IGZuLmNvbnRhaW5lciAmJiB0aGlzLmhvc3QuZ2V0Q2xhc3NTeW1ib2woZm4uY29udGFpbmVyKTtcbiAgICBpZiAoY29udGFpbmVyQ2xhc3MpIHtcbiAgICAgIGNvbnN0IGR0c0NsYXNzID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbnRhaW5lckNsYXNzLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgLy8gR2V0IHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgbWF0Y2hpbmcgc3RhdGljIG1ldGhvZFxuICAgICAgZHRzRm4gPSBkdHNDbGFzcyAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzQ2xhc3MpID9cbiAgICAgICAgICBkdHNDbGFzcy5tZW1iZXJzLmZpbmQoXG4gICAgICAgICAgICAgIG1lbWJlciA9PiB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG1lbWJlcikgJiYgdHMuaXNJZGVudGlmaWVyKG1lbWJlci5uYW1lKSAmJlxuICAgICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUudGV4dCA9PT0gZm4ubmFtZSkgYXMgdHMuRGVjbGFyYXRpb24gOlxuICAgICAgICAgIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGR0c0ZuID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGZuLmRlY2xhcmF0aW9uKTtcbiAgICB9XG4gICAgaWYgKCFkdHNGbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke2ZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbWlzc2luZ2ApO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZChkdHNGbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWF0Y2hpbmcgdHlwZSBkZWNsYXJhdGlvbiBmb3IgJHtcbiAgICAgICAgICBmbi5kZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGlzIG5vdCBhIGZ1bmN0aW9uOiAke2R0c0ZuLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgY29uc3QgY29udGFpbmVyID0gY29udGFpbmVyQ2xhc3MgPyBjb250YWluZXJDbGFzcy5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uIDogbnVsbDtcbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMucmVzb2x2ZU5nTW9kdWxlUmVmZXJlbmNlKGZuKTtcbiAgICByZXR1cm4ge25hbWU6IGZuLm5hbWUsIGNvbnRhaW5lciwgZGVjbGFyYXRpb246IGR0c0ZuLCBuZ01vZHVsZX07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVOZ01vZHVsZVJlZmVyZW5jZShmbjogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm8pOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IG5nTW9kdWxlID0gZm4ubmdNb2R1bGU7XG5cbiAgICAvLyBGb3IgZXh0ZXJuYWwgbW9kdWxlIHJlZmVyZW5jZXMsIHVzZSB0aGUgZGVjbGFyYXRpb24gYXMgaXMuXG4gICAgaWYgKG5nTW9kdWxlLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5nTW9kdWxlO1xuICAgIH1cblxuICAgIC8vIEZvciBpbnRlcm5hbCAobm9uLWxpYnJhcnkpIG1vZHVsZSByZWZlcmVuY2VzLCByZWRpcmVjdCB0aGUgbW9kdWxlJ3MgdmFsdWUgZGVjbGFyYXRpb25cbiAgICAvLyB0byBpdHMgdHlwZSBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCBkdHNOZ01vZHVsZSA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihuZ01vZHVsZS5ub2RlKTtcbiAgICBpZiAoIWR0c05nTW9kdWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHR5cGluZ3MgZGVjbGFyYXRpb24gY2FuIGJlIGZvdW5kIGZvciB0aGUgcmVmZXJlbmNlZCBOZ01vZHVsZSBjbGFzcyBpbiAke1xuICAgICAgICAgIGZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0uYCk7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oZHRzTmdNb2R1bGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSByZWZlcmVuY2VkIE5nTW9kdWxlIGluICR7XG4gICAgICAgICAgZm4uZGVjbGFyYXRpb25cbiAgICAgICAgICAgICAgLmdldFRleHQoKX0gaXMgbm90IGEgbmFtZWQgY2xhc3MgZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbTsgaW5zdGVhZCB3ZSBnZXQgJHtcbiAgICAgICAgICBkdHNOZ01vZHVsZS5nZXRUZXh0KCl9YCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKGR0c05nTW9kdWxlLCBudWxsKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBkZWNsYXJhdGlvbiBpcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG59XG5cbmZ1bmN0aW9uIGlzQW55S2V5d29yZCh0eXBlUGFyYW06IHRzLlR5cGVOb2RlKTogdHlwZVBhcmFtIGlzIHRzLktleXdvcmRUeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlUGFyYW0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5BbnlLZXl3b3JkO1xufVxuIl19