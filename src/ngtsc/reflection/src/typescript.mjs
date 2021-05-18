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
        if (!namespaceSymbol) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLEVBQWdDLGVBQWUsRUFBdUcscUJBQXFCLEVBQWlCLE1BQU0sUUFBUSxDQUFDO0FBQ2xOLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUM1QyxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFFL0M7O0dBRUc7QUFFSCxNQUFNLE9BQU8sd0JBQXdCO0lBQ25DLFlBQXNCLE9BQXVCO1FBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO0lBQUcsQ0FBQztJQUVqRCwwQkFBMEIsQ0FBQyxXQUE0QjtRQUNyRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLEtBQUssU0FBUyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvRSxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUM1RSxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQW9CLEVBQUUsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQXVCO1FBQ3ZDLE1BQU0sT0FBTyxHQUFHLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzVELE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBeUIsRUFBRSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsd0JBQXdCLENBQUMsS0FBdUI7UUFDOUMsTUFBTSxPQUFPLEdBQUcsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbkQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLGlCQUFpQixDQUFDO1FBQ2hFLDZGQUE2RjtRQUM3RiwrRkFBK0Y7UUFDL0YsK0ZBQStGO1FBQy9GLFVBQVU7UUFDVixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDN0IsQ0FBQyxNQUFNLEVBQXVDLEVBQUUsQ0FDNUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM3RixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDdEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEMscUNBQXFDO1lBQ3JDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXpELDRGQUE0RjtZQUM1RixnQ0FBZ0M7WUFFaEMsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztZQUN6QyxJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztZQUVoQyxpRkFBaUY7WUFDakYsd0ZBQXdGO1lBQ3hGLDZGQUE2RjtZQUM3Riw0Q0FBNEM7WUFDNUMsSUFBSSxRQUFRLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ3RDLGFBQWEsQ0FBQyxFQUFFLENBQ1osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUM7b0JBQ25DLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFFckUsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDOUI7YUFDRjtZQUVELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0QsT0FBTztnQkFDTCxJQUFJO2dCQUNKLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDbkIsa0JBQWtCO2dCQUNsQixRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixVQUFVO2FBQ1gsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHFCQUFxQixDQUFDLEVBQWlCO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDekIsT0FBTyxZQUFZLENBQUM7U0FDckI7YUFBTSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUUsRUFBRTtZQUNsRSxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDbEY7YUFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxFQUFFO1lBQzVFLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUNsRjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUFhO1FBQzlCLHlGQUF5RjtRQUN6RixJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7U0FDN0U7UUFFRCx5RkFBeUY7UUFDekYsV0FBVztRQUNYLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO1lBQ3hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUM3RCxtRUFBbUU7WUFDbkUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3RCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNsQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQWE7UUFDbkIsOERBQThEO1FBQzlELDZGQUE2RjtRQUM3RixPQUFPLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxZQUFZLENBQUMsS0FBdUI7UUFDbEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQ3JELENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUF1QjtRQUM1QyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlELEtBQUssQ0FBQyxlQUFlLEtBQUssU0FBUyxFQUFFO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLGFBQWEsR0FDZixLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN4RixJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO1lBQzdCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLFdBQVcsQ0FBQyxVQUFVLENBQUM7SUFDaEMsQ0FBQztJQUVELDBCQUEwQixDQUFDLEVBQWlCO1FBQzFDLDBFQUEwRTtRQUMxRSxJQUFJLE1BQU0sR0FBd0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDeEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsSUFBYTtRQUNuQyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUNoRSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTztZQUNMLElBQUk7WUFDSixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN2RSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDO2dCQUM5QyxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUF1QjtRQUM1QyxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEtBQUssQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxXQUFtQztRQUNsRCxPQUFPLFdBQVcsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxDQUFtQjtRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxLQUF1QjtRQUM1QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDcEIsQ0FBQztJQUVELHNCQUFzQixDQUFDLEtBQXVCO1FBQzVDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwQixDQUFDO0lBRVMsMkJBQTJCLENBQUMsRUFBaUI7UUFDckQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVwRCxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTO1lBQ3pELE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLFVBQVUsR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV4RCwrREFBK0Q7UUFDL0QsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCx5RkFBeUY7UUFDekYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ25ELDRDQUE0QztZQUM1QyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsT0FBTyxFQUFDLElBQUksRUFBRSxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FpQkc7SUFDTywrQkFBK0IsQ0FDckMsRUFBaUIsRUFBRSxtQkFBdUM7UUFDNUQsSUFBSSxtQkFBbUIsS0FBSyxJQUFJLEVBQUU7WUFDaEMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLFdBQVcsR0FDYixlQUFlLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN2RixJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDcEYsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDN0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDMUQseURBQXlEO1lBQ3pELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ0wsSUFBSSxFQUFFLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxJQUFJO1lBQzVDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSTtTQUNkLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDTyxzQkFBc0IsQ0FBQyxNQUFpQixFQUFFLFVBQThCO1FBRWhGLHFFQUFxRTtRQUNyRSxJQUFJLGdCQUFnQixHQUE2QixTQUFTLENBQUM7UUFDM0QsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1lBQ3pDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztTQUM1QzthQUFNLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzlFLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDM0M7UUFDRCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUN4RixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDekYsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQ2pFO2FBQU0sSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDbkYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3hGLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztTQUM5RDtRQUVELE1BQU0sVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEUsTUFBTSxTQUFTLEdBQ1gsVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDckYsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQztRQUVULCtFQUErRTtRQUMvRSxPQUFPLE1BQU0sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDMUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDaEQ7UUFFRCxnR0FBZ0c7UUFDaEcsK0NBQStDO1FBQy9DLElBQUksTUFBTSxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtZQUN6QyxPQUFPO2dCQUNMLElBQUksRUFBRSxNQUFNLENBQUMsZ0JBQWdCO2dCQUM3QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTO2dCQUNULFFBQVEsRUFBRSxJQUFJO2dCQUNkLElBQUksa0JBQTBCO2FBQy9CLENBQUM7U0FDSDthQUFNLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzlFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTO2dCQUNULFFBQVEsRUFBRSxJQUFJO2dCQUNkLElBQUksa0JBQTBCO2FBQy9CLENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxJQUFrQjtRQUMxQyw2RkFBNkY7UUFDN0YsNkZBQTZGO1FBQzdGLHdDQUF3QztRQUN4QyxJQUFJLGFBQWEsR0FBa0IsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuRCxJQUFJLElBQUksR0FBeUIsSUFBSSxDQUFDO1FBRXRDLDhCQUE4QjtRQUM5QixJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUN0QyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0MsYUFBYSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUM7U0FDMUM7UUFFRCw0RkFBNEY7UUFDNUYsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUN6QyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7UUFDaEcsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFbkUsT0FBTztZQUNMLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxJQUFJO1lBQzlCLFVBQVUsRUFBRSxhQUFhO1lBQ3pCLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLElBQUk7WUFDSixJQUFJO1NBQ0wsQ0FBQztJQUNKLENBQUM7SUFFTyxjQUFjLENBQUMsSUFBcUI7UUFDMUMsSUFBSSxJQUFJLEdBQXlCLElBQUksQ0FBQztRQUN0QyxJQUFJLEtBQUssR0FBdUIsSUFBSSxDQUFDO1FBQ3JDLElBQUksSUFBSSxHQUFnQixJQUFJLENBQUM7UUFDN0IsSUFBSSxRQUFRLEdBQXdDLElBQUksQ0FBQztRQUV6RCxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQyxJQUFJLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQztZQUNoQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7U0FDbEM7YUFBTSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QyxJQUFJLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQztTQUMvQjthQUFNLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVDLElBQUksR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDO1NBQy9CO2FBQU0sSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUM7U0FDL0I7YUFBTSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QyxJQUFJLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQztTQUNwQzthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JDLElBQUksR0FBRyxhQUFhLENBQUM7U0FDdEI7YUFBTSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3JDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN0QixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztTQUN0QjthQUFNLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3RCLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3RCO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUztZQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV6RSxPQUFPO1lBQ0wsSUFBSTtZQUNKLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLElBQUk7WUFDSixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJO1lBQ3ZCLElBQUk7WUFDSixRQUFRO1lBQ1IsVUFBVTtZQUNWLEtBQUs7WUFDTCxRQUFRO1NBQ1QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxJQUFvQjtJQUMzRCxNQUFNLEVBQUUsR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztBQUMvQixDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLElBQW9CO0lBQ2pFLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNqRSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0tBQzFCO1NBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDbEI7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FDMUMsSUFBbUIsRUFBRSxPQUF1QjtJQUM5QyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDM0U7SUFDRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7UUFDOUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUNuRDtJQUVELElBQUksSUFBSSxHQUF3QixJQUFJLENBQUM7SUFDckMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1FBQzdDLElBQUksR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7S0FDcEM7U0FBTSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUN4RixJQUFJLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQztTQUFNO1FBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7U0FDekU7UUFDRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVM7WUFDekQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztTQUN2RTtRQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU8sQ0FBQztZQUM1QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDbkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2FBQ3JEO1lBQ0QsT0FBTyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUMsQ0FBQztTQUN0RDthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQ3pDO0tBQ0Y7U0FBTTtRQUNMLE9BQU8sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDO0tBQzNCO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxPQUFzQixFQUFFLElBQVksRUFBRSxNQUFlO0lBRWhHLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztTQUM1QyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDWixJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQzlCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNoRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUM7YUFDekY7aUJBQU07Z0JBQ0wsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssU0FBUyxDQUFDO2FBQ2xEO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzNCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBMkQsRUFBRSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQztBQUNsRyxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FDdEIsT0FBc0IsRUFBRSxJQUFZLEVBQUUsV0FBb0IsS0FBSztJQUNqRSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQztBQUM5RixDQUFDO0FBRUQsTUFBTSxVQUFVLG9CQUFvQixDQUFDLElBQWdDO0lBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO0lBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzdCLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLE9BQU87YUFDUjtZQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNqQzthQUFNLElBQUksRUFBRSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BDO2FBQU07WUFDTCxPQUFPO1NBQ1I7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsMkJBQTJCLENBQUMsV0FBNkI7SUFFaEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsRUFBRTtRQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLG1CQUFtQixFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQztLQUMxRjtJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFvQjtJQUN6QyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0tBQ2xCO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQztLQUNiO0FBQ0gsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBcUI7SUFDakQsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2xGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNsQjtTQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUM7S0FDYjtBQUNILENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsb0JBQW9CLENBQUMsYUFBK0I7SUFDM0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUM3QyxhQUFhLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztLQUNwQztJQUNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN6RSxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLG9CQUFvQixDQUFDLGNBQTJDO0lBQ3ZFLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUMvRCxjQUFjLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztLQUM1QztJQUNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN2RixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyw4QkFBOEIsQ0FBQyxJQUFhO0lBQ25ELE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTyxDQUFDLE1BQU8sQ0FBQyxNQUFPLENBQUMsQ0FBQztRQUM5QixFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDN0YsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxJQUFvQixFQUFFLFVBQXlCO0lBQ3RFLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hFLFVBQVUsQ0FBQyxJQUFJLENBQUM7QUFDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25LaW5kLCBEZWNsYXJhdGlvbk5vZGUsIERlY29yYXRvciwgRnVuY3Rpb25EZWZpbml0aW9uLCBJbXBvcnQsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge3R5cGVUb1ZhbHVlfSBmcm9tICcuL3R5cGVfdG9fdmFsdWUnO1xuaW1wb3J0IHtpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiByZWZsZWN0b3IudHMgaW1wbGVtZW50cyBzdGF0aWMgcmVmbGVjdGlvbiBvZiBkZWNsYXJhdGlvbnMgdXNpbmcgdGhlIFR5cGVTY3JpcHQgYHRzLlR5cGVDaGVja2VyYC5cbiAqL1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHt9XG5cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGlmIChkZWNsYXJhdGlvbi5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHRoaXMuX3JlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yKSlcbiAgICAgICAgLmZpbHRlcigoZGVjKTogZGVjIGlzIERlY29yYXRvciA9PiBkZWMgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCB0c0NsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGNsYXp6KTtcbiAgICByZXR1cm4gdHNDbGF6ei5tZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fcmVmbGVjdE1lbWJlcihtZW1iZXIpKVxuICAgICAgICAuZmlsdGVyKChtZW1iZXIpOiBtZW1iZXIgaXMgQ2xhc3NNZW1iZXIgPT4gbWVtYmVyICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCB0c0NsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGNsYXp6KTtcblxuICAgIGNvbnN0IGlzRGVjbGFyYXRpb24gPSB0c0NsYXp6LmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZTtcbiAgICAvLyBGb3Igbm9uLWRlY2xhcmF0aW9uIGZpbGVzLCB3ZSB3YW50IHRvIGZpbmQgdGhlIGNvbnN0cnVjdG9yIHdpdGggYSBgYm9keWAuIFRoZSBjb25zdHJ1Y3RvcnNcbiAgICAvLyB3aXRob3V0IGEgYGJvZHlgIGFyZSBvdmVybG9hZHMgd2hlcmVhcyB3ZSB3YW50IHRoZSBpbXBsZW1lbnRhdGlvbiBzaW5jZSBpdCdzIHRoZSBvbmUgdGhhdCdsbFxuICAgIC8vIGJlIGV4ZWN1dGVkIGFuZCB3aGljaCBjYW4gaGF2ZSBkZWNvcmF0b3JzLiBGb3IgZGVjbGFyYXRpb24gZmlsZXMsIHdlIHRha2UgdGhlIGZpcnN0IG9uZSB0aGF0XG4gICAgLy8gd2UgZ2V0LlxuICAgIGNvbnN0IGN0b3IgPSB0c0NsYXp6Lm1lbWJlcnMuZmluZChcbiAgICAgICAgKG1lbWJlcik6IG1lbWJlciBpcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uID0+XG4gICAgICAgICAgICB0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obWVtYmVyKSAmJiAoaXNEZWNsYXJhdGlvbiB8fCBtZW1iZXIuYm9keSAhPT0gdW5kZWZpbmVkKSk7XG4gICAgaWYgKGN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3IucGFyYW1ldGVycy5tYXAobm9kZSA9PiB7XG4gICAgICAvLyBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGlzIGVhc3kuXG4gICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShub2RlLm5hbWUpO1xuXG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgICAgLy8gSXQgbWF5IG9yIG1heSBub3QgYmUgcG9zc2libGUgdG8gd3JpdGUgYW4gZXhwcmVzc2lvbiB0aGF0IHJlZmVycyB0byB0aGUgdmFsdWUgc2lkZSBvZiB0aGVcbiAgICAgIC8vIHR5cGUgbmFtZWQgZm9yIHRoZSBwYXJhbWV0ZXIuXG5cbiAgICAgIGxldCBvcmlnaW5hbFR5cGVOb2RlID0gbm9kZS50eXBlIHx8IG51bGw7XG4gICAgICBsZXQgdHlwZU5vZGUgPSBvcmlnaW5hbFR5cGVOb2RlO1xuXG4gICAgICAvLyBDaGVjayBpZiB3ZSBhcmUgZGVhbGluZyB3aXRoIGEgc2ltcGxlIG51bGxhYmxlIHVuaW9uIHR5cGUgZS5nLiBgZm9vOiBGb298bnVsbGBcbiAgICAgIC8vIGFuZCBleHRyYWN0IHRoZSB0eXBlLiBNb3JlIGNvbXBsZXggdW5pb24gdHlwZXMgZS5nLiBgZm9vOiBGb298QmFyYCBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgIC8vIFdlIGFsc28gZG9uJ3QgbmVlZCB0byBzdXBwb3J0IGBmb286IEZvb3x1bmRlZmluZWRgIGJlY2F1c2UgQW5ndWxhcidzIERJIGluamVjdHMgYG51bGxgIGZvclxuICAgICAgLy8gb3B0aW9uYWwgdG9rZXMgdGhhdCBkb24ndCBoYXZlIHByb3ZpZGVycy5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1VuaW9uVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICAgIGxldCBjaGlsZFR5cGVOb2RlcyA9IHR5cGVOb2RlLnR5cGVzLmZpbHRlcihcbiAgICAgICAgICAgIGNoaWxkVHlwZU5vZGUgPT5cbiAgICAgICAgICAgICAgICAhKHRzLmlzTGl0ZXJhbFR5cGVOb2RlKGNoaWxkVHlwZU5vZGUpICYmXG4gICAgICAgICAgICAgICAgICBjaGlsZFR5cGVOb2RlLmxpdGVyYWwua2luZCA9PT0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCkpO1xuXG4gICAgICAgIGlmIChjaGlsZFR5cGVOb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IGNoaWxkVHlwZU5vZGVzWzBdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHR5cGVWYWx1ZVJlZmVyZW5jZSA9IHR5cGVUb1ZhbHVlKHR5cGVOb2RlLCB0aGlzLmNoZWNrZXIpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBuYW1lTm9kZTogbm9kZS5uYW1lLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UsXG4gICAgICAgIHR5cGVOb2RlOiBvcmlnaW5hbFR5cGVOb2RlLFxuICAgICAgICBkZWNvcmF0b3JzLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RJbXBvcnQgPSB0aGlzLmdldERpcmVjdEltcG9ydE9mSWRlbnRpZmllcihpZCk7XG4gICAgaWYgKGRpcmVjdEltcG9ydCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRpcmVjdEltcG9ydDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShpZC5wYXJlbnQpICYmIGlkLnBhcmVudC5yaWdodCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoaWQsIGdldFF1YWxpZmllZE5hbWVSb290KGlkLnBhcmVudCkpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oaWQucGFyZW50KSAmJiBpZC5wYXJlbnQubmFtZSA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoaWQsIGdldEZhckxlZnRJZGVudGlmaWVyKGlkLnBhcmVudCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobm9kZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICAvLyBJbiBUeXBlU2NyaXB0IGNvZGUsIG1vZHVsZXMgYXJlIG9ubHkgdHMuU291cmNlRmlsZXMuIFRocm93IGlmIHRoZSBub2RlIGlzbid0IGEgbW9kdWxlLlxuICAgIGlmICghdHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGdldEV4cG9ydHNPZk1vZHVsZSgpIGNhbGxlZCBvbiBub24tU291cmNlRmlsZSBpbiBUUyBjb2RlYCk7XG4gICAgfVxuXG4gICAgLy8gUmVmbGVjdCB0aGUgbW9kdWxlIHRvIGEgU3ltYm9sLCBhbmQgdXNlIGdldEV4cG9ydHNPZk1vZHVsZSgpIHRvIGdldCBhIGxpc3Qgb2YgZXhwb3J0ZWRcbiAgICAvLyBTeW1ib2xzLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuICAgIHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3ltYm9sKS5mb3JFYWNoKGV4cG9ydFN5bWJvbCA9PiB7XG4gICAgICAvLyBNYXAgZWFjaCBleHBvcnRlZCBTeW1ib2wgdG8gYSBEZWNsYXJhdGlvbiBhbmQgYWRkIGl0IHRvIHRoZSBtYXAuXG4gICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKGV4cG9ydFN5bWJvbCwgbnVsbCk7XG4gICAgICBpZiAoZGVjbCAhPT0gbnVsbCkge1xuICAgICAgICBtYXAuc2V0KGV4cG9ydFN5bWJvbC5uYW1lLCBkZWNsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBDbGFzc0RlY2xhcmF0aW9uIHtcbiAgICAvLyBGb3Igb3VyIHB1cnBvc2VzLCBjbGFzc2VzIGFyZSBcIm5hbWVkXCIgdHMuQ2xhc3NEZWNsYXJhdGlvbnM7XG4gICAgLy8gKGBub2RlLm5hbWVgIGNhbiBiZSB1bmRlZmluZWQgaW4gdW5uYW1lZCBkZWZhdWx0IGV4cG9ydHM6IGBkZWZhdWx0IGV4cG9ydCBjbGFzcyB7IC4uLiB9YCkuXG4gICAgcmV0dXJuIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICB9XG5cbiAgaGFzQmFzZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6eikgIT09IG51bGw7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoISh0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopIHx8IHRzLmlzQ2xhc3NFeHByZXNzaW9uKGNsYXp6KSkgfHxcbiAgICAgICAgY2xhenouaGVyaXRhZ2VDbGF1c2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBleHRlbmRzQ2xhdXNlID1cbiAgICAgICAgY2xhenouaGVyaXRhZ2VDbGF1c2VzLmZpbmQoY2xhdXNlID0+IGNsYXVzZS50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCk7XG4gICAgaWYgKGV4dGVuZHNDbGF1c2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGV4dGVuZHNUeXBlID0gZXh0ZW5kc0NsYXVzZS50eXBlc1swXTtcbiAgICBpZiAoZXh0ZW5kc1R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBleHRlbmRzVHlwZS5leHByZXNzaW9uO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBSZXNvbHZlIHRoZSBpZGVudGlmaWVyIHRvIGEgU3ltYm9sLCBhbmQgcmV0dXJuIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGF0LlxuICAgIGxldCBzeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2wsIGlkKTtcbiAgfVxuXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uKG5vZGU6IHRzLk5vZGUpOiBGdW5jdGlvbkRlZmluaXRpb258bnVsbCB7XG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiZcbiAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBib2R5OiBub2RlLmJvZHkgIT09IHVuZGVmaW5lZCA/IEFycmF5LmZyb20obm9kZS5ib2R5LnN0YXRlbWVudHMpIDogbnVsbCxcbiAgICAgIHBhcmFtZXRlcnM6IG5vZGUucGFyYW1ldGVycy5tYXAocGFyYW0gPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShwYXJhbS5uYW1lKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBwYXJhbS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgICAgICByZXR1cm4ge25hbWUsIG5vZGU6IHBhcmFtLCBpbml0aWFsaXplcn07XG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY2xhenoudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCA/IGNsYXp6LnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gIH1cblxuICBnZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgfVxuXG4gIGdldER0c0RlY2xhcmF0aW9uKF86IENsYXNzRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREaXJlY3RJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuXG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IGdldENvbnRhaW5pbmdJbXBvcnREZWNsYXJhdGlvbihkZWNsKTtcblxuICAgIC8vIElnbm9yZSBkZWNsYXJhdGlvbnMgdGhhdCBhcmUgZGVmaW5lZCBsb2NhbGx5IChub3QgaW1wb3J0ZWQpLlxuICAgIGlmIChpbXBvcnREZWNsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGUgbW9kdWxlIHNwZWNpZmllciBpcyBndWFyYW50ZWVkIHRvIGJlIGEgc3RyaW5nIGxpdGVyYWwsIHNvIHRoaXMgc2hvdWxkIGFsd2F5cyBwYXNzLlxuICAgIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgLy8gTm90IGFsbG93ZWQgdG8gaGFwcGVuIGluIFR5cGVTY3JpcHQgQVNUcy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7ZnJvbTogaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dCwgbmFtZTogZ2V0RXhwb3J0ZWROYW1lKGRlY2wsIGlkKX07XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIGdldCB0aGUgaW1wb3J0IGluZm8gZm9yIHRoaXMgaWRlbnRpZmllciBhcyB0aG91Z2ggaXQgaXMgYSBuYW1lc3BhY2VkIGltcG9ydC5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGlmIHRoZSBpZGVudGlmaWVyIGlzIHRoZSBgRGlyZWN0aXZlYCBwYXJ0IG9mIGEgcXVhbGlmaWVkIHR5cGUgY2hhaW4gbGlrZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGNvcmUuRGlyZWN0aXZlXG4gICAqIGBgYFxuICAgKlxuICAgKiB0aGVuIGl0IG1pZ2h0IGJlIHRoYXQgYGNvcmVgIGlzIGEgbmFtZXNwYWNlIGltcG9ydCBzdWNoIGFzOlxuICAgKlxuICAgKiBgYGBcbiAgICogaW1wb3J0ICogYXMgY29yZSBmcm9tICd0c2xpYic7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gaWQgdGhlIFR5cGVTY3JpcHQgaWRlbnRpZmllciB0byBmaW5kIHRoZSBpbXBvcnQgaW5mbyBmb3IuXG4gICAqIEByZXR1cm5zIFRoZSBpbXBvcnQgaW5mbyBpZiB0aGlzIGlzIGEgbmFtZXNwYWNlZCBpbXBvcnQgb3IgYG51bGxgLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoXG4gICAgICBpZDogdHMuSWRlbnRpZmllciwgbmFtZXNwYWNlSWRlbnRpZmllcjogdHMuSWRlbnRpZmllcnxudWxsKTogSW1wb3J0fG51bGwge1xuICAgIGlmIChuYW1lc3BhY2VJZGVudGlmaWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbmFtZXNwYWNlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obmFtZXNwYWNlSWRlbnRpZmllcik7XG4gICAgaWYgKCFuYW1lc3BhY2VTeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9XG4gICAgICAgIG5hbWVzcGFjZVN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxID8gbmFtZXNwYWNlU3ltYm9sLmRlY2xhcmF0aW9uc1swXSA6IG51bGw7XG4gICAgaWYgKCFkZWNsYXJhdGlvbikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2xhcmF0aW9uID0gdHMuaXNOYW1lc3BhY2VJbXBvcnQoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICAgIGlmICghbmFtZXNwYWNlRGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydERlY2xhcmF0aW9uID0gbmFtZXNwYWNlRGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBTaG91bGQgbm90IGhhcHBlbiBhcyB0aGlzIHdvdWxkIGJlIGludmFsaWQgVHlwZXNTY3JpcHRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBmcm9tOiBpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIudGV4dCxcbiAgICAgIG5hbWU6IGlkLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBgdmlhTW9kdWxlYCBhbG9uZyB0aGUgd2F5LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sOiB0cy5TeW1ib2wsIG9yaWdpbmFsSWQ6IHRzLklkZW50aWZpZXJ8bnVsbCk6IERlY2xhcmF0aW9uXG4gICAgICB8bnVsbCB7XG4gICAgLy8gSWYgdGhlIHN5bWJvbCBwb2ludHMgdG8gYSBTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQsIHJlc29sdmUgaXQuXG4gICAgbGV0IHZhbHVlRGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFsdWVEZWNsYXJhdGlvbiA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgdmFsdWVEZWNsYXJhdGlvbiA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgfVxuICAgIGlmICh2YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQodmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IHNob3J0aGFuZFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTaG9ydGhhbmRBc3NpZ25tZW50VmFsdWVTeW1ib2wodmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICBpZiAoc2hvcnRoYW5kU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHNob3J0aGFuZFN5bWJvbCwgb3JpZ2luYWxJZCk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiYgdHMuaXNFeHBvcnRTcGVjaWZpZXIodmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRTcGVjaWZpZXJMb2NhbFRhcmdldFN5bWJvbCh2YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgIGlmICh0YXJnZXRTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2wodGFyZ2V0U3ltYm9sLCBvcmlnaW5hbElkKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRJbmZvID0gb3JpZ2luYWxJZCAmJiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihvcmlnaW5hbElkKTtcbiAgICBjb25zdCB2aWFNb2R1bGUgPVxuICAgICAgICBpbXBvcnRJbmZvICE9PSBudWxsICYmIGltcG9ydEluZm8uZnJvbSAhPT0gbnVsbCAmJiAhaW1wb3J0SW5mby5mcm9tLnN0YXJ0c1dpdGgoJy4nKSA/XG4gICAgICAgIGltcG9ydEluZm8uZnJvbSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBOb3csIHJlc29sdmUgdGhlIFN5bWJvbCB0byBpdHMgZGVjbGFyYXRpb24gYnkgZm9sbG93aW5nIGFueSBhbmQgYWxsIGFsaWFzZXMuXG4gICAgd2hpbGUgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHJlc29sdmVkIFN5bWJvbCdzIGRlY2xhcmF0aW9ucyBhbmQgcGljayBvbmUgb2YgdGhlbSB0byByZXR1cm4uIFZhbHVlIGRlY2xhcmF0aW9uc1xuICAgIC8vIGFyZSBnaXZlbiBwcmVjZWRlbmNlIG92ZXIgdHlwZSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uLFxuICAgICAgICBrbm93bjogbnVsbCxcbiAgICAgICAgdmlhTW9kdWxlLFxuICAgICAgICBpZGVudGl0eTogbnVsbCxcbiAgICAgICAga2luZDogRGVjbGFyYXRpb25LaW5kLkNvbmNyZXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF0sXG4gICAgICAgIGtub3duOiBudWxsLFxuICAgICAgICB2aWFNb2R1bGUsXG4gICAgICAgIGlkZW50aXR5OiBudWxsLFxuICAgICAgICBraW5kOiBEZWNsYXJhdGlvbktpbmQuQ29uY3JldGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZWZsZWN0RGVjb3JhdG9yKG5vZGU6IHRzLkRlY29yYXRvcik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgICAvLyBjYXNlIHdlIHdhbnQgdG8gcmV0dXJuIHRoZSBhcmd1bWVudHMuXG4gICAgbGV0IGRlY29yYXRvckV4cHI6IHRzLkV4cHJlc3Npb24gPSBub2RlLmV4cHJlc3Npb247XG4gICAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXXxudWxsID0gbnVsbDtcblxuICAgIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICBhcmdzID0gQXJyYXkuZnJvbShkZWNvcmF0b3JFeHByLmFyZ3VtZW50cyk7XG4gICAgICBkZWNvcmF0b3JFeHByID0gZGVjb3JhdG9yRXhwci5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaW5hbCByZXNvbHZlZCBkZWNvcmF0b3Igc2hvdWxkIGJlIGEgYHRzLklkZW50aWZpZXJgIC0gaWYgaXQncyBub3QsIHRoZW4gc29tZXRoaW5nIGlzXG4gICAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9IHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSA/IGRlY29yYXRvckV4cHIgOiBkZWNvcmF0b3JFeHByLm5hbWU7XG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHIsXG4gICAgICBpbXBvcnQ6IGltcG9ydERlY2wsXG4gICAgICBub2RlLFxuICAgICAgYXJncyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdE1lbWJlcihub2RlOiB0cy5DbGFzc0VsZW1lbnQpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnx0cy5TdHJpbmdMaXRlcmFsfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIHZhbHVlID0gbm9kZS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3NvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlcjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5TZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5uYW1lKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGNvbnN0IGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsXG4gICAgICBraW5kLFxuICAgICAgdHlwZTogbm9kZS50eXBlIHx8IG51bGwsXG4gICAgICBuYW1lLFxuICAgICAgbmFtZU5vZGUsXG4gICAgICBkZWNvcmF0b3JzLFxuICAgICAgdmFsdWUsXG4gICAgICBpc1N0YXRpYyxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICByZXR1cm4gaWQgJiYgaWQudGV4dCB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsKSB8fCB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lIHx8IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgICByZXR1cm4gZGVjbC5uYW1lO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbihcbiAgICB0eXBlOiB0cy5FbnRpdHlOYW1lLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHtub2RlOiB0cy5EZWNsYXJhdGlvbiwgZnJvbTogc3RyaW5nfG51bGx9IHtcbiAgbGV0IHJlYWxTeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZSk7XG4gIGlmIChyZWFsU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5ICR7dHlwZS5nZXRUZXh0KCl9IHRvIHN5bWJvbGApO1xuICB9XG4gIHdoaWxlIChyZWFsU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHJlYWxTeW1ib2wpO1xuICB9XG5cbiAgbGV0IG5vZGU6IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICBpZiAocmVhbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICBub2RlID0gcmVhbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICB9IGVsc2UgaWYgKHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQgJiYgcmVhbFN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlc29sdmUgdHlwZSBlbnRpdHkgc3ltYm9sIHRvIGRlY2xhcmF0aW9uYCk7XG4gIH1cblxuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKHR5cGUpKSB7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIodHlwZS5sZWZ0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGFuZGxlIHF1YWxpZmllZCBuYW1lIHdpdGggbm9uLWlkZW50aWZpZXIgbGhzYCk7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0eXBlLmxlZnQpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlc29sdmUgcXVhbGlmaWVkIHR5cGUgZW50aXR5IGxocyB0byBzeW1ib2xgKTtcbiAgICB9XG4gICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKHRzLmlzTmFtZXNwYWNlSW1wb3J0KGRlY2wpKSB7XG4gICAgICBjb25zdCBjbGF1c2UgPSBkZWNsLnBhcmVudCE7XG4gICAgICBjb25zdCBpbXBvcnREZWNsID0gY2xhdXNlLnBhcmVudCE7XG4gICAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgc3BlY2lmaWVyIGlzIG5vdCBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtub2RlLCBmcm9tOiBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0fTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGltcG9ydCB0eXBlP2ApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge25vZGUsIGZyb206IG51bGx9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgbW9kdWxlPzogc3RyaW5nKTpcbiAgICB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10ge1xuICByZXR1cm4gbWVtYmVycy5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMpXG4gICAgICAubWFwKG1lbWJlciA9PiB7XG4gICAgICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IG1lbWJlci5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4ge1xuICAgICAgICAgIGlmIChkZWMuaW1wb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjLmltcG9ydC5uYW1lID09PSBuYW1lICYmIChtb2R1bGUgPT09IHVuZGVmaW5lZCB8fCBkZWMuaW1wb3J0LmZyb20gPT09IG1vZHVsZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWMubmFtZSA9PT0gbmFtZSAmJiBtb2R1bGUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHttZW1iZXIsIGRlY29yYXRvcnN9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoKHZhbHVlKTogdmFsdWUgaXMge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfSA9PiB2YWx1ZSAhPT0gbnVsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWVtYmVyKFxuICAgIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgaXNTdGF0aWM6IGJvb2xlYW4gPSBmYWxzZSk6IENsYXNzTWVtYmVyfG51bGwge1xuICByZXR1cm4gbWVtYmVycy5maW5kKG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMgPT09IGlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBuYW1lKSB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPigpO1xuICBub2RlLnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcm9wZXJ0eU5hbWVUb1N0cmluZyhwcm9wLm5hbWUpO1xuICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbWFwLnNldChuYW1lLCBwcm9wLmluaXRpYWxpemVyKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBtYXAuc2V0KHByb3AubmFtZS50ZXh0LCBwcm9wLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uKTpcbiAgICBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+IHtcbiAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgUmVmbGVjdGluZyBvbiBhICR7dHMuU3ludGF4S2luZFtkZWNsYXJhdGlvbi5raW5kXX0gaW5zdGVhZCBvZiBhIENsYXNzRGVjbGFyYXRpb24uYCk7XG4gIH1cbiAgcmV0dXJuIGRlY2xhcmF0aW9uO1xufVxuXG5mdW5jdGlvbiBwYXJhbWV0ZXJOYW1lKG5hbWU6IHRzLkJpbmRpbmdOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5hbWUpKSB7XG4gICAgcmV0dXJuIG5hbWUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eU5hbWVUb1N0cmluZyhub2RlOiB0cy5Qcm9wZXJ0eU5hbWUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkgfHwgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpIHx8IHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICByZXR1cm4gbm9kZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gYSBxdWFsaWZpZWQgdHlwZSBjaGFpbi4gRS5nLiB0aGUgYGFgIG9mIGBhLmIuYy5Tb21lVHlwZWAuXG4gKiBAcGFyYW0gcXVhbGlmaWVkTmFtZSBUaGUgc3RhcnRpbmcgcHJvcGVydHkgYWNjZXNzIGV4cHJlc3Npb24gZnJvbSB3aGljaCB3ZSB3YW50IHRvIGNvbXB1dGVcbiAqIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllci5cbiAqIEByZXR1cm5zIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllciBpbiB0aGUgY2hhaW4gb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhbiBpZGVudGlmaWVyLlxuICovXG5mdW5jdGlvbiBnZXRRdWFsaWZpZWROYW1lUm9vdChxdWFsaWZpZWROYW1lOiB0cy5RdWFsaWZpZWROYW1lKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgd2hpbGUgKHRzLmlzUXVhbGlmaWVkTmFtZShxdWFsaWZpZWROYW1lLmxlZnQpKSB7XG4gICAgcXVhbGlmaWVkTmFtZSA9IHF1YWxpZmllZE5hbWUubGVmdDtcbiAgfVxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKHF1YWxpZmllZE5hbWUubGVmdCkgPyBxdWFsaWZpZWROYW1lLmxlZnQgOiBudWxsO1xufVxuXG4vKipcbiAqIENvbXB1dGUgdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyIGluIGEgcHJvcGVydHkgYWNjZXNzIGNoYWluLiBFLmcuIHRoZSBgYWAgb2YgYGEuYi5jLmRgLlxuICogQHBhcmFtIHByb3BlcnR5QWNjZXNzIFRoZSBzdGFydGluZyBwcm9wZXJ0eSBhY2Nlc3MgZXhwcmVzc2lvbiBmcm9tIHdoaWNoIHdlIHdhbnQgdG8gY29tcHV0ZVxuICogdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyLlxuICogQHJldHVybnMgdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyIGluIHRoZSBjaGFpbiBvciBgbnVsbGAgaWYgaXQgaXMgbm90IGFuIGlkZW50aWZpZXIuXG4gKi9cbmZ1bmN0aW9uIGdldEZhckxlZnRJZGVudGlmaWVyKHByb3BlcnR5QWNjZXNzOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICB3aGlsZSAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbikpIHtcbiAgICBwcm9wZXJ0eUFjY2VzcyA9IHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb247XG4gIH1cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uKSA/IHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24gOiBudWxsO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgSW1wb3J0RGVjbGFyYXRpb24gZm9yIHRoZSBnaXZlbiBgbm9kZWAgaWYgaXQgaXMgZWl0aGVyIGFuIGBJbXBvcnRTcGVjaWZpZXJgIG9yIGFcbiAqIGBOYW1lc3BhY2VJbXBvcnRgLiBJZiBub3QgcmV0dXJuIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q29udGFpbmluZ0ltcG9ydERlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiB0cy5JbXBvcnREZWNsYXJhdGlvbnxudWxsIHtcbiAgcmV0dXJuIHRzLmlzSW1wb3J0U3BlY2lmaWVyKG5vZGUpID8gbm9kZS5wYXJlbnQhLnBhcmVudCEucGFyZW50ISA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmlzTmFtZXNwYWNlSW1wb3J0KG5vZGUpID8gbm9kZS5wYXJlbnQucGFyZW50IDogbnVsbDtcbn1cblxuLyoqXG4gKiBDb21wdXRlIHRoZSBuYW1lIGJ5IHdoaWNoIHRoZSBgZGVjbGAgd2FzIGV4cG9ydGVkLCBub3QgaW1wb3J0ZWQuXG4gKiBJZiBubyBzdWNoIGRlY2xhcmF0aW9uIGNhbiBiZSBmb3VuZCAoZS5nLiBpdCBpcyBhIG5hbWVzcGFjZSBpbXBvcnQpXG4gKiB0aGVuIGZhbGxiYWNrIHRvIHRoZSBgb3JpZ2luYWxJZGAuXG4gKi9cbmZ1bmN0aW9uIGdldEV4cG9ydGVkTmFtZShkZWNsOiB0cy5EZWNsYXJhdGlvbiwgb3JpZ2luYWxJZDogdHMuSWRlbnRpZmllcik6IHN0cmluZyB7XG4gIHJldHVybiB0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsKSA/XG4gICAgICAoZGVjbC5wcm9wZXJ0eU5hbWUgIT09IHVuZGVmaW5lZCA/IGRlY2wucHJvcGVydHlOYW1lIDogZGVjbC5uYW1lKS50ZXh0IDpcbiAgICAgIG9yaWdpbmFsSWQudGV4dDtcbn1cbiJdfQ==