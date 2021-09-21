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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/expression", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.astToTypescript = exports.NULL_AS_ANY = void 0;
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
    exports.NULL_AS_ANY = ts.createAsExpression(ts.createNull(), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
    var UNDEFINED = ts.createIdentifier('undefined');
    var UNARY_OPS = new Map([
        ['+', ts.SyntaxKind.PlusToken],
        ['-', ts.SyntaxKind.MinusToken],
    ]);
    var BINARY_OPS = new Map([
        ['+', ts.SyntaxKind.PlusToken],
        ['-', ts.SyntaxKind.MinusToken],
        ['<', ts.SyntaxKind.LessThanToken],
        ['>', ts.SyntaxKind.GreaterThanToken],
        ['<=', ts.SyntaxKind.LessThanEqualsToken],
        ['>=', ts.SyntaxKind.GreaterThanEqualsToken],
        ['==', ts.SyntaxKind.EqualsEqualsToken],
        ['===', ts.SyntaxKind.EqualsEqualsEqualsToken],
        ['*', ts.SyntaxKind.AsteriskToken],
        ['/', ts.SyntaxKind.SlashToken],
        ['%', ts.SyntaxKind.PercentToken],
        ['!=', ts.SyntaxKind.ExclamationEqualsToken],
        ['!==', ts.SyntaxKind.ExclamationEqualsEqualsToken],
        ['||', ts.SyntaxKind.BarBarToken],
        ['&&', ts.SyntaxKind.AmpersandAmpersandToken],
        ['&', ts.SyntaxKind.AmpersandToken],
        ['|', ts.SyntaxKind.BarToken],
        ['??', ts.SyntaxKind.QuestionQuestionToken],
    ]);
    /**
     * Convert an `AST` to TypeScript code directly, without going through an intermediate `Expression`
     * AST.
     */
    function astToTypescript(ast, maybeResolve, config) {
        var translator = new AstTranslator(maybeResolve, config);
        return translator.translate(ast);
    }
    exports.astToTypescript = astToTypescript;
    var AstTranslator = /** @class */ (function () {
        function AstTranslator(maybeResolve, config) {
            this.maybeResolve = maybeResolve;
            this.config = config;
        }
        AstTranslator.prototype.translate = function (ast) {
            // Skip over an `ASTWithSource` as its `visit` method calls directly into its ast's `visit`,
            // which would prevent any custom resolution through `maybeResolve` for that node.
            if (ast instanceof compiler_1.ASTWithSource) {
                ast = ast.ast;
            }
            // The `EmptyExpr` doesn't have a dedicated method on `AstVisitor`, so it's special cased here.
            if (ast instanceof compiler_1.EmptyExpr) {
                var res = ts.factory.createIdentifier('undefined');
                diagnostics_1.addParseSpanInfo(res, ast.sourceSpan);
                return res;
            }
            // First attempt to let any custom resolution logic provide a translation for the given node.
            var resolved = this.maybeResolve(ast);
            if (resolved !== null) {
                return resolved;
            }
            return ast.visit(this);
        };
        AstTranslator.prototype.visitUnary = function (ast) {
            var expr = this.translate(ast.expr);
            var op = UNARY_OPS.get(ast.operator);
            if (op === undefined) {
                throw new Error("Unsupported Unary.operator: " + ast.operator);
            }
            var node = diagnostics_1.wrapForDiagnostics(ts.createPrefix(op, expr));
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitBinary = function (ast) {
            var lhs = diagnostics_1.wrapForDiagnostics(this.translate(ast.left));
            var rhs = diagnostics_1.wrapForDiagnostics(this.translate(ast.right));
            var op = BINARY_OPS.get(ast.operation);
            if (op === undefined) {
                throw new Error("Unsupported Binary.operation: " + ast.operation);
            }
            var node = ts.createBinary(lhs, op, rhs);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitChain = function (ast) {
            var _this = this;
            var elements = ast.expressions.map(function (expr) { return _this.translate(expr); });
            var node = diagnostics_1.wrapForDiagnostics(ts.createCommaList(elements));
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitConditional = function (ast) {
            var condExpr = this.translate(ast.condition);
            var trueExpr = this.translate(ast.trueExp);
            // Wrap `falseExpr` in parens so that the trailing parse span info is not attributed to the
            // whole conditional.
            // In the following example, the last source span comment (5,6) could be seen as the
            // trailing comment for _either_ the whole conditional expression _or_ just the `falseExpr` that
            // is immediately before it:
            // `conditional /*1,2*/ ? trueExpr /*3,4*/ : falseExpr /*5,6*/`
            // This should be instead be `conditional /*1,2*/ ? trueExpr /*3,4*/ : (falseExpr /*5,6*/)`
            var falseExpr = diagnostics_1.wrapForTypeChecker(this.translate(ast.falseExp));
            var node = ts.createParen(ts.createConditional(condExpr, trueExpr, falseExpr));
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitImplicitReceiver = function (ast) {
            throw new Error('Method not implemented.');
        };
        AstTranslator.prototype.visitThisReceiver = function (ast) {
            throw new Error('Method not implemented.');
        };
        AstTranslator.prototype.visitInterpolation = function (ast) {
            var _this = this;
            // Build up a chain of binary + operations to simulate the string concatenation of the
            // interpolation's expressions. The chain is started using an actual string literal to ensure
            // the type is inferred as 'string'.
            return ast.expressions.reduce(function (lhs, ast) {
                return ts.createBinary(lhs, ts.SyntaxKind.PlusToken, diagnostics_1.wrapForTypeChecker(_this.translate(ast)));
            }, ts.createLiteral(''));
        };
        AstTranslator.prototype.visitKeyedRead = function (ast) {
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var key = this.translate(ast.key);
            var node = ts.createElementAccess(receiver, key);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitKeyedWrite = function (ast) {
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var left = ts.createElementAccess(receiver, this.translate(ast.key));
            // TODO(joost): annotate `left` with the span of the element access, which is not currently
            //  available on `ast`.
            var right = diagnostics_1.wrapForTypeChecker(this.translate(ast.value));
            var node = diagnostics_1.wrapForDiagnostics(ts.createBinary(left, ts.SyntaxKind.EqualsToken, right));
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitLiteralArray = function (ast) {
            var _this = this;
            var elements = ast.expressions.map(function (expr) { return _this.translate(expr); });
            var literal = ts.createArrayLiteral(elements);
            // If strictLiteralTypes is disabled, array literals are cast to `any`.
            var node = this.config.strictLiteralTypes ? literal : ts_util_1.tsCastToAny(literal);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitLiteralMap = function (ast) {
            var _this = this;
            var properties = ast.keys.map(function (_a, idx) {
                var key = _a.key;
                var value = _this.translate(ast.values[idx]);
                return ts.createPropertyAssignment(ts.createStringLiteral(key), value);
            });
            var literal = ts.createObjectLiteral(properties, true);
            // If strictLiteralTypes is disabled, object literals are cast to `any`.
            var node = this.config.strictLiteralTypes ? literal : ts_util_1.tsCastToAny(literal);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitLiteralPrimitive = function (ast) {
            var node;
            if (ast.value === undefined) {
                node = ts.createIdentifier('undefined');
            }
            else if (ast.value === null) {
                node = ts.createNull();
            }
            else {
                node = ts.createLiteral(ast.value);
            }
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitNonNullAssert = function (ast) {
            var expr = diagnostics_1.wrapForDiagnostics(this.translate(ast.expression));
            var node = ts.createNonNullExpression(expr);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPipe = function (ast) {
            throw new Error('Method not implemented.');
        };
        AstTranslator.prototype.visitPrefixNot = function (ast) {
            var expression = diagnostics_1.wrapForDiagnostics(this.translate(ast.expression));
            var node = ts.createLogicalNot(expression);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPropertyRead = function (ast) {
            // This is a normal property read - convert the receiver to an expression and emit the correct
            // TypeScript expression to read the property.
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var name = ts.createPropertyAccess(receiver, ast.name);
            diagnostics_1.addParseSpanInfo(name, ast.nameSpan);
            var node = diagnostics_1.wrapForDiagnostics(name);
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPropertyWrite = function (ast) {
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var left = ts.createPropertyAccess(receiver, ast.name);
            diagnostics_1.addParseSpanInfo(left, ast.nameSpan);
            // TypeScript reports assignment errors on the entire lvalue expression. Annotate the lvalue of
            // the assignment with the sourceSpan, which includes receivers, rather than nameSpan for
            // consistency of the diagnostic location.
            // a.b.c = 1
            // ^^^^^^^^^ sourceSpan
            //     ^     nameSpan
            var leftWithPath = diagnostics_1.wrapForDiagnostics(left);
            diagnostics_1.addParseSpanInfo(leftWithPath, ast.sourceSpan);
            // The right needs to be wrapped in parens as well or we cannot accurately match its
            // span to just the RHS. For example, the span in `e = $event /*0,10*/` is ambiguous.
            // It could refer to either the whole binary expression or just the RHS.
            // We should instead generate `e = ($event /*0,10*/)` so we know the span 0,10 matches RHS.
            var right = diagnostics_1.wrapForTypeChecker(this.translate(ast.value));
            var node = diagnostics_1.wrapForDiagnostics(ts.createBinary(leftWithPath, ts.SyntaxKind.EqualsToken, right));
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitQuote = function (ast) {
            return exports.NULL_AS_ANY;
        };
        AstTranslator.prototype.visitSafePropertyRead = function (ast) {
            var node;
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            // The form of safe property reads depends on whether strictness is in use.
            if (this.config.strictSafeNavigationTypes) {
                // Basically, the return here is either the type of the complete expression with a null-safe
                // property read, or `undefined`. So a ternary is used to create an "or" type:
                // "a?.b" becomes (null as any ? a!.b : undefined)
                // The type of this expression is (typeof a!.b) | undefined, which is exactly as desired.
                var expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
                diagnostics_1.addParseSpanInfo(expr, ast.nameSpan);
                node = ts.createParen(ts.createConditional(exports.NULL_AS_ANY, expr, UNDEFINED));
            }
            else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
                // Emulate a View Engine bug where 'any' is inferred for the left-hand side of the safe
                // navigation operation. With this bug, the type of the left-hand side is regarded as any.
                // Therefore, the left-hand side only needs repeating in the output (to validate it), and then
                // 'any' is used for the rest of the expression. This is done using a comma operator:
                // "a?.b" becomes (a as any).b, which will of course have type 'any'.
                node = ts.createPropertyAccess(ts_util_1.tsCastToAny(receiver), ast.name);
            }
            else {
                // The View Engine bug isn't active, so check the entire type of the expression, but the final
                // result is still inferred as `any`.
                // "a?.b" becomes (a!.b as any)
                var expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
                diagnostics_1.addParseSpanInfo(expr, ast.nameSpan);
                node = ts_util_1.tsCastToAny(expr);
            }
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitSafeKeyedRead = function (ast) {
            var receiver = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var key = this.translate(ast.key);
            var node;
            // The form of safe property reads depends on whether strictness is in use.
            if (this.config.strictSafeNavigationTypes) {
                // "a?.[...]" becomes (null as any ? a![...] : undefined)
                var expr = ts.createElementAccess(ts.createNonNullExpression(receiver), key);
                diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
                node = ts.createParen(ts.createConditional(exports.NULL_AS_ANY, expr, UNDEFINED));
            }
            else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
                // "a?.[...]" becomes (a as any)[...]
                node = ts.createElementAccess(ts_util_1.tsCastToAny(receiver), key);
            }
            else {
                // "a?.[...]" becomes (a!.[...] as any)
                var expr = ts.createElementAccess(ts.createNonNullExpression(receiver), key);
                diagnostics_1.addParseSpanInfo(expr, ast.sourceSpan);
                node = ts_util_1.tsCastToAny(expr);
            }
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitCall = function (ast) {
            var _this = this;
            var args = ast.args.map(function (expr) { return _this.translate(expr); });
            var expr = diagnostics_1.wrapForDiagnostics(this.translate(ast.receiver));
            var node;
            // Safe property/keyed reads will produce a ternary whose value is nullable.
            // We have to generate a similar ternary around the call.
            if (ast.receiver instanceof compiler_1.SafePropertyRead || ast.receiver instanceof compiler_1.SafeKeyedRead) {
                if (this.config.strictSafeNavigationTypes) {
                    // "a?.method(...)" becomes (null as any ? a!.method(...) : undefined)
                    var call = ts.createCall(ts.createNonNullExpression(expr), undefined, args);
                    node = ts.createParen(ts.createConditional(exports.NULL_AS_ANY, call, UNDEFINED));
                }
                else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
                    // "a?.method(...)" becomes (a as any).method(...)
                    node = ts.createCall(ts_util_1.tsCastToAny(expr), undefined, args);
                }
                else {
                    // "a?.method(...)" becomes (a!.method(...) as any)
                    node = ts_util_1.tsCastToAny(ts.createCall(ts.createNonNullExpression(expr), undefined, args));
                }
            }
            else {
                node = ts.createCall(expr, undefined, args);
            }
            diagnostics_1.addParseSpanInfo(node, ast.sourceSpan);
            return node;
        };
        return AstTranslator;
    }());
    /**
     * Checks whether View Engine will infer a type of 'any' for the left-hand side of a safe navigation
     * operation.
     *
     * In View Engine's template type-checker, certain receivers of safe navigation operations will
     * cause a temporary variable to be allocated as part of the checking expression, to save the value
     * of the receiver and use it more than once in the expression. This temporary variable has type
     * 'any'. In practice, this means certain receivers cause View Engine to not check the full
     * expression, and other receivers will receive more complete checking.
     *
     * For compatibility, this logic is adapted from View Engine's expression_converter.ts so that the
     * Ivy checker can emulate this bug when needed.
     */
    var VeSafeLhsInferenceBugDetector = /** @class */ (function () {
        function VeSafeLhsInferenceBugDetector() {
        }
        VeSafeLhsInferenceBugDetector.veWillInferAnyFor = function (ast) {
            var visitor = VeSafeLhsInferenceBugDetector.SINGLETON;
            return ast instanceof compiler_1.Call ? ast.visit(visitor) : ast.receiver.visit(visitor);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitUnary = function (ast) {
            return ast.expr.visit(this);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitBinary = function (ast) {
            return ast.left.visit(this) || ast.right.visit(this);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitChain = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitConditional = function (ast) {
            return ast.condition.visit(this) || ast.trueExp.visit(this) || ast.falseExp.visit(this);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitCall = function (ast) {
            return true;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitImplicitReceiver = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitThisReceiver = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitInterpolation = function (ast) {
            var _this = this;
            return ast.expressions.some(function (exp) { return exp.visit(_this); });
        };
        VeSafeLhsInferenceBugDetector.prototype.visitKeyedRead = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitKeyedWrite = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitLiteralArray = function (ast) {
            return true;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitLiteralMap = function (ast) {
            return true;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitLiteralPrimitive = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitPipe = function (ast) {
            return true;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitPrefixNot = function (ast) {
            return ast.expression.visit(this);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitNonNullAssert = function (ast) {
            return ast.expression.visit(this);
        };
        VeSafeLhsInferenceBugDetector.prototype.visitPropertyRead = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitPropertyWrite = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitQuote = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitSafePropertyRead = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.prototype.visitSafeKeyedRead = function (ast) {
            return false;
        };
        VeSafeLhsInferenceBugDetector.SINGLETON = new VeSafeLhsInferenceBugDetector();
        return VeSafeLhsInferenceBugDetector;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9leHByZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFtVjtJQUNuViwrQkFBaUM7SUFJakMseUZBQXVGO0lBQ3ZGLGlGQUFzQztJQUV6QixRQUFBLFdBQVcsR0FDcEIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQy9GLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBaUM7UUFDeEQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7UUFDOUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7S0FDaEMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQTRCO1FBQ3BELENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO1FBQzlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ2xDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFDckMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztRQUN6QyxD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LENBQUM7UUFDcEMsQ0FBQztRQUNELHlEQUFpQixHQUFqQixVQUFrQixHQUFpQjtZQUNqQyxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCwwREFBa0IsR0FBbEIsVUFBbUIsR0FBa0I7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0Qsa0RBQVUsR0FBVixVQUFXLEdBQVU7WUFDbkIsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0QsNkRBQXFCLEdBQXJCLFVBQXNCLEdBQXFCO1lBQ3pDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELDBEQUFrQixHQUFsQixVQUFtQixHQUFrQjtZQUNuQyxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFyRWMsdUNBQVMsR0FBRyxJQUFJLDZCQUE2QixFQUFFLENBQUM7UUFzRWpFLG9DQUFDO0tBQUEsQUF2RUQsSUF1RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFzdFZpc2l0b3IsIEFTVFdpdGhTb3VyY2UsIEJpbmFyeSwgQmluZGluZ1BpcGUsIENhbGwsIENoYWluLCBDb25kaXRpb25hbCwgRW1wdHlFeHByLCBJbXBsaWNpdFJlY2VpdmVyLCBJbnRlcnBvbGF0aW9uLCBLZXllZFJlYWQsIEtleWVkV3JpdGUsIExpdGVyYWxBcnJheSwgTGl0ZXJhbE1hcCwgTGl0ZXJhbFByaW1pdGl2ZSwgTm9uTnVsbEFzc2VydCwgUHJlZml4Tm90LCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFF1b3RlLCBTYWZlS2V5ZWRSZWFkLCBTYWZlUHJvcGVydHlSZWFkLCBUaGlzUmVjZWl2ZXIsIFVuYXJ5fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7YWRkUGFyc2VTcGFuSW5mbywgd3JhcEZvckRpYWdub3N0aWNzLCB3cmFwRm9yVHlwZUNoZWNrZXJ9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHt0c0Nhc3RUb0FueX0gZnJvbSAnLi90c191dGlsJztcblxuZXhwb3J0IGNvbnN0IE5VTExfQVNfQU5ZID1cbiAgICB0cy5jcmVhdGVBc0V4cHJlc3Npb24odHMuY3JlYXRlTnVsbCgpLCB0cy5jcmVhdGVLZXl3b3JkVHlwZU5vZGUodHMuU3ludGF4S2luZC5BbnlLZXl3b3JkKSk7XG5jb25zdCBVTkRFRklORUQgPSB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcblxuY29uc3QgVU5BUllfT1BTID0gbmV3IE1hcDxzdHJpbmcsIHRzLlByZWZpeFVuYXJ5T3BlcmF0b3I+KFtcbiAgWycrJywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuICBbJy0nLCB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW5dLFxuXSk7XG5cbmNvbnN0IEJJTkFSWV9PUFMgPSBuZXcgTWFwPHN0cmluZywgdHMuQmluYXJ5T3BlcmF0b3I+KFtcbiAgWycrJywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW5dLFxuICBbJy0nLCB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW5dLFxuICBbJzwnLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW5dLFxuICBbJz4nLCB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW5dLFxuICBbJzw9JywgdHMuU3ludGF4S2luZC5MZXNzVGhhbkVxdWFsc1Rva2VuXSxcbiAgWyc+PScsIHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbl0sXG4gIFsnPT0nLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgWyc9PT0nLCB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuXSxcbiAgWycqJywgdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuXSxcbiAgWycvJywgdHMuU3ludGF4S2luZC5TbGFzaFRva2VuXSxcbiAgWyclJywgdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW5dLFxuICBbJyE9JywgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuXSxcbiAgWychPT0nLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbJ3x8JywgdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbl0sXG4gIFsnJiYnLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuXSxcbiAgWycmJywgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbl0sXG4gIFsnfCcsIHRzLlN5bnRheEtpbmQuQmFyVG9rZW5dLFxuICBbJz8/JywgdHMuU3ludGF4S2luZC5RdWVzdGlvblF1ZXN0aW9uVG9rZW5dLFxuXSk7XG5cbi8qKlxuICogQ29udmVydCBhbiBgQVNUYCB0byBUeXBlU2NyaXB0IGNvZGUgZGlyZWN0bHksIHdpdGhvdXQgZ29pbmcgdGhyb3VnaCBhbiBpbnRlcm1lZGlhdGUgYEV4cHJlc3Npb25gXG4gKiBBU1QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3RUb1R5cGVzY3JpcHQoXG4gICAgYXN0OiBBU1QsIG1heWJlUmVzb2x2ZTogKGFzdDogQVNUKSA9PiAodHMuRXhwcmVzc2lvbiB8IG51bGwpLFxuICAgIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHRyYW5zbGF0b3IgPSBuZXcgQXN0VHJhbnNsYXRvcihtYXliZVJlc29sdmUsIGNvbmZpZyk7XG4gIHJldHVybiB0cmFuc2xhdG9yLnRyYW5zbGF0ZShhc3QpO1xufVxuXG5jbGFzcyBBc3RUcmFuc2xhdG9yIGltcGxlbWVudHMgQXN0VmlzaXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBtYXliZVJlc29sdmU6IChhc3Q6IEFTVCkgPT4gKHRzLkV4cHJlc3Npb24gfCBudWxsKSxcbiAgICAgIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcpIHt9XG5cbiAgdHJhbnNsYXRlKGFzdDogQVNUKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gU2tpcCBvdmVyIGFuIGBBU1RXaXRoU291cmNlYCBhcyBpdHMgYHZpc2l0YCBtZXRob2QgY2FsbHMgZGlyZWN0bHkgaW50byBpdHMgYXN0J3MgYHZpc2l0YCxcbiAgICAvLyB3aGljaCB3b3VsZCBwcmV2ZW50IGFueSBjdXN0b20gcmVzb2x1dGlvbiB0aHJvdWdoIGBtYXliZVJlc29sdmVgIGZvciB0aGF0IG5vZGUuXG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIEFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIGFzdCA9IGFzdC5hc3Q7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBFbXB0eUV4cHJgIGRvZXNuJ3QgaGF2ZSBhIGRlZGljYXRlZCBtZXRob2Qgb24gYEFzdFZpc2l0b3JgLCBzbyBpdCdzIHNwZWNpYWwgY2FzZWQgaGVyZS5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgRW1wdHlFeHByKSB7XG4gICAgICBjb25zdCByZXMgPSB0cy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhyZXMsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QgYXR0ZW1wdCB0byBsZXQgYW55IGN1c3RvbSByZXNvbHV0aW9uIGxvZ2ljIHByb3ZpZGUgYSB0cmFuc2xhdGlvbiBmb3IgdGhlIGdpdmVuIG5vZGUuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLm1heWJlUmVzb2x2ZShhc3QpO1xuICAgIGlmIChyZXNvbHZlZCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgIH1cblxuICAgIHJldHVybiBhc3QudmlzaXQodGhpcyk7XG4gIH1cblxuICB2aXNpdFVuYXJ5KGFzdDogVW5hcnkpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmV4cHIpO1xuICAgIGNvbnN0IG9wID0gVU5BUllfT1BTLmdldChhc3Qub3BlcmF0b3IpO1xuICAgIGlmIChvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIFVuYXJ5Lm9wZXJhdG9yOiAke2FzdC5vcGVyYXRvcn1gKTtcbiAgICB9XG4gICAgY29uc3Qgbm9kZSA9IHdyYXBGb3JEaWFnbm9zdGljcyh0cy5jcmVhdGVQcmVmaXgob3AsIGV4cHIpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0QmluYXJ5KGFzdDogQmluYXJ5KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbGhzID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5sZWZ0KSk7XG4gICAgY29uc3QgcmhzID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yaWdodCkpO1xuICAgIGNvbnN0IG9wID0gQklOQVJZX09QUy5nZXQoYXN0Lm9wZXJhdGlvbik7XG4gICAgaWYgKG9wID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgQmluYXJ5Lm9wZXJhdGlvbjogJHthc3Qub3BlcmF0aW9ufWApO1xuICAgIH1cbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlQmluYXJ5KGxocywgb3AsIHJocyk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdENoYWluKGFzdDogQ2hhaW4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBlbGVtZW50cyA9IGFzdC5leHByZXNzaW9ucy5tYXAoZXhwciA9PiB0aGlzLnRyYW5zbGF0ZShleHByKSk7XG4gICAgY29uc3Qgbm9kZSA9IHdyYXBGb3JEaWFnbm9zdGljcyh0cy5jcmVhdGVDb21tYUxpc3QoZWxlbWVudHMpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWwoYXN0OiBDb25kaXRpb25hbCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGNvbmRFeHByID0gdGhpcy50cmFuc2xhdGUoYXN0LmNvbmRpdGlvbik7XG4gICAgY29uc3QgdHJ1ZUV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QudHJ1ZUV4cCk7XG4gICAgLy8gV3JhcCBgZmFsc2VFeHByYCBpbiBwYXJlbnMgc28gdGhhdCB0aGUgdHJhaWxpbmcgcGFyc2Ugc3BhbiBpbmZvIGlzIG5vdCBhdHRyaWJ1dGVkIHRvIHRoZVxuICAgIC8vIHdob2xlIGNvbmRpdGlvbmFsLlxuICAgIC8vIEluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSwgdGhlIGxhc3Qgc291cmNlIHNwYW4gY29tbWVudCAoNSw2KSBjb3VsZCBiZSBzZWVuIGFzIHRoZVxuICAgIC8vIHRyYWlsaW5nIGNvbW1lbnQgZm9yIF9laXRoZXJfIHRoZSB3aG9sZSBjb25kaXRpb25hbCBleHByZXNzaW9uIF9vcl8ganVzdCB0aGUgYGZhbHNlRXhwcmAgdGhhdFxuICAgIC8vIGlzIGltbWVkaWF0ZWx5IGJlZm9yZSBpdDpcbiAgICAvLyBgY29uZGl0aW9uYWwgLyoxLDIqLyA/IHRydWVFeHByIC8qMyw0Ki8gOiBmYWxzZUV4cHIgLyo1LDYqL2BcbiAgICAvLyBUaGlzIHNob3VsZCBiZSBpbnN0ZWFkIGJlIGBjb25kaXRpb25hbCAvKjEsMiovID8gdHJ1ZUV4cHIgLyozLDQqLyA6IChmYWxzZUV4cHIgLyo1LDYqLylgXG4gICAgY29uc3QgZmFsc2VFeHByID0gd3JhcEZvclR5cGVDaGVja2VyKHRoaXMudHJhbnNsYXRlKGFzdC5mYWxzZUV4cCkpO1xuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVDb25kaXRpb25hbChjb25kRXhwciwgdHJ1ZUV4cHIsIGZhbHNlRXhwcikpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRJbXBsaWNpdFJlY2VpdmVyKGFzdDogSW1wbGljaXRSZWNlaXZlcik6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFRoaXNSZWNlaXZlcihhc3Q6IFRoaXNSZWNlaXZlcik6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdEludGVycG9sYXRpb24oYXN0OiBJbnRlcnBvbGF0aW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gQnVpbGQgdXAgYSBjaGFpbiBvZiBiaW5hcnkgKyBvcGVyYXRpb25zIHRvIHNpbXVsYXRlIHRoZSBzdHJpbmcgY29uY2F0ZW5hdGlvbiBvZiB0aGVcbiAgICAvLyBpbnRlcnBvbGF0aW9uJ3MgZXhwcmVzc2lvbnMuIFRoZSBjaGFpbiBpcyBzdGFydGVkIHVzaW5nIGFuIGFjdHVhbCBzdHJpbmcgbGl0ZXJhbCB0byBlbnN1cmVcbiAgICAvLyB0aGUgdHlwZSBpcyBpbmZlcnJlZCBhcyAnc3RyaW5nJy5cbiAgICByZXR1cm4gYXN0LmV4cHJlc3Npb25zLnJlZHVjZShcbiAgICAgICAgKGxocywgYXN0KSA9PlxuICAgICAgICAgICAgdHMuY3JlYXRlQmluYXJ5KGxocywgdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIHdyYXBGb3JUeXBlQ2hlY2tlcih0aGlzLnRyYW5zbGF0ZShhc3QpKSksXG4gICAgICAgIHRzLmNyZWF0ZUxpdGVyYWwoJycpKTtcbiAgfVxuXG4gIHZpc2l0S2V5ZWRSZWFkKGFzdDogS2V5ZWRSZWFkKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3Qga2V5ID0gdGhpcy50cmFuc2xhdGUoYXN0LmtleSk7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MocmVjZWl2ZXIsIGtleSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdEtleWVkV3JpdGUoYXN0OiBLZXllZFdyaXRlKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3QgbGVmdCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MocmVjZWl2ZXIsIHRoaXMudHJhbnNsYXRlKGFzdC5rZXkpKTtcbiAgICAvLyBUT0RPKGpvb3N0KTogYW5ub3RhdGUgYGxlZnRgIHdpdGggdGhlIHNwYW4gb2YgdGhlIGVsZW1lbnQgYWNjZXNzLCB3aGljaCBpcyBub3QgY3VycmVudGx5XG4gICAgLy8gIGF2YWlsYWJsZSBvbiBgYXN0YC5cbiAgICBjb25zdCByaWdodCA9IHdyYXBGb3JUeXBlQ2hlY2tlcih0aGlzLnRyYW5zbGF0ZShhc3QudmFsdWUpKTtcbiAgICBjb25zdCBub2RlID0gd3JhcEZvckRpYWdub3N0aWNzKHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCByaWdodCkpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsQXJyYXkoYXN0OiBMaXRlcmFsQXJyYXkpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBlbGVtZW50cyA9IGFzdC5leHByZXNzaW9ucy5tYXAoZXhwciA9PiB0aGlzLnRyYW5zbGF0ZShleHByKSk7XG4gICAgY29uc3QgbGl0ZXJhbCA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChlbGVtZW50cyk7XG4gICAgLy8gSWYgc3RyaWN0TGl0ZXJhbFR5cGVzIGlzIGRpc2FibGVkLCBhcnJheSBsaXRlcmFscyBhcmUgY2FzdCB0byBgYW55YC5cbiAgICBjb25zdCBub2RlID0gdGhpcy5jb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID8gbGl0ZXJhbCA6IHRzQ2FzdFRvQW55KGxpdGVyYWwpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBhc3Qua2V5cy5tYXAoKHtrZXl9LCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlc1tpZHhdKTtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQodHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChrZXkpLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgY29uc3QgbGl0ZXJhbCA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG4gICAgLy8gSWYgc3RyaWN0TGl0ZXJhbFR5cGVzIGlzIGRpc2FibGVkLCBvYmplY3QgbGl0ZXJhbHMgYXJlIGNhc3QgdG8gYGFueWAuXG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuY29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA/IGxpdGVyYWwgOiB0c0Nhc3RUb0FueShsaXRlcmFsKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcbiAgICBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0OiBOb25OdWxsQXNzZXJ0KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QuZXhwcmVzc2lvbikpO1xuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0UGlwZShhc3Q6IEJpbmRpbmdQaXBlKTogbmV2ZXIge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHZpc2l0UHJlZml4Tm90KGFzdDogUHJlZml4Tm90KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QuZXhwcmVzc2lvbikpO1xuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVMb2dpY2FsTm90KGV4cHJlc3Npb24pO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0OiBQcm9wZXJ0eVJlYWQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBUaGlzIGlzIGEgbm9ybWFsIHByb3BlcnR5IHJlYWQgLSBjb252ZXJ0IHRoZSByZWNlaXZlciB0byBhbiBleHByZXNzaW9uIGFuZCBlbWl0IHRoZSBjb3JyZWN0XG4gICAgLy8gVHlwZVNjcmlwdCBleHByZXNzaW9uIHRvIHJlYWQgdGhlIHByb3BlcnR5LlxuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yZWNlaXZlcikpO1xuICAgIGNvbnN0IG5hbWUgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWNlaXZlciwgYXN0Lm5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obmFtZSwgYXN0Lm5hbWVTcGFuKTtcbiAgICBjb25zdCBub2RlID0gd3JhcEZvckRpYWdub3N0aWNzKG5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yZWNlaXZlcikpO1xuICAgIGNvbnN0IGxlZnQgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2VzcyhyZWNlaXZlciwgYXN0Lm5hbWUpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obGVmdCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAvLyBUeXBlU2NyaXB0IHJlcG9ydHMgYXNzaWdubWVudCBlcnJvcnMgb24gdGhlIGVudGlyZSBsdmFsdWUgZXhwcmVzc2lvbi4gQW5ub3RhdGUgdGhlIGx2YWx1ZSBvZlxuICAgIC8vIHRoZSBhc3NpZ25tZW50IHdpdGggdGhlIHNvdXJjZVNwYW4sIHdoaWNoIGluY2x1ZGVzIHJlY2VpdmVycywgcmF0aGVyIHRoYW4gbmFtZVNwYW4gZm9yXG4gICAgLy8gY29uc2lzdGVuY3kgb2YgdGhlIGRpYWdub3N0aWMgbG9jYXRpb24uXG4gICAgLy8gYS5iLmMgPSAxXG4gICAgLy8gXl5eXl5eXl5eIHNvdXJjZVNwYW5cbiAgICAvLyAgICAgXiAgICAgbmFtZVNwYW5cbiAgICBjb25zdCBsZWZ0V2l0aFBhdGggPSB3cmFwRm9yRGlhZ25vc3RpY3MobGVmdCk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhsZWZ0V2l0aFBhdGgsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAvLyBUaGUgcmlnaHQgbmVlZHMgdG8gYmUgd3JhcHBlZCBpbiBwYXJlbnMgYXMgd2VsbCBvciB3ZSBjYW5ub3QgYWNjdXJhdGVseSBtYXRjaCBpdHNcbiAgICAvLyBzcGFuIHRvIGp1c3QgdGhlIFJIUy4gRm9yIGV4YW1wbGUsIHRoZSBzcGFuIGluIGBlID0gJGV2ZW50IC8qMCwxMCovYCBpcyBhbWJpZ3VvdXMuXG4gICAgLy8gSXQgY291bGQgcmVmZXIgdG8gZWl0aGVyIHRoZSB3aG9sZSBiaW5hcnkgZXhwcmVzc2lvbiBvciBqdXN0IHRoZSBSSFMuXG4gICAgLy8gV2Ugc2hvdWxkIGluc3RlYWQgZ2VuZXJhdGUgYGUgPSAoJGV2ZW50IC8qMCwxMCovKWAgc28gd2Uga25vdyB0aGUgc3BhbiAwLDEwIG1hdGNoZXMgUkhTLlxuICAgIGNvbnN0IHJpZ2h0ID0gd3JhcEZvclR5cGVDaGVja2VyKHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZSkpO1xuICAgIGNvbnN0IG5vZGUgPVxuICAgICAgICB3cmFwRm9yRGlhZ25vc3RpY3ModHMuY3JlYXRlQmluYXJ5KGxlZnRXaXRoUGF0aCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgcmlnaHQpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0UXVvdGUoYXN0OiBRdW90ZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiBOVUxMX0FTX0FOWTtcbiAgfVxuXG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICAvLyBUaGUgZm9ybSBvZiBzYWZlIHByb3BlcnR5IHJlYWRzIGRlcGVuZHMgb24gd2hldGhlciBzdHJpY3RuZXNzIGlzIGluIHVzZS5cbiAgICBpZiAodGhpcy5jb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcykge1xuICAgICAgLy8gQmFzaWNhbGx5LCB0aGUgcmV0dXJuIGhlcmUgaXMgZWl0aGVyIHRoZSB0eXBlIG9mIHRoZSBjb21wbGV0ZSBleHByZXNzaW9uIHdpdGggYSBudWxsLXNhZmVcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQsIG9yIGB1bmRlZmluZWRgLiBTbyBhIHRlcm5hcnkgaXMgdXNlZCB0byBjcmVhdGUgYW4gXCJvclwiIHR5cGU6XG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChudWxsIGFzIGFueSA/IGEhLmIgOiB1bmRlZmluZWQpXG4gICAgICAvLyBUaGUgdHlwZSBvZiB0aGlzIGV4cHJlc3Npb24gaXMgKHR5cGVvZiBhIS5iKSB8IHVuZGVmaW5lZCwgd2hpY2ggaXMgZXhhY3RseSBhcyBkZXNpcmVkLlxuICAgICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3QubmFtZVNwYW4pO1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKE5VTExfQVNfQU5ZLCBleHByLCBVTkRFRklORUQpKTtcbiAgICB9IGVsc2UgaWYgKFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yLnZlV2lsbEluZmVyQW55Rm9yKGFzdCkpIHtcbiAgICAgIC8vIEVtdWxhdGUgYSBWaWV3IEVuZ2luZSBidWcgd2hlcmUgJ2FueScgaXMgaW5mZXJyZWQgZm9yIHRoZSBsZWZ0LWhhbmQgc2lkZSBvZiB0aGUgc2FmZVxuICAgICAgLy8gbmF2aWdhdGlvbiBvcGVyYXRpb24uIFdpdGggdGhpcyBidWcsIHRoZSB0eXBlIG9mIHRoZSBsZWZ0LWhhbmQgc2lkZSBpcyByZWdhcmRlZCBhcyBhbnkuXG4gICAgICAvLyBUaGVyZWZvcmUsIHRoZSBsZWZ0LWhhbmQgc2lkZSBvbmx5IG5lZWRzIHJlcGVhdGluZyBpbiB0aGUgb3V0cHV0ICh0byB2YWxpZGF0ZSBpdCksIGFuZCB0aGVuXG4gICAgICAvLyAnYW55JyBpcyB1c2VkIGZvciB0aGUgcmVzdCBvZiB0aGUgZXhwcmVzc2lvbi4gVGhpcyBpcyBkb25lIHVzaW5nIGEgY29tbWEgb3BlcmF0b3I6XG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChhIGFzIGFueSkuYiwgd2hpY2ggd2lsbCBvZiBjb3Vyc2UgaGF2ZSB0eXBlICdhbnknLlxuICAgICAgbm9kZSA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzQ2FzdFRvQW55KHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgVmlldyBFbmdpbmUgYnVnIGlzbid0IGFjdGl2ZSwgc28gY2hlY2sgdGhlIGVudGlyZSB0eXBlIG9mIHRoZSBleHByZXNzaW9uLCBidXQgdGhlIGZpbmFsXG4gICAgICAvLyByZXN1bHQgaXMgc3RpbGwgaW5mZXJyZWQgYXMgYGFueWAuXG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChhIS5iIGFzIGFueSlcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIG5vZGUgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdFNhZmVLZXllZFJlYWQoYXN0OiBTYWZlS2V5ZWRSZWFkKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3Qga2V5ID0gdGhpcy50cmFuc2xhdGUoYXN0LmtleSk7XG4gICAgbGV0IG5vZGU6IHRzLkV4cHJlc3Npb247XG5cbiAgICAvLyBUaGUgZm9ybSBvZiBzYWZlIHByb3BlcnR5IHJlYWRzIGRlcGVuZHMgb24gd2hldGhlciBzdHJpY3RuZXNzIGlzIGluIHVzZS5cbiAgICBpZiAodGhpcy5jb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcykge1xuICAgICAgLy8gXCJhPy5bLi4uXVwiIGJlY29tZXMgKG51bGwgYXMgYW55ID8gYSFbLi4uXSA6IHVuZGVmaW5lZClcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwga2V5KTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKE5VTExfQVNfQU5ZLCBleHByLCBVTkRFRklORUQpKTtcbiAgICB9IGVsc2UgaWYgKFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yLnZlV2lsbEluZmVyQW55Rm9yKGFzdCkpIHtcbiAgICAgIC8vIFwiYT8uWy4uLl1cIiBiZWNvbWVzIChhIGFzIGFueSlbLi4uXVxuICAgICAgbm9kZSA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3ModHNDYXN0VG9BbnkocmVjZWl2ZXIpLCBrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBcImE/LlsuLi5dXCIgYmVjb21lcyAoYSEuWy4uLl0gYXMgYW55KVxuICAgICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3ModHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24ocmVjZWl2ZXIpLCBrZXkpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICBub2RlID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRDYWxsKGFzdDogQ2FsbCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoZXhwciA9PiB0aGlzLnRyYW5zbGF0ZShleHByKSk7XG4gICAgY29uc3QgZXhwciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcblxuICAgIC8vIFNhZmUgcHJvcGVydHkva2V5ZWQgcmVhZHMgd2lsbCBwcm9kdWNlIGEgdGVybmFyeSB3aG9zZSB2YWx1ZSBpcyBudWxsYWJsZS5cbiAgICAvLyBXZSBoYXZlIHRvIGdlbmVyYXRlIGEgc2ltaWxhciB0ZXJuYXJ5IGFyb3VuZCB0aGUgY2FsbC5cbiAgICBpZiAoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCBhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBTYWZlS2V5ZWRSZWFkKSB7XG4gICAgICBpZiAodGhpcy5jb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcykge1xuICAgICAgICAvLyBcImE/Lm1ldGhvZCguLi4pXCIgYmVjb21lcyAobnVsbCBhcyBhbnkgPyBhIS5tZXRob2QoLi4uKSA6IHVuZGVmaW5lZClcbiAgICAgICAgY29uc3QgY2FsbCA9IHRzLmNyZWF0ZUNhbGwodHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwciksIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgIG5vZGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVDb25kaXRpb25hbChOVUxMX0FTX0FOWSwgY2FsbCwgVU5ERUZJTkVEKSk7XG4gICAgICB9IGVsc2UgaWYgKFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yLnZlV2lsbEluZmVyQW55Rm9yKGFzdCkpIHtcbiAgICAgICAgLy8gXCJhPy5tZXRob2QoLi4uKVwiIGJlY29tZXMgKGEgYXMgYW55KS5tZXRob2QoLi4uKVxuICAgICAgICBub2RlID0gdHMuY3JlYXRlQ2FsbCh0c0Nhc3RUb0FueShleHByKSwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFwiYT8ubWV0aG9kKC4uLilcIiBiZWNvbWVzIChhIS5tZXRob2QoLi4uKSBhcyBhbnkpXG4gICAgICAgIG5vZGUgPSB0c0Nhc3RUb0FueSh0cy5jcmVhdGVDYWxsKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpLCB1bmRlZmluZWQsIGFyZ3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZUNhbGwoZXhwciwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICB9XG5cbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIFZpZXcgRW5naW5lIHdpbGwgaW5mZXIgYSB0eXBlIG9mICdhbnknIGZvciB0aGUgbGVmdC1oYW5kIHNpZGUgb2YgYSBzYWZlIG5hdmlnYXRpb25cbiAqIG9wZXJhdGlvbi5cbiAqXG4gKiBJbiBWaWV3IEVuZ2luZSdzIHRlbXBsYXRlIHR5cGUtY2hlY2tlciwgY2VydGFpbiByZWNlaXZlcnMgb2Ygc2FmZSBuYXZpZ2F0aW9uIG9wZXJhdGlvbnMgd2lsbFxuICogY2F1c2UgYSB0ZW1wb3JhcnkgdmFyaWFibGUgdG8gYmUgYWxsb2NhdGVkIGFzIHBhcnQgb2YgdGhlIGNoZWNraW5nIGV4cHJlc3Npb24sIHRvIHNhdmUgdGhlIHZhbHVlXG4gKiBvZiB0aGUgcmVjZWl2ZXIgYW5kIHVzZSBpdCBtb3JlIHRoYW4gb25jZSBpbiB0aGUgZXhwcmVzc2lvbi4gVGhpcyB0ZW1wb3JhcnkgdmFyaWFibGUgaGFzIHR5cGVcbiAqICdhbnknLiBJbiBwcmFjdGljZSwgdGhpcyBtZWFucyBjZXJ0YWluIHJlY2VpdmVycyBjYXVzZSBWaWV3IEVuZ2luZSB0byBub3QgY2hlY2sgdGhlIGZ1bGxcbiAqIGV4cHJlc3Npb24sIGFuZCBvdGhlciByZWNlaXZlcnMgd2lsbCByZWNlaXZlIG1vcmUgY29tcGxldGUgY2hlY2tpbmcuXG4gKlxuICogRm9yIGNvbXBhdGliaWxpdHksIHRoaXMgbG9naWMgaXMgYWRhcHRlZCBmcm9tIFZpZXcgRW5naW5lJ3MgZXhwcmVzc2lvbl9jb252ZXJ0ZXIudHMgc28gdGhhdCB0aGVcbiAqIEl2eSBjaGVja2VyIGNhbiBlbXVsYXRlIHRoaXMgYnVnIHdoZW4gbmVlZGVkLlxuICovXG5jbGFzcyBWZVNhZmVMaHNJbmZlcmVuY2VCdWdEZXRlY3RvciBpbXBsZW1lbnRzIEFzdFZpc2l0b3Ige1xuICBwcml2YXRlIHN0YXRpYyBTSU5HTEVUT04gPSBuZXcgVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IoKTtcblxuICBzdGF0aWMgdmVXaWxsSW5mZXJBbnlGb3IoYXN0OiBDYWxsfFNhZmVQcm9wZXJ0eVJlYWR8U2FmZUtleWVkUmVhZCkge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBWZVNhZmVMaHNJbmZlcmVuY2VCdWdEZXRlY3Rvci5TSU5HTEVUT047XG4gICAgcmV0dXJuIGFzdCBpbnN0YW5jZW9mIENhbGwgPyBhc3QudmlzaXQodmlzaXRvcikgOiBhc3QucmVjZWl2ZXIudmlzaXQodmlzaXRvcik7XG4gIH1cblxuICB2aXNpdFVuYXJ5KGFzdDogVW5hcnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmV4cHIudmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXRCaW5hcnkoYXN0OiBCaW5hcnkpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmxlZnQudmlzaXQodGhpcykgfHwgYXN0LnJpZ2h0LnZpc2l0KHRoaXMpO1xuICB9XG4gIHZpc2l0Q2hhaW4oYXN0OiBDaGFpbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdENvbmRpdGlvbmFsKGFzdDogQ29uZGl0aW9uYWwpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmNvbmRpdGlvbi52aXNpdCh0aGlzKSB8fCBhc3QudHJ1ZUV4cC52aXNpdCh0aGlzKSB8fCBhc3QuZmFsc2VFeHAudmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXRDYWxsKGFzdDogQ2FsbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0SW1wbGljaXRSZWNlaXZlcihhc3Q6IEltcGxpY2l0UmVjZWl2ZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRUaGlzUmVjZWl2ZXIoYXN0OiBUaGlzUmVjZWl2ZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdDogSW50ZXJwb2xhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QuZXhwcmVzc2lvbnMuc29tZShleHAgPT4gZXhwLnZpc2l0KHRoaXMpKTtcbiAgfVxuICB2aXNpdEtleWVkUmVhZChhc3Q6IEtleWVkUmVhZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdEtleWVkV3JpdGUoYXN0OiBLZXllZFdyaXRlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0TGl0ZXJhbEFycmF5KGFzdDogTGl0ZXJhbEFycmF5KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRQaXBlKGFzdDogQmluZGluZ1BpcGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2aXNpdFByZWZpeE5vdChhc3Q6IFByZWZpeE5vdCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QuZXhwcmVzc2lvbi52aXNpdCh0aGlzKTtcbiAgfVxuICB2aXNpdE5vbk51bGxBc3NlcnQoYXN0OiBQcmVmaXhOb3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmV4cHJlc3Npb24udmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXRQcm9wZXJ0eVJlYWQoYXN0OiBQcm9wZXJ0eVJlYWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdFF1b3RlKGFzdDogUXVvdGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRTYWZlUHJvcGVydHlSZWFkKGFzdDogU2FmZVByb3BlcnR5UmVhZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdFNhZmVLZXllZFJlYWQoYXN0OiBTYWZlS2V5ZWRSZWFkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=