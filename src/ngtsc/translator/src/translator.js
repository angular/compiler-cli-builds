(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/translator/src/translator", ["require", "exports", "tslib", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExpressionTranslatorVisitor = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var o = require("@angular/compiler");
    var UNARY_OPERATORS = new Map([
        [o.UnaryOperator.Minus, '-'],
        [o.UnaryOperator.Plus, '+'],
    ]);
    var BINARY_OPERATORS = new Map([
        [o.BinaryOperator.And, '&&'],
        [o.BinaryOperator.Bigger, '>'],
        [o.BinaryOperator.BiggerEquals, '>='],
        [o.BinaryOperator.BitwiseAnd, '&'],
        [o.BinaryOperator.Divide, '/'],
        [o.BinaryOperator.Equals, '=='],
        [o.BinaryOperator.Identical, '==='],
        [o.BinaryOperator.Lower, '<'],
        [o.BinaryOperator.LowerEquals, '<='],
        [o.BinaryOperator.Minus, '-'],
        [o.BinaryOperator.Modulo, '%'],
        [o.BinaryOperator.Multiply, '*'],
        [o.BinaryOperator.NotEquals, '!='],
        [o.BinaryOperator.NotIdentical, '!=='],
        [o.BinaryOperator.Or, '||'],
        [o.BinaryOperator.Plus, '+'],
    ]);
    var ExpressionTranslatorVisitor = /** @class */ (function () {
        function ExpressionTranslatorVisitor(factory, imports, options) {
            this.factory = factory;
            this.imports = imports;
            this.downlevelLocalizedStrings = options.downlevelLocalizedStrings === true;
            this.downlevelVariableDeclarations = options.downlevelVariableDeclarations === true;
            this.recordWrappedNodeExpr = options.recordWrappedNodeExpr || (function () { });
        }
        ExpressionTranslatorVisitor.prototype.visitDeclareVarStmt = function (stmt, context) {
            var _a;
            var varType = this.downlevelVariableDeclarations ?
                'var' :
                stmt.hasModifier(o.StmtModifier.Final) ? 'const' : 'let';
            return this.factory.attachComments(this.factory.createVariableDeclaration(stmt.name, (_a = stmt.value) === null || _a === void 0 ? void 0 : _a.visitExpression(this, context.withExpressionMode), varType), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareFunctionStmt = function (stmt, context) {
            return this.factory.attachComments(this.factory.createFunctionDeclaration(stmt.name, stmt.params.map(function (param) { return param.name; }), this.factory.createBlock(this.visitStatements(stmt.statements, context.withStatementMode))), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitExpressionStmt = function (stmt, context) {
            return this.factory.attachComments(this.factory.createExpressionStatement(stmt.expr.visitExpression(this, context.withStatementMode)), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitReturnStmt = function (stmt, context) {
            return this.factory.attachComments(this.factory.createReturnStatement(stmt.value.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareClassStmt = function (_stmt, _context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitIfStmt = function (stmt, context) {
            return this.factory.attachComments(this.factory.createIfStatement(stmt.condition.visitExpression(this, context), this.factory.createBlock(this.visitStatements(stmt.trueCase, context.withStatementMode)), stmt.falseCase.length > 0 ? this.factory.createBlock(this.visitStatements(stmt.falseCase, context.withStatementMode)) :
                null), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitTryCatchStmt = function (_stmt, _context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitThrowStmt = function (stmt, context) {
            return this.factory.attachComments(this.factory.createThrowStatement(stmt.error.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitReadVarExpr = function (ast, _context) {
            var identifier = this.factory.createIdentifier(ast.name);
            this.setSourceMapRange(identifier, ast.sourceSpan);
            return identifier;
        };
        ExpressionTranslatorVisitor.prototype.visitWriteVarExpr = function (expr, context) {
            var assignment = this.factory.createAssignment(this.setSourceMapRange(this.factory.createIdentifier(expr.name), expr.sourceSpan), expr.value.visitExpression(this, context));
            return context.isStatement ? assignment :
                this.factory.createParenthesizedExpression(assignment);
        };
        ExpressionTranslatorVisitor.prototype.visitWriteKeyExpr = function (expr, context) {
            var exprContext = context.withExpressionMode;
            var target = this.factory.createElementAccess(expr.receiver.visitExpression(this, exprContext), expr.index.visitExpression(this, exprContext));
            var assignment = this.factory.createAssignment(target, expr.value.visitExpression(this, exprContext));
            return context.isStatement ? assignment :
                this.factory.createParenthesizedExpression(assignment);
        };
        ExpressionTranslatorVisitor.prototype.visitWritePropExpr = function (expr, context) {
            var target = this.factory.createPropertyAccess(expr.receiver.visitExpression(this, context), expr.name);
            return this.factory.createAssignment(target, expr.value.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeMethodExpr = function (ast, context) {
            var _this = this;
            var target = ast.receiver.visitExpression(this, context);
            return this.setSourceMapRange(this.factory.createCallExpression(ast.name !== null ? this.factory.createPropertyAccess(target, ast.name) : target, ast.args.map(function (arg) { return arg.visitExpression(_this, context); }), 
            /* pure */ false), ast.sourceSpan);
        };
        ExpressionTranslatorVisitor.prototype.visitInvokeFunctionExpr = function (ast, context) {
            var _this = this;
            return this.setSourceMapRange(this.factory.createCallExpression(ast.fn.visitExpression(this, context), ast.args.map(function (arg) { return arg.visitExpression(_this, context); }), ast.pure), ast.sourceSpan);
        };
        ExpressionTranslatorVisitor.prototype.visitInstantiateExpr = function (ast, context) {
            var _this = this;
            return this.factory.createNewExpression(ast.classExpr.visitExpression(this, context), ast.args.map(function (arg) { return arg.visitExpression(_this, context); }));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralExpr = function (ast, _context) {
            return this.setSourceMapRange(this.factory.createLiteral(ast.value), ast.sourceSpan);
        };
        ExpressionTranslatorVisitor.prototype.visitLocalizedString = function (ast, context) {
            // A `$localize` message consists of `messageParts` and `expressions`, which get interleaved
            // together. The interleaved pieces look like:
            // `[messagePart0, expression0, messagePart1, expression1, messagePart2]`
            //
            // Note that there is always a message part at the start and end, and so therefore
            // `messageParts.length === expressions.length + 1`.
            //
            // Each message part may be prefixed with "metadata", which is wrapped in colons (:) delimiters.
            // The metadata is attached to the first and subsequent message parts by calls to
            // `serializeI18nHead()` and `serializeI18nTemplatePart()` respectively.
            //
            // The first message part (i.e. `ast.messageParts[0]`) is used to initialize `messageParts`
            // array.
            var elements = [createTemplateElement(ast.serializeI18nHead())];
            var expressions = [];
            for (var i = 0; i < ast.expressions.length; i++) {
                var placeholder = this.setSourceMapRange(ast.expressions[i].visitExpression(this, context), ast.getPlaceholderSourceSpan(i));
                expressions.push(placeholder);
                elements.push(createTemplateElement(ast.serializeI18nTemplatePart(i + 1)));
            }
            var localizeTag = this.factory.createIdentifier('$localize');
            // Now choose which implementation to use to actually create the necessary AST nodes.
            var localizeCall = this.downlevelLocalizedStrings ?
                this.createES5TaggedTemplateFunctionCall(localizeTag, { elements: elements, expressions: expressions }) :
                this.factory.createTaggedTemplate(localizeTag, { elements: elements, expressions: expressions });
            return this.setSourceMapRange(localizeCall, ast.sourceSpan);
        };
        /**
         * Translate the tagged template literal into a call that is compatible with ES5, using the
         * imported `__makeTemplateObject` helper for ES5 formatted output.
         */
        ExpressionTranslatorVisitor.prototype.createES5TaggedTemplateFunctionCall = function (tagHandler, _a) {
            var e_1, _b;
            var elements = _a.elements, expressions = _a.expressions;
            // Ensure that the `__makeTemplateObject()` helper has been imported.
            var _c = this.imports.generateNamedImport('tslib', '__makeTemplateObject'), moduleImport = _c.moduleImport, symbol = _c.symbol;
            var __makeTemplateObjectHelper = (moduleImport === null) ?
                this.factory.createIdentifier(symbol) :
                this.factory.createPropertyAccess(moduleImport, symbol);
            // Collect up the cooked and raw strings into two separate arrays.
            var cooked = [];
            var raw = [];
            try {
                for (var elements_1 = tslib_1.__values(elements), elements_1_1 = elements_1.next(); !elements_1_1.done; elements_1_1 = elements_1.next()) {
                    var element = elements_1_1.value;
                    cooked.push(this.factory.setSourceMapRange(this.factory.createLiteral(element.cooked), element.range));
                    raw.push(this.factory.setSourceMapRange(this.factory.createLiteral(element.raw), element.range));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (elements_1_1 && !elements_1_1.done && (_b = elements_1.return)) _b.call(elements_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Generate the helper call in the form: `__makeTemplateObject([cooked], [raw]);`
            var templateHelperCall = this.factory.createCallExpression(__makeTemplateObjectHelper, [this.factory.createArrayLiteral(cooked), this.factory.createArrayLiteral(raw)], 
            /* pure */ false);
            // Finally create the tagged handler call in the form:
            // `tag(__makeTemplateObject([cooked], [raw]), ...expressions);`
            return this.factory.createCallExpression(tagHandler, tslib_1.__spread([templateHelperCall], expressions), 
            /* pure */ false);
        };
        ExpressionTranslatorVisitor.prototype.visitExternalExpr = function (ast, _context) {
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
                    return this.factory.createIdentifier(symbol);
                }
                else {
                    return this.factory.createPropertyAccess(moduleImport, symbol);
                }
            }
            else {
                // The symbol is ambient, so just reference it.
                return this.factory.createIdentifier(ast.value.name);
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
            if (ast.condition instanceof o.ConditionalExpr) {
                // The condition of this ternary needs to be wrapped in parentheses to maintain
                // left-associativity.
                cond = this.factory.createParenthesizedExpression(cond);
            }
            return this.factory.createConditional(cond, ast.trueCase.visitExpression(this, context), ast.falseCase.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitNotExpr = function (ast, context) {
            return this.factory.createUnaryExpression('!', ast.condition.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitAssertNotNullExpr = function (ast, context) {
            return ast.condition.visitExpression(this, context);
        };
        ExpressionTranslatorVisitor.prototype.visitCastExpr = function (ast, context) {
            return ast.value.visitExpression(this, context);
        };
        ExpressionTranslatorVisitor.prototype.visitFunctionExpr = function (ast, context) {
            var _a;
            return this.factory.createFunctionExpression((_a = ast.name) !== null && _a !== void 0 ? _a : null, ast.params.map(function (param) { return param.name; }), this.factory.createBlock(this.visitStatements(ast.statements, context)));
        };
        ExpressionTranslatorVisitor.prototype.visitBinaryOperatorExpr = function (ast, context) {
            if (!BINARY_OPERATORS.has(ast.operator)) {
                throw new Error("Unknown binary operator: " + o.BinaryOperator[ast.operator]);
            }
            return this.factory.createBinaryExpression(ast.lhs.visitExpression(this, context), BINARY_OPERATORS.get(ast.operator), ast.rhs.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitReadPropExpr = function (ast, context) {
            return this.factory.createPropertyAccess(ast.receiver.visitExpression(this, context), ast.name);
        };
        ExpressionTranslatorVisitor.prototype.visitReadKeyExpr = function (ast, context) {
            return this.factory.createElementAccess(ast.receiver.visitExpression(this, context), ast.index.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralArrayExpr = function (ast, context) {
            var _this = this;
            return this.factory.createArrayLiteral(ast.entries.map(function (expr) { return _this.setSourceMapRange(expr.visitExpression(_this, context), ast.sourceSpan); }));
        };
        ExpressionTranslatorVisitor.prototype.visitLiteralMapExpr = function (ast, context) {
            var _this = this;
            var properties = ast.entries.map(function (entry) {
                return {
                    propertyName: entry.key,
                    quoted: entry.quoted,
                    value: entry.value.visitExpression(_this, context)
                };
            });
            return this.setSourceMapRange(this.factory.createObjectLiteral(properties), ast.sourceSpan);
        };
        ExpressionTranslatorVisitor.prototype.visitCommaExpr = function (ast, context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitWrappedNodeExpr = function (ast, _context) {
            this.recordWrappedNodeExpr(ast.node);
            return ast.node;
        };
        ExpressionTranslatorVisitor.prototype.visitTypeofExpr = function (ast, context) {
            return this.factory.createTypeOfExpression(ast.expr.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitUnaryOperatorExpr = function (ast, context) {
            if (!UNARY_OPERATORS.has(ast.operator)) {
                throw new Error("Unknown unary operator: " + o.UnaryOperator[ast.operator]);
            }
            return this.factory.createUnaryExpression(UNARY_OPERATORS.get(ast.operator), ast.expr.visitExpression(this, context));
        };
        ExpressionTranslatorVisitor.prototype.visitStatements = function (statements, context) {
            var _this = this;
            return statements.map(function (stmt) { return stmt.visitStatement(_this, context); })
                .filter(function (stmt) { return stmt !== undefined; });
        };
        ExpressionTranslatorVisitor.prototype.setSourceMapRange = function (ast, span) {
            return this.factory.setSourceMapRange(ast, createRange(span));
        };
        return ExpressionTranslatorVisitor;
    }());
    exports.ExpressionTranslatorVisitor = ExpressionTranslatorVisitor;
    /**
     * Convert a cooked-raw string object into one that can be used by the AST factories.
     */
    function createTemplateElement(_a) {
        var cooked = _a.cooked, raw = _a.raw, range = _a.range;
        return { cooked: cooked, raw: raw, range: createRange(range) };
    }
    /**
     * Convert an OutputAST source-span into a range that can be used by the AST factories.
     */
    function createRange(span) {
        if (span === null) {
            return null;
        }
        var start = span.start, end = span.end;
        var _a = start.file, url = _a.url, content = _a.content;
        if (!url) {
            return null;
        }
        return {
            url: url,
            content: content,
            start: { offset: start.offset, line: start.line, column: start.col },
            end: { offset: end.offset, line: end.line, column: end.col },
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gscUNBQXVDO0lBTXZDLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFpQztRQUM5RCxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztLQUM1QixDQUFDLENBQUM7SUFFSCxJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFtQztRQUNqRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMs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R0FBRyxLQUFBLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsV0FBVyxDQUFDLElBQTRCO1FBQy9DLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtZQUNqQixPQUFPLElBQUksQ0FBQztTQUNiO1FBQ00sSUFBQSxLQUFLLEdBQVMsSUFBSSxNQUFiLEVBQUUsR0FBRyxHQUFJLElBQUksSUFBUixDQUFTO1FBQ3BCLElBQUEsS0FBaUIsS0FBSyxDQUFDLElBQUksRUFBMUIsR0FBRyxTQUFBLEVBQUUsT0FBTyxhQUFjLENBQUM7UUFDbEMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNSLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPO1lBQ0wsR0FBRyxLQUFBO1lBQ0gsT0FBTyxTQUFBO1lBQ1AsS0FBSyxFQUFFLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUM7WUFDbEUsR0FBRyxFQUFFLEVBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUM7U0FDM0QsQ0FBQztJQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIG8gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge0FzdEZhY3RvcnksIEJpbmFyeU9wZXJhdG9yLCBPYmplY3RMaXRlcmFsUHJvcGVydHksIFNvdXJjZU1hcFJhbmdlLCBUZW1wbGF0ZUVsZW1lbnQsIFRlbXBsYXRlTGl0ZXJhbCwgVW5hcnlPcGVyYXRvcn0gZnJvbSAnLi9hcGkvYXN0X2ZhY3RvcnknO1xuaW1wb3J0IHtJbXBvcnRHZW5lcmF0b3J9IGZyb20gJy4vYXBpL2ltcG9ydF9nZW5lcmF0b3InO1xuaW1wb3J0IHtDb250ZXh0fSBmcm9tICcuL2NvbnRleHQnO1xuXG5jb25zdCBVTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPG8uVW5hcnlPcGVyYXRvciwgVW5hcnlPcGVyYXRvcj4oW1xuICBbby5VbmFyeU9wZXJhdG9yLk1pbnVzLCAnLSddLFxuICBbby5VbmFyeU9wZXJhdG9yLlBsdXMsICcrJ10sXG5dKTtcblxuY29uc3QgQklOQVJZX09QRVJBVE9SUyA9IG5ldyBNYXA8by5CaW5hcnlPcGVyYXRvciwgQmluYXJ5T3BlcmF0b3I+KFtcbiAgW28uQmluYXJ5T3BlcmF0b3IuQW5kLCAnJiYnXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuQmlnZ2VyLCAnPiddLFxuICBbby5CaW5hcnlPcGVyYXRvci5CaWdnZXJFcXVhbHMsICc+PSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5CaXR3aXNlQW5kLCAnJiddLFxuICBbby5CaW5hcnlPcGVyYXRvci5EaXZpZGUsICcvJ10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLkVxdWFscywgJz09J10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLklkZW50aWNhbCwgJz09PSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5Mb3dlciwgJzwnXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTG93ZXJFcXVhbHMsICc8PSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5NaW51cywgJy0nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTW9kdWxvLCAnJSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5NdWx0aXBseSwgJyonXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTm90RXF1YWxzLCAnIT0nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTm90SWRlbnRpY2FsLCAnIT09J10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLk9yLCAnfHwnXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuUGx1cywgJysnXSxcbl0pO1xuXG5leHBvcnQgdHlwZSBSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbjxURXhwcmVzc2lvbj4gPSAoZXhwcjogVEV4cHJlc3Npb24pID0+IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNsYXRvck9wdGlvbnM8VEV4cHJlc3Npb24+IHtcbiAgZG93bmxldmVsTG9jYWxpemVkU3RyaW5ncz86IGJvb2xlYW47XG4gIGRvd25sZXZlbFZhcmlhYmxlRGVjbGFyYXRpb25zPzogYm9vbGVhbjtcbiAgcmVjb3JkV3JhcHBlZE5vZGVFeHByPzogUmVjb3JkV3JhcHBlZE5vZGVFeHByRm48VEV4cHJlc3Npb24+O1xufVxuXG5leHBvcnQgY2xhc3MgRXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiBpbXBsZW1lbnRzIG8uRXhwcmVzc2lvblZpc2l0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8uU3RhdGVtZW50VmlzaXRvciB7XG4gIHByaXZhdGUgZG93bmxldmVsTG9jYWxpemVkU3RyaW5nczogYm9vbGVhbjtcbiAgcHJpdmF0ZSBkb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9uczogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWNvcmRXcmFwcGVkTm9kZUV4cHI6IFJlY29yZFdyYXBwZWROb2RlRXhwckZuPFRFeHByZXNzaW9uPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZmFjdG9yeTogQXN0RmFjdG9yeTxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4sXG4gICAgICBwcml2YXRlIGltcG9ydHM6IEltcG9ydEdlbmVyYXRvcjxURXhwcmVzc2lvbj4sIG9wdGlvbnM6IFRyYW5zbGF0b3JPcHRpb25zPFRFeHByZXNzaW9uPikge1xuICAgIHRoaXMuZG93bmxldmVsTG9jYWxpemVkU3RyaW5ncyA9IG9wdGlvbnMuZG93bmxldmVsTG9jYWxpemVkU3RyaW5ncyA9PT0gdHJ1ZTtcbiAgICB0aGlzLmRvd25sZXZlbFZhcmlhYmxlRGVjbGFyYXRpb25zID0gb3B0aW9ucy5kb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9ucyA9PT0gdHJ1ZTtcbiAgICB0aGlzLnJlY29yZFdyYXBwZWROb2RlRXhwciA9IG9wdGlvbnMucmVjb3JkV3JhcHBlZE5vZGVFeHByIHx8ICgoKSA9PiB7fSk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVWYXJTdG10KHN0bXQ6IG8uRGVjbGFyZVZhclN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiBUU3RhdGVtZW50IHtcbiAgICBjb25zdCB2YXJUeXBlID0gdGhpcy5kb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9ucyA/XG4gICAgICAgICd2YXInIDpcbiAgICAgICAgc3RtdC5oYXNNb2RpZmllcihvLlN0bXRNb2RpZmllci5GaW5hbCkgPyAnY29uc3QnIDogJ2xldCc7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oXG4gICAgICAgICAgICBzdG10Lm5hbWUsIHN0bXQudmFsdWU/LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhFeHByZXNzaW9uTW9kZSksIHZhclR5cGUpLFxuICAgICAgICBzdG10LmxlYWRpbmdDb21tZW50cyk7XG4gIH1cblxuICB2aXNpdERlY2xhcmVGdW5jdGlvblN0bXQoc3RtdDogby5EZWNsYXJlRnVuY3Rpb25TdG10LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgICAgICBzdG10Lm5hbWUsIHN0bXQucGFyYW1zLm1hcChwYXJhbSA9PiBwYXJhbS5uYW1lKSxcbiAgICAgICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVCbG9jayhcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0U3RhdGVtZW50cyhzdG10LnN0YXRlbWVudHMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblN0bXQoc3RtdDogby5FeHByZXNzaW9uU3RhdGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQoXG4gICAgICAgICAgICBzdG10LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSxcbiAgICAgICAgc3RtdC5sZWFkaW5nQ29tbWVudHMpO1xuICB9XG5cbiAgdmlzaXRSZXR1cm5TdG10KHN0bXQ6IG8uUmV0dXJuU3RhdGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVJldHVyblN0YXRlbWVudChcbiAgICAgICAgICAgIHN0bXQudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlKSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUNsYXNzU3RtdChfc3RtdDogby5DbGFzc1N0bXQsIF9jb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0SWZTdG10KHN0bXQ6IG8uSWZTdG10LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUlmU3RhdGVtZW50KFxuICAgICAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUJsb2NrKFxuICAgICAgICAgICAgICAgIHRoaXMudmlzaXRTdGF0ZW1lbnRzKHN0bXQudHJ1ZUNhc2UsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSxcbiAgICAgICAgICAgIHN0bXQuZmFsc2VDYXNlLmxlbmd0aCA+IDAgPyB0aGlzLmZhY3RvcnkuY3JlYXRlQmxvY2sodGhpcy52aXNpdFN0YXRlbWVudHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuZmFsc2VDYXNlLCBjb250ZXh0LndpdGhTdGF0ZW1lbnRNb2RlKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwpLFxuICAgICAgICBzdG10LmxlYWRpbmdDb21tZW50cyk7XG4gIH1cblxuICB2aXNpdFRyeUNhdGNoU3RtdChfc3RtdDogby5UcnlDYXRjaFN0bXQsIF9jb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VGhyb3dTdG10KHN0bXQ6IG8uVGhyb3dTdG10LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVRocm93U3RhdGVtZW50KFxuICAgICAgICAgICAgc3RtdC5lcnJvci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKSxcbiAgICAgICAgc3RtdC5sZWFkaW5nQ29tbWVudHMpO1xuICB9XG5cbiAgdmlzaXRSZWFkVmFyRXhwcihhc3Q6IG8uUmVhZFZhckV4cHIsIF9jb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB0aGlzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcihhc3QubmFtZSEpO1xuICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoaWRlbnRpZmllciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgdmlzaXRXcml0ZVZhckV4cHIoZXhwcjogby5Xcml0ZVZhckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgY29uc3QgYXNzaWdubWVudCA9IHRoaXMuZmFjdG9yeS5jcmVhdGVBc3NpZ25tZW50KFxuICAgICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRoaXMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKGV4cHIubmFtZSksIGV4cHIuc291cmNlU3BhbiksXG4gICAgICAgIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyBhc3NpZ25tZW50IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihhc3NpZ25tZW50KTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVLZXlFeHByKGV4cHI6IG8uV3JpdGVLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHJDb250ZXh0ID0gY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGU7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5mYWN0b3J5LmNyZWF0ZUVsZW1lbnRBY2Nlc3MoXG4gICAgICAgIGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSxcbiAgICAgICAgZXhwci5pbmRleC52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpLFxuICAgICk7XG4gICAgY29uc3QgYXNzaWdubWVudCA9XG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVBc3NpZ25tZW50KHRhcmdldCwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgZXhwckNvbnRleHQpKTtcbiAgICByZXR1cm4gY29udGV4dC5pc1N0YXRlbWVudCA/IGFzc2lnbm1lbnQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGFzc2lnbm1lbnQpO1xuICB9XG5cbiAgdmlzaXRXcml0ZVByb3BFeHByKGV4cHI6IG8uV3JpdGVQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCB0YXJnZXQgPVxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBY2Nlc3MoZXhwci5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGV4cHIubmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVBc3NpZ25tZW50KHRhcmdldCwgZXhwci52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRJbnZva2VNZXRob2RFeHByKGFzdDogby5JbnZva2VNZXRob2RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHRhcmdldCA9IGFzdC5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gICAgcmV0dXJuIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoXG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVDYWxsRXhwcmVzc2lvbihcbiAgICAgICAgICAgIGFzdC5uYW1lICE9PSBudWxsID8gdGhpcy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRhcmdldCwgYXN0Lm5hbWUpIDogdGFyZ2V0LFxuICAgICAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSxcbiAgICAgICAgICAgIC8qIHB1cmUgKi8gZmFsc2UpLFxuICAgICAgICBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdEludm9rZUZ1bmN0aW9uRXhwcihhc3Q6IG8uSW52b2tlRnVuY3Rpb25FeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKFxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgICAgICAgICBhc3QuZm4udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICAgICAgYXN0LmFyZ3MubWFwKGFyZyA9PiBhcmcudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKSwgYXN0LnB1cmUpLFxuICAgICAgICBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdEluc3RhbnRpYXRlRXhwcihhc3Q6IG8uSW5zdGFudGlhdGVFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlTmV3RXhwcmVzc2lvbihcbiAgICAgICAgYXN0LmNsYXNzRXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsRXhwcihhc3Q6IG8uTGl0ZXJhbEV4cHIsIF9jb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRoaXMuZmFjdG9yeS5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSksIGFzdC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIHZpc2l0TG9jYWxpemVkU3RyaW5nKGFzdDogby5Mb2NhbGl6ZWRTdHJpbmcsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgLy8gQSBgJGxvY2FsaXplYCBtZXNzYWdlIGNvbnNpc3RzIG9mIGBtZXNzYWdlUGFydHNgIGFuZCBgZXhwcmVzc2lvbnNgLCB3aGljaCBnZXQgaW50ZXJsZWF2ZWRcbiAgICAvLyB0b2dldGhlci4gVGhlIGludGVybGVhdmVkIHBpZWNlcyBsb29rIGxpa2U6XG4gICAgLy8gYFttZXNzYWdlUGFydDAsIGV4cHJlc3Npb24wLCBtZXNzYWdlUGFydDEsIGV4cHJlc3Npb24xLCBtZXNzYWdlUGFydDJdYFxuICAgIC8vXG4gICAgLy8gTm90ZSB0aGF0IHRoZXJlIGlzIGFsd2F5cyBhIG1lc3NhZ2UgcGFydCBhdCB0aGUgc3RhcnQgYW5kIGVuZCwgYW5kIHNvIHRoZXJlZm9yZVxuICAgIC8vIGBtZXNzYWdlUGFydHMubGVuZ3RoID09PSBleHByZXNzaW9ucy5sZW5ndGggKyAxYC5cbiAgICAvL1xuICAgIC8vIEVhY2ggbWVzc2FnZSBwYXJ0IG1heSBiZSBwcmVmaXhlZCB3aXRoIFwibWV0YWRhdGFcIiwgd2hpY2ggaXMgd3JhcHBlZCBpbiBjb2xvbnMgKDopIGRlbGltaXRlcnMuXG4gICAgLy8gVGhlIG1ldGFkYXRhIGlzIGF0dGFjaGVkIHRvIHRoZSBmaXJzdCBhbmQgc3Vic2VxdWVudCBtZXNzYWdlIHBhcnRzIGJ5IGNhbGxzIHRvXG4gICAgLy8gYHNlcmlhbGl6ZUkxOG5IZWFkKClgIGFuZCBgc2VyaWFsaXplSTE4blRlbXBsYXRlUGFydCgpYCByZXNwZWN0aXZlbHkuXG4gICAgLy9cbiAgICAvLyBUaGUgZmlyc3QgbWVzc2FnZSBwYXJ0IChpLmUuIGBhc3QubWVzc2FnZVBhcnRzWzBdYCkgaXMgdXNlZCB0byBpbml0aWFsaXplIGBtZXNzYWdlUGFydHNgXG4gICAgLy8gYXJyYXkuXG4gICAgY29uc3QgZWxlbWVudHM6IFRlbXBsYXRlRWxlbWVudFtdID0gW2NyZWF0ZVRlbXBsYXRlRWxlbWVudChhc3Quc2VyaWFsaXplSTE4bkhlYWQoKSldO1xuICAgIGNvbnN0IGV4cHJlc3Npb25zOiBURXhwcmVzc2lvbltdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QuZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShcbiAgICAgICAgICBhc3QuZXhwcmVzc2lvbnNbaV0udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBhc3QuZ2V0UGxhY2Vob2xkZXJTb3VyY2VTcGFuKGkpKTtcbiAgICAgIGV4cHJlc3Npb25zLnB1c2gocGxhY2Vob2xkZXIpO1xuICAgICAgZWxlbWVudHMucHVzaChjcmVhdGVUZW1wbGF0ZUVsZW1lbnQoYXN0LnNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQoaSArIDEpKSk7XG4gICAgfVxuXG4gICAgY29uc3QgbG9jYWxpemVUYWcgPSB0aGlzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcignJGxvY2FsaXplJyk7XG5cbiAgICAvLyBOb3cgY2hvb3NlIHdoaWNoIGltcGxlbWVudGF0aW9uIHRvIHVzZSB0byBhY3R1YWxseSBjcmVhdGUgdGhlIG5lY2Vzc2FyeSBBU1Qgbm9kZXMuXG4gICAgY29uc3QgbG9jYWxpemVDYWxsID0gdGhpcy5kb3dubGV2ZWxMb2NhbGl6ZWRTdHJpbmdzID9cbiAgICAgICAgdGhpcy5jcmVhdGVFUzVUYWdnZWRUZW1wbGF0ZUZ1bmN0aW9uQ2FsbChsb2NhbGl6ZVRhZywge2VsZW1lbnRzLCBleHByZXNzaW9uc30pIDpcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVRhZ2dlZFRlbXBsYXRlKGxvY2FsaXplVGFnLCB7ZWxlbWVudHMsIGV4cHJlc3Npb25zfSk7XG5cbiAgICByZXR1cm4gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShsb2NhbGl6ZUNhbGwsIGFzdC5zb3VyY2VTcGFuKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2xhdGUgdGhlIHRhZ2dlZCB0ZW1wbGF0ZSBsaXRlcmFsIGludG8gYSBjYWxsIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIEVTNSwgdXNpbmcgdGhlXG4gICAqIGltcG9ydGVkIGBfX21ha2VUZW1wbGF0ZU9iamVjdGAgaGVscGVyIGZvciBFUzUgZm9ybWF0dGVkIG91dHB1dC5cbiAgICovXG4gIHByaXZhdGUgY3JlYXRlRVM1VGFnZ2VkVGVtcGxhdGVGdW5jdGlvbkNhbGwoXG4gICAgICB0YWdIYW5kbGVyOiBURXhwcmVzc2lvbiwge2VsZW1lbnRzLCBleHByZXNzaW9uc306IFRlbXBsYXRlTGl0ZXJhbDxURXhwcmVzc2lvbj4pOiBURXhwcmVzc2lvbiB7XG4gICAgLy8gRW5zdXJlIHRoYXQgdGhlIGBfX21ha2VUZW1wbGF0ZU9iamVjdCgpYCBoZWxwZXIgaGFzIGJlZW4gaW1wb3J0ZWQuXG4gICAgY29uc3Qge21vZHVsZUltcG9ydCwgc3ltYm9sfSA9XG4gICAgICAgIHRoaXMuaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KCd0c2xpYicsICdfX21ha2VUZW1wbGF0ZU9iamVjdCcpO1xuICAgIGNvbnN0IF9fbWFrZVRlbXBsYXRlT2JqZWN0SGVscGVyID0gKG1vZHVsZUltcG9ydCA9PT0gbnVsbCkgP1xuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcihzeW1ib2wpIDpcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QWNjZXNzKG1vZHVsZUltcG9ydCwgc3ltYm9sKTtcblxuICAgIC8vIENvbGxlY3QgdXAgdGhlIGNvb2tlZCBhbmQgcmF3IHN0cmluZ3MgaW50byB0d28gc2VwYXJhdGUgYXJyYXlzLlxuICAgIGNvbnN0IGNvb2tlZDogVEV4cHJlc3Npb25bXSA9IFtdO1xuICAgIGNvbnN0IHJhdzogVEV4cHJlc3Npb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgY29va2VkLnB1c2godGhpcy5mYWN0b3J5LnNldFNvdXJjZU1hcFJhbmdlKFxuICAgICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVMaXRlcmFsKGVsZW1lbnQuY29va2VkKSwgZWxlbWVudC5yYW5nZSkpO1xuICAgICAgcmF3LnB1c2goXG4gICAgICAgICAgdGhpcy5mYWN0b3J5LnNldFNvdXJjZU1hcFJhbmdlKHRoaXMuZmFjdG9yeS5jcmVhdGVMaXRlcmFsKGVsZW1lbnQucmF3KSwgZWxlbWVudC5yYW5nZSkpO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIHRoZSBoZWxwZXIgY2FsbCBpbiB0aGUgZm9ybTogYF9fbWFrZVRlbXBsYXRlT2JqZWN0KFtjb29rZWRdLCBbcmF3XSk7YFxuICAgIGNvbnN0IHRlbXBsYXRlSGVscGVyQ2FsbCA9IHRoaXMuZmFjdG9yeS5jcmVhdGVDYWxsRXhwcmVzc2lvbihcbiAgICAgICAgX19tYWtlVGVtcGxhdGVPYmplY3RIZWxwZXIsXG4gICAgICAgIFt0aGlzLmZhY3RvcnkuY3JlYXRlQXJyYXlMaXRlcmFsKGNvb2tlZCksIHRoaXMuZmFjdG9yeS5jcmVhdGVBcnJheUxpdGVyYWwocmF3KV0sXG4gICAgICAgIC8qIHB1cmUgKi8gZmFsc2UpO1xuXG4gICAgLy8gRmluYWxseSBjcmVhdGUgdGhlIHRhZ2dlZCBoYW5kbGVyIGNhbGwgaW4gdGhlIGZvcm06XG4gICAgLy8gYHRhZyhfX21ha2VUZW1wbGF0ZU9iamVjdChbY29va2VkXSwgW3Jhd10pLCAuLi5leHByZXNzaW9ucyk7YFxuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgICAgIHRhZ0hhbmRsZXIsIFt0ZW1wbGF0ZUhlbHBlckNhbGwsIC4uLmV4cHJlc3Npb25zXSxcbiAgICAgICAgLyogcHVyZSAqLyBmYWxzZSk7XG4gIH1cblxuICB2aXNpdEV4dGVybmFsRXhwcihhc3Q6IG8uRXh0ZXJuYWxFeHByLCBfY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBpZiAoYXN0LnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHVua25vd24gbW9kdWxlIG9yIHN5bWJvbCAke2FzdC52YWx1ZX1gKTtcbiAgICB9XG4gICAgLy8gSWYgYSBtb2R1bGVOYW1lIGlzIHNwZWNpZmllZCwgdGhpcyBpcyBhIG5vcm1hbCBpbXBvcnQuIElmIHRoZXJlJ3Mgbm8gbW9kdWxlIG5hbWUsIGl0J3MgYVxuICAgIC8vIHJlZmVyZW5jZSB0byBhIGdsb2JhbC9hbWJpZW50IHN5bWJvbC5cbiAgICBpZiAoYXN0LnZhbHVlLm1vZHVsZU5hbWUgIT09IG51bGwpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBub3JtYWwgaW1wb3J0LiBGaW5kIHRoZSBpbXBvcnRlZCBtb2R1bGUuXG4gICAgICBjb25zdCB7bW9kdWxlSW1wb3J0LCBzeW1ib2x9ID1cbiAgICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydChhc3QudmFsdWUubW9kdWxlTmFtZSwgYXN0LnZhbHVlLm5hbWUpO1xuICAgICAgaWYgKG1vZHVsZUltcG9ydCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgc3ltYm9sIHdhcyBhbWJpZW50IGFmdGVyIGFsbC5cbiAgICAgICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKHN5bWJvbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QWNjZXNzKG1vZHVsZUltcG9ydCwgc3ltYm9sKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHN5bWJvbCBpcyBhbWJpZW50LCBzbyBqdXN0IHJlZmVyZW5jZSBpdC5cbiAgICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcihhc3QudmFsdWUubmFtZSk7XG4gICAgfVxuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbEV4cHIoYXN0OiBvLkNvbmRpdGlvbmFsRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBsZXQgY29uZDogVEV4cHJlc3Npb24gPSBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcblxuICAgIC8vIE9yZGluYXJpbHkgdGhlIHRlcm5hcnkgb3BlcmF0b3IgaXMgcmlnaHQtYXNzb2NpYXRpdmUuIFRoZSBmb2xsb3dpbmcgYXJlIGVxdWl2YWxlbnQ6XG4gICAgLy8gICBgYSA/IGIgOiBjID8gZCA6IGVgID0+IGBhID8gYiA6IChjID8gZCA6IGUpYFxuICAgIC8vXG4gICAgLy8gSG93ZXZlciwgb2NjYXNpb25hbGx5IEFuZ3VsYXIgbmVlZHMgdG8gcHJvZHVjZSBhIGxlZnQtYXNzb2NpYXRpdmUgY29uZGl0aW9uYWwsIHN1Y2ggYXMgaW5cbiAgICAvLyB0aGUgY2FzZSBvZiBhIG51bGwtc2FmZSBuYXZpZ2F0aW9uIHByb2R1Y3Rpb246IGB7e2E/LmIgPyBjIDogZH19YC4gVGhpcyB0ZW1wbGF0ZSBwcm9kdWNlc1xuICAgIC8vIGEgdGVybmFyeSBvZiB0aGUgZm9ybTpcbiAgICAvLyAgIGBhID09IG51bGwgPyBudWxsIDogcmVzdCBvZiBleHByZXNzaW9uYFxuICAgIC8vIElmIHRoZSByZXN0IG9mIHRoZSBleHByZXNzaW9uIGlzIGFsc28gYSB0ZXJuYXJ5IHRob3VnaCwgdGhpcyB3b3VsZCBwcm9kdWNlIHRoZSBmb3JtOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiBhLmIgPyBjIDogZGBcbiAgICAvLyB3aGljaCwgaWYgbGVmdCBhcyByaWdodC1hc3NvY2lhdGl2ZSwgd291bGQgYmUgaW5jb3JyZWN0bHkgYXNzb2NpYXRlZCBhczpcbiAgICAvLyAgIGBhID09IG51bGwgPyBudWxsIDogKGEuYiA/IGMgOiBkKWBcbiAgICAvL1xuICAgIC8vIEluIHN1Y2ggY2FzZXMsIHRoZSBsZWZ0LWFzc29jaWF0aXZpdHkgbmVlZHMgdG8gYmUgZW5mb3JjZWQgd2l0aCBwYXJlbnRoZXNlczpcbiAgICAvLyAgIGAoYSA9PSBudWxsID8gbnVsbCA6IGEuYikgPyBjIDogZGBcbiAgICAvL1xuICAgIC8vIFN1Y2ggcGFyZW50aGVzZXMgY291bGQgYWx3YXlzIGJlIGluY2x1ZGVkIGluIHRoZSBjb25kaXRpb24gKGd1YXJhbnRlZWluZyBjb3JyZWN0IGJlaGF2aW9yKSBpblxuICAgIC8vIGFsbCBjYXNlcywgYnV0IHRoaXMgaGFzIGEgY29kZSBzaXplIGNvc3QuIEluc3RlYWQsIHBhcmVudGhlc2VzIGFyZSBhZGRlZCBvbmx5IHdoZW4gYVxuICAgIC8vIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gaXMgZGlyZWN0bHkgdXNlZCBhcyB0aGUgY29uZGl0aW9uIG9mIGFub3RoZXIuXG4gICAgLy9cbiAgICAvLyBUT0RPKGFseGh1Yik6IGludmVzdGlnYXRlIGJldHRlciBsb2dpYyBmb3IgcHJlY2VuZGVuY2Ugb2YgY29uZGl0aW9uYWwgb3BlcmF0b3JzXG4gICAgaWYgKGFzdC5jb25kaXRpb24gaW5zdGFuY2VvZiBvLkNvbmRpdGlvbmFsRXhwcikge1xuICAgICAgLy8gVGhlIGNvbmRpdGlvbiBvZiB0aGlzIHRlcm5hcnkgbmVlZHMgdG8gYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlcyB0byBtYWludGFpblxuICAgICAgLy8gbGVmdC1hc3NvY2lhdGl2aXR5LlxuICAgICAgY29uZCA9IHRoaXMuZmFjdG9yeS5jcmVhdGVQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihjb25kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZUNvbmRpdGlvbmFsKFxuICAgICAgICBjb25kLCBhc3QudHJ1ZUNhc2UudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICBhc3QuZmFsc2VDYXNlIS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXROb3RFeHByKGFzdDogby5Ob3RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlVW5hcnlFeHByZXNzaW9uKCchJywgYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRBc3NlcnROb3ROdWxsRXhwcihhc3Q6IG8uQXNzZXJ0Tm90TnVsbCwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LmNvbmRpdGlvbi52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdENhc3RFeHByKGFzdDogby5DYXN0RXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gYXN0LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0RnVuY3Rpb25FeHByKGFzdDogby5GdW5jdGlvbkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAgIGFzdC5uYW1lID8/IG51bGwsIGFzdC5wYXJhbXMubWFwKHBhcmFtID0+IHBhcmFtLm5hbWUpLFxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlQmxvY2sodGhpcy52aXNpdFN0YXRlbWVudHMoYXN0LnN0YXRlbWVudHMsIGNvbnRleHQpKSk7XG4gIH1cblxuICB2aXNpdEJpbmFyeU9wZXJhdG9yRXhwcihhc3Q6IG8uQmluYXJ5T3BlcmF0b3JFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGlmICghQklOQVJZX09QRVJBVE9SUy5oYXMoYXN0Lm9wZXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGJpbmFyeSBvcGVyYXRvcjogJHtvLkJpbmFyeU9wZXJhdG9yW2FzdC5vcGVyYXRvcl19YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlQmluYXJ5RXhwcmVzc2lvbihcbiAgICAgICAgYXN0Lmxocy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIEJJTkFSWV9PUEVSQVRPUlMuZ2V0KGFzdC5vcGVyYXRvcikhLFxuICAgICAgICBhc3QucmhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICApO1xuICB9XG5cbiAgdmlzaXRSZWFkUHJvcEV4cHIoYXN0OiBvLlJlYWRQcm9wRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QWNjZXNzKGFzdC5yZWNlaXZlci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGFzdC5uYW1lKTtcbiAgfVxuXG4gIHZpc2l0UmVhZEtleUV4cHIoYXN0OiBvLlJlYWRLZXlFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlRWxlbWVudEFjY2VzcyhcbiAgICAgICAgYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0LmluZGV4LnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheUV4cHIoYXN0OiBvLkxpdGVyYWxBcnJheUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVBcnJheUxpdGVyYWwoYXN0LmVudHJpZXMubWFwKFxuICAgICAgICBleHByID0+IHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksIGFzdC5zb3VyY2VTcGFuKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwRXhwcihhc3Q6IG8uTGl0ZXJhbE1hcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcHJvcGVydGllczogT2JqZWN0TGl0ZXJhbFByb3BlcnR5PFRFeHByZXNzaW9uPltdID0gYXN0LmVudHJpZXMubWFwKGVudHJ5ID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb3BlcnR5TmFtZTogZW50cnkua2V5LFxuICAgICAgICBxdW90ZWQ6IGVudHJ5LnF1b3RlZCxcbiAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KVxuICAgICAgfTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZSh0aGlzLmZhY3RvcnkuY3JlYXRlT2JqZWN0TGl0ZXJhbChwcm9wZXJ0aWVzKSwgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRDb21tYUV4cHIoYXN0OiBvLkNvbW1hRXhwciwgY29udGV4dDogQ29udGV4dCk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFdyYXBwZWROb2RlRXhwcihhc3Q6IG8uV3JhcHBlZE5vZGVFeHByPGFueT4sIF9jb250ZXh0OiBDb250ZXh0KTogYW55IHtcbiAgICB0aGlzLnJlY29yZFdyYXBwZWROb2RlRXhwcihhc3Qubm9kZSk7XG4gICAgcmV0dXJuIGFzdC5ub2RlO1xuICB9XG5cbiAgdmlzaXRUeXBlb2ZFeHByKGFzdDogby5UeXBlb2ZFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlVHlwZU9mRXhwcmVzc2lvbihhc3QuZXhwci52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpO1xuICB9XG5cbiAgdmlzaXRVbmFyeU9wZXJhdG9yRXhwcihhc3Q6IG8uVW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgaWYgKCFVTkFSWV9PUEVSQVRPUlMuaGFzKGFzdC5vcGVyYXRvcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB1bmFyeSBvcGVyYXRvcjogJHtvLlVuYXJ5T3BlcmF0b3JbYXN0Lm9wZXJhdG9yXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVVbmFyeUV4cHJlc3Npb24oXG4gICAgICAgIFVOQVJZX09QRVJBVE9SUy5nZXQoYXN0Lm9wZXJhdG9yKSEsIGFzdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U3RhdGVtZW50cyhzdGF0ZW1lbnRzOiBvLlN0YXRlbWVudFtdLCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gc3RhdGVtZW50cy5tYXAoc3RtdCA9PiBzdG10LnZpc2l0U3RhdGVtZW50KHRoaXMsIGNvbnRleHQpKVxuICAgICAgICAuZmlsdGVyKHN0bXQgPT4gc3RtdCAhPT0gdW5kZWZpbmVkKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0U291cmNlTWFwUmFuZ2U8VCBleHRlbmRzIFRFeHByZXNzaW9ufFRTdGF0ZW1lbnQ+KGFzdDogVCwgc3Bhbjogby5QYXJzZVNvdXJjZVNwYW58bnVsbCk6XG4gICAgICBUIHtcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LnNldFNvdXJjZU1hcFJhbmdlKGFzdCwgY3JlYXRlUmFuZ2Uoc3BhbikpO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydCBhIGNvb2tlZC1yYXcgc3RyaW5nIG9iamVjdCBpbnRvIG9uZSB0aGF0IGNhbiBiZSB1c2VkIGJ5IHRoZSBBU1QgZmFjdG9yaWVzLlxuICovXG5mdW5jdGlvbiBjcmVhdGVUZW1wbGF0ZUVsZW1lbnQoXG4gICAge2Nvb2tlZCwgcmF3LCByYW5nZX06IHtjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcsIHJhbmdlOiBvLlBhcnNlU291cmNlU3BhbnxudWxsfSk6XG4gICAgVGVtcGxhdGVFbGVtZW50IHtcbiAgcmV0dXJuIHtjb29rZWQsIHJhdywgcmFuZ2U6IGNyZWF0ZVJhbmdlKHJhbmdlKX07XG59XG5cbi8qKlxuICogQ29udmVydCBhbiBPdXRwdXRBU1Qgc291cmNlLXNwYW4gaW50byBhIHJhbmdlIHRoYXQgY2FuIGJlIHVzZWQgYnkgdGhlIEFTVCBmYWN0b3JpZXMuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVJhbmdlKHNwYW46IG8uUGFyc2VTb3VyY2VTcGFufG51bGwpOiBTb3VyY2VNYXBSYW5nZXxudWxsIHtcbiAgaWYgKHNwYW4gPT09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBjb25zdCB7c3RhcnQsIGVuZH0gPSBzcGFuO1xuICBjb25zdCB7dXJsLCBjb250ZW50fSA9IHN0YXJ0LmZpbGU7XG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB1cmwsXG4gICAgY29udGVudCxcbiAgICBzdGFydDoge29mZnNldDogc3RhcnQub2Zmc2V0LCBsaW5lOiBzdGFydC5saW5lLCBjb2x1bW46IHN0YXJ0LmNvbH0sXG4gICAgZW5kOiB7b2Zmc2V0OiBlbmQub2Zmc2V0LCBsaW5lOiBlbmQubGluZSwgY29sdW1uOiBlbmQuY29sfSxcbiAgfTtcbn1cbiJdfQ==