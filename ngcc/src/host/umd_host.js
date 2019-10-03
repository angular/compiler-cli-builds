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
        define("@angular/compiler-cli/ngcc/src/host/umd_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var UmdReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(UmdReflectionHost, _super);
        function UmdReflectionHost(logger, isCore, program, compilerHost, dts) {
            var _this = _super.call(this, logger, isCore, program.getTypeChecker(), dts) || this;
            _this.program = program;
            _this.compilerHost = compilerHost;
            _this.umdModules = new Map();
            _this.umdExports = new Map();
            _this.umdImportPaths = new Map();
            return _this;
        }
        UmdReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var superImport = _super.prototype.getImportOfIdentifier.call(this, id);
            if (superImport !== null) {
                return superImport;
            }
            var importParameter = this.findUmdImportParameter(id);
            var from = importParameter && this.getUmdImportPath(importParameter);
            return from !== null ? { from: from, name: id.text } : null;
        };
        UmdReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            return this.getUmdImportedDeclaration(id) || _super.prototype.getDeclarationOfIdentifier.call(this, id);
        };
        UmdReflectionHost.prototype.getExportsOfModule = function (module) {
            return _super.prototype.getExportsOfModule.call(this, module) || this.getUmdExports(module.getSourceFile());
        };
        UmdReflectionHost.prototype.getUmdModule = function (sourceFile) {
            if (sourceFile.isDeclarationFile) {
                return null;
            }
            if (!this.umdModules.has(sourceFile)) {
                if (sourceFile.statements.length !== 1) {
                    throw new Error("Expected UMD module file (" + sourceFile.fileName + ") to contain exactly one statement, but found " + sourceFile.statements + ".");
                }
                this.umdModules.set(sourceFile, parseStatementForUmdModule(sourceFile.statements[0]));
            }
            return this.umdModules.get(sourceFile);
        };
        UmdReflectionHost.prototype.getUmdImportPath = function (importParameter) {
            var e_1, _a;
            if (this.umdImportPaths.has(importParameter)) {
                return this.umdImportPaths.get(importParameter);
            }
            var umdModule = this.getUmdModule(importParameter.getSourceFile());
            if (umdModule === null) {
                return null;
            }
            var imports = getImportsOfUmdModule(umdModule);
            if (imports === null) {
                return null;
            }
            try {
                for (var imports_1 = tslib_1.__values(imports), imports_1_1 = imports_1.next(); !imports_1_1.done; imports_1_1 = imports_1.next()) {
                    var i = imports_1_1.value;
                    this.umdImportPaths.set(i.parameter, i.path);
                    if (i.parameter === importParameter) {
                        return i.path;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (imports_1_1 && !imports_1_1.done && (_a = imports_1.return)) _a.call(imports_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        UmdReflectionHost.prototype.getUmdExports = function (sourceFile) {
            if (!this.umdExports.has(sourceFile)) {
                var moduleExports = this.computeExportsOfUmdModule(sourceFile);
                this.umdExports.set(sourceFile, moduleExports);
            }
            return this.umdExports.get(sourceFile);
        };
        /** Get the top level statements for a module.
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
        UmdReflectionHost.prototype.computeExportsOfUmdModule = function (sourceFile) {
            var _this = this;
            var moduleMap = new Map();
            var exportStatements = this.getModuleStatements(sourceFile).filter(isUmdExportStatement);
            var exportDeclarations = exportStatements.map(function (statement) { return _this.extractUmdExportDeclaration(statement); });
            exportDeclarations.forEach(function (decl) {
                if (decl) {
                    moduleMap.set(decl.name, decl.declaration);
                }
            });
            return moduleMap;
        };
        UmdReflectionHost.prototype.extractUmdExportDeclaration = function (statement) {
            var exportExpression = statement.expression.right;
            var name = statement.expression.left.name.text;
            var declaration = this.getDeclarationOfExpression(exportExpression);
            if (declaration === null) {
                return null;
            }
            return { name: name, declaration: declaration };
        };
        UmdReflectionHost.prototype.findUmdImportParameter = function (id) {
            // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
            // If so capture the symbol of the namespace, e.g. `core`.
            var nsIdentifier = findNamespaceOfIdentifier(id);
            var nsSymbol = nsIdentifier && this.checker.getSymbolAtLocation(nsIdentifier) || null;
            // Is the namespace a parameter on a UMD factory function, e.g. `function factory(this, core)`?
            // If so then return its declaration.
            var nsDeclaration = nsSymbol && nsSymbol.valueDeclaration;
            return nsDeclaration && ts.isParameter(nsDeclaration) ? nsDeclaration : null;
        };
        UmdReflectionHost.prototype.getUmdImportedDeclaration = function (id) {
            var importInfo = this.getImportOfIdentifier(id);
            if (importInfo === null) {
                return null;
            }
            var importedFile = this.resolveModuleName(importInfo.from, id.getSourceFile());
            if (importedFile === undefined) {
                return null;
            }
            // We need to add the `viaModule` because  the `getExportsOfModule()` call
            // did not know that we were importing the declaration.
            return { node: importedFile, viaModule: importInfo.from };
        };
        UmdReflectionHost.prototype.resolveModuleName = function (moduleName, containingFile) {
            if (this.compilerHost.resolveModuleNames) {
                // FIXME: remove the "as any" cast once on TS3.6.
                var moduleInfo = this.compilerHost
                    .resolveModuleNames([moduleName], containingFile.fileName, undefined, undefined, this.program.getCompilerOptions())[0];
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
        var factoryFn = stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
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
    function isUmdExportStatement(s) {
        return ts.isExpressionStatement(s) && ts.isBinaryExpression(s.expression) &&
            ts.isPropertyAccessExpression(s.expression.left) &&
            ts.isIdentifier(s.expression.left.expression) &&
            s.expression.left.expression.text === 'exports';
    }
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
            if (isRequireCall(node)) {
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
    function isRequireCall(node) {
        return ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' && node.arguments.length === 1;
    }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQTREO0lBSTVELDJFQUErQztJQUUvQztRQUF1Qyw2Q0FBa0I7UUFJdkQsMkJBQ0ksTUFBYyxFQUFFLE1BQWUsRUFBWSxPQUFtQixFQUNwRCxZQUE2QixFQUFFLEdBQXdCO1lBRnJFLFlBR0Usa0JBQU0sTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsR0FBRyxDQUFDLFNBQ3JEO1lBSDhDLGFBQU8sR0FBUCxPQUFPLENBQVk7WUFDcEQsa0JBQVksR0FBWixZQUFZLENBQWlCO1lBTGpDLGdCQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFDdEQsZ0JBQVUsR0FBRyxJQUFJLEdBQUcsRUFBZ0QsQ0FBQztZQUNyRSxvQkFBYyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDOztRQUszRSxDQUFDO1FBRUQsaURBQXFCLEdBQXJCLFVBQXNCLEVBQWlCO1lBQ3JDLElBQU0sV0FBVyxHQUFHLGlCQUFNLHFCQUFxQixZQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtnQkFDeEIsT0FBTyxXQUFXLENBQUM7YUFDcEI7WUFFRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsSUFBTSxJQUFJLEdBQUcsZUFBZSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2RSxPQUFPLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFF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LElBQWE7UUFDNUMsT0FBTyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNyRSxDQUFDO0lBRkQsNENBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIEltcG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vZXNtNV9ob3N0JztcblxuZXhwb3J0IGNsYXNzIFVtZFJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtNVJlZmxlY3Rpb25Ib3N0IHtcbiAgcHJvdGVjdGVkIHVtZE1vZHVsZXMgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFVtZE1vZHVsZXxudWxsPigpO1xuICBwcm90ZWN0ZWQgdW1kRXhwb3J0cyA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw+KCk7XG4gIHByb3RlY3RlZCB1bWRJbXBvcnRQYXRocyA9IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHN0cmluZ3xudWxsPigpO1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGxvZ2dlcjogTG9nZ2VyLCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcHJvdGVjdGVkIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0LCBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihsb2dnZXIsIGlzQ29yZSwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBkdHMpO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHN1cGVySW1wb3J0ID0gc3VwZXIuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkKTtcbiAgICBpZiAoc3VwZXJJbXBvcnQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdXBlckltcG9ydDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRQYXJhbWV0ZXIgPSB0aGlzLmZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIoaWQpO1xuICAgIGNvbnN0IGZyb20gPSBpbXBvcnRQYXJhbWV0ZXIgJiYgdGhpcy5nZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcik7XG4gICAgcmV0dXJuIGZyb20gIT09IG51bGwgPyB7ZnJvbSwgbmFtZTogaWQudGV4dH0gOiBudWxsO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRVbWRJbXBvcnRlZERlY2xhcmF0aW9uKGlkKSB8fCBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIHJldHVybiBzdXBlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlKSB8fCB0aGlzLmdldFVtZEV4cG9ydHMobW9kdWxlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cblxuICBnZXRVbWRNb2R1bGUoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFVtZE1vZHVsZXxudWxsIHtcbiAgICBpZiAoc291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghdGhpcy51bWRNb2R1bGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgaWYgKHNvdXJjZUZpbGUuc3RhdGVtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIFVNRCBtb2R1bGUgZmlsZSAoJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSkgdG8gY29udGFpbiBleGFjdGx5IG9uZSBzdGF0ZW1lbnQsIGJ1dCBmb3VuZCAke3NvdXJjZUZpbGUuc3RhdGVtZW50c30uYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnVtZE1vZHVsZXMuc2V0KHNvdXJjZUZpbGUsIHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHNvdXJjZUZpbGUuc3RhdGVtZW50c1swXSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy51bWRNb2R1bGVzLmdldChzb3VyY2VGaWxlKSAhO1xuICB9XG5cbiAgZ2V0VW1kSW1wb3J0UGF0aChpbXBvcnRQYXJhbWV0ZXI6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLnVtZEltcG9ydFBhdGhzLmhhcyhpbXBvcnRQYXJhbWV0ZXIpKSB7XG4gICAgICByZXR1cm4gdGhpcy51bWRJbXBvcnRQYXRocy5nZXQoaW1wb3J0UGFyYW1ldGVyKSAhO1xuICAgIH1cblxuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMuZ2V0VW1kTW9kdWxlKGltcG9ydFBhcmFtZXRlci5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGlmICh1bWRNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydHMgPSBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlKTtcbiAgICBpZiAoaW1wb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBpIG9mIGltcG9ydHMpIHtcbiAgICAgIHRoaXMudW1kSW1wb3J0UGF0aHMuc2V0KGkucGFyYW1ldGVyLCBpLnBhdGgpO1xuICAgICAgaWYgKGkucGFyYW1ldGVyID09PSBpbXBvcnRQYXJhbWV0ZXIpIHtcbiAgICAgICAgcmV0dXJuIGkucGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldFVtZEV4cG9ydHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICBpZiAoIXRoaXMudW1kRXhwb3J0cy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSB0aGlzLmNvbXB1dGVFeHBvcnRzT2ZVbWRNb2R1bGUoc291cmNlRmlsZSk7XG4gICAgICB0aGlzLnVtZEV4cG9ydHMuc2V0KHNvdXJjZUZpbGUsIG1vZHVsZUV4cG9ydHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy51bWRFeHBvcnRzLmdldChzb3VyY2VGaWxlKSAhO1xuICB9XG5cbiAgLyoqIEdldCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGEgbW9kdWxlLlxuICAgKlxuICAgKiBJbiBVTUQgbW9kdWxlcyB0aGVzZSBhcmUgdGhlIGJvZHkgb2YgdGhlIFVNRCBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgbW9kdWxlIHdob3NlIHN0YXRlbWVudHMgd2Ugd2FudC5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMuZ2V0VW1kTW9kdWxlKHNvdXJjZUZpbGUpO1xuICAgIHJldHVybiB1bWRNb2R1bGUgIT09IG51bGwgPyBBcnJheS5mcm9tKHVtZE1vZHVsZS5mYWN0b3J5Rm4uYm9keS5zdGF0ZW1lbnRzKSA6IFtdO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlRXhwb3J0c09mVW1kTW9kdWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgY29uc3QgbW9kdWxlTWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudHMgPSB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkuZmlsdGVyKGlzVW1kRXhwb3J0U3RhdGVtZW50KTtcbiAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbnMgPVxuICAgICAgICBleHBvcnRTdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5leHRyYWN0VW1kRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KSk7XG4gICAgZXhwb3J0RGVjbGFyYXRpb25zLmZvckVhY2goZGVjbCA9PiB7XG4gICAgICBpZiAoZGVjbCkge1xuICAgICAgICBtb2R1bGVNYXAuc2V0KGRlY2wubmFtZSwgZGVjbC5kZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1vZHVsZU1hcDtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFVtZEV4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudDogVW1kRXhwb3J0U3RhdGVtZW50KTogVW1kRXhwb3J0RGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgZXhwb3J0RXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgIGNvbnN0IG5hbWUgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0Lm5hbWUudGV4dDtcblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHBvcnRFeHByZXNzaW9uKTtcbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7bmFtZSwgZGVjbGFyYXRpb259O1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kVW1kSW1wb3J0UGFyYW1ldGVyKGlkOiB0cy5JZGVudGlmaWVyKTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb258bnVsbCB7XG4gICAgLy8gSXMgYGlkYCBhIG5hbWVzcGFjZWQgcHJvcGVydHkgYWNjZXNzLCBlLmcuIGBEaXJlY3RpdmVgIGluIGBjb3JlLkRpcmVjdGl2ZWA/XG4gICAgLy8gSWYgc28gY2FwdHVyZSB0aGUgc3ltYm9sIG9mIHRoZSBuYW1lc3BhY2UsIGUuZy4gYGNvcmVgLlxuICAgIGNvbnN0IG5zSWRlbnRpZmllciA9IGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQpO1xuICAgIGNvbnN0IG5zU3ltYm9sID0gbnNJZGVudGlmaWVyICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5zSWRlbnRpZmllcikgfHwgbnVsbDtcblxuICAgIC8vIElzIHRoZSBuYW1lc3BhY2UgYSBwYXJhbWV0ZXIgb24gYSBVTUQgZmFjdG9yeSBmdW5jdGlvbiwgZS5nLiBgZnVuY3Rpb24gZmFjdG9yeSh0aGlzLCBjb3JlKWA/XG4gICAgLy8gSWYgc28gdGhlbiByZXR1cm4gaXRzIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IG5zRGVjbGFyYXRpb24gPSBuc1N5bWJvbCAmJiBuc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIHJldHVybiBuc0RlY2xhcmF0aW9uICYmIHRzLmlzUGFyYW1ldGVyKG5zRGVjbGFyYXRpb24pID8gbnNEZWNsYXJhdGlvbiA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldFVtZEltcG9ydGVkRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRJbmZvID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChpbXBvcnRJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydEluZm8uZnJvbSwgaWQuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIHRoZSBgdmlhTW9kdWxlYCBiZWNhdXNlICB0aGUgYGdldEV4cG9ydHNPZk1vZHVsZSgpYCBjYWxsXG4gICAgLy8gZGlkIG5vdCBrbm93IHRoYXQgd2Ugd2VyZSBpbXBvcnRpbmcgdGhlIGRlY2xhcmF0aW9uLlxuICAgIHJldHVybiB7bm9kZTogaW1wb3J0ZWRGaWxlLCB2aWFNb2R1bGU6IGltcG9ydEluZm8uZnJvbX07XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gICAgICAvLyBGSVhNRTogcmVtb3ZlIHRoZSBcImFzIGFueVwiIGNhc3Qgb25jZSBvbiBUUzMuNi5cbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSAodGhpcy5jb21waWxlckhvc3QgYXMgYW55KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCkpWzBdO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8gJiYgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSxcbiAgICAgICAgICB0aGlzLmNvbXBpbGVySG9zdCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZSAmJlxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogVW1kTW9kdWxlfG51bGwge1xuICBjb25zdCB3cmFwcGVyQ2FsbCA9IGdldFVtZFdyYXBwZXJDYWxsKHN0YXRlbWVudCk7XG4gIGlmICghd3JhcHBlckNhbGwpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IHdyYXBwZXJGbiA9IHdyYXBwZXJDYWxsLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24od3JhcHBlckZuKSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZmFjdG9yeUZuUGFyYW1JbmRleCA9IHdyYXBwZXJGbi5wYXJhbWV0ZXJzLmZpbmRJbmRleChcbiAgICAgIHBhcmFtZXRlciA9PiB0cy5pc0lkZW50aWZpZXIocGFyYW1ldGVyLm5hbWUpICYmIHBhcmFtZXRlci5uYW1lLnRleHQgPT09ICdmYWN0b3J5Jyk7XG4gIGlmIChmYWN0b3J5Rm5QYXJhbUluZGV4ID09PSAtMSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZmFjdG9yeUZuID0gc3RyaXBQYXJlbnRoZXNlcyh3cmFwcGVyQ2FsbC5hcmd1bWVudHNbZmFjdG9yeUZuUGFyYW1JbmRleF0pO1xuICBpZiAoIWZhY3RvcnlGbiB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZmFjdG9yeUZuKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHt3cmFwcGVyRm4sIGZhY3RvcnlGbn07XG59XG5cbmZ1bmN0aW9uIGdldFVtZFdyYXBwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAge2V4cHJlc3Npb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbn18bnVsbCB7XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24pIHx8XG4gICAgICAhdHMuaXNDYWxsRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uKSB8fFxuICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbiAmIHtleHByZXNzaW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb259O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlOiBVbWRNb2R1bGUpOlxuICAgIHtwYXJhbWV0ZXI6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBwYXRoOiBzdHJpbmd9W10ge1xuICBjb25zdCBpbXBvcnRzOiB7cGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgcGF0aDogc3RyaW5nfVtdID0gW107XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgdW1kTW9kdWxlLmZhY3RvcnlGbi5wYXJhbWV0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgaW1wb3J0cy5wdXNoKHtcbiAgICAgIHBhcmFtZXRlcjogdW1kTW9kdWxlLmZhY3RvcnlGbi5wYXJhbWV0ZXJzW2ldLFxuICAgICAgcGF0aDogZ2V0UmVxdWlyZWRNb2R1bGVQYXRoKHVtZE1vZHVsZS53cmFwcGVyRm4sIGkpXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGltcG9ydHM7XG59XG5cbmludGVyZmFjZSBVbWRNb2R1bGUge1xuICB3cmFwcGVyRm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgZmFjdG9yeUZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb247XG59XG5cbnR5cGUgVW1kRXhwb3J0U3RhdGVtZW50ID0gdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtcbiAgZXhwcmVzc2lvbjpcbiAgICAgIHRzLkJpbmFyeUV4cHJlc3Npb24gJiB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uICYge2V4cHJlc3Npb246IHRzLklkZW50aWZpZXJ9fVxufTtcblxuZnVuY3Rpb24gaXNVbWRFeHBvcnRTdGF0ZW1lbnQoczogdHMuU3RhdGVtZW50KTogcyBpcyBVbWRFeHBvcnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHMpICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihzLmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihzLmV4cHJlc3Npb24ubGVmdCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzLmV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uKSAmJlxuICAgICAgcy5leHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnZXhwb3J0cyc7XG59XG5cbmludGVyZmFjZSBVbWRFeHBvcnREZWNsYXJhdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgZGVjbGFyYXRpb246IERlY2xhcmF0aW9uO1xufVxuXG5mdW5jdGlvbiBnZXRSZXF1aXJlZE1vZHVsZVBhdGgod3JhcHBlckZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24sIHBhcmFtSW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHdyYXBwZXJGbi5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVTUQgd3JhcHBlciBib2R5IGlzIG5vdCBhbiBleHByZXNzaW9uIHN0YXRlbWVudDpcXG4nICsgd3JhcHBlckZuLmJvZHkuZ2V0VGV4dCgpKTtcbiAgfVxuICBjb25zdCBtb2R1bGVQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgZmluZE1vZHVsZVBhdGhzKHN0YXRlbWVudC5leHByZXNzaW9uKTtcblxuICAvLyBTaW5jZSB3ZSB3ZXJlIG9ubHkgaW50ZXJlc3RlZCBpbiB0aGUgYHJlcXVpcmUoKWAgY2FsbHMsIHdlIG1pc3MgdGhlIGBleHBvcnRzYCBhcmd1bWVudCwgc28gd2VcbiAgLy8gbmVlZCB0byBzdWJ0cmFjdCAxLlxuICAvLyBFLmcuIGBmdW5jdGlvbihleHBvcnRzLCBkZXAxLCBkZXAyKWAgbWFwcyB0byBgZnVuY3Rpb24oZXhwb3J0cywgcmVxdWlyZSgncGF0aC90by9kZXAxJyksXG4gIC8vIHJlcXVpcmUoJ3BhdGgvdG8vZGVwMicpKWBcbiAgcmV0dXJuIG1vZHVsZVBhdGhzW3BhcmFtSW5kZXggLSAxXTtcblxuICAvLyBTZWFyY2ggdGhlIHN0YXRlbWVudCBmb3IgY2FsbHMgdG8gYHJlcXVpcmUoJy4uLicpYCBhbmQgZXh0cmFjdCB0aGUgc3RyaW5nIHZhbHVlIG9mIHRoZSBmaXJzdFxuICAvLyBhcmd1bWVudFxuICBmdW5jdGlvbiBmaW5kTW9kdWxlUGF0aHMobm9kZTogdHMuTm9kZSkge1xuICAgIGlmIChpc1JlcXVpcmVDYWxsKG5vZGUpKSB7XG4gICAgICBjb25zdCBhcmd1bWVudCA9IG5vZGUuYXJndW1lbnRzWzBdO1xuICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChhcmd1bWVudCkpIHtcbiAgICAgICAgbW9kdWxlUGF0aHMucHVzaChhcmd1bWVudC50ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZS5mb3JFYWNoQ2hpbGQoZmluZE1vZHVsZVBhdGhzKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNSZXF1aXJlQ2FsbChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIHJldHVybiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gJ3JlcXVpcmUnICYmIG5vZGUuYXJndW1lbnRzLmxlbmd0aCA9PT0gMTtcbn1cblxuLyoqXG4gKiBJZiB0aGUgaWRlbnRpZmllciBgaWRgIGlzIHRoZSBSSFMgb2YgYSBwcm9wZXJ0eSBhY2Nlc3Mgb2YgdGhlIGZvcm0gYG5hbWVzcGFjZS5pZGBcbiAqIGFuZCBgbmFtZXNwYWNlYCBpcyBhbiBpZGVudGlmZXIgdGhlbiByZXR1cm4gYG5hbWVzcGFjZWAsIG90aGVyd2lzZSBgbnVsbGAuXG4gKiBAcGFyYW0gaWQgVGhlIGlkZW50aWZpZXIgd2hvc2UgbmFtZXNwYWNlIHdlIHdhbnQgdG8gZmluZC5cbiAqL1xuZnVuY3Rpb24gZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHJldHVybiBpZC5wYXJlbnQgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihpZC5wYXJlbnQuZXhwcmVzc2lvbikgP1xuICAgICAgaWQucGFyZW50LmV4cHJlc3Npb24gOlxuICAgICAgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwUGFyZW50aGVzZXMobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUge1xuICByZXR1cm4gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSA/IG5vZGUuZXhwcmVzc2lvbiA6IG5vZGU7XG59XG4iXX0=