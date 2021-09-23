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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/known_declaration", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StaticInterpreter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    var known_declaration_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/known_declaration");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    function literalBinaryOp(op) {
        return { op: op, literal: true };
    }
    function referenceBinaryOp(op) {
        return { op: op, literal: false };
    }
    var BINARY_OPERATORS = new Map([
        [ts.SyntaxKind.PlusToken, literalBinaryOp(function (a, b) { return a + b; })],
        [ts.SyntaxKind.MinusToken, literalBinaryOp(function (a, b) { return a - b; })],
        [ts.SyntaxKind.AsteriskToken, literalBinaryOp(function (a, b) { return a * b; })],
        [ts.SyntaxKind.SlashToken, literalBinaryOp(function (a, b) { return a / b; })],
        [ts.SyntaxKind.PercentToken, literalBinaryOp(function (a, b) { return a % b; })],
        [ts.SyntaxKind.AmpersandToken, literalBinaryOp(function (a, b) { return a & b; })],
        [ts.SyntaxKind.BarToken, literalBinaryOp(function (a, b) { return a | b; })],
        [ts.SyntaxKind.CaretToken, literalBinaryOp(function (a, b) { return a ^ b; })],
        [ts.SyntaxKind.LessThanToken, literalBinaryOp(function (a, b) { return a < b; })],
        [ts.SyntaxKind.LessThanEqualsToken, literalBinaryOp(function (a, b) { return a <= b; })],
        [ts.SyntaxKind.GreaterThanToken, literalBinaryOp(function (a, b) { return a > b; })],
        [ts.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp(function (a, b) { return a >= b; })],
        [ts.SyntaxKind.EqualsEqualsToken, literalBinaryOp(function (a, b) { return a == b; })],
        [ts.SyntaxKind.EqualsEqualsEqualsToken, literalBinaryOp(function (a, b) { return a === b; })],
        [ts.SyntaxKind.ExclamationEqualsToken, literalBinaryOp(function (a, b) { return a != b; })],
        [ts.SyntaxKind.ExclamationEqualsEqualsToken, literalBinaryOp(function (a, b) { return a !== b; })],
        [ts.SyntaxKind.LessThanLessThanToken, literalBinaryOp(function (a, b) { return a << b; })],
        [ts.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp(function (a, b) { return a >> b; })],
        [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp(function (a, b) { return a >>> b; })],
        [ts.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp(function (a, b) { return Math.pow(a, b); })],
        [ts.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp(function (a, b) { return a && b; })],
        [ts.SyntaxKind.BarBarToken, referenceBinaryOp(function (a, b) { return a || b; })]
    ]);
    var UNARY_OPERATORS = new Map([
        [ts.SyntaxKind.TildeToken, function (a) { return ~a; }], [ts.SyntaxKind.MinusToken, function (a) { return -a; }],
        [ts.SyntaxKind.PlusToken, function (a) { return +a; }], [ts.SyntaxKind.ExclamationToken, function (a) { return !a; }]
    ]);
    var StaticInterpreter = /** @class */ (function () {
        function StaticInterpreter(host, checker, dependencyTracker) {
            this.host = host;
            this.checker = checker;
            this.dependencyTracker = dependencyTracker;
        }
        StaticInterpreter.prototype.visit = function (node, context) {
            return this.visitExpression(node, context);
        };
        StaticInterpreter.prototype.visitExpression = function (node, context) {
            var result;
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
                return dynamic_1.DynamicValue.fromUnsupportedSyntax(node);
            }
            if (result instanceof dynamic_1.DynamicValue && result.node !== node) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, result);
            }
            return result;
        };
        StaticInterpreter.prototype.visitArrayLiteralExpression = function (node, context) {
            var array = [];
            for (var i = 0; i < node.elements.length; i++) {
                var element = node.elements[i];
                if (ts.isSpreadElement(element)) {
                    array.push.apply(array, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this.visitSpreadElement(element, context)), false));
                }
                else {
                    array.push(this.visitExpression(element, context));
                }
            }
            return array;
        };
        StaticInterpreter.prototype.visitObjectLiteralExpression = function (node, context) {
            var map = new Map();
            for (var i = 0; i < node.properties.length; i++) {
                var property = node.properties[i];
                if (ts.isPropertyAssignment(property)) {
                    var name_1 = this.stringNameFromPropertyName(property.name, context);
                    // Check whether the name can be determined statically.
                    if (name_1 === undefined) {
                        return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromDynamicString(property.name));
                    }
                    map.set(name_1, this.visitExpression(property.initializer, context));
                }
                else if (ts.isShorthandPropertyAssignment(property)) {
                    var symbol = this.checker.getShorthandAssignmentValueSymbol(property);
                    if (symbol === undefined || symbol.valueDeclaration === undefined) {
                        map.set(property.name.text, dynamic_1.DynamicValue.fromUnknown(property));
                    }
                    else {
                        map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
                    }
                }
                else if (ts.isSpreadAssignment(property)) {
                    var spread = this.visitExpression(property.expression, context);
                    if (spread instanceof dynamic_1.DynamicValue) {
                        return dynamic_1.DynamicValue.fromDynamicInput(node, spread);
                    }
                    else if (spread instanceof Map) {
                        spread.forEach(function (value, key) { return map.set(key, value); });
                    }
                    else if (spread instanceof result_1.ResolvedModule) {
                        spread.getExports().forEach(function (value, key) { return map.set(key, value); });
                    }
                    else {
                        return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromInvalidExpressionType(property, spread));
                    }
                }
                else {
                    return dynamic_1.DynamicValue.fromUnknown(node);
                }
            }
            return map;
        };
        StaticInterpreter.prototype.visitTemplateExpression = function (node, context) {
            var pieces = [node.head.text];
            var _loop_1 = function (i) {
                var span = node.templateSpans[i];
                var value = literal(this_1.visit(span.expression, context), function () { return dynamic_1.DynamicValue.fromDynamicString(span.expression); });
                if (value instanceof dynamic_1.DynamicValue) {
                    return { value: dynamic_1.DynamicValue.fromDynamicInput(node, value) };
                }
                pieces.push("" + value, span.literal.text);
            };
            var this_1 = this;
            for (var i = 0; i < node.templateSpans.length; i++) {
                var state_1 = _loop_1(i);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
            return pieces.join('');
        };
        StaticInterpreter.prototype.visitIdentifier = function (node, context) {
            var decl = this.host.getDeclarationOfIdentifier(node);
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
                    return dynamic_1.DynamicValue.fromUnknownIdentifier(node);
                }
            }
            if (decl.known !== null) {
                return (0, known_declaration_1.resolveKnownDeclaration)(decl.known);
            }
            else if ((0, reflection_1.isConcreteDeclaration)(decl) && decl.identity !== null &&
                decl.identity.kind === 0 /* DownleveledEnum */) {
                return this.getResolvedEnum(decl.node, decl.identity.enumMembers, context);
            }
            var declContext = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, context), joinModuleContext(context, node, decl));
            var result = this.visitAmbiguousDeclaration(decl, declContext);
            if (result instanceof imports_1.Reference) {
                // Only record identifiers to non-synthetic references. Synthetic references may not have the
                // same value at runtime as they do at compile time, so it's not legal to refer to them by the
                // identifier here.
                if (!result.synthetic) {
                    result.addIdentifier(node);
                }
            }
            else if (result instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, result);
            }
            return result;
        };
        StaticInterpreter.prototype.visitDeclaration = function (node, context) {
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
        };
        StaticInterpreter.prototype.visitVariableDeclaration = function (node, context) {
            var value = this.host.getVariableValue(node);
            if (value !== null) {
                return this.visitExpression(value, context);
            }
            else if (isVariableDeclarationDeclared(node)) {
                // If the declaration has a literal type that can be statically reduced to a value, resolve to
                // that value. If not, the historical behavior for variable declarations is to return a
                // `Reference` to the variable, as the consumer could use it in a context where knowing its
                // static value is not necessary.
                //
                // Arguably, since the value cannot be statically determined, we should return a
                // `DynamicValue`. This returns a `Reference` because it's the same behavior as before
                // `visitType` was introduced.
                //
                // TODO(zarend): investigate switching to a `DynamicValue` and verify this won't break any
                // use cases, especially in ngcc
                if (node.type !== undefined) {
                    var evaluatedType = this.visitType(node.type, context);
                    if (!(evaluatedType instanceof dynamic_1.DynamicValue)) {
                        return evaluatedType;
                    }
                }
                return this.getReference(node, context);
            }
            else {
                return undefined;
            }
        };
        StaticInterpreter.prototype.visitEnumDeclaration = function (node, context) {
            var _this = this;
            var enumRef = this.getReference(node, context);
            var map = new Map();
            node.members.forEach(function (member) {
                var name = _this.stringNameFromPropertyName(member.name, context);
                if (name !== undefined) {
                    var resolved = member.initializer && _this.visit(member.initializer, context);
                    map.set(name, new result_1.EnumValue(enumRef, name, resolved));
                }
            });
            return map;
        };
        StaticInterpreter.prototype.visitElementAccessExpression = function (node, context) {
            var lhs = this.visitExpression(node.expression, context);
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            var rhs = this.visitExpression(node.argumentExpression, context);
            if (rhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, rhs);
            }
            if (typeof rhs !== 'string' && typeof rhs !== 'number') {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node, rhs);
            }
            return this.accessHelper(node, lhs, rhs, context);
        };
        StaticInterpreter.prototype.visitPropertyAccessExpression = function (node, context) {
            var lhs = this.visitExpression(node.expression, context);
            var rhs = node.name.text;
            // TODO: handle reference to class declaration.
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            return this.accessHelper(node, lhs, rhs, context);
        };
        StaticInterpreter.prototype.visitSourceFile = function (node, context) {
            var _this = this;
            var declarations = this.host.getExportsOfModule(node);
            if (declarations === null) {
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            return new result_1.ResolvedModule(declarations, function (decl) {
                if (decl.known !== null) {
                    return (0, known_declaration_1.resolveKnownDeclaration)(decl.known);
                }
                var declContext = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, context), joinModuleContext(context, node, decl));
                // Visit both concrete and inline declarations.
                return _this.visitAmbiguousDeclaration(decl, declContext);
            });
        };
        StaticInterpreter.prototype.visitAmbiguousDeclaration = function (decl, declContext) {
            return decl.kind === 1 /* Inline */ && decl.implementation !== undefined &&
                !(0, typescript_1.isDeclaration)(decl.implementation) ?
                // Inline declarations whose `implementation` is a `ts.Expression` should be visited as
                // an expression.
                this.visitExpression(decl.implementation, declContext) :
                // Otherwise just visit the `node` as a declaration.
                this.visitDeclaration(decl.node, declContext);
        };
        StaticInterpreter.prototype.accessHelper = function (node, lhs, rhs, context) {
            var strIndex = "" + rhs;
            if (lhs instanceof Map) {
                if (lhs.has(strIndex)) {
                    return lhs.get(strIndex);
                }
                else {
                    return undefined;
                }
            }
            else if (lhs instanceof result_1.ResolvedModule) {
                return lhs.getExport(strIndex);
            }
            else if (Array.isArray(lhs)) {
                if (rhs === 'length') {
                    return lhs.length;
                }
                else if (rhs === 'slice') {
                    return new builtin_1.ArraySliceBuiltinFn(lhs);
                }
                else if (rhs === 'concat') {
                    return new builtin_1.ArrayConcatBuiltinFn(lhs);
                }
                if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
                    return dynamic_1.DynamicValue.fromInvalidExpressionType(node, rhs);
                }
                return lhs[rhs];
            }
            else if (lhs instanceof imports_1.Reference) {
                var ref = lhs.node;
                if (this.host.isClass(ref)) {
                    var module_1 = owningModule(context, lhs.bestGuessOwningModule);
                    var value = undefined;
                    var member = this.host.getMembersOfClass(ref).find(function (member) { return member.isStatic && member.name === strIndex; });
                    if (member !== undefined) {
                        if (member.value !== null) {
                            value = this.visitExpression(member.value, context);
                        }
                        else if (member.implementation !== null) {
                            value = new imports_1.Reference(member.implementation, module_1);
                        }
                        else if (member.node) {
                            value = new imports_1.Reference(member.node, module_1);
                        }
                    }
                    return value;
                }
                else if ((0, typescript_1.isDeclaration)(ref)) {
                    return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromExternalReference(ref, lhs));
                }
            }
            else if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            return dynamic_1.DynamicValue.fromUnknown(node);
        };
        StaticInterpreter.prototype.visitCallExpression = function (node, context) {
            var lhs = this.visitExpression(node.expression, context);
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            // If the call refers to a builtin function, attempt to evaluate the function.
            if (lhs instanceof result_1.KnownFn) {
                return lhs.evaluate(node, this.evaluateFunctionArguments(node, context));
            }
            if (!(lhs instanceof imports_1.Reference)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            var fn = this.host.getDefinitionOfFunction(lhs.node);
            if (fn === null) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            if (!isFunctionOrMethodReference(lhs)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            // If the function is foreign (declared through a d.ts file), attempt to resolve it with the
            // foreignFunctionResolver, if one is specified.
            if (fn.body === null) {
                var expr = null;
                if (context.foreignFunctionResolver) {
                    expr = context.foreignFunctionResolver(lhs, node.arguments);
                }
                if (expr === null) {
                    return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromExternalReference(node.expression, lhs));
                }
                // If the foreign expression occurs in a different file, then assume that the owning module
                // of the call expression should also be used for the resolved foreign expression.
                if (expr.getSourceFile() !== node.expression.getSourceFile() &&
                    lhs.bestGuessOwningModule !== null) {
                    context = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, context), { absoluteModuleName: lhs.bestGuessOwningModule.specifier, resolutionContext: lhs.bestGuessOwningModule.resolutionContext });
                }
                return this.visitFfrExpression(expr, context);
            }
            var res = this.visitFunctionBody(node, fn, context);
            // If the result of attempting to resolve the function body was a DynamicValue, attempt to use
            // the foreignFunctionResolver if one is present. This could still potentially yield a usable
            // value.
            if (res instanceof dynamic_1.DynamicValue && context.foreignFunctionResolver !== undefined) {
                var ffrExpr = context.foreignFunctionResolver(lhs, node.arguments);
                if (ffrExpr !== null) {
                    // The foreign function resolver was able to extract an expression from this function. See
                    // if that expression leads to a non-dynamic result.
                    var ffrRes = this.visitFfrExpression(ffrExpr, context);
                    if (!(ffrRes instanceof dynamic_1.DynamicValue)) {
                        // FFR yielded an actual result that's not dynamic, so use that instead of the original
                        // resolution.
                        res = ffrRes;
                    }
                }
            }
            return res;
        };
        /**
         * Visit an expression which was extracted from a foreign-function resolver.
         *
         * This will process the result and ensure it's correct for FFR-resolved values, including marking
         * `Reference`s as synthetic.
         */
        StaticInterpreter.prototype.visitFfrExpression = function (expr, context) {
            var res = this.visitExpression(expr, context);
            if (res instanceof imports_1.Reference) {
                // This Reference was created synthetically, via a foreign function resolver. The real
                // runtime value of the function expression may be different than the foreign function
                // resolved value, so mark the Reference as synthetic to avoid it being misinterpreted.
                res.synthetic = true;
            }
            return res;
        };
        StaticInterpreter.prototype.visitFunctionBody = function (node, fn, context) {
            var _this = this;
            if (fn.body === null) {
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            else if (fn.body.length !== 1 || !ts.isReturnStatement(fn.body[0])) {
                return dynamic_1.DynamicValue.fromComplexFunctionCall(node, fn);
            }
            var ret = fn.body[0];
            var args = this.evaluateFunctionArguments(node, context);
            var newScope = new Map();
            var calleeContext = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, context), { scope: newScope });
            fn.parameters.forEach(function (param, index) {
                var arg = args[index];
                if (param.node.dotDotDotToken !== undefined) {
                    arg = args.slice(index);
                }
                if (arg === undefined && param.initializer !== null) {
                    arg = _this.visitExpression(param.initializer, calleeContext);
                }
                newScope.set(param.node, arg);
            });
            return ret.expression !== undefined ? this.visitExpression(ret.expression, calleeContext) :
                undefined;
        };
        StaticInterpreter.prototype.visitConditionalExpression = function (node, context) {
            var condition = this.visitExpression(node.condition, context);
            if (condition instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, condition);
            }
            if (condition) {
                return this.visitExpression(node.whenTrue, context);
            }
            else {
                return this.visitExpression(node.whenFalse, context);
            }
        };
        StaticInterpreter.prototype.visitPrefixUnaryExpression = function (node, context) {
            var operatorKind = node.operator;
            if (!UNARY_OPERATORS.has(operatorKind)) {
                return dynamic_1.DynamicValue.fromUnsupportedSyntax(node);
            }
            var op = UNARY_OPERATORS.get(operatorKind);
            var value = this.visitExpression(node.operand, context);
            if (value instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, value);
            }
            else {
                return op(value);
            }
        };
        StaticInterpreter.prototype.visitBinaryExpression = function (node, context) {
            var tokenKind = node.operatorToken.kind;
            if (!BINARY_OPERATORS.has(tokenKind)) {
                return dynamic_1.DynamicValue.fromUnsupportedSyntax(node);
            }
            var opRecord = BINARY_OPERATORS.get(tokenKind);
            var lhs, rhs;
            if (opRecord.literal) {
                lhs = literal(this.visitExpression(node.left, context), function (value) { return dynamic_1.DynamicValue.fromInvalidExpressionType(node.left, value); });
                rhs = literal(this.visitExpression(node.right, context), function (value) { return dynamic_1.DynamicValue.fromInvalidExpressionType(node.right, value); });
            }
            else {
                lhs = this.visitExpression(node.left, context);
                rhs = this.visitExpression(node.right, context);
            }
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            else if (rhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, rhs);
            }
            else {
                return opRecord.op(lhs, rhs);
            }
        };
        StaticInterpreter.prototype.visitParenthesizedExpression = function (node, context) {
            return this.visitExpression(node.expression, context);
        };
        StaticInterpreter.prototype.evaluateFunctionArguments = function (node, context) {
            var e_1, _a;
            var args = [];
            try {
                for (var _b = (0, tslib_1.__values)(node.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var arg = _c.value;
                    if (ts.isSpreadElement(arg)) {
                        args.push.apply(args, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this.visitSpreadElement(arg, context)), false));
                    }
                    else {
                        args.push(this.visitExpression(arg, context));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return args;
        };
        StaticInterpreter.prototype.visitSpreadElement = function (node, context) {
            var spread = this.visitExpression(node.expression, context);
            if (spread instanceof dynamic_1.DynamicValue) {
                return [dynamic_1.DynamicValue.fromDynamicInput(node, spread)];
            }
            else if (!Array.isArray(spread)) {
                return [dynamic_1.DynamicValue.fromInvalidExpressionType(node, spread)];
            }
            else {
                return spread;
            }
        };
        StaticInterpreter.prototype.visitBindingElement = function (node, context) {
            var e_2, _a;
            var path = [];
            var closestDeclaration = node;
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
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            var value = this.visit(closestDeclaration.initializer, context);
            try {
                for (var path_1 = (0, tslib_1.__values)(path), path_1_1 = path_1.next(); !path_1_1.done; path_1_1 = path_1.next()) {
                    var element = path_1_1.value;
                    var key = void 0;
                    if (ts.isArrayBindingPattern(element.parent)) {
                        key = element.parent.elements.indexOf(element);
                    }
                    else {
                        var name_2 = element.propertyName || element.name;
                        if (ts.isIdentifier(name_2)) {
                            key = name_2.text;
                        }
                        else {
                            return dynamic_1.DynamicValue.fromUnknown(element);
                        }
                    }
                    value = this.accessHelper(element, value, key, context);
                    if (value instanceof dynamic_1.DynamicValue) {
                        return value;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (path_1_1 && !path_1_1.done && (_a = path_1.return)) _a.call(path_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return value;
        };
        StaticInterpreter.prototype.stringNameFromPropertyName = function (node, context) {
            if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
                return node.text;
            }
            else if (ts.isComputedPropertyName(node)) {
                var literal_1 = this.visitExpression(node.expression, context);
                return typeof literal_1 === 'string' ? literal_1 : undefined;
            }
            else {
                return undefined;
            }
        };
        StaticInterpreter.prototype.getResolvedEnum = function (node, enumMembers, context) {
            var _this = this;
            var enumRef = this.getReference(node, context);
            var map = new Map();
            enumMembers.forEach(function (member) {
                var name = _this.stringNameFromPropertyName(member.name, context);
                if (name !== undefined) {
                    var resolved = _this.visit(member.initializer, context);
                    map.set(name, new result_1.EnumValue(enumRef, name, resolved));
                }
            });
            return map;
        };
        StaticInterpreter.prototype.getReference = function (node, context) {
            return new imports_1.Reference(node, owningModule(context));
        };
        StaticInterpreter.prototype.visitType = function (node, context) {
            if (ts.isLiteralTypeNode(node)) {
                return this.visitExpression(node.literal, context);
            }
            else if (ts.isTupleTypeNode(node)) {
                return this.visitTupleType(node, context);
            }
            else if (ts.isNamedTupleMember(node)) {
                return this.visitType(node.type, context);
            }
            return dynamic_1.DynamicValue.fromDynamicType(node);
        };
        StaticInterpreter.prototype.visitTupleType = function (node, context) {
            var e_3, _a;
            var res = [];
            try {
                for (var _b = (0, tslib_1.__values)(node.elements), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var elem = _c.value;
                    res.push(this.visitType(elem, context));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return res;
        };
        return StaticInterpreter;
    }());
    exports.StaticInterpreter = StaticInterpreter;
    function isFunctionOrMethodReference(ref) {
        return ts.isFunctionDeclaration(ref.node) || ts.isMethodDeclaration(ref.node) ||
            ts.isFunctionExpression(ref.node);
    }
    function literal(value, reject) {
        if (value instanceof result_1.EnumValue) {
            value = value.resolved;
        }
        if (value instanceof dynamic_1.DynamicValue || value === null || value === undefined ||
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        return reject(value);
    }
    function isVariableDeclarationDeclared(node) {
        if (node.parent === undefined || !ts.isVariableDeclarationList(node.parent)) {
            return false;
        }
        var declList = node.parent;
        if (declList.parent === undefined || !ts.isVariableStatement(declList.parent)) {
            return false;
        }
        var varStmt = declList.parent;
        return varStmt.modifiers !== undefined &&
            varStmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.DeclareKeyword; });
    }
    var EMPTY = {};
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
    function owningModule(context, override) {
        if (override === void 0) { override = null; }
        var specifier = context.absoluteModuleName;
        if (override !== null) {
            specifier = override.specifier;
        }
        if (specifier !== null) {
            return {
                specifier: specifier,
                resolutionContext: context.resolutionContext,
            };
        }
        else {
            return null;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLG1FQUF3QztJQUd4Qyx5RUFBOEs7SUFDOUssa0ZBQXdEO0lBRXhELHlGQUFvRTtJQUNwRSx5RkFBdUM7SUFFdkMsNkdBQTREO0lBQzVELHVGQUFpSDtJQWVqSCxTQUFTLGVBQWUsQ0FBQyxFQUEyQjtRQUNsRCxPQUFPLEVBQUMsRUFBRSxJQUFBLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLEVBQTJCO1FBQ3BELE9BQU8sRUFBQyxFQUFFLElBQUEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQW1DO1FBQ2pFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUMsQ0FBQztRQUM1RCxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEdBQUcsQ0FBQyxFQUFMLENBQUssQ0FBQyxDQUFDO1FBQy9ELENB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ZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge093bmluZ01vZHVsZX0gZnJvbSAnLi4vLi4vaW1wb3J0cy9zcmMvcmVmZXJlbmNlcyc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25LaW5kLCBEZWNsYXJhdGlvbk5vZGUsIEVudW1NZW1iZXIsIEZ1bmN0aW9uRGVmaW5pdGlvbiwgaXNDb25jcmV0ZURlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgU3BlY2lhbERlY2xhcmF0aW9uS2luZH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FycmF5Q29uY2F0QnVpbHRpbkZuLCBBcnJheVNsaWNlQnVpbHRpbkZufSBmcm9tICcuL2J1aWx0aW4nO1xuaW1wb3J0IHtEeW5hbWljVmFsdWV9IGZyb20gJy4vZHluYW1pYyc7XG5pbXBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge3Jlc29sdmVLbm93bkRlY2xhcmF0aW9ufSBmcm9tICcuL2tub3duX2RlY2xhcmF0aW9uJztcbmltcG9ydCB7RW51bVZhbHVlLCBLbm93bkZuLCBSZXNvbHZlZE1vZHVsZSwgUmVzb2x2ZWRWYWx1ZSwgUmVzb2x2ZWRWYWx1ZUFycmF5LCBSZXNvbHZlZFZhbHVlTWFwfSBmcm9tICcuL3Jlc3VsdCc7XG5cblxuXG4vKipcbiAqIFRyYWNrcyB0aGUgc2NvcGUgb2YgYSBmdW5jdGlvbiBib2R5LCB3aGljaCBpbmNsdWRlcyBgUmVzb2x2ZWRWYWx1ZWBzIGZvciB0aGUgcGFyYW1ldGVycyBvZiB0aGF0XG4gKiBib2R5LlxuICovXG50eXBlIFNjb3BlID0gTWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBSZXNvbHZlZFZhbHVlPjtcblxuaW50ZXJmYWNlIEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgbGl0ZXJhbDogYm9vbGVhbjtcbiAgb3A6IChhOiBhbnksIGI6IGFueSkgPT4gUmVzb2x2ZWRWYWx1ZTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbEJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogdHJ1ZX07XG59XG5cbmZ1bmN0aW9uIHJlZmVyZW5jZUJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogZmFsc2V9O1xufVxuXG5jb25zdCBCSU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCBCaW5hcnlPcGVyYXRvckRlZj4oW1xuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSArIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTWludXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC0gYildLFxuICBbdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgKiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAvIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkJhclRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgfCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkNhcmV0VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSBeIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDwgYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhbkVxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPD0gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPT0gYildLFxuICBbdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID09PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAhPSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAhPT0gYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhbkxlc3NUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8PCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+Pj4gYildLFxuICBbdHMuU3ludGF4S2luZC5Bc3Rlcmlza0FzdGVyaXNrVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gTWF0aC5wb3coYSwgYikpXSxcbiAgW3RzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIHJlZmVyZW5jZUJpbmFyeU9wKChhLCBiKSA9PiBhICYmIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4sIHJlZmVyZW5jZUJpbmFyeU9wKChhLCBiKSA9PiBhIHx8IGIpXVxuXSk7XG5cbmNvbnN0IFVOQVJZX09QRVJBVE9SUyA9IG5ldyBNYXA8dHMuU3ludGF4S2luZCwgKGE6IGFueSkgPT4gYW55PihbXG4gIFt0cy5TeW50YXhLaW5kLlRpbGRlVG9rZW4sIGEgPT4gfmFdLCBbdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLCBhID0+IC1hXSxcbiAgW3RzLlN5bnRheEtpbmQuUGx1c1Rva2VuLCBhID0+ICthXSwgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgYSA9PiAhYV1cbl0pO1xuXG5pbnRlcmZhY2UgQ29udGV4dCB7XG4gIG9yaWdpbmF0aW5nRmlsZTogdHMuU291cmNlRmlsZTtcbiAgLyoqXG4gICAqIFRoZSBtb2R1bGUgbmFtZSAoaWYgYW55KSB3aGljaCB3YXMgdXNlZCB0byByZWFjaCB0aGUgY3VycmVudGx5IHJlc29sdmluZyBzeW1ib2xzLlxuICAgKi9cbiAgYWJzb2x1dGVNb2R1bGVOYW1lOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogQSBmaWxlIG5hbWUgcmVwcmVzZW50aW5nIHRoZSBjb250ZXh0IGluIHdoaWNoIHRoZSBjdXJyZW50IGBhYnNvbHV0ZU1vZHVsZU5hbWVgLCBpZiBhbnksIHdhc1xuICAgKiByZXNvbHZlZC5cbiAgICovXG4gIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmc7XG4gIHNjb3BlOiBTY29wZTtcbiAgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXI/OiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcjtcbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRpY0ludGVycHJldGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSBkZXBlbmRlbmN5VHJhY2tlcjogRGVwZW5kZW5jeVRyYWNrZXJ8bnVsbCkge31cblxuICB2aXNpdChub2RlOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEV4cHJlc3Npb24obm9kZTogdHMuRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGxldCByZXN1bHQ6IFJlc29sdmVkVmFsdWU7XG4gICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuTnVsbEtleXdvcmQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNOb1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzVGVtcGxhdGVFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0VGVtcGxhdGVFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQobm9kZS50ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdElkZW50aWZpZXIobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRDYWxsRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0Q29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcmVmaXhVbmFyeUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRQcmVmaXhVbmFyeUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRCaW5hcnlFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0QXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQXNFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNOb25OdWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGUpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlICYmIHJlc3VsdC5ub2RlICE9PSBub2RlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGU6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgYXJyYXk6IFJlc29sdmVkVmFsdWVBcnJheSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZWxlbWVudCA9IG5vZGUuZWxlbWVudHNbaV07XG4gICAgICBpZiAodHMuaXNTcHJlYWRFbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgICAgIGFycmF5LnB1c2goLi4udGhpcy52aXNpdFNwcmVhZEVsZW1lbnQoZWxlbWVudCwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJyYXkucHVzaCh0aGlzLnZpc2l0RXhwcmVzc2lvbihlbGVtZW50LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfVxuXG4gIHByb3RlY3RlZCB2aXNpdE9iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IG1hcDogUmVzb2x2ZWRWYWx1ZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5wcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllc1tpXTtcbiAgICAgIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUocHJvcGVydHkubmFtZSwgY29udGV4dCk7XG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIG5hbWUgY2FuIGJlIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAgICAgICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNTdHJpbmcocHJvcGVydHkubmFtZSkpO1xuICAgICAgICB9XG4gICAgICAgIG1hcC5zZXQobmFtZSwgdGhpcy52aXNpdEV4cHJlc3Npb24ocHJvcGVydHkuaW5pdGlhbGl6ZXIsIGNvbnRleHQpKTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNTaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTaG9ydGhhbmRBc3NpZ25tZW50VmFsdWVTeW1ib2wocHJvcGVydHkpO1xuICAgICAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQgfHwgc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCBEeW5hbWljVmFsdWUuZnJvbVVua25vd24ocHJvcGVydHkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXAuc2V0KHByb3BlcnR5Lm5hbWUudGV4dCwgdGhpcy52aXNpdERlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHMuaXNTcHJlYWRBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBzcHJlYWQgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBzcHJlYWQpO1xuICAgICAgICB9IGVsc2UgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgICAgIHNwcmVhZC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiBtYXAuc2V0KGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIGlmIChzcHJlYWQgaW5zdGFuY2VvZiBSZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICAgIHNwcmVhZC5nZXRFeHBvcnRzKCkuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4gbWFwLnNldChrZXksIHZhbHVlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KFxuICAgICAgICAgICAgICBub2RlLCBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShwcm9wZXJ0eSwgc3ByZWFkKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VGVtcGxhdGVFeHByZXNzaW9uKG5vZGU6IHRzLlRlbXBsYXRlRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IHBpZWNlczogc3RyaW5nW10gPSBbbm9kZS5oZWFkLnRleHRdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS50ZW1wbGF0ZVNwYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzcGFuID0gbm9kZS50ZW1wbGF0ZVNwYW5zW2ldO1xuICAgICAgY29uc3QgdmFsdWUgPSBsaXRlcmFsKFxuICAgICAgICAgIHRoaXMudmlzaXQoc3Bhbi5leHByZXNzaW9uLCBjb250ZXh0KSxcbiAgICAgICAgICAoKSA9PiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNTdHJpbmcoc3Bhbi5leHByZXNzaW9uKSk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHBpZWNlcy5wdXNoKGAke3ZhbHVlfWAsIHNwYW4ubGl0ZXJhbC50ZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuIHBpZWNlcy5qb2luKCcnKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRJZGVudGlmaWVyKG5vZGU6IHRzLklkZW50aWZpZXIsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBkZWNsID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKG5vZGUpO1xuICAgIGlmIChkZWNsID09PSBudWxsKSB7XG4gICAgICBpZiAobm9kZS5vcmlnaW5hbEtleXdvcmRLaW5kID09PSB0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBzeW1ib2wgaGVyZSBpcyBpbXBvcnRlZC5cbiAgICAgICAgaWYgKHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIgIT09IG51bGwgJiYgdGhpcy5ob3N0LmdldEltcG9ydE9mSWRlbnRpZmllcihub2RlKSAhPT0gbnVsbCkge1xuICAgICAgICAgIC8vIEl0IHdhcywgYnV0IG5vIGRlY2xhcmF0aW9uIGZvciB0aGUgbm9kZSBjb3VsZCBiZSBmb3VuZC4gVGhpcyBtZWFucyB0aGF0IHRoZSBkZXBlbmRlbmN5XG4gICAgICAgICAgLy8gZ3JhcGggZm9yIHRoZSBjdXJyZW50IGZpbGUgY2Fubm90IGJlIHByb3Blcmx5IHVwZGF0ZWQgdG8gYWNjb3VudCBmb3IgdGhpcyAoYnJva2VuKVxuICAgICAgICAgIC8vIGltcG9ydC4gSW5zdGVhZCwgdGhlIG9yaWdpbmF0aW5nIGZpbGUgaXMgcmVwb3J0ZWQgYXMgZmFpbGluZyBkZXBlbmRlbmN5IGFuYWx5c2lzLFxuICAgICAgICAgIC8vIGVuc3VyaW5nIHRoYXQgZnV0dXJlIGNvbXBpbGF0aW9ucyB3aWxsIGFsd2F5cyBhdHRlbXB0IHRvIHJlLXJlc29sdmUgdGhlIHByZXZpb3VzbHlcbiAgICAgICAgICAvLyBicm9rZW4gaWRlbnRpZmllci5cbiAgICAgICAgICB0aGlzLmRlcGVuZGVuY3lUcmFja2VyLnJlY29yZERlcGVuZGVuY3lBbmFseXNpc0ZhaWx1cmUoY29udGV4dC5vcmlnaW5hdGluZ0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVjbC5rbm93biAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlc29sdmVLbm93bkRlY2xhcmF0aW9uKGRlY2wua25vd24pO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGlzQ29uY3JldGVEZWNsYXJhdGlvbihkZWNsKSAmJiBkZWNsLmlkZW50aXR5ICE9PSBudWxsICYmXG4gICAgICAgIGRlY2wuaWRlbnRpdHkua2luZCA9PT0gU3BlY2lhbERlY2xhcmF0aW9uS2luZC5Eb3dubGV2ZWxlZEVudW0pIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc29sdmVkRW51bShkZWNsLm5vZGUsIGRlY2wuaWRlbnRpdHkuZW51bU1lbWJlcnMsIGNvbnRleHQpO1xuICAgIH1cbiAgICBjb25zdCBkZWNsQ29udGV4dCA9IHsuLi5jb250ZXh0LCAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKX07XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy52aXNpdEFtYmlndW91c0RlY2xhcmF0aW9uKGRlY2wsIGRlY2xDb250ZXh0KTtcbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICAvLyBPbmx5IHJlY29yZCBpZGVudGlmaWVycyB0byBub24tc3ludGhldGljIHJlZmVyZW5jZXMuIFN5bnRoZXRpYyByZWZlcmVuY2VzIG1heSBub3QgaGF2ZSB0aGVcbiAgICAgIC8vIHNhbWUgdmFsdWUgYXQgcnVudGltZSBhcyB0aGV5IGRvIGF0IGNvbXBpbGUgdGltZSwgc28gaXQncyBub3QgbGVnYWwgdG8gcmVmZXIgdG8gdGhlbSBieSB0aGVcbiAgICAgIC8vIGlkZW50aWZpZXIgaGVyZS5cbiAgICAgIGlmICghcmVzdWx0LnN5bnRoZXRpYykge1xuICAgICAgICByZXN1bHQuYWRkSWRlbnRpZmllcihub2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RGVjbGFyYXRpb24obm9kZTogRGVjbGFyYXRpb25Ob2RlLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIuYWRkRGVwZW5kZW5jeShjb250ZXh0Lm9yaWdpbmF0aW5nRmlsZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5ob3N0LmlzQ2xhc3Mobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkgJiYgY29udGV4dC5zY29wZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBjb250ZXh0LnNjb3BlLmdldChub2RlKSE7XG4gICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydEFzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbnVtRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RW51bURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFNvdXJjZUZpbGUobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0JpbmRpbmdFbGVtZW50KG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEJpbmRpbmdFbGVtZW50KG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgdmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuaG9zdC5nZXRWYXJpYWJsZVZhbHVlKG5vZGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKHZhbHVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKGlzVmFyaWFibGVEZWNsYXJhdGlvbkRlY2xhcmVkKG5vZGUpKSB7XG4gICAgICAvLyBJZiB0aGUgZGVjbGFyYXRpb24gaGFzIGEgbGl0ZXJhbCB0eXBlIHRoYXQgY2FuIGJlIHN0YXRpY2FsbHkgcmVkdWNlZCB0byBhIHZhbHVlLCByZXNvbHZlIHRvXG4gICAgICAvLyB0aGF0IHZhbHVlLiBJZiBub3QsIHRoZSBoaXN0b3JpY2FsIGJlaGF2aW9yIGZvciB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaXMgdG8gcmV0dXJuIGFcbiAgICAgIC8vIGBSZWZlcmVuY2VgIHRvIHRoZSB2YXJpYWJsZSwgYXMgdGhlIGNvbnN1bWVyIGNvdWxkIHVzZSBpdCBpbiBhIGNvbnRleHQgd2hlcmUga25vd2luZyBpdHNcbiAgICAgIC8vIHN0YXRpYyB2YWx1ZSBpcyBub3QgbmVjZXNzYXJ5LlxuICAgICAgLy9cbiAgICAgIC8vIEFyZ3VhYmx5LCBzaW5jZSB0aGUgdmFsdWUgY2Fubm90IGJlIHN0YXRpY2FsbHkgZGV0ZXJtaW5lZCwgd2Ugc2hvdWxkIHJldHVybiBhXG4gICAgICAvLyBgRHluYW1pY1ZhbHVlYC4gVGhpcyByZXR1cm5zIGEgYFJlZmVyZW5jZWAgYmVjYXVzZSBpdCdzIHRoZSBzYW1lIGJlaGF2aW9yIGFzIGJlZm9yZVxuICAgICAgLy8gYHZpc2l0VHlwZWAgd2FzIGludHJvZHVjZWQuXG4gICAgICAvL1xuICAgICAgLy8gVE9ETyh6YXJlbmQpOiBpbnZlc3RpZ2F0ZSBzd2l0Y2hpbmcgdG8gYSBgRHluYW1pY1ZhbHVlYCBhbmQgdmVyaWZ5IHRoaXMgd29uJ3QgYnJlYWsgYW55XG4gICAgICAvLyB1c2UgY2FzZXMsIGVzcGVjaWFsbHkgaW4gbmdjY1xuICAgICAgaWYgKG5vZGUudHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGV2YWx1YXRlZFR5cGUgPSB0aGlzLnZpc2l0VHlwZShub2RlLnR5cGUsIGNvbnRleHQpO1xuICAgICAgICBpZiAoIShldmFsdWF0ZWRUeXBlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBldmFsdWF0ZWRUeXBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVudW1EZWNsYXJhdGlvbihub2RlOiB0cy5FbnVtRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBlbnVtUmVmID0gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIEVudW1WYWx1ZT4oKTtcbiAgICBub2RlLm1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobWVtYmVyLm5hbWUsIGNvbnRleHQpO1xuICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCByZXNvbHZlZCA9IG1lbWJlci5pbml0aWFsaXplciAmJiB0aGlzLnZpc2l0KG1lbWJlci5pbml0aWFsaXplciwgY29udGV4dCk7XG4gICAgICAgIG1hcC5zZXQobmFtZSwgbmV3IEVudW1WYWx1ZShlbnVtUmVmLCBuYW1lLCByZXNvbHZlZCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG4gICAgY29uc3QgcmhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5hcmd1bWVudEV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHJocyAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIHJocyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLCByaHMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFjY2Vzc0hlbHBlcihub2RlLCBsaHMsIHJocywgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGNvbnN0IHJocyA9IG5vZGUubmFtZS50ZXh0O1xuICAgIC8vIFRPRE86IGhhbmRsZSByZWZlcmVuY2UgdG8gY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFjY2Vzc0hlbHBlcihub2RlLCBsaHMsIHJocywgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U291cmNlRmlsZShub2RlOiB0cy5Tb3VyY2VGaWxlLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5ob3N0LmdldEV4cG9ydHNPZk1vZHVsZShub2RlKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzb2x2ZWRNb2R1bGUoZGVjbGFyYXRpb25zLCBkZWNsID0+IHtcbiAgICAgIGlmIChkZWNsLmtub3duICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlS25vd25EZWNsYXJhdGlvbihkZWNsLmtub3duKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjbENvbnRleHQgPSB7XG4gICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgIC4uLmpvaW5Nb2R1bGVDb250ZXh0KGNvbnRleHQsIG5vZGUsIGRlY2wpLFxuICAgICAgfTtcblxuICAgICAgLy8gVmlzaXQgYm90aCBjb25jcmV0ZSBhbmQgaW5saW5lIGRlY2xhcmF0aW9ucy5cbiAgICAgIHJldHVybiB0aGlzLnZpc2l0QW1iaWd1b3VzRGVjbGFyYXRpb24oZGVjbCwgZGVjbENvbnRleHQpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEFtYmlndW91c0RlY2xhcmF0aW9uKGRlY2w6IERlY2xhcmF0aW9uLCBkZWNsQ29udGV4dDogQ29udGV4dCkge1xuICAgIHJldHVybiBkZWNsLmtpbmQgPT09IERlY2xhcmF0aW9uS2luZC5JbmxpbmUgJiYgZGVjbC5pbXBsZW1lbnRhdGlvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAhaXNEZWNsYXJhdGlvbihkZWNsLmltcGxlbWVudGF0aW9uKSA/XG4gICAgICAgIC8vIElubGluZSBkZWNsYXJhdGlvbnMgd2hvc2UgYGltcGxlbWVudGF0aW9uYCBpcyBhIGB0cy5FeHByZXNzaW9uYCBzaG91bGQgYmUgdmlzaXRlZCBhc1xuICAgICAgICAvLyBhbiBleHByZXNzaW9uLlxuICAgICAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbihkZWNsLmltcGxlbWVudGF0aW9uLCBkZWNsQ29udGV4dCkgOlxuICAgICAgICAvLyBPdGhlcndpc2UganVzdCB2aXNpdCB0aGUgYG5vZGVgIGFzIGEgZGVjbGFyYXRpb24uXG4gICAgICAgIHRoaXMudmlzaXREZWNsYXJhdGlvbihkZWNsLm5vZGUsIGRlY2xDb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgYWNjZXNzSGVscGVyKG5vZGU6IHRzLk5vZGUsIGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBzdHJpbmd8bnVtYmVyLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IHN0ckluZGV4ID0gYCR7cmhzfWA7XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgaWYgKGxocy5oYXMoc3RySW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBsaHMuZ2V0KHN0ckluZGV4KSE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgUmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgIHJldHVybiBsaHMuZ2V0RXhwb3J0KHN0ckluZGV4KTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobGhzKSkge1xuICAgICAgaWYgKHJocyA9PT0gJ2xlbmd0aCcpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGg7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ3NsaWNlJykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5U2xpY2VCdWlsdGluRm4obGhzKTtcbiAgICAgIH0gZWxzZSBpZiAocmhzID09PSAnY29uY2F0Jykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5Q29uY2F0QnVpbHRpbkZuKGxocyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHJocyAhPT0gJ251bWJlcicgfHwgIU51bWJlci5pc0ludGVnZXIocmhzKSkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgcmhzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaHNbcmhzXTtcbiAgICB9IGVsc2UgaWYgKGxocyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgY29uc3QgcmVmID0gbGhzLm5vZGU7XG4gICAgICBpZiAodGhpcy5ob3N0LmlzQ2xhc3MocmVmKSkge1xuICAgICAgICBjb25zdCBtb2R1bGUgPSBvd25pbmdNb2R1bGUoY29udGV4dCwgbGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgICAgIGxldCB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWVtYmVyID0gdGhpcy5ob3N0LmdldE1lbWJlcnNPZkNsYXNzKHJlZikuZmluZChcbiAgICAgICAgICAgIG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5hbWUgPT09IHN0ckluZGV4KTtcbiAgICAgICAgaWYgKG1lbWJlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG1lbWJlci52YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihtZW1iZXIudmFsdWUsIGNvbnRleHQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVtYmVyLmltcGxlbWVudGF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWZlcmVuY2UobWVtYmVyLmltcGxlbWVudGF0aW9uLCBtb2R1bGUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVtYmVyLm5vZGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3IFJlZmVyZW5jZShtZW1iZXIubm9kZSwgbW9kdWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChpc0RlY2xhcmF0aW9uKHJlZikpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KFxuICAgICAgICAgICAgbm9kZSwgRHluYW1pY1ZhbHVlLmZyb21FeHRlcm5hbFJlZmVyZW5jZShyZWYsIGxocyBhcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cblxuICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0Q2FsbEV4cHJlc3Npb24obm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjYWxsIHJlZmVycyB0byBhIGJ1aWx0aW4gZnVuY3Rpb24sIGF0dGVtcHQgdG8gZXZhbHVhdGUgdGhlIGZ1bmN0aW9uLlxuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBLbm93bkZuKSB7XG4gICAgICByZXR1cm4gbGhzLmV2YWx1YXRlKG5vZGUsIHRoaXMuZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlLCBjb250ZXh0KSk7XG4gICAgfVxuXG4gICAgaWYgKCEobGhzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbiA9IHRoaXMuaG9zdC5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihsaHMubm9kZSk7XG4gICAgaWYgKGZuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kUmVmZXJlbmNlKGxocykpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLmV4cHJlc3Npb24sIGxocyk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGZ1bmN0aW9uIGlzIGZvcmVpZ24gKGRlY2xhcmVkIHRocm91Z2ggYSBkLnRzIGZpbGUpLCBhdHRlbXB0IHRvIHJlc29sdmUgaXQgd2l0aCB0aGVcbiAgICAvLyBmb3JlaWduRnVuY3Rpb25SZXNvbHZlciwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICBpZiAoZm4uYm9keSA9PT0gbnVsbCkge1xuICAgICAgbGV0IGV4cHI6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgICBpZiAoY29udGV4dC5mb3JlaWduRnVuY3Rpb25SZXNvbHZlcikge1xuICAgICAgICBleHByID0gY29udGV4dC5mb3JlaWduRnVuY3Rpb25SZXNvbHZlcihsaHMsIG5vZGUuYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICAgIGlmIChleHByID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChcbiAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRXh0ZXJuYWxSZWZlcmVuY2Uobm9kZS5leHByZXNzaW9uLCBsaHMpKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIGZvcmVpZ24gZXhwcmVzc2lvbiBvY2N1cnMgaW4gYSBkaWZmZXJlbnQgZmlsZSwgdGhlbiBhc3N1bWUgdGhhdCB0aGUgb3duaW5nIG1vZHVsZVxuICAgICAgLy8gb2YgdGhlIGNhbGwgZXhwcmVzc2lvbiBzaG91bGQgYWxzbyBiZSB1c2VkIGZvciB0aGUgcmVzb2x2ZWQgZm9yZWlnbiBleHByZXNzaW9uLlxuICAgICAgaWYgKGV4cHIuZ2V0U291cmNlRmlsZSgpICE9PSBub2RlLmV4cHJlc3Npb24uZ2V0U291cmNlRmlsZSgpICYmXG4gICAgICAgICAgbGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgICBjb250ZXh0ID0ge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBsaHMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcixcbiAgICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogbGhzLmJlc3RHdWVzc093bmluZ01vZHVsZS5yZXNvbHV0aW9uQ29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMudmlzaXRGZnJFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpO1xuICAgIH1cblxuICAgIGxldCByZXM6IFJlc29sdmVkVmFsdWUgPSB0aGlzLnZpc2l0RnVuY3Rpb25Cb2R5KG5vZGUsIGZuLCBjb250ZXh0KTtcblxuICAgIC8vIElmIHRoZSByZXN1bHQgb2YgYXR0ZW1wdGluZyB0byByZXNvbHZlIHRoZSBmdW5jdGlvbiBib2R5IHdhcyBhIER5bmFtaWNWYWx1ZSwgYXR0ZW1wdCB0byB1c2VcbiAgICAvLyB0aGUgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgaWYgb25lIGlzIHByZXNlbnQuIFRoaXMgY291bGQgc3RpbGwgcG90ZW50aWFsbHkgeWllbGQgYSB1c2FibGVcbiAgICAvLyB2YWx1ZS5cbiAgICBpZiAocmVzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlICYmIGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgZmZyRXhwciA9IGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIobGhzLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICBpZiAoZmZyRXhwciAhPT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgZm9yZWlnbiBmdW5jdGlvbiByZXNvbHZlciB3YXMgYWJsZSB0byBleHRyYWN0IGFuIGV4cHJlc3Npb24gZnJvbSB0aGlzIGZ1bmN0aW9uLiBTZWVcbiAgICAgICAgLy8gaWYgdGhhdCBleHByZXNzaW9uIGxlYWRzIHRvIGEgbm9uLWR5bmFtaWMgcmVzdWx0LlxuICAgICAgICBjb25zdCBmZnJSZXMgPSB0aGlzLnZpc2l0RmZyRXhwcmVzc2lvbihmZnJFeHByLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKCEoZmZyUmVzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSkge1xuICAgICAgICAgIC8vIEZGUiB5aWVsZGVkIGFuIGFjdHVhbCByZXN1bHQgdGhhdCdzIG5vdCBkeW5hbWljLCBzbyB1c2UgdGhhdCBpbnN0ZWFkIG9mIHRoZSBvcmlnaW5hbFxuICAgICAgICAgIC8vIHJlc29sdXRpb24uXG4gICAgICAgICAgcmVzID0gZmZyUmVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdCBhbiBleHByZXNzaW9uIHdoaWNoIHdhcyBleHRyYWN0ZWQgZnJvbSBhIGZvcmVpZ24tZnVuY3Rpb24gcmVzb2x2ZXIuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBwcm9jZXNzIHRoZSByZXN1bHQgYW5kIGVuc3VyZSBpdCdzIGNvcnJlY3QgZm9yIEZGUi1yZXNvbHZlZCB2YWx1ZXMsIGluY2x1ZGluZyBtYXJraW5nXG4gICAqIGBSZWZlcmVuY2VgcyBhcyBzeW50aGV0aWMuXG4gICAqL1xuICBwcml2YXRlIHZpc2l0RmZyRXhwcmVzc2lvbihleHByOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcmVzID0gdGhpcy52aXNpdEV4cHJlc3Npb24oZXhwciwgY29udGV4dCk7XG4gICAgaWYgKHJlcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgLy8gVGhpcyBSZWZlcmVuY2Ugd2FzIGNyZWF0ZWQgc3ludGhldGljYWxseSwgdmlhIGEgZm9yZWlnbiBmdW5jdGlvbiByZXNvbHZlci4gVGhlIHJlYWxcbiAgICAgIC8vIHJ1bnRpbWUgdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gbWF5IGJlIGRpZmZlcmVudCB0aGFuIHRoZSBmb3JlaWduIGZ1bmN0aW9uXG4gICAgICAvLyByZXNvbHZlZCB2YWx1ZSwgc28gbWFyayB0aGUgUmVmZXJlbmNlIGFzIHN5bnRoZXRpYyB0byBhdm9pZCBpdCBiZWluZyBtaXNpbnRlcnByZXRlZC5cbiAgICAgIHJlcy5zeW50aGV0aWMgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEZ1bmN0aW9uQm9keShub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgZm46IEZ1bmN0aW9uRGVmaW5pdGlvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAoZm4uYm9keSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9IGVsc2UgaWYgKGZuLmJvZHkubGVuZ3RoICE9PSAxIHx8ICF0cy5pc1JldHVyblN0YXRlbWVudChmbi5ib2R5WzBdKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tQ29tcGxleEZ1bmN0aW9uQ2FsbChub2RlLCBmbik7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGZuLmJvZHlbMF0gYXMgdHMuUmV0dXJuU3RhdGVtZW50O1xuXG4gICAgY29uc3QgYXJncyA9IHRoaXMuZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlLCBjb250ZXh0KTtcbiAgICBjb25zdCBuZXdTY29wZTogU2NvcGUgPSBuZXcgTWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGNvbnN0IGNhbGxlZUNvbnRleHQgPSB7Li4uY29udGV4dCwgc2NvcGU6IG5ld1Njb3BlfTtcbiAgICBmbi5wYXJhbWV0ZXJzLmZvckVhY2goKHBhcmFtLCBpbmRleCkgPT4ge1xuICAgICAgbGV0IGFyZyA9IGFyZ3NbaW5kZXhdO1xuICAgICAgaWYgKHBhcmFtLm5vZGUuZG90RG90RG90VG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhcmcgPSBhcmdzLnNsaWNlKGluZGV4KTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCAmJiBwYXJhbS5pbml0aWFsaXplciAhPT0gbnVsbCkge1xuICAgICAgICBhcmcgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihwYXJhbS5pbml0aWFsaXplciwgY2FsbGVlQ29udGV4dCk7XG4gICAgICB9XG4gICAgICBuZXdTY29wZS5zZXQocGFyYW0ubm9kZSwgYXJnKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQuZXhwcmVzc2lvbiAhPT0gdW5kZWZpbmVkID8gdGhpcy52aXNpdEV4cHJlc3Npb24ocmV0LmV4cHJlc3Npb24sIGNhbGxlZUNvbnRleHQpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuY29uZGl0aW9uLCBjb250ZXh0KTtcbiAgICBpZiAoY29uZGl0aW9uIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgY29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5GYWxzZSwgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgb3BlcmF0b3JLaW5kID0gbm9kZS5vcGVyYXRvcjtcbiAgICBpZiAoIVVOQVJZX09QRVJBVE9SUy5oYXMob3BlcmF0b3JLaW5kKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3AgPSBVTkFSWV9PUEVSQVRPUlMuZ2V0KG9wZXJhdG9yS2luZCkhO1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5vcGVyYW5kLCBjb250ZXh0KTtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCB2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEJpbmFyeUV4cHJlc3Npb24obm9kZTogdHMuQmluYXJ5RXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IHRva2VuS2luZCA9IG5vZGUub3BlcmF0b3JUb2tlbi5raW5kO1xuICAgIGlmICghQklOQVJZX09QRVJBVE9SUy5oYXModG9rZW5LaW5kKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BSZWNvcmQgPSBCSU5BUllfT1BFUkFUT1JTLmdldCh0b2tlbktpbmQpITtcbiAgICBsZXQgbGhzOiBSZXNvbHZlZFZhbHVlLCByaHM6IFJlc29sdmVkVmFsdWU7XG4gICAgaWYgKG9wUmVjb3JkLmxpdGVyYWwpIHtcbiAgICAgIGxocyA9IGxpdGVyYWwoXG4gICAgICAgICAgdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5sZWZ0LCBjb250ZXh0KSxcbiAgICAgICAgICB2YWx1ZSA9PiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLmxlZnQsIHZhbHVlKSk7XG4gICAgICByaHMgPSBsaXRlcmFsKFxuICAgICAgICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUucmlnaHQsIGNvbnRleHQpLFxuICAgICAgICAgIHZhbHVlID0+IER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUucmlnaHQsIHZhbHVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCk7XG4gICAgICByaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfSBlbHNlIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3BSZWNvcmQub3AobGhzLCByaHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlOiB0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3QgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChjb25zdCBhcmcgb2Ygbm9kZS5hcmd1bWVudHMpIHtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoYXJnKSkge1xuICAgICAgICBhcmdzLnB1c2goLi4udGhpcy52aXNpdFNwcmVhZEVsZW1lbnQoYXJnLCBjb250ZXh0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzLnB1c2godGhpcy52aXNpdEV4cHJlc3Npb24oYXJnLCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFNwcmVhZEVsZW1lbnQobm9kZTogdHMuU3ByZWFkRWxlbWVudCwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3Qgc3ByZWFkID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gW0R5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCldO1xuICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoc3ByZWFkKSkge1xuICAgICAgcmV0dXJuIFtEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLCBzcHJlYWQpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNwcmVhZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QmluZGluZ0VsZW1lbnQobm9kZTogdHMuQmluZGluZ0VsZW1lbnQsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBwYXRoOiB0cy5CaW5kaW5nRWxlbWVudFtdID0gW107XG4gICAgbGV0IGNsb3Nlc3REZWNsYXJhdGlvbjogdHMuTm9kZSA9IG5vZGU7XG5cbiAgICB3aGlsZSAodHMuaXNCaW5kaW5nRWxlbWVudChjbG9zZXN0RGVjbGFyYXRpb24pIHx8XG4gICAgICAgICAgIHRzLmlzQXJyYXlCaW5kaW5nUGF0dGVybihjbG9zZXN0RGVjbGFyYXRpb24pIHx8XG4gICAgICAgICAgIHRzLmlzT2JqZWN0QmluZGluZ1BhdHRlcm4oY2xvc2VzdERlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKHRzLmlzQmluZGluZ0VsZW1lbnQoY2xvc2VzdERlY2xhcmF0aW9uKSkge1xuICAgICAgICBwYXRoLnVuc2hpZnQoY2xvc2VzdERlY2xhcmF0aW9uKTtcbiAgICAgIH1cblxuICAgICAgY2xvc2VzdERlY2xhcmF0aW9uID0gY2xvc2VzdERlY2xhcmF0aW9uLnBhcmVudDtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihjbG9zZXN0RGVjbGFyYXRpb24pIHx8XG4gICAgICAgIGNsb3Nlc3REZWNsYXJhdGlvbi5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgIH1cblxuICAgIGxldCB2YWx1ZSA9IHRoaXMudmlzaXQoY2xvc2VzdERlY2xhcmF0aW9uLmluaXRpYWxpemVyLCBjb250ZXh0KTtcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgcGF0aCkge1xuICAgICAgbGV0IGtleTogbnVtYmVyfHN0cmluZztcbiAgICAgIGlmICh0cy5pc0FycmF5QmluZGluZ1BhdHRlcm4oZWxlbWVudC5wYXJlbnQpKSB7XG4gICAgICAgIGtleSA9IGVsZW1lbnQucGFyZW50LmVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBuYW1lID0gZWxlbWVudC5wcm9wZXJ0eU5hbWUgfHwgZWxlbWVudC5uYW1lO1xuICAgICAgICBpZiAodHMuaXNJZGVudGlmaWVyKG5hbWUpKSB7XG4gICAgICAgICAga2V5ID0gbmFtZS50ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24oZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5hY2Nlc3NIZWxwZXIoZWxlbWVudCwgdmFsdWUsIGtleSwgY29udGV4dCk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobm9kZTogdHMuUHJvcGVydHlOYW1lLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29tcHV0ZWRQcm9wZXJ0eU5hbWUobm9kZSkpIHtcbiAgICAgIGNvbnN0IGxpdGVyYWwgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsaXRlcmFsID09PSAnc3RyaW5nJyA/IGxpdGVyYWwgOiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZXNvbHZlZEVudW0obm9kZTogdHMuRGVjbGFyYXRpb24sIGVudW1NZW1iZXJzOiBFbnVtTWVtYmVyW10sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgZW51bU1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobWVtYmVyLm5hbWUsIGNvbnRleHQpO1xuICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMudmlzaXQobWVtYmVyLmluaXRpYWxpemVyLCBjb250ZXh0KTtcbiAgICAgICAgbWFwLnNldChuYW1lLCBuZXcgRW51bVZhbHVlKGVudW1SZWYsIG5hbWUsIHJlc29sdmVkKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlPFQgZXh0ZW5kcyBEZWNsYXJhdGlvbk5vZGU+KG5vZGU6IFQsIGNvbnRleHQ6IENvbnRleHQpOiBSZWZlcmVuY2U8VD4ge1xuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKG5vZGUsIG93bmluZ01vZHVsZShjb250ZXh0KSk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VHlwZShub2RlOiB0cy5UeXBlTm9kZSwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmICh0cy5pc0xpdGVyYWxUeXBlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGl0ZXJhbCwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1R1cGxlVHlwZU5vZGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0VHVwbGVUeXBlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNOYW1lZFR1cGxlTWVtYmVyKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFR5cGUobm9kZS50eXBlLCBjb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljVHlwZShub2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRUdXBsZVR5cGUobm9kZTogdHMuVHVwbGVUeXBlTm9kZSwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3QgcmVzOiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbXTtcblxuICAgIGZvciAoY29uc3QgZWxlbSBvZiBub2RlLmVsZW1lbnRzKSB7XG4gICAgICByZXMucHVzaCh0aGlzLnZpc2l0VHlwZShlbGVtLCBjb250ZXh0KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uT3JNZXRob2RSZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4pOlxuICAgIHJlZiBpcyBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+IHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihyZWYubm9kZSkgfHxcbiAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHJlZi5ub2RlKTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbChcbiAgICB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSwgcmVqZWN0OiAodmFsdWU6IFJlc29sdmVkVmFsdWUpID0+IFJlc29sdmVkVmFsdWUpOiBSZXNvbHZlZFZhbHVlIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHJldHVybiByZWplY3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmIChub2RlLnBhcmVudCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KG5vZGUucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBkZWNsTGlzdCA9IG5vZGUucGFyZW50O1xuICBpZiAoZGVjbExpc3QucGFyZW50ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoZGVjbExpc3QucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCB2YXJTdG10ID0gZGVjbExpc3QucGFyZW50O1xuICByZXR1cm4gdmFyU3RtdC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdmFyU3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRGVjbGFyZUtleXdvcmQpO1xufVxuXG5jb25zdCBFTVBUWSA9IHt9O1xuXG5mdW5jdGlvbiBqb2luTW9kdWxlQ29udGV4dChleGlzdGluZzogQ29udGV4dCwgbm9kZTogdHMuTm9kZSwgZGVjbDogRGVjbGFyYXRpb24pOiB7XG4gIGFic29sdXRlTW9kdWxlTmFtZT86IHN0cmluZyxcbiAgcmVzb2x1dGlvbkNvbnRleHQ/OiBzdHJpbmcsXG59IHtcbiAgaWYgKGRlY2wudmlhTW9kdWxlICE9PSBudWxsICYmIGRlY2wudmlhTW9kdWxlICE9PSBleGlzdGluZy5hYnNvbHV0ZU1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBkZWNsLnZpYU1vZHVsZSxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBFTVBUWTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvd25pbmdNb2R1bGUoY29udGV4dDogQ29udGV4dCwgb3ZlcnJpZGU6IE93bmluZ01vZHVsZXxudWxsID0gbnVsbCk6IE93bmluZ01vZHVsZXxudWxsIHtcbiAgbGV0IHNwZWNpZmllciA9IGNvbnRleHQuYWJzb2x1dGVNb2R1bGVOYW1lO1xuICBpZiAob3ZlcnJpZGUgIT09IG51bGwpIHtcbiAgICBzcGVjaWZpZXIgPSBvdmVycmlkZS5zcGVjaWZpZXI7XG4gIH1cbiAgaWYgKHNwZWNpZmllciAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7XG4gICAgICBzcGVjaWZpZXIsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogY29udGV4dC5yZXNvbHV0aW9uQ29udGV4dCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=