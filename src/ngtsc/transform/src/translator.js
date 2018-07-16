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
        define("@angular/compiler-cli/src/ngtsc/transform/src/translator", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var BINARY_OPERATORS = new Map([
        [compiler_1.BinaryOperator.And, ts.SyntaxKind.AmpersandAmpersandToken],
        [compiler_1.BinaryOperator.Bigger, ts.SyntaxKind.GreaterThanToken],
        [compiler_1.BinaryOperator.BiggerEquals, ts.SyntaxKind.GreaterThanEqualsToken],
        [compiler_1.BinaryOperator.BitwiseAnd, ts.SyntaxKind.AmpersandToken],
        [compiler_1.BinaryOperator.Divide, ts.SyntaxKind.SlashToken],
        [compiler_1.BinaryOperator.Equals, ts.SyntaxKind.EqualsEqualsToken],
        [compiler_1.BinaryOperator.Identical, ts.SyntaxKind.EqualsEqualsEqualsToken],
        [compiler_1.BinaryOperator.Lower, ts.SyntaxKind.LessThanToken],
        [compiler_1.BinaryOperator.LowerEquals, ts.SyntaxKind.LessThanEqualsToken],
        [compiler_1.BinaryOperator.Minus, ts.SyntaxKind.MinusToken],
        [compiler_1.BinaryOperator.Modulo, ts.SyntaxKind.PercentToken],
        [compiler_1.BinaryOperator.Multiply, ts.SyntaxKind.AsteriskToken],
        [compiler_1.BinaryOperator.NotEquals, ts.SyntaxKind.ExclamationEqualsToken],
        [compiler_1.BinaryOperator.NotIdentical, ts.SyntaxKind.ExclamationEqualsEqualsToken],
        [compiler_1.BinaryOperator.Or, ts.SyntaxKind.BarBarToken],
        [compiler_1.BinaryOperator.Plus, ts.SyntaxKind.PlusToken],
    ]);
    var CORE_SUPPORTED_SYMBOLS = new Set([
        'defineInjectable',
        'defineInjector',
        'ɵdefineNgModule',
        'inject',
        'InjectableDef',
        'ɵInjectorDef',
        'ɵNgModuleDef',
    ]);
    var ImportManager = /** @class */ (function () {
        function ImportManager(isCore, prefix) {
            if (prefix === void 0) { prefix = 'i'; }
            this.isCore = isCore;
            this.prefix = prefix;
            this.moduleToIndex = new Map();
            this.nextIndex = 0;
        }
        ImportManager.prototype.generateNamedImport = function (moduleName, symbol) {
            if (!this.moduleToIndex.has(moduleName)) {
                this.moduleToIndex.set(moduleName, "" + this.prefix + this.nextIndex++);
            }
            if (this.isCore && moduleName === '@angular/core' && !CORE_SUPPORTED_SYMBOLS.has(symbol)) {
                throw new Error("Importing unexpected symbol " + symbol + " while compiling core");
            }
            return this.moduleToIndex.get(moduleName);
        };
        ImportManager.prototype.getAllImports = function (contextPath, rewriteCoreImportsTo) {
            var _this = this;
            return Array.from(this.moduleToIndex.keys()).map(function (name) {
                var as = _this.moduleToIndex.get(name);
                if (rewriteCoreImportsTo !== null && name === '@angular/core') {
                    var relative = path_1.relativePathBetween(contextPath, rewriteCoreImportsTo.fileName);
                    if (relative === null) {
                        throw new Error("Failed to rewrite import inside core: " + contextPath + " -> " + rewriteCoreImportsTo.fileName);
                    }
                    name = relative;
                }
                return { name: name, as: as };
            });
        };
        return ImportManager;
    }());
    exports.ImportManager = ImportManager;
    function translateExpression(expression, imports) {
        return expression.visitExpression(new ExpressionTranslatorVisitor(imports), null);
    }
    exports.translateExpression = translateExpression;
    function translateStatement(statement, imports) {
        return statement.visitStatement(new ExpressionTranslatorVisitor(imports), null);
    }
    exports.translateStatement = translateStatement;
    function translateType(type, imports) {
        return type.visitType(new TypeTranslatorVisitor(imports), null);
    }
    exports.translateType = translateType;
    var ExpressionTranslatorVisitor = /** @class */ (function () {
        function ExpressionTranslatorVisitor(imports) {
            this.imports = imports;
        }
        ExpressionTranslatorVisitor.prototype.visitDeclareVarStmt = function (stmt, context) {
            return ts.createVariableStatement(undefined, ts.createVariableDeclarationList([ts.createVariableDeclaration(stmt.name, undefined, stmt.value && stmt.value.visitExpression(this, context))]));
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareFunctionStmt = function (stmt, context) {
            var _this = this;
            return ts.createFunctionDeclaration(undefined, undefined, undefined, stmt.name, undefined, stmt.params.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param.name); }), undefined, ts.createBlock(stmt.statements.map(function (child) { return child.visitStatement(_this, context); })));
        };
        ExpressionTranslatorVisitor.prototype.visitExpressionStmt = function (stmt, context) {
            return ts.createStatement(stmt.expr.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitReturnStmt = function (stmt, context) {
            return ts.createReturn(stmt.value.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareClassStmt = function (stmt, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitIfStmt = function (stmt, context) {
            var _this = this;
            return ts.createIf(stmt.condition.visitExpression(this, context), ts.createBlock(stmt.trueCase.map(function (child) { return child.visitStatement(_this, context); })), stmt.falseCase.length > 0 ?
                ts.createBlock(stmt.falseCase.map(function (child) { return child.visitStatement(_this, context); })) :
                undefined);
        };
        ExpressionTranslatorVisitor.prototype.visitTryCatchStmt = function (stmt, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitThrowStmt = function (stmt, context) { throw new Error('Method not implemented.'); };
        ExpressionTranslatorVisitor.prototype.visitCommentStmt = function (stmt, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitJSDocCommentStmt = function (stmt, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitReadVarExpr = function (ast, context) {
            return ts.createIdentifier(ast.name);
        };
        ExpressionTranslatorVisitor.prototype.visitWriteVarExpr = function (expr, context) {
            return ts.createBinary(ts.createIdentifier(expr.name), ts.SyntaxKind.EqualsToken, expr.value.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitWriteKeyExpr = function (expr, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitWritePropExpr = function (expr, context) {
            return ts.createBinary(ts.createPropertyAccess(expr.receiver.visitExpression(this, context), expr.name), ts.SyntaxKind.EqualsToken, expr.value.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeMethodExpr = function (ast, context) {
            var _this = this;
            var target = ast.receiver.visitExpression(this, context);
            return ts.createCall(ast.name !== null ? ts.createPropertyAccess(target, ast.name) : target, undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            var _this = this;
            return ts.createCall(ast.fn.visitExpression(this, context), undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitInstantiateExpr = function (ast, context) {
            var _this = this;
            return ts.createNew(ast.classExpr.visitExpression(this, context), undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralExpr = function (ast, context) {
            if (ast.value === undefined) {
                return ts.createIdentifier('undefined');
            }
            else if (ast.value === null) {
                return ts.createNull();
            }
            else {
                return ts.createLiteral(ast.value);
            }
        };
        ExpressionTranslatorVisitor.prototype.visitExternalExpr = function (ast, context) {
            if (ast.value.moduleName === null || ast.value.name === null) {
                throw new Error("Import unknown module or symbol " + ast.value);
            }
            return ts.createPropertyAccess(ts.createIdentifier(this.imports.generateNamedImport(ast.value.moduleName, ast.value.name)), ts.createIdentifier(ast.value.name));
        };
        ExpressionTranslatorVisitor.prototype.visitConditionalExpr = function (ast, context) {
            return ts.createParen(ts.createConditional(ast.condition.visitExpression(this, context), ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context)));
        };
        ExpressionTranslatorVisitor.prototype.visitNotExpr = function (ast, context) {
            return ts.createPrefix(ts.SyntaxKind.ExclamationToken, ast.condition.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            return ts.createNonNullExpression(ast.condition.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitCastExpr = function (ast, context) {
            return ast.value.visitExpression(this, context);
        };
        ExpressionTranslatorVisitor.prototype.visitFunctionExpr = function (ast, context) {
            var _this = this;
            return ts.createFunctionExpression(undefined, undefined, ast.name || undefined, undefined, ast.params.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param.name, undefined, undefined, undefined); }), undefined, ts.createBlock(ast.statements.map(function (stmt) { return stmt.visitStatement(_this, context); })));
        };
        ExpressionTranslatorVisitor.prototype.visitBinaryOperatorExpr = function (ast, context) {
            if (!BINARY_OPERATORS.has(ast.operator)) {
                throw new Error("Unknown binary operator: " + compiler_1.BinaryOperator[ast.operator]);
            }
            var binEx = ts.createBinary(ast.lhs.visitExpression(this, context), BINARY_OPERATORS.get(ast.operator), ast.rhs.visitExpression(this, context));
            return ast.parens ? ts.createParen(binEx) : binEx;
        };
        ExpressionTranslatorVisitor.prototype.visitReadPropExpr = function (ast, context) {
            return ts.createPropertyAccess(ast.receiver.visitExpression(this, context), ast.name);
        };
        ExpressionTranslatorVisitor.prototype.visitReadKeyExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
            var _this = this;
            return ts.createArrayLiteral(ast.entries.map(function (expr) { return expr.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var entries = ast.entries.map(function (entry) { return ts.createPropertyAssignment(entry.quoted ? ts.createLiteral(entry.key) : ts.createIdentifier(entry.key), entry.value.visitExpression(_this, context)); });
            return ts.createObjectLiteral(entries);
        };
        ExpressionTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, context) { return ast.node; };
        return ExpressionTranslatorVisitor;
    }());
    var TypeTranslatorVisitor = /** @class */ (function () {
        function TypeTranslatorVisitor(imports) {
            this.imports = imports;
        }
        TypeTranslatorVisitor.prototype.visitBuiltinType = function (type, context) {
            switch (type.name) {
                case compiler_1.BuiltinTypeName.Bool:
                    return 'boolean';
                case compiler_1.BuiltinTypeName.Dynamic:
                    return 'any';
                case compiler_1.BuiltinTypeName.Int:
                case compiler_1.BuiltinTypeName.Number:
                    return 'number';
                case compiler_1.BuiltinTypeName.String:
                    return 'string';
                default:
                    throw new Error("Unsupported builtin type: " + compiler_1.BuiltinTypeName[type.name]);
            }
        };
        TypeTranslatorVisitor.prototype.visitExpressionType = function (type, context) {
            return type.value.visitExpression(this, context);
        };
        TypeTranslatorVisitor.prototype.visitArrayType = function (type, context) {
            return "Array<" + type.visitType(this, context) + ">";
        };
        TypeTranslatorVisitor.prototype.visitMapType = function (type, context) {
            if (type.valueType !== null) {
                return "{[key: string]: " + type.valueType.visitType(this, context) + "}";
            }
            else {
                return '{[key: string]: any}';
            }
        };
        TypeTranslatorVisitor.prototype.visitReadVarExpr = function (ast, context) {
            if (ast.name === null) {
                throw new Error("ReadVarExpr with no variable name in type");
            }
            return ast.name;
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
        TypeTranslatorVisitor.prototype.visitInvokeMethodExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitInstantiateExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitLiteralExpr = function (ast, context) {
            if (typeof ast.value === 'string') {
                var escaped = ast.value.replace(/\'/g, '\\\'');
                return "'" + escaped + "'";
            }
            else {
                return "" + ast.value;
            }
        };
        TypeTranslatorVisitor.prototype.visitExternalExpr = function (ast, context) {
            var _this = this;
            if (ast.value.moduleName === null || ast.value.name === null) {
                throw new Error("Import unknown module or symbol");
            }
            var moduleSymbol = this.imports.generateNamedImport(ast.value.moduleName, ast.value.name);
            var base = moduleSymbol + "." + ast.value.name;
            if (ast.typeParams !== null) {
                var generics = ast.typeParams.map(function (type) { return type.visitType(_this, context); }).join(', ');
                return base + "<" + generics + ">";
            }
            else {
                return base;
            }
        };
        TypeTranslatorVisitor.prototype.visitConditionalExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitNotExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitCastExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitFunctionExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitBinaryOperatorExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitReadPropExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitReadKeyExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
            var _this = this;
            var values = ast.entries.map(function (expr) { return expr.visitExpression(_this, context); });
            return "[" + values.join(',') + "]";
        };
        TypeTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, context) {
            var node = ast.node;
            if (ts.isIdentifier(node)) {
                return node.text;
            }
            else {
                throw new Error("Unsupported WrappedNodeExpr in TypeTranslatorVisitor: " + ts.SyntaxKind[node.kind]);
            }
        };
        return TypeTranslatorVisitor;
    }());
    exports.TypeTranslatorVisitor = TypeTranslatorVisitor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNmb3JtL3NyYy90cmFuc2xhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1xQjtJQUNucUIsK0JBQWlDO0lBQ2pDLHNFQUF3RDtJQUV4RCxJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFvQztRQUNsRSxDQUFDLHlCQUFjLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7UUFDM0QsQ0FBQyx5QkFBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO1FBQ3ZELENBQUMseUJBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQztRQUNuRSxDQUFDLHlCQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO1FBQ3pELENBQUMseUJBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDakQsQ0FBQyx5QkFBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDO1FBQ3hELENBQUMseUJBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQztRQUNqRSxDQUFDLHlCQUFjLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ25ELENBQUMseUJBQWMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztRQUMvRCxDQUFDLHlCQUFjLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENB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QUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhHLHFEQUFxQixHQUFyQixVQUFzQixHQUFxQixFQUFFLE9BQVk7WUFBekQsaUJBR0M7WUFGQyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSSxFQUFFLE9BQU8sQ0FBQyxFQUFuQyxDQUFtQyxDQUFDLENBQUM7WUFDNUUsT0FBTyxNQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQUcsQ0FBQztRQUNqQyxDQUFDO1FBRUQsbURBQW1CLEdBQW5CLFVBQW9CLEdBQW1CLEVBQUUsT0FBWTtZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELDhDQUFjLEdBQWQsVUFBZSxHQUFjLEVBQUUsT0FBWSxJQUFJLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUYsb0RBQW9CLEdBQXBCLFVBQXFCLEdBQXlCLEVBQUUsT0FBWTtZQUMxRCxJQUFNLElBQUksR0FBWSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQy9CLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2xCO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxLQUFLLENBQ1gsMkRBQXlELEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUM7YUFDMUY7UUFDSCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBbklELElBbUlDO0lBbklZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBcnJheVR5cGUsIEFzc2VydE5vdE51bGwsIEJpbmFyeU9wZXJhdG9yLCBCaW5hcnlPcGVyYXRvckV4cHIsIEJ1aWx0aW5UeXBlLCBCdWlsdGluVHlwZU5hbWUsIENhc3RFeHByLCBDbGFzc1N0bXQsIENvbW1hRXhwciwgQ29tbWVudFN0bXQsIENvbmRpdGlvbmFsRXhwciwgRGVjbGFyZUZ1bmN0aW9uU3RtdCwgRGVjbGFyZVZhclN0bXQsIEV4cHJlc3Npb24sIEV4cHJlc3Npb25TdGF0ZW1lbnQsIEV4cHJlc3Npb25UeXBlLCBFeHByZXNzaW9uVmlzaXRvciwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgRnVuY3Rpb25FeHByLCBJZlN0bXQsIEluc3RhbnRpYXRlRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBJbnZva2VNZXRob2RFeHByLCBKU0RvY0NvbW1lbnRTdG10LCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTGl0ZXJhbE1hcEV4cHIsIE1hcFR5cGUsIE5vdEV4cHIsIFJlYWRLZXlFeHByLCBSZWFkUHJvcEV4cHIsIFJlYWRWYXJFeHByLCBSZXR1cm5TdGF0ZW1lbnQsIFN0YXRlbWVudCwgU3RhdGVtZW50VmlzaXRvciwgVGhyb3dTdG10LCBUcnlDYXRjaFN0bXQsIFR5cGUsIFR5cGVWaXNpdG9yLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cmVsYXRpdmVQYXRoQmV0d2Vlbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPEJpbmFyeU9wZXJhdG9yLCB0cy5CaW5hcnlPcGVyYXRvcj4oW1xuICBbQmluYXJ5T3BlcmF0b3IuQW5kLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlciwgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlckVxdWFscywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRGl2aWRlLCB0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRXF1YWxzLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLklkZW50aWNhbCwgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Mb3dlciwgdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTWludXMsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Nb2R1bG8sIHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk11bHRpcGx5LCB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90RXF1YWxzLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuT3IsIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuUGx1cywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuXSk7XG5cbmNvbnN0IENPUkVfU1VQUE9SVEVEX1NZTUJPTFMgPSBuZXcgU2V0PHN0cmluZz4oW1xuICAnZGVmaW5lSW5qZWN0YWJsZScsXG4gICdkZWZpbmVJbmplY3RvcicsXG4gICfJtWRlZmluZU5nTW9kdWxlJyxcbiAgJ2luamVjdCcsXG4gICdJbmplY3RhYmxlRGVmJyxcbiAgJ8m1SW5qZWN0b3JEZWYnLFxuICAnybVOZ01vZHVsZURlZicsXG5dKTtcblxuZXhwb3J0IGNsYXNzIEltcG9ydE1hbmFnZXIge1xuICBwcml2YXRlIG1vZHVsZVRvSW5kZXggPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG5leHRJbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgcHJlZml4ID0gJ2knKSB7fVxuXG4gIGdlbmVyYXRlTmFtZWRJbXBvcnQobW9kdWxlTmFtZTogc3RyaW5nLCBzeW1ib2w6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKCF0aGlzLm1vZHVsZVRvSW5kZXguaGFzKG1vZHVsZU5hbWUpKSB7XG4gICAgICB0aGlzLm1vZHVsZVRvSW5kZXguc2V0KG1vZHVsZU5hbWUsIGAke3RoaXMucHJlZml4fSR7dGhpcy5uZXh0SW5kZXgrK31gKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNDb3JlICYmIG1vZHVsZU5hbWUgPT09ICdAYW5ndWxhci9jb3JlJyAmJiAhQ09SRV9TVVBQT1JURURfU1lNQk9MUy5oYXMoc3ltYm9sKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnRpbmcgdW5leHBlY3RlZCBzeW1ib2wgJHtzeW1ib2x9IHdoaWxlIGNvbXBpbGluZyBjb3JlYCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZVRvSW5kZXguZ2V0KG1vZHVsZU5hbWUpICE7XG4gIH1cblxuICBnZXRBbGxJbXBvcnRzKGNvbnRleHRQYXRoOiBzdHJpbmcsIHJld3JpdGVDb3JlSW1wb3J0c1RvOiB0cy5Tb3VyY2VGaWxlfG51bGwpOlxuICAgIHtuYW1lOiBzdHJpbmcsIGFzOiBzdHJpbmd9W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMubW9kdWxlVG9JbmRleC5rZXlzKCkpLm1hcChuYW1lID0+IHtcbiAgICAgIGNvbnN0IGFzOiBzdHJpbmd8bnVsbCA9IHRoaXMubW9kdWxlVG9JbmRleC5nZXQobmFtZSkgITtcbiAgICAgIGlmIChyZXdyaXRlQ29yZUltcG9ydHNUbyAhPT0gbnVsbCAmJiBuYW1lID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmUgPSByZWxhdGl2ZVBhdGhCZXR3ZWVuKGNvbnRleHRQYXRoLCByZXdyaXRlQ29yZUltcG9ydHNUby5maWxlTmFtZSk7XG4gICAgICAgIGlmIChyZWxhdGl2ZSA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYEZhaWxlZCB0byByZXdyaXRlIGltcG9ydCBpbnNpZGUgY29yZTogJHtjb250ZXh0UGF0aH0gLT4gJHtyZXdyaXRlQ29yZUltcG9ydHNUby5maWxlTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBuYW1lID0gcmVsYXRpdmU7XG4gICAgICB9XG4gICAgICByZXR1cm4ge25hbWUsIGFzfTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlRXhwcmVzc2lvbihleHByZXNzaW9uOiBFeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogdHMuRXhwcmVzc2lvbiB7XG4gIHJldHVybiBleHByZXNzaW9uLnZpc2l0RXhwcmVzc2lvbihuZXcgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMpLCBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQ6IFN0YXRlbWVudCwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLlN0YXRlbWVudCB7XG4gIHJldHVybiBzdGF0ZW1lbnQudmlzaXRTdGF0ZW1lbnQobmV3IEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzKSwgbnVsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVUeXBlKHR5cGU6IFR5cGUsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICByZXR1cm4gdHlwZS52aXNpdFR5cGUobmV3IFR5cGVUcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzKSwgbnVsbCk7XG59XG5cbmNsYXNzIEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvciBpbXBsZW1lbnRzIEV4cHJlc3Npb25WaXNpdG9yLCBTdGF0ZW1lbnRWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKSB7fVxuXG4gIHZpc2l0RGVjbGFyZVZhclN0bXQoc3RtdDogRGVjbGFyZVZhclN0bXQsIGNvbnRleHQ6IGFueSk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgICAgICBzdG10Lm5hbWUsIHVuZGVmaW5lZCwgc3RtdC52YWx1ZSAmJiBzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSldKSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogRGVjbGFyZUZ1bmN0aW9uU3RtdCwgY29udGV4dDogYW55KTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHN0bXQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICBzdG10LnBhcmFtcy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUpKSxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVCbG9jayhzdG10LnN0YXRlbWVudHMubWFwKGNoaWxkID0+IGNoaWxkLnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQpKSkpO1xuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uU3RtdChzdG10OiBFeHByZXNzaW9uU3RhdGVtZW50LCBjb250ZXh0OiBhbnkpOiB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCwgY29udGV4dDogYW55KTogdHMuUmV0dXJuU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUmV0dXJuKHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10OiBDbGFzc1N0bXQsIGNvbnRleHQ6IGFueSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SWZTdG10KHN0bXQ6IElmU3RtdCwgY29udGV4dDogYW55KTogdHMuSWZTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZihcbiAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICB0cy5jcmVhdGVCbG9jayhzdG10LnRydWVDYXNlLm1hcChjaGlsZCA9PiBjaGlsZC52aXNpdFN0YXRlbWVudCh0aGlzLCBjb250ZXh0KSkpLFxuICAgICAgICBzdG10LmZhbHNlQ2FzZS5sZW5ndGggPiAwID9cbiAgICAgICAgICAgIHRzLmNyZWF0ZUJsb2NrKHN0bXQuZmFsc2VDYXNlLm1hcChjaGlsZCA9PiBjaGlsZC52aXNpdFN0YXRlbWVudCh0aGlzLCBjb250ZXh0KSkpIDpcbiAgICAgICAgICAgIHVuZGVmaW5lZCk7XG4gIH1cblxuICB2aXNpdFRyeUNhdGNoU3RtdChzdG10OiBUcnlDYXRjaFN0bXQsIGNvbnRleHQ6IGFueSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VGhyb3dTdG10KHN0bXQ6IFRocm93U3RtdCwgY29udGV4dDogYW55KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0Q29tbWVudFN0bXQoc3RtdDogQ29tbWVudFN0bXQsIGNvbnRleHQ6IGFueSk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgY29udGV4dDogYW55KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBSZWFkVmFyRXhwciwgY29udGV4dDogYW55KTogdHMuSWRlbnRpZmllciB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYXN0Lm5hbWUgISk7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIsIGNvbnRleHQ6IGFueSk6IHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbixcbiAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByLCBjb250ZXh0OiBhbnkpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IGFueSk6IHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBleHByLm5hbWUpLFxuICAgICAgICB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEludm9rZU1ldGhvZEV4cHIoYXN0OiBJbnZva2VNZXRob2RFeHByLCBjb250ZXh0OiBhbnkpOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgYXN0Lm5hbWUgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0YXJnZXQsIGFzdC5uYW1lKSA6IHRhcmdldCwgdW5kZWZpbmVkLFxuICAgICAgICBhc3QuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGFzdDogSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBhbnkpOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgIGFzdC5mbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihhc3Q6IEluc3RhbnRpYXRlRXhwciwgY29udGV4dDogYW55KTogdHMuTmV3RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgYXN0LmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxFeHByKGFzdDogTGl0ZXJhbEV4cHIsIGNvbnRleHQ6IGFueSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmIChhc3QudmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpO1xuICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTnVsbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogRXh0ZXJuYWxFeHByLCBjb250ZXh0OiBhbnkpOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ge1xuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fCBhc3QudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgdW5rbm93biBtb2R1bGUgb3Igc3ltYm9sICR7YXN0LnZhbHVlfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIodGhpcy5pbXBvcnRzLmdlbmVyYXRlTmFtZWRJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUsIGFzdC52YWx1ZS5uYW1lKSksXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoYXN0LnZhbHVlLm5hbWUpKTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWxFeHByKGFzdDogQ29uZGl0aW9uYWxFeHByLCBjb250ZXh0OiBhbnkpOiB0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKFxuICAgICAgICBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0LnRydWVDYXNlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICAgICAgYXN0LmZhbHNlQ2FzZSAhLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogTm90RXhwciwgY29udGV4dDogYW55KTogdHMuUHJlZml4VW5hcnlFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJlZml4KFxuICAgICAgICB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uVG9rZW4sIGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoYXN0OiBBc3NlcnROb3ROdWxsLCBjb250ZXh0OiBhbnkpOiB0cy5Ob25OdWxsRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoYXN0OiBDYXN0RXhwciwgY29udGV4dDogYW55KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIGFzdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihhc3Q6IEZ1bmN0aW9uRXhwciwgY29udGV4dDogYW55KTogdHMuRnVuY3Rpb25FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXN0Lm5hbWUgfHwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgcGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKSxcbiAgICAgICAgdW5kZWZpbmVkLCB0cy5jcmVhdGVCbG9jayhhc3Quc3RhdGVtZW50cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQpKSkpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBCaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IGFueSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICghQklOQVJZX09QRVJBVE9SUy5oYXMoYXN0Lm9wZXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGJpbmFyeSBvcGVyYXRvcjogJHtCaW5hcnlPcGVyYXRvclthc3Qub3BlcmF0b3JdfWApO1xuICAgIH1cbiAgICBjb25zdCBiaW5FeCA9IHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgYXN0Lmxocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIEJJTkFSWV9PUEVSQVRPUlMuZ2V0KGFzdC5vcGVyYXRvcikgISxcbiAgICAgICAgYXN0LnJocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICAgIHJldHVybiBhc3QucGFyZW5zID8gdHMuY3JlYXRlUGFyZW4oYmluRXgpIDogYmluRXg7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IFJlYWRQcm9wRXhwciwgY29udGV4dDogYW55KTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0Lm5hbWUpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihhc3Q6IFJlYWRLZXlFeHByLCBjb250ZXh0OiBhbnkpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsQXJyYXlFeHByKGFzdDogTGl0ZXJhbEFycmF5RXhwciwgY29udGV4dDogYW55KTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChhc3QuZW50cmllcy5tYXAoZXhwciA9PiBleHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwRXhwcihhc3Q6IExpdGVyYWxNYXBFeHByLCBjb250ZXh0OiBhbnkpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZW50cmllcyA9IGFzdC5lbnRyaWVzLm1hcChcbiAgICAgICAgZW50cnkgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgZW50cnkucXVvdGVkID8gdHMuY3JlYXRlTGl0ZXJhbChlbnRyeS5rZXkpIDogdHMuY3JlYXRlSWRlbnRpZmllcihlbnRyeS5rZXkpLFxuICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcyk7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IENvbW1hRXhwciwgY29udGV4dDogYW55KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JhcHBlZE5vZGVFeHByKGFzdDogV3JhcHBlZE5vZGVFeHByPGFueT4sIGNvbnRleHQ6IGFueSk6IGFueSB7IHJldHVybiBhc3Qubm9kZTsgfVxufVxuXG5leHBvcnQgY2xhc3MgVHlwZVRyYW5zbGF0b3JWaXNpdG9yIGltcGxlbWVudHMgRXhwcmVzc2lvblZpc2l0b3IsIFR5cGVWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKSB7fVxuXG4gIHZpc2l0QnVpbHRpblR5cGUodHlwZTogQnVpbHRpblR5cGUsIGNvbnRleHQ6IGFueSk6IHN0cmluZyB7XG4gICAgc3dpdGNoICh0eXBlLm5hbWUpIHtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLkJvb2w6XG4gICAgICAgIHJldHVybiAnYm9vbGVhbic7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5EeW5hbWljOlxuICAgICAgICByZXR1cm4gJ2FueSc7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5JbnQ6XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5OdW1iZXI6XG4gICAgICAgIHJldHVybiAnbnVtYmVyJztcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLlN0cmluZzpcbiAgICAgICAgcmV0dXJuICdzdHJpbmcnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBidWlsdGluIHR5cGU6ICR7QnVpbHRpblR5cGVOYW1lW3R5cGUubmFtZV19YCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uVHlwZSh0eXBlOiBFeHByZXNzaW9uVHlwZSwgY29udGV4dDogYW55KTogYW55IHtcbiAgICByZXR1cm4gdHlwZS52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdEFycmF5VHlwZSh0eXBlOiBBcnJheVR5cGUsIGNvbnRleHQ6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBBcnJheTwke3R5cGUudmlzaXRUeXBlKHRoaXMsIGNvbnRleHQpfT5gO1xuICB9XG5cbiAgdmlzaXRNYXBUeXBlKHR5cGU6IE1hcFR5cGUsIGNvbnRleHQ6IGFueSk6IHN0cmluZyB7XG4gICAgaWYgKHR5cGUudmFsdWVUeXBlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gYHtba2V5OiBzdHJpbmddOiAke3R5cGUudmFsdWVUeXBlLnZpc2l0VHlwZSh0aGlzLCBjb250ZXh0KX19YDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICd7W2tleTogc3RyaW5nXTogYW55fSc7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRSZWFkVmFyRXhwcihhc3Q6IFJlYWRWYXJFeHByLCBjb250ZXh0OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmIChhc3QubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWFkVmFyRXhwciB3aXRoIG5vIHZhcmlhYmxlIG5hbWUgaW4gdHlwZWApO1xuICAgIH1cbiAgICByZXR1cm4gYXN0Lm5hbWU7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIsIGNvbnRleHQ6IGFueSk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyaXRlS2V5RXhwcihleHByOiBXcml0ZUtleUV4cHIsIGNvbnRleHQ6IGFueSk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyaXRlUHJvcEV4cHIoZXhwcjogV3JpdGVQcm9wRXhwciwgY29udGV4dDogYW55KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihhc3Q6IEludm9rZU1ldGhvZEV4cHIsIGNvbnRleHQ6IGFueSk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihhc3Q6IEludm9rZUZ1bmN0aW9uRXhwciwgY29udGV4dDogYW55KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGFzdDogSW5zdGFudGlhdGVFeHByLCBjb250ZXh0OiBhbnkpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IExpdGVyYWxFeHByLCBjb250ZXh0OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmICh0eXBlb2YgYXN0LnZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgZXNjYXBlZCA9IGFzdC52YWx1ZS5yZXBsYWNlKC9cXCcvZywgJ1xcXFxcXCcnKTtcbiAgICAgIHJldHVybiBgJyR7ZXNjYXBlZH0nYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGAke2FzdC52YWx1ZX1gO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogRXh0ZXJuYWxFeHByLCBjb250ZXh0OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fCBhc3QudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgdW5rbm93biBtb2R1bGUgb3Igc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IHRoaXMuaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KGFzdC52YWx1ZS5tb2R1bGVOYW1lLCBhc3QudmFsdWUubmFtZSk7XG4gICAgY29uc3QgYmFzZSA9IGAke21vZHVsZVN5bWJvbH0uJHthc3QudmFsdWUubmFtZX1gO1xuICAgIGlmIChhc3QudHlwZVBhcmFtcyAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgZ2VuZXJpY3MgPSBhc3QudHlwZVBhcmFtcy5tYXAodHlwZSA9PiB0eXBlLnZpc2l0VHlwZSh0aGlzLCBjb250ZXh0KSkuam9pbignLCAnKTtcbiAgICAgIHJldHVybiBgJHtiYXNlfTwke2dlbmVyaWNzfT5gO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYmFzZTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihhc3Q6IENvbmRpdGlvbmFsRXhwciwgY29udGV4dDogYW55KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogTm90RXhwciwgY29udGV4dDogYW55KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoYXN0OiBBc3NlcnROb3ROdWxsLCBjb250ZXh0OiBhbnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGFzdDogQ2FzdEV4cHIsIGNvbnRleHQ6IGFueSkgeyB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7IH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihhc3Q6IEZ1bmN0aW9uRXhwciwgY29udGV4dDogYW55KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0QmluYXJ5T3BlcmF0b3JFeHByKGFzdDogQmluYXJ5T3BlcmF0b3JFeHByLCBjb250ZXh0OiBhbnkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IFJlYWRQcm9wRXhwciwgY29udGV4dDogYW55KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoYXN0OiBSZWFkS2V5RXhwciwgY29udGV4dDogYW55KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IExpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IGFueSk6IHN0cmluZyB7XG4gICAgY29uc3QgdmFsdWVzID0gYXN0LmVudHJpZXMubWFwKGV4cHIgPT4gZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICAgIHJldHVybiBgWyR7dmFsdWVzLmpvaW4oJywnKX1dYDtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoYXN0OiBMaXRlcmFsTWFwRXhwciwgY29udGV4dDogYW55KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRDb21tYUV4cHIoYXN0OiBDb21tYUV4cHIsIGNvbnRleHQ6IGFueSkgeyB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7IH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IFdyYXBwZWROb2RlRXhwcjxhbnk+LCBjb250ZXh0OiBhbnkpIHtcbiAgICBjb25zdCBub2RlOiB0cy5Ob2RlID0gYXN0Lm5vZGU7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbnN1cHBvcnRlZCBXcmFwcGVkTm9kZUV4cHIgaW4gVHlwZVRyYW5zbGF0b3JWaXNpdG9yOiAke3RzLlN5bnRheEtpbmRbbm9kZS5raW5kXX1gKTtcbiAgICB9XG4gIH1cbn0iXX0=