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
            this.setSourceMapRange(identifier, ast.sourceSpan);
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
            this.setSourceMapRange(call, ast.sourceSpan);
            return call;
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            var _this = this;
            var expr = ts.createCall(ast.fn.visitExpression(this, context), undefined, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
            if (ast.pure) {
                ts.addSyntheticLeadingComment(expr, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', false);
            }
            this.setSourceMapRange(expr, ast.sourceSpan);
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
            this.setSourceMapRange(expr, ast.sourceSpan);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitLocalizedString = function (ast, context) {
            var localizedString = this.scriptTarget >= ts.ScriptTarget.ES2015 ?
                this.createLocalizedStringTaggedTemplate(ast, context) :
                this.createLocalizedStringFunctionCall(ast, context);
            this.setSourceMapRange(localizedString, ast.sourceSpan);
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
            this.setSourceMapRange(expr, ast.sourceSpan);
            return expr;
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var entries = ast.entries.map(function (entry) { return ts.createPropertyAssignment(entry.quoted ? ts.createLiteral(entry.key) : ts.createIdentifier(entry.key), entry.value.visitExpression(_this, context)); });
            var expr = ts.createObjectLiteral(entries);
            this.setSourceMapRange(expr, ast.sourceSpan);
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
        /**
         * Translate the `LocalizedString` node into a `TaggedTemplateExpression` for ES2015 formatted
         * output.
         */
        ExpressionTranslatorVisitor.prototype.createLocalizedStringTaggedTemplate = function (ast, context) {
            var template;
            var length = ast.messageParts.length;
            var metaBlock = ast.serializeI18nHead();
            if (length === 1) {
                template = ts.createNoSubstitutionTemplateLiteral(metaBlock.cooked, metaBlock.raw);
                this.setSourceMapRange(template, ast.getMessagePartSourceSpan(0));
            }
            else {
                // Create the head part
                var head = ts.createTemplateHead(metaBlock.cooked, metaBlock.raw);
                this.setSourceMapRange(head, ast.getMessagePartSourceSpan(0));
                var spans = [];
                // Create the middle parts
                for (var i = 1; i < length - 1; i++) {
                    var resolvedExpression_1 = ast.expressions[i - 1].visitExpression(this, context);
                    this.setSourceMapRange(resolvedExpression_1, ast.getPlaceholderSourceSpan(i - 1));
                    var templatePart_1 = ast.serializeI18nTemplatePart(i);
                    var templateMiddle = createTemplateMiddle(templatePart_1.cooked, templatePart_1.raw);
                    this.setSourceMapRange(templateMiddle, ast.getMessagePartSourceSpan(i));
                    var templateSpan = ts.createTemplateSpan(resolvedExpression_1, templateMiddle);
                    spans.push(templateSpan);
                }
                // Create the tail part
                var resolvedExpression = ast.expressions[length - 2].visitExpression(this, context);
                this.setSourceMapRange(resolvedExpression, ast.getPlaceholderSourceSpan(length - 2));
                var templatePart = ast.serializeI18nTemplatePart(length - 1);
                var templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
                this.setSourceMapRange(templateTail, ast.getMessagePartSourceSpan(length - 1));
                spans.push(ts.createTemplateSpan(resolvedExpression, templateTail));
                // Put it all together
                template = ts.createTemplateExpression(head, spans);
            }
            var expression = ts.createTaggedTemplate(ts.createIdentifier('$localize'), template);
            this.setSourceMapRange(expression, ast.sourceSpan);
            return expression;
        };
        /**
         * Translate the `LocalizedString` node into a `$localize` call using the imported
         * `__makeTemplateObject` helper for ES5 formatted output.
         */
        ExpressionTranslatorVisitor.prototype.createLocalizedStringFunctionCall = function (ast, context) {
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
            var _this = this;
            // The first message part (i.e. `ast.messageParts[0]`) is used to initialize `messageParts`
            // array.
            var messageParts = [ast.serializeI18nHead()];
            var expressions = [];
            // The rest of the `ast.messageParts` and each of the expressions are `ast.expressions` pushed
            // into the arrays. Note that `ast.messagePart[i]` corresponds to `expressions[i-1]`
            for (var i = 1; i < ast.messageParts.length; i++) {
                expressions.push(ast.expressions[i - 1].visitExpression(this, context));
                messageParts.push(ast.serializeI18nTemplatePart(i));
            }
            // The resulting downlevelled tagged template string uses a call to the `__makeTemplateObject()`
            // helper, so we must ensure it has been imported.
            var _a = this.imports.generateNamedImport('tslib', '__makeTemplateObject'), moduleImport = _a.moduleImport, symbol = _a.symbol;
            var __makeTemplateObjectHelper = (moduleImport === null) ?
                ts.createIdentifier(symbol) :
                ts.createPropertyAccess(ts.createIdentifier(moduleImport), ts.createIdentifier(symbol));
            // Generate the call in the form:
            // `$localize(__makeTemplateObject(cookedMessageParts, rawMessageParts), ...expressions);`
            var cookedLiterals = messageParts.map(function (messagePart, i) {
                return _this.createLiteral(messagePart.cooked, ast.getMessagePartSourceSpan(i));
            });
            var rawLiterals = messageParts.map(function (messagePart, i) { return _this.createLiteral(messagePart.raw, ast.getMessagePartSourceSpan(i)); });
            return ts.createCall(
            /* expression */ ts.createIdentifier('$localize'), 
            /* typeArguments */ undefined, tslib_1.__spread([
                ts.createCall(
                /* expression */ __makeTemplateObjectHelper, 
                /* typeArguments */ undefined, 
                /* argumentsArray */
                [
                    ts.createArrayLiteral(cookedLiterals),
                    ts.createArrayLiteral(rawLiterals),
                ])
            ], expressions));
        };
        ExpressionTranslatorVisitor.prototype.setSourceMapRange = function (expr, sourceSpan) {
            if (sourceSpan) {
                var start = sourceSpan.start, end = sourceSpan.end;
                var _a = start.file, url = _a.url, content = _a.content;
                if (url) {
                    if (!this.externalSourceFiles.has(url)) {
                        this.externalSourceFiles.set(url, ts.createSourceMapSource(url, content, function (pos) { return pos; }));
                    }
                    var source = this.externalSourceFiles.get(url);
                    ts.setSourceMapRange(expr, { pos: start.offset, end: end.offset, source: source });
                }
            }
        };
        ExpressionTranslatorVisitor.prototype.createLiteral = function (text, span) {
            var literal = ts.createStringLiteral(text);
            this.setSourceMapRange(literal, span);
            return literal;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJyQjtJQUMzckIsc0VBQTBHO0lBQzFHLCtCQUFpQztJQUVqQyxtRUFBc0g7SUFFdEg7UUFDRSxpQkFBcUIsV0FBb0I7WUFBcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFBRyxDQUFDO1FBRTdDLHNCQUFJLHVDQUFrQjtpQkFBdEI7Z0JBQ0UsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RELENBQUM7OztXQUFBO1FBRUQsc0JBQUksc0NBQWlCO2lCQUFyQjtnQkFDRSxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0RCxDQUFDOzs7V0FBQTtRQUNILGNBQUM7SUFBRCxDQUFDLEFBVkQsSUFVQztJQVZZLDBCQUFPO0lBWXBCLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUF3QztRQUNyRSxDQUFDLDBCQUFhLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQy9DLENBQUMsMEJBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7S0FDOUMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBb0M7UUFDbEUsQ0FBQyx5QkFBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFD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QUNILDRCQUFDO0lBQUQsQ0FBQyxBQTdORCxJQTZOQztJQTdOWSxzREFBcUI7SUErTmxDLDBEQUEwRDtJQUMxRCw0RUFBNEU7SUFDNUUsU0FBUyxvQkFBb0IsQ0FBQyxNQUFjLEVBQUUsR0FBVztRQUN2RCxJQUFNLElBQUksR0FBK0IsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsSUFBc0IsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQztRQUM1RCxPQUFPLElBQXlCLENBQUM7SUFDbkMsQ0FBQztJQUVELHdEQUF3RDtJQUN4RCw0RUFBNEU7SUFDNUUsU0FBUyxrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsR0FBVztRQUNyRCxJQUFNLElBQUksR0FBK0IsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsSUFBc0IsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQztRQUMxRCxPQUFPLElBQXVCLENBQUM7SUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FycmF5VHlwZSwgQXNzZXJ0Tm90TnVsbCwgQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yRXhwciwgQnVpbHRpblR5cGUsIEJ1aWx0aW5UeXBlTmFtZSwgQ2FzdEV4cHIsIENsYXNzU3RtdCwgQ29tbWFFeHByLCBDb21tZW50U3RtdCwgQ29uZGl0aW9uYWxFeHByLCBEZWNsYXJlRnVuY3Rpb25TdG10LCBEZWNsYXJlVmFyU3RtdCwgRXhwcmVzc2lvbiwgRXhwcmVzc2lvblN0YXRlbWVudCwgRXhwcmVzc2lvblR5cGUsIEV4cHJlc3Npb25WaXNpdG9yLCBFeHRlcm5hbEV4cHIsIEZ1bmN0aW9uRXhwciwgSWZTdG10LCBJbnN0YW50aWF0ZUV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgSW52b2tlTWV0aG9kRXhwciwgSlNEb2NDb21tZW50U3RtdCwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIExpdGVyYWxNYXBFeHByLCBNYXBUeXBlLCBOb3RFeHByLCBQYXJzZVNvdXJjZVNwYW4sIFJlYWRLZXlFeHByLCBSZWFkUHJvcEV4cHIsIFJlYWRWYXJFeHByLCBSZXR1cm5TdGF0ZW1lbnQsIFN0YXRlbWVudCwgU3RhdGVtZW50VmlzaXRvciwgU3RtdE1vZGlmaWVyLCBUaHJvd1N0bXQsIFRyeUNhdGNoU3RtdCwgVHlwZSwgVHlwZW9mRXhwciwgVHlwZVZpc2l0b3IsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVLZXlFeHByLCBXcml0ZVByb3BFeHByLCBXcml0ZVZhckV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7TG9jYWxpemVkU3RyaW5nLCBVbmFyeU9wZXJhdG9yLCBVbmFyeU9wZXJhdG9yRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgSW1wb3J0UmV3cml0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIsIE5vb3BJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbmV4cG9ydCBjbGFzcyBDb250ZXh0IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaXNTdGF0ZW1lbnQ6IGJvb2xlYW4pIHt9XG5cbiAgZ2V0IHdpdGhFeHByZXNzaW9uTW9kZSgpOiBDb250ZXh0IHtcbiAgICByZXR1cm4gdGhpcy5pc1N0YXRlbWVudCA/IG5ldyBDb250ZXh0KGZhbHNlKSA6IHRoaXM7XG4gIH1cblxuICBnZXQgd2l0aFN0YXRlbWVudE1vZGUoKTogQ29udGV4dCB7XG4gICAgcmV0dXJuICF0aGlzLmlzU3RhdGVtZW50ID8gbmV3IENvbnRleHQodHJ1ZSkgOiB0aGlzO1xuICB9XG59XG5cbmNvbnN0IFVOQVJZX09QRVJBVE9SUyA9IG5ldyBNYXA8VW5hcnlPcGVyYXRvciwgdHMuUHJlZml4VW5hcnlPcGVyYXRvcj4oW1xuICBbVW5hcnlPcGVyYXRvci5NaW51cywgdHMuU3ludGF4S2luZC5NaW51c1Rva2VuXSxcbiAgW1VuYXJ5T3BlcmF0b3IuUGx1cywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuXSk7XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPEJpbmFyeU9wZXJhdG9yLCB0cy5CaW5hcnlPcGVyYXRvcj4oW1xuICBbQmluYXJ5T3BlcmF0b3IuQW5kLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlciwgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpZ2dlckVxdWFscywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkJpdHdpc2VBbmQsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRGl2aWRlLCB0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuRXF1YWxzLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLklkZW50aWNhbCwgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Mb3dlciwgdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTWludXMsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFtCaW5hcnlPcGVyYXRvci5Nb2R1bG8sIHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuXSxcbiAgW0JpbmFyeU9wZXJhdG9yLk11bHRpcGx5LCB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90RXF1YWxzLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuT3IsIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW5dLFxuICBbQmluYXJ5T3BlcmF0b3IuUGx1cywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuXSk7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYW4gaW1wb3J0IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gYSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBtb2R1bGUgdGhhdCBoYXMgYmVlbiBpbXBvcnRlZC4gKi9cbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIC8qKiBUaGUgYWxpYXMgb2YgdGhlIGltcG9ydGVkIG1vZHVsZS4gKi9cbiAgcXVhbGlmaWVyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIHN5bWJvbCBuYW1lIGFuZCBpbXBvcnQgbmFtZXNwYWNlIG9mIGFuIGltcG9ydGVkIHN5bWJvbCxcbiAqIHdoaWNoIGhhcyBiZWVuIHJlZ2lzdGVyZWQgdGhyb3VnaCB0aGUgSW1wb3J0TWFuYWdlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYW1lZEltcG9ydCB7XG4gIC8qKiBUaGUgaW1wb3J0IG5hbWVzcGFjZSBjb250YWluaW5nIHRoaXMgaW1wb3J0ZWQgc3ltYm9sLiAqL1xuICBtb2R1bGVJbXBvcnQ6IHN0cmluZ3xudWxsO1xuICAvKiogVGhlIChwb3NzaWJseSByZXdyaXR0ZW4pIG5hbWUgb2YgdGhlIGltcG9ydGVkIHN5bWJvbC4gKi9cbiAgc3ltYm9sOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbXBvcnRNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBzcGVjaWZpZXJUb0lkZW50aWZpZXIgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIG5leHRJbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIHJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciA9IG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgcHJpdmF0ZSBwcmVmaXggPSAnaScpIHtcbiAgfVxuXG4gIGdlbmVyYXRlTmFtZWRJbXBvcnQobW9kdWxlTmFtZTogc3RyaW5nLCBvcmlnaW5hbFN5bWJvbDogc3RyaW5nKTogTmFtZWRJbXBvcnQge1xuICAgIC8vIEZpcnN0LCByZXdyaXRlIHRoZSBzeW1ib2wgbmFtZS5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnJld3JpdGVyLnJld3JpdGVTeW1ib2wob3JpZ2luYWxTeW1ib2wsIG1vZHVsZU5hbWUpO1xuXG4gICAgLy8gQXNrIHRoZSByZXdyaXRlciBpZiB0aGlzIHN5bWJvbCBzaG91bGQgYmUgaW1wb3J0ZWQgYXQgYWxsLiBJZiBub3QsIGl0IGNhbiBiZSByZWZlcmVuY2VkXG4gICAgLy8gZGlyZWN0bHkgKG1vZHVsZUltcG9ydDogbnVsbCkuXG4gICAgaWYgKCF0aGlzLnJld3JpdGVyLnNob3VsZEltcG9ydFN5bWJvbChzeW1ib2wsIG1vZHVsZU5hbWUpKSB7XG4gICAgICAvLyBUaGUgc3ltYm9sIHNob3VsZCBiZSByZWZlcmVuY2VkIGRpcmVjdGx5LlxuICAgICAgcmV0dXJuIHttb2R1bGVJbXBvcnQ6IG51bGwsIHN5bWJvbH07XG4gICAgfVxuXG4gICAgLy8gSWYgbm90LCB0aGlzIHN5bWJvbCB3aWxsIGJlIGltcG9ydGVkLiBBbGxvY2F0ZSBhIHByZWZpeCBmb3IgdGhlIGltcG9ydGVkIG1vZHVsZSBpZiBuZWVkZWQuXG5cbiAgICBpZiAoIXRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLmhhcyhtb2R1bGVOYW1lKSkge1xuICAgICAgdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuc2V0KG1vZHVsZU5hbWUsIGAke3RoaXMucHJlZml4fSR7dGhpcy5uZXh0SW5kZXgrK31gKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlSW1wb3J0ID0gdGhpcy5zcGVjaWZpZXJUb0lkZW50aWZpZXIuZ2V0KG1vZHVsZU5hbWUpITtcblxuICAgIHJldHVybiB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9O1xuICB9XG5cbiAgZ2V0QWxsSW1wb3J0cyhjb250ZXh0UGF0aDogc3RyaW5nKTogSW1wb3J0W10ge1xuICAgIGNvbnN0IGltcG9ydHM6IHtzcGVjaWZpZXI6IHN0cmluZywgcXVhbGlmaWVyOiBzdHJpbmd9W10gPSBbXTtcbiAgICB0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllci5mb3JFYWNoKChxdWFsaWZpZXIsIHNwZWNpZmllcikgPT4ge1xuICAgICAgc3BlY2lmaWVyID0gdGhpcy5yZXdyaXRlci5yZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllciwgY29udGV4dFBhdGgpO1xuICAgICAgaW1wb3J0cy5wdXNoKHtzcGVjaWZpZXIsIHF1YWxpZmllcn0pO1xuICAgIH0pO1xuICAgIHJldHVybiBpbXBvcnRzO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVFeHByZXNzaW9uKFxuICAgIGV4cHJlc3Npb246IEV4cHJlc3Npb24sIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPik6IHRzLkV4cHJlc3Npb24ge1xuICByZXR1cm4gZXhwcmVzc2lvbi52aXNpdEV4cHJlc3Npb24oXG4gICAgICBuZXcgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgc2NyaXB0VGFyZ2V0KSxcbiAgICAgIG5ldyBDb250ZXh0KGZhbHNlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGVTdGF0ZW1lbnQoXG4gICAgc3RhdGVtZW50OiBTdGF0ZW1lbnQsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPik6IHRzLlN0YXRlbWVudCB7XG4gIHJldHVybiBzdGF0ZW1lbnQudmlzaXRTdGF0ZW1lbnQoXG4gICAgICBuZXcgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yKGltcG9ydHMsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgc2NyaXB0VGFyZ2V0KSxcbiAgICAgIG5ldyBDb250ZXh0KHRydWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zbGF0ZVR5cGUodHlwZTogVHlwZSwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHRzLlR5cGVOb2RlIHtcbiAgcmV0dXJuIHR5cGUudmlzaXRUeXBlKG5ldyBUeXBlVHJhbnNsYXRvclZpc2l0b3IoaW1wb3J0cyksIG5ldyBDb250ZXh0KGZhbHNlKSk7XG59XG5cbmNsYXNzIEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvciBpbXBsZW1lbnRzIEV4cHJlc3Npb25WaXNpdG9yLCBTdGF0ZW1lbnRWaXNpdG9yIHtcbiAgcHJpdmF0ZSBleHRlcm5hbFNvdXJjZUZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGltcG9ydHM6IEltcG9ydE1hbmFnZXIsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIHNjcmlwdFRhcmdldDogRXhjbHVkZTx0cy5TY3JpcHRUYXJnZXQsIHRzLlNjcmlwdFRhcmdldC5KU09OPikge31cblxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IERlY2xhcmVWYXJTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVmFyaWFibGVTdGF0ZW1lbnQge1xuICAgIGNvbnN0IG5vZGVGbGFncyA9XG4gICAgICAgICgodGhpcy5zY3JpcHRUYXJnZXQgPj0gdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSkgJiYgc3RtdC5oYXNNb2RpZmllcihTdG10TW9kaWZpZXIuRmluYWwpKSA/XG4gICAgICAgIHRzLk5vZGVGbGFncy5Db25zdCA6XG4gICAgICAgIHRzLk5vZGVGbGFncy5Ob25lO1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChcbiAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgICAgICAgICAgIHN0bXQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHN0bXQudmFsdWUgJiYgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKV0sXG4gICAgICAgICAgICBub2RlRmxhZ3MpKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10OiBEZWNsYXJlRnVuY3Rpb25TdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHN0bXQubmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICBzdG10LnBhcmFtcy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUpKSxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVCbG9jayhcbiAgICAgICAgICAgIHN0bXQuc3RhdGVtZW50cy5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSk7XG4gIH1cblxuICB2aXNpdEV4cHJlc3Npb25TdG10KHN0bXQ6IEV4cHJlc3Npb25TdGF0ZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlU3RhdGVtZW50KHN0bXQuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IFJldHVyblN0YXRlbWVudCwgY29udGV4dDogQ29udGV4dCk6IHRzLlJldHVyblN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVJldHVybihzdG10LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KHN0bXQ6IENsYXNzU3RtdCwgY29udGV4dDogQ29udGV4dCkge1xuICAgIGlmICh0aGlzLnNjcmlwdFRhcmdldCA8IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5zdXBwb3J0ZWQgbW9kZTogVmlzaXRpbmcgYSBcImRlY2xhcmUgY2xhc3NcIiBzdGF0ZW1lbnQgKGNsYXNzICR7c3RtdC5uYW1lfSkgd2hpbGUgYCArXG4gICAgICAgICAgYHRhcmdldGluZyAke3RzLlNjcmlwdFRhcmdldFt0aGlzLnNjcmlwdFRhcmdldF19LmApO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdElmU3RtdChzdG10OiBJZlN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5JZlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUlmKFxuICAgICAgICBzdG10LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIHRzLmNyZWF0ZUJsb2NrKFxuICAgICAgICAgICAgc3RtdC50cnVlQ2FzZS5tYXAoY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSxcbiAgICAgICAgc3RtdC5mYWxzZUNhc2UubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICB0cy5jcmVhdGVCbG9jayhzdG10LmZhbHNlQ2FzZS5tYXAoXG4gICAgICAgICAgICAgICAgY2hpbGQgPT4gY2hpbGQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dC53aXRoU3RhdGVtZW50TW9kZSkpKSA6XG4gICAgICAgICAgICB1bmRlZmluZWQpO1xuICB9XG5cbiAgdmlzaXRUcnlDYXRjaFN0bXQoc3RtdDogVHJ5Q2F0Y2hTdG10LCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRUaHJvd1N0bXQoc3RtdDogVGhyb3dTdG10LCBjb250ZXh0OiBDb250ZXh0KTogdHMuVGhyb3dTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVUaHJvdyhzdG10LmVycm9yLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSkpO1xuICB9XG5cbiAgdmlzaXRDb21tZW50U3RtdChzdG10OiBDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudCh0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgIGNvbW1lbnRTdG10LFxuICAgICAgICBzdG10Lm11bHRpbGluZSA/IHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYSxcbiAgICAgICAgc3RtdC5jb21tZW50LCAvKiogaGFzVHJhaWxpbmdOZXdMaW5lICovIGZhbHNlKTtcbiAgICByZXR1cm4gY29tbWVudFN0bXQ7XG4gIH1cblxuICB2aXNpdEpTRG9jQ29tbWVudFN0bXQoc3RtdDogSlNEb2NDb21tZW50U3RtdCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vdEVtaXR0ZWRTdGF0ZW1lbnQge1xuICAgIGNvbnN0IGNvbW1lbnRTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudCh0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gICAgY29uc3QgdGV4dCA9IHN0bXQudG9TdHJpbmcoKTtcbiAgICBjb25zdCBraW5kID0gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhO1xuICAgIHRzLnNldFN5bnRoZXRpY0xlYWRpbmdDb21tZW50cyhjb21tZW50U3RtdCwgW3traW5kLCB0ZXh0LCBwb3M6IC0xLCBlbmQ6IC0xfV0pO1xuICAgIHJldHVybiBjb21tZW50U3RtdDtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBSZWFkVmFyRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKGFzdC5uYW1lISk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShpZGVudGlmaWVyLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGlkZW50aWZpZXI7XG4gIH1cblxuICB2aXNpdFdyaXRlVmFyRXhwcihleHByOiBXcml0ZVZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCByZXN1bHQ6IHRzLkV4cHJlc3Npb24gPSB0cy5jcmVhdGVCaW5hcnkoXG4gICAgICAgIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwci5uYW1lKSwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbixcbiAgICAgICAgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICAgIHJldHVybiBjb250ZXh0LmlzU3RhdGVtZW50ID8gcmVzdWx0IDogdHMuY3JlYXRlUGFyZW4ocmVzdWx0KTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IFdyaXRlS2V5RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHJDb250ZXh0ID0gY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGU7XG4gICAgY29uc3QgbGhzID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhcbiAgICAgICAgZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpLFxuICAgICAgICBleHByLmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBleHByQ29udGV4dCkpO1xuICAgIGNvbnN0IHJocyA9IGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KTtcbiAgICBjb25zdCByZXN1bHQ6IHRzLkV4cHJlc3Npb24gPSB0cy5jcmVhdGVCaW5hcnkobGhzLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCByaHMpO1xuICAgIHJldHVybiBjb250ZXh0LmlzU3RhdGVtZW50ID8gcmVzdWx0IDogdHMuY3JlYXRlUGFyZW4ocmVzdWx0KTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBXcml0ZVByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShcbiAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGV4cHIubmFtZSksXG4gICAgICAgIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihhc3Q6IEludm9rZU1ldGhvZEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgYXN0Lm5hbWUgIT09IG51bGwgPyB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0YXJnZXQsIGFzdC5uYW1lKSA6IHRhcmdldCwgdW5kZWZpbmVkLFxuICAgICAgICBhc3QuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpKTtcbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGNhbGwsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gY2FsbDtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGFzdDogSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQ2FsbEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVDYWxsKFxuICAgICAgICBhc3QuZm4udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICAgIGlmIChhc3QucHVyZSkge1xuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoZXhwciwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnQF9fUFVSRV9fJywgZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGV4cHIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGFzdDogSW5zdGFudGlhdGVFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuTmV3RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU5ldyhcbiAgICAgICAgYXN0LmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIHVuZGVmaW5lZCxcbiAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxFeHByKGFzdDogTGl0ZXJhbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgZXhwcjogdHMuRXhwcmVzc2lvbjtcbiAgICBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGV4cHIgPSB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgZXhwciA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwciA9IHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKTtcbiAgICB9XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdExvY2FsaXplZFN0cmluZyhhc3Q6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGxvY2FsaXplZFN0cmluZyA9IHRoaXMuc2NyaXB0VGFyZ2V0ID49IHRzLlNjcmlwdFRhcmdldC5FUzIwMTUgP1xuICAgICAgICB0aGlzLmNyZWF0ZUxvY2FsaXplZFN0cmluZ1RhZ2dlZFRlbXBsYXRlKGFzdCwgY29udGV4dCkgOlxuICAgICAgICB0aGlzLmNyZWF0ZUxvY2FsaXplZFN0cmluZ0Z1bmN0aW9uQ2FsbChhc3QsIGNvbnRleHQpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UobG9jYWxpemVkU3RyaW5nLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGxvY2FsaXplZFN0cmluZztcbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogRXh0ZXJuYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uXG4gICAgICB8dHMuSWRlbnRpZmllciB7XG4gICAgaWYgKGFzdC52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9ydCB1bmtub3duIG1vZHVsZSBvciBzeW1ib2wgJHthc3QudmFsdWV9YCk7XG4gICAgfVxuICAgIC8vIElmIGEgbW9kdWxlTmFtZSBpcyBzcGVjaWZpZWQsIHRoaXMgaXMgYSBub3JtYWwgaW1wb3J0LiBJZiB0aGVyZSdzIG5vIG1vZHVsZSBuYW1lLCBpdCdzIGFcbiAgICAvLyByZWZlcmVuY2UgdG8gYSBnbG9iYWwvYW1iaWVudCBzeW1ib2wuXG4gICAgaWYgKGFzdC52YWx1ZS5tb2R1bGVOYW1lICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgbm9ybWFsIGltcG9ydC4gRmluZCB0aGUgaW1wb3J0ZWQgbW9kdWxlLlxuICAgICAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9XG4gICAgICAgICAgdGhpcy5pbXBvcnRzLmdlbmVyYXRlTmFtZWRJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUsIGFzdC52YWx1ZS5uYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbXBvcnQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhlIHN5bWJvbCB3YXMgYW1iaWVudCBhZnRlciBhbGwuXG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoXG4gICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZUltcG9ydCksIHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBzeW1ib2wgaXMgYW1iaWVudCwgc28ganVzdCByZWZlcmVuY2UgaXQuXG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcihhc3QudmFsdWUubmFtZSk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoYXN0OiBDb25kaXRpb25hbEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24ge1xuICAgIGxldCBjb25kOiB0cy5FeHByZXNzaW9uID0gYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG5cbiAgICAvLyBPcmRpbmFyaWx5IHRoZSB0ZXJuYXJ5IG9wZXJhdG9yIGlzIHJpZ2h0LWFzc29jaWF0aXZlLiBUaGUgZm9sbG93aW5nIGFyZSBlcXVpdmFsZW50OlxuICAgIC8vICAgYGEgPyBiIDogYyA/IGQgOiBlYCA9PiBgYSA/IGIgOiAoYyA/IGQgOiBlKWBcbiAgICAvL1xuICAgIC8vIEhvd2V2ZXIsIG9jY2FzaW9uYWxseSBBbmd1bGFyIG5lZWRzIHRvIHByb2R1Y2UgYSBsZWZ0LWFzc29jaWF0aXZlIGNvbmRpdGlvbmFsLCBzdWNoIGFzIGluXG4gICAgLy8gdGhlIGNhc2Ugb2YgYSBudWxsLXNhZmUgbmF2aWdhdGlvbiBwcm9kdWN0aW9uOiBge3thPy5iID8gYyA6IGR9fWAuIFRoaXMgdGVtcGxhdGUgcHJvZHVjZXNcbiAgICAvLyBhIHRlcm5hcnkgb2YgdGhlIGZvcm06XG4gICAgLy8gICBgYSA9PSBudWxsID8gbnVsbCA6IHJlc3Qgb2YgZXhwcmVzc2lvbmBcbiAgICAvLyBJZiB0aGUgcmVzdCBvZiB0aGUgZXhwcmVzc2lvbiBpcyBhbHNvIGEgdGVybmFyeSB0aG91Z2gsIHRoaXMgd291bGQgcHJvZHVjZSB0aGUgZm9ybTpcbiAgICAvLyAgIGBhID09IG51bGwgPyBudWxsIDogYS5iID8gYyA6IGRgXG4gICAgLy8gd2hpY2gsIGlmIGxlZnQgYXMgcmlnaHQtYXNzb2NpYXRpdmUsIHdvdWxkIGJlIGluY29ycmVjdGx5IGFzc29jaWF0ZWQgYXM6XG4gICAgLy8gICBgYSA9PSBudWxsID8gbnVsbCA6IChhLmIgPyBjIDogZClgXG4gICAgLy9cbiAgICAvLyBJbiBzdWNoIGNhc2VzLCB0aGUgbGVmdC1hc3NvY2lhdGl2aXR5IG5lZWRzIHRvIGJlIGVuZm9yY2VkIHdpdGggcGFyZW50aGVzZXM6XG4gICAgLy8gICBgKGEgPT0gbnVsbCA/IG51bGwgOiBhLmIpID8gYyA6IGRgXG4gICAgLy9cbiAgICAvLyBTdWNoIHBhcmVudGhlc2VzIGNvdWxkIGFsd2F5cyBiZSBpbmNsdWRlZCBpbiB0aGUgY29uZGl0aW9uIChndWFyYW50ZWVpbmcgY29ycmVjdCBiZWhhdmlvcikgaW5cbiAgICAvLyBhbGwgY2FzZXMsIGJ1dCB0aGlzIGhhcyBhIGNvZGUgc2l6ZSBjb3N0LiBJbnN0ZWFkLCBwYXJlbnRoZXNlcyBhcmUgYWRkZWQgb25seSB3aGVuIGFcbiAgICAvLyBjb25kaXRpb25hbCBleHByZXNzaW9uIGlzIGRpcmVjdGx5IHVzZWQgYXMgdGhlIGNvbmRpdGlvbiBvZiBhbm90aGVyLlxuICAgIC8vXG4gICAgLy8gVE9ETyhhbHhodWIpOiBpbnZlc3RpZ2F0ZSBiZXR0ZXIgbG9naWMgZm9yIHByZWNlbmRlbmNlIG9mIGNvbmRpdGlvbmFsIG9wZXJhdG9yc1xuICAgIGlmIChhc3QuY29uZGl0aW9uIGluc3RhbmNlb2YgQ29uZGl0aW9uYWxFeHByKSB7XG4gICAgICAvLyBUaGUgY29uZGl0aW9uIG9mIHRoaXMgdGVybmFyeSBuZWVkcyB0byBiZSB3cmFwcGVkIGluIHBhcmVudGhlc2VzIHRvIG1haW50YWluXG4gICAgICAvLyBsZWZ0LWFzc29jaWF0aXZpdHkuXG4gICAgICBjb25kID0gdHMuY3JlYXRlUGFyZW4oY29uZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZUNvbmRpdGlvbmFsKFxuICAgICAgICBjb25kLCBhc3QudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICBhc3QuZmFsc2VDYXNlIS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogTm90RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVByZWZpeChcbiAgICAgICAgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGFzdDogQXNzZXJ0Tm90TnVsbCwgY29udGV4dDogQ29udGV4dCk6IHRzLk5vbk51bGxFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGFzdDogQ2FzdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGFzdDogRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRnVuY3Rpb25FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKFxuICAgICAgICB1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXN0Lm5hbWUgfHwgdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIGFzdC5wYXJhbXMubWFwKFxuICAgICAgICAgICAgcGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtLm5hbWUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKSxcbiAgICAgICAgdW5kZWZpbmVkLCB0cy5jcmVhdGVCbG9jayhhc3Quc3RhdGVtZW50cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQpKSkpO1xuICB9XG5cbiAgdmlzaXRVbmFyeU9wZXJhdG9yRXhwcihhc3Q6IFVuYXJ5T3BlcmF0b3JFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKCFVTkFSWV9PUEVSQVRPUlMuaGFzKGFzdC5vcGVyYXRvcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB1bmFyeSBvcGVyYXRvcjogJHtVbmFyeU9wZXJhdG9yW2FzdC5vcGVyYXRvcl19YCk7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVQcmVmaXgoXG4gICAgICAgIFVOQVJZX09QRVJBVE9SUy5nZXQoYXN0Lm9wZXJhdG9yKSEsIGFzdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihhc3Q6IEJpbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICghQklOQVJZX09QRVJBVE9SUy5oYXMoYXN0Lm9wZXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGJpbmFyeSBvcGVyYXRvcjogJHtCaW5hcnlPcGVyYXRvclthc3Qub3BlcmF0b3JdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KFxuICAgICAgICBhc3QubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgQklOQVJZX09QRVJBVE9SUy5nZXQoYXN0Lm9wZXJhdG9yKSEsXG4gICAgICAgIGFzdC5yaHMudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGFzdDogUmVhZFByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MoYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0Lm5hbWUpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihhc3Q6IFJlYWRLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBhc3QuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IExpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByID1cbiAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGFzdC5lbnRyaWVzLm1hcChleHByID0+IGV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGFzdDogTGl0ZXJhbE1hcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZW50cmllcyA9IGFzdC5lbnRyaWVzLm1hcChcbiAgICAgICAgZW50cnkgPT4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgZW50cnkucXVvdGVkID8gdHMuY3JlYXRlTGl0ZXJhbChlbnRyeS5rZXkpIDogdHMuY3JlYXRlSWRlbnRpZmllcihlbnRyeS5rZXkpLFxuICAgICAgICAgICAgZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSk7XG4gICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoZW50cmllcyk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IENvbW1hRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IFdyYXBwZWROb2RlRXhwcjxhbnk+LCBjb250ZXh0OiBDb250ZXh0KTogYW55IHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGFzdC5ub2RlKSkge1xuICAgICAgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIucmVjb3JkVXNlZElkZW50aWZpZXIoYXN0Lm5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gYXN0Lm5vZGU7XG4gIH1cblxuICB2aXNpdFR5cGVvZkV4cHIoYXN0OiBUeXBlb2ZFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU9mRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVPZihhc3QuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zbGF0ZSB0aGUgYExvY2FsaXplZFN0cmluZ2Agbm9kZSBpbnRvIGEgYFRhZ2dlZFRlbXBsYXRlRXhwcmVzc2lvbmAgZm9yIEVTMjAxNSBmb3JtYXR0ZWRcbiAgICogb3V0cHV0LlxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVMb2NhbGl6ZWRTdHJpbmdUYWdnZWRUZW1wbGF0ZShhc3Q6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogQ29udGV4dCk6XG4gICAgICB0cy5UYWdnZWRUZW1wbGF0ZUV4cHJlc3Npb24ge1xuICAgIGxldCB0ZW1wbGF0ZTogdHMuVGVtcGxhdGVMaXRlcmFsO1xuICAgIGNvbnN0IGxlbmd0aCA9IGFzdC5tZXNzYWdlUGFydHMubGVuZ3RoO1xuICAgIGNvbnN0IG1ldGFCbG9jayA9IGFzdC5zZXJpYWxpemVJMThuSGVhZCgpO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAgIHRlbXBsYXRlID0gdHMuY3JlYXRlTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwobWV0YUJsb2NrLmNvb2tlZCwgbWV0YUJsb2NrLnJhdyk7XG4gICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRlbXBsYXRlLCBhc3QuZ2V0TWVzc2FnZVBhcnRTb3VyY2VTcGFuKDApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIHRoZSBoZWFkIHBhcnRcbiAgICAgIGNvbnN0IGhlYWQgPSB0cy5jcmVhdGVUZW1wbGF0ZUhlYWQobWV0YUJsb2NrLmNvb2tlZCwgbWV0YUJsb2NrLnJhdyk7XG4gICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGhlYWQsIGFzdC5nZXRNZXNzYWdlUGFydFNvdXJjZVNwYW4oMCkpO1xuICAgICAgY29uc3Qgc3BhbnM6IHRzLlRlbXBsYXRlU3BhbltdID0gW107XG4gICAgICAvLyBDcmVhdGUgdGhlIG1pZGRsZSBwYXJ0c1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRFeHByZXNzaW9uID0gYXN0LmV4cHJlc3Npb25zW2kgLSAxXS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gICAgICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UocmVzb2x2ZWRFeHByZXNzaW9uLCBhc3QuZ2V0UGxhY2Vob2xkZXJTb3VyY2VTcGFuKGkgLSAxKSk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlUGFydCA9IGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGkpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZU1pZGRsZSA9IGNyZWF0ZVRlbXBsYXRlTWlkZGxlKHRlbXBsYXRlUGFydC5jb29rZWQsIHRlbXBsYXRlUGFydC5yYXcpO1xuICAgICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRlbXBsYXRlTWlkZGxlLCBhc3QuZ2V0TWVzc2FnZVBhcnRTb3VyY2VTcGFuKGkpKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTcGFuID0gdHMuY3JlYXRlVGVtcGxhdGVTcGFuKHJlc29sdmVkRXhwcmVzc2lvbiwgdGVtcGxhdGVNaWRkbGUpO1xuICAgICAgICBzcGFucy5wdXNoKHRlbXBsYXRlU3Bhbik7XG4gICAgICB9XG4gICAgICAvLyBDcmVhdGUgdGhlIHRhaWwgcGFydFxuICAgICAgY29uc3QgcmVzb2x2ZWRFeHByZXNzaW9uID0gYXN0LmV4cHJlc3Npb25zW2xlbmd0aCAtIDJdLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UocmVzb2x2ZWRFeHByZXNzaW9uLCBhc3QuZ2V0UGxhY2Vob2xkZXJTb3VyY2VTcGFuKGxlbmd0aCAtIDIpKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUGFydCA9IGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGxlbmd0aCAtIDEpO1xuICAgICAgY29uc3QgdGVtcGxhdGVUYWlsID0gY3JlYXRlVGVtcGxhdGVUYWlsKHRlbXBsYXRlUGFydC5jb29rZWQsIHRlbXBsYXRlUGFydC5yYXcpO1xuICAgICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZSh0ZW1wbGF0ZVRhaWwsIGFzdC5nZXRNZXNzYWdlUGFydFNvdXJjZVNwYW4obGVuZ3RoIC0gMSkpO1xuICAgICAgc3BhbnMucHVzaCh0cy5jcmVhdGVUZW1wbGF0ZVNwYW4ocmVzb2x2ZWRFeHByZXNzaW9uLCB0ZW1wbGF0ZVRhaWwpKTtcbiAgICAgIC8vIFB1dCBpdCBhbGwgdG9nZXRoZXJcbiAgICAgIHRlbXBsYXRlID0gdHMuY3JlYXRlVGVtcGxhdGVFeHByZXNzaW9uKGhlYWQsIHNwYW5zKTtcbiAgICB9XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHRzLmNyZWF0ZVRhZ2dlZFRlbXBsYXRlKHRzLmNyZWF0ZUlkZW50aWZpZXIoJyRsb2NhbGl6ZScpLCB0ZW1wbGF0ZSk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByZXNzaW9uLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIGV4cHJlc3Npb247XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNsYXRlIHRoZSBgTG9jYWxpemVkU3RyaW5nYCBub2RlIGludG8gYSBgJGxvY2FsaXplYCBjYWxsIHVzaW5nIHRoZSBpbXBvcnRlZFxuICAgKiBgX19tYWtlVGVtcGxhdGVPYmplY3RgIGhlbHBlciBmb3IgRVM1IGZvcm1hdHRlZCBvdXRwdXQuXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZUxvY2FsaXplZFN0cmluZ0Z1bmN0aW9uQ2FsbChhc3Q6IExvY2FsaXplZFN0cmluZywgY29udGV4dDogQ29udGV4dCkge1xuICAgIC8vIEEgYCRsb2NhbGl6ZWAgbWVzc2FnZSBjb25zaXN0cyBgbWVzc2FnZVBhcnRzYCBhbmQgYGV4cHJlc3Npb25zYCwgd2hpY2ggZ2V0IGludGVybGVhdmVkXG4gICAgLy8gdG9nZXRoZXIuIFRoZSBpbnRlcmxlYXZlZCBwaWVjZXMgbG9vayBsaWtlOlxuICAgIC8vIGBbbWVzc2FnZVBhcnQwLCBleHByZXNzaW9uMCwgbWVzc2FnZVBhcnQxLCBleHByZXNzaW9uMSwgbWVzc2FnZVBhcnQyXWBcbiAgICAvL1xuICAgIC8vIE5vdGUgdGhhdCB0aGVyZSBpcyBhbHdheXMgYSBtZXNzYWdlIHBhcnQgYXQgdGhlIHN0YXJ0IGFuZCBlbmQsIGFuZCBzbyB0aGVyZWZvcmVcbiAgICAvLyBgbWVzc2FnZVBhcnRzLmxlbmd0aCA9PT0gZXhwcmVzc2lvbnMubGVuZ3RoICsgMWAuXG4gICAgLy9cbiAgICAvLyBFYWNoIG1lc3NhZ2UgcGFydCBtYXkgYmUgcHJlZml4ZWQgd2l0aCBcIm1ldGFkYXRhXCIsIHdoaWNoIGlzIHdyYXBwZWQgaW4gY29sb25zICg6KSBkZWxpbWl0ZXJzLlxuICAgIC8vIFRoZSBtZXRhZGF0YSBpcyBhdHRhY2hlZCB0byB0aGUgZmlyc3QgYW5kIHN1YnNlcXVlbnQgbWVzc2FnZSBwYXJ0cyBieSBjYWxscyB0b1xuICAgIC8vIGBzZXJpYWxpemVJMThuSGVhZCgpYCBhbmQgYHNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQoKWAgcmVzcGVjdGl2ZWx5LlxuXG4gICAgLy8gVGhlIGZpcnN0IG1lc3NhZ2UgcGFydCAoaS5lLiBgYXN0Lm1lc3NhZ2VQYXJ0c1swXWApIGlzIHVzZWQgdG8gaW5pdGlhbGl6ZSBgbWVzc2FnZVBhcnRzYFxuICAgIC8vIGFycmF5LlxuICAgIGNvbnN0IG1lc3NhZ2VQYXJ0cyA9IFthc3Quc2VyaWFsaXplSTE4bkhlYWQoKV07XG4gICAgY29uc3QgZXhwcmVzc2lvbnM6IGFueVtdID0gW107XG5cbiAgICAvLyBUaGUgcmVzdCBvZiB0aGUgYGFzdC5tZXNzYWdlUGFydHNgIGFuZCBlYWNoIG9mIHRoZSBleHByZXNzaW9ucyBhcmUgYGFzdC5leHByZXNzaW9uc2AgcHVzaGVkXG4gICAgLy8gaW50byB0aGUgYXJyYXlzLiBOb3RlIHRoYXQgYGFzdC5tZXNzYWdlUGFydFtpXWAgY29ycmVzcG9uZHMgdG8gYGV4cHJlc3Npb25zW2ktMV1gXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBhc3QubWVzc2FnZVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBleHByZXNzaW9ucy5wdXNoKGFzdC5leHByZXNzaW9uc1tpIC0gMV0udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgICAgIG1lc3NhZ2VQYXJ0cy5wdXNoKGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGkpKTtcbiAgICB9XG5cbiAgICAvLyBUaGUgcmVzdWx0aW5nIGRvd25sZXZlbGxlZCB0YWdnZWQgdGVtcGxhdGUgc3RyaW5nIHVzZXMgYSBjYWxsIHRvIHRoZSBgX19tYWtlVGVtcGxhdGVPYmplY3QoKWBcbiAgICAvLyBoZWxwZXIsIHNvIHdlIG11c3QgZW5zdXJlIGl0IGhhcyBiZWVuIGltcG9ydGVkLlxuICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydCgndHNsaWInLCAnX19tYWtlVGVtcGxhdGVPYmplY3QnKTtcbiAgICBjb25zdCBfX21ha2VUZW1wbGF0ZU9iamVjdEhlbHBlciA9IChtb2R1bGVJbXBvcnQgPT09IG51bGwpID9cbiAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpIDpcbiAgICAgICAgdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModHMuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVJbXBvcnQpLCB0cy5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCkpO1xuXG4gICAgLy8gR2VuZXJhdGUgdGhlIGNhbGwgaW4gdGhlIGZvcm06XG4gICAgLy8gYCRsb2NhbGl6ZShfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWRNZXNzYWdlUGFydHMsIHJhd01lc3NhZ2VQYXJ0cyksIC4uLmV4cHJlc3Npb25zKTtgXG4gICAgY29uc3QgY29va2VkTGl0ZXJhbHMgPSBtZXNzYWdlUGFydHMubWFwKFxuICAgICAgICAobWVzc2FnZVBhcnQsIGkpID0+XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUxpdGVyYWwobWVzc2FnZVBhcnQuY29va2VkLCBhc3QuZ2V0TWVzc2FnZVBhcnRTb3VyY2VTcGFuKGkpKSk7XG4gICAgY29uc3QgcmF3TGl0ZXJhbHMgPSBtZXNzYWdlUGFydHMubWFwKFxuICAgICAgICAobWVzc2FnZVBhcnQsIGkpID0+IHRoaXMuY3JlYXRlTGl0ZXJhbChtZXNzYWdlUGFydC5yYXcsIGFzdC5nZXRNZXNzYWdlUGFydFNvdXJjZVNwYW4oaSkpKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlQ2FsbChcbiAgICAgICAgLyogZXhwcmVzc2lvbiAqLyB0cy5jcmVhdGVJZGVudGlmaWVyKCckbG9jYWxpemUnKSxcbiAgICAgICAgLyogdHlwZUFyZ3VtZW50cyAqLyB1bmRlZmluZWQsXG4gICAgICAgIC8qIGFyZ3VtZW50c0FycmF5ICovW1xuICAgICAgICAgIHRzLmNyZWF0ZUNhbGwoXG4gICAgICAgICAgICAgIC8qIGV4cHJlc3Npb24gKi8gX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIsXG4gICAgICAgICAgICAgIC8qIHR5cGVBcmd1bWVudHMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAvKiBhcmd1bWVudHNBcnJheSAqL1xuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKGNvb2tlZExpdGVyYWxzKSxcbiAgICAgICAgICAgICAgICB0cy5jcmVhdGVBcnJheUxpdGVyYWwocmF3TGl0ZXJhbHMpLFxuICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAuLi5leHByZXNzaW9ucyxcbiAgICAgICAgXSk7XG4gIH1cblxuXG4gIHByaXZhdGUgc2V0U291cmNlTWFwUmFuZ2UoZXhwcjogdHMuTm9kZSwgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFufG51bGwpIHtcbiAgICBpZiAoc291cmNlU3Bhbikge1xuICAgICAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gc291cmNlU3BhbjtcbiAgICAgIGNvbnN0IHt1cmwsIGNvbnRlbnR9ID0gc3RhcnQuZmlsZTtcbiAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgaWYgKCF0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuaGFzKHVybCkpIHtcbiAgICAgICAgICB0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuc2V0KHVybCwgdHMuY3JlYXRlU291cmNlTWFwU291cmNlKHVybCwgY29udGVudCwgcG9zID0+IHBvcykpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5nZXQodXJsKTtcbiAgICAgICAgdHMuc2V0U291cmNlTWFwUmFuZ2UoZXhwciwge3Bvczogc3RhcnQub2Zmc2V0LCBlbmQ6IGVuZC5vZmZzZXQsIHNvdXJjZX0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTGl0ZXJhbCh0ZXh0OiBzdHJpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbnxudWxsKSB7XG4gICAgY29uc3QgbGl0ZXJhbCA9IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwodGV4dCk7XG4gICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShsaXRlcmFsLCBzcGFuKTtcbiAgICByZXR1cm4gbGl0ZXJhbDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVHlwZVRyYW5zbGF0b3JWaXNpdG9yIGltcGxlbWVudHMgRXhwcmVzc2lvblZpc2l0b3IsIFR5cGVWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKSB7fVxuXG4gIHZpc2l0QnVpbHRpblR5cGUodHlwZTogQnVpbHRpblR5cGUsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5LZXl3b3JkVHlwZU5vZGUge1xuICAgIHN3aXRjaCAodHlwZS5uYW1lKSB7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5Cb29sOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQm9vbGVhbktleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuRHluYW1pYzpcbiAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpO1xuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuSW50OlxuICAgICAgY2FzZSBCdWlsdGluVHlwZU5hbWUuTnVtYmVyOlxuICAgICAgICByZXR1cm4gdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuTnVtYmVyS2V5d29yZCk7XG4gICAgICBjYXNlIEJ1aWx0aW5UeXBlTmFtZS5TdHJpbmc6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5TdHJpbmdLZXl3b3JkKTtcbiAgICAgIGNhc2UgQnVpbHRpblR5cGVOYW1lLk5vbmU6XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OZXZlcktleXdvcmQpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBidWlsdGluIHR5cGU6ICR7QnVpbHRpblR5cGVOYW1lW3R5cGUubmFtZV19YCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRFeHByZXNzaW9uVHlwZSh0eXBlOiBFeHByZXNzaW9uVHlwZSwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHRoaXMudHJhbnNsYXRlRXhwcmVzc2lvbih0eXBlLnZhbHVlLCBjb250ZXh0KTtcbiAgICBpZiAodHlwZS50eXBlUGFyYW1zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHlwZU5vZGU7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdBbiBFeHByZXNzaW9uVHlwZSB3aXRoIHR5cGUgYXJndW1lbnRzIG11c3QgdHJhbnNsYXRlIGludG8gYSBUeXBlUmVmZXJlbmNlTm9kZScpO1xuICAgIH0gZWxzZSBpZiAodHlwZU5vZGUudHlwZUFyZ3VtZW50cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEFuIEV4cHJlc3Npb25UeXBlIHdpdGggdHlwZSBhcmd1bWVudHMgY2Fubm90IGhhdmUgbXVsdGlwbGUgbGV2ZWxzIG9mIHR5cGUgYXJndW1lbnRzYCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZUFyZ3MgPSB0eXBlLnR5cGVQYXJhbXMubWFwKHBhcmFtID0+IHRoaXMudHJhbnNsYXRlVHlwZShwYXJhbSwgY29udGV4dCkpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZS50eXBlTmFtZSwgdHlwZUFyZ3MpO1xuICB9XG5cbiAgdmlzaXRBcnJheVR5cGUodHlwZTogQXJyYXlUeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuQXJyYXlUeXBlTm9kZSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUFycmF5VHlwZU5vZGUodGhpcy50cmFuc2xhdGVUeXBlKHR5cGUub2YsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0TWFwVHlwZSh0eXBlOiBNYXBUeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZUxpdGVyYWxOb2RlIHtcbiAgICBjb25zdCBwYXJhbWV0ZXIgPSB0cy5jcmVhdGVQYXJhbWV0ZXIoXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsICdrZXknLCB1bmRlZmluZWQsXG4gICAgICAgIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlN0cmluZ0tleXdvcmQpKTtcbiAgICBjb25zdCB0eXBlQXJncyA9IHR5cGUudmFsdWVUeXBlICE9PSBudWxsID9cbiAgICAgICAgdGhpcy50cmFuc2xhdGVUeXBlKHR5cGUudmFsdWVUeXBlLCBjb250ZXh0KSA6XG4gICAgICAgIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLlVua25vd25LZXl3b3JkKTtcbiAgICBjb25zdCBpbmRleFNpZ25hdHVyZSA9IHRzLmNyZWF0ZUluZGV4U2lnbmF0dXJlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBbcGFyYW1ldGVyXSwgdHlwZUFyZ3MpO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoW2luZGV4U2lnbmF0dXJlXSk7XG4gIH1cblxuICB2aXNpdFJlYWRWYXJFeHByKGFzdDogUmVhZFZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlUXVlcnlOb2RlIHtcbiAgICBpZiAoYXN0Lm5hbWUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUmVhZFZhckV4cHIgd2l0aCBubyB2YXJpYWJsZSBuYW1lIGluIHR5cGVgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVRdWVyeU5vZGUodHMuY3JlYXRlSWRlbnRpZmllcihhc3QubmFtZSkpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVZhckV4cHIoZXhwcjogV3JpdGVWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IFdyaXRlS2V5RXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyaXRlUHJvcEV4cHIoZXhwcjogV3JpdGVQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEludm9rZU1ldGhvZEV4cHIoYXN0OiBJbnZva2VNZXRob2RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlRnVuY3Rpb25FeHByKGFzdDogSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SW5zdGFudGlhdGVFeHByKGFzdDogSW5zdGFudGlhdGVFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEV4cHIoYXN0OiBMaXRlcmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVOb2RlIHtcbiAgICBpZiAoYXN0LnZhbHVlID09PSBudWxsKSB7XG4gICAgICAvLyBUT0RPKGFsYW4tYWdpdXM0KTogUmVtb3ZlIHdoZW4gd2Ugbm8gbG9uZ2VyIHN1cHBvcnQgVFMgMy45XG4gICAgICAvLyBVc2U6IHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTnVsbCgpKSBkaXJlY3RseS5cbiAgICAgIHJldHVybiB0cy52ZXJzaW9uTWFqb3JNaW5vci5jaGFyQXQoMCkgPT09ICc0JyA/XG4gICAgICAgICAgdHMuY3JlYXRlTGl0ZXJhbFR5cGVOb2RlKHRzLmNyZWF0ZU51bGwoKSBhcyBhbnkpIDpcbiAgICAgICAgICB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCBhcyBhbnkpO1xuICAgIH0gZWxzZSBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5VbmRlZmluZWRLZXl3b3JkKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhc3QudmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFzdC52YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUodHMuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWxUeXBlTm9kZSh0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSkpO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGFzdDogTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0RXh0ZXJuYWxFeHByKGFzdDogRXh0ZXJuYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogdHMuRW50aXR5TmFtZXx0cy5UeXBlUmVmZXJlbmNlTm9kZSB7XG4gICAgaWYgKGFzdC52YWx1ZS5tb2R1bGVOYW1lID09PSBudWxsIHx8IGFzdC52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9ydCB1bmtub3duIG1vZHVsZSBvciBzeW1ib2xgKTtcbiAgICB9XG4gICAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9XG4gICAgICAgIHRoaXMuaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KGFzdC52YWx1ZS5tb2R1bGVOYW1lLCBhc3QudmFsdWUubmFtZSk7XG4gICAgY29uc3Qgc3ltYm9sSWRlbnRpZmllciA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKTtcblxuICAgIGNvbnN0IHR5cGVOYW1lID0gbW9kdWxlSW1wb3J0ID9cbiAgICAgICAgdHMuY3JlYXRlUXVhbGlmaWVkTmFtZSh0cy5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZUltcG9ydCksIHN5bWJvbElkZW50aWZpZXIpIDpcbiAgICAgICAgc3ltYm9sSWRlbnRpZmllcjtcblxuICAgIGNvbnN0IHR5cGVBcmd1bWVudHMgPSBhc3QudHlwZVBhcmFtcyAhPT0gbnVsbCA/XG4gICAgICAgIGFzdC50eXBlUGFyYW1zLm1hcCh0eXBlID0+IHRoaXMudHJhbnNsYXRlVHlwZSh0eXBlLCBjb250ZXh0KSkgOlxuICAgICAgICB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVSZWZlcmVuY2VOb2RlKHR5cGVOYW1lLCB0eXBlQXJndW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWxFeHByKGFzdDogQ29uZGl0aW9uYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogTm90RXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0QXNzZXJ0Tm90TnVsbEV4cHIoYXN0OiBBc3NlcnROb3ROdWxsLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRDYXN0RXhwcihhc3Q6IENhc3RFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRGdW5jdGlvbkV4cHIoYXN0OiBGdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFVuYXJ5T3BlcmF0b3JFeHByKGFzdDogVW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihhc3Q6IEJpbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFByb3BFeHByKGFzdDogUmVhZFByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihhc3Q6IFJlYWRLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsQXJyYXlFeHByKGFzdDogTGl0ZXJhbEFycmF5RXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR1cGxlVHlwZU5vZGUge1xuICAgIGNvbnN0IHZhbHVlcyA9IGFzdC5lbnRyaWVzLm1hcChleHByID0+IHRoaXMudHJhbnNsYXRlRXhwcmVzc2lvbihleHByLCBjb250ZXh0KSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR1cGxlVHlwZU5vZGUodmFsdWVzKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcEV4cHIoYXN0OiBMaXRlcmFsTWFwRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVMaXRlcmFsTm9kZSB7XG4gICAgY29uc3QgZW50cmllcyA9IGFzdC5lbnRyaWVzLm1hcChlbnRyeSA9PiB7XG4gICAgICBjb25zdCB7a2V5LCBxdW90ZWR9ID0gZW50cnk7XG4gICAgICBjb25zdCB0eXBlID0gdGhpcy50cmFuc2xhdGVFeHByZXNzaW9uKGVudHJ5LnZhbHVlLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eVNpZ25hdHVyZShcbiAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG5hbWUgKi8gcXVvdGVkID8gdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChrZXkpIDoga2V5LFxuICAgICAgICAgIC8qIHF1ZXN0aW9uVG9rZW4gKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIHR5cGUgKi8gdHlwZSxcbiAgICAgICAgICAvKiBpbml0aWFsaXplciAqLyB1bmRlZmluZWQpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cy5jcmVhdGVUeXBlTGl0ZXJhbE5vZGUoZW50cmllcyk7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IENvbW1hRXhwciwgY29udGV4dDogQ29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JhcHBlZE5vZGVFeHByKGFzdDogV3JhcHBlZE5vZGVFeHByPGFueT4sIGNvbnRleHQ6IENvbnRleHQpOiB0cy5UeXBlTm9kZSB7XG4gICAgY29uc3Qgbm9kZTogdHMuTm9kZSA9IGFzdC5ub2RlO1xuICAgIGlmICh0cy5pc0VudGl0eU5hbWUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVUeXBlUmVmZXJlbmNlTm9kZShub2RlLCAvKiB0eXBlQXJndW1lbnRzICovIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1R5cGVOb2RlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsVHlwZU5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5zdXBwb3J0ZWQgV3JhcHBlZE5vZGVFeHByIGluIFR5cGVUcmFuc2xhdG9yVmlzaXRvcjogJHt0cy5TeW50YXhLaW5kW25vZGUua2luZF19YCk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGFzdDogVHlwZW9mRXhwciwgY29udGV4dDogQ29udGV4dCk6IHRzLlR5cGVRdWVyeU5vZGUge1xuICAgIGxldCBleHByID0gdHJhbnNsYXRlRXhwcmVzc2lvbihcbiAgICAgICAgYXN0LmV4cHIsIHRoaXMuaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUiwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVR5cGVRdWVyeU5vZGUoZXhwciBhcyB0cy5JZGVudGlmaWVyKTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNsYXRlVHlwZSh0eXBlOiBUeXBlLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IHR5cGVOb2RlID0gdHlwZS52aXNpdFR5cGUodGhpcywgY29udGV4dCk7XG4gICAgaWYgKCF0cy5pc1R5cGVOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBIFR5cGUgbXVzdCB0cmFuc2xhdGUgdG8gYSBUeXBlTm9kZSwgYnV0IHdhcyAke3RzLlN5bnRheEtpbmRbdHlwZU5vZGUua2luZF19YCk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlTm9kZTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhbnNsYXRlRXhwcmVzc2lvbihleHByOiBFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogdHMuVHlwZU5vZGUge1xuICAgIGNvbnN0IHR5cGVOb2RlID0gZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gICAgaWYgKCF0cy5pc1R5cGVOb2RlKHR5cGVOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBbiBFeHByZXNzaW9uIG11c3QgdHJhbnNsYXRlIHRvIGEgVHlwZU5vZGUsIGJ1dCB3YXMgJHt0cy5TeW50YXhLaW5kW3R5cGVOb2RlLmtpbmRdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU5vZGU7XG4gIH1cbn1cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlTWlkZGxlKClgLlxuLy8gUmV2ZXJ0IG9uY2UgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zNTM3NCBpcyBmaXhlZFxuZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVNaWRkbGUoY29va2VkOiBzdHJpbmcsIHJhdzogc3RyaW5nKTogdHMuVGVtcGxhdGVNaWRkbGUge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlTWlkZGxlO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZU1pZGRsZTtcbn1cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlVGFpbCgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWRcbmZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlVGFpbChjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiB0cy5UZW1wbGF0ZVRhaWwge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlVGFpbDtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVUYWlsO1xufSJdfQ==