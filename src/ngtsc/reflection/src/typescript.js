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
                    // It's only valid to convert a type reference to a value reference if the type actually has
                    // a value declaration associated with it.
                    var symbol = _this.checker.getSymbolAtLocation(typeNode.typeName);
                    if (symbol !== undefined) {
                        var resolvedSymbol = symbol;
                        if (symbol.flags & ts.SymbolFlags.Alias) {
                            resolvedSymbol = _this.checker.getAliasedSymbol(symbol);
                        }
                        if (resolvedSymbol.valueDeclaration !== undefined) {
                            // The type points to a valid value declaration. Rewrite the TypeReference into an
                            // Expression which references the value pointed to by the TypeReference, if possible.
                            var firstDecl = symbol.declarations && symbol.declarations[0];
                            if (firstDecl && ts.isImportSpecifier(firstDecl)) {
                                // Making sure TS produces the necessary imports in case a symbol was declared in a
                                // different script and imported. To do that we check symbol's first declaration and
                                // if it's an import - use its identifier. The `Identifier` from the `ImportSpecifier`
                                // knows it could be a value reference, and will emit as one if needed.
                                typeValueExpr = ts.updateIdentifier(firstDecl.name);
                            }
                            else {
                                typeValueExpr = typeNodeToValueExpr(typeNode);
                            }
                        }
                    }
                }
                return {
                    name: name,
                    nameNode: node.name,
                    typeExpression: typeValueExpr,
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyw0RUFBdUk7SUFFdkk7O09BRUc7SUFFSDtRQUNFLGtDQUFzQixPQUF1QjtZQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUFHLENBQUM7UUFFakQsNkRBQTBCLEdBQTFCLFVBQTJCLFdBQTJCO1lBQXRELGlCQU1DO1lBTEMsSUFBSSxXQUFXLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9FLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDO2lCQUM1RSxNQUFNLENBQUMsVUFBQyxHQUFHLElBQXVCLE9BQUEsR0FBRyxLQUFLLElBQUksRUFBWixDQUFZLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsb0RBQWlCLEdBQWpCLFVBQWtCLFdBQTJCO1lBQTdDLGlCQUlDO1lBSEMsSUFBTSxLQUFLLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdkQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLEtBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQTNCLENBQTJCLENBQUM7aUJBQzFELE1BQU0sQ0FBQyxVQUFDLE1BQU0sSUFBNEIsT0FBQSxNQUFNLEtBQUssSUFBSSxFQUFmLENBQWUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCwyREFBd0IsR0FBeEIsVUFBeUIsV0FBMkI7WUFBcEQsaUJBdUVDO1lBdEVDLElBQU0sS0FBSyxHQUFHLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRXZELCtCQUErQjtZQUMvQixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUM3RCxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3RCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtnQkFDN0IscUNBQXFDO2dCQUNyQyxJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUV0QyxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXpELDRGQUE0RjtnQkFDNUYsZ0NBQWdDO2dCQUNoQyxJQUFJLGFBQWEsR0FBdUIsSUFBSSxDQUFDO2dCQUM3QyxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO2dCQUN6QyxJQUFJLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztnQkFFaEMsaUZBQWlGO2dCQUNqRix5RkFBeUY7Z0JBQ3pGLDZGQUE2RjtnQkFDN0YsNENBQTRDO2dCQUM1QyxJQUFJLFFBQVEsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM1QyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDdEMsVUFBQSxhQUFhLElBQUksT0FBQSxhQUFhLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFoRCxDQUFnRCxDQUFDLENBQUM7b0JBRXZFLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzlCO3lCQUFNO3dCQUNMLFFBQVEsR0FBRyxJQUFJLENBQUM7cUJBQ2pCO2lCQUNGO2dCQUVELHlGQUF5RjtnQkFDekYsSUFBSSxRQUFRLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNoRCw0RkFBNEY7b0JBQzVGLDBDQUEwQztvQkFDMUMsSUFBSSxNQUFNLEdBQXdCLEtBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUV0RixJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7d0JBQ3hCLElBQUksY0FBYyxHQUFHLE1BQU0sQ0FBQzt3QkFDNUIsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFOzRCQUN2QyxjQUFjLEdBQUcsS0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQzt5QkFDeEQ7d0JBQ0QsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFOzRCQUNqRCxrRkFBa0Y7NEJBQ2xGLHNGQUFzRjs0QkFDdEYsSUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNoRSxJQUFJLFNBQVMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0NBQ2hELG1GQUFtRjtnQ0FDbkYsb0ZBQW9GO2dDQUNwRixzRkFBc0Y7Z0NBQ3RGLHVFQUF1RTtnQ0FDdkUsYUFBYSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7NkJBQ3JEO2lDQUFNO2dDQUNMLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQzs2QkFDL0M7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7Z0JBRUQsT0FBTztvQkFDTCxJQUFJLE1BQUE7b0JBQ0osUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO29CQUNuQixjQUFjLEVBQUUsYUFBYTtvQkFDN0IsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsWUFBQTtpQkFDdkMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHdEQUFxQixHQUFyQixVQUFzQixFQUFpQjtZQUNyQyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXBELElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVM7Z0JBQ3pELE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDcEMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDZEQUE2RDtZQUM3RCxJQUFNLElBQUksR0FBbUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsNEZBQTRGO1lBQzVGLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFRLENBQUMsTUFBUSxDQUFDLE1BQVEsQ0FBQztZQUVuRCx5RkFBeUY7WUFDekYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUNuRCw0Q0FBNEM7Z0JBQzVDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCw2QkFBNkI7WUFDN0IsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFFN0Msc0VBQXNFO1lBQ3RFLElBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFFcEYsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUM7UUFDdEIsQ0FBQztRQUVELHFEQUFrQixHQUFsQixVQUFtQixJQUFhO1lBQWhDLGlCQXFCQztZQXBCQyx5RkFBeUY7WUFDekYsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELENBQUMsQ0FBQzthQUNsRjtZQUNELElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1lBRTNDLHlGQUF5RjtZQUN6RixXQUFXO1lBQ1gsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0RCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFlBQVk7Z0JBQzFELG1FQUFtRTtnQkFDbkUsSUFBTSxJQUFJLEdBQUcsS0FBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7b0JBQ2pCLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDbEM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVELDBDQUFPLEdBQVAsVUFBUSxJQUFhO1lBQ25CLHdEQUF3RDtZQUN4RCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsK0NBQVksR0FBWixVQUFhLElBQW9CO1lBQy9CLE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUztnQkFDcEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUE3QyxDQUE2QyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELDZEQUEwQixHQUExQixVQUEyQixFQUFpQjtZQUMxQywwRUFBMEU7WUFDMUUsSUFBSSxNQUFNLEdBQXdCLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkUsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFO2dCQUN4QixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELDBEQUF1QixHQUF2QixVQUMrQyxJQUFPO1lBQ3BELE9BQU87Z0JBQ0wsSUFBSSxNQUFBO2dCQUNKLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUN2RSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLO29CQUNuQyxJQUFNLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN2QyxJQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztvQkFDOUMsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQztnQkFDMUMsQ0FBQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCx5REFBc0IsR0FBdEIsVUFBdUIsS0FBcUI7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDakMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sS0FBSyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUVELG1EQUFnQixHQUFoQixVQUFpQixXQUFtQztZQUNsRCxPQUFPLFdBQVcsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDO1FBQ3pDLENBQUM7UUFFRCxvREFBaUIsR0FBakIsVUFBa0IsQ0FBaUIsSUFBeUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTFFOzs7O1dBSUc7UUFDTyx5REFBc0IsR0FBaEMsVUFBaUMsTUFBaUI7WUFDaEQscUVBQXFFO1lBQ3JFLElBQUksTUFBTSxDQUFDLGdCQUFnQixLQUFLLFNBQVM7Z0JBQ3JDLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDN0QsSUFBTSxlQUFlLEdBQ2pCLElBQUksQ0FBQyxPQUFPLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQzVFLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtvQkFDakMsT0FBTyxJQUFJLENBQUM7aUJBQ2I7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFJLFNBQVMsR0FBZ0IsSUFBSSxDQUFDO1lBQ2xDLDJGQUEyRjtZQUMzRixjQUFjO1lBQ2QsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3ZFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDbkQsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTO3dCQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTt3QkFDL0Usd0RBQXdEO3dCQUN4RCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7d0JBQzdDLGlEQUFpRDt3QkFDakQsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBRTs0QkFDbEQsZ0ZBQWdGOzRCQUNoRiw4REFBOEQ7NEJBQzlELElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDOzRCQUN4RCxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQ0FDcEMsU0FBUyxHQUFHLGVBQWUsQ0FBQztnQ0FDNUIsTUFBTTs2QkFDUDt5QkFDRjtxQkFDRjtpQkFDRjthQUNGO1lBRUQsK0VBQStFO1lBQy9FLE9BQU8sTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtnQkFDMUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaEQ7WUFFRCxnR0FBZ0c7WUFDaEcsK0NBQStDO1lBQy9DLElBQUksTUFBTSxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtnQkFDekMsT0FBTztvQkFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDN0IsU0FBUyxXQUFBO2lCQUNWLENBQUM7YUFDSDtpQkFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDOUUsT0FBTztvQkFDTCxJQUFJLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzVCLFNBQVMsV0FBQTtpQkFDVixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUM7YUFDYjtRQUNILENBQUM7UUFFTyxvREFBaUIsR0FBekIsVUFBMEIsSUFBa0I7WUFDMUMsNkZBQTZGO1lBQzdGLDZGQUE2RjtZQUM3Rix3Q0FBd0M7WUFDeEMsSUFBSSxhQUFhLEdBQWtCLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDbkQsSUFBSSxJQUFJLEdBQXlCLElBQUksQ0FBQztZQUV0Qyw4QkFBOEI7WUFDOUIsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3RDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDM0MsYUFBYSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUM7YUFDMUM7WUFFRCw0RkFBNEY7WUFDNUYsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUNuQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTdELE9BQU87Z0JBQ0wsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJO2dCQUN4QixVQUFVLEVBQUUsYUFBYTtnQkFDekIsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLE1BQUEsRUFBRSxJQUFJLE1BQUE7YUFDL0IsQ0FBQztRQUNKLENBQUM7UUFFTyxpREFBYyxHQUF0QixVQUF1QixJQUFxQjtZQUMxQyxJQUFJLElBQUksR0FBeUIsSUFBSSxDQUFDO1lBQ3RDLElBQUksS0FBSyxHQUF1QixJQUFJLENBQUM7WUFDckMsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQztZQUM3QixJQUFJLFFBQVEsR0FBdUIsSUFBSSxDQUFDO1lBRXhDLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxJQUFJLEdBQUcsc0JBQWUsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQzthQUNsQztpQkFBTSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxHQUFHLHNCQUFlLENBQUMsTUFBTSxDQUFDO2FBQy9CO2lCQUFNLElBQUksRUFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM1QyxJQUFJLEdBQUcsc0JBQWUsQ0FBQyxNQUFNLENBQUM7YUFDL0I7aUJBQU0sSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZDLElBQUksR0FBRyxzQkFBZSxDQUFDLE1BQU0sQ0FBQzthQUMvQjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDNUMsSUFBSSxHQUFHLHNCQUFlLENBQUMsV0FBVyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckMsSUFBSSxHQUFHLGFBQWEsQ0FBQzthQUN0QjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ3RCLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ3RCO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO2dCQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQXhDLENBQXdDLENBQUMsQ0FBQztZQUV6RSxPQUFPO2dCQUNMLElBQUksTUFBQTtnQkFDSixjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksTUFBQTtnQkFDMUIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksTUFBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLFVBQVUsWUFBQSxFQUFFLEtBQUssT0FBQSxFQUFFLFFBQVEsVUFBQTthQUNyRSxDQUFDO1FBQ0osQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQWhVRCxJQWdVQztJQWhVWSw0REFBd0I7SUFrVXJDLFNBQWdCLHdCQUF3QixDQUFDLElBQW9CO1FBQzNELElBQU0sRUFBRSxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFIRCw0REFHQztJQUVELFNBQWdCLDhCQUE4QixDQUFDLElBQW9CO1FBQ2pFLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqRSxPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO1NBQzFCO2FBQU0sSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2xCO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFURCx3RUFTQztJQUVELFNBQWdCLDhCQUE4QixDQUMxQyxJQUFtQixFQUFFLE9BQXVCO1FBQzlDLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFZLENBQUMsQ0FBQztTQUMzRTtRQUNELE9BQU8sVUFBVSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtZQUM5QyxVQUFVLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ25EO1FBRUQsSUFBSSxJQUFJLEdBQXdCLElBQUksQ0FBQztRQUNyQyxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7WUFDN0MsSUFBSSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztTQUNwQzthQUFNLElBQUksVUFBVSxDQUFDLFlBQVksS0FBSyxTQUFTLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3hGLElBQUksR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25DO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7U0FDckU7UUFFRCxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7YUFDekU7WUFDRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RELElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVM7Z0JBQ3pELE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0QsSUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQVEsQ0FBQztnQkFDN0IsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQVEsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFO29CQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7aUJBQ3JEO2dCQUNELE9BQU8sRUFBQyxJQUFJLE1BQUEsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUMsQ0FBQzthQUN0RDtpQkFBTTtnQkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7YUFDekM7U0FDRjthQUFNO1lBQ0wsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQztTQUMzQjtJQUNILENBQUM7SUExQ0Qsd0VBMENDO0lBRUQsU0FBZ0IsNEJBQTRCLENBQUMsT0FBc0IsRUFBRSxJQUFZLEVBQUUsTUFBZTtRQUVoRyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQWhCLENBQWdCLENBQUM7YUFDNUMsR0FBRyxDQUFDLFVBQUEsTUFBTTtZQUNULElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUc7Z0JBQzdDLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUU7b0JBQ3ZCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQztpQkFDekY7cUJBQU07b0JBQ0wsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssU0FBUyxDQUFDO2lCQUNsRDtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDM0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sRUFBQyxNQUFNLFFBQUEsRUFBRSxVQUFVLFlBQUEsRUFBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQzthQUNELE1BQU0sQ0FBQyxVQUFDLEtBQUssSUFBOEQsT0FBQSxLQUFLLEtBQUssSUFBSSxFQUFkLENBQWMsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUF2QkQsb0VBdUJDO0lBRUQsU0FBZ0IsVUFBVSxDQUN0QixPQUFzQixFQUFFLElBQVksRUFBRSxRQUF5QjtRQUF6Qix5QkFBQSxFQUFBLGdCQUF5QjtRQUNqRSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLElBQUksRUFBcEQsQ0FBb0QsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUM5RixDQUFDO0lBSEQsZ0NBR0M7SUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxJQUFnQztRQUNuRSxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7WUFDMUIsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pDLElBQU0sTUFBSSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxNQUFJLEtBQUssSUFBSSxFQUFFO29CQUNqQixPQUFPO2lCQUNSO2dCQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUNqQztpQkFBTSxJQUFJLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBTzthQUNSO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFoQkQsb0RBZ0JDO0lBRUQsU0FBUywyQkFBMkIsQ0FBQyxXQUEyQjtRQUM5RCxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gscUJBQW1CLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQ0FBaUMsQ0FBQyxDQUFDO1NBQzFGO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLElBQW9CO1FBQ3pDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDbEI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBRUQsU0FBZ0IsbUJBQW1CLENBQUMsSUFBaUI7UUFDbkQsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEMsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDekM7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBTkQsa0RBTUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQW1CO1FBQzVDLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QixJQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQ3pFO2FBQU0sSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hDLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQzthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQXFCO1FBQ2pELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDbEI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIEltcG9ydCwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdCc7XG5cbi8qKlxuICogcmVmbGVjdG9yLnRzIGltcGxlbWVudHMgc3RhdGljIHJlZmxlY3Rpb24gb2YgZGVjbGFyYXRpb25zIHVzaW5nIHRoZSBUeXBlU2NyaXB0IGB0cy5UeXBlQ2hlY2tlcmAuXG4gKi9cblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIFJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7fVxuXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGlmIChkZWNsYXJhdGlvbi5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHRoaXMuX3JlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yKSlcbiAgICAgICAgLmZpbHRlcigoZGVjKTogZGVjIGlzIERlY29yYXRvciA9PiBkZWMgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb24pO1xuICAgIHJldHVybiBjbGF6ei5tZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fcmVmbGVjdE1lbWJlcihtZW1iZXIpKVxuICAgICAgICAuZmlsdGVyKChtZW1iZXIpOiBtZW1iZXIgaXMgQ2xhc3NNZW1iZXIgPT4gbWVtYmVyICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb24pO1xuXG4gICAgLy8gRmlyc3QsIGZpbmQgdGhlIGNvbnN0cnVjdG9yLlxuICAgIGNvbnN0IGN0b3IgPSBjbGF6ei5tZW1iZXJzLmZpbmQodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKTtcbiAgICBpZiAoY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gY3Rvci5wYXJhbWV0ZXJzLm1hcChub2RlID0+IHtcbiAgICAgIC8vIFRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIgaXMgZWFzeS5cbiAgICAgIGNvbnN0IG5hbWUgPSBwYXJhbWV0ZXJOYW1lKG5vZGUubmFtZSk7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgICAvLyBJdCBtYXkgb3IgbWF5IG5vdCBiZSBwb3NzaWJsZSB0byB3cml0ZSBhbiBleHByZXNzaW9uIHRoYXQgcmVmZXJzIHRvIHRoZSB2YWx1ZSBzaWRlIG9mIHRoZVxuICAgICAgLy8gdHlwZSBuYW1lZCBmb3IgdGhlIHBhcmFtZXRlci5cbiAgICAgIGxldCB0eXBlVmFsdWVFeHByOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgICAgbGV0IG9yaWdpbmFsVHlwZU5vZGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICAgIGxldCB0eXBlTm9kZSA9IG9yaWdpbmFsVHlwZU5vZGU7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzaW1wbGUgbnVsbGFibGUgdW5pb24gdHlwZSBlLmcuIGBmb286IEZvb3xudWxsYFxuICAgICAgLy8gYW5kIGV4dHJhY3QgdGhlIHR5cGUuIE1vcmUgY29tcGxleHQgdW5pb24gdHlwZXMgZS5nLiBgZm9vOiBGb298QmFyYCBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgIC8vIFdlIGFsc28gZG9uJ3QgbmVlZCB0byBzdXBwb3J0IGBmb286IEZvb3x1bmRlZmluZWRgIGJlY2F1c2UgQW5ndWxhcidzIERJIGluamVjdHMgYG51bGxgIGZvclxuICAgICAgLy8gb3B0aW9uYWwgdG9rZXMgdGhhdCBkb24ndCBoYXZlIHByb3ZpZGVycy5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1VuaW9uVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICAgIGxldCBjaGlsZFR5cGVOb2RlcyA9IHR5cGVOb2RlLnR5cGVzLmZpbHRlcihcbiAgICAgICAgICAgIGNoaWxkVHlwZU5vZGUgPT4gY2hpbGRUeXBlTm9kZS5raW5kICE9PSB0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkKTtcblxuICAgICAgICBpZiAoY2hpbGRUeXBlTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgdHlwZU5vZGUgPSBjaGlsZFR5cGVOb2Rlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gZ2V0IGEgdmFsdWUgZXhwcmVzc2lvbiBpZiB0aGUgcGFyYW1ldGVyIGRvZXNuJ3QgZXZlbiBoYXZlIGEgdHlwZS5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgICAvLyBJdCdzIG9ubHkgdmFsaWQgdG8gY29udmVydCBhIHR5cGUgcmVmZXJlbmNlIHRvIGEgdmFsdWUgcmVmZXJlbmNlIGlmIHRoZSB0eXBlIGFjdHVhbGx5IGhhc1xuICAgICAgICAvLyBhIHZhbHVlIGRlY2xhcmF0aW9uIGFzc29jaWF0ZWQgd2l0aCBpdC5cbiAgICAgICAgbGV0IHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGVOb2RlLnR5cGVOYW1lKTtcblxuICAgICAgICBpZiAoc3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBsZXQgcmVzb2x2ZWRTeW1ib2wgPSBzeW1ib2w7XG4gICAgICAgICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICAgICAgICByZXNvbHZlZFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyZXNvbHZlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFRoZSB0eXBlIHBvaW50cyB0byBhIHZhbGlkIHZhbHVlIGRlY2xhcmF0aW9uLiBSZXdyaXRlIHRoZSBUeXBlUmVmZXJlbmNlIGludG8gYW5cbiAgICAgICAgICAgIC8vIEV4cHJlc3Npb24gd2hpY2ggcmVmZXJlbmNlcyB0aGUgdmFsdWUgcG9pbnRlZCB0byBieSB0aGUgVHlwZVJlZmVyZW5jZSwgaWYgcG9zc2libGUuXG4gICAgICAgICAgICBjb25zdCBmaXJzdERlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICAgICAgICBpZiAoZmlyc3REZWNsICYmIHRzLmlzSW1wb3J0U3BlY2lmaWVyKGZpcnN0RGVjbCkpIHtcbiAgICAgICAgICAgICAgLy8gTWFraW5nIHN1cmUgVFMgcHJvZHVjZXMgdGhlIG5lY2Vzc2FyeSBpbXBvcnRzIGluIGNhc2UgYSBzeW1ib2wgd2FzIGRlY2xhcmVkIGluIGFcbiAgICAgICAgICAgICAgLy8gZGlmZmVyZW50IHNjcmlwdCBhbmQgaW1wb3J0ZWQuIFRvIGRvIHRoYXQgd2UgY2hlY2sgc3ltYm9sJ3MgZmlyc3QgZGVjbGFyYXRpb24gYW5kXG4gICAgICAgICAgICAgIC8vIGlmIGl0J3MgYW4gaW1wb3J0IC0gdXNlIGl0cyBpZGVudGlmaWVyLiBUaGUgYElkZW50aWZpZXJgIGZyb20gdGhlIGBJbXBvcnRTcGVjaWZpZXJgXG4gICAgICAgICAgICAgIC8vIGtub3dzIGl0IGNvdWxkIGJlIGEgdmFsdWUgcmVmZXJlbmNlLCBhbmQgd2lsbCBlbWl0IGFzIG9uZSBpZiBuZWVkZWQuXG4gICAgICAgICAgICAgIHR5cGVWYWx1ZUV4cHIgPSB0cy51cGRhdGVJZGVudGlmaWVyKGZpcnN0RGVjbC5uYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHR5cGVWYWx1ZUV4cHIgPSB0eXBlTm9kZVRvVmFsdWVFeHByKHR5cGVOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZU5vZGU6IG5vZGUubmFtZSxcbiAgICAgICAgdHlwZUV4cHJlc3Npb246IHR5cGVWYWx1ZUV4cHIsXG4gICAgICAgIHR5cGVOb2RlOiBvcmlnaW5hbFR5cGVOb2RlLCBkZWNvcmF0b3JzLFxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG5cbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZ25vcmUgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGxvY2FsbHkgKG5vdCBpbXBvcnRlZCkuXG4gICAgY29uc3QgZGVjbDogdHMuRGVjbGFyYXRpb24gPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICghdHMuaXNJbXBvcnRTcGVjaWZpZXIoZGVjbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdhbGsgYmFjayBmcm9tIHRoZSBzcGVjaWZpZXIgdG8gZmluZCB0aGUgZGVjbGFyYXRpb24sIHdoaWNoIGNhcnJpZXMgdGhlIG1vZHVsZSBzcGVjaWZpZXIuXG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IGRlY2wucGFyZW50ICEucGFyZW50ICEucGFyZW50ICE7XG5cbiAgICAvLyBUaGUgbW9kdWxlIHNwZWNpZmllciBpcyBndWFyYW50ZWVkIHRvIGJlIGEgc3RyaW5nIGxpdGVyYWwsIHNvIHRoaXMgc2hvdWxkIGFsd2F5cyBwYXNzLlxuICAgIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgLy8gTm90IGFsbG93ZWQgdG8gaGFwcGVuIGluIFR5cGVTY3JpcHQgQVNUcy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJlYWQgdGhlIG1vZHVsZSBzcGVjaWZpZXIuXG4gICAgY29uc3QgZnJvbSA9IGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyLnRleHQ7XG5cbiAgICAvLyBDb21wdXRlIHRoZSBuYW1lIGJ5IHdoaWNoIHRoZSBkZWNvcmF0b3Igd2FzIGV4cG9ydGVkLCBub3QgaW1wb3J0ZWQuXG4gICAgY29uc3QgbmFtZSA9IChkZWNsLnByb3BlcnR5TmFtZSAhPT0gdW5kZWZpbmVkID8gZGVjbC5wcm9wZXJ0eU5hbWUgOiBkZWNsLm5hbWUpLnRleHQ7XG5cbiAgICByZXR1cm4ge2Zyb20sIG5hbWV9O1xuICB9XG5cbiAgZ2V0RXhwb3J0c09mTW9kdWxlKG5vZGU6IHRzLk5vZGUpOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj58bnVsbCB7XG4gICAgLy8gSW4gVHlwZVNjcmlwdCBjb2RlLCBtb2R1bGVzIGFyZSBvbmx5IHRzLlNvdXJjZUZpbGVzLiBUaHJvdyBpZiB0aGUgbm9kZSBpc24ndCBhIG1vZHVsZS5cbiAgICBpZiAoIXRzLmlzU291cmNlRmlsZShub2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBnZXREZWNsYXJhdGlvbnNPZk1vZHVsZSgpIGNhbGxlZCBvbiBub24tU291cmNlRmlsZSBpbiBUUyBjb2RlYCk7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4oKTtcblxuICAgIC8vIFJlZmxlY3QgdGhlIG1vZHVsZSB0byBhIFN5bWJvbCwgYW5kIHVzZSBnZXRFeHBvcnRzT2ZNb2R1bGUoKSB0byBnZXQgYSBsaXN0IG9mIGV4cG9ydGVkXG4gICAgLy8gU3ltYm9scy5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlKTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHN5bWJvbCkuZm9yRWFjaChleHBvcnRTeW1ib2wgPT4ge1xuICAgICAgLy8gTWFwIGVhY2ggZXhwb3J0ZWQgU3ltYm9sIHRvIGEgRGVjbGFyYXRpb24gYW5kIGFkZCBpdCB0byB0aGUgbWFwLlxuICAgICAgY29uc3QgZGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChleHBvcnRTeW1ib2wpO1xuICAgICAgaWYgKGRlY2wgIT09IG51bGwpIHtcbiAgICAgICAgbWFwLnNldChleHBvcnRTeW1ib2wubmFtZSwgZGVjbCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuTmFtZWREZWNsYXJhdGlvbiB7XG4gICAgLy8gSW4gVHlwZVNjcmlwdCBjb2RlLCBjbGFzc2VzIGFyZSB0cy5DbGFzc0RlY2xhcmF0aW9ucy5cbiAgICByZXR1cm4gdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICB9XG5cbiAgaGFzQmFzZUNsYXNzKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmhlcml0YWdlQ2xhdXNlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIG5vZGUuaGVyaXRhZ2VDbGF1c2VzLnNvbWUoY2xhdXNlID0+IGNsYXVzZS50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCk7XG4gIH1cblxuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIFJlc29sdmUgdGhlIGlkZW50aWZpZXIgdG8gYSBTeW1ib2wsIGFuZCByZXR1cm4gdGhlIGRlY2xhcmF0aW9uIG9mIHRoYXQuXG4gICAgbGV0IHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICBnZXREZWZpbml0aW9uT2ZGdW5jdGlvbjxUIGV4dGVuZHMgdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuRnVuY3Rpb25FeHByZXNzaW9uPihub2RlOiBUKTogRnVuY3Rpb25EZWZpbml0aW9uPFQ+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGJvZHk6IG5vZGUuYm9keSAhPT0gdW5kZWZpbmVkID8gQXJyYXkuZnJvbShub2RlLmJvZHkuc3RhdGVtZW50cykgOiBudWxsLFxuICAgICAgcGFyYW1ldGVyczogbm9kZS5wYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBwYXJhbWV0ZXJOYW1lKHBhcmFtLm5hbWUpO1xuICAgICAgICBjb25zdCBpbml0aWFsaXplciA9IHBhcmFtLmluaXRpYWxpemVyIHx8IG51bGw7XG4gICAgICAgIHJldHVybiB7bmFtZSwgbm9kZTogcGFyYW0sIGluaXRpYWxpemVyfTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cblxuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gY2xhenoudHlwZVBhcmFtZXRlcnMgIT09IHVuZGVmaW5lZCA/IGNsYXp6LnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gIH1cblxuICBnZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICByZXR1cm4gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgfVxuXG4gIGdldER0c0RlY2xhcmF0aW9uKF86IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7IHJldHVybiBudWxsOyB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYSBgdHMuU3ltYm9sYCB0byBpdHMgZGVjbGFyYXRpb24sIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGB2aWFNb2R1bGVgIGFsb25nIHRoZSB3YXkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICAvLyBJZiB0aGUgc3ltYm9sIHBvaW50cyB0byBhIFNob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudCwgcmVzb2x2ZSBpdC5cbiAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICB0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IHNob3J0aGFuZFN5bWJvbCA9XG4gICAgICAgICAgdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICBpZiAoc2hvcnRoYW5kU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHNob3J0aGFuZFN5bWJvbCk7XG4gICAgfVxuICAgIGxldCB2aWFNb2R1bGU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICAvLyBMb29rIHRocm91Z2ggdGhlIFN5bWJvbCdzIGltbWVkaWF0ZSBkZWNsYXJhdGlvbnMsIGFuZCBzZWUgaWYgYW55IG9mIHRoZW0gYXJlIGltcG9ydC10eXBlXG4gICAgLy8gc3RhdGVtZW50cy5cbiAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zW2ldO1xuICAgICAgICBpZiAodHMuaXNJbXBvcnRTcGVjaWZpZXIoZGVjbCkgJiYgZGVjbC5wYXJlbnQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgZGVjbC5wYXJlbnQucGFyZW50ICE9PSB1bmRlZmluZWQgJiYgZGVjbC5wYXJlbnQucGFyZW50LnBhcmVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gRmluZCB0aGUgSW1wb3J0RGVjbGFyYXRpb24gdGhhdCBpbXBvcnRlZCB0aGlzIFN5bWJvbC5cbiAgICAgICAgICBjb25zdCBpbXBvcnREZWNsID0gZGVjbC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICAgICAgICAvLyBUaGUgbW9kdWxlU3BlY2lmaWVyIHNob3VsZCBhbHdheXMgYmUgYSBzdHJpbmcuXG4gICAgICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGVTcGVjaWZpZXIgaXMgYWJzb2x1dGUuIElmIGl0IGlzLCB0aGlzIHN5bWJvbCBjb21lcyBmcm9tIGFuXG4gICAgICAgICAgICAvLyBleHRlcm5hbCBtb2R1bGUsIGFuZCB0aGUgaW1wb3J0IHBhdGggYmVjb21lcyB0aGUgdmlhTW9kdWxlLlxuICAgICAgICAgICAgY29uc3QgbW9kdWxlU3BlY2lmaWVyID0gaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dDtcbiAgICAgICAgICAgIGlmICghbW9kdWxlU3BlY2lmaWVyLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICAgICAgICB2aWFNb2R1bGUgPSBtb2R1bGVTcGVjaWZpZXI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdywgcmVzb2x2ZSB0aGUgU3ltYm9sIHRvIGl0cyBkZWNsYXJhdGlvbiBieSBmb2xsb3dpbmcgYW55IGFuZCBhbGwgYWxpYXNlcy5cbiAgICB3aGlsZSAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBhdCB0aGUgcmVzb2x2ZWQgU3ltYm9sJ3MgZGVjbGFyYXRpb25zIGFuZCBwaWNrIG9uZSBvZiB0aGVtIHRvIHJldHVybi4gVmFsdWUgZGVjbGFyYXRpb25zXG4gICAgLy8gYXJlIGdpdmVuIHByZWNlZGVuY2Ugb3ZlciB0eXBlIGRlY2xhcmF0aW9ucy5cbiAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbm9kZTogc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sXG4gICAgICAgIHZpYU1vZHVsZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlOiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdLFxuICAgICAgICB2aWFNb2R1bGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZWZsZWN0RGVjb3JhdG9yKG5vZGU6IHRzLkRlY29yYXRvcik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgICAvLyBjYXNlIHdlIHdhbnQgdG8gcmV0dXJuIHRoZSBhcmd1bWVudHMuXG4gICAgbGV0IGRlY29yYXRvckV4cHI6IHRzLkV4cHJlc3Npb24gPSBub2RlLmV4cHJlc3Npb247XG4gICAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXXxudWxsID0gbnVsbDtcblxuICAgIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICBhcmdzID0gQXJyYXkuZnJvbShkZWNvcmF0b3JFeHByLmFyZ3VtZW50cyk7XG4gICAgICBkZWNvcmF0b3JFeHByID0gZGVjb3JhdG9yRXhwci5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaW5hbCByZXNvbHZlZCBkZWNvcmF0b3Igc2hvdWxkIGJlIGEgYHRzLklkZW50aWZpZXJgIC0gaWYgaXQncyBub3QsIHRoZW4gc29tZXRoaW5nIGlzXG4gICAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvckV4cHIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvckV4cHIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHIsXG4gICAgICBpbXBvcnQ6IGltcG9ydERlY2wsIG5vZGUsIGFyZ3MsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlZmxlY3RNZW1iZXIobm9kZTogdHMuQ2xhc3NFbGVtZW50KTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAodHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgdmFsdWUgPSBub2RlLmluaXRpYWxpemVyIHx8IG51bGw7XG4gICAgfSBlbHNlIGlmICh0cy5pc0dldEFjY2Vzc29yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuR2V0dGVyO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTZXRBY2Nlc3NvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlcjtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuTWV0aG9kO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBuYW1lID0gJ2NvbnN0cnVjdG9yJztcbiAgICB9IGVsc2UgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpKSB7XG4gICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG4gICAgY29uc3QgaXNTdGF0aWMgPSBub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIG5vZGUubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogbm9kZSwga2luZCxcbiAgICAgIHR5cGU6IG5vZGUudHlwZSB8fCBudWxsLCBuYW1lLCBuYW1lTm9kZSwgZGVjb3JhdG9ycywgdmFsdWUsIGlzU3RhdGljLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgaWQgPSByZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbCk7XG4gIHJldHVybiBpZCAmJiBpZC50ZXh0IHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpIHx8IHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWUgfHwgbnVsbDtcbiAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICAgIHJldHVybiBkZWNsLm5hbWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKFxuICAgIHR5cGU6IHRzLkVudGl0eU5hbWUsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKToge25vZGU6IHRzLkRlY2xhcmF0aW9uLCBmcm9tOiBzdHJpbmcgfCBudWxsfSB7XG4gIGxldCByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGUpO1xuICBpZiAocmVhbFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSB0eXBlIGVudGl0eSAke3R5cGUuZ2V0VGV4dCgpfSB0byBzeW1ib2xgKTtcbiAgfVxuICB3aGlsZSAocmVhbFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgcmVhbFN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChyZWFsU3ltYm9sKTtcbiAgfVxuXG4gIGxldCBub2RlOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgaWYgKHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgfSBlbHNlIGlmIChyZWFsU3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgIG5vZGUgPSByZWFsU3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5IHN5bWJvbCB0byBkZWNsYXJhdGlvbmApO1xuICB9XG5cbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlKSkge1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKHR5cGUubGVmdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhbmRsZSBxdWFsaWZpZWQgbmFtZSB3aXRoIG5vbi1pZGVudGlmaWVyIGxoc2ApO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZS5sZWZ0KTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHF1YWxpZmllZCB0eXBlIGVudGl0eSBsaHMgdG8gc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICh0cy5pc05hbWVzcGFjZUltcG9ydChkZWNsKSkge1xuICAgICAgY29uc3QgY2xhdXNlID0gZGVjbC5wYXJlbnQgITtcbiAgICAgIGNvbnN0IGltcG9ydERlY2wgPSBjbGF1c2UucGFyZW50ICE7XG4gICAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgc3BlY2lmaWVyIGlzIG5vdCBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtub2RlLCBmcm9tOiBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0fTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGltcG9ydCB0eXBlP2ApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge25vZGUsIGZyb206IG51bGx9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgbW9kdWxlPzogc3RyaW5nKTpcbiAgICB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10ge1xuICByZXR1cm4gbWVtYmVycy5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMpXG4gICAgICAubWFwKG1lbWJlciA9PiB7XG4gICAgICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IG1lbWJlci5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4ge1xuICAgICAgICAgIGlmIChkZWMuaW1wb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjLmltcG9ydC5uYW1lID09PSBuYW1lICYmIChtb2R1bGUgPT09IHVuZGVmaW5lZCB8fCBkZWMuaW1wb3J0LmZyb20gPT09IG1vZHVsZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWMubmFtZSA9PT0gbmFtZSAmJiBtb2R1bGUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHttZW1iZXIsIGRlY29yYXRvcnN9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoKHZhbHVlKTogdmFsdWUgaXMge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfSA9PiB2YWx1ZSAhPT0gbnVsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWVtYmVyKFxuICAgIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgaXNTdGF0aWM6IGJvb2xlYW4gPSBmYWxzZSk6IENsYXNzTWVtYmVyfG51bGwge1xuICByZXR1cm4gbWVtYmVycy5maW5kKG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMgPT09IGlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBuYW1lKSB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPigpO1xuICBub2RlLnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcm9wZXJ0eU5hbWVUb1N0cmluZyhwcm9wLm5hbWUpO1xuICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbWFwLnNldChuYW1lLCBwcm9wLmluaXRpYWxpemVyKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBtYXAuc2V0KHByb3AubmFtZS50ZXh0LCBwcm9wLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBSZWZsZWN0aW5nIG9uIGEgJHt0cy5TeW50YXhLaW5kW2RlY2xhcmF0aW9uLmtpbmRdfSBpbnN0ZWFkIG9mIGEgQ2xhc3NEZWNsYXJhdGlvbi5gKTtcbiAgfVxuICByZXR1cm4gZGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIHBhcmFtZXRlck5hbWUobmFtZTogdHMuQmluZGluZ05hbWUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICByZXR1cm4gbmFtZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICByZXR1cm4gZW50aXR5TmFtZVRvVmFsdWUobm9kZS50eXBlTmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW50aXR5TmFtZVRvVmFsdWUobm9kZTogdHMuRW50aXR5TmFtZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICBjb25zdCBsZWZ0ID0gZW50aXR5TmFtZVRvVmFsdWUobm9kZS5sZWZ0KTtcbiAgICByZXR1cm4gbGVmdCAhPT0gbnVsbCA/IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGxlZnQsIG5vZGUucmlnaHQpIDogbnVsbDtcbiAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICByZXR1cm4gdHMuZ2V0TXV0YWJsZUNsb25lKG5vZGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5TmFtZVRvU3RyaW5nKG5vZGU6IHRzLlByb3BlcnR5TmFtZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgIHJldHVybiBub2RlLnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==