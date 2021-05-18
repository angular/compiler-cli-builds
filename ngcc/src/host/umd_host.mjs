/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { absoluteFrom } from '../../../src/ngtsc/file_system';
import { isNamedFunctionDeclaration } from '../../../src/ngtsc/reflection';
import { FactoryMap, getTsHelperFnFromIdentifier, stripExtension } from '../utils';
import { extractGetterFnExpression, findNamespaceOfIdentifier, findRequireCallReference, isDefinePropertyReexportStatement, isExportsAssignment, isExportsDeclaration, isExportsStatement, isExternalImport, isRequireCall, isWildcardReexportStatement, skipAliases } from './commonjs_umd_utils';
import { getInnerClassDeclaration, getOuterNodeFromInnerDeclaration, isAssignment } from './esm2015_host';
import { Esm5ReflectionHost } from './esm5_host';
import { stripParentheses } from './utils';
export class UmdReflectionHost extends Esm5ReflectionHost {
    constructor(logger, isCore, src, dts = null) {
        super(logger, isCore, src, dts);
        this.umdModules = new FactoryMap(sf => this.computeUmdModule(sf));
        this.umdExports = new FactoryMap(sf => this.computeExportsOfUmdModule(sf));
        this.umdImportPaths = new FactoryMap(param => this.computeImportPath(param));
        this.program = src.program;
        this.compilerHost = src.host;
    }
    getImportOfIdentifier(id) {
        // Is `id` a namespaced property access, e.g. `Directive` in `core.Directive`?
        // If so capture the symbol of the namespace, e.g. `core`.
        const nsIdentifier = findNamespaceOfIdentifier(id);
        const importParameter = nsIdentifier && this.findUmdImportParameter(nsIdentifier);
        const from = importParameter && this.getUmdImportPath(importParameter);
        return from !== null ? { from, name: id.text } : null;
    }
    getDeclarationOfIdentifier(id) {
        // First we try one of the following:
        // 1. The `exports` identifier - referring to the current file/module.
        // 2. An identifier (e.g. `foo`) that refers to an imported UMD module.
        // 3. A UMD style export identifier (e.g. the `foo` of `exports.foo`).
        const declaration = this.getExportsDeclaration(id) || this.getUmdModuleDeclaration(id) ||
            this.getUmdDeclaration(id);
        if (declaration !== null) {
            return declaration;
        }
        // Try to get the declaration using the super class.
        const superDeclaration = super.getDeclarationOfIdentifier(id);
        if (superDeclaration === null) {
            return null;
        }
        // Check to see if the declaration is the inner node of a declaration IIFE.
        const outerNode = getOuterNodeFromInnerDeclaration(superDeclaration.node);
        if (outerNode === null) {
            return superDeclaration;
        }
        // We are only interested if the outer declaration is of the form
        // `exports.<name> = <initializer>`.
        if (!isExportsAssignment(outerNode)) {
            return superDeclaration;
        }
        return {
            kind: 1 /* Inline */,
            node: outerNode.left,
            implementation: outerNode.right,
            known: null,
            viaModule: null,
        };
    }
    getExportsOfModule(module) {
        return super.getExportsOfModule(module) || this.umdExports.get(module.getSourceFile());
    }
    getUmdModule(sourceFile) {
        if (sourceFile.isDeclarationFile) {
            return null;
        }
        return this.umdModules.get(sourceFile);
    }
    getUmdImportPath(importParameter) {
        return this.umdImportPaths.get(importParameter);
    }
    /**
     * Get the top level statements for a module.
     *
     * In UMD modules these are the body of the UMD factory function.
     *
     * @param sourceFile The module whose statements we want.
     * @returns An array of top level statements for the given module.
     */
    getModuleStatements(sourceFile) {
        const umdModule = this.getUmdModule(sourceFile);
        return umdModule !== null ? Array.from(umdModule.factoryFn.body.statements) : [];
    }
    getClassSymbolFromOuterDeclaration(declaration) {
        const superSymbol = super.getClassSymbolFromOuterDeclaration(declaration);
        if (superSymbol) {
            return superSymbol;
        }
        if (!isExportsDeclaration(declaration)) {
            return undefined;
        }
        let initializer = skipAliases(declaration.parent.right);
        if (ts.isIdentifier(initializer)) {
            const implementation = this.getDeclarationOfIdentifier(initializer);
            if (implementation !== null) {
                const implementationSymbol = this.getClassSymbol(implementation.node);
                if (implementationSymbol !== null) {
                    return implementationSymbol;
                }
            }
        }
        const innerDeclaration = getInnerClassDeclaration(initializer);
        if (innerDeclaration !== null) {
            return this.createClassSymbol(declaration.name, innerDeclaration);
        }
        return undefined;
    }
    getClassSymbolFromInnerDeclaration(declaration) {
        const superClassSymbol = super.getClassSymbolFromInnerDeclaration(declaration);
        if (superClassSymbol !== undefined) {
            return superClassSymbol;
        }
        if (!isNamedFunctionDeclaration(declaration)) {
            return undefined;
        }
        const outerNode = getOuterNodeFromInnerDeclaration(declaration);
        if (outerNode === null || !isExportsAssignment(outerNode)) {
            return undefined;
        }
        return this.createClassSymbol(outerNode.left.name, declaration);
    }
    /**
     * Extract all "classes" from the `statement` and add them to the `classes` map.
     */
    addClassSymbolsFromStatement(classes, statement) {
        super.addClassSymbolsFromStatement(classes, statement);
        // Also check for exports of the form: `exports.<name> = <class def>;`
        if (isExportsStatement(statement)) {
            const classSymbol = this.getClassSymbol(statement.expression.left);
            if (classSymbol) {
                classes.set(classSymbol.implementation, classSymbol);
            }
        }
    }
    /**
     * Analyze the given statement to see if it corresponds with an exports declaration like
     * `exports.MyClass = MyClass_1 = <class def>;`. If so, the declaration of `MyClass_1`
     * is associated with the `MyClass` identifier.
     *
     * @param statement The statement that needs to be preprocessed.
     */
    preprocessStatement(statement) {
        super.preprocessStatement(statement);
        if (!isExportsStatement(statement)) {
            return;
        }
        const declaration = statement.expression.left;
        const initializer = statement.expression.right;
        if (!isAssignment(initializer) || !ts.isIdentifier(initializer.left) ||
            !this.isClass(declaration)) {
            return;
        }
        const aliasedIdentifier = initializer.left;
        const aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
        if (aliasedDeclaration === null || aliasedDeclaration.node === null) {
            throw new Error(`Unable to locate declaration of ${aliasedIdentifier.text} in "${statement.getText()}"`);
        }
        this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
    }
    computeUmdModule(sourceFile) {
        if (sourceFile.statements.length !== 1) {
            throw new Error(`Expected UMD module file (${sourceFile.fileName}) to contain exactly one statement, ` +
                `but found ${sourceFile.statements.length}.`);
        }
        return parseStatementForUmdModule(sourceFile.statements[0]);
    }
    computeExportsOfUmdModule(sourceFile) {
        const moduleMap = new Map();
        for (const statement of this.getModuleStatements(sourceFile)) {
            if (isExportsStatement(statement)) {
                const exportDeclaration = this.extractBasicUmdExportDeclaration(statement);
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
            else if (isWildcardReexportStatement(statement)) {
                const reexports = this.extractUmdWildcardReexports(statement, sourceFile);
                for (const reexport of reexports) {
                    moduleMap.set(reexport.name, reexport.declaration);
                }
            }
            else if (isDefinePropertyReexportStatement(statement)) {
                const exportDeclaration = this.extractUmdDefinePropertyExportDeclaration(statement);
                if (exportDeclaration !== null) {
                    moduleMap.set(exportDeclaration.name, exportDeclaration.declaration);
                }
            }
        }
        return moduleMap;
    }
    computeImportPath(param) {
        const umdModule = this.getUmdModule(param.getSourceFile());
        if (umdModule === null) {
            return null;
        }
        const imports = getImportsOfUmdModule(umdModule);
        if (imports === null) {
            return null;
        }
        let importPath = null;
        for (const i of imports) {
            // Add all imports to the map to speed up future look ups.
            this.umdImportPaths.set(i.parameter, i.path);
            if (i.parameter === param) {
                importPath = i.path;
            }
        }
        return importPath;
    }
    extractBasicUmdExportDeclaration(statement) {
        var _a;
        const name = statement.expression.left.name.text;
        const exportExpression = skipAliases(statement.expression.right);
        const declaration = (_a = this.getDeclarationOfExpression(exportExpression)) !== null && _a !== void 0 ? _a : {
            kind: 1 /* Inline */,
            node: statement.expression.left,
            implementation: statement.expression.right,
            known: null,
            viaModule: null,
        };
        return { name, declaration };
    }
    extractUmdWildcardReexports(statement, containingFile) {
        const reexportArg = statement.expression.arguments[0];
        const requireCall = isRequireCall(reexportArg) ?
            reexportArg :
            ts.isIdentifier(reexportArg) ? findRequireCallReference(reexportArg, this.checker) : null;
        let importPath = null;
        if (requireCall !== null) {
            importPath = requireCall.arguments[0].text;
        }
        else if (ts.isIdentifier(reexportArg)) {
            const importParameter = this.findUmdImportParameter(reexportArg);
            importPath = importParameter && this.getUmdImportPath(importParameter);
        }
        if (importPath === null) {
            return [];
        }
        const importedFile = this.resolveModuleName(importPath, containingFile);
        if (importedFile === undefined) {
            return [];
        }
        const importedExports = this.getExportsOfModule(importedFile);
        if (importedExports === null) {
            return [];
        }
        const viaModule = stripExtension(importedFile.fileName);
        const reexports = [];
        importedExports.forEach((decl, name) => reexports.push({ name, declaration: Object.assign(Object.assign({}, decl), { viaModule }) }));
        return reexports;
    }
    extractUmdDefinePropertyExportDeclaration(statement) {
        const args = statement.expression.arguments;
        const name = args[1].text;
        const getterFnExpression = extractGetterFnExpression(statement);
        if (getterFnExpression === null) {
            return null;
        }
        const declaration = this.getDeclarationOfExpression(getterFnExpression);
        if (declaration !== null) {
            return { name, declaration };
        }
        return {
            name,
            declaration: {
                kind: 1 /* Inline */,
                node: args[1],
                implementation: getterFnExpression,
                known: null,
                viaModule: null,
            },
        };
    }
    /**
     * Is the identifier a parameter on a UMD factory function, e.g. `function factory(this, core)`?
     * If so then return its declaration.
     */
    findUmdImportParameter(id) {
        const symbol = id && this.checker.getSymbolAtLocation(id) || null;
        const declaration = symbol && symbol.valueDeclaration;
        return declaration && ts.isParameter(declaration) ? declaration : null;
    }
    getUmdDeclaration(id) {
        const nsIdentifier = findNamespaceOfIdentifier(id);
        if (nsIdentifier === null) {
            return null;
        }
        if (nsIdentifier.parent.parent && isExportsAssignment(nsIdentifier.parent.parent)) {
            const initializer = nsIdentifier.parent.parent.right;
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
        const moduleDeclaration = this.getUmdModuleDeclaration(nsIdentifier);
        if (moduleDeclaration === null || moduleDeclaration.node === null ||
            !ts.isSourceFile(moduleDeclaration.node)) {
            return null;
        }
        const moduleExports = this.getExportsOfModule(moduleDeclaration.node);
        if (moduleExports === null) {
            return null;
        }
        // We need to compute the `viaModule` because  the `getExportsOfModule()` call
        // did not know that we were importing the declaration.
        const declaration = moduleExports.get(id.text);
        if (!moduleExports.has(id.text)) {
            return null;
        }
        // We need to compute the `viaModule` because  the `getExportsOfModule()` call
        // did not know that we were importing the declaration.
        const viaModule = declaration.viaModule === null ? moduleDeclaration.viaModule : declaration.viaModule;
        return Object.assign(Object.assign({}, declaration), { viaModule, known: getTsHelperFnFromIdentifier(id) });
    }
    getExportsDeclaration(id) {
        if (!isExportsIdentifier(id)) {
            return null;
        }
        // Sadly, in the case of `exports.foo = bar`, we can't use `this.findUmdImportParameter(id)`
        // to check whether this `exports` is from the IIFE body arguments, because
        // `this.checker.getSymbolAtLocation(id)` will return the symbol for the `foo` identifier
        // rather than the `exports` identifier.
        //
        // Instead we search the symbols in the current local scope.
        const exportsSymbol = this.checker.getSymbolsInScope(id, ts.SymbolFlags.Variable)
            .find(symbol => symbol.name === 'exports');
        const node = exportsSymbol !== undefined &&
            !ts.isFunctionExpression(exportsSymbol.valueDeclaration.parent) ?
            // There is a locally defined `exports` variable that is not a function parameter.
            // So this `exports` identifier must be a local variable and does not represent the module.
            exportsSymbol.valueDeclaration :
            // There is no local symbol or it is a parameter of an IIFE.
            // So this `exports` represents the current "module".
            id.getSourceFile();
        return {
            kind: 0 /* Concrete */,
            node,
            viaModule: null,
            known: null,
            identity: null,
        };
    }
    getUmdModuleDeclaration(id) {
        const importPath = this.getImportPathFromParameter(id) || this.getImportPathFromRequireCall(id);
        if (importPath === null) {
            return null;
        }
        const module = this.resolveModuleName(importPath, id.getSourceFile());
        if (module === undefined) {
            return null;
        }
        const viaModule = isExternalImport(importPath) ? importPath : null;
        return { kind: 0 /* Concrete */, node: module, viaModule, known: null, identity: null };
    }
    getImportPathFromParameter(id) {
        const importParameter = this.findUmdImportParameter(id);
        if (importParameter === null) {
            return null;
        }
        return this.getUmdImportPath(importParameter);
    }
    getImportPathFromRequireCall(id) {
        const requireCall = findRequireCallReference(id, this.checker);
        if (requireCall === null) {
            return null;
        }
        return requireCall.arguments[0].text;
    }
    /**
     * If this is an IIFE then try to grab the outer and inner classes otherwise fallback on the super
     * class.
     */
    getDeclarationOfExpression(expression) {
        const inner = getInnerClassDeclaration(expression);
        if (inner !== null) {
            const outer = getOuterNodeFromInnerDeclaration(inner);
            if (outer !== null && isExportsAssignment(outer)) {
                return {
                    kind: 1 /* Inline */,
                    node: outer.left,
                    implementation: inner,
                    known: null,
                    viaModule: null,
                };
            }
        }
        return super.getDeclarationOfExpression(expression);
    }
    resolveModuleName(moduleName, containingFile) {
        if (this.compilerHost.resolveModuleNames) {
            const moduleInfo = this.compilerHost.resolveModuleNames([moduleName], containingFile.fileName, undefined, undefined, this.program.getCompilerOptions())[0];
            return moduleInfo && this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedFileName));
        }
        else {
            const moduleInfo = ts.resolveModuleName(moduleName, containingFile.fileName, this.program.getCompilerOptions(), this.compilerHost);
            return moduleInfo.resolvedModule &&
                this.program.getSourceFile(absoluteFrom(moduleInfo.resolvedModule.resolvedFileName));
        }
    }
}
export function parseStatementForUmdModule(statement) {
    const wrapperCall = getUmdWrapperCall(statement);
    if (!wrapperCall)
        return null;
    const wrapperFn = wrapperCall.expression;
    if (!ts.isFunctionExpression(wrapperFn))
        return null;
    const factoryFnParamIndex = wrapperFn.parameters.findIndex(parameter => ts.isIdentifier(parameter.name) && parameter.name.text === 'factory');
    if (factoryFnParamIndex === -1)
        return null;
    const factoryFn = stripParentheses(wrapperCall.arguments[factoryFnParamIndex]);
    if (!factoryFn || !ts.isFunctionExpression(factoryFn))
        return null;
    return { wrapperFn, factoryFn };
}
function getUmdWrapperCall(statement) {
    if (!ts.isExpressionStatement(statement) || !ts.isParenthesizedExpression(statement.expression) ||
        !ts.isCallExpression(statement.expression.expression) ||
        !ts.isFunctionExpression(statement.expression.expression.expression)) {
        return null;
    }
    return statement.expression.expression;
}
export function getImportsOfUmdModule(umdModule) {
    const imports = [];
    for (let i = 1; i < umdModule.factoryFn.parameters.length; i++) {
        imports.push({
            parameter: umdModule.factoryFn.parameters[i],
            path: getRequiredModulePath(umdModule.wrapperFn, i)
        });
    }
    return imports;
}
function getRequiredModulePath(wrapperFn, paramIndex) {
    const statement = wrapperFn.body.statements[0];
    if (!ts.isExpressionStatement(statement)) {
        throw new Error('UMD wrapper body is not an expression statement:\n' + wrapperFn.body.getText());
    }
    const modulePaths = [];
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
            const argument = node.arguments[0];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2hvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvaG9zdC91bWRfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sZ0NBQWdDLENBQUM7QUFFNUQsT0FBTyxFQUF1QywwQkFBMEIsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBRS9HLE9BQU8sRUFBQyxVQUFVLEVBQUUsMkJBQTJCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRWpGLE9BQU8sRUFBdUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsaUNBQWlDLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBNEIsTUFBTSxzQkFBc0IsQ0FBQztBQUNsWSxPQUFPLEVBQUMsd0JBQXdCLEVBQUUsZ0NBQWdDLEVBQUUsWUFBWSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEcsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sYUFBYSxDQUFDO0FBRS9DLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUV6QyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsa0JBQWtCO0lBVXZELFlBQVksTUFBYyxFQUFFLE1BQWUsRUFBRSxHQUFrQixFQUFFLE1BQTBCLElBQUk7UUFDN0YsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBVnhCLGVBQVUsR0FDaEIsSUFBSSxVQUFVLENBQWdDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsZUFBVSxHQUFHLElBQUksVUFBVSxDQUNqQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLG1CQUFjLEdBQ3BCLElBQUksVUFBVSxDQUF1QyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBTS9GLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVELHFCQUFxQixDQUFDLEVBQWlCO1FBQ3JDLDhFQUE4RTtRQUM5RSwwREFBMEQ7UUFDMUQsTUFBTSxZQUFZLEdBQUcseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsTUFBTSxlQUFlLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsRixNQUFNLElBQUksR0FBRyxlQUFlLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3RELENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxFQUFpQjtRQUMxQyxxQ0FBcUM7UUFDckMsc0VBQXNFO1FBQ3RFLHVFQUF1RTtRQUN2RSxzRUFBc0U7UUFDdEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7WUFDbEYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtZQUN4QixPQUFPLFdBQVcsQ0FBQztTQUNwQjtRQUVELG9EQUFvRDtRQUNwRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxJQUFJLGdCQUFnQixLQUFLLElBQUksRUFBRTtZQUM3QixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsMkVBQTJFO1FBQzNFLE1BQU0sU0FBUyxHQUFHLGdDQUFnQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixPQUFPLGdCQUFnQixDQUFDO1NBQ3pCO1FBRUQsaUVBQWlFO1FBQ2pFLG9DQUFvQztRQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDbkMsT0FBTyxnQkFBZ0IsQ0FBQztTQUN6QjtRQUVELE9BQU87WUFDTCxJQUFJLGdCQUF3QjtZQUM1QixJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUk7WUFDcEIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxLQUFLO1lBQy9CLEtBQUssRUFBRSxJQUFJO1lBQ1gsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQztJQUNKLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxNQUFlO1FBQ2hDLE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxZQUFZLENBQUMsVUFBeUI7UUFDcEMsSUFBSSxVQUFVLENBQUMsaUJBQWlCLEVBQUU7WUFDaEMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELGdCQUFnQixDQUFDLGVBQXdDO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDTyxtQkFBbUIsQ0FBQyxVQUF5QjtRQUNyRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sU0FBUyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ25GLENBQUM7SUFFUyxrQ0FBa0MsQ0FBQyxXQUFvQjtRQUMvRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsa0NBQWtDLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUUsSUFBSSxXQUFXLEVBQUU7WUFDZixPQUFPLFdBQVcsQ0FBQztTQUNwQjtRQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN0QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELElBQUksV0FBVyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUNoQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEUsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO2dCQUMzQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RSxJQUFJLG9CQUFvQixLQUFLLElBQUksRUFBRTtvQkFDakMsT0FBTyxvQkFBb0IsQ0FBQztpQkFDN0I7YUFDRjtTQUNGO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvRCxJQUFJLGdCQUFnQixLQUFLLElBQUksRUFBRTtZQUM3QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7U0FDbkU7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBR1Msa0NBQWtDLENBQUMsV0FBb0I7UUFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0NBQWtDLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0UsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7WUFDbEMsT0FBTyxnQkFBZ0IsQ0FBQztTQUN6QjtRQUVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM1QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELE1BQU0sU0FBUyxHQUFHLGdDQUFnQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hFLElBQUksU0FBUyxLQUFLLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3pELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVEOztPQUVHO0lBQ08sNEJBQTRCLENBQ2xDLE9BQXdDLEVBQUUsU0FBdUI7UUFDbkUsS0FBSyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV2RCxzRUFBc0U7UUFDdEUsSUFBSSxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkUsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQ3REO1NBQ0Y7SUFDSCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ08sbUJBQW1CLENBQUMsU0FBdUI7UUFDbkQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNsQyxPQUFPO1NBQ1I7UUFFRCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztRQUM5QyxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO1lBQ2hFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUM5QixPQUFPO1NBQ1I7UUFFRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFFM0MsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM5RSxJQUFJLGtCQUFrQixLQUFLLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ25FLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLGlCQUFpQixDQUFDLElBQUksUUFBUSxTQUFTLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzlGO1FBQ0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxVQUF5QjtRQUNoRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN0QyxNQUFNLElBQUksS0FBSyxDQUNYLDZCQUE2QixVQUFVLENBQUMsUUFBUSxzQ0FBc0M7Z0JBQ3RGLGFBQWEsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQ25EO1FBRUQsT0FBTywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLHlCQUF5QixDQUFDLFVBQXlCO1FBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ2pELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzVELElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ2pDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMzRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDMUMsb0ZBQW9GO29CQUNwRiw0RUFBNEU7b0JBQzVFLGVBQWU7b0JBQ2YsTUFBTTtvQkFDTiwrQkFBK0I7b0JBQy9CLHNEQUFzRDtvQkFDdEQsTUFBTTtvQkFDTixvREFBb0Q7b0JBQ3BELFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUN0RTthQUNGO2lCQUFNLElBQUksMkJBQTJCLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ2pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzFFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO29CQUNoQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUNwRDthQUNGO2lCQUFNLElBQUksaUNBQWlDLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3ZELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNwRixJQUFJLGlCQUFpQixLQUFLLElBQUksRUFBRTtvQkFDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7aUJBQ3RFO2FBQ0Y7U0FDRjtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxLQUE4QjtRQUN0RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzNELElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLFVBQVUsR0FBZ0IsSUFBSSxDQUFDO1FBRW5DLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFO1lBQ3ZCLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO2dCQUN6QixVQUFVLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUNyQjtTQUNGO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVPLGdDQUFnQyxDQUFDLFNBQTJCOztRQUNsRSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQUcsTUFBQSxJQUFJLENBQUMsMEJBQTBCLENBQUMsZ0JBQWdCLENBQUMsbUNBQUk7WUFDdkUsSUFBSSxnQkFBd0I7WUFDNUIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSTtZQUMvQixjQUFjLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1lBQzFDLEtBQUssRUFBRSxJQUFJO1lBQ1gsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQztRQUNGLE9BQU8sRUFBQyxJQUFJLEVBQUUsV0FBVyxFQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVPLDJCQUEyQixDQUMvQixTQUFvQyxFQUFFLGNBQTZCO1FBQ3JFLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFdBQVcsQ0FBQyxDQUFDO1lBQ2IsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTlGLElBQUksVUFBVSxHQUFnQixJQUFJLENBQUM7UUFFbkMsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO1lBQ3hCLFVBQVUsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztTQUM1QzthQUFNLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN2QyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDakUsVUFBVSxHQUFHLGVBQWUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDeEU7UUFFRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDdkIsT0FBTyxFQUFFLENBQUM7U0FDWDtRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDeEUsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO1lBQzlCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUQsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sU0FBUyxHQUF3QixFQUFFLENBQUM7UUFDMUMsZUFBZSxDQUFDLE9BQU8sQ0FDbkIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLFdBQVcsa0NBQU0sSUFBSSxLQUFFLFNBQVMsR0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFTyx5Q0FBeUMsQ0FBQyxTQUEwQztRQUUxRixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sa0JBQWtCLEdBQUcseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEUsSUFBSSxrQkFBa0IsS0FBSyxJQUFJLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksV0FBVyxLQUFLLElBQUksRUFBRTtZQUN4QixPQUFPLEVBQUMsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDO1NBQzVCO1FBRUQsT0FBTztZQUNMLElBQUk7WUFDSixXQUFXLEVBQUU7Z0JBQ1gsSUFBSSxnQkFBd0I7Z0JBQzVCLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNiLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLEtBQUssRUFBRSxJQUFJO2dCQUNYLFNBQVMsRUFBRSxJQUFJO2FBQ2hCO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7O09BR0c7SUFDSyxzQkFBc0IsQ0FBQyxFQUFpQjtRQUM5QyxNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDbEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUN0RCxPQUFPLFdBQVcsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN6RSxDQUFDO0lBRU8saUJBQWlCLENBQUMsRUFBaUI7UUFDekMsTUFBTSxZQUFZLEdBQUcseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakYsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ3JELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDaEMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDckQ7WUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztnQkFDakMsSUFBSSxnQkFBd0I7Z0JBQzVCLElBQUksRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJO2dCQUNyQyxjQUFjLEVBQUUsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDN0QsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsS0FBSyxFQUFFLElBQUk7YUFDWixDQUFDLENBQUM7U0FDSjtRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JFLElBQUksaUJBQWlCLEtBQUssSUFBSSxJQUFJLGlCQUFpQixDQUFDLElBQUksS0FBSyxJQUFJO1lBQzdELENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RFLElBQUksYUFBYSxLQUFLLElBQUksRUFBRTtZQUMxQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsOEVBQThFO1FBQzlFLHVEQUF1RDtRQUN2RCxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUVoRCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELDhFQUE4RTtRQUM5RSx1REFBdUQ7UUFDdkQsTUFBTSxTQUFTLEdBQ1gsV0FBVyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUV6Rix1Q0FBVyxXQUFXLEtBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLENBQUMsSUFBRTtJQUM3RSxDQUFDO0lBRU8scUJBQXFCLENBQUMsRUFBaUI7UUFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCw0RkFBNEY7UUFDNUYsMkVBQTJFO1FBQzNFLHlGQUF5RjtRQUN6Rix3Q0FBd0M7UUFDeEMsRUFBRTtRQUNGLDREQUE0RDtRQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQzthQUN0RCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBRXJFLE1BQU0sSUFBSSxHQUFHLGFBQWEsS0FBSyxTQUFTO1lBQ2hDLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLGtGQUFrRjtZQUNsRiwyRkFBMkY7WUFDM0YsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEMsNERBQTREO1lBQzVELHFEQUFxRDtZQUNyRCxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFdkIsT0FBTztZQUNMLElBQUksa0JBQTBCO1lBQzlCLElBQUk7WUFDSixTQUFTLEVBQUUsSUFBSTtZQUNmLEtBQUssRUFBRSxJQUFJO1lBQ1gsUUFBUSxFQUFFLElBQUk7U0FDZixDQUFDO0lBQ0osQ0FBQztJQUVPLHVCQUF1QixDQUFDLEVBQWlCO1FBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEcsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtZQUN4QixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ25FLE9BQU8sRUFBQyxJQUFJLGtCQUEwQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBQyxDQUFDO0lBQ2hHLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxFQUFpQjtRQUNsRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEQsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sNEJBQTRCLENBQUMsRUFBaUI7UUFDcEQsTUFBTSxXQUFXLEdBQUcsd0JBQXdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7WUFDeEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDdkMsQ0FBQztJQUVEOzs7T0FHRztJQUNPLDBCQUEwQixDQUFDLFVBQXlCO1FBQzVELE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixNQUFNLEtBQUssR0FBRyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0RCxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2hELE9BQU87b0JBQ0wsSUFBSSxnQkFBd0I7b0JBQzVCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsY0FBYyxFQUFFLEtBQUs7b0JBQ3JCLEtBQUssRUFBRSxJQUFJO29CQUNYLFNBQVMsRUFBRSxJQUFJO2lCQUNoQixDQUFDO2FBQ0g7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxVQUFrQixFQUFFLGNBQTZCO1FBRXpFLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRTtZQUN4QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUNuRCxDQUFDLFVBQVUsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFDM0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsT0FBTyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7U0FDNUY7YUFBTTtZQUNMLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDbkMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUN0RSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkIsT0FBTyxVQUFVLENBQUMsY0FBYztnQkFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1NBQzFGO0lBQ0gsQ0FBQztDQUNGO0FBRUQsTUFBTSxVQUFVLDBCQUEwQixDQUFDLFNBQXVCO0lBQ2hFLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQyxXQUFXO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFOUIsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQztJQUN6QyxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRXJELE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQ3RELFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDdkYsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUU1QyxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUMvRSxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRW5FLE9BQU8sRUFBQyxTQUFTLEVBQUUsU0FBUyxFQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsU0FBdUI7SUFFaEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO1FBQzNGLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQ3JELENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ3hFLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxPQUFPLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBcUUsQ0FBQztBQUNwRyxDQUFDO0FBR0QsTUFBTSxVQUFVLHFCQUFxQixDQUFDLFNBQW9CO0lBRXhELE1BQU0sT0FBTyxHQUF5RCxFQUFFLENBQUM7SUFDekUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5RCxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1gsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM1QyxJQUFJLEVBQUUscUJBQXFCLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7U0FDcEQsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBT0QsU0FBUyxxQkFBcUIsQ0FBQyxTQUFnQyxFQUFFLFVBQWtCO0lBQ2pGLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxvREFBb0QsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7S0FDdEY7SUFDRCxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7SUFDakMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUV0QyxnR0FBZ0c7SUFDaEcsc0JBQXNCO0lBQ3RCLDJGQUEyRjtJQUMzRiw0QkFBNEI7SUFDNUIsT0FBTyxXQUFXLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRW5DLCtGQUErRjtJQUMvRixXQUFXO0lBQ1gsU0FBUyxlQUFlLENBQUMsSUFBYTtRQUNwQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDaEMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakM7U0FDRjthQUFNO1lBQ0wsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUNwQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLG1CQUFtQixDQUFDLElBQWE7SUFDeEMsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDO0FBQzFELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7RGVjbGFyYXRpb24sIERlY2xhcmF0aW9uS2luZCwgSW1wb3J0LCBpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0ZhY3RvcnlNYXAsIGdldFRzSGVscGVyRm5Gcm9tSWRlbnRpZmllciwgc3RyaXBFeHRlbnNpb259IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtEZWZpbmVQcm9wZXJ0eVJlZXhwb3J0U3RhdGVtZW50LCBFeHBvcnREZWNsYXJhdGlvbiwgRXhwb3J0c1N0YXRlbWVudCwgZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbiwgZmluZE5hbWVzcGFjZU9mSWRlbnRpZmllciwgZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlLCBpc0RlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQsIGlzRXhwb3J0c0Fzc2lnbm1lbnQsIGlzRXhwb3J0c0RlY2xhcmF0aW9uLCBpc0V4cG9ydHNTdGF0ZW1lbnQsIGlzRXh0ZXJuYWxJbXBvcnQsIGlzUmVxdWlyZUNhbGwsIGlzV2lsZGNhcmRSZWV4cG9ydFN0YXRlbWVudCwgc2tpcEFsaWFzZXMsIFdpbGRjYXJkUmVleHBvcnRTdGF0ZW1lbnR9IGZyb20gJy4vY29tbW9uanNfdW1kX3V0aWxzJztcbmltcG9ydCB7Z2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uLCBnZXRPdXRlck5vZGVGcm9tSW5uZXJEZWNsYXJhdGlvbiwgaXNBc3NpZ25tZW50fSBmcm9tICcuL2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjQ2xhc3NTeW1ib2x9IGZyb20gJy4vbmdjY19ob3N0JztcbmltcG9ydCB7c3RyaXBQYXJlbnRoZXNlc30gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjbGFzcyBVbWRSZWZsZWN0aW9uSG9zdCBleHRlbmRzIEVzbTVSZWZsZWN0aW9uSG9zdCB7XG4gIHByb3RlY3RlZCB1bWRNb2R1bGVzID1cbiAgICAgIG5ldyBGYWN0b3J5TWFwPHRzLlNvdXJjZUZpbGUsIFVtZE1vZHVsZXxudWxsPihzZiA9PiB0aGlzLmNvbXB1dGVVbWRNb2R1bGUoc2YpKTtcbiAgcHJvdGVjdGVkIHVtZEV4cG9ydHMgPSBuZXcgRmFjdG9yeU1hcDx0cy5Tb3VyY2VGaWxlLCBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbD4oXG4gICAgICBzZiA9PiB0aGlzLmNvbXB1dGVFeHBvcnRzT2ZVbWRNb2R1bGUoc2YpKTtcbiAgcHJvdGVjdGVkIHVtZEltcG9ydFBhdGhzID1cbiAgICAgIG5ldyBGYWN0b3J5TWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBzdHJpbmd8bnVsbD4ocGFyYW0gPT4gdGhpcy5jb21wdXRlSW1wb3J0UGF0aChwYXJhbSkpO1xuICBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJvdGVjdGVkIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuXG4gIGNvbnN0cnVjdG9yKGxvZ2dlcjogTG9nZ2VyLCBpc0NvcmU6IGJvb2xlYW4sIHNyYzogQnVuZGxlUHJvZ3JhbSwgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBpc0NvcmUsIHNyYywgZHRzKTtcbiAgICB0aGlzLnByb2dyYW0gPSBzcmMucHJvZ3JhbTtcbiAgICB0aGlzLmNvbXBpbGVySG9zdCA9IHNyYy5ob3N0O1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIC8vIElzIGBpZGAgYSBuYW1lc3BhY2VkIHByb3BlcnR5IGFjY2VzcywgZS5nLiBgRGlyZWN0aXZlYCBpbiBgY29yZS5EaXJlY3RpdmVgP1xuICAgIC8vIElmIHNvIGNhcHR1cmUgdGhlIHN5bWJvbCBvZiB0aGUgbmFtZXNwYWNlLCBlLmcuIGBjb3JlYC5cbiAgICBjb25zdCBuc0lkZW50aWZpZXIgPSBmaW5kTmFtZXNwYWNlT2ZJZGVudGlmaWVyKGlkKTtcbiAgICBjb25zdCBpbXBvcnRQYXJhbWV0ZXIgPSBuc0lkZW50aWZpZXIgJiYgdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKG5zSWRlbnRpZmllcik7XG4gICAgY29uc3QgZnJvbSA9IGltcG9ydFBhcmFtZXRlciAmJiB0aGlzLmdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyKTtcbiAgICByZXR1cm4gZnJvbSAhPT0gbnVsbCA/IHtmcm9tLCBuYW1lOiBpZC50ZXh0fSA6IG51bGw7XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIEZpcnN0IHdlIHRyeSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAgICAvLyAxLiBUaGUgYGV4cG9ydHNgIGlkZW50aWZpZXIgLSByZWZlcnJpbmcgdG8gdGhlIGN1cnJlbnQgZmlsZS9tb2R1bGUuXG4gICAgLy8gMi4gQW4gaWRlbnRpZmllciAoZS5nLiBgZm9vYCkgdGhhdCByZWZlcnMgdG8gYW4gaW1wb3J0ZWQgVU1EIG1vZHVsZS5cbiAgICAvLyAzLiBBIFVNRCBzdHlsZSBleHBvcnQgaWRlbnRpZmllciAoZS5nLiB0aGUgYGZvb2Agb2YgYGV4cG9ydHMuZm9vYCkuXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldEV4cG9ydHNEZWNsYXJhdGlvbihpZCkgfHwgdGhpcy5nZXRVbWRNb2R1bGVEZWNsYXJhdGlvbihpZCkgfHxcbiAgICAgICAgdGhpcy5nZXRVbWREZWNsYXJhdGlvbihpZCk7XG4gICAgaWYgKGRlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGdldCB0aGUgZGVjbGFyYXRpb24gdXNpbmcgdGhlIHN1cGVyIGNsYXNzLlxuICAgIGNvbnN0IHN1cGVyRGVjbGFyYXRpb24gPSBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgZGVjbGFyYXRpb24gaXMgdGhlIGlubmVyIG5vZGUgb2YgYSBkZWNsYXJhdGlvbiBJSUZFLlxuICAgIGNvbnN0IG91dGVyTm9kZSA9IGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uKHN1cGVyRGVjbGFyYXRpb24ubm9kZSk7XG4gICAgaWYgKG91dGVyTm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpZiB0aGUgb3V0ZXIgZGVjbGFyYXRpb24gaXMgb2YgdGhlIGZvcm1cbiAgICAvLyBgZXhwb3J0cy48bmFtZT4gPSA8aW5pdGlhbGl6ZXI+YC5cbiAgICBpZiAoIWlzRXhwb3J0c0Fzc2lnbm1lbnQob3V0ZXJOb2RlKSkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IERlY2xhcmF0aW9uS2luZC5JbmxpbmUsXG4gICAgICBub2RlOiBvdXRlck5vZGUubGVmdCxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBvdXRlck5vZGUucmlnaHQsXG4gICAgICBrbm93bjogbnVsbCxcbiAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICB9O1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZSkgfHwgdGhpcy51bWRFeHBvcnRzLmdldChtb2R1bGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIGdldFVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51bWRNb2R1bGVzLmdldChzb3VyY2VGaWxlKTtcbiAgfVxuXG4gIGdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy51bWRJbXBvcnRQYXRocy5nZXQoaW1wb3J0UGFyYW1ldGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gVU1EIG1vZHVsZXMgdGhlc2UgYXJlIHRoZSBib2R5IG9mIHRoZSBVTUQgZmFjdG9yeSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCB1bWRNb2R1bGUgPSB0aGlzLmdldFVtZE1vZHVsZShzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gdW1kTW9kdWxlICE9PSBudWxsID8gQXJyYXkuZnJvbSh1bWRNb2R1bGUuZmFjdG9yeUZuLmJvZHkuc3RhdGVtZW50cykgOiBbXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3VwZXJTeW1ib2wgPSBzdXBlci5nZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3VwZXJTeW1ib2wpIHtcbiAgICAgIHJldHVybiBzdXBlclN5bWJvbDtcbiAgICB9XG5cbiAgICBpZiAoIWlzRXhwb3J0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgaW5pdGlhbGl6ZXIgPSBza2lwQWxpYXNlcyhkZWNsYXJhdGlvbi5wYXJlbnQucmlnaHQpO1xuXG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihpbml0aWFsaXplcikpIHtcbiAgICAgIGNvbnN0IGltcGxlbWVudGF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpbml0aWFsaXplcik7XG4gICAgICBpZiAoaW1wbGVtZW50YXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgY29uc3QgaW1wbGVtZW50YXRpb25TeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGltcGxlbWVudGF0aW9uLm5vZGUpO1xuICAgICAgICBpZiAoaW1wbGVtZW50YXRpb25TeW1ib2wgIT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gaW1wbGVtZW50YXRpb25TeW1ib2w7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGluaXRpYWxpemVyKTtcbiAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2woZGVjbGFyYXRpb24ubmFtZSwgaW5uZXJEZWNsYXJhdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG5cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzdXBlckNsYXNzU3ltYm9sID0gc3VwZXIuZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN1cGVyQ2xhc3NTeW1ib2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHN1cGVyQ2xhc3NTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKCFpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJOb2RlID0gZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChvdXRlck5vZGUgPT09IG51bGwgfHwgIWlzRXhwb3J0c0Fzc2lnbm1lbnQob3V0ZXJOb2RlKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChvdXRlck5vZGUubGVmdC5uYW1lLCBkZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBhbGwgXCJjbGFzc2VzXCIgZnJvbSB0aGUgYHN0YXRlbWVudGAgYW5kIGFkZCB0aGVtIHRvIHRoZSBgY2xhc3Nlc2AgbWFwLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZENsYXNzU3ltYm9sc0Zyb21TdGF0ZW1lbnQoXG4gICAgICBjbGFzc2VzOiBNYXA8dHMuU3ltYm9sLCBOZ2NjQ2xhc3NTeW1ib2w+LCBzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIHN1cGVyLmFkZENsYXNzU3ltYm9sc0Zyb21TdGF0ZW1lbnQoY2xhc3Nlcywgc3RhdGVtZW50KTtcblxuICAgIC8vIEFsc28gY2hlY2sgZm9yIGV4cG9ydHMgb2YgdGhlIGZvcm06IGBleHBvcnRzLjxuYW1lPiA9IDxjbGFzcyBkZWY+O2BcbiAgICBpZiAoaXNFeHBvcnRzU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KTtcbiAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICBjbGFzc2VzLnNldChjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbiwgY2xhc3NTeW1ib2wpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFseXplIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYW4gZXhwb3J0cyBkZWNsYXJhdGlvbiBsaWtlXG4gICAqIGBleHBvcnRzLk15Q2xhc3MgPSBNeUNsYXNzXzEgPSA8Y2xhc3MgZGVmPjtgLiBJZiBzbywgdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgXG4gICAqIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgc3VwZXIucHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQpO1xuXG4gICAgaWYgKCFpc0V4cG9ydHNTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdDtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0O1xuICAgIGlmICghaXNBc3NpZ25tZW50KGluaXRpYWxpemVyKSB8fCAhdHMuaXNJZGVudGlmaWVyKGluaXRpYWxpemVyLmxlZnQpIHx8XG4gICAgICAgICF0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSBpbml0aWFsaXplci5sZWZ0O1xuXG4gICAgY29uc3QgYWxpYXNlZERlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihhbGlhc2VkSWRlbnRpZmllcik7XG4gICAgaWYgKGFsaWFzZWREZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmFibGUgdG8gbG9jYXRlIGRlY2xhcmF0aW9uIG9mICR7YWxpYXNlZElkZW50aWZpZXIudGV4dH0gaW4gXCIke3N0YXRlbWVudC5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuc2V0KGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlLCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZVVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVW1kTW9kdWxlfG51bGwge1xuICAgIGlmIChzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdGVkIFVNRCBtb2R1bGUgZmlsZSAoJHtzb3VyY2VGaWxlLmZpbGVOYW1lfSkgdG8gY29udGFpbiBleGFjdGx5IG9uZSBzdGF0ZW1lbnQsIGAgK1xuICAgICAgICAgIGBidXQgZm91bmQgJHtzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RofS5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUV4cG9ydHNPZlVtZE1vZHVsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgIGlmIChpc0V4cG9ydHNTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IHRoaXMuZXh0cmFjdEJhc2ljVW1kRXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKCFtb2R1bGVNYXAuaGFzKGV4cG9ydERlY2xhcmF0aW9uLm5hbWUpKSB7XG4gICAgICAgICAgLy8gV2UgYXNzdW1lIHRoYXQgdGhlIGZpcnN0IGBleHBvcnRzLjxuYW1lPmAgaXMgdGhlIGFjdHVhbCBkZWNsYXJhdGlvbiwgYW5kIHRoYXQgYW55XG4gICAgICAgICAgLy8gc3Vic2VxdWVudCBzdGF0ZW1lbnRzIHRoYXQgbWF0Y2ggYXJlIGRlY29yYXRpbmcgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uLlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOlxuICAgICAgICAgIC8vIGBgYFxuICAgICAgICAgIC8vIGV4cG9ydHMuZm9vID0gPGRlY2xhcmF0aW9uPjtcbiAgICAgICAgICAvLyBleHBvcnRzLmZvbyA9IF9fZGVjb3JhdGUoPGRlY29yYXRvcj4sIGV4cG9ydHMuZm9vKTtcbiAgICAgICAgICAvLyBgYGBcbiAgICAgICAgICAvLyBUaGUgZGVjbGFyYXRpb24gaXMgdGhlIGZpcnN0IGxpbmUgbm90IHRoZSBzZWNvbmQuXG4gICAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5leHRyYWN0VW1kV2lsZGNhcmRSZWV4cG9ydHMoc3RhdGVtZW50LCBzb3VyY2VGaWxlKTtcbiAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZWV4cG9ydHMpIHtcbiAgICAgICAgICBtb2R1bGVNYXAuc2V0KHJlZXhwb3J0Lm5hbWUsIHJlZXhwb3J0LmRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc0RlZmluZVByb3BlcnR5UmVleHBvcnRTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IHRoaXMuZXh0cmFjdFVtZERlZmluZVByb3BlcnR5RXhwb3J0RGVjbGFyYXRpb24oc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGV4cG9ydERlY2xhcmF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgbW9kdWxlTWFwLnNldChleHBvcnREZWNsYXJhdGlvbi5uYW1lLCBleHBvcnREZWNsYXJhdGlvbi5kZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZU1hcDtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUltcG9ydFBhdGgocGFyYW06IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHRoaXMuZ2V0VW1kTW9kdWxlKHBhcmFtLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgaWYgKHVtZE1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0cyA9IGdldEltcG9ydHNPZlVtZE1vZHVsZSh1bWRNb2R1bGUpO1xuICAgIGlmIChpbXBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgaW1wb3J0UGF0aDogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gICAgZm9yIChjb25zdCBpIG9mIGltcG9ydHMpIHtcbiAgICAgIC8vIEFkZCBhbGwgaW1wb3J0cyB0byB0aGUgbWFwIHRvIHNwZWVkIHVwIGZ1dHVyZSBsb29rIHVwcy5cbiAgICAgIHRoaXMudW1kSW1wb3J0UGF0aHMuc2V0KGkucGFyYW1ldGVyLCBpLnBhdGgpO1xuICAgICAgaWYgKGkucGFyYW1ldGVyID09PSBwYXJhbSkge1xuICAgICAgICBpbXBvcnRQYXRoID0gaS5wYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbXBvcnRQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0QmFzaWNVbWRFeHBvcnREZWNsYXJhdGlvbihzdGF0ZW1lbnQ6IEV4cG9ydHNTdGF0ZW1lbnQpOiBFeHBvcnREZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgbmFtZSA9IHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQubmFtZS50ZXh0O1xuICAgIGNvbnN0IGV4cG9ydEV4cHJlc3Npb24gPSBza2lwQWxpYXNlcyhzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCk7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cG9ydEV4cHJlc3Npb24pID8/IHtcbiAgICAgIGtpbmQ6IERlY2xhcmF0aW9uS2luZC5JbmxpbmUsXG4gICAgICBub2RlOiBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0LFxuICAgICAgaW1wbGVtZW50YXRpb246IHN0YXRlbWVudC5leHByZXNzaW9uLnJpZ2h0LFxuICAgICAga25vd246IG51bGwsXG4gICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgfTtcbiAgICByZXR1cm4ge25hbWUsIGRlY2xhcmF0aW9ufTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdFVtZFdpbGRjYXJkUmVleHBvcnRzKFxuICAgICAgc3RhdGVtZW50OiBXaWxkY2FyZFJlZXhwb3J0U3RhdGVtZW50LCBjb250YWluaW5nRmlsZTogdHMuU291cmNlRmlsZSk6IEV4cG9ydERlY2xhcmF0aW9uW10ge1xuICAgIGNvbnN0IHJlZXhwb3J0QXJnID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuXG4gICAgY29uc3QgcmVxdWlyZUNhbGwgPSBpc1JlcXVpcmVDYWxsKHJlZXhwb3J0QXJnKSA/XG4gICAgICAgIHJlZXhwb3J0QXJnIDpcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKHJlZXhwb3J0QXJnKSA/IGZpbmRSZXF1aXJlQ2FsbFJlZmVyZW5jZShyZWV4cG9ydEFyZywgdGhpcy5jaGVja2VyKSA6IG51bGw7XG5cbiAgICBsZXQgaW1wb3J0UGF0aDogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHJlcXVpcmVDYWxsICE9PSBudWxsKSB7XG4gICAgICBpbXBvcnRQYXRoID0gcmVxdWlyZUNhbGwuYXJndW1lbnRzWzBdLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIocmVleHBvcnRBcmcpKSB7XG4gICAgICBjb25zdCBpbXBvcnRQYXJhbWV0ZXIgPSB0aGlzLmZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIocmVleHBvcnRBcmcpO1xuICAgICAgaW1wb3J0UGF0aCA9IGltcG9ydFBhcmFtZXRlciAmJiB0aGlzLmdldFVtZEltcG9ydFBhdGgoaW1wb3J0UGFyYW1ldGVyKTtcbiAgICB9XG5cbiAgICBpZiAoaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkRmlsZSA9IHRoaXMucmVzb2x2ZU1vZHVsZU5hbWUoaW1wb3J0UGF0aCwgY29udGFpbmluZ0ZpbGUpO1xuICAgIGlmIChpbXBvcnRlZEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydGVkRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGltcG9ydGVkRmlsZSk7XG4gICAgaWYgKGltcG9ydGVkRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHZpYU1vZHVsZSA9IHN0cmlwRXh0ZW5zaW9uKGltcG9ydGVkRmlsZS5maWxlTmFtZSk7XG4gICAgY29uc3QgcmVleHBvcnRzOiBFeHBvcnREZWNsYXJhdGlvbltdID0gW107XG4gICAgaW1wb3J0ZWRFeHBvcnRzLmZvckVhY2goXG4gICAgICAgIChkZWNsLCBuYW1lKSA9PiByZWV4cG9ydHMucHVzaCh7bmFtZSwgZGVjbGFyYXRpb246IHsuLi5kZWNsLCB2aWFNb2R1bGV9fSkpO1xuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RVbWREZWZpbmVQcm9wZXJ0eUV4cG9ydERlY2xhcmF0aW9uKHN0YXRlbWVudDogRGVmaW5lUHJvcGVydHlSZWV4cG9ydFN0YXRlbWVudCk6XG4gICAgICBFeHBvcnREZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBhcmdzID0gc3RhdGVtZW50LmV4cHJlc3Npb24uYXJndW1lbnRzO1xuICAgIGNvbnN0IG5hbWUgPSBhcmdzWzFdLnRleHQ7XG4gICAgY29uc3QgZ2V0dGVyRm5FeHByZXNzaW9uID0gZXh0cmFjdEdldHRlckZuRXhwcmVzc2lvbihzdGF0ZW1lbnQpO1xuICAgIGlmIChnZXR0ZXJGbkV4cHJlc3Npb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihnZXR0ZXJGbkV4cHJlc3Npb24pO1xuICAgIGlmIChkZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtuYW1lLCBkZWNsYXJhdGlvbn07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBkZWNsYXJhdGlvbjoge1xuICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgICBub2RlOiBhcmdzWzFdLFxuICAgICAgICBpbXBsZW1lbnRhdGlvbjogZ2V0dGVyRm5FeHByZXNzaW9uLFxuICAgICAgICBrbm93bjogbnVsbCxcbiAgICAgICAgdmlhTW9kdWxlOiBudWxsLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIElzIHRoZSBpZGVudGlmaWVyIGEgcGFyYW1ldGVyIG9uIGEgVU1EIGZhY3RvcnkgZnVuY3Rpb24sIGUuZy4gYGZ1bmN0aW9uIGZhY3RvcnkodGhpcywgY29yZSlgP1xuICAgKiBJZiBzbyB0aGVuIHJldHVybiBpdHMgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGZpbmRVbWRJbXBvcnRQYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSBpZCAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCkgfHwgbnVsbDtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN5bWJvbCAmJiBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24gJiYgdHMuaXNQYXJhbWV0ZXIoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRVbWREZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IG5zSWRlbnRpZmllciA9IGZpbmROYW1lc3BhY2VPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChuc0lkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudCAmJiBpc0V4cG9ydHNBc3NpZ25tZW50KG5zSWRlbnRpZmllci5wYXJlbnQucGFyZW50KSkge1xuICAgICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudC5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGluaXRpYWxpemVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRldGVjdEtub3duRGVjbGFyYXRpb24oe1xuICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuSW5saW5lLFxuICAgICAgICBub2RlOiBuc0lkZW50aWZpZXIucGFyZW50LnBhcmVudC5sZWZ0LFxuICAgICAgICBpbXBsZW1lbnRhdGlvbjogc2tpcEFsaWFzZXMobnNJZGVudGlmaWVyLnBhcmVudC5wYXJlbnQucmlnaHQpLFxuICAgICAgICB2aWFNb2R1bGU6IG51bGwsXG4gICAgICAgIGtub3duOiBudWxsLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlRGVjbGFyYXRpb24gPSB0aGlzLmdldFVtZE1vZHVsZURlY2xhcmF0aW9uKG5zSWRlbnRpZmllcik7XG4gICAgaWYgKG1vZHVsZURlY2xhcmF0aW9uID09PSBudWxsIHx8IG1vZHVsZURlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwgfHxcbiAgICAgICAgIXRzLmlzU291cmNlRmlsZShtb2R1bGVEZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZURlY2xhcmF0aW9uLm5vZGUpO1xuICAgIGlmIChtb2R1bGVFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGNvbXB1dGUgdGhlIGB2aWFNb2R1bGVgIGJlY2F1c2UgIHRoZSBgZ2V0RXhwb3J0c09mTW9kdWxlKClgIGNhbGxcbiAgICAvLyBkaWQgbm90IGtub3cgdGhhdCB3ZSB3ZXJlIGltcG9ydGluZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBtb2R1bGVFeHBvcnRzLmdldChpZC50ZXh0KSE7XG5cbiAgICBpZiAoIW1vZHVsZUV4cG9ydHMuaGFzKGlkLnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGNvbXB1dGUgdGhlIGB2aWFNb2R1bGVgIGJlY2F1c2UgIHRoZSBgZ2V0RXhwb3J0c09mTW9kdWxlKClgIGNhbGxcbiAgICAvLyBkaWQgbm90IGtub3cgdGhhdCB3ZSB3ZXJlIGltcG9ydGluZyB0aGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdmlhTW9kdWxlID1cbiAgICAgICAgZGVjbGFyYXRpb24udmlhTW9kdWxlID09PSBudWxsID8gbW9kdWxlRGVjbGFyYXRpb24udmlhTW9kdWxlIDogZGVjbGFyYXRpb24udmlhTW9kdWxlO1xuXG4gICAgcmV0dXJuIHsuLi5kZWNsYXJhdGlvbiwgdmlhTW9kdWxlLCBrbm93bjogZ2V0VHNIZWxwZXJGbkZyb21JZGVudGlmaWVyKGlkKX07XG4gIH1cblxuICBwcml2YXRlIGdldEV4cG9ydHNEZWNsYXJhdGlvbihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICghaXNFeHBvcnRzSWRlbnRpZmllcihpZCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNhZGx5LCBpbiB0aGUgY2FzZSBvZiBgZXhwb3J0cy5mb28gPSBiYXJgLCB3ZSBjYW4ndCB1c2UgYHRoaXMuZmluZFVtZEltcG9ydFBhcmFtZXRlcihpZClgXG4gICAgLy8gdG8gY2hlY2sgd2hldGhlciB0aGlzIGBleHBvcnRzYCBpcyBmcm9tIHRoZSBJSUZFIGJvZHkgYXJndW1lbnRzLCBiZWNhdXNlXG4gICAgLy8gYHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKWAgd2lsbCByZXR1cm4gdGhlIHN5bWJvbCBmb3IgdGhlIGBmb29gIGlkZW50aWZpZXJcbiAgICAvLyByYXRoZXIgdGhhbiB0aGUgYGV4cG9ydHNgIGlkZW50aWZpZXIuXG4gICAgLy9cbiAgICAvLyBJbnN0ZWFkIHdlIHNlYXJjaCB0aGUgc3ltYm9scyBpbiB0aGUgY3VycmVudCBsb2NhbCBzY29wZS5cbiAgICBjb25zdCBleHBvcnRzU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbHNJblNjb3BlKGlkLCB0cy5TeW1ib2xGbGFncy5WYXJpYWJsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHN5bWJvbCA9PiBzeW1ib2wubmFtZSA9PT0gJ2V4cG9ydHMnKTtcblxuICAgIGNvbnN0IG5vZGUgPSBleHBvcnRzU3ltYm9sICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihleHBvcnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50KSA/XG4gICAgICAgIC8vIFRoZXJlIGlzIGEgbG9jYWxseSBkZWZpbmVkIGBleHBvcnRzYCB2YXJpYWJsZSB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uIHBhcmFtZXRlci5cbiAgICAgICAgLy8gU28gdGhpcyBgZXhwb3J0c2AgaWRlbnRpZmllciBtdXN0IGJlIGEgbG9jYWwgdmFyaWFibGUgYW5kIGRvZXMgbm90IHJlcHJlc2VudCB0aGUgbW9kdWxlLlxuICAgICAgICBleHBvcnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gOlxuICAgICAgICAvLyBUaGVyZSBpcyBubyBsb2NhbCBzeW1ib2wgb3IgaXQgaXMgYSBwYXJhbWV0ZXIgb2YgYW4gSUlGRS5cbiAgICAgICAgLy8gU28gdGhpcyBgZXhwb3J0c2AgcmVwcmVzZW50cyB0aGUgY3VycmVudCBcIm1vZHVsZVwiLlxuICAgICAgICBpZC5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLFxuICAgICAgbm9kZSxcbiAgICAgIHZpYU1vZHVsZTogbnVsbCxcbiAgICAgIGtub3duOiBudWxsLFxuICAgICAgaWRlbnRpdHk6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VW1kTW9kdWxlRGVjbGFyYXRpb24oaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRQYXRoID0gdGhpcy5nZXRJbXBvcnRQYXRoRnJvbVBhcmFtZXRlcihpZCkgfHwgdGhpcy5nZXRJbXBvcnRQYXRoRnJvbVJlcXVpcmVDYWxsKGlkKTtcbiAgICBpZiAoaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlID0gdGhpcy5yZXNvbHZlTW9kdWxlTmFtZShpbXBvcnRQYXRoLCBpZC5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGlmIChtb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdmlhTW9kdWxlID0gaXNFeHRlcm5hbEltcG9ydChpbXBvcnRQYXRoKSA/IGltcG9ydFBhdGggOiBudWxsO1xuICAgIHJldHVybiB7a2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLCBub2RlOiBtb2R1bGUsIHZpYU1vZHVsZSwga25vd246IG51bGwsIGlkZW50aXR5OiBudWxsfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0SW1wb3J0UGF0aEZyb21QYXJhbWV0ZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0UGFyYW1ldGVyID0gdGhpcy5maW5kVW1kSW1wb3J0UGFyYW1ldGVyKGlkKTtcbiAgICBpZiAoaW1wb3J0UGFyYW1ldGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0VW1kSW1wb3J0UGF0aChpbXBvcnRQYXJhbWV0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRJbXBvcnRQYXRoRnJvbVJlcXVpcmVDYWxsKGlkOiB0cy5JZGVudGlmaWVyKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHJlcXVpcmVDYWxsID0gZmluZFJlcXVpcmVDYWxsUmVmZXJlbmNlKGlkLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmIChyZXF1aXJlQ2FsbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXF1aXJlQ2FsbC5hcmd1bWVudHNbMF0udGV4dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB0aGlzIGlzIGFuIElJRkUgdGhlbiB0cnkgdG8gZ3JhYiB0aGUgb3V0ZXIgYW5kIGlubmVyIGNsYXNzZXMgb3RoZXJ3aXNlIGZhbGxiYWNrIG9uIHRoZSBzdXBlclxuICAgKiBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3QgaW5uZXIgPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbik7XG4gICAgaWYgKGlubmVyICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBvdXRlciA9IGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uKGlubmVyKTtcbiAgICAgIGlmIChvdXRlciAhPT0gbnVsbCAmJiBpc0V4cG9ydHNBc3NpZ25tZW50KG91dGVyKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtpbmQ6IERlY2xhcmF0aW9uS2luZC5JbmxpbmUsXG4gICAgICAgICAgbm9kZTogb3V0ZXIubGVmdCxcbiAgICAgICAgICBpbXBsZW1lbnRhdGlvbjogaW5uZXIsXG4gICAgICAgICAga25vd246IG51bGwsXG4gICAgICAgICAgdmlhTW9kdWxlOiBudWxsLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVNb2R1bGVOYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gICAgICBjb25zdCBtb2R1bGVJbmZvID0gdGhpcy5jb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgICAgIFttb2R1bGVOYW1lXSwgY29udGFpbmluZ0ZpbGUuZmlsZU5hbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICAgIHRoaXMucHJvZ3JhbS5nZXRDb21waWxlck9wdGlvbnMoKSlbMF07XG4gICAgICByZXR1cm4gbW9kdWxlSW5mbyAmJiB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20obW9kdWxlSW5mby5yZXNvbHZlZEZpbGVOYW1lKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1vZHVsZUluZm8gPSB0cy5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICBtb2R1bGVOYW1lLCBjb250YWluaW5nRmlsZS5maWxlTmFtZSwgdGhpcy5wcm9ncmFtLmdldENvbXBpbGVyT3B0aW9ucygpLFxuICAgICAgICAgIHRoaXMuY29tcGlsZXJIb3N0KTtcbiAgICAgIHJldHVybiBtb2R1bGVJbmZvLnJlc29sdmVkTW9kdWxlICYmXG4gICAgICAgICAgdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKG1vZHVsZUluZm8ucmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSkpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBVbWRNb2R1bGV8bnVsbCB7XG4gIGNvbnN0IHdyYXBwZXJDYWxsID0gZ2V0VW1kV3JhcHBlckNhbGwoc3RhdGVtZW50KTtcbiAgaWYgKCF3cmFwcGVyQ2FsbCkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3Qgd3JhcHBlckZuID0gd3JhcHBlckNhbGwuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbih3cmFwcGVyRm4pKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBmYWN0b3J5Rm5QYXJhbUluZGV4ID0gd3JhcHBlckZuLnBhcmFtZXRlcnMuZmluZEluZGV4KFxuICAgICAgcGFyYW1ldGVyID0+IHRzLmlzSWRlbnRpZmllcihwYXJhbWV0ZXIubmFtZSkgJiYgcGFyYW1ldGVyLm5hbWUudGV4dCA9PT0gJ2ZhY3RvcnknKTtcbiAgaWYgKGZhY3RvcnlGblBhcmFtSW5kZXggPT09IC0xKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBmYWN0b3J5Rm4gPSBzdHJpcFBhcmVudGhlc2VzKHdyYXBwZXJDYWxsLmFyZ3VtZW50c1tmYWN0b3J5Rm5QYXJhbUluZGV4XSk7XG4gIGlmICghZmFjdG9yeUZuIHx8ICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihmYWN0b3J5Rm4pKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge3dyYXBwZXJGbiwgZmFjdG9yeUZufTtcbn1cblxuZnVuY3Rpb24gZ2V0VW1kV3JhcHBlckNhbGwoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiB0cy5DYWxsRXhwcmVzc2lvbiZcbiAgICB7ZXhwcmVzc2lvbjogdHMuRnVuY3Rpb25FeHByZXNzaW9ufXxudWxsIHtcbiAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSB8fCAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihzdGF0ZW1lbnQuZXhwcmVzc2lvbikgfHxcbiAgICAgICF0cy5pc0NhbGxFeHByZXNzaW9uKHN0YXRlbWVudC5leHByZXNzaW9uLmV4cHJlc3Npb24pIHx8XG4gICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oc3RhdGVtZW50LmV4cHJlc3Npb24uZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5leHByZXNzaW9uIGFzIHRzLkNhbGxFeHByZXNzaW9uICYge2V4cHJlc3Npb246IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbn07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEltcG9ydHNPZlVtZE1vZHVsZSh1bWRNb2R1bGU6IFVtZE1vZHVsZSk6XG4gICAge3BhcmFtZXRlcjogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIHBhdGg6IHN0cmluZ31bXSB7XG4gIGNvbnN0IGltcG9ydHM6IHtwYXJhbWV0ZXI6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBwYXRoOiBzdHJpbmd9W10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCB1bWRNb2R1bGUuZmFjdG9yeUZuLnBhcmFtZXRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBpbXBvcnRzLnB1c2goe1xuICAgICAgcGFyYW1ldGVyOiB1bWRNb2R1bGUuZmFjdG9yeUZuLnBhcmFtZXRlcnNbaV0sXG4gICAgICBwYXRoOiBnZXRSZXF1aXJlZE1vZHVsZVBhdGgodW1kTW9kdWxlLndyYXBwZXJGbiwgaSlcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gaW1wb3J0cztcbn1cblxuaW50ZXJmYWNlIFVtZE1vZHVsZSB7XG4gIHdyYXBwZXJGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uO1xuICBmYWN0b3J5Rm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbjtcbn1cblxuZnVuY3Rpb24gZ2V0UmVxdWlyZWRNb2R1bGVQYXRoKHdyYXBwZXJGbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uLCBwYXJhbUluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBzdGF0ZW1lbnQgPSB3cmFwcGVyRm4uYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVU1EIHdyYXBwZXIgYm9keSBpcyBub3QgYW4gZXhwcmVzc2lvbiBzdGF0ZW1lbnQ6XFxuJyArIHdyYXBwZXJGbi5ib2R5LmdldFRleHQoKSk7XG4gIH1cbiAgY29uc3QgbW9kdWxlUGF0aHM6IHN0cmluZ1tdID0gW107XG4gIGZpbmRNb2R1bGVQYXRocyhzdGF0ZW1lbnQuZXhwcmVzc2lvbik7XG5cbiAgLy8gU2luY2Ugd2Ugd2VyZSBvbmx5IGludGVyZXN0ZWQgaW4gdGhlIGByZXF1aXJlKClgIGNhbGxzLCB3ZSBtaXNzIHRoZSBgZXhwb3J0c2AgYXJndW1lbnQsIHNvIHdlXG4gIC8vIG5lZWQgdG8gc3VidHJhY3QgMS5cbiAgLy8gRS5nLiBgZnVuY3Rpb24oZXhwb3J0cywgZGVwMSwgZGVwMilgIG1hcHMgdG8gYGZ1bmN0aW9uKGV4cG9ydHMsIHJlcXVpcmUoJ3BhdGgvdG8vZGVwMScpLFxuICAvLyByZXF1aXJlKCdwYXRoL3RvL2RlcDInKSlgXG4gIHJldHVybiBtb2R1bGVQYXRoc1twYXJhbUluZGV4IC0gMV07XG5cbiAgLy8gU2VhcmNoIHRoZSBzdGF0ZW1lbnQgZm9yIGNhbGxzIHRvIGByZXF1aXJlKCcuLi4nKWAgYW5kIGV4dHJhY3QgdGhlIHN0cmluZyB2YWx1ZSBvZiB0aGUgZmlyc3RcbiAgLy8gYXJndW1lbnRcbiAgZnVuY3Rpb24gZmluZE1vZHVsZVBhdGhzKG5vZGU6IHRzLk5vZGUpIHtcbiAgICBpZiAoaXNSZXF1aXJlQ2FsbChub2RlKSkge1xuICAgICAgY29uc3QgYXJndW1lbnQgPSBub2RlLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwoYXJndW1lbnQpKSB7XG4gICAgICAgIG1vZHVsZVBhdGhzLnB1c2goYXJndW1lbnQudGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuZm9yRWFjaENoaWxkKGZpbmRNb2R1bGVQYXRocyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogSXMgdGhlIGBub2RlYCBhbiBpZGVudGlmaWVyIHdpdGggdGhlIG5hbWUgXCJleHBvcnRzXCI/XG4gKi9cbmZ1bmN0aW9uIGlzRXhwb3J0c0lkZW50aWZpZXIobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuSWRlbnRpZmllciB7XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIobm9kZSkgJiYgbm9kZS50ZXh0ID09PSAnZXhwb3J0cyc7XG59XG4iXX0=