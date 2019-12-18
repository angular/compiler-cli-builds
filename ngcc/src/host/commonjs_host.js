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
        define("@angular/compiler-cli/ngcc/src/host/commonjs_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var CommonJsReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsReflectionHost, _super);
        function CommonJsReflectionHost(logger, isCore, src, dts) {
            if (dts === void 0) { dts = null; }
            var _this = _super.call(this, logger, isCore, src, dts) || this;
            _this.commonJsExports = new Map();
            _this.topLevelHelperCalls = new Map();
            _this.program = src.program;
            _this.compilerHost = src.host;
            return _this;
        }
        CommonJsReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var superImport = _super.prototype.getImportOfIdentifier.call(this, id);
            if (superImport !== null) {
                return superImport;
            }
            var requireCall = this.findCommonJsImport(id);
            if (requireCall === null) {
                return null;
            }
            return { from: requireCall.arguments[0].text, name: id.text };
        };
        CommonJsReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            return this.getCommonJsImportedDeclaration(id) || _super.prototype.getDeclarationOfIdentifier.call(this, id);
        };
        CommonJsReflectionHost.prototype.getExportsOfModule = function (module) {
            return _super.prototype.getExportsOfModule.call(this, module) || this.getCommonJsExports(module.getSourceFile());
        };
        CommonJsReflectionHost.prototype.getCommonJsExports = function (sourceFile) {
            var _this = this;
            return getOrDefault(this.commonJsExports, sourceFile, function () { return _this.computeExportsOfCommonJsModule(sourceFile); });
        };
        /**
         * Search statements related to the given class for calls to the specified helper.
         *
         * In CommonJS these helper calls can be outside the class's IIFE at the top level of the
         * source file. Searching the top level statements for helpers can be expensive, so we
         * try to get helpers from the IIFE first and only fall back on searching the top level if
         * no helpers are found.
         *
         * @param classSymbol the class whose helper calls we are interested in.
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested in.
         * @returns an array of nodes of calls to the helper with the given name.
         */
        CommonJsReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperNames) {
            var esm5HelperCalls = _super.prototype.getHelperCallsForClass.call(this, classSymbol, helperNames);
            if (esm5HelperCalls.length > 0) {
                return esm5HelperCalls;
            }
            else {
                var sourceFile = classSymbol.declaration.valueDeclaration.getSourceFile();
                return this.getTopLevelHelperCalls(sourceFile, helperNames);
            }
        };
        /**
         * Find all the helper calls at the top level of a source file.
         *
         * We cache the helper calls per source file so that we don't have to keep parsing the code for
         * each class in a file.
         *
         * @param sourceFile the source who may contain helper calls.
         * @param helperNames the names of the helpers (e.g. `__decorate`) whose calls we are interested
         * in.
         * @returns an array of nodes of calls to the helper with the given name.
         */
        CommonJsReflectionHost.prototype.getTopLevelHelperCalls = function (sourceFile, helperNames) {
            var _this = this;
            var calls = [];
            helperNames.forEach(function (helperName) {
                var helperCallsMap = getOrDefault(_this.topLevelHelperCalls, helperName, function () { return new Map(); });
                calls.push.apply(calls, tslib_1.__spread(getOrDefault(helperCallsMap, sourceFile, function () { return sourceFile.statements.map(function (statement) { return _this.getHelperCall(statement, helperNames); })
                    .filter(utils_1.isDefined); })));
            });
            return calls;
        };
        CommonJsReflectionHost.prototype.computeExportsOfCommonJsModule = function (sourceFile) {
            var e_1, _a, e_2, _b;
            var moduleMap = new Map();
            try {
                for (var _c = tslib_1.__values(this.getModuleStatements(sourceFile)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if (isCommonJsExportStatement(statement)) {
                        var exportDeclaration = this.extractCommonJsExportDeclaration(statement);
                        moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                    }
                    else if (isReexportStatement(statement)) {
                        var reexports = this.extractCommonJsReexports(statement, sourceFile);
                        try {
                            for (var reexports_1 = (e_2 = void 0, tslib_1.__values(reexports)), reexports_1_1 = reexports_1.next(); !reexports_1_1.done; reexports_1_1 = reexports_1.next()) {
                                var reexport = reexports_1_1.value;
                                moduleMap.set(reexport.name, reexport.declaration);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (reexports_1_1 && !reexports_1_1.done && (_b = reexports_1.return)) _b.call(reexports_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return moduleMap;
        };
        CommonJsReflectionHost.prototype.extractCommonJsExportDeclaration = function (statement) {
            var exportExpression = statement.expression.right;
            var declaration = this.getDeclarationOfExpression(exportExpression);
            var name = statement.expression.left.name.text;
            if (declaration !== null) {
                return { name: name, declaration: declaration };
            }
            else {
                return {
                    name: name,
                    declaration: {
                        node: null,
                        expression: exportExpression,
                        viaModule: null,
                    },
                };
            }
        };
        CommonJsReflectionHost.prototype.extractCommonJsReexports = function (statement, containingFile) {
            var reexportArg = statement.expression.arguments[0];
            var requireCall = isRequireCall(reexportArg) ?
                reexportArg :
                ts.isIdentifier(reexportArg) ? this.findRequireCallReference(reexportArg) : null;
            if (requireCall === null) {
                return [];
            }
            var importPath = requireCall.arguments[0].text;
            var importedFile = this.resolveModuleName(importPath, containingFile);
            if (importedFile === undefined) {
                return [];
            }
            var importedExports = this.getExportsOfModule(importedFile);
            if (importedExports === null) {
                return [];
            }
            var viaModule = utils_1.stripExtension(importedFile.fileName);
            var reexports = [];
            importedExports.forEach(function (decl, name) {
                if (decl.node !== null) {
                    reexports.push({ name: name, declaration: { node: decl.node, viaModule: viaModule } });
                }
                else {
                    reexports.push({ name: name, declaration: { node: null, expression: decl.expression, viaModule: viaModule } });
                }
            });
            return reexports;
        };
        CommonJsReflectionHost.prototype.findCommonJsImport = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = findNamespaceOfIdentifier(id);
            return nsIdentifier && this.findRequireCallReference(nsIdentifier);
        };
        CommonJsReflectionHost.prototype.findRequireCallReference = function (id) {
            var symbol = id && this.checker.getSymbolAtLocation(id) || null;
            var declaration = symbol && symbol.valueDeclaration;
            var initializer = declaration && ts.isVariableDeclaration(declaration) && declaration.initializer || null;
            return initializer && isRequireCall(initializer) ? initializer : null;
        };
        CommonJsReflectionHost.prototype.getCommonJsImportedDeclaration = function (id) {
            var importInfo = this.getImportOfIdentifier(id);
            if (importInfo === null) {
                return null;
            }
            var importedFile = this.resolveModuleName(importInfo.from, id.getSourceFile());
            if (importedFile === undefined) {
                return null;
            }
            var viaModule = !importInfo.from.startsWith('.') ? importInfo.from : null;
            return { node: importedFile, viaModule: viaModule };
        };
        CommonJsReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                var moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName, undefined, undefined, this.program.getCompilerOptions())[0];
                return moduleInfo && this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedFileName));
            }
            else {
                var moduleInfo = ts.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
                return moduleInfo.resolvedModule &&
                    this.program.getSourceFile(file_system_1.absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
            }
        };
        return CommonJsReflectionHost;
    }(esm5_host_1.Esm5ReflectionHost));
    exports.CommonJsReflectionHost = CommonJsReflectionHost;
    function isCommonJsExportStatement(s) {
        return ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression) &&
            ts.isPropertyAccessExpression(s.expression.left) &&
            ts.isIdentifier(s.expression.left.expression) &&
            s.expression.left.expression.text === 'exports';
    }
    exports.isCommonJsExportStatement = isCommonJsExportStatement;
    function isRequireCall(node) {
        return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' && node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0]);
    }
    exports.isRequireCall = isRequireCall;
    /**
     * If the identifier `id` is the RHS of a property access of the form `namespace.id`
     * and `namespace` is an identifer then return `namespace`, otherwise `null`.
     * @param id The identifier whose namespace we want to find.
     */
    function findNamespaceOfIdentifier(id) {
        return id.parent && ts.isPropertyAccessExpression(id.parent) &&
            ts.isIdentifier(id.parent.expression) ?
            id.parent.expression :
            null;
    }
    function isReexportStatement(statement) {
        return ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) &&
            ts.isIdentifier(statement.expression.expression) &&
            statement.expression.expression.text === '__export' &&
            statement.expression.arguments.length === 1;
    }
    function getOrDefault(map, key, factory) {
        if (!map.has(key)) {
            map.set(key, factory(key));
        }
        return map.get(key);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9ob3N0L2NvbW1vbmpzX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBQ2pDLDJFQUE0RDtJQUk1RCw4REFBbUQ7SUFFbkQsMkVBQStDO0lBRy9DO1FBQTRDLGtEQUFrQjtRQUs1RCxnQ0FBWSxNQUFjLEVBQUUsTUFBZSxFQUFFLEdBQWtCLEVBQUUsR0FBOEI7WUFBOUIsb0JBQUEsRUFBQSxVQUE4QjtZQUEvRixZQUNFLGtCQUFNLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxTQUdoQztZQVJTLHFCQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWdELENBQUM7WUFDMUUseUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQW1ELENBQUM7WUFLekYsS0FBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO1lBQzNCLEtBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQzs7UUFDL0IsQ0FBQztRQUVELHNEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLFdBQVcsR0FBRyxpQkFBTSxxQkFBcUIsWUFBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO1lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsMkRBQTBCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFNLDBCQUEwQixZQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFRCxtREFBa0IsR0FBbEIsVUFBbUIsTUFBZTtZQUNoQyxPQUFPLGlCQUFNLGtCQUFrQixZQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRUQsbURBQWtCLEdBQWxCLFVBQW1CLFVBQXlCO1lBQTVDLGlCQUdDO1lBRkMsT0FBTyxZQUFZLENBQ2YsSUFBSSxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsY0FBTSxPQUFBLEtBQUksQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLENBQUMsRUFBL0MsQ0FBK0MsQ0FBQyxDQUFDO1FBQy9GLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7V0FXRztRQUNPLHVEQUFzQixHQUFoQyxVQUFpQyxXQUE0QixFQUFFLFdBQXFCO1lBRWxGLElBQU0sZUFBZSxHQUFHLGlCQUFNLHNCQUFzQixZQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMvRSxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixPQUFPLGVBQWUsQ0FBQzthQUN4QjtpQkFBTTtnQkFDTCxJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM1RSxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDN0Q7UUFDSCxDQUFDO1FBRUQ7Ozs7Ozs7Ozs7V0FVRztRQUNLLHVEQUFzQixHQUE5QixVQUErQixVQUF5QixFQUFFLFdBQXFCO1lBQS9FLGlCQVdDO1lBVEMsSUFBTSxLQUFLLEdBQXdCLEVBQUUsQ0FBQztZQUN0QyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDNUIsSUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLEtBQUksQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsY0FBTSxPQUFBLElBQUksR0FBRyxFQUFFLEVBQVQsQ0FBUyxDQUFDLENBQUM7Z0JBQzNGLEtBQUssQ0FBQyxJQUFJLE9BQVYsS0FBSyxtQkFBUyxZQUFZLENBQ3RCLGNBQWMsRUFBRSxVQUFVLEVBQzFCLGNBQU0sT0FBQSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLEtBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxFQUExQyxDQUEwQyxDQUFDO3FCQUM3RSxNQUFNLENBQUMsaUJBQVMsQ0FBQyxFQUR0QixDQUNzQixDQUFDLEdBQUU7WUFDckMsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFTywrREFBOEIsR0FBdEMsVUFBdUMsVUFBeUI7O1lBQzlELElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDOztnQkFDakQsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBekQsSUFBTSxTQUFTLFdBQUE7b0JBQ2xCLElBQUkseUJBQXlCLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ3hDLElBQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3dCQUMzRSxTQUFTLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztxQkFDdEU7eUJBQU0sSUFBSSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRTt3QkFDekMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQzs7NEJBQ3ZFLEtBQXVCLElBQUEsNkJBQUEsaUJBQUEsU0FBUyxDQUFBLENBQUEsb0NBQUEsMkRBQUU7Z0NBQTdCLElBQU0sUUFBUSxzQkFBQTtnQ0FDakIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQzs2QkFDcEQ7Ozs7Ozs7OztxQkFDRjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUVPLGlFQUFnQyxHQUF4QyxVQUF5QyxTQUFrQztZQUV6RSxJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1lBQ3BELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3RFLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDakQsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO2dCQUN4QixPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQzthQUM1QjtpQkFBTTtnQkFDTCxPQUFPO29CQUNMLElBQUksTUFBQTtvQkFDSixXQUFXLEVBQUU7d0JBQ1gsSUFBSSxFQUFFLElBQUk7d0JBQ1YsVUFBVSxFQUFFLGdCQUFnQjt3QkFDNUIsU0FBUyxFQUFFLElBQUk7cUJBQ2hCO2lCQUNGLENBQUM7YUFDSDtRQUNILENBQUM7UUFFTyx5REFBd0IsR0FBaEMsVUFBaUMsU0FBNEIsRUFBRSxjQUE2QjtZQUUxRixJQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0RCxJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDNUMsV0FBVyxDQUFDLENBQUM7Z0JBQ2IsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckYsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO2dCQUN4QixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN4RSxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDOUQsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO2dCQUM1QixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQsSUFBTSxTQUFTLEdBQUcsc0JBQWMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEQsSUFBTSxTQUFTLEdBQWdDLEVBQUUsQ0FBQztZQUNsRCxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSSxFQUFFLElBQUk7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7b0JBQ3RCLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLE1BQUEsRUFBRSxXQUFXLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLFdBQUEsRUFBQyxFQUFDLENBQUMsQ0FBQztpQkFDbkU7cUJBQU07b0JBQ0wsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksTUFBQSxFQUFFLFdBQVcsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxXQUFBLEVBQUMsRUFBQyxDQUFDLENBQUM7aUJBQzNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRU8sbURBQWtCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLDhFQUE4RTtZQUM5RSwwREFBMEQ7WUFDMUQsSUFBTSxZQUFZLEdBQUcseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkQsT0FBTyxZQUFZLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFTyx5REFBd0IsR0FBaEMsVUFBaUMsRUFBaUI7WUFDaEQsSUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDO1lBQ2xFLElBQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7WUFDdEQsSUFBTSxXQUFXLEdBQ2IsV0FBVyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztZQUM1RixPQUFPLFdBQVcsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3hFLENBQUM7UUFFTywrREFBOEIsR0FBdEMsVUFBdUMsRUFBaUI7WUFDdEQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ2pGLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sU0FBUyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUM1RSxPQUFPLEVBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxTQUFTLFdBQUEsRUFBQyxDQUFDO1FBQ3pDLENBQUM7UUFFTyxrREFBaUIsR0FBekIsVUFBMEIsVUFBa0IsRUFBRSxjQUE2QjtZQUV6RSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3hDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQ25ELENBQUMsVUFBVSxDQUFDLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUMzRCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsMEJBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2FBQzVGO2lCQUFNO2dCQUNMLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDbkMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUN0RSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZCLE9BQU8sVUFBVSxDQUFDLGNBQWM7b0JBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLDBCQUFZLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7YUFDMUY7UUFDSCxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBdE1ELENBQTRDLDhCQUFrQixHQXNNN0Q7SUF0TVksd0RBQXNCO0lBNE1uQyxTQUFnQix5QkFBeUIsQ0FBQyxDQUFlO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQ3JFLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNoRCxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztJQUN0RCxDQUFDO0lBTEQsOERBS0M7SUFRRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDakUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUpELHNDQUlDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMseUJBQXlCLENBQUMsRUFBaUI7UUFDbEQsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ3BELEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUdELFNBQVMsbUJBQW1CLENBQUMsU0FBdUI7UUFDbEQsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7WUFDbkYsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUNoRCxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVTtZQUNuRCxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBTyxHQUFjLEVBQUUsR0FBTSxFQUFFLE9BQXNCO1FBQ3hFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRyxDQUFDO0lBQ3hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBJbXBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7aXNEZWZpbmVkLCBzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2x9IGZyb20gJy4vbmdjY19ob3N0JztcblxuZXhwb3J0IGNsYXNzIENvbW1vbkpzUmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc201UmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgY29tbW9uSnNFeHBvcnRzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbD4oKTtcbiAgcHJvdGVjdGVkIHRvcExldmVsSGVscGVyQ2FsbHMgPSBuZXcgTWFwPHN0cmluZywgTWFwPHRzLlNvdXJjZUZpbGUsIHRzLkNhbGxFeHByZXNzaW9uW10+PigpO1xuICBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJvdGVjdGVkIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBjb25zdHJ1Y3Rvcihsb2dnZXI6IExvZ2dlciwgaXNDb3JlOiBib29sZWFuLCBzcmM6IEJ1bmRsZVByb2dyYW0sIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGxvZ2dlciwgaXNDb3JlLCBzcmMsIGR0cyk7XG4gICAgdGhpcy5wcm9ncmFtID0gc3JjLnByb2dyYW07XG4gICAgdGhpcy5jb21waWxlckhvc3QgPSBzcmMuaG9zdDtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBzdXBlckltcG9ydCA9IHN1cGVyLmdldEltcG9ydE9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKHN1cGVySW1wb3J0ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJJbXBvcnQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWlyZUNhbGwgPSB0aGlzLmZpbmRDb21tb25Kc0ltcG9ydChpZCk7XG4gICAgaWYgKHJlcXVpcmVDYWxsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtmcm9tOiByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dCwgbmFtZTogaWQudGV4dH07XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldENvbW1vbkpzSW1wb3J0ZWREZWNsYXJhdGlvbihpZCkgfHwgc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSkgfHwgdGhpcy5nZXRDb21tb25Kc0V4cG9ydHMobW9kdWxlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICBnZXRDb21tb25Kc0V4cG9ydHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gZ2V0T3JEZWZhdWx0KFxuICAgICAgICB0aGlzLmNvbW1vbkpzRXhwb3J0cywgc291cmNlRmlsZSwgKCkgPT4gdGhpcy5jb21wdXRlRXhwb3J0c09mQ29tbW9uSnNNb2R1bGUoc291cmNlRmlsZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIGZvciBjYWxscyB0byB0aGUgc3BlY2lmaWVkIGhlbHBlci5cbiAgICpcbiAgICogSW4gQ29tbW9uSlMgdGhlc2UgaGVscGVyIGNhbGxzIGNhbiBiZSBvdXRzaWRlIHRoZSBjbGFzcydzIElJRkUgYXQgdGhlIHRvcCBsZXZlbCBvZiB0aGVcbiAgICogc291cmNlIGZpbGUuIFNlYXJjaGluZyB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGhlbHBlcnMgY2FuIGJlIGV4cGVuc2l2ZSwgc28gd2VcbiAgICogdHJ5IHRvIGdldCBoZWxwZXJzIGZyb20gdGhlIElJRkUgZmlyc3QgYW5kIG9ubHkgZmFsbCBiYWNrIG9uIHNlYXJjaGluZyB0aGUgdG9wIGxldmVsIGlmXG4gICAqIG5vIGhlbHBlcnMgYXJlIGZvdW5kLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBub2RlcyBvZiBjYWxscyB0byB0aGUgaGVscGVyIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBoZWxwZXJOYW1lczogc3RyaW5nW10pOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb25bXSB7XG4gICAgY29uc3QgZXNtNUhlbHBlckNhbGxzID0gc3VwZXIuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgaGVscGVyTmFtZXMpO1xuICAgIGlmIChlc201SGVscGVyQ2FsbHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGVzbTVIZWxwZXJDYWxscztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VG9wTGV2ZWxIZWxwZXJDYWxscyhzb3VyY2VGaWxlLCBoZWxwZXJOYW1lcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRoZSBoZWxwZXIgY2FsbHMgYXQgdGhlIHRvcCBsZXZlbCBvZiBhIHNvdXJjZSBmaWxlLlxuICAgKlxuICAgKiBXZSBjYWNoZSB0aGUgaGVscGVyIGNhbGxzIHBlciBzb3VyY2UgZmlsZSBzbyB0aGF0IHdlIGRvbid0IGhhdmUgdG8ga2VlcCBwYXJzaW5nIHRoZSBjb2RlIGZvclxuICAgKiBlYWNoIGNsYXNzIGluIGEgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgdGhlIHNvdXJjZSB3aG8gbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZXMgdGhlIG5hbWVzIG9mIHRoZSBoZWxwZXJzIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWRcbiAgICogaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG5vZGVzIG9mIGNhbGxzIHRvIHRoZSBoZWxwZXIgd2l0aCB0aGUgZ2l2ZW4gbmFtZS5cbiAgICovXG4gIHByaXZhdGUgZ2V0VG9wTGV2ZWxIZWxwZXJDYWxscyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBoZWxwZXJOYW1lczogc3RyaW5nW10pOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb25bXSB7XG4gICAgY29uc3QgY2FsbHM6IHRzLkNhbGxFeHByZXNzaW9uW10gPSBbXTtcbiAgICBoZWxwZXJOYW1lcy5mb3JFYWNoKGhlbHBlck5hbWUgPT4ge1xuICAgICAgY29uc3QgaGVscGVyQ2FsbHNNYXAgPSBnZXRPckRlZmF1bHQodGhpcy50b3BMZXZlbEhlbHBlckNhbGxzLCBoZWxwZXJOYW1lLCAoKSA9PiBuZXcgTWFwKCkpO1xuICAgICAgY2FsbHMucHVzaCguLi5nZXRPckRlZmF1bHQoXG4gICAgICAgICAgaGVscGVyQ2FsbHNNYXAsIHNvdXJjZUZpbGUsXG4gICAgICAgICAgKCkgPT4gc291cmNlRmlsZS5zdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZXMpKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCkpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2FsbHM7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVFeHBvcnRzT2ZDb21tb25Kc01vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBtb2R1bGVNYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+KCk7XG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2YgdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGUpKSB7XG4gICAgICBpZiAoaXNDb21tb25Kc0V4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGV4cG9ydERlY2xhcmF0aW9uID0gdGhpcy5leHRyYWN0Q29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQpO1xuICAgICAgICBtb2R1bGVNYXAuc2V0KGV4cG9ydERlY2xhcmF0aW9uLm5hbWUsIGV4cG9ydERlY2xhcmF0aW9uLmRlY2xhcmF0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNSZWV4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZXh0cmFjdENvbW1vbkpzUmVleHBvcnRzKHN0YXRlbWVudCwgc291cmNlRmlsZSk7XG4gICAgICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVleHBvcnRzKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChyZWV4cG9ydC5uYW1lLCByZWV4cG9ydC5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZU1hcDtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50OiBDb21tb25Kc0V4cG9ydFN0YXRlbWVudCk6XG4gICAgICBDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBleHBvcnRFeHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cG9ydEV4cHJlc3Npb24pO1xuICAgIGNvbnN0IG5hbWUgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0Lm5hbWUudGV4dDtcbiAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgZGVjbGFyYXRpb259O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBkZWNsYXJhdGlvbjoge1xuICAgICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgICAgZXhwcmVzc2lvbjogZXhwb3J0RXhwcmVzc2lvbixcbiAgICAgICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdENvbW1vbkpzUmVleHBvcnRzKHN0YXRlbWVudDogUmVleHBvcnRTdGF0ZW1lbnQsIGNvbnRhaW5pbmdGaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb25bXSB7XG4gICAgY29uc3QgcmVleHBvcnRBcmcgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG5cbiAgICBjb25zdCByZXF1aXJlQ2FsbCA9IGlzUmVxdWlyZUNhbGwocmVleHBvcnRBcmcpID9cbiAgICAgICAgcmVleHBvcnRBcmcgOlxuICAgICAgICB0cy5pc0lkZW50aWZpZXIocmVleHBvcnRBcmcpID8gdGhpcy5maW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UocmVleHBvcnRBcmcpIDogbnVsbDtcbiAgICBpZiAocmVxdWlyZUNhbGwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRQYXRoID0gcmVxdWlyZUNhbGwuYXJndW1lbnRzWzBdLnRleHQ7XG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShpbXBvcnRQYXRoLCBjb250YWluaW5nRmlsZSk7XG4gICAgaWYgKGltcG9ydGVkRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0ZWRFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoaW1wb3J0ZWRGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgdmlhTW9kdWxlID0gc3RyaXBFeHRlbnNpb24oaW1wb3J0ZWRGaWxlLmZpbGVOYW1lKTtcbiAgICBjb25zdCByZWV4cG9ydHM6IENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGltcG9ydGVkRXhwb3J0cy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICBpZiAoZGVjbC5ub2RlICE9PSBudWxsKSB7XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lLCBkZWNsYXJhdGlvbjoge25vZGU6IGRlY2wubm9kZSwgdmlhTW9kdWxlfX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVleHBvcnRzLnB1c2goe25hbWUsIGRlY2xhcmF0aW9uOiB7bm9kZTogbnVsbCwgZXhwcmVzc2lvbjogZGVjbC5leHByZXNzaW9uLCB2aWFNb2R1bGV9fSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgZmluZENvbW1vbkpzSW1wb3J0KGlkOiB0cy5JZGVudGlmaWVyKTogUmVxdWlyZUNhbGx8bnVsbCB7XG4gICAgLy8gSXMgYGlkYCBhIG5hbWVzcGFjZWQgcHJvcGVydHkgYWNjZXNzLCBlLmcuIGBEaXJlY3RpdmVgIGluIGBjb3JlLkRpcmVjdGl2ZWA/XG4gICAgLy8gSWYgc28gY2FwdHVyZSB0aGUgc3ltYm9sIG9mIHRoZSBuYW1lc3BhY2UsIGUuZy4gYGNvcmVgLlxuICAgIGNvbnN0IG5zSWRlbnRpZmllciA9IGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQpO1xuICAgIHJldHVybiBuc0lkZW50aWZpZXIgJiYgdGhpcy5maW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UobnNJZGVudGlmaWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlKGlkOiB0cy5JZGVudGlmaWVyKTogUmVxdWlyZUNhbGx8bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gaWQgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpIHx8IG51bGw7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBzeW1ib2wgJiYgc3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPVxuICAgICAgICBkZWNsYXJhdGlvbiAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8IG51bGw7XG4gICAgcmV0dXJuIGluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoaW5pdGlhbGl6ZXIpID8gaW5pdGlhbGl6ZXIgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21tb25Kc0ltcG9ydGVkRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRJbmZvID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChpbXBvcnRJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydEluZm8uZnJvbSwgaWQuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHZpYU1vZHVsZSA9ICFpbXBvcnRJbmZvLmZyb20uc3RhcnRzV2l0aCgnLicpID8gaW1wb3J0SW5mby5mcm9tIDogbnVsbDtcbiAgICByZXR1cm4ge25vZGU6IGltcG9ydGVkRmlsZSwgdmlhTW9kdWxlfTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICAgICAgW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpKVswXTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvICYmIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCksXG4gICAgICAgICAgdGhpcy5jb21waWxlckhvc3QpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUgJiZcbiAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQgPSB0cy5FeHByZXNzaW9uU3RhdGVtZW50ICYge1xuICBleHByZXNzaW9uOlxuICAgICAgdHMuQmluYXJ5RXhwcmVzc2lvbiAmIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuSWRlbnRpZmllcn19XG59O1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQoczogdHMuU3RhdGVtZW50KTogcyBpcyBDb21tb25Kc0V4cG9ydFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQocykgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHMuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHMuZXhwcmVzc2lvbi5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHMuZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb24pICYmXG4gICAgICBzLmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uLnRleHQgPT09ICdleHBvcnRzJztcbn1cblxuaW50ZXJmYWNlIENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlY2xhcmF0aW9uOiBEZWNsYXJhdGlvbjtcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWlyZUNhbGwgPSB0cy5DYWxsRXhwcmVzc2lvbiAmIHthcmd1bWVudHM6IFt0cy5TdHJpbmdMaXRlcmFsXX07XG5leHBvcnQgZnVuY3Rpb24gaXNSZXF1aXJlQ2FsbChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBSZXF1aXJlQ2FsbCB7XG4gIHJldHVybiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gJ3JlcXVpcmUnICYmIG5vZGUuYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUuYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBJZiB0aGUgaWRlbnRpZmllciBgaWRgIGlzIHRoZSBSSFMgb2YgYSBwcm9wZXJ0eSBhY2Nlc3Mgb2YgdGhlIGZvcm0gYG5hbWVzcGFjZS5pZGBcbiAqIGFuZCBgbmFtZXNwYWNlYCBpcyBhbiBpZGVudGlmZXIgdGhlbiByZXR1cm4gYG5hbWVzcGFjZWAsIG90aGVyd2lzZSBgbnVsbGAuXG4gKiBAcGFyYW0gaWQgVGhlIGlkZW50aWZpZXIgd2hvc2UgbmFtZXNwYWNlIHdlIHdhbnQgdG8gZmluZC5cbiAqL1xuZnVuY3Rpb24gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHJldHVybiBpZC5wYXJlbnQgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihpZC5wYXJlbnQuZXhwcmVzc2lvbikgP1xuICAgICAgaWQucGFyZW50LmV4cHJlc3Npb24gOlxuICAgICAgbnVsbDtcbn1cblxudHlwZSBSZWV4cG9ydFN0YXRlbWVudCA9IHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7ZXhwcmVzc2lvbjogdHMuQ2FsbEV4cHJlc3Npb259O1xuZnVuY3Rpb24gaXNSZWV4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyBSZWV4cG9ydFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24pICYmXG4gICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uLnRleHQgPT09ICdfX2V4cG9ydCcgJiZcbiAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggPT09IDE7XG59XG5cbmZ1bmN0aW9uIGdldE9yRGVmYXVsdDxLLCBWPihtYXA6IE1hcDxLLCBWPiwga2V5OiBLLCBmYWN0b3J5OiAoa2V5OiBLKSA9PiBWKTogViB7XG4gIGlmICghbWFwLmhhcyhrZXkpKSB7XG4gICAgbWFwLnNldChrZXksIGZhY3Rvcnkoa2V5KSk7XG4gIH1cbiAgcmV0dXJuIG1hcC5nZXQoa2V5KSAhO1xufVxuIl19