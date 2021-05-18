/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { Reference } from '../../imports';
import { isConcreteDeclaration } from '../../reflection';
import { isDeclaration } from '../../util/src/typescript';
import { ArrayConcatBuiltinFn, ArraySliceBuiltinFn } from './builtin';
import { DynamicValue } from './dynamic';
import { resolveKnownDeclaration } from './known_declaration';
import { EnumValue, KnownFn, ResolvedModule } from './result';
function literalBinaryOp(op) {
    return { op, literal: true };
}
function referenceBinaryOp(op) {
    return { op, literal: false };
}
const BINARY_OPERATORS = new Map([
    [ts.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
    [ts.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
    [ts.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
    [ts.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
    [ts.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
    [ts.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
    [ts.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
    [ts.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
    [ts.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
    [ts.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
    [ts.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
    [ts.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
    [ts.SyntaxKind.EqualsEqualsToken, literalBinaryOp((a, b) => a == b)],
    [ts.SyntaxKind.EqualsEqualsEqualsToken, literalBinaryOp((a, b) => a === b)],
    [ts.SyntaxKind.ExclamationEqualsToken, literalBinaryOp((a, b) => a != b)],
    [ts.SyntaxKind.ExclamationEqualsEqualsToken, literalBinaryOp((a, b) => a !== b)],
    [ts.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
    [ts.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
    [ts.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
    [ts.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
    [ts.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);
const UNARY_OPERATORS = new Map([
    [ts.SyntaxKind.TildeToken, a => ~a], [ts.SyntaxKind.MinusToken, a => -a],
    [ts.SyntaxKind.PlusToken, a => +a], [ts.SyntaxKind.ExclamationToken, a => !a]
]);
export class StaticInterpreter {
    constructor(host, checker, dependencyTracker) {
        this.host = host;
        this.checker = checker;
        this.dependencyTracker = dependencyTracker;
    }
    visit(node, context) {
        return this.visitExpression(node, context);
    }
    visitExpression(node, context) {
        let result;
        if (node.kind === ts.SyntaxKind.TrueKeyword) {
            return true;
        }
        else if (node.kind === ts.SyntaxKind.FalseKeyword) {
            return false;
        }
        else if (node.kind === ts.SyntaxKind.NullKeyword) {
            return null;
        }
        else if (ts.isStringLiteral(node)) {
            return node.text;
        }
        else if (ts.isNoSubstitutionTemplateLiteral(node)) {
            return node.text;
        }
        else if (ts.isTemplateExpression(node)) {
            result = this.visitTemplateExpression(node, context);
        }
        else if (ts.isNumericLiteral(node)) {
            return parseFloat(node.text);
        }
        else if (ts.isObjectLiteralExpression(node)) {
            result = this.visitObjectLiteralExpression(node, context);
        }
        else if (ts.isIdentifier(node)) {
            result = this.visitIdentifier(node, context);
        }
        else if (ts.isPropertyAccessExpression(node)) {
            result = this.visitPropertyAccessExpression(node, context);
        }
        else if (ts.isCallExpression(node)) {
            result = this.visitCallExpression(node, context);
        }
        else if (ts.isConditionalExpression(node)) {
            result = this.visitConditionalExpression(node, context);
        }
        else if (ts.isPrefixUnaryExpression(node)) {
            result = this.visitPrefixUnaryExpression(node, context);
        }
        else if (ts.isBinaryExpression(node)) {
            result = this.visitBinaryExpression(node, context);
        }
        else if (ts.isArrayLiteralExpression(node)) {
            result = this.visitArrayLiteralExpression(node, context);
        }
        else if (ts.isParenthesizedExpression(node)) {
            result = this.visitParenthesizedExpression(node, context);
        }
        else if (ts.isElementAccessExpression(node)) {
            result = this.visitElementAccessExpression(node, context);
        }
        else if (ts.isAsExpression(node)) {
            result = this.visitExpression(node.expression, context);
        }
        else if (ts.isNonNullExpression(node)) {
            result = this.visitExpression(node.expression, context);
        }
        else if (this.host.isClass(node)) {
            result = this.visitDeclaration(node, context);
        }
        else {
            return DynamicValue.fromUnsupportedSyntax(node);
        }
        if (result instanceof DynamicValue && result.node !== node) {
            return DynamicValue.fromDynamicInput(node, result);
        }
        return result;
    }
    visitArrayLiteralExpression(node, context) {
        const array = [];
        for (let i = 0; i < node.elements.length; i++) {
            const element = node.elements[i];
            if (ts.isSpreadElement(element)) {
                array.push(...this.visitSpreadElement(element, context));
            }
            else {
                array.push(this.visitExpression(element, context));
            }
        }
        return array;
    }
    visitObjectLiteralExpression(node, context) {
        const map = new Map();
        for (let i = 0; i < node.properties.length; i++) {
            const property = node.properties[i];
            if (ts.isPropertyAssignment(property)) {
                const name = this.stringNameFromPropertyName(property.name, context);
                // Check whether the name can be determined statically.
                if (name === undefined) {
                    return DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(property.name));
                }
                map.set(name, this.visitExpression(property.initializer, context));
            }
            else if (ts.isShorthandPropertyAssignment(property)) {
                const symbol = this.checker.getShorthandAssignmentValueSymbol(property);
                if (symbol === undefined || symbol.valueDeclaration === undefined) {
                    map.set(property.name.text, DynamicValue.fromUnknown(property));
                }
                else {
                    map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
                }
            }
            else if (ts.isSpreadAssignment(property)) {
                const spread = this.visitExpression(property.expression, context);
                if (spread instanceof DynamicValue) {
                    return DynamicValue.fromDynamicInput(node, spread);
                }
                else if (spread instanceof Map) {
                    spread.forEach((value, key) => map.set(key, value));
                }
                else if (spread instanceof ResolvedModule) {
                    spread.getExports().forEach((value, key) => map.set(key, value));
                }
                else {
                    return DynamicValue.fromDynamicInput(node, DynamicValue.fromInvalidExpressionType(property, spread));
                }
            }
            else {
                return DynamicValue.fromUnknown(node);
            }
        }
        return map;
    }
    visitTemplateExpression(node, context) {
        const pieces = [node.head.text];
        for (let i = 0; i < node.templateSpans.length; i++) {
            const span = node.templateSpans[i];
            const value = literal(this.visit(span.expression, context), () => DynamicValue.fromDynamicString(span.expression));
            if (value instanceof DynamicValue) {
                return DynamicValue.fromDynamicInput(node, value);
            }
            pieces.push(`${value}`, span.literal.text);
        }
        return pieces.join('');
    }
    visitIdentifier(node, context) {
        const decl = this.host.getDeclarationOfIdentifier(node);
        if (decl === null) {
            if (node.originalKeywordKind === ts.SyntaxKind.UndefinedKeyword) {
                return undefined;
            }
            else {
                // Check if the symbol here is imported.
                if (this.dependencyTracker !== null && this.host.getImportOfIdentifier(node) !== null) {
                    // It was, but no declaration for the node could be found. This means that the dependency
                    // graph for the current file cannot be properly updated to account for this (broken)
                    // import. Instead, the originating file is reported as failing dependency analysis,
                    // ensuring that future compilations will always attempt to re-resolve the previously
                    // broken identifier.
                    this.dependencyTracker.recordDependencyAnalysisFailure(context.originatingFile);
                }
                return DynamicValue.fromUnknownIdentifier(node);
            }
        }
        if (decl.known !== null) {
            return resolveKnownDeclaration(decl.known);
        }
        else if (isConcreteDeclaration(decl) && decl.identity !== null &&
            decl.identity.kind === 0 /* DownleveledEnum */) {
            return this.getResolvedEnum(decl.node, decl.identity.enumMembers, context);
        }
        const declContext = Object.assign(Object.assign({}, context), joinModuleContext(context, node, decl));
        const result = this.visitAmbiguousDeclaration(decl, declContext);
        if (result instanceof Reference) {
            // Only record identifiers to non-synthetic references. Synthetic references may not have the
            // same value at runtime as they do at compile time, so it's not legal to refer to them by the
            // identifier here.
            if (!result.synthetic) {
                result.addIdentifier(node);
            }
        }
        else if (result instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, result);
        }
        return result;
    }
    visitDeclaration(node, context) {
        if (this.dependencyTracker !== null) {
            this.dependencyTracker.addDependency(context.originatingFile, node.getSourceFile());
        }
        if (this.host.isClass(node)) {
            return this.getReference(node, context);
        }
        else if (ts.isVariableDeclaration(node)) {
            return this.visitVariableDeclaration(node, context);
        }
        else if (ts.isParameter(node) && context.scope.has(node)) {
            return context.scope.get(node);
        }
        else if (ts.isExportAssignment(node)) {
            return this.visitExpression(node.expression, context);
        }
        else if (ts.isEnumDeclaration(node)) {
            return this.visitEnumDeclaration(node, context);
        }
        else if (ts.isSourceFile(node)) {
            return this.visitSourceFile(node, context);
        }
        else if (ts.isBindingElement(node)) {
            return this.visitBindingElement(node, context);
        }
        else {
            return this.getReference(node, context);
        }
    }
    visitVariableDeclaration(node, context) {
        const value = this.host.getVariableValue(node);
        if (value !== null) {
            return this.visitExpression(value, context);
        }
        else if (isVariableDeclarationDeclared(node)) {
            return this.getReference(node, context);
        }
        else {
            return undefined;
        }
    }
    visitEnumDeclaration(node, context) {
        const enumRef = this.getReference(node, context);
        const map = new Map();
        node.members.forEach(member => {
            const name = this.stringNameFromPropertyName(member.name, context);
            if (name !== undefined) {
                const resolved = member.initializer && this.visit(member.initializer, context);
                map.set(name, new EnumValue(enumRef, name, resolved));
            }
        });
        return map;
    }
    visitElementAccessExpression(node, context) {
        const lhs = this.visitExpression(node.expression, context);
        if (lhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, lhs);
        }
        const rhs = this.visitExpression(node.argumentExpression, context);
        if (rhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, rhs);
        }
        if (typeof rhs !== 'string' && typeof rhs !== 'number') {
            return DynamicValue.fromInvalidExpressionType(node, rhs);
        }
        return this.accessHelper(node, lhs, rhs, context);
    }
    visitPropertyAccessExpression(node, context) {
        const lhs = this.visitExpression(node.expression, context);
        const rhs = node.name.text;
        // TODO: handle reference to class declaration.
        if (lhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, lhs);
        }
        return this.accessHelper(node, lhs, rhs, context);
    }
    visitSourceFile(node, context) {
        const declarations = this.host.getExportsOfModule(node);
        if (declarations === null) {
            return DynamicValue.fromUnknown(node);
        }
        return new ResolvedModule(declarations, decl => {
            if (decl.known !== null) {
                return resolveKnownDeclaration(decl.known);
            }
            const declContext = Object.assign(Object.assign({}, context), joinModuleContext(context, node, decl));
            // Visit both concrete and inline declarations.
            return this.visitAmbiguousDeclaration(decl, declContext);
        });
    }
    visitAmbiguousDeclaration(decl, declContext) {
        return decl.kind === 1 /* Inline */ && decl.implementation !== undefined &&
            !isDeclaration(decl.implementation) ?
            // Inline declarations whose `implementation` is a `ts.Expression` should be visited as
            // an expression.
            this.visitExpression(decl.implementation, declContext) :
            // Otherwise just visit the `node` as a declaration.
            this.visitDeclaration(decl.node, declContext);
    }
    accessHelper(node, lhs, rhs, context) {
        const strIndex = `${rhs}`;
        if (lhs instanceof Map) {
            if (lhs.has(strIndex)) {
                return lhs.get(strIndex);
            }
            else {
                return undefined;
            }
        }
        else if (lhs instanceof ResolvedModule) {
            return lhs.getExport(strIndex);
        }
        else if (Array.isArray(lhs)) {
            if (rhs === 'length') {
                return lhs.length;
            }
            else if (rhs === 'slice') {
                return new ArraySliceBuiltinFn(lhs);
            }
            else if (rhs === 'concat') {
                return new ArrayConcatBuiltinFn(lhs);
            }
            if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
                return DynamicValue.fromInvalidExpressionType(node, rhs);
            }
            return lhs[rhs];
        }
        else if (lhs instanceof Reference) {
            const ref = lhs.node;
            if (this.host.isClass(ref)) {
                const module = owningModule(context, lhs.bestGuessOwningModule);
                let value = undefined;
                const member = this.host.getMembersOfClass(ref).find(member => member.isStatic && member.name === strIndex);
                if (member !== undefined) {
                    if (member.value !== null) {
                        value = this.visitExpression(member.value, context);
                    }
                    else if (member.implementation !== null) {
                        value = new Reference(member.implementation, module);
                    }
                    else if (member.node) {
                        value = new Reference(member.node, module);
                    }
                }
                return value;
            }
            else if (isDeclaration(ref)) {
                return DynamicValue.fromDynamicInput(node, DynamicValue.fromExternalReference(ref, lhs));
            }
        }
        else if (lhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, lhs);
        }
        return DynamicValue.fromUnknown(node);
    }
    visitCallExpression(node, context) {
        const lhs = this.visitExpression(node.expression, context);
        if (lhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, lhs);
        }
        // If the call refers to a builtin function, attempt to evaluate the function.
        if (lhs instanceof KnownFn) {
            return lhs.evaluate(node, this.evaluateFunctionArguments(node, context));
        }
        if (!(lhs instanceof Reference)) {
            return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
        }
        const fn = this.host.getDefinitionOfFunction(lhs.node);
        if (fn === null) {
            return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
        }
        if (!isFunctionOrMethodReference(lhs)) {
            return DynamicValue.fromInvalidExpressionType(node.expression, lhs);
        }
        // If the function is foreign (declared through a d.ts file), attempt to resolve it with the
        // foreignFunctionResolver, if one is specified.
        if (fn.body === null) {
            let expr = null;
            if (context.foreignFunctionResolver) {
                expr = context.foreignFunctionResolver(lhs, node.arguments);
            }
            if (expr === null) {
                return DynamicValue.fromDynamicInput(node, DynamicValue.fromExternalReference(node.expression, lhs));
            }
            // If the function is declared in a different file, resolve the foreign function expression
            // using the absolute module name of that file (if any).
            if (lhs.bestGuessOwningModule !== null) {
                context = Object.assign(Object.assign({}, context), { absoluteModuleName: lhs.bestGuessOwningModule.specifier, resolutionContext: node.getSourceFile().fileName });
            }
            return this.visitFfrExpression(expr, context);
        }
        let res = this.visitFunctionBody(node, fn, context);
        // If the result of attempting to resolve the function body was a DynamicValue, attempt to use
        // the foreignFunctionResolver if one is present. This could still potentially yield a usable
        // value.
        if (res instanceof DynamicValue && context.foreignFunctionResolver !== undefined) {
            const ffrExpr = context.foreignFunctionResolver(lhs, node.arguments);
            if (ffrExpr !== null) {
                // The foreign function resolver was able to extract an expression from this function. See
                // if that expression leads to a non-dynamic result.
                const ffrRes = this.visitFfrExpression(ffrExpr, context);
                if (!(ffrRes instanceof DynamicValue)) {
                    // FFR yielded an actual result that's not dynamic, so use that instead of the original
                    // resolution.
                    res = ffrRes;
                }
            }
        }
        return res;
    }
    /**
     * Visit an expression which was extracted from a foreign-function resolver.
     *
     * This will process the result and ensure it's correct for FFR-resolved values, including marking
     * `Reference`s as synthetic.
     */
    visitFfrExpression(expr, context) {
        const res = this.visitExpression(expr, context);
        if (res instanceof Reference) {
            // This Reference was created synthetically, via a foreign function resolver. The real
            // runtime value of the function expression may be different than the foreign function
            // resolved value, so mark the Reference as synthetic to avoid it being misinterpreted.
            res.synthetic = true;
        }
        return res;
    }
    visitFunctionBody(node, fn, context) {
        if (fn.body === null) {
            return DynamicValue.fromUnknown(node);
        }
        else if (fn.body.length !== 1 || !ts.isReturnStatement(fn.body[0])) {
            return DynamicValue.fromComplexFunctionCall(node, fn);
        }
        const ret = fn.body[0];
        const args = this.evaluateFunctionArguments(node, context);
        const newScope = new Map();
        const calleeContext = Object.assign(Object.assign({}, context), { scope: newScope });
        fn.parameters.forEach((param, index) => {
            let arg = args[index];
            if (param.node.dotDotDotToken !== undefined) {
                arg = args.slice(index);
            }
            if (arg === undefined && param.initializer !== null) {
                arg = this.visitExpression(param.initializer, calleeContext);
            }
            newScope.set(param.node, arg);
        });
        return ret.expression !== undefined ? this.visitExpression(ret.expression, calleeContext) :
            undefined;
    }
    visitConditionalExpression(node, context) {
        const condition = this.visitExpression(node.condition, context);
        if (condition instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, condition);
        }
        if (condition) {
            return this.visitExpression(node.whenTrue, context);
        }
        else {
            return this.visitExpression(node.whenFalse, context);
        }
    }
    visitPrefixUnaryExpression(node, context) {
        const operatorKind = node.operator;
        if (!UNARY_OPERATORS.has(operatorKind)) {
            return DynamicValue.fromUnsupportedSyntax(node);
        }
        const op = UNARY_OPERATORS.get(operatorKind);
        const value = this.visitExpression(node.operand, context);
        if (value instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, value);
        }
        else {
            return op(value);
        }
    }
    visitBinaryExpression(node, context) {
        const tokenKind = node.operatorToken.kind;
        if (!BINARY_OPERATORS.has(tokenKind)) {
            return DynamicValue.fromUnsupportedSyntax(node);
        }
        const opRecord = BINARY_OPERATORS.get(tokenKind);
        let lhs, rhs;
        if (opRecord.literal) {
            lhs = literal(this.visitExpression(node.left, context), value => DynamicValue.fromInvalidExpressionType(node.left, value));
            rhs = literal(this.visitExpression(node.right, context), value => DynamicValue.fromInvalidExpressionType(node.right, value));
        }
        else {
            lhs = this.visitExpression(node.left, context);
            rhs = this.visitExpression(node.right, context);
        }
        if (lhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, lhs);
        }
        else if (rhs instanceof DynamicValue) {
            return DynamicValue.fromDynamicInput(node, rhs);
        }
        else {
            return opRecord.op(lhs, rhs);
        }
    }
    visitParenthesizedExpression(node, context) {
        return this.visitExpression(node.expression, context);
    }
    evaluateFunctionArguments(node, context) {
        const args = [];
        for (const arg of node.arguments) {
            if (ts.isSpreadElement(arg)) {
                args.push(...this.visitSpreadElement(arg, context));
            }
            else {
                args.push(this.visitExpression(arg, context));
            }
        }
        return args;
    }
    visitSpreadElement(node, context) {
        const spread = this.visitExpression(node.expression, context);
        if (spread instanceof DynamicValue) {
            return [DynamicValue.fromDynamicInput(node, spread)];
        }
        else if (!Array.isArray(spread)) {
            return [DynamicValue.fromInvalidExpressionType(node, spread)];
        }
        else {
            return spread;
        }
    }
    visitBindingElement(node, context) {
        const path = [];
        let closestDeclaration = node;
        while (ts.isBindingElement(closestDeclaration) ||
            ts.isArrayBindingPattern(closestDeclaration) ||
            ts.isObjectBindingPattern(closestDeclaration)) {
            if (ts.isBindingElement(closestDeclaration)) {
                path.unshift(closestDeclaration);
            }
            closestDeclaration = closestDeclaration.parent;
        }
        if (!ts.isVariableDeclaration(closestDeclaration) ||
            closestDeclaration.initializer === undefined) {
            return DynamicValue.fromUnknown(node);
        }
        let value = this.visit(closestDeclaration.initializer, context);
        for (const element of path) {
            let key;
            if (ts.isArrayBindingPattern(element.parent)) {
                key = element.parent.elements.indexOf(element);
            }
            else {
                const name = element.propertyName || element.name;
                if (ts.isIdentifier(name)) {
                    key = name.text;
                }
                else {
                    return DynamicValue.fromUnknown(element);
                }
            }
            value = this.accessHelper(element, value, key, context);
            if (value instanceof DynamicValue) {
                return value;
            }
        }
        return value;
    }
    stringNameFromPropertyName(node, context) {
        if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
            return node.text;
        }
        else if (ts.isComputedPropertyName(node)) {
            const literal = this.visitExpression(node.expression, context);
            return typeof literal === 'string' ? literal : undefined;
        }
        else {
            return undefined;
        }
    }
    getResolvedEnum(node, enumMembers, context) {
        const enumRef = this.getReference(node, context);
        const map = new Map();
        enumMembers.forEach(member => {
            const name = this.stringNameFromPropertyName(member.name, context);
            if (name !== undefined) {
                const resolved = this.visit(member.initializer, context);
                map.set(name, new EnumValue(enumRef, name, resolved));
            }
        });
        return map;
    }
    getReference(node, context) {
        return new Reference(node, owningModule(context));
    }
}
function isFunctionOrMethodReference(ref) {
    return ts.isFunctionDeclaration(ref.node) || ts.isMethodDeclaration(ref.node) ||
        ts.isFunctionExpression(ref.node);
}
function literal(value, reject) {
    if (value instanceof EnumValue) {
        value = value.resolved;
    }
    if (value instanceof DynamicValue || value === null || value === undefined ||
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return reject(value);
}
function isVariableDeclarationDeclared(node) {
    if (node.parent === undefined || !ts.isVariableDeclarationList(node.parent)) {
        return false;
    }
    const declList = node.parent;
    if (declList.parent === undefined || !ts.isVariableStatement(declList.parent)) {
        return false;
    }
    const varStmt = declList.parent;
    return varStmt.modifiers !== undefined &&
        varStmt.modifiers.some(mod => mod.kind === ts.SyntaxKind.DeclareKeyword);
}
const EMPTY = {};
function joinModuleContext(existing, node, decl) {
    if (decl.viaModule !== null && decl.viaModule !== existing.absoluteModuleName) {
        return {
            absoluteModuleName: decl.viaModule,
            resolutionContext: node.getSourceFile().fileName,
        };
    }
    else {
        return EMPTY;
    }
}
function owningModule(context, override = null) {
    let specifier = context.absoluteModuleName;
    if (override !== null) {
        specifier = override.specifier;
    }
    if (specifier !== null) {
        return {
            specifier,
            resolutionContext: context.resolutionContext,
        };
    }
    else {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR3hDLE9BQU8sRUFBZ0YscUJBQXFCLEVBQXlDLE1BQU0sa0JBQWtCLENBQUM7QUFDOUssT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRXhELE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNwRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRXZDLE9BQU8sRUFBQyx1QkFBdUIsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzVELE9BQU8sRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBc0QsTUFBTSxVQUFVLENBQUM7QUFlakgsU0FBUyxlQUFlLENBQUMsRUFBMkI7SUFDbEQsT0FBTyxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUM7QUFDN0IsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBMkI7SUFDcEQsT0FBTyxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQW1DO0lBQ2pFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHFCQUFxQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4RSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxzQ0FBc0MsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHFCQUFxQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDakUsQ0FBQyxDQUFDO0FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQWlDO0lBQzlELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVB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bnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7T3duaW5nTW9kdWxlfSBmcm9tICcuLi8uLi9pbXBvcnRzL3NyYy9yZWZlcmVuY2VzJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbktpbmQsIERlY2xhcmF0aW9uTm9kZSwgRW51bU1lbWJlciwgRnVuY3Rpb25EZWZpbml0aW9uLCBpc0NvbmNyZXRlRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0LCBTcGVjaWFsRGVjbGFyYXRpb25LaW5kfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXJyYXlDb25jYXRCdWlsdGluRm4sIEFycmF5U2xpY2VCdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7cmVzb2x2ZUtub3duRGVjbGFyYXRpb259IGZyb20gJy4va25vd25fZGVjbGFyYXRpb24nO1xuaW1wb3J0IHtFbnVtVmFsdWUsIEtub3duRm4sIFJlc29sdmVkTW9kdWxlLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4vcmVzdWx0JztcblxuXG5cbi8qKlxuICogVHJhY2tzIHRoZSBzY29wZSBvZiBhIGZ1bmN0aW9uIGJvZHksIHdoaWNoIGluY2x1ZGVzIGBSZXNvbHZlZFZhbHVlYHMgZm9yIHRoZSBwYXJhbWV0ZXJzIG9mIHRoYXRcbiAqIGJvZHkuXG4gKi9cbnR5cGUgU2NvcGUgPSBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+O1xuXG5pbnRlcmZhY2UgQmluYXJ5T3BlcmF0b3JEZWYge1xuICBsaXRlcmFsOiBib29sZWFuO1xuICBvcDogKGE6IGFueSwgYjogYW55KSA9PiBSZXNvbHZlZFZhbHVlO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiB0cnVlfTtcbn1cblxuZnVuY3Rpb24gcmVmZXJlbmNlQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiBmYWxzZX07XG59XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPHRzLlN5bnRheEtpbmQsIEJpbmFyeU9wZXJhdG9yRGVmPihbXG4gIFt0cy5TeW50YXhLaW5kLlBsdXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICsgYildLFxuICBbdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgLSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAqIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuU2xhc2hUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC8gYildLFxuICBbdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAlIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAmIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQmFyVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSB8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQ2FyZXRUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIF4gYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID49IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPT09IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+PiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBNYXRoLnBvdyhhLCBiKSldLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgJiYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgfHwgYildXG5dKTtcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCAoYTogYW55KSA9PiBhbnk+KFtcbiAgW3RzLlN5bnRheEtpbmQuVGlsZGVUb2tlbiwgYSA9PiB+YV0sIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGEgPT4gLWFdLFxuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGEgPT4gK2FdLCBbdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhID0+ICFhXVxuXSk7XG5cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgb3JpZ2luYXRpbmdGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICAvKipcbiAgICogVGhlIG1vZHVsZSBuYW1lIChpZiBhbnkpIHdoaWNoIHdhcyB1c2VkIHRvIHJlYWNoIHRoZSBjdXJyZW50bHkgcmVzb2x2aW5nIHN5bWJvbHMuXG4gICAqL1xuICBhYnNvbHV0ZU1vZHVsZU5hbWU6IHN0cmluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBBIGZpbGUgbmFtZSByZXByZXNlbnRpbmcgdGhlIGNvbnRleHQgaW4gd2hpY2ggdGhlIGN1cnJlbnQgYGFic29sdXRlTW9kdWxlTmFtZWAsIGlmIGFueSwgd2FzXG4gICAqIHJlc29sdmVkLlxuICAgKi9cbiAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZztcbiAgc2NvcGU6IFNjb3BlO1xuICBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcj86IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyO1xufVxuXG5leHBvcnQgY2xhc3MgU3RhdGljSW50ZXJwcmV0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIGRlcGVuZGVuY3lUcmFja2VyOiBEZXBlbmRlbmN5VHJhY2tlcnxudWxsKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHRzLkV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgbGV0IHJlc3VsdDogUmVzb2x2ZWRWYWx1ZTtcbiAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChub2RlLnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdE9iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0SWRlbnRpZmllcihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdENhbGxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1ByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEJpbmFyeUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNBc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vbk51bGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ob3N0LmlzQ2xhc3Mobm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXREZWNsYXJhdGlvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgJiYgcmVzdWx0Lm5vZGUgIT09IG5vZGUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBhcnJheTogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gbm9kZS5lbGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgYXJyYXkucHVzaCguLi50aGlzLnZpc2l0U3ByZWFkRWxlbWVudChlbGVtZW50LCBjb250ZXh0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcnJheS5wdXNoKHRoaXMudmlzaXRFeHByZXNzaW9uKGVsZW1lbnQsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgcHJvdGVjdGVkIHZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbWFwOiBSZXNvbHZlZFZhbHVlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5zdHJpbmdOYW1lRnJvbVByb3BlcnR5TmFtZShwcm9wZXJ0eS5uYW1lLCBjb250ZXh0KTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLnNldChuYW1lLCB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplciwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWFwLnNldChwcm9wZXJ0eS5uYW1lLnRleHQsIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihwcm9wZXJ0eSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCB0aGlzLnZpc2l0RGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cy5pc1NwcmVhZEFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ByZWFkIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgICAgc3ByZWFkLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IG1hcC5zZXQoa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9IGVsc2UgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIFJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgICAgc3ByZWFkLmdldEV4cG9ydHMoKS5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiBtYXAuc2V0KGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoXG4gICAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKHByb3BlcnR5LCBzcHJlYWQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRUZW1wbGF0ZUV4cHJlc3Npb24obm9kZTogdHMuVGVtcGxhdGVFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcGllY2VzOiBzdHJpbmdbXSA9IFtub2RlLmhlYWQudGV4dF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnRlbXBsYXRlU3BhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnRlbXBsYXRlU3BhbnNbaV07XG4gICAgICBjb25zdCB2YWx1ZSA9IGxpdGVyYWwoXG4gICAgICAgICAgdGhpcy52aXNpdChzcGFuLmV4cHJlc3Npb24sIGNvbnRleHQpLFxuICAgICAgICAgICgpID0+IER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhzcGFuLmV4cHJlc3Npb24pKTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgcGllY2VzLnB1c2goYCR7dmFsdWV9YCwgc3Bhbi5saXRlcmFsLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gcGllY2VzLmpvaW4oJycpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdElkZW50aWZpZXIobm9kZTogdHMuSWRlbnRpZmllciwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2wgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIobm9kZSk7XG4gICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgIGlmIChub2RlLm9yaWdpbmFsS2V5d29yZEtpbmQgPT09IHRzLlN5bnRheEtpbmQuVW5kZWZpbmVkS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHN5bWJvbCBoZXJlIGlzIGltcG9ydGVkLlxuICAgICAgICBpZiAodGhpcy5kZXBlbmRlbmN5VHJhY2tlciAhPT0gbnVsbCAmJiB0aGlzLmhvc3QuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKG5vZGUpICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gSXQgd2FzLCBidXQgbm8gZGVjbGFyYXRpb24gZm9yIHRoZSBub2RlIGNvdWxkIGJlIGZvdW5kLiBUaGlzIG1lYW5zIHRoYXQgdGhlIGRlcGVuZGVuY3lcbiAgICAgICAgICAvLyBncmFwaCBmb3IgdGhlIGN1cnJlbnQgZmlsZSBjYW5ub3QgYmUgcHJvcGVybHkgdXBkYXRlZCB0byBhY2NvdW50IGZvciB0aGlzIChicm9rZW4pXG4gICAgICAgICAgLy8gaW1wb3J0LiBJbnN0ZWFkLCB0aGUgb3JpZ2luYXRpbmcgZmlsZSBpcyByZXBvcnRlZCBhcyBmYWlsaW5nIGRlcGVuZGVuY3kgYW5hbHlzaXMsXG4gICAgICAgICAgLy8gZW5zdXJpbmcgdGhhdCBmdXR1cmUgY29tcGlsYXRpb25zIHdpbGwgYWx3YXlzIGF0dGVtcHQgdG8gcmUtcmVzb2x2ZSB0aGUgcHJldmlvdXNseVxuICAgICAgICAgIC8vIGJyb2tlbiBpZGVudGlmaWVyLlxuICAgICAgICAgIHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIucmVjb3JkRGVwZW5kZW5jeUFuYWx5c2lzRmFpbHVyZShjb250ZXh0Lm9yaWdpbmF0aW5nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bklkZW50aWZpZXIobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWNsLmtub3duICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZUtub3duRGVjbGFyYXRpb24oZGVjbC5rbm93bik7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgaXNDb25jcmV0ZURlY2xhcmF0aW9uKGRlY2wpICYmIGRlY2wuaWRlbnRpdHkgIT09IG51bGwgJiZcbiAgICAgICAgZGVjbC5pZGVudGl0eS5raW5kID09PSBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLkRvd25sZXZlbGVkRW51bSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzb2x2ZWRFbnVtKGRlY2wubm9kZSwgZGVjbC5pZGVudGl0eS5lbnVtTWVtYmVycywgY29udGV4dCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xDb250ZXh0ID0gey4uLmNvbnRleHQsIC4uLmpvaW5Nb2R1bGVDb250ZXh0KGNvbnRleHQsIG5vZGUsIGRlY2wpfTtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLnZpc2l0QW1iaWd1b3VzRGVjbGFyYXRpb24oZGVjbCwgZGVjbENvbnRleHQpO1xuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIC8vIE9ubHkgcmVjb3JkIGlkZW50aWZpZXJzIHRvIG5vbi1zeW50aGV0aWMgcmVmZXJlbmNlcy4gU3ludGhldGljIHJlZmVyZW5jZXMgbWF5IG5vdCBoYXZlIHRoZVxuICAgICAgLy8gc2FtZSB2YWx1ZSBhdCBydW50aW1lIGFzIHRoZXkgZG8gYXQgY29tcGlsZSB0aW1lLCBzbyBpdCdzIG5vdCBsZWdhbCB0byByZWZlciB0byB0aGVtIGJ5IHRoZVxuICAgICAgLy8gaWRlbnRpZmllciBoZXJlLlxuICAgICAgaWYgKCFyZXN1bHQuc3ludGhldGljKSB7XG4gICAgICAgIHJlc3VsdC5hZGRJZGVudGlmaWVyKG5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVzdWx0IGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXREZWNsYXJhdGlvbihub2RlOiBEZWNsYXJhdGlvbk5vZGUsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAodGhpcy5kZXBlbmRlbmN5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5kZXBlbmRlbmN5VHJhY2tlci5hZGREZXBlbmRlbmN5KGNvbnRleHQub3JpZ2luYXRpbmdGaWxlLCBub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmFtZXRlcihub2RlKSAmJiBjb250ZXh0LnNjb3BlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIGNvbnRleHQuc2NvcGUuZ2V0KG5vZGUpITtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRXhwb3J0QXNzaWdubWVudChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VudW1EZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1NvdXJjZUZpbGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0U291cmNlRmlsZShub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQmluZGluZ0VsZW1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0QmluZGluZ0VsZW1lbnQobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmhvc3QuZ2V0VmFyaWFibGVWYWx1ZShub2RlKTtcbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbih2YWx1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZTogdHMuRW51bURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgbm9kZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG1lbWJlci5uYW1lLCBjb250ZXh0KTtcbiAgICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBtZW1iZXIuaW5pdGlhbGl6ZXIgJiYgdGhpcy52aXNpdChtZW1iZXIuaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgICBtYXAuc2V0KG5hbWUsIG5ldyBFbnVtVmFsdWUoZW51bVJlZiwgbmFtZSwgcmVzb2x2ZWQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIGNvbnN0IHJocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAocmhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmhzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByaHMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByaHMgIT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgcmhzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hY2Nlc3NIZWxwZXIobm9kZSwgbGhzLCByaHMsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBjb25zdCByaHMgPSBub2RlLm5hbWUudGV4dDtcbiAgICAvLyBUT0RPOiBoYW5kbGUgcmVmZXJlbmNlIHRvIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hY2Nlc3NIZWxwZXIobm9kZSwgbGhzLCByaHMsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFNvdXJjZUZpbGUobm9kZTogdHMuU291cmNlRmlsZSwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUobm9kZSk7XG4gICAgaWYgKGRlY2xhcmF0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc29sdmVkTW9kdWxlKGRlY2xhcmF0aW9ucywgZGVjbCA9PiB7XG4gICAgICBpZiAoZGVjbC5rbm93biAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZUtub3duRGVjbGFyYXRpb24oZGVjbC5rbm93bik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlY2xDb250ZXh0ID0ge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFZpc2l0IGJvdGggY29uY3JldGUgYW5kIGlubGluZSBkZWNsYXJhdGlvbnMuXG4gICAgICByZXR1cm4gdGhpcy52aXNpdEFtYmlndW91c0RlY2xhcmF0aW9uKGRlY2wsIGRlY2xDb250ZXh0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRBbWJpZ3VvdXNEZWNsYXJhdGlvbihkZWNsOiBEZWNsYXJhdGlvbiwgZGVjbENvbnRleHQ6IENvbnRleHQpIHtcbiAgICByZXR1cm4gZGVjbC5raW5kID09PSBEZWNsYXJhdGlvbktpbmQuSW5saW5lICYmIGRlY2wuaW1wbGVtZW50YXRpb24gIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgIWlzRGVjbGFyYXRpb24oZGVjbC5pbXBsZW1lbnRhdGlvbikgP1xuICAgICAgICAvLyBJbmxpbmUgZGVjbGFyYXRpb25zIHdob3NlIGBpbXBsZW1lbnRhdGlvbmAgaXMgYSBgdHMuRXhwcmVzc2lvbmAgc2hvdWxkIGJlIHZpc2l0ZWQgYXNcbiAgICAgICAgLy8gYW4gZXhwcmVzc2lvbi5cbiAgICAgICAgdGhpcy52aXNpdEV4cHJlc3Npb24oZGVjbC5pbXBsZW1lbnRhdGlvbiwgZGVjbENvbnRleHQpIDpcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGp1c3QgdmlzaXQgdGhlIGBub2RlYCBhcyBhIGRlY2xhcmF0aW9uLlxuICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCBkZWNsQ29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGFjY2Vzc0hlbHBlcihub2RlOiB0cy5Ob2RlLCBsaHM6IFJlc29sdmVkVmFsdWUsIHJoczogc3RyaW5nfG51bWJlciwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBzdHJJbmRleCA9IGAke3Joc31gO1xuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChsaHMuaGFzKHN0ckluZGV4KSkge1xuICAgICAgICByZXR1cm4gbGhzLmdldChzdHJJbmRleCkhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGxocyBpbnN0YW5jZW9mIFJlc29sdmVkTW9kdWxlKSB7XG4gICAgICByZXR1cm4gbGhzLmdldEV4cG9ydChzdHJJbmRleCk7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxocykpIHtcbiAgICAgIGlmIChyaHMgPT09ICdsZW5ndGgnKSB7XG4gICAgICAgIHJldHVybiBsaHMubGVuZ3RoO1xuICAgICAgfSBlbHNlIGlmIChyaHMgPT09ICdzbGljZScpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheVNsaWNlQnVpbHRpbkZuKGxocyk7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ2NvbmNhdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheUNvbmNhdEJ1aWx0aW5GbihsaHMpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiByaHMgIT09ICdudW1iZXInIHx8ICFOdW1iZXIuaXNJbnRlZ2VyKHJocykpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUsIHJocyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGhzW3Joc107XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGNvbnN0IHJlZiA9IGxocy5ub2RlO1xuICAgICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKHJlZikpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlID0gb3duaW5nTW9kdWxlKGNvbnRleHQsIGxocy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpO1xuICAgICAgICBsZXQgdmFsdWU6IFJlc29sdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMuaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhyZWYpLmZpbmQoXG4gICAgICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBzdHJJbmRleCk7XG4gICAgICAgIGlmIChtZW1iZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChtZW1iZXIudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24obWVtYmVyLnZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5pbXBsZW1lbnRhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVmZXJlbmNlKG1lbWJlci5pbXBsZW1lbnRhdGlvbiwgbW9kdWxlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5ub2RlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWZlcmVuY2UobWVtYmVyLm5vZGUsIG1vZHVsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWNsYXJhdGlvbihyZWYpKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChcbiAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRXh0ZXJuYWxSZWZlcmVuY2UocmVmLCBsaHMgYXMgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENhbGxFeHByZXNzaW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY2FsbCByZWZlcnMgdG8gYSBidWlsdGluIGZ1bmN0aW9uLCBhdHRlbXB0IHRvIGV2YWx1YXRlIHRoZSBmdW5jdGlvbi5cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgS25vd25Gbikge1xuICAgICAgcmV0dXJuIGxocy5ldmFsdWF0ZShub2RlLCB0aGlzLmV2YWx1YXRlRnVuY3Rpb25Bcmd1bWVudHMobm9kZSwgY29udGV4dCkpO1xuICAgIH1cblxuICAgIGlmICghKGxocyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLmV4cHJlc3Npb24sIGxocyk7XG4gICAgfVxuXG4gICAgY29uc3QgZm4gPSB0aGlzLmhvc3QuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24obGhzLm5vZGUpO1xuICAgIGlmIChmbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShsaHMpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBmb3JlaWduIChkZWNsYXJlZCB0aHJvdWdoIGEgZC50cyBmaWxlKSwgYXR0ZW1wdCB0byByZXNvbHZlIGl0IHdpdGggdGhlXG4gICAgLy8gZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgaWYgKGZuLmJvZHkgPT09IG51bGwpIHtcbiAgICAgIGxldCBleHByOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgICAgaWYgKGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIpIHtcbiAgICAgICAgZXhwciA9IGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIobGhzLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoXG4gICAgICAgICAgICBub2RlLCBEeW5hbWljVmFsdWUuZnJvbUV4dGVybmFsUmVmZXJlbmNlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBkZWNsYXJlZCBpbiBhIGRpZmZlcmVudCBmaWxlLCByZXNvbHZlIHRoZSBmb3JlaWduIGZ1bmN0aW9uIGV4cHJlc3Npb25cbiAgICAgIC8vIHVzaW5nIHRoZSBhYnNvbHV0ZSBtb2R1bGUgbmFtZSBvZiB0aGF0IGZpbGUgKGlmIGFueSkuXG4gICAgICBpZiAobGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgICBjb250ZXh0ID0ge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBsaHMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcixcbiAgICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RmZyRXhwcmVzc2lvbihleHByLCBjb250ZXh0KTtcbiAgICB9XG5cbiAgICBsZXQgcmVzOiBSZXNvbHZlZFZhbHVlID0gdGhpcy52aXNpdEZ1bmN0aW9uQm9keShub2RlLCBmbiwgY29udGV4dCk7XG5cbiAgICAvLyBJZiB0aGUgcmVzdWx0IG9mIGF0dGVtcHRpbmcgdG8gcmVzb2x2ZSB0aGUgZnVuY3Rpb24gYm9keSB3YXMgYSBEeW5hbWljVmFsdWUsIGF0dGVtcHQgdG8gdXNlXG4gICAgLy8gdGhlIGZvcmVpZ25GdW5jdGlvblJlc29sdmVyIGlmIG9uZSBpcyBwcmVzZW50LiBUaGlzIGNvdWxkIHN0aWxsIHBvdGVudGlhbGx5IHlpZWxkIGEgdXNhYmxlXG4gICAgLy8gdmFsdWUuXG4gICAgaWYgKHJlcyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSAmJiBjb250ZXh0LmZvcmVpZ25GdW5jdGlvblJlc29sdmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGZmckV4cHIgPSBjb250ZXh0LmZvcmVpZ25GdW5jdGlvblJlc29sdmVyKGxocywgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgaWYgKGZmckV4cHIgIT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhlIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIgd2FzIGFibGUgdG8gZXh0cmFjdCBhbiBleHByZXNzaW9uIGZyb20gdGhpcyBmdW5jdGlvbi4gU2VlXG4gICAgICAgIC8vIGlmIHRoYXQgZXhwcmVzc2lvbiBsZWFkcyB0byBhIG5vbi1keW5hbWljIHJlc3VsdC5cbiAgICAgICAgY29uc3QgZmZyUmVzID0gdGhpcy52aXNpdEZmckV4cHJlc3Npb24oZmZyRXhwciwgY29udGV4dCk7XG4gICAgICAgIGlmICghKGZmclJlcyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkpIHtcbiAgICAgICAgICAvLyBGRlIgeWllbGRlZCBhbiBhY3R1YWwgcmVzdWx0IHRoYXQncyBub3QgZHluYW1pYywgc28gdXNlIHRoYXQgaW5zdGVhZCBvZiB0aGUgb3JpZ2luYWxcbiAgICAgICAgICAvLyByZXNvbHV0aW9uLlxuICAgICAgICAgIHJlcyA9IGZmclJlcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXQgYW4gZXhwcmVzc2lvbiB3aGljaCB3YXMgZXh0cmFjdGVkIGZyb20gYSBmb3JlaWduLWZ1bmN0aW9uIHJlc29sdmVyLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcHJvY2VzcyB0aGUgcmVzdWx0IGFuZCBlbnN1cmUgaXQncyBjb3JyZWN0IGZvciBGRlItcmVzb2x2ZWQgdmFsdWVzLCBpbmNsdWRpbmcgbWFya2luZ1xuICAgKiBgUmVmZXJlbmNlYHMgYXMgc3ludGhldGljLlxuICAgKi9cbiAgcHJpdmF0ZSB2aXNpdEZmckV4cHJlc3Npb24oZXhwcjogdHMuRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IHJlcyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpO1xuICAgIGlmIChyZXMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIC8vIFRoaXMgUmVmZXJlbmNlIHdhcyBjcmVhdGVkIHN5bnRoZXRpY2FsbHksIHZpYSBhIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIuIFRoZSByZWFsXG4gICAgICAvLyBydW50aW1lIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIG1heSBiZSBkaWZmZXJlbnQgdGhhbiB0aGUgZm9yZWlnbiBmdW5jdGlvblxuICAgICAgLy8gcmVzb2x2ZWQgdmFsdWUsIHNvIG1hcmsgdGhlIFJlZmVyZW5jZSBhcyBzeW50aGV0aWMgdG8gYXZvaWQgaXQgYmVpbmcgbWlzaW50ZXJwcmV0ZWQuXG4gICAgICByZXMuc3ludGhldGljID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRGdW5jdGlvbkJvZHkobm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGZuOiBGdW5jdGlvbkRlZmluaXRpb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKGZuLmJvZHkgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgfSBlbHNlIGlmIChmbi5ib2R5Lmxlbmd0aCAhPT0gMSB8fCAhdHMuaXNSZXR1cm5TdGF0ZW1lbnQoZm4uYm9keVswXSkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUNvbXBsZXhGdW5jdGlvbkNhbGwobm9kZSwgZm4pO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBmbi5ib2R5WzBdIGFzIHRzLlJldHVyblN0YXRlbWVudDtcblxuICAgIGNvbnN0IGFyZ3MgPSB0aGlzLmV2YWx1YXRlRnVuY3Rpb25Bcmd1bWVudHMobm9kZSwgY29udGV4dCk7XG4gICAgY29uc3QgbmV3U2NvcGU6IFNjb3BlID0gbmV3IE1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgUmVzb2x2ZWRWYWx1ZT4oKTtcbiAgICBjb25zdCBjYWxsZWVDb250ZXh0ID0gey4uLmNvbnRleHQsIHNjb3BlOiBuZXdTY29wZX07XG4gICAgZm4ucGFyYW1ldGVycy5mb3JFYWNoKChwYXJhbSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCBhcmcgPSBhcmdzW2luZGV4XTtcbiAgICAgIGlmIChwYXJhbS5ub2RlLmRvdERvdERvdFRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXJnID0gYXJncy5zbGljZShpbmRleCk7XG4gICAgICB9XG4gICAgICBpZiAoYXJnID09PSB1bmRlZmluZWQgJiYgcGFyYW0uaW5pdGlhbGl6ZXIgIT09IG51bGwpIHtcbiAgICAgICAgYXJnID0gdGhpcy52aXNpdEV4cHJlc3Npb24ocGFyYW0uaW5pdGlhbGl6ZXIsIGNhbGxlZUNvbnRleHQpO1xuICAgICAgfVxuICAgICAgbmV3U2NvcGUuc2V0KHBhcmFtLm5vZGUsIGFyZyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmV0LmV4cHJlc3Npb24gIT09IHVuZGVmaW5lZCA/IHRoaXMudmlzaXRFeHByZXNzaW9uKHJldC5leHByZXNzaW9uLCBjYWxsZWVDb250ZXh0KSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0Q29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGU6IHRzLkNvbmRpdGlvbmFsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmNvbmRpdGlvbiwgY29udGV4dCk7XG4gICAgaWYgKGNvbmRpdGlvbiBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGNvbmRpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKGNvbmRpdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUud2hlblRydWUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuRmFsc2UsIGNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQcmVmaXhVbmFyeUV4cHJlc3Npb24obm9kZTogdHMuUHJlZml4VW5hcnlFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IG9wZXJhdG9yS2luZCA9IG5vZGUub3BlcmF0b3I7XG4gICAgaWYgKCFVTkFSWV9PUEVSQVRPUlMuaGFzKG9wZXJhdG9yS2luZCkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG9wID0gVU5BUllfT1BFUkFUT1JTLmdldChvcGVyYXRvcktpbmQpITtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUub3BlcmFuZCwgY29udGV4dCk7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3AodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRCaW5hcnlFeHByZXNzaW9uKG5vZGU6IHRzLkJpbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCB0b2tlbktpbmQgPSBub2RlLm9wZXJhdG9yVG9rZW4ua2luZDtcbiAgICBpZiAoIUJJTkFSWV9PUEVSQVRPUlMuaGFzKHRva2VuS2luZCkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG9wUmVjb3JkID0gQklOQVJZX09QRVJBVE9SUy5nZXQodG9rZW5LaW5kKSE7XG4gICAgbGV0IGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBSZXNvbHZlZFZhbHVlO1xuICAgIGlmIChvcFJlY29yZC5saXRlcmFsKSB7XG4gICAgICBsaHMgPSBsaXRlcmFsKFxuICAgICAgICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCksXG4gICAgICAgICAgdmFsdWUgPT4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5sZWZ0LCB2YWx1ZSkpO1xuICAgICAgcmhzID0gbGl0ZXJhbChcbiAgICAgICAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KSxcbiAgICAgICAgICB2YWx1ZSA9PiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLnJpZ2h0LCB2YWx1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnRleHQpO1xuICAgICAgcmhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5yaWdodCwgY29udGV4dCk7XG4gICAgfVxuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH0gZWxzZSBpZiAocmhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wUmVjb3JkLm9wKGxocywgcmhzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZTogdHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGV2YWx1YXRlRnVuY3Rpb25Bcmd1bWVudHMobm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlQXJyYXkge1xuICAgIGNvbnN0IGFyZ3M6IFJlc29sdmVkVmFsdWVBcnJheSA9IFtdO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIG5vZGUuYXJndW1lbnRzKSB7XG4gICAgICBpZiAodHMuaXNTcHJlYWRFbGVtZW50KGFyZykpIHtcbiAgICAgICAgYXJncy5wdXNoKC4uLnRoaXMudmlzaXRTcHJlYWRFbGVtZW50KGFyZywgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJncy5wdXNoKHRoaXMudmlzaXRFeHByZXNzaW9uKGFyZywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJncztcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRTcHJlYWRFbGVtZW50KG5vZGU6IHRzLlNwcmVhZEVsZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlQXJyYXkge1xuICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIFtEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBzcHJlYWQpXTtcbiAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHNwcmVhZCkpIHtcbiAgICAgIHJldHVybiBbRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgc3ByZWFkKV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzcHJlYWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEJpbmRpbmdFbGVtZW50KG5vZGU6IHRzLkJpbmRpbmdFbGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcGF0aDogdHMuQmluZGluZ0VsZW1lbnRbXSA9IFtdO1xuICAgIGxldCBjbG9zZXN0RGVjbGFyYXRpb246IHRzLk5vZGUgPSBub2RlO1xuXG4gICAgd2hpbGUgKHRzLmlzQmluZGluZ0VsZW1lbnQoY2xvc2VzdERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICB0cy5pc0FycmF5QmluZGluZ1BhdHRlcm4oY2xvc2VzdERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICB0cy5pc09iamVjdEJpbmRpbmdQYXR0ZXJuKGNsb3Nlc3REZWNsYXJhdGlvbikpIHtcbiAgICAgIGlmICh0cy5pc0JpbmRpbmdFbGVtZW50KGNsb3Nlc3REZWNsYXJhdGlvbikpIHtcbiAgICAgICAgcGF0aC51bnNoaWZ0KGNsb3Nlc3REZWNsYXJhdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGNsb3Nlc3REZWNsYXJhdGlvbiA9IGNsb3Nlc3REZWNsYXJhdGlvbi5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oY2xvc2VzdERlY2xhcmF0aW9uKSB8fFxuICAgICAgICBjbG9zZXN0RGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9XG5cbiAgICBsZXQgdmFsdWUgPSB0aGlzLnZpc2l0KGNsb3Nlc3REZWNsYXJhdGlvbi5pbml0aWFsaXplciwgY29udGV4dCk7XG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHBhdGgpIHtcbiAgICAgIGxldCBrZXk6IG51bWJlcnxzdHJpbmc7XG4gICAgICBpZiAodHMuaXNBcnJheUJpbmRpbmdQYXR0ZXJuKGVsZW1lbnQucGFyZW50KSkge1xuICAgICAgICBrZXkgPSBlbGVtZW50LnBhcmVudC5lbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGVsZW1lbnQucHJvcGVydHlOYW1lIHx8IGVsZW1lbnQubmFtZTtcbiAgICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihuYW1lKSkge1xuICAgICAgICAgIGtleSA9IG5hbWUudGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHRoaXMuYWNjZXNzSGVscGVyKGVsZW1lbnQsIHZhbHVlLCBrZXksIGNvbnRleHQpO1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIHN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG5vZGU6IHRzLlByb3BlcnR5TmFtZSwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkgfHwgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpIHx8IHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbXB1dGVkUHJvcGVydHlOYW1lKG5vZGUpKSB7XG4gICAgICBjb25zdCBsaXRlcmFsID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiB0eXBlb2YgbGl0ZXJhbCA9PT0gJ3N0cmluZycgPyBsaXRlcmFsIDogdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVzb2x2ZWRFbnVtKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBlbnVtTWVtYmVyczogRW51bU1lbWJlcltdLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGVudW1SZWYgPSB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgRW51bVZhbHVlPigpO1xuICAgIGVudW1NZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG1lbWJlci5uYW1lLCBjb250ZXh0KTtcbiAgICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnZpc2l0KG1lbWJlci5pbml0aWFsaXplciwgY29udGV4dCk7XG4gICAgICAgIG1hcC5zZXQobmFtZSwgbmV3IEVudW1WYWx1ZShlbnVtUmVmLCBuYW1lLCByZXNvbHZlZCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBwcml2YXRlIGdldFJlZmVyZW5jZTxUIGV4dGVuZHMgRGVjbGFyYXRpb25Ob2RlPihub2RlOiBULCBjb250ZXh0OiBDb250ZXh0KTogUmVmZXJlbmNlPFQ+IHtcbiAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShub2RlLCBvd25pbmdNb2R1bGUoY29udGV4dCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPik6XG4gICAgcmVmIGlzIFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocmVmLm5vZGUpO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsKFxuICAgIHZhbHVlOiBSZXNvbHZlZFZhbHVlLCByZWplY3Q6ICh2YWx1ZTogUmVzb2x2ZWRWYWx1ZSkgPT4gUmVzb2x2ZWRWYWx1ZSk6IFJlc29sdmVkVmFsdWUge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlc29sdmVkO1xuICB9XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSB8fCB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIHJlamVjdCh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGlzVmFyaWFibGVEZWNsYXJhdGlvbkRlY2xhcmVkKG5vZGU6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKG5vZGUucGFyZW50ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qobm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IGRlY2xMaXN0ID0gbm9kZS5wYXJlbnQ7XG4gIGlmIChkZWNsTGlzdC5wYXJlbnQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNWYXJpYWJsZVN0YXRlbWVudChkZWNsTGlzdC5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHZhclN0bXQgPSBkZWNsTGlzdC5wYXJlbnQ7XG4gIHJldHVybiB2YXJTdG10Lm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB2YXJTdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5EZWNsYXJlS2V5d29yZCk7XG59XG5cbmNvbnN0IEVNUFRZID0ge307XG5cbmZ1bmN0aW9uIGpvaW5Nb2R1bGVDb250ZXh0KGV4aXN0aW5nOiBDb250ZXh0LCBub2RlOiB0cy5Ob2RlLCBkZWNsOiBEZWNsYXJhdGlvbik6IHtcbiAgYWJzb2x1dGVNb2R1bGVOYW1lPzogc3RyaW5nLFxuICByZXNvbHV0aW9uQ29udGV4dD86IHN0cmluZyxcbn0ge1xuICBpZiAoZGVjbC52aWFNb2R1bGUgIT09IG51bGwgJiYgZGVjbC52aWFNb2R1bGUgIT09IGV4aXN0aW5nLmFic29sdXRlTW9kdWxlTmFtZSkge1xuICAgIHJldHVybiB7XG4gICAgICBhYnNvbHV0ZU1vZHVsZU5hbWU6IGRlY2wudmlhTW9kdWxlLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEVNUFRZO1xuICB9XG59XG5cbmZ1bmN0aW9uIG93bmluZ01vZHVsZShjb250ZXh0OiBDb250ZXh0LCBvdmVycmlkZTogT3duaW5nTW9kdWxlfG51bGwgPSBudWxsKTogT3duaW5nTW9kdWxlfG51bGwge1xuICBsZXQgc3BlY2lmaWVyID0gY29udGV4dC5hYnNvbHV0ZU1vZHVsZU5hbWU7XG4gIGlmIChvdmVycmlkZSAhPT0gbnVsbCkge1xuICAgIHNwZWNpZmllciA9IG92ZXJyaWRlLnNwZWNpZmllcjtcbiAgfVxuICBpZiAoc3BlY2lmaWVyICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNwZWNpZmllcixcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBjb250ZXh0LnJlc29sdXRpb25Db250ZXh0LFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==