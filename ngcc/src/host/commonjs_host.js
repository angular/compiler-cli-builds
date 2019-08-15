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
        function CommonJsReflectionHost(logger, isCore, program, compilerHost, dts) {
            var _this = _super.call(this, logger, isCore, program.getTypeChecker(), dts) || this;
            _this.program = program;
            _this.compilerHost = compilerHost;
            _this.commonJsExports = new Map();
            _this.topLevelHelperCalls = new Map();
            return _this;
        }
        CommonJsReflectionHost.prototype.getImportOfIdentifier = function (id) {
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
        CommonJsReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperName) {
            var esm5HelperCalls = _super.prototype.getHelperCallsForClass.call(this, classSymbol, helperName);
            if (esm5HelperCalls.length > 0) {
                return esm5HelperCalls;
            }
            else {
                var sourceFile = classSymbol.valueDeclaration.getSourceFile();
                return this.getTopLevelHelperCalls(sourceFile, helperName);
            }
        };
        /**
         * Find all the helper calls at the top level of a source file.
         *
         * We cache the helper calls per source file so that we don't have to keep parsing the code for
         * each class in a file.
         *
         * @param sourceFile the source who may contain helper calls.
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested in.
         * @returns an array of nodes of calls to the helper with the given name.
         */
        CommonJsReflectionHost.prototype.getTopLevelHelperCalls = function (sourceFile, helperName) {
            var _this = this;
            var helperCallsMap = getOrDefault(this.topLevelHelperCalls, helperName, function () { return new Map(); });
            return getOrDefault(helperCallsMap, sourceFile, function () { return sourceFile.statements.map(function (statement) { return _this.getHelperCall(statement, helperName); })
                .filter(utils_1.isDefined); });
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
            var reexports = [];
            var requireCall = statement.expression.arguments[0];
            var importPath = requireCall.arguments[0].text;
            var importedFile = this.resolveModuleName(importPath, containingFile);
            if (importedFile !== undefined) {
                var viaModule_1 = stripExtension(importedFile.fileName);
                var importedExports = this.getExportsOfModule(importedFile);
                if (importedExports !== null) {
                    importedExports.forEach(function (decl, name) {
                        if (decl.node !== null) {
                            reexports.push({ name: name, declaration: { node: decl.node, viaModule: viaModule_1 } });
                        }
                        else {
                            reexports.push({ name: name, declaration: { node: null, expression: decl.expression, viaModule: viaModule_1 } });
                        }
                    });
                }
            }
            return reexports;
        };
        CommonJsReflectionHost.prototype.findCommonJsImport = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = findNamespaceOfIdentifier(id);
            var nsSymbol = nsIdentifier && this.checker.getSymbolAtLocation(nsIdentifier) || null;
            var nsDeclaration = nsSymbol && nsSymbol.valueDeclaration;
            var initializer = nsDeclaration && ts.isVariableDeclaration(nsDeclaration) && nsDeclaration.initializer ||
                null;
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
            return { node: importedFile, viaModule: importInfo.from };
        };
        CommonJsReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                var moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName)[0];
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
    function stripParentheses(node) {
        return ts.isParenthesizedExpression(node) ? node.expression : node;
    }
    exports.stripParentheses = stripParentheses;
    function isReexportStatement(statement) {
        return ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) &&
            ts.isIdentifier(statement.expression.expression) &&
            statement.expression.expression.text === '__export' &&
            statement.expression.arguments.length === 1 &&
            isRequireCall(statement.expression.arguments[0]);
    }
    function stripExtension(fileName) {
        return fileName.replace(/\..+$/, '');
    }
    function getOrDefault(map, key, factory) {
        if (!map.has(key)) {
            map.set(key, factory(key));
        }
        return map.get(key);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9ob3N0L2NvbW1vbmpzX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBQ2pDLDJFQUE0RDtJQUk1RCw4REFBbUM7SUFFbkMsMkVBQStDO0lBRS9DO1FBQTRDLGtEQUFrQjtRQUc1RCxnQ0FDSSxNQUFjLEVBQUUsTUFBZSxFQUFZLE9BQW1CLEVBQ3BELFlBQTZCLEVBQUUsR0FBd0I7WUFGckUsWUFHRSxrQkFBTSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxHQUFHLENBQUMsU0FDckQ7WUFIOEMsYUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUNwRCxrQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFKakMscUJBQWUsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQztZQUMxRSx5QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBbUQsQ0FBQzs7UUFLM0YsQ0FBQztRQUVELHNEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEQsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO2dCQUN4QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxFQUFDLElBQUksRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBQyxDQUFDO1FBQzlELENBQUM7UUFFRCwyREFBMEIsR0FBMUIsVUFBMkIsRUFBaUI7WUFDMUMsT0FBTyxJQUFJLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLElBQUksaUJBQU0sMEJBQTBCLFlBQUMsRUFBRSxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELG1EQUFrQixHQUFsQixVQUFtQixNQUFlO1lBQ2hDLE9BQU8saUJBQU0sa0JBQWtCLFlBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzdGLENBQUM7UUFFRCxtREFBa0IsR0FBbEIsVUFBbUIsVUFBeUI7WUFBNUMsaUJBR0M7WUFGQyxPQUFPLFlBQVksQ0FDZixJQUFJLENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxjQUFNLE9BQUEsS0FBSSxDQUFDLDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxFQUEvQyxDQUErQyxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVEOzs7Ozs7Ozs7OztXQVdHO1FBQ08sdURBQXNCLEdBQWhDLFVBQWlDLFdBQXdCLEVBQUUsVUFBa0I7WUFFM0UsSUFBTSxlQUFlLEdBQUcsaUJBQU0sc0JBQXNCLFlBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzlFLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sZUFBZSxDQUFDO2FBQ3hCO2lCQUFNO2dCQUNMLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDaEUsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQzVEO1FBQ0gsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNLLHVEQUFzQixHQUE5QixVQUErQixVQUF5QixFQUFFLFVBQWtCO1lBQTVFLGlCQU9DO1lBTEMsSUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsY0FBTSxPQUFBLElBQUksR0FBRyxFQUFFLEVBQVQsQ0FBUyxDQUFDLENBQUM7WUFDM0YsT0FBTyxZQUFZLENBQ2YsY0FBYyxFQUFFLFVBQVUsRUFDMUIsY0FBTSxPQUFBLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsS0FBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQXpDLENBQXlDLENBQUM7aUJBQzVFLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLEVBRHRCLENBQ3NCLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRU8sK0RBQThCLEdBQXRDLFVBQXVDLFVBQXlCOztZQUM5RCxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQzs7Z0JBQ2pELEtBQXdCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXpELElBQU0sU0FBUyxXQUFBO29CQUNsQixJQUFJLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFO3dCQUN4QyxJQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDM0UsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQ3RFO3lCQUFNLElBQUksbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ3pDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7OzRCQUN2RSxLQUF1QixJQUFBLDZCQUFBLGlCQUFBLFNBQVMsQ0FBQSxDQUFBLG9DQUFBLDJEQUFFO2dDQUE3QixJQUFNLFFBQVEsc0JBQUE7Z0NBQ2pCLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7NkJBQ3BEOzs7Ozs7Ozs7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFTyxpRUFBZ0MsR0FBeEMsVUFBeUMsU0FBa0M7WUFFekUsSUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztZQUNwRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUN0RSxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFDLENBQUM7YUFDNUI7aUJBQU07Z0JBQ0wsT0FBTztvQkFDTCxJQUFJLE1BQUE7b0JBQ0osV0FBVyxFQUFFO3dCQUNYLElBQUksRUFBRSxJQUFJO3dCQUNWLFVBQVUsRUFBRSxnQkFBZ0I7d0JBQzVCLFNBQVMsRUFBRSxJQUFJO3FCQUNoQjtpQkFDRixDQUFDO2FBQ0g7UUFDSCxDQUFDO1FBRU8seURBQXdCLEdBQWhDLFVBQWlDLFNBQTRCLEVBQUUsY0FBNkI7WUFFMUYsSUFBTSxTQUFTLEdBQWdDLEVBQUUsQ0FBQztZQUNsRCxJQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RCxJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNqRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hFLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsSUFBTSxXQUFTLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDeEQsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7b0JBQzVCLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFJLEVBQUUsSUFBSTt3QkFDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTs0QkFDdEIsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksTUFBQSxFQUFFLFdBQVcsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsYUFBQSxFQUFDLEVBQUMsQ0FBQyxDQUFDO3lCQUNuRTs2QkFBTTs0QkFDTCxTQUFTLENBQUMsSUFBSSxDQUNWLEVBQUMsSUFBSSxNQUFBLEVBQUUsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLGFBQUEsRUFBQyxFQUFDLENBQUMsQ0FBQzt5QkFDaEY7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7YUFDRjtZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7UUFFTyxtREFBa0IsR0FBMUIsVUFBMkIsRUFBaUI7WUFDMUMsOEVBQThFO1lBQzlFLDBEQUEwRDtZQUMxRCxJQUFNLFlBQVksR0FBRyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuRCxJQUFNLFFBQVEsR0FBRyxZQUFZLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUM7WUFDeEYsSUFBTSxhQUFhLEdBQUcsUUFBUSxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUM1RCxJQUFNLFdBQVcsR0FDYixhQUFhLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxXQUFXO2dCQUNyRixJQUFJLENBQUM7WUFDVCxPQUFPLFdBQVcsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3hFLENBQUM7UUFFTywrREFBOEIsR0FBdEMsVUFBdUMsRUFBaUI7WUFDdEQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ2pGLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVPLGtEQUFpQixHQUF6QixVQUEwQixVQUFrQixFQUFFLGNBQTZCO1lBRXpFLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRTtnQkFDeEMsSUFBTSxVQUFVLEdBQ1osSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkYsT0FBTyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsMEJBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2FBQzVGO2lCQUFNO2dCQUNMLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDbkMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUN0RSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZCLE9BQU8sVUFBVSxDQUFDLGNBQWM7b0JBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLDBCQUFZLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7YUFDMUY7UUFDSCxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBMUtELENBQTRDLDhCQUFrQixHQTBLN0Q7SUExS1ksd0RBQXNCO0lBZ0xuQyxTQUFnQix5QkFBeUIsQ0FBQyxDQUFlO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQ3JFLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNoRCxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM3QyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztJQUN0RCxDQUFDO0lBTEQsOERBS0M7SUFRRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDakUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUpELHNDQUlDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMseUJBQXlCLENBQUMsRUFBaUI7UUFDbEQsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ3BELEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUVELFNBQWdCLGdCQUFnQixDQUFDLElBQWE7UUFDNUMsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNyRSxDQUFDO0lBRkQsNENBRUM7SUFHRCxTQUFTLG1CQUFtQixDQUFDLFNBQXVCO1FBQ2xELE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ25GLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDaEQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFVBQVU7WUFDbkQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDM0MsYUFBYSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLFFBQWdCO1FBQ3RDLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFPLEdBQWMsRUFBRSxHQUFNLEVBQUUsT0FBc0I7UUFDeEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDNUI7UUFDRCxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFHLENBQUM7SUFDeEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2Fic29sdXRlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NTeW1ib2wsIERlY2xhcmF0aW9uLCBJbXBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL2VzbTVfaG9zdCc7XG5cbmV4cG9ydCBjbGFzcyBDb21tb25Kc1JlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtNVJlZmxlY3Rpb25Ib3N0IHtcbiAgcHJvdGVjdGVkIGNvbW1vbkpzRXhwb3J0cyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw+KCk7XG4gIHByb3RlY3RlZCB0b3BMZXZlbEhlbHBlckNhbGxzID0gbmV3IE1hcDxzdHJpbmcsIE1hcDx0cy5Tb3VyY2VGaWxlLCB0cy5DYWxsRXhwcmVzc2lvbltdPj4oKTtcbiAgY29uc3RydWN0b3IoXG4gICAgICBsb2dnZXI6IExvZ2dlciwgaXNDb3JlOiBib29sZWFuLCBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHByb3RlY3RlZCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgZHRzPzogQnVuZGxlUHJvZ3JhbXxudWxsKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBpc0NvcmUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgZHRzKTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCByZXF1aXJlQ2FsbCA9IHRoaXMuZmluZENvbW1vbkpzSW1wb3J0KGlkKTtcbiAgICBpZiAocmVxdWlyZUNhbGwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge2Zyb206IHJlcXVpcmVDYWxsLmFyZ3VtZW50c1swXS50ZXh0LCBuYW1lOiBpZC50ZXh0fTtcbiAgfVxuXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q29tbW9uSnNJbXBvcnRlZERlY2xhcmF0aW9uKGlkKSB8fCBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIHJldHVybiBzdXBlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlKSB8fCB0aGlzLmdldENvbW1vbkpzRXhwb3J0cyhtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldENvbW1vbkpzRXhwb3J0cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIHJldHVybiBnZXRPckRlZmF1bHQoXG4gICAgICAgIHRoaXMuY29tbW9uSnNFeHBvcnRzLCBzb3VyY2VGaWxlLCAoKSA9PiB0aGlzLmNvbXB1dGVFeHBvcnRzT2ZDb21tb25Kc01vZHVsZShzb3VyY2VGaWxlKSk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKlxuICAgKiBJbiBDb21tb25KUyB0aGVzZSBoZWxwZXIgY2FsbHMgY2FuIGJlIG91dHNpZGUgdGhlIGNsYXNzJ3MgSUlGRSBhdCB0aGUgdG9wIGxldmVsIG9mIHRoZVxuICAgKiBzb3VyY2UgZmlsZS4gU2VhcmNoaW5nIHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgaGVscGVycyBjYW4gYmUgZXhwZW5zaXZlLCBzbyB3ZVxuICAgKiB0cnkgdG8gZ2V0IGhlbHBlcnMgZnJvbSB0aGUgSUlGRSBmaXJzdCBhbmQgb25seSBmYWxsIGJhY2sgb24gc2VhcmNoaW5nIHRoZSB0b3AgbGV2ZWwgaWZcbiAgICogbm8gaGVscGVycyBhcmUgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG5vZGVzIG9mIGNhbGxzIHRvIHRoZSBoZWxwZXIgd2l0aCB0aGUgZ2l2ZW4gbmFtZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIGNvbnN0IGVzbTVIZWxwZXJDYWxscyA9IHN1cGVyLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsIGhlbHBlck5hbWUpO1xuICAgIGlmIChlc201SGVscGVyQ2FsbHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGVzbTVIZWxwZXJDYWxscztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc291cmNlRmlsZSA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VG9wTGV2ZWxIZWxwZXJDYWxscyhzb3VyY2VGaWxlLCBoZWxwZXJOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGhlbHBlciBjYWxscyBhdCB0aGUgdG9wIGxldmVsIG9mIGEgc291cmNlIGZpbGUuXG4gICAqXG4gICAqIFdlIGNhY2hlIHRoZSBoZWxwZXIgY2FsbHMgcGVyIHNvdXJjZSBmaWxlIHNvIHRoYXQgd2UgZG9uJ3QgaGF2ZSB0byBrZWVwIHBhcnNpbmcgdGhlIGNvZGUgZm9yXG4gICAqIGVhY2ggY2xhc3MgaW4gYSBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSB0aGUgc291cmNlIHdobyBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lIHRoZSBuYW1lIG9mIHRoZSBoZWxwZXIgKGUuZy4gYF9fZGVjb3JhdGVgKSB3aG9zZSBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygbm9kZXMgb2YgY2FsbHMgdG8gdGhlIGhlbHBlciB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUb3BMZXZlbEhlbHBlckNhbGxzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGhlbHBlck5hbWU6IHN0cmluZyk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICBjb25zdCBoZWxwZXJDYWxsc01hcCA9IGdldE9yRGVmYXVsdCh0aGlzLnRvcExldmVsSGVscGVyQ2FsbHMsIGhlbHBlck5hbWUsICgpID0+IG5ldyBNYXAoKSk7XG4gICAgcmV0dXJuIGdldE9yRGVmYXVsdChcbiAgICAgICAgaGVscGVyQ2FsbHNNYXAsIHNvdXJjZUZpbGUsXG4gICAgICAgICgpID0+IHNvdXJjZUZpbGUuc3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHRoaXMuZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQsIGhlbHBlck5hbWUpKVxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUV4cG9ydHNPZkNvbW1vbkpzTW9kdWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgIGlmIChpc0NvbW1vbkpzRXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSB0aGlzLmV4dHJhY3RDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudCk7XG4gICAgICAgIG1vZHVsZU1hcC5zZXQoZXhwb3J0RGVjbGFyYXRpb24ubmFtZSwgZXhwb3J0RGVjbGFyYXRpb24uZGVjbGFyYXRpb24pO1xuICAgICAgfSBlbHNlIGlmIChpc1JlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5leHRyYWN0Q29tbW9uSnNSZWV4cG9ydHMoc3RhdGVtZW50LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgICAgICBtb2R1bGVNYXAuc2V0KHJlZXhwb3J0Lm5hbWUsIHJlZXhwb3J0LmRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlTWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IENvbW1vbkpzRXhwb3J0U3RhdGVtZW50KTpcbiAgICAgIENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IGV4cG9ydEV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwb3J0RXhwcmVzc2lvbik7XG4gICAgY29uc3QgbmFtZSA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQubmFtZS50ZXh0O1xuICAgIGlmIChkZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtuYW1lLCBkZWNsYXJhdGlvbn07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiB7XG4gICAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgICBleHByZXNzaW9uOiBleHBvcnRFeHByZXNzaW9uLFxuICAgICAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q29tbW9uSnNSZWV4cG9ydHMoc3RhdGVtZW50OiBSZWV4cG9ydFN0YXRlbWVudCwgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCByZWV4cG9ydHM6IENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICAgIGNvbnN0IGltcG9ydFBhdGggPSByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHZpYU1vZHVsZSA9IHN0cmlwRXh0ZW5zaW9uKGltcG9ydGVkRmlsZS5maWxlTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnRlZEV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShpbXBvcnRlZEZpbGUpO1xuICAgICAgaWYgKGltcG9ydGVkRXhwb3J0cyAhPT0gbnVsbCkge1xuICAgICAgICBpbXBvcnRlZEV4cG9ydHMuZm9yRWFjaCgoZGVjbCwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChkZWNsLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lLCBkZWNsYXJhdGlvbjoge25vZGU6IGRlY2wubm9kZSwgdmlhTW9kdWxlfX0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWV4cG9ydHMucHVzaChcbiAgICAgICAgICAgICAgICB7bmFtZSwgZGVjbGFyYXRpb246IHtub2RlOiBudWxsLCBleHByZXNzaW9uOiBkZWNsLmV4cHJlc3Npb24sIHZpYU1vZHVsZX19KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVleHBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kQ29tbW9uSnNJbXBvcnQoaWQ6IHRzLklkZW50aWZpZXIpOiBSZXF1aXJlQ2FsbHxudWxsIHtcbiAgICAvLyBJcyBgaWRgIGEgbmFtZXNwYWNlZCBwcm9wZXJ0eSBhY2Nlc3MsIGUuZy4gYERpcmVjdGl2ZWAgaW4gYGNvcmUuRGlyZWN0aXZlYD9cbiAgICAvLyBJZiBzbyBjYXB0dXJlIHRoZSBzeW1ib2wgb2YgdGhlIG5hbWVzcGFjZSwgZS5nLiBgY29yZWAuXG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgY29uc3QgbnNTeW1ib2wgPSBuc0lkZW50aWZpZXIgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obnNJZGVudGlmaWVyKSB8fCBudWxsO1xuICAgIGNvbnN0IG5zRGVjbGFyYXRpb24gPSBuc1N5bWJvbCAmJiBuc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID1cbiAgICAgICAgbnNEZWNsYXJhdGlvbiAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obnNEZWNsYXJhdGlvbikgJiYgbnNEZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fFxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBpbml0aWFsaXplciAmJiBpc1JlcXVpcmVDYWxsKGluaXRpYWxpemVyKSA/IGluaXRpYWxpemVyIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29tbW9uSnNJbXBvcnRlZERlY2xhcmF0aW9uKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0SW5mbyA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkKTtcbiAgICBpZiAoaW1wb3J0SW5mbyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShpbXBvcnRJbmZvLmZyb20sIGlkLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKGltcG9ydGVkRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge25vZGU6IGltcG9ydGVkRmlsZSwgdmlhTW9kdWxlOiBpbXBvcnRJbmZvLmZyb219O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuY29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcykge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9XG4gICAgICAgICAgdGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKFttb2R1bGVOYW1lXSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUpWzBdO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8gJiYgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSxcbiAgICAgICAgICB0aGlzLmNvbXBpbGVySG9zdCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZSAmJlxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9XG4gIH1cbn1cblxudHlwZSBDb21tb25Kc0V4cG9ydFN0YXRlbWVudCA9IHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7XG4gIGV4cHJlc3Npb246XG4gICAgICB0cy5CaW5hcnlFeHByZXNzaW9uICYge2xlZnQ6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiAmIHtleHByZXNzaW9uOiB0cy5JZGVudGlmaWVyfX1cbn07XG5leHBvcnQgZnVuY3Rpb24gaXNDb21tb25Kc0V4cG9ydFN0YXRlbWVudChzOiB0cy5TdGF0ZW1lbnQpOiBzIGlzIENvbW1vbkpzRXhwb3J0U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzKSAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocy5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocy5leHByZXNzaW9uLmxlZnQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIocy5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHMuZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb24udGV4dCA9PT0gJ2V4cG9ydHMnO1xufVxuXG5pbnRlcmZhY2UgQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgZGVjbGFyYXRpb246IERlY2xhcmF0aW9uO1xufVxuXG5leHBvcnQgdHlwZSBSZXF1aXJlQ2FsbCA9IHRzLkNhbGxFeHByZXNzaW9uICYge2FyZ3VtZW50czogW3RzLlN0cmluZ0xpdGVyYWxdfTtcbmV4cG9ydCBmdW5jdGlvbiBpc1JlcXVpcmVDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIFJlcXVpcmVDYWxsIHtcbiAgcmV0dXJuIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSAncmVxdWlyZScgJiYgbm9kZS5hcmd1bWVudHMubGVuZ3RoID09PSAxICYmXG4gICAgICB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5hcmd1bWVudHNbMF0pO1xufVxuXG4vKipcbiAqIElmIHRoZSBpZGVudGlmaWVyIGBpZGAgaXMgdGhlIFJIUyBvZiBhIHByb3BlcnR5IGFjY2VzcyBvZiB0aGUgZm9ybSBgbmFtZXNwYWNlLmlkYFxuICogYW5kIGBuYW1lc3BhY2VgIGlzIGFuIGlkZW50aWZlciB0aGVuIHJldHVybiBgbmFtZXNwYWNlYCwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqIEBwYXJhbSBpZCBUaGUgaWRlbnRpZmllciB3aG9zZSBuYW1lc3BhY2Ugd2Ugd2FudCB0byBmaW5kLlxuICovXG5mdW5jdGlvbiBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgcmV0dXJuIGlkLnBhcmVudCAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihpZC5wYXJlbnQpICYmXG4gICAgICAgICAgdHMuaXNJZGVudGlmaWVyKGlkLnBhcmVudC5leHByZXNzaW9uKSA/XG4gICAgICBpZC5wYXJlbnQuZXhwcmVzc2lvbiA6XG4gICAgICBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBQYXJlbnRoZXNlcyhub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gIHJldHVybiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpID8gbm9kZS5leHByZXNzaW9uIDogbm9kZTtcbn1cblxudHlwZSBSZWV4cG9ydFN0YXRlbWVudCA9IHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7ZXhwcmVzc2lvbjoge2FyZ3VtZW50czogW1JlcXVpcmVDYWxsXX19O1xuZnVuY3Rpb24gaXNSZWV4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyBSZWV4cG9ydFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24pICYmXG4gICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uLnRleHQgPT09ICdfX2V4cG9ydCcgJiZcbiAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICAgIGlzUmVxdWlyZUNhbGwoc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdKTtcbn1cblxuZnVuY3Rpb24gc3RyaXBFeHRlbnNpb24oZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlTmFtZS5yZXBsYWNlKC9cXC4uKyQvLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGdldE9yRGVmYXVsdDxLLCBWPihtYXA6IE1hcDxLLCBWPiwga2V5OiBLLCBmYWN0b3J5OiAoa2V5OiBLKSA9PiBWKTogViB7XG4gIGlmICghbWFwLmhhcyhrZXkpKSB7XG4gICAgbWFwLnNldChrZXksIGZhY3Rvcnkoa2V5KSk7XG4gIH1cbiAgcmV0dXJuIG1hcC5nZXQoa2V5KSAhO1xufSJdfQ==