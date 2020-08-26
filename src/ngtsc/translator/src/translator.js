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
        define("@angular/compiler-cli/src/ngtsc/translator/src/translator", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/output/output_ast", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeTranslatorVisitor = exports.translateType = exports.translateStatement = exports.translateExpression = exports.ImportManager = exports.Context = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var output_ast_1 = require("@angular/compiler/src/output/output_ast");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var Context = /** @class */ (function () {
        function Context(isStatement) {
            this.isStatement = isStatement;
        }
        Object.defineProperty(Context.prototype, "withExpressionMode", {
            get: function () {
                return this.isStatement ? new Context(false) : this;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Context.prototype, "withStatementMode", {
            get: function () {
                return !this.isStatement ? new Context(true) : this;
            },
            enumerable: false,
            configurable: true
        });
        return Context;
    }());
    exports.Context = Context;
    var UNARY_OPERATORS = new Map([
        [output_ast_1.UnaryOperator.Minus, ts.SyntaxKind.MinusToken],
        [output_ast_1.UnaryOperator.Plus, ts.SyntaxKind.PlusToken],
    ]);
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
    var ImportManager = /** @class */ (function () {
        function ImportManager(rewriter, prefix) {
            if (rewriter === void 0) { rewriter = new imports_1.NoopImportRewriter(); }
            if (prefix === void 0) { prefix = 'i'; }
            this.rewriter = rewriter;
            this.prefix = prefix;
            this.specifierToIdentifier = new Map();
            this.nextIndex = 0;
        }
        ImportManager.prototype.generateNamedImport = function (moduleName, originalSymbol) {
            // First, rewrite the symbol name.
            var symbol = this.rewriter.rewriteSymbol(originalSymbol, moduleName);
            // Ask the rewriter if this symbol should be imported at all. If not, it can be referenced
            // directly (moduleImport: null).
            if (!this.rewriter.shouldImportSymbol(symbol, moduleName)) {
                // The symbol should be referenced directly.
                return { moduleImport: null, symbol: symbol };
            }
            // If not, this symbol will be imported. Allocate a prefix for the imported module if needed.
            if (!this.specifierToIdentifier.has(moduleName)) {
                this.specifierToIdentifier.set(moduleName, "" + this.prefix + this.nextIndex++);
            }
            var moduleImport = this.specifierToIdentifier.get(moduleName);
            return { moduleImport: moduleImport, symbol: symbol };
        };
        ImportManager.prototype.getAllImports = function (contextPath) {
            var _this = this;
            var imports = [];
            this.specifierToIdentifier.forEach(function (qualifier, specifier) {
                specifier = _this.rewriter.rewriteSpecifier(specifier, contextPath);
                imports.push({ specifier: specifier, qualifier: qualifier });
            });
            return imports;
        };
        return ImportManager;
    }());
    exports.ImportManager = ImportManager;
    function translateExpression(expression, imports, defaultImportRecorder, scriptTarget) {
        return expression.visitExpression(new ExpressionTranslatorVisitor(imports, defaultImportRecorder, scriptTarget), new Context(false));
    }
    exports.translateExpression = translateExpression;
    function translateStatement(statement, imports, defaultImportRecorder, scriptTarget) {
        return statement.visitStatement(new ExpressionTranslatorVisitor(imports, defaultImportRecorder, scriptTarget), new Context(true));
    }
    exports.translateStatement = translateStatement;
    function translateType(type, imports) {
        return type.visitType(new TypeTranslatorVisitor(imports), new Context(false));
    }
    exports.translateType = translateType;
    var ExpressionTranslatorVisitor = /** @class */ (function () {
        function ExpressionTranslatorVisitor(imports, defaultImportRecorder, scriptTarget) {
            this.imports = imports;
            this.defaultImportRecorder = defaultImportRecorder;
            this.scriptTarget = scriptTarget;
            this.externalSourceFiles = new Map();
        }
        ExpressionTranslatorVisitor.prototype.visitDeclareVarStmt = function (stmt, context) {
            var nodeFlags = ((this.scriptTarget >= ts.ScriptTarget.ES2015) && stmt.hasModifier(compiler_1.StmtModifier.Final)) ?
                ts.NodeFlags.Const :
                ts.NodeFlags.None;
            return ts.createVariableStatement(undefined, ts.createVariableDeclarationList([ts.createVariableDeclaration(stmt.name, undefined, stmt.value && stmt.value.visitExpression(this, context.withExpressionMode))], nodeFlags));
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareFunctionStmt = function (stmt, context) {
            var _this = this;
            return ts.createFunctionDeclaration(undefined, undefined, undefined, stmt.name, undefined, stmt.params.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param.name); }), undefined, ts.createBlock(stmt.statements.map(function (child) { return child.visitStatement(_this, context.withStatementMode); })));
        };
        ExpressionTranslatorVisitor.prototype.visitExpressionStmt = function (stmt, context) {
            return ts.createStatement(stmt.expr.visitExpression(this, context.withStatementMode));
        };
        ExpressionTranslatorVisitor.prototype.visitReturnStmt = function (stmt, context) {
            return ts.createReturn(stmt.value.visitExpression(this, context.withExpressionMode));
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareClassStmt = function (stmt, context) {
            if (this.scriptTarget < ts.ScriptTarget.ES2015) {
                throw new Error("Unsupported mode: Visiting a \"declare class\" statement (class " + stmt.name + ") while " +
                    ("targeting " + ts.ScriptTarget[this.scriptTarget] + "."));
            }
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitIfStmt = function (stmt, context) {
            var _this = this;
            return ts.createIf(stmt.condition.visitExpression(this, context), ts.createBlock(stmt.trueCase.map(function (child) { return child.visitStatement(_this, context.withStatementMode); })), stmt.falseCase.length > 0 ?
                ts.createBlock(stmt.falseCase.map(function (child) { return child.visitStatement(_this, context.withStatementMode); })) :
                undefined);
        };
        ExpressionTranslatorVisitor.prototype.visitTryCatchStmt = function (stmt, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitThrowStmt = function (stmt, context) {
            return ts.createThrow(stmt.error.visitExpression(this, context.withExpressionMode));
        };
        ExpressionTranslatorVisitor.prototype.visitCommentStmt = function (stmt, context) {
            var commentStmt = ts.createNotEmittedStatement(ts.createLiteral(''));
            ts.addSyntheticLeadingComment(commentStmt, stmt.multiline ? ts.SyntaxKind.MultiLineCommentTrivia :
                ts.SyntaxKind.SingleLineCommentTrivia, stmt.comment, /** hasTrailingNewLine */ false);
            return commentStmt;
        };
        ExpressionTranslatorVisitor.prototype.visitJSDocCommentStmt = function (stmt, context) {
            var commentStmt = ts.createNotEmittedStatement(ts.createLiteral(''));
            var text = stmt.toString();
            var kind = ts.SyntaxKind.MultiLineCommentTrivia;
            ts.setSyntheticLeadingComments(commentStmt, [{ kind: kind, text: text, pos: -1, end: -1 }]);
            return commentStmt;
        };
        ExpressionTranslatorVisitor.prototype.visitReadVarExpr = function (ast, context) {
            var identifier = ts.createIdentifier(ast.name);
            this.setSourceMapRange(identifier, ast);
            return identifier;
        };
        ExpressionTranslatorVisitor.prototype.visitWriteVarExpr = function (expr, context) {
            var result = ts.createBinary(ts.createIdentifier(expr.name), ts.SyntaxKind.EqualsToken, expr.value.visitExpression(this, context));
            return context.isStatement ? result : ts.createParen(result);
        };
        ExpressionTranslatorVisitor.prototype.visitWriteKeyExpr = function (expr, context) {
            var exprContext = context.withExpressionMode;
            var lhs = ts.createElementAccess(expr.receiver.visitExpression(this, exprContext), expr.index.visitExpression(this, exprContext));
            var rhs = expr.value.visitExpression(this, exprContext);
            var result = ts.createBinary(lhs, ts.SyntaxKind.EqualsToken, rhs);
            return context.isStatement ? result : ts.createParen(result);
        };
        ExpressionTranslatorVisitor.prototype.visitWritePropExpr = function (expr, context) {
            return ts.createBinary(ts.createPropertyAccess(expr.receiver.visitExpression(this, context), expr.name), ts.SyntaxKind.EqualsToken, expr.value.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeMethodExpr = function (ast, context) {
            var _this = this;
            var target = ast.receiver.visitExpression(this, context);
            var call = ts.createCall(ast.name !== null ? ts.createPropertyAccess(target, ast.name) : target, undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
            this.setSourceMapRange(call, ast);
            return call;
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            var _this = this;
            var expr = ts.createCall(ast.fn.visitExpression(this, context), undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
            if (ast.pure) {
                ts.addSyntheticLeadingComment(expr, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', false);
            }
            this.setSourceMapRange(expr, ast);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitInstantiateExpr = function (ast, context) {
            var _this = this;
            return ts.createNew(ast.classExpr.visitExpression(this, context), undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralExpr = function (ast, context) {
            var expr;
            if (ast.value === undefined) {
                expr = ts.createIdentifier('undefined');
            }
            else if (ast.value === null) {
                expr = ts.createNull();
            }
            else {
                expr = ts.createLiteral(ast.value);
            }
            this.setSourceMapRange(expr, ast);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitLocalizedString = function (ast, context) {
            var localizedString = this.scriptTarget >= ts.ScriptTarget.ES2015 ?
                createLocalizedStringTaggedTemplate(ast, context, this) :
                createLocalizedStringFunctionCall(ast, context, this, this.imports);
            this.setSourceMapRange(localizedString, ast);
            return localizedString;
        };
        ExpressionTranslatorVisitor.prototype.visitExternalExpr = function (ast, context) {
            if (ast.value.name === null) {
                throw new Error("Import unknown module or symbol " + ast.value);
            }
            // If a moduleName is specified, this is a normal import. If there's no module name, it's a
            // reference to a global/ambient symbol.
            if (ast.value.moduleName !== null) {
                // This is a normal import. Find the imported module.
                var _a = this.imports.generateNamedImport(ast.value.moduleName, ast.value.name), moduleImport = _a.moduleImport, symbol = _a.symbol;
                if (moduleImport === null) {
                    // The symbol was ambient after all.
                    return ts.createIdentifier(symbol);
                }
                else {
                    return ts.createPropertyAccess(ts.createIdentifier(moduleImport), ts.createIdentifier(symbol));
                }
            }
            else {
                // The symbol is ambient, so just reference it.
                return ts.createIdentifier(ast.value.name);
            }
        };
        ExpressionTranslatorVisitor.prototype.visitConditionalExpr = function (ast, context) {
            var cond = ast.condition.visitExpression(this, context);
            // Ordinarily the ternary operator is right-associative. The following are equivalent:
            //   `a ? b : c ? d : e` => `a ? b : (c ? d : e)`
            //
            // However, occasionally Angular needs to produce a left-associative conditional, such as in
            // the case of a null-safe navigation production: `{{a?.b ? c : d}}`. This template produces
            // a ternary of the form:
            //   `a == null ? null : rest of expression`
            // If the rest of the expression is also a ternary though, this would produce the form:
            //   `a == null ? null : a.b ? c : d`
            // which, if left as right-associative, would be incorrectly associated as:
            //   `a == null ? null : (a.b ? c : d)`
            //
            // In such cases, the left-associativity needs to be enforced with parentheses:
            //   `(a == null ? null : a.b) ? c : d`
            //
            // Such parentheses could always be included in the condition (guaranteeing correct behavior) in
            // all cases, but this has a code size cost. Instead, parentheses are added only when a
            // conditional expression is directly used as the condition of another.
            //
            // TODO(alxhub): investigate better logic for precendence of conditional operators
            if (ast.condition instanceof compiler_1.ConditionalExpr) {
                // The condition of this ternary needs to be wrapped in parentheses to maintain
                // left-associativity.
                cond = ts.createParen(cond);
            }
            return ts.createConditional(cond, ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitNotExpr = function (ast, context) {
            return ts.createPrefix(ts.SyntaxKind.ExclamationToken, ast.condition.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            return ast.condition.visitExpression(this, context);
        };
        ExpressionTranslatorVisitor.prototype.visitCastExpr = function (ast, context) {
            return ast.value.visitExpression(this, context);
        };
        ExpressionTranslatorVisitor.prototype.visitFunctionExpr = function (ast, context) {
            var _this = this;
            return ts.createFunctionExpression(undefined, undefined, ast.name || undefined, undefined, ast.params.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param.name, undefined, undefined, undefined); }), undefined, ts.createBlock(ast.statements.map(function (stmt) { return stmt.visitStatement(_this, context); })));
        };
        ExpressionTranslatorVisitor.prototype.visitUnaryOperatorExpr = function (ast, context) {
            if (!UNARY_OPERATORS.has(ast.operator)) {
                throw new Error("Unknown unary operator: " + output_ast_1.UnaryOperator[ast.operator]);
            }
            return ts.createPrefix(UNARY_OPERATORS.get(ast.operator), ast.expr.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitBinaryOperatorExpr = function (ast, context) {
            if (!BINARY_OPERATORS.has(ast.operator)) {
                throw new Error("Unknown binary operator: " + compiler_1.BinaryOperator[ast.operator]);
            }
            return ts.createBinary(ast.lhs.visitExpression(this, context), BINARY_OPERATORS.get(ast.operator), ast.rhs.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitReadPropExpr = function (ast, context) {
            return ts.createPropertyAccess(ast.receiver.visitExpression(this, context), ast.name);
        };
        ExpressionTranslatorVisitor.prototype.visitReadKeyExpr = function (ast, context) {
            return ts.createElementAccess(ast.receiver.visitExpression(this, context), ast.index.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
            var _this = this;
            var expr = ts.createArrayLiteral(ast.entries.map(function (expr) { return expr.visitExpression(_this, context); }));
            this.setSourceMapRange(expr, ast);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var entries = ast.entries.map(function (entry) { return ts.createPropertyAssignment(entry.quoted ? ts.createLiteral(entry.key) : ts.createIdentifier(entry.key), entry.value.visitExpression(_this, context)); });
            var expr = ts.createObjectLiteral(entries);
            this.setSourceMapRange(expr, ast);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, context) {
            if (ts.isIdentifier(ast.node)) {
                this.defaultImportRecorder.recordUsedIdentifier(ast.node);
            }
            return ast.node;
        };
        ExpressionTranslatorVisitor.prototype.visitTypeofExpr = function (ast, context) {
            return ts.createTypeOf(ast.expr.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.setSourceMapRange = function (expr, ast) {
            if (ast.sourceSpan) {
                var _a = ast.sourceSpan, start = _a.start, end = _a.end;
                var _b = start.file, url = _b.url, content = _b.content;
                if (url) {
                    if (!this.externalSourceFiles.has(url)) {
                        this.externalSourceFiles.set(url, ts.createSourceMapSource(url, content, function (pos) { return pos; }));
                    }
                    var source = this.externalSourceFiles.get(url);
                    ts.setSourceMapRange(expr, { pos: start.offset, end: end.offset, source: source });
                }
            }
        };
        return ExpressionTranslatorVisitor;
    }());
    var TypeTranslatorVisitor = /** @class */ (function () {
        function TypeTranslatorVisitor(imports) {
            this.imports = imports;
        }
        TypeTranslatorVisitor.prototype.visitBuiltinType = function (type, context) {
            switch (type.name) {
                case compiler_1.BuiltinTypeName.Bool:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
                case compiler_1.BuiltinTypeName.Dynamic:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
                case compiler_1.BuiltinTypeName.Int:
                case compiler_1.BuiltinTypeName.Number:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                case compiler_1.BuiltinTypeName.String:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
                case compiler_1.BuiltinTypeName.None:
                    return ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
                default:
                    throw new Error("Unsupported builtin type: " + compiler_1.BuiltinTypeName[type.name]);
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
            if (ast.value === null) {
                // TODO(alan-agius4): Remove when we no longer support TS 3.9
                // Use: return ts.createLiteralTypeNode(ts.createNull()) directly.
                return ts.versionMajorMinor.charAt(0) === '4' ?
                    ts.createLiteralTypeNode(ts.createNull()) :
                    ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword);
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
            var typeName = moduleImport ?
                ts.createQualifiedName(ts.createIdentifier(moduleImport), symbolIdentifier) :
                symbolIdentifier;
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
            var expr = translateExpression(ast.expr, this.imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, ts.ScriptTarget.ES2015);
            return ts.createTypeQueryNode(expr);
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
    /**
     * Translate the `LocalizedString` node into a `TaggedTemplateExpression` for ES2015 formatted
     * output.
     */
    function createLocalizedStringTaggedTemplate(ast, context, visitor) {
        var template;
        var length = ast.messageParts.length;
        var metaBlock = ast.serializeI18nHead();
        if (length === 1) {
            template = ts.createNoSubstitutionTemplateLiteral(metaBlock.cooked, metaBlock.raw);
        }
        else {
            // Create the head part
            var head = ts.createTemplateHead(metaBlock.cooked, metaBlock.raw);
            var spans = [];
            // Create the middle parts
            for (var i = 1; i < length - 1; i++) {
                var resolvedExpression_1 = ast.expressions[i - 1].visitExpression(visitor, context);
                var templatePart_1 = ast.serializeI18nTemplatePart(i);
                var templateMiddle = createTemplateMiddle(templatePart_1.cooked, templatePart_1.raw);
                spans.push(ts.createTemplateSpan(resolvedExpression_1, templateMiddle));
            }
            // Create the tail part
            var resolvedExpression = ast.expressions[length - 2].visitExpression(visitor, context);
            var templatePart = ast.serializeI18nTemplatePart(length - 1);
            var templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
            spans.push(ts.createTemplateSpan(resolvedExpression, templateTail));
            // Put it all together
            template = ts.createTemplateExpression(head, spans);
        }
        return ts.createTaggedTemplate(ts.createIdentifier('$localize'), template);
    }
    // HACK: Use this in place of `ts.createTemplateMiddle()`.
    // Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed
    function createTemplateMiddle(cooked, raw) {
        var node = ts.createTemplateHead(cooked, raw);
        node.kind = ts.SyntaxKind.TemplateMiddle;
        return node;
    }
    // HACK: Use this in place of `ts.createTemplateTail()`.
    // Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed
    function createTemplateTail(cooked, raw) {
        var node = ts.createTemplateHead(cooked, raw);
        node.kind = ts.SyntaxKind.TemplateTail;
        return node;
    }
    /**
     * Translate the `LocalizedString` node into a `$localize` call using the imported
     * `__makeTemplateObject` helper for ES5 formatted output.
     */
    function createLocalizedStringFunctionCall(ast, context, visitor, imports) {
        // A `$localize` message consists `messageParts` and `expressions`, which get interleaved
        // together. The interleaved pieces look like:
        // `[messagePart0, expression0, messagePart1, expression1, messagePart2]`
        //
        // Note that there is always a message part at the start and end, and so therefore
        // `messageParts.length === expressions.length + 1`.
        //
        // Each message part may be prefixed with "metadata", which is wrapped in colons (:) delimiters.
        // The metadata is attached to the first and subsequent message parts by calls to
        // `serializeI18nHead()` and `serializeI18nTemplatePart()` respectively.
        // The first message part (i.e. `ast.messageParts[0]`) is used to initialize `messageParts` array.
        var messageParts = [ast.serializeI18nHead()];
        var expressions = [];
        // The rest of the `ast.messageParts` and each of the expressions are `ast.expressions` pushed
        // into the arrays. Note that `ast.messagePart[i]` corresponds to `expressions[i-1]`
        for (var i = 1; i < ast.messageParts.length; i++) {
            expressions.push(ast.expressions[i - 1].visitExpression(visitor, context));
            messageParts.push(ast.serializeI18nTemplatePart(i));
        }
        // The resulting downlevelled tagged template string uses a call to the `__makeTemplateObject()`
        // helper, so we must ensure it has been imported.
        var _a = imports.generateNamedImport('tslib', '__makeTemplateObject'), moduleImport = _a.moduleImport, symbol = _a.symbol;
        var __makeTemplateObjectHelper = (moduleImport === null) ?
            ts.createIdentifier(symbol) :
            ts.createPropertyAccess(ts.createIdentifier(moduleImport), ts.createIdentifier(symbol));
        // Generate the call in the form:
        // `$localize(__makeTemplateObject(cookedMessageParts, rawMessageParts), ...expressions);`
        return ts.createCall(
        /* expression */ ts.createIdentifier('$localize'), 
        /* typeArguments */ undefined, tslib_1.__spread([
            ts.createCall(
            /* expression */ __makeTemplateObjectHelper, 
            /* typeArguments */ undefined, 
            /* argumentsArray */
            [
                ts.createArrayLiteral(messageParts.map(function (messagePart) { return ts.createStringLiteral(messagePart.cooked); })),
                ts.createArrayLiteral(messageParts.map(function (messagePart) { return ts.createStringLiteral(messagePart.raw); })),
            ])
        ], expressions));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBxQjtJQUMxcUIsc0VBQTBHO0lBQzFHLCtCQUFpQztJQUVqQyxtRUFBc0g7SUFFdEg7UUFDRSxpQkFBcUIsV0FBb0I7WUFBcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFBRyxDQUFDO1FBRTdDLHNCQUFJLHVDQUFrQjtpQkFBdEI7Z0JBQ0UsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RELENBQUM7OztXQUFBO1FBRUQsc0JBQUksc0NBQWlCO2lCQUFyQjtnQkFDRSxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0RCxDQUFDOzs7V0FBQTtRQUNILGNBQUM7SUFBRCxDQUFDLEFBVkQsSUFVQztJQVZZLDBCQUFPO0lBWXBCLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUF3QztRQUNyRSxDQUFDLDBCQUFhLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQy9DLENBQUMsMEJBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7S0FDOUMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBb0M7UUFDbEUsQ0FBQyx5QkFBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFD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WUFDM0MsbUJBQW1CLENBQUMsU0FBUztZQUM3QixvQkFBb0I7WUFDcEI7Z0JBQ0UsRUFBRSxDQUFDLGtCQUFrQixDQUNqQixZQUFZLENBQUMsR0FBRyxDQUFDLFVBQUEsV0FBVyxJQUFJLE9BQUEsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBMUMsQ0FBMEMsQ0FBQyxDQUFDO2dCQUNoRixFQUFFLENBQUMsa0JBQWtCLENBQ2pCLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBQSxXQUFXLElBQUksT0FBQSxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUF2QyxDQUF1QyxDQUFDLENBQUM7YUFDOUUsQ0FBQztXQUNILFdBQVcsRUFDZCxDQUFDO0lBQ1QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FycmF5VHlwZSwgQXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpblR5cGUsIEJ1aWx0aW5UeXBlTmFtZSwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvbiwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblR5cGUsIEV4cHJlc3Npb25WaXNpdG9yLCBFeHRlcm5hbEV4cHIsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBNYXBUeXBlLCBOb3RFeHByLCBSZWFkS2V5RXhwciwgUmVhZFByb3BFeHByLCBSZWFkVmFyRXhwciwgUmV0dXJuU3RhdGVtZW50LCBTdGF0ZW1lbnQsIFN0YXRlbWVudFZpc2l0b3IsIFN0bXRNb2RpZmllciwgVGhyb3dTdG10LCBUcnlDYXRjaFN0bXQsIFR5cGUsIFR5cGVvZkV4cHIsIFR5cGVWaXNpdG9yLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0xvY2FsaXplZFN0cmluZywgVW5hcnlPcGVyYXRvciwgVW5hcnlPcGVyYXRvckV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIEltcG9ydFJld3JpdGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBOb29wSW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlzU3RhdGVtZW50OiBib29sZWFuKSB7fVxuXG4gIGdldCB3aXRoRXhwcmVzc2lvbk1vZGUoKTogQ29udGV4dCB7XG4gICAgcmV0dXJuIHRoaXMuaXNTdGF0ZW1lbnQgPyBuZXcgQ29udGV4dChmYWxzZSkgOiB0aGlzO1xuICB9XG5cbiAgZ2V0IHdpdGhTdGF0ZW1lbnRNb2RlKCk6IENvbnRleHQge1xuICAgIHJldHVybiAhdGhpcy5pc1N0YXRlbWVudCA/IG5ldyBDb250ZXh0KHRydWUpIDogdGhpcztcbiAgfVxufVxuXG5jb25zdCBVTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPFVuYXJ5T3BlcmF0b3IsIHRzLlByZWZpeFVuYXJ5T3BlcmF0b3I+KFtcbiAgW1VuYXJ5T3BlcmF0b3IuTWludXMsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFtVbmFyeU9wZXJhdG9yLlBsdXMsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuXSxcbl0pO1xuXG5jb25zdCBCSU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDxCaW5hcnlPcGVyYXRvciwgdHMuQmluYXJ5T3BlcmF0b3I+KFtcbiAgW0JpbmFyeU9wZXJhdG9yLkFuZCwgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5CaWdnZXIsIHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5Ub2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHMsIHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5CaXR3aXNlQW5kLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkRpdmlkZSwgdHMuU3ludGF4S2luZC5TbGFzaFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkVxdWFscywgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5JZGVudGljYWwsIHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTG93ZXIsIHRzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Mb3dlckVxdWFscywgdHMuU3ludGF4S2luZC5MZXNzVGhhbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk1pbnVzLCB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTW9kdWxvLCB0cy5TeW50YXhLaW5kLlBlcmNlbnRUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5NdWx0aXBseSwgdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk5vdEVxdWFscywgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk5vdElkZW50aWNhbCwgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk9yLCB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLlBsdXMsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuXSxcbl0pO1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGFuIGltcG9ydCB0aGF0IGhhcyBiZWVuIGFkZGVkIHRvIGEgbW9kdWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydCB7XG4gIC8qKiBUaGUgbmFtZSBvZiB0aGUgbW9kdWxlIHRoYXQgaGFzIGJlZW4gaW1wb3J0ZWQuICovXG4gIHNwZWNpZmllcjogc3RyaW5nO1xuICAvKiogVGhlIGFsaWFzIG9mIHRoZSBpbXBvcnRlZCBtb2R1bGUuICovXG4gIHF1YWxpZmllcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRoZSBzeW1ib2wgbmFtZSBhbmQgaW1wb3J0IG5hbWVzcGFjZSBvZiBhbiBpbXBvcnRlZCBzeW1ib2wsXG4gKiB3aGljaCBoYXMgYmVlbiByZWdpc3RlcmVkIHRocm91Z2ggdGhlIEltcG9ydE1hbmFnZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmFtZWRJbXBvcnQge1xuICAvKiogVGhlIGltcG9ydCBuYW1lc3BhY2UgY29udGFpbmluZyB0aGlzIGltcG9ydGVkIHN5bWJvbC4gKi9cbiAgbW9kdWxlSW1wb3J0OiBzdHJpbmd8bnVsbDtcbiAgLyoqIFRoZSAocG9zc2libHkgcmV3cml0dGVuKSBuYW1lIG9mIHRoZSBpbXBvcnRlZCBzeW1ib2wuICovXG4gIHN5bWJvbDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgSW1wb3J0TWFuYWdlciB7XG4gIHByaXZhdGUgc3BlY2lmaWVyVG9JZGVudGlmaWVyID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBuZXh0SW5kZXggPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZXdyaXRlcjogSW1wb3J0UmV3cml0ZXIgPSBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCksIHByaXZhdGUgcHJlZml4ID0gJ2knKSB7XG4gIH1cblxuICBnZW5lcmF0ZU5hbWVkSW1wb3J0KG1vZHVsZU5hbWU6IHN0cmluZywgb3JpZ2luYWxTeW1ib2w6IHN0cmluZyk6IE5hbWVkSW1wb3J0IHtcbiAgICAvLyBGaXJzdCwgcmV3cml0ZSB0aGUgc3ltYm9sIG5hbWUuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5yZXdyaXRlci5yZXdyaXRlU3ltYm9sKG9yaWdpbmFsU3ltYm9sLCBtb2R1bGVOYW1lKTtcblxuICAgIC8vIEFzayB0aGUgcmV3cml0ZXIgaWYgdGhpcyBzeW1ib2wgc2hvdWxkIGJlIGltcG9ydGVkIGF0IGFsbC4gSWYgbm90LCBpdCBjYW4gYmUgcmVmZXJlbmNlZFxuICAgIC8vIGRpcmVjdGx5IChtb2R1bGVJbXBvcnQ6IG51bGwpLlxuICAgIGlmICghdGhpcy5yZXdyaXRlci5zaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sLCBtb2R1bGVOYW1lKSkge1xuICAgICAgLy8gVGhlIHN5bWJvbCBzaG91bGQgYmUgcmVmZXJlbmNlZCBkaXJlY3RseS5cbiAgICAgIHJldHVybiB7bW9kdWxlSW1wb3J0OiBudWxsLCBzeW1ib2x9O1xuICAgIH1cblxuICAgIC8vIElmIG5vdCwgdGhpcyBzeW1ib2wgd2lsbCBiZSBpbXBvcnRlZC4gQWxsb2NhdGUgYSBwcmVmaXggZm9yIHRoZSBpbXBvcnRlZCBtb2R1bGUgaWYgbmVlZGVkLlxuXG4gICAgaWYgKCF0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllci5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLnNldChtb2R1bGVOYW1lLCBgJHt0aGlzLnByZWZpeH0ke3RoaXMubmV4dEluZGV4Kyt9YCk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUltcG9ydCA9IHRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLmdldChtb2R1bGVOYW1lKSE7XG5cbiAgICByZXR1cm4ge21vZHVsZUltcG9ydCwgc3ltYm9sfTtcbiAgfVxuXG4gIGdldEFsbEltcG9ydHMoY29udGV4dFBhdGg6IHN0cmluZyk6IEltcG9ydFtdIHtcbiAgICBjb25zdCBpbXBvcnRzOiB7c3BlY2lmaWVyOiBzdHJpbmcsIHF1YWxpZmllcjogc3RyaW5nfVtdID0gW107XG4gICAgdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuZm9yRWFjaCgocXVhbGlmaWVyLCBzcGVjaWZpZXIpID0+IHtcbiAgICAgIHNwZWNpZmllciA9IHRoaXMucmV3cml0ZXIucmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXIsIGNvbnRleHRQYXRoKTtcbiAgICAgIGltcG9ydHMucHVzaCh7c3BlY2lmaWVyLCBxdWFsaWZpZXJ9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gaW1wb3J0cztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlRXhwcmVzc2lvbihcbiAgICBleHByZXNzaW9uOiBFeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIGV4cHJlc3Npb24udmlzaXRFeHByZXNzaW9uKFxuICAgICAgbmV3IEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHNjcmlwdFRhcmdldCksXG4gICAgICBuZXcgQ29udGV4dChmYWxzZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgIHN0YXRlbWVudDogU3RhdGVtZW50LCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pOiB0cy5TdGF0ZW1lbnQge1xuICByZXR1cm4gc3RhdGVtZW50LnZpc2l0U3RhdGVtZW50KFxuICAgICAgbmV3IEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHNjcmlwdFRhcmdldCksXG4gICAgICBuZXcgQ29udGV4dCh0cnVlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVUeXBlKHR5cGU6IFR5cGUsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5UeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlLnZpc2l0VHlwZShuZXcgVHlwZVRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMpLCBuZXcgQ29udGV4dChmYWxzZSkpO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVHJhbnNsYXRvclZpc2l0b3IgaW1wbGVtZW50cyBFeHByZXNzaW9uVmlzaXRvciwgU3RhdGVtZW50VmlzaXRvciB7XG4gIHByaXZhdGUgZXh0ZXJuYWxTb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VNYXBTb3VyY2U+KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pIHt9XG5cbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBEZWNsYXJlVmFyU3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgICBjb25zdCBub2RlRmxhZ3MgPVxuICAgICAgICAoKHRoaXMuc2NyaXB0VGFyZ2V0ID49IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpICYmIHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkZpbmFsKSkgP1xuICAgICAgICB0cy5Ob2RlRmxhZ3MuQ29uc3QgOlxuICAgICAgICB0cy5Ob2RlRmxhZ3MuTm9uZTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoXG4gICAgICAgICAgICBbdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgICAgICAgICBzdG10Lm5hbWUsIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBzdG10LnZhbHVlICYmIHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlKSldLFxuICAgICAgICAgICAgbm9kZUZsYWdzKSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogRGVjbGFyZUZ1bmN0aW9uU3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBzdG10Lm5hbWUsIHVuZGVmaW5lZCxcbiAgICAgICAgc3RtdC5wYXJhbXMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVBhcmFtZXRlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwYXJhbS5uYW1lKSksXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgdHMuY3JlYXRlQmxvY2soXG4gICAgICAgICAgICBzdG10LnN0YXRlbWVudHMubWFwKGNoaWxkID0+IGNoaWxkLnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSkpO1xuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uU3RtdChzdG10OiBFeHByZXNzaW9uU3RhdGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvblN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVN0YXRlbWVudChzdG10LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKTtcbiAgfVxuXG4gIHZpc2l0UmV0dXJuU3RtdChzdG10OiBSZXR1cm5TdGF0ZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5SZXR1cm5TdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVSZXR1cm4oc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChzdG10OiBDbGFzc1N0bXQsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICBpZiAodGhpcy5zY3JpcHRUYXJnZXQgPCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuc3VwcG9ydGVkIG1vZGU6IFZpc2l0aW5nIGEgXCJkZWNsYXJlIGNsYXNzXCIgc3RhdGVtZW50IChjbGFzcyAke3N0bXQubmFtZX0pIHdoaWxlIGAgK1xuICAgICAgICAgIGB0YXJnZXRpbmcgJHt0cy5TY3JpcHRUYXJnZXRbdGhpcy5zY3JpcHRUYXJnZXRdfS5gKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJZlN0bXQoc3RtdDogSWZTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuSWZTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZihcbiAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICB0cy5jcmVhdGVCbG9jayhcbiAgICAgICAgICAgIHN0bXQudHJ1ZUNhc2UubWFwKGNoaWxkID0+IGNoaWxkLnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSksXG4gICAgICAgIHN0bXQuZmFsc2VDYXNlLmxlbmd0aCA+IDAgP1xuICAgICAgICAgICAgdHMuY3JlYXRlQmxvY2soc3RtdC5mYWxzZUNhc2UubWFwKFxuICAgICAgICAgICAgICAgIGNoaWxkID0+IGNoaWxkLnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSkgOlxuICAgICAgICAgICAgdW5kZWZpbmVkKTtcbiAgfVxuXG4gIHZpc2l0VHJ5Q2F0Y2hTdG10KHN0bXQ6IFRyeUNhdGNoU3RtdCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VGhyb3dTdG10KHN0bXQ6IFRocm93U3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLlRocm93U3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlVGhyb3coc3RtdC5lcnJvci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWVudFN0bXQoc3RtdDogQ29tbWVudFN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Ob3RFbWl0dGVkU3RhdGVtZW50IHtcbiAgICBjb25zdCBjb21tZW50U3RtdCA9IHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQodHMuY3JlYXRlTGl0ZXJhbCgnJykpO1xuICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KFxuICAgICAgICBjb21tZW50U3RtdCxcbiAgICAgICAgc3RtdC5tdWx0aWxpbmUgPyB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEgOlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRzLlN5bnRheEtpbmQuU2luZ2xlTGluZUNvbW1lbnRUcml2aWEsXG4gICAgICAgIHN0bXQuY29tbWVudCwgLyoqIGhhc1RyYWlsaW5nTmV3TGluZSAqLyBmYWxzZSk7XG4gICAgcmV0dXJuIGNvbW1lbnRTdG10O1xuICB9XG5cbiAgdmlzaXRKU0RvY0NvbW1lbnRTdG10KHN0bXQ6IEpTRG9jQ29tbWVudFN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Ob3RFbWl0dGVkU3RhdGVtZW50IHtcbiAgICBjb25zdCBjb21tZW50U3RtdCA9IHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQodHMuY3JlYXRlTGl0ZXJhbCgnJykpO1xuICAgIGNvbnN0IHRleHQgPSBzdG10LnRvU3RyaW5nKCk7XG4gICAgY29uc3Qga2luZCA9IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYTtcbiAgICB0cy5zZXRTeW50aGV0aWNMZWFkaW5nQ29tbWVudHMoY29tbWVudFN0bXQsIFt7a2luZCwgdGV4dCwgcG9zOiAtMSwgZW5kOiAtMX1dKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICB2aXNpdFJlYWRWYXJFeHByKGFzdDogUmVhZFZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBpZGVudGlmaWVyID0gdHMuY3JlYXRlSWRlbnRpZmllcihhc3QubmFtZSEpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoaWRlbnRpZmllciwgYXN0KTtcbiAgICByZXR1cm4gaWRlbnRpZmllcjtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlc3VsdDogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLFxuICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyByZXN1bHQgOiB0cy5jcmVhdGVQYXJlbihyZXN1bHQpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwckNvbnRleHQgPSBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZTtcbiAgICBjb25zdCBsaHMgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBleHByQ29udGV4dCksXG4gICAgICAgIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSk7XG4gICAgY29uc3QgcmhzID0gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpO1xuICAgIGNvbnN0IHJlc3VsdDogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZUJpbmFyeShsaHMsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHJocyk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyByZXN1bHQgOiB0cy5jcmVhdGVQYXJlbihyZXN1bHQpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KFxuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgZXhwci5uYW1lKSxcbiAgICAgICAgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGFzdDogSW52b2tlTWV0aG9kRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgICBjb25zdCB0YXJnZXQgPSBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICBhc3QubmFtZSAhPT0gbnVsbCA/IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRhcmdldCwgYXN0Lm5hbWUpIDogdGFyZ2V0LCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoY2FsbCwgYXN0KTtcbiAgICByZXR1cm4gY2FsbDtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGFzdDogSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICBhc3QuZm4udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIGlmIChhc3QucHVyZSkge1xuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoZXhwciwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnQF9fUFVSRV9fJywgZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIGFzdCk7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihhc3Q6IEluc3RhbnRpYXRlRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLk5ld0V4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVOZXcoXG4gICAgICAgIGFzdC5jbGFzc0V4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IExpdGVyYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgbGV0IGV4cHI6IHRzLkV4cHJlc3Npb247XG4gICAgaWYgKGFzdC52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBleHByID0gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gICAgfSBlbHNlIGlmIChhc3QudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVOdWxsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSk7XG4gICAgfVxuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwgYXN0KTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbG9jYWxpemVkU3RyaW5nID0gdGhpcy5zY3JpcHRUYXJnZXQgPj0gdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSA/XG4gICAgICAgIGNyZWF0ZUxvY2FsaXplZFN0cmluZ1RhZ2dlZFRlbXBsYXRlKGFzdCwgY29udGV4dCwgdGhpcykgOlxuICAgICAgICBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdGdW5jdGlvbkNhbGwoYXN0LCBjb250ZXh0LCB0aGlzLCB0aGlzLmltcG9ydHMpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UobG9jYWxpemVkU3RyaW5nLCBhc3QpO1xuICAgIHJldHVybiBsb2NhbGl6ZWRTdHJpbmc7XG4gIH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihhc3Q6IEV4dGVybmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvblxuICAgICAgfHRzLklkZW50aWZpZXIge1xuICAgIGlmIChhc3QudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgdW5rbm93biBtb2R1bGUgb3Igc3ltYm9sICR7YXN0LnZhbHVlfWApO1xuICAgIH1cbiAgICAvLyBJZiBhIG1vZHVsZU5hbWUgaXMgc3BlY2lmaWVkLCB0aGlzIGlzIGEgbm9ybWFsIGltcG9ydC4gSWYgdGhlcmUncyBubyBtb2R1bGUgbmFtZSwgaXQncyBhXG4gICAgLy8gcmVmZXJlbmNlIHRvIGEgZ2xvYmFsL2FtYmllbnQgc3ltYm9sLlxuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBpcyBhIG5vcm1hbCBpbXBvcnQuIEZpbmQgdGhlIGltcG9ydGVkIG1vZHVsZS5cbiAgICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICAgIHRoaXMuaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KGFzdC52YWx1ZS5tb2R1bGVOYW1lLCBhc3QudmFsdWUubmFtZSk7XG4gICAgICBpZiAobW9kdWxlSW1wb3J0ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoZSBzeW1ib2wgd2FzIGFtYmllbnQgYWZ0ZXIgYWxsLlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKFxuICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVJbXBvcnQpLCB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgc3ltYm9sIGlzIGFtYmllbnQsIHNvIGp1c3QgcmVmZXJlbmNlIGl0LlxuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoYXN0LnZhbHVlLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWxFeHByKGFzdDogQ29uZGl0aW9uYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uIHtcbiAgICBsZXQgY29uZDogdHMuRXhwcmVzc2lvbiA9IGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuXG4gICAgLy8gT3JkaW5hcmlseSB0aGUgdGVybmFyeSBvcGVyYXRvciBpcyByaWdodC1hc3NvY2lhdGl2ZS4gVGhlIGZvbGxvd2luZyBhcmUgZXF1aXZhbGVudDpcbiAgICAvLyAgIGBhID8gYiA6IGMgPyBkIDogZWAgPT4gYGEgPyBiIDogKGMgPyBkIDogZSlgXG4gICAgLy9cbiAgICAvLyBIb3dldmVyLCBvY2Nhc2lvbmFsbHkgQW5ndWxhciBuZWVkcyB0byBwcm9kdWNlIGEgbGVmdC1hc3NvY2lhdGl2ZSBjb25kaXRpb25hbCwgc3VjaCBhcyBpblxuICAgIC8vIHRoZSBjYXNlIG9mIGEgbnVsbC1zYWZlIG5hdmlnYXRpb24gcHJvZHVjdGlvbjogYHt7YT8uYiA/IGMgOiBkfX1gLiBUaGlzIHRlbXBsYXRlIHByb2R1Y2VzXG4gICAgLy8gYSB0ZXJuYXJ5IG9mIHRoZSBmb3JtOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiByZXN0IG9mIGV4cHJlc3Npb25gXG4gICAgLy8gSWYgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gaXMgYWxzbyBhIHRlcm5hcnkgdGhvdWdoLCB0aGlzIHdvdWxkIHByb2R1Y2UgdGhlIGZvcm06XG4gICAgLy8gICBgYSA9PSBudWxsID8gbnVsbCA6IGEuYiA/IGMgOiBkYFxuICAgIC8vIHdoaWNoLCBpZiBsZWZ0IGFzIHJpZ2h0LWFzc29jaWF0aXZlLCB3b3VsZCBiZSBpbmNvcnJlY3RseSBhc3NvY2lhdGVkIGFzOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiAoYS5iID8gYyA6IGQpYFxuICAgIC8vXG4gICAgLy8gSW4gc3VjaCBjYXNlcywgdGhlIGxlZnQtYXNzb2NpYXRpdml0eSBuZWVkcyB0byBiZSBlbmZvcmNlZCB3aXRoIHBhcmVudGhlc2VzOlxuICAgIC8vICAgYChhID09IG51bGwgPyBudWxsIDogYS5iKSA/IGMgOiBkYFxuICAgIC8vXG4gICAgLy8gU3VjaCBwYXJlbnRoZXNlcyBjb3VsZCBhbHdheXMgYmUgaW5jbHVkZWQgaW4gdGhlIGNvbmRpdGlvbiAoZ3VhcmFudGVlaW5nIGNvcnJlY3QgYmVoYXZpb3IpIGluXG4gICAgLy8gYWxsIGNhc2VzLCBidXQgdGhpcyBoYXMgYSBjb2RlIHNpemUgY29zdC4gSW5zdGVhZCwgcGFyZW50aGVzZXMgYXJlIGFkZGVkIG9ubHkgd2hlbiBhXG4gICAgLy8gY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBpcyBkaXJlY3RseSB1c2VkIGFzIHRoZSBjb25kaXRpb24gb2YgYW5vdGhlci5cbiAgICAvL1xuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgYmV0dGVyIGxvZ2ljIGZvciBwcmVjZW5kZW5jZSBvZiBjb25kaXRpb25hbCBvcGVyYXRvcnNcbiAgICBpZiAoYXN0LmNvbmRpdGlvbiBpbnN0YW5jZW9mIENvbmRpdGlvbmFsRXhwcikge1xuICAgICAgLy8gVGhlIGNvbmRpdGlvbiBvZiB0aGlzIHRlcm5hcnkgbmVlZHMgdG8gYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlcyB0byBtYWludGFpblxuICAgICAgLy8gbGVmdC1hc3NvY2lhdGl2aXR5LlxuICAgICAgY29uZCA9IHRzLmNyZWF0ZVBhcmVuKGNvbmQpO1xuICAgIH1cblxuICAgIHJldHVybiB0cy5jcmVhdGVDb25kaXRpb25hbChcbiAgICAgICAgY29uZCwgYXN0LnRydWVDYXNlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICAgICAgYXN0LmZhbHNlQ2FzZSEudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0Tm90RXhwcihhc3Q6IE5vdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVQcmVmaXgoXG4gICAgICAgIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRBc3NlcnROb3ROdWxsRXhwcihhc3Q6IEFzc2VydE5vdE51bGwsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Ob25OdWxsRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICB9XG5cbiAgdmlzaXRDYXN0RXhwcihhc3Q6IENhc3RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIGFzdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihhc3Q6IEZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGFzdC5uYW1lIHx8IHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICBhc3QucGFyYW1zLm1hcChcbiAgICAgICAgICAgIHBhcmFtID0+IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwYXJhbS5uYW1lLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKSksXG4gICAgICAgIHVuZGVmaW5lZCwgdHMuY3JlYXRlQmxvY2soYXN0LnN0YXRlbWVudHMubWFwKHN0bXQgPT4gc3RtdC52aXNpdFN0YXRlbWVudCh0aGlzLCBjb250ZXh0KSkpKTtcbiAgfVxuXG4gIHZpc2l0VW5hcnlPcGVyYXRvckV4cHIoYXN0OiBVbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICghVU5BUllfT1BFUkFUT1JTLmhhcyhhc3Qub3BlcmF0b3IpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdW5hcnkgb3BlcmF0b3I6ICR7VW5hcnlPcGVyYXRvclthc3Qub3BlcmF0b3JdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlUHJlZml4KFxuICAgICAgICBVTkFSWV9PUEVSQVRPUlMuZ2V0KGFzdC5vcGVyYXRvcikhLCBhc3QuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBCaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAoIUJJTkFSWV9PUEVSQVRPUlMuaGFzKGFzdC5vcGVyYXRvcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBiaW5hcnkgb3BlcmF0b3I6ICR7QmluYXJ5T3BlcmF0b3JbYXN0Lm9wZXJhdG9yXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgYXN0Lmxocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIEJJTkFSWV9PUEVSQVRPUlMuZ2V0KGFzdC5vcGVyYXRvcikhLFxuICAgICAgICBhc3QucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IFJlYWRQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGFzdC5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGFzdC5uYW1lKTtcbiAgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoYXN0OiBSZWFkS2V5RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhcbiAgICAgICAgYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0LmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoYXN0OiBMaXRlcmFsQXJyYXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwciA9XG4gICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChhc3QuZW50cmllcy5tYXAoZXhwciA9PiBleHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwgYXN0KTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoYXN0OiBMaXRlcmFsTWFwRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBjb25zdCBlbnRyaWVzID0gYXN0LmVudHJpZXMubWFwKFxuICAgICAgICBlbnRyeSA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICBlbnRyeS5xdW90ZWQgPyB0cy5jcmVhdGVMaXRlcmFsKGVudHJ5LmtleSkgOiB0cy5jcmVhdGVJZGVudGlmaWVyKGVudHJ5LmtleSksXG4gICAgICAgICAgICBlbnRyeS52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpKTtcbiAgICBjb25zdCBleHByID0gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChlbnRyaWVzKTtcbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIGFzdCk7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IENvbW1hRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IFdyYXBwZWROb2RlRXhwcjxhbnk+LCBjb250ZXh0OiBDb250ZXh0KTogYW55IHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGFzdC5ub2RlKSkge1xuICAgICAgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIucmVjb3JkVXNlZElkZW50aWZpZXIoYXN0Lm5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gYXN0Lm5vZGU7XG4gIH1cblxuICB2aXNpdFR5cGVvZkV4cHIoYXN0OiBUeXBlb2ZFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU9mRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVPZihhc3QuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRTb3VyY2VNYXBSYW5nZShleHByOiB0cy5FeHByZXNzaW9uLCBhc3Q6IEV4cHJlc3Npb24pIHtcbiAgICBpZiAoYXN0LnNvdXJjZVNwYW4pIHtcbiAgICAgIGNvbnN0IHtzdGFydCwgZW5kfSA9IGFzdC5zb3VyY2VTcGFuO1xuICAgICAgY29uc3Qge3VybCwgY29udGVudH0gPSBzdGFydC5maWxlO1xuICAgICAgaWYgKHVybCkge1xuICAgICAgICBpZiAoIXRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5oYXModXJsKSkge1xuICAgICAgICAgIHRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5zZXQodXJsLCB0cy5jcmVhdGVTb3VyY2VNYXBTb3VyY2UodXJsLCBjb250ZW50LCBwb3MgPT4gcG9zKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5leHRlcm5hbFNvdXJjZUZpbGVzLmdldCh1cmwpO1xuICAgICAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCB7cG9zOiBzdGFydC5vZmZzZXQsIGVuZDogZW5kLm9mZnNldCwgc291cmNlfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUeXBlVHJhbnNsYXRvclZpc2l0b3IgaW1wbGVtZW50cyBFeHByZXNzaW9uVmlzaXRvciwgVHlwZVZpc2l0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpIHt9XG5cbiAgdmlzaXRCdWlsdGluVHlwZSh0eXBlOiBCdWlsdGluVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLktleXdvcmRUeXBlTm9kZSB7XG4gICAgc3dpdGNoICh0eXBlLm5hbWUpIHtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLkJvb2w6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5Cb29sZWFuS2V5d29yZCk7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5EeW5hbWljOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCk7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5JbnQ6XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5OdW1iZXI6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OdW1iZXJLZXl3b3JkKTtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLlN0cmluZzpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuTm9uZTpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLk5ldmVyS2V5d29yZCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGJ1aWx0aW4gdHlwZTogJHtCdWlsdGluVHlwZU5hbWVbdHlwZS5uYW1lXX1gKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25UeXBlKHR5cGU6IEV4cHJlc3Npb25UeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IHR5cGVOb2RlID0gdGhpcy50cmFuc2xhdGVFeHByZXNzaW9uKHR5cGUudmFsdWUsIGNvbnRleHQpO1xuICAgIGlmICh0eXBlLnR5cGVQYXJhbXMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0eXBlTm9kZTtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0FuIEV4cHJlc3Npb25UeXBlIHdpdGggdHlwZSBhcmd1bWVudHMgbXVzdCB0cmFuc2xhdGUgaW50byBhIFR5cGVSZWZlcmVuY2VOb2RlJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlTm9kZS50eXBlQXJndW1lbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQW4gRXhwcmVzc2lvblR5cGUgd2l0aCB0eXBlIGFyZ3VtZW50cyBjYW5ub3QgaGF2ZSBtdWx0aXBsZSBsZXZlbHMgb2YgdHlwZSBhcmd1bWVudHNgKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlQXJncyA9IHR5cGUudHlwZVBhcmFtcy5tYXAocGFyYW0gPT4gdGhpcy50cmFuc2xhdGVUeXBlKHBhcmFtLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHR5cGVOb2RlLnR5cGVOYW1lLCB0eXBlQXJncyk7XG4gIH1cblxuICB2aXNpdEFycmF5VHlwZSh0eXBlOiBBcnJheVR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5BcnJheVR5cGVOb2RlIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQXJyYXlUeXBlTm9kZSh0aGlzLnRyYW5zbGF0ZVR5cGUodHlwZS5vZiwgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRNYXBUeXBlKHR5cGU6IE1hcFR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTGl0ZXJhbE5vZGUge1xuICAgIGNvbnN0IHBhcmFtZXRlciA9IHRzLmNyZWF0ZVBhcmFtZXRlcihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgJ2tleScsIHVuZGVmaW5lZCxcbiAgICAgICAgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZCkpO1xuICAgIGNvbnN0IHR5cGVBcmdzID0gdHlwZS52YWx1ZVR5cGUgIT09IG51bGwgP1xuICAgICAgICB0aGlzLnRyYW5zbGF0ZVR5cGUodHlwZS52YWx1ZVR5cGUsIGNvbnRleHQpIDpcbiAgICAgICAgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVW5rbm93bktleXdvcmQpO1xuICAgIGNvbnN0IGluZGV4U2lnbmF0dXJlID0gdHMuY3JlYXRlSW5kZXhTaWduYXR1cmUodW5kZWZpbmVkLCB1bmRlZmluZWQsIFtwYXJhbWV0ZXJdLCB0eXBlQXJncyk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShbaW5kZXhTaWduYXR1cmVdKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBSZWFkVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVRdWVyeU5vZGUge1xuICAgIGlmIChhc3QubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWFkVmFyRXhwciB3aXRoIG5vIHZhcmlhYmxlIG5hbWUgaW4gdHlwZWApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZSh0cy5jcmVhdGVJZGVudGlmaWVyKGFzdC5uYW1lKSk7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBXcml0ZVByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihhc3Q6IEludm9rZU1ldGhvZEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoYXN0OiBJbnZva2VGdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoYXN0OiBJbnN0YW50aWF0ZUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IExpdGVyYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGlmIChhc3QudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRPRE8oYWxhbi1hZ2l1czQpOiBSZW1vdmUgd2hlbiB3ZSBubyBsb25nZXIgc3VwcG9ydCBUUyAzLjlcbiAgICAgIC8vIFVzZTogcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVOdWxsKCkpIGRpcmVjdGx5LlxuICAgICAgcmV0dXJuIHRzLnZlcnNpb25NYWpvck1pbm9yLmNoYXJBdCgwKSA9PT0gJzQnID9cbiAgICAgICAgICB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTnVsbCgpIGFzIGFueSkgOlxuICAgICAgICAgIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkIGFzIGFueSk7XG4gICAgfSBlbHNlIGlmIChhc3QudmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFzdC52YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYXN0LnZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKSk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRMb2NhbGl6ZWRTdHJpbmcoYXN0OiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoYXN0OiBFeHRlcm5hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FbnRpdHlOYW1lfHRzLlR5cGVSZWZlcmVuY2VOb2RlIHtcbiAgICBpZiAoYXN0LnZhbHVlLm1vZHVsZU5hbWUgPT09IG51bGwgfHwgYXN0LnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHVua25vd24gbW9kdWxlIG9yIHN5bWJvbGApO1xuICAgIH1cbiAgICBjb25zdCB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9ID1cbiAgICAgICAgdGhpcy5pbXBvcnRzLmdlbmVyYXRlTmFtZWRJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUsIGFzdC52YWx1ZS5uYW1lKTtcbiAgICBjb25zdCBzeW1ib2xJZGVudGlmaWVyID0gdHMuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpO1xuXG4gICAgY29uc3QgdHlwZU5hbWUgPSBtb2R1bGVJbXBvcnQgP1xuICAgICAgICB0cy5jcmVhdGVRdWFsaWZpZWROYW1lKHRzLmNyZWF0ZUlkZW50aWZpZXIobW9kdWxlSW1wb3J0KSwgc3ltYm9sSWRlbnRpZmllcikgOlxuICAgICAgICBzeW1ib2xJZGVudGlmaWVyO1xuXG4gICAgY29uc3QgdHlwZUFyZ3VtZW50cyA9IGFzdC50eXBlUGFyYW1zICE9PSBudWxsID9cbiAgICAgICAgYXN0LnR5cGVQYXJhbXMubWFwKHR5cGUgPT4gdGhpcy50cmFuc2xhdGVUeXBlKHR5cGUsIGNvbnRleHQpKSA6XG4gICAgICAgIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5hbWUsIHR5cGVBcmd1bWVudHMpO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoYXN0OiBDb25kaXRpb25hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoYXN0OiBOb3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRBc3NlcnROb3ROdWxsRXhwcihhc3Q6IEFzc2VydE5vdE51bGwsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGFzdDogQ2FzdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uRXhwcihhc3Q6IEZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VW5hcnlPcGVyYXRvckV4cHIoYXN0OiBVbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0QmluYXJ5T3BlcmF0b3JFeHByKGFzdDogQmluYXJ5T3BlcmF0b3JFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRSZWFkUHJvcEV4cHIoYXN0OiBSZWFkUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGFzdDogUmVhZEtleUV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoYXN0OiBMaXRlcmFsQXJyYXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHVwbGVUeXBlTm9kZSB7XG4gICAgY29uc3QgdmFsdWVzID0gYXN0LmVudHJpZXMubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGVFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHVwbGVUeXBlTm9kZSh2YWx1ZXMpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwRXhwcihhc3Q6IExpdGVyYWxNYXBFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZUxpdGVyYWxOb2RlIHtcbiAgICBjb25zdCBlbnRyaWVzID0gYXN0LmVudHJpZXMubWFwKGVudHJ5ID0+IHtcbiAgICAgIGNvbnN0IHtrZXksIHF1b3RlZH0gPSBlbnRyeTtcbiAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24oZW50cnkudmFsdWUsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5U2lnbmF0dXJlKFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogbmFtZSAqLyBxdW90ZWQgPyB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKGtleSkgOiBrZXksXG4gICAgICAgICAgLyogcXVlc3Rpb25Ub2tlbiAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgLyogdHlwZSAqLyB0eXBlLFxuICAgICAgICAgIC8qIGluaXRpYWxpemVyICovIHVuZGVmaW5lZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVMaXRlcmFsTm9kZShlbnRyaWVzKTtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGFzdDogQ29tbWFFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcmFwcGVkTm9kZUV4cHIoYXN0OiBXcmFwcGVkTm9kZUV4cHI8YW55PiwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCBub2RlOiB0cy5Ob2RlID0gYXN0Lm5vZGU7XG4gICAgaWYgKHRzLmlzRW50aXR5TmFtZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKG5vZGUsIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzVHlwZU5vZGUobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbnN1cHBvcnRlZCBXcmFwcGVkTm9kZUV4cHIgaW4gVHlwZVRyYW5zbGF0b3JWaXNpdG9yOiAke3RzLlN5bnRheEtpbmRbbm9kZS5raW5kXX1gKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdFR5cGVvZkV4cHIoYXN0OiBUeXBlb2ZFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZVF1ZXJ5Tm9kZSB7XG4gICAgbGV0IGV4cHIgPSB0cmFuc2xhdGVFeHByZXNzaW9uKFxuICAgICAgICBhc3QuZXhwciwgdGhpcy5pbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVF1ZXJ5Tm9kZShleHByIGFzIHRzLklkZW50aWZpZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2xhdGVUeXBlKHR5cGU6IFR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0eXBlLnZpc2l0VHlwZSh0aGlzLCBjb250ZXh0KTtcbiAgICBpZiAoIXRzLmlzVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEEgVHlwZSBtdXN0IHRyYW5zbGF0ZSB0byBhIFR5cGVOb2RlLCBidXQgd2FzICR7dHMuU3ludGF4S2luZFt0eXBlTm9kZS5raW5kXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVOb2RlO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2xhdGVFeHByZXNzaW9uKGV4cHI6IEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgdHlwZU5vZGUgPSBleHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgICBpZiAoIXRzLmlzVHlwZU5vZGUodHlwZU5vZGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEFuIEV4cHJlc3Npb24gbXVzdCB0cmFuc2xhdGUgdG8gYSBUeXBlTm9kZSwgYnV0IHdhcyAke3RzLlN5bnRheEtpbmRbdHlwZU5vZGUua2luZF19YCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlTm9kZTtcbiAgfVxufVxuXG4vKipcbiAqIFRyYW5zbGF0ZSB0aGUgYExvY2FsaXplZFN0cmluZ2Agbm9kZSBpbnRvIGEgYFRhZ2dlZFRlbXBsYXRlRXhwcmVzc2lvbmAgZm9yIEVTMjAxNSBmb3JtYXR0ZWRcbiAqIG91dHB1dC5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTG9jYWxpemVkU3RyaW5nVGFnZ2VkVGVtcGxhdGUoXG4gICAgYXN0OiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQsIHZpc2l0b3I6IEV4cHJlc3Npb25WaXNpdG9yKSB7XG4gIGxldCB0ZW1wbGF0ZTogdHMuVGVtcGxhdGVMaXRlcmFsO1xuICBjb25zdCBsZW5ndGggPSBhc3QubWVzc2FnZVBhcnRzLmxlbmd0aDtcbiAgY29uc3QgbWV0YUJsb2NrID0gYXN0LnNlcmlhbGl6ZUkxOG5IZWFkKCk7XG4gIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICB0ZW1wbGF0ZSA9IHRzLmNyZWF0ZU5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKG1ldGFCbG9jay5jb29rZWQsIG1ldGFCbG9jay5yYXcpO1xuICB9IGVsc2Uge1xuICAgIC8vIENyZWF0ZSB0aGUgaGVhZCBwYXJ0XG4gICAgY29uc3QgaGVhZCA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChtZXRhQmxvY2suY29va2VkLCBtZXRhQmxvY2sucmF3KTtcbiAgICBjb25zdCBzcGFuczogdHMuVGVtcGxhdGVTcGFuW10gPSBbXTtcbiAgICAvLyBDcmVhdGUgdGhlIG1pZGRsZSBwYXJ0c1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCByZXNvbHZlZEV4cHJlc3Npb24gPSBhc3QuZXhwcmVzc2lvbnNbaSAtIDFdLnZpc2l0RXhwcmVzc2lvbih2aXNpdG9yLCBjb250ZXh0KTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUGFydCA9IGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGkpO1xuICAgICAgY29uc3QgdGVtcGxhdGVNaWRkbGUgPSBjcmVhdGVUZW1wbGF0ZU1pZGRsZSh0ZW1wbGF0ZVBhcnQuY29va2VkLCB0ZW1wbGF0ZVBhcnQucmF3KTtcbiAgICAgIHNwYW5zLnB1c2godHMuY3JlYXRlVGVtcGxhdGVTcGFuKHJlc29sdmVkRXhwcmVzc2lvbiwgdGVtcGxhdGVNaWRkbGUpKTtcbiAgICB9XG4gICAgLy8gQ3JlYXRlIHRoZSB0YWlsIHBhcnRcbiAgICBjb25zdCByZXNvbHZlZEV4cHJlc3Npb24gPSBhc3QuZXhwcmVzc2lvbnNbbGVuZ3RoIC0gMl0udmlzaXRFeHByZXNzaW9uKHZpc2l0b3IsIGNvbnRleHQpO1xuICAgIGNvbnN0IHRlbXBsYXRlUGFydCA9IGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGxlbmd0aCAtIDEpO1xuICAgIGNvbnN0IHRlbXBsYXRlVGFpbCA9IGNyZWF0ZVRlbXBsYXRlVGFpbCh0ZW1wbGF0ZVBhcnQuY29va2VkLCB0ZW1wbGF0ZVBhcnQucmF3KTtcbiAgICBzcGFucy5wdXNoKHRzLmNyZWF0ZVRlbXBsYXRlU3BhbihyZXNvbHZlZEV4cHJlc3Npb24sIHRlbXBsYXRlVGFpbCkpO1xuICAgIC8vIFB1dCBpdCBhbGwgdG9nZXRoZXJcbiAgICB0ZW1wbGF0ZSA9IHRzLmNyZWF0ZVRlbXBsYXRlRXhwcmVzc2lvbihoZWFkLCBzcGFucyk7XG4gIH1cbiAgcmV0dXJuIHRzLmNyZWF0ZVRhZ2dlZFRlbXBsYXRlKHRzLmNyZWF0ZUlkZW50aWZpZXIoJyRsb2NhbGl6ZScpLCB0ZW1wbGF0ZSk7XG59XG5cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlTWlkZGxlKClgLlxuLy8gUmV2ZXJ0IG9uY2UgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNTM3NCBpcyBmaXhlZFxuZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVNaWRkbGUoY29va2VkOiBzdHJpbmcsIHJhdzogc3RyaW5nKTogdHMuVGVtcGxhdGVNaWRkbGUge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlTWlkZGxlO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZU1pZGRsZTtcbn1cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlVGFpbCgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWRcbmZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlVGFpbChjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiB0cy5UZW1wbGF0ZVRhaWwge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlVGFpbDtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVUYWlsO1xufVxuXG4vKipcbiAqIFRyYW5zbGF0ZSB0aGUgYExvY2FsaXplZFN0cmluZ2Agbm9kZSBpbnRvIGEgYCRsb2NhbGl6ZWAgY2FsbCB1c2luZyB0aGUgaW1wb3J0ZWRcbiAqIGBfX21ha2VUZW1wbGF0ZU9iamVjdGAgaGVscGVyIGZvciBFUzUgZm9ybWF0dGVkIG91dHB1dC5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTG9jYWxpemVkU3RyaW5nRnVuY3Rpb25DYWxsKFxuICAgIGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0LCB2aXNpdG9yOiBFeHByZXNzaW9uVmlzaXRvciwgaW1wb3J0czogSW1wb3J0TWFuYWdlcikge1xuICAvLyBBIGAkbG9jYWxpemVgIG1lc3NhZ2UgY29uc2lzdHMgYG1lc3NhZ2VQYXJ0c2AgYW5kIGBleHByZXNzaW9uc2AsIHdoaWNoIGdldCBpbnRlcmxlYXZlZFxuICAvLyB0b2dldGhlci4gVGhlIGludGVybGVhdmVkIHBpZWNlcyBsb29rIGxpa2U6XG4gIC8vIGBbbWVzc2FnZVBhcnQwLCBleHByZXNzaW9uMCwgbWVzc2FnZVBhcnQxLCBleHByZXNzaW9uMSwgbWVzc2FnZVBhcnQyXWBcbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoZXJlIGlzIGFsd2F5cyBhIG1lc3NhZ2UgcGFydCBhdCB0aGUgc3RhcnQgYW5kIGVuZCwgYW5kIHNvIHRoZXJlZm9yZVxuICAvLyBgbWVzc2FnZVBhcnRzLmxlbmd0aCA9PT0gZXhwcmVzc2lvbnMubGVuZ3RoICsgMWAuXG4gIC8vXG4gIC8vIEVhY2ggbWVzc2FnZSBwYXJ0IG1heSBiZSBwcmVmaXhlZCB3aXRoIFwibWV0YWRhdGFcIiwgd2hpY2ggaXMgd3JhcHBlZCBpbiBjb2xvbnMgKDopIGRlbGltaXRlcnMuXG4gIC8vIFRoZSBtZXRhZGF0YSBpcyBhdHRhY2hlZCB0byB0aGUgZmlyc3QgYW5kIHN1YnNlcXVlbnQgbWVzc2FnZSBwYXJ0cyBieSBjYWxscyB0b1xuICAvLyBgc2VyaWFsaXplSTE4bkhlYWQoKWAgYW5kIGBzZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KClgIHJlc3BlY3RpdmVseS5cblxuICAvLyBUaGUgZmlyc3QgbWVzc2FnZSBwYXJ0IChpLmUuIGBhc3QubWVzc2FnZVBhcnRzWzBdYCkgaXMgdXNlZCB0byBpbml0aWFsaXplIGBtZXNzYWdlUGFydHNgIGFycmF5LlxuICBjb25zdCBtZXNzYWdlUGFydHMgPSBbYXN0LnNlcmlhbGl6ZUkxOG5IZWFkKCldO1xuICBjb25zdCBleHByZXNzaW9uczogYW55W10gPSBbXTtcblxuICAvLyBUaGUgcmVzdCBvZiB0aGUgYGFzdC5tZXNzYWdlUGFydHNgIGFuZCBlYWNoIG9mIHRoZSBleHByZXNzaW9ucyBhcmUgYGFzdC5leHByZXNzaW9uc2AgcHVzaGVkXG4gIC8vIGludG8gdGhlIGFycmF5cy4gTm90ZSB0aGF0IGBhc3QubWVzc2FnZVBhcnRbaV1gIGNvcnJlc3BvbmRzIHRvIGBleHByZXNzaW9uc1tpLTFdYFxuICBmb3IgKGxldCBpID0gMTsgaSA8IGFzdC5tZXNzYWdlUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBleHByZXNzaW9ucy5wdXNoKGFzdC5leHByZXNzaW9uc1tpIC0gMV0udmlzaXRFeHByZXNzaW9uKHZpc2l0b3IsIGNvbnRleHQpKTtcbiAgICBtZXNzYWdlUGFydHMucHVzaChhc3Quc2VyaWFsaXplSTE4blRlbXBsYXRlUGFydChpKSk7XG4gIH1cblxuICAvLyBUaGUgcmVzdWx0aW5nIGRvd25sZXZlbGxlZCB0YWdnZWQgdGVtcGxhdGUgc3RyaW5nIHVzZXMgYSBjYWxsIHRvIHRoZSBgX19tYWtlVGVtcGxhdGVPYmplY3QoKWBcbiAgLy8gaGVscGVyLCBzbyB3ZSBtdXN0IGVuc3VyZSBpdCBoYXMgYmVlbiBpbXBvcnRlZC5cbiAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9IGltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydCgndHNsaWInLCAnX19tYWtlVGVtcGxhdGVPYmplY3QnKTtcbiAgY29uc3QgX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIgPSAobW9kdWxlSW1wb3J0ID09PSBudWxsKSA/XG4gICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkgOlxuICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModHMuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVJbXBvcnQpLCB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjYWxsIGluIHRoZSBmb3JtOlxuICAvLyBgJGxvY2FsaXplKF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZE1lc3NhZ2VQYXJ0cywgcmF3TWVzc2FnZVBhcnRzKSwgLi4uZXhwcmVzc2lvbnMpO2BcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIHRzLmNyZWF0ZUlkZW50aWZpZXIoJyRsb2NhbGl6ZScpLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1tcbiAgICAgICAgdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIsXG4gICAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VQYXJ0cy5tYXAobWVzc2FnZVBhcnQgPT4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChtZXNzYWdlUGFydC5jb29rZWQpKSksXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VQYXJ0cy5tYXAobWVzc2FnZVBhcnQgPT4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChtZXNzYWdlUGFydC5yYXcpKSksXG4gICAgICAgICAgICBdKSxcbiAgICAgICAgLi4uZXhwcmVzc2lvbnMsXG4gICAgICBdKTtcbn1cbiJdfQ==