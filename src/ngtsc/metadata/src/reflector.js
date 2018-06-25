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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/reflector", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
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
                // It's not possible to get a value expression if the parameter doesn't even have a type.
                if (node.type !== undefined) {
                    // It's only valid to convert a type reference to a value reference if the type actually has
                    // a
                    // value declaration associated with it.
                    var type = _this.checker.getTypeFromTypeNode(node.type);
                    if (type.symbol !== undefined && type.symbol.valueDeclaration !== undefined) {
                        // The type points to a valid value declaration. Rewrite the TypeReference into an
                        // Expression
                        // which references the value pointed to by the TypeReference, if possible.
                        typeValueExpr = typeNodeToValueExpr(node.type);
                    }
                }
                return {
                    name: name,
                    nameNode: node.name,
                    type: typeValueExpr, decorators: decorators,
                };
            });
        };
        TypeScriptReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var symbol = this.checker.getSymbolAtLocation(id);
            return getImportOfSymbol(symbol);
        };
        TypeScriptReflectionHost.prototype.isClass = function (node) { return ts.isClassDeclaration(node); };
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
                import: importDecl, node: node, args: args,
            };
        };
        TypeScriptReflectionHost.prototype._reflectMember = function (node) {
            var kind = null;
            var initializer = null;
            var name = null;
            var nameNode = null;
            if (ts.isPropertyDeclaration(node)) {
                kind = host_1.ClassMemberKind.Property;
                initializer = node.initializer || null;
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
                kind: kind,
                type: node.type || null, name: name, nameNode: nameNode, decorators: decorators, initializer: initializer, isStatic: isStatic,
            };
        };
        return TypeScriptReflectionHost;
    }());
    exports.TypeScriptReflectionHost = TypeScriptReflectionHost;
    function getImportOfSymbol(symbol) {
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
    }
    exports.getImportOfSymbol = getImportOfSymbol;
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
            throw new Error("Cannot resolve type entity to symbol");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLDZEQUFzRztJQUV0Rzs7T0FFRztJQUVIO1FBQ0Usa0NBQXNCLE9BQXVCO1lBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQUcsQ0FBQztRQUVqRCw2REFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFBdEQsaUJBTUM7WUFMQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLEtBQUssU0FBUyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDL0UsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxLQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQWpDLENBQWlDLENBQUM7aUJBQzVFLE1BQU0sQ0FBQyxVQUFDLEdBQUcsSUFBdUIsT0FBQSxHQUFHLEtBQUssSUFBSSxFQUFaLENBQVksQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxvREFBaUIsR0FBakIsVUFBa0IsV0FBMkI7WUFBN0MsaUJBSUM7WUFIQyxJQUFNLEtBQUssR0FBRywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2RCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsS0FBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQztpQkFDMUQsTUFBTSxDQUFDLFVBQUMsTUFBTSxJQUE0QixPQUFBLE1BQU0sS0FBSyxJQUFJLEVBQWYsQ0FBZSxD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LENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE9BQU8sSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztTQUN6RTthQUFNLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBRUQsOEJBQThCLElBQXFCO1FBQ2pELElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDbEI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBEZWNvcmF0b3IsIEltcG9ydCwgUGFyYW1ldGVyLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5cbi8qKlxuICogcmVmbGVjdG9yLnRzIGltcGxlbWVudHMgc3RhdGljIHJlZmxlY3Rpb24gb2YgZGVjbGFyYXRpb25zIHVzaW5nIHRoZSBUeXBlU2NyaXB0IGB0cy5UeXBlQ2hlY2tlcmAuXG4gKi9cblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIFJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7fVxuXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGlmIChkZWNsYXJhdGlvbi5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24uZGVjb3JhdG9ycy5tYXAoZGVjb3JhdG9yID0+IHRoaXMuX3JlZmxlY3REZWNvcmF0b3IoZGVjb3JhdG9yKSlcbiAgICAgICAgLmZpbHRlcigoZGVjKTogZGVjIGlzIERlY29yYXRvciA9PiBkZWMgIT09IG51bGwpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhenogPSBjYXN0RGVjbGFyYXRpb25Ub0NsYXNzT3JEaWUoZGVjbGFyYXRpb24pO1xuICAgIHJldHVybiBjbGF6ei5tZW1iZXJzLm1hcChtZW1iZXIgPT4gdGhpcy5fcmVmbGVjdE1lbWJlcihtZW1iZXIpKVxuICAgICAgICAuZmlsdGVyKChtZW1iZXIpOiBtZW1iZXIgaXMgQ2xhc3NNZW1iZXIgPT4gbWVtYmVyICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBjbGF6eiA9IGNhc3REZWNsYXJhdGlvblRvQ2xhc3NPckRpZShkZWNsYXJhdGlvbik7XG5cbiAgICAvLyBGaXJzdCwgZmluZCB0aGUgY29uc3RydWN0b3IuXG4gICAgY29uc3QgY3RvciA9IGNsYXp6Lm1lbWJlcnMuZmluZCh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24pO1xuICAgIGlmIChjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBjdG9yLnBhcmFtZXRlcnMubWFwKG5vZGUgPT4ge1xuICAgICAgLy8gVGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlciBpcyBlYXN5LlxuICAgICAgY29uc3QgbmFtZSA9IHBhcmFtZXRlck5hbWUobm9kZS5uYW1lKTtcblxuICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG5cbiAgICAgIC8vIEl0IG1heSBvciBtYXkgbm90IGJlIHBvc3NpYmxlIHRvIHdyaXRlIGFuIGV4cHJlc3Npb24gdGhhdCByZWZlcnMgdG8gdGhlIHZhbHVlIHNpZGUgb2YgdGhlXG4gICAgICAvLyB0eXBlIG5hbWVkIGZvciB0aGUgcGFyYW1ldGVyLlxuICAgICAgbGV0IHR5cGVWYWx1ZUV4cHI6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICAgIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGdldCBhIHZhbHVlIGV4cHJlc3Npb24gaWYgdGhlIHBhcmFtZXRlciBkb2Vzbid0IGV2ZW4gaGF2ZSBhIHR5cGUuXG4gICAgICBpZiAobm9kZS50eXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gSXQncyBvbmx5IHZhbGlkIHRvIGNvbnZlcnQgYSB0eXBlIHJlZmVyZW5jZSB0byBhIHZhbHVlIHJlZmVyZW5jZSBpZiB0aGUgdHlwZSBhY3R1YWxseSBoYXNcbiAgICAgICAgLy8gYVxuICAgICAgICAvLyB2YWx1ZSBkZWNsYXJhdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuXG4gICAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLmNoZWNrZXIuZ2V0VHlwZUZyb21UeXBlTm9kZShub2RlLnR5cGUpO1xuICAgICAgICBpZiAodHlwZS5zeW1ib2wgIT09IHVuZGVmaW5lZCAmJiB0eXBlLnN5bWJvbC52YWx1ZURlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBUaGUgdHlwZSBwb2ludHMgdG8gYSB2YWxpZCB2YWx1ZSBkZWNsYXJhdGlvbi4gUmV3cml0ZSB0aGUgVHlwZVJlZmVyZW5jZSBpbnRvIGFuXG4gICAgICAgICAgLy8gRXhwcmVzc2lvblxuICAgICAgICAgIC8vIHdoaWNoIHJlZmVyZW5jZXMgdGhlIHZhbHVlIHBvaW50ZWQgdG8gYnkgdGhlIFR5cGVSZWZlcmVuY2UsIGlmIHBvc3NpYmxlLlxuICAgICAgICAgIHR5cGVWYWx1ZUV4cHIgPSB0eXBlTm9kZVRvVmFsdWVFeHByKG5vZGUudHlwZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZU5vZGU6IG5vZGUubmFtZSxcbiAgICAgICAgdHlwZTogdHlwZVZhbHVlRXhwciwgZGVjb3JhdG9ycyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaWQpO1xuICAgIHJldHVybiBnZXRJbXBvcnRPZlN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5EZWNsYXJhdGlvbiB7IHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSk7IH1cblxuICBwcml2YXRlIF9yZWZsZWN0RGVjb3JhdG9yKG5vZGU6IHRzLkRlY29yYXRvcik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIGRlY29yYXRvciBleHByZXNzaW9uIGludG8gYSByZWZlcmVuY2UgdG8gYSBjb25jcmV0ZSBJZGVudGlmaWVyLiBUaGVcbiAgICAvLyBleHByZXNzaW9uIG1heSBjb250YWluIGEgY2FsbCB0byBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgdGhlIGRlY29yYXRvciBmdW5jdGlvbiwgaW4gd2hpY2hcbiAgICAvLyBjYXNlIHdlIHdhbnQgdG8gcmV0dXJuIHRoZSBhcmd1bWVudHMuXG4gICAgbGV0IGRlY29yYXRvckV4cHI6IHRzLkV4cHJlc3Npb24gPSBub2RlLmV4cHJlc3Npb247XG4gICAgbGV0IGFyZ3M6IHRzLkV4cHJlc3Npb25bXXxudWxsID0gbnVsbDtcblxuICAgIC8vIENoZWNrIGZvciBjYWxsIGV4cHJlc3Npb25zLlxuICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckV4cHIpKSB7XG4gICAgICBhcmdzID0gQXJyYXkuZnJvbShkZWNvcmF0b3JFeHByLmFyZ3VtZW50cyk7XG4gICAgICBkZWNvcmF0b3JFeHByID0gZGVjb3JhdG9yRXhwci5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaW5hbCByZXNvbHZlZCBkZWNvcmF0b3Igc2hvdWxkIGJlIGEgYHRzLklkZW50aWZpZXJgIC0gaWYgaXQncyBub3QsIHRoZW4gc29tZXRoaW5nIGlzXG4gICAgLy8gd3JvbmcgYW5kIHRoZSBkZWNvcmF0b3IgY2FuJ3QgYmUgcmVzb2x2ZWQgc3RhdGljYWxseS5cbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0RGVjbCA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvckV4cHIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvckV4cHIudGV4dCxcbiAgICAgIGltcG9ydDogaW1wb3J0RGVjbCwgbm9kZSwgYXJncyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVmbGVjdE1lbWJlcihub2RlOiB0cy5DbGFzc0VsZW1lbnQpOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCBpbml0aWFsaXplcjogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcblxuICAgIGlmICh0cy5pc1Byb3BlcnR5RGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICBpbml0aWFsaXplciA9IG5vZGUuaW5pdGlhbGl6ZXIgfHwgbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzR2V0QWNjZXNzb3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5HZXR0ZXI7XG4gICAgfSBlbHNlIGlmICh0cy5pc1NldEFjY2Vzc29yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuU2V0dGVyO1xuICAgIH0gZWxzZSBpZiAodHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUubmFtZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICBjb25zdCBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGtpbmQsXG4gICAgICB0eXBlOiBub2RlLnR5cGUgfHwgbnVsbCwgbmFtZSwgbmFtZU5vZGUsIGRlY29yYXRvcnMsIGluaXRpYWxpemVyLCBpc1N0YXRpYyxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbXBvcnRPZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQpOiBJbXBvcnR8bnVsbCB7XG4gIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZ25vcmUgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGxvY2FsbHkgKG5vdCBpbXBvcnRlZCkuXG4gIGNvbnN0IGRlY2w6IHRzLkRlY2xhcmF0aW9uID0gc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgaWYgKCF0cy5pc0ltcG9ydFNwZWNpZmllcihkZWNsKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gV2FsayBiYWNrIGZyb20gdGhlIHNwZWNpZmllciB0byBmaW5kIHRoZSBkZWNsYXJhdGlvbiwgd2hpY2ggY2FycmllcyB0aGUgbW9kdWxlIHNwZWNpZmllci5cbiAgY29uc3QgaW1wb3J0RGVjbCA9IGRlY2wucGFyZW50ICEucGFyZW50ICEucGFyZW50ICE7XG5cbiAgLy8gVGhlIG1vZHVsZSBzcGVjaWZpZXIgaXMgZ3VhcmFudGVlZCB0byBiZSBhIHN0cmluZyBsaXRlcmFsLCBzbyB0aGlzIHNob3VsZCBhbHdheXMgcGFzcy5cbiAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbC5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgLy8gTm90IGFsbG93ZWQgdG8gaGFwcGVuIGluIFR5cGVTY3JpcHQgQVNUcy5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlYWQgdGhlIG1vZHVsZSBzcGVjaWZpZXIuXG4gIGNvbnN0IGZyb20gPSBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0O1xuXG4gIC8vIENvbXB1dGUgdGhlIG5hbWUgYnkgd2hpY2ggdGhlIGRlY29yYXRvciB3YXMgZXhwb3J0ZWQsIG5vdCBpbXBvcnRlZC5cbiAgY29uc3QgbmFtZSA9IChkZWNsLnByb3BlcnR5TmFtZSAhPT0gdW5kZWZpbmVkID8gZGVjbC5wcm9wZXJ0eU5hbWUgOiBkZWNsLm5hbWUpLnRleHQ7XG5cbiAgcmV0dXJuIHtmcm9tLCBuYW1lfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihkZWNsOiB0cy5EZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgY29uc3QgaWQgPSByZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbCk7XG4gIHJldHVybiBpZCAmJiBpZC50ZXh0IHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZsZWN0SWRlbnRpZmllck9mRGVjbGFyYXRpb24oZGVjbDogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpIHx8IHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihkZWNsKSkge1xuICAgIHJldHVybiBkZWNsLm5hbWUgfHwgbnVsbDtcbiAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICAgIHJldHVybiBkZWNsLm5hbWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uKFxuICAgIHR5cGU6IHRzLkVudGl0eU5hbWUsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKToge25vZGU6IHRzLkRlY2xhcmF0aW9uLCBmcm9tOiBzdHJpbmcgfCBudWxsfSB7XG4gIGxldCByZWFsU3ltYm9sID0gY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHR5cGUpO1xuICBpZiAocmVhbFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgcmVzb2x2ZSB0eXBlIGVudGl0eSB0byBzeW1ib2xgKTtcbiAgfVxuICB3aGlsZSAocmVhbFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgcmVhbFN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChyZWFsU3ltYm9sKTtcbiAgfVxuXG4gIGxldCBub2RlOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgaWYgKHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbm9kZSA9IHJlYWxTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgfSBlbHNlIGlmIChyZWFsU3ltYm9sLmRlY2xhcmF0aW9ucyAhPT0gdW5kZWZpbmVkICYmIHJlYWxTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSkge1xuICAgIG5vZGUgPSByZWFsU3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHR5cGUgZW50aXR5IHN5bWJvbCB0byBkZWNsYXJhdGlvbmApO1xuICB9XG5cbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlKSkge1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKHR5cGUubGVmdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhbmRsZSBxdWFsaWZpZWQgbmFtZSB3aXRoIG5vbi1pZGVudGlmaWVyIGxoc2ApO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odHlwZS5sZWZ0KTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXNvbHZlIHF1YWxpZmllZCB0eXBlIGVudGl0eSBsaHMgdG8gc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2wgPSBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICh0cy5pc05hbWVzcGFjZUltcG9ydChkZWNsKSkge1xuICAgICAgY29uc3QgY2xhdXNlID0gZGVjbC5wYXJlbnQgITtcbiAgICAgIGNvbnN0IGltcG9ydERlY2wgPSBjbGF1c2UucGFyZW50ICE7XG4gICAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2R1bGUgc3BlY2lmaWVyIGlzIG5vdCBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtub2RlLCBmcm9tOiBpbXBvcnREZWNsLm1vZHVsZVNwZWNpZmllci50ZXh0fTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGltcG9ydCB0eXBlP2ApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge25vZGUsIGZyb206IG51bGx9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgbW9kdWxlPzogc3RyaW5nKTpcbiAgICB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10ge1xuICByZXR1cm4gbWVtYmVycy5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMpXG4gICAgICAubWFwKG1lbWJlciA9PiB7XG4gICAgICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IG1lbWJlci5kZWNvcmF0b3JzLmZpbHRlcihkZWMgPT4ge1xuICAgICAgICAgIGlmIChkZWMuaW1wb3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjLmltcG9ydC5uYW1lID09PSBuYW1lICYmIChtb2R1bGUgPT09IHVuZGVmaW5lZCB8fCBkZWMuaW1wb3J0LmZyb20gPT09IG1vZHVsZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWMubmFtZSA9PT0gbmFtZSAmJiBtb2R1bGUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHttZW1iZXIsIGRlY29yYXRvcnN9O1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoKHZhbHVlKTogdmFsdWUgaXMge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfSA9PiB2YWx1ZSAhPT0gbnVsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWVtYmVyKFxuICAgIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIG5hbWU6IHN0cmluZywgaXNTdGF0aWM6IGJvb2xlYW4gPSBmYWxzZSk6IENsYXNzTWVtYmVyfG51bGwge1xuICByZXR1cm4gbWVtYmVycy5maW5kKG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMgPT09IGlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBuYW1lKSB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPigpO1xuICBub2RlLnByb3BlcnRpZXMuZm9yRWFjaChwcm9wID0+IHtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcm9wZXJ0eU5hbWVUb1N0cmluZyhwcm9wLm5hbWUpO1xuICAgICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbWFwLnNldChuYW1lLCBwcm9wLmluaXRpYWxpemVyKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3ApKSB7XG4gICAgICBtYXAuc2V0KHByb3AubmFtZS50ZXh0LCBwcm9wLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG1hcDtcbn1cblxuZnVuY3Rpb24gY2FzdERlY2xhcmF0aW9uVG9DbGFzc09yRGllKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkNsYXNzRGVjbGFyYXRpb24ge1xuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBSZWZsZWN0aW5nIG9uIGEgJHt0cy5TeW50YXhLaW5kW2RlY2xhcmF0aW9uLmtpbmRdfSBpbnN0ZWFkIG9mIGEgQ2xhc3NEZWNsYXJhdGlvbi5gKTtcbiAgfVxuICByZXR1cm4gZGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIHBhcmFtZXRlck5hbWUobmFtZTogdHMuQmluZGluZ05hbWUpOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICByZXR1cm4gbmFtZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHR5cGVOb2RlVG9WYWx1ZUV4cHIobm9kZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgIHJldHVybiBlbnRpdHlOYW1lVG9WYWx1ZShub2RlLnR5cGVOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnRpdHlOYW1lVG9WYWx1ZShub2RlOiB0cy5FbnRpdHlOYW1lKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgIGNvbnN0IGxlZnQgPSBlbnRpdHlOYW1lVG9WYWx1ZShub2RlLmxlZnQpO1xuICAgIHJldHVybiBsZWZ0ICE9PSBudWxsID8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MobGVmdCwgbm9kZS5yaWdodCkgOiBudWxsO1xuICB9IGVsc2UgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSkge1xuICAgIHJldHVybiB0cy5nZXRNdXRhYmxlQ2xvbmUobm9kZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvcGVydHlOYW1lVG9TdHJpbmcobm9kZTogdHMuUHJvcGVydHlOYW1lKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpIHx8IHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSB8fCB0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19