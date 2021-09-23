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
     * Copyright Google LLC All Rights Reserved.
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
                    if ((0, utils_1.hasNameIdentifier)(declaration.node)) {
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
            if (!(0, reflection_1.isNamedClassDeclaration)(ngModuleRef.node) &&
                !(0, reflection_1.isNamedVariableDeclaration)(ngModuleRef.node)) {
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
            if (!(0, reflection_1.isNamedClassDeclaration)(dtsNgModule)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFHakMsbUVBQXFEO0lBQ3JELHVGQUFzRTtJQUN0RSx5RUFBcUk7SUFFckksOERBQXNEO0lBMkJ6QyxRQUFBLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztJQUUvQztRQUdFLHFDQUNZLElBQXdCLEVBQVUsV0FBMkIsRUFDN0Qsa0JBQXNDLEVBQVUsVUFBbUI7WUFEbkUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFDN0QsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQVM7WUFKdkUsY0FBUyxHQUFHLElBQUksb0NBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBSU0sQ0FBQztRQUVuRixvREFBYyxHQUFkLFVBQWUsT0FBbUI7WUFBbEMsaUJBNEJDO1lBM0JDLElBQU0sUUFBUSxHQUFnQyxJQUFJLG1DQUEyQixFQUFFLENBQUM7WUFDaEYsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQztnQkFDakIsSUFBTSxHQUFHLEdBQUcsS0FBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7b0JBQ25CLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLEVBQUU7d0JBQzlDLGtGQUFrRjt3QkFDbEYsS0FBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLG1CQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUNoRjtvQkFFRCwwRkFBMEY7b0JBQzFGLElBQUksS0FBSSxDQUFDLFVBQVUsRUFBRTt3QkFDbkIsSUFBTSxLQUFLLEdBQUcsS0FBSSxDQUFDLGlDQUFpQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUN6RCxJQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQzt3QkFDekMsSUFBTSxTQUFTLEdBQUcsU0FBUyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7NEJBQ3hELFNBQVMsQ0FBQyxhQUFhLElBQUksU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7NEJBQ3pELElBQUksQ0FBQzt3QkFDVCxJQUFJLENBQUMsU0FBUyxJQUFJLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRTs0QkFDekMsSUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQzs0QkFDbEQsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUNyRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQzt5QkFDakM7cUJBQ0Y7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFFTyxrREFBWSxHQUFwQixVQUFxQixPQUFtQjtZQUN0QyxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQXhCLENBQXdCLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFTyxxRUFBK0IsR0FBdkMsVUFBd0MsQ0FBZ0I7WUFBeEQsaUJBNkJDO1lBNUJDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLE9BQU87Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBTSxLQUFLLEdBQThCLEVBQUUsQ0FBQztZQUM1QyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUMsV0FBVztnQkFDMUIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtvQkFDN0IsT0FBTztpQkFDUjtnQkFDRCxJQUFJLEtBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDdkMsS0FBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsTUFBTTt3QkFDMUQsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFOzRCQUNuQixJQUFNLElBQUksR0FBRyxLQUFJLENBQUMsMkJBQTJCLENBQ3pDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDdkUsSUFBSSxJQUFJLEVBQUU7Z0NBQ1IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs2QkFDbEI7eUJBQ0Y7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7cUJBQU07b0JBQ0wsSUFBSSxJQUFBLHlCQUFpQixFQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDdkMsSUFBTSxJQUFJLEdBQ04sS0FBSSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ25GLElBQUksSUFBSSxFQUFFOzRCQUNSLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7eUJBQ2xCO3FCQUNGO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSyxpRUFBMkIsR0FBbkMsVUFDSSxJQUFZLEVBQUUsSUFBa0IsRUFBRSxjQUFtQyxFQUNyRSxTQUFzQztZQURKLCtCQUFBLEVBQUEscUJBQW1DO1lBQ3JFLDBCQUFBLEVBQUEsZ0JBQXNDO1lBQ3hDLElBQUksY0FBYyxLQUFLLElBQUk7Z0JBQ3ZCLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDO29CQUNwRixDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUM5QyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDO1lBQ25DLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztZQUM3QixJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3RDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCwrREFBK0Q7WUFDL0QsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDbEYsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELGdFQUFnRTtZQUNoRSxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDdkQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLENBQUMsV0FBVyxZQUFZLG1CQUFTLENBQUMsRUFBRTtnQkFDdkMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksQ0FBQyxJQUFBLG9DQUF1QixFQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQzFDLENBQUMsSUFBQSx1Q0FBMEIsRUFBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQXlCLFdBQVcsQ0FBQyxTQUFTLHlCQUMxRCxXQUFZLENBQUMsT0FBTyxFQUFFLHFEQUErQyxDQUFDLENBQUM7YUFDNUU7WUFFRCxJQUFNLFFBQVEsR0FBRyxXQUEwQyxDQUFDO1lBQzVELE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxRQUFRLFVBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxTQUFTLFdBQUEsRUFBQyxDQUFDO1FBQ2xELENBQUM7UUFFTyx1RUFBaUMsR0FBekMsVUFBMEMsRUFBMkI7WUFDbkUsSUFBSSxLQUFLLEdBQXdCLElBQUksQ0FBQztZQUN0QyxJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5RSxJQUFJLGNBQWMsRUFBRTtnQkFDbEIsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQzFGLG9EQUFvRDtnQkFDcEQsS0FBSyxHQUFHLFFBQVEsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDakQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ2pCLFVBQUEsTUFBTSxJQUFJLE9BQUEsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksRUFEdEIsQ0FDc0IsQ0FBbUIsQ0FBQyxDQUFDO29CQUN6RCxJQUFJLENBQUM7YUFDVjtpQkFBTTtnQkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQWlDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLGdCQUFhLENBQUMsQ0FBQzthQUN6RjtZQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FDWixFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSw0QkFBdUIsS0FBSyxDQUFDLE9BQU8sRUFBSSxDQUFDLENBQUM7YUFDdkU7WUFDRCxJQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0RixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkQsT0FBTyxFQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsV0FBQSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRU8sOERBQXdCLEdBQWhDLFVBQWlDLEVBQTJCO1lBQzFELElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFFN0IsNkRBQTZEO1lBQzdELElBQUksUUFBUSxDQUFDLHFCQUFxQixLQUFLLElBQUksRUFBRTtnQkFDM0MsT0FBTyxRQUFRLENBQUM7YUFDakI7WUFFRCx3RkFBd0Y7WUFDeEYsMkJBQTJCO1lBQzNCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEVBQ1osRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBRyxDQUFDLENBQUM7YUFDbEM7WUFDRCxJQUFJLENBQUMsSUFBQSxvQ0FBdUIsRUFBQyxXQUFXLENBQUMsRUFBRTtnQkFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FDWixFQUFFLENBQUMsV0FBVztxQkFDVCxPQUFPLEVBQUUsaUZBQ2QsV0FBVyxDQUFDLE9BQU8sRUFBSSxDQUFDLENBQUM7YUFDOUI7WUFDRCxPQUFPLElBQUksbUJBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQWpMRCxJQWlMQztJQWpMWSxrRUFBMkI7SUFvTHhDLFNBQVMsa0JBQWtCLENBQUMsV0FBMkI7UUFFckQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFzQjtRQUMxQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDckQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge2hhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBBIHN0cnVjdHVyZSByZXR1cm5lZCBmcm9tIGBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKClgIHRoYXQgZGVzY3JpYmVzIGZ1bmN0aW9uc1xuICogdGhhdCByZXR1cm4gTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3RzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBkZWNsYXJlZCBmdW5jdGlvbi5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0LlxuICAgKi9cbiAgZGVjbGFyYXRpb246IHRzLlNpZ25hdHVyZURlY2xhcmF0aW9uO1xuICAvKipcbiAgICogRGVjbGFyYXRpb24gb2YgdGhlIGNvbnRhaW5pbmcgY2xhc3MgKGlmIHRoaXMgaXMgYSBtZXRob2QpXG4gICAqL1xuICBjb250YWluZXI6IERlY2xhcmF0aW9uTm9kZXxudWxsO1xuICAvKipcbiAgICogVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcyB0aGF0IHRoZSBgbmdNb2R1bGVgIHByb3BlcnR5IG9uIHRoZSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0XG4gICAqIHJlZmVycyB0by5cbiAgICovXG4gIG5nTW9kdWxlOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj47XG59XG5cbmV4cG9ydCB0eXBlIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IE1hcDx0cy5Tb3VyY2VGaWxlLCBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdPjtcbmV4cG9ydCBjb25zdCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIge1xuICBwcml2YXRlIGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMuaG9zdCwgdGhpcy50eXBlQ2hlY2tlciwgbnVsbCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIHByb2Nlc3NEdHM6IGJvb2xlYW4pIHt9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyB7XG4gICAgY29uc3QgYW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMoKTtcbiAgICBjb25zdCByb290RmlsZXMgPSB0aGlzLmdldFJvb3RGaWxlcyhwcm9ncmFtKTtcbiAgICByb290RmlsZXMuZm9yRWFjaChmID0+IHtcbiAgICAgIGNvbnN0IGZucyA9IHRoaXMuZ2V0TW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ucyhmKTtcbiAgICAgIGZucyAmJiBmbnMuZm9yRWFjaChmbiA9PiB7XG4gICAgICAgIGlmIChmbi5uZ01vZHVsZS5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBSZWNvcmQgdGhlIHVzYWdlIG9mIGFuIGludGVybmFsIG1vZHVsZSBhcyBpdCBuZWVkcyB0byBiZWNvbWUgYW4gZXhwb3J0ZWQgc3ltYm9sXG4gICAgICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKGZuLm5nTW9kdWxlLm5vZGUsIG5ldyBSZWZlcmVuY2UoZm4ubmdNb2R1bGUubm9kZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSB3aGVuIHByb2Nlc3NpbmcgdGhlIGR0cyBmaWxlcyBkbyB3ZSBuZWVkIHRvIGRldGVybWluZSB3aGljaCBkZWNsYXJhdGlvbiB0byB1cGRhdGUuXG4gICAgICAgIGlmICh0aGlzLnByb2Nlc3NEdHMpIHtcbiAgICAgICAgICBjb25zdCBkdHNGbiA9IHRoaXMuZ2V0RHRzTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uKGZuKTtcbiAgICAgICAgICBjb25zdCBkdHNGblR5cGUgPSBkdHNGbi5kZWNsYXJhdGlvbi50eXBlO1xuICAgICAgICAgIGNvbnN0IHR5cGVQYXJhbSA9IGR0c0ZuVHlwZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGR0c0ZuVHlwZSkgJiZcbiAgICAgICAgICAgICAgICAgIGR0c0ZuVHlwZS50eXBlQXJndW1lbnRzICYmIGR0c0ZuVHlwZS50eXBlQXJndW1lbnRzWzBdIHx8XG4gICAgICAgICAgICAgIG51bGw7XG4gICAgICAgICAgaWYgKCF0eXBlUGFyYW0gfHwgaXNBbnlLZXl3b3JkKHR5cGVQYXJhbSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNGbi5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2VzLmhhcyhkdHNGaWxlKSA/IGFuYWx5c2VzLmdldChkdHNGaWxlKSEgOiBbXTtcbiAgICAgICAgICAgIGFuYWx5c2lzLnB1c2goZHRzRm4pO1xuICAgICAgICAgICAgYW5hbHlzZXMuc2V0KGR0c0ZpbGUsIGFuYWx5c2lzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBhbmFseXNlcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Um9vdEZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIHJldHVybiBwcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKS5tYXAoZiA9PiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZikpLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5ob3N0LmdldEV4cG9ydHNPZk1vZHVsZShmKTtcbiAgICBpZiAoIWV4cG9ydHMpIHJldHVybiBbXTtcbiAgICBjb25zdCBpbmZvczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24pID0+IHtcbiAgICAgIGlmIChkZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICB0aGlzLmhvc3QuZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgICAgIGlmIChtZW1iZXIuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhcbiAgICAgICAgICAgICAgICBtZW1iZXIubmFtZSwgbWVtYmVyLm5vZGUsIG1lbWJlci5pbXBsZW1lbnRhdGlvbiwgZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICBjb25zdCBpbmZvID1cbiAgICAgICAgICAgICAgdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbmZvcztcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uL21ldGhvZCBub2RlIChvciBpdHMgaW1wbGVtZW50YXRpb24pLCB0byBzZWUgaWYgaXQgcmV0dXJucyBhXG4gICAqIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3QuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbi5cbiAgICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdG8gY2hlY2sgLSB0aGlzIGNvdWxkIGJlIGEgZnVuY3Rpb24sIGEgbWV0aG9kIG9yIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBpbXBsZW1lbnRhdGlvbiB0aGUgYWN0dWFsIGZ1bmN0aW9uIGV4cHJlc3Npb24gaWYgYG5vZGVgIGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBjb250YWluZXIgdGhlIGNsYXNzIHRoYXQgY29udGFpbnMgdGhlIGZ1bmN0aW9uLCBpZiBpdCBpcyBhIG1ldGhvZC5cbiAgICogQHJldHVybnMgaW5mbyBhYm91dCB0aGUgZnVuY3Rpb24gaWYgaXQgZG9lcyByZXR1cm4gYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0OyBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICBuYW1lOiBzdHJpbmcsIG5vZGU6IHRzLk5vZGV8bnVsbCwgaW1wbGVtZW50YXRpb246IHRzLk5vZGV8bnVsbCA9IG5vZGUsXG4gICAgICBjb250YWluZXI6IERlY2xhcmF0aW9uTm9kZXxudWxsID0gbnVsbCk6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvfG51bGwge1xuICAgIGlmIChpbXBsZW1lbnRhdGlvbiA9PT0gbnVsbCB8fFxuICAgICAgICAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmXG4gICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaW1wbGVtZW50YXRpb24pKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gaW1wbGVtZW50YXRpb247XG4gICAgY29uc3QgZGVmaW5pdGlvbiA9IHRoaXMuaG9zdC5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKGRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBkZWZpbml0aW9uLmJvZHk7XG4gICAgaWYgKGJvZHkgPT09IG51bGwgfHwgYm9keS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEdldCBob2xkIG9mIHRoZSByZXR1cm4gc3RhdGVtZW50IGV4cHJlc3Npb24gZm9yIHRoZSBmdW5jdGlvblxuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPSBib2R5W2JvZHkubGVuZ3RoIC0gMV07XG4gICAgaWYgKCF0cy5pc1JldHVyblN0YXRlbWVudChsYXN0U3RhdGVtZW50KSB8fCBsYXN0U3RhdGVtZW50LmV4cHJlc3Npb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRXZhbHVhdGUgdGhpcyBleHByZXNzaW9uIGFuZCBleHRyYWN0IHRoZSBgbmdNb2R1bGVgIHJlZmVyZW5jZVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGxhc3RTdGF0ZW1lbnQuZXhwcmVzc2lvbik7XG4gICAgaWYgKCEocmVzdWx0IGluc3RhbmNlb2YgTWFwKSB8fCAhcmVzdWx0LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGVSZWYgPSByZXN1bHQuZ2V0KCduZ01vZHVsZScpITtcbiAgICBpZiAoIShuZ01vZHVsZVJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24obmdNb2R1bGVSZWYubm9kZSkgJiZcbiAgICAgICAgIWlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5nTW9kdWxlUmVmLm5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBpZGVudGl0eSBnaXZlbiBieSAke25nTW9kdWxlUmVmLmRlYnVnTmFtZX0gcmVmZXJlbmNlZCBpbiBcIiR7XG4gICAgICAgICAgZGVjbGFyYXRpb24hLmdldFRleHQoKX1cIiBkb2Vzbid0IGFwcGVhciB0byBiZSBhIFwiY2xhc3NcIiBkZWNsYXJhdGlvbi5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZSA9IG5nTW9kdWxlUmVmIGFzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgICByZXR1cm4ge25hbWUsIG5nTW9kdWxlLCBkZWNsYXJhdGlvbiwgY29udGFpbmVyfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RHRzTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uKGZuOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mbyk6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvIHtcbiAgICBsZXQgZHRzRm46IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGNvbnRhaW5lckNsYXNzID0gZm4uY29udGFpbmVyICYmIHRoaXMuaG9zdC5nZXRDbGFzc1N5bWJvbChmbi5jb250YWluZXIpO1xuICAgIGlmIChjb250YWluZXJDbGFzcykge1xuICAgICAgY29uc3QgZHRzQ2xhc3MgPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oY29udGFpbmVyQ2xhc3MuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAvLyBHZXQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBtYXRjaGluZyBzdGF0aWMgbWV0aG9kXG4gICAgICBkdHNGbiA9IGR0c0NsYXNzICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNDbGFzcykgP1xuICAgICAgICAgIGR0c0NsYXNzLm1lbWJlcnMuZmluZChcbiAgICAgICAgICAgICAgbWVtYmVyID0+IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obWVtYmVyKSAmJiB0cy5pc0lkZW50aWZpZXIobWVtYmVyLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtZW1iZXIubmFtZS50ZXh0ID09PSBmbi5uYW1lKSBhcyB0cy5EZWNsYXJhdGlvbiA6XG4gICAgICAgICAgbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgZHRzRm4gPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oZm4uZGVjbGFyYXRpb24pO1xuICAgIH1cbiAgICBpZiAoIWR0c0ZuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1hdGNoaW5nIHR5cGUgZGVjbGFyYXRpb24gZm9yICR7Zm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpcyBtaXNzaW5nYCk7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kKGR0c0ZuKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXRjaGluZyB0eXBlIGRlY2xhcmF0aW9uIGZvciAke1xuICAgICAgICAgIGZuLmRlY2xhcmF0aW9uLmdldFRleHQoKX0gaXMgbm90IGEgZnVuY3Rpb246ICR7ZHRzRm4uZ2V0VGV4dCgpfWApO1xuICAgIH1cbiAgICBjb25zdCBjb250YWluZXIgPSBjb250YWluZXJDbGFzcyA/IGNvbnRhaW5lckNsYXNzLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gOiBudWxsO1xuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5yZXNvbHZlTmdNb2R1bGVSZWZlcmVuY2UoZm4pO1xuICAgIHJldHVybiB7bmFtZTogZm4ubmFtZSwgY29udGFpbmVyLCBkZWNsYXJhdGlvbjogZHRzRm4sIG5nTW9kdWxlfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU5nTW9kdWxlUmVmZXJlbmNlKGZuOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mbyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgbmdNb2R1bGUgPSBmbi5uZ01vZHVsZTtcblxuICAgIC8vIEZvciBleHRlcm5hbCBtb2R1bGUgcmVmZXJlbmNlcywgdXNlIHRoZSBkZWNsYXJhdGlvbiBhcyBpcy5cbiAgICBpZiAobmdNb2R1bGUuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbmdNb2R1bGU7XG4gICAgfVxuXG4gICAgLy8gRm9yIGludGVybmFsIChub24tbGlicmFyeSkgbW9kdWxlIHJlZmVyZW5jZXMsIHJlZGlyZWN0IHRoZSBtb2R1bGUncyB2YWx1ZSBkZWNsYXJhdGlvblxuICAgIC8vIHRvIGl0cyB0eXBlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGR0c05nTW9kdWxlID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKG5nTW9kdWxlLm5vZGUpO1xuICAgIGlmICghZHRzTmdNb2R1bGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdHlwaW5ncyBkZWNsYXJhdGlvbiBjYW4gYmUgZm91bmQgZm9yIHRoZSByZWZlcmVuY2VkIE5nTW9kdWxlIGNsYXNzIGluICR7XG4gICAgICAgICAgZm4uZGVjbGFyYXRpb24uZ2V0VGV4dCgpfS5gKTtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkdHNOZ01vZHVsZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlZmVyZW5jZWQgTmdNb2R1bGUgaW4gJHtcbiAgICAgICAgICBmbi5kZWNsYXJhdGlvblxuICAgICAgICAgICAgICAuZ2V0VGV4dCgpfSBpcyBub3QgYSBuYW1lZCBjbGFzcyBkZWNsYXJhdGlvbiBpbiB0aGUgdHlwaW5ncyBwcm9ncmFtOyBpbnN0ZWFkIHdlIGdldCAke1xuICAgICAgICAgIGR0c05nTW9kdWxlLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2UoZHRzTmdNb2R1bGUsIG51bGwpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gaXNGdW5jdGlvbk9yTWV0aG9kKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IGRlY2xhcmF0aW9uIGlzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgdHMuTWV0aG9kRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gaXNBbnlLZXl3b3JkKHR5cGVQYXJhbTogdHMuVHlwZU5vZGUpOiB0eXBlUGFyYW0gaXMgdHMuS2V5d29yZFR5cGVOb2RlIHtcbiAgcmV0dXJuIHR5cGVQYXJhbS5raW5kID09PSB0cy5TeW50YXhLaW5kLkFueUtleXdvcmQ7XG59XG4iXX0=