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
                (0, diagnostics_1.addParseSpanInfo)(res, ast.sourceSpan);
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
            var node = (0, diagnostics_1.wrapForDiagnostics)(ts.createPrefix(op, expr));
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitBinary = function (ast) {
            var lhs = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.left));
            var rhs = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.right));
            var op = BINARY_OPS.get(ast.operation);
            if (op === undefined) {
                throw new Error("Unsupported Binary.operation: " + ast.operation);
            }
            var node = ts.createBinary(lhs, op, rhs);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitChain = function (ast) {
            var _this = this;
            var elements = ast.expressions.map(function (expr) { return _this.translate(expr); });
            var node = (0, diagnostics_1.wrapForDiagnostics)(ts.createCommaList(elements));
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
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
            var falseExpr = (0, diagnostics_1.wrapForTypeChecker)(this.translate(ast.falseExp));
            var node = ts.createParen(ts.createConditional(condExpr, trueExpr, falseExpr));
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
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
                return ts.createBinary(lhs, ts.SyntaxKind.PlusToken, (0, diagnostics_1.wrapForTypeChecker)(_this.translate(ast)));
            }, ts.createLiteral(''));
        };
        AstTranslator.prototype.visitKeyedRead = function (ast) {
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            var key = this.translate(ast.key);
            var node = ts.createElementAccess(receiver, key);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitKeyedWrite = function (ast) {
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            var left = ts.createElementAccess(receiver, this.translate(ast.key));
            // TODO(joost): annotate `left` with the span of the element access, which is not currently
            //  available on `ast`.
            var right = (0, diagnostics_1.wrapForTypeChecker)(this.translate(ast.value));
            var node = (0, diagnostics_1.wrapForDiagnostics)(ts.createBinary(left, ts.SyntaxKind.EqualsToken, right));
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitLiteralArray = function (ast) {
            var _this = this;
            var elements = ast.expressions.map(function (expr) { return _this.translate(expr); });
            var literal = ts.createArrayLiteral(elements);
            // If strictLiteralTypes is disabled, array literals are cast to `any`.
            var node = this.config.strictLiteralTypes ? literal : (0, ts_util_1.tsCastToAny)(literal);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
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
            var node = this.config.strictLiteralTypes ? literal : (0, ts_util_1.tsCastToAny)(literal);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
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
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitNonNullAssert = function (ast) {
            var expr = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.expression));
            var node = ts.createNonNullExpression(expr);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPipe = function (ast) {
            throw new Error('Method not implemented.');
        };
        AstTranslator.prototype.visitPrefixNot = function (ast) {
            var expression = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.expression));
            var node = ts.createLogicalNot(expression);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPropertyRead = function (ast) {
            // This is a normal property read - convert the receiver to an expression and emit the correct
            // TypeScript expression to read the property.
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            var name = ts.createPropertyAccess(receiver, ast.name);
            (0, diagnostics_1.addParseSpanInfo)(name, ast.nameSpan);
            var node = (0, diagnostics_1.wrapForDiagnostics)(name);
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitPropertyWrite = function (ast) {
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            var left = ts.createPropertyAccess(receiver, ast.name);
            (0, diagnostics_1.addParseSpanInfo)(left, ast.nameSpan);
            // TypeScript reports assignment errors on the entire lvalue expression. Annotate the lvalue of
            // the assignment with the sourceSpan, which includes receivers, rather than nameSpan for
            // consistency of the diagnostic location.
            // a.b.c = 1
            // ^^^^^^^^^ sourceSpan
            //     ^     nameSpan
            var leftWithPath = (0, diagnostics_1.wrapForDiagnostics)(left);
            (0, diagnostics_1.addParseSpanInfo)(leftWithPath, ast.sourceSpan);
            // The right needs to be wrapped in parens as well or we cannot accurately match its
            // span to just the RHS. For example, the span in `e = $event /*0,10*/` is ambiguous.
            // It could refer to either the whole binary expression or just the RHS.
            // We should instead generate `e = ($event /*0,10*/)` so we know the span 0,10 matches RHS.
            var right = (0, diagnostics_1.wrapForTypeChecker)(this.translate(ast.value));
            var node = (0, diagnostics_1.wrapForDiagnostics)(ts.createBinary(leftWithPath, ts.SyntaxKind.EqualsToken, right));
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitQuote = function (ast) {
            return exports.NULL_AS_ANY;
        };
        AstTranslator.prototype.visitSafePropertyRead = function (ast) {
            var node;
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            // The form of safe property reads depends on whether strictness is in use.
            if (this.config.strictSafeNavigationTypes) {
                // Basically, the return here is either the type of the complete expression with a null-safe
                // property read, or `undefined`. So a ternary is used to create an "or" type:
                // "a?.b" becomes (null as any ? a!.b : undefined)
                // The type of this expression is (typeof a!.b) | undefined, which is exactly as desired.
                var expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
                (0, diagnostics_1.addParseSpanInfo)(expr, ast.nameSpan);
                node = ts.createParen(ts.createConditional(exports.NULL_AS_ANY, expr, UNDEFINED));
            }
            else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
                // Emulate a View Engine bug where 'any' is inferred for the left-hand side of the safe
                // navigation operation. With this bug, the type of the left-hand side is regarded as any.
                // Therefore, the left-hand side only needs repeating in the output (to validate it), and then
                // 'any' is used for the rest of the expression. This is done using a comma operator:
                // "a?.b" becomes (a as any).b, which will of course have type 'any'.
                node = ts.createPropertyAccess((0, ts_util_1.tsCastToAny)(receiver), ast.name);
            }
            else {
                // The View Engine bug isn't active, so check the entire type of the expression, but the final
                // result is still inferred as `any`.
                // "a?.b" becomes (a!.b as any)
                var expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
                (0, diagnostics_1.addParseSpanInfo)(expr, ast.nameSpan);
                node = (0, ts_util_1.tsCastToAny)(expr);
            }
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitSafeKeyedRead = function (ast) {
            var receiver = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
            var key = this.translate(ast.key);
            var node;
            // The form of safe property reads depends on whether strictness is in use.
            if (this.config.strictSafeNavigationTypes) {
                // "a?.[...]" becomes (null as any ? a![...] : undefined)
                var expr = ts.createElementAccess(ts.createNonNullExpression(receiver), key);
                (0, diagnostics_1.addParseSpanInfo)(expr, ast.sourceSpan);
                node = ts.createParen(ts.createConditional(exports.NULL_AS_ANY, expr, UNDEFINED));
            }
            else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
                // "a?.[...]" becomes (a as any)[...]
                node = ts.createElementAccess((0, ts_util_1.tsCastToAny)(receiver), key);
            }
            else {
                // "a?.[...]" becomes (a!.[...] as any)
                var expr = ts.createElementAccess(ts.createNonNullExpression(receiver), key);
                (0, diagnostics_1.addParseSpanInfo)(expr, ast.sourceSpan);
                node = (0, ts_util_1.tsCastToAny)(expr);
            }
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
            return node;
        };
        AstTranslator.prototype.visitCall = function (ast) {
            var _this = this;
            var args = ast.args.map(function (expr) { return _this.translate(expr); });
            var expr = (0, diagnostics_1.wrapForDiagnostics)(this.translate(ast.receiver));
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
                    node = ts.createCall((0, ts_util_1.tsCastToAny)(expr), undefined, args);
                }
                else {
                    // "a?.method(...)" becomes (a!.method(...) as any)
                    node = (0, ts_util_1.tsCastToAny)(ts.createCall(ts.createNonNullExpression(expr), undefined, args));
                }
            }
            else {
                node = ts.createCall(expr, undefined, args);
            }
            (0, diagnostics_1.addParseSpanInfo)(node, ast.sourceSpan);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9leHByZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFtVjtJQUNuViwrQkFBaUM7SUFJakMseUZBQXVGO0lBQ3ZGLGlGQUFzQztJQUV6QixRQUFBLFdBQVcsR0FDcEIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQy9GLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVuRCxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBaUM7UUFDeEQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7UUFDOUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7S0FDaEMsQ0FBQyxDQUFDO0lBRUgsSUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQTRCO1FBQ3BELENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO1FBQzlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQy9CLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ2xDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFDckMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztRQUN6QyxD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QXFCO1lBQ3pDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELGlEQUFTLEdBQVQsVUFBVSxHQUFnQjtZQUN4QixPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxzREFBYyxHQUFkLFVBQWUsR0FBYztZQUMzQixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCwwREFBa0IsR0FBbEIsVUFBbUIsR0FBYztZQUMvQixPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCx5REFBaUIsR0FBakIsVUFBa0IsR0FBaUI7WUFDakMsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0QsMERBQWtCLEdBQWxCLFVBQW1CLEdBQWtCO1lBQ25DLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELGtEQUFVLEdBQVYsVUFBVyxHQUFVO1lBQ25CLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELDZEQUFxQixHQUFyQixVQUFzQixHQUFxQjtZQUN6QyxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDRCwwREFBa0IsR0FBbEIsVUFBbUIsR0FBa0I7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBckVjLHVDQUFTLEdBQUcsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO1FBc0VqRSxvQ0FBQztLQUFBLEFBdkVELElBdUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBc3RWaXNpdG9yLCBBU1RXaXRoU291cmNlLCBCaW5hcnksIEJpbmRpbmdQaXBlLCBDYWxsLCBDaGFpbiwgQ29uZGl0aW9uYWwsIEVtcHR5RXhwciwgSW1wbGljaXRSZWNlaXZlciwgSW50ZXJwb2xhdGlvbiwgS2V5ZWRSZWFkLCBLZXllZFdyaXRlLCBMaXRlcmFsQXJyYXksIExpdGVyYWxNYXAsIExpdGVyYWxQcmltaXRpdmUsIE5vbk51bGxBc3NlcnQsIFByZWZpeE5vdCwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBRdW90ZSwgU2FmZUtleWVkUmVhZCwgU2FmZVByb3BlcnR5UmVhZCwgVGhpc1JlY2VpdmVyLCBVbmFyeX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7VHlwZUNoZWNraW5nQ29uZmlnfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2FkZFBhcnNlU3BhbkluZm8sIHdyYXBGb3JEaWFnbm9zdGljcywgd3JhcEZvclR5cGVDaGVja2VyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7dHNDYXN0VG9Bbnl9IGZyb20gJy4vdHNfdXRpbCc7XG5cbmV4cG9ydCBjb25zdCBOVUxMX0FTX0FOWSA9XG4gICAgdHMuY3JlYXRlQXNFeHByZXNzaW9uKHRzLmNyZWF0ZU51bGwoKSwgdHMuY3JlYXRlS2V5d29yZFR5cGVOb2RlKHRzLlN5bnRheEtpbmQuQW55S2V5d29yZCkpO1xuY29uc3QgVU5ERUZJTkVEID0gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG5cbmNvbnN0IFVOQVJZX09QUyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5QcmVmaXhVbmFyeU9wZXJhdG9yPihbXG4gIFsnKycsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuXSxcbiAgWyctJywgdHMuU3ludGF4S2luZC5NaW51c1Rva2VuXSxcbl0pO1xuXG5jb25zdCBCSU5BUllfT1BTID0gbmV3IE1hcDxzdHJpbmcsIHRzLkJpbmFyeU9wZXJhdG9yPihbXG4gIFsnKycsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuXSxcbiAgWyctJywgdHMuU3ludGF4S2luZC5NaW51c1Rva2VuXSxcbiAgWyc8JywgdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuXSxcbiAgWyc+JywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuXSxcbiAgWyc8PScsIHRzLlN5bnRheEtpbmQuTGVzc1RoYW5FcXVhbHNUb2tlbl0sXG4gIFsnPj0nLCB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW5dLFxuICBbJz09JywgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFsnPT09JywgdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFsnKicsIHRzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbl0sXG4gIFsnLycsIHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbl0sXG4gIFsnJScsIHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuXSxcbiAgWychPScsIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNUb2tlbl0sXG4gIFsnIT09JywgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuXSxcbiAgWyd8fCcsIHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW5dLFxuICBbJyYmJywgdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbl0sXG4gIFsnJicsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW5dLFxuICBbJ3wnLCB0cy5TeW50YXhLaW5kLkJhclRva2VuXSxcbiAgWyc/PycsIHRzLlN5bnRheEtpbmQuUXVlc3Rpb25RdWVzdGlvblRva2VuXSxcbl0pO1xuXG4vKipcbiAqIENvbnZlcnQgYW4gYEFTVGAgdG8gVHlwZVNjcmlwdCBjb2RlIGRpcmVjdGx5LCB3aXRob3V0IGdvaW5nIHRocm91Z2ggYW4gaW50ZXJtZWRpYXRlIGBFeHByZXNzaW9uYFxuICogQVNULlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXN0VG9UeXBlc2NyaXB0KFxuICAgIGFzdDogQVNULCBtYXliZVJlc29sdmU6IChhc3Q6IEFTVCkgPT4gKHRzLkV4cHJlc3Npb24gfCBudWxsKSxcbiAgICBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyk6IHRzLkV4cHJlc3Npb24ge1xuICBjb25zdCB0cmFuc2xhdG9yID0gbmV3IEFzdFRyYW5zbGF0b3IobWF5YmVSZXNvbHZlLCBjb25maWcpO1xuICByZXR1cm4gdHJhbnNsYXRvci50cmFuc2xhdGUoYXN0KTtcbn1cblxuY2xhc3MgQXN0VHJhbnNsYXRvciBpbXBsZW1lbnRzIEFzdFZpc2l0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbWF5YmVSZXNvbHZlOiAoYXN0OiBBU1QpID0+ICh0cy5FeHByZXNzaW9uIHwgbnVsbCksXG4gICAgICBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnKSB7fVxuXG4gIHRyYW5zbGF0ZShhc3Q6IEFTVCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIFNraXAgb3ZlciBhbiBgQVNUV2l0aFNvdXJjZWAgYXMgaXRzIGB2aXNpdGAgbWV0aG9kIGNhbGxzIGRpcmVjdGx5IGludG8gaXRzIGFzdCdzIGB2aXNpdGAsXG4gICAgLy8gd2hpY2ggd291bGQgcHJldmVudCBhbnkgY3VzdG9tIHJlc29sdXRpb24gdGhyb3VnaCBgbWF5YmVSZXNvbHZlYCBmb3IgdGhhdCBub2RlLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBhc3QgPSBhc3QuYXN0O1xuICAgIH1cblxuICAgIC8vIFRoZSBgRW1wdHlFeHByYCBkb2Vzbid0IGhhdmUgYSBkZWRpY2F0ZWQgbWV0aG9kIG9uIGBBc3RWaXNpdG9yYCwgc28gaXQncyBzcGVjaWFsIGNhc2VkIGhlcmUuXG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIEVtcHR5RXhwcikge1xuICAgICAgY29uc3QgcmVzID0gdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8ocmVzLCBhc3Quc291cmNlU3Bhbik7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIC8vIEZpcnN0IGF0dGVtcHQgdG8gbGV0IGFueSBjdXN0b20gcmVzb2x1dGlvbiBsb2dpYyBwcm92aWRlIGEgdHJhbnNsYXRpb24gZm9yIHRoZSBnaXZlbiBub2RlLlxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tYXliZVJlc29sdmUoYXN0KTtcbiAgICBpZiAocmVzb2x2ZWQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXN0LnZpc2l0KHRoaXMpO1xuICB9XG5cbiAgdmlzaXRVbmFyeShhc3Q6IFVuYXJ5KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5leHByKTtcbiAgICBjb25zdCBvcCA9IFVOQVJZX09QUy5nZXQoYXN0Lm9wZXJhdG9yKTtcbiAgICBpZiAob3AgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBVbmFyeS5vcGVyYXRvcjogJHthc3Qub3BlcmF0b3J9YCk7XG4gICAgfVxuICAgIGNvbnN0IG5vZGUgPSB3cmFwRm9yRGlhZ25vc3RpY3ModHMuY3JlYXRlUHJlZml4KG9wLCBleHByKSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdEJpbmFyeShhc3Q6IEJpbmFyeSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGxocyA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QubGVmdCkpO1xuICAgIGNvbnN0IHJocyA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmlnaHQpKTtcbiAgICBjb25zdCBvcCA9IEJJTkFSWV9PUFMuZ2V0KGFzdC5vcGVyYXRpb24pO1xuICAgIGlmIChvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIEJpbmFyeS5vcGVyYXRpb246ICR7YXN0Lm9wZXJhdGlvbn1gKTtcbiAgICB9XG4gICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUJpbmFyeShsaHMsIG9wLCByaHMpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRDaGFpbihhc3Q6IENoYWluKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZWxlbWVudHMgPSBhc3QuZXhwcmVzc2lvbnMubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGUoZXhwcikpO1xuICAgIGNvbnN0IG5vZGUgPSB3cmFwRm9yRGlhZ25vc3RpY3ModHMuY3JlYXRlQ29tbWFMaXN0KGVsZW1lbnRzKSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdENvbmRpdGlvbmFsKGFzdDogQ29uZGl0aW9uYWwpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBjb25kRXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC5jb25kaXRpb24pO1xuICAgIGNvbnN0IHRydWVFeHByID0gdGhpcy50cmFuc2xhdGUoYXN0LnRydWVFeHApO1xuICAgIC8vIFdyYXAgYGZhbHNlRXhwcmAgaW4gcGFyZW5zIHNvIHRoYXQgdGhlIHRyYWlsaW5nIHBhcnNlIHNwYW4gaW5mbyBpcyBub3QgYXR0cmlidXRlZCB0byB0aGVcbiAgICAvLyB3aG9sZSBjb25kaXRpb25hbC5cbiAgICAvLyBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUsIHRoZSBsYXN0IHNvdXJjZSBzcGFuIGNvbW1lbnQgKDUsNikgY291bGQgYmUgc2VlbiBhcyB0aGVcbiAgICAvLyB0cmFpbGluZyBjb21tZW50IGZvciBfZWl0aGVyXyB0aGUgd2hvbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBfb3JfIGp1c3QgdGhlIGBmYWxzZUV4cHJgIHRoYXRcbiAgICAvLyBpcyBpbW1lZGlhdGVseSBiZWZvcmUgaXQ6XG4gICAgLy8gYGNvbmRpdGlvbmFsIC8qMSwyKi8gPyB0cnVlRXhwciAvKjMsNCovIDogZmFsc2VFeHByIC8qNSw2Ki9gXG4gICAgLy8gVGhpcyBzaG91bGQgYmUgaW5zdGVhZCBiZSBgY29uZGl0aW9uYWwgLyoxLDIqLyA/IHRydWVFeHByIC8qMyw0Ki8gOiAoZmFsc2VFeHByIC8qNSw2Ki8pYFxuICAgIGNvbnN0IGZhbHNlRXhwciA9IHdyYXBGb3JUeXBlQ2hlY2tlcih0aGlzLnRyYW5zbGF0ZShhc3QuZmFsc2VFeHApKTtcbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoY29uZEV4cHIsIHRydWVFeHByLCBmYWxzZUV4cHIpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0SW1wbGljaXRSZWNlaXZlcihhc3Q6IEltcGxpY2l0UmVjZWl2ZXIpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRUaGlzUmVjZWl2ZXIoYXN0OiBUaGlzUmVjZWl2ZXIpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdDogSW50ZXJwb2xhdGlvbik6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIEJ1aWxkIHVwIGEgY2hhaW4gb2YgYmluYXJ5ICsgb3BlcmF0aW9ucyB0byBzaW11bGF0ZSB0aGUgc3RyaW5nIGNvbmNhdGVuYXRpb24gb2YgdGhlXG4gICAgLy8gaW50ZXJwb2xhdGlvbidzIGV4cHJlc3Npb25zLiBUaGUgY2hhaW4gaXMgc3RhcnRlZCB1c2luZyBhbiBhY3R1YWwgc3RyaW5nIGxpdGVyYWwgdG8gZW5zdXJlXG4gICAgLy8gdGhlIHR5cGUgaXMgaW5mZXJyZWQgYXMgJ3N0cmluZycuXG4gICAgcmV0dXJuIGFzdC5leHByZXNzaW9ucy5yZWR1Y2UoXG4gICAgICAgIChsaHMsIGFzdCkgPT5cbiAgICAgICAgICAgIHRzLmNyZWF0ZUJpbmFyeShsaHMsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuLCB3cmFwRm9yVHlwZUNoZWNrZXIodGhpcy50cmFuc2xhdGUoYXN0KSkpLFxuICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gIH1cblxuICB2aXNpdEtleWVkUmVhZChhc3Q6IEtleWVkUmVhZCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yZWNlaXZlcikpO1xuICAgIGNvbnN0IGtleSA9IHRoaXMudHJhbnNsYXRlKGFzdC5rZXkpO1xuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKHJlY2VpdmVyLCBrZXkpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRLZXllZFdyaXRlKGFzdDogS2V5ZWRXcml0ZSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yZWNlaXZlcikpO1xuICAgIGNvbnN0IGxlZnQgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKHJlY2VpdmVyLCB0aGlzLnRyYW5zbGF0ZShhc3Qua2V5KSk7XG4gICAgLy8gVE9ETyhqb29zdCk6IGFubm90YXRlIGBsZWZ0YCB3aXRoIHRoZSBzcGFuIG9mIHRoZSBlbGVtZW50IGFjY2Vzcywgd2hpY2ggaXMgbm90IGN1cnJlbnRseVxuICAgIC8vICBhdmFpbGFibGUgb24gYGFzdGAuXG4gICAgY29uc3QgcmlnaHQgPSB3cmFwRm9yVHlwZUNoZWNrZXIodGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlKSk7XG4gICAgY29uc3Qgbm9kZSA9IHdyYXBGb3JEaWFnbm9zdGljcyh0cy5jcmVhdGVCaW5hcnkobGVmdCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgcmlnaHQpKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbEFycmF5KGFzdDogTGl0ZXJhbEFycmF5KTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgZWxlbWVudHMgPSBhc3QuZXhwcmVzc2lvbnMubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGUoZXhwcikpO1xuICAgIGNvbnN0IGxpdGVyYWwgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWwoZWxlbWVudHMpO1xuICAgIC8vIElmIHN0cmljdExpdGVyYWxUeXBlcyBpcyBkaXNhYmxlZCwgYXJyYXkgbGl0ZXJhbHMgYXJlIGNhc3QgdG8gYGFueWAuXG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuY29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA/IGxpdGVyYWwgOiB0c0Nhc3RUb0FueShsaXRlcmFsKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbE1hcChhc3Q6IExpdGVyYWxNYXApOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gYXN0LmtleXMubWFwKCh7a2V5fSwgaWR4KSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMudHJhbnNsYXRlKGFzdC52YWx1ZXNbaWR4XSk7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwoa2V5KSwgdmFsdWUpO1xuICAgIH0pO1xuICAgIGNvbnN0IGxpdGVyYWwgPSB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKHByb3BlcnRpZXMsIHRydWUpO1xuICAgIC8vIElmIHN0cmljdExpdGVyYWxUeXBlcyBpcyBkaXNhYmxlZCwgb2JqZWN0IGxpdGVyYWxzIGFyZSBjYXN0IHRvIGBhbnlgLlxuICAgIGNvbnN0IG5vZGUgPSB0aGlzLmNvbmZpZy5zdHJpY3RMaXRlcmFsVHlwZXMgPyBsaXRlcmFsIDogdHNDYXN0VG9BbnkobGl0ZXJhbCk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdExpdGVyYWxQcmltaXRpdmUoYXN0OiBMaXRlcmFsUHJpbWl0aXZlKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgbGV0IG5vZGU6IHRzLkV4cHJlc3Npb247XG4gICAgaWYgKGFzdC52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub2RlID0gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gICAgfSBlbHNlIGlmIChhc3QudmFsdWUgPT09IG51bGwpIHtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVOdWxsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVMaXRlcmFsKGFzdC52YWx1ZSk7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdDogTm9uTnVsbEFzc2VydCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LmV4cHJlc3Npb24pKTtcbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24oZXhwcik7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdFBpcGUoYXN0OiBCaW5kaW5nUGlwZSk6IG5ldmVyIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICB2aXNpdFByZWZpeE5vdChhc3Q6IFByZWZpeE5vdCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHJlc3Npb24gPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LmV4cHJlc3Npb24pKTtcbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlTG9naWNhbE5vdChleHByZXNzaW9uKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gVGhpcyBpcyBhIG5vcm1hbCBwcm9wZXJ0eSByZWFkIC0gY29udmVydCB0aGUgcmVjZWl2ZXIgdG8gYW4gZXhwcmVzc2lvbiBhbmQgZW1pdCB0aGUgY29ycmVjdFxuICAgIC8vIFR5cGVTY3JpcHQgZXhwcmVzc2lvbiB0byByZWFkIHRoZSBwcm9wZXJ0eS5cbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICBjb25zdCBuYW1lID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjZWl2ZXIsIGFzdC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5hbWUsIGFzdC5uYW1lU3Bhbik7XG4gICAgY29uc3Qgbm9kZSA9IHdyYXBGb3JEaWFnbm9zdGljcyhuYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlXcml0ZShhc3Q6IFByb3BlcnR5V3JpdGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICBjb25zdCBsZWZ0ID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjZWl2ZXIsIGFzdC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGxlZnQsIGFzdC5uYW1lU3Bhbik7XG4gICAgLy8gVHlwZVNjcmlwdCByZXBvcnRzIGFzc2lnbm1lbnQgZXJyb3JzIG9uIHRoZSBlbnRpcmUgbHZhbHVlIGV4cHJlc3Npb24uIEFubm90YXRlIHRoZSBsdmFsdWUgb2ZcbiAgICAvLyB0aGUgYXNzaWdubWVudCB3aXRoIHRoZSBzb3VyY2VTcGFuLCB3aGljaCBpbmNsdWRlcyByZWNlaXZlcnMsIHJhdGhlciB0aGFuIG5hbWVTcGFuIGZvclxuICAgIC8vIGNvbnNpc3RlbmN5IG9mIHRoZSBkaWFnbm9zdGljIGxvY2F0aW9uLlxuICAgIC8vIGEuYi5jID0gMVxuICAgIC8vIF5eXl5eXl5eXiBzb3VyY2VTcGFuXG4gICAgLy8gICAgIF4gICAgIG5hbWVTcGFuXG4gICAgY29uc3QgbGVmdFdpdGhQYXRoID0gd3JhcEZvckRpYWdub3N0aWNzKGxlZnQpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obGVmdFdpdGhQYXRoLCBhc3Quc291cmNlU3Bhbik7XG4gICAgLy8gVGhlIHJpZ2h0IG5lZWRzIHRvIGJlIHdyYXBwZWQgaW4gcGFyZW5zIGFzIHdlbGwgb3Igd2UgY2Fubm90IGFjY3VyYXRlbHkgbWF0Y2ggaXRzXG4gICAgLy8gc3BhbiB0byBqdXN0IHRoZSBSSFMuIEZvciBleGFtcGxlLCB0aGUgc3BhbiBpbiBgZSA9ICRldmVudCAvKjAsMTAqL2AgaXMgYW1iaWd1b3VzLlxuICAgIC8vIEl0IGNvdWxkIHJlZmVyIHRvIGVpdGhlciB0aGUgd2hvbGUgYmluYXJ5IGV4cHJlc3Npb24gb3IganVzdCB0aGUgUkhTLlxuICAgIC8vIFdlIHNob3VsZCBpbnN0ZWFkIGdlbmVyYXRlIGBlID0gKCRldmVudCAvKjAsMTAqLylgIHNvIHdlIGtub3cgdGhlIHNwYW4gMCwxMCBtYXRjaGVzIFJIUy5cbiAgICBjb25zdCByaWdodCA9IHdyYXBGb3JUeXBlQ2hlY2tlcih0aGlzLnRyYW5zbGF0ZShhc3QudmFsdWUpKTtcbiAgICBjb25zdCBub2RlID1cbiAgICAgICAgd3JhcEZvckRpYWdub3N0aWNzKHRzLmNyZWF0ZUJpbmFyeShsZWZ0V2l0aFBhdGgsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHJpZ2h0KSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdFF1b3RlKGFzdDogUXVvdGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gTlVMTF9BU19BTlk7XG4gIH1cblxuICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0OiBTYWZlUHJvcGVydHlSZWFkKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgbGV0IG5vZGU6IHRzLkV4cHJlc3Npb247XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgLy8gVGhlIGZvcm0gb2Ygc2FmZSBwcm9wZXJ0eSByZWFkcyBkZXBlbmRzIG9uIHdoZXRoZXIgc3RyaWN0bmVzcyBpcyBpbiB1c2UuXG4gICAgaWYgKHRoaXMuY29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMpIHtcbiAgICAgIC8vIEJhc2ljYWxseSwgdGhlIHJldHVybiBoZXJlIGlzIGVpdGhlciB0aGUgdHlwZSBvZiB0aGUgY29tcGxldGUgZXhwcmVzc2lvbiB3aXRoIGEgbnVsbC1zYWZlXG4gICAgICAvLyBwcm9wZXJ0eSByZWFkLCBvciBgdW5kZWZpbmVkYC4gU28gYSB0ZXJuYXJ5IGlzIHVzZWQgdG8gY3JlYXRlIGFuIFwib3JcIiB0eXBlOlxuICAgICAgLy8gXCJhPy5iXCIgYmVjb21lcyAobnVsbCBhcyBhbnkgPyBhIS5iIDogdW5kZWZpbmVkKVxuICAgICAgLy8gVGhlIHR5cGUgb2YgdGhpcyBleHByZXNzaW9uIGlzICh0eXBlb2YgYSEuYikgfCB1bmRlZmluZWQsIHdoaWNoIGlzIGV4YWN0bHkgYXMgZGVzaXJlZC5cbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVDb25kaXRpb25hbChOVUxMX0FTX0FOWSwgZXhwciwgVU5ERUZJTkVEKSk7XG4gICAgfSBlbHNlIGlmIChWZVNhZmVMaHNJbmZlcmVuY2VCdWdEZXRlY3Rvci52ZVdpbGxJbmZlckFueUZvcihhc3QpKSB7XG4gICAgICAvLyBFbXVsYXRlIGEgVmlldyBFbmdpbmUgYnVnIHdoZXJlICdhbnknIGlzIGluZmVycmVkIGZvciB0aGUgbGVmdC1oYW5kIHNpZGUgb2YgdGhlIHNhZmVcbiAgICAgIC8vIG5hdmlnYXRpb24gb3BlcmF0aW9uLiBXaXRoIHRoaXMgYnVnLCB0aGUgdHlwZSBvZiB0aGUgbGVmdC1oYW5kIHNpZGUgaXMgcmVnYXJkZWQgYXMgYW55LlxuICAgICAgLy8gVGhlcmVmb3JlLCB0aGUgbGVmdC1oYW5kIHNpZGUgb25seSBuZWVkcyByZXBlYXRpbmcgaW4gdGhlIG91dHB1dCAodG8gdmFsaWRhdGUgaXQpLCBhbmQgdGhlblxuICAgICAgLy8gJ2FueScgaXMgdXNlZCBmb3IgdGhlIHJlc3Qgb2YgdGhlIGV4cHJlc3Npb24uIFRoaXMgaXMgZG9uZSB1c2luZyBhIGNvbW1hIG9wZXJhdG9yOlxuICAgICAgLy8gXCJhPy5iXCIgYmVjb21lcyAoYSBhcyBhbnkpLmIsIHdoaWNoIHdpbGwgb2YgY291cnNlIGhhdmUgdHlwZSAnYW55Jy5cbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0c0Nhc3RUb0FueShyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIFZpZXcgRW5naW5lIGJ1ZyBpc24ndCBhY3RpdmUsIHNvIGNoZWNrIHRoZSBlbnRpcmUgdHlwZSBvZiB0aGUgZXhwcmVzc2lvbiwgYnV0IHRoZSBmaW5hbFxuICAgICAgLy8gcmVzdWx0IGlzIHN0aWxsIGluZmVycmVkIGFzIGBhbnlgLlxuICAgICAgLy8gXCJhPy5iXCIgYmVjb21lcyAoYSEuYiBhcyBhbnkpXG4gICAgICBjb25zdCBleHByID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModHMuY3JlYXRlTm9uTnVsbEV4cHJlc3Npb24ocmVjZWl2ZXIpLCBhc3QubmFtZSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIGFzdC5uYW1lU3Bhbik7XG4gICAgICBub2RlID0gdHNDYXN0VG9BbnkoZXhwcik7XG4gICAgfVxuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRTYWZlS2V5ZWRSZWFkKGFzdDogU2FmZUtleWVkUmVhZCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5yZWNlaXZlcikpO1xuICAgIGNvbnN0IGtleSA9IHRoaXMudHJhbnNsYXRlKGFzdC5rZXkpO1xuICAgIGxldCBub2RlOiB0cy5FeHByZXNzaW9uO1xuXG4gICAgLy8gVGhlIGZvcm0gb2Ygc2FmZSBwcm9wZXJ0eSByZWFkcyBkZXBlbmRzIG9uIHdoZXRoZXIgc3RyaWN0bmVzcyBpcyBpbiB1c2UuXG4gICAgaWYgKHRoaXMuY29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMpIHtcbiAgICAgIC8vIFwiYT8uWy4uLl1cIiBiZWNvbWVzIChudWxsIGFzIGFueSA/IGEhWy4uLl0gOiB1bmRlZmluZWQpXG4gICAgICBjb25zdCBleHByID0gdHMuY3JlYXRlRWxlbWVudEFjY2Vzcyh0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihyZWNlaXZlciksIGtleSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKGV4cHIsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVQYXJlbih0cy5jcmVhdGVDb25kaXRpb25hbChOVUxMX0FTX0FOWSwgZXhwciwgVU5ERUZJTkVEKSk7XG4gICAgfSBlbHNlIGlmIChWZVNhZmVMaHNJbmZlcmVuY2VCdWdEZXRlY3Rvci52ZVdpbGxJbmZlckFueUZvcihhc3QpKSB7XG4gICAgICAvLyBcImE/LlsuLi5dXCIgYmVjb21lcyAoYSBhcyBhbnkpWy4uLl1cbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKHRzQ2FzdFRvQW55KHJlY2VpdmVyKSwga2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXCJhPy5bLi4uXVwiIGJlY29tZXMgKGEhLlsuLi5dIGFzIGFueSlcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwga2V5KTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgbm9kZSA9IHRzQ2FzdFRvQW55KGV4cHIpO1xuICAgIH1cbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0Q2FsbChhc3Q6IENhbGwpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGUoZXhwcikpO1xuICAgIGNvbnN0IGV4cHIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgbGV0IG5vZGU6IHRzLkV4cHJlc3Npb247XG5cbiAgICAvLyBTYWZlIHByb3BlcnR5L2tleWVkIHJlYWRzIHdpbGwgcHJvZHVjZSBhIHRlcm5hcnkgd2hvc2UgdmFsdWUgaXMgbnVsbGFibGUuXG4gICAgLy8gV2UgaGF2ZSB0byBnZW5lcmF0ZSBhIHNpbWlsYXIgdGVybmFyeSBhcm91bmQgdGhlIGNhbGwuXG4gICAgaWYgKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgU2FmZUtleWVkUmVhZCkge1xuICAgICAgaWYgKHRoaXMuY29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMpIHtcbiAgICAgICAgLy8gXCJhPy5tZXRob2QoLi4uKVwiIGJlY29tZXMgKG51bGwgYXMgYW55ID8gYSEubWV0aG9kKC4uLikgOiB1bmRlZmluZWQpXG4gICAgICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpLCB1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgICBub2RlID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoTlVMTF9BU19BTlksIGNhbGwsIFVOREVGSU5FRCkpO1xuICAgICAgfSBlbHNlIGlmIChWZVNhZmVMaHNJbmZlcmVuY2VCdWdEZXRlY3Rvci52ZVdpbGxJbmZlckFueUZvcihhc3QpKSB7XG4gICAgICAgIC8vIFwiYT8ubWV0aG9kKC4uLilcIiBiZWNvbWVzIChhIGFzIGFueSkubWV0aG9kKC4uLilcbiAgICAgICAgbm9kZSA9IHRzLmNyZWF0ZUNhbGwodHNDYXN0VG9BbnkoZXhwciksIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBcImE/Lm1ldGhvZCguLi4pXCIgYmVjb21lcyAoYSEubWV0aG9kKC4uLikgYXMgYW55KVxuICAgICAgICBub2RlID0gdHNDYXN0VG9BbnkodHMuY3JlYXRlQ2FsbCh0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihleHByKSwgdW5kZWZpbmVkLCBhcmdzKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVDYWxsKGV4cHIsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgfVxuXG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBWaWV3IEVuZ2luZSB3aWxsIGluZmVyIGEgdHlwZSBvZiAnYW55JyBmb3IgdGhlIGxlZnQtaGFuZCBzaWRlIG9mIGEgc2FmZSBuYXZpZ2F0aW9uXG4gKiBvcGVyYXRpb24uXG4gKlxuICogSW4gVmlldyBFbmdpbmUncyB0ZW1wbGF0ZSB0eXBlLWNoZWNrZXIsIGNlcnRhaW4gcmVjZWl2ZXJzIG9mIHNhZmUgbmF2aWdhdGlvbiBvcGVyYXRpb25zIHdpbGxcbiAqIGNhdXNlIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGJlIGFsbG9jYXRlZCBhcyBwYXJ0IG9mIHRoZSBjaGVja2luZyBleHByZXNzaW9uLCB0byBzYXZlIHRoZSB2YWx1ZVxuICogb2YgdGhlIHJlY2VpdmVyIGFuZCB1c2UgaXQgbW9yZSB0aGFuIG9uY2UgaW4gdGhlIGV4cHJlc3Npb24uIFRoaXMgdGVtcG9yYXJ5IHZhcmlhYmxlIGhhcyB0eXBlXG4gKiAnYW55Jy4gSW4gcHJhY3RpY2UsIHRoaXMgbWVhbnMgY2VydGFpbiByZWNlaXZlcnMgY2F1c2UgVmlldyBFbmdpbmUgdG8gbm90IGNoZWNrIHRoZSBmdWxsXG4gKiBleHByZXNzaW9uLCBhbmQgb3RoZXIgcmVjZWl2ZXJzIHdpbGwgcmVjZWl2ZSBtb3JlIGNvbXBsZXRlIGNoZWNraW5nLlxuICpcbiAqIEZvciBjb21wYXRpYmlsaXR5LCB0aGlzIGxvZ2ljIGlzIGFkYXB0ZWQgZnJvbSBWaWV3IEVuZ2luZSdzIGV4cHJlc3Npb25fY29udmVydGVyLnRzIHNvIHRoYXQgdGhlXG4gKiBJdnkgY2hlY2tlciBjYW4gZW11bGF0ZSB0aGlzIGJ1ZyB3aGVuIG5lZWRlZC5cbiAqL1xuY2xhc3MgVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IgaW1wbGVtZW50cyBBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBzdGF0aWMgU0lOR0xFVE9OID0gbmV3IFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yKCk7XG5cbiAgc3RhdGljIHZlV2lsbEluZmVyQW55Rm9yKGFzdDogQ2FsbHxTYWZlUHJvcGVydHlSZWFkfFNhZmVLZXllZFJlYWQpIHtcbiAgICBjb25zdCB2aXNpdG9yID0gVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IuU0lOR0xFVE9OO1xuICAgIHJldHVybiBhc3QgaW5zdGFuY2VvZiBDYWxsID8gYXN0LnZpc2l0KHZpc2l0b3IpIDogYXN0LnJlY2VpdmVyLnZpc2l0KHZpc2l0b3IpO1xuICB9XG5cbiAgdmlzaXRVbmFyeShhc3Q6IFVuYXJ5KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFzdC5leHByLnZpc2l0KHRoaXMpO1xuICB9XG4gIHZpc2l0QmluYXJ5KGFzdDogQmluYXJ5KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFzdC5sZWZ0LnZpc2l0KHRoaXMpIHx8IGFzdC5yaWdodC52aXNpdCh0aGlzKTtcbiAgfVxuICB2aXNpdENoYWluKGFzdDogQ2hhaW4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRDb25kaXRpb25hbChhc3Q6IENvbmRpdGlvbmFsKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFzdC5jb25kaXRpb24udmlzaXQodGhpcykgfHwgYXN0LnRydWVFeHAudmlzaXQodGhpcykgfHwgYXN0LmZhbHNlRXhwLnZpc2l0KHRoaXMpO1xuICB9XG4gIHZpc2l0Q2FsbChhc3Q6IENhbGwpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2aXNpdEltcGxpY2l0UmVjZWl2ZXIoYXN0OiBJbXBsaWNpdFJlY2VpdmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0VGhpc1JlY2VpdmVyKGFzdDogVGhpc1JlY2VpdmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0SW50ZXJwb2xhdGlvbihhc3Q6IEludGVycG9sYXRpb24pOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmV4cHJlc3Npb25zLnNvbWUoZXhwID0+IGV4cC52aXNpdCh0aGlzKSk7XG4gIH1cbiAgdmlzaXRLZXllZFJlYWQoYXN0OiBLZXllZFJlYWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRLZXllZFdyaXRlKGFzdDogS2V5ZWRXcml0ZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdExpdGVyYWxBcnJheShhc3Q6IExpdGVyYWxBcnJheSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0TGl0ZXJhbE1hcChhc3Q6IExpdGVyYWxNYXApOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2aXNpdExpdGVyYWxQcmltaXRpdmUoYXN0OiBMaXRlcmFsUHJpbWl0aXZlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0UGlwZShhc3Q6IEJpbmRpbmdQaXBlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdmlzaXRQcmVmaXhOb3QoYXN0OiBQcmVmaXhOb3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmV4cHJlc3Npb24udmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdDogUHJlZml4Tm90KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFzdC5leHByZXNzaW9uLnZpc2l0KHRoaXMpO1xuICB9XG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0UHJvcGVydHlXcml0ZShhc3Q6IFByb3BlcnR5V3JpdGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRRdW90ZShhc3Q6IFF1b3RlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRTYWZlS2V5ZWRSZWFkKGFzdDogU2FmZUtleWVkUmVhZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19