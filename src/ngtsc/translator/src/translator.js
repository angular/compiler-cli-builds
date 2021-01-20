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
            return this.attachComments(this.factory.createVariableDeclaration(stmt.name, (_a = stmt.value) === null || _a === void 0 ? void 0 : _a.visitExpression(this, context.withExpressionMode), varType), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareFunctionStmt = function (stmt, context) {
            return this.attachComments(this.factory.createFunctionDeclaration(stmt.name, stmt.params.map(function (param) { return param.name; }), this.factory.createBlock(this.visitStatements(stmt.statements, context.withStatementMode))), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitExpressionStmt = function (stmt, context) {
            return this.attachComments(this.factory.createExpressionStatement(stmt.expr.visitExpression(this, context.withStatementMode)), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitReturnStmt = function (stmt, context) {
            return this.attachComments(this.factory.createReturnStatement(stmt.value.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitDeclareClassStmt = function (_stmt, _context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitIfStmt = function (stmt, context) {
            return this.attachComments(this.factory.createIfStatement(stmt.condition.visitExpression(this, context), this.factory.createBlock(this.visitStatements(stmt.trueCase, context.withStatementMode)), stmt.falseCase.length > 0 ? this.factory.createBlock(this.visitStatements(stmt.falseCase, context.withStatementMode)) :
                null), stmt.leadingComments);
        };
        ExpressionTranslatorVisitor.prototype.visitTryCatchStmt = function (_stmt, _context) {
            throw new Error('Method not implemented.');
        };
        ExpressionTranslatorVisitor.prototype.visitThrowStmt = function (stmt, context) {
            return this.attachComments(this.factory.createThrowStatement(stmt.error.visitExpression(this, context.withExpressionMode)), stmt.leadingComments);
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
                if (ast.value.moduleName === null) {
                    throw new Error('Invalid import without name nor moduleName');
                }
                return this.imports.generateNamespaceImport(ast.value.moduleName);
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
        ExpressionTranslatorVisitor.prototype.attachComments = function (statement, leadingComments) {
            if (leadingComments !== undefined) {
                this.factory.attachComments(statement, leadingComments);
            }
            return statement;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNsYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHJhbnNsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gscUNBQXVDO0lBTXZDLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFpQztRQUM5RCxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztLQUM1QixDQUFDLENBQUM7SUFFSCxJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFtQztRQUNqRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMs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Z2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtBc3RGYWN0b3J5LCBCaW5hcnlPcGVyYXRvciwgT2JqZWN0TGl0ZXJhbFByb3BlcnR5LCBTb3VyY2VNYXBSYW5nZSwgVGVtcGxhdGVFbGVtZW50LCBUZW1wbGF0ZUxpdGVyYWwsIFVuYXJ5T3BlcmF0b3J9IGZyb20gJy4vYXBpL2FzdF9mYWN0b3J5JztcbmltcG9ydCB7SW1wb3J0R2VuZXJhdG9yfSBmcm9tICcuL2FwaS9pbXBvcnRfZ2VuZXJhdG9yJztcbmltcG9ydCB7Q29udGV4dH0gZnJvbSAnLi9jb250ZXh0JztcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDxvLlVuYXJ5T3BlcmF0b3IsIFVuYXJ5T3BlcmF0b3I+KFtcbiAgW28uVW5hcnlPcGVyYXRvci5NaW51cywgJy0nXSxcbiAgW28uVW5hcnlPcGVyYXRvci5QbHVzLCAnKyddLFxuXSk7XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPG8uQmluYXJ5T3BlcmF0b3IsIEJpbmFyeU9wZXJhdG9yPihbXG4gIFtvLkJpbmFyeU9wZXJhdG9yLkFuZCwgJyYmJ10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLkJpZ2dlciwgJz4nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuQmlnZ2VyRXF1YWxzLCAnPj0nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuQml0d2lzZUFuZCwgJyYnXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuRGl2aWRlLCAnLyddLFxuICBbby5CaW5hcnlPcGVyYXRvci5FcXVhbHMsICc9PSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5JZGVudGljYWwsICc9PT0nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTG93ZXIsICc8J10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLkxvd2VyRXF1YWxzLCAnPD0nXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTWludXMsICctJ10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLk1vZHVsbywgJyUnXSxcbiAgW28uQmluYXJ5T3BlcmF0b3IuTXVsdGlwbHksICcqJ10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLk5vdEVxdWFscywgJyE9J10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLk5vdElkZW50aWNhbCwgJyE9PSddLFxuICBbby5CaW5hcnlPcGVyYXRvci5PciwgJ3x8J10sXG4gIFtvLkJpbmFyeU9wZXJhdG9yLlBsdXMsICcrJ10sXG5dKTtcblxuZXhwb3J0IHR5cGUgUmVjb3JkV3JhcHBlZE5vZGVFeHByRm48VEV4cHJlc3Npb24+ID0gKGV4cHI6IFRFeHByZXNzaW9uKSA9PiB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zbGF0b3JPcHRpb25zPFRFeHByZXNzaW9uPiB7XG4gIGRvd25sZXZlbExvY2FsaXplZFN0cmluZ3M/OiBib29sZWFuO1xuICBkb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9ucz86IGJvb2xlYW47XG4gIHJlY29yZFdyYXBwZWROb2RlRXhwcj86IFJlY29yZFdyYXBwZWROb2RlRXhwckZuPFRFeHByZXNzaW9uPjtcbn1cblxuZXhwb3J0IGNsYXNzIEV4cHJlc3Npb25UcmFuc2xhdG9yVmlzaXRvcjxUU3RhdGVtZW50LCBURXhwcmVzc2lvbj4gaW1wbGVtZW50cyBvLkV4cHJlc3Npb25WaXNpdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLlN0YXRlbWVudFZpc2l0b3Ige1xuICBwcml2YXRlIGRvd25sZXZlbExvY2FsaXplZFN0cmluZ3M6IGJvb2xlYW47XG4gIHByaXZhdGUgZG93bmxldmVsVmFyaWFibGVEZWNsYXJhdGlvbnM6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVjb3JkV3JhcHBlZE5vZGVFeHByOiBSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbjxURXhwcmVzc2lvbj47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZhY3Rvcnk6IEFzdEZhY3Rvcnk8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+LFxuICAgICAgcHJpdmF0ZSBpbXBvcnRzOiBJbXBvcnRHZW5lcmF0b3I8VEV4cHJlc3Npb24+LCBvcHRpb25zOiBUcmFuc2xhdG9yT3B0aW9uczxURXhwcmVzc2lvbj4pIHtcbiAgICB0aGlzLmRvd25sZXZlbExvY2FsaXplZFN0cmluZ3MgPSBvcHRpb25zLmRvd25sZXZlbExvY2FsaXplZFN0cmluZ3MgPT09IHRydWU7XG4gICAgdGhpcy5kb3dubGV2ZWxWYXJpYWJsZURlY2xhcmF0aW9ucyA9IG9wdGlvbnMuZG93bmxldmVsVmFyaWFibGVEZWNsYXJhdGlvbnMgPT09IHRydWU7XG4gICAgdGhpcy5yZWNvcmRXcmFwcGVkTm9kZUV4cHIgPSBvcHRpb25zLnJlY29yZFdyYXBwZWROb2RlRXhwciB8fCAoKCkgPT4ge30pO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlVmFyU3RtdChzdG10OiBvLkRlY2xhcmVWYXJTdG10LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgY29uc3QgdmFyVHlwZSA9IHRoaXMuZG93bmxldmVsVmFyaWFibGVEZWNsYXJhdGlvbnMgP1xuICAgICAgICAndmFyJyA6XG4gICAgICAgIHN0bXQuaGFzTW9kaWZpZXIoby5TdG10TW9kaWZpZXIuRmluYWwpID8gJ2NvbnN0JyA6ICdsZXQnO1xuICAgIHJldHVybiB0aGlzLmF0dGFjaENvbW1lbnRzKFxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgICAgICAgIHN0bXQubmFtZSwgc3RtdC52YWx1ZT8udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlKSwgdmFyVHlwZSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0RGVjbGFyZUZ1bmN0aW9uU3RtdChzdG10OiBvLkRlY2xhcmVGdW5jdGlvblN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiBUU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgICAgICBzdG10Lm5hbWUsIHN0bXQucGFyYW1zLm1hcChwYXJhbSA9PiBwYXJhbS5uYW1lKSxcbiAgICAgICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVCbG9jayhcbiAgICAgICAgICAgICAgICB0aGlzLnZpc2l0U3RhdGVtZW50cyhzdG10LnN0YXRlbWVudHMsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0RXhwcmVzc2lvblN0bXQoc3RtdDogby5FeHByZXNzaW9uU3RhdGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuYXR0YWNoQ29tbWVudHMoXG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50KFxuICAgICAgICAgICAgc3RtdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0LndpdGhTdGF0ZW1lbnRNb2RlKSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0UmV0dXJuU3RtdChzdG10OiBvLlJldHVyblN0YXRlbWVudCwgY29udGV4dDogQ29udGV4dCk6IFRTdGF0ZW1lbnQge1xuICAgIHJldHVybiB0aGlzLmF0dGFjaENvbW1lbnRzKFxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlUmV0dXJuU3RhdGVtZW50KFxuICAgICAgICAgICAgc3RtdC52YWx1ZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dC53aXRoRXhwcmVzc2lvbk1vZGUpKSxcbiAgICAgICAgc3RtdC5sZWFkaW5nQ29tbWVudHMpO1xuICB9XG5cbiAgdmlzaXREZWNsYXJlQ2xhc3NTdG10KF9zdG10OiBvLkNsYXNzU3RtdCwgX2NvbnRleHQ6IENvbnRleHQpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJZlN0bXQoc3RtdDogby5JZlN0bXQsIGNvbnRleHQ6IENvbnRleHQpOiBUU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdGhpcy5hdHRhY2hDb21tZW50cyhcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUlmU3RhdGVtZW50KFxuICAgICAgICAgICAgc3RtdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUJsb2NrKFxuICAgICAgICAgICAgICAgIHRoaXMudmlzaXRTdGF0ZW1lbnRzKHN0bXQudHJ1ZUNhc2UsIGNvbnRleHQud2l0aFN0YXRlbWVudE1vZGUpKSxcbiAgICAgICAgICAgIHN0bXQuZmFsc2VDYXNlLmxlbmd0aCA+IDAgPyB0aGlzLmZhY3RvcnkuY3JlYXRlQmxvY2sodGhpcy52aXNpdFN0YXRlbWVudHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0bXQuZmFsc2VDYXNlLCBjb250ZXh0LndpdGhTdGF0ZW1lbnRNb2RlKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwpLFxuICAgICAgICBzdG10LmxlYWRpbmdDb21tZW50cyk7XG4gIH1cblxuICB2aXNpdFRyeUNhdGNoU3RtdChfc3RtdDogby5UcnlDYXRjaFN0bXQsIF9jb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0VGhyb3dTdG10KHN0bXQ6IG8uVGhyb3dTdG10LCBjb250ZXh0OiBDb250ZXh0KTogVFN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRoaXMuYXR0YWNoQ29tbWVudHMoXG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVUaHJvd1N0YXRlbWVudChcbiAgICAgICAgICAgIHN0bXQuZXJyb3IudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlKSksXG4gICAgICAgIHN0bXQubGVhZGluZ0NvbW1lbnRzKTtcbiAgfVxuXG4gIHZpc2l0UmVhZFZhckV4cHIoYXN0OiBvLlJlYWRWYXJFeHByLCBfY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCBpZGVudGlmaWVyID0gdGhpcy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoYXN0Lm5hbWUhKTtcbiAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKGlkZW50aWZpZXIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gaWRlbnRpZmllcjtcbiAgfVxuXG4gIHZpc2l0V3JpdGVWYXJFeHByKGV4cHI6IG8uV3JpdGVWYXJFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0aGlzLmZhY3RvcnkuY3JlYXRlQXNzaWdubWVudChcbiAgICAgICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZSh0aGlzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcihleHByLm5hbWUpLCBleHByLnNvdXJjZVNwYW4pLFxuICAgICAgICBleHByLnZhbHVlLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICApO1xuICAgIHJldHVybiBjb250ZXh0LmlzU3RhdGVtZW50ID8gYXNzaWdubWVudCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlUGFyZW50aGVzaXplZEV4cHJlc3Npb24oYXNzaWdubWVudCk7XG4gIH1cblxuICB2aXNpdFdyaXRlS2V5RXhwcihleHByOiBvLldyaXRlS2V5RXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByQ29udGV4dCA9IGNvbnRleHQud2l0aEV4cHJlc3Npb25Nb2RlO1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZmFjdG9yeS5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBleHByLnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBleHByQ29udGV4dCksXG4gICAgICAgIGV4cHIuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSxcbiAgICApO1xuICAgIGNvbnN0IGFzc2lnbm1lbnQgPVxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlQXNzaWdubWVudCh0YXJnZXQsIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGV4cHJDb250ZXh0KSk7XG4gICAgcmV0dXJuIGNvbnRleHQuaXNTdGF0ZW1lbnQgPyBhc3NpZ25tZW50IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihhc3NpZ25tZW50KTtcbiAgfVxuXG4gIHZpc2l0V3JpdGVQcm9wRXhwcihleHByOiBvLldyaXRlUHJvcEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgY29uc3QgdGFyZ2V0ID1cbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QWNjZXNzKGV4cHIucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBleHByLm5hbWUpO1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlQXNzaWdubWVudCh0YXJnZXQsIGV4cHIudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0SW52b2tlTWV0aG9kRXhwcihhc3Q6IG8uSW52b2tlTWV0aG9kRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCB0YXJnZXQgPSBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICAgIHJldHVybiB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKFxuICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgICAgICAgICBhc3QubmFtZSAhPT0gbnVsbCA/IHRoaXMuZmFjdG9yeS5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0YXJnZXQsIGFzdC5uYW1lKSA6IHRhcmdldCxcbiAgICAgICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSksXG4gICAgICAgICAgICAvKiBwdXJlICovIGZhbHNlKSxcbiAgICAgICAgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRJbnZva2VGdW5jdGlvbkV4cHIoYXN0OiBvLkludm9rZUZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShcbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUNhbGxFeHByZXNzaW9uKFxuICAgICAgICAgICAgYXN0LmZuLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICAgICAgICAgIGFzdC5hcmdzLm1hcChhcmcgPT4gYXJnLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSksIGFzdC5wdXJlKSxcbiAgICAgICAgYXN0LnNvdXJjZVNwYW4pO1xuICB9XG5cbiAgdmlzaXRJbnN0YW50aWF0ZUV4cHIoYXN0OiBvLkluc3RhbnRpYXRlRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZU5ld0V4cHJlc3Npb24oXG4gICAgICAgIGFzdC5jbGFzc0V4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICAgICBhc3QuYXJncy5tYXAoYXJnID0+IGFyZy52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCkpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEV4cHIoYXN0OiBvLkxpdGVyYWxFeHByLCBfY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZSh0aGlzLmZhY3RvcnkuY3JlYXRlTGl0ZXJhbChhc3QudmFsdWUpLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdExvY2FsaXplZFN0cmluZyhhc3Q6IG8uTG9jYWxpemVkU3RyaW5nLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIC8vIEEgYCRsb2NhbGl6ZWAgbWVzc2FnZSBjb25zaXN0cyBvZiBgbWVzc2FnZVBhcnRzYCBhbmQgYGV4cHJlc3Npb25zYCwgd2hpY2ggZ2V0IGludGVybGVhdmVkXG4gICAgLy8gdG9nZXRoZXIuIFRoZSBpbnRlcmxlYXZlZCBwaWVjZXMgbG9vayBsaWtlOlxuICAgIC8vIGBbbWVzc2FnZVBhcnQwLCBleHByZXNzaW9uMCwgbWVzc2FnZVBhcnQxLCBleHByZXNzaW9uMSwgbWVzc2FnZVBhcnQyXWBcbiAgICAvL1xuICAgIC8vIE5vdGUgdGhhdCB0aGVyZSBpcyBhbHdheXMgYSBtZXNzYWdlIHBhcnQgYXQgdGhlIHN0YXJ0IGFuZCBlbmQsIGFuZCBzbyB0aGVyZWZvcmVcbiAgICAvLyBgbWVzc2FnZVBhcnRzLmxlbmd0aCA9PT0gZXhwcmVzc2lvbnMubGVuZ3RoICsgMWAuXG4gICAgLy9cbiAgICAvLyBFYWNoIG1lc3NhZ2UgcGFydCBtYXkgYmUgcHJlZml4ZWQgd2l0aCBcIm1ldGFkYXRhXCIsIHdoaWNoIGlzIHdyYXBwZWQgaW4gY29sb25zICg6KSBkZWxpbWl0ZXJzLlxuICAgIC8vIFRoZSBtZXRhZGF0YSBpcyBhdHRhY2hlZCB0byB0aGUgZmlyc3QgYW5kIHN1YnNlcXVlbnQgbWVzc2FnZSBwYXJ0cyBieSBjYWxscyB0b1xuICAgIC8vIGBzZXJpYWxpemVJMThuSGVhZCgpYCBhbmQgYHNlcmlhbGl6ZUkxOG5UZW1wbGF0ZVBhcnQoKWAgcmVzcGVjdGl2ZWx5LlxuICAgIC8vXG4gICAgLy8gVGhlIGZpcnN0IG1lc3NhZ2UgcGFydCAoaS5lLiBgYXN0Lm1lc3NhZ2VQYXJ0c1swXWApIGlzIHVzZWQgdG8gaW5pdGlhbGl6ZSBgbWVzc2FnZVBhcnRzYFxuICAgIC8vIGFycmF5LlxuICAgIGNvbnN0IGVsZW1lbnRzOiBUZW1wbGF0ZUVsZW1lbnRbXSA9IFtjcmVhdGVUZW1wbGF0ZUVsZW1lbnQoYXN0LnNlcmlhbGl6ZUkxOG5IZWFkKCkpXTtcbiAgICBjb25zdCBleHByZXNzaW9uczogVEV4cHJlc3Npb25bXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmV4cHJlc3Npb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBwbGFjZWhvbGRlciA9IHRoaXMuc2V0U291cmNlTWFwUmFuZ2UoXG4gICAgICAgICAgYXN0LmV4cHJlc3Npb25zW2ldLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0LmdldFBsYWNlaG9sZGVyU291cmNlU3BhbihpKSk7XG4gICAgICBleHByZXNzaW9ucy5wdXNoKHBsYWNlaG9sZGVyKTtcbiAgICAgIGVsZW1lbnRzLnB1c2goY3JlYXRlVGVtcGxhdGVFbGVtZW50KGFzdC5zZXJpYWxpemVJMThuVGVtcGxhdGVQYXJ0KGkgKyAxKSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGxvY2FsaXplVGFnID0gdGhpcy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoJyRsb2NhbGl6ZScpO1xuXG4gICAgLy8gTm93IGNob29zZSB3aGljaCBpbXBsZW1lbnRhdGlvbiB0byB1c2UgdG8gYWN0dWFsbHkgY3JlYXRlIHRoZSBuZWNlc3NhcnkgQVNUIG5vZGVzLlxuICAgIGNvbnN0IGxvY2FsaXplQ2FsbCA9IHRoaXMuZG93bmxldmVsTG9jYWxpemVkU3RyaW5ncyA/XG4gICAgICAgIHRoaXMuY3JlYXRlRVM1VGFnZ2VkVGVtcGxhdGVGdW5jdGlvbkNhbGwobG9jYWxpemVUYWcsIHtlbGVtZW50cywgZXhwcmVzc2lvbnN9KSA6XG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVUYWdnZWRUZW1wbGF0ZShsb2NhbGl6ZVRhZywge2VsZW1lbnRzLCBleHByZXNzaW9uc30pO1xuXG4gICAgcmV0dXJuIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UobG9jYWxpemVDYWxsLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNsYXRlIHRoZSB0YWdnZWQgdGVtcGxhdGUgbGl0ZXJhbCBpbnRvIGEgY2FsbCB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBFUzUsIHVzaW5nIHRoZVxuICAgKiBpbXBvcnRlZCBgX19tYWtlVGVtcGxhdGVPYmplY3RgIGhlbHBlciBmb3IgRVM1IGZvcm1hdHRlZCBvdXRwdXQuXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZUVTNVRhZ2dlZFRlbXBsYXRlRnVuY3Rpb25DYWxsKFxuICAgICAgdGFnSGFuZGxlcjogVEV4cHJlc3Npb24sIHtlbGVtZW50cywgZXhwcmVzc2lvbnN9OiBUZW1wbGF0ZUxpdGVyYWw8VEV4cHJlc3Npb24+KTogVEV4cHJlc3Npb24ge1xuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBgX19tYWtlVGVtcGxhdGVPYmplY3QoKWAgaGVscGVyIGhhcyBiZWVuIGltcG9ydGVkLlxuICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lZEltcG9ydCgndHNsaWInLCAnX19tYWtlVGVtcGxhdGVPYmplY3QnKTtcbiAgICBjb25zdCBfX21ha2VUZW1wbGF0ZU9iamVjdEhlbHBlciA9IChtb2R1bGVJbXBvcnQgPT09IG51bGwpID9cbiAgICAgICAgdGhpcy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKSA6XG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyhtb2R1bGVJbXBvcnQsIHN5bWJvbCk7XG5cbiAgICAvLyBDb2xsZWN0IHVwIHRoZSBjb29rZWQgYW5kIHJhdyBzdHJpbmdzIGludG8gdHdvIHNlcGFyYXRlIGFycmF5cy5cbiAgICBjb25zdCBjb29rZWQ6IFRFeHByZXNzaW9uW10gPSBbXTtcbiAgICBjb25zdCByYXc6IFRFeHByZXNzaW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgIGNvb2tlZC5wdXNoKHRoaXMuZmFjdG9yeS5zZXRTb3VyY2VNYXBSYW5nZShcbiAgICAgICAgICB0aGlzLmZhY3RvcnkuY3JlYXRlTGl0ZXJhbChlbGVtZW50LmNvb2tlZCksIGVsZW1lbnQucmFuZ2UpKTtcbiAgICAgIHJhdy5wdXNoKFxuICAgICAgICAgIHRoaXMuZmFjdG9yeS5zZXRTb3VyY2VNYXBSYW5nZSh0aGlzLmZhY3RvcnkuY3JlYXRlTGl0ZXJhbChlbGVtZW50LnJhdyksIGVsZW1lbnQucmFuZ2UpKTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmF0ZSB0aGUgaGVscGVyIGNhbGwgaW4gdGhlIGZvcm06IGBfX21ha2VUZW1wbGF0ZU9iamVjdChbY29va2VkXSwgW3Jhd10pO2BcbiAgICBjb25zdCB0ZW1wbGF0ZUhlbHBlckNhbGwgPSB0aGlzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgICAgIF9fbWFrZVRlbXBsYXRlT2JqZWN0SGVscGVyLFxuICAgICAgICBbdGhpcy5mYWN0b3J5LmNyZWF0ZUFycmF5TGl0ZXJhbChjb29rZWQpLCB0aGlzLmZhY3RvcnkuY3JlYXRlQXJyYXlMaXRlcmFsKHJhdyldLFxuICAgICAgICAvKiBwdXJlICovIGZhbHNlKTtcblxuICAgIC8vIEZpbmFsbHkgY3JlYXRlIHRoZSB0YWdnZWQgaGFuZGxlciBjYWxsIGluIHRoZSBmb3JtOlxuICAgIC8vIGB0YWcoX19tYWtlVGVtcGxhdGVPYmplY3QoW2Nvb2tlZF0sIFtyYXddKSwgLi4uZXhwcmVzc2lvbnMpO2BcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZUNhbGxFeHByZXNzaW9uKFxuICAgICAgICB0YWdIYW5kbGVyLCBbdGVtcGxhdGVIZWxwZXJDYWxsLCAuLi5leHByZXNzaW9uc10sXG4gICAgICAgIC8qIHB1cmUgKi8gZmFsc2UpO1xuICB9XG5cbiAgdmlzaXRFeHRlcm5hbEV4cHIoYXN0OiBvLkV4dGVybmFsRXhwciwgX2NvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgaWYgKGFzdC52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICBpZiAoYXN0LnZhbHVlLm1vZHVsZU5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGltcG9ydCB3aXRob3V0IG5hbWUgbm9yIG1vZHVsZU5hbWUnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmltcG9ydHMuZ2VuZXJhdGVOYW1lc3BhY2VJbXBvcnQoYXN0LnZhbHVlLm1vZHVsZU5hbWUpO1xuICAgIH1cbiAgICAvLyBJZiBhIG1vZHVsZU5hbWUgaXMgc3BlY2lmaWVkLCB0aGlzIGlzIGEgbm9ybWFsIGltcG9ydC4gSWYgdGhlcmUncyBubyBtb2R1bGUgbmFtZSwgaXQncyBhXG4gICAgLy8gcmVmZXJlbmNlIHRvIGEgZ2xvYmFsL2FtYmllbnQgc3ltYm9sLlxuICAgIGlmIChhc3QudmFsdWUubW9kdWxlTmFtZSAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBpcyBhIG5vcm1hbCBpbXBvcnQuIEZpbmQgdGhlIGltcG9ydGVkIG1vZHVsZS5cbiAgICAgIGNvbnN0IHttb2R1bGVJbXBvcnQsIHN5bWJvbH0gPVxuICAgICAgICAgIHRoaXMuaW1wb3J0cy5nZW5lcmF0ZU5hbWVkSW1wb3J0KGFzdC52YWx1ZS5tb2R1bGVOYW1lLCBhc3QudmFsdWUubmFtZSk7XG4gICAgICBpZiAobW9kdWxlSW1wb3J0ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoZSBzeW1ib2wgd2FzIGFtYmllbnQgYWZ0ZXIgYWxsLlxuICAgICAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoc3ltYm9sKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBY2Nlc3MobW9kdWxlSW1wb3J0LCBzeW1ib2wpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgc3ltYm9sIGlzIGFtYmllbnQsIHNvIGp1c3QgcmVmZXJlbmNlIGl0LlxuICAgICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKGFzdC52YWx1ZS5uYW1lKTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsRXhwcihhc3Q6IG8uQ29uZGl0aW9uYWxFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIGxldCBjb25kOiBURXhwcmVzc2lvbiA9IGFzdC5jb25kaXRpb24udmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuXG4gICAgLy8gT3JkaW5hcmlseSB0aGUgdGVybmFyeSBvcGVyYXRvciBpcyByaWdodC1hc3NvY2lhdGl2ZS4gVGhlIGZvbGxvd2luZyBhcmUgZXF1aXZhbGVudDpcbiAgICAvLyAgIGBhID8gYiA6IGMgPyBkIDogZWAgPT4gYGEgPyBiIDogKGMgPyBkIDogZSlgXG4gICAgLy9cbiAgICAvLyBIb3dldmVyLCBvY2Nhc2lvbmFsbHkgQW5ndWxhciBuZWVkcyB0byBwcm9kdWNlIGEgbGVmdC1hc3NvY2lhdGl2ZSBjb25kaXRpb25hbCwgc3VjaCBhcyBpblxuICAgIC8vIHRoZSBjYXNlIG9mIGEgbnVsbC1zYWZlIG5hdmlnYXRpb24gcHJvZHVjdGlvbjogYHt7YT8uYiA/IGMgOiBkfX1gLiBUaGlzIHRlbXBsYXRlIHByb2R1Y2VzXG4gICAgLy8gYSB0ZXJuYXJ5IG9mIHRoZSBmb3JtOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiByZXN0IG9mIGV4cHJlc3Npb25gXG4gICAgLy8gSWYgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24gaXMgYWxzbyBhIHRlcm5hcnkgdGhvdWdoLCB0aGlzIHdvdWxkIHByb2R1Y2UgdGhlIGZvcm06XG4gICAgLy8gICBgYSA9PSBudWxsID8gbnVsbCA6IGEuYiA/IGMgOiBkYFxuICAgIC8vIHdoaWNoLCBpZiBsZWZ0IGFzIHJpZ2h0LWFzc29jaWF0aXZlLCB3b3VsZCBiZSBpbmNvcnJlY3RseSBhc3NvY2lhdGVkIGFzOlxuICAgIC8vICAgYGEgPT0gbnVsbCA/IG51bGwgOiAoYS5iID8gYyA6IGQpYFxuICAgIC8vXG4gICAgLy8gSW4gc3VjaCBjYXNlcywgdGhlIGxlZnQtYXNzb2NpYXRpdml0eSBuZWVkcyB0byBiZSBlbmZvcmNlZCB3aXRoIHBhcmVudGhlc2VzOlxuICAgIC8vICAgYChhID09IG51bGwgPyBudWxsIDogYS5iKSA/IGMgOiBkYFxuICAgIC8vXG4gICAgLy8gU3VjaCBwYXJlbnRoZXNlcyBjb3VsZCBhbHdheXMgYmUgaW5jbHVkZWQgaW4gdGhlIGNvbmRpdGlvbiAoZ3VhcmFudGVlaW5nIGNvcnJlY3QgYmVoYXZpb3IpIGluXG4gICAgLy8gYWxsIGNhc2VzLCBidXQgdGhpcyBoYXMgYSBjb2RlIHNpemUgY29zdC4gSW5zdGVhZCwgcGFyZW50aGVzZXMgYXJlIGFkZGVkIG9ubHkgd2hlbiBhXG4gICAgLy8gY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBpcyBkaXJlY3RseSB1c2VkIGFzIHRoZSBjb25kaXRpb24gb2YgYW5vdGhlci5cbiAgICAvL1xuICAgIC8vIFRPRE8oYWx4aHViKTogaW52ZXN0aWdhdGUgYmV0dGVyIGxvZ2ljIGZvciBwcmVjZW5kZW5jZSBvZiBjb25kaXRpb25hbCBvcGVyYXRvcnNcbiAgICBpZiAoYXN0LmNvbmRpdGlvbiBpbnN0YW5jZW9mIG8uQ29uZGl0aW9uYWxFeHByKSB7XG4gICAgICAvLyBUaGUgY29uZGl0aW9uIG9mIHRoaXMgdGVybmFyeSBuZWVkcyB0byBiZSB3cmFwcGVkIGluIHBhcmVudGhlc2VzIHRvIG1haW50YWluXG4gICAgICAvLyBsZWZ0LWFzc29jaWF0aXZpdHkuXG4gICAgICBjb25kID0gdGhpcy5mYWN0b3J5LmNyZWF0ZVBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGNvbmQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlQ29uZGl0aW9uYWwoXG4gICAgICAgIGNvbmQsIGFzdC50cnVlQ2FzZS52aXNpdEV4cHJlc3Npb24odGhpcywgY29udGV4dCksXG4gICAgICAgIGFzdC5mYWxzZUNhc2UhLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdE5vdEV4cHIoYXN0OiBvLk5vdEV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVVbmFyeUV4cHJlc3Npb24oJyEnLCBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdEFzc2VydE5vdE51bGxFeHByKGFzdDogby5Bc3NlcnROb3ROdWxsLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiBhc3QuY29uZGl0aW9uLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0Q2FzdEV4cHIoYXN0OiBvLkNhc3RFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiBhc3QudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpO1xuICB9XG5cbiAgdmlzaXRGdW5jdGlvbkV4cHIoYXN0OiBvLkZ1bmN0aW9uRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgYXN0Lm5hbWUgPz8gbnVsbCwgYXN0LnBhcmFtcy5tYXAocGFyYW0gPT4gcGFyYW0ubmFtZSksXG4gICAgICAgIHRoaXMuZmFjdG9yeS5jcmVhdGVCbG9jayh0aGlzLnZpc2l0U3RhdGVtZW50cyhhc3Quc3RhdGVtZW50cywgY29udGV4dCkpKTtcbiAgfVxuXG4gIHZpc2l0QmluYXJ5T3BlcmF0b3JFeHByKGFzdDogby5CaW5hcnlPcGVyYXRvckV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgaWYgKCFCSU5BUllfT1BFUkFUT1JTLmhhcyhhc3Qub3BlcmF0b3IpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYmluYXJ5IG9wZXJhdG9yOiAke28uQmluYXJ5T3BlcmF0b3JbYXN0Lm9wZXJhdG9yXX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVCaW5hcnlFeHByZXNzaW9uKFxuICAgICAgICBhc3QubGhzLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSxcbiAgICAgICAgQklOQVJZX09QRVJBVE9SUy5nZXQoYXN0Lm9wZXJhdG9yKSEsXG4gICAgICAgIGFzdC5yaHMudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLFxuICAgICk7XG4gIH1cblxuICB2aXNpdFJlYWRQcm9wRXhwcihhc3Q6IG8uUmVhZFByb3BFeHByLCBjb250ZXh0OiBDb250ZXh0KTogVEV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0aGlzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBY2Nlc3MoYXN0LnJlY2VpdmVyLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0Lm5hbWUpO1xuICB9XG5cbiAgdmlzaXRSZWFkS2V5RXhwcihhc3Q6IG8uUmVhZEtleUV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVFbGVtZW50QWNjZXNzKFxuICAgICAgICBhc3QucmVjZWl2ZXIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpLCBhc3QuaW5kZXgudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5RXhwcihhc3Q6IG8uTGl0ZXJhbEFycmF5RXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZUFycmF5TGl0ZXJhbChhc3QuZW50cmllcy5tYXAoXG4gICAgICAgIGV4cHIgPT4gdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShleHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSwgYXN0LnNvdXJjZVNwYW4pKSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxNYXBFeHByKGFzdDogby5MaXRlcmFsTWFwRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzOiBPYmplY3RMaXRlcmFsUHJvcGVydHk8VEV4cHJlc3Npb24+W10gPSBhc3QuZW50cmllcy5tYXAoZW50cnkgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvcGVydHlOYW1lOiBlbnRyeS5rZXksXG4gICAgICAgIHF1b3RlZDogZW50cnkucXVvdGVkLFxuICAgICAgICB2YWx1ZTogZW50cnkudmFsdWUudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpXG4gICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRoaXMuZmFjdG9yeS5jcmVhdGVPYmplY3RMaXRlcmFsKHByb3BlcnRpZXMpLCBhc3Quc291cmNlU3Bhbik7XG4gIH1cblxuICB2aXNpdENvbW1hRXhwcihhc3Q6IG8uQ29tbWFFeHByLCBjb250ZXh0OiBDb250ZXh0KTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0V3JhcHBlZE5vZGVFeHByKGFzdDogby5XcmFwcGVkTm9kZUV4cHI8YW55PiwgX2NvbnRleHQ6IENvbnRleHQpOiBhbnkge1xuICAgIHRoaXMucmVjb3JkV3JhcHBlZE5vZGVFeHByKGFzdC5ub2RlKTtcbiAgICByZXR1cm4gYXN0Lm5vZGU7XG4gIH1cblxuICB2aXNpdFR5cGVvZkV4cHIoYXN0OiBvLlR5cGVvZkV4cHIsIGNvbnRleHQ6IENvbnRleHQpOiBURXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRoaXMuZmFjdG9yeS5jcmVhdGVUeXBlT2ZFeHByZXNzaW9uKGFzdC5leHByLnZpc2l0RXhwcmVzc2lvbih0aGlzLCBjb250ZXh0KSk7XG4gIH1cblxuICB2aXNpdFVuYXJ5T3BlcmF0b3JFeHByKGFzdDogby5VbmFyeU9wZXJhdG9yRXhwciwgY29udGV4dDogQ29udGV4dCk6IFRFeHByZXNzaW9uIHtcbiAgICBpZiAoIVVOQVJZX09QRVJBVE9SUy5oYXMoYXN0Lm9wZXJhdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHVuYXJ5IG9wZXJhdG9yOiAke28uVW5hcnlPcGVyYXRvclthc3Qub3BlcmF0b3JdfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mYWN0b3J5LmNyZWF0ZVVuYXJ5RXhwcmVzc2lvbihcbiAgICAgICAgVU5BUllfT1BFUkFUT1JTLmdldChhc3Qub3BlcmF0b3IpISwgYXN0LmV4cHIudmlzaXRFeHByZXNzaW9uKHRoaXMsIGNvbnRleHQpKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRTdGF0ZW1lbnRzKHN0YXRlbWVudHM6IG8uU3RhdGVtZW50W10sIGNvbnRleHQ6IENvbnRleHQpOiBUU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBzdGF0ZW1lbnRzLm1hcChzdG10ID0+IHN0bXQudmlzaXRTdGF0ZW1lbnQodGhpcywgY29udGV4dCkpXG4gICAgICAgIC5maWx0ZXIoc3RtdCA9PiBzdG10ICE9PSB1bmRlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRTb3VyY2VNYXBSYW5nZTxUIGV4dGVuZHMgVEV4cHJlc3Npb258VFN0YXRlbWVudD4oYXN0OiBULCBzcGFuOiBvLlBhcnNlU291cmNlU3BhbnxudWxsKTpcbiAgICAgIFQge1xuICAgIHJldHVybiB0aGlzLmZhY3Rvcnkuc2V0U291cmNlTWFwUmFuZ2UoYXN0LCBjcmVhdGVSYW5nZShzcGFuKSk7XG4gIH1cblxuICBwcml2YXRlIGF0dGFjaENvbW1lbnRzKHN0YXRlbWVudDogVFN0YXRlbWVudCwgbGVhZGluZ0NvbW1lbnRzOiBvLkxlYWRpbmdDb21tZW50W118dW5kZWZpbmVkKTpcbiAgICAgIFRTdGF0ZW1lbnQge1xuICAgIGlmIChsZWFkaW5nQ29tbWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5mYWN0b3J5LmF0dGFjaENvbW1lbnRzKHN0YXRlbWVudCwgbGVhZGluZ0NvbW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXRlbWVudDtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnQgYSBjb29rZWQtcmF3IHN0cmluZyBvYmplY3QgaW50byBvbmUgdGhhdCBjYW4gYmUgdXNlZCBieSB0aGUgQVNUIGZhY3Rvcmllcy5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVFbGVtZW50KFxuICAgIHtjb29rZWQsIHJhdywgcmFuZ2V9OiB7Y29va2VkOiBzdHJpbmcsIHJhdzogc3RyaW5nLCByYW5nZTogby5QYXJzZVNvdXJjZVNwYW58bnVsbH0pOlxuICAgIFRlbXBsYXRlRWxlbWVudCB7XG4gIHJldHVybiB7Y29va2VkLCByYXcsIHJhbmdlOiBjcmVhdGVSYW5nZShyYW5nZSl9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gT3V0cHV0QVNUIHNvdXJjZS1zcGFuIGludG8gYSByYW5nZSB0aGF0IGNhbiBiZSB1c2VkIGJ5IHRoZSBBU1QgZmFjdG9yaWVzLlxuICovXG5mdW5jdGlvbiBjcmVhdGVSYW5nZShzcGFuOiBvLlBhcnNlU291cmNlU3BhbnxudWxsKTogU291cmNlTWFwUmFuZ2V8bnVsbCB7XG4gIGlmIChzcGFuID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3Qge3N0YXJ0LCBlbmR9ID0gc3BhbjtcbiAgY29uc3Qge3VybCwgY29udGVudH0gPSBzdGFydC5maWxlO1xuICBpZiAoIXVybCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgdXJsLFxuICAgIGNvbnRlbnQsXG4gICAgc3RhcnQ6IHtvZmZzZXQ6IHN0YXJ0Lm9mZnNldCwgbGluZTogc3RhcnQubGluZSwgY29sdW1uOiBzdGFydC5jb2x9LFxuICAgIGVuZDoge29mZnNldDogZW5kLm9mZnNldCwgbGluZTogZW5kLmxpbmUsIGNvbHVtbjogZW5kLmNvbH0sXG4gIH07XG59XG4iXX0=