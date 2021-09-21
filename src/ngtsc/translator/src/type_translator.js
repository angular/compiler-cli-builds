/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/translator/src/type_translator", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/translator/src/context"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeTranslatorVisitor = exports.translateType = void 0;
    var o = require("@angular/compiler");
    var ts = require("typescript");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/context");
    function translateType(type, imports) {
        return type.visitType(new TypeTranslatorVisitor(imports), new context_1.Context(false));
    }
    exports.translateType = translateType;
    var TypeTranslatorVisitor = /** @class */ (function () {
        function TypeTranslatorVisitor(imports) {
            this.imports = imports;
        }
        TypeTranslatorVisitor.prototype.visitBuiltinType = function (type, context) {
            switch (type.name) {
                case o.BuiltinTypeName.Bool:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
                case o.BuiltinTypeName.Dynamic:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
                case o.BuiltinTypeName.Int:
                case o.BuiltinTypeName.Number:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                case o.BuiltinTypeName.String:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
                case o.BuiltinTypeName.None:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
                default:
                    throw new Error("Unsupported builtin type: " + o.BuiltinTypeName[type.name]);
            }
        };
        TypeTranslatorVisitor.prototype.visitExpressionType = function (type, context) {
            var _this = this;
            var typeNode = this.translateExpression(type.value, context);
            if (type.typeParams === null) {
                return typeNode;
            }
            if (!ts.isTypeReferenceNode(typeNode)) {
                throw new Error('An ExpressionType with type arguments must translate into a TypeReferenceNode');
            }
            else if (typeNode.typeArguments !== undefined) {
                throw new Error("An ExpressionType with type arguments cannot have multiple levels of type arguments");
            }
            var typeArgs = type.typeParams.map(function (param) { return _this.translateType(param, context); });
            return ts.createTypeReferenceNode(typeNode.typeName, typeArgs);
        };
        TypeTranslatorVisitor.prototype.visitArrayType = function (type, context) {
            return ts.createArrayTypeNode(this.translateType(type.of, context));
        };
        TypeTranslatorVisitor.prototype.visitMapType = function (type, context) {
            var parameter = ts.createParameter(undefined, undefined, undefined, 'key', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
            var typeArgs = type.valueType !== null ?
                this.translateType(type.valueType, context) :
                ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
            var indexSignature = ts.createIndexSignature(undefined, undefined, [parameter], typeArgs);
            return ts.createTypeLiteralNode([indexSignature]);
        };
        TypeTranslatorVisitor.prototype.visitReadVarExpr = function (ast, context) {
            if (ast.name === null) {
                throw new Error("ReadVarExpr with no variable name in type");
            }
            return ts.createTypeQueryNode(ts.createIdentifier(ast.name));
        };
        TypeTranslatorVisitor.prototype.visitWriteVarExpr = function (expr, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitWriteKeyExpr = function (expr, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitWritePropExpr = function (expr, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitTaggedTemplateExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitInstantiateExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitLiteralExpr = function (ast, context) {
            if (ast.value === null) {
                return ts.createLiteralTypeNode(ts.createNull());
            }
            else if (ast.value === undefined) {
                return ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);
            }
            else if (typeof ast.value === 'boolean') {
                return ts.createLiteralTypeNode(ts.createLiteral(ast.value));
            }
            else if (typeof ast.value === 'number') {
                return ts.createLiteralTypeNode(ts.createLiteral(ast.value));
            }
            else {
                return ts.createLiteralTypeNode(ts.createLiteral(ast.value));
            }
        };
        TypeTranslatorVisitor.prototype.visitLocalizedString = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitExternalExpr = function (ast, context) {
            var _this = this;
            if (ast.value.moduleName === null || ast.value.name === null) {
                throw new Error("Import unknown module or symbol");
            }
            var _a = this.imports.generateNamedImport(ast.value.moduleName, ast.value.name), moduleImport = _a.moduleImport, symbol = _a.symbol;
            var symbolIdentifier = ts.createIdentifier(symbol);
            var typeName = moduleImport ? ts.createQualifiedName(moduleImport, symbolIdentifier) : symbolIdentifier;
            var typeArguments = ast.typeParams !== null ?
                ast.typeParams.map(function (type) { return _this.translateType(type, context); }) :
                undefined;
            return ts.createTypeReferenceNode(typeName, typeArguments);
        };
        TypeTranslatorVisitor.prototype.visitConditionalExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitNotExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitCastExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitFunctionExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitUnaryOperatorExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitBinaryOperatorExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitReadPropExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitReadKeyExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
            var _this = this;
            var values = ast.entries.map(function (expr) { return _this.translateExpression(expr, context); });
            return ts.createTupleTypeNode(values);
        };
        TypeTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var entries = ast.entries.map(function (entry) {
                var key = entry.key, quoted = entry.quoted;
                var type = _this.translateExpression(entry.value, context);
                return ts.createPropertySignature(
                /* modifiers */ undefined, 
                /* name */ quoted ? ts.createStringLiteral(key) : key, 
                /* questionToken */ undefined, 
                /* type */ type, 
                /* initializer */ undefined);
            });
            return ts.createTypeLiteralNode(entries);
        };
        TypeTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, context) {
            var node = ast.node;
            if (ts.isEntityName(node)) {
                return ts.createTypeReferenceNode(node, /* typeArguments */ undefined);
            }
            else if (ts.isTypeNode(node)) {
                return node;
            }
            else if (ts.isLiteralExpression(node)) {
                return ts.createLiteralTypeNode(node);
            }
            else {
                throw new Error("Unsupported WrappedNodeExpr in TypeTranslatorVisitor: " + ts.SyntaxKind[node.kind]);
            }
        };
        TypeTranslatorVisitor.prototype.visitTypeofExpr = function (ast, context) {
            var typeNode = this.translateExpression(ast.expr, context);
            if (!ts.isTypeReferenceNode(typeNode)) {
                throw new Error("The target of a typeof expression must be a type reference, but it was\n          " + ts.SyntaxKind[typeNode.kind]);
            }
            return ts.createTypeQueryNode(typeNode.typeName);
        };
        TypeTranslatorVisitor.prototype.translateType = function (type, context) {
            var typeNode = type.visitType(this, context);
            if (!ts.isTypeNode(typeNode)) {
                throw new Error("A Type must translate to a TypeNode, but was " + ts.SyntaxKind[typeNode.kind]);
            }
            return typeNode;
        };
        TypeTranslatorVisitor.prototype.translateExpression = function (expr, context) {
            var typeNode = expr.visitExpression(this, context);
            if (!ts.isTypeNode(typeNode)) {
                throw new Error("An Expression must translate to a TypeNode, but was " + ts.SyntaxKind[typeNode.kind]);
            }
            return typeNode;
        };
        return TypeTranslatorVisitor;
    }());
    exports.TypeTranslatorVisitor = TypeTranslatorVisitor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV90cmFuc2xhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2xhdG9yL3NyYy90eXBlX3RyYW5zbGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgscUNBQXVDO0lBQ3ZDLCtCQUFpQztJQUVqQyxrRkFBa0M7SUFJbEMsU0FBZ0IsYUFBYSxDQUFDLElBQVksRUFBRSxPQUFzQjtRQUNoRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLGlCQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsc0NBRUM7SUFFRDtRQUNFLCtCQUFvQixPQUFzQjtZQUF0QixZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQUcsQ0FBQztRQUU5QyxnREFBZ0IsR0FBaEIsVUFBaUIsSUFBbUIsRUFBRSxPQUFnQjtZQUNwRCxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ2pCLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJO29CQUN6QixPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNoRSxLQUFLLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTztvQkFDNUIsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDNUQsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQztnQkFDM0IsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU07b0JBQzNCLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENB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LENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUZBQ1YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUN2QztZQUNELE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBRU8sNkNBQWEsR0FBckIsVUFBc0IsSUFBWSxFQUFFLE9BQWdCO1lBQ2xELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksS0FBSyxDQUNYLGtEQUFnRCxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQ3JGO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVPLG1EQUFtQixHQUEzQixVQUE0QixJQUFrQixFQUFFLE9BQWdCO1lBQzlELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QixNQUFNLElBQUksS0FBSyxDQUNYLHlEQUF1RCxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQzVGO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQTNORCxJQTJOQztJQTNOWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuL2ltcG9ydF9tYW5hZ2VyJztcblxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlVHlwZSh0eXBlOiBvLlR5cGUsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5UeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlLnZpc2l0VHlwZShuZXcgVHlwZVRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMpLCBuZXcgQ29udGV4dChmYWxzZSkpO1xufVxuXG5leHBvcnQgY2xhc3MgVHlwZVRyYW5zbGF0b3JWaXNpdG9yIGltcGxlbWVudHMgby5FeHByZXNzaW9uVmlzaXRvciwgby5UeXBlVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW1wb3J0czogSW1wb3J0TWFuYWdlcikge31cblxuICB2aXNpdEJ1aWx0aW5UeXBlKHR5cGU6IG8uQnVpbHRpblR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5LZXl3b3JkVHlwZU5vZGUge1xuICAgIHN3aXRjaCAodHlwZS5uYW1lKSB7XG4gICAgICBjYXNlIG8uQnVpbHRpblR5cGVOYW1lLkJvb2w6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5Cb29sZWFuS2V5d29yZCk7XG4gICAgICBjYXNlIG8uQnVpbHRpblR5cGVOYW1lLkR5bmFtaWM6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgICAgIGNhc2Ugby5CdWlsdGluVHlwZU5hbWUuSW50OlxuICAgICAgY2FzZSBvLkJ1aWx0aW5UeXBlTmFtZS5OdW1iZXI6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OdW1iZXJLZXl3b3JkKTtcbiAgICAgIGNhc2Ugby5CdWlsdGluVHlwZU5hbWUuU3RyaW5nOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZCk7XG4gICAgICBjYXNlIG8uQnVpbHRpblR5cGVOYW1lLk5vbmU6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OZXZlcktleXdvcmQpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBidWlsdGluIHR5cGU6ICR7by5CdWlsdGluVHlwZU5hbWVbdHlwZS5uYW1lXX1gKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25UeXBlKHR5cGU6IG8uRXhwcmVzc2lvblR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24odHlwZS52YWx1ZSwgY29udGV4dCk7XG4gICAgaWYgKHR5cGUudHlwZVBhcmFtcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHR5cGVOb2RlO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQW4gRXhwcmVzc2lvblR5cGUgd2l0aCB0eXBlIGFyZ3VtZW50cyBtdXN0IHRyYW5zbGF0ZSBpbnRvIGEgVHlwZVJlZmVyZW5jZU5vZGUnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVOb2RlLnR5cGVBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBbiBFeHByZXNzaW9uVHlwZSB3aXRoIHR5cGUgYXJndW1lbnRzIGNhbm5vdCBoYXZlIG11bHRpcGxlIGxldmVscyBvZiB0eXBlIGFyZ3VtZW50c2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVBcmdzID0gdHlwZS50eXBlUGFyYW1zLm1hcChwYXJhbSA9PiB0aGlzLnRyYW5zbGF0ZVR5cGUocGFyYW0sIGNvbnRleHQpKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUudHlwZU5hbWUsIHR5cGVBcmdzKTtcbiAgfVxuXG4gIHZpc2l0QXJyYXlUeXBlKHR5cGU6IG8uQXJyYXlUeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQXJyYXlUeXBlTm9kZSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUFycmF5VHlwZU5vZGUodGhpcy50cmFuc2xhdGVUeXBlKHR5cGUub2YsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0TWFwVHlwZSh0eXBlOiBvLk1hcFR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTGl0ZXJhbE5vZGUge1xuICAgIGNvbnN0IHBhcmFtZXRlciA9IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgJ2tleScsIHVuZGVmaW5lZCxcbiAgICAgICAgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZCkpO1xuICAgIGNvbnN0IHR5cGVBcmdzID0gdHlwZS52YWx1ZVR5cGUgIT09IG51bGwgP1xuICAgICAgICB0aGlzLnRyYW5zbGF0ZVR5cGUodHlwZS52YWx1ZVR5cGUsIGNvbnRleHQpIDpcbiAgICAgICAgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQpO1xuICAgIGNvbnN0IGluZGV4U2lnbmF0dXJlID0gdHMuY3JlYXRlSW5kZXhTaWduYXR1cmUodW5kZWZpbmVkLCB1bmRlZmluZWQsIFtwYXJhbWV0ZXJdLCB0eXBlQXJncyk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbaW5kZXhTaWduYXR1cmVdKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBvLlJlYWRWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZVF1ZXJ5Tm9kZSB7XG4gICAgaWYgKGFzdC5uYW1lID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlYWRWYXJFeHByIHdpdGggbm8gdmFyaWFibGUgbmFtZSBpbiB0eXBlYCk7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKHRzLmNyZWF0ZUlkZW50aWZpZXIoYXN0Lm5hbWUpKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IG8uV3JpdGVWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IG8uV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBvLldyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoYXN0OiBvLkludm9rZUZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFRhZ2dlZFRlbXBsYXRlRXhwcihhc3Q6IG8uVGFnZ2VkVGVtcGxhdGVFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGFzdDogby5JbnN0YW50aWF0ZUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IG8uTGl0ZXJhbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVOdWxsKCkpO1xuICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5VbmRlZmluZWRLZXl3b3JkKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhc3QudmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFzdC52YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSkpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGFzdDogby5Mb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoYXN0OiBvLkV4dGVybmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkVudGl0eU5hbWV8dHMuVHlwZVJlZmVyZW5jZU5vZGUge1xuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fCBhc3QudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgdW5rbm93biBtb2R1bGUgb3Igc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydChhc3QudmFsdWUubW9kdWxlTmFtZSwgYXN0LnZhbHVlLm5hbWUpO1xuICAgIGNvbnN0IHN5bWJvbElkZW50aWZpZXIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCk7XG5cbiAgICBjb25zdCB0eXBlTmFtZSA9XG4gICAgICAgIG1vZHVsZUltcG9ydCA/IHRzLmNyZWF0ZVF1YWxpZmllZE5hbWUobW9kdWxlSW1wb3J0LCBzeW1ib2xJZGVudGlmaWVyKSA6IHN5bWJvbElkZW50aWZpZXI7XG5cbiAgICBjb25zdCB0eXBlQXJndW1lbnRzID0gYXN0LnR5cGVQYXJhbXMgIT09IG51bGwgP1xuICAgICAgICBhc3QudHlwZVBhcmFtcy5tYXAodHlwZSA9PiB0aGlzLnRyYW5zbGF0ZVR5cGUodHlwZSwgY29udGV4dCkpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihhc3Q6IG8uQ29uZGl0aW9uYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogby5Ob3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRBc3NlcnROb3ROdWxsRXhwcihhc3Q6IG8uQXNzZXJ0Tm90TnVsbCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoYXN0OiBvLkNhc3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRGdW5jdGlvbkV4cHIoYXN0OiBvLkZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VW5hcnlPcGVyYXRvckV4cHIoYXN0OiBvLlVuYXJ5T3BlcmF0b3JFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBvLkJpbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGFzdDogby5SZWFkUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGFzdDogby5SZWFkS2V5RXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IG8uTGl0ZXJhbEFycmF5RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR1cGxlVHlwZU5vZGUge1xuICAgIGNvbnN0IHZhbHVlcyA9IGFzdC5lbnRyaWVzLm1hcChleHByID0+IHRoaXMudHJhbnNsYXRlRXhwcmVzc2lvbihleHByLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR1cGxlVHlwZU5vZGUodmFsdWVzKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoYXN0OiBvLkxpdGVyYWxNYXBFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZUxpdGVyYWxOb2RlIHtcbiAgICBjb25zdCBlbnRyaWVzID0gYXN0LmVudHJpZXMubWFwKGVudHJ5ID0+IHtcbiAgICAgIGNvbnN0IHtrZXksIHF1b3RlZH0gPSBlbnRyeTtcbiAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24oZW50cnkudmFsdWUsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogbmFtZSAqLyBxdW90ZWQgPyB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkgOiBrZXksXG4gICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShlbnRyaWVzKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGFzdDogby5Db21tYUV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IG8uV3JhcHBlZE5vZGVFeHByPGFueT4sIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3Qgbm9kZTogdHMuTm9kZSA9IGFzdC5ub2RlO1xuICAgIGlmICh0cy5pc0VudGl0eU5hbWUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1R5cGVOb2RlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5zdXBwb3J0ZWQgV3JhcHBlZE5vZGVFeHByIGluIFR5cGVUcmFuc2xhdG9yVmlzaXRvcjogJHt0cy5TeW50YXhLaW5kW25vZGUua2luZF19YCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGFzdDogby5UeXBlb2ZFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZVF1ZXJ5Tm9kZSB7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24oYXN0LmV4cHIsIGNvbnRleHQpO1xuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHRhcmdldCBvZiBhIHR5cGVvZiBleHByZXNzaW9uIG11c3QgYmUgYSB0eXBlIHJlZmVyZW5jZSwgYnV0IGl0IHdhc1xuICAgICAgICAgICR7dHMuU3ludGF4S2luZFt0eXBlTm9kZS5raW5kXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVRdWVyeU5vZGUodHlwZU5vZGUudHlwZU5hbWUpO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2xhdGVUeXBlKHR5cGU6IG8uVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHR5cGUudmlzaXRUeXBlKHRoaXMsIGNvbnRleHQpO1xuICAgIGlmICghdHMuaXNUeXBlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQSBUeXBlIG11c3QgdHJhbnNsYXRlIHRvIGEgVHlwZU5vZGUsIGJ1dCB3YXMgJHt0cy5TeW50YXhLaW5kW3R5cGVOb2RlLmtpbmRdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU5vZGU7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zbGF0ZUV4cHJlc3Npb24oZXhwcjogby5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IHR5cGVOb2RlID0gZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gICAgaWYgKCF0cy5pc1R5cGVOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBbiBFeHByZXNzaW9uIG11c3QgdHJhbnNsYXRlIHRvIGEgVHlwZU5vZGUsIGJ1dCB3YXMgJHt0cy5TeW50YXhLaW5kW3R5cGVOb2RlLmtpbmRdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU5vZGU7XG4gIH1cbn1cbiJdfQ==