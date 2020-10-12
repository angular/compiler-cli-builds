/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/host/umd_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/host/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getImportsOfUmdModule = exports.parseStatementForUmdModule = exports.UmdReflectionHost = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
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
            // First we try one of the the following:
            // 1. The `exports` identifier - referring to the current file/module.
            // 2. An identifier (e.g. `foo`) that refers to an imported UMD module.
            // 3. A UMD style export identifier (e.g. the `foo` of `exports.foo`).
            var declaration = this.getExportsDeclaration(id) || this.getUmdModuleDeclaration(id) ||
                this.getUmdDeclaration(id);
            if (declaration !== null) {
                return declaration;
            }
            // Try to get the declaration using the super class.
            var superDeclaration = _super.prototype.getDeclarationOfIdentifier.call(this, id);
            if (superDeclaration === null) {
                return null;
            }
            // Check to see if the declaration is the inner node of a declaration IIFE.
            var outerNode = esm2015_host_1.getOuterNodeFromInnerDeclaration(superDeclaration.node);
            if (outerNode === null) {
                return superDeclaration;
            }
            // We are only interested if the outer declaration is of the form
            // `exports.<name> = <initializer>`.
            if (!commonjs_umd_utils_1.isExportsAssignment(outerNode)) {
                return superDeclaration;
            }
            return {
                kind: 1 /* Inline */,
                node: outerNode.left,
                known: null,
                viaModule: null,
            };
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
        UmdReflectionHost.prototype.getClassSymbolFromOuterDeclaration = function (declaration) {
            var superSymbol = _super.prototype.getClassSymbolFromOuterDeclaration.call(this, declaration);
            if (superSymbol) {
                return superSymbol;
            }
            if (!commonjs_umd_utils_1.isExportsDeclaration(declaration)) {
                return undefined;
            }
            var initializer = skipAliases(declaration.parent.right);
            if (ts.isIdentifier(initializer)) {
                var implementation = this.getDeclarationOfIdentifier(initializer);
                if (implementation !== null) {
                    var implementationSymbol = this.getClassSymbol(implementation.node);
                    if (implementationSymbol !== null) {
                        return implementationSymbol;
                    }
                }
            }
            var innerDeclaration = esm2015_host_1.getInnerClassDeclaration(initializer);
            if (innerDeclaration !== null) {
                return this.createClassSymbol(declaration.name, innerDeclaration);
            }
            return undefined;
        };
        UmdReflectionHost.prototype.getClassSymbolFromInnerDeclaration = function (declaration) {
            var superClassSymbol = _super.prototype.getClassSymbolFromInnerDeclaration.call(this, declaration);
            if (superClassSymbol !== undefined) {
                return superClassSymbol;
            }
            if (!reflection_1.isNamedFunctionDeclaration(declaration)) {
                return undefined;
            }
            var outerNode = esm2015_host_1.getOuterNodeFromInnerDeclaration(declaration);
            if (outerNode === null || !commonjs_umd_utils_1.isExportsAssignment(outerNode)) {
                return undefined;
            }
            return this.createClassSymbol(outerNode.left.name, declaration);
        };
        /**
         * Extract all "classes" from the `statement` and add them to the `classes` map.
         */
        UmdReflectionHost.prototype.addClassSymbolsFromStatement = function (classes, statement) {
            _super.prototype.addClassSymbolsFromStatement.call(this, classes, statement);
            // Also check for exports of the form: `exports.<name> = <class def>;`
            if (commonjs_umd_utils_1.isExportsStatement(statement)) {
                var classSymbol = this.getClassSymbol(statement.expression.left);
                if (classSymbol) {
                    classes.set(classSymbol.implementation, classSymbol);
                }
            }
        };
        /**
         * Analyze the given statement to see if it corresponds with an exports declaration like
         * `exports.MyClass = MyClass_1 = <class def>;`. If so, the declaration of `MyClass_1`
         * is associated with the `MyClass` identifier.
         *
         * @param statement The statement that needs to be preprocessed.
         */
        UmdReflectionHost.prototype.preprocessStatement = function (statement) {
            _super.prototype.preprocessStatement.call(this, statement);
            if (!commonjs_umd_utils_1.isExportsStatement(statement)) {
                return;
            }
            var declaration = statement.expression.left;
            var initializer = statement.expression.right;
            if (!esm2015_host_1.isAssignment(initializer) || !ts.isIdentifier(initializer.left) ||
                !this.isClass(declaration)) {
                return;
            }
            var aliasedIdentifier = initializer.left;
            var aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
            if (aliasedDeclaration === null || aliasedDeclaration.node === null) {
                throw new Error("Unable to locate declaration of " + aliasedIdentifier.text + " in \"" + statement.getText() + "\"");
            }
            this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
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
                    if (commonjs_umd_utils_1.isExportsStatement(statement)) {
                        var exportDeclaration = this.extractBasicUmdExportDeclaration(statement);
                        if (!moduleMap.has(exportDeclaration.name)) {
                            // We assume that the first `exports.<name>` is the actual declaration, and that any
                            // subsequent statements that match are decorating the original declaration.
                            // For example:
                            // ```
                            // exports.foo = <declaration>;
                            // exports.foo = __decorate(<decorator>, exports.foo);
                            // ```
                            // The declaration is the first line not the second.
                            moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                        }
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
            var _a;
            var name = statement.expression.left.name.text;
            var exportExpression = skipAliases(statement.expression.right);
            var declaration = (_a = this.getDeclarationOfExpression(exportExpression)) !== null && _a !== void 0 ? _a : {
                kind: 1 /* Inline */,
                node: statement.expression.left,
                known: null,
                viaModule: null,
            };
            return { name: name, declaration: declaration };
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
            importedExports.forEach(function (decl, name) { return reexports.push({ name: name, declaration: tslib_1.__assign(tslib_1.__assign({}, decl), { viaModule: viaModule }) }); });
            return reexports;
        };
        UmdReflectionHost.prototype.extractUmdDefinePropertyExportDeclaration = function (statement) {
            var args = statement.expression.arguments;
            var name = args[1].text;
            var getterFnExpression = commonjs_umd_utils_1.extractGetterFnExpression(statement);
            if (getterFnExpression === null) {
                return null;
            }
            var declaration = this.getDeclarationOfExpression(getterFnExpression);
            if (declaration !== null) {
                return { name: name, declaration: declaration };
            }
            return {
                name: name,
                declaration: {
                    kind: 1 /* Inline */,
                    node: getterFnExpression,
                    known: null,
                    viaModule: null,
                },
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
            if (nsIdentifier.parent.parent && commonjs_umd_utils_1.isExportsAssignment(nsIdentifier.parent.parent)) {
                var initializer = nsIdentifier.parent.parent.right;
                if (ts.isIdentifier(initializer)) {
                    return this.getDeclarationOfIdentifier(initializer);
                }
                return this.detectKnownDeclaration({
                    kind: 1 /* Inline */,
                    node: nsIdentifier.parent.parent.left,
                    implementation: skipAliases(nsIdentifier.parent.parent.right),
                    viaModule: null,
                    known: null,
                });
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
        UmdReflectionHost.prototype.getExportsDeclaration = function (id) {
            if (!isExportsIdentifier(id)) {
                return null;
            }
            // Sadly, in the case of `exports.foo = bar`, we can't use `this.findUmdImportParameter(id)`
            // to check whether this `exports` is from the IIFE body arguments, because
            // `this.checker.getSymbolAtLocation(id)` will return the symbol for the `foo` identifier
            // rather than the `exports` identifier.
            //
            // Instead we search the symbols in the current local scope.
            var exportsSymbol = this.checker.getSymbolsInScope(id, ts.SymbolFlags.Variable)
                .find(function (symbol) { return symbol.name === 'exports'; });
            var node = exportsSymbol !== undefined &&
                !ts.isFunctionExpression(exportsSymbol.valueDeclaration.parent) ?
                // There is a locally defined `exports` variable that is not a function parameter.
                // So this `exports` identifier must be a local variable and does not represent the module.
                exportsSymbol.valueDeclaration :
                // There is no local symbol or it is a parameter of an IIFE.
                // So this `exports` represents the current "module".
                id.getSourceFile();
            return {
                kind: 0 /* Concrete */,
                node: node,
                viaModule: null,
                known: null,
                identity: null,
            };
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
            return { kind: 0 /* Concrete */, node: module, viaModule: viaModule, known: null, identity: null };
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
    /**
     * Is the `node` an identifier with the name "exports"?
     */
    function isExportsIdentifier(node) {
        return ts.isIdentifier(node) && node.text === 'exports';
    }
    /**
     * Find the far right hand side of a sequence of aliased assignements of the form
     *
     * ```
     * exports.MyClass = alias1 = alias2 = <<declaration>>
     * ```
     *
     * @param node the expression to parse
     * @returns the original `node` or the far right expression of a series of assignments.
     */
    function skipAliases(node) {
        while (esm2015_host_1.isAssignment(node)) {
            node = node.right;
        }
        return node;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUU1RCx5RUFBK0c7SUFFL0csOERBQWlGO0lBRWpGLDZGQUFxWDtJQUNyWCxpRkFBd0c7SUFDeEcsMkVBQStDO0lBRS9DLG1FQUF5QztJQUV6QztRQUF1Qyw2Q0FBa0I7UUFVdkQsMkJBQVksTUFBYyxFQUFFLE1BQWUsRUFBRSxHQUFrQixFQUFFLEdBQThCO1lBQTlCLG9CQUFBLEVBQUEsVUFBOEI7WUFBL0YsWUFDRSxrQkFBTSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsU0FHaEM7WUFiUyxnQkFBVSxHQUNoQixJQUFJLGtCQUFVLENBQWdDLFVBQUEsRUFBRSxJQUFJLE9BQUEsS0FBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxFQUF6QixDQUF5QixDQUFDLENBQUM7WUFDekUsZ0JBQVUsR0FBRyxJQUFJLGtCQUFVLENBQ2pDLFVBQUEsRUFBRSxJQUFJLE9BQUEsS0FBSSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxFQUFsQyxDQUFrQyxDQUFDLENBQUM7WUFDcEMsb0JBQWMsR0FDcEIsSUFBSSxrQkFBVSxDQUF1QyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBN0IsQ0FBNkIsQ0FBQyxDQUFDO1lBTS9GLEtBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztZQUMzQixLQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7O1FBQy9CLENBQUM7UUFFRCxpREFBcUIsR0FBckIsVUFBc0IsRUFB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QVMsV0FBVyxDQUFDLElBQW1CO1FBQ3RDLE9BQU8sMkJBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNuQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25LaW5kLCBJbXBvcnQsIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7RmFjdG9yeU1hcCwgZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyLCBzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0RlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQsIEV4cG9ydERlY2xhcmF0aW9uLCBFeHBvcnRzU3RhdGVtZW50LCBleHRyYWN0R2V0dGVyRm5FeHByZXNzaW9uLCBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyLCBmaW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UsIGlzRGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudCwgaXNFeHBvcnRzQXNzaWdubWVudCwgaXNFeHBvcnRzRGVjbGFyYXRpb24sIGlzRXhwb3J0c1N0YXRlbWVudCwgaXNFeHRlcm5hbEltcG9ydCwgaXNSZXF1aXJlQ2FsbCwgaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50LCBXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50fSBmcm9tICcuL2NvbW1vbmpzX3VtZF91dGlscyc7XG5pbXBvcnQge2dldElubmVyQ2xhc3NEZWNsYXJhdGlvbiwgZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24sIGlzQXNzaWdubWVudH0gZnJvbSAnLi9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vZXNtNV9ob3N0JztcbmltcG9ydCB7TmdjY0NsYXNzU3ltYm9sfSBmcm9tICcuL25nY2NfaG9zdCc7XG5pbXBvcnQge3N0cmlwUGFyZW50aGVzZXN9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY2xhc3MgVW1kUmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBFc201UmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgdW1kTW9kdWxlcyA9XG4gICAgICBuZXcgRmFjdG9yeU1hcDx0cy5Tb3VyY2VGaWxlLCBVbWRNb2R1bGV8bnVsbD4oc2YgPT4gdGhpcy5jb21wdXRlVW1kTW9kdWxlKHNmKSk7XG4gIHByb3RlY3RlZCB1bWRFeHBvcnRzID0gbmV3IEZhY3RvcnlNYXA8dHMuU291cmNlRmlsZSwgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw+KFxuICAgICAgc2YgPT4gdGhpcy5jb21wdXRlRXhwb3J0c09mVW1kTW9kdWxlKHNmKSk7XG4gIHByb3RlY3RlZCB1bWRJbXBvcnRQYXRocyA9XG4gICAgICBuZXcgRmFjdG9yeU1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgc3RyaW5nfG51bGw+KHBhcmFtID0+IHRoaXMuY29tcHV0ZUltcG9ydFBhdGgocGFyYW0pKTtcbiAgcHJvdGVjdGVkIHByb2dyYW06IHRzLlByb2dyYW07XG4gIHByb3RlY3RlZCBjb21waWxlckhvc3Q6IHRzLkNvbXBpbGVySG9zdDtcblxuICBjb25zdHJ1Y3Rvcihsb2dnZXI6IExvZ2dlciwgaXNDb3JlOiBib29sZWFuLCBzcmM6IEJ1bmRsZVByb2dyYW0sIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGxvZ2dlciwgaXNDb3JlLCBzcmMsIGR0cyk7XG4gICAgdGhpcy5wcm9ncmFtID0gc3JjLnByb2dyYW07XG4gICAgdGhpcy5jb21waWxlckhvc3QgPSBzcmMuaG9zdDtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICAvLyBJcyBgaWRgIGEgbmFtZXNwYWNlZCBwcm9wZXJ0eSBhY2Nlc3MsIGUuZy4gYERpcmVjdGl2ZWAgaW4gYGNvcmUuRGlyZWN0aXZlYD9cbiAgICAvLyBJZiBzbyBjYXB0dXJlIHRoZSBzeW1ib2wgb2YgdGhlIG5hbWVzcGFjZSwgZS5nLiBgY29yZWAuXG4gICAgY29uc3QgbnNJZGVudGlmaWVyID0gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZCk7XG4gICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gbnNJZGVudGlmaWVyICYmIHRoaXMuZmluZFVtZEltcG9ydFBhcmFtZXRlcihuc0lkZW50aWZpZXIpO1xuICAgIGNvbnN0IGZyb20gPSBpbXBvcnRQYXJhbWV0ZXIgJiYgdGhpcy5nZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcik7XG4gICAgcmV0dXJuIGZyb20gIT09IG51bGwgPyB7ZnJvbSwgbmFtZTogaWQudGV4dH0gOiBudWxsO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB3ZSB0cnkgb25lIG9mIHRoZSB0aGUgZm9sbG93aW5nOlxuICAgIC8vIDEuIFRoZSBgZXhwb3J0c2AgaWRlbnRpZmllciAtIHJlZmVycmluZyB0byB0aGUgY3VycmVudCBmaWxlL21vZHVsZS5cbiAgICAvLyAyLiBBbiBpZGVudGlmaWVyIChlLmcuIGBmb29gKSB0aGF0IHJlZmVycyB0byBhbiBpbXBvcnRlZCBVTUQgbW9kdWxlLlxuICAgIC8vIDMuIEEgVU1EIHN0eWxlIGV4cG9ydCBpZGVudGlmaWVyIChlLmcuIHRoZSBgZm9vYCBvZiBgZXhwb3J0cy5mb29gKS5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RXhwb3J0c0RlY2xhcmF0aW9uKGlkKSB8fCB0aGlzLmdldFVtZE1vZHVsZURlY2xhcmF0aW9uKGlkKSB8fFxuICAgICAgICB0aGlzLmdldFVtZERlY2xhcmF0aW9uKGlkKTtcbiAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gZ2V0IHRoZSBkZWNsYXJhdGlvbiB1c2luZyB0aGUgc3VwZXIgY2xhc3MuXG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyB0aGUgaW5uZXIgbm9kZSBvZiBhIGRlY2xhcmF0aW9uIElJRkUuXG4gICAgY29uc3Qgb3V0ZXJOb2RlID0gZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24oc3VwZXJEZWNsYXJhdGlvbi5ub2RlKTtcbiAgICBpZiAob3V0ZXJOb2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBXZSBhcmUgb25seSBpbnRlcmVzdGVkIGlmIHRoZSBvdXRlciBkZWNsYXJhdGlvbiBpcyBvZiB0aGUgZm9ybVxuICAgIC8vIGBleHBvcnRzLjxuYW1lPiA9IDxpbml0aWFsaXplcj5gLlxuICAgIGlmICghaXNFeHBvcnRzQXNzaWdubWVudChvdXRlck5vZGUpKSB7XG4gICAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLklubGluZSxcbiAgICAgIG5vZGU6IG91dGVyTm9kZS5sZWZ0LFxuICAgICAga25vd246IG51bGwsXG4gICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIGdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGU6IHRzLk5vZGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgcmV0dXJuIHN1cGVyLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGUpIHx8IHRoaXMudW1kRXhwb3J0cy5nZXQobW9kdWxlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICBnZXRVbWRNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFVtZE1vZHVsZXxudWxsIHtcbiAgICBpZiAoc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudW1kTW9kdWxlcy5nZXQoc291cmNlRmlsZSk7XG4gIH1cblxuICBnZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMudW1kSW1wb3J0UGF0aHMuZ2V0KGltcG9ydFBhcmFtZXRlcik7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgYSBtb2R1bGUuXG4gICAqXG4gICAqIEluIFVNRCBtb2R1bGVzIHRoZXNlIGFyZSB0aGUgYm9keSBvZiB0aGUgVU1EIGZhY3RvcnkgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBtb2R1bGUgd2hvc2Ugc3RhdGVtZW50cyB3ZSB3YW50LlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy5nZXRVbWRNb2R1bGUoc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIHVtZE1vZHVsZSAhPT0gbnVsbCA/IEFycmF5LmZyb20odW1kTW9kdWxlLmZhY3RvcnlGbi5ib2R5LnN0YXRlbWVudHMpIDogW107XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN1cGVyU3ltYm9sID0gc3VwZXIuZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN1cGVyU3ltYm9sKSB7XG4gICAgICByZXR1cm4gc3VwZXJTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKCFpc0V4cG9ydHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IGluaXRpYWxpemVyID0gc2tpcEFsaWFzZXMoZGVjbGFyYXRpb24ucGFyZW50LnJpZ2h0KTtcblxuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIpKSB7XG4gICAgICBjb25zdCBpbXBsZW1lbnRhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaW5pdGlhbGl6ZXIpO1xuICAgICAgaWYgKGltcGxlbWVudGF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGltcGxlbWVudGF0aW9uU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChpbXBsZW1lbnRhdGlvbi5ub2RlKTtcbiAgICAgICAgaWYgKGltcGxlbWVudGF0aW9uU3ltYm9sICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGltcGxlbWVudGF0aW9uU3ltYm9sO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihpbml0aWFsaXplcik7XG4gICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLm5hbWUsIGlubmVyRGVjbGFyYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3VwZXJDbGFzc1N5bWJvbCA9IHN1cGVyLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChzdXBlckNsYXNzU3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzdXBlckNsYXNzU3ltYm9sO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZEZ1bmN0aW9uRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyTm9kZSA9IGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAob3V0ZXJOb2RlID09PSBudWxsIHx8ICFpc0V4cG9ydHNBc3NpZ25tZW50KG91dGVyTm9kZSkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJOb2RlLmxlZnQubmFtZSwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgYWxsIFwiY2xhc3Nlc1wiIGZyb20gdGhlIGBzdGF0ZW1lbnRgIGFuZCBhZGQgdGhlbSB0byB0aGUgYGNsYXNzZXNgIG1hcC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRDbGFzc1N5bWJvbHNGcm9tU3RhdGVtZW50KFxuICAgICAgY2xhc3NlczogTWFwPHRzLlN5bWJvbCwgTmdjY0NsYXNzU3ltYm9sPiwgc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBzdXBlci5hZGRDbGFzc1N5bWJvbHNGcm9tU3RhdGVtZW50KGNsYXNzZXMsIHN0YXRlbWVudCk7XG5cbiAgICAvLyBBbHNvIGNoZWNrIGZvciBleHBvcnRzIG9mIHRoZSBmb3JtOiBgZXhwb3J0cy48bmFtZT4gPSA8Y2xhc3MgZGVmPjtgXG4gICAgaWYgKGlzRXhwb3J0c1N0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG4gICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgY2xhc3Nlcy5zZXQoY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24sIGNsYXNzU3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZSB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGFuIGV4cG9ydHMgZGVjbGFyYXRpb24gbGlrZVxuICAgKiBgZXhwb3J0cy5NeUNsYXNzID0gTXlDbGFzc18xID0gPGNsYXNzIGRlZj47YC4gSWYgc28sIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYFxuICAgKiBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IFRoZSBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIHN1cGVyLnByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50KTtcblxuICAgIGlmICghaXNFeHBvcnRzU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQ7XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodDtcbiAgICBpZiAoIWlzQXNzaWdubWVudChpbml0aWFsaXplcikgfHwgIXRzLmlzSWRlbnRpZmllcihpbml0aWFsaXplci5sZWZ0KSB8fFxuICAgICAgICAhdGhpcy5pc0NsYXNzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gaW5pdGlhbGl6ZXIubGVmdDtcblxuICAgIGNvbnN0IGFsaWFzZWREZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgIGlmIChhbGlhc2VkRGVjbGFyYXRpb24gPT09IG51bGwgfHwgYWxpYXNlZERlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5hYmxlIHRvIGxvY2F0ZSBkZWNsYXJhdGlvbiBvZiAke2FsaWFzZWRJZGVudGlmaWVyLnRleHR9IGluIFwiJHtzdGF0ZW1lbnQuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLnNldChhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSwgZGVjbGFyYXRpb24ubmFtZSk7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVVbWRNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFVtZE1vZHVsZXxudWxsIHtcbiAgICBpZiAoc291cmNlRmlsZS5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCBVTUQgbW9kdWxlIGZpbGUgKCR7c291cmNlRmlsZS5maWxlTmFtZX0pIHRvIGNvbnRhaW4gZXhhY3RseSBvbmUgc3RhdGVtZW50LCBgICtcbiAgICAgICAgICBgYnV0IGZvdW5kICR7c291cmNlRmlsZS5zdGF0ZW1lbnRzLmxlbmd0aH0uYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHNvdXJjZUZpbGUuc3RhdGVtZW50c1swXSk7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVFeHBvcnRzT2ZVbWRNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICBjb25zdCBtb2R1bGVNYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+KCk7XG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2YgdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGUpKSB7XG4gICAgICBpZiAoaXNFeHBvcnRzU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSB0aGlzLmV4dHJhY3RCYXNpY1VtZEV4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudCk7XG4gICAgICAgIGlmICghbW9kdWxlTWFwLmhhcyhleHBvcnREZWNsYXJhdGlvbi5uYW1lKSkge1xuICAgICAgICAgIC8vIFdlIGFzc3VtZSB0aGF0IHRoZSBmaXJzdCBgZXhwb3J0cy48bmFtZT5gIGlzIHRoZSBhY3R1YWwgZGVjbGFyYXRpb24sIGFuZCB0aGF0IGFueVxuICAgICAgICAgIC8vIHN1YnNlcXVlbnQgc3RhdGVtZW50cyB0aGF0IG1hdGNoIGFyZSBkZWNvcmF0aW5nIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbi5cbiAgICAgICAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAgICAgICAvLyBgYGBcbiAgICAgICAgICAvLyBleHBvcnRzLmZvbyA9IDxkZWNsYXJhdGlvbj47XG4gICAgICAgICAgLy8gZXhwb3J0cy5mb28gPSBfX2RlY29yYXRlKDxkZWNvcmF0b3I+LCBleHBvcnRzLmZvbyk7XG4gICAgICAgICAgLy8gYGBgXG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGlzIHRoZSBmaXJzdCBsaW5lIG5vdCB0aGUgc2Vjb25kLlxuICAgICAgICAgIG1vZHVsZU1hcC5zZXQoZXhwb3J0RGVjbGFyYXRpb24ubmFtZSwgZXhwb3J0RGVjbGFyYXRpb24uZGVjbGFyYXRpb24pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzV2lsZGNhcmRSZWV4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZXh0cmFjdFVtZFdpbGRjYXJkUmVleHBvcnRzKHN0YXRlbWVudCwgc291cmNlRmlsZSk7XG4gICAgICAgIGZvciAoY29uc3QgcmVleHBvcnQgb2YgcmVleHBvcnRzKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChyZWV4cG9ydC5uYW1lLCByZWV4cG9ydC5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNEZWZpbmVQcm9wZXJ0eVJlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgZXhwb3J0RGVjbGFyYXRpb24gPSB0aGlzLmV4dHJhY3RVbWREZWZpbmVQcm9wZXJ0eUV4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudCk7XG4gICAgICAgIGlmIChleHBvcnREZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgIG1vZHVsZU1hcC5zZXQoZXhwb3J0RGVjbGFyYXRpb24ubmFtZSwgZXhwb3J0RGVjbGFyYXRpb24uZGVjbGFyYXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtb2R1bGVNYXA7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVJbXBvcnRQYXRoKHBhcmFtOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLmdldFVtZE1vZHVsZShwYXJhbS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGlmICh1bWRNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydHMgPSBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlKTtcbiAgICBpZiAoaW1wb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IGltcG9ydFBhdGg6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAgIGZvciAoY29uc3QgaSBvZiBpbXBvcnRzKSB7XG4gICAgICAvLyBBZGQgYWxsIGltcG9ydHMgdG8gdGhlIG1hcCB0byBzcGVlZCB1cCBmdXR1cmUgbG9vayB1cHMuXG4gICAgICB0aGlzLnVtZEltcG9ydFBhdGhzLnNldChpLnBhcmFtZXRlciwgaS5wYXRoKTtcbiAgICAgIGlmIChpLnBhcmFtZXRlciA9PT0gcGFyYW0pIHtcbiAgICAgICAgaW1wb3J0UGF0aCA9IGkucGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW1wb3J0UGF0aDtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEJhc2ljVW1kRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50OiBFeHBvcnRzU3RhdGVtZW50KTogRXhwb3J0RGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IG5hbWUgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0Lm5hbWUudGV4dDtcbiAgICBjb25zdCBleHBvcnRFeHByZXNzaW9uID0gc2tpcEFsaWFzZXMoc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHBvcnRFeHByZXNzaW9uKSA/PyB7XG4gICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgbm9kZTogc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCxcbiAgICAgIGtub3duOiBudWxsLFxuICAgICAgdmlhTW9kdWxlOiBudWxsLFxuICAgIH07XG4gICAgcmV0dXJuIHtuYW1lLCBkZWNsYXJhdGlvbn07XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RVbWRXaWxkY2FyZFJlZXhwb3J0cyhcbiAgICAgIHN0YXRlbWVudDogV2lsZGNhcmRSZWV4cG9ydFN0YXRlbWVudCwgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiBFeHBvcnREZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCByZWV4cG9ydEFyZyA9IHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50c1swXTtcblxuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gaXNSZXF1aXJlQ2FsbChyZWV4cG9ydEFyZykgP1xuICAgICAgICByZWV4cG9ydEFyZyA6XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihyZWV4cG9ydEFyZykgPyBmaW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UocmVleHBvcnRBcmcsIHRoaXMuY2hlY2tlcikgOiBudWxsO1xuXG4gICAgbGV0IGltcG9ydFBhdGg6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAgIGlmIChyZXF1aXJlQ2FsbCAhPT0gbnVsbCkge1xuICAgICAgaW1wb3J0UGF0aCA9IHJlcXVpcmVDYWxsLmFyZ3VtZW50c1swXS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKHJlZXhwb3J0QXJnKSkge1xuICAgICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKHJlZXhwb3J0QXJnKTtcbiAgICAgIGltcG9ydFBhdGggPSBpbXBvcnRQYXJhbWV0ZXIgJiYgdGhpcy5nZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcik7XG4gICAgfVxuXG4gICAgaWYgKGltcG9ydFBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShpbXBvcnRlZEZpbGUpO1xuICAgIGlmIChpbXBvcnRlZEV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB2aWFNb2R1bGUgPSBzdHJpcEV4dGVuc2lvbihpbXBvcnRlZEZpbGUuZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlZXhwb3J0czogRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGltcG9ydGVkRXhwb3J0cy5mb3JFYWNoKFxuICAgICAgICAoZGVjbCwgbmFtZSkgPT4gcmVleHBvcnRzLnB1c2goe25hbWUsIGRlY2xhcmF0aW9uOiB7Li4uZGVjbCwgdmlhTW9kdWxlfX0pKTtcbiAgICByZXR1cm4gcmVleHBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0VW1kRGVmaW5lUHJvcGVydHlFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IERlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQpOlxuICAgICAgRXhwb3J0RGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgYXJncyA9IHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50cztcbiAgICBjb25zdCBuYW1lID0gYXJnc1sxXS50ZXh0O1xuICAgIGNvbnN0IGdldHRlckZuRXhwcmVzc2lvbiA9IGV4dHJhY3RHZXR0ZXJGbkV4cHJlc3Npb24oc3RhdGVtZW50KTtcbiAgICBpZiAoZ2V0dGVyRm5FeHByZXNzaW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZ2V0dGVyRm5FeHByZXNzaW9uKTtcbiAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgZGVjbGFyYXRpb259O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZGVjbGFyYXRpb246IHtcbiAgICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLklubGluZSxcbiAgICAgICAgbm9kZTogZ2V0dGVyRm5FeHByZXNzaW9uLFxuICAgICAgICBrbm93bjogbnVsbCxcbiAgICAgICAgdmlhTW9kdWxlOiBudWxsLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIElzIHRoZSBpZGVudGlmaWVyIGEgcGFyYW1ldGVyIG9uIGEgVU1EIGZhY3RvcnkgZnVuY3Rpb24sIGUuZy4gYGZ1bmN0aW9uIGZhY3RvcnkodGhpcywgY29yZSlgP1xuICAgKiBJZiBzbyB0aGVuIHJldHVybiBpdHMgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSBpZCAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCkgfHwgbnVsbDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN5bWJvbCAmJiBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNQYXJhbWV0ZXIoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRVbWREZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IG5zSWRlbnRpZmllciA9IGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChuc0lkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudCAmJiBpc0V4cG9ydHNBc3NpZ25tZW50KG5zSWRlbnRpZmllci5wYXJlbnQucGFyZW50KSkge1xuICAgICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudC5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGluaXRpYWxpemVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRldGVjdEtub3duRGVjbGFyYXRpb24oe1xuICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgICBub2RlOiBuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudC5sZWZ0LFxuICAgICAgICBpbXBsZW1lbnRhdGlvbjogc2tpcEFsaWFzZXMobnNJZGVudGlmaWVyLnBhcmVudC5wYXJlbnQucmlnaHQpLFxuICAgICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgICAgIGtub3duOiBudWxsLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlRGVjbGFyYXRpb24gPSB0aGlzLmdldFVtZE1vZHVsZURlY2xhcmF0aW9uKG5zSWRlbnRpZmllcik7XG4gICAgaWYgKG1vZHVsZURlY2xhcmF0aW9uID09PSBudWxsIHx8IG1vZHVsZURlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwgfHxcbiAgICAgICAgIXRzLmlzU291cmNlRmlsZShtb2R1bGVEZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZURlY2xhcmF0aW9uLm5vZGUpO1xuICAgIGlmIChtb2R1bGVFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGNvbXB1dGUgdGhlIGB2aWFNb2R1bGVgIGJlY2F1c2UgIHRoZSBgZ2V0RXhwb3J0c09mTW9kdWxlKClgIGNhbGxcbiAgICAvLyBkaWQgbm90IGtub3cgdGhhdCB3ZSB3ZXJlIGltcG9ydGluZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBtb2R1bGVFeHBvcnRzLmdldChpZC50ZXh0KSE7XG5cbiAgICBpZiAoIW1vZHVsZUV4cG9ydHMuaGFzKGlkLnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGNvbXB1dGUgdGhlIGB2aWFNb2R1bGVgIGJlY2F1c2UgIHRoZSBgZ2V0RXhwb3J0c09mTW9kdWxlKClgIGNhbGxcbiAgICAvLyBkaWQgbm90IGtub3cgdGhhdCB3ZSB3ZXJlIGltcG9ydGluZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdmlhTW9kdWxlID1cbiAgICAgICAgZGVjbGFyYXRpb24udmlhTW9kdWxlID09PSBudWxsID8gbW9kdWxlRGVjbGFyYXRpb24udmlhTW9kdWxlIDogZGVjbGFyYXRpb24udmlhTW9kdWxlO1xuXG4gICAgcmV0dXJuIHsuLi5kZWNsYXJhdGlvbiwgdmlhTW9kdWxlLCBrbm93bjogZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKX07XG4gIH1cblxuICBwcml2YXRlIGdldEV4cG9ydHNEZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICghaXNFeHBvcnRzSWRlbnRpZmllcihpZCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNhZGx5LCBpbiB0aGUgY2FzZSBvZiBgZXhwb3J0cy5mb28gPSBiYXJgLCB3ZSBjYW4ndCB1c2UgYHRoaXMuZmluZFVtZEltcG9ydFBhcmFtZXRlcihpZClgXG4gICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGlzIGBleHBvcnRzYCBpcyBmcm9tIHRoZSBJSUZFIGJvZHkgYXJndW1lbnRzLCBiZWNhdXNlXG4gICAgLy8gYHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKWAgd2lsbCByZXR1cm4gdGhlIHN5bWJvbCBmb3IgdGhlIGBmb29gIGlkZW50aWZpZXJcbiAgICAvLyByYXRoZXIgdGhhbiB0aGUgYGV4cG9ydHNgIGlkZW50aWZpZXIuXG4gICAgLy9cbiAgICAvLyBJbnN0ZWFkIHdlIHNlYXJjaCB0aGUgc3ltYm9scyBpbiB0aGUgY3VycmVudCBsb2NhbCBzY29wZS5cbiAgICBjb25zdCBleHBvcnRzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbHNJblNjb3BlKGlkLCB0cy5TeW1ib2xGbGFncy5WYXJpYWJsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PT0gJ2V4cG9ydHMnKTtcblxuICAgIGNvbnN0IG5vZGUgPSBleHBvcnRzU3ltYm9sICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihleHBvcnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50KSA/XG4gICAgICAgIC8vIFRoZXJlIGlzIGEgbG9jYWxseSBkZWZpbmVkIGBleHBvcnRzYCB2YXJpYWJsZSB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uIHBhcmFtZXRlci5cbiAgICAgICAgLy8gU28gdGhpcyBgZXhwb3J0c2AgaWRlbnRpZmllciBtdXN0IGJlIGEgbG9jYWwgdmFyaWFibGUgYW5kIGRvZXMgbm90IHJlcHJlc2VudCB0aGUgbW9kdWxlLlxuICAgICAgICBleHBvcnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gOlxuICAgICAgICAvLyBUaGVyZSBpcyBubyBsb2NhbCBzeW1ib2wgb3IgaXQgaXMgYSBwYXJhbWV0ZXIgb2YgYW4gSUlGRS5cbiAgICAgICAgLy8gU28gdGhpcyBgZXhwb3J0c2AgcmVwcmVzZW50cyB0aGUgY3VycmVudCBcIm1vZHVsZVwiLlxuICAgICAgICBpZC5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLFxuICAgICAgbm9kZSxcbiAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgIGtub3duOiBudWxsLFxuICAgICAgaWRlbnRpdHk6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VW1kTW9kdWxlRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRQYXRoID0gdGhpcy5nZXRJbXBvcnRQYXRoRnJvbVBhcmFtZXRlcihpZCkgfHwgdGhpcy5nZXRJbXBvcnRQYXRoRnJvbVJlcXVpcmVDYWxsKGlkKTtcbiAgICBpZiAoaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShpbXBvcnRQYXRoLCBpZC5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGlmIChtb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdmlhTW9kdWxlID0gaXNFeHRlcm5hbEltcG9ydChpbXBvcnRQYXRoKSA/IGltcG9ydFBhdGggOiBudWxsO1xuICAgIHJldHVybiB7a2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLCBub2RlOiBtb2R1bGUsIHZpYU1vZHVsZSwga25vd246IG51bGwsIGlkZW50aXR5OiBudWxsfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0SW1wb3J0UGF0aEZyb21QYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKGlkKTtcbiAgICBpZiAoaW1wb3J0UGFyYW1ldGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0VW1kSW1wb3J0UGF0aChpbXBvcnRQYXJhbWV0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRJbXBvcnRQYXRoRnJvbVJlcXVpcmVDYWxsKGlkOiB0cy5JZGVudGlmaWVyKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlKGlkLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmIChyZXF1aXJlQ2FsbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU1vZHVsZU5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0aGlzLmNvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoXG4gICAgICAgICAgW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpKVswXTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvICYmIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKFxuICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCksXG4gICAgICAgICAgdGhpcy5jb21waWxlckhvc3QpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUgJiZcbiAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IFVtZE1vZHVsZXxudWxsIHtcbiAgY29uc3Qgd3JhcHBlckNhbGwgPSBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQpO1xuICBpZiAoIXdyYXBwZXJDYWxsKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB3cmFwcGVyRm4gPSB3cmFwcGVyQ2FsbC5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHdyYXBwZXJGbikpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGblBhcmFtSW5kZXggPSB3cmFwcGVyRm4ucGFyYW1ldGVycy5maW5kSW5kZXgoXG4gICAgICBwYXJhbWV0ZXIgPT4gdHMuaXNJZGVudGlmaWVyKHBhcmFtZXRlci5uYW1lKSAmJiBwYXJhbWV0ZXIubmFtZS50ZXh0ID09PSAnZmFjdG9yeScpO1xuICBpZiAoZmFjdG9yeUZuUGFyYW1JbmRleCA9PT0gLTEpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZhY3RvcnlGbiA9IHN0cmlwUGFyZW50aGVzZXMod3JhcHBlckNhbGwuYXJndW1lbnRzW2ZhY3RvcnlGblBhcmFtSW5kZXhdKTtcbiAgaWYgKCFmYWN0b3J5Rm4gfHwgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZhY3RvcnlGbikpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7d3JhcHBlckZuLCBmYWN0b3J5Rm59O1xufVxuXG5mdW5jdGlvbiBnZXRVbWRXcmFwcGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHtleHByZXNzaW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb259fG51bGwge1xuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpIHx8ICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uKSB8fFxuICAgICAgIXRzLmlzQ2FsbEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbikgfHxcbiAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb24gJiB7ZXhwcmVzc2lvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1wb3J0c09mVW1kTW9kdWxlKHVtZE1vZHVsZTogVW1kTW9kdWxlKTpcbiAgICB7cGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgcGF0aDogc3RyaW5nfVtdIHtcbiAgY29uc3QgaW1wb3J0czoge3BhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHBhdGg6IHN0cmluZ31bXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVycy5sZW5ndGg7IGkrKykge1xuICAgIGltcG9ydHMucHVzaCh7XG4gICAgICBwYXJhbWV0ZXI6IHVtZE1vZHVsZS5mYWN0b3J5Rm4ucGFyYW1ldGVyc1tpXSxcbiAgICAgIHBhdGg6IGdldFJlcXVpcmVkTW9kdWxlUGF0aCh1bWRNb2R1bGUud3JhcHBlckZuLCBpKVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBpbXBvcnRzO1xufVxuXG5pbnRlcmZhY2UgVW1kTW9kdWxlIHtcbiAgd3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb247XG4gIGZhY3RvcnlGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uO1xufVxuXG5mdW5jdGlvbiBnZXRSZXF1aXJlZE1vZHVsZVBhdGgod3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIHBhcmFtSW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHdyYXBwZXJGbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVTUQgd3JhcHBlciBib2R5IGlzIG5vdCBhbiBleHByZXNzaW9uIHN0YXRlbWVudDpcXG4nICsgd3JhcHBlckZuLmJvZHkuZ2V0VGV4dCgpKTtcbiAgfVxuICBjb25zdCBtb2R1bGVQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgZmluZE1vZHVsZVBhdGhzKHN0YXRlbWVudC5leHByZXNzaW9uKTtcblxuICAvLyBTaW5jZSB3ZSB3ZXJlIG9ubHkgaW50ZXJlc3RlZCBpbiB0aGUgYHJlcXVpcmUoKWAgY2FsbHMsIHdlIG1pc3MgdGhlIGBleHBvcnRzYCBhcmd1bWVudCwgc28gd2VcbiAgLy8gbmVlZCB0byBzdWJ0cmFjdCAxLlxuICAvLyBFLmcuIGBmdW5jdGlvbihleHBvcnRzLCBkZXAxLCBkZXAyKWAgbWFwcyB0byBgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSgncGF0aC90by9kZXAxJyksXG4gIC8vIHJlcXVpcmUoJ3BhdGgvdG8vZGVwMicpKWBcbiAgcmV0dXJuIG1vZHVsZVBhdGhzW3BhcmFtSW5kZXggLSAxXTtcblxuICAvLyBTZWFyY2ggdGhlIHN0YXRlbWVudCBmb3IgY2FsbHMgdG8gYHJlcXVpcmUoJy4uLicpYCBhbmQgZXh0cmFjdCB0aGUgc3RyaW5nIHZhbHVlIG9mIHRoZSBmaXJzdFxuICAvLyBhcmd1bWVudFxuICBmdW5jdGlvbiBmaW5kTW9kdWxlUGF0aHMobm9kZTogdHMuTm9kZSkge1xuICAgIGlmIChpc1JlcXVpcmVDYWxsKG5vZGUpKSB7XG4gICAgICBjb25zdCBhcmd1bWVudCA9IG5vZGUuYXJndW1lbnRzWzBdO1xuICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChhcmd1bWVudCkpIHtcbiAgICAgICAgbW9kdWxlUGF0aHMucHVzaChhcmd1bWVudC50ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5mb3JFYWNoQ2hpbGQoZmluZE1vZHVsZVBhdGhzKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBJcyB0aGUgYG5vZGVgIGFuIGlkZW50aWZpZXIgd2l0aCB0aGUgbmFtZSBcImV4cG9ydHNcIj9cbiAqL1xuZnVuY3Rpb24gaXNFeHBvcnRzSWRlbnRpZmllcihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5JZGVudGlmaWVyIHtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihub2RlKSAmJiBub2RlLnRleHQgPT09ICdleHBvcnRzJztcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSBmYXIgcmlnaHQgaGFuZCBzaWRlIG9mIGEgc2VxdWVuY2Ugb2YgYWxpYXNlZCBhc3NpZ25lbWVudHMgb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIGV4cG9ydHMuTXlDbGFzcyA9IGFsaWFzMSA9IGFsaWFzMiA9IDw8ZGVjbGFyYXRpb24+PlxuICogYGBgXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGV4cHJlc3Npb24gdG8gcGFyc2VcbiAqIEByZXR1cm5zIHRoZSBvcmlnaW5hbCBgbm9kZWAgb3IgdGhlIGZhciByaWdodCBleHByZXNzaW9uIG9mIGEgc2VyaWVzIG9mIGFzc2lnbm1lbnRzLlxuICovXG5mdW5jdGlvbiBza2lwQWxpYXNlcyhub2RlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIHdoaWxlIChpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn1cbiJdfQ==