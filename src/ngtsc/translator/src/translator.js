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
        define("@angular/compiler-cli/src/ngtsc/translator/src/translator", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeTranslatorVisitor = exports.translateType = exports.translateStatement = exports.translateExpression = exports.ImportManager = exports.Context = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
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
            throw new Error('Method not implemented.');
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
            return this.scriptTarget >= ts.ScriptTarget.ES2015 ?
                createLocalizedStringTaggedTemplate(ast, context, this) :
                createLocalizedStringFunctionCall(ast, context, this, this.imports);
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
                return ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBxQjtJQUUxcUIsK0JBQWlDO0lBRWpDLG1FQUFzSDtJQUV0SDtRQUNFLGlCQUFxQixXQUFvQjtZQUFwQixnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQUFHLENBQUM7UUFFN0Msc0JBQUksdUNBQWtCO2lCQUF0QjtnQkFDRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEQsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBSSxzQ0FBaUI7aUJBQXJCO2dCQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RELENBQUM7OztXQUFBO1FBQ0gsY0FBQztJQUFELENBQUMsQUFWRCxJQVVDO0lBVlksMEJBQU87SUFZcEIsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBb0M7UUFDbEUsQ0FBQyx5QkFBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1FBQzNELENBQUMseUJBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUN2RCxDQUFDLHlCQUFjLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUM7UUFDbkUsQ0FBQyx5QkFBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztRQUN6RCxDQUFDLHlCQUFjLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQ2pELENBQUMseUJBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztRQUN4RCxDQUFDLHlCQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7UUFDakUsQ0FBQyx5QkFBYyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztRQUNuRCxDQUFDLHlCQUFjLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUM7UUFDL0QsQ0FBQyx5QkFBYyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUNoRCxDQUFDLHlCQUFjLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1FBQ25ELENBQUMseUJBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7UUFDdEQsQ0FBQyx5QkFBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDO1FBQ2hFLENBQUMseUJBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQztRQUN6RSxDQUFDLHlCQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQzlDLENBQUMseUJBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7S0FDL0MsQ0FBQyxDQUFDO0lBdUJIO1FBSUUsdUJBQXNCLFFBQW1ELEVBQVUsTUFBWTtZQUF6RSx5QkFBQSxFQUFBLGVBQStCLDRCQUFrQixFQUFFO1lBQVUsdUJBQUEsRUFBQSxZQUFZO1lBQXpFLGFBQVEsR0FBUixRQUFRLENBQTJDO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBTTtZQUh2RiwwQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUNsRCxjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBR3RCLENBQUM7UUFFRCwyQ0FBbUIsR0FBbkIsVUFBb0IsVUFBa0IsRUFBRSxjQUFzQjtZQUM1RCxrQ0FBa0M7WUFDbEMsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRXZFLDBGQUEwRjtZQUMxRixpQ0FBaUM7WUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFO2dCQUN6RCw0Q0FBNEM7Z0JBQzVDLE9BQU8sRUFBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBQSxFQUFDLENBQUM7YUFDckM7WUFFRCw2RkFBNkY7WUFFN0YsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQy9DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFJLENBQUMsQ0FBQzthQUNqRjtZQUNELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFFLENBQUM7WUFFakUsT0FBTyxFQUFDLFlBQVksY0FBQSxFQUFFLE1BQU0sUUFBQSxFQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELHFDQUFhLEdBQWIsVUFBYyxXQUFtQjtZQUFqQyxpQkFPQztZQU5DLElBQU0sT0FBTyxHQUE2QyxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxVQUFDLFNBQVMsRUFBRSxTQUFTO2dCQUN0RCxTQUFTLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ25FLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxTQUFTLFdBQUEsRUFBRSxTQUFTLFdBQUEsRUFBQyxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBcENELElBb0NDO0lBcENZLHNDQUFhO0lBc0MxQixTQUFnQixtQkFBbUIsQ0FDL0IsVUFBc0IsRUFBRSxPQUFzQixFQUFFLHFCQUE0QyxFQUM1RixZQUE0RDtRQUM5RCxPQUFPLFVBQVUsQ0FBQyxlQUFlLENBQzdCLElBQUksMkJBQTJCLENBQUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFlBQVksQ0FBQyxFQUM3RSxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFORCxrREFNQztJQUVELFNBQWdCLGtCQUFrQixDQUM5QixTQUFvQixFQUFFLE9BQXNCLEVBQUUscUJBQTRDLEVBQzFGLFlBQTREO1FBQzlELE9BQU8sU0FBUyxDQUFDLGNBQWMsQ0FDM0IsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsWUFBWSxDQUFDLEVBQzdFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQU5ELGdEQU1DO0lBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQVUsRUFBRSxPQUFzQjtRQUM5RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFGRCxzQ0FFQztJQUVEO1FBRUUscUNBQ1ksT0FBc0IsRUFBVSxxQkFBNEMsRUFDNUUsWUFBNEQ7WUFENUQsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQUFVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7WUFDNUUsaUJBQVksR0FBWixZQUFZLENBQWdEO1lBSGhFLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBR08sQ0FBQztRQUU1RSx5REFBbUIsR0FBbkIsVUFBb0IsSUFBb0IsRUFBRSxPQUFnQjtZQUN4RCxJQUFNLFNBQVMsR0FDWCxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pGLEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BCLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUM3QixTQUFTLEVBQ1QsRUFBRSxDQUFDLDZCQUE2QixDQUM1QixDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FDekIsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQ3BCLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFDaEYsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsOERBQXdCLEdBQXhCLFVBQXlCLElBQXlCLEVBQUUsT0FBZ0I7WUFBcEUsaUJBT0M7WUFOQyxPQUFPLEVBQUUsQ0FBQyx5QkFBeUIsQ0FDL0IsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQS9ELENBQStELENBQUMsRUFDekYsU0FBUyxFQUNULEVBQUUsQ0FBQyxXQUFXLENBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUksRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBRUQseURBQW1CLEdBQW5CLFVBQW9CLElBQXlCLEVBQUUsT0FBZ0I7WUFDN0QsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFFRCxxREFBZSxHQUFmLFVBQWdCLElBQXFCLEVBQUUsT0FBZ0I7WUFDckQsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCwyREFBcUIsR0FBckIsVUFBc0IsSUFBZSxFQUFFLE9BQWdCO1lBQ3JELElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtnQkFDOUMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxRUFBaUUsSUFBSSxDQUFDLElBQUksYUFBVTtxQkFDcEYsZUFBYSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBRyxDQUFBLENBQUMsQ0FBQzthQUN6RDtZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsaURBQVcsR0FBWCxVQUFZLElBQVksRUFBRSxPQUFnQjtZQUExQyxpQkFTQztZQVJDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FDZCxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQzdDLEVBQUUsQ0FBQyxXQUFXLENBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUksRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDLEVBQ3RGLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUM3QixVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFyRCxDQUFxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxTQUFTLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsdURBQWlCLEdBQWpCLFVBQWtCLElBQWtCLEVBQUUsT0FBZ0I7WUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxvREFBYyxHQUFkLFVBQWUsSUFBZSxFQUFFLE9BQWdCO1lBQzlDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBRUQsc0RBQWdCLEdBQWhCLFVBQWlCLElBQWlCLEVBQUUsT0FBZ0I7WUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCwyREFBcUIsR0FBckIsVUFBc0IsSUFBc0IsRUFBRSxPQUFnQjtZQUM1RCxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDO1lBQ2xELEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFDLElBQUksTUFBQSxFQUFFLElBQUksTUFBQSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUUsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVELHNEQUFnQixHQUFoQixVQUFpQixHQUFnQixFQUFFLE9BQWdCO1lBQ2pELElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4QyxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRUQsdURBQWlCLEdBQWpCLFVBQWtCLElBQWtCLEVBQUUsT0FBZ0I7WUFDcEQsSUFBTSxNQUFNLEdBQWtCLEVBQUUsQ0FBQyxZQUFZLENBQ3pDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQy9DLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCx1REFBaUIsR0FBakIsVUFBa0IsSUFBa0IsRUFBRSxPQUFnQjtZQUNwRCxJQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDL0MsSUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLEVBQ2hELElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMxRCxJQUFNLE1BQU0sR0FBa0IsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkYsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELHdEQUFrQixHQUFsQixVQUFtQixJQUFtQixFQUFFLE9BQWdCO1lBQ3RELE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FDbEIsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ2hGLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCwyREFBcUIsR0FBckIsVUFBc0IsR0FBcUIsRUFBRSxPQUFnQjtZQUE3RCxpQkFPQztZQU5DLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUN0QixHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQ2pGLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsNkRBQXVCLEdBQXZCLFVBQXdCLEdBQXVCLEVBQUUsT0FBZ0I7WUFBakUsaUJBU0M7WUFSQyxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUN0QixHQUFHLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUNoRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSSxFQUFFLE9BQU8sQ0FBQyxFQUFsQyxDQUFrQyxDQUFDLENBQUMsQ0FBQztZQUM3RCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ1osRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUMvRjtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsMERBQW9CLEdBQXBCLFVBQXFCLEdBQW9CLEVBQUUsT0FBZ0I7WUFBM0QsaUJBSUM7WUFIQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQ2YsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFDdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsZUFBZSxDQUFDLEtBQUksRUFBRSxPQUFPLENBQUMsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELHNEQUFnQixHQUFoQixVQUFpQixHQUFnQixFQUFFLE9BQWdCO1lBQ2pELElBQUksSUFBbUIsQ0FBQztZQUN4QixJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFO2dCQUMzQixJQUFJLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ3pDO2lCQUFNLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQzdCLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDeEI7aUJBQU07Z0JBQ0wsSUFBSSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3BDO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsQyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCwwREFBb0IsR0FBcEIsVUFBcUIsR0FBb0IsRUFBRSxPQUFnQjtZQUN6RCxPQUFPLElBQUksQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDaEQsbUNBQW1DLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxpQ0FBaUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELHVEQUFpQixHQUFqQixVQUFrQixHQUFpQixFQUFFLE9BQWdCO1lBRW5ELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFtQyxHQUFHLENBQUMsS0FBTyxDQUFDLENBQUM7YUFDakU7WUFDRCwyRkFBMkY7WUFDM0Ysd0NBQXdDO1lBQ3hDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUNqQyxxREFBcUQ7Z0JBQy9DLElBQUEsS0FDRixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBRG5FLFlBQVksa0JBQUEsRUFBRSxNQUFNLFlBQytDLENBQUM7Z0JBQzNFLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtvQkFDekIsb0NBQW9DO29CQUNwQyxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDcEM7cUJBQU07b0JBQ0wsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQzFCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztpQkFDckU7YUFDRjtpQkFBTTtnQkFDTCwrQ0FBK0M7Z0JBQy9DLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUM7UUFDSCxDQUFDO1FBRUQsMERBQW9CLEdBQXBCLFVBQXFCLEdBQW9CLEVBQUUsT0FBZ0I7WUFDekQsSUFBSSxJQUFJLEdBQWtCLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV2RSxzRkFBc0Y7WUFDdEYsaURBQWlEO1lBQ2pELEVBQUU7WUFDRiw0RkFBNEY7WUFDNUYsNEZBQTRGO1lBQzVGLHlCQUF5QjtZQUN6Qiw0Q0FBNEM7WUFDNUMsdUZBQXVGO1lBQ3ZGLHFDQUFxQztZQUNyQywyRUFBMkU7WUFDM0UsdUNBQXVDO1lBQ3ZDLEVBQUU7WUFDRiwrRUFBK0U7WUFDL0UsdUNBQXVDO1lBQ3ZDLEVBQUU7WUFDRixnR0FBZ0c7WUFDaEcsdUZBQXVGO1lBQ3ZGLHVFQUF1RTtZQUN2RSxFQUFFO1lBQ0Ysa0ZBQWtGO1lBQ2xGLElBQUksR0FBRyxDQUFDLFNBQVMsWUFBWSwwQkFBZSxFQUFFO2dCQUM1QywrRUFBK0U7Z0JBQy9FLHNCQUFzQjtnQkFDdEIsSUFBSSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDN0I7WUFFRCxPQUFPLEVBQUUsQ0FBQyxpQkFBaUIsQ0FDdkIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFDakQsR0FBRyxDQUFDLFNBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELGtEQUFZLEdBQVosVUFBYSxHQUFZLEVBQUUsT0FBZ0I7WUFDekMsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUNsQixFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFFRCw0REFBc0IsR0FBdEIsVUFBdUIsR0FBa0IsRUFBRSxPQUFnQjtZQUN6RCxPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsbURBQWEsR0FBYixVQUFjLEdBQWEsRUFBRSxPQUFnQjtZQUMzQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsdURBQWlCLEdBQWpCLFVBQWtCLEdBQWlCLEVBQUUsT0FBZ0I7WUFBckQsaUJBT0M7WUFOQyxPQUFPLEVBQUUsQ0FBQyx3QkFBd0IsQ0FDOUIsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRSxTQUFTLEVBQ3RELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNWLFVBQUEsS0FBSyxJQUFJLE9BQUEsRUFBRSxDQUFDLGVBQWUsQ0FDdkIsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUR4RSxDQUN3RSxDQUFDLEVBQ3RGLFNBQVMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakcsQ0FBQztRQUVELDZEQUF1QixHQUF2QixVQUF3QixHQUF1QixFQUFFLE9BQWdCO1lBQy9ELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE0Qix5QkFBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUcsQ0FBQyxDQUFDO2FBQzdFO1lBQ0QsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsRUFDM0UsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELHVEQUFpQixHQUFqQixVQUFrQixHQUFpQixFQUFFLE9BQWdCO1lBQ25ELE9BQU8sRUFBRSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEYsQ0FBQztRQUVELHNEQUFnQixHQUFoQixVQUFpQixHQUFnQixFQUFFLE9BQWdCO1lBQ2pELE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUN6QixHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDN0YsQ0FBQztRQUVELDJEQUFxQixHQUFyQixVQUFzQixHQUFxQixFQUFFLE9BQWdCO1lBQTdELGlCQUtDO1lBSkMsSUFBTSxJQUFJLEdBQ04sRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFJLEVBQUUsT0FBTyxDQUFDLEVBQW5DLENBQW1DLENBQUMsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQseURBQW1CLEdBQW5CLFVBQW9CLEdBQW1CLEVBQUUsT0FBZ0I7WUFBekQsaUJBUUM7WUFQQyxJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDM0IsVUFBQSxLQUFLLElBQUksT0FBQSxFQUFFLENBQUMsd0JBQXdCLENBQ2hDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUMzRSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFGdEMsQ0FFc0MsQ0FBQyxDQUFDO1lBQ3JELElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELG9EQUFjLEdBQWQsVUFBZSxHQUFjLEVBQUUsT0FBZ0I7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCwwREFBb0IsR0FBcEIsVUFBcUIsR0FBeUIsRUFBRSxPQUFnQjtZQUM5RCxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM3QixJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxxREFBZSxHQUFmLFVBQWdCLEdBQWUsRUFBRSxPQUFnQjtZQUMvQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVPLHVEQUFpQixHQUF6QixVQUEwQixJQUFtQixFQUFFLEdBQWU7WUFDNUQsSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUNaLElBQUEsS0FBZSxHQUFHLENBQUMsVUFBVSxFQUE1QixLQUFLLFdBQUEsRUFBRSxHQUFHLFNBQWtCLENBQUM7Z0JBQzlCLElBQUEsS0FBaUIsS0FBSyxDQUFDLElBQUksRUFBMUIsR0FBRyxTQUFBLEVBQUUsT0FBTyxhQUFjLENBQUM7Z0JBQ2xDLElBQUksR0FBRyxFQUFFO29CQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO3dCQUN0QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsRUFBSCxDQUFHLENBQUMsQ0FBQyxDQUFDO3FCQUN2RjtvQkFDRCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNqRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxRQUFBLEVBQUMsQ0FBQyxDQUFDO2lCQUMxRTthQUNGO1FBQ0gsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQXRTRCxJQXNTQztJQUVEO1FBQ0UsK0JBQW9CLE9BQXNCO1lBQXRCLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFBRyxDQUFDO1FBRTlDLGdEQUFnQixHQUFoQixVQUFpQixJQUFpQixFQUFFLE9BQWdCO1lBQ2xELFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDakIsS0FBSywwQkFBZSxDQUFDLElBQUk7b0JBQ3ZCLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2hFLEtBQUssMEJBQWUsQ0FBQyxPQUFPO29CQUMxQixPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1RCxLQUFLLDBCQUFlLENBQUMsR0FBRyxDQUFDO2dCQUN6QixLQUFLLDBCQUFlLENBQUMsTUFBTTtvQkFDekIsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDL0QsS0FBSywwQkFBZSxDQUFDLE1BQU07b0JBQ3pCLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQy9ELEtBQUssMEJBQWUsQ0FBQyxJQUFJO29CQUN2QixPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM5RDtvQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUE2QiwwQkFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQzlFO1FBQ0gsQ0FBQztRQUVELG1EQUFtQixHQUFuQixVQUFvQixJQUFvQixFQUFFLE9BQWdCO1lBQTFELGlCQWdCQztZQWZDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQy9ELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzVCLE9BQU8sUUFBUSxDQUFDO2FBQ2pCO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDckMsTUFBTSxJQUFJLEtBQUssQ0FDWCwrRUFBK0UsQ0FBQyxDQUFDO2FBQ3RGO2lCQUFNLElBQUksUUFBUSxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUU7Z0JBQy9DLE1BQU0sSUFBSSxLQUFLLENBQ1gscUZBQXFGLENBQUMsQ0FBQzthQUM1RjtZQUVELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQWxDLENBQWtDLENBQUMsQ0FBQztZQUNsRixPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFFRCw4Q0FBYyxHQUFkLFVBQWUsSUFBZSxFQUFFLE9BQWdCO1lBQzlDLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCw0Q0FBWSxHQUFaLFVBQWEsSUFBYSxFQUFFLE9BQWdCO1lBQzFDLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQ2hDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQ2pELEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDM0QsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNELElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUYsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxnREFBZ0IsR0FBaEIsVUFBaUIsR0FBZ0IsRUFBRSxPQUFnQjtZQUNqRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7YUFDOUQ7WUFDRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELGlEQUFpQixHQUFqQixVQUFrQixJQUFrQixFQUFFLE9BQWdCO1lBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsaURBQWlCLEdBQWpCLFVBQWtCLElBQWtCLEVBQUUsT0FBZ0I7WUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxrREFBa0IsR0FBbEIsVUFBbUIsSUFBbUIsRUFBRSxPQUFnQjtZQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELHFEQUFxQixHQUFyQixVQUFzQixHQUFxQixFQUFFLE9BQWdCO1lBQzNELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsdURBQXVCLEdBQXZCLFVBQXdCLEdBQXVCLEVBQUUsT0FBZ0I7WUFDL0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxvREFBb0IsR0FBcEIsVUFBcUIsR0FBb0IsRUFBRSxPQUFnQjtZQUN6RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELGdEQUFnQixHQUFoQixVQUFpQixHQUFnQixFQUFFLE9BQWdCO1lBQ2pELElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ3RCLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDNUQ7aUJBQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtnQkFDbEMsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ2pFO2lCQUFNLElBQUksT0FBTyxHQUFHLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtnQkFDekMsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM5RDtpQkFBTSxJQUFJLE9BQU8sR0FBRyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7Z0JBQ3hDLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDOUQ7aUJBQU07Z0JBQ0wsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM5RDtRQUNILENBQUM7UUFFRCxvREFBb0IsR0FBcEIsVUFBcUIsR0FBb0IsRUFBRSxPQUFnQjtZQUN6RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELGlEQUFpQixHQUFqQixVQUFrQixHQUFpQixFQUFFLE9BQWdCO1lBQXJELGlCQWdCQztZQWZDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDNUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO2FBQ3BEO1lBQ0ssSUFBQSxLQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFEbkUsWUFBWSxrQkFBQSxFQUFFLE1BQU0sWUFDK0MsQ0FBQztZQUMzRSxJQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVyRCxJQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztnQkFDM0IsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLGdCQUFnQixDQUFDO1lBRXJCLElBQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxVQUFVLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQzNDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWpDLENBQWlDLENBQUMsQ0FBQyxDQUFDO2dCQUMvRCxTQUFTLENBQUM7WUFDZCxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVELG9EQUFvQixHQUFwQixVQUFxQixHQUFvQixFQUFFLE9BQWdCO1lBQ3pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsNENBQVksR0FBWixVQUFhLEdBQVksRUFBRSxPQUFnQjtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELHNEQUFzQixHQUF0QixVQUF1QixHQUFrQixFQUFFLE9BQWdCO1lBQ3pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsNkNBQWEsR0FBYixVQUFjLEdBQWEsRUFBRSxPQUFnQjtZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELGlEQUFpQixHQUFqQixVQUFrQixHQUFpQixFQUFFLE9BQWdCO1lBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsdURBQXVCLEdBQXZCLFVBQXdCLEdBQXVCLEVBQUUsT0FBZ0I7WUFDL0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxpREFBaUIsR0FBakIsVUFBa0IsR0FBaUIsRUFBRSxPQUFnQjtZQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELGdEQUFnQixHQUFoQixVQUFpQixHQUFnQixFQUFFLE9BQWdCO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQscURBQXFCLEdBQXJCLFVBQXNCLEdBQXFCLEVBQUUsT0FBZ0I7WUFBN0QsaUJBR0M7WUFGQyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQXZDLENBQXVDLENBQUMsQ0FBQztZQUNoRixPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsbURBQW1CLEdBQW5CLFVBQW9CLEdBQW1CLEVBQUUsT0FBZ0I7WUFBekQsaUJBWUM7WUFYQyxJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUs7Z0JBQzVCLElBQUEsR0FBRyxHQUFZLEtBQUssSUFBakIsRUFBRSxNQUFNLEdBQUksS0FBSyxPQUFULENBQVU7Z0JBQzVCLElBQU0sSUFBSSxHQUFHLEtBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLEVBQUUsQ0FBQyx1QkFBdUI7Z0JBQzdCLGVBQWUsQ0FBQyxTQUFTO2dCQUN6QixVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7Z0JBQ3JELG1CQUFtQixDQUFDLFNBQVM7Z0JBQzdCLFVBQVUsQ0FBQyxJQUFJO2dCQUNmLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELDhDQUFjLEdBQWQsVUFBZSxHQUFjLEVBQUUsT0FBZ0I7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxvREFBb0IsR0FBcEIsVUFBcUIsR0FBeUIsRUFBRSxPQUFnQjtZQUM5RCxJQUFNLElBQUksR0FBWSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQy9CLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekIsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3hFO2lCQUFNLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUM7YUFDYjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkMsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkM7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FDWCwyREFBeUQsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQzthQUMxRjtRQUNILENBQUM7UUFFRCwrQ0FBZSxHQUFmLFVBQWdCLEdBQWUsRUFBRSxPQUFnQjtZQUMvQyxJQUFJLElBQUksR0FBRyxtQkFBbUIsQ0FDMUIsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLHNDQUE0QixFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEYsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBcUIsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFTyw2Q0FBYSxHQUFyQixVQUFzQixJQUFVLEVBQUUsT0FBZ0I7WUFDaEQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0RBQWdELEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUM7YUFDckY7WUFDRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBRU8sbURBQW1CLEdBQTNCLFVBQTRCLElBQWdCLEVBQUUsT0FBZ0I7WUFDNUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQ1gseURBQXVELEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUM7YUFDNUY7WUFDRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBck5ELElBcU5DO0lBck5ZLHNEQUFxQjtJQXVObEM7OztPQUdHO0lBQ0gsU0FBUyxtQ0FBbUMsQ0FDeEMsR0FBb0IsRUFBRSxPQUFnQixFQUFFLE9BQTBCO1FBQ3BFLElBQUksUUFBNEIsQ0FBQztRQUNqQyxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUN2QyxJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQyxJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDaEIsUUFBUSxHQUFHLEVBQUUsQ0FBQyxtQ0FBbUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwRjthQUFNO1lBQ0wsdUJBQXVCO1lBQ3ZCLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwRSxJQUFNLEtBQUssR0FBc0IsRUFBRSxDQUFDO1lBQ3BDLDBCQUEwQjtZQUMxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsSUFBTSxvQkFBa0IsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNwRixJQUFNLGNBQVksR0FBRyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELElBQU0sY0FBYyxHQUFHLG9CQUFvQixDQUFDLGNBQVksQ0FBQyxNQUFNLEVBQUUsY0FBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0QsdUJBQXVCO1lBQ3ZCLElBQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN6RixJQUFNLFlBQVksR0FBRyxHQUFHLENBQUMseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9ELElBQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9FLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDcEUsc0JBQXNCO1lBQ3RCLFFBQVEsR0FBRyxFQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3JEO1FBQ0QsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFHRCwwREFBMEQ7SUFDMUQsNEVBQTRFO0lBQzVFLFNBQVMsb0JBQW9CLENBQUMsTUFBYyxFQUFFLEdBQVc7UUFDdkQsSUFBTSxJQUFJLEdBQStCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztRQUN6QyxPQUFPLElBQXlCLENBQUM7SUFDbkMsQ0FBQztJQUVELHdEQUF3RDtJQUN4RCw0RUFBNEU7SUFDNUUsU0FBUyxrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsR0FBVztRQUNyRCxJQUFNLElBQUksR0FBK0IsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1FBQ3ZDLE9BQU8sSUFBdUIsQ0FBQztJQUNqQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxpQ0FBaUMsQ0FDdEMsR0FBb0IsRUFBRSxPQUFnQixFQUFFLE9BQTBCLEVBQUUsT0FBc0I7UUFDNUYseUZBQXlGO1FBQ3pGLDhDQUE4QztRQUM5Qyx5RUFBeUU7UUFDekUsRUFBRTtRQUNGLGtGQUFrRjtRQUNsRixvREFBb0Q7UUFDcEQsRUFBRTtRQUNGLGdHQUFnRztRQUNoRyxpRkFBaUY7UUFDakYsd0VBQXdFO1FBRXhFLGtHQUFrRztRQUNsRyxJQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDL0MsSUFBTSxXQUFXLEdBQVUsRUFBRSxDQUFDO1FBRTlCLDhGQUE4RjtRQUM5RixvRkFBb0Y7UUFDcEYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2hELFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzNFLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckQ7UUFFRCxnR0FBZ0c7UUFDaEcsa0RBQWtEO1FBQzVDLElBQUEsS0FBeUIsT0FBTyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxFQUFwRixZQUFZLGtCQUFBLEVBQUUsTUFBTSxZQUFnRSxDQUFDO1FBQzVGLElBQU0sMEJBQTBCLEdBQUcsQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRTVGLGlDQUFpQztRQUNqQywwRkFBMEY7UUFDMUYsT0FBTyxFQUFFLENBQUMsVUFBVTtRQUNoQixnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDO1FBQ2pELG1CQUFtQixDQUFDLFNBQVM7WUFFM0IsRUFBRSxDQUFDLFVBQVU7WUFDVCxnQkFBZ0IsQ0FBQywwQkFBMEI7WUFDM0MsbUJBQW1CLENBQUMsU0FBUztZQUM3QixvQkFBb0I7WUFDcEI7Z0JBQ0UsRUFBRSxDQUFDLGtCQUFrQixDQUNqQixZQUFZLENBQUMsR0FBRyxDQUFDLFVBQUEsV0FBVyxJQUFJLE9BQUEsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBMUMsQ0FBMEMsQ0FBQyxDQUFDO2dCQUNoRixFQUFFLENBQUMsa0JBQWtCLENBQ2pCLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBQSxXQUFXLElBQUksT0FBQSxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUF2QyxDQUF1QyxDQUFDLENBQUM7YUFDOUUsQ0FBQztXQUNILFdBQVcsRUFDZCxDQUFDO0lBQ1QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FycmF5VHlwZSwgQXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpblR5cGUsIEJ1aWx0aW5UeXBlTmFtZSwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvbiwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblR5cGUsIEV4cHJlc3Npb25WaXNpdG9yLCBFeHRlcm5hbEV4cHIsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBNYXBUeXBlLCBOb3RFeHByLCBSZWFkS2V5RXhwciwgUmVhZFByb3BFeHByLCBSZWFkVmFyRXhwciwgUmV0dXJuU3RhdGVtZW50LCBTdGF0ZW1lbnQsIFN0YXRlbWVudFZpc2l0b3IsIFN0bXRNb2RpZmllciwgVGhyb3dTdG10LCBUcnlDYXRjaFN0bXQsIFR5cGUsIFR5cGVvZkV4cHIsIFR5cGVWaXNpdG9yLCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlS2V5RXhwciwgV3JpdGVQcm9wRXhwciwgV3JpdGVWYXJFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0xvY2FsaXplZFN0cmluZ30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0UmV3cml0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIE5vb3BJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaXNTdGF0ZW1lbnQ6IGJvb2xlYW4pIHt9XG5cbiAgZ2V0IHdpdGhFeHByZXNzaW9uTW9kZSgpOiBDb250ZXh0IHtcbiAgICByZXR1cm4gdGhpcy5pc1N0YXRlbWVudCA/IG5ldyBDb250ZXh0KGZhbHNlKSA6IHRoaXM7XG4gIH1cblxuICBnZXQgd2l0aFN0YXRlbWVudE1vZGUoKTogQ29udGV4dCB7XG4gICAgcmV0dXJuICF0aGlzLmlzU3RhdGVtZW50ID8gbmV3IENvbnRleHQodHJ1ZSkgOiB0aGlzO1xuICB9XG59XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPEJpbmFyeU9wZXJhdG9yLCB0cy5CaW5hcnlPcGVyYXRvcj4oW1xuICBbQmluYXJ5T3BlcmF0b3IuQW5kLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlciwgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlckVxdWFscywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRGl2aWRlLCB0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRXF1YWxzLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLklkZW50aWNhbCwgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Mb3dlciwgdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTWludXMsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Nb2R1bG8sIHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk11bHRpcGx5LCB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90RXF1YWxzLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuT3IsIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuUGx1cywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuXSk7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYW4gaW1wb3J0IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gYSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBtb2R1bGUgdGhhdCBoYXMgYmVlbiBpbXBvcnRlZC4gKi9cbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIC8qKiBUaGUgYWxpYXMgb2YgdGhlIGltcG9ydGVkIG1vZHVsZS4gKi9cbiAgcXVhbGlmaWVyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIHN5bWJvbCBuYW1lIGFuZCBpbXBvcnQgbmFtZXNwYWNlIG9mIGFuIGltcG9ydGVkIHN5bWJvbCxcbiAqIHdoaWNoIGhhcyBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgSW1wb3J0TWFuYWdlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYW1lZEltcG9ydCB7XG4gIC8qKiBUaGUgaW1wb3J0IG5hbWVzcGFjZSBjb250YWluaW5nIHRoaXMgaW1wb3J0ZWQgc3ltYm9sLiAqL1xuICBtb2R1bGVJbXBvcnQ6IHN0cmluZ3xudWxsO1xuICAvKiogVGhlIChwb3NzaWJseSByZXdyaXR0ZW4pIG5hbWUgb2YgdGhlIGltcG9ydGVkIHN5bWJvbC4gKi9cbiAgc3ltYm9sOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbXBvcnRNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBzcGVjaWZpZXJUb0lkZW50aWZpZXIgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG5leHRJbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciA9IG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgcHJpdmF0ZSBwcmVmaXggPSAnaScpIHtcbiAgfVxuXG4gIGdlbmVyYXRlTmFtZWRJbXBvcnQobW9kdWxlTmFtZTogc3RyaW5nLCBvcmlnaW5hbFN5bWJvbDogc3RyaW5nKTogTmFtZWRJbXBvcnQge1xuICAgIC8vIEZpcnN0LCByZXdyaXRlIHRoZSBzeW1ib2wgbmFtZS5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnJld3JpdGVyLnJld3JpdGVTeW1ib2wob3JpZ2luYWxTeW1ib2wsIG1vZHVsZU5hbWUpO1xuXG4gICAgLy8gQXNrIHRoZSByZXdyaXRlciBpZiB0aGlzIHN5bWJvbCBzaG91bGQgYmUgaW1wb3J0ZWQgYXQgYWxsLiBJZiBub3QsIGl0IGNhbiBiZSByZWZlcmVuY2VkXG4gICAgLy8gZGlyZWN0bHkgKG1vZHVsZUltcG9ydDogbnVsbCkuXG4gICAgaWYgKCF0aGlzLnJld3JpdGVyLnNob3VsZEltcG9ydFN5bWJvbChzeW1ib2wsIG1vZHVsZU5hbWUpKSB7XG4gICAgICAvLyBUaGUgc3ltYm9sIHNob3VsZCBiZSByZWZlcmVuY2VkIGRpcmVjdGx5LlxuICAgICAgcmV0dXJuIHttb2R1bGVJbXBvcnQ6IG51bGwsIHN5bWJvbH07XG4gICAgfVxuXG4gICAgLy8gSWYgbm90LCB0aGlzIHN5bWJvbCB3aWxsIGJlIGltcG9ydGVkLiBBbGxvY2F0ZSBhIHByZWZpeCBmb3IgdGhlIGltcG9ydGVkIG1vZHVsZSBpZiBuZWVkZWQuXG5cbiAgICBpZiAoIXRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLmhhcyhtb2R1bGVOYW1lKSkge1xuICAgICAgdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuc2V0KG1vZHVsZU5hbWUsIGAke3RoaXMucHJlZml4fSR7dGhpcy5uZXh0SW5kZXgrK31gKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlSW1wb3J0ID0gdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuZ2V0KG1vZHVsZU5hbWUpITtcblxuICAgIHJldHVybiB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9O1xuICB9XG5cbiAgZ2V0QWxsSW1wb3J0cyhjb250ZXh0UGF0aDogc3RyaW5nKTogSW1wb3J0W10ge1xuICAgIGNvbnN0IGltcG9ydHM6IHtzcGVjaWZpZXI6IHN0cmluZywgcXVhbGlmaWVyOiBzdHJpbmd9W10gPSBbXTtcbiAgICB0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllci5mb3JFYWNoKChxdWFsaWZpZXIsIHNwZWNpZmllcikgPT4ge1xuICAgICAgc3BlY2lmaWVyID0gdGhpcy5yZXdyaXRlci5yZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllciwgY29udGV4dFBhdGgpO1xuICAgICAgaW1wb3J0cy5wdXNoKHtzcGVjaWZpZXIsIHF1YWxpZmllcn0pO1xuICAgIH0pO1xuICAgIHJldHVybiBpbXBvcnRzO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVFeHByZXNzaW9uKFxuICAgIGV4cHJlc3Npb246IEV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPik6IHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gZXhwcmVzc2lvbi52aXNpdEV4cHJlc3Npb24oXG4gICAgICBuZXcgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgc2NyaXB0VGFyZ2V0KSxcbiAgICAgIG5ldyBDb250ZXh0KGZhbHNlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVTdGF0ZW1lbnQoXG4gICAgc3RhdGVtZW50OiBTdGF0ZW1lbnQsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPik6IHRzLlN0YXRlbWVudCB7XG4gIHJldHVybiBzdGF0ZW1lbnQudmlzaXRTdGF0ZW1lbnQoXG4gICAgICBuZXcgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgc2NyaXB0VGFyZ2V0KSxcbiAgICAgIG5ldyBDb250ZXh0KHRydWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZVR5cGUodHlwZTogVHlwZSwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLlR5cGVOb2RlIHtcbiAgcmV0dXJuIHR5cGUudmlzaXRUeXBlKG5ldyBUeXBlVHJhbnNsYXRvclZpc2l0b3IoaW1wb3J0cyksIG5ldyBDb250ZXh0KGZhbHNlKSk7XG59XG5cbmNsYXNzIEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvciBpbXBsZW1lbnRzIEV4cHJlc3Npb25WaXNpdG9yLCBTdGF0ZW1lbnRWaXNpdG9yIHtcbiAgcHJpdmF0ZSBleHRlcm5hbFNvdXJjZUZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPikge31cblxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IERlY2xhcmVWYXJTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICAgIGNvbnN0IG5vZGVGbGFncyA9XG4gICAgICAgICgodGhpcy5zY3JpcHRUYXJnZXQgPj0gdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSkgJiYgc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRmluYWwpKSA/XG4gICAgICAgIHRzLk5vZGVGbGFncy5Db25zdCA6XG4gICAgICAgIHRzLk5vZGVGbGFncy5Ob25lO1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChcbiAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgIHN0bXQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHN0bXQudmFsdWUgJiYgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKV0sXG4gICAgICAgICAgICBub2RlRmxhZ3MpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10OiBEZWNsYXJlRnVuY3Rpb25TdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHN0bXQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICBzdG10LnBhcmFtcy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUpKSxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVCbG9jayhcbiAgICAgICAgICAgIHN0bXQuc3RhdGVtZW50cy5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSk7XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25TdG10KHN0bXQ6IEV4cHJlc3Npb25TdGF0ZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCwgY29udGV4dDogQ29udGV4dCk6IHRzLlJldHVyblN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IENsYXNzU3RtdCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIGlmICh0aGlzLnNjcmlwdFRhcmdldCA8IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5zdXBwb3J0ZWQgbW9kZTogVmlzaXRpbmcgYSBcImRlY2xhcmUgY2xhc3NcIiBzdGF0ZW1lbnQgKGNsYXNzICR7c3RtdC5uYW1lfSkgd2hpbGUgYCArXG4gICAgICAgICAgYHRhcmdldGluZyAke3RzLlNjcmlwdFRhcmdldFt0aGlzLnNjcmlwdFRhcmdldF19LmApO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5JZlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlmKFxuICAgICAgICBzdG10LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIHRzLmNyZWF0ZUJsb2NrKFxuICAgICAgICAgICAgc3RtdC50cnVlQ2FzZS5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSxcbiAgICAgICAgc3RtdC5mYWxzZUNhc2UubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICB0cy5jcmVhdGVCbG9jayhzdG10LmZhbHNlQ2FzZS5tYXAoXG4gICAgICAgICAgICAgICAgY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSA6XG4gICAgICAgICAgICB1bmRlZmluZWQpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10LCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVGhyb3dTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVUaHJvdyhzdG10LmVycm9yLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXRDb21tZW50U3RtdChzdG10OiBDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudCh0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQudG9TdHJpbmcoKTtcbiAgICBjb25zdCBraW5kID0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhjb21tZW50U3RtdCwgW3traW5kLCB0ZXh0LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBSZWFkVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGFzdC5uYW1lISk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShpZGVudGlmaWVyLCBhc3QpO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgdmlzaXRXcml0ZVZhckV4cHIoZXhwcjogV3JpdGVWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVzdWx0OiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlQmluYXJ5KFxuICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKGV4cHIubmFtZSksIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sXG4gICAgICAgIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgICByZXR1cm4gY29udGV4dC5pc1N0YXRlbWVudCA/IHJlc3VsdCA6IHRzLmNyZWF0ZVBhcmVuKHJlc3VsdCk7XG4gIH1cblxuICB2aXNpdFdyaXRlS2V5RXhwcihleHByOiBXcml0ZUtleUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByQ29udGV4dCA9IGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlO1xuICAgIGNvbnN0IGxocyA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoXG4gICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSxcbiAgICAgICAgZXhwci5pbmRleC52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpKTtcbiAgICBjb25zdCByaHMgPSBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBleHByQ29udGV4dCk7XG4gICAgY29uc3QgcmVzdWx0OiB0cy5FeHByZXNzaW9uID0gdHMuY3JlYXRlQmluYXJ5KGxocywgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgcmhzKTtcbiAgICByZXR1cm4gY29udGV4dC5pc1N0YXRlbWVudCA/IHJlc3VsdCA6IHRzLmNyZWF0ZVBhcmVuKHJlc3VsdCk7XG4gIH1cblxuICB2aXNpdFdyaXRlUHJvcEV4cHIoZXhwcjogV3JpdGVQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBleHByLm5hbWUpLFxuICAgICAgICB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEludm9rZU1ldGhvZEV4cHIoYXN0OiBJbnZva2VNZXRob2RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHRhcmdldCA9IGFzdC5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgIGFzdC5uYW1lICE9PSBudWxsID8gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModGFyZ2V0LCBhc3QubmFtZSkgOiB0YXJnZXQsIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShjYWxsLCBhc3QpO1xuICAgIHJldHVybiBjYWxsO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoYXN0OiBJbnZva2VGdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgIGFzdC5mbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgaWYgKGFzdC5wdXJlKSB7XG4gICAgICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudChleHByLCB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEsICdAX19QVVJFX18nLCBmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwgYXN0KTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGFzdDogSW5zdGFudGlhdGVFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuTmV3RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgYXN0LmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxFeHByKGFzdDogTGl0ZXJhbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgZXhwcjogdHMuRXhwcmVzc2lvbjtcbiAgICBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgZXhwciA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwciA9IHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKTtcbiAgICB9XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3QpO1xuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgdmlzaXRMb2NhbGl6ZWRTdHJpbmcoYXN0OiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5zY3JpcHRUYXJnZXQgPj0gdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSA/XG4gICAgICAgIGNyZWF0ZUxvY2FsaXplZFN0cmluZ1RhZ2dlZFRlbXBsYXRlKGFzdCwgY29udGV4dCwgdGhpcykgOlxuICAgICAgICBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdGdW5jdGlvbkNhbGwoYXN0LCBjb250ZXh0LCB0aGlzLCB0aGlzLmltcG9ydHMpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoYXN0OiBFeHRlcm5hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb25cbiAgICAgIHx0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoYXN0LnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHVua25vd24gbW9kdWxlIG9yIHN5bWJvbCAke2FzdC52YWx1ZX1gKTtcbiAgICB9XG4gICAgLy8gSWYgYSBtb2R1bGVOYW1lIGlzIHNwZWNpZmllZCwgdGhpcyBpcyBhIG5vcm1hbCBpbXBvcnQuIElmIHRoZXJlJ3Mgbm8gbW9kdWxlIG5hbWUsIGl0J3MgYVxuICAgIC8vIHJlZmVyZW5jZSB0byBhIGdsb2JhbC9hbWJpZW50IHN5bWJvbC5cbiAgICBpZiAoYXN0LnZhbHVlLm1vZHVsZU5hbWUgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBub3JtYWwgaW1wb3J0LiBGaW5kIHRoZSBpbXBvcnRlZCBtb2R1bGUuXG4gICAgICBjb25zdCB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9ID1cbiAgICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydChhc3QudmFsdWUubW9kdWxlTmFtZSwgYXN0LnZhbHVlLm5hbWUpO1xuICAgICAgaWYgKG1vZHVsZUltcG9ydCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgc3ltYm9sIHdhcyBhbWJpZW50IGFmdGVyIGFsbC5cbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhcbiAgICAgICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIobW9kdWxlSW1wb3J0KSwgdHMuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHN5bWJvbCBpcyBhbWJpZW50LCBzbyBqdXN0IHJlZmVyZW5jZSBpdC5cbiAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKGFzdC52YWx1ZS5uYW1lKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihhc3Q6IENvbmRpdGlvbmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkNvbmRpdGlvbmFsRXhwcmVzc2lvbiB7XG4gICAgbGV0IGNvbmQ6IHRzLkV4cHJlc3Npb24gPSBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcblxuICAgIC8vIE9yZGluYXJpbHkgdGhlIHRlcm5hcnkgb3BlcmF0b3IgaXMgcmlnaHQtYXNzb2NpYXRpdmUuIFRoZSBmb2xsb3dpbmcgYXJlIGVxdWl2YWxlbnQ6XG4gICAgLy8gICBgYSA/IGIgOiBjID8gZCA6IGVgID0+IGBhID8gYiA6IChjID8gZCA6IGUpYFxuICAgIC8vXG4gICAgLy8gSG93ZXZlciwgb2NjYXNpb25hbGx5IEFuZ3VsYXIgbmVlZHMgdG8gcHJvZHVjZSBhIGxlZnQtYXNzb2NpYXRpdmUgY29uZGl0aW9uYWwsIHN1Y2ggYXMgaW5cbiAgICAvLyB0aGUgY2FzZSBvZiBhIG51bGwtc2FmZSBuYXZpZ2F0aW9uIHByb2R1Y3Rpb246IGB7e2E/LmIgPyBjIDogZH19YC4gVGhpcyB0ZW1wbGF0ZSBwcm9kdWNlc1xuICAgIC8vIGEgdGVybmFyeSBvZiB0aGUgZm9ybTpcbiAgICAvLyAgIGBhID09IG51bGwgPyBudWxsIDogcmVzdCBvZiBleHByZXNzaW9uYFxuICAgIC8vIElmIHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIGlzIGFsc28gYSB0ZXJuYXJ5IHRob3VnaCwgdGhpcyB3b3VsZCBwcm9kdWNlIHRoZSBmb3JtOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiBhLmIgPyBjIDogZGBcbiAgICAvLyB3aGljaCwgaWYgbGVmdCBhcyByaWdodC1hc3NvY2lhdGl2ZSwgd291bGQgYmUgaW5jb3JyZWN0bHkgYXNzb2NpYXRlZCBhczpcbiAgICAvLyAgIGBhID09IG51bGwgPyBudWxsIDogKGEuYiA/IGMgOiBkKWBcbiAgICAvL1xuICAgIC8vIEluIHN1Y2ggY2FzZXMsIHRoZSBsZWZ0LWFzc29jaWF0aXZpdHkgbmVlZHMgdG8gYmUgZW5mb3JjZWQgd2l0aCBwYXJlbnRoZXNlczpcbiAgICAvLyAgIGAoYSA9PSBudWxsID8gbnVsbCA6IGEuYikgPyBjIDogZGBcbiAgICAvL1xuICAgIC8vIFN1Y2ggcGFyZW50aGVzZXMgY291bGQgYWx3YXlzIGJlIGluY2x1ZGVkIGluIHRoZSBjb25kaXRpb24gKGd1YXJhbnRlZWluZyBjb3JyZWN0IGJlaGF2aW9yKSBpblxuICAgIC8vIGFsbCBjYXNlcywgYnV0IHRoaXMgaGFzIGEgY29kZSBzaXplIGNvc3QuIEluc3RlYWQsIHBhcmVudGhlc2VzIGFyZSBhZGRlZCBvbmx5IHdoZW4gYVxuICAgIC8vIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaXMgZGlyZWN0bHkgdXNlZCBhcyB0aGUgY29uZGl0aW9uIG9mIGFub3RoZXIuXG4gICAgLy9cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGJldHRlciBsb2dpYyBmb3IgcHJlY2VuZGVuY2Ugb2YgY29uZGl0aW9uYWwgb3BlcmF0b3JzXG4gICAgaWYgKGFzdC5jb25kaXRpb24gaW5zdGFuY2VvZiBDb25kaXRpb25hbEV4cHIpIHtcbiAgICAgIC8vIFRoZSBjb25kaXRpb24gb2YgdGhpcyB0ZXJuYXJ5IG5lZWRzIHRvIGJlIHdyYXBwZWQgaW4gcGFyZW50aGVzZXMgdG8gbWFpbnRhaW5cbiAgICAgIC8vIGxlZnQtYXNzb2NpYXRpdml0eS5cbiAgICAgIGNvbmQgPSB0cy5jcmVhdGVQYXJlbihjb25kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHMuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgIGNvbmQsIGFzdC50cnVlQ2FzZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIGFzdC5mYWxzZUNhc2UhLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoYXN0OiBOb3RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuUHJlZml4VW5hcnlFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJlZml4KFxuICAgICAgICB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uVG9rZW4sIGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoYXN0OiBBc3NlcnROb3ROdWxsLCBjb250ZXh0OiBDb250ZXh0KTogdHMuTm9uTnVsbEV4cHJlc3Npb24ge1xuICAgIHJldHVybiBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoYXN0OiBDYXN0RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiBhc3QudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICB9XG5cbiAgdmlzaXRGdW5jdGlvbkV4cHIoYXN0OiBGdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5GdW5jdGlvbkV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBhc3QubmFtZSB8fCB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LnBhcmFtcy5tYXAoXG4gICAgICAgICAgICBwYXJhbSA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgICAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcGFyYW0ubmFtZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCkpLFxuICAgICAgICB1bmRlZmluZWQsIHRzLmNyZWF0ZUJsb2NrKGFzdC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHN0bXQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dCkpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihhc3Q6IEJpbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICghQklOQVJZX09QRVJBVE9SUy5oYXMoYXN0Lm9wZXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGJpbmFyeSBvcGVyYXRvcjogJHtCaW5hcnlPcGVyYXRvclthc3Qub3BlcmF0b3JdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KFxuICAgICAgICBhc3QubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgQklOQVJZX09QRVJBVE9SUy5nZXQoYXN0Lm9wZXJhdG9yKSEsXG4gICAgICAgIGFzdC5yaHMudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGFzdDogUmVhZFByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0Lm5hbWUpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihhc3Q6IFJlYWRLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBhc3QuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IExpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByID1cbiAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFzdC5lbnRyaWVzLm1hcChleHByID0+IGV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3QpO1xuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwRXhwcihhc3Q6IExpdGVyYWxNYXBFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBhc3QuZW50cmllcy5tYXAoXG4gICAgICAgIGVudHJ5ID0+IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICAgIGVudHJ5LnF1b3RlZCA/IHRzLmNyZWF0ZUxpdGVyYWwoZW50cnkua2V5KSA6IHRzLmNyZWF0ZUlkZW50aWZpZXIoZW50cnkua2V5KSxcbiAgICAgICAgICAgIGVudHJ5LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKGVudHJpZXMpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwgYXN0KTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0Q29tbWFFeHByKGFzdDogQ29tbWFFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JhcHBlZE5vZGVFeHByKGFzdDogV3JhcHBlZE5vZGVFeHByPGFueT4sIGNvbnRleHQ6IENvbnRleHQpOiBhbnkge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoYXN0Lm5vZGUpKSB7XG4gICAgICB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlci5yZWNvcmRVc2VkSWRlbnRpZmllcihhc3Qubm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBhc3Qubm9kZTtcbiAgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihhc3Q6IFR5cGVvZkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlT2ZFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZU9mKGFzdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICBwcml2YXRlIHNldFNvdXJjZU1hcFJhbmdlKGV4cHI6IHRzLkV4cHJlc3Npb24sIGFzdDogRXhwcmVzc2lvbikge1xuICAgIGlmIChhc3Quc291cmNlU3Bhbikge1xuICAgICAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gYXN0LnNvdXJjZVNwYW47XG4gICAgICBjb25zdCB7dXJsLCBjb250ZW50fSA9IHN0YXJ0LmZpbGU7XG4gICAgICBpZiAodXJsKSB7XG4gICAgICAgIGlmICghdGhpcy5leHRlcm5hbFNvdXJjZUZpbGVzLmhhcyh1cmwpKSB7XG4gICAgICAgICAgdGhpcy5leHRlcm5hbFNvdXJjZUZpbGVzLnNldCh1cmwsIHRzLmNyZWF0ZVNvdXJjZU1hcFNvdXJjZSh1cmwsIGNvbnRlbnQsIHBvcyA9PiBwb3MpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuZ2V0KHVybCk7XG4gICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIHtwb3M6IHN0YXJ0Lm9mZnNldCwgZW5kOiBlbmQub2Zmc2V0LCBzb3VyY2V9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFR5cGVUcmFuc2xhdG9yVmlzaXRvciBpbXBsZW1lbnRzIEV4cHJlc3Npb25WaXNpdG9yLCBUeXBlVmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW1wb3J0czogSW1wb3J0TWFuYWdlcikge31cblxuICB2aXNpdEJ1aWx0aW5UeXBlKHR5cGU6IEJ1aWx0aW5UeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuS2V5d29yZFR5cGVOb2RlIHtcbiAgICBzd2l0Y2ggKHR5cGUubmFtZSkge1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuQm9vbDpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkJvb2xlYW5LZXl3b3JkKTtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLkR5bmFtaWM6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKTtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLkludDpcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLk51bWJlcjpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLk51bWJlcktleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuU3RyaW5nOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuU3RyaW5nS2V5d29yZCk7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5Ob25lOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuTmV2ZXJLZXl3b3JkKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgYnVpbHRpbiB0eXBlOiAke0J1aWx0aW5UeXBlTmFtZVt0eXBlLm5hbWVdfWApO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblR5cGUodHlwZTogRXhwcmVzc2lvblR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24odHlwZS52YWx1ZSwgY29udGV4dCk7XG4gICAgaWYgKHR5cGUudHlwZVBhcmFtcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHR5cGVOb2RlO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnQW4gRXhwcmVzc2lvblR5cGUgd2l0aCB0eXBlIGFyZ3VtZW50cyBtdXN0IHRyYW5zbGF0ZSBpbnRvIGEgVHlwZVJlZmVyZW5jZU5vZGUnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVOb2RlLnR5cGVBcmd1bWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBbiBFeHByZXNzaW9uVHlwZSB3aXRoIHR5cGUgYXJndW1lbnRzIGNhbm5vdCBoYXZlIG11bHRpcGxlIGxldmVscyBvZiB0eXBlIGFyZ3VtZW50c2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVBcmdzID0gdHlwZS50eXBlUGFyYW1zLm1hcChwYXJhbSA9PiB0aGlzLnRyYW5zbGF0ZVR5cGUocGFyYW0sIGNvbnRleHQpKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUudHlwZU5hbWUsIHR5cGVBcmdzKTtcbiAgfVxuXG4gIHZpc2l0QXJyYXlUeXBlKHR5cGU6IEFycmF5VHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLkFycmF5VHlwZU5vZGUge1xuICAgIHJldHVybiB0cy5jcmVhdGVBcnJheVR5cGVOb2RlKHRoaXMudHJhbnNsYXRlVHlwZSh0eXBlLm9mLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdE1hcFR5cGUodHlwZTogTWFwVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVMaXRlcmFsTm9kZSB7XG4gICAgY29uc3QgcGFyYW1ldGVyID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAna2V5JywgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkKSk7XG4gICAgY29uc3QgdHlwZUFyZ3MgPSB0eXBlLnZhbHVlVHlwZSAhPT0gbnVsbCA/XG4gICAgICAgIHRoaXMudHJhbnNsYXRlVHlwZSh0eXBlLnZhbHVlVHlwZSwgY29udGV4dCkgOlxuICAgICAgICB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5Vbmtub3duS2V5d29yZCk7XG4gICAgY29uc3QgaW5kZXhTaWduYXR1cmUgPSB0cy5jcmVhdGVJbmRleFNpZ25hdHVyZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwgW3BhcmFtZXRlcl0sIHR5cGVBcmdzKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKFtpbmRleFNpZ25hdHVyZV0pO1xuICB9XG5cbiAgdmlzaXRSZWFkVmFyRXhwcihhc3Q6IFJlYWRWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZVF1ZXJ5Tm9kZSB7XG4gICAgaWYgKGFzdC5uYW1lID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlYWRWYXJFeHByIHdpdGggbm8gdmFyaWFibGUgbmFtZSBpbiB0eXBlYCk7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKHRzLmNyZWF0ZUlkZW50aWZpZXIoYXN0Lm5hbWUpKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyaXRlS2V5RXhwcihleHByOiBXcml0ZUtleUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGFzdDogSW52b2tlTWV0aG9kRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihhc3Q6IEludm9rZUZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihhc3Q6IEluc3RhbnRpYXRlRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxFeHByKGFzdDogTGl0ZXJhbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkKTtcbiAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuVW5kZWZpbmVkS2V5d29yZCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYXN0LnZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhc3QudmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdExvY2FsaXplZFN0cmluZyhhc3Q6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihhc3Q6IEV4dGVybmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkVudGl0eU5hbWV8dHMuVHlwZVJlZmVyZW5jZU5vZGUge1xuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fCBhc3QudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgdW5rbm93biBtb2R1bGUgb3Igc3ltYm9sYCk7XG4gICAgfVxuICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydChhc3QudmFsdWUubW9kdWxlTmFtZSwgYXN0LnZhbHVlLm5hbWUpO1xuICAgIGNvbnN0IHN5bWJvbElkZW50aWZpZXIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCk7XG5cbiAgICBjb25zdCB0eXBlTmFtZSA9IG1vZHVsZUltcG9ydCA/XG4gICAgICAgIHRzLmNyZWF0ZVF1YWxpZmllZE5hbWUodHMuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVJbXBvcnQpLCBzeW1ib2xJZGVudGlmaWVyKSA6XG4gICAgICAgIHN5bWJvbElkZW50aWZpZXI7XG5cbiAgICBjb25zdCB0eXBlQXJndW1lbnRzID0gYXN0LnR5cGVQYXJhbXMgIT09IG51bGwgP1xuICAgICAgICBhc3QudHlwZVBhcmFtcy5tYXAodHlwZSA9PiB0aGlzLnRyYW5zbGF0ZVR5cGUodHlwZSwgY29udGV4dCkpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTmFtZSwgdHlwZUFyZ3VtZW50cyk7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihhc3Q6IENvbmRpdGlvbmFsRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0Tm90RXhwcihhc3Q6IE5vdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGFzdDogQXNzZXJ0Tm90TnVsbCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoYXN0OiBDYXN0RXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGFzdDogRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBCaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IFJlYWRQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoYXN0OiBSZWFkS2V5RXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IExpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UdXBsZVR5cGVOb2RlIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBhc3QuZW50cmllcy5tYXAoZXhwciA9PiB0aGlzLnRyYW5zbGF0ZUV4cHJlc3Npb24oZXhwciwgY29udGV4dCkpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUdXBsZVR5cGVOb2RlKHZhbHVlcyk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGFzdDogTGl0ZXJhbE1hcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTGl0ZXJhbE5vZGUge1xuICAgIGNvbnN0IGVudHJpZXMgPSBhc3QuZW50cmllcy5tYXAoZW50cnkgPT4ge1xuICAgICAgY29uc3Qge2tleSwgcXVvdGVkfSA9IGVudHJ5O1xuICAgICAgY29uc3QgdHlwZSA9IHRoaXMudHJhbnNsYXRlRXhwcmVzc2lvbihlbnRyeS52YWx1ZSwgY29udGV4dCk7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlTaWduYXR1cmUoXG4gICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiBuYW1lICovIHF1b3RlZCA/IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoa2V5KSA6IGtleSxcbiAgICAgICAgICAvKiBxdWVzdGlvblRva2VuICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAvKiB0eXBlICovIHR5cGUsXG4gICAgICAgICAgLyogaW5pdGlhbGl6ZXIgKi8gdW5kZWZpbmVkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVHlwZUxpdGVyYWxOb2RlKGVudHJpZXMpO1xuICB9XG5cbiAgdmlzaXRDb21tYUV4cHIoYXN0OiBDb21tYUV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IFdyYXBwZWROb2RlRXhwcjxhbnk+LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IG5vZGU6IHRzLk5vZGUgPSBhc3Qubm9kZTtcbiAgICBpZiAodHMuaXNFbnRpdHlOYW1lKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlVHlwZVJlZmVyZW5jZU5vZGUobm9kZSwgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNUeXBlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSBlbHNlIGlmICh0cy5pc0xpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuc3VwcG9ydGVkIFdyYXBwZWROb2RlRXhwciBpbiBUeXBlVHJhbnNsYXRvclZpc2l0b3I6ICR7dHMuU3ludGF4S2luZFtub2RlLmtpbmRdfWApO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihhc3Q6IFR5cGVvZkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlUXVlcnlOb2RlIHtcbiAgICBsZXQgZXhwciA9IHRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgIGFzdC5leHByLCB0aGlzLmltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKGV4cHIgYXMgdHMuSWRlbnRpZmllcik7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zbGF0ZVR5cGUodHlwZTogVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHR5cGUudmlzaXRUeXBlKHRoaXMsIGNvbnRleHQpO1xuICAgIGlmICghdHMuaXNUeXBlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQSBUeXBlIG11c3QgdHJhbnNsYXRlIHRvIGEgVHlwZU5vZGUsIGJ1dCB3YXMgJHt0cy5TeW50YXhLaW5kW3R5cGVOb2RlLmtpbmRdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU5vZGU7XG4gIH1cblxuICBwcml2YXRlIHRyYW5zbGF0ZUV4cHJlc3Npb24oZXhwcjogRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCB0eXBlTm9kZSA9IGV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICAgIGlmICghdHMuaXNUeXBlTm9kZSh0eXBlTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQW4gRXhwcmVzc2lvbiBtdXN0IHRyYW5zbGF0ZSB0byBhIFR5cGVOb2RlLCBidXQgd2FzICR7dHMuU3ludGF4S2luZFt0eXBlTm9kZS5raW5kXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVOb2RlO1xuICB9XG59XG5cbi8qKlxuICogVHJhbnNsYXRlIHRoZSBgTG9jYWxpemVkU3RyaW5nYCBub2RlIGludG8gYSBgVGFnZ2VkVGVtcGxhdGVFeHByZXNzaW9uYCBmb3IgRVMyMDE1IGZvcm1hdHRlZFxuICogb3V0cHV0LlxuICovXG5mdW5jdGlvbiBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdUYWdnZWRUZW1wbGF0ZShcbiAgICBhc3Q6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogQ29udGV4dCwgdmlzaXRvcjogRXhwcmVzc2lvblZpc2l0b3IpIHtcbiAgbGV0IHRlbXBsYXRlOiB0cy5UZW1wbGF0ZUxpdGVyYWw7XG4gIGNvbnN0IGxlbmd0aCA9IGFzdC5tZXNzYWdlUGFydHMubGVuZ3RoO1xuICBjb25zdCBtZXRhQmxvY2sgPSBhc3Quc2VyaWFsaXplSTE4bkhlYWQoKTtcbiAgaWYgKGxlbmd0aCA9PT0gMSkge1xuICAgIHRlbXBsYXRlID0gdHMuY3JlYXRlTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwobWV0YUJsb2NrLmNvb2tlZCwgbWV0YUJsb2NrLnJhdyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQ3JlYXRlIHRoZSBoZWFkIHBhcnRcbiAgICBjb25zdCBoZWFkID0gdHMuY3JlYXRlVGVtcGxhdGVIZWFkKG1ldGFCbG9jay5jb29rZWQsIG1ldGFCbG9jay5yYXcpO1xuICAgIGNvbnN0IHNwYW5zOiB0cy5UZW1wbGF0ZVNwYW5bXSA9IFtdO1xuICAgIC8vIENyZWF0ZSB0aGUgbWlkZGxlIHBhcnRzXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkRXhwcmVzc2lvbiA9IGFzdC5leHByZXNzaW9uc1tpIC0gMV0udmlzaXRFeHByZXNzaW9uKHZpc2l0b3IsIGNvbnRleHQpO1xuICAgICAgY29uc3QgdGVtcGxhdGVQYXJ0ID0gYXN0LnNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQoaSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU1pZGRsZSA9IGNyZWF0ZVRlbXBsYXRlTWlkZGxlKHRlbXBsYXRlUGFydC5jb29rZWQsIHRlbXBsYXRlUGFydC5yYXcpO1xuICAgICAgc3BhbnMucHVzaCh0cy5jcmVhdGVUZW1wbGF0ZVNwYW4ocmVzb2x2ZWRFeHByZXNzaW9uLCB0ZW1wbGF0ZU1pZGRsZSkpO1xuICAgIH1cbiAgICAvLyBDcmVhdGUgdGhlIHRhaWwgcGFydFxuICAgIGNvbnN0IHJlc29sdmVkRXhwcmVzc2lvbiA9IGFzdC5leHByZXNzaW9uc1tsZW5ndGggLSAyXS52aXNpdEV4cHJlc3Npb24odmlzaXRvciwgY29udGV4dCk7XG4gICAgY29uc3QgdGVtcGxhdGVQYXJ0ID0gYXN0LnNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQobGVuZ3RoIC0gMSk7XG4gICAgY29uc3QgdGVtcGxhdGVUYWlsID0gY3JlYXRlVGVtcGxhdGVUYWlsKHRlbXBsYXRlUGFydC5jb29rZWQsIHRlbXBsYXRlUGFydC5yYXcpO1xuICAgIHNwYW5zLnB1c2godHMuY3JlYXRlVGVtcGxhdGVTcGFuKHJlc29sdmVkRXhwcmVzc2lvbiwgdGVtcGxhdGVUYWlsKSk7XG4gICAgLy8gUHV0IGl0IGFsbCB0b2dldGhlclxuICAgIHRlbXBsYXRlID0gdHMuY3JlYXRlVGVtcGxhdGVFeHByZXNzaW9uKGhlYWQsIHNwYW5zKTtcbiAgfVxuICByZXR1cm4gdHMuY3JlYXRlVGFnZ2VkVGVtcGxhdGUodHMuY3JlYXRlSWRlbnRpZmllcignJGxvY2FsaXplJyksIHRlbXBsYXRlKTtcbn1cblxuXG4vLyBIQUNLOiBVc2UgdGhpcyBpbiBwbGFjZSBvZiBgdHMuY3JlYXRlVGVtcGxhdGVNaWRkbGUoKWAuXG4vLyBSZXZlcnQgb25jZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM1Mzc0IGlzIGZpeGVkXG5mdW5jdGlvbiBjcmVhdGVUZW1wbGF0ZU1pZGRsZShjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiB0cy5UZW1wbGF0ZU1pZGRsZSB7XG4gIGNvbnN0IG5vZGU6IHRzLlRlbXBsYXRlTGl0ZXJhbExpa2VOb2RlID0gdHMuY3JlYXRlVGVtcGxhdGVIZWFkKGNvb2tlZCwgcmF3KTtcbiAgbm9kZS5raW5kID0gdHMuU3ludGF4S2luZC5UZW1wbGF0ZU1pZGRsZTtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVNaWRkbGU7XG59XG5cbi8vIEhBQ0s6IFVzZSB0aGlzIGluIHBsYWNlIG9mIGB0cy5jcmVhdGVUZW1wbGF0ZVRhaWwoKWAuXG4vLyBSZXZlcnQgb25jZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM1Mzc0IGlzIGZpeGVkXG5mdW5jdGlvbiBjcmVhdGVUZW1wbGF0ZVRhaWwoY29va2VkOiBzdHJpbmcsIHJhdzogc3RyaW5nKTogdHMuVGVtcGxhdGVUYWlsIHtcbiAgY29uc3Qgbm9kZTogdHMuVGVtcGxhdGVMaXRlcmFsTGlrZU5vZGUgPSB0cy5jcmVhdGVUZW1wbGF0ZUhlYWQoY29va2VkLCByYXcpO1xuICBub2RlLmtpbmQgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlVGFpbDtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVUYWlsO1xufVxuXG4vKipcbiAqIFRyYW5zbGF0ZSB0aGUgYExvY2FsaXplZFN0cmluZ2Agbm9kZSBpbnRvIGEgYCRsb2NhbGl6ZWAgY2FsbCB1c2luZyB0aGUgaW1wb3J0ZWRcbiAqIGBfX21ha2VUZW1wbGF0ZU9iamVjdGAgaGVscGVyIGZvciBFUzUgZm9ybWF0dGVkIG91dHB1dC5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlTG9jYWxpemVkU3RyaW5nRnVuY3Rpb25DYWxsKFxuICAgIGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0LCB2aXNpdG9yOiBFeHByZXNzaW9uVmlzaXRvciwgaW1wb3J0czogSW1wb3J0TWFuYWdlcikge1xuICAvLyBBIGAkbG9jYWxpemVgIG1lc3NhZ2UgY29uc2lzdHMgYG1lc3NhZ2VQYXJ0c2AgYW5kIGBleHByZXNzaW9uc2AsIHdoaWNoIGdldCBpbnRlcmxlYXZlZFxuICAvLyB0b2dldGhlci4gVGhlIGludGVybGVhdmVkIHBpZWNlcyBsb29rIGxpa2U6XG4gIC8vIGBbbWVzc2FnZVBhcnQwLCBleHByZXNzaW9uMCwgbWVzc2FnZVBhcnQxLCBleHByZXNzaW9uMSwgbWVzc2FnZVBhcnQyXWBcbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoZXJlIGlzIGFsd2F5cyBhIG1lc3NhZ2UgcGFydCBhdCB0aGUgc3RhcnQgYW5kIGVuZCwgYW5kIHNvIHRoZXJlZm9yZVxuICAvLyBgbWVzc2FnZVBhcnRzLmxlbmd0aCA9PT0gZXhwcmVzc2lvbnMubGVuZ3RoICsgMWAuXG4gIC8vXG4gIC8vIEVhY2ggbWVzc2FnZSBwYXJ0IG1heSBiZSBwcmVmaXhlZCB3aXRoIFwibWV0YWRhdGFcIiwgd2hpY2ggaXMgd3JhcHBlZCBpbiBjb2xvbnMgKDopIGRlbGltaXRlcnMuXG4gIC8vIFRoZSBtZXRhZGF0YSBpcyBhdHRhY2hlZCB0byB0aGUgZmlyc3QgYW5kIHN1YnNlcXVlbnQgbWVzc2FnZSBwYXJ0cyBieSBjYWxscyB0b1xuICAvLyBgc2VyaWFsaXplSTE4bkhlYWQoKWAgYW5kIGBzZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KClgIHJlc3BlY3RpdmVseS5cblxuICAvLyBUaGUgZmlyc3QgbWVzc2FnZSBwYXJ0IChpLmUuIGBhc3QubWVzc2FnZVBhcnRzWzBdYCkgaXMgdXNlZCB0byBpbml0aWFsaXplIGBtZXNzYWdlUGFydHNgIGFycmF5LlxuICBjb25zdCBtZXNzYWdlUGFydHMgPSBbYXN0LnNlcmlhbGl6ZUkxOG5IZWFkKCldO1xuICBjb25zdCBleHByZXNzaW9uczogYW55W10gPSBbXTtcblxuICAvLyBUaGUgcmVzdCBvZiB0aGUgYGFzdC5tZXNzYWdlUGFydHNgIGFuZCBlYWNoIG9mIHRoZSBleHByZXNzaW9ucyBhcmUgYGFzdC5leHByZXNzaW9uc2AgcHVzaGVkXG4gIC8vIGludG8gdGhlIGFycmF5cy4gTm90ZSB0aGF0IGBhc3QubWVzc2FnZVBhcnRbaV1gIGNvcnJlc3BvbmRzIHRvIGBleHByZXNzaW9uc1tpLTFdYFxuICBmb3IgKGxldCBpID0gMTsgaSA8IGFzdC5tZXNzYWdlUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBleHByZXNzaW9ucy5wdXNoKGFzdC5leHByZXNzaW9uc1tpIC0gMV0udmlzaXRFeHByZXNzaW9uKHZpc2l0b3IsIGNvbnRleHQpKTtcbiAgICBtZXNzYWdlUGFydHMucHVzaChhc3Quc2VyaWFsaXplSTE4blRlbXBsYXRlUGFydChpKSk7XG4gIH1cblxuICAvLyBUaGUgcmVzdWx0aW5nIGRvd25sZXZlbGxlZCB0YWdnZWQgdGVtcGxhdGUgc3RyaW5nIHVzZXMgYSBjYWxsIHRvIHRoZSBgX19tYWtlVGVtcGxhdGVPYmplY3QoKWBcbiAgLy8gaGVscGVyLCBzbyB3ZSBtdXN0IGVuc3VyZSBpdCBoYXMgYmVlbiBpbXBvcnRlZC5cbiAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9IGltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydCgndHNsaWInLCAnX19tYWtlVGVtcGxhdGVPYmplY3QnKTtcbiAgY29uc3QgX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIgPSAobW9kdWxlSW1wb3J0ID09PSBudWxsKSA/XG4gICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkgOlxuICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModHMuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVJbXBvcnQpLCB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkpO1xuXG4gIC8vIEdlbmVyYXRlIHRoZSBjYWxsIGluIHRoZSBmb3JtOlxuICAvLyBgJGxvY2FsaXplKF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZE1lc3NhZ2VQYXJ0cywgcmF3TWVzc2FnZVBhcnRzKSwgLi4uZXhwcmVzc2lvbnMpO2BcbiAgcmV0dXJuIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAvKiBleHByZXNzaW9uICovIHRzLmNyZWF0ZUlkZW50aWZpZXIoJyRsb2NhbGl6ZScpLFxuICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1tcbiAgICAgICAgdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIsXG4gICAgICAgICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VQYXJ0cy5tYXAobWVzc2FnZVBhcnQgPT4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChtZXNzYWdlUGFydC5jb29rZWQpKSksXG4gICAgICAgICAgICAgIHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VQYXJ0cy5tYXAobWVzc2FnZVBhcnQgPT4gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChtZXNzYWdlUGFydC5yYXcpKSksXG4gICAgICAgICAgICBdKSxcbiAgICAgICAgLi4uZXhwcmVzc2lvbnMsXG4gICAgICBdKTtcbn1cbiJdfQ==