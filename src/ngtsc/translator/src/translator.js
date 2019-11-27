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
        define("@angular/compiler-cli/src/ngtsc/translator/src/translator", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var Context = /** @class */ (function () {
        function Context(isStatement) {
            this.isStatement = isStatement;
        }
        Object.defineProperty(Context.prototype, "withExpressionMode", {
            get: function () { return this.isStatement ? new Context(false) : this; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Context.prototype, "withStatementMode", {
            get: function () { return !this.isStatement ? new Context(true) : this; },
            enumerable: true,
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
            return ts.createVariableStatement(undefined, ts.createVariableDeclarationList([ts.createVariableDeclaration(stmt.name, undefined, stmt.value &&
                    stmt.value.visitExpression(this, context.withExpressionMode))], nodeFlags));
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
            return ts.createConditional(ast.condition.visitExpression(this, context), ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context));
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
            var expr = type.value.visitExpression(this, context);
            var typeArgs = type.typeParams !== null ?
                type.typeParams.map(function (param) { return param.visitType(_this, context); }) :
                undefined;
            return ts.createTypeReferenceNode(expr, typeArgs);
        };
        TypeTranslatorVisitor.prototype.visitArrayType = function (type, context) {
            return ts.createArrayTypeNode(type.visitType(this, context));
        };
        TypeTranslatorVisitor.prototype.visitMapType = function (type, context) {
            var parameter = ts.createParameter(undefined, undefined, undefined, 'key', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
            var typeArgs = type.valueType !== null ? type.valueType.visitType(this, context) : undefined;
            var indexSignature = ts.createIndexSignature(undefined, undefined, [parameter], typeArgs);
            return ts.createTypeLiteralNode([indexSignature]);
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
            return ts.createLiteral(ast.value);
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
                ts.createPropertyAccess(ts.createIdentifier(moduleImport), symbolIdentifier) :
                symbolIdentifier;
            var typeArguments = ast.typeParams ? ast.typeParams.map(function (type) { return type.visitType(_this, context); }) : undefined;
            return ts.createExpressionWithTypeArguments(typeArguments, typeName);
        };
        TypeTranslatorVisitor.prototype.visitConditionalExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitNotExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        TypeTranslatorVisitor.prototype.visitCastExpr = function (ast, context) { throw new Error('Method not implemented.'); };
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
            var values = ast.entries.map(function (expr) { return expr.visitExpression(_this, context); });
            return ts.createTupleTypeNode(values);
        };
        TypeTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var entries = ast.entries.map(function (entry) {
                var key = entry.key, quoted = entry.quoted;
                var value = entry.value.visitExpression(_this, context);
                return ts.createPropertyAssignment(quoted ? "'" + key + "'" : key, value);
            });
            return ts.createObjectLiteral(entries);
        };
        TypeTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) { throw new Error('Method not implemented.'); };
        TypeTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, context) {
            var node = ast.node;
            if (ts.isIdentifier(node)) {
                return node;
            }
            else {
                throw new Error("Unsupported WrappedNodeExpr in TypeTranslatorVisitor: " + ts.SyntaxKind[node.kind]);
            }
        };
        TypeTranslatorVisitor.prototype.visitTypeofExpr = function (ast, context) {
            var expr = translateExpression(ast.expr, this.imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER, ts.ScriptTarget.ES2015);
            return ts.createTypeQueryNode(expr);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNnJCO0lBRTdyQiwrQkFBaUM7SUFFakMsbUVBQXNIO0lBRXRIO1FBQ0UsaUJBQXFCLFdBQW9CO1lBQXBCLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBQUcsQ0FBQztRQUU3QyxzQkFBSSx1Q0FBa0I7aUJBQXRCLGNBQW9DLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTFGLHNCQUFJLHNDQUFpQjtpQkFBckIsY0FBbUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUMzRixjQUFDO0lBQUQsQ0FBQyxBQU5ELElBTUM7SUFOWSwwQkFBTztJQVFwQixJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFvQztRQUNsRSxDQUFDLHlCQUFjLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7UUFDM0QsQ0FBQyx5QkFBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO1FBQ3ZELENBQUMseUJBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQztRQUNuRSxDQUFDLHlCQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENB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LG9CQUFvQjtZQUNwQjtnQkFDRSxFQUFFLENBQUMsa0JBQWtCLENBQ2pCLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBQSxXQUFXLElBQUksT0FBQSxFQUFFLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUExQyxDQUEwQyxDQUFDLENBQUM7Z0JBQ2hGLEVBQUUsQ0FBQyxrQkFBa0IsQ0FDakIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFdBQVcsSUFBSSxPQUFBLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQXZDLENBQXVDLENBQUMsQ0FBQzthQUM5RSxDQUFDO1dBQ0gsV0FBVyxFQUNkLENBQUM7SUFDVCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FycmF5VHlwZSwgQXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpblR5cGUsIEJ1aWx0aW5UeXBlTmFtZSwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvbiwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblR5cGUsIEV4cHJlc3Npb25WaXNpdG9yLCBFeHRlcm5hbEV4cHIsIEV4dGVybmFsUmVmZXJlbmNlLCBGdW5jdGlvbkV4cHIsIElmU3RtdCwgSW5zdGFudGlhdGVFeHByLCBJbnZva2VGdW5jdGlvbkV4cHIsIEludm9rZU1ldGhvZEV4cHIsIEpTRG9jQ29tbWVudFN0bXQsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBMaXRlcmFsTWFwRXhwciwgTWFwVHlwZSwgTm90RXhwciwgUmVhZEtleUV4cHIsIFJlYWRQcm9wRXhwciwgUmVhZFZhckV4cHIsIFJldHVyblN0YXRlbWVudCwgU3RhdGVtZW50LCBTdGF0ZW1lbnRWaXNpdG9yLCBTdG10TW9kaWZpZXIsIFRocm93U3RtdCwgVHJ5Q2F0Y2hTdG10LCBUeXBlLCBUeXBlVmlzaXRvciwgVHlwZW9mRXhwciwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZUtleUV4cHIsIFdyaXRlUHJvcEV4cHIsIFdyaXRlVmFyRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtMb2NhbGl6ZWRTdHJpbmd9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIEltcG9ydFJld3JpdGVyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSLCBOb29wSW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5leHBvcnQgY2xhc3MgQ29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGlzU3RhdGVtZW50OiBib29sZWFuKSB7fVxuXG4gIGdldCB3aXRoRXhwcmVzc2lvbk1vZGUoKTogQ29udGV4dCB7IHJldHVybiB0aGlzLmlzU3RhdGVtZW50ID8gbmV3IENvbnRleHQoZmFsc2UpIDogdGhpczsgfVxuXG4gIGdldCB3aXRoU3RhdGVtZW50TW9kZSgpOiBDb250ZXh0IHsgcmV0dXJuICF0aGlzLmlzU3RhdGVtZW50ID8gbmV3IENvbnRleHQodHJ1ZSkgOiB0aGlzOyB9XG59XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPEJpbmFyeU9wZXJhdG9yLCB0cy5CaW5hcnlPcGVyYXRvcj4oW1xuICBbQmluYXJ5T3BlcmF0b3IuQW5kLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlciwgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlckVxdWFscywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRGl2aWRlLCB0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRXF1YWxzLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLklkZW50aWNhbCwgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Mb3dlciwgdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTWludXMsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Nb2R1bG8sIHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk11bHRpcGx5LCB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90RXF1YWxzLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuT3IsIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuUGx1cywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuXSk7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYW4gaW1wb3J0IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gYSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBtb2R1bGUgdGhhdCBoYXMgYmVlbiBpbXBvcnRlZC4gKi9cbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIC8qKiBUaGUgYWxpYXMgb2YgdGhlIGltcG9ydGVkIG1vZHVsZS4gKi9cbiAgcXVhbGlmaWVyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIHN5bWJvbCBuYW1lIGFuZCBpbXBvcnQgbmFtZXNwYWNlIG9mIGFuIGltcG9ydGVkIHN5bWJvbCxcbiAqIHdoaWNoIGhhcyBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgSW1wb3J0TWFuYWdlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYW1lZEltcG9ydCB7XG4gIC8qKiBUaGUgaW1wb3J0IG5hbWVzcGFjZSBjb250YWluaW5nIHRoaXMgaW1wb3J0ZWQgc3ltYm9sLiAqL1xuICBtb2R1bGVJbXBvcnQ6IHN0cmluZ3xudWxsO1xuICAvKiogVGhlIChwb3NzaWJseSByZXdyaXR0ZW4pIG5hbWUgb2YgdGhlIGltcG9ydGVkIHN5bWJvbC4gKi9cbiAgc3ltYm9sOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbXBvcnRNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBzcGVjaWZpZXJUb0lkZW50aWZpZXIgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG5leHRJbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciA9IG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgcHJpdmF0ZSBwcmVmaXggPSAnaScpIHtcbiAgfVxuXG4gIGdlbmVyYXRlTmFtZWRJbXBvcnQobW9kdWxlTmFtZTogc3RyaW5nLCBvcmlnaW5hbFN5bWJvbDogc3RyaW5nKTogTmFtZWRJbXBvcnQge1xuICAgIC8vIEZpcnN0LCByZXdyaXRlIHRoZSBzeW1ib2wgbmFtZS5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnJld3JpdGVyLnJld3JpdGVTeW1ib2wob3JpZ2luYWxTeW1ib2wsIG1vZHVsZU5hbWUpO1xuXG4gICAgLy8gQXNrIHRoZSByZXdyaXRlciBpZiB0aGlzIHN5bWJvbCBzaG91bGQgYmUgaW1wb3J0ZWQgYXQgYWxsLiBJZiBub3QsIGl0IGNhbiBiZSByZWZlcmVuY2VkXG4gICAgLy8gZGlyZWN0bHkgKG1vZHVsZUltcG9ydDogbnVsbCkuXG4gICAgaWYgKCF0aGlzLnJld3JpdGVyLnNob3VsZEltcG9ydFN5bWJvbChzeW1ib2wsIG1vZHVsZU5hbWUpKSB7XG4gICAgICAvLyBUaGUgc3ltYm9sIHNob3VsZCBiZSByZWZlcmVuY2VkIGRpcmVjdGx5LlxuICAgICAgcmV0dXJuIHttb2R1bGVJbXBvcnQ6IG51bGwsIHN5bWJvbH07XG4gICAgfVxuXG4gICAgLy8gSWYgbm90LCB0aGlzIHN5bWJvbCB3aWxsIGJlIGltcG9ydGVkLiBBbGxvY2F0ZSBhIHByZWZpeCBmb3IgdGhlIGltcG9ydGVkIG1vZHVsZSBpZiBuZWVkZWQuXG5cbiAgICBpZiAoIXRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLmhhcyhtb2R1bGVOYW1lKSkge1xuICAgICAgdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuc2V0KG1vZHVsZU5hbWUsIGAke3RoaXMucHJlZml4fSR7dGhpcy5uZXh0SW5kZXgrK31gKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlSW1wb3J0ID0gdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuZ2V0KG1vZHVsZU5hbWUpICE7XG5cbiAgICByZXR1cm4ge21vZHVsZUltcG9ydCwgc3ltYm9sfTtcbiAgfVxuXG4gIGdldEFsbEltcG9ydHMoY29udGV4dFBhdGg6IHN0cmluZyk6IEltcG9ydFtdIHtcbiAgICBjb25zdCBpbXBvcnRzOiB7c3BlY2lmaWVyOiBzdHJpbmcsIHF1YWxpZmllcjogc3RyaW5nfVtdID0gW107XG4gICAgdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuZm9yRWFjaCgocXVhbGlmaWVyLCBzcGVjaWZpZXIpID0+IHtcbiAgICAgIHNwZWNpZmllciA9IHRoaXMucmV3cml0ZXIucmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXIsIGNvbnRleHRQYXRoKTtcbiAgICAgIGltcG9ydHMucHVzaCh7c3BlY2lmaWVyLCBxdWFsaWZpZXJ9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gaW1wb3J0cztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlRXhwcmVzc2lvbihcbiAgICBleHByZXNzaW9uOiBFeHByZXNzaW9uLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pOiB0cy5FeHByZXNzaW9uIHtcbiAgcmV0dXJuIGV4cHJlc3Npb24udmlzaXRFeHByZXNzaW9uKFxuICAgICAgbmV3IEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHNjcmlwdFRhcmdldCksXG4gICAgICBuZXcgQ29udGV4dChmYWxzZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlU3RhdGVtZW50KFxuICAgIHN0YXRlbWVudDogU3RhdGVtZW50LCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pOiB0cy5TdGF0ZW1lbnQge1xuICByZXR1cm4gc3RhdGVtZW50LnZpc2l0U3RhdGVtZW50KFxuICAgICAgbmV3IEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcihpbXBvcnRzLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHNjcmlwdFRhcmdldCksXG4gICAgICBuZXcgQ29udGV4dCh0cnVlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVUeXBlKHR5cGU6IFR5cGUsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiB0cy5UeXBlTm9kZSB7XG4gIHJldHVybiB0eXBlLnZpc2l0VHlwZShuZXcgVHlwZVRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMpLCBuZXcgQ29udGV4dChmYWxzZSkpO1xufVxuXG5jbGFzcyBFeHByZXNzaW9uVHJhbnNsYXRvclZpc2l0b3IgaW1wbGVtZW50cyBFeHByZXNzaW9uVmlzaXRvciwgU3RhdGVtZW50VmlzaXRvciB7XG4gIHByaXZhdGUgZXh0ZXJuYWxTb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VNYXBTb3VyY2U+KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyLCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBzY3JpcHRUYXJnZXQ6IEV4Y2x1ZGU8dHMuU2NyaXB0VGFyZ2V0LCB0cy5TY3JpcHRUYXJnZXQuSlNPTj4pIHt9XG5cbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBEZWNsYXJlVmFyU3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgICBjb25zdCBub2RlRmxhZ3MgPVxuICAgICAgICAoKHRoaXMuc2NyaXB0VGFyZ2V0ID49IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpICYmIHN0bXQuaGFzTW9kaWZpZXIoU3RtdE1vZGlmaWVyLkZpbmFsKSkgP1xuICAgICAgICB0cy5Ob2RlRmxhZ3MuQ29uc3QgOlxuICAgICAgICB0cy5Ob2RlRmxhZ3MuTm9uZTtcbiAgICByZXR1cm4gdHMuY3JlYXRlVmFyaWFibGVTdGF0ZW1lbnQoXG4gICAgICAgIHVuZGVmaW5lZCwgdHMuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoXG4gICAgICAgICAgICAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RtdC5uYW1lLCB1bmRlZmluZWQsIHN0bXQudmFsdWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgbm9kZUZsYWdzKSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogRGVjbGFyZUZ1bmN0aW9uU3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBzdG10Lm5hbWUsIHVuZGVmaW5lZCxcbiAgICAgICAgc3RtdC5wYXJhbXMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVBhcmFtZXRlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwYXJhbS5uYW1lKSksXG4gICAgICAgIHVuZGVmaW5lZCwgdHMuY3JlYXRlQmxvY2soc3RtdC5zdGF0ZW1lbnRzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSk7XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25TdG10KHN0bXQ6IEV4cHJlc3Npb25TdGF0ZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCwgY29udGV4dDogQ29udGV4dCk6IHRzLlJldHVyblN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IENsYXNzU3RtdCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIGlmICh0aGlzLnNjcmlwdFRhcmdldCA8IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5zdXBwb3J0ZWQgbW9kZTogVmlzaXRpbmcgYSBcImRlY2xhcmUgY2xhc3NcIiBzdGF0ZW1lbnQgKGNsYXNzICR7c3RtdC5uYW1lfSkgd2hpbGUgYCArXG4gICAgICAgICAgYHRhcmdldGluZyAke3RzLlNjcmlwdFRhcmdldFt0aGlzLnNjcmlwdFRhcmdldF19LmApO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5JZlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlmKFxuICAgICAgICBzdG10LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIHRzLmNyZWF0ZUJsb2NrKFxuICAgICAgICAgICAgc3RtdC50cnVlQ2FzZS5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSxcbiAgICAgICAgc3RtdC5mYWxzZUNhc2UubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICB0cy5jcmVhdGVCbG9jayhzdG10LmZhbHNlQ2FzZS5tYXAoXG4gICAgICAgICAgICAgICAgY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSA6XG4gICAgICAgICAgICB1bmRlZmluZWQpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10LCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVGhyb3dTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVUaHJvdyhzdG10LmVycm9yLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXRDb21tZW50U3RtdChzdG10OiBDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudCh0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQudG9TdHJpbmcoKTtcbiAgICBjb25zdCBraW5kID0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhjb21tZW50U3RtdCwgW3traW5kLCB0ZXh0LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBSZWFkVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGFzdC5uYW1lICEpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoaWRlbnRpZmllciwgYXN0KTtcbiAgICByZXR1cm4gaWRlbnRpZmllcjtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IFdyaXRlVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlc3VsdDogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLFxuICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyByZXN1bHQgOiB0cy5jcmVhdGVQYXJlbihyZXN1bHQpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwckNvbnRleHQgPSBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZTtcbiAgICBjb25zdCBsaHMgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBleHByQ29udGV4dCksXG4gICAgICAgIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSk7XG4gICAgY29uc3QgcmhzID0gZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpO1xuICAgIGNvbnN0IHJlc3VsdDogdHMuRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZUJpbmFyeShsaHMsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHJocyk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyByZXN1bHQgOiB0cy5jcmVhdGVQYXJlbihyZXN1bHQpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IFdyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KFxuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgZXhwci5uYW1lKSxcbiAgICAgICAgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGFzdDogSW52b2tlTWV0aG9kRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgICBjb25zdCB0YXJnZXQgPSBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICBhc3QubmFtZSAhPT0gbnVsbCA/IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRhcmdldCwgYXN0Lm5hbWUpIDogdGFyZ2V0LCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoY2FsbCwgYXN0KTtcbiAgICByZXR1cm4gY2FsbDtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGFzdDogSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICBhc3QuZm4udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIGlmIChhc3QucHVyZSkge1xuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoZXhwciwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnQF9fUFVSRV9fJywgZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIGFzdCk7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihhc3Q6IEluc3RhbnRpYXRlRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLk5ld0V4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVOZXcoXG4gICAgICAgIGFzdC5jbGFzc0V4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IExpdGVyYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgbGV0IGV4cHI6IHRzLkV4cHJlc3Npb247XG4gICAgaWYgKGFzdC52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBleHByID0gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gICAgfSBlbHNlIGlmIChhc3QudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVOdWxsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSk7XG4gICAgfVxuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwgYXN0KTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuc2NyaXB0VGFyZ2V0ID49IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUgP1xuICAgICAgICBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdUYWdnZWRUZW1wbGF0ZShhc3QsIGNvbnRleHQsIHRoaXMpIDpcbiAgICAgICAgY3JlYXRlTG9jYWxpemVkU3RyaW5nRnVuY3Rpb25DYWxsKGFzdCwgY29udGV4dCwgdGhpcywgdGhpcy5pbXBvcnRzKTtcbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogRXh0ZXJuYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG4gICAgICB8dHMuSWRlbnRpZmllciB7XG4gICAgaWYgKGFzdC52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9ydCB1bmtub3duIG1vZHVsZSBvciBzeW1ib2wgJHthc3QudmFsdWV9YCk7XG4gICAgfVxuICAgIC8vIElmIGEgbW9kdWxlTmFtZSBpcyBzcGVjaWZpZWQsIHRoaXMgaXMgYSBub3JtYWwgaW1wb3J0LiBJZiB0aGVyZSdzIG5vIG1vZHVsZSBuYW1lLCBpdCdzIGFcbiAgICAvLyByZWZlcmVuY2UgdG8gYSBnbG9iYWwvYW1iaWVudCBzeW1ib2wuXG4gICAgaWYgKGFzdC52YWx1ZS5tb2R1bGVOYW1lICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgbm9ybWFsIGltcG9ydC4gRmluZCB0aGUgaW1wb3J0ZWQgbW9kdWxlLlxuICAgICAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9XG4gICAgICAgICAgdGhpcy5pbXBvcnRzLmdlbmVyYXRlTmFtZWRJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUsIGFzdC52YWx1ZS5uYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbXBvcnQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgYW1iaWVudCBhZnRlciBhbGwuXG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZUltcG9ydCksIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBzeW1ib2wgaXMgYW1iaWVudCwgc28ganVzdCByZWZlcmVuY2UgaXQuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihhc3QudmFsdWUubmFtZSk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoYXN0OiBDb25kaXRpb25hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVDb25kaXRpb25hbChcbiAgICAgICAgYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGFzdC50cnVlQ2FzZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIGFzdC5mYWxzZUNhc2UgIS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogTm90RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGFzdDogQXNzZXJ0Tm90TnVsbCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vbk51bGxFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGFzdDogQ2FzdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGFzdDogRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRnVuY3Rpb25FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXN0Lm5hbWUgfHwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgcGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKSxcbiAgICAgICAgdW5kZWZpbmVkLCB0cy5jcmVhdGVCbG9jayhhc3Quc3RhdGVtZW50cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQpKSkpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBCaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAoIUJJTkFSWV9PUEVSQVRPUlMuaGFzKGFzdC5vcGVyYXRvcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBiaW5hcnkgb3BlcmF0b3I6ICR7QmluYXJ5T3BlcmF0b3JbYXN0Lm9wZXJhdG9yXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgYXN0Lmxocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIEJJTkFSWV9PUEVSQVRPUlMuZ2V0KGFzdC5vcGVyYXRvcikgISxcbiAgICAgICAgYXN0LnJocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRSZWFkUHJvcEV4cHIoYXN0OiBSZWFkUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyhhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBhc3QubmFtZSk7XG4gIH1cblxuICB2aXNpdFJlYWRLZXlFeHByKGFzdDogUmVhZEtleUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MoXG4gICAgICAgIGFzdC5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGFzdC5pbmRleC52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsQXJyYXlFeHByKGFzdDogTGl0ZXJhbEFycmF5RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPVxuICAgICAgICB0cy5jcmVhdGVBcnJheUxpdGVyYWwoYXN0LmVudHJpZXMubWFwKGV4cHIgPT4gZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpKTtcbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIGFzdCk7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGFzdDogTGl0ZXJhbE1hcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZW50cmllcyA9IGFzdC5lbnRyaWVzLm1hcChcbiAgICAgICAgZW50cnkgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgZW50cnkucXVvdGVkID8gdHMuY3JlYXRlTGl0ZXJhbChlbnRyeS5rZXkpIDogdHMuY3JlYXRlSWRlbnRpZmllcihlbnRyeS5rZXkpLFxuICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcyk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3QpO1xuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgdmlzaXRDb21tYUV4cHIoYXN0OiBDb21tYUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcmFwcGVkTm9kZUV4cHIoYXN0OiBXcmFwcGVkTm9kZUV4cHI8YW55PiwgY29udGV4dDogQ29udGV4dCk6IGFueSB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihhc3Qubm9kZSkpIHtcbiAgICAgIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLnJlY29yZFVzZWRJZGVudGlmaWVyKGFzdC5ub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIGFzdC5ub2RlO1xuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGFzdDogVHlwZW9mRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVPZkV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlT2YoYXN0LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0U291cmNlTWFwUmFuZ2UoZXhwcjogdHMuRXhwcmVzc2lvbiwgYXN0OiBFeHByZXNzaW9uKSB7XG4gICAgaWYgKGFzdC5zb3VyY2VTcGFuKSB7XG4gICAgICBjb25zdCB7c3RhcnQsIGVuZH0gPSBhc3Quc291cmNlU3BhbjtcbiAgICAgIGNvbnN0IHt1cmwsIGNvbnRlbnR9ID0gc3RhcnQuZmlsZTtcbiAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgaWYgKCF0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuaGFzKHVybCkpIHtcbiAgICAgICAgICB0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuc2V0KHVybCwgdHMuY3JlYXRlU291cmNlTWFwU291cmNlKHVybCwgY29udGVudCwgcG9zID0+IHBvcykpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5nZXQodXJsKTtcbiAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwge3Bvczogc3RhcnQub2Zmc2V0LCBlbmQ6IGVuZC5vZmZzZXQsIHNvdXJjZX0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHlwZVRyYW5zbGF0b3JWaXNpdG9yIGltcGxlbWVudHMgRXhwcmVzc2lvblZpc2l0b3IsIFR5cGVWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKSB7fVxuXG4gIHZpc2l0QnVpbHRpblR5cGUodHlwZTogQnVpbHRpblR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5LZXl3b3JkVHlwZU5vZGUge1xuICAgIHN3aXRjaCAodHlwZS5uYW1lKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5Cb29sOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQm9vbGVhbktleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuRHluYW1pYzpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuSW50OlxuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuTnVtYmVyOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuTnVtYmVyS2V5d29yZCk7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5TdHJpbmc6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkKTtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLk5vbmU6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OZXZlcktleXdvcmQpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBidWlsdGluIHR5cGU6ICR7QnVpbHRpblR5cGVOYW1lW3R5cGUubmFtZV19YCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uVHlwZSh0eXBlOiBFeHByZXNzaW9uVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVSZWZlcmVuY2VUeXBlIHtcbiAgICBjb25zdCBleHByOiB0cy5JZGVudGlmaWVyfHRzLlF1YWxpZmllZE5hbWUgPSB0eXBlLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgICBjb25zdCB0eXBlQXJncyA9IHR5cGUudHlwZVBhcmFtcyAhPT0gbnVsbCA/XG4gICAgICAgIHR5cGUudHlwZVBhcmFtcy5tYXAocGFyYW0gPT4gcGFyYW0udmlzaXRUeXBlKHRoaXMsIGNvbnRleHQpKSA6XG4gICAgICAgIHVuZGVmaW5lZDtcblxuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShleHByLCB0eXBlQXJncyk7XG4gIH1cblxuICB2aXNpdEFycmF5VHlwZSh0eXBlOiBBcnJheVR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5BcnJheVR5cGVOb2RlIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQXJyYXlUeXBlTm9kZSh0eXBlLnZpc2l0VHlwZSh0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdE1hcFR5cGUodHlwZTogTWFwVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVMaXRlcmFsTm9kZSB7XG4gICAgY29uc3QgcGFyYW1ldGVyID0gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAna2V5JywgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkKSk7XG4gICAgY29uc3QgdHlwZUFyZ3MgPSB0eXBlLnZhbHVlVHlwZSAhPT0gbnVsbCA/IHR5cGUudmFsdWVUeXBlLnZpc2l0VHlwZSh0aGlzLCBjb250ZXh0KSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBpbmRleFNpZ25hdHVyZSA9IHRzLmNyZWF0ZUluZGV4U2lnbmF0dXJlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbcGFyYW1ldGVyXSwgdHlwZUFyZ3MpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW2luZGV4U2lnbmF0dXJlXSk7XG4gIH1cblxuICB2aXNpdFJlYWRWYXJFeHByKGFzdDogUmVhZFZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcge1xuICAgIGlmIChhc3QubmFtZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWFkVmFyRXhwciB3aXRoIG5vIHZhcmlhYmxlIG5hbWUgaW4gdHlwZWApO1xuICAgIH1cbiAgICByZXR1cm4gYXN0Lm5hbWU7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRXcml0ZUtleUV4cHIoZXhwcjogV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBXcml0ZVByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihhc3Q6IEludm9rZU1ldGhvZEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoYXN0OiBJbnZva2VGdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoYXN0OiBJbnN0YW50aWF0ZUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IExpdGVyYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuTGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSBhcyBzdHJpbmcpO1xuICB9XG5cbiAgdmlzaXRMb2NhbGl6ZWRTdHJpbmcoYXN0OiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihhc3Q6IEV4dGVybmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBpZiAoYXN0LnZhbHVlLm1vZHVsZU5hbWUgPT09IG51bGwgfHwgYXN0LnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHVua25vd24gbW9kdWxlIG9yIHN5bWJvbGApO1xuICAgIH1cbiAgICBjb25zdCB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9ID1cbiAgICAgICAgdGhpcy5pbXBvcnRzLmdlbmVyYXRlTmFtZWRJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUsIGFzdC52YWx1ZS5uYW1lKTtcbiAgICBjb25zdCBzeW1ib2xJZGVudGlmaWVyID0gdHMuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpO1xuXG4gICAgY29uc3QgdHlwZU5hbWUgPSBtb2R1bGVJbXBvcnQgP1xuICAgICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0cy5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZUltcG9ydCksIHN5bWJvbElkZW50aWZpZXIpIDpcbiAgICAgICAgc3ltYm9sSWRlbnRpZmllcjtcblxuICAgIGNvbnN0IHR5cGVBcmd1bWVudHMgPVxuICAgICAgICBhc3QudHlwZVBhcmFtcyA/IGFzdC50eXBlUGFyYW1zLm1hcCh0eXBlID0+IHR5cGUudmlzaXRUeXBlKHRoaXMsIGNvbnRleHQpKSA6IHVuZGVmaW5lZDtcblxuICAgIHJldHVybiB0cy5jcmVhdGVFeHByZXNzaW9uV2l0aFR5cGVBcmd1bWVudHModHlwZUFyZ3VtZW50cywgdHlwZU5hbWUpO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoYXN0OiBDb25kaXRpb25hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoYXN0OiBOb3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoYXN0OiBBc3NlcnROb3ROdWxsLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRDYXN0RXhwcihhc3Q6IENhc3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7IHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTsgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGFzdDogRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRCaW5hcnlPcGVyYXRvckV4cHIoYXN0OiBCaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IFJlYWRQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoYXN0OiBSZWFkS2V5RXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IExpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UdXBsZVR5cGVOb2RlIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBhc3QuZW50cmllcy5tYXAoZXhwciA9PiBleHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR1cGxlVHlwZU5vZGUodmFsdWVzKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoYXN0OiBMaXRlcmFsTWFwRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBjb25zdCBlbnRyaWVzID0gYXN0LmVudHJpZXMubWFwKGVudHJ5ID0+IHtcbiAgICAgIGNvbnN0IHtrZXksIHF1b3RlZH0gPSBlbnRyeTtcbiAgICAgIGNvbnN0IHZhbHVlID0gZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChxdW90ZWQgPyBgJyR7a2V5fSdgIDoga2V5LCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcyk7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IENvbW1hRXhwciwgY29udGV4dDogQ29udGV4dCkgeyB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7IH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IFdyYXBwZWROb2RlRXhwcjxhbnk+LCBjb250ZXh0OiBDb250ZXh0KTogdHMuSWRlbnRpZmllciB7XG4gICAgY29uc3Qgbm9kZTogdHMuTm9kZSA9IGFzdC5ub2RlO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuc3VwcG9ydGVkIFdyYXBwZWROb2RlRXhwciBpbiBUeXBlVHJhbnNsYXRvclZpc2l0b3I6ICR7dHMuU3ludGF4S2luZFtub2RlLmtpbmRdfWApO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0VHlwZW9mRXhwcihhc3Q6IFR5cGVvZkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlUXVlcnlOb2RlIHtcbiAgICBsZXQgZXhwciA9IHRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgIGFzdC5leHByLCB0aGlzLmltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUXVlcnlOb2RlKGV4cHIgYXMgdHMuSWRlbnRpZmllcik7XG4gIH1cbn1cblxuLyoqXG4gKiBUcmFuc2xhdGUgdGhlIGBMb2NhbGl6ZWRTdHJpbmdgIG5vZGUgaW50byBhIGBUYWdnZWRUZW1wbGF0ZUV4cHJlc3Npb25gIGZvciBFUzIwMTUgZm9ybWF0dGVkXG4gKiBvdXRwdXQuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUxvY2FsaXplZFN0cmluZ1RhZ2dlZFRlbXBsYXRlKFxuICAgIGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0LCB2aXNpdG9yOiBFeHByZXNzaW9uVmlzaXRvcikge1xuICBsZXQgdGVtcGxhdGU6IHRzLlRlbXBsYXRlTGl0ZXJhbDtcbiAgY29uc3QgbGVuZ3RoID0gYXN0Lm1lc3NhZ2VQYXJ0cy5sZW5ndGg7XG4gIGNvbnN0IG1ldGFCbG9jayA9IGFzdC5zZXJpYWxpemVJMThuSGVhZCgpO1xuICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgdGVtcGxhdGUgPSB0cy5jcmVhdGVOb1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbChtZXRhQmxvY2suY29va2VkLCBtZXRhQmxvY2sucmF3KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBDcmVhdGUgdGhlIGhlYWQgcGFydFxuICAgIGNvbnN0IGhlYWQgPSB0cy5jcmVhdGVUZW1wbGF0ZUhlYWQobWV0YUJsb2NrLmNvb2tlZCwgbWV0YUJsb2NrLnJhdyk7XG4gICAgY29uc3Qgc3BhbnM6IHRzLlRlbXBsYXRlU3BhbltdID0gW107XG4gICAgLy8gQ3JlYXRlIHRoZSBtaWRkbGUgcGFydHNcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgY29uc3QgcmVzb2x2ZWRFeHByZXNzaW9uID0gYXN0LmV4cHJlc3Npb25zW2kgLSAxXS52aXNpdEV4cHJlc3Npb24odmlzaXRvciwgY29udGV4dCk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVBhcnQgPSBhc3Quc2VyaWFsaXplSTE4blRlbXBsYXRlUGFydChpKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlTWlkZGxlID0gY3JlYXRlVGVtcGxhdGVNaWRkbGUodGVtcGxhdGVQYXJ0LmNvb2tlZCwgdGVtcGxhdGVQYXJ0LnJhdyk7XG4gICAgICBzcGFucy5wdXNoKHRzLmNyZWF0ZVRlbXBsYXRlU3BhbihyZXNvbHZlZEV4cHJlc3Npb24sIHRlbXBsYXRlTWlkZGxlKSk7XG4gICAgfVxuICAgIC8vIENyZWF0ZSB0aGUgdGFpbCBwYXJ0XG4gICAgY29uc3QgcmVzb2x2ZWRFeHByZXNzaW9uID0gYXN0LmV4cHJlc3Npb25zW2xlbmd0aCAtIDJdLnZpc2l0RXhwcmVzc2lvbih2aXNpdG9yLCBjb250ZXh0KTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhcnQgPSBhc3Quc2VyaWFsaXplSTE4blRlbXBsYXRlUGFydChsZW5ndGggLSAxKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVRhaWwgPSBjcmVhdGVUZW1wbGF0ZVRhaWwodGVtcGxhdGVQYXJ0LmNvb2tlZCwgdGVtcGxhdGVQYXJ0LnJhdyk7XG4gICAgc3BhbnMucHVzaCh0cy5jcmVhdGVUZW1wbGF0ZVNwYW4ocmVzb2x2ZWRFeHByZXNzaW9uLCB0ZW1wbGF0ZVRhaWwpKTtcbiAgICAvLyBQdXQgaXQgYWxsIHRvZ2V0aGVyXG4gICAgdGVtcGxhdGUgPSB0cy5jcmVhdGVUZW1wbGF0ZUV4cHJlc3Npb24oaGVhZCwgc3BhbnMpO1xuICB9XG4gIHJldHVybiB0cy5jcmVhdGVUYWdnZWRUZW1wbGF0ZSh0cy5jcmVhdGVJZGVudGlmaWVyKCckbG9jYWxpemUnKSwgdGVtcGxhdGUpO1xufVxuXG5cbi8vIEhBQ0s6IFVzZSB0aGlzIGluIHBsYWNlIG9mIGB0cy5jcmVhdGVUZW1wbGF0ZU1pZGRsZSgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWRcbmZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlTWlkZGxlKGNvb2tlZDogc3RyaW5nLCByYXc6IHN0cmluZyk6IHRzLlRlbXBsYXRlTWlkZGxlIHtcbiAgY29uc3Qgbm9kZTogdHMuVGVtcGxhdGVMaXRlcmFsTGlrZU5vZGUgPSB0cy5jcmVhdGVUZW1wbGF0ZUhlYWQoY29va2VkLCByYXcpO1xuICBub2RlLmtpbmQgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlTWlkZGxlO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZU1pZGRsZTtcbn1cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlVGFpbCgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWRcbmZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlVGFpbChjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiB0cy5UZW1wbGF0ZVRhaWwge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIG5vZGUua2luZCA9IHRzLlN5bnRheEtpbmQuVGVtcGxhdGVUYWlsO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZVRhaWw7XG59XG5cbi8qKlxuICogVHJhbnNsYXRlIHRoZSBgTG9jYWxpemVkU3RyaW5nYCBub2RlIGludG8gYSBgJGxvY2FsaXplYCBjYWxsIHVzaW5nIHRoZSBpbXBvcnRlZFxuICogYF9fbWFrZVRlbXBsYXRlT2JqZWN0YCBoZWxwZXIgZm9yIEVTNSBmb3JtYXR0ZWQgb3V0cHV0LlxuICovXG5mdW5jdGlvbiBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdGdW5jdGlvbkNhbGwoXG4gICAgYXN0OiBMb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQsIHZpc2l0b3I6IEV4cHJlc3Npb25WaXNpdG9yLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKSB7XG4gIC8vIEEgYCRsb2NhbGl6ZWAgbWVzc2FnZSBjb25zaXN0cyBgbWVzc2FnZVBhcnRzYCBhbmQgYGV4cHJlc3Npb25zYCwgd2hpY2ggZ2V0IGludGVybGVhdmVkXG4gIC8vIHRvZ2V0aGVyLiBUaGUgaW50ZXJsZWF2ZWQgcGllY2VzIGxvb2sgbGlrZTpcbiAgLy8gYFttZXNzYWdlUGFydDAsIGV4cHJlc3Npb24wLCBtZXNzYWdlUGFydDEsIGV4cHJlc3Npb24xLCBtZXNzYWdlUGFydDJdYFxuICAvL1xuICAvLyBOb3RlIHRoYXQgdGhlcmUgaXMgYWx3YXlzIGEgbWVzc2FnZSBwYXJ0IGF0IHRoZSBzdGFydCBhbmQgZW5kLCBhbmQgc28gdGhlcmVmb3JlXG4gIC8vIGBtZXNzYWdlUGFydHMubGVuZ3RoID09PSBleHByZXNzaW9ucy5sZW5ndGggKyAxYC5cbiAgLy9cbiAgLy8gRWFjaCBtZXNzYWdlIHBhcnQgbWF5IGJlIHByZWZpeGVkIHdpdGggXCJtZXRhZGF0YVwiLCB3aGljaCBpcyB3cmFwcGVkIGluIGNvbG9ucyAoOikgZGVsaW1pdGVycy5cbiAgLy8gVGhlIG1ldGFkYXRhIGlzIGF0dGFjaGVkIHRvIHRoZSBmaXJzdCBhbmQgc3Vic2VxdWVudCBtZXNzYWdlIHBhcnRzIGJ5IGNhbGxzIHRvXG4gIC8vIGBzZXJpYWxpemVJMThuSGVhZCgpYCBhbmQgYHNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQoKWAgcmVzcGVjdGl2ZWx5LlxuXG4gIC8vIFRoZSBmaXJzdCBtZXNzYWdlIHBhcnQgKGkuZS4gYGFzdC5tZXNzYWdlUGFydHNbMF1gKSBpcyB1c2VkIHRvIGluaXRpYWxpemUgYG1lc3NhZ2VQYXJ0c2AgYXJyYXkuXG4gIGNvbnN0IG1lc3NhZ2VQYXJ0cyA9IFthc3Quc2VyaWFsaXplSTE4bkhlYWQoKV07XG4gIGNvbnN0IGV4cHJlc3Npb25zOiBhbnlbXSA9IFtdO1xuXG4gIC8vIFRoZSByZXN0IG9mIHRoZSBgYXN0Lm1lc3NhZ2VQYXJ0c2AgYW5kIGVhY2ggb2YgdGhlIGV4cHJlc3Npb25zIGFyZSBgYXN0LmV4cHJlc3Npb25zYCBwdXNoZWRcbiAgLy8gaW50byB0aGUgYXJyYXlzLiBOb3RlIHRoYXQgYGFzdC5tZXNzYWdlUGFydFtpXWAgY29ycmVzcG9uZHMgdG8gYGV4cHJlc3Npb25zW2ktMV1gXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgYXN0Lm1lc3NhZ2VQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIGV4cHJlc3Npb25zLnB1c2goYXN0LmV4cHJlc3Npb25zW2kgLSAxXS52aXNpdEV4cHJlc3Npb24odmlzaXRvciwgY29udGV4dCkpO1xuICAgIG1lc3NhZ2VQYXJ0cy5wdXNoKGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGkpKTtcbiAgfVxuXG4gIC8vIFRoZSByZXN1bHRpbmcgZG93bmxldmVsbGVkIHRhZ2dlZCB0ZW1wbGF0ZSBzdHJpbmcgdXNlcyBhIGNhbGwgdG8gdGhlIGBfX21ha2VUZW1wbGF0ZU9iamVjdCgpYFxuICAvLyBoZWxwZXIsIHNvIHdlIG11c3QgZW5zdXJlIGl0IGhhcyBiZWVuIGltcG9ydGVkLlxuICBjb25zdCB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9ID0gaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KCd0c2xpYicsICdfX21ha2VUZW1wbGF0ZU9iamVjdCcpO1xuICBjb25zdCBfX21ha2VUZW1wbGF0ZU9iamVjdEhlbHBlciA9IChtb2R1bGVJbXBvcnQgPT09IG51bGwpID9cbiAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKSA6XG4gICAgICB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0cy5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZUltcG9ydCksIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKSk7XG5cbiAgLy8gR2VuZXJhdGUgdGhlIGNhbGwgaW4gdGhlIGZvcm06XG4gIC8vIGAkbG9jYWxpemUoX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkTWVzc2FnZVBhcnRzLCByYXdNZXNzYWdlUGFydHMpLCAuLi5leHByZXNzaW9ucyk7YFxuICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgIC8qIGV4cHJlc3Npb24gKi8gdHMuY3JlYXRlSWRlbnRpZmllcignJGxvY2FsaXplJyksXG4gICAgICAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCxcbiAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW1xuICAgICAgICB0cy5jcmVhdGVDYWxsKFxuICAgICAgICAgICAgLyogZXhwcmVzc2lvbiAqLyBfX21ha2VUZW1wbGF0ZU9iamVjdEhlbHBlcixcbiAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogYXJndW1lbnRzQXJyYXkgKi9cbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKFxuICAgICAgICAgICAgICAgICAgbWVzc2FnZVBhcnRzLm1hcChtZXNzYWdlUGFydCA9PiB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKG1lc3NhZ2VQYXJ0LmNvb2tlZCkpKSxcbiAgICAgICAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKFxuICAgICAgICAgICAgICAgICAgbWVzc2FnZVBhcnRzLm1hcChtZXNzYWdlUGFydCA9PiB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKG1lc3NhZ2VQYXJ0LnJhdykpKSxcbiAgICAgICAgICAgIF0pLFxuICAgICAgICAuLi5leHByZXNzaW9ucyxcbiAgICAgIF0pO1xufVxuIl19