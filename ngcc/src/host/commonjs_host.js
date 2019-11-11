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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9ob3N0L2NvbW1vbmpzX2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBQ2pDLDJFQUE0RDtJQUk1RCw4REFBbUM7SUFFbkMsMkVBQStDO0lBRy9DO1FBQTRDLGtEQUFrQjtRQUc1RCxnQ0FDSSxNQUFjLEVBQUUsTUFBZSxFQUFZLE9BQW1CLEVBQ3BELFlBQTZCLEVBQUUsR0FBd0I7WUFGckUsWUFHRSxrQkFBTSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxHQUFHLENBQUMsU0FDckQ7WUFIOEMsYUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUNwRCxrQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFKakMscUJBQWUsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQztZQUMxRSx5QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBbUQsQ0FBQzs7UUFLM0YsQ0FBQztRQUVELHNEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLFdBQVcsR0FBRyxpQkFBTSxxQkFBcUIsWUFBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO1lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sRUFBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJ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QyxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUMsUUFBZ0I7UUFDdEMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQU8sR0FBYyxFQUFFLEdBQU0sRUFBRSxPQUFzQjtRQUN4RSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNqQixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUM1QjtRQUNELE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUcsQ0FBQztJQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7YWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgSW1wb3J0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2x9IGZyb20gJy4vbmdjY19ob3N0JztcblxuZXhwb3J0IGNsYXNzIENvbW1vbkpzUmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc201UmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgY29tbW9uSnNFeHBvcnRzID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbD4oKTtcbiAgcHJvdGVjdGVkIHRvcExldmVsSGVscGVyQ2FsbHMgPSBuZXcgTWFwPHN0cmluZywgTWFwPHRzLlNvdXJjZUZpbGUsIHRzLkNhbGxFeHByZXNzaW9uW10+PigpO1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGxvZ2dlcjogTG9nZ2VyLCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcHJvdGVjdGVkIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0LCBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihsb2dnZXIsIGlzQ29yZSwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBkdHMpO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHN1cGVySW1wb3J0ID0gc3VwZXIuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkKTtcbiAgICBpZiAoc3VwZXJJbXBvcnQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdXBlckltcG9ydDtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1aXJlQ2FsbCA9IHRoaXMuZmluZENvbW1vbkpzSW1wb3J0KGlkKTtcbiAgICBpZiAocmVxdWlyZUNhbGwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge2Zyb206IHJlcXVpcmVDYWxsLmFyZ3VtZW50c1swXS50ZXh0LCBuYW1lOiBpZC50ZXh0fTtcbiAgfVxuXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q29tbW9uSnNJbXBvcnRlZERlY2xhcmF0aW9uKGlkKSB8fCBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIHJldHVybiBzdXBlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlKSB8fCB0aGlzLmdldENvbW1vbkpzRXhwb3J0cyhtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldENvbW1vbkpzRXhwb3J0cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIHJldHVybiBnZXRPckRlZmF1bHQoXG4gICAgICAgIHRoaXMuY29tbW9uSnNFeHBvcnRzLCBzb3VyY2VGaWxlLCAoKSA9PiB0aGlzLmNvbXB1dGVFeHBvcnRzT2ZDb21tb25Kc01vZHVsZShzb3VyY2VGaWxlKSk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKlxuICAgKiBJbiBDb21tb25KUyB0aGVzZSBoZWxwZXIgY2FsbHMgY2FuIGJlIG91dHNpZGUgdGhlIGNsYXNzJ3MgSUlGRSBhdCB0aGUgdG9wIGxldmVsIG9mIHRoZVxuICAgKiBzb3VyY2UgZmlsZS4gU2VhcmNoaW5nIHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgaGVscGVycyBjYW4gYmUgZXhwZW5zaXZlLCBzbyB3ZVxuICAgKiB0cnkgdG8gZ2V0IGhlbHBlcnMgZnJvbSB0aGUgSUlGRSBmaXJzdCBhbmQgb25seSBmYWxsIGJhY2sgb24gc2VhcmNoaW5nIHRoZSB0b3AgbGV2ZWwgaWZcbiAgICogbm8gaGVscGVycyBhcmUgZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG5vZGVzIG9mIGNhbGxzIHRvIHRoZSBoZWxwZXIgd2l0aCB0aGUgZ2l2ZW4gbmFtZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICBjb25zdCBlc201SGVscGVyQ2FsbHMgPSBzdXBlci5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sLCBoZWxwZXJOYW1lcyk7XG4gICAgaWYgKGVzbTVIZWxwZXJDYWxscy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gZXNtNUhlbHBlckNhbGxzO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VGaWxlID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUb3BMZXZlbEhlbHBlckNhbGxzKHNvdXJjZUZpbGUsIGhlbHBlck5hbWVzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGhlbHBlciBjYWxscyBhdCB0aGUgdG9wIGxldmVsIG9mIGEgc291cmNlIGZpbGUuXG4gICAqXG4gICAqIFdlIGNhY2hlIHRoZSBoZWxwZXIgY2FsbHMgcGVyIHNvdXJjZSBmaWxlIHNvIHRoYXQgd2UgZG9uJ3QgaGF2ZSB0byBrZWVwIHBhcnNpbmcgdGhlIGNvZGUgZm9yXG4gICAqIGVhY2ggY2xhc3MgaW4gYSBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSB0aGUgc291cmNlIHdobyBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lcyB0aGUgbmFtZXMgb2YgdGhlIGhlbHBlcnMgKGUuZy4gYF9fZGVjb3JhdGVgKSB3aG9zZSBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZFxuICAgKiBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygbm9kZXMgb2YgY2FsbHMgdG8gdGhlIGhlbHBlciB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUb3BMZXZlbEhlbHBlckNhbGxzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICBjb25zdCBjYWxsczogdHMuQ2FsbEV4cHJlc3Npb25bXSA9IFtdO1xuICAgIGhlbHBlck5hbWVzLmZvckVhY2goaGVscGVyTmFtZSA9PiB7XG4gICAgICBjb25zdCBoZWxwZXJDYWxsc01hcCA9IGdldE9yRGVmYXVsdCh0aGlzLnRvcExldmVsSGVscGVyQ2FsbHMsIGhlbHBlck5hbWUsICgpID0+IG5ldyBNYXAoKSk7XG4gICAgICBjYWxscy5wdXNoKC4uLmdldE9yRGVmYXVsdChcbiAgICAgICAgICBoZWxwZXJDYWxsc01hcCwgc291cmNlRmlsZSxcbiAgICAgICAgICAoKSA9PiBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiB0aGlzLmdldEhlbHBlckNhbGwoc3RhdGVtZW50LCBoZWxwZXJOYW1lcykpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKSkpO1xuICAgIH0pO1xuICAgIHJldHVybiBjYWxscztcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUV4cG9ydHNPZkNvbW1vbkpzTW9kdWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgIGlmIChpc0NvbW1vbkpzRXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSB0aGlzLmV4dHJhY3RDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudCk7XG4gICAgICAgIG1vZHVsZU1hcC5zZXQoZXhwb3J0RGVjbGFyYXRpb24ubmFtZSwgZXhwb3J0RGVjbGFyYXRpb24uZGVjbGFyYXRpb24pO1xuICAgICAgfSBlbHNlIGlmIChpc1JlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5leHRyYWN0Q29tbW9uSnNSZWV4cG9ydHMoc3RhdGVtZW50LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgICAgICBtb2R1bGVNYXAuc2V0KHJlZXhwb3J0Lm5hbWUsIHJlZXhwb3J0LmRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlTWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IENvbW1vbkpzRXhwb3J0U3RhdGVtZW50KTpcbiAgICAgIENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IGV4cG9ydEV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwb3J0RXhwcmVzc2lvbik7XG4gICAgY29uc3QgbmFtZSA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQubmFtZS50ZXh0O1xuICAgIGlmIChkZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtuYW1lLCBkZWNsYXJhdGlvbn07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiB7XG4gICAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgICBleHByZXNzaW9uOiBleHBvcnRFeHByZXNzaW9uLFxuICAgICAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q29tbW9uSnNSZWV4cG9ydHMoc3RhdGVtZW50OiBSZWV4cG9ydFN0YXRlbWVudCwgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgQ29tbW9uSnNFeHBvcnREZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCByZWV4cG9ydHM6IENvbW1vbkpzRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICAgIGNvbnN0IGltcG9ydFBhdGggPSByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHZpYU1vZHVsZSA9IHN0cmlwRXh0ZW5zaW9uKGltcG9ydGVkRmlsZS5maWxlTmFtZSk7XG4gICAgICBjb25zdCBpbXBvcnRlZEV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShpbXBvcnRlZEZpbGUpO1xuICAgICAgaWYgKGltcG9ydGVkRXhwb3J0cyAhPT0gbnVsbCkge1xuICAgICAgICBpbXBvcnRlZEV4cG9ydHMuZm9yRWFjaCgoZGVjbCwgbmFtZSkgPT4ge1xuICAgICAgICAgIGlmIChkZWNsLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lLCBkZWNsYXJhdGlvbjoge25vZGU6IGRlY2wubm9kZSwgdmlhTW9kdWxlfX0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWV4cG9ydHMucHVzaChcbiAgICAgICAgICAgICAgICB7bmFtZSwgZGVjbGFyYXRpb246IHtub2RlOiBudWxsLCBleHByZXNzaW9uOiBkZWNsLmV4cHJlc3Npb24sIHZpYU1vZHVsZX19KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVleHBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kQ29tbW9uSnNJbXBvcnQoaWQ6IHRzLklkZW50aWZpZXIpOiBSZXF1aXJlQ2FsbHxudWxsIHtcbiAgICAvLyBJcyBgaWRgIGEgbmFtZXNwYWNlZCBwcm9wZXJ0eSBhY2Nlc3MsIGUuZy4gYERpcmVjdGl2ZWAgaW4gYGNvcmUuRGlyZWN0aXZlYD9cbiAgICAvLyBJZiBzbyBjYXB0dXJlIHRoZSBzeW1ib2wgb2YgdGhlIG5hbWVzcGFjZSwgZS5nLiBgY29yZWAuXG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgY29uc3QgbnNTeW1ib2wgPSBuc0lkZW50aWZpZXIgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obnNJZGVudGlmaWVyKSB8fCBudWxsO1xuICAgIGNvbnN0IG5zRGVjbGFyYXRpb24gPSBuc1N5bWJvbCAmJiBuc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID1cbiAgICAgICAgbnNEZWNsYXJhdGlvbiAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obnNEZWNsYXJhdGlvbikgJiYgbnNEZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fFxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBpbml0aWFsaXplciAmJiBpc1JlcXVpcmVDYWxsKGluaXRpYWxpemVyKSA/IGluaXRpYWxpemVyIDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q29tbW9uSnNJbXBvcnRlZERlY2xhcmF0aW9uKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0SW5mbyA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkKTtcbiAgICBpZiAoaW1wb3J0SW5mbyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShpbXBvcnRJbmZvLmZyb20sIGlkLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKGltcG9ydGVkRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB2aWFNb2R1bGUgPSAhaW1wb3J0SW5mby5mcm9tLnN0YXJ0c1dpdGgoJy4nKSA/IGltcG9ydEluZm8uZnJvbSA6IG51bGw7XG4gICAgcmV0dXJuIHtub2RlOiBpbXBvcnRlZEZpbGUsIHZpYU1vZHVsZX07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgICAgIFttb2R1bGVOYW1lXSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSlbMF07XG4gICAgICByZXR1cm4gbW9kdWxlSW5mbyAmJiB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICBtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpLFxuICAgICAgICAgIHRoaXMuY29tcGlsZXJIb3N0KTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlICYmXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIENvbW1vbkpzRXhwb3J0U3RhdGVtZW50ID0gdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtcbiAgZXhwcmVzc2lvbjpcbiAgICAgIHRzLkJpbmFyeUV4cHJlc3Npb24gJiB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uICYge2V4cHJlc3Npb246IHRzLklkZW50aWZpZXJ9fVxufTtcbmV4cG9ydCBmdW5jdGlvbiBpc0NvbW1vbkpzRXhwb3J0U3RhdGVtZW50KHM6IHRzLlN0YXRlbWVudCk6IHMgaXMgQ29tbW9uSnNFeHBvcnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHMpICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzLmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzLmV4cHJlc3Npb24ubGVmdCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzLmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uKSAmJlxuICAgICAgcy5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnZXhwb3J0cyc7XG59XG5cbmludGVyZmFjZSBDb21tb25Kc0V4cG9ydERlY2xhcmF0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBkZWNsYXJhdGlvbjogRGVjbGFyYXRpb247XG59XG5cbmV4cG9ydCB0eXBlIFJlcXVpcmVDYWxsID0gdHMuQ2FsbEV4cHJlc3Npb24gJiB7YXJndW1lbnRzOiBbdHMuU3RyaW5nTGl0ZXJhbF19O1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVxdWlyZUNhbGwobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgUmVxdWlyZUNhbGwge1xuICByZXR1cm4gdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09ICdyZXF1aXJlJyAmJiBub2RlLmFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlLmFyZ3VtZW50c1swXSk7XG59XG5cbi8qKlxuICogSWYgdGhlIGlkZW50aWZpZXIgYGlkYCBpcyB0aGUgUkhTIG9mIGEgcHJvcGVydHkgYWNjZXNzIG9mIHRoZSBmb3JtIGBuYW1lc3BhY2UuaWRgXG4gKiBhbmQgYG5hbWVzcGFjZWAgaXMgYW4gaWRlbnRpZmVyIHRoZW4gcmV0dXJuIGBuYW1lc3BhY2VgLCBvdGhlcndpc2UgYG51bGxgLlxuICogQHBhcmFtIGlkIFRoZSBpZGVudGlmaWVyIHdob3NlIG5hbWVzcGFjZSB3ZSB3YW50IHRvIGZpbmQuXG4gKi9cbmZ1bmN0aW9uIGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICByZXR1cm4gaWQucGFyZW50ICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoaWQucGFyZW50LmV4cHJlc3Npb24pID9cbiAgICAgIGlkLnBhcmVudC5leHByZXNzaW9uIDpcbiAgICAgIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFBhcmVudGhlc2VzKG5vZGU6IHRzLk5vZGUpOiB0cy5Ob2RlIHtcbiAgcmV0dXJuIHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkgPyBub2RlLmV4cHJlc3Npb24gOiBub2RlO1xufVxuXG50eXBlIFJlZXhwb3J0U3RhdGVtZW50ID0gdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtleHByZXNzaW9uOiB7YXJndW1lbnRzOiBbUmVxdWlyZUNhbGxdfX07XG5mdW5jdGlvbiBpc1JlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIFJlZXhwb3J0U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgJiZcbiAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gJ19fZXhwb3J0JyAmJlxuICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJlxuICAgICAgaXNSZXF1aXJlQ2FsbChzdGF0ZW1lbnQuZXhwcmVzc2lvbi5hcmd1bWVudHNbMF0pO1xufVxuXG5mdW5jdGlvbiBzdHJpcEV4dGVuc2lvbihmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZpbGVOYW1lLnJlcGxhY2UoL1xcLi4rJC8sICcnKTtcbn1cblxuZnVuY3Rpb24gZ2V0T3JEZWZhdWx0PEssIFY+KG1hcDogTWFwPEssIFY+LCBrZXk6IEssIGZhY3Rvcnk6IChrZXk6IEspID0+IFYpOiBWIHtcbiAgaWYgKCFtYXAuaGFzKGtleSkpIHtcbiAgICBtYXAuc2V0KGtleSwgZmFjdG9yeShrZXkpKTtcbiAgfVxuICByZXR1cm4gbWFwLmdldChrZXkpICE7XG59XG4iXX0=