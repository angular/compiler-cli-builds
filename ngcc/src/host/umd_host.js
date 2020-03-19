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
        define("@angular/compiler-cli/ngcc/src/host/umd_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/host/esm5_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
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
            return this.getUmdImportedDeclaration(id) || _super.prototype.getDeclarationOfIdentifier.call(this, id);
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
                        var exportDeclaration = this.extractUmdExportDeclaration(statement);
                        moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                    }
                    else if (commonjs_umd_utils_1.isReexportStatement(statement)) {
                        var reexports = this.extractUmdReexports(statement, sourceFile);
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
        UmdReflectionHost.prototype.extractUmdExportDeclaration = function (statement) {
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
                        known: null,
                        expression: exportExpression,
                        viaModule: null,
                    },
                };
            }
        };
        UmdReflectionHost.prototype.extractUmdReexports = function (statement, containingFile) {
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
                    reexports.push({ name: name, declaration: { node: decl.node, known: null, viaModule: viaModule } });
                }
                else {
                    reexports.push({ name: name, declaration: { node: null, known: null, expression: decl.expression, viaModule: viaModule } });
                }
            });
            return reexports;
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
            return { node: importedFile, known: utils_1.getTsHelperFnFromIdentifier(id), viaModule: importInfo.from };
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
        var factoryFn = esm5_host_1.stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQTREO0lBSTVELDhEQUFpRjtJQUNqRiw2RkFBdU07SUFDdk0sMkVBQWlFO0lBRWpFO1FBQXVDLDZDQUFrQjtRQVV2RCwyQkFBWSxNQUFjLEVBQUUsTUFBZSxFQUFFLEdBQWtCLEVBQUUsR0FBOEI7WUFBOUIsb0JBQUEsRUFBQSxVQUE4QjtZQUEvRixZQUNFLGtCQUFNLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxTQUdoQztZQWJTLGdCQUFVLEdBQ2hCLElBQUksa0JBQVUsQ0FBZ0MsVUFBQSxFQUFFLElBQUksT0FBQSxLQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLEVBQXpCLENBQXlCLENBQUMsQ0FBQztZQUN6RSxnQkFBVSxHQUFHLElBQUksa0JBQVUsQ0FDakMsVUFBQSxFQUFFLElBQUksT0FBQSxLQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQztZQUNwQyxvQkFBYyxHQUNwQixJQUFJLGtCQUFVLENBQXVDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUE3QixDQUE2QixDQUFDLENBQUM7WUFNL0YsS0FBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO1lBQzNCLEtBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQzs7UUFDL0IsQ0FBQztRQUVELGlEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyw4RUFBOEU7WUFDOUUsMERBQTBEO1lBQzFELElBQU0s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cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBJbXBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7RmFjdG9yeU1hcCwgZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyLCBzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtFeHBvcnREZWNsYXJhdGlvbiwgRXhwb3J0U3RhdGVtZW50LCBSZWV4cG9ydFN0YXRlbWVudCwgZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllciwgZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlLCBpc0V4cG9ydFN0YXRlbWVudCwgaXNSZWV4cG9ydFN0YXRlbWVudCwgaXNSZXF1aXJlQ2FsbH0gZnJvbSAnLi9jb21tb25qc191bWRfdXRpbHMnO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3QsIHN0cmlwUGFyZW50aGVzZXN9IGZyb20gJy4vZXNtNV9ob3N0JztcblxuZXhwb3J0IGNsYXNzIFVtZFJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgRXNtNVJlZmxlY3Rpb25Ib3N0IHtcbiAgcHJvdGVjdGVkIHVtZE1vZHVsZXMgPVxuICAgICAgbmV3IEZhY3RvcnlNYXA8dHMuU291cmNlRmlsZSwgVW1kTW9kdWxlfG51bGw+KHNmID0+IHRoaXMuY29tcHV0ZVVtZE1vZHVsZShzZikpO1xuICBwcm90ZWN0ZWQgdW1kRXhwb3J0cyA9IG5ldyBGYWN0b3J5TWFwPHRzLlNvdXJjZUZpbGUsIE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsPihcbiAgICAgIHNmID0+IHRoaXMuY29tcHV0ZUV4cG9ydHNPZlVtZE1vZHVsZShzZikpO1xuICBwcm90ZWN0ZWQgdW1kSW1wb3J0UGF0aHMgPVxuICAgICAgbmV3IEZhY3RvcnlNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHN0cmluZ3xudWxsPihwYXJhbSA9PiB0aGlzLmNvbXB1dGVJbXBvcnRQYXRoKHBhcmFtKSk7XG4gIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcm90ZWN0ZWQgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3Q7XG5cbiAgY29uc3RydWN0b3IobG9nZ2VyOiBMb2dnZXIsIGlzQ29yZTogYm9vbGVhbiwgc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW18bnVsbCA9IG51bGwpIHtcbiAgICBzdXBlcihsb2dnZXIsIGlzQ29yZSwgc3JjLCBkdHMpO1xuICAgIHRoaXMucHJvZ3JhbSA9IHNyYy5wcm9ncmFtO1xuICAgIHRoaXMuY29tcGlsZXJIb3N0ID0gc3JjLmhvc3Q7XG4gIH1cblxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgLy8gSXMgYGlkYCBhIG5hbWVzcGFjZWQgcHJvcGVydHkgYWNjZXNzLCBlLmcuIGBEaXJlY3RpdmVgIGluIGBjb3JlLkRpcmVjdGl2ZWA/XG4gICAgLy8gSWYgc28gY2FwdHVyZSB0aGUgc3ltYm9sIG9mIHRoZSBuYW1lc3BhY2UsIGUuZy4gYGNvcmVgLlxuICAgIGNvbnN0IG5zSWRlbnRpZmllciA9IGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQpO1xuICAgIGNvbnN0IGltcG9ydFBhcmFtZXRlciA9IG5zSWRlbnRpZmllciAmJiB0aGlzLmZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIobnNJZGVudGlmaWVyKTtcbiAgICBjb25zdCBmcm9tID0gaW1wb3J0UGFyYW1ldGVyICYmIHRoaXMuZ2V0VW1kSW1wb3J0UGF0aChpbXBvcnRQYXJhbWV0ZXIpO1xuICAgIHJldHVybiBmcm9tICE9PSBudWxsID8ge2Zyb20sIG5hbWU6IGlkLnRleHR9IDogbnVsbDtcbiAgfVxuXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VW1kSW1wb3J0ZWREZWNsYXJhdGlvbihpZCkgfHwgc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSkgfHwgdGhpcy51bWRFeHBvcnRzLmdldChtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldFVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51bWRNb2R1bGVzLmdldChzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy51bWRJbXBvcnRQYXRocy5nZXQoaW1wb3J0UGFyYW1ldGVyKTtcbiAgfVxuXG4gIC8qKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gVU1EIG1vZHVsZXMgdGhlc2UgYXJlIHRoZSBib2R5IG9mIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLmdldFVtZE1vZHVsZShzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gdW1kTW9kdWxlICE9PSBudWxsID8gQXJyYXkuZnJvbSh1bWRNb2R1bGUuZmFjdG9yeUZuLmJvZHkuc3RhdGVtZW50cykgOiBbXTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZVVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdGVkIFVNRCBtb2R1bGUgZmlsZSAoJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSkgdG8gY29udGFpbiBleGFjdGx5IG9uZSBzdGF0ZW1lbnQsIGAgK1xuICAgICAgICAgIGBidXQgZm91bmQgJHtzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RofS5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUV4cG9ydHNPZlVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgIGlmIChpc0V4cG9ydFN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGV4cG9ydERlY2xhcmF0aW9uID0gdGhpcy5leHRyYWN0VW1kRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKGlzUmVleHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCByZWV4cG9ydHMgPSB0aGlzLmV4dHJhY3RVbWRSZWV4cG9ydHMoc3RhdGVtZW50LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgICAgICBtb2R1bGVNYXAuc2V0KHJlZXhwb3J0Lm5hbWUsIHJlZXhwb3J0LmRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlTWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlSW1wb3J0UGF0aChwYXJhbTogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgdW1kTW9kdWxlID0gdGhpcy5nZXRVbWRNb2R1bGUocGFyYW0uZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAodW1kTW9kdWxlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRzID0gZ2V0SW1wb3J0c09mVW1kTW9kdWxlKHVtZE1vZHVsZSk7XG4gICAgaWYgKGltcG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBpbXBvcnRQYXRoOiBzdHJpbmd8bnVsbCA9IG51bGw7XG5cbiAgICBmb3IgKGNvbnN0IGkgb2YgaW1wb3J0cykge1xuICAgICAgLy8gQWRkIGFsbCBpbXBvcnRzIHRvIHRoZSBtYXAgdG8gc3BlZWQgdXAgZnV0dXJlIGxvb2sgdXBzLlxuICAgICAgdGhpcy51bWRJbXBvcnRQYXRocy5zZXQoaS5wYXJhbWV0ZXIsIGkucGF0aCk7XG4gICAgICBpZiAoaS5wYXJhbWV0ZXIgPT09IHBhcmFtKSB7XG4gICAgICAgIGltcG9ydFBhdGggPSBpLnBhdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGltcG9ydFBhdGg7XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RVbWRFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IEV4cG9ydFN0YXRlbWVudCk6IEV4cG9ydERlY2xhcmF0aW9uIHtcbiAgICBjb25zdCBleHBvcnRFeHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb24ucmlnaHQ7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cG9ydEV4cHJlc3Npb24pO1xuICAgIGNvbnN0IG5hbWUgPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0Lm5hbWUudGV4dDtcbiAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bmFtZSwgZGVjbGFyYXRpb259O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBkZWNsYXJhdGlvbjoge1xuICAgICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgICAga25vd246IG51bGwsXG4gICAgICAgICAgZXhwcmVzc2lvbjogZXhwb3J0RXhwcmVzc2lvbixcbiAgICAgICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFVtZFJlZXhwb3J0cyhzdGF0ZW1lbnQ6IFJlZXhwb3J0U3RhdGVtZW50LCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6XG4gICAgICBFeHBvcnREZWNsYXJhdGlvbltdIHtcbiAgICBjb25zdCByZWV4cG9ydEFyZyA9IHN0YXRlbWVudC5leHByZXNzaW9uLmFyZ3VtZW50c1swXTtcblxuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gaXNSZXF1aXJlQ2FsbChyZWV4cG9ydEFyZykgP1xuICAgICAgICByZWV4cG9ydEFyZyA6XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihyZWV4cG9ydEFyZykgPyBmaW5kUmVxdWlyZUNhbGxSZWZlcmVuY2UocmVleHBvcnRBcmcsIHRoaXMuY2hlY2tlcikgOiBudWxsO1xuXG4gICAgbGV0IGltcG9ydFBhdGg6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAgIGlmIChyZXF1aXJlQ2FsbCAhPT0gbnVsbCkge1xuICAgICAgaW1wb3J0UGF0aCA9IHJlcXVpcmVDYWxsLmFyZ3VtZW50c1swXS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKHJlZXhwb3J0QXJnKSkge1xuICAgICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKHJlZXhwb3J0QXJnKTtcbiAgICAgIGltcG9ydFBhdGggPSBpbXBvcnRQYXJhbWV0ZXIgJiYgdGhpcy5nZXRVbWRJbXBvcnRQYXRoKGltcG9ydFBhcmFtZXRlcik7XG4gICAgfVxuXG4gICAgaWYgKGltcG9ydFBhdGggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydFBhdGgsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShpbXBvcnRlZEZpbGUpO1xuICAgIGlmIChpbXBvcnRlZEV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB2aWFNb2R1bGUgPSBzdHJpcEV4dGVuc2lvbihpbXBvcnRlZEZpbGUuZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlZXhwb3J0czogRXhwb3J0RGVjbGFyYXRpb25bXSA9IFtdO1xuICAgIGltcG9ydGVkRXhwb3J0cy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICBpZiAoZGVjbC5ub2RlICE9PSBudWxsKSB7XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKHtuYW1lLCBkZWNsYXJhdGlvbjoge25vZGU6IGRlY2wubm9kZSwga25vd246IG51bGwsIHZpYU1vZHVsZX19KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZXhwb3J0cy5wdXNoKFxuICAgICAgICAgICAge25hbWUsIGRlY2xhcmF0aW9uOiB7bm9kZTogbnVsbCwga25vd246IG51bGwsIGV4cHJlc3Npb246IGRlY2wuZXhwcmVzc2lvbiwgdmlhTW9kdWxlfX0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICAvKipcbiAgICogSXMgdGhlIGlkZW50aWZpZXIgYSBwYXJhbWV0ZXIgb24gYSBVTUQgZmFjdG9yeSBmdW5jdGlvbiwgZS5nLiBgZnVuY3Rpb24gZmFjdG9yeSh0aGlzLCBjb3JlKWA/XG4gICAqIElmIHNvIHRoZW4gcmV0dXJuIGl0cyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZmluZFVtZEltcG9ydFBhcmFtZXRlcihpZDogdHMuSWRlbnRpZmllcik6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IGlkICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKSB8fCBudWxsO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3ltYm9sICYmIHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIHJldHVybiBkZWNsYXJhdGlvbiAmJiB0cy5pc1BhcmFtZXRlcihkZWNsYXJhdGlvbikgPyBkZWNsYXJhdGlvbiA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldFVtZEltcG9ydGVkRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRJbmZvID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChpbXBvcnRJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLnJlc29sdmVNb2R1bGVOYW1lKGltcG9ydEluZm8uZnJvbSwgaWQuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIG5lZWQgdG8gYWRkIHRoZSBgdmlhTW9kdWxlYCBiZWNhdXNlICB0aGUgYGdldEV4cG9ydHNPZk1vZHVsZSgpYCBjYWxsXG4gICAgLy8gZGlkIG5vdCBrbm93IHRoYXQgd2Ugd2VyZSBpbXBvcnRpbmcgdGhlIGRlY2xhcmF0aW9uLlxuICAgIHJldHVybiB7bm9kZTogaW1wb3J0ZWRGaWxlLCBrbm93bjogZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKSwgdmlhTW9kdWxlOiBpbXBvcnRJbmZvLmZyb219O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTW9kdWxlTmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZVxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuY29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcykge1xuICAgICAgY29uc3QgbW9kdWxlSW5mbyA9IHRoaXMuY29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcyhcbiAgICAgICAgICBbbW9kdWxlTmFtZV0sIGNvbnRhaW5pbmdGaWxlLmZpbGVOYW1lLCB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgICB0aGlzLnByb2dyYW0uZ2V0Q29tcGlsZXJPcHRpb25zKCkpWzBdO1xuICAgICAgcmV0dXJuIG1vZHVsZUluZm8gJiYgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUoXG4gICAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSxcbiAgICAgICAgICB0aGlzLmNvbXBpbGVySG9zdCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5mby5yZXNvbHZlZE1vZHVsZSAmJlxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogVW1kTW9kdWxlfG51bGwge1xuICBjb25zdCB3cmFwcGVyQ2FsbCA9IGdldFVtZFdyYXBwZXJDYWxsKHN0YXRlbWVudCk7XG4gIGlmICghd3JhcHBlckNhbGwpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IHdyYXBwZXJGbiA9IHdyYXBwZXJDYWxsLmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24od3JhcHBlckZuKSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZmFjdG9yeUZuUGFyYW1JbmRleCA9IHdyYXBwZXJGbi5wYXJhbWV0ZXJzLmZpbmRJbmRleChcbiAgICAgIHBhcmFtZXRlciA9PiB0cy5pc0lkZW50aWZpZXIocGFyYW1ldGVyLm5hbWUpICYmIHBhcmFtZXRlci5uYW1lLnRleHQgPT09ICdmYWN0b3J5Jyk7XG4gIGlmIChmYWN0b3J5Rm5QYXJhbUluZGV4ID09PSAtMSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgZmFjdG9yeUZuID0gc3RyaXBQYXJlbnRoZXNlcyh3cmFwcGVyQ2FsbC5hcmd1bWVudHNbZmFjdG9yeUZuUGFyYW1JbmRleF0pO1xuICBpZiAoIWZhY3RvcnlGbiB8fCAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZmFjdG9yeUZuKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHt3cmFwcGVyRm4sIGZhY3RvcnlGbn07XG59XG5cbmZ1bmN0aW9uIGdldFVtZFdyYXBwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAge2V4cHJlc3Npb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbn18bnVsbCB7XG4gIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgfHwgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24pIHx8XG4gICAgICAhdHMuaXNDYWxsRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uKSB8fFxuICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbiAmIHtleHByZXNzaW9uOiB0cy5GdW5jdGlvbkV4cHJlc3Npb259O1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlOiBVbWRNb2R1bGUpOlxuICAgIHtwYXJhbWV0ZXI6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBwYXRoOiBzdHJpbmd9W10ge1xuICBjb25zdCBpbXBvcnRzOiB7cGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgcGF0aDogc3RyaW5nfVtdID0gW107XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgdW1kTW9kdWxlLmZhY3RvcnlGbi5wYXJhbWV0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgaW1wb3J0cy5wdXNoKHtcbiAgICAgIHBhcmFtZXRlcjogdW1kTW9kdWxlLmZhY3RvcnlGbi5wYXJhbWV0ZXJzW2ldLFxuICAgICAgcGF0aDogZ2V0UmVxdWlyZWRNb2R1bGVQYXRoKHVtZE1vZHVsZS53cmFwcGVyRm4sIGkpXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGltcG9ydHM7XG59XG5cbmludGVyZmFjZSBVbWRNb2R1bGUge1xuICB3cmFwcGVyRm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgZmFjdG9yeUZuOiB0cy5GdW5jdGlvbkV4cHJlc3Npb247XG59XG5cbmZ1bmN0aW9uIGdldFJlcXVpcmVkTW9kdWxlUGF0aCh3cmFwcGVyRm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbiwgcGFyYW1JbmRleDogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3Qgc3RhdGVtZW50ID0gd3JhcHBlckZuLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1VNRCB3cmFwcGVyIGJvZHkgaXMgbm90IGFuIGV4cHJlc3Npb24gc3RhdGVtZW50OlxcbicgKyB3cmFwcGVyRm4uYm9keS5nZXRUZXh0KCkpO1xuICB9XG4gIGNvbnN0IG1vZHVsZVBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICBmaW5kTW9kdWxlUGF0aHMoc3RhdGVtZW50LmV4cHJlc3Npb24pO1xuXG4gIC8vIFNpbmNlIHdlIHdlcmUgb25seSBpbnRlcmVzdGVkIGluIHRoZSBgcmVxdWlyZSgpYCBjYWxscywgd2UgbWlzcyB0aGUgYGV4cG9ydHNgIGFyZ3VtZW50LCBzbyB3ZVxuICAvLyBuZWVkIHRvIHN1YnRyYWN0IDEuXG4gIC8vIEUuZy4gYGZ1bmN0aW9uKGV4cG9ydHMsIGRlcDEsIGRlcDIpYCBtYXBzIHRvIGBmdW5jdGlvbihleHBvcnRzLCByZXF1aXJlKCdwYXRoL3RvL2RlcDEnKSxcbiAgLy8gcmVxdWlyZSgncGF0aC90by9kZXAyJykpYFxuICByZXR1cm4gbW9kdWxlUGF0aHNbcGFyYW1JbmRleCAtIDFdO1xuXG4gIC8vIFNlYXJjaCB0aGUgc3RhdGVtZW50IGZvciBjYWxscyB0byBgcmVxdWlyZSgnLi4uJylgIGFuZCBleHRyYWN0IHRoZSBzdHJpbmcgdmFsdWUgb2YgdGhlIGZpcnN0XG4gIC8vIGFyZ3VtZW50XG4gIGZ1bmN0aW9uIGZpbmRNb2R1bGVQYXRocyhub2RlOiB0cy5Ob2RlKSB7XG4gICAgaWYgKGlzUmVxdWlyZUNhbGwobm9kZSkpIHtcbiAgICAgIGNvbnN0IGFyZ3VtZW50ID0gbm9kZS5hcmd1bWVudHNbMF07XG4gICAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKGFyZ3VtZW50KSkge1xuICAgICAgICBtb2R1bGVQYXRocy5wdXNoKGFyZ3VtZW50LnRleHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmZvckVhY2hDaGlsZChmaW5kTW9kdWxlUGF0aHMpO1xuICAgIH1cbiAgfVxufVxuIl19