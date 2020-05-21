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
        define("@angular/compiler-cli/ngcc/src/host/umd_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/host/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getImportsOfUmdModule = exports.parseStatementForUmdModule = exports.UmdReflectionHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/host/utils");
    var UmdReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(UmdReflectionHost, _super);
        function UmdReflectionHost(logger, isCore, src, dts) {
            if (dts === void 0) { dts = null; }
            var _this = _super.call(this, logger, isCore, src, dts) || this;
            _this.umdModules = new utils_1.FactoryMap(function (sf) { return _this.computeUmdModule(sf); });
            _this.umdExports = new utils_1.FactoryMap(function (sf) { return _this.computeExportsOfUmdModule(sf); });
            _this.umdImportPaths = new utils_1.FactoryMap(function (param) { return _this.computeImportPath(param); });
            _this.program = src.program;
            _this.compilerHost = src.host;
            return _this;
        }
        UmdReflectionHost.prototype.getImportOfIdentifier = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = commonjs_umd_utils_1.findNamespaceOfIdentifier(id);
            var importParameter = nsIdentifier && this.findUmdImportParameter(nsIdentifier);
            var from = importParameter && this.getUmdImportPath(importParameter);
            return from !== null ? { from: from, name: id.text } : null;
        };
        UmdReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            return this.getUmdModuleDeclaration(id) || this.getUmdDeclaration(id) ||
                _super.prototype.getDeclarationOfIdentifier.call(this, id);
        };
        UmdReflectionHost.prototype.getExportsOfModule = function (module) {
            return _super.prototype.getExportsOfModule.call(this, module) || this.umdExports.get(module.getSourceFile());
        };
        UmdReflectionHost.prototype.getUmdModule = function (sourceFile) {
            if (sourceFile.isDeclarationFile) {
                return null;
            }
            return this.umdModules.get(sourceFile);
        };
        UmdReflectionHost.prototype.getUmdImportPath = function (importParameter) {
            return this.umdImportPaths.get(importParameter);
        };
        /**
         * Get the top level statements for a module.
         *
         * In UMD modules these are the body of the UMD factory function.
         *
         * @param sourceFile The module whose statements we want.
         * @returns An array of top level statements for the given module.
         */
        UmdReflectionHost.prototype.getModuleStatements = function (sourceFile) {
            var umdModule = this.getUmdModule(sourceFile);
            return umdModule !== null ? Array.from(umdModule.factoryFn.body.statements) : [];
        };
        UmdReflectionHost.prototype.computeUmdModule = function (sourceFile) {
            if (sourceFile.statements.length !== 1) {
                throw new Error("Expected UMD module file (" + sourceFile.fileName + ") to contain exactly one statement, " +
                    ("but found " + sourceFile.statements.length + "."));
            }
            return parseStatementForUmdModule(sourceFile.statements[0]);
        };
        UmdReflectionHost.prototype.computeExportsOfUmdModule = function (sourceFile) {
            var e_1, _a, e_2, _b;
            var moduleMap = new Map();
            try {
                for (var _c = tslib_1.__values(this.getModuleStatements(sourceFile)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if (commonjs_umd_utils_1.isExportStatement(statement)) {
                        var exportDeclaration = this.extractBasicUmdExportDeclaration(statement);
                        moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                    }
                    else if (commonjs_umd_utils_1.isWildcardReexportStatement(statement)) {
                        var reexports = this.extractUmdWildcardReexports(statement, sourceFile);
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
                    else if (commonjs_umd_utils_1.isDefinePropertyReexportStatement(statement)) {
                        var exportDeclaration = this.extractUmdDefinePropertyExportDeclaration(statement);
                        if (exportDeclaration !== null) {
                            moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
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
        UmdReflectionHost.prototype.computeImportPath = function (param) {
            var e_3, _a;
            var umdModule = this.getUmdModule(param.getSourceFile());
            if (umdModule === null) {
                return null;
            }
            var imports = getImportsOfUmdModule(umdModule);
            if (imports === null) {
                return null;
            }
            var importPath = null;
            try {
                for (var imports_1 = tslib_1.__values(imports), imports_1_1 = imports_1.next(); !imports_1_1.done; imports_1_1 = imports_1.next()) {
                    var i = imports_1_1.value;
                    // Add all imports to the map to speed up future look ups.
                    this.umdImportPaths.set(i.parameter, i.path);
                    if (i.parameter === param) {
                        importPath = i.path;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (imports_1_1 && !imports_1_1.done && (_a = imports_1.return)) _a.call(imports_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return importPath;
        };
        UmdReflectionHost.prototype.extractBasicUmdExportDeclaration = function (statement) {
            var name = statement.expression.left.name.text;
            var exportExpression = statement.expression.right;
            return this.extractUmdExportDeclaration(name, exportExpression);
        };
        UmdReflectionHost.prototype.extractUmdWildcardReexports = function (statement, containingFile) {
            var reexportArg = statement.expression.arguments[0];
            var requireCall = commonjs_umd_utils_1.isRequireCall(reexportArg) ?
                reexportArg :
                ts.isIdentifier(reexportArg) ? commonjs_umd_utils_1.findRequireCallReference(reexportArg, this.checker) : null;
            var importPath = null;
            if (requireCall !== null) {
                importPath = requireCall.arguments[0].text;
            }
            else if (ts.isIdentifier(reexportArg)) {
                var importParameter = this.findUmdImportParameter(reexportArg);
                importPath = importParameter && this.getUmdImportPath(importParameter);
            }
            if (importPath === null) {
                return [];
            }
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
                    reexports.push({
                        name: name,
                        declaration: { node: decl.node, known: null, viaModule: viaModule, identity: decl.identity }
                    });
                }
                else {
                    reexports.push({ name: name, declaration: { node: null, known: null, expression: decl.expression, viaModule: viaModule } });
                }
            });
            return reexports;
        };
        UmdReflectionHost.prototype.extractUmdDefinePropertyExportDeclaration = function (statement) {
            var args = statement.expression.arguments;
            var name = args[1].text;
            var getterFnExpression = commonjs_umd_utils_1.extractGetterFnExpression(statement);
            if (getterFnExpression === null) {
                return null;
            }
            return this.extractUmdExportDeclaration(name, getterFnExpression);
        };
        UmdReflectionHost.prototype.extractUmdExportDeclaration = function (name, expression) {
            var declaration = this.getDeclarationOfExpression(expression);
            if (declaration !== null) {
                return { name: name, declaration: declaration };
            }
            return {
                name: name,
                declaration: { node: null, known: null, expression: expression, viaModule: null },
            };
        };
        /**
         * Is the identifier a parameter on a UMD factory function, e.g. `function factory(this, core)`?
         * If so then return its declaration.
         */
        UmdReflectionHost.prototype.findUmdImportParameter = function (id) {
            var symbol = id && this.checker.getSymbolAtLocation(id) || null;
            var declaration = symbol && symbol.valueDeclaration;
            return declaration && ts.isParameter(declaration) ? declaration : null;
        };
        UmdReflectionHost.prototype.getUmdDeclaration = function (id) {
            var nsIdentifier = commonjs_umd_utils_1.findNamespaceOfIdentifier(id);
            if (nsIdentifier === null) {
                return null;
            }
            var moduleDeclaration = this.getUmdModuleDeclaration(nsIdentifier);
            if (moduleDeclaration === null || moduleDeclaration.node === null ||
                !ts.isSourceFile(moduleDeclaration.node)) {
                return null;
            }
            var moduleExports = this.getExportsOfModule(moduleDeclaration.node);
            if (moduleExports === null) {
                return null;
            }
            // We need to compute the `viaModule` because  the `getExportsOfModule()` call
            // did not know that we were importing the declaration.
            var declaration = moduleExports.get(id.text);
            if (!moduleExports.has(id.text)) {
                return null;
            }
            // We need to compute the `viaModule` because  the `getExportsOfModule()` call
            // did not know that we were importing the declaration.
            var viaModule = declaration.viaModule === null ? moduleDeclaration.viaModule : declaration.viaModule;
            return tslib_1.__assign(tslib_1.__assign({}, declaration), { viaModule: viaModule, known: utils_1.getTsHelperFnFromIdentifier(id) });
        };
        UmdReflectionHost.prototype.getUmdModuleDeclaration = function (id) {
            var importPath = this.getImportPathFromParameter(id) || this.getImportPathFromRequireCall(id);
            if (importPath === null) {
                return null;
            }
            var module = this.resolveModuleName(importPath, id.getSourceFile());
            if (module === undefined) {
                return null;
            }
            var viaModule = commonjs_umd_utils_1.isExternalImport(importPath) ? importPath : null;
            return { node: module, viaModule: viaModule, known: null, identity: null };
        };
        UmdReflectionHost.prototype.getImportPathFromParameter = function (id) {
            var importParameter = this.findUmdImportParameter(id);
            if (importParameter === null) {
                return null;
            }
            return this.getUmdImportPath(importParameter);
        };
        UmdReflectionHost.prototype.getImportPathFromRequireCall = function (id) {
            var requireCall = commonjs_umd_utils_1.findRequireCallReference(id, this.checker);
            if (requireCall === null) {
                return null;
            }
            return requireCall.arguments[0].text;
        };
        UmdReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
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
        return UmdReflectionHost;
    }(esm5_host_1.Esm5ReflectionHost));
    exports.UmdReflectionHost = UmdReflectionHost;
    function parseStatementForUmdModule(statement) {
        var wrapperCall = getUmdWrapperCall(statement);
        if (!wrapperCall)
            return null;
        var wrapperFn = wrapperCall.expression;
        if (!ts.isFunctionExpression(wrapperFn))
            return null;
        var factoryFnParamIndex = wrapperFn.parameters.findIndex(function (parameter) { return ts.isIdentifier(parameter.name) && parameter.name.text === 'factory'; });
        if (factoryFnParamIndex === -1)
            return null;
        var factoryFn = utils_2.stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
        if (!factoryFn || !ts.isFunctionExpression(factoryFn))
            return null;
        return { wrapperFn: wrapperFn, factoryFn: factoryFn };
    }
    exports.parseStatementForUmdModule = parseStatementForUmdModule;
    function getUmdWrapperCall(statement) {
        if (!ts.isExpressionStatement(statement) || !ts.isParenthesizedExpression(statement.expression) ||
            !ts.isCallExpression(statement.expression.expression) ||
            !ts.isFunctionExpression(statement.expression.expression.expression)) {
            return null;
        }
        return statement.expression.expression;
    }
    function getImportsOfUmdModule(umdModule) {
        var imports = [];
        for (var i = 1; i < umdModule.factoryFn.parameters.length; i++) {
            imports.push({
                parameter: umdModule.factoryFn.parameters[i],
                path: getRequiredModulePath(umdModule.wrapperFn, i)
            });
        }
        return imports;
    }
    exports.getImportsOfUmdModule = getImportsOfUmdModule;
    function getRequiredModulePath(wrapperFn, paramIndex) {
        var statement = wrapperFn.body.statements[0];
        if (!ts.isExpressionStatement(statement)) {
            throw new Error('UMD wrapper body is not an expression statement:\n' + wrapperFn.body.getText());
        }
        var modulePaths = [];
        findModulePaths(statement.expression);
        // Since we were only interested in the `require()` calls, we miss the `exports` argument, so we
        // need to subtract 1.
        // E.g. `function(exports, dep1, dep2)` maps to `function(exports, require('path/to/dep1'),
        // require('path/to/dep2'))`
        return modulePaths[paramIndex - 1];
        // Search the statement for calls to `require('...')` and extract the string value of the first
        // argument
        function findModulePaths(node) {
            if (commonjs_umd_utils_1.isRequireCall(node)) {
                var argument = node.arguments[0];
                if (ts.isStringLiteral(argument)) {
                    modulePaths.push(argument.text);
                }
            }
            else {
                node.forEachChild(findModulePaths);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCw4REFBaUY7SUFFakYsNkZBQXdVO0lBQ3hVLDJFQUErQztJQUMvQyxtRUFBeUM7SUFFekM7UUFBdUMsNkNBQWtCO1FBVXZELDJCQUFZLE1BQWMsRUFBRSxNQUFlLEVBQUUsR0FBa0IsRUFBRSxHQUE4QjtZQUE5QixvQkFBQSxFQUFBLFVBQThCO1lBQS9GLFlBQ0Usa0JBQU0sTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFNBR2hDO1lBYlMsZ0JBQVUsR0FDaEIsSUFBSSxrQkFBVSxDQUFnQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEtBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsRUFBekIsQ0FBeUIsQ0FBQyxDQUFDO1lBQ3pFLGdCQUFVLEdBQUcsSUFBSSxrQkFBVSxDQUNqQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEtBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDO1lBQ3BDLG9CQUFjLEdBQ3BCLElBQUksa0JBQVUsQ0FBdUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQTdCLENBQTZCLENBQUMsQ0FBQztZQU0vRixLQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFDM0IsS0FBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDOztRQUMvQixDQUFDO1FBRUQsaURBQXFCLEdBQXJCLFVBQXNCLEVBQWlCO1lBQ3JDLDhFQUE4RTtZQUM5RSwwREFB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Q3BDLElBQUksa0NBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkIsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNoQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakM7YUFDRjtpQkFBTTtnQkFDTCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ3BDO1FBQ0gsQ0FBQztJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIEltcG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtGYWN0b3J5TWFwLCBnZXRUc0hlbHBlckZuRnJvbUlkZW50aWZpZXIsIHN0cmlwRXh0ZW5zaW9ufSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudCwgRXhwb3J0RGVjbGFyYXRpb24sIEV4cG9ydFN0YXRlbWVudCwgZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbiwgZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllciwgZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlLCBpc0RlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQsIGlzRXhwb3J0U3RhdGVtZW50LCBpc0V4dGVybmFsSW1wb3J0LCBpc1JlcXVpcmVDYWxsLCBpc1dpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnQsIFdpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnR9IGZyb20gJy4vY29tbW9uanNfdW1kX3V0aWxzJztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL2VzbTVfaG9zdCc7XG5pbXBvcnQge3N0cmlwUGFyZW50aGVzZXN9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgVW1kUmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc201UmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgdW1kTW9kdWxlcyA9XG4gICAgICBuZXcgRmFjdG9yeU1hcDx0cy5Tb3VyY2VGaWxlLCBVbWRNb2R1bGV8bnVsbD4oc2YgPT4gdGhpcy5jb21wdXRlVW1kTW9kdWxlKHNmKSk7XG4gIHByb3RlY3RlZCB1bWRFeHBvcnRzID0gbmV3IEZhY3RvcnlNYXA8dHMuU291cmNlRmlsZSwgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw+KFxuICAgICAgc2YgPT4gdGhpcy5jb21wdXRlRXhwb3J0c09mVW1kTW9kdWxlKHNmKSk7XG4gIHByb3RlY3RlZCB1bWRJbXBvcnRQYXRocyA9XG4gICAgICBuZXcgRmFjdG9yeU1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgc3RyaW5nfG51bGw+KHBhcmFtID0+IHRoaXMuY29tcHV0ZUltcG9ydFBhdGgocGFyYW0pKTtcbiAgcHJvdGVjdGVkIHByb2dyYW06IHRzLlByb2dyYW07XG4gIHByb3RlY3RlZCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcblxuICBjb25zdHJ1Y3Rvcihsb2dnZXI6IExvZ2dlciwgaXNDb3JlOiBib29sZWFuLCBzcmM6IEJ1bmRsZVByb2dyYW0sIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGxvZ2dlciwgaXNDb3JlLCBzcmMsIGR0cyk7XG4gICAgdGhpcy5wcm9ncmFtID0gc3JjLnByb2dyYW07XG4gICAgdGhpcy5jb21waWxlckhvc3QgPSBzcmMuaG9zdDtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICAvLyBJcyBgaWRgIGEgbmFtZXNwYWNlZCBwcm9wZXJ0eSBhY2Nlc3MsIGUuZy4gYERpcmVjdGl2ZWAgaW4gYGNvcmUuRGlyZWN0aXZlYD9cbiAgICAvLyBJZiBzbyBjYXB0dXJlIHRoZSBzeW1ib2wgb2YgdGhlIG5hbWVzcGFjZSwgZS5nLiBgY29yZWAuXG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gbnNJZGVudGlmaWVyICYmIHRoaXMuZmluZFVtZEltcG9ydFBhcmFtZXRlcihuc0lkZW50aWZpZXIpO1xuICAgIGNvbnN0IGZyb20gPSBpbXBvcnRQYXJhbWV0ZXIgJiYgdGhpcy5nZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcik7XG4gICAgcmV0dXJuIGZyb20gIT09IG51bGwgPyB7ZnJvbSwgbmFtZTogaWQudGV4dH0gOiBudWxsO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRVbWRNb2R1bGVEZWNsYXJhdGlvbihpZCkgfHwgdGhpcy5nZXRVbWREZWNsYXJhdGlvbihpZCkgfHxcbiAgICAgICAgc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSkgfHwgdGhpcy51bWRFeHBvcnRzLmdldChtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldFVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51bWRNb2R1bGVzLmdldChzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy51bWRJbXBvcnRQYXRocy5nZXQoaW1wb3J0UGFyYW1ldGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gVU1EIG1vZHVsZXMgdGhlc2UgYXJlIHRoZSBib2R5IG9mIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLmdldFVtZE1vZHVsZShzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gdW1kTW9kdWxlICE9PSBudWxsID8gQXJyYXkuZnJvbSh1bWRNb2R1bGUuZmFjdG9yeUZuLmJvZHkuc3RhdGVtZW50cykgOiBbXTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZVVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdGVkIFVNRCBtb2R1bGUgZmlsZSAoJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSkgdG8gY29udGFpbiBleGFjdGx5IG9uZSBzdGF0ZW1lbnQsIGAgK1xuICAgICAgICAgIGBidXQgZm91bmQgJHtzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RofS5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUV4cG9ydHNPZlVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgIGlmIChpc0V4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGV4cG9ydERlY2xhcmF0aW9uID0gdGhpcy5leHRyYWN0QmFzaWNVbWRFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQpO1xuICAgICAgICBtb2R1bGVNYXAuc2V0KGV4cG9ydERlY2xhcmF0aW9uLm5hbWUsIGV4cG9ydERlY2xhcmF0aW9uLmRlY2xhcmF0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5leHRyYWN0VW1kV2lsZGNhcmRSZWV4cG9ydHMoc3RhdGVtZW50LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgICAgICBtb2R1bGVNYXAuc2V0KHJlZXhwb3J0Lm5hbWUsIHJlZXhwb3J0LmRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc0RlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IHRoaXMuZXh0cmFjdFVtZERlZmluZVByb3BlcnR5RXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGV4cG9ydERlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZU1hcDtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUltcG9ydFBhdGgocGFyYW06IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMuZ2V0VW1kTW9kdWxlKHBhcmFtLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKHVtZE1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0cyA9IGdldEltcG9ydHNPZlVtZE1vZHVsZSh1bWRNb2R1bGUpO1xuICAgIGlmIChpbXBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgaW1wb3J0UGF0aDogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gICAgZm9yIChjb25zdCBpIG9mIGltcG9ydHMpIHtcbiAgICAgIC8vIEFkZCBhbGwgaW1wb3J0cyB0byB0aGUgbWFwIHRvIHNwZWVkIHVwIGZ1dHVyZSBsb29rIHVwcy5cbiAgICAgIHRoaXMudW1kSW1wb3J0UGF0aHMuc2V0KGkucGFyYW1ldGVyLCBpLnBhdGgpO1xuICAgICAgaWYgKGkucGFyYW1ldGVyID09PSBwYXJhbSkge1xuICAgICAgICBpbXBvcnRQYXRoID0gaS5wYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbXBvcnRQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0QmFzaWNVbWRFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IEV4cG9ydFN0YXRlbWVudCk6IEV4cG9ydERlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBuYW1lID0gc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdC5uYW1lLnRleHQ7XG4gICAgY29uc3QgZXhwb3J0RXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgIHJldHVybiB0aGlzLmV4dHJhY3RVbWRFeHBvcnREZWNsYXJhdGlvbihuYW1lLCBleHBvcnRFeHByZXNzaW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFVtZFdpbGRjYXJkUmVleHBvcnRzKFxuICAgICAgc3RhdGVtZW50OiBXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50LCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IEV4cG9ydERlY2xhcmF0aW9uW10ge1xuICAgIGNvbnN0IHJlZXhwb3J0QXJnID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuXG4gICAgY29uc3QgcmVxdWlyZUNhbGwgPSBpc1JlcXVpcmVDYWxsKHJlZXhwb3J0QXJnKSA/XG4gICAgICAgIHJlZXhwb3J0QXJnIDpcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJlZXhwb3J0QXJnKSA/IGZpbmRSZXF1aXJlQ2FsbFJlZmVyZW5jZShyZWV4cG9ydEFyZywgdGhpcy5jaGVja2VyKSA6IG51bGw7XG5cbiAgICBsZXQgaW1wb3J0UGF0aDogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHJlcXVpcmVDYWxsICE9PSBudWxsKSB7XG4gICAgICBpbXBvcnRQYXRoID0gcmVxdWlyZUNhbGwuYXJndW1lbnRzWzBdLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIocmVleHBvcnRBcmcpKSB7XG4gICAgICBjb25zdCBpbXBvcnRQYXJhbWV0ZXIgPSB0aGlzLmZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIocmVleHBvcnRBcmcpO1xuICAgICAgaW1wb3J0UGF0aCA9IGltcG9ydFBhcmFtZXRlciAmJiB0aGlzLmdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkRmlsZSA9IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUoaW1wb3J0UGF0aCwgY29udGFpbmluZ0ZpbGUpO1xuICAgIGlmIChpbXBvcnRlZEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGltcG9ydGVkRmlsZSk7XG4gICAgaWYgKGltcG9ydGVkRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHZpYU1vZHVsZSA9IHN0cmlwRXh0ZW5zaW9uKGltcG9ydGVkRmlsZS5maWxlTmFtZSk7XG4gICAgY29uc3QgcmVleHBvcnRzOiBFeHBvcnREZWNsYXJhdGlvbltdID0gW107XG4gICAgaW1wb3J0ZWRFeHBvcnRzLmZvckVhY2goKGRlY2wsIG5hbWUpID0+IHtcbiAgICAgIGlmIChkZWNsLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgcmVleHBvcnRzLnB1c2goe1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgZGVjbGFyYXRpb246IHtub2RlOiBkZWNsLm5vZGUsIGtub3duOiBudWxsLCB2aWFNb2R1bGUsIGlkZW50aXR5OiBkZWNsLmlkZW50aXR5fVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKFxuICAgICAgICAgICAge25hbWUsIGRlY2xhcmF0aW9uOiB7bm9kZTogbnVsbCwga25vd246IG51bGwsIGV4cHJlc3Npb246IGRlY2wuZXhwcmVzc2lvbiwgdmlhTW9kdWxlfX0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RVbWREZWZpbmVQcm9wZXJ0eUV4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudDogRGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudCk6XG4gICAgICBFeHBvcnREZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBhcmdzID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzO1xuICAgIGNvbnN0IG5hbWUgPSBhcmdzWzFdLnRleHQ7XG4gICAgY29uc3QgZ2V0dGVyRm5FeHByZXNzaW9uID0gZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbihzdGF0ZW1lbnQpO1xuICAgIGlmIChnZXR0ZXJGbkV4cHJlc3Npb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5leHRyYWN0VW1kRXhwb3J0RGVjbGFyYXRpb24obmFtZSwgZ2V0dGVyRm5FeHByZXNzaW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFVtZEV4cG9ydERlY2xhcmF0aW9uKG5hbWU6IHN0cmluZywgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IEV4cG9ydERlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gICAgaWYgKGRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4ge25hbWUsIGRlY2xhcmF0aW9ufTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBkZWNsYXJhdGlvbjoge25vZGU6IG51bGwsIGtub3duOiBudWxsLCBleHByZXNzaW9uLCB2aWFNb2R1bGU6IG51bGx9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogSXMgdGhlIGlkZW50aWZpZXIgYSBwYXJhbWV0ZXIgb24gYSBVTUQgZmFjdG9yeSBmdW5jdGlvbiwgZS5nLiBgZnVuY3Rpb24gZmFjdG9yeSh0aGlzLCBjb3JlKWA/XG4gICAqIElmIHNvIHRoZW4gcmV0dXJuIGl0cyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZmluZFVtZEltcG9ydFBhcmFtZXRlcihpZDogdHMuSWRlbnRpZmllcik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IGlkICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKSB8fCBudWxsO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3ltYm9sICYmIHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc1BhcmFtZXRlcihkZWNsYXJhdGlvbikgPyBkZWNsYXJhdGlvbiA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldFVtZERlY2xhcmF0aW9uKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKG5zSWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZURlY2xhcmF0aW9uID0gdGhpcy5nZXRVbWRNb2R1bGVEZWNsYXJhdGlvbihuc0lkZW50aWZpZXIpO1xuICAgIGlmIChtb2R1bGVEZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBtb2R1bGVEZWNsYXJhdGlvbi5ub2RlID09PSBudWxsIHx8XG4gICAgICAgICF0cy5pc1NvdXJjZUZpbGUobW9kdWxlRGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVEZWNsYXJhdGlvbi5ub2RlKTtcbiAgICBpZiAobW9kdWxlRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBjb21wdXRlIHRoZSBgdmlhTW9kdWxlYCBiZWNhdXNlICB0aGUgYGdldEV4cG9ydHNPZk1vZHVsZSgpYCBjYWxsXG4gICAgLy8gZGlkIG5vdCBrbm93IHRoYXQgd2Ugd2VyZSBpbXBvcnRpbmcgdGhlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gbW9kdWxlRXhwb3J0cy5nZXQoaWQudGV4dCkhO1xuXG4gICAgaWYgKCFtb2R1bGVFeHBvcnRzLmhhcyhpZC50ZXh0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgbmVlZCB0byBjb21wdXRlIHRoZSBgdmlhTW9kdWxlYCBiZWNhdXNlICB0aGUgYGdldEV4cG9ydHNPZk1vZHVsZSgpYCBjYWxsXG4gICAgLy8gZGlkIG5vdCBrbm93IHRoYXQgd2Ugd2VyZSBpbXBvcnRpbmcgdGhlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IHZpYU1vZHVsZSA9XG4gICAgICAgIGRlY2xhcmF0aW9uLnZpYU1vZHVsZSA9PT0gbnVsbCA/IG1vZHVsZURlY2xhcmF0aW9uLnZpYU1vZHVsZSA6IGRlY2xhcmF0aW9uLnZpYU1vZHVsZTtcblxuICAgIHJldHVybiB7Li4uZGVjbGFyYXRpb24sIHZpYU1vZHVsZSwga25vd246IGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllcihpZCl9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRVbWRNb2R1bGVEZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGltcG9ydFBhdGggPSB0aGlzLmdldEltcG9ydFBhdGhGcm9tUGFyYW1ldGVyKGlkKSB8fCB0aGlzLmdldEltcG9ydFBhdGhGcm9tUmVxdWlyZUNhbGwoaWQpO1xuICAgIGlmIChpbXBvcnRQYXRoID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGlkLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKG1vZHVsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB2aWFNb2R1bGUgPSBpc0V4dGVybmFsSW1wb3J0KGltcG9ydFBhdGgpID8gaW1wb3J0UGF0aCA6IG51bGw7XG4gICAgcmV0dXJuIHtub2RlOiBtb2R1bGUsIHZpYU1vZHVsZSwga25vd246IG51bGwsIGlkZW50aXR5OiBudWxsfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0SW1wb3J0UGF0aEZyb21QYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKGlkKTtcbiAgICBpZiAoaW1wb3J0UGFyYW1ldGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0VW1kSW1wb3J0UGF0aChpbXBvcnRQYXJhbWV0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRJbXBvcnRQYXRoRnJvbVJlcXVpcmVDYWxsKGlkOiB0cy5JZGVudGlmaWVyKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlKGlkLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmIChyZXF1aXJlQ2FsbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICAgICAgW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpKVswXTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvICYmIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCksXG4gICAgICAgICAgdGhpcy5jb21waWxlckhvc3QpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUgJiZcbiAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IFVtZE1vZHVsZXxudWxsIHtcbiAgY29uc3Qgd3JhcHBlckNhbGwgPSBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQpO1xuICBpZiAoIXdyYXBwZXJDYWxsKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB3cmFwcGVyRm4gPSB3cmFwcGVyQ2FsbC5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHdyYXBwZXJGbikpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGblBhcmFtSW5kZXggPSB3cmFwcGVyRm4ucGFyYW1ldGVycy5maW5kSW5kZXgoXG4gICAgICBwYXJhbWV0ZXIgPT4gdHMuaXNJZGVudGlmaWVyKHBhcmFtZXRlci5uYW1lKSAmJiBwYXJhbWV0ZXIubmFtZS50ZXh0ID09PSAnZmFjdG9yeScpO1xuICBpZiAoZmFjdG9yeUZuUGFyYW1JbmRleCA9PT0gLTEpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGbiA9IHN0cmlwUGFyZW50aGVzZXMod3JhcHBlckNhbGwuYXJndW1lbnRzW2ZhY3RvcnlGblBhcmFtSW5kZXhdKTtcbiAgaWYgKCFmYWN0b3J5Rm4gfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZhY3RvcnlGbikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7d3JhcHBlckZuLCBmYWN0b3J5Rm59O1xufVxuXG5mdW5jdGlvbiBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHtleHByZXNzaW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb259fG51bGwge1xuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uKSB8fFxuICAgICAgIXRzLmlzQ2FsbEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgfHxcbiAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1wb3J0c09mVW1kTW9kdWxlKHVtZE1vZHVsZTogVW1kTW9kdWxlKTpcbiAgICB7cGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgcGF0aDogc3RyaW5nfVtdIHtcbiAgY29uc3QgaW1wb3J0czoge3BhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHBhdGg6IHN0cmluZ31bXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVycy5sZW5ndGg7IGkrKykge1xuICAgIGltcG9ydHMucHVzaCh7XG4gICAgICBwYXJhbWV0ZXI6IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVyc1tpXSxcbiAgICAgIHBhdGg6IGdldFJlcXVpcmVkTW9kdWxlUGF0aCh1bWRNb2R1bGUud3JhcHBlckZuLCBpKVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBpbXBvcnRzO1xufVxuXG5pbnRlcmZhY2UgVW1kTW9kdWxlIHtcbiAgd3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb247XG4gIGZhY3RvcnlGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uO1xufVxuXG5mdW5jdGlvbiBnZXRSZXF1aXJlZE1vZHVsZVBhdGgod3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIHBhcmFtSW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHdyYXBwZXJGbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVTUQgd3JhcHBlciBib2R5IGlzIG5vdCBhbiBleHByZXNzaW9uIHN0YXRlbWVudDpcXG4nICsgd3JhcHBlckZuLmJvZHkuZ2V0VGV4dCgpKTtcbiAgfVxuICBjb25zdCBtb2R1bGVQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgZmluZE1vZHVsZVBhdGhzKHN0YXRlbWVudC5leHByZXNzaW9uKTtcblxuICAvLyBTaW5jZSB3ZSB3ZXJlIG9ubHkgaW50ZXJlc3RlZCBpbiB0aGUgYHJlcXVpcmUoKWAgY2FsbHMsIHdlIG1pc3MgdGhlIGBleHBvcnRzYCBhcmd1bWVudCwgc28gd2VcbiAgLy8gbmVlZCB0byBzdWJ0cmFjdCAxLlxuICAvLyBFLmcuIGBmdW5jdGlvbihleHBvcnRzLCBkZXAxLCBkZXAyKWAgbWFwcyB0byBgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSgncGF0aC90by9kZXAxJyksXG4gIC8vIHJlcXVpcmUoJ3BhdGgvdG8vZGVwMicpKWBcbiAgcmV0dXJuIG1vZHVsZVBhdGhzW3BhcmFtSW5kZXggLSAxXTtcblxuICAvLyBTZWFyY2ggdGhlIHN0YXRlbWVudCBmb3IgY2FsbHMgdG8gYHJlcXVpcmUoJy4uLicpYCBhbmQgZXh0cmFjdCB0aGUgc3RyaW5nIHZhbHVlIG9mIHRoZSBmaXJzdFxuICAvLyBhcmd1bWVudFxuICBmdW5jdGlvbiBmaW5kTW9kdWxlUGF0aHMobm9kZTogdHMuTm9kZSkge1xuICAgIGlmIChpc1JlcXVpcmVDYWxsKG5vZGUpKSB7XG4gICAgICBjb25zdCBhcmd1bWVudCA9IG5vZGUuYXJndW1lbnRzWzBdO1xuICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChhcmd1bWVudCkpIHtcbiAgICAgICAgbW9kdWxlUGF0aHMucHVzaChhcmd1bWVudC50ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5mb3JFYWNoQ2hpbGQoZmluZE1vZHVsZVBhdGhzKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==