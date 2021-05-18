/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ASTWithSource, EmptyExpr } from '@angular/compiler';
import * as ts from 'typescript';
import { addParseSpanInfo, wrapForDiagnostics, wrapForTypeChecker } from './diagnostics';
import { tsCastToAny } from './ts_util';
export const NULL_AS_ANY = ts.createAsExpression(ts.createNull(), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
const UNDEFINED = ts.createIdentifier('undefined');
const UNARY_OPS = new Map([
    ['+', ts.SyntaxKind.PlusToken],
    ['-', ts.SyntaxKind.MinusToken],
]);
const BINARY_OPS = new Map([
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
export function astToTypescript(ast, maybeResolve, config) {
    const translator = new AstTranslator(maybeResolve, config);
    return translator.translate(ast);
}
class AstTranslator {
    constructor(maybeResolve, config) {
        this.maybeResolve = maybeResolve;
        this.config = config;
    }
    translate(ast) {
        // Skip over an `ASTWithSource` as its `visit` method calls directly into its ast's `visit`,
        // which would prevent any custom resolution through `maybeResolve` for that node.
        if (ast instanceof ASTWithSource) {
            ast = ast.ast;
        }
        // The `EmptyExpr` doesn't have a dedicated method on `AstVisitor`, so it's special cased here.
        if (ast instanceof EmptyExpr) {
            const res = ts.factory.createIdentifier('undefined');
            addParseSpanInfo(res, ast.sourceSpan);
            return res;
        }
        // First attempt to let any custom resolution logic provide a translation for the given node.
        const resolved = this.maybeResolve(ast);
        if (resolved !== null) {
            return resolved;
        }
        return ast.visit(this);
    }
    visitUnary(ast) {
        const expr = this.translate(ast.expr);
        const op = UNARY_OPS.get(ast.operator);
        if (op === undefined) {
            throw new Error(`Unsupported Unary.operator: ${ast.operator}`);
        }
        const node = wrapForDiagnostics(ts.createPrefix(op, expr));
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitBinary(ast) {
        const lhs = wrapForDiagnostics(this.translate(ast.left));
        const rhs = wrapForDiagnostics(this.translate(ast.right));
        const op = BINARY_OPS.get(ast.operation);
        if (op === undefined) {
            throw new Error(`Unsupported Binary.operation: ${ast.operation}`);
        }
        const node = ts.createBinary(lhs, op, rhs);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitChain(ast) {
        const elements = ast.expressions.map(expr => this.translate(expr));
        const node = wrapForDiagnostics(ts.createCommaList(elements));
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitConditional(ast) {
        const condExpr = this.translate(ast.condition);
        const trueExpr = this.translate(ast.trueExp);
        // Wrap `falseExpr` in parens so that the trailing parse span info is not attributed to the
        // whole conditional.
        // In the following example, the last source span comment (5,6) could be seen as the
        // trailing comment for _either_ the whole conditional expression _or_ just the `falseExpr` that
        // is immediately before it:
        // `conditional /*1,2*/ ? trueExpr /*3,4*/ : falseExpr /*5,6*/`
        // This should be instead be `conditional /*1,2*/ ? trueExpr /*3,4*/ : (falseExpr /*5,6*/)`
        const falseExpr = wrapForTypeChecker(this.translate(ast.falseExp));
        const node = ts.createParen(ts.createConditional(condExpr, trueExpr, falseExpr));
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitFunctionCall(ast) {
        const receiver = wrapForDiagnostics(this.translate(ast.target));
        const args = ast.args.map(expr => this.translate(expr));
        const node = ts.createCall(receiver, undefined, args);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitImplicitReceiver(ast) {
        throw new Error('Method not implemented.');
    }
    visitThisReceiver(ast) {
        throw new Error('Method not implemented.');
    }
    visitInterpolation(ast) {
        // Build up a chain of binary + operations to simulate the string concatenation of the
        // interpolation's expressions. The chain is started using an actual string literal to ensure
        // the type is inferred as 'string'.
        return ast.expressions.reduce((lhs, ast) => ts.createBinary(lhs, ts.SyntaxKind.PlusToken, wrapForTypeChecker(this.translate(ast))), ts.createLiteral(''));
    }
    visitKeyedRead(ast) {
        const receiver = wrapForDiagnostics(this.translate(ast.obj));
        const key = this.translate(ast.key);
        const node = ts.createElementAccess(receiver, key);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitKeyedWrite(ast) {
        const receiver = wrapForDiagnostics(this.translate(ast.obj));
        const left = ts.createElementAccess(receiver, this.translate(ast.key));
        // TODO(joost): annotate `left` with the span of the element access, which is not currently
        //  available on `ast`.
        const right = wrapForTypeChecker(this.translate(ast.value));
        const node = wrapForDiagnostics(ts.createBinary(left, ts.SyntaxKind.EqualsToken, right));
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitLiteralArray(ast) {
        const elements = ast.expressions.map(expr => this.translate(expr));
        const literal = ts.createArrayLiteral(elements);
        // If strictLiteralTypes is disabled, array literals are cast to `any`.
        const node = this.config.strictLiteralTypes ? literal : tsCastToAny(literal);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitLiteralMap(ast) {
        const properties = ast.keys.map(({ key }, idx) => {
            const value = this.translate(ast.values[idx]);
            return ts.createPropertyAssignment(ts.createStringLiteral(key), value);
        });
        const literal = ts.createObjectLiteral(properties, true);
        // If strictLiteralTypes is disabled, object literals are cast to `any`.
        const node = this.config.strictLiteralTypes ? literal : tsCastToAny(literal);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitLiteralPrimitive(ast) {
        let node;
        if (ast.value === undefined) {
            node = ts.createIdentifier('undefined');
        }
        else if (ast.value === null) {
            node = ts.createNull();
        }
        else {
            node = ts.createLiteral(ast.value);
        }
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitMethodCall(ast) {
        const receiver = wrapForDiagnostics(this.translate(ast.receiver));
        const method = ts.createPropertyAccess(receiver, ast.name);
        addParseSpanInfo(method, ast.nameSpan);
        const args = ast.args.map(expr => this.translate(expr));
        const node = ts.createCall(method, undefined, args);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitNonNullAssert(ast) {
        const expr = wrapForDiagnostics(this.translate(ast.expression));
        const node = ts.createNonNullExpression(expr);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitPipe(ast) {
        throw new Error('Method not implemented.');
    }
    visitPrefixNot(ast) {
        const expression = wrapForDiagnostics(this.translate(ast.expression));
        const node = ts.createLogicalNot(expression);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitPropertyRead(ast) {
        // This is a normal property read - convert the receiver to an expression and emit the correct
        // TypeScript expression to read the property.
        const receiver = wrapForDiagnostics(this.translate(ast.receiver));
        const name = ts.createPropertyAccess(receiver, ast.name);
        addParseSpanInfo(name, ast.nameSpan);
        const node = wrapForDiagnostics(name);
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitPropertyWrite(ast) {
        const receiver = wrapForDiagnostics(this.translate(ast.receiver));
        const left = ts.createPropertyAccess(receiver, ast.name);
        addParseSpanInfo(left, ast.nameSpan);
        // TypeScript reports assignment errors on the entire lvalue expression. Annotate the lvalue of
        // the assignment with the sourceSpan, which includes receivers, rather than nameSpan for
        // consistency of the diagnostic location.
        // a.b.c = 1
        // ^^^^^^^^^ sourceSpan
        //     ^     nameSpan
        const leftWithPath = wrapForDiagnostics(left);
        addParseSpanInfo(leftWithPath, ast.sourceSpan);
        // The right needs to be wrapped in parens as well or we cannot accurately match its
        // span to just the RHS. For example, the span in `e = $event /*0,10*/` is ambiguous.
        // It could refer to either the whole binary expression or just the RHS.
        // We should instead generate `e = ($event /*0,10*/)` so we know the span 0,10 matches RHS.
        const right = wrapForTypeChecker(this.translate(ast.value));
        const node = wrapForDiagnostics(ts.createBinary(leftWithPath, ts.SyntaxKind.EqualsToken, right));
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitQuote(ast) {
        return NULL_AS_ANY;
    }
    visitSafeMethodCall(ast) {
        // See the comments in SafePropertyRead above for an explanation of the cases here.
        let node;
        const receiver = wrapForDiagnostics(this.translate(ast.receiver));
        const args = ast.args.map(expr => this.translate(expr));
        if (this.config.strictSafeNavigationTypes) {
            // "a?.method(...)" becomes (null as any ? a!.method(...) : undefined)
            const method = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
            addParseSpanInfo(method, ast.nameSpan);
            const call = ts.createCall(method, undefined, args);
            node = ts.createParen(ts.createConditional(NULL_AS_ANY, call, UNDEFINED));
        }
        else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
            // "a?.method(...)" becomes (a as any).method(...)
            const method = ts.createPropertyAccess(tsCastToAny(receiver), ast.name);
            addParseSpanInfo(method, ast.nameSpan);
            node = ts.createCall(method, undefined, args);
        }
        else {
            // "a?.method(...)" becomes (a!.method(...) as any)
            const method = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
            addParseSpanInfo(method, ast.nameSpan);
            node = tsCastToAny(ts.createCall(method, undefined, args));
        }
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
    visitSafePropertyRead(ast) {
        let node;
        const receiver = wrapForDiagnostics(this.translate(ast.receiver));
        // The form of safe property reads depends on whether strictness is in use.
        if (this.config.strictSafeNavigationTypes) {
            // Basically, the return here is either the type of the complete expression with a null-safe
            // property read, or `undefined`. So a ternary is used to create an "or" type:
            // "a?.b" becomes (null as any ? a!.b : undefined)
            // The type of this expression is (typeof a!.b) | undefined, which is exactly as desired.
            const expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
            addParseSpanInfo(expr, ast.nameSpan);
            node = ts.createParen(ts.createConditional(NULL_AS_ANY, expr, UNDEFINED));
        }
        else if (VeSafeLhsInferenceBugDetector.veWillInferAnyFor(ast)) {
            // Emulate a View Engine bug where 'any' is inferred for the left-hand side of the safe
            // navigation operation. With this bug, the type of the left-hand side is regarded as any.
            // Therefore, the left-hand side only needs repeating in the output (to validate it), and then
            // 'any' is used for the rest of the expression. This is done using a comma operator:
            // "a?.b" becomes (a as any).b, which will of course have type 'any'.
            node = ts.createPropertyAccess(tsCastToAny(receiver), ast.name);
        }
        else {
            // The View Engine bug isn't active, so check the entire type of the expression, but the final
            // result is still inferred as `any`.
            // "a?.b" becomes (a!.b as any)
            const expr = ts.createPropertyAccess(ts.createNonNullExpression(receiver), ast.name);
            addParseSpanInfo(expr, ast.nameSpan);
            node = tsCastToAny(expr);
        }
        addParseSpanInfo(node, ast.sourceSpan);
        return node;
    }
}
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
class VeSafeLhsInferenceBugDetector {
    static veWillInferAnyFor(ast) {
        return ast.receiver.visit(VeSafeLhsInferenceBugDetector.SINGLETON);
    }
    visitUnary(ast) {
        return ast.expr.visit(this);
    }
    visitBinary(ast) {
        return ast.left.visit(this) || ast.right.visit(this);
    }
    visitChain(ast) {
        return false;
    }
    visitConditional(ast) {
        return ast.condition.visit(this) || ast.trueExp.visit(this) || ast.falseExp.visit(this);
    }
    visitFunctionCall(ast) {
        return true;
    }
    visitImplicitReceiver(ast) {
        return false;
    }
    visitThisReceiver(ast) {
        return false;
    }
    visitInterpolation(ast) {
        return ast.expressions.some(exp => exp.visit(this));
    }
    visitKeyedRead(ast) {
        return false;
    }
    visitKeyedWrite(ast) {
        return false;
    }
    visitLiteralArray(ast) {
        return true;
    }
    visitLiteralMap(ast) {
        return true;
    }
    visitLiteralPrimitive(ast) {
        return false;
    }
    visitMethodCall(ast) {
        return true;
    }
    visitPipe(ast) {
        return true;
    }
    visitPrefixNot(ast) {
        return ast.expression.visit(this);
    }
    visitNonNullAssert(ast) {
        return ast.expression.visit(this);
    }
    visitPropertyRead(ast) {
        return false;
    }
    visitPropertyWrite(ast) {
        return false;
    }
    visitQuote(ast) {
        return false;
    }
    visitSafeMethodCall(ast) {
        return true;
    }
    visitSafePropertyRead(ast) {
        return false;
    }
}
VeSafeLhsInferenceBugDetector.SINGLETON = new VeSafeLhsInferenceBugDetector();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9leHByZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBa0IsYUFBYSxFQUEyQyxTQUFTLEVBQW9QLE1BQU0sbUJBQW1CLENBQUM7QUFDeFcsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFJakMsT0FBTyxFQUFDLGdCQUFnQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFdEMsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUNwQixFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDL0YsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRW5ELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFpQztJQUN4RCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztJQUM5QixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztDQUNoQyxDQUFDLENBQUM7QUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBNEI7SUFDcEQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7SUFDOUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDL0IsQ0FBQyxHQUFHLEVB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QUM7SUFDZCxDQUFDO0lBQ0QscUJBQXFCLENBQUMsR0FBcUI7UUFDekMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDOztBQXZFYyx1Q0FBUyxHQUFHLElBQUksNkJBQTZCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0VmlzaXRvciwgQVNUV2l0aFNvdXJjZSwgQmluYXJ5LCBCaW5kaW5nUGlwZSwgQ2hhaW4sIENvbmRpdGlvbmFsLCBFbXB0eUV4cHIsIEZ1bmN0aW9uQ2FsbCwgSW1wbGljaXRSZWNlaXZlciwgSW50ZXJwb2xhdGlvbiwgS2V5ZWRSZWFkLCBLZXllZFdyaXRlLCBMaXRlcmFsQXJyYXksIExpdGVyYWxNYXAsIExpdGVyYWxQcmltaXRpdmUsIE1ldGhvZENhbGwsIE5vbk51bGxBc3NlcnQsIFByZWZpeE5vdCwgUHJvcGVydHlSZWFkLCBQcm9wZXJ0eVdyaXRlLCBRdW90ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRoaXNSZWNlaXZlciwgVW5hcnl9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1R5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHthZGRQYXJzZVNwYW5JbmZvLCB3cmFwRm9yRGlhZ25vc3RpY3MsIHdyYXBGb3JUeXBlQ2hlY2tlcn0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge3RzQ2FzdFRvQW55fSBmcm9tICcuL3RzX3V0aWwnO1xuXG5leHBvcnQgY29uc3QgTlVMTF9BU19BTlkgPVxuICAgIHRzLmNyZWF0ZUFzRXhwcmVzc2lvbih0cy5jcmVhdGVOdWxsKCksIHRzLmNyZWF0ZUtleXdvcmRUeXBlTm9kZSh0cy5TeW50YXhLaW5kLkFueUtleXdvcmQpKTtcbmNvbnN0IFVOREVGSU5FRCA9IHRzLmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpO1xuXG5jb25zdCBVTkFSWV9PUFMgPSBuZXcgTWFwPHN0cmluZywgdHMuUHJlZml4VW5hcnlPcGVyYXRvcj4oW1xuICBbJysnLCB0cy5TeW50YXhLaW5kLlBsdXNUb2tlbl0sXG4gIFsnLScsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG5dKTtcblxuY29uc3QgQklOQVJZX09QUyA9IG5ldyBNYXA8c3RyaW5nLCB0cy5CaW5hcnlPcGVyYXRvcj4oW1xuICBbJysnLCB0cy5TeW50YXhLaW5kLlBsdXNUb2tlbl0sXG4gIFsnLScsIHRzLlN5bnRheEtpbmQuTWludXNUb2tlbl0sXG4gIFsnPCcsIHRzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbl0sXG4gIFsnPicsIHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5Ub2tlbl0sXG4gIFsnPD0nLCB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW5dLFxuICBbJz49JywgdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuXSxcbiAgWyc9PScsIHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbJz09PScsIHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW5dLFxuICBbJyonLCB0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW5dLFxuICBbJy8nLCB0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW5dLFxuICBbJyUnLCB0cy5TeW50YXhLaW5kLlBlcmNlbnRUb2tlbl0sXG4gIFsnIT0nLCB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW5dLFxuICBbJyE9PScsIHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbl0sXG4gIFsnfHwnLCB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuXSxcbiAgWycmJicsIHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW5dLFxuICBbJyYnLCB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuXSxcbiAgWyd8JywgdHMuU3ludGF4S2luZC5CYXJUb2tlbl0sXG4gIFsnPz8nLCB0cy5TeW50YXhLaW5kLlF1ZXN0aW9uUXVlc3Rpb25Ub2tlbl0sXG5dKTtcblxuLyoqXG4gKiBDb252ZXJ0IGFuIGBBU1RgIHRvIFR5cGVTY3JpcHQgY29kZSBkaXJlY3RseSwgd2l0aG91dCBnb2luZyB0aHJvdWdoIGFuIGludGVybWVkaWF0ZSBgRXhwcmVzc2lvbmBcbiAqIEFTVC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzdFRvVHlwZXNjcmlwdChcbiAgICBhc3Q6IEFTVCwgbWF5YmVSZXNvbHZlOiAoYXN0OiBBU1QpID0+ICh0cy5FeHByZXNzaW9uIHwgbnVsbCksXG4gICAgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcpOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgdHJhbnNsYXRvciA9IG5ldyBBc3RUcmFuc2xhdG9yKG1heWJlUmVzb2x2ZSwgY29uZmlnKTtcbiAgcmV0dXJuIHRyYW5zbGF0b3IudHJhbnNsYXRlKGFzdCk7XG59XG5cbmNsYXNzIEFzdFRyYW5zbGF0b3IgaW1wbGVtZW50cyBBc3RWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG1heWJlUmVzb2x2ZTogKGFzdDogQVNUKSA9PiAodHMuRXhwcmVzc2lvbiB8IG51bGwpLFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZykge31cblxuICB0cmFuc2xhdGUoYXN0OiBBU1QpOiB0cy5FeHByZXNzaW9uIHtcbiAgICAvLyBTa2lwIG92ZXIgYW4gYEFTVFdpdGhTb3VyY2VgIGFzIGl0cyBgdmlzaXRgIG1ldGhvZCBjYWxscyBkaXJlY3RseSBpbnRvIGl0cyBhc3QncyBgdmlzaXRgLFxuICAgIC8vIHdoaWNoIHdvdWxkIHByZXZlbnQgYW55IGN1c3RvbSByZXNvbHV0aW9uIHRocm91Z2ggYG1heWJlUmVzb2x2ZWAgZm9yIHRoYXQgbm9kZS5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgICAgYXN0ID0gYXN0LmFzdDtcbiAgICB9XG5cbiAgICAvLyBUaGUgYEVtcHR5RXhwcmAgZG9lc24ndCBoYXZlIGEgZGVkaWNhdGVkIG1ldGhvZCBvbiBgQXN0VmlzaXRvcmAsIHNvIGl0J3Mgc3BlY2lhbCBjYXNlZCBoZXJlLlxuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBFbXB0eUV4cHIpIHtcbiAgICAgIGNvbnN0IHJlcyA9IHRzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKHJlcywgYXN0LnNvdXJjZVNwYW4pO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICAvLyBGaXJzdCBhdHRlbXB0IHRvIGxldCBhbnkgY3VzdG9tIHJlc29sdXRpb24gbG9naWMgcHJvdmlkZSBhIHRyYW5zbGF0aW9uIGZvciB0aGUgZ2l2ZW4gbm9kZS5cbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMubWF5YmVSZXNvbHZlKGFzdCk7XG4gICAgaWYgKHJlc29sdmVkICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFzdC52aXNpdCh0aGlzKTtcbiAgfVxuXG4gIHZpc2l0VW5hcnkoYXN0OiBVbmFyeSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuZXhwcik7XG4gICAgY29uc3Qgb3AgPSBVTkFSWV9PUFMuZ2V0KGFzdC5vcGVyYXRvcik7XG4gICAgaWYgKG9wID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgVW5hcnkub3BlcmF0b3I6ICR7YXN0Lm9wZXJhdG9yfWApO1xuICAgIH1cbiAgICBjb25zdCBub2RlID0gd3JhcEZvckRpYWdub3N0aWNzKHRzLmNyZWF0ZVByZWZpeChvcCwgZXhwcikpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRCaW5hcnkoYXN0OiBCaW5hcnkpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBsaHMgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LmxlZnQpKTtcbiAgICBjb25zdCByaHMgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJpZ2h0KSk7XG4gICAgY29uc3Qgb3AgPSBCSU5BUllfT1BTLmdldChhc3Qub3BlcmF0aW9uKTtcbiAgICBpZiAob3AgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBCaW5hcnkub3BlcmF0aW9uOiAke2FzdC5vcGVyYXRpb259YCk7XG4gICAgfVxuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVCaW5hcnkobGhzLCBvcCwgcmhzKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0Q2hhaW4oYXN0OiBDaGFpbik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gYXN0LmV4cHJlc3Npb25zLm1hcChleHByID0+IHRoaXMudHJhbnNsYXRlKGV4cHIpKTtcbiAgICBjb25zdCBub2RlID0gd3JhcEZvckRpYWdub3N0aWNzKHRzLmNyZWF0ZUNvbW1hTGlzdChlbGVtZW50cykpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRDb25kaXRpb25hbChhc3Q6IENvbmRpdGlvbmFsKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgY29uZEV4cHIgPSB0aGlzLnRyYW5zbGF0ZShhc3QuY29uZGl0aW9uKTtcbiAgICBjb25zdCB0cnVlRXhwciA9IHRoaXMudHJhbnNsYXRlKGFzdC50cnVlRXhwKTtcbiAgICAvLyBXcmFwIGBmYWxzZUV4cHJgIGluIHBhcmVucyBzbyB0aGF0IHRoZSB0cmFpbGluZyBwYXJzZSBzcGFuIGluZm8gaXMgbm90IGF0dHJpYnV0ZWQgdG8gdGhlXG4gICAgLy8gd2hvbGUgY29uZGl0aW9uYWwuXG4gICAgLy8gSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCB0aGUgbGFzdCBzb3VyY2Ugc3BhbiBjb21tZW50ICg1LDYpIGNvdWxkIGJlIHNlZW4gYXMgdGhlXG4gICAgLy8gdHJhaWxpbmcgY29tbWVudCBmb3IgX2VpdGhlcl8gdGhlIHdob2xlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gX29yXyBqdXN0IHRoZSBgZmFsc2VFeHByYCB0aGF0XG4gICAgLy8gaXMgaW1tZWRpYXRlbHkgYmVmb3JlIGl0OlxuICAgIC8vIGBjb25kaXRpb25hbCAvKjEsMiovID8gdHJ1ZUV4cHIgLyozLDQqLyA6IGZhbHNlRXhwciAvKjUsNiovYFxuICAgIC8vIFRoaXMgc2hvdWxkIGJlIGluc3RlYWQgYmUgYGNvbmRpdGlvbmFsIC8qMSwyKi8gPyB0cnVlRXhwciAvKjMsNCovIDogKGZhbHNlRXhwciAvKjUsNiovKWBcbiAgICBjb25zdCBmYWxzZUV4cHIgPSB3cmFwRm9yVHlwZUNoZWNrZXIodGhpcy50cmFuc2xhdGUoYXN0LmZhbHNlRXhwKSk7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKGNvbmRFeHByLCB0cnVlRXhwciwgZmFsc2VFeHByKSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uQ2FsbChhc3Q6IEZ1bmN0aW9uQ2FsbCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC50YXJnZXQhKSk7XG4gICAgY29uc3QgYXJncyA9IGFzdC5hcmdzLm1hcChleHByID0+IHRoaXMudHJhbnNsYXRlKGV4cHIpKTtcbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlQ2FsbChyZWNlaXZlciwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0SW1wbGljaXRSZWNlaXZlcihhc3Q6IEltcGxpY2l0UmVjZWl2ZXIpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRUaGlzUmVjZWl2ZXIoYXN0OiBUaGlzUmVjZWl2ZXIpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdDogSW50ZXJwb2xhdGlvbik6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIEJ1aWxkIHVwIGEgY2hhaW4gb2YgYmluYXJ5ICsgb3BlcmF0aW9ucyB0byBzaW11bGF0ZSB0aGUgc3RyaW5nIGNvbmNhdGVuYXRpb24gb2YgdGhlXG4gICAgLy8gaW50ZXJwb2xhdGlvbidzIGV4cHJlc3Npb25zLiBUaGUgY2hhaW4gaXMgc3RhcnRlZCB1c2luZyBhbiBhY3R1YWwgc3RyaW5nIGxpdGVyYWwgdG8gZW5zdXJlXG4gICAgLy8gdGhlIHR5cGUgaXMgaW5mZXJyZWQgYXMgJ3N0cmluZycuXG4gICAgcmV0dXJuIGFzdC5leHByZXNzaW9ucy5yZWR1Y2UoXG4gICAgICAgIChsaHMsIGFzdCkgPT5cbiAgICAgICAgICAgIHRzLmNyZWF0ZUJpbmFyeShsaHMsIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuLCB3cmFwRm9yVHlwZUNoZWNrZXIodGhpcy50cmFuc2xhdGUoYXN0KSkpLFxuICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKCcnKSk7XG4gIH1cblxuICB2aXNpdEtleWVkUmVhZChhc3Q6IEtleWVkUmVhZCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHJlY2VpdmVyID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5vYmopKTtcbiAgICBjb25zdCBrZXkgPSB0aGlzLnRyYW5zbGF0ZShhc3Qua2V5KTtcbiAgICBjb25zdCBub2RlID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcyhyZWNlaXZlciwga2V5KTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0S2V5ZWRXcml0ZShhc3Q6IEtleWVkV3JpdGUpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3Qub2JqKSk7XG4gICAgY29uc3QgbGVmdCA9IHRzLmNyZWF0ZUVsZW1lbnRBY2Nlc3MocmVjZWl2ZXIsIHRoaXMudHJhbnNsYXRlKGFzdC5rZXkpKTtcbiAgICAvLyBUT0RPKGpvb3N0KTogYW5ub3RhdGUgYGxlZnRgIHdpdGggdGhlIHNwYW4gb2YgdGhlIGVsZW1lbnQgYWNjZXNzLCB3aGljaCBpcyBub3QgY3VycmVudGx5XG4gICAgLy8gIGF2YWlsYWJsZSBvbiBgYXN0YC5cbiAgICBjb25zdCByaWdodCA9IHdyYXBGb3JUeXBlQ2hlY2tlcih0aGlzLnRyYW5zbGF0ZShhc3QudmFsdWUpKTtcbiAgICBjb25zdCBub2RlID0gd3JhcEZvckRpYWdub3N0aWNzKHRzLmNyZWF0ZUJpbmFyeShsZWZ0LCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCByaWdodCkpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsQXJyYXkoYXN0OiBMaXRlcmFsQXJyYXkpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBlbGVtZW50cyA9IGFzdC5leHByZXNzaW9ucy5tYXAoZXhwciA9PiB0aGlzLnRyYW5zbGF0ZShleHByKSk7XG4gICAgY29uc3QgbGl0ZXJhbCA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbChlbGVtZW50cyk7XG4gICAgLy8gSWYgc3RyaWN0TGl0ZXJhbFR5cGVzIGlzIGRpc2FibGVkLCBhcnJheSBsaXRlcmFscyBhcmUgY2FzdCB0byBgYW55YC5cbiAgICBjb25zdCBub2RlID0gdGhpcy5jb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID8gbGl0ZXJhbCA6IHRzQ2FzdFRvQW55KGxpdGVyYWwpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBhc3Qua2V5cy5tYXAoKHtrZXl9LCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlc1tpZHhdKTtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQodHMuY3JlYXRlU3RyaW5nTGl0ZXJhbChrZXkpLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgY29uc3QgbGl0ZXJhbCA9IHRzLmNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllcywgdHJ1ZSk7XG4gICAgLy8gSWYgc3RyaWN0TGl0ZXJhbFR5cGVzIGlzIGRpc2FibGVkLCBvYmplY3QgbGl0ZXJhbHMgYXJlIGNhc3QgdG8gYGFueWAuXG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuY29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA/IGxpdGVyYWwgOiB0c0Nhc3RUb0FueShsaXRlcmFsKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcbiAgICBpZiAoYXN0LnZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVJZGVudGlmaWVyKCd1bmRlZmluZWQnKTtcbiAgICB9IGVsc2UgaWYgKGFzdC52YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZU51bGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZUxpdGVyYWwoYXN0LnZhbHVlKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdE1ldGhvZENhbGwoYXN0OiBNZXRob2RDYWxsKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3QgbWV0aG9kID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3MocmVjZWl2ZXIsIGFzdC5uYW1lKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGUoZXhwcikpO1xuICAgIGNvbnN0IG5vZGUgPSB0cy5jcmVhdGVDYWxsKG1ldGhvZCwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0Tm9uTnVsbEFzc2VydChhc3Q6IE5vbk51bGxBc3NlcnQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5leHByZXNzaW9uKSk7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKGV4cHIpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRQaXBlKGFzdDogQmluZGluZ1BpcGUpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgdmlzaXRQcmVmaXhOb3QoYXN0OiBQcmVmaXhOb3QpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBleHByZXNzaW9uID0gd3JhcEZvckRpYWdub3N0aWNzKHRoaXMudHJhbnNsYXRlKGFzdC5leHByZXNzaW9uKSk7XG4gICAgY29uc3Qgbm9kZSA9IHRzLmNyZWF0ZUxvZ2ljYWxOb3QoZXhwcmVzc2lvbik7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdFByb3BlcnR5UmVhZChhc3Q6IFByb3BlcnR5UmVhZCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIC8vIFRoaXMgaXMgYSBub3JtYWwgcHJvcGVydHkgcmVhZCAtIGNvbnZlcnQgdGhlIHJlY2VpdmVyIHRvIGFuIGV4cHJlc3Npb24gYW5kIGVtaXQgdGhlIGNvcnJlY3RcbiAgICAvLyBUeXBlU2NyaXB0IGV4cHJlc3Npb24gdG8gcmVhZCB0aGUgcHJvcGVydHkuXG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3QgbmFtZSA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlY2VpdmVyLCBhc3QubmFtZSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhuYW1lLCBhc3QubmFtZVNwYW4pO1xuICAgIGNvbnN0IG5vZGUgPSB3cmFwRm9yRGlhZ25vc3RpY3MobmFtZSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0OiBQcm9wZXJ0eVdyaXRlKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgcmVjZWl2ZXIgPSB3cmFwRm9yRGlhZ25vc3RpY3ModGhpcy50cmFuc2xhdGUoYXN0LnJlY2VpdmVyKSk7XG4gICAgY29uc3QgbGVmdCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHJlY2VpdmVyLCBhc3QubmFtZSk7XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhsZWZ0LCBhc3QubmFtZVNwYW4pO1xuICAgIC8vIFR5cGVTY3JpcHQgcmVwb3J0cyBhc3NpZ25tZW50IGVycm9ycyBvbiB0aGUgZW50aXJlIGx2YWx1ZSBleHByZXNzaW9uLiBBbm5vdGF0ZSB0aGUgbHZhbHVlIG9mXG4gICAgLy8gdGhlIGFzc2lnbm1lbnQgd2l0aCB0aGUgc291cmNlU3Bhbiwgd2hpY2ggaW5jbHVkZXMgcmVjZWl2ZXJzLCByYXRoZXIgdGhhbiBuYW1lU3BhbiBmb3JcbiAgICAvLyBjb25zaXN0ZW5jeSBvZiB0aGUgZGlhZ25vc3RpYyBsb2NhdGlvbi5cbiAgICAvLyBhLmIuYyA9IDFcbiAgICAvLyBeXl5eXl5eXl4gc291cmNlU3BhblxuICAgIC8vICAgICBeICAgICBuYW1lU3BhblxuICAgIGNvbnN0IGxlZnRXaXRoUGF0aCA9IHdyYXBGb3JEaWFnbm9zdGljcyhsZWZ0KTtcbiAgICBhZGRQYXJzZVNwYW5JbmZvKGxlZnRXaXRoUGF0aCwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIC8vIFRoZSByaWdodCBuZWVkcyB0byBiZSB3cmFwcGVkIGluIHBhcmVucyBhcyB3ZWxsIG9yIHdlIGNhbm5vdCBhY2N1cmF0ZWx5IG1hdGNoIGl0c1xuICAgIC8vIHNwYW4gdG8ganVzdCB0aGUgUkhTLiBGb3IgZXhhbXBsZSwgdGhlIHNwYW4gaW4gYGUgPSAkZXZlbnQgLyowLDEwKi9gIGlzIGFtYmlndW91cy5cbiAgICAvLyBJdCBjb3VsZCByZWZlciB0byBlaXRoZXIgdGhlIHdob2xlIGJpbmFyeSBleHByZXNzaW9uIG9yIGp1c3QgdGhlIFJIUy5cbiAgICAvLyBXZSBzaG91bGQgaW5zdGVhZCBnZW5lcmF0ZSBgZSA9ICgkZXZlbnQgLyowLDEwKi8pYCBzbyB3ZSBrbm93IHRoZSBzcGFuIDAsMTAgbWF0Y2hlcyBSSFMuXG4gICAgY29uc3QgcmlnaHQgPSB3cmFwRm9yVHlwZUNoZWNrZXIodGhpcy50cmFuc2xhdGUoYXN0LnZhbHVlKSk7XG4gICAgY29uc3Qgbm9kZSA9XG4gICAgICAgIHdyYXBGb3JEaWFnbm9zdGljcyh0cy5jcmVhdGVCaW5hcnkobGVmdFdpdGhQYXRoLCB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuLCByaWdodCkpO1xuICAgIGFkZFBhcnNlU3BhbkluZm8obm9kZSwgYXN0LnNvdXJjZVNwYW4pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgdmlzaXRRdW90ZShhc3Q6IFF1b3RlKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIE5VTExfQVNfQU5ZO1xuICB9XG5cbiAgdmlzaXRTYWZlTWV0aG9kQ2FsbChhc3Q6IFNhZmVNZXRob2RDYWxsKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgLy8gU2VlIHRoZSBjb21tZW50cyBpbiBTYWZlUHJvcGVydHlSZWFkIGFib3ZlIGZvciBhbiBleHBsYW5hdGlvbiBvZiB0aGUgY2FzZXMgaGVyZS5cbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICBjb25zdCBhcmdzID0gYXN0LmFyZ3MubWFwKGV4cHIgPT4gdGhpcy50cmFuc2xhdGUoZXhwcikpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzKSB7XG4gICAgICAvLyBcImE/Lm1ldGhvZCguLi4pXCIgYmVjb21lcyAobnVsbCBhcyBhbnkgPyBhIS5tZXRob2QoLi4uKSA6IHVuZGVmaW5lZClcbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhtZXRob2QsIGFzdC5uYW1lU3Bhbik7XG4gICAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChtZXRob2QsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICBub2RlID0gdHMuY3JlYXRlUGFyZW4odHMuY3JlYXRlQ29uZGl0aW9uYWwoTlVMTF9BU19BTlksIGNhbGwsIFVOREVGSU5FRCkpO1xuICAgIH0gZWxzZSBpZiAoVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IudmVXaWxsSW5mZXJBbnlGb3IoYXN0KSkge1xuICAgICAgLy8gXCJhPy5tZXRob2QoLi4uKVwiIGJlY29tZXMgKGEgYXMgYW55KS5tZXRob2QoLi4uKVxuICAgICAgY29uc3QgbWV0aG9kID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3ModHNDYXN0VG9BbnkocmVjZWl2ZXIpLCBhc3QubmFtZSk7XG4gICAgICBhZGRQYXJzZVNwYW5JbmZvKG1ldGhvZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIG5vZGUgPSB0cy5jcmVhdGVDYWxsKG1ldGhvZCwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gXCJhPy5tZXRob2QoLi4uKVwiIGJlY29tZXMgKGEhLm1ldGhvZCguLi4pIGFzIGFueSlcbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhtZXRob2QsIGFzdC5uYW1lU3Bhbik7XG4gICAgICBub2RlID0gdHNDYXN0VG9BbnkodHMuY3JlYXRlQ2FsbChtZXRob2QsIHVuZGVmaW5lZCwgYXJncykpO1xuICAgIH1cbiAgICBhZGRQYXJzZVNwYW5JbmZvKG5vZGUsIGFzdC5zb3VyY2VTcGFuKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBsZXQgbm9kZTogdHMuRXhwcmVzc2lvbjtcbiAgICBjb25zdCByZWNlaXZlciA9IHdyYXBGb3JEaWFnbm9zdGljcyh0aGlzLnRyYW5zbGF0ZShhc3QucmVjZWl2ZXIpKTtcbiAgICAvLyBUaGUgZm9ybSBvZiBzYWZlIHByb3BlcnR5IHJlYWRzIGRlcGVuZHMgb24gd2hldGhlciBzdHJpY3RuZXNzIGlzIGluIHVzZS5cbiAgICBpZiAodGhpcy5jb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcykge1xuICAgICAgLy8gQmFzaWNhbGx5LCB0aGUgcmV0dXJuIGhlcmUgaXMgZWl0aGVyIHRoZSB0eXBlIG9mIHRoZSBjb21wbGV0ZSBleHByZXNzaW9uIHdpdGggYSBudWxsLXNhZmVcbiAgICAgIC8vIHByb3BlcnR5IHJlYWQsIG9yIGB1bmRlZmluZWRgLiBTbyBhIHRlcm5hcnkgaXMgdXNlZCB0byBjcmVhdGUgYW4gXCJvclwiIHR5cGU6XG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChudWxsIGFzIGFueSA/IGEhLmIgOiB1bmRlZmluZWQpXG4gICAgICAvLyBUaGUgdHlwZSBvZiB0aGlzIGV4cHJlc3Npb24gaXMgKHR5cGVvZiBhIS5iKSB8IHVuZGVmaW5lZCwgd2hpY2ggaXMgZXhhY3RseSBhcyBkZXNpcmVkLlxuICAgICAgY29uc3QgZXhwciA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzLmNyZWF0ZU5vbk51bGxFeHByZXNzaW9uKHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgICAgYWRkUGFyc2VTcGFuSW5mbyhleHByLCBhc3QubmFtZVNwYW4pO1xuICAgICAgbm9kZSA9IHRzLmNyZWF0ZVBhcmVuKHRzLmNyZWF0ZUNvbmRpdGlvbmFsKE5VTExfQVNfQU5ZLCBleHByLCBVTkRFRklORUQpKTtcbiAgICB9IGVsc2UgaWYgKFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yLnZlV2lsbEluZmVyQW55Rm9yKGFzdCkpIHtcbiAgICAgIC8vIEVtdWxhdGUgYSBWaWV3IEVuZ2luZSBidWcgd2hlcmUgJ2FueScgaXMgaW5mZXJyZWQgZm9yIHRoZSBsZWZ0LWhhbmQgc2lkZSBvZiB0aGUgc2FmZVxuICAgICAgLy8gbmF2aWdhdGlvbiBvcGVyYXRpb24uIFdpdGggdGhpcyBidWcsIHRoZSB0eXBlIG9mIHRoZSBsZWZ0LWhhbmQgc2lkZSBpcyByZWdhcmRlZCBhcyBhbnkuXG4gICAgICAvLyBUaGVyZWZvcmUsIHRoZSBsZWZ0LWhhbmQgc2lkZSBvbmx5IG5lZWRzIHJlcGVhdGluZyBpbiB0aGUgb3V0cHV0ICh0byB2YWxpZGF0ZSBpdCksIGFuZCB0aGVuXG4gICAgICAvLyAnYW55JyBpcyB1c2VkIGZvciB0aGUgcmVzdCBvZiB0aGUgZXhwcmVzc2lvbi4gVGhpcyBpcyBkb25lIHVzaW5nIGEgY29tbWEgb3BlcmF0b3I6XG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChhIGFzIGFueSkuYiwgd2hpY2ggd2lsbCBvZiBjb3Vyc2UgaGF2ZSB0eXBlICdhbnknLlxuICAgICAgbm9kZSA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzKHRzQ2FzdFRvQW55KHJlY2VpdmVyKSwgYXN0Lm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgVmlldyBFbmdpbmUgYnVnIGlzbid0IGFjdGl2ZSwgc28gY2hlY2sgdGhlIGVudGlyZSB0eXBlIG9mIHRoZSBleHByZXNzaW9uLCBidXQgdGhlIGZpbmFsXG4gICAgICAvLyByZXN1bHQgaXMgc3RpbGwgaW5mZXJyZWQgYXMgYGFueWAuXG4gICAgICAvLyBcImE/LmJcIiBiZWNvbWVzIChhIS5iIGFzIGFueSlcbiAgICAgIGNvbnN0IGV4cHIgPSB0cy5jcmVhdGVQcm9wZXJ0eUFjY2Vzcyh0cy5jcmVhdGVOb25OdWxsRXhwcmVzc2lvbihyZWNlaXZlciksIGFzdC5uYW1lKTtcbiAgICAgIGFkZFBhcnNlU3BhbkluZm8oZXhwciwgYXN0Lm5hbWVTcGFuKTtcbiAgICAgIG5vZGUgPSB0c0Nhc3RUb0FueShleHByKTtcbiAgICB9XG4gICAgYWRkUGFyc2VTcGFuSW5mbyhub2RlLCBhc3Quc291cmNlU3Bhbik7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBWaWV3IEVuZ2luZSB3aWxsIGluZmVyIGEgdHlwZSBvZiAnYW55JyBmb3IgdGhlIGxlZnQtaGFuZCBzaWRlIG9mIGEgc2FmZSBuYXZpZ2F0aW9uXG4gKiBvcGVyYXRpb24uXG4gKlxuICogSW4gVmlldyBFbmdpbmUncyB0ZW1wbGF0ZSB0eXBlLWNoZWNrZXIsIGNlcnRhaW4gcmVjZWl2ZXJzIG9mIHNhZmUgbmF2aWdhdGlvbiBvcGVyYXRpb25zIHdpbGxcbiAqIGNhdXNlIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGJlIGFsbG9jYXRlZCBhcyBwYXJ0IG9mIHRoZSBjaGVja2luZyBleHByZXNzaW9uLCB0byBzYXZlIHRoZSB2YWx1ZVxuICogb2YgdGhlIHJlY2VpdmVyIGFuZCB1c2UgaXQgbW9yZSB0aGFuIG9uY2UgaW4gdGhlIGV4cHJlc3Npb24uIFRoaXMgdGVtcG9yYXJ5IHZhcmlhYmxlIGhhcyB0eXBlXG4gKiAnYW55Jy4gSW4gcHJhY3RpY2UsIHRoaXMgbWVhbnMgY2VydGFpbiByZWNlaXZlcnMgY2F1c2UgVmlldyBFbmdpbmUgdG8gbm90IGNoZWNrIHRoZSBmdWxsXG4gKiBleHByZXNzaW9uLCBhbmQgb3RoZXIgcmVjZWl2ZXJzIHdpbGwgcmVjZWl2ZSBtb3JlIGNvbXBsZXRlIGNoZWNraW5nLlxuICpcbiAqIEZvciBjb21wYXRpYmlsaXR5LCB0aGlzIGxvZ2ljIGlzIGFkYXB0ZWQgZnJvbSBWaWV3IEVuZ2luZSdzIGV4cHJlc3Npb25fY29udmVydGVyLnRzIHNvIHRoYXQgdGhlXG4gKiBJdnkgY2hlY2tlciBjYW4gZW11bGF0ZSB0aGlzIGJ1ZyB3aGVuIG5lZWRlZC5cbiAqL1xuY2xhc3MgVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IgaW1wbGVtZW50cyBBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBzdGF0aWMgU0lOR0xFVE9OID0gbmV3IFZlU2FmZUxoc0luZmVyZW5jZUJ1Z0RldGVjdG9yKCk7XG5cbiAgc3RhdGljIHZlV2lsbEluZmVyQW55Rm9yKGFzdDogU2FmZU1ldGhvZENhbGx8U2FmZVByb3BlcnR5UmVhZCkge1xuICAgIHJldHVybiBhc3QucmVjZWl2ZXIudmlzaXQoVmVTYWZlTGhzSW5mZXJlbmNlQnVnRGV0ZWN0b3IuU0lOR0xFVE9OKTtcbiAgfVxuXG4gIHZpc2l0VW5hcnkoYXN0OiBVbmFyeSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QuZXhwci52aXNpdCh0aGlzKTtcbiAgfVxuICB2aXNpdEJpbmFyeShhc3Q6IEJpbmFyeSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QubGVmdC52aXNpdCh0aGlzKSB8fCBhc3QucmlnaHQudmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXRDaGFpbihhc3Q6IENoYWluKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0Q29uZGl0aW9uYWwoYXN0OiBDb25kaXRpb25hbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QuY29uZGl0aW9uLnZpc2l0KHRoaXMpIHx8IGFzdC50cnVlRXhwLnZpc2l0KHRoaXMpIHx8IGFzdC5mYWxzZUV4cC52aXNpdCh0aGlzKTtcbiAgfVxuICB2aXNpdEZ1bmN0aW9uQ2FsbChhc3Q6IEZ1bmN0aW9uQ2FsbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0SW1wbGljaXRSZWNlaXZlcihhc3Q6IEltcGxpY2l0UmVjZWl2ZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRUaGlzUmVjZWl2ZXIoYXN0OiBUaGlzUmVjZWl2ZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRJbnRlcnBvbGF0aW9uKGFzdDogSW50ZXJwb2xhdGlvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhc3QuZXhwcmVzc2lvbnMuc29tZShleHAgPT4gZXhwLnZpc2l0KHRoaXMpKTtcbiAgfVxuICB2aXNpdEtleWVkUmVhZChhc3Q6IEtleWVkUmVhZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2aXNpdEtleWVkV3JpdGUoYXN0OiBLZXllZFdyaXRlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0TGl0ZXJhbEFycmF5KGFzdDogTGl0ZXJhbEFycmF5KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRNZXRob2RDYWxsKGFzdDogTWV0aG9kQ2FsbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0UGlwZShhc3Q6IEJpbmRpbmdQaXBlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdmlzaXRQcmVmaXhOb3QoYXN0OiBQcmVmaXhOb3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gYXN0LmV4cHJlc3Npb24udmlzaXQodGhpcyk7XG4gIH1cbiAgdmlzaXROb25OdWxsQXNzZXJ0KGFzdDogUHJlZml4Tm90KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGFzdC5leHByZXNzaW9uLnZpc2l0KHRoaXMpO1xuICB9XG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0UHJvcGVydHlXcml0ZShhc3Q6IFByb3BlcnR5V3JpdGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmlzaXRRdW90ZShhc3Q6IFF1b3RlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZpc2l0U2FmZU1ldGhvZENhbGwoYXN0OiBTYWZlTWV0aG9kQ2FsbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZpc2l0U2FmZVByb3BlcnR5UmVhZChhc3Q6IFNhZmVQcm9wZXJ0eVJlYWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==