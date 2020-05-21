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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/typescript", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/reflection/src/host", "@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value", "@angular/compiler-cli/src/ngtsc/reflection/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectObjectLiteral = exports.findMember = exports.filterToMembersWithDecorator = exports.reflectTypeEntityToDeclaration = exports.reflectIdentifierOfDeclaration = exports.reflectNameOfDeclaration = exports.TypeScriptReflectionHost = void 0;
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/host");
    var type_to_value_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/util");
    /**
     * reflector.ts implements static reflection of declarations using the TypeScript `ts.TypeChecker`.
     */
    var TypeScriptReflectionHost = /** @class */ (function () {
        function TypeScriptReflectionHost(checker) {
            this.checker = checker;
        }
        TypeScriptReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            var _this = this;
            if (declaration.decorators === undefined || declaration.decorators.length === 0) {
                return null;
            }
            return declaration.decorators.map(function (decorator) { return _this._reflectDecorator(decorator); })
                .filter(function (dec) { return dec !== null; });
        };
        TypeScriptReflectionHost.prototype.getMembersOfClass = function (clazz) {
            var _this = this;
            var tsClazz = castDeclarationToClassOrDie(clazz);
            return tsClazz.members.map(function (member) { return _this._reflectMember(member); })
                .filter(function (member) { return member !== null; });
        };
        TypeScriptReflectionHost.prototype.getConstructorParameters = function (clazz) {
            var _this = this;
            var tsClazz = castDeclarationToClassOrDie(clazz);
            // First, find the constructor with a `body`. The constructors without a `body` are overloads
            // whereas we want the implementation since it's the one that'll be executed and which can
            // have decorators.
            var ctor = tsClazz.members.find(function (member) {
                return ts.isConstructorDeclaration(member) && member.body !== undefined;
            });
            if (ctor === undefined) {
                return null;
            }
            return ctor.parameters.map(function (node) {
                // The name of the parameter is easy.
                var name = parameterName(node.name);
                var decorators = _this.getDecoratorsOfDeclaration(node);
                // It may or may not be possible to write an expression that refers to the value side of the
                // type named for the parameter.
                var originalTypeNode = node.type || null;
                var typeNode = originalTypeNode;
                // Check if we are dealing with a simple nullable union type e.g. `foo: Foo|null`
                // and extract the type. More complex union types e.g. `foo: Foo|Bar` are not supported.
                // We also don't need to support `foo: Foo|undefined` because Angular's DI injects `null` for
                // optional tokes that don't have providers.
                if (typeNode && ts.isUnionTypeNode(typeNode)) {
                    var childTypeNodes = typeNode.types.filter(function (childTypeNode) { return childTypeNode.kind !== ts.SyntaxKind.NullKeyword; });
                    if (childTypeNodes.length === 1) {
                        typeNode = childTypeNodes[0];
                    }
                    else {
                        typeNode = null;
                    }
                }
                var typeValueReference = type_to_value_1.typeToValue(typeNode, _this.checker);
                return {
                    name: name,
                    nameNode: node.name,
                    typeValueReference: typeValueReference,
                    typeNode: originalTypeNode,
                    decorators: decorators,
                };
            });
        };
        TypeScriptReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var directImport = this.getDirectImportOfIdentifier(id);
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
        };
        TypeScriptReflectionHost.prototype.getExportsOfModule = function (node) {
            var _this = this;
            // In TypeScript code, modules are only ts.SourceFiles. Throw if the node isn't a module.
            if (!ts.isSourceFile(node)) {
                throw new Error("getExportsOfModule() called on non-SourceFile in TS code");
            }
            var map = new Map();
            // Reflect the module to a Symbol, and use getExportsOfModule() to get a list of exported
            // Symbols.
            var symbol = this.checker.getSymbolAtLocation(node);
            if (symbol === undefined) {
                return null;
            }
            this.checker.getExportsOfModule(symbol).forEach(function (exportSymbol) {
                // Map each exported Symbol to a Declaration and add it to the map.
                var decl = _this.getDeclarationOfSymbol(exportSymbol, null);
                if (decl !== null) {
                    map.set(exportSymbol.name, decl);
                }
            });
            return map;
        };
        TypeScriptReflectionHost.prototype.isClass = function (node) {
            // For our purposes, classes are "named" ts.ClassDeclarations;
            // (`node.name` can be undefined in unnamed default exports: `default export class { ... }`).
            return util_1.isNamedClassDeclaration(node);
        };
        TypeScriptReflectionHost.prototype.hasBaseClass = function (clazz) {
            return this.getBaseClassExpression(clazz) !== null;
        };
        TypeScriptReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            if (!(ts.isClassDeclaration(clazz) || ts.isClassExpression(clazz)) ||
                clazz.heritageClauses === undefined) {
                return null;
            }
            var extendsClause = clazz.heritageClauses.find(function (clause) { return clause.token === ts.SyntaxKind.ExtendsKeyword; });
            if (extendsClause === undefined) {
                return null;
            }
            var extendsType = extendsClause.types[0];
            if (extendsType === undefined) {
                return null;
            }
            return extendsType.expression;
        };
        TypeScriptReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            // Resolve the identifier to a Symbol, and return the declaration of that.
            var symbol = this.checker.getSymbolAtLocation(id);
            if (symbol === undefined) {
                return null;
            }
            return this.getDeclarationOfSymbol(symbol, id);
        };
        TypeScriptReflectionHost.prototype.getDefinitionOfFunction = function (node) {
            if (!ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node) &&
                !ts.isFunctionExpression(node)) {
                return null;
            }
            return {
                node: node,
                body: node.body !== undefined ? Array.from(node.body.statements) : null,
                parameters: node.parameters.map(function (param) {
                    var name = parameterName(param.name);
                    var initializer = param.initializer || null;
                    return { name: name, node: param, initializer: initializer };
                }),
            };
        };
        TypeScriptReflectionHost.prototype.getGenericArityOfClass = function (clazz) {
            if (!ts.isClassDeclaration(clazz)) {
                return null;
            }
            return clazz.typeParameters !== undefined ? clazz.typeParameters.length : 0;
        };
        TypeScriptReflectionHost.prototype.getVariableValue = function (declaration) {
            return declaration.initializer || null;
        };
        TypeScriptReflectionHost.prototype.getDtsDeclaration = function (_) {
            return null;
        };
        TypeScriptReflectionHost.prototype.getInternalNameOfClass = function (clazz) {
            return clazz.name;
        };
        TypeScriptReflectionHost.prototype.getAdjacentNameOfClass = function (clazz) {
            return clazz.name;
        };
        TypeScriptReflectionHost.prototype.getDirectImportOfIdentifier = function (id) {
            var symbol = this.checker.getSymbolAtLocation(id);
            if (symbol === undefined || symbol.declarations === undefined ||
                symbol.declarations.length !== 1) {
                return null;
            }
            var decl = symbol.declarations[0];
            var importDecl = getContainingImportDeclaration(decl);
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
        };
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
        TypeScriptReflectionHost.prototype.getImportOfNamespacedIdentifier = function (id, namespaceIdentifier) {
            if (namespaceIdentifier === null) {
                return null;
            }
            var namespaceSymbol = this.checker.getSymbolAtLocation(namespaceIdentifier);
            if (!namespaceSymbol) {
                return null;
            }
            var declaration = namespaceSymbol.declarations.length === 1 ? namespaceSymbol.declarations[0] : null;
            if (!declaration) {
                return null;
            }
            var namespaceDeclaration = ts.isNamespaceImport(declaration) ? declaration : null;
            if (!namespaceDeclaration) {
                return null;
            }
            var importDeclaration = namespaceDeclaration.parent.parent;
            if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
                // Should not happen as this would be invalid TypesScript
                return null;
            }
            return {
                from: importDeclaration.moduleSpecifier.text,
                name: id.text,
            };
        };
        /**
         * Resolve a `ts.Symbol` to its declaration, keeping track of the `viaModule` along the way.
         */
        TypeScriptReflectionHost.prototype.getDeclarationOfSymbol = function (symbol, originalId) {
            // If the symbol points to a ShorthandPropertyAssignment, resolve it.
            var valueDeclaration = undefined;
            if (symbol.valueDeclaration !== undefined) {
                valueDeclaration = symbol.valueDeclaration;
            }
            else if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
                valueDeclaration = symbol.declarations[0];
            }
            if (valueDeclaration !== undefined && ts.isShorthandPropertyAssignment(valueDeclaration)) {
                var shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(valueDeclaration);
                if (shorthandSymbol === undefined) {
                    return null;
                }
                return this.getDeclarationOfSymbol(shorthandSymbol, originalId);
            }
            else if (valueDeclaration !== undefined && ts.isExportSpecifier(valueDeclaration)) {
                var targetSymbol = this.checker.getExportSpecifierLocalTargetSymbol(valueDeclaration);
                if (targetSymbol === undefined) {
                    return null;
                }
                return this.getDeclarationOfSymbol(targetSymbol, originalId);
            }
            var importInfo = originalId && this.getImportOfIdentifier(originalId);
            var viaModule = importInfo !== null && importInfo.from !== null && !importInfo.from.startsWith('.') ?
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
                    viaModule: viaModule,
                    identity: null,
                };
            }
            else if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
                return {
                    node: symbol.declarations[0],
                    known: null,
                    viaModule: viaModule,
                    identity: null,
                };
            }
            else {
                return null;
            }
        };
        TypeScriptReflectionHost.prototype._reflectDecorator = function (node) {
            // Attempt to resolve the decorator expression into a reference to a concrete Identifier. The
            // expression may contain a call to a function which returns the decorator function, in which
            // case we want to return the arguments.
            var decoratorExpr = node.expression;
            var args = null;
            // Check for call expressions.
            if (ts.isCallExpression(decoratorExpr)) {
                args = Array.from(decoratorExpr.arguments);
                decoratorExpr = decoratorExpr.expression;
            }
            // The final resolved decorator should be a `ts.Identifier` - if it's not, then something is
            // wrong and the decorator can't be resolved statically.
            if (!host_1.isDecoratorIdentifier(decoratorExpr)) {
                return null;
            }
            var decoratorIdentifier = ts.isIdentifier(decoratorExpr) ? decoratorExpr : decoratorExpr.name;
            var importDecl = this.getImportOfIdentifier(decoratorIdentifier);
            return {
                name: decoratorIdentifier.text,
                identifier: decoratorExpr,
                import: importDecl,
                node: node,
                args: args,
            };
        };
        TypeScriptReflectionHost.prototype._reflectMember = function (node) {
            var kind = null;
            var value = null;
            var name = null;
            var nameNode = null;
            if (ts.isPropertyDeclaration(node)) {
                kind = host_1.ClassMemberKind.Property;
                value = node.initializer || null;
            }
            else if (ts.isGetAccessorDeclaration(node)) {
                kind = host_1.ClassMemberKind.Getter;
            }
            else if (ts.isSetAccessorDeclaration(node)) {
                kind = host_1.ClassMemberKind.Setter;
            }
            else if (ts.isMethodDeclaration(node)) {
                kind = host_1.ClassMemberKind.Method;
            }
            else if (ts.isConstructorDeclaration(node)) {
                kind = host_1.ClassMemberKind.Constructor;
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
            else {
                return null;
            }
            var decorators = this.getDecoratorsOfDeclaration(node);
            var isStatic = node.modifiers !== undefined &&
                node.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.StaticKeyword; });
            return {
                node: node,
                implementation: node,
                kind: kind,
                type: node.type || null,
                name: name,
                nameNode: nameNode,
                decorators: decorators,
                value: value,
                isStatic: isStatic,
            };
        };
        return TypeScriptReflectionHost;
    }());
    exports.TypeScriptReflectionHost = TypeScriptReflectionHost;
    function reflectNameOfDeclaration(decl) {
        var id = reflectIdentifierOfDeclaration(decl);
        return id && id.text || null;
    }
    exports.reflectNameOfDeclaration = reflectNameOfDeclaration;
    function reflectIdentifierOfDeclaration(decl) {
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
    exports.reflectIdentifierOfDeclaration = reflectIdentifierOfDeclaration;
    function reflectTypeEntityToDeclaration(type, checker) {
        var realSymbol = checker.getSymbolAtLocation(type);
        if (realSymbol === undefined) {
            throw new Error("Cannot resolve type entity " + type.getText() + " to symbol");
        }
        while (realSymbol.flags & ts.SymbolFlags.Alias) {
            realSymbol = checker.getAliasedSymbol(realSymbol);
        }
        var node = null;
        if (realSymbol.valueDeclaration !== undefined) {
            node = realSymbol.valueDeclaration;
        }
        else if (realSymbol.declarations !== undefined && realSymbol.declarations.length === 1) {
            node = realSymbol.declarations[0];
        }
        else {
            throw new Error("Cannot resolve type entity symbol to declaration");
        }
        if (ts.isQualifiedName(type)) {
            if (!ts.isIdentifier(type.left)) {
                throw new Error("Cannot handle qualified name with non-identifier lhs");
            }
            var symbol = checker.getSymbolAtLocation(type.left);
            if (symbol === undefined || symbol.declarations === undefined ||
                symbol.declarations.length !== 1) {
                throw new Error("Cannot resolve qualified type entity lhs to symbol");
            }
            var decl = symbol.declarations[0];
            if (ts.isNamespaceImport(decl)) {
                var clause = decl.parent;
                var importDecl = clause.parent;
                if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
                    throw new Error("Module specifier is not a string");
                }
                return { node: node, from: importDecl.moduleSpecifier.text };
            }
            else {
                throw new Error("Unknown import type?");
            }
        }
        else {
            return { node: node, from: null };
        }
    }
    exports.reflectTypeEntityToDeclaration = reflectTypeEntityToDeclaration;
    function filterToMembersWithDecorator(members, name, module) {
        return members.filter(function (member) { return !member.isStatic; })
            .map(function (member) {
            if (member.decorators === null) {
                return null;
            }
            var decorators = member.decorators.filter(function (dec) {
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
            return { member: member, decorators: decorators };
        })
            .filter(function (value) { return value !== null; });
    }
    exports.filterToMembersWithDecorator = filterToMembersWithDecorator;
    function findMember(members, name, isStatic) {
        if (isStatic === void 0) { isStatic = false; }
        return members.find(function (member) { return member.isStatic === isStatic && member.name === name; }) || null;
    }
    exports.findMember = findMember;
    function reflectObjectLiteral(node) {
        var map = new Map();
        node.properties.forEach(function (prop) {
            if (ts.isPropertyAssignment(prop)) {
                var name_1 = propertyNameToString(prop.name);
                if (name_1 === null) {
                    return;
                }
                map.set(name_1, prop.initializer);
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
    exports.reflectObjectLiteral = reflectObjectLiteral;
    function castDeclarationToClassOrDie(declaration) {
        if (!ts.isClassDeclaration(declaration)) {
            throw new Error("Reflecting on a " + ts.SyntaxKind[declaration.kind] + " instead of a ClassDeclaration.");
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsNEVBQWdMO0lBQ2hMLDhGQUE0QztJQUM1Qyw0RUFBK0M7SUFFL0M7O09BRUc7SUFFSDtRQUNFLGtDQUFzQixPQUF1QjtZQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUFHLENBQUM7UUFFakQsNkRBQTBCLEdBQTFCLFVBQTJCLFdBQTJCO1lBQXRELGlCQU1DO1lBTEMsSUFBSSxXQUFXLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9FLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDO2lCQUM1RSxNQUFNLENBQUMsVUFBQyxHQUFHLElBQXVCLE9BQUEsR0FBRyxLQUFLLElBQUksRUFBWixDQUFZLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsb0RBQWlCLEdBQWpCLFVBQWtCLEtBQXVCO1lBQXpDLGlCQUlDO1lBSEMsSUFBTSxPQUFPLEdBQUcsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQTNCLENBQTJCLENBQUM7aUJBQzVELE1BQU0sQ0FBQyxVQUFDLE1BQU0sSUFBNEIsT0FBQSxNQUFNLEtBQUssSUFBSSxFQUFmLENBQWUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCwyREFBd0IsR0FBeEIsVUFBeUIsS0FBdUI7WUFBaEQsaUJBa0RDO1lBakRDLElBQU0sT0FBTyxHQUFHLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5ELDZGQUE2RjtZQUM3RiwwRkFBMEY7WUFDMUYsbUJBQW1CO1lBQ25CLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUM3QixVQUFDLE1BQU07Z0JBQ0gsT0FBQSxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTO1lBQWhFLENBQWdFLENBQUMsQ0FBQztZQUMxRSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDN0IscUNBQXFDO2dCQUNyQyxJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUV0QyxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXpELDRGQUE0RjtnQkFDNUYsZ0NBQWdDO2dCQUVoQyxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO2dCQUN6QyxJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztnQkFFaEMsaUZBQWlGO2dCQUNqRix3RkFBd0Y7Z0JBQ3hGLDZGQUE2RjtnQkFDN0YsNENBQTRDO2dCQUM1QyxJQUFJLFFBQVEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM1QyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDdEMsVUFBQSxhQUFhLElBQUksT0FBQSxhQUFhLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFoRCxDQUFnRCxDQUFDLENBQUM7b0JBRXZFLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzlCO3lCQUFNO3dCQUNMLFFBQVEsR0FBRyxJQUFJLENBQUM7cUJBQ2pCO2lCQUNGO2dCQUVELElBQU0sa0JBQWtCLEdBQUcsMkJBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUvRCxPQUFPO29CQUNMLElBQUksTUFBQTtvQkFDSixRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ25CLGtCQUFrQixvQkFBQTtvQkFDbEIsUUFBUSxFQUFFLGdCQUFnQjtvQkFDMUIsVUFBVSxZQUFBO2lCQUNYLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCx3REFBcUIsR0FBckIsVUFBc0IsRUFBaUI7WUFDckMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFELElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDekIsT0FBTyxZQUFZLENBQUM7YUFDckI7aUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssS0FBSyxFQUFFLEVBQUU7Z0JBQ2xFLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUNsRjtpQkFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxFQUFFO2dCQUM1RSxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDbEY7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUM7UUFFRCxxREFBa0IsR0FBbEIsVUFBbUIsSUFBYTtZQUFoQyxpQkFxQkM7WUFwQkMseUZBQXlGO1lBQ3pGLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7YUFDN0U7WUFDRCxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztZQUUzQyx5RkFBeUY7WUFDekYsV0FBVztZQUNYLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO2dCQUN4QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxZQUFZO2dCQUMxRCxtRUFBbUU7Z0JBQ25FLElBQU0sSUFBSSxHQUFHLEtBQUksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzdELElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtvQkFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNsQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRUQsMENBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsOERBQThEO1lBQzlELDZGQUE2RjtZQUM3RixPQUFPLDhCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCwrQ0FBWSxHQUFaLFVBQWEsS0FBdUI7WUFDbEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDO1FBQ3JELENBQUM7UUFFRCx5REFBc0IsR0FBdEIsVUFBdUIsS0FBdUI7WUFDNUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUQsS0FBSyxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUU7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLGFBQWEsR0FDZixLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLE1BQU0sQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQTdDLENBQTZDLENBQUMsQ0FBQztZQUN4RixJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtnQkFDN0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQztRQUNoQyxDQUFDO1FBRUQsNkRBQTBCLEdBQTFCLFVBQTJCLEVBQWlCO1lBQzFDLDBFQUEwRTtZQUMxRSxJQUFJLE1BQU0sR0FBd0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2RSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELDBEQUF1QixHQUF2QixVQUF3QixJQUFhO1lBQ25DLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dCQUNoRSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU87Z0JBQ0wsSUFBSSxNQUFBO2dCQUNKLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUN2RSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLO29CQUNuQyxJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN2QyxJQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztvQkFDOUMsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCx5REFBc0IsR0FBdEIsVUFBdUIsS0FBdUI7WUFDNUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDakMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sS0FBSyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUVELG1EQUFnQixHQUFoQixVQUFpQixXQUFtQztZQUNsRCxPQUFPLFdBQVcsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDO1FBQ3pDLENBQUM7UUFFRCxvREFBaUIsR0FBakIsVUFBa0IsQ0FBaUI7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQseURBQXNCLEdBQXRCLFVBQXVCLEtBQXVCO1lBQzVDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQztRQUNwQixDQUFDO1FBRUQseURBQXNCLEdBQXRCLFVBQXVCLEtBQXVCO1lBQzVDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQztRQUNwQixDQUFDO1FBRVMsOERBQTJCLEdBQXJDLFVBQXNDLEVBQWlCO1lBQ3JELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEQsSUFBSSxNQUFNLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUztnQkFDekQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxJQUFJLEdBQW1CLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEQsSUFBTSxVQUFVLEdBQUcsOEJBQThCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFeEQsK0RBQStEO1lBQy9ELElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHlGQUF5RjtZQUN6RixJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ25ELDRDQUE0QztnQkFDNUMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUMsQ0FBQztRQUNsRixDQUFDO1FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7O1dBaUJHO1FBQ08sa0VBQStCLEdBQXpDLFVBQ0ksRUFBaUIsRUFBRSxtQkFBdUM7WUFDNUQsSUFBSSxtQkFBbUIsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDOUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDcEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sV0FBVyxHQUNiLGVBQWUsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3ZGLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDcEYsSUFBSSxDQUFDLG9CQUFvQixFQUFFO2dCQUN6QixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzdELElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUMxRCx5REFBeUQ7Z0JBQ3pELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPO2dCQUNMLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsSUFBSTtnQkFDNUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO2FBQ2QsQ0FBQztRQUNKLENBQUM7UUFFRDs7V0FFRztRQUNPLHlEQUFzQixHQUFoQyxVQUFpQyxNQUFpQixFQUFFLFVBQThCO1lBRWhGLHFFQUFxRTtZQUNyRSxJQUFJLGdCQUFnQixHQUE2QixTQUFTLENBQUM7WUFDM0QsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO2dCQUN6QyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7YUFDNUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzlFLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDM0M7WUFDRCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDeEYsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN6RixJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUNqRTtpQkFBTSxJQUFJLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDbkYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN4RixJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7b0JBQzlCLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUNELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQzthQUM5RDtZQUVELElBQU0sVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDeEUsSUFBTSxTQUFTLEdBQ1gsVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JGLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakIsSUFBSSxDQUFDO1lBRVQsK0VBQStFO1lBQy9FLE9BQU8sTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtnQkFDMUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaEQ7WUFFRCxnR0FBZ0c7WUFDaEcsK0NBQStDO1lBQy9DLElBQUksTUFBTSxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtnQkFDekMsT0FBTztvQkFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDN0IsS0FBSyxFQUFFLElBQUk7b0JBQ1gsU0FBUyxXQUFBO29CQUNULFFBQVEsRUFBRSxJQUFJO2lCQUNmLENBQUM7YUFDSDtpQkFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDOUUsT0FBTztvQkFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzVCLEtBQUssRUFBRSxJQUFJO29CQUNYLFNBQVMsV0FBQTtvQkFDVCxRQUFRLEVBQUUsSUFBSTtpQkFDZixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUM7UUFFTyxvREFBaUIsR0FBekIsVUFBMEIsSUFBa0I7WUFDMUMsNkZBQTZGO1lBQzdGLDZGQUE2RjtZQUM3Rix3Q0FBd0M7WUFDeEMsSUFBSSxhQUFhLEdBQWtCLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkQsSUFBSSxJQUFJLEdBQXlCLElBQUksQ0FBQztZQUV0Qyw4QkFBOEI7WUFDOUIsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3RDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDM0MsYUFBYSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUM7YUFDMUM7WUFFRCw0RkFBNEY7WUFDNUYsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyw0QkFBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDekMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO1lBQ2hHLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBRW5FLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLG1CQUFtQixDQUFDLElBQUk7Z0JBQzlCLFVBQVUsRUFBRSxhQUFhO2dCQUN6QixNQUFNLEVBQUUsVUFBVTtnQkFDbEIsSUFBSSxNQUFBO2dCQUNKLElBQUksTUFBQTthQUNMLENBQUM7UUFDSixDQUFDO1FBRU8saURBQWMsR0FBdEIsVUFBdUIsSUFBcUI7WUFDMUMsSUFBSSxJQUFJLEdBQXlCLElBQUksQ0FBQztZQUN0QyxJQUFJLEtBQUssR0FBdUIsSUFBSSxDQUFDO1lBQ3JDLElBQUksSUFBSSxHQUFnQixJQUFJLENBQUM7WUFDN0IsSUFBSSxRQUFRLEdBQXVCLElBQUksQ0FBQztZQUV4QyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxHQUFHLHNCQUFlLENBQUMsUUFBUSxDQUFDO2dCQUNoQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7YUFDbEM7aUJBQU0sSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksR0FBRyxzQkFBZSxDQUFDLE1BQU0sQ0FBQzthQUMvQjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxHQUFHLHNCQUFlLENBQUMsTUFBTSxDQUFDO2FBQy9CO2lCQUFNLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLEdBQUcsc0JBQWUsQ0FBQyxNQUFNLENBQUM7YUFDL0I7aUJBQU0sSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzVDLElBQUksR0FBRyxzQkFBZSxDQUFDLFdBQVcsQ0FBQzthQUNwQztpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksR0FBRyxhQUFhLENBQUM7YUFDdEI7aUJBQU0sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN0QixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzthQUN0QjtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLEtBQUssU0FBUztnQkFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUF4QyxDQUF3QyxDQUFDLENBQUM7WUFFekUsT0FBTztnQkFDTCxJQUFJLE1BQUE7Z0JBQ0osY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLElBQUksTUFBQTtnQkFDSixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJO2dCQUN2QixJQUFJLE1BQUE7Z0JBQ0osUUFBUSxVQUFBO2dCQUNSLFVBQVUsWUFBQTtnQkFDVixLQUFLLE9BQUE7Z0JBQ0wsUUFBUSxVQUFBO2FBQ1QsQ0FBQztRQUNKLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUFyWUQsSUFxWUM7SUFyWVksNERBQXdCO0lBdVlyQyxTQUFnQix3QkFBd0IsQ0FBQyxJQUFvQjtRQUMzRCxJQUFNLEVBQUUsR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztJQUMvQixDQUFDO0lBSEQsNERBR0M7SUFFRCxTQUFnQiw4QkFBOEIsQ0FBQyxJQUFvQjtRQUNqRSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakUsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztTQUMxQjthQUFNLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3pDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQzthQUNsQjtTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBVEQsd0VBU0M7SUFFRCxTQUFnQiw4QkFBOEIsQ0FDMUMsSUFBbUIsRUFBRSxPQUF1QjtRQUM5QyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQThCLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBWSxDQUFDLENBQUM7U0FDM0U7UUFDRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDOUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNuRDtRQUVELElBQUksSUFBSSxHQUF3QixJQUFJLENBQUM7UUFDckMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1lBQzdDLElBQUksR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7U0FDcEM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4RixJQUFJLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQzthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVCLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO2FBQ3pFO1lBQ0QsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0RCxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTO2dCQUN6RCxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQzthQUN2RTtZQUNELElBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlCLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFPLENBQUM7Z0JBQzVCLElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFPLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDbkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2lCQUNyRDtnQkFDRCxPQUFPLEVBQUMsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFDLENBQUM7YUFDdEQ7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7YUFBTTtZQUNMLE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUM7U0FDM0I7SUFDSCxDQUFDO0lBMUNELHdFQTBDQztJQUVELFNBQWdCLDRCQUE0QixDQUFDLE9BQXNCLEVBQUUsSUFBWSxFQUFFLE1BQWU7UUFFaEcsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFoQixDQUFnQixDQUFDO2FBQzVDLEdBQUcsQ0FBQyxVQUFBLE1BQU07WUFDVCxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUM5QixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBQSxHQUFHO2dCQUM3QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO29CQUN2QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUM7aUJBQ3pGO3FCQUFNO29CQUNMLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksTUFBTSxLQUFLLFNBQVMsQ0FBQztpQkFDbEQ7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUMsQ0FBQztRQUM5QixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBQyxLQUFLLElBQThELE9BQUEsS0FBSyxLQUFLLElBQUksRUFBZCxDQUFjLENBQUMsQ0FBQztJQUNsRyxDQUFDO0lBdkJELG9FQXVCQztJQUVELFNBQWdCLFVBQVUsQ0FDdEIsT0FBc0IsRUFBRSxJQUFZLEVBQUUsUUFBeUI7UUFBekIseUJBQUEsRUFBQSxnQkFBeUI7UUFDakUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsTUFBTSxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQXBELENBQW9ELENBQUMsSUFBSSxJQUFJLENBQUM7SUFDOUYsQ0FBQztJQUhELGdDQUdDO0lBRUQsU0FBZ0Isb0JBQW9CLENBQUMsSUFBZ0M7UUFDbkUsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1lBQzFCLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqQyxJQUFNLE1BQUksR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzdDLElBQUksTUFBSSxLQUFLLElBQUksRUFBRTtvQkFDakIsT0FBTztpQkFDUjtnQkFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDakM7aUJBQU0sSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE9BQU87YUFDUjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBaEJELG9EQWdCQztJQUVELFNBQVMsMkJBQTJCLENBQUMsV0FBNkI7UUFFaEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN2QyxNQUFNLElBQUksS0FBSyxDQUNYLHFCQUFtQixFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0NBQWlDLENBQUMsQ0FBQztTQUMxRjtRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFvQjtRQUN6QyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2xCO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBcUI7UUFDakQsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztTQUNsQjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsb0JBQW9CLENBQUMsYUFBK0I7UUFDM0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM3QyxhQUFhLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztTQUNwQztRQUNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN6RSxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLG9CQUFvQixDQUFDLGNBQTJDO1FBQ3ZFLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMvRCxjQUFjLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztTQUM1QztRQUNELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN2RixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyw4QkFBOEIsQ0FBQyxJQUFhO1FBQ25ELE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTyxDQUFDLE1BQU8sQ0FBQyxNQUFPLENBQUMsQ0FBQztZQUM5QixFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDN0YsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGVBQWUsQ0FBQyxJQUFvQixFQUFFLFVBQXlCO1FBQ3RFLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDL0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hFLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ3RvclBhcmFtZXRlciwgRGVjbGFyYXRpb24sIERlY29yYXRvciwgRnVuY3Rpb25EZWZpbml0aW9uLCBJbXBvcnQsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge3R5cGVUb1ZhbHVlfSBmcm9tICcuL3R5cGVfdG9fdmFsdWUnO1xuaW1wb3J0IHtpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiByZWZsZWN0b3IudHMgaW1wbGVtZW50cyBzdGF0aWMgcmVmbGVjdGlvbiBvZiBkZWNsYXJhdGlvbnMgdXNpbmcgdGhlIFR5cGVTY3JpcHQgYHRzLlR5cGVDaGVja2VyYC5cbiAqL1xuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHt9XG5cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgaWYgKGRlY2xhcmF0aW9uLmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCB8fCBkZWNsYXJhdGlvbi5kZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkZWNsYXJhdGlvbi5kZWNvcmF0b3JzLm1hcChkZWNvcmF0b3IgPT4gdGhpcy5fcmVmbGVjdERlY29yYXRvcihkZWNvcmF0b3IpKVxuICAgICAgICAuZmlsdGVyKChkZWMpOiBkZWMgaXMgRGVjb3JhdG9yID0+IGRlYyAhPT0gbnVsbCk7XG4gIH1cblxuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IHRzQ2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoY2xhenopO1xuICAgIHJldHVybiB0c0NsYXp6Lm1lbWJlcnMubWFwKG1lbWJlciA9PiB0aGlzLl9yZWZsZWN0TWVtYmVyKG1lbWJlcikpXG4gICAgICAgIC5maWx0ZXIoKG1lbWJlcik6IG1lbWJlciBpcyBDbGFzc01lbWJlciA9PiBtZW1iZXIgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ3RvclBhcmFtZXRlcltdfG51bGwge1xuICAgIGNvbnN0IHRzQ2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoY2xhenopO1xuXG4gICAgLy8gRmlyc3QsIGZpbmQgdGhlIGNvbnN0cnVjdG9yIHdpdGggYSBgYm9keWAuIFRoZSBjb25zdHJ1Y3RvcnMgd2l0aG91dCBhIGBib2R5YCBhcmUgb3ZlcmxvYWRzXG4gICAgLy8gd2hlcmVhcyB3ZSB3YW50IHRoZSBpbXBsZW1lbnRhdGlvbiBzaW5jZSBpdCdzIHRoZSBvbmUgdGhhdCdsbCBiZSBleGVjdXRlZCBhbmQgd2hpY2ggY2FuXG4gICAgLy8gaGF2ZSBkZWNvcmF0b3JzLlxuICAgIGNvbnN0IGN0b3IgPSB0c0NsYXp6Lm1lbWJlcnMuZmluZChcbiAgICAgICAgKG1lbWJlcik6IG1lbWJlciBpcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uID0+XG4gICAgICAgICAgICB0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obWVtYmVyKSAmJiBtZW1iZXIuYm9keSAhPT0gdW5kZWZpbmVkKTtcbiAgICBpZiAoY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gY3Rvci5wYXJhbWV0ZXJzLm1hcChub2RlID0+IHtcbiAgICAgIC8vIFRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIgaXMgZWFzeS5cbiAgICAgIGNvbnN0IG5hbWUgPSBwYXJhbWV0ZXJOYW1lKG5vZGUubmFtZSk7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgICAvLyBJdCBtYXkgb3IgbWF5IG5vdCBiZSBwb3NzaWJsZSB0byB3cml0ZSBhbiBleHByZXNzaW9uIHRoYXQgcmVmZXJzIHRvIHRoZSB2YWx1ZSBzaWRlIG9mIHRoZVxuICAgICAgLy8gdHlwZSBuYW1lZCBmb3IgdGhlIHBhcmFtZXRlci5cblxuICAgICAgbGV0IG9yaWdpbmFsVHlwZU5vZGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICAgIGxldCB0eXBlTm9kZSA9IG9yaWdpbmFsVHlwZU5vZGU7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzaW1wbGUgbnVsbGFibGUgdW5pb24gdHlwZSBlLmcuIGBmb286IEZvb3xudWxsYFxuICAgICAgLy8gYW5kIGV4dHJhY3QgdGhlIHR5cGUuIE1vcmUgY29tcGxleCB1bmlvbiB0eXBlcyBlLmcuIGBmb286IEZvb3xCYXJgIGFyZSBub3Qgc3VwcG9ydGVkLlxuICAgICAgLy8gV2UgYWxzbyBkb24ndCBuZWVkIHRvIHN1cHBvcnQgYGZvbzogRm9vfHVuZGVmaW5lZGAgYmVjYXVzZSBBbmd1bGFyJ3MgREkgaW5qZWN0cyBgbnVsbGAgZm9yXG4gICAgICAvLyBvcHRpb25hbCB0b2tlcyB0aGF0IGRvbid0IGhhdmUgcHJvdmlkZXJzLlxuICAgICAgaWYgKHR5cGVOb2RlICYmIHRzLmlzVW5pb25UeXBlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgICAgbGV0IGNoaWxkVHlwZU5vZGVzID0gdHlwZU5vZGUudHlwZXMuZmlsdGVyKFxuICAgICAgICAgICAgY2hpbGRUeXBlTm9kZSA9PiBjaGlsZFR5cGVOb2RlLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQpO1xuXG4gICAgICAgIGlmIChjaGlsZFR5cGVOb2Rlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IGNoaWxkVHlwZU5vZGVzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHR5cGVOb2RlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0eXBlVmFsdWVSZWZlcmVuY2UgPSB0eXBlVG9WYWx1ZSh0eXBlTm9kZSwgdGhpcy5jaGVja2VyKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZU5vZGU6IG5vZGUubmFtZSxcbiAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlLFxuICAgICAgICB0eXBlTm9kZTogb3JpZ2luYWxUeXBlTm9kZSxcbiAgICAgICAgZGVjb3JhdG9ycyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0SW1wb3J0ID0gdGhpcy5nZXREaXJlY3RJbXBvcnRPZklkZW50aWZpZXIoaWQpO1xuICAgIGlmIChkaXJlY3RJbXBvcnQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBkaXJlY3RJbXBvcnQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUoaWQucGFyZW50KSAmJiBpZC5wYXJlbnQucmlnaHQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbXBvcnRPZk5hbWVzcGFjZWRJZGVudGlmaWVyKGlkLCBnZXRRdWFsaWZpZWROYW1lUm9vdChpZC5wYXJlbnQpKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiYgaWQucGFyZW50Lm5hbWUgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbXBvcnRPZk5hbWVzcGFjZWRJZGVudGlmaWVyKGlkLCBnZXRGYXJMZWZ0SWRlbnRpZmllcihpZC5wYXJlbnQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG5vZGU6IHRzLk5vZGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgLy8gSW4gVHlwZVNjcmlwdCBjb2RlLCBtb2R1bGVzIGFyZSBvbmx5IHRzLlNvdXJjZUZpbGVzLiBUaHJvdyBpZiB0aGUgbm9kZSBpc24ndCBhIG1vZHVsZS5cbiAgICBpZiAoIXRzLmlzU291cmNlRmlsZShub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBnZXRFeHBvcnRzT2ZNb2R1bGUoKSBjYWxsZWQgb24gbm9uLVNvdXJjZUZpbGUgaW4gVFMgY29kZWApO1xuICAgIH1cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+KCk7XG5cbiAgICAvLyBSZWZsZWN0IHRoZSBtb2R1bGUgdG8gYSBTeW1ib2wsIGFuZCB1c2UgZ2V0RXhwb3J0c09mTW9kdWxlKCkgdG8gZ2V0IGEgbGlzdCBvZiBleHBvcnRlZFxuICAgIC8vIFN5bWJvbHMuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShzeW1ib2wpLmZvckVhY2goZXhwb3J0U3ltYm9sID0+IHtcbiAgICAgIC8vIE1hcCBlYWNoIGV4cG9ydGVkIFN5bWJvbCB0byBhIERlY2xhcmF0aW9uIGFuZCBhZGQgaXQgdG8gdGhlIG1hcC5cbiAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woZXhwb3J0U3ltYm9sLCBudWxsKTtcbiAgICAgIGlmIChkZWNsICE9PSBudWxsKSB7XG4gICAgICAgIG1hcC5zZXQoZXhwb3J0U3ltYm9sLm5hbWUsIGRlY2wpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICAgIC8vIEZvciBvdXIgcHVycG9zZXMsIGNsYXNzZXMgYXJlIFwibmFtZWRcIiB0cy5DbGFzc0RlY2xhcmF0aW9ucztcbiAgICAvLyAoYG5vZGUubmFtZWAgY2FuIGJlIHVuZGVmaW5lZCBpbiB1bm5hbWVkIGRlZmF1bHQgZXhwb3J0czogYGRlZmF1bHQgZXhwb3J0IGNsYXNzIHsgLi4uIH1gKS5cbiAgICByZXR1cm4gaXNOYW1lZENsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gIH1cblxuICBoYXNCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KSAhPT0gbnVsbDtcbiAgfVxuXG4gIGdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikgfHwgdHMuaXNDbGFzc0V4cHJlc3Npb24oY2xhenopKSB8fFxuICAgICAgICBjbGF6ei5oZXJpdGFnZUNsYXVzZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGV4dGVuZHNDbGF1c2UgPVxuICAgICAgICBjbGF6ei5oZXJpdGFnZUNsYXVzZXMuZmluZChjbGF1c2UgPT4gY2xhdXNlLnRva2VuID09PSB0cy5TeW50YXhLaW5kLkV4dGVuZHNLZXl3b3JkKTtcbiAgICBpZiAoZXh0ZW5kc0NsYXVzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZXh0ZW5kc1R5cGUgPSBleHRlbmRzQ2xhdXNlLnR5cGVzWzBdO1xuICAgIGlmIChleHRlbmRzVHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGV4dGVuZHNUeXBlLmV4cHJlc3Npb247XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIFJlc29sdmUgdGhlIGlkZW50aWZpZXIgdG8gYSBTeW1ib2wsIGFuZCByZXR1cm4gdGhlIGRlY2xhcmF0aW9uIG9mIHRoYXQuXG4gICAgbGV0IHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbCwgaWQpO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obm9kZTogdHMuTm9kZSk6IEZ1bmN0aW9uRGVmaW5pdGlvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSAmJiAhdHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSAmJlxuICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGJvZHk6IG5vZGUuYm9keSAhPT0gdW5kZWZpbmVkID8gQXJyYXkuZnJvbShub2RlLmJvZHkuc3RhdGVtZW50cykgOiBudWxsLFxuICAgICAgcGFyYW1ldGVyczogbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBwYXJhbWV0ZXJOYW1lKHBhcmFtLm5hbWUpO1xuICAgICAgICBjb25zdCBpbml0aWFsaXplciA9IHBhcmFtLmluaXRpYWxpemVyIHx8IG51bGw7XG4gICAgICAgIHJldHVybiB7bmFtZSwgbm9kZTogcGFyYW0sIGluaXRpYWxpemVyfTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cblxuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjbGF6ei50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkID8gY2xhenoudHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIHJldHVybiBkZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fCBudWxsO1xuICB9XG5cbiAgZ2V0RHRzRGVjbGFyYXRpb24oXzogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICByZXR1cm4gY2xhenoubmFtZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREaXJlY3RJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuXG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbDogdHMuRGVjbGFyYXRpb24gPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IGltcG9ydERlY2wgPSBnZXRDb250YWluaW5nSW1wb3J0RGVjbGFyYXRpb24oZGVjbCk7XG5cbiAgICAvLyBJZ25vcmUgZGVjbGFyYXRpb25zIHRoYXQgYXJlIGRlZmluZWQgbG9jYWxseSAobm90IGltcG9ydGVkKS5cbiAgICBpZiAoaW1wb3J0RGVjbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gVGhlIG1vZHVsZSBzcGVjaWZpZXIgaXMgZ3VhcmFudGVlZCB0byBiZSBhIHN0cmluZyBsaXRlcmFsLCBzbyB0aGlzIHNob3VsZCBhbHdheXMgcGFzcy5cbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIGhhcHBlbiBpbiBUeXBlU2NyaXB0IEFTVHMuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge2Zyb206IGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyLnRleHQsIG5hbWU6IGdldEV4cG9ydGVkTmFtZShkZWNsLCBpZCl9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGltcG9ydCBpbmZvIGZvciB0aGlzIGlkZW50aWZpZXIgYXMgdGhvdWdoIGl0IGlzIGEgbmFtZXNwYWNlZCBpbXBvcnQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBpZiB0aGUgaWRlbnRpZmllciBpcyB0aGUgYERpcmVjdGl2ZWAgcGFydCBvZiBhIHF1YWxpZmllZCB0eXBlIGNoYWluIGxpa2U6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjb3JlLkRpcmVjdGl2ZVxuICAgKiBgYGBcbiAgICpcbiAgICogdGhlbiBpdCBtaWdodCBiZSB0aGF0IGBjb3JlYCBpcyBhIG5hbWVzcGFjZSBpbXBvcnQgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGltcG9ydCAqIGFzIGNvcmUgZnJvbSAndHNsaWInO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSBUeXBlU2NyaXB0IGlkZW50aWZpZXIgdG8gZmluZCB0aGUgaW1wb3J0IGluZm8gZm9yLlxuICAgKiBAcmV0dXJucyBUaGUgaW1wb3J0IGluZm8gaWYgdGhpcyBpcyBhIG5hbWVzcGFjZWQgaW1wb3J0IG9yIGBudWxsYC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbXBvcnRPZk5hbWVzcGFjZWRJZGVudGlmaWVyKFxuICAgICAgaWQ6IHRzLklkZW50aWZpZXIsIG5hbWVzcGFjZUlkZW50aWZpZXI6IHRzLklkZW50aWZpZXJ8bnVsbCk6IEltcG9ydHxudWxsIHtcbiAgICBpZiAobmFtZXNwYWNlSWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5hbWVzcGFjZVN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5hbWVzcGFjZUlkZW50aWZpZXIpO1xuICAgIGlmICghbmFtZXNwYWNlU3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPVxuICAgICAgICBuYW1lc3BhY2VTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSA/IG5hbWVzcGFjZVN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gOiBudWxsO1xuICAgIGlmICghZGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBuYW1lc3BhY2VEZWNsYXJhdGlvbiA9IHRzLmlzTmFtZXNwYWNlSW1wb3J0KGRlY2xhcmF0aW9uKSA/IGRlY2xhcmF0aW9uIDogbnVsbDtcbiAgICBpZiAoIW5hbWVzcGFjZURlY2xhcmF0aW9uKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnREZWNsYXJhdGlvbiA9IG5hbWVzcGFjZURlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQ7XG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbGFyYXRpb24ubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgLy8gU2hvdWxkIG5vdCBoYXBwZW4gYXMgdGhpcyB3b3VsZCBiZSBpbnZhbGlkIFR5cGVzU2NyaXB0XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZnJvbTogaW1wb3J0RGVjbGFyYXRpb24ubW9kdWxlU3BlY2lmaWVyLnRleHQsXG4gICAgICBuYW1lOiBpZC50ZXh0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIGB0cy5TeW1ib2xgIHRvIGl0cyBkZWNsYXJhdGlvbiwga2VlcGluZyB0cmFjayBvZiB0aGUgYHZpYU1vZHVsZWAgYWxvbmcgdGhlIHdheS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sLCBvcmlnaW5hbElkOiB0cy5JZGVudGlmaWVyfG51bGwpOiBEZWNsYXJhdGlvblxuICAgICAgfG51bGwge1xuICAgIC8vIElmIHRoZSBzeW1ib2wgcG9pbnRzIHRvIGEgU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50LCByZXNvbHZlIGl0LlxuICAgIGxldCB2YWx1ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhbHVlRGVjbGFyYXRpb24gPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhbHVlRGVjbGFyYXRpb24gPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIH1cbiAgICBpZiAodmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBzaG9ydGhhbmRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U2hvcnRoYW5kQXNzaWdubWVudFZhbHVlU3ltYm9sKHZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgaWYgKHNob3J0aGFuZFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzaG9ydGhhbmRTeW1ib2wsIG9yaWdpbmFsSWQpO1xuICAgIH0gZWxzZSBpZiAodmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHRzLmlzRXhwb3J0U3BlY2lmaWVyKHZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0U3BlY2lmaWVyTG9jYWxUYXJnZXRTeW1ib2wodmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICBpZiAodGFyZ2V0U3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHRhcmdldFN5bWJvbCwgb3JpZ2luYWxJZCk7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0SW5mbyA9IG9yaWdpbmFsSWQgJiYgdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIob3JpZ2luYWxJZCk7XG4gICAgY29uc3QgdmlhTW9kdWxlID1cbiAgICAgICAgaW1wb3J0SW5mbyAhPT0gbnVsbCAmJiBpbXBvcnRJbmZvLmZyb20gIT09IG51bGwgJiYgIWltcG9ydEluZm8uZnJvbS5zdGFydHNXaXRoKCcuJykgP1xuICAgICAgICBpbXBvcnRJbmZvLmZyb20gOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gTm93LCByZXNvbHZlIHRoZSBTeW1ib2wgdG8gaXRzIGRlY2xhcmF0aW9uIGJ5IGZvbGxvd2luZyBhbnkgYW5kIGFsbCBhbGlhc2VzLlxuICAgIHdoaWxlIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSByZXNvbHZlZCBTeW1ib2wncyBkZWNsYXJhdGlvbnMgYW5kIHBpY2sgb25lIG9mIHRoZW0gdG8gcmV0dXJuLiBWYWx1ZSBkZWNsYXJhdGlvbnNcbiAgICAvLyBhcmUgZ2l2ZW4gcHJlY2VkZW5jZSBvdmVyIHR5cGUgZGVjbGFyYXRpb25zLlxuICAgIGlmIChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlOiBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbixcbiAgICAgICAga25vd246IG51bGwsXG4gICAgICAgIHZpYU1vZHVsZSxcbiAgICAgICAgaWRlbnRpdHk6IG51bGwsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZTogc3ltYm9sLmRlY2xhcmF0aW9uc1swXSxcbiAgICAgICAga25vd246IG51bGwsXG4gICAgICAgIHZpYU1vZHVsZSxcbiAgICAgICAgaWRlbnRpdHk6IG51bGwsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZWZsZWN0RGVjb3JhdG9yKG5vZGU6IHRzLkRlY29yYXRvcik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgICAvLyBjYXNlIHdlIHdhbnQgdG8gcmV0dXJuIHRoZSBhcmd1bWVudHMuXG4gICAgbGV0IGRlY29yYXRvckV4cHI6IHRzLkV4cHJlc3Npb24gPSBub2RlLmV4cHJlc3Npb247XG4gICAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXXxudWxsID0gbnVsbDtcblxuICAgIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICBhcmdzID0gQXJyYXkuZnJvbShkZWNvcmF0b3JFeHByLmFyZ3VtZW50cyk7XG4gICAgICBkZWNvcmF0b3JFeHByID0gZGVjb3JhdG9yRXhwci5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaW5hbCByZXNvbHZlZCBkZWNvcmF0b3Igc2hvdWxkIGJlIGEgYHRzLklkZW50aWZpZXJgIC0gaWYgaXQncyBub3QsIHRoZW4gc29tZXRoaW5nIGlzXG4gICAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9IHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSA/IGRlY29yYXRvckV4cHIgOiBkZWNvcmF0b3JFeHByLm5hbWU7XG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHIsXG4gICAgICBpbXBvcnQ6IGltcG9ydERlY2wsXG4gICAgICBub2RlLFxuICAgICAgYXJncyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdE1lbWJlcihub2RlOiB0cy5DbGFzc0VsZW1lbnQpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcblxuICAgIGlmICh0cy5pc1Byb3BlcnR5RGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICB2YWx1ZSA9IG5vZGUuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzR2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5HZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuU2V0dGVyO1xuICAgIH0gZWxzZSBpZiAodHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUubmFtZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICBjb25zdCBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLFxuICAgICAga2luZCxcbiAgICAgIHR5cGU6IG5vZGUudHlwZSB8fCBudWxsLFxuICAgICAgbmFtZSxcbiAgICAgIG5hbWVOb2RlLFxuICAgICAgZGVjb3JhdG9ycyxcbiAgICAgIHZhbHVlLFxuICAgICAgaXNTdGF0aWMsXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgcmV0dXJuIGlkICYmIGlkLnRleHQgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZSB8fCBudWxsO1xuICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24oXG4gICAgdHlwZTogdHMuRW50aXR5TmFtZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB7bm9kZTogdHMuRGVjbGFyYXRpb24sIGZyb206IHN0cmluZ3xudWxsfSB7XG4gIGxldCByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGUpO1xuICBpZiAocmVhbFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSB0eXBlIGVudGl0eSAke3R5cGUuZ2V0VGV4dCgpfSB0byBzeW1ib2xgKTtcbiAgfVxuICB3aGlsZSAocmVhbFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgcmVhbFN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChyZWFsU3ltYm9sKTtcbiAgfVxuXG4gIGxldCBub2RlOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgaWYgKHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgfSBlbHNlIGlmIChyZWFsU3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgIG5vZGUgPSByZWFsU3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5IHN5bWJvbCB0byBkZWNsYXJhdGlvbmApO1xuICB9XG5cbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlKSkge1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKHR5cGUubGVmdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhbmRsZSBxdWFsaWZpZWQgbmFtZSB3aXRoIG5vbi1pZGVudGlmaWVyIGxoc2ApO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZS5sZWZ0KTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHF1YWxpZmllZCB0eXBlIGVudGl0eSBsaHMgdG8gc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICh0cy5pc05hbWVzcGFjZUltcG9ydChkZWNsKSkge1xuICAgICAgY29uc3QgY2xhdXNlID0gZGVjbC5wYXJlbnQhO1xuICAgICAgY29uc3QgaW1wb3J0RGVjbCA9IGNsYXVzZS5wYXJlbnQhO1xuICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIHNwZWNpZmllciBpcyBub3QgYSBzdHJpbmdgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bm9kZSwgZnJvbTogaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBpbXBvcnQgdHlwZT9gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtub2RlLCBmcm9tOiBudWxsfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBuYW1lOiBzdHJpbmcsIG1vZHVsZT86IHN0cmluZyk6XG4gICAge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdIHtcbiAgcmV0dXJuIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljKVxuICAgICAgLm1hcChtZW1iZXIgPT4ge1xuICAgICAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBtZW1iZXIuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHtcbiAgICAgICAgICBpZiAoZGVjLmltcG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlYy5pbXBvcnQubmFtZSA9PT0gbmFtZSAmJiAobW9kdWxlID09PSB1bmRlZmluZWQgfHwgZGVjLmltcG9ydC5mcm9tID09PSBtb2R1bGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjLm5hbWUgPT09IG5hbWUgJiYgbW9kdWxlID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7bWVtYmVyLCBkZWNvcmF0b3JzfTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKCh2YWx1ZSk6IHZhbHVlIGlzIHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX0gPT4gdmFsdWUgIT09IG51bGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZE1lbWJlcihcbiAgICBtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBuYW1lOiBzdHJpbmcsIGlzU3RhdGljOiBib29sZWFuID0gZmFsc2UpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgcmV0dXJuIG1lbWJlcnMuZmluZChtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljID09PSBpc1N0YXRpYyAmJiBtZW1iZXIubmFtZSA9PT0gbmFtZSkgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4oKTtcbiAgbm9kZS5wcm9wZXJ0aWVzLmZvckVhY2gocHJvcCA9PiB7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJvcGVydHlOYW1lVG9TdHJpbmcocHJvcC5uYW1lKTtcbiAgICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG1hcC5zZXQobmFtZSwgcHJvcC5pbml0aWFsaXplcik7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wKSkge1xuICAgICAgbWFwLnNldChwcm9wLm5hbWUudGV4dCwgcHJvcC5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBtYXA7XG59XG5cbmZ1bmN0aW9uIGNhc3REZWNsYXJhdGlvblRvQ2xhc3NPckRpZShkZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFJlZmxlY3Rpbmcgb24gYSAke3RzLlN5bnRheEtpbmRbZGVjbGFyYXRpb24ua2luZF19IGluc3RlYWQgb2YgYSBDbGFzc0RlY2xhcmF0aW9uLmApO1xuICB9XG4gIHJldHVybiBkZWNsYXJhdGlvbjtcbn1cblxuZnVuY3Rpb24gcGFyYW1ldGVyTmFtZShuYW1lOiB0cy5CaW5kaW5nTmFtZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihuYW1lKSkge1xuICAgIHJldHVybiBuYW1lLnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvcGVydHlOYW1lVG9TdHJpbmcobm9kZTogdHMuUHJvcGVydHlOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpIHx8IHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENvbXB1dGUgdGhlIGxlZnQgbW9zdCBpZGVudGlmaWVyIGluIGEgcXVhbGlmaWVkIHR5cGUgY2hhaW4uIEUuZy4gdGhlIGBhYCBvZiBgYS5iLmMuU29tZVR5cGVgLlxuICogQHBhcmFtIHF1YWxpZmllZE5hbWUgVGhlIHN0YXJ0aW5nIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uIGZyb20gd2hpY2ggd2Ugd2FudCB0byBjb21wdXRlXG4gKiB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gdGhlIGNoYWluIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYW4gaWRlbnRpZmllci5cbiAqL1xuZnVuY3Rpb24gZ2V0UXVhbGlmaWVkTmFtZVJvb3QocXVhbGlmaWVkTmFtZTogdHMuUXVhbGlmaWVkTmFtZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHdoaWxlICh0cy5pc1F1YWxpZmllZE5hbWUocXVhbGlmaWVkTmFtZS5sZWZ0KSkge1xuICAgIHF1YWxpZmllZE5hbWUgPSBxdWFsaWZpZWROYW1lLmxlZnQ7XG4gIH1cbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihxdWFsaWZpZWROYW1lLmxlZnQpID8gcXVhbGlmaWVkTmFtZS5sZWZ0IDogbnVsbDtcbn1cblxuLyoqXG4gKiBDb21wdXRlIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllciBpbiBhIHByb3BlcnR5IGFjY2VzcyBjaGFpbi4gRS5nLiB0aGUgYGFgIG9mIGBhLmIuYy5kYC5cbiAqIEBwYXJhbSBwcm9wZXJ0eUFjY2VzcyBUaGUgc3RhcnRpbmcgcHJvcGVydHkgYWNjZXNzIGV4cHJlc3Npb24gZnJvbSB3aGljaCB3ZSB3YW50IHRvIGNvbXB1dGVcbiAqIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllci5cbiAqIEByZXR1cm5zIHRoZSBsZWZ0IG1vc3QgaWRlbnRpZmllciBpbiB0aGUgY2hhaW4gb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhbiBpZGVudGlmaWVyLlxuICovXG5mdW5jdGlvbiBnZXRGYXJMZWZ0SWRlbnRpZmllcihwcm9wZXJ0eUFjY2VzczogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgd2hpbGUgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24pKSB7XG4gICAgcHJvcGVydHlBY2Nlc3MgPSBwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uO1xuICB9XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIocHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbikgPyBwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uIDogbnVsbDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIEltcG9ydERlY2xhcmF0aW9uIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIGlmIGl0IGlzIGVpdGhlciBhbiBgSW1wb3J0U3BlY2lmaWVyYCBvciBhXG4gKiBgTmFtZXNwYWNlSW1wb3J0YC4gSWYgbm90IHJldHVybiBgbnVsbGAuXG4gKi9cbmZ1bmN0aW9uIGdldENvbnRhaW5pbmdJbXBvcnREZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogdHMuSW1wb3J0RGVjbGFyYXRpb258bnVsbCB7XG4gIHJldHVybiB0cy5pc0ltcG9ydFNwZWNpZmllcihub2RlKSA/IG5vZGUucGFyZW50IS5wYXJlbnQhLnBhcmVudCEgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5pc05hbWVzcGFjZUltcG9ydChub2RlKSA/IG5vZGUucGFyZW50LnBhcmVudCA6IG51bGw7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbmFtZSBieSB3aGljaCB0aGUgYGRlY2xgIHdhcyBleHBvcnRlZCwgbm90IGltcG9ydGVkLlxuICogSWYgbm8gc3VjaCBkZWNsYXJhdGlvbiBjYW4gYmUgZm91bmQgKGUuZy4gaXQgaXMgYSBuYW1lc3BhY2UgaW1wb3J0KVxuICogdGhlbiBmYWxsYmFjayB0byB0aGUgYG9yaWdpbmFsSWRgLlxuICovXG5mdW5jdGlvbiBnZXRFeHBvcnRlZE5hbWUoZGVjbDogdHMuRGVjbGFyYXRpb24sIG9yaWdpbmFsSWQ6IHRzLklkZW50aWZpZXIpOiBzdHJpbmcge1xuICByZXR1cm4gdHMuaXNJbXBvcnRTcGVjaWZpZXIoZGVjbCkgP1xuICAgICAgKGRlY2wucHJvcGVydHlOYW1lICE9PSB1bmRlZmluZWQgPyBkZWNsLnByb3BlcnR5TmFtZSA6IGRlY2wubmFtZSkudGV4dCA6XG4gICAgICBvcmlnaW5hbElkLnRleHQ7XG59XG4iXX0=