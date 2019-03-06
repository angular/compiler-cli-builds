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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/typescript", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/reflection/src/host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/host");
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
        TypeScriptReflectionHost.prototype.getMembersOfClass = function (declaration) {
            var _this = this;
            var clazz = castDeclarationToClassOrDie(declaration);
            return clazz.members.map(function (member) { return _this._reflectMember(member); })
                .filter(function (member) { return member !== null; });
        };
        TypeScriptReflectionHost.prototype.getConstructorParameters = function (declaration) {
            var _this = this;
            var clazz = castDeclarationToClassOrDie(declaration);
            // First, find the constructor.
            var ctor = clazz.members.find(ts.isConstructorDeclaration);
            if (ctor === undefined) {
                return null;
            }
            return ctor.parameters.map(function (node) {
                // The name of the parameter is easy.
                var name = parameterName(node.name);
                var decorators = _this.getDecoratorsOfDeclaration(node);
                // It may or may not be possible to write an expression that refers to the value side of the
                // type named for the parameter.
                var typeValueExpr = null;
                var originalTypeNode = node.type || null;
                var typeNode = originalTypeNode;
                // Check if we are dealing with a simple nullable union type e.g. `foo: Foo|null`
                // and extract the type. More complext union types e.g. `foo: Foo|Bar` are not supported.
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
                // It's not possible to get a value expression if the parameter doesn't even have a type.
                if (typeNode && ts.isTypeReferenceNode(typeNode)) {
                    var symbols = resolveTypeSymbols(typeNode, _this.checker);
                    if (symbols !== null) {
                        var local = symbols.local, decl = symbols.decl;
                        // It's only valid to convert a type reference to a value reference if the type actually
                        // has a value declaration associated with it.
                        if (decl.valueDeclaration !== undefined) {
                            // The type points to a valid value declaration. Rewrite the TypeReference into an
                            // Expression which references the value pointed to by the TypeReference, if possible.
                            // Look at the local `ts.Symbol`'s declarations and see if it comes from an import
                            // statement. If so, extract the module specifier and the name of the imported type.
                            var firstDecl = local.declarations && local.declarations[0];
                            if (firstDecl && ts.isImportSpecifier(firstDecl)) {
                                // The symbol was imported by name, in a ts.ImportSpecifier.
                                var name_1 = (firstDecl.propertyName || firstDecl.name).text;
                                var moduleSpecifier = firstDecl.parent.parent.parent.moduleSpecifier;
                                if (!ts.isStringLiteral(moduleSpecifier)) {
                                    throw new Error('not a module specifier');
                                }
                                var moduleName = moduleSpecifier.text;
                                typeValueExpr = {
                                    local: false,
                                    name: name_1,
                                    moduleName: moduleName,
                                    valueDeclaration: decl.valueDeclaration,
                                };
                            }
                            else if (firstDecl && ts.isNamespaceImport(firstDecl) && symbols.importName !== null) {
                                // The symbol was imported via a namespace import. In this case, the name to use when
                                // importing it was extracted by resolveTypeSymbols.
                                var name_2 = symbols.importName;
                                var moduleSpecifier = firstDecl.parent.parent.moduleSpecifier;
                                if (!ts.isStringLiteral(moduleSpecifier)) {
                                    throw new Error('not a module specifier');
                                }
                                var moduleName = moduleSpecifier.text;
                                typeValueExpr = {
                                    local: false,
                                    name: name_2,
                                    moduleName: moduleName,
                                    valueDeclaration: decl.valueDeclaration,
                                };
                            }
                            else {
                                var expression = typeNodeToValueExpr(typeNode);
                                if (expression !== null) {
                                    typeValueExpr = {
                                        local: true,
                                        expression: expression,
                                    };
                                }
                            }
                        }
                    }
                }
                return {
                    name: name,
                    nameNode: node.name,
                    typeValueReference: typeValueExpr,
                    typeNode: originalTypeNode, decorators: decorators,
                };
            });
        };
        TypeScriptReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var symbol = this.checker.getSymbolAtLocation(id);
            if (symbol === undefined || symbol.declarations === undefined ||
                symbol.declarations.length !== 1) {
                return null;
            }
            // Ignore decorators that are defined locally (not imported).
            var decl = symbol.declarations[0];
            if (!ts.isImportSpecifier(decl)) {
                return null;
            }
            // Walk back from the specifier to find the declaration, which carries the module specifier.
            var importDecl = decl.parent.parent.parent;
            // The module specifier is guaranteed to be a string literal, so this should always pass.
            if (!ts.isStringLiteral(importDecl.moduleSpecifier)) {
                // Not allowed to happen in TypeScript ASTs.
                return null;
            }
            // Read the module specifier.
            var from = importDecl.moduleSpecifier.text;
            // Compute the name by which the decorator was exported, not imported.
            var name = (decl.propertyName !== undefined ? decl.propertyName : decl.name).text;
            return { from: from, name: name };
        };
        TypeScriptReflectionHost.prototype.getExportsOfModule = function (node) {
            var _this = this;
            // In TypeScript code, modules are only ts.SourceFiles. Throw if the node isn't a module.
            if (!ts.isSourceFile(node)) {
                throw new Error("getDeclarationsOfModule() called on non-SourceFile in TS code");
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
                var decl = _this.getDeclarationOfSymbol(exportSymbol);
                if (decl !== null) {
                    map.set(exportSymbol.name, decl);
                }
            });
            return map;
        };
        TypeScriptReflectionHost.prototype.isClass = function (node) {
            // In TypeScript code, classes are ts.ClassDeclarations.
            return ts.isClassDeclaration(node);
        };
        TypeScriptReflectionHost.prototype.hasBaseClass = function (node) {
            return ts.isClassDeclaration(node) && node.heritageClauses !== undefined &&
                node.heritageClauses.some(function (clause) { return clause.token === ts.SyntaxKind.ExtendsKeyword; });
        };
        TypeScriptReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            // Resolve the identifier to a Symbol, and return the declaration of that.
            var symbol = this.checker.getSymbolAtLocation(id);
            if (symbol === undefined) {
                return null;
            }
            return this.getDeclarationOfSymbol(symbol);
        };
        TypeScriptReflectionHost.prototype.getDefinitionOfFunction = function (node) {
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
        TypeScriptReflectionHost.prototype.getDtsDeclaration = function (_) { return null; };
        /**
         * Resolve a `ts.Symbol` to its declaration, keeping track of the `viaModule` along the way.
         *
         * @internal
         */
        TypeScriptReflectionHost.prototype.getDeclarationOfSymbol = function (symbol) {
            // If the symbol points to a ShorthandPropertyAssignment, resolve it.
            if (symbol.valueDeclaration !== undefined &&
                ts.isShorthandPropertyAssignment(symbol.valueDeclaration)) {
                var shorthandSymbol = this.checker.getShorthandAssignmentValueSymbol(symbol.valueDeclaration);
                if (shorthandSymbol === undefined) {
                    return null;
                }
                return this.getDeclarationOfSymbol(shorthandSymbol);
            }
            var viaModule = null;
            // Look through the Symbol's immediate declarations, and see if any of them are import-type
            // statements.
            if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
                for (var i = 0; i < symbol.declarations.length; i++) {
                    var decl = symbol.declarations[i];
                    if (ts.isImportSpecifier(decl) && decl.parent !== undefined &&
                        decl.parent.parent !== undefined && decl.parent.parent.parent !== undefined) {
                        // Find the ImportDeclaration that imported this Symbol.
                        var importDecl = decl.parent.parent.parent;
                        // The moduleSpecifier should always be a string.
                        if (ts.isStringLiteral(importDecl.moduleSpecifier)) {
                            // Check if the moduleSpecifier is absolute. If it is, this symbol comes from an
                            // external module, and the import path becomes the viaModule.
                            var moduleSpecifier = importDecl.moduleSpecifier.text;
                            if (!moduleSpecifier.startsWith('.')) {
                                viaModule = moduleSpecifier;
                                break;
                            }
                        }
                    }
                }
            }
            // Now, resolve the Symbol to its declaration by following any and all aliases.
            while (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = this.checker.getAliasedSymbol(symbol);
            }
            // Look at the resolved Symbol's declarations and pick one of them to return. Value declarations
            // are given precedence over type declarations.
            if (symbol.valueDeclaration !== undefined) {
                return {
                    node: symbol.valueDeclaration,
                    viaModule: viaModule,
                };
            }
            else if (symbol.declarations !== undefined && symbol.declarations.length > 0) {
                return {
                    node: symbol.declarations[0],
                    viaModule: viaModule,
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
            if (!ts.isIdentifier(decoratorExpr)) {
                return null;
            }
            var importDecl = this.getImportOfIdentifier(decoratorExpr);
            return {
                name: decoratorExpr.text,
                identifier: decoratorExpr,
                import: importDecl, node: node, args: args,
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
                implementation: node, kind: kind,
                type: node.type || null, name: name, nameNode: nameNode, decorators: decorators, value: value, isStatic: isStatic,
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
                var name_3 = propertyNameToString(prop.name);
                if (name_3 === null) {
                    return;
                }
                map.set(name_3, prop.initializer);
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
    function typeNodeToValueExpr(node) {
        if (ts.isTypeReferenceNode(node)) {
            return entityNameToValue(node.typeName);
        }
        else {
            return null;
        }
    }
    exports.typeNodeToValueExpr = typeNodeToValueExpr;
    function entityNameToValue(node) {
        if (ts.isQualifiedName(node)) {
            var left = entityNameToValue(node.left);
            return left !== null ? ts.createPropertyAccess(left, node.right) : null;
        }
        else if (ts.isIdentifier(node)) {
            return ts.getMutableClone(node);
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
     * Resolve a `TypeReference` node to the `ts.Symbol`s for both its declaration and its local source.
     *
     * In the event that the `TypeReference` refers to a locally declared symbol, these will be the
     * same. If the `TypeReference` refers to an imported symbol, then `decl` will be the fully resolved
     * `ts.Symbol` of the referenced symbol. `local` will be the `ts.Symbol` of the `ts.Identifer` which
     * points to the import statement by which the symbol was imported.
     */
    function resolveTypeSymbols(typeRef, checker) {
        var typeName = typeRef.typeName;
        // typeRefSymbol is the ts.Symbol of the entire type reference.
        var typeRefSymbol = checker.getSymbolAtLocation(typeName);
        if (typeRefSymbol === undefined) {
            return null;
        }
        // local is the ts.Symbol for the local ts.Identifier for the type.
        // If the type is actually locally declared or is imported by name, for example:
        //   import {Foo} from './foo';
        // then it'll be the same as top. If the type is imported via a namespace import, for example:
        //   import * as foo from './foo';
        // and then referenced as:
        //   constructor(f: foo.Foo)
        // then local will be the ts.Symbol of `foo`, whereas top will be the ts.Symbol of `foo.Foo`.
        // This allows tracking of the import behind whatever type reference exists.
        var local = typeRefSymbol;
        var importName = null;
        if (ts.isQualifiedName(typeName) && ts.isIdentifier(typeName.left) &&
            ts.isIdentifier(typeName.right)) {
            var localTmp = checker.getSymbolAtLocation(typeName.left);
            if (localTmp !== undefined) {
                local = localTmp;
                importName = typeName.right.text;
            }
        }
        // De-alias the top-level type reference symbol to get the symbol of the actual declaration.
        var decl = typeRefSymbol;
        if (typeRefSymbol.flags & ts.SymbolFlags.Alias) {
            decl = checker.getAliasedSymbol(typeRefSymbol);
        }
        return { local: local, decl: decl, importName: importName };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyw0RUFBMko7SUFFM0o7O09BRUc7SUFFSDtRQUNFLGtDQUFzQixPQUF1QjtZQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUFHLENBQUM7UUFFakQsNkRBQTBCLEdBQTFCLFVBQTJCLFdBQTJCO1lBQXRELGlCQU1DO1lBTEMsSUFBSSxXQUFXLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9FLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDO2lCQUM1RSxNQUFNLENBQUMsVUFBQyxHQUFHLElBQXVCLE9BQUEsR0FBRyxLQUFLLElBQUksRUFBWixDQUFZLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsb0RBQWlCLEdBQWpCLFVBQWtCLFdBQTJCO1lBQTdDLGlCQUlDO1lBSEMsSUFBTSxLQUFLLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQTNCLENBQTJCLENBQUM7aUJBQzFELE1BQU0sQ0FBQyxVQUFDLE1BQU0sSUFBNEIsT0FBQSxNQUFNLEtBQUssSUFBSSxFQUFmLENB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Q0FBQztRQUMxQixJQUFJLFVBQVUsR0FBZ0IsSUFBSSxDQUFDO1FBQ25DLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDOUQsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbkMsSUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzFCLEtBQUssR0FBRyxRQUFRLENBQUM7Z0JBQ2pCLFVBQVUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzthQUNsQztTQUNGO1FBRUQsNEZBQTRGO1FBQzVGLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQztRQUN6QixJQUFJLGFBQWEsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDOUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNoRDtRQUNELE9BQU8sRUFBQyxLQUFLLE9BQUEsRUFBRSxJQUFJLE1BQUEsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDO0lBQ25DLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgSW1wb3J0LCBSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlfSBmcm9tICcuL2hvc3QnO1xuXG4vKipcbiAqIHJlZmxlY3Rvci50cyBpbXBsZW1lbnRzIHN0YXRpYyByZWZsZWN0aW9uIG9mIGRlY2xhcmF0aW9ucyB1c2luZyB0aGUgVHlwZVNjcmlwdCBgdHMuVHlwZUNoZWNrZXJgLlxuICovXG5cbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge31cblxuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBpZiAoZGVjbGFyYXRpb24uZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkIHx8IGRlY2xhcmF0aW9uLmRlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uLmRlY29yYXRvcnMubWFwKGRlY29yYXRvciA9PiB0aGlzLl9yZWZsZWN0RGVjb3JhdG9yKGRlY29yYXRvcikpXG4gICAgICAgIC5maWx0ZXIoKGRlYyk6IGRlYyBpcyBEZWNvcmF0b3IgPT4gZGVjICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldE1lbWJlcnNPZkNsYXNzKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gY2xhenoubWVtYmVycy5tYXAobWVtYmVyID0+IHRoaXMuX3JlZmxlY3RNZW1iZXIobWVtYmVyKSlcbiAgICAgICAgLmZpbHRlcigobWVtYmVyKTogbWVtYmVyIGlzIENsYXNzTWVtYmVyID0+IG1lbWJlciAhPT0gbnVsbCk7XG4gIH1cblxuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogQ3RvclBhcmFtZXRlcltdfG51bGwge1xuICAgIGNvbnN0IGNsYXp6ID0gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGRlY2xhcmF0aW9uKTtcblxuICAgIC8vIEZpcnN0LCBmaW5kIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICBjb25zdCBjdG9yID0gY2xhenoubWVtYmVycy5maW5kKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbik7XG4gICAgaWYgKGN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3IucGFyYW1ldGVycy5tYXAobm9kZSA9PiB7XG4gICAgICAvLyBUaGUgbmFtZSBvZiB0aGUgcGFyYW1ldGVyIGlzIGVhc3kuXG4gICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShub2RlLm5hbWUpO1xuXG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgICAgLy8gSXQgbWF5IG9yIG1heSBub3QgYmUgcG9zc2libGUgdG8gd3JpdGUgYW4gZXhwcmVzc2lvbiB0aGF0IHJlZmVycyB0byB0aGUgdmFsdWUgc2lkZSBvZiB0aGVcbiAgICAgIC8vIHR5cGUgbmFtZWQgZm9yIHRoZSBwYXJhbWV0ZXIuXG4gICAgICBsZXQgdHlwZVZhbHVlRXhwcjogVHlwZVZhbHVlUmVmZXJlbmNlfG51bGwgPSBudWxsO1xuICAgICAgbGV0IG9yaWdpbmFsVHlwZU5vZGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICAgIGxldCB0eXBlTm9kZSA9IG9yaWdpbmFsVHlwZU5vZGU7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzaW1wbGUgbnVsbGFibGUgdW5pb24gdHlwZSBlLmcuIGBmb286IEZvb3xudWxsYFxuICAgICAgLy8gYW5kIGV4dHJhY3QgdGhlIHR5cGUuIE1vcmUgY29tcGxleHQgdW5pb24gdHlwZXMgZS5nLiBgZm9vOiBGb298QmFyYCBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgIC8vIFdlIGFsc28gZG9uJ3QgbmVlZCB0byBzdXBwb3J0IGBmb286IEZvb3x1bmRlZmluZWRgIGJlY2F1c2UgQW5ndWxhcidzIERJIGluamVjdHMgYG51bGxgIGZvclxuICAgICAgLy8gb3B0aW9uYWwgdG9rZXMgdGhhdCBkb24ndCBoYXZlIHByb3ZpZGVycy5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1VuaW9uVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICAgIGxldCBjaGlsZFR5cGVOb2RlcyA9IHR5cGVOb2RlLnR5cGVzLmZpbHRlcihcbiAgICAgICAgICAgIGNoaWxkVHlwZU5vZGUgPT4gY2hpbGRUeXBlTm9kZS5raW5kICE9PSB0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkKTtcblxuICAgICAgICBpZiAoY2hpbGRUeXBlTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgdHlwZU5vZGUgPSBjaGlsZFR5cGVOb2Rlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gZ2V0IGEgdmFsdWUgZXhwcmVzc2lvbiBpZiB0aGUgcGFyYW1ldGVyIGRvZXNuJ3QgZXZlbiBoYXZlIGEgdHlwZS5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgICBjb25zdCBzeW1ib2xzID0gcmVzb2x2ZVR5cGVTeW1ib2xzKHR5cGVOb2RlLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICBpZiAoc3ltYm9scyAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IHtsb2NhbCwgZGVjbH0gPSBzeW1ib2xzO1xuICAgICAgICAgIC8vIEl0J3Mgb25seSB2YWxpZCB0byBjb252ZXJ0IGEgdHlwZSByZWZlcmVuY2UgdG8gYSB2YWx1ZSByZWZlcmVuY2UgaWYgdGhlIHR5cGUgYWN0dWFsbHlcbiAgICAgICAgICAvLyBoYXMgYSB2YWx1ZSBkZWNsYXJhdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuXG4gICAgICAgICAgaWYgKGRlY2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBUaGUgdHlwZSBwb2ludHMgdG8gYSB2YWxpZCB2YWx1ZSBkZWNsYXJhdGlvbi4gUmV3cml0ZSB0aGUgVHlwZVJlZmVyZW5jZSBpbnRvIGFuXG4gICAgICAgICAgICAvLyBFeHByZXNzaW9uIHdoaWNoIHJlZmVyZW5jZXMgdGhlIHZhbHVlIHBvaW50ZWQgdG8gYnkgdGhlIFR5cGVSZWZlcmVuY2UsIGlmIHBvc3NpYmxlLlxuXG4gICAgICAgICAgICAvLyBMb29rIGF0IHRoZSBsb2NhbCBgdHMuU3ltYm9sYCdzIGRlY2xhcmF0aW9ucyBhbmQgc2VlIGlmIGl0IGNvbWVzIGZyb20gYW4gaW1wb3J0XG4gICAgICAgICAgICAvLyBzdGF0ZW1lbnQuIElmIHNvLCBleHRyYWN0IHRoZSBtb2R1bGUgc3BlY2lmaWVyIGFuZCB0aGUgbmFtZSBvZiB0aGUgaW1wb3J0ZWQgdHlwZS5cbiAgICAgICAgICAgIGNvbnN0IGZpcnN0RGVjbCA9IGxvY2FsLmRlY2xhcmF0aW9ucyAmJiBsb2NhbC5kZWNsYXJhdGlvbnNbMF07XG5cbiAgICAgICAgICAgIGlmIChmaXJzdERlY2wgJiYgdHMuaXNJbXBvcnRTcGVjaWZpZXIoZmlyc3REZWNsKSkge1xuICAgICAgICAgICAgICAvLyBUaGUgc3ltYm9sIHdhcyBpbXBvcnRlZCBieSBuYW1lLCBpbiBhIHRzLkltcG9ydFNwZWNpZmllci5cbiAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IChmaXJzdERlY2wucHJvcGVydHlOYW1lIHx8IGZpcnN0RGVjbC5uYW1lKS50ZXh0O1xuICAgICAgICAgICAgICBjb25zdCBtb2R1bGVTcGVjaWZpZXIgPSBmaXJzdERlY2wucGFyZW50LnBhcmVudC5wYXJlbnQubW9kdWxlU3BlY2lmaWVyO1xuICAgICAgICAgICAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChtb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub3QgYSBtb2R1bGUgc3BlY2lmaWVyJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IG1vZHVsZVNwZWNpZmllci50ZXh0O1xuICAgICAgICAgICAgICB0eXBlVmFsdWVFeHByID0ge1xuICAgICAgICAgICAgICAgIGxvY2FsOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgIG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAgdmFsdWVEZWNsYXJhdGlvbjogZGVjbC52YWx1ZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICBmaXJzdERlY2wgJiYgdHMuaXNOYW1lc3BhY2VJbXBvcnQoZmlyc3REZWNsKSAmJiBzeW1ib2xzLmltcG9ydE5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQgdmlhIGEgbmFtZXNwYWNlIGltcG9ydC4gSW4gdGhpcyBjYXNlLCB0aGUgbmFtZSB0byB1c2Ugd2hlblxuICAgICAgICAgICAgICAvLyBpbXBvcnRpbmcgaXQgd2FzIGV4dHJhY3RlZCBieSByZXNvbHZlVHlwZVN5bWJvbHMuXG4gICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBzeW1ib2xzLmltcG9ydE5hbWU7XG4gICAgICAgICAgICAgIGNvbnN0IG1vZHVsZVNwZWNpZmllciA9IGZpcnN0RGVjbC5wYXJlbnQucGFyZW50Lm1vZHVsZVNwZWNpZmllcjtcbiAgICAgICAgICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwobW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm90IGEgbW9kdWxlIHNwZWNpZmllcicpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBtb2R1bGVTcGVjaWZpZXIudGV4dDtcbiAgICAgICAgICAgICAgdHlwZVZhbHVlRXhwciA9IHtcbiAgICAgICAgICAgICAgICBsb2NhbDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIHZhbHVlRGVjbGFyYXRpb246IGRlY2wudmFsdWVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0eXBlTm9kZVRvVmFsdWVFeHByKHR5cGVOb2RlKTtcbiAgICAgICAgICAgICAgaWYgKGV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0eXBlVmFsdWVFeHByID0ge1xuICAgICAgICAgICAgICAgICAgbG9jYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICBleHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZU5vZGU6IG5vZGUubmFtZSxcbiAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlOiB0eXBlVmFsdWVFeHByLFxuICAgICAgICB0eXBlTm9kZTogb3JpZ2luYWxUeXBlTm9kZSwgZGVjb3JhdG9ycyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuXG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWdub3JlIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBsb2NhbGx5IChub3QgaW1wb3J0ZWQpLlxuICAgIGNvbnN0IGRlY2w6IHRzLkRlY2xhcmF0aW9uID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBpZiAoIXRzLmlzSW1wb3J0U3BlY2lmaWVyKGRlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXYWxrIGJhY2sgZnJvbSB0aGUgc3BlY2lmaWVyIHRvIGZpbmQgdGhlIGRlY2xhcmF0aW9uLCB3aGljaCBjYXJyaWVzIHRoZSBtb2R1bGUgc3BlY2lmaWVyLlxuICAgIGNvbnN0IGltcG9ydERlY2wgPSBkZWNsLnBhcmVudCAhLnBhcmVudCAhLnBhcmVudCAhO1xuXG4gICAgLy8gVGhlIG1vZHVsZSBzcGVjaWZpZXIgaXMgZ3VhcmFudGVlZCB0byBiZSBhIHN0cmluZyBsaXRlcmFsLCBzbyB0aGlzIHNob3VsZCBhbHdheXMgcGFzcy5cbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgIC8vIE5vdCBhbGxvd2VkIHRvIGhhcHBlbiBpbiBUeXBlU2NyaXB0IEFTVHMuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZWFkIHRoZSBtb2R1bGUgc3BlY2lmaWVyLlxuICAgIGNvbnN0IGZyb20gPSBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0O1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgbmFtZSBieSB3aGljaCB0aGUgZGVjb3JhdG9yIHdhcyBleHBvcnRlZCwgbm90IGltcG9ydGVkLlxuICAgIGNvbnN0IG5hbWUgPSAoZGVjbC5wcm9wZXJ0eU5hbWUgIT09IHVuZGVmaW5lZCA/IGRlY2wucHJvcGVydHlOYW1lIDogZGVjbC5uYW1lKS50ZXh0O1xuXG4gICAgcmV0dXJuIHtmcm9tLCBuYW1lfTtcbiAgfVxuXG4gIGdldEV4cG9ydHNPZk1vZHVsZShub2RlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGwge1xuICAgIC8vIEluIFR5cGVTY3JpcHQgY29kZSwgbW9kdWxlcyBhcmUgb25seSB0cy5Tb3VyY2VGaWxlcy4gVGhyb3cgaWYgdGhlIG5vZGUgaXNuJ3QgYSBtb2R1bGUuXG4gICAgaWYgKCF0cy5pc1NvdXJjZUZpbGUobm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZ2V0RGVjbGFyYXRpb25zT2ZNb2R1bGUoKSBjYWxsZWQgb24gbm9uLVNvdXJjZUZpbGUgaW4gVFMgY29kZWApO1xuICAgIH1cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjbGFyYXRpb24+KCk7XG5cbiAgICAvLyBSZWZsZWN0IHRoZSBtb2R1bGUgdG8gYSBTeW1ib2wsIGFuZCB1c2UgZ2V0RXhwb3J0c09mTW9kdWxlKCkgdG8gZ2V0IGEgbGlzdCBvZiBleHBvcnRlZFxuICAgIC8vIFN5bWJvbHMuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShzeW1ib2wpLmZvckVhY2goZXhwb3J0U3ltYm9sID0+IHtcbiAgICAgIC8vIE1hcCBlYWNoIGV4cG9ydGVkIFN5bWJvbCB0byBhIERlY2xhcmF0aW9uIGFuZCBhZGQgaXQgdG8gdGhlIG1hcC5cbiAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woZXhwb3J0U3ltYm9sKTtcbiAgICAgIGlmIChkZWNsICE9PSBudWxsKSB7XG4gICAgICAgIG1hcC5zZXQoZXhwb3J0U3ltYm9sLm5hbWUsIGRlY2wpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24ge1xuICAgIC8vIEluIFR5cGVTY3JpcHQgY29kZSwgY2xhc3NlcyBhcmUgdHMuQ2xhc3NEZWNsYXJhdGlvbnMuXG4gICAgcmV0dXJuIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKTtcbiAgfVxuXG4gIGhhc0Jhc2VDbGFzcyhub2RlOiB0cy5EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgJiYgbm9kZS5oZXJpdGFnZUNsYXVzZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBub2RlLmhlcml0YWdlQ2xhdXNlcy5zb21lKGNsYXVzZSA9PiBjbGF1c2UudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQpO1xuICB9XG5cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBSZXNvbHZlIHRoZSBpZGVudGlmaWVyIHRvIGEgU3ltYm9sLCBhbmQgcmV0dXJuIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGF0LlxuICAgIGxldCBzeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb248VCBleHRlbmRzIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4obm9kZTogVCk6IEZ1bmN0aW9uRGVmaW5pdGlvbjxUPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBib2R5OiBub2RlLmJvZHkgIT09IHVuZGVmaW5lZCA/IEFycmF5LmZyb20obm9kZS5ib2R5LnN0YXRlbWVudHMpIDogbnVsbCxcbiAgICAgIHBhcmFtZXRlcnM6IG5vZGUucGFyYW1ldGVycy5tYXAocGFyYW0gPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gcGFyYW1ldGVyTmFtZShwYXJhbS5uYW1lKTtcbiAgICAgICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBwYXJhbS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgICAgICByZXR1cm4ge25hbWUsIG5vZGU6IHBhcmFtLCBpbml0aWFsaXplcn07XG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGNsYXp6LnR5cGVQYXJhbWV0ZXJzICE9PSB1bmRlZmluZWQgPyBjbGF6ei50eXBlUGFyYW1ldGVycy5sZW5ndGggOiAwO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uLmluaXRpYWxpemVyIHx8IG51bGw7XG4gIH1cblxuICBnZXREdHNEZWNsYXJhdGlvbihfOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufG51bGwgeyByZXR1cm4gbnVsbDsgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uLCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBgdmlhTW9kdWxlYCBhbG9uZyB0aGUgd2F5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgLy8gSWYgdGhlIHN5bWJvbCBwb2ludHMgdG8gYSBTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQsIHJlc29sdmUgaXQuXG4gICAgaWYgKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBjb25zdCBzaG9ydGhhbmRTeW1ib2wgPVxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTaG9ydGhhbmRBc3NpZ25tZW50VmFsdWVTeW1ib2woc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgaWYgKHNob3J0aGFuZFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzaG9ydGhhbmRTeW1ib2wpO1xuICAgIH1cbiAgICBsZXQgdmlhTW9kdWxlOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgLy8gTG9vayB0aHJvdWdoIHRoZSBTeW1ib2wncyBpbW1lZGlhdGUgZGVjbGFyYXRpb25zLCBhbmQgc2VlIGlmIGFueSBvZiB0aGVtIGFyZSBpbXBvcnQtdHlwZVxuICAgIC8vIHN0YXRlbWVudHMuXG4gICAgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBkZWNsID0gc3ltYm9sLmRlY2xhcmF0aW9uc1tpXTtcbiAgICAgICAgaWYgKHRzLmlzSW1wb3J0U3BlY2lmaWVyKGRlY2wpICYmIGRlY2wucGFyZW50ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGRlY2wucGFyZW50LnBhcmVudCAhPT0gdW5kZWZpbmVkICYmIGRlY2wucGFyZW50LnBhcmVudC5wYXJlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIEZpbmQgdGhlIEltcG9ydERlY2xhcmF0aW9uIHRoYXQgaW1wb3J0ZWQgdGhpcyBTeW1ib2wuXG4gICAgICAgICAgY29uc3QgaW1wb3J0RGVjbCA9IGRlY2wucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgICAgLy8gVGhlIG1vZHVsZVNwZWNpZmllciBzaG91bGQgYWx3YXlzIGJlIGEgc3RyaW5nLlxuICAgICAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlU3BlY2lmaWVyIGlzIGFic29sdXRlLiBJZiBpdCBpcywgdGhpcyBzeW1ib2wgY29tZXMgZnJvbSBhblxuICAgICAgICAgICAgLy8gZXh0ZXJuYWwgbW9kdWxlLCBhbmQgdGhlIGltcG9ydCBwYXRoIGJlY29tZXMgdGhlIHZpYU1vZHVsZS5cbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZVNwZWNpZmllciA9IGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyLnRleHQ7XG4gICAgICAgICAgICBpZiAoIW1vZHVsZVNwZWNpZmllci5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICAgICAgdmlhTW9kdWxlID0gbW9kdWxlU3BlY2lmaWVyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3csIHJlc29sdmUgdGhlIFN5bWJvbCB0byBpdHMgZGVjbGFyYXRpb24gYnkgZm9sbG93aW5nIGFueSBhbmQgYWxsIGFsaWFzZXMuXG4gICAgd2hpbGUgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHJlc29sdmVkIFN5bWJvbCdzIGRlY2xhcmF0aW9ucyBhbmQgcGljayBvbmUgb2YgdGhlbSB0byByZXR1cm4uIFZhbHVlIGRlY2xhcmF0aW9uc1xuICAgIC8vIGFyZSBnaXZlbiBwcmVjZWRlbmNlIG92ZXIgdHlwZSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uLFxuICAgICAgICB2aWFNb2R1bGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZTogc3ltYm9sLmRlY2xhcmF0aW9uc1swXSxcbiAgICAgICAgdmlhTW9kdWxlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdERlY29yYXRvcihub2RlOiB0cy5EZWNvcmF0b3IpOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBkZWNvcmF0b3IgZXhwcmVzc2lvbiBpbnRvIGEgcmVmZXJlbmNlIHRvIGEgY29uY3JldGUgSWRlbnRpZmllci4gVGhlXG4gICAgLy8gZXhwcmVzc2lvbiBtYXkgY29udGFpbiBhIGNhbGwgdG8gYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRoZSBkZWNvcmF0b3IgZnVuY3Rpb24sIGluIHdoaWNoXG4gICAgLy8gY2FzZSB3ZSB3YW50IHRvIHJldHVybiB0aGUgYXJndW1lbnRzLlxuICAgIGxldCBkZWNvcmF0b3JFeHByOiB0cy5FeHByZXNzaW9uID0gbm9kZS5leHByZXNzaW9uO1xuICAgIGxldCBhcmdzOiB0cy5FeHByZXNzaW9uW118bnVsbCA9IG51bGw7XG5cbiAgICAvLyBDaGVjayBmb3IgY2FsbCBleHByZXNzaW9ucy5cbiAgICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgYXJncyA9IEFycmF5LmZyb20oZGVjb3JhdG9yRXhwci5hcmd1bWVudHMpO1xuICAgICAgZGVjb3JhdG9yRXhwciA9IGRlY29yYXRvckV4cHIuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyBUaGUgZmluYWwgcmVzb2x2ZWQgZGVjb3JhdG9yIHNob3VsZCBiZSBhIGB0cy5JZGVudGlmaWVyYCAtIGlmIGl0J3Mgbm90LCB0aGVuIHNvbWV0aGluZyBpc1xuICAgIC8vIHdyb25nIGFuZCB0aGUgZGVjb3JhdG9yIGNhbid0IGJlIHJlc29sdmVkIHN0YXRpY2FsbHkuXG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydERlY2wgPSB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBkZWNvcmF0b3JFeHByLnRleHQsXG4gICAgICBpZGVudGlmaWVyOiBkZWNvcmF0b3JFeHByLFxuICAgICAgaW1wb3J0OiBpbXBvcnREZWNsLCBub2RlLCBhcmdzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9yZWZsZWN0TWVtYmVyKG5vZGU6IHRzLkNsYXNzRWxlbWVudCk6IENsYXNzTWVtYmVyfG51bGwge1xuICAgIGxldCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCA9IG51bGw7XG4gICAgbGV0IHZhbHVlOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWVOb2RlOiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHRzLmlzUHJvcGVydHlEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIHZhbHVlID0gbm9kZS5pbml0aWFsaXplciB8fCBudWxsO1xuICAgIH0gZWxzZSBpZiAodHMuaXNHZXRBY2Nlc3NvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlcjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5TZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGNvbnN0IGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsIGtpbmQsXG4gICAgICB0eXBlOiBub2RlLnR5cGUgfHwgbnVsbCwgbmFtZSwgbmFtZU5vZGUsIGRlY29yYXRvcnMsIHZhbHVlLCBpc1N0YXRpYyxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IGlkID0gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2wpO1xuICByZXR1cm4gaWQgJiYgaWQudGV4dCB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsKSB8fCB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lIHx8IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgICByZXR1cm4gZGVjbC5uYW1lO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbihcbiAgICB0eXBlOiB0cy5FbnRpdHlOYW1lLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHtub2RlOiB0cy5EZWNsYXJhdGlvbiwgZnJvbTogc3RyaW5nIHwgbnVsbH0ge1xuICBsZXQgcmVhbFN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0eXBlKTtcbiAgaWYgKHJlYWxTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlc29sdmUgdHlwZSBlbnRpdHkgJHt0eXBlLmdldFRleHQoKX0gdG8gc3ltYm9sYCk7XG4gIH1cbiAgd2hpbGUgKHJlYWxTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgIHJlYWxTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2wocmVhbFN5bWJvbCk7XG4gIH1cblxuICBsZXQgbm9kZTogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gIGlmIChyZWFsU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIG5vZGUgPSByZWFsU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIH0gZWxzZSBpZiAocmVhbFN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiByZWFsU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEpIHtcbiAgICBub2RlID0gcmVhbFN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSB0eXBlIGVudGl0eSBzeW1ib2wgdG8gZGVjbGFyYXRpb25gKTtcbiAgfVxuXG4gIGlmICh0cy5pc1F1YWxpZmllZE5hbWUodHlwZSkpIHtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcih0eXBlLmxlZnQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBoYW5kbGUgcXVhbGlmaWVkIG5hbWUgd2l0aCBub24taWRlbnRpZmllciBsaHNgKTtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGUubGVmdCk7XG4gICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSBxdWFsaWZpZWQgdHlwZSBlbnRpdHkgbGhzIHRvIHN5bWJvbGApO1xuICAgIH1cbiAgICBjb25zdCBkZWNsID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBpZiAodHMuaXNOYW1lc3BhY2VJbXBvcnQoZGVjbCkpIHtcbiAgICAgIGNvbnN0IGNsYXVzZSA9IGRlY2wucGFyZW50ICE7XG4gICAgICBjb25zdCBpbXBvcnREZWNsID0gY2xhdXNlLnBhcmVudCAhO1xuICAgICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlIHNwZWNpZmllciBpcyBub3QgYSBzdHJpbmdgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7bm9kZSwgZnJvbTogaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBpbXBvcnQgdHlwZT9gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtub2RlLCBmcm9tOiBudWxsfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBuYW1lOiBzdHJpbmcsIG1vZHVsZT86IHN0cmluZyk6XG4gICAge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdIHtcbiAgcmV0dXJuIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljKVxuICAgICAgLm1hcChtZW1iZXIgPT4ge1xuICAgICAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBtZW1iZXIuZGVjb3JhdG9ycy5maWx0ZXIoZGVjID0+IHtcbiAgICAgICAgICBpZiAoZGVjLmltcG9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlYy5pbXBvcnQubmFtZSA9PT0gbmFtZSAmJiAobW9kdWxlID09PSB1bmRlZmluZWQgfHwgZGVjLmltcG9ydC5mcm9tID09PSBtb2R1bGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjLm5hbWUgPT09IG5hbWUgJiYgbW9kdWxlID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7bWVtYmVyLCBkZWNvcmF0b3JzfTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKCh2YWx1ZSk6IHZhbHVlIGlzIHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX0gPT4gdmFsdWUgIT09IG51bGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZE1lbWJlcihcbiAgICBtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBuYW1lOiBzdHJpbmcsIGlzU3RhdGljOiBib29sZWFuID0gZmFsc2UpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgcmV0dXJuIG1lbWJlcnMuZmluZChtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljID09PSBpc1N0YXRpYyAmJiBtZW1iZXIubmFtZSA9PT0gbmFtZSkgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4oKTtcbiAgbm9kZS5wcm9wZXJ0aWVzLmZvckVhY2gocHJvcCA9PiB7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJvcGVydHlOYW1lVG9TdHJpbmcocHJvcC5uYW1lKTtcbiAgICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG1hcC5zZXQobmFtZSwgcHJvcC5pbml0aWFsaXplcik7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wKSkge1xuICAgICAgbWFwLnNldChwcm9wLm5hbWUudGV4dCwgcHJvcC5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBtYXA7XG59XG5cbmZ1bmN0aW9uIGNhc3REZWNsYXJhdGlvblRvQ2xhc3NPckRpZShkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5DbGFzc0RlY2xhcmF0aW9uIHtcbiAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgUmVmbGVjdGluZyBvbiBhICR7dHMuU3ludGF4S2luZFtkZWNsYXJhdGlvbi5raW5kXX0gaW5zdGVhZCBvZiBhIENsYXNzRGVjbGFyYXRpb24uYCk7XG4gIH1cbiAgcmV0dXJuIGRlY2xhcmF0aW9uO1xufVxuXG5mdW5jdGlvbiBwYXJhbWV0ZXJOYW1lKG5hbWU6IHRzLkJpbmRpbmdOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5hbWUpKSB7XG4gICAgcmV0dXJuIG5hbWUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdHlwZU5vZGVUb1ZhbHVlRXhwcihub2RlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGUpKSB7XG4gICAgcmV0dXJuIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUudHlwZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVudGl0eU5hbWVUb1ZhbHVlKG5vZGU6IHRzLkVudGl0eU5hbWUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgY29uc3QgbGVmdCA9IGVudGl0eU5hbWVUb1ZhbHVlKG5vZGUubGVmdCk7XG4gICAgcmV0dXJuIGxlZnQgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhsZWZ0LCBub2RlLnJpZ2h0KSA6IG51bGw7XG4gIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgcmV0dXJuIHRzLmdldE11dGFibGVDbG9uZShub2RlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eU5hbWVUb1N0cmluZyhub2RlOiB0cy5Qcm9wZXJ0eU5hbWUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkgfHwgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpIHx8IHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICByZXR1cm4gbm9kZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIGBUeXBlUmVmZXJlbmNlYCBub2RlIHRvIHRoZSBgdHMuU3ltYm9sYHMgZm9yIGJvdGggaXRzIGRlY2xhcmF0aW9uIGFuZCBpdHMgbG9jYWwgc291cmNlLlxuICpcbiAqIEluIHRoZSBldmVudCB0aGF0IHRoZSBgVHlwZVJlZmVyZW5jZWAgcmVmZXJzIHRvIGEgbG9jYWxseSBkZWNsYXJlZCBzeW1ib2wsIHRoZXNlIHdpbGwgYmUgdGhlXG4gKiBzYW1lLiBJZiB0aGUgYFR5cGVSZWZlcmVuY2VgIHJlZmVycyB0byBhbiBpbXBvcnRlZCBzeW1ib2wsIHRoZW4gYGRlY2xgIHdpbGwgYmUgdGhlIGZ1bGx5IHJlc29sdmVkXG4gKiBgdHMuU3ltYm9sYCBvZiB0aGUgcmVmZXJlbmNlZCBzeW1ib2wuIGBsb2NhbGAgd2lsbCBiZSB0aGUgYHRzLlN5bWJvbGAgb2YgdGhlIGB0cy5JZGVudGlmZXJgIHdoaWNoXG4gKiBwb2ludHMgdG8gdGhlIGltcG9ydCBzdGF0ZW1lbnQgYnkgd2hpY2ggdGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVUeXBlU3ltYm9scyh0eXBlUmVmOiB0cy5UeXBlUmVmZXJlbmNlTm9kZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOlxuICAgIHtsb2NhbDogdHMuU3ltYm9sLCBkZWNsOiB0cy5TeW1ib2wsIGltcG9ydE5hbWU6IHN0cmluZyB8IG51bGx9fG51bGwge1xuICBjb25zdCB0eXBlTmFtZSA9IHR5cGVSZWYudHlwZU5hbWU7XG4gIC8vIHR5cGVSZWZTeW1ib2wgaXMgdGhlIHRzLlN5bWJvbCBvZiB0aGUgZW50aXJlIHR5cGUgcmVmZXJlbmNlLlxuICBjb25zdCB0eXBlUmVmU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGVOYW1lKTtcbiAgaWYgKHR5cGVSZWZTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gbG9jYWwgaXMgdGhlIHRzLlN5bWJvbCBmb3IgdGhlIGxvY2FsIHRzLklkZW50aWZpZXIgZm9yIHRoZSB0eXBlLlxuICAvLyBJZiB0aGUgdHlwZSBpcyBhY3R1YWxseSBsb2NhbGx5IGRlY2xhcmVkIG9yIGlzIGltcG9ydGVkIGJ5IG5hbWUsIGZvciBleGFtcGxlOlxuICAvLyAgIGltcG9ydCB7Rm9vfSBmcm9tICcuL2Zvbyc7XG4gIC8vIHRoZW4gaXQnbGwgYmUgdGhlIHNhbWUgYXMgdG9wLiBJZiB0aGUgdHlwZSBpcyBpbXBvcnRlZCB2aWEgYSBuYW1lc3BhY2UgaW1wb3J0LCBmb3IgZXhhbXBsZTpcbiAgLy8gICBpbXBvcnQgKiBhcyBmb28gZnJvbSAnLi9mb28nO1xuICAvLyBhbmQgdGhlbiByZWZlcmVuY2VkIGFzOlxuICAvLyAgIGNvbnN0cnVjdG9yKGY6IGZvby5Gb28pXG4gIC8vIHRoZW4gbG9jYWwgd2lsbCBiZSB0aGUgdHMuU3ltYm9sIG9mIGBmb29gLCB3aGVyZWFzIHRvcCB3aWxsIGJlIHRoZSB0cy5TeW1ib2wgb2YgYGZvby5Gb29gLlxuICAvLyBUaGlzIGFsbG93cyB0cmFja2luZyBvZiB0aGUgaW1wb3J0IGJlaGluZCB3aGF0ZXZlciB0eXBlIHJlZmVyZW5jZSBleGlzdHMuXG4gIGxldCBsb2NhbCA9IHR5cGVSZWZTeW1ib2w7XG4gIGxldCBpbXBvcnROYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gIGlmICh0cy5pc1F1YWxpZmllZE5hbWUodHlwZU5hbWUpICYmIHRzLmlzSWRlbnRpZmllcih0eXBlTmFtZS5sZWZ0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHR5cGVOYW1lLnJpZ2h0KSkge1xuICAgIGNvbnN0IGxvY2FsVG1wID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGVOYW1lLmxlZnQpO1xuICAgIGlmIChsb2NhbFRtcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBsb2NhbCA9IGxvY2FsVG1wO1xuICAgICAgaW1wb3J0TmFtZSA9IHR5cGVOYW1lLnJpZ2h0LnRleHQ7XG4gICAgfVxuICB9XG5cbiAgLy8gRGUtYWxpYXMgdGhlIHRvcC1sZXZlbCB0eXBlIHJlZmVyZW5jZSBzeW1ib2wgdG8gZ2V0IHRoZSBzeW1ib2wgb2YgdGhlIGFjdHVhbCBkZWNsYXJhdGlvbi5cbiAgbGV0IGRlY2wgPSB0eXBlUmVmU3ltYm9sO1xuICBpZiAodHlwZVJlZlN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgZGVjbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbCh0eXBlUmVmU3ltYm9sKTtcbiAgfVxuICByZXR1cm4ge2xvY2FsLCBkZWNsLCBpbXBvcnROYW1lfTtcbn1cbiJdfQ==