/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { ClassMemberKind, isDecoratorIdentifier } from './host';
import { typeToValue } from './type_to_value';
import { isNamedClassDeclaration } from './util';
/**
 * reflector.ts implements static reflection of declarations using the TypeScript `ts.TypeChecker`.
 */
export class TypeScriptReflectionHost {
    constructor(checker) {
        this.checker = checker;
    }
    getDecoratorsOfDeclaration(declaration) {
        if (declaration.decorators === undefined || declaration.decorators.length === 0) {
            return null;
        }
        return declaration.decorators.map(decorator => this._reflectDecorator(decorator))
            .filter((dec) => dec !== null);
    }
    getMembersOfClass(clazz) {
        const tsClazz = castDeclarationToClassOrDie(clazz);
        return tsClazz.members.map(member => this._reflectMember(member))
            .filter((member) => member !== null);
    }
    getConstructorParameters(clazz) {
        const tsClazz = castDeclarationToClassOrDie(clazz);
        const isDeclaration = tsClazz.getSourceFile().isDeclarationFile;
        // For non-declaration files, we want to find the constructor with a `body`. The constructors
        // without a `body` are overloads whereas we want the implementation since it's the one that'll
        // be executed and which can have decorators. For declaration files, we take the first one that
        // we get.
        const ctor = tsClazz.members.find((member) => ts.isConstructorDeclaration(member) && (isDeclaration || member.body !== undefined));
        if (ctor === undefined) {
            return null;
        }
        return ctor.parameters.map(node => {
            // The name of the parameter is easy.
            const name = parameterName(node.name);
            const decorators = this.getDecoratorsOfDeclaration(node);
            // It may or may not be possible to write an expression that refers to the value side of the
            // type named for the parameter.
            let originalTypeNode = node.type || null;
            let typeNode = originalTypeNode;
            // Check if we are dealing with a simple nullable union type e.g. `foo: Foo|null`
            // and extract the type. More complex union types e.g. `foo: Foo|Bar` are not supported.
            // We also don't need to support `foo: Foo|undefined` because Angular's DI injects `null` for
            // optional tokes that don't have providers.
            if (typeNode && ts.isUnionTypeNode(typeNode)) {
                let childTypeNodes = typeNode.types.filter(childTypeNode => !(ts.isLiteralTypeNode(childTypeNode) &&
                    childTypeNode.literal.kind === ts.SyntaxKind.NullKeyword));
                if (childTypeNodes.length === 1) {
                    typeNode = childTypeNodes[0];
                }
            }
            const typeValueReference = typeToValue(typeNode, this.checker);
            return {
                name,
                nameNode: node.name,
                typeValueReference,
                typeNode: originalTypeNode,
                decorators,
            };
        });
    }
    getImportOfIdentifier(id) {
        const directImport = this.getDirectImportOfIdentifier(id);
        if (directImport !== null) {
            return directImport;
        }
        else if (ts.isQualifiedName(id.parent) && id.parent.right === id) {
            return this.getImportOfNamespacedIdentifier(id, getQualifiedNameRoot(id.parent));
        }
        else if (ts.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
            return this.getImportOfNamespacedIdentifier(id, getFarLeftIdentifier(id.parent));
        }
        else {
            return null;
        }
    }
    getExportsOfModule(node) {
        // In TypeScript code, modules are only ts.SourceFiles. Throw if the node isn't a module.
        if (!ts.isSourceFile(node)) {
            throw new Error(`getExportsOfModule() called on non-SourceFile in TS code`);
        }
        // Reflect the module to a Symbol, and use getExportsOfModule() to get a list of exported
        // Symbols.
        const symbol = this.checker.getSymbolAtLocation(node);
        if (symbol === undefined) {
            return null;
        }
        const map = new Map();
        this.checker.getExportsOfModule(symbol).forEach(exportSymbol => {
            // Map each exported Symbol to a Declaration and add it to the map.
            const decl = this.getDeclarationOfSymbol(exportSymbol, null);
            if (decl !== null) {
                map.set(exportSymbol.name, decl);
            }
        });
        return map;
    }
    isClass(node) {
        // For our purposes, classes are "named" ts.ClassDeclarations;
        // (`node.name` can be undefined in unnamed default exports: `default export class { ... }`).
        return isNamedClassDeclaration(node);
    }
    hasBaseClass(clazz) {
        return this.getBaseClassExpression(clazz) !== null;
    }
    getBaseClassExpression(clazz) {
        if (!(ts.isClassDeclaration(clazz) || ts.isClassExpression(clazz)) ||
            clazz.heritageClauses === undefined) {
            return null;
        }
        const extendsClause = clazz.heritageClauses.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
        if (extendsClause === undefined) {
            return null;
        }
        const extendsType = extendsClause.types[0];
        if (extendsType === undefined) {
            return null;
        }
        return extendsType.expression;
    }
    getDeclarationOfIdentifier(id) {
        // Resolve the identifier to a Symbol, and return the declaration of that.
        let symbol = this.checker.getSymbolAtLocation(id);
        if (symbol === undefined) {
            return null;
        }
        return this.getDeclarationOfSymbol(symbol, id);
    }
    getDefinitionOfFunction(node) {
        if (!ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node) &&
            !ts.isFunctionExpression(node)) {
            return null;
        }
        return {
            node,
            body: node.body !== undefined ? Array.from(node.body.statements) : null,
            parameters: node.parameters.map(param => {
                const name = parameterName(param.name);
                const initializer = param.initializer || null;
                return { name, node: param, initializer };
            }),
        };
    }
    getGenericArityOfClass(clazz) {
        if (!ts.isClassDeclaration(clazz)) {
            return null;
        }
        return clazz.typeParameters !== undefined ? clazz.typeParameters.length : 0;
    }
    getVariableValue(declaration) {
        return declaration.initializer || null;
    }
    getDtsDeclaration(_) {
        return null;
    }
    getInternalNameOfClass(clazz) {
        return clazz.name;
    }
    getAdjacentNameOfClass(clazz) {
        return clazz.name;
    }
    isStaticallyExported(clazz) {
        // First check if there's an `export` modifier directly on the class declaration.
        let topLevel = clazz;
        if (ts.isVariableDeclaration(clazz) && ts.isVariableDeclarationList(clazz.parent)) {
            topLevel = clazz.parent.parent;
        }
        if (topLevel.modifiers !== undefined &&
            topLevel.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
            // The node is part of a declaration that's directly exported.
            return true;
        }
        // If `topLevel` is not directly exported via a modifier, then it might be indirectly exported,
        // e.g.:
        //
        // class Foo {}
        // export {Foo};
        //
        // The only way to check this is to look at the module level for exports of the class. As a
        // performance optimization, this check is only performed if the class is actually declared at
        // the top level of the file and thus eligible for exporting in the first place.
        if (topLevel.parent === undefined || !ts.isSourceFile(topLevel.parent)) {
            return false;
        }
        const localExports = this.getLocalExportedClassesOfSourceFile(clazz.getSourceFile());
        return localExports.has(clazz);
    }
    getDirectImportOfIdentifier(id) {
        const symbol = this.checker.getSymbolAtLocation(id);
        if (symbol === undefined || symbol.declarations === undefined ||
            symbol.declarations.length !== 1) {
            return null;
        }
        const decl = symbol.declarations[0];
        const importDecl = getContainingImportDeclaration(decl);
        // Ignore declarations that are defined locally (not imported).
        if (importDecl === null) {
            return null;
        }
        // The module specifier is guaranteed to be a string literal, so this should always pass.
        if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
            // Not allowed to happen in TypeScript ASTs.
            return null;
        }
        return { from: importDecl.moduleSpecifier.text, name: getExportedName(decl, id) };
    }
    /**
     * Try to get the import info for this identifier as though it is a namespaced import.
     *
     * For example, if the identifier is the `Directive` part of a qualified type chain like:
     *
     * ```
     * core.Directive
     * ```
     *
     * then it might be that `core` is a namespace import such as:
     *
     * ```
     * import * as core from 'tslib';
     * ```
     *
     * @param id the TypeScript identifier to find the import info for.
     * @returns The import info if this is a namespaced import or `null`.
     */
    getImportOfNamespacedIdentifier(id, namespaceIdentifier) {
        if (namespaceIdentifier === null) {
            return null;
        }
        const namespaceSymbol = this.checker.getSymbolAtLocation(namespaceIdentifier);
        if (!namespaceSymbol || namespaceSymbol.declarations === undefined) {
            return null;
        }
        const declaration = namespaceSymbol.declarations.length === 1 ? namespaceSymbol.declarations[0] : null;
        if (!declaration) {
            return null;
        }
        const namespaceDeclaration = ts.isNamespaceImport(declaration) ? declaration : null;
        if (!namespaceDeclaration) {
            return null;
        }
        const importDeclaration = namespaceDeclaration.parent.parent;
        if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
            // Should not happen as this would be invalid TypesScript
            return null;
        }
        return {
            from: importDeclaration.moduleSpecifier.text,
            name: id.text,
        };
    }
    /**
     * Resolve a `ts.Symbol` to its declaration, keeping track of the `viaModule` along the way.
     */
    getDeclarationOfSymbol(symbol, originalId) {
        // If the symbol points to a ShorthandPropertyAssignment, resolve it.
        let valueDeclaration = undefined;
        if (symbol.valueDeclaration !== undefined) {
            valueDeclaration = symbol.valueDeclaration;
        }
        else if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
            valueDeclaration = symbol.declarations[0];
        }
        if (valueDeclaration !== undefined && ts.isShorthandPropertyAssignment(valueDeclaration)) {
            const shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
            if (shorthandSymbol === undefined) {
                return null;
            }
            return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
        }
        else if (valueDeclaration !== undefined && ts.isExportSpecifier(valueDeclaration)) {
            const targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
            if (targetSymbol === undefined) {
                return null;
            }
            return this.getDeclarationOfSymbol(targetSymbol, originalId);
        }
        const importInfo = originalId && this.getImportOfIdentifier(originalId);
        const viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith('.') ?
            importInfo.from :
            null;
        // Now, resolve the Symbol to its declaration by following any and all aliases.
        while (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = this.checker.getAliasedSymbol(symbol);
        }
        // Look at the resolved Symbol's declarations and pick one of them to return. Value declarations
        // are given precedence over type declarations.
        if (symbol.valueDeclaration !== undefined) {
            return {
                node: symbol.valueDeclaration,
                known: null,
                viaModule,
                identity: null,
                kind: 0 /* Concrete */,
            };
        }
        else if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
            return {
                node: symbol.declarations[0],
                known: null,
                viaModule,
                identity: null,
                kind: 0 /* Concrete */,
            };
        }
        else {
            return null;
        }
    }
    _reflectDecorator(node) {
        // Attempt to resolve the decorator expression into a reference to a concrete Identifier. The
        // expression may contain a call to a function which returns the decorator function, in which
        // case we want to return the arguments.
        let decoratorExpr = node.expression;
        let args = null;
        // Check for call expressions.
        if (ts.isCallExpression(decoratorExpr)) {
            args = Array.from(decoratorExpr.arguments);
            decoratorExpr = decoratorExpr.expression;
        }
        // The final resolved decorator should be a `ts.Identifier` - if it's not, then something is
        // wrong and the decorator can't be resolved statically.
        if (!isDecoratorIdentifier(decoratorExpr)) {
            return null;
        }
        const decoratorIdentifier = ts.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
        const importDecl = this.getImportOfIdentifier(decoratorIdentifier);
        return {
            name: decoratorIdentifier.text,
            identifier: decoratorExpr,
            import: importDecl,
            node,
            args,
        };
    }
    _reflectMember(node) {
        let kind = null;
        let value = null;
        let name = null;
        let nameNode = null;
        if (ts.isPropertyDeclaration(node)) {
            kind = ClassMemberKind.Property;
            value = node.initializer || null;
        }
        else if (ts.isGetAccessorDeclaration(node)) {
            kind = ClassMemberKind.Getter;
        }
        else if (ts.isSetAccessorDeclaration(node)) {
            kind = ClassMemberKind.Setter;
        }
        else if (ts.isMethodDeclaration(node)) {
            kind = ClassMemberKind.Method;
        }
        else if (ts.isConstructorDeclaration(node)) {
            kind = ClassMemberKind.Constructor;
        }
        else {
            return null;
        }
        if (ts.isConstructorDeclaration(node)) {
            name = 'constructor';
        }
        else if (ts.isIdentifier(node.name)) {
            name = node.name.text;
            nameNode = node.name;
        }
        else if (ts.isStringLiteral(node.name)) {
            name = node.name.text;
            nameNode = node.name;
        }
        else {
            return null;
        }
        const decorators = this.getDecoratorsOfDeclaration(node);
        const isStatic = node.modifiers !== undefined &&
            node.modifiers.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword);
        return {
            node,
            implementation: node,
            kind,
            type: node.type || null,
            name,
            nameNode,
            decorators,
            value,
            isStatic,
        };
    }
    /**
     * Get the set of classes declared in `file` which are exported.
     */
    getLocalExportedClassesOfSourceFile(file) {
        const cacheSf = file;
        if (cacheSf[LocalExportedClasses] !== undefined) {
            // TS does not currently narrow symbol-keyed fields, hence the non-null assert is needed.
            return cacheSf[LocalExportedClasses];
        }
        const exportSet = new Set();
        cacheSf[LocalExportedClasses] = exportSet;
        const sfSymbol = this.checker.getSymbolAtLocation(cacheSf);
        if (sfSymbol === undefined || sfSymbol.exports === undefined) {
            return exportSet;
        }
        // Scan the exported symbol of the `ts.SourceFile` for the original `symbol` of the class
        // declaration.
        //
        // Note: when checking multiple classes declared in the same file, this repeats some operations.
        // In theory, this could be expensive if run in the context of a massive input file (like a
        // large FESM in ngcc). If performance does become an issue here, it should be possible to
        // create a `Set<>`
        // Unfortunately, `ts.Iterator` doesn't implement the iterator protocol, so iteration here is
        // done manually.
        const iter = sfSymbol.exports.values();
        let item = iter.next();
        while (item.done !== true) {
            let exportedSymbol = item.value;
            // If this exported symbol comes from an `export {Foo}` statement, then the symbol is actually
            // for the export declaration, not the original declaration. Such a symbol will be an alias,
            // so unwrap aliasing if necessary.
            if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
                exportedSymbol = this.checker.getAliasedSymbol(exportedSymbol);
            }
            if (exportedSymbol.valueDeclaration !== undefined &&
                exportedSymbol.valueDeclaration.getSourceFile() === file &&
                this.isClass(exportedSymbol.valueDeclaration)) {
                exportSet.add(exportedSymbol.valueDeclaration);
            }
            item = iter.next();
        }
        return exportSet;
    }
}
export function reflectNameOfDeclaration(decl) {
    const id = reflectIdentifierOfDeclaration(decl);
    return id && id.text || null;
}
export function reflectIdentifierOfDeclaration(decl) {
    if (ts.isClassDeclaration(decl) || ts.isFunctionDeclaration(decl)) {
        return decl.name || null;
    }
    else if (ts.isVariableDeclaration(decl)) {
        if (ts.isIdentifier(decl.name)) {
            return decl.name;
        }
    }
    return null;
}
export function reflectTypeEntityToDeclaration(type, checker) {
    let realSymbol = checker.getSymbolAtLocation(type);
    if (realSymbol === undefined) {
        throw new Error(`Cannot resolve type entity ${type.getText()} to symbol`);
    }
    while (realSymbol.flags & ts.SymbolFlags.Alias) {
        realSymbol = checker.getAliasedSymbol(realSymbol);
    }
    let node = null;
    if (realSymbol.valueDeclaration !== undefined) {
        node = realSymbol.valueDeclaration;
    }
    else if (realSymbol.declarations !== undefined && realSymbol.declarations.length === 1) {
        node = realSymbol.declarations[0];
    }
    else {
        throw new Error(`Cannot resolve type entity symbol to declaration`);
    }
    if (ts.isQualifiedName(type)) {
        if (!ts.isIdentifier(type.left)) {
            throw new Error(`Cannot handle qualified name with non-identifier lhs`);
        }
        const symbol = checker.getSymbolAtLocation(type.left);
        if (symbol === undefined || symbol.declarations === undefined ||
            symbol.declarations.length !== 1) {
            throw new Error(`Cannot resolve qualified type entity lhs to symbol`);
        }
        const decl = symbol.declarations[0];
        if (ts.isNamespaceImport(decl)) {
            const clause = decl.parent;
            const importDecl = clause.parent;
            if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
                throw new Error(`Module specifier is not a string`);
            }
            return { node, from: importDecl.moduleSpecifier.text };
        }
        else if (ts.isModuleDeclaration(decl)) {
            return { node, from: null };
        }
        else {
            throw new Error(`Unknown import type?`);
        }
    }
    else {
        return { node, from: null };
    }
}
export function filterToMembersWithDecorator(members, name, module) {
    return members.filter(member => !member.isStatic)
        .map(member => {
        if (member.decorators === null) {
            return null;
        }
        const decorators = member.decorators.filter(dec => {
            if (dec.import !== null) {
                return dec.import.name === name && (module === undefined || dec.import.from === module);
            }
            else {
                return dec.name === name && module === undefined;
            }
        });
        if (decorators.length === 0) {
            return null;
        }
        return { member, decorators };
    })
        .filter((value) => value !== null);
}
export function findMember(members, name, isStatic = false) {
    return members.find(member => member.isStatic === isStatic && member.name === name) || null;
}
export function reflectObjectLiteral(node) {
    const map = new Map();
    node.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop)) {
            const name = propertyNameToString(prop.name);
            if (name === null) {
                return;
            }
            map.set(name, prop.initializer);
        }
        else if (ts.isShorthandPropertyAssignment(prop)) {
            map.set(prop.name.text, prop.name);
        }
        else {
            return;
        }
    });
    return map;
}
function castDeclarationToClassOrDie(declaration) {
    if (!ts.isClassDeclaration(declaration)) {
        throw new Error(`Reflecting on a ${ts.SyntaxKind[declaration.kind]} instead of a ClassDeclaration.`);
    }
    return declaration;
}
function parameterName(name) {
    if (ts.isIdentifier(name)) {
        return name.text;
    }
    else {
        return null;
    }
}
function propertyNameToString(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return node.text;
    }
    else {
        return null;
    }
}
/**
 * Compute the left most identifier in a qualified type chain. E.g. the `a` of `a.b.c.SomeType`.
 * @param qualifiedName The starting property access expression from which we want to compute
 * the left most identifier.
 * @returns the left most identifier in the chain or `null` if it is not an identifier.
 */
function getQualifiedNameRoot(qualifiedName) {
    while (ts.isQualifiedName(qualifiedName.left)) {
        qualifiedName = qualifiedName.left;
    }
    return ts.isIdentifier(qualifiedName.left) ? qualifiedName.left : null;
}
/**
 * Compute the left most identifier in a property access chain. E.g. the `a` of `a.b.c.d`.
 * @param propertyAccess The starting property access expression from which we want to compute
 * the left most identifier.
 * @returns the left most identifier in the chain or `null` if it is not an identifier.
 */
function getFarLeftIdentifier(propertyAccess) {
    while (ts.isPropertyAccessExpression(propertyAccess.expression)) {
        propertyAccess = propertyAccess.expression;
    }
    return ts.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
}
/**
 * Return the ImportDeclaration for the given `node` if it is either an `ImportSpecifier` or a
 * `NamespaceImport`. If not return `null`.
 */
function getContainingImportDeclaration(node) {
    return ts.isImportSpecifier(node) ? node.parent.parent.parent :
        ts.isNamespaceImport(node) ? node.parent.parent : null;
}
/**
 * Compute the name by which the `decl` was exported, not imported.
 * If no such declaration can be found (e.g. it is a namespace import)
 * then fallback to the `originalId`.
 */
function getExportedName(decl, originalId) {
    return ts.isImportSpecifier(decl) ?
        (decl.propertyName !== undefined ? decl.propertyName : decl.name).text :
        originalId.text;
}
const LocalExportedClasses = Symbol('LocalExportedClasses');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLEVBQWdDLGVBQWUsRUFBdUcscUJBQXFCLEVBQWlCLE1BQU0sUUFBUSxDQUFDO0FBQ2xOLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFFL0M7O0dBRUc7QUFFSCxNQUFNLE9BQU8sd0JBQXdCO0lBQ25DLFlBQXNCLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUcsQ0FBQztJQUVqRCwwQkFBMEIsQ0FBQyxXQUE0QjtRQUNyRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLEtBQUssU0FBUyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvRSxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUM1RSxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQW9CLEVBQUUsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQXVCO1FBQ3ZDLE1BQU0sT0FBTyxHQUFHLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJ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biAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25LaW5kLCBEZWNsYXJhdGlvbk5vZGUsIERlY29yYXRvciwgRnVuY3Rpb25EZWZpbml0aW9uLCBJbXBvcnQsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge3R5cGVUb1ZhbHVlfSBmcm9tICcuL3R5cGVfdG9fdmFsdWUnO1xuaW1wb3J0IHtpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiByZWZsZWN0b3IudHMgaW1wbGVtZW50cyBzdGF0aWMgcmVmbGVjdGlvbiBvZiBkZWNsYXJhdGlvbnMgdXNpbmcgdGhlIFR5cGVTY3JpcHQgYHRzLlR5cGVDaGVja2VyYC5cbiAqL1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHt9XG5cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGlmIChkZWNsYXJhdGlvbi5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHRoaXMuX3JlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yKSlcbiAgICAgICAgLmZpbHRlcigoZGVjKTogZGVjIGlzIERlY29yYXRvciA9PiBkZWMgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCB0c0NsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGNsYXp6KTtcbiAgICByZXR1cm4gdHNDbGF6ei5tZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fcmVmbGVjdE1lbWJlcihtZW1iZXIpKVxuICAgICAgICAuZmlsdGVyKChtZW1iZXIpOiBtZW1iZXIgaXMgQ2xhc3NNZW1iZXIgPT4gbWVtYmVyICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCB0c0NsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGNsYXp6KTtcblxuICAgIGNvbnN0IGlzRGVjbGFyYXRpb24gPSB0c0NsYXp6LmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZTtcbiAgICAvLyBGb3Igbm9uLWRlY2xhcmF0aW9uIGZpbGVzLCB3ZSB3YW50IHRvIGZpbmQgdGhlIGNvbnN0cnVjdG9yIHdpdGggYSBgYm9keWAuIFRoZSBjb25zdHJ1Y3RvcnNcbiAgICAvLyB3aXRob3V0IGEgYGJvZHlgIGFyZSBvdmVybG9hZHMgd2hlcmVhcyB3ZSB3YW50IHRoZSBpbXBsZW1lbnRhdGlvbiBzaW5jZSBpdCdzIHRoZSBvbmUgdGhhdCdsbFxuICAgIC8vIGJlIGV4ZWN1dGVkIGFuZCB3aGljaCBjYW4gaGF2ZSBkZWNvcmF0b3JzLiBGb3IgZGVjbGFyYXRpb24gZmlsZXMsIHdlIHRha2UgdGhlIGZpcnN0IG9uZSB0aGF0XG4gICAgLy8gd2UgZ2V0LlxuICAgIGNvbnN0IGN0b3IgPSB0c0NsYXp6Lm1lbWJlcnMuZmluZChcbiAgICAgICAgKG1lbWJlcik6IG1lbWJlciBpcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uID0+XG4gICAgICAgICAgICB0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obWVtYmVyKSAmJiAoaXNEZWNsYXJhdGlvbiB8fCBtZW1iZXIuYm9keSAhPT0gdW5kZWZpbmVkKSk7XG4gICAgaWYgKGN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3IucGFyYW1ldGVycy5tYXAobm9kZSA9PiB7XG4gICAgICAvLyBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGlzIGVhc3kuXG4gICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShub2RlLm5hbWUpO1xuXG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgICAgLy8gSXQgbWF5IG9yIG1heSBub3QgYmUgcG9zc2libGUgdG8gd3JpdGUgYW4gZXhwcmVzc2lvbiB0aGF0IHJlZmVycyB0byB0aGUgdmFsdWUgc2lkZSBvZiB0aGVcbiAgICAgIC8vIHR5cGUgbmFtZWQgZm9yIHRoZSBwYXJhbWV0ZXIuXG5cbiAgICAgIGxldCBvcmlnaW5hbFR5cGVOb2RlID0gbm9kZS50eXBlIHx8IG51bGw7XG4gICAgICBsZXQgdHlwZU5vZGUgPSBvcmlnaW5hbFR5cGVOb2RlO1xuXG4gICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgZGVhbGluZyB3aXRoIGEgc2ltcGxlIG51bGxhYmxlIHVuaW9uIHR5cGUgZS5nLiBgZm9vOiBGb298bnVsbGBcbiAgICAgIC8vIGFuZCBleHRyYWN0IHRoZSB0eXBlLiBNb3JlIGNvbXBsZXggdW5pb24gdHlwZXMgZS5nLiBgZm9vOiBGb298QmFyYCBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgIC8vIFdlIGFsc28gZG9uJ3QgbmVlZCB0byBzdXBwb3J0IGBmb286IEZvb3x1bmRlZmluZWRgIGJlY2F1c2UgQW5ndWxhcidzIERJIGluamVjdHMgYG51bGxgIGZvclxuICAgICAgLy8gb3B0aW9uYWwgdG9rZXMgdGhhdCBkb24ndCBoYXZlIHByb3ZpZGVycy5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1VuaW9uVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICAgIGxldCBjaGlsZFR5cGVOb2RlcyA9IHR5cGVOb2RlLnR5cGVzLmZpbHRlcihcbiAgICAgICAgICAgIGNoaWxkVHlwZU5vZGUgPT5cbiAgICAgICAgICAgICAgICAhKHRzLmlzTGl0ZXJhbFR5cGVOb2RlKGNoaWxkVHlwZU5vZGUpICYmXG4gICAgICAgICAgICAgICAgICBjaGlsZFR5cGVOb2RlLmxpdGVyYWwua2luZCA9PT0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCkpO1xuXG4gICAgICAgIGlmIChjaGlsZFR5cGVOb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IGNoaWxkVHlwZU5vZGVzWzBdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHR5cGVWYWx1ZVJlZmVyZW5jZSA9IHR5cGVUb1ZhbHVlKHR5cGVOb2RlLCB0aGlzLmNoZWNrZXIpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBuYW1lTm9kZTogbm9kZS5uYW1lLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UsXG4gICAgICAgIHR5cGVOb2RlOiBvcmlnaW5hbFR5cGVOb2RlLFxuICAgICAgICBkZWNvcmF0b3JzLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RJbXBvcnQgPSB0aGlzLmdldERpcmVjdEltcG9ydE9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKGRpcmVjdEltcG9ydCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRpcmVjdEltcG9ydDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShpZC5wYXJlbnQpICYmIGlkLnBhcmVudC5yaWdodCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoaWQsIGdldFF1YWxpZmllZE5hbWVSb290KGlkLnBhcmVudCkpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJiBpZC5wYXJlbnQubmFtZSA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoaWQsIGdldEZhckxlZnRJZGVudGlmaWVyKGlkLnBhcmVudCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobm9kZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICAvLyBJbiBUeXBlU2NyaXB0IGNvZGUsIG1vZHVsZXMgYXJlIG9ubHkgdHMuU291cmNlRmlsZXMuIFRocm93IGlmIHRoZSBub2RlIGlzbid0IGEgbW9kdWxlLlxuICAgIGlmICghdHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGdldEV4cG9ydHNPZk1vZHVsZSgpIGNhbGxlZCBvbiBub24tU291cmNlRmlsZSBpbiBUUyBjb2RlYCk7XG4gICAgfVxuXG4gICAgLy8gUmVmbGVjdCB0aGUgbW9kdWxlIHRvIGEgU3ltYm9sLCBhbmQgdXNlIGdldEV4cG9ydHNPZk1vZHVsZSgpIHRvIGdldCBhIGxpc3Qgb2YgZXhwb3J0ZWRcbiAgICAvLyBTeW1ib2xzLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuICAgIHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3ltYm9sKS5mb3JFYWNoKGV4cG9ydFN5bWJvbCA9PiB7XG4gICAgICAvLyBNYXAgZWFjaCBleHBvcnRlZCBTeW1ib2wgdG8gYSBEZWNsYXJhdGlvbiBhbmQgYWRkIGl0IHRvIHRoZSBtYXAuXG4gICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKGV4cG9ydFN5bWJvbCwgbnVsbCk7XG4gICAgICBpZiAoZGVjbCAhPT0gbnVsbCkge1xuICAgICAgICBtYXAuc2V0KGV4cG9ydFN5bWJvbC5uYW1lLCBkZWNsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBDbGFzc0RlY2xhcmF0aW9uIHtcbiAgICAvLyBGb3Igb3VyIHB1cnBvc2VzLCBjbGFzc2VzIGFyZSBcIm5hbWVkXCIgdHMuQ2xhc3NEZWNsYXJhdGlvbnM7XG4gICAgLy8gKGBub2RlLm5hbWVgIGNhbiBiZSB1bmRlZmluZWQgaW4gdW5uYW1lZCBkZWZhdWx0IGV4cG9ydHM6IGBkZWZhdWx0IGV4cG9ydCBjbGFzcyB7IC4uLiB9YCkuXG4gICAgcmV0dXJuIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICB9XG5cbiAgaGFzQmFzZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6eikgIT09IG51bGw7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoISh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopIHx8IHRzLmlzQ2xhc3NFeHByZXNzaW9uKGNsYXp6KSkgfHxcbiAgICAgICAgY2xhenouaGVyaXRhZ2VDbGF1c2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBleHRlbmRzQ2xhdXNlID1cbiAgICAgICAgY2xhenouaGVyaXRhZ2VDbGF1c2VzLmZpbmQoY2xhdXNlID0+IGNsYXVzZS50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCk7XG4gICAgaWYgKGV4dGVuZHNDbGF1c2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGV4dGVuZHNUeXBlID0gZXh0ZW5kc0NsYXVzZS50eXBlc1swXTtcbiAgICBpZiAoZXh0ZW5kc1R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBleHRlbmRzVHlwZS5leHByZXNzaW9uO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBSZXNvbHZlIHRoZSBpZGVudGlmaWVyIHRvIGEgU3ltYm9sLCBhbmQgcmV0dXJuIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGF0LlxuICAgIGxldCBzeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2wsIGlkKTtcbiAgfVxuXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uKG5vZGU6IHRzLk5vZGUpOiBGdW5jdGlvbkRlZmluaXRpb258bnVsbCB7XG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiZcbiAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBib2R5OiBub2RlLmJvZHkgIT09IHVuZGVmaW5lZCA/IEFycmF5LmZyb20obm9kZS5ib2R5LnN0YXRlbWVudHMpIDogbnVsbCxcbiAgICAgIHBhcmFtZXRlcnM6IG5vZGUucGFyYW1ldGVycy5tYXAocGFyYW0gPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShwYXJhbS5uYW1lKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBwYXJhbS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgICAgICByZXR1cm4ge25hbWUsIG5vZGU6IHBhcmFtLCBpbml0aWFsaXplcn07XG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY2xhenoudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCA/IGNsYXp6LnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gIH1cblxuICBnZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgfVxuXG4gIGdldER0c0RlY2xhcmF0aW9uKF86IENsYXNzRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIGlzU3RhdGljYWxseUV4cG9ydGVkKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlcmUncyBhbiBgZXhwb3J0YCBtb2RpZmllciBkaXJlY3RseSBvbiB0aGUgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgbGV0IHRvcExldmVsOiB0cy5Ob2RlID0gY2xheno7XG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihjbGF6eikgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChjbGF6ei5wYXJlbnQpKSB7XG4gICAgICB0b3BMZXZlbCA9IGNsYXp6LnBhcmVudC5wYXJlbnQ7XG4gICAgfVxuICAgIGlmICh0b3BMZXZlbC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0b3BMZXZlbC5tb2RpZmllcnMuc29tZShtb2RpZmllciA9PiBtb2RpZmllci5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICAvLyBUaGUgbm9kZSBpcyBwYXJ0IG9mIGEgZGVjbGFyYXRpb24gdGhhdCdzIGRpcmVjdGx5IGV4cG9ydGVkLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gSWYgYHRvcExldmVsYCBpcyBub3QgZGlyZWN0bHkgZXhwb3J0ZWQgdmlhIGEgbW9kaWZpZXIsIHRoZW4gaXQgbWlnaHQgYmUgaW5kaXJlY3RseSBleHBvcnRlZCxcbiAgICAvLyBlLmcuOlxuICAgIC8vXG4gICAgLy8gY2xhc3MgRm9vIHt9XG4gICAgLy8gZXhwb3J0IHtGb299O1xuICAgIC8vXG4gICAgLy8gVGhlIG9ubHkgd2F5IHRvIGNoZWNrIHRoaXMgaXMgdG8gbG9vayBhdCB0aGUgbW9kdWxlIGxldmVsIGZvciBleHBvcnRzIG9mIHRoZSBjbGFzcy4gQXMgYVxuICAgIC8vIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbiwgdGhpcyBjaGVjayBpcyBvbmx5IHBlcmZvcm1lZCBpZiB0aGUgY2xhc3MgaXMgYWN0dWFsbHkgZGVjbGFyZWQgYXRcbiAgICAvLyB0aGUgdG9wIGxldmVsIG9mIHRoZSBmaWxlIGFuZCB0aHVzIGVsaWdpYmxlIGZvciBleHBvcnRpbmcgaW4gdGhlIGZpcnN0IHBsYWNlLlxuICAgIGlmICh0b3BMZXZlbC5wYXJlbnQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTb3VyY2VGaWxlKHRvcExldmVsLnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsb2NhbEV4cG9ydHMgPSB0aGlzLmdldExvY2FsRXhwb3J0ZWRDbGFzc2VzT2ZTb3VyY2VGaWxlKGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgcmV0dXJuIGxvY2FsRXhwb3J0cy5oYXMoY2xhenopO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERpcmVjdEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG5cbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBpbXBvcnREZWNsID0gZ2V0Q29udGFpbmluZ0ltcG9ydERlY2xhcmF0aW9uKGRlY2wpO1xuXG4gICAgLy8gSWdub3JlIGRlY2xhcmF0aW9ucyB0aGF0IGFyZSBkZWZpbmVkIGxvY2FsbHkgKG5vdCBpbXBvcnRlZCkuXG4gICAgaWYgKGltcG9ydERlY2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSBtb2R1bGUgc3BlY2lmaWVyIGlzIGd1YXJhbnRlZWQgdG8gYmUgYSBzdHJpbmcgbGl0ZXJhbCwgc28gdGhpcyBzaG91bGQgYWx3YXlzIHBhc3MuXG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBOb3QgYWxsb3dlZCB0byBoYXBwZW4gaW4gVHlwZVNjcmlwdCBBU1RzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtmcm9tOiBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0LCBuYW1lOiBnZXRFeHBvcnRlZE5hbWUoZGVjbCwgaWQpfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gZ2V0IHRoZSBpbXBvcnQgaW5mbyBmb3IgdGhpcyBpZGVudGlmaWVyIGFzIHRob3VnaCBpdCBpcyBhIG5hbWVzcGFjZWQgaW1wb3J0LlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhlIGlkZW50aWZpZXIgaXMgdGhlIGBEaXJlY3RpdmVgIHBhcnQgb2YgYSBxdWFsaWZpZWQgdHlwZSBjaGFpbiBsaWtlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY29yZS5EaXJlY3RpdmVcbiAgICogYGBgXG4gICAqXG4gICAqIHRoZW4gaXQgbWlnaHQgYmUgdGhhdCBgY29yZWAgaXMgYSBuYW1lc3BhY2UgaW1wb3J0IHN1Y2ggYXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBpbXBvcnQgKiBhcyBjb3JlIGZyb20gJ3RzbGliJztcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBpZCB0aGUgVHlwZVNjcmlwdCBpZGVudGlmaWVyIHRvIGZpbmQgdGhlIGltcG9ydCBpbmZvIGZvci5cbiAgICogQHJldHVybnMgVGhlIGltcG9ydCBpbmZvIGlmIHRoaXMgaXMgYSBuYW1lc3BhY2VkIGltcG9ydCBvciBgbnVsbGAuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SW1wb3J0T2ZOYW1lc3BhY2VkSWRlbnRpZmllcihcbiAgICAgIGlkOiB0cy5JZGVudGlmaWVyLCBuYW1lc3BhY2VJZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyfG51bGwpOiBJbXBvcnR8bnVsbCB7XG4gICAgaWYgKG5hbWVzcGFjZUlkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBuYW1lc3BhY2VTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuYW1lc3BhY2VJZGVudGlmaWVyKTtcbiAgICBpZiAoIW5hbWVzcGFjZVN5bWJvbCB8fCBuYW1lc3BhY2VTeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9XG4gICAgICAgIG5hbWVzcGFjZVN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxID8gbmFtZXNwYWNlU3ltYm9sLmRlY2xhcmF0aW9uc1swXSA6IG51bGw7XG4gICAgaWYgKCFkZWNsYXJhdGlvbikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2xhcmF0aW9uID0gdHMuaXNOYW1lc3BhY2VJbXBvcnQoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICAgIGlmICghbmFtZXNwYWNlRGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydERlY2xhcmF0aW9uID0gbmFtZXNwYWNlRGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBTaG91bGQgbm90IGhhcHBlbiBhcyB0aGlzIHdvdWxkIGJlIGludmFsaWQgVHlwZXNTY3JpcHRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBmcm9tOiBpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIudGV4dCxcbiAgICAgIG5hbWU6IGlkLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBgdmlhTW9kdWxlYCBhbG9uZyB0aGUgd2F5LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sOiB0cy5TeW1ib2wsIG9yaWdpbmFsSWQ6IHRzLklkZW50aWZpZXJ8bnVsbCk6IERlY2xhcmF0aW9uXG4gICAgICB8bnVsbCB7XG4gICAgLy8gSWYgdGhlIHN5bWJvbCBwb2ludHMgdG8gYSBTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQsIHJlc29sdmUgaXQuXG4gICAgbGV0IHZhbHVlRGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFsdWVEZWNsYXJhdGlvbiA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgdmFsdWVEZWNsYXJhdGlvbiA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgfVxuICAgIGlmICh2YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQodmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IHNob3J0aGFuZFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTaG9ydGhhbmRBc3NpZ25tZW50VmFsdWVTeW1ib2wodmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICBpZiAoc2hvcnRoYW5kU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHNob3J0aGFuZFN5bWJvbCwgb3JpZ2luYWxJZCk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiYgdHMuaXNFeHBvcnRTcGVjaWZpZXIodmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRTcGVjaWZpZXJMb2NhbFRhcmdldFN5bWJvbCh2YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgIGlmICh0YXJnZXRTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2wodGFyZ2V0U3ltYm9sLCBvcmlnaW5hbElkKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRJbmZvID0gb3JpZ2luYWxJZCAmJiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihvcmlnaW5hbElkKTtcbiAgICBjb25zdCB2aWFNb2R1bGUgPVxuICAgICAgICBpbXBvcnRJbmZvICE9PSBudWxsICYmIGltcG9ydEluZm8uZnJvbSAhPT0gbnVsbCAmJiAhaW1wb3J0SW5mby5mcm9tLnN0YXJ0c1dpdGgoJy4nKSA/XG4gICAgICAgIGltcG9ydEluZm8uZnJvbSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBOb3csIHJlc29sdmUgdGhlIFN5bWJvbCB0byBpdHMgZGVjbGFyYXRpb24gYnkgZm9sbG93aW5nIGFueSBhbmQgYWxsIGFsaWFzZXMuXG4gICAgd2hpbGUgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHJlc29sdmVkIFN5bWJvbCdzIGRlY2xhcmF0aW9ucyBhbmQgcGljayBvbmUgb2YgdGhlbSB0byByZXR1cm4uIFZhbHVlIGRlY2xhcmF0aW9uc1xuICAgIC8vIGFyZSBnaXZlbiBwcmVjZWRlbmNlIG92ZXIgdHlwZSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uLFxuICAgICAgICBrbm93bjogbnVsbCxcbiAgICAgICAgdmlhTW9kdWxlLFxuICAgICAgICBpZGVudGl0eTogbnVsbCxcbiAgICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF0sXG4gICAgICAgIGtub3duOiBudWxsLFxuICAgICAgICB2aWFNb2R1bGUsXG4gICAgICAgIGlkZW50aXR5OiBudWxsLFxuICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuQ29uY3JldGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZWZsZWN0RGVjb3JhdG9yKG5vZGU6IHRzLkRlY29yYXRvcik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgICAvLyBjYXNlIHdlIHdhbnQgdG8gcmV0dXJuIHRoZSBhcmd1bWVudHMuXG4gICAgbGV0IGRlY29yYXRvckV4cHI6IHRzLkV4cHJlc3Npb24gPSBub2RlLmV4cHJlc3Npb247XG4gICAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXXxudWxsID0gbnVsbDtcblxuICAgIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICBhcmdzID0gQXJyYXkuZnJvbShkZWNvcmF0b3JFeHByLmFyZ3VtZW50cyk7XG4gICAgICBkZWNvcmF0b3JFeHByID0gZGVjb3JhdG9yRXhwci5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaW5hbCByZXNvbHZlZCBkZWNvcmF0b3Igc2hvdWxkIGJlIGEgYHRzLklkZW50aWZpZXJgIC0gaWYgaXQncyBub3QsIHRoZW4gc29tZXRoaW5nIGlzXG4gICAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9IHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSA/IGRlY29yYXRvckV4cHIgOiBkZWNvcmF0b3JFeHByLm5hbWU7XG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHIsXG4gICAgICBpbXBvcnQ6IGltcG9ydERlY2wsXG4gICAgICBub2RlLFxuICAgICAgYXJncyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdE1lbWJlcihub2RlOiB0cy5DbGFzc0VsZW1lbnQpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnx0cy5TdHJpbmdMaXRlcmFsfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIHZhbHVlID0gbm9kZS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3NvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlcjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5TZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5uYW1lKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGNvbnN0IGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsXG4gICAgICBraW5kLFxuICAgICAgdHlwZTogbm9kZS50eXBlIHx8IG51bGwsXG4gICAgICBuYW1lLFxuICAgICAgbmFtZU5vZGUsXG4gICAgICBkZWNvcmF0b3JzLFxuICAgICAgdmFsdWUsXG4gICAgICBpc1N0YXRpYyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc2V0IG9mIGNsYXNzZXMgZGVjbGFyZWQgaW4gYGZpbGVgIHdoaWNoIGFyZSBleHBvcnRlZC5cbiAgICovXG4gIHByaXZhdGUgZ2V0TG9jYWxFeHBvcnRlZENsYXNzZXNPZlNvdXJjZUZpbGUoZmlsZTogdHMuU291cmNlRmlsZSk6IFNldDxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgY2FjaGVTZjogU291cmNlRmlsZVdpdGhDYWNoZWRFeHBvcnRzID0gZmlsZSBhcyBTb3VyY2VGaWxlV2l0aENhY2hlZEV4cG9ydHM7XG4gICAgaWYgKGNhY2hlU2ZbTG9jYWxFeHBvcnRlZENsYXNzZXNdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRTIGRvZXMgbm90IGN1cnJlbnRseSBuYXJyb3cgc3ltYm9sLWtleWVkIGZpZWxkcywgaGVuY2UgdGhlIG5vbi1udWxsIGFzc2VydCBpcyBuZWVkZWQuXG4gICAgICByZXR1cm4gY2FjaGVTZltMb2NhbEV4cG9ydGVkQ2xhc3Nlc10hO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydFNldCA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcbiAgICBjYWNoZVNmW0xvY2FsRXhwb3J0ZWRDbGFzc2VzXSA9IGV4cG9ydFNldDtcblxuICAgIGNvbnN0IHNmU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oY2FjaGVTZik7XG5cbiAgICBpZiAoc2ZTeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzZlN5bWJvbC5leHBvcnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBleHBvcnRTZXQ7XG4gICAgfVxuXG4gICAgLy8gU2NhbiB0aGUgZXhwb3J0ZWQgc3ltYm9sIG9mIHRoZSBgdHMuU291cmNlRmlsZWAgZm9yIHRoZSBvcmlnaW5hbCBgc3ltYm9sYCBvZiB0aGUgY2xhc3NcbiAgICAvLyBkZWNsYXJhdGlvbi5cbiAgICAvL1xuICAgIC8vIE5vdGU6IHdoZW4gY2hlY2tpbmcgbXVsdGlwbGUgY2xhc3NlcyBkZWNsYXJlZCBpbiB0aGUgc2FtZSBmaWxlLCB0aGlzIHJlcGVhdHMgc29tZSBvcGVyYXRpb25zLlxuICAgIC8vIEluIHRoZW9yeSwgdGhpcyBjb3VsZCBiZSBleHBlbnNpdmUgaWYgcnVuIGluIHRoZSBjb250ZXh0IG9mIGEgbWFzc2l2ZSBpbnB1dCBmaWxlIChsaWtlIGFcbiAgICAvLyBsYXJnZSBGRVNNIGluIG5nY2MpLiBJZiBwZXJmb3JtYW5jZSBkb2VzIGJlY29tZSBhbiBpc3N1ZSBoZXJlLCBpdCBzaG91bGQgYmUgcG9zc2libGUgdG9cbiAgICAvLyBjcmVhdGUgYSBgU2V0PD5gXG5cbiAgICAvLyBVbmZvcnR1bmF0ZWx5LCBgdHMuSXRlcmF0b3JgIGRvZXNuJ3QgaW1wbGVtZW50IHRoZSBpdGVyYXRvciBwcm90b2NvbCwgc28gaXRlcmF0aW9uIGhlcmUgaXNcbiAgICAvLyBkb25lIG1hbnVhbGx5LlxuICAgIGNvbnN0IGl0ZXIgPSBzZlN5bWJvbC5leHBvcnRzLnZhbHVlcygpO1xuICAgIGxldCBpdGVtID0gaXRlci5uZXh0KCk7XG4gICAgd2hpbGUgKGl0ZW0uZG9uZSAhPT0gdHJ1ZSkge1xuICAgICAgbGV0IGV4cG9ydGVkU3ltYm9sID0gaXRlbS52YWx1ZTtcblxuICAgICAgLy8gSWYgdGhpcyBleHBvcnRlZCBzeW1ib2wgY29tZXMgZnJvbSBhbiBgZXhwb3J0IHtGb299YCBzdGF0ZW1lbnQsIHRoZW4gdGhlIHN5bWJvbCBpcyBhY3R1YWxseVxuICAgICAgLy8gZm9yIHRoZSBleHBvcnQgZGVjbGFyYXRpb24sIG5vdCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24uIFN1Y2ggYSBzeW1ib2wgd2lsbCBiZSBhbiBhbGlhcyxcbiAgICAgIC8vIHNvIHVud3JhcCBhbGlhc2luZyBpZiBuZWNlc3NhcnkuXG4gICAgICBpZiAoZXhwb3J0ZWRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgICBleHBvcnRlZFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpID09PSBmaWxlICYmXG4gICAgICAgICAgdGhpcy5pc0NsYXNzKGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgIGV4cG9ydFNldC5hZGQoZXhwb3J0ZWRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgICBpdGVtID0gaXRlci5uZXh0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4cG9ydFNldDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgcmV0dXJuIGlkICYmIGlkLnRleHQgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZSB8fCBudWxsO1xuICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24oXG4gICAgdHlwZTogdHMuRW50aXR5TmFtZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB7bm9kZTogdHMuRGVjbGFyYXRpb24sIGZyb206IHN0cmluZ3xudWxsfSB7XG4gIGxldCByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGUpO1xuICBpZiAocmVhbFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSB0eXBlIGVudGl0eSAke3R5cGUuZ2V0VGV4dCgpfSB0byBzeW1ib2xgKTtcbiAgfVxuICB3aGlsZSAocmVhbFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgcmVhbFN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChyZWFsU3ltYm9sKTtcbiAgfVxuXG4gIGxldCBub2RlOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgaWYgKHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgfSBlbHNlIGlmIChyZWFsU3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgIG5vZGUgPSByZWFsU3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5IHN5bWJvbCB0byBkZWNsYXJhdGlvbmApO1xuICB9XG5cbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlKSkge1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKHR5cGUubGVmdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhbmRsZSBxdWFsaWZpZWQgbmFtZSB3aXRoIG5vbi1pZGVudGlmaWVyIGxoc2ApO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZS5sZWZ0KTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHF1YWxpZmllZCB0eXBlIGVudGl0eSBsaHMgdG8gc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICh0cy5pc05hbWVzcGFjZUltcG9ydChkZWNsKSkge1xuICAgICAgY29uc3QgY2xhdXNlID0gZGVjbC5wYXJlbnQhO1xuICAgICAgY29uc3QgaW1wb3J0RGVjbCA9IGNsYXVzZS5wYXJlbnQhO1xuICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIHNwZWNpZmllciBpcyBub3QgYSBzdHJpbmdgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bm9kZSwgZnJvbTogaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dH07XG4gICAgfSBlbHNlIGlmICh0cy5pc01vZHVsZURlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgICByZXR1cm4ge25vZGUsIGZyb206IG51bGx9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaW1wb3J0IHR5cGU/YCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB7bm9kZSwgZnJvbTogbnVsbH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgbmFtZTogc3RyaW5nLCBtb2R1bGU/OiBzdHJpbmcpOlxuICAgIHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSB7XG4gIHJldHVybiBtZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYylcbiAgICAgIC5tYXAobWVtYmVyID0+IHtcbiAgICAgICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gbWVtYmVyLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiB7XG4gICAgICAgICAgaWYgKGRlYy5pbXBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWMuaW1wb3J0Lm5hbWUgPT09IG5hbWUgJiYgKG1vZHVsZSA9PT0gdW5kZWZpbmVkIHx8IGRlYy5pbXBvcnQuZnJvbSA9PT0gbW9kdWxlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGRlYy5uYW1lID09PSBuYW1lICYmIG1vZHVsZSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge21lbWJlciwgZGVjb3JhdG9yc307XG4gICAgICB9KVxuICAgICAgLmZpbHRlcigodmFsdWUpOiB2YWx1ZSBpcyB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119ID0+IHZhbHVlICE9PSBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNZW1iZXIoXG4gICAgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgbmFtZTogc3RyaW5nLCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gIHJldHVybiBtZW1iZXJzLmZpbmQobWVtYmVyID0+IG1lbWJlci5pc1N0YXRpYyA9PT0gaXNTdGF0aWMgJiYgbWVtYmVyLm5hbWUgPT09IG5hbWUpIHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0T2JqZWN0TGl0ZXJhbChub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gIG5vZGUucHJvcGVydGllcy5mb3JFYWNoKHByb3AgPT4ge1xuICAgIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHByb3BlcnR5TmFtZVRvU3RyaW5nKHByb3AubmFtZSk7XG4gICAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBtYXAuc2V0KG5hbWUsIHByb3AuaW5pdGlhbGl6ZXIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIG1hcC5zZXQocHJvcC5uYW1lLnRleHQsIHByb3AubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb24pOlxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4ge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBSZWZsZWN0aW5nIG9uIGEgJHt0cy5TeW50YXhLaW5kW2RlY2xhcmF0aW9uLmtpbmRdfSBpbnN0ZWFkIG9mIGEgQ2xhc3NEZWNsYXJhdGlvbi5gKTtcbiAgfVxuICByZXR1cm4gZGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIHBhcmFtZXRlck5hbWUobmFtZTogdHMuQmluZGluZ05hbWUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICByZXR1cm4gbmFtZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5TmFtZVRvU3RyaW5nKG5vZGU6IHRzLlByb3BlcnR5TmFtZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgIHJldHVybiBub2RlLnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wdXRlIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllciBpbiBhIHF1YWxpZmllZCB0eXBlIGNoYWluLiBFLmcuIHRoZSBgYWAgb2YgYGEuYi5jLlNvbWVUeXBlYC5cbiAqIEBwYXJhbSBxdWFsaWZpZWROYW1lIFRoZSBzdGFydGluZyBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvbiBmcm9tIHdoaWNoIHdlIHdhbnQgdG8gY29tcHV0ZVxuICogdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyLlxuICogQHJldHVybnMgdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyIGluIHRoZSBjaGFpbiBvciBgbnVsbGAgaWYgaXQgaXMgbm90IGFuIGlkZW50aWZpZXIuXG4gKi9cbmZ1bmN0aW9uIGdldFF1YWxpZmllZE5hbWVSb290KHF1YWxpZmllZE5hbWU6IHRzLlF1YWxpZmllZE5hbWUpOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICB3aGlsZSAodHMuaXNRdWFsaWZpZWROYW1lKHF1YWxpZmllZE5hbWUubGVmdCkpIHtcbiAgICBxdWFsaWZpZWROYW1lID0gcXVhbGlmaWVkTmFtZS5sZWZ0O1xuICB9XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIocXVhbGlmaWVkTmFtZS5sZWZ0KSA/IHF1YWxpZmllZE5hbWUubGVmdCA6IG51bGw7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4uIEUuZy4gdGhlIGBhYCBvZiBgYS5iLmMuZGAuXG4gKiBAcGFyYW0gcHJvcGVydHlBY2Nlc3MgVGhlIHN0YXJ0aW5nIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uIGZyb20gd2hpY2ggd2Ugd2FudCB0byBjb21wdXRlXG4gKiB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gdGhlIGNoYWluIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYW4gaWRlbnRpZmllci5cbiAqL1xuZnVuY3Rpb24gZ2V0RmFyTGVmdElkZW50aWZpZXIocHJvcGVydHlBY2Nlc3M6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHdoaWxlICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uKSkge1xuICAgIHByb3BlcnR5QWNjZXNzID0gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24pID8gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbiA6IG51bGw7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBJbXBvcnREZWNsYXJhdGlvbiBmb3IgdGhlIGdpdmVuIGBub2RlYCBpZiBpdCBpcyBlaXRoZXIgYW4gYEltcG9ydFNwZWNpZmllcmAgb3IgYVxuICogYE5hbWVzcGFjZUltcG9ydGAuIElmIG5vdCByZXR1cm4gYG51bGxgLlxuICovXG5mdW5jdGlvbiBnZXRDb250YWluaW5nSW1wb3J0RGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IHRzLkltcG9ydERlY2xhcmF0aW9ufG51bGwge1xuICByZXR1cm4gdHMuaXNJbXBvcnRTcGVjaWZpZXIobm9kZSkgPyBub2RlLnBhcmVudCEucGFyZW50IS5wYXJlbnQhIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuaXNOYW1lc3BhY2VJbXBvcnQobm9kZSkgPyBub2RlLnBhcmVudC5wYXJlbnQgOiBudWxsO1xufVxuXG4vKipcbiAqIENvbXB1dGUgdGhlIG5hbWUgYnkgd2hpY2ggdGhlIGBkZWNsYCB3YXMgZXhwb3J0ZWQsIG5vdCBpbXBvcnRlZC5cbiAqIElmIG5vIHN1Y2ggZGVjbGFyYXRpb24gY2FuIGJlIGZvdW5kIChlLmcuIGl0IGlzIGEgbmFtZXNwYWNlIGltcG9ydClcbiAqIHRoZW4gZmFsbGJhY2sgdG8gdGhlIGBvcmlnaW5hbElkYC5cbiAqL1xuZnVuY3Rpb24gZ2V0RXhwb3J0ZWROYW1lKGRlY2w6IHRzLkRlY2xhcmF0aW9uLCBvcmlnaW5hbElkOiB0cy5JZGVudGlmaWVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRzLmlzSW1wb3J0U3BlY2lmaWVyKGRlY2wpID9cbiAgICAgIChkZWNsLnByb3BlcnR5TmFtZSAhPT0gdW5kZWZpbmVkID8gZGVjbC5wcm9wZXJ0eU5hbWUgOiBkZWNsLm5hbWUpLnRleHQgOlxuICAgICAgb3JpZ2luYWxJZC50ZXh0O1xufVxuXG5jb25zdCBMb2NhbEV4cG9ydGVkQ2xhc3NlcyA9IFN5bWJvbCgnTG9jYWxFeHBvcnRlZENsYXNzZXMnKTtcblxuLyoqXG4gKiBBIGB0cy5Tb3VyY2VGaWxlYCBleHBhbmRvIHdoaWNoIGluY2x1ZGVzIGEgY2FjaGVkIGBTZXRgIG9mIGxvY2FsIGBDbGFzc0RlY2xhcmF0aW9uc2AgdGhhdCBhcmVcbiAqIGV4cG9ydGVkIGVpdGhlciBkaXJlY3RseSAoYGV4cG9ydCBjbGFzcyAuLi5gKSBvciBpbmRpcmVjdGx5ICh2aWEgYGV4cG9ydCB7Li4ufWApLlxuICpcbiAqIFRoaXMgY2FjaGUgZG9lcyBub3QgY2F1c2UgbWVtb3J5IGxlYWtzIGFzOlxuICpcbiAqICAxLiBUaGUgb25seSByZWZlcmVuY2VzIGNhY2hlZCBoZXJlIGFyZSBsb2NhbCB0byB0aGUgYHRzLlNvdXJjZUZpbGVgLCBhbmQgdGh1cyBhbHNvIGF2YWlsYWJsZSBpblxuICogICAgIGB0aGlzLnN0YXRlbWVudHNgLlxuICpcbiAqICAyLiBUaGUgb25seSB3YXkgdGhpcyBgU2V0YCBjb3VsZCBjaGFuZ2UgaXMgaWYgdGhlIHNvdXJjZSBmaWxlIGl0c2VsZiB3YXMgY2hhbmdlZCwgd2hpY2ggd291bGRcbiAqICAgICBpbnZhbGlkYXRlIHRoZSBlbnRpcmUgYHRzLlNvdXJjZUZpbGVgIG9iamVjdCBpbiBmYXZvciBvZiBhIG5ldyB2ZXJzaW9uLiBUaHVzLCBjaGFuZ2luZyB0aGVcbiAqICAgICBzb3VyY2UgZmlsZSBhbHNvIGludmFsaWRhdGVzIHRoaXMgY2FjaGUuXG4gKi9cbmludGVyZmFjZSBTb3VyY2VGaWxlV2l0aENhY2hlZEV4cG9ydHMgZXh0ZW5kcyB0cy5Tb3VyY2VGaWxlIHtcbiAgLyoqXG4gICAqIENhY2hlZCBgU2V0YCBvZiBgQ2xhc3NEZWNsYXJhdGlvbmBzIHdoaWNoIGFyZSBsb2NhbGx5IGRlY2xhcmVkIGluIHRoaXMgZmlsZSBhbmQgYXJlIGV4cG9ydGVkXG4gICAqIGVpdGhlciBkaXJlY3RseSBvciBpbmRpcmVjdGx5LlxuICAgKi9cbiAgW0xvY2FsRXhwb3J0ZWRDbGFzc2VzXT86IFNldDxDbGFzc0RlY2xhcmF0aW9uPjtcbn1cbiJdfQ==