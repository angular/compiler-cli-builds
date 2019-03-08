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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/typescript", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/reflection/src/host", "@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/host");
    var type_to_value_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value");
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
                var typeValueReference = type_to_value_1.typeToValue(typeNode, _this.checker);
                return {
                    name: name,
                    nameNode: node.name, typeValueReference: typeValueReference,
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
    function propertyNameToString(node) {
        if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
            return node.text;
        }
        else {
            return null;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyw0RUFBMko7SUFDM0osOEZBQTRDO0lBRTVDOztPQUVHO0lBRUg7UUFDRSxrQ0FBc0IsT0FBdUI7WUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFBRyxDQUFDO1FBRWpELDZEQUEwQixHQUExQixVQUEyQixXQUEyQjtZQUF0RCxpQkFNQztZQUxDLElBQUksV0FBVyxDQUFDLFVBQVUsS0FBSyxTQUFTLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUMvRSxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBakMsQ0FBaUMsQ0FBQztpQkFDNUUsTUFBTSxDQUFDLFVBQUMsR0FBRyxJQUF1QixPQUFBLEdBQUcsS0FBSyxJQUFJLEVBQVosQ0FBWSxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELG9EQUFpQixHQUFqQixVQUFrQixXQUEyQjtZQUE3QyxpQkFJQztZQUhDLElBQU0sS0FBSyxHQUFHLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQSxNQUFNLElBQUksT0FBQSxLQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUEzQixDQUEyQixDQUFDO2lCQUMxRCxNQUFNLENBQUMsVUFBQyxNQUFNLElBQTRCLE9BQUEsTUFBTSxLQUFL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LENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQXFCO1FBQ2pELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDbEI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBGdW5jdGlvbkRlZmluaXRpb24sIEltcG9ydCwgUmVmbGVjdGlvbkhvc3QsIFR5cGVWYWx1ZVJlZmVyZW5jZX0gZnJvbSAnLi9ob3N0JztcbmltcG9ydCB7dHlwZVRvVmFsdWV9IGZyb20gJy4vdHlwZV90b192YWx1ZSc7XG5cbi8qKlxuICogcmVmbGVjdG9yLnRzIGltcGxlbWVudHMgc3RhdGljIHJlZmxlY3Rpb24gb2YgZGVjbGFyYXRpb25zIHVzaW5nIHRoZSBUeXBlU2NyaXB0IGB0cy5UeXBlQ2hlY2tlcmAuXG4gKi9cblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIFJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7fVxuXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGlmIChkZWNsYXJhdGlvbi5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHRoaXMuX3JlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yKSlcbiAgICAgICAgLmZpbHRlcigoZGVjKTogZGVjIGlzIERlY29yYXRvciA9PiBkZWMgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb24pO1xuICAgIHJldHVybiBjbGF6ei5tZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fcmVmbGVjdE1lbWJlcihtZW1iZXIpKVxuICAgICAgICAuZmlsdGVyKChtZW1iZXIpOiBtZW1iZXIgaXMgQ2xhc3NNZW1iZXIgPT4gbWVtYmVyICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb24pO1xuXG4gICAgLy8gRmlyc3QsIGZpbmQgdGhlIGNvbnN0cnVjdG9yLlxuICAgIGNvbnN0IGN0b3IgPSBjbGF6ei5tZW1iZXJzLmZpbmQodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKTtcbiAgICBpZiAoY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gY3Rvci5wYXJhbWV0ZXJzLm1hcChub2RlID0+IHtcbiAgICAgIC8vIFRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIgaXMgZWFzeS5cbiAgICAgIGNvbnN0IG5hbWUgPSBwYXJhbWV0ZXJOYW1lKG5vZGUubmFtZSk7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgICAvLyBJdCBtYXkgb3IgbWF5IG5vdCBiZSBwb3NzaWJsZSB0byB3cml0ZSBhbiBleHByZXNzaW9uIHRoYXQgcmVmZXJzIHRvIHRoZSB2YWx1ZSBzaWRlIG9mIHRoZVxuICAgICAgLy8gdHlwZSBuYW1lZCBmb3IgdGhlIHBhcmFtZXRlci5cblxuICAgICAgbGV0IG9yaWdpbmFsVHlwZU5vZGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICAgIGxldCB0eXBlTm9kZSA9IG9yaWdpbmFsVHlwZU5vZGU7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYSBzaW1wbGUgbnVsbGFibGUgdW5pb24gdHlwZSBlLmcuIGBmb286IEZvb3xudWxsYFxuICAgICAgLy8gYW5kIGV4dHJhY3QgdGhlIHR5cGUuIE1vcmUgY29tcGxleHQgdW5pb24gdHlwZXMgZS5nLiBgZm9vOiBGb298QmFyYCBhcmUgbm90IHN1cHBvcnRlZC5cbiAgICAgIC8vIFdlIGFsc28gZG9uJ3QgbmVlZCB0byBzdXBwb3J0IGBmb286IEZvb3x1bmRlZmluZWRgIGJlY2F1c2UgQW5ndWxhcidzIERJIGluamVjdHMgYG51bGxgIGZvclxuICAgICAgLy8gb3B0aW9uYWwgdG9rZXMgdGhhdCBkb24ndCBoYXZlIHByb3ZpZGVycy5cbiAgICAgIGlmICh0eXBlTm9kZSAmJiB0cy5pc1VuaW9uVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICAgIGxldCBjaGlsZFR5cGVOb2RlcyA9IHR5cGVOb2RlLnR5cGVzLmZpbHRlcihcbiAgICAgICAgICAgIGNoaWxkVHlwZU5vZGUgPT4gY2hpbGRUeXBlTm9kZS5raW5kICE9PSB0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkKTtcblxuICAgICAgICBpZiAoY2hpbGRUeXBlTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgdHlwZU5vZGUgPSBjaGlsZFR5cGVOb2Rlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0eXBlTm9kZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgdHlwZVZhbHVlUmVmZXJlbmNlID0gdHlwZVRvVmFsdWUodHlwZU5vZGUsIHRoaXMuY2hlY2tlcik7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIG5hbWVOb2RlOiBub2RlLm5hbWUsIHR5cGVWYWx1ZVJlZmVyZW5jZSxcbiAgICAgICAgdHlwZU5vZGU6IG9yaWdpbmFsVHlwZU5vZGUsIGRlY29yYXRvcnMsXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcblxuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElnbm9yZSBkZWNvcmF0b3JzIHRoYXQgYXJlIGRlZmluZWQgbG9jYWxseSAobm90IGltcG9ydGVkKS5cbiAgICBjb25zdCBkZWNsOiB0cy5EZWNsYXJhdGlvbiA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCF0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2FsayBiYWNrIGZyb20gdGhlIHNwZWNpZmllciB0byBmaW5kIHRoZSBkZWNsYXJhdGlvbiwgd2hpY2ggY2FycmllcyB0aGUgbW9kdWxlIHNwZWNpZmllci5cbiAgICBjb25zdCBpbXBvcnREZWNsID0gZGVjbC5wYXJlbnQgIS5wYXJlbnQgIS5wYXJlbnQgITtcblxuICAgIC8vIFRoZSBtb2R1bGUgc3BlY2lmaWVyIGlzIGd1YXJhbnRlZWQgdG8gYmUgYSBzdHJpbmcgbGl0ZXJhbCwgc28gdGhpcyBzaG91bGQgYWx3YXlzIHBhc3MuXG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBOb3QgYWxsb3dlZCB0byBoYXBwZW4gaW4gVHlwZVNjcmlwdCBBU1RzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmVhZCB0aGUgbW9kdWxlIHNwZWNpZmllci5cbiAgICBjb25zdCBmcm9tID0gaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIudGV4dDtcblxuICAgIC8vIENvbXB1dGUgdGhlIG5hbWUgYnkgd2hpY2ggdGhlIGRlY29yYXRvciB3YXMgZXhwb3J0ZWQsIG5vdCBpbXBvcnRlZC5cbiAgICBjb25zdCBuYW1lID0gKGRlY2wucHJvcGVydHlOYW1lICE9PSB1bmRlZmluZWQgPyBkZWNsLnByb3BlcnR5TmFtZSA6IGRlY2wubmFtZSkudGV4dDtcblxuICAgIHJldHVybiB7ZnJvbSwgbmFtZX07XG4gIH1cblxuICBnZXRFeHBvcnRzT2ZNb2R1bGUobm9kZTogdHMuTm9kZSk6IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPnxudWxsIHtcbiAgICAvLyBJbiBUeXBlU2NyaXB0IGNvZGUsIG1vZHVsZXMgYXJlIG9ubHkgdHMuU291cmNlRmlsZXMuIFRocm93IGlmIHRoZSBub2RlIGlzbid0IGEgbW9kdWxlLlxuICAgIGlmICghdHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGdldERlY2xhcmF0aW9uc09mTW9kdWxlKCkgY2FsbGVkIG9uIG5vbi1Tb3VyY2VGaWxlIGluIFRTIGNvZGVgKTtcbiAgICB9XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY2xhcmF0aW9uPigpO1xuXG4gICAgLy8gUmVmbGVjdCB0aGUgbW9kdWxlIHRvIGEgU3ltYm9sLCBhbmQgdXNlIGdldEV4cG9ydHNPZk1vZHVsZSgpIHRvIGdldCBhIGxpc3Qgb2YgZXhwb3J0ZWRcbiAgICAvLyBTeW1ib2xzLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3ltYm9sKS5mb3JFYWNoKGV4cG9ydFN5bWJvbCA9PiB7XG4gICAgICAvLyBNYXAgZWFjaCBleHBvcnRlZCBTeW1ib2wgdG8gYSBEZWNsYXJhdGlvbiBhbmQgYWRkIGl0IHRvIHRoZSBtYXAuXG4gICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKGV4cG9ydFN5bWJvbCk7XG4gICAgICBpZiAoZGVjbCAhPT0gbnVsbCkge1xuICAgICAgICBtYXAuc2V0KGV4cG9ydFN5bWJvbC5uYW1lLCBkZWNsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uIHtcbiAgICAvLyBJbiBUeXBlU2NyaXB0IGNvZGUsIGNsYXNzZXMgYXJlIHRzLkNsYXNzRGVjbGFyYXRpb25zLlxuICAgIHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gIH1cblxuICBoYXNCYXNlQ2xhc3Mobm9kZTogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuaGVyaXRhZ2VDbGF1c2VzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbm9kZS5oZXJpdGFnZUNsYXVzZXMuc29tZShjbGF1c2UgPT4gY2xhdXNlLnRva2VuID09PSB0cy5TeW50YXhLaW5kLkV4dGVuZHNLZXl3b3JkKTtcbiAgfVxuXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgLy8gUmVzb2x2ZSB0aGUgaWRlbnRpZmllciB0byBhIFN5bWJvbCwgYW5kIHJldHVybiB0aGUgZGVjbGFyYXRpb24gb2YgdGhhdC5cbiAgICBsZXQgc3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIGdldERlZmluaXRpb25PZkZ1bmN0aW9uPFQgZXh0ZW5kcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24+KG5vZGU6IFQpOiBGdW5jdGlvbkRlZmluaXRpb248VD4ge1xuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgYm9keTogbm9kZS5ib2R5ICE9PSB1bmRlZmluZWQgPyBBcnJheS5mcm9tKG5vZGUuYm9keS5zdGF0ZW1lbnRzKSA6IG51bGwsXG4gICAgICBwYXJhbWV0ZXJzOiBub2RlLnBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHBhcmFtZXRlck5hbWUocGFyYW0ubmFtZSk7XG4gICAgICAgIGNvbnN0IGluaXRpYWxpemVyID0gcGFyYW0uaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgICAgICAgcmV0dXJuIHtuYW1lLCBub2RlOiBwYXJhbSwgaW5pdGlhbGl6ZXJ9O1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxuXG4gIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBjbGF6ei50eXBlUGFyYW1ldGVycyAhPT0gdW5kZWZpbmVkID8gY2xhenoudHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIHJldHVybiBkZWNsYXJhdGlvbi5pbml0aWFsaXplciB8fCBudWxsO1xuICB9XG5cbiAgZ2V0RHRzRGVjbGFyYXRpb24oXzogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsIHsgcmV0dXJuIG51bGw7IH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIGB0cy5TeW1ib2xgIHRvIGl0cyBkZWNsYXJhdGlvbiwga2VlcGluZyB0cmFjayBvZiB0aGUgYHZpYU1vZHVsZWAgYWxvbmcgdGhlIHdheS5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCk6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIC8vIElmIHRoZSBzeW1ib2wgcG9pbnRzIHRvIGEgU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50LCByZXNvbHZlIGl0LlxuICAgIGlmIChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgY29uc3Qgc2hvcnRoYW5kU3ltYm9sID1cbiAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U2hvcnRoYW5kQXNzaWdubWVudFZhbHVlU3ltYm9sKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChzaG9ydGhhbmRTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woc2hvcnRoYW5kU3ltYm9sKTtcbiAgICB9XG4gICAgbGV0IHZpYU1vZHVsZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgU3ltYm9sJ3MgaW1tZWRpYXRlIGRlY2xhcmF0aW9ucywgYW5kIHNlZSBpZiBhbnkgb2YgdGhlbSBhcmUgaW1wb3J0LXR5cGVcbiAgICAvLyBzdGF0ZW1lbnRzLlxuICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbaV07XG4gICAgICAgIGlmICh0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsKSAmJiBkZWNsLnBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICBkZWNsLnBhcmVudC5wYXJlbnQgIT09IHVuZGVmaW5lZCAmJiBkZWNsLnBhcmVudC5wYXJlbnQucGFyZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBGaW5kIHRoZSBJbXBvcnREZWNsYXJhdGlvbiB0aGF0IGltcG9ydGVkIHRoaXMgU3ltYm9sLlxuICAgICAgICAgIGNvbnN0IGltcG9ydERlY2wgPSBkZWNsLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICAgIC8vIFRoZSBtb2R1bGVTcGVjaWZpZXIgc2hvdWxkIGFsd2F5cyBiZSBhIHN0cmluZy5cbiAgICAgICAgICBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZVNwZWNpZmllciBpcyBhYnNvbHV0ZS4gSWYgaXQgaXMsIHRoaXMgc3ltYm9sIGNvbWVzIGZyb20gYW5cbiAgICAgICAgICAgIC8vIGV4dGVybmFsIG1vZHVsZSwgYW5kIHRoZSBpbXBvcnQgcGF0aCBiZWNvbWVzIHRoZSB2aWFNb2R1bGUuXG4gICAgICAgICAgICBjb25zdCBtb2R1bGVTcGVjaWZpZXIgPSBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0O1xuICAgICAgICAgICAgaWYgKCFtb2R1bGVTcGVjaWZpZXIuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgICAgIHZpYU1vZHVsZSA9IG1vZHVsZVNwZWNpZmllcjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93LCByZXNvbHZlIHRoZSBTeW1ib2wgdG8gaXRzIGRlY2xhcmF0aW9uIGJ5IGZvbGxvd2luZyBhbnkgYW5kIGFsbCBhbGlhc2VzLlxuICAgIHdoaWxlIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woc3ltYm9sKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSByZXNvbHZlZCBTeW1ib2wncyBkZWNsYXJhdGlvbnMgYW5kIHBpY2sgb25lIG9mIHRoZW0gdG8gcmV0dXJuLiBWYWx1ZSBkZWNsYXJhdGlvbnNcbiAgICAvLyBhcmUgZ2l2ZW4gcHJlY2VkZW5jZSBvdmVyIHR5cGUgZGVjbGFyYXRpb25zLlxuICAgIGlmIChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBub2RlOiBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbixcbiAgICAgICAgdmlhTW9kdWxlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vZGU6IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF0sXG4gICAgICAgIHZpYU1vZHVsZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3JlZmxlY3REZWNvcmF0b3Iobm9kZTogdHMuRGVjb3JhdG9yKTogRGVjb3JhdG9yfG51bGwge1xuICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgZGVjb3JhdG9yIGV4cHJlc3Npb24gaW50byBhIHJlZmVyZW5jZSB0byBhIGNvbmNyZXRlIElkZW50aWZpZXIuIFRoZVxuICAgIC8vIGV4cHJlc3Npb24gbWF5IGNvbnRhaW4gYSBjYWxsIHRvIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB0aGUgZGVjb3JhdG9yIGZ1bmN0aW9uLCBpbiB3aGljaFxuICAgIC8vIGNhc2Ugd2Ugd2FudCB0byByZXR1cm4gdGhlIGFyZ3VtZW50cy5cbiAgICBsZXQgZGVjb3JhdG9yRXhwcjogdHMuRXhwcmVzc2lvbiA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICBsZXQgYXJnczogdHMuRXhwcmVzc2lvbltdfG51bGwgPSBudWxsO1xuXG4gICAgLy8gQ2hlY2sgZm9yIGNhbGwgZXhwcmVzc2lvbnMuXG4gICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZGVjb3JhdG9yRXhwcikpIHtcbiAgICAgIGFyZ3MgPSBBcnJheS5mcm9tKGRlY29yYXRvckV4cHIuYXJndW1lbnRzKTtcbiAgICAgIGRlY29yYXRvckV4cHIgPSBkZWNvcmF0b3JFeHByLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gVGhlIGZpbmFsIHJlc29sdmVkIGRlY29yYXRvciBzaG91bGQgYmUgYSBgdHMuSWRlbnRpZmllcmAgLSBpZiBpdCdzIG5vdCwgdGhlbiBzb21ldGhpbmcgaXNcbiAgICAvLyB3cm9uZyBhbmQgdGhlIGRlY29yYXRvciBjYW4ndCBiZSByZXNvbHZlZCBzdGF0aWNhbGx5LlxuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnREZWNsID0gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9yRXhwcik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZGVjb3JhdG9yRXhwci50ZXh0LFxuICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yRXhwcixcbiAgICAgIGltcG9ydDogaW1wb3J0RGVjbCwgbm9kZSwgYXJncyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdE1lbWJlcihub2RlOiB0cy5DbGFzc0VsZW1lbnQpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcblxuICAgIGlmICh0cy5pc1Byb3BlcnR5RGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICB2YWx1ZSA9IG5vZGUuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzR2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5HZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuU2V0dGVyO1xuICAgIH0gZWxzZSBpZiAodHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUubmFtZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICBjb25zdCBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLCBraW5kLFxuICAgICAgdHlwZTogbm9kZS50eXBlIHx8IG51bGwsIG5hbWUsIG5hbWVOb2RlLCBkZWNvcmF0b3JzLCB2YWx1ZSwgaXNTdGF0aWMsXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogc3RyaW5nfG51bGwge1xuICBjb25zdCBpZCA9IHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsKTtcbiAgcmV0dXJuIGlkICYmIGlkLnRleHQgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3RJZGVudGlmaWVyT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZSB8fCBudWxsO1xuICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSkge1xuICAgICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24oXG4gICAgdHlwZTogdHMuRW50aXR5TmFtZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB7bm9kZTogdHMuRGVjbGFyYXRpb24sIGZyb206IHN0cmluZyB8IG51bGx9IHtcbiAgbGV0IHJlYWxTeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZSk7XG4gIGlmIChyZWFsU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5ICR7dHlwZS5nZXRUZXh0KCl9IHRvIHN5bWJvbGApO1xuICB9XG4gIHdoaWxlIChyZWFsU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHJlYWxTeW1ib2wpO1xuICB9XG5cbiAgbGV0IG5vZGU6IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICBpZiAocmVhbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICBub2RlID0gcmVhbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICB9IGVsc2UgaWYgKHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQgJiYgcmVhbFN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlc29sdmUgdHlwZSBlbnRpdHkgc3ltYm9sIHRvIGRlY2xhcmF0aW9uYCk7XG4gIH1cblxuICBpZiAodHMuaXNRdWFsaWZpZWROYW1lKHR5cGUpKSB7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIodHlwZS5sZWZ0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGFuZGxlIHF1YWxpZmllZCBuYW1lIHdpdGggbm9uLWlkZW50aWZpZXIgbGhzYCk7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0eXBlLmxlZnQpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHJlc29sdmUgcXVhbGlmaWVkIHR5cGUgZW50aXR5IGxocyB0byBzeW1ib2xgKTtcbiAgICB9XG4gICAgY29uc3QgZGVjbCA9IHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKHRzLmlzTmFtZXNwYWNlSW1wb3J0KGRlY2wpKSB7XG4gICAgICBjb25zdCBjbGF1c2UgPSBkZWNsLnBhcmVudCAhO1xuICAgICAgY29uc3QgaW1wb3J0RGVjbCA9IGNsYXVzZS5wYXJlbnQgITtcbiAgICAgIGlmICghdHMuaXNTdHJpbmdMaXRlcmFsKGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZHVsZSBzcGVjaWZpZXIgaXMgbm90IGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge25vZGUsIGZyb206IGltcG9ydERlY2wubW9kdWxlU3BlY2lmaWVyLnRleHR9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaW1wb3J0IHR5cGU/YCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB7bm9kZSwgZnJvbTogbnVsbH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgbmFtZTogc3RyaW5nLCBtb2R1bGU/OiBzdHJpbmcpOlxuICAgIHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSB7XG4gIHJldHVybiBtZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYylcbiAgICAgIC5tYXAobWVtYmVyID0+IHtcbiAgICAgICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gbWVtYmVyLmRlY29yYXRvcnMuZmlsdGVyKGRlYyA9PiB7XG4gICAgICAgICAgaWYgKGRlYy5pbXBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWMuaW1wb3J0Lm5hbWUgPT09IG5hbWUgJiYgKG1vZHVsZSA9PT0gdW5kZWZpbmVkIHx8IGRlYy5pbXBvcnQuZnJvbSA9PT0gbW9kdWxlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGRlYy5uYW1lID09PSBuYW1lICYmIG1vZHVsZSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge21lbWJlciwgZGVjb3JhdG9yc307XG4gICAgICB9KVxuICAgICAgLmZpbHRlcigodmFsdWUpOiB2YWx1ZSBpcyB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119ID0+IHZhbHVlICE9PSBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNZW1iZXIoXG4gICAgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgbmFtZTogc3RyaW5nLCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gIHJldHVybiBtZW1iZXJzLmZpbmQobWVtYmVyID0+IG1lbWJlci5pc1N0YXRpYyA9PT0gaXNTdGF0aWMgJiYgbWVtYmVyLm5hbWUgPT09IG5hbWUpIHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0T2JqZWN0TGl0ZXJhbChub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gIG5vZGUucHJvcGVydGllcy5mb3JFYWNoKHByb3AgPT4ge1xuICAgIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wKSkge1xuICAgICAgY29uc3QgbmFtZSA9IHByb3BlcnR5TmFtZVRvU3RyaW5nKHByb3AubmFtZSk7XG4gICAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBtYXAuc2V0KG5hbWUsIHByb3AuaW5pdGlhbGl6ZXIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIG1hcC5zZXQocHJvcC5uYW1lLnRleHQsIHByb3AubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuQ2xhc3NEZWNsYXJhdGlvbiB7XG4gIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFJlZmxlY3Rpbmcgb24gYSAke3RzLlN5bnRheEtpbmRbZGVjbGFyYXRpb24ua2luZF19IGluc3RlYWQgb2YgYSBDbGFzc0RlY2xhcmF0aW9uLmApO1xuICB9XG4gIHJldHVybiBkZWNsYXJhdGlvbjtcbn1cblxuZnVuY3Rpb24gcGFyYW1ldGVyTmFtZShuYW1lOiB0cy5CaW5kaW5nTmFtZSk6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihuYW1lKSkge1xuICAgIHJldHVybiBuYW1lLnRleHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvcGVydHlOYW1lVG9TdHJpbmcobm9kZTogdHMuUHJvcGVydHlOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpIHx8IHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19