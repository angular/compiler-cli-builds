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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    var ts_helpers_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers");
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
                    array.push.apply(array, tslib_1.__spread(this.visitSpreadElement(element, context)));
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
                    else if (!(spread instanceof Map)) {
                        return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromInvalidExpressionType(property, spread));
                    }
                    spread.forEach(function (value, key) { return map.set(key, value); });
                }
                else {
                    return dynamic_1.DynamicValue.fromUnknown(node);
                }
            }
            return map;
        };
        StaticInterpreter.prototype.visitTemplateExpression = function (node, context) {
            var pieces = [node.head.text];
            for (var i = 0; i < node.templateSpans.length; i++) {
                var span = node.templateSpans[i];
                var value = this.visit(span.expression, context);
                if (value instanceof result_1.EnumValue) {
                    value = value.resolved;
                }
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ||
                    value == null) {
                    pieces.push("" + value);
                }
                else if (value instanceof dynamic_1.DynamicValue) {
                    return dynamic_1.DynamicValue.fromDynamicInput(node, value);
                }
                else {
                    return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromDynamicString(span.expression));
                }
                pieces.push(span.literal.text);
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
                    return dynamic_1.DynamicValue.fromUnknownIdentifier(node);
                }
            }
            var declContext = tslib_1.__assign(tslib_1.__assign({}, context), joinModuleContext(context, node, decl));
            // The identifier's declaration is either concrete (a ts.Declaration exists for it) or inline
            // (a direct reference to a ts.Expression).
            // TODO(alxhub): remove cast once TS is upgraded in g3.
            var result = decl.node !== null ?
                this.visitDeclaration(decl.node, declContext) :
                this.visitExpression(decl.expression, declContext);
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
            if (this.dependencyTracker) {
                this.dependencyTracker.trackFileDependency(node.getSourceFile(), context.originatingFile);
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
            var map = new Map();
            declarations.forEach(function (decl, name) {
                var declContext = tslib_1.__assign(tslib_1.__assign({}, context), joinModuleContext(context, node, decl));
                // Visit both concrete and inline declarations.
                // TODO(alxhub): remove cast once TS is upgraded in g3.
                var value = decl.node !== null ?
                    _this.visitDeclaration(decl.node, declContext) :
                    _this.visitExpression(decl.expression, declContext);
                map.set(name, value);
            });
            return map;
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
            else if (Array.isArray(lhs)) {
                if (rhs === 'length') {
                    return lhs.length;
                }
                else if (rhs === 'slice') {
                    return new builtin_1.ArraySliceBuiltinFn(node, lhs);
                }
                else if (rhs === 'concat') {
                    return new builtin_1.ArrayConcatBuiltinFn(node, lhs);
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
                else if (typescript_1.isDeclaration(ref)) {
                    return dynamic_1.DynamicValue.fromDynamicInput(node, dynamic_1.DynamicValue.fromExternalReference(ref, lhs));
                }
            }
            else if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            return dynamic_1.DynamicValue.fromUnknown(node);
        };
        StaticInterpreter.prototype.visitCallExpression = function (node, context) {
            var _this = this;
            var lhs = this.visitExpression(node.expression, context);
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            // If the call refers to a builtin function, attempt to evaluate the function.
            if (lhs instanceof result_1.BuiltinFn) {
                return lhs.evaluate(this.evaluateFunctionArguments(node, context));
            }
            if (!(lhs instanceof imports_1.Reference)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            var fn = this.host.getDefinitionOfFunction(lhs.node);
            if (fn === null) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            // If the function corresponds with a tslib helper function, evaluate it with custom logic.
            if (fn.helper !== null) {
                var args_1 = this.evaluateFunctionArguments(node, context);
                return ts_helpers_1.evaluateTsHelperInline(fn.helper, node, args_1);
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
                // If the function is declared in a different file, resolve the foreign function expression
                // using the absolute module name of that file (if any).
                if (lhs.bestGuessOwningModule !== null) {
                    context = tslib_1.__assign(tslib_1.__assign({}, context), { absoluteModuleName: lhs.bestGuessOwningModule.specifier, resolutionContext: node.getSourceFile().fileName });
                }
                var res = this.visitExpression(expr, context);
                if (res instanceof imports_1.Reference) {
                    // This Reference was created synthetically, via a foreign function resolver. The real
                    // runtime value of the function expression may be different than the foreign function
                    // resolved value, so mark the Reference as synthetic to avoid it being misinterpreted.
                    res.synthetic = true;
                }
                return res;
            }
            var body = fn.body;
            if (body.length !== 1 || !ts.isReturnStatement(body[0])) {
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            var ret = body[0];
            var args = this.evaluateFunctionArguments(node, context);
            var newScope = new Map();
            var calleeContext = tslib_1.__assign(tslib_1.__assign({}, context), { scope: newScope });
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
                lhs = literal(this.visitExpression(node.left, context), node.left);
                rhs = literal(this.visitExpression(node.right, context), node.right);
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
                for (var _b = tslib_1.__values(node.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var arg = _c.value;
                    if (ts.isSpreadElement(arg)) {
                        args.push.apply(args, tslib_1.__spread(this.visitSpreadElement(arg, context)));
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
        StaticInterpreter.prototype.stringNameFromPropertyName = function (node, context) {
            if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
                return node.text;
            }
            else { // ts.ComputedPropertyName
                var literal_1 = this.visitExpression(node.expression, context);
                return typeof literal_1 === 'string' ? literal_1 : undefined;
            }
        };
        StaticInterpreter.prototype.getReference = function (node, context) {
            return new imports_1.Reference(node, owningModule(context));
        };
        return StaticInterpreter;
    }());
    exports.StaticInterpreter = StaticInterpreter;
    function isFunctionOrMethodReference(ref) {
        return ts.isFunctionDeclaration(ref.node) || ts.isMethodDeclaration(ref.node) ||
            ts.isFunctionExpression(ref.node);
    }
    function literal(value, node) {
        if (value instanceof dynamic_1.DynamicValue || value === null || value === undefined ||
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        return dynamic_1.DynamicValue.fromInvalidExpressionType(node, value);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUVBQXdDO0lBR3hDLGtGQUF3RDtJQUV4RCx5RkFBb0U7SUFDcEUseUZBQXVDO0lBRXZDLHVGQUFtRztJQUNuRywrRkFBb0Q7SUFlcEQsU0FBUyxlQUFlLENBQUMsRUFBMkI7UUFDbEQsT0FBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxFQUEyQjtRQUNwRCxPQUFPLEVBQUMsRUFBRSxJQUFBLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFtQztRQUNqRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEdBQUcsQ0FBQyxFQUFMLENBQUssQ0FBQyxDQUFDO1FBQzNELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxDQUFDLENBQUM7UUFDNUQsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUMsQ0FBQztRQUMvRCxDQUFDLEVBQUUsQ0FBQyxV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LE1BQU0sQ0FBQztRQUNoQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUztZQUNsQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQXpDLENBQXlDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBRWpCLFNBQVMsaUJBQWlCLENBQUMsUUFBaUIsRUFBRSxJQUFhLEVBQUUsSUFBaUI7UUFJNUUsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRTtZQUM3RSxPQUFPO2dCQUNMLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUNsQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTthQUNqRCxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsT0FBZ0IsRUFBRSxRQUFvQztRQUFwQyx5QkFBQSxFQUFBLGVBQW9DO1FBQzFFLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUMzQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDckIsU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7U0FDaEM7UUFDRCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsT0FBTztnQkFDTCxTQUFTLFdBQUE7Z0JBQ1QsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQjthQUM3QyxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtPd25pbmdNb2R1bGV9IGZyb20gJy4uLy4uL2ltcG9ydHMvc3JjL3JlZmVyZW5jZXMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgSW5saW5lRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXJyYXlDb25jYXRCdWlsdGluRm4sIEFycmF5U2xpY2VCdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXIsIEZvcmVpZ25GdW5jdGlvblJlc29sdmVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge0J1aWx0aW5GbiwgRW51bVZhbHVlLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4vcmVzdWx0JztcbmltcG9ydCB7ZXZhbHVhdGVUc0hlbHBlcklubGluZX0gZnJvbSAnLi90c19oZWxwZXJzJztcblxuXG5cbi8qKlxuICogVHJhY2tzIHRoZSBzY29wZSBvZiBhIGZ1bmN0aW9uIGJvZHksIHdoaWNoIGluY2x1ZGVzIGBSZXNvbHZlZFZhbHVlYHMgZm9yIHRoZSBwYXJhbWV0ZXJzIG9mIHRoYXRcbiAqIGJvZHkuXG4gKi9cbnR5cGUgU2NvcGUgPSBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+O1xuXG5pbnRlcmZhY2UgQmluYXJ5T3BlcmF0b3JEZWYge1xuICBsaXRlcmFsOiBib29sZWFuO1xuICBvcDogKGE6IGFueSwgYjogYW55KSA9PiBSZXNvbHZlZFZhbHVlO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiB0cnVlfTtcbn1cblxuZnVuY3Rpb24gcmVmZXJlbmNlQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiBmYWxzZX07XG59XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPHRzLlN5bnRheEtpbmQsIEJpbmFyeU9wZXJhdG9yRGVmPihbXG4gIFt0cy5TeW50YXhLaW5kLlBsdXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICsgYildLFxuICBbdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgLSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAqIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuU2xhc2hUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC8gYildLFxuICBbdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAlIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAmIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQmFyVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSB8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQ2FyZXRUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIF4gYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID49IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPT09IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+PiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBNYXRoLnBvdyhhLCBiKSldLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgJiYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgfHwgYildXG5dKTtcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCAoYTogYW55KSA9PiBhbnk+KFtcbiAgW3RzLlN5bnRheEtpbmQuVGlsZGVUb2tlbiwgYSA9PiB+YV0sIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGEgPT4gLWFdLFxuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGEgPT4gK2FdLCBbdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhID0+ICFhXVxuXSk7XG5cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgb3JpZ2luYXRpbmdGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICAvKipcbiAgICogVGhlIG1vZHVsZSBuYW1lIChpZiBhbnkpIHdoaWNoIHdhcyB1c2VkIHRvIHJlYWNoIHRoZSBjdXJyZW50bHkgcmVzb2x2aW5nIHN5bWJvbHMuXG4gICAqL1xuICBhYnNvbHV0ZU1vZHVsZU5hbWU6IHN0cmluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBBIGZpbGUgbmFtZSByZXByZXNlbnRpbmcgdGhlIGNvbnRleHQgaW4gd2hpY2ggdGhlIGN1cnJlbnQgYGFic29sdXRlTW9kdWxlTmFtZWAsIGlmIGFueSwgd2FzXG4gICAqIHJlc29sdmVkLlxuICAgKi9cbiAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZztcbiAgc2NvcGU6IFNjb3BlO1xuICBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcj86IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyO1xufVxuXG5leHBvcnQgY2xhc3MgU3RhdGljSW50ZXJwcmV0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIGRlcGVuZGVuY3lUcmFja2VyPzogRGVwZW5kZW5jeVRyYWNrZXIpIHt9XG5cbiAgdmlzaXQobm9kZTogdHMuRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFeHByZXNzaW9uKG5vZGU6IHRzLkV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBsZXQgcmVzdWx0OiBSZXNvbHZlZFZhbHVlO1xuICAgIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkZhbHNlS2V5d29yZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc1RlbXBsYXRlRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFRlbXBsYXRlRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KG5vZGUudGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRJZGVudGlmaWVyKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0Q2FsbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdENvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTm9uTnVsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdERlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21VbnN1cHBvcnRlZFN5bnRheChub2RlKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSAmJiByZXN1bHQubm9kZSAhPT0gbm9kZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGFycmF5OiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBub2RlLmVsZW1lbnRzW2ldO1xuICAgICAgaWYgKHRzLmlzU3ByZWFkRWxlbWVudChlbGVtZW50KSkge1xuICAgICAgICBhcnJheS5wdXNoKC4uLnRoaXMudmlzaXRTcHJlYWRFbGVtZW50KGVsZW1lbnQsIGNvbnRleHQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5LnB1c2godGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudCwgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbWFwOiBSZXNvbHZlZFZhbHVlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5zdHJpbmdOYW1lRnJvbVByb3BlcnR5TmFtZShwcm9wZXJ0eS5uYW1lLCBjb250ZXh0KTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLnNldChuYW1lLCB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplciwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWFwLnNldChwcm9wZXJ0eS5uYW1lLnRleHQsIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihwcm9wZXJ0eSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCB0aGlzLnZpc2l0RGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cy5pc1NwcmVhZEFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIShzcHJlYWQgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KFxuICAgICAgICAgICAgICBub2RlLCBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShwcm9wZXJ0eSwgc3ByZWFkKSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ByZWFkLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IG1hcC5zZXQoa2V5LCB2YWx1ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRUZW1wbGF0ZUV4cHJlc3Npb24obm9kZTogdHMuVGVtcGxhdGVFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcGllY2VzOiBzdHJpbmdbXSA9IFtub2RlLmhlYWQudGV4dF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnRlbXBsYXRlU3BhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnRlbXBsYXRlU3BhbnNbaV07XG4gICAgICBsZXQgdmFsdWUgPSB0aGlzLnZpc2l0KHNwYW4uZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgICB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIHBpZWNlcy5wdXNoKGAke3ZhbHVlfWApO1xuICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhzcGFuLmV4cHJlc3Npb24pKTtcbiAgICAgIH1cbiAgICAgIHBpZWNlcy5wdXNoKHNwYW4ubGl0ZXJhbC50ZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuIHBpZWNlcy5qb2luKCcnKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRJZGVudGlmaWVyKG5vZGU6IHRzLklkZW50aWZpZXIsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBkZWNsID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKG5vZGUpO1xuICAgIGlmIChkZWNsID09PSBudWxsKSB7XG4gICAgICBpZiAobm9kZS5vcmlnaW5hbEtleXdvcmRLaW5kID09PSB0cy5TeW50YXhLaW5kLlVuZGVmaW5lZEtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBkZWNsQ29udGV4dCA9IHsuLi5jb250ZXh0LCAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKX07XG4gICAgLy8gVGhlIGlkZW50aWZpZXIncyBkZWNsYXJhdGlvbiBpcyBlaXRoZXIgY29uY3JldGUgKGEgdHMuRGVjbGFyYXRpb24gZXhpc3RzIGZvciBpdCkgb3IgaW5saW5lXG4gICAgLy8gKGEgZGlyZWN0IHJlZmVyZW5jZSB0byBhIHRzLkV4cHJlc3Npb24pLlxuICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIGNhc3Qgb25jZSBUUyBpcyB1cGdyYWRlZCBpbiBnMy5cbiAgICBjb25zdCByZXN1bHQgPSBkZWNsLm5vZGUgIT09IG51bGwgP1xuICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCBkZWNsQ29udGV4dCkgOlxuICAgICAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbigoZGVjbCBhcyBJbmxpbmVEZWNsYXJhdGlvbikuZXhwcmVzc2lvbiwgZGVjbENvbnRleHQpO1xuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIC8vIE9ubHkgcmVjb3JkIGlkZW50aWZpZXJzIHRvIG5vbi1zeW50aGV0aWMgcmVmZXJlbmNlcy4gU3ludGhldGljIHJlZmVyZW5jZXMgbWF5IG5vdCBoYXZlIHRoZVxuICAgICAgLy8gc2FtZSB2YWx1ZSBhdCBydW50aW1lIGFzIHRoZXkgZG8gYXQgY29tcGlsZSB0aW1lLCBzbyBpdCdzIG5vdCBsZWdhbCB0byByZWZlciB0byB0aGVtIGJ5IHRoZVxuICAgICAgLy8gaWRlbnRpZmllciBoZXJlLlxuICAgICAgaWYgKCFyZXN1bHQuc3ludGhldGljKSB7XG4gICAgICAgIHJlc3VsdC5hZGRJZGVudGlmaWVyKG5vZGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVzdWx0IGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXREZWNsYXJhdGlvbihub2RlOiB0cy5EZWNsYXJhdGlvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmICh0aGlzLmRlcGVuZGVuY3lUcmFja2VyKSB7XG4gICAgICB0aGlzLmRlcGVuZGVuY3lUcmFja2VyLnRyYWNrRmlsZURlcGVuZGVuY3kobm9kZS5nZXRTb3VyY2VGaWxlKCksIGNvbnRleHQub3JpZ2luYXRpbmdGaWxlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUGFyYW1ldGVyKG5vZGUpICYmIGNvbnRleHQuc2NvcGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gY29udGV4dC5zY29wZS5nZXQobm9kZSkgITtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRXhwb3J0QXNzaWdubWVudChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VudW1EZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1NvdXJjZUZpbGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0U291cmNlRmlsZShub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuaG9zdC5nZXRWYXJpYWJsZVZhbHVlKG5vZGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKHZhbHVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKGlzVmFyaWFibGVEZWNsYXJhdGlvbkRlY2xhcmVkKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVudW1EZWNsYXJhdGlvbihub2RlOiB0cy5FbnVtRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBlbnVtUmVmID0gdGhpcy5nZXRSZWZlcmVuY2Uobm9kZSwgY29udGV4dCkgYXMgUmVmZXJlbmNlPHRzLkVudW1EZWNsYXJhdGlvbj47XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIEVudW1WYWx1ZT4oKTtcbiAgICBub2RlLm1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobWVtYmVyLm5hbWUsIGNvbnRleHQpO1xuICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCByZXNvbHZlZCA9IG1lbWJlci5pbml0aWFsaXplciAmJiB0aGlzLnZpc2l0KG1lbWJlci5pbml0aWFsaXplciwgY29udGV4dCk7XG4gICAgICAgIG1hcC5zZXQobmFtZSwgbmV3IEVudW1WYWx1ZShlbnVtUmVmLCBuYW1lLCByZXNvbHZlZCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG4gICAgY29uc3QgcmhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5hcmd1bWVudEV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHJocyAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIHJocyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLCByaHMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFjY2Vzc0hlbHBlcihub2RlLCBsaHMsIHJocywgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGNvbnN0IHJocyA9IG5vZGUubmFtZS50ZXh0O1xuICAgIC8vIFRPRE86IGhhbmRsZSByZWZlcmVuY2UgdG8gY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFjY2Vzc0hlbHBlcihub2RlLCBsaHMsIHJocywgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U291cmNlRmlsZShub2RlOiB0cy5Tb3VyY2VGaWxlLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5ob3N0LmdldEV4cG9ydHNPZk1vZHVsZShub2RlKTtcbiAgICBpZiAoZGVjbGFyYXRpb25zID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgIH1cbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgUmVzb2x2ZWRWYWx1ZT4oKTtcbiAgICBkZWNsYXJhdGlvbnMuZm9yRWFjaCgoZGVjbCwgbmFtZSkgPT4ge1xuICAgICAgY29uc3QgZGVjbENvbnRleHQgPSB7XG4gICAgICAgICAgLi4uY29udGV4dCwgLi4uam9pbk1vZHVsZUNvbnRleHQoY29udGV4dCwgbm9kZSwgZGVjbCksXG4gICAgICB9O1xuICAgICAgLy8gVmlzaXQgYm90aCBjb25jcmV0ZSBhbmQgaW5saW5lIGRlY2xhcmF0aW9ucy5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIGNhc3Qgb25jZSBUUyBpcyB1cGdyYWRlZCBpbiBnMy5cbiAgICAgIGNvbnN0IHZhbHVlID0gZGVjbC5ub2RlICE9PSBudWxsID9cbiAgICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCBkZWNsQ29udGV4dCkgOlxuICAgICAgICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKChkZWNsIGFzIElubGluZURlY2xhcmF0aW9uKS5leHByZXNzaW9uLCBkZWNsQ29udGV4dCk7XG4gICAgICBtYXAuc2V0KG5hbWUsIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBhY2Nlc3NIZWxwZXIoXG4gICAgICBub2RlOiB0cy5FeHByZXNzaW9uLCBsaHM6IFJlc29sdmVkVmFsdWUsIHJoczogc3RyaW5nfG51bWJlcixcbiAgICAgIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBzdHJJbmRleCA9IGAke3Joc31gO1xuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChsaHMuaGFzKHN0ckluZGV4KSkge1xuICAgICAgICByZXR1cm4gbGhzLmdldChzdHJJbmRleCkgITtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGxocykpIHtcbiAgICAgIGlmIChyaHMgPT09ICdsZW5ndGgnKSB7XG4gICAgICAgIHJldHVybiBsaHMubGVuZ3RoO1xuICAgICAgfSBlbHNlIGlmIChyaHMgPT09ICdzbGljZScpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheVNsaWNlQnVpbHRpbkZuKG5vZGUsIGxocyk7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ2NvbmNhdCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheUNvbmNhdEJ1aWx0aW5Gbihub2RlLCBsaHMpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiByaHMgIT09ICdudW1iZXInIHx8ICFOdW1iZXIuaXNJbnRlZ2VyKHJocykpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUsIHJocyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGhzW3Joc107XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGNvbnN0IHJlZiA9IGxocy5ub2RlO1xuICAgICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKHJlZikpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlID0gb3duaW5nTW9kdWxlKGNvbnRleHQsIGxocy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpO1xuICAgICAgICBsZXQgdmFsdWU6IFJlc29sdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMuaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhyZWYpLmZpbmQoXG4gICAgICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBzdHJJbmRleCk7XG4gICAgICAgIGlmIChtZW1iZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChtZW1iZXIudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24obWVtYmVyLnZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5pbXBsZW1lbnRhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVmZXJlbmNlKG1lbWJlci5pbXBsZW1lbnRhdGlvbiwgbW9kdWxlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5ub2RlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWZlcmVuY2UobWVtYmVyLm5vZGUsIG1vZHVsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWNsYXJhdGlvbihyZWYpKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChcbiAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRXh0ZXJuYWxSZWZlcmVuY2UocmVmLCBsaHMgYXMgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPikpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENhbGxFeHByZXNzaW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY2FsbCByZWZlcnMgdG8gYSBidWlsdGluIGZ1bmN0aW9uLCBhdHRlbXB0IHRvIGV2YWx1YXRlIHRoZSBmdW5jdGlvbi5cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgQnVpbHRpbkZuKSB7XG4gICAgICByZXR1cm4gbGhzLmV2YWx1YXRlKHRoaXMuZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlLCBjb250ZXh0KSk7XG4gICAgfVxuXG4gICAgaWYgKCEobGhzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbiA9IHRoaXMuaG9zdC5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihsaHMubm9kZSk7XG4gICAgaWYgKGZuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBmdW5jdGlvbiBjb3JyZXNwb25kcyB3aXRoIGEgdHNsaWIgaGVscGVyIGZ1bmN0aW9uLCBldmFsdWF0ZSBpdCB3aXRoIGN1c3RvbSBsb2dpYy5cbiAgICBpZiAoZm4uaGVscGVyICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBhcmdzID0gdGhpcy5ldmFsdWF0ZUZ1bmN0aW9uQXJndW1lbnRzKG5vZGUsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGV2YWx1YXRlVHNIZWxwZXJJbmxpbmUoZm4uaGVscGVyLCBub2RlLCBhcmdzKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShsaHMpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBmb3JlaWduIChkZWNsYXJlZCB0aHJvdWdoIGEgZC50cyBmaWxlKSwgYXR0ZW1wdCB0byByZXNvbHZlIGl0IHdpdGggdGhlXG4gICAgLy8gZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgaWYgKGZuLmJvZHkgPT09IG51bGwpIHtcbiAgICAgIGxldCBleHByOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgICAgaWYgKGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIpIHtcbiAgICAgICAgZXhwciA9IGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIobGhzLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoXG4gICAgICAgICAgICBub2RlLCBEeW5hbWljVmFsdWUuZnJvbUV4dGVybmFsUmVmZXJlbmNlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBkZWNsYXJlZCBpbiBhIGRpZmZlcmVudCBmaWxlLCByZXNvbHZlIHRoZSBmb3JlaWduIGZ1bmN0aW9uIGV4cHJlc3Npb25cbiAgICAgIC8vIHVzaW5nIHRoZSBhYnNvbHV0ZSBtb2R1bGUgbmFtZSBvZiB0aGF0IGZpbGUgKGlmIGFueSkuXG4gICAgICBpZiAobGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgICBjb250ZXh0ID0ge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBsaHMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcixcbiAgICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpO1xuICAgICAgaWYgKHJlcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICAvLyBUaGlzIFJlZmVyZW5jZSB3YXMgY3JlYXRlZCBzeW50aGV0aWNhbGx5LCB2aWEgYSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyLiBUaGUgcmVhbFxuICAgICAgICAvLyBydW50aW1lIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIG1heSBiZSBkaWZmZXJlbnQgdGhhbiB0aGUgZm9yZWlnbiBmdW5jdGlvblxuICAgICAgICAvLyByZXNvbHZlZCB2YWx1ZSwgc28gbWFyayB0aGUgUmVmZXJlbmNlIGFzIHN5bnRoZXRpYyB0byBhdm9pZCBpdCBiZWluZyBtaXNpbnRlcnByZXRlZC5cbiAgICAgICAgcmVzLnN5bnRoZXRpYyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBmbi5ib2R5O1xuICAgIGlmIChib2R5Lmxlbmd0aCAhPT0gMSB8fCAhdHMuaXNSZXR1cm5TdGF0ZW1lbnQoYm9keVswXSkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGJvZHlbMF0gYXMgdHMuUmV0dXJuU3RhdGVtZW50O1xuXG4gICAgY29uc3QgYXJncyA9IHRoaXMuZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlLCBjb250ZXh0KTtcbiAgICBjb25zdCBuZXdTY29wZTogU2NvcGUgPSBuZXcgTWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGNvbnN0IGNhbGxlZUNvbnRleHQgPSB7Li4uY29udGV4dCwgc2NvcGU6IG5ld1Njb3BlfTtcbiAgICBmbi5wYXJhbWV0ZXJzLmZvckVhY2goKHBhcmFtLCBpbmRleCkgPT4ge1xuICAgICAgbGV0IGFyZyA9IGFyZ3NbaW5kZXhdO1xuICAgICAgaWYgKHBhcmFtLm5vZGUuZG90RG90RG90VG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhcmcgPSBhcmdzLnNsaWNlKGluZGV4KTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmcgPT09IHVuZGVmaW5lZCAmJiBwYXJhbS5pbml0aWFsaXplciAhPT0gbnVsbCkge1xuICAgICAgICBhcmcgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihwYXJhbS5pbml0aWFsaXplciwgY2FsbGVlQ29udGV4dCk7XG4gICAgICB9XG4gICAgICBuZXdTY29wZS5zZXQocGFyYW0ubm9kZSwgYXJnKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQuZXhwcmVzc2lvbiAhPT0gdW5kZWZpbmVkID8gdGhpcy52aXNpdEV4cHJlc3Npb24ocmV0LmV4cHJlc3Npb24sIGNhbGxlZUNvbnRleHQpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuY29uZGl0aW9uLCBjb250ZXh0KTtcbiAgICBpZiAoY29uZGl0aW9uIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgY29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5GYWxzZSwgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgb3BlcmF0b3JLaW5kID0gbm9kZS5vcGVyYXRvcjtcbiAgICBpZiAoIVVOQVJZX09QRVJBVE9SUy5oYXMob3BlcmF0b3JLaW5kKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3AgPSBVTkFSWV9PUEVSQVRPUlMuZ2V0KG9wZXJhdG9yS2luZCkgITtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUub3BlcmFuZCwgY29udGV4dCk7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3AodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRCaW5hcnlFeHByZXNzaW9uKG5vZGU6IHRzLkJpbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCB0b2tlbktpbmQgPSBub2RlLm9wZXJhdG9yVG9rZW4ua2luZDtcbiAgICBpZiAoIUJJTkFSWV9PUEVSQVRPUlMuaGFzKHRva2VuS2luZCkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG9wUmVjb3JkID0gQklOQVJZX09QRVJBVE9SUy5nZXQodG9rZW5LaW5kKSAhO1xuICAgIGxldCBsaHM6IFJlc29sdmVkVmFsdWUsIHJoczogUmVzb2x2ZWRWYWx1ZTtcbiAgICBpZiAob3BSZWNvcmQubGl0ZXJhbCkge1xuICAgICAgbGhzID0gbGl0ZXJhbCh0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnRleHQpLCBub2RlLmxlZnQpO1xuICAgICAgcmhzID0gbGl0ZXJhbCh0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KSwgbm9kZS5yaWdodCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCk7XG4gICAgICByaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfSBlbHNlIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3BSZWNvcmQub3AobGhzLCByaHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlOiB0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3QgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChjb25zdCBhcmcgb2Ygbm9kZS5hcmd1bWVudHMpIHtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoYXJnKSkge1xuICAgICAgICBhcmdzLnB1c2goLi4udGhpcy52aXNpdFNwcmVhZEVsZW1lbnQoYXJnLCBjb250ZXh0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzLnB1c2godGhpcy52aXNpdEV4cHJlc3Npb24oYXJnLCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFNwcmVhZEVsZW1lbnQobm9kZTogdHMuU3ByZWFkRWxlbWVudCwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3Qgc3ByZWFkID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gW0R5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCldO1xuICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoc3ByZWFkKSkge1xuICAgICAgcmV0dXJuIFtEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLCBzcHJlYWQpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHNwcmVhZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG5vZGU6IHRzLlByb3BlcnR5TmFtZSwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkgfHwgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpIHx8IHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIHsgIC8vIHRzLkNvbXB1dGVkUHJvcGVydHlOYW1lXG4gICAgICBjb25zdCBsaXRlcmFsID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiB0eXBlb2YgbGl0ZXJhbCA9PT0gJ3N0cmluZycgPyBsaXRlcmFsIDogdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVmZXJlbmNlIHtcbiAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShub2RlLCBvd25pbmdNb2R1bGUoY29udGV4dCkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPik6XG4gICAgcmVmIGlzIFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocmVmLm5vZGUpO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsKHZhbHVlOiBSZXNvbHZlZFZhbHVlLCBub2RlOiB0cy5Ob2RlKTogYW55IHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlIHx8IHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmIChub2RlLnBhcmVudCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KG5vZGUucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBkZWNsTGlzdCA9IG5vZGUucGFyZW50O1xuICBpZiAoZGVjbExpc3QucGFyZW50ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoZGVjbExpc3QucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCB2YXJTdG10ID0gZGVjbExpc3QucGFyZW50O1xuICByZXR1cm4gdmFyU3RtdC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdmFyU3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRGVjbGFyZUtleXdvcmQpO1xufVxuXG5jb25zdCBFTVBUWSA9IHt9O1xuXG5mdW5jdGlvbiBqb2luTW9kdWxlQ29udGV4dChleGlzdGluZzogQ29udGV4dCwgbm9kZTogdHMuTm9kZSwgZGVjbDogRGVjbGFyYXRpb24pOiB7XG4gIGFic29sdXRlTW9kdWxlTmFtZT86IHN0cmluZyxcbiAgcmVzb2x1dGlvbkNvbnRleHQ/OiBzdHJpbmcsXG59IHtcbiAgaWYgKGRlY2wudmlhTW9kdWxlICE9PSBudWxsICYmIGRlY2wudmlhTW9kdWxlICE9PSBleGlzdGluZy5hYnNvbHV0ZU1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBkZWNsLnZpYU1vZHVsZSxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBFTVBUWTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvd25pbmdNb2R1bGUoY29udGV4dDogQ29udGV4dCwgb3ZlcnJpZGU6IE93bmluZ01vZHVsZSB8IG51bGwgPSBudWxsKTogT3duaW5nTW9kdWxlfG51bGwge1xuICBsZXQgc3BlY2lmaWVyID0gY29udGV4dC5hYnNvbHV0ZU1vZHVsZU5hbWU7XG4gIGlmIChvdmVycmlkZSAhPT0gbnVsbCkge1xuICAgIHNwZWNpZmllciA9IG92ZXJyaWRlLnNwZWNpZmllcjtcbiAgfVxuICBpZiAoc3BlY2lmaWVyICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNwZWNpZmllcixcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBjb250ZXh0LnJlc29sdXRpb25Db250ZXh0LFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==