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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/known_declaration", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StaticInterpreter = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
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
                    return dynamic_1.DynamicValue.fromUnknownIdentifier(node);
                }
            }
            if (decl.known !== null) {
                return known_declaration_1.resolveKnownDeclaration(decl.known);
            }
            else if (isConcreteDeclaration(decl) && decl.identity !== null &&
                decl.identity.kind === 0 /* DownleveledEnum */) {
                return this.getResolvedEnum(decl.node, decl.identity.enumMembers, context);
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
            return new result_1.ResolvedModule(declarations, function (decl) {
                if (decl.known !== null) {
                    return known_declaration_1.resolveKnownDeclaration(decl.known);
                }
                var declContext = tslib_1.__assign(tslib_1.__assign({}, context), joinModuleContext(context, node, decl));
                // Visit both concrete and inline declarations.
                // TODO(alxhub): remove cast once TS is upgraded in g3.
                return decl.node !== null ?
                    _this.visitDeclaration(decl.node, declContext) :
                    _this.visitExpression(decl.expression, declContext);
            });
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
    /**
     * Helper type guard to workaround a narrowing limitation in g3, where testing for
     * `decl.node !== null` would not narrow `decl` to be of type `ConcreteDeclaration`.
     */
    function isConcreteDeclaration(decl) {
        return decl.node !== null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLG1FQUF3QztJQUl4QyxrRkFBd0Q7SUFFeEQseUZBQW9FO0lBQ3BFLHlGQUF1QztJQUV2Qyw2R0FBNEQ7SUFDNUQsdUZBQWlIO0lBZWpILFNBQVMsZUFBZSxDQUFDLEVBQTJCO1FBQ2xELE9BQU8sRUFBQyxFQUFFLElBQUEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBMkI7UUFDcEQsT0FBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBbUM7UUFDakUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEdBQUcsQ0FBQyxFQUFMLENBQUssQ0FBQyxDQUFDO1FBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxFQUFFLENBQUMs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QUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge093bmluZ01vZHVsZX0gZnJvbSAnLi4vLi4vaW1wb3J0cy9zcmMvcmVmZXJlbmNlcyc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtDb25jcmV0ZURlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbiwgRW51bU1lbWJlciwgSW5saW5lRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0LCBTcGVjaWFsRGVjbGFyYXRpb25LaW5kfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXJyYXlDb25jYXRCdWlsdGluRm4sIEFycmF5U2xpY2VCdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7cmVzb2x2ZUtub3duRGVjbGFyYXRpb259IGZyb20gJy4va25vd25fZGVjbGFyYXRpb24nO1xuaW1wb3J0IHtFbnVtVmFsdWUsIEtub3duRm4sIFJlc29sdmVkTW9kdWxlLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4vcmVzdWx0JztcblxuXG5cbi8qKlxuICogVHJhY2tzIHRoZSBzY29wZSBvZiBhIGZ1bmN0aW9uIGJvZHksIHdoaWNoIGluY2x1ZGVzIGBSZXNvbHZlZFZhbHVlYHMgZm9yIHRoZSBwYXJhbWV0ZXJzIG9mIHRoYXRcbiAqIGJvZHkuXG4gKi9cbnR5cGUgU2NvcGUgPSBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+O1xuXG5pbnRlcmZhY2UgQmluYXJ5T3BlcmF0b3JEZWYge1xuICBsaXRlcmFsOiBib29sZWFuO1xuICBvcDogKGE6IGFueSwgYjogYW55KSA9PiBSZXNvbHZlZFZhbHVlO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiB0cnVlfTtcbn1cblxuZnVuY3Rpb24gcmVmZXJlbmNlQmluYXJ5T3Aob3A6IChhOiBhbnksIGI6IGFueSkgPT4gYW55KTogQmluYXJ5T3BlcmF0b3JEZWYge1xuICByZXR1cm4ge29wLCBsaXRlcmFsOiBmYWxzZX07XG59XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlMgPSBuZXcgTWFwPHRzLlN5bnRheEtpbmQsIEJpbmFyeU9wZXJhdG9yRGVmPihbXG4gIFt0cy5TeW50YXhLaW5kLlBsdXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICsgYildLFxuICBbdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgLSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAqIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuU2xhc2hUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC8gYildLFxuICBbdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAlIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAmIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQmFyVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSB8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQ2FyZXRUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIF4gYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID49IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc0VxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPT09IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICE9PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+PiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBNYXRoLnBvdyhhLCBiKSldLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgJiYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgfHwgYildXG5dKTtcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCAoYTogYW55KSA9PiBhbnk+KFtcbiAgW3RzLlN5bnRheEtpbmQuVGlsZGVUb2tlbiwgYSA9PiB+YV0sIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGEgPT4gLWFdLFxuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGEgPT4gK2FdLCBbdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhID0+ICFhXVxuXSk7XG5cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgb3JpZ2luYXRpbmdGaWxlOiB0cy5Tb3VyY2VGaWxlO1xuICAvKipcbiAgICogVGhlIG1vZHVsZSBuYW1lIChpZiBhbnkpIHdoaWNoIHdhcyB1c2VkIHRvIHJlYWNoIHRoZSBjdXJyZW50bHkgcmVzb2x2aW5nIHN5bWJvbHMuXG4gICAqL1xuICBhYnNvbHV0ZU1vZHVsZU5hbWU6IHN0cmluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBBIGZpbGUgbmFtZSByZXByZXNlbnRpbmcgdGhlIGNvbnRleHQgaW4gd2hpY2ggdGhlIGN1cnJlbnQgYGFic29sdXRlTW9kdWxlTmFtZWAsIGlmIGFueSwgd2FzXG4gICAqIHJlc29sdmVkLlxuICAgKi9cbiAgcmVzb2x1dGlvbkNvbnRleHQ6IHN0cmluZztcbiAgc2NvcGU6IFNjb3BlO1xuICBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcj86IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyO1xufVxuXG5leHBvcnQgY2xhc3MgU3RhdGljSW50ZXJwcmV0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIGRlcGVuZGVuY3lUcmFja2VyOiBEZXBlbmRlbmN5VHJhY2tlcnxudWxsKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHRzLkV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgbGV0IHJlc3VsdDogUmVzb2x2ZWRWYWx1ZTtcbiAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5OdWxsS2V5d29yZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChub2RlLnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdE9iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNJZGVudGlmaWVyKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0SWRlbnRpZmllcihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdENhbGxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1ByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEJpbmFyeUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNBc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vbk51bGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ob3N0LmlzQ2xhc3Mobm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXREZWNsYXJhdGlvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgJiYgcmVzdWx0Lm5vZGUgIT09IG5vZGUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBhcnJheTogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gbm9kZS5lbGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgYXJyYXkucHVzaCguLi50aGlzLnZpc2l0U3ByZWFkRWxlbWVudChlbGVtZW50LCBjb250ZXh0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcnJheS5wdXNoKHRoaXMudmlzaXRFeHByZXNzaW9uKGVsZW1lbnQsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5O1xuICB9XG5cbiAgcHJvdGVjdGVkIHZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbWFwOiBSZXNvbHZlZFZhbHVlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5zdHJpbmdOYW1lRnJvbVByb3BlcnR5TmFtZShwcm9wZXJ0eS5uYW1lLCBjb250ZXh0KTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLnNldChuYW1lLCB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplciwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWFwLnNldChwcm9wZXJ0eS5uYW1lLnRleHQsIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihwcm9wZXJ0eSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCB0aGlzLnZpc2l0RGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cy5pc1NwcmVhZEFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ByZWFkIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgICAgc3ByZWFkLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IG1hcC5zZXQoa2V5LCB2YWx1ZSkpO1xuICAgICAgICB9IGVsc2UgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIFJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgICAgc3ByZWFkLmdldEV4cG9ydHMoKS5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiBtYXAuc2V0KGtleSwgdmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoXG4gICAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKHByb3BlcnR5LCBzcHJlYWQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRUZW1wbGF0ZUV4cHJlc3Npb24obm9kZTogdHMuVGVtcGxhdGVFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcGllY2VzOiBzdHJpbmdbXSA9IFtub2RlLmhlYWQudGV4dF07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnRlbXBsYXRlU3BhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHNwYW4gPSBub2RlLnRlbXBsYXRlU3BhbnNbaV07XG4gICAgICBjb25zdCB2YWx1ZSA9IGxpdGVyYWwoXG4gICAgICAgICAgdGhpcy52aXNpdChzcGFuLmV4cHJlc3Npb24sIGNvbnRleHQpLFxuICAgICAgICAgICgpID0+IER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhzcGFuLmV4cHJlc3Npb24pKTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgdmFsdWUpO1xuICAgICAgfVxuICAgICAgcGllY2VzLnB1c2goYCR7dmFsdWV9YCwgc3Bhbi5saXRlcmFsLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gcGllY2VzLmpvaW4oJycpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdElkZW50aWZpZXIobm9kZTogdHMuSWRlbnRpZmllciwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2wgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIobm9kZSk7XG4gICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgIGlmIChub2RlLm9yaWdpbmFsS2V5d29yZEtpbmQgPT09IHRzLlN5bnRheEtpbmQuVW5kZWZpbmVkS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bklkZW50aWZpZXIobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWNsLmtub3duICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZUtub3duRGVjbGFyYXRpb24oZGVjbC5rbm93bik7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgaXNDb25jcmV0ZURlY2xhcmF0aW9uKGRlY2wpICYmIGRlY2wuaWRlbnRpdHkgIT09IG51bGwgJiZcbiAgICAgICAgZGVjbC5pZGVudGl0eS5raW5kID09PSBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLkRvd25sZXZlbGVkRW51bSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzb2x2ZWRFbnVtKGRlY2wubm9kZSwgZGVjbC5pZGVudGl0eS5lbnVtTWVtYmVycywgY29udGV4dCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xDb250ZXh0ID0gey4uLmNvbnRleHQsIC4uLmpvaW5Nb2R1bGVDb250ZXh0KGNvbnRleHQsIG5vZGUsIGRlY2wpfTtcbiAgICAvLyBUaGUgaWRlbnRpZmllcidzIGRlY2xhcmF0aW9uIGlzIGVpdGhlciBjb25jcmV0ZSAoYSB0cy5EZWNsYXJhdGlvbiBleGlzdHMgZm9yIGl0KSBvciBpbmxpbmVcbiAgICAvLyAoYSBkaXJlY3QgcmVmZXJlbmNlIHRvIGEgdHMuRXhwcmVzc2lvbikuXG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgY2FzdCBvbmNlIFRTIGlzIHVwZ3JhZGVkIGluIGczLlxuICAgIGNvbnN0IHJlc3VsdCA9IGRlY2wubm9kZSAhPT0gbnVsbCA/XG4gICAgICAgIHRoaXMudmlzaXREZWNsYXJhdGlvbihkZWNsLm5vZGUsIGRlY2xDb250ZXh0KSA6XG4gICAgICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKChkZWNsIGFzIElubGluZURlY2xhcmF0aW9uKS5leHByZXNzaW9uLCBkZWNsQ29udGV4dCk7XG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgLy8gT25seSByZWNvcmQgaWRlbnRpZmllcnMgdG8gbm9uLXN5bnRoZXRpYyByZWZlcmVuY2VzLiBTeW50aGV0aWMgcmVmZXJlbmNlcyBtYXkgbm90IGhhdmUgdGhlXG4gICAgICAvLyBzYW1lIHZhbHVlIGF0IHJ1bnRpbWUgYXMgdGhleSBkbyBhdCBjb21waWxlIHRpbWUsIHNvIGl0J3Mgbm90IGxlZ2FsIHRvIHJlZmVyIHRvIHRoZW0gYnkgdGhlXG4gICAgICAvLyBpZGVudGlmaWVyIGhlcmUuXG4gICAgICBpZiAoIXJlc3VsdC5zeW50aGV0aWMpIHtcbiAgICAgICAgcmVzdWx0LmFkZElkZW50aWZpZXIobm9kZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdERlY2xhcmF0aW9uKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIuYWRkRGVwZW5kZW5jeShjb250ZXh0Lm9yaWdpbmF0aW5nRmlsZSwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5ob3N0LmlzQ2xhc3Mobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkgJiYgY29udGV4dC5zY29wZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiBjb250ZXh0LnNjb3BlLmdldChub2RlKSE7XG4gICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydEFzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbnVtRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RW51bURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFNvdXJjZUZpbGUobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmhvc3QuZ2V0VmFyaWFibGVWYWx1ZShub2RlKTtcbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbih2YWx1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZTogdHMuRW51bURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgbm9kZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG1lbWJlci5uYW1lLCBjb250ZXh0KTtcbiAgICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBtZW1iZXIuaW5pdGlhbGl6ZXIgJiYgdGhpcy52aXNpdChtZW1iZXIuaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgICBtYXAuc2V0KG5hbWUsIG5ldyBFbnVtVmFsdWUoZW51bVJlZiwgbmFtZSwgcmVzb2x2ZWQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIGNvbnN0IHJocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAocmhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmhzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByaHMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByaHMgIT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgcmhzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hY2Nlc3NIZWxwZXIobm9kZSwgbGhzLCByaHMsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlOiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBjb25zdCByaHMgPSBub2RlLm5hbWUudGV4dDtcbiAgICAvLyBUT0RPOiBoYW5kbGUgcmVmZXJlbmNlIHRvIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hY2Nlc3NIZWxwZXIobm9kZSwgbGhzLCByaHMsIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFNvdXJjZUZpbGUobm9kZTogdHMuU291cmNlRmlsZSwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHRoaXMuaG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUobm9kZSk7XG4gICAgaWYgKGRlY2xhcmF0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc29sdmVkTW9kdWxlKGRlY2xhcmF0aW9ucywgZGVjbCA9PiB7XG4gICAgICBpZiAoZGVjbC5rbm93biAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZUtub3duRGVjbGFyYXRpb24oZGVjbC5rbm93bik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlY2xDb250ZXh0ID0ge1xuICAgICAgICAuLi5jb250ZXh0LFxuICAgICAgICAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFZpc2l0IGJvdGggY29uY3JldGUgYW5kIGlubGluZSBkZWNsYXJhdGlvbnMuXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHJlbW92ZSBjYXN0IG9uY2UgVFMgaXMgdXBncmFkZWQgaW4gZzMuXG4gICAgICByZXR1cm4gZGVjbC5ub2RlICE9PSBudWxsID9cbiAgICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCBkZWNsQ29udGV4dCkgOlxuICAgICAgICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKChkZWNsIGFzIElubGluZURlY2xhcmF0aW9uKS5leHByZXNzaW9uLCBkZWNsQ29udGV4dCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFjY2Vzc0hlbHBlcihcbiAgICAgIG5vZGU6IHRzLkV4cHJlc3Npb24sIGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBzdHJpbmd8bnVtYmVyLFxuICAgICAgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IHN0ckluZGV4ID0gYCR7cmhzfWA7XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgaWYgKGxocy5oYXMoc3RySW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBsaHMuZ2V0KHN0ckluZGV4KSE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgUmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgIHJldHVybiBsaHMuZ2V0RXhwb3J0KHN0ckluZGV4KTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobGhzKSkge1xuICAgICAgaWYgKHJocyA9PT0gJ2xlbmd0aCcpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGg7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ3NsaWNlJykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5U2xpY2VCdWlsdGluRm4obGhzKTtcbiAgICAgIH0gZWxzZSBpZiAocmhzID09PSAnY29uY2F0Jykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5Q29uY2F0QnVpbHRpbkZuKGxocyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHJocyAhPT0gJ251bWJlcicgfHwgIU51bWJlci5pc0ludGVnZXIocmhzKSkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgcmhzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsaHNbcmhzXTtcbiAgICB9IGVsc2UgaWYgKGxocyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgY29uc3QgcmVmID0gbGhzLm5vZGU7XG4gICAgICBpZiAodGhpcy5ob3N0LmlzQ2xhc3MocmVmKSkge1xuICAgICAgICBjb25zdCBtb2R1bGUgPSBvd25pbmdNb2R1bGUoY29udGV4dCwgbGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSk7XG4gICAgICAgIGxldCB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgbWVtYmVyID0gdGhpcy5ob3N0LmdldE1lbWJlcnNPZkNsYXNzKHJlZikuZmluZChcbiAgICAgICAgICAgIG1lbWJlciA9PiBtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLm5hbWUgPT09IHN0ckluZGV4KTtcbiAgICAgICAgaWYgKG1lbWJlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG1lbWJlci52YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihtZW1iZXIudmFsdWUsIGNvbnRleHQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVtYmVyLmltcGxlbWVudGF0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWZlcmVuY2UobWVtYmVyLmltcGxlbWVudGF0aW9uLCBtb2R1bGUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAobWVtYmVyLm5vZGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3IFJlZmVyZW5jZShtZW1iZXIubm9kZSwgbW9kdWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChpc0RlY2xhcmF0aW9uKHJlZikpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KFxuICAgICAgICAgICAgbm9kZSwgRHluYW1pY1ZhbHVlLmZyb21FeHRlcm5hbFJlZmVyZW5jZShyZWYsIGxocyBhcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cblxuICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0Q2FsbEV4cHJlc3Npb24obm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBsaHMpO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjYWxsIHJlZmVycyB0byBhIGJ1aWx0aW4gZnVuY3Rpb24sIGF0dGVtcHQgdG8gZXZhbHVhdGUgdGhlIGZ1bmN0aW9uLlxuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBLbm93bkZuKSB7XG4gICAgICByZXR1cm4gbGhzLmV2YWx1YXRlKG5vZGUsIHRoaXMuZXZhbHVhdGVGdW5jdGlvbkFyZ3VtZW50cyhub2RlLCBjb250ZXh0KSk7XG4gICAgfVxuXG4gICAgaWYgKCEobGhzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbiA9IHRoaXMuaG9zdC5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihsaHMubm9kZSk7XG4gICAgaWYgKGZuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kUmVmZXJlbmNlKGxocykpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLmV4cHJlc3Npb24sIGxocyk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGZ1bmN0aW9uIGlzIGZvcmVpZ24gKGRlY2xhcmVkIHRocm91Z2ggYSBkLnRzIGZpbGUpLCBhdHRlbXB0IHRvIHJlc29sdmUgaXQgd2l0aCB0aGVcbiAgICAvLyBmb3JlaWduRnVuY3Rpb25SZXNvbHZlciwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICBpZiAoZm4uYm9keSA9PT0gbnVsbCkge1xuICAgICAgbGV0IGV4cHI6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgICBpZiAoY29udGV4dC5mb3JlaWduRnVuY3Rpb25SZXNvbHZlcikge1xuICAgICAgICBleHByID0gY29udGV4dC5mb3JlaWduRnVuY3Rpb25SZXNvbHZlcihsaHMsIG5vZGUuYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICAgIGlmIChleHByID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChcbiAgICAgICAgICAgIG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRXh0ZXJuYWxSZWZlcmVuY2Uobm9kZS5leHByZXNzaW9uLCBsaHMpKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIGZ1bmN0aW9uIGlzIGRlY2xhcmVkIGluIGEgZGlmZmVyZW50IGZpbGUsIHJlc29sdmUgdGhlIGZvcmVpZ24gZnVuY3Rpb24gZXhwcmVzc2lvblxuICAgICAgLy8gdXNpbmcgdGhlIGFic29sdXRlIG1vZHVsZSBuYW1lIG9mIHRoYXQgZmlsZSAoaWYgYW55KS5cbiAgICAgIGlmIChsaHMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnRleHQgPSB7XG4gICAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgICBhYnNvbHV0ZU1vZHVsZU5hbWU6IGxocy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUuc3BlY2lmaWVyLFxuICAgICAgICAgIHJlc29sdXRpb25Db250ZXh0OiBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzID0gdGhpcy52aXNpdEV4cHJlc3Npb24oZXhwciwgY29udGV4dCk7XG4gICAgICBpZiAocmVzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICAgIC8vIFRoaXMgUmVmZXJlbmNlIHdhcyBjcmVhdGVkIHN5bnRoZXRpY2FsbHksIHZpYSBhIGZvcmVpZ24gZnVuY3Rpb24gcmVzb2x2ZXIuIFRoZSByZWFsXG4gICAgICAgIC8vIHJ1bnRpbWUgdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gbWF5IGJlIGRpZmZlcmVudCB0aGFuIHRoZSBmb3JlaWduIGZ1bmN0aW9uXG4gICAgICAgIC8vIHJlc29sdmVkIHZhbHVlLCBzbyBtYXJrIHRoZSBSZWZlcmVuY2UgYXMgc3ludGhldGljIHRvIGF2b2lkIGl0IGJlaW5nIG1pc2ludGVycHJldGVkLlxuICAgICAgICByZXMuc3ludGhldGljID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgY29uc3QgYm9keSA9IGZuLmJvZHk7XG4gICAgaWYgKGJvZHkubGVuZ3RoICE9PSAxIHx8ICF0cy5pc1JldHVyblN0YXRlbWVudChib2R5WzBdKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gYm9keVswXSBhcyB0cy5SZXR1cm5TdGF0ZW1lbnQ7XG5cbiAgICBjb25zdCBhcmdzID0gdGhpcy5ldmFsdWF0ZUZ1bmN0aW9uQXJndW1lbnRzKG5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnN0IG5ld1Njb3BlOiBTY29wZSA9IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgY29uc3QgY2FsbGVlQ29udGV4dCA9IHsuLi5jb250ZXh0LCBzY29wZTogbmV3U2NvcGV9O1xuICAgIGZuLnBhcmFtZXRlcnMuZm9yRWFjaCgocGFyYW0sIGluZGV4KSA9PiB7XG4gICAgICBsZXQgYXJnID0gYXJnc1tpbmRleF07XG4gICAgICBpZiAocGFyYW0ubm9kZS5kb3REb3REb3RUb2tlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFyZyA9IGFyZ3Muc2xpY2UoaW5kZXgpO1xuICAgICAgfVxuICAgICAgaWYgKGFyZyA9PT0gdW5kZWZpbmVkICYmIHBhcmFtLmluaXRpYWxpemVyICE9PSBudWxsKSB7XG4gICAgICAgIGFyZyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHBhcmFtLmluaXRpYWxpemVyLCBjYWxsZWVDb250ZXh0KTtcbiAgICAgIH1cbiAgICAgIG5ld1Njb3BlLnNldChwYXJhbS5ub2RlLCBhcmcpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldC5leHByZXNzaW9uICE9PSB1bmRlZmluZWQgPyB0aGlzLnZpc2l0RXhwcmVzc2lvbihyZXQuZXhwcmVzc2lvbiwgY2FsbGVlQ29udGV4dCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlOiB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgY29uZGl0aW9uID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5jb25kaXRpb24sIGNvbnRleHQpO1xuICAgIGlmIChjb25kaXRpb24gaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBjb25kaXRpb24pO1xuICAgIH1cblxuICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5UcnVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUud2hlbkZhbHNlLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGU6IHRzLlByZWZpeFVuYXJ5RXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBvcGVyYXRvcktpbmQgPSBub2RlLm9wZXJhdG9yO1xuICAgIGlmICghVU5BUllfT1BFUkFUT1JTLmhhcyhvcGVyYXRvcktpbmQpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21VbnN1cHBvcnRlZFN5bnRheChub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcCA9IFVOQVJZX09QRVJBVE9SUy5nZXQob3BlcmF0b3JLaW5kKSE7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLm9wZXJhbmQsIGNvbnRleHQpO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdG9rZW5LaW5kID0gbm9kZS5vcGVyYXRvclRva2VuLmtpbmQ7XG4gICAgaWYgKCFCSU5BUllfT1BFUkFUT1JTLmhhcyh0b2tlbktpbmQpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21VbnN1cHBvcnRlZFN5bnRheChub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcFJlY29yZCA9IEJJTkFSWV9PUEVSQVRPUlMuZ2V0KHRva2VuS2luZCkhO1xuICAgIGxldCBsaHM6IFJlc29sdmVkVmFsdWUsIHJoczogUmVzb2x2ZWRWYWx1ZTtcbiAgICBpZiAob3BSZWNvcmQubGl0ZXJhbCkge1xuICAgICAgbGhzID0gbGl0ZXJhbChcbiAgICAgICAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnRleHQpLFxuICAgICAgICAgIHZhbHVlID0+IER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUubGVmdCwgdmFsdWUpKTtcbiAgICAgIHJocyA9IGxpdGVyYWwoXG4gICAgICAgICAgdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5yaWdodCwgY29udGV4dCksXG4gICAgICAgICAgdmFsdWUgPT4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5yaWdodCwgdmFsdWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5sZWZ0LCBjb250ZXh0KTtcbiAgICAgIHJocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUucmlnaHQsIGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9IGVsc2UgaWYgKHJocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHJocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcFJlY29yZC5vcChsaHMsIHJocyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGU6IHRzLlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBldmFsdWF0ZUZ1bmN0aW9uQXJndW1lbnRzKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZUFycmF5IHtcbiAgICBjb25zdCBhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGFyZyBvZiBub2RlLmFyZ3VtZW50cykge1xuICAgICAgaWYgKHRzLmlzU3ByZWFkRWxlbWVudChhcmcpKSB7XG4gICAgICAgIGFyZ3MucHVzaCguLi50aGlzLnZpc2l0U3ByZWFkRWxlbWVudChhcmcsIGNvbnRleHQpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3MucHVzaCh0aGlzLnZpc2l0RXhwcmVzc2lvbihhcmcsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U3ByZWFkRWxlbWVudChub2RlOiB0cy5TcHJlYWRFbGVtZW50LCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZUFycmF5IHtcbiAgICBjb25zdCBzcHJlYWQgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIGlmIChzcHJlYWQgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBbRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgc3ByZWFkKV07XG4gICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzcHJlYWQpKSB7XG4gICAgICByZXR1cm4gW0R5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUsIHNwcmVhZCldO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3ByZWFkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobm9kZTogdHMuUHJvcGVydHlOYW1lLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29tcHV0ZWRQcm9wZXJ0eU5hbWUobm9kZSkpIHtcbiAgICAgIGNvbnN0IGxpdGVyYWwgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsaXRlcmFsID09PSAnc3RyaW5nJyA/IGxpdGVyYWwgOiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZXNvbHZlZEVudW0obm9kZTogdHMuRGVjbGFyYXRpb24sIGVudW1NZW1iZXJzOiBFbnVtTWVtYmVyW10sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgZW51bU1lbWJlcnMuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobWVtYmVyLm5hbWUsIGNvbnRleHQpO1xuICAgICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMudmlzaXQobWVtYmVyLmluaXRpYWxpemVyLCBjb250ZXh0KTtcbiAgICAgICAgbWFwLnNldChuYW1lLCBuZXcgRW51bVZhbHVlKGVudW1SZWYsIG5hbWUsIHJlc29sdmVkKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVmZXJlbmNlPFQgZXh0ZW5kcyB0cy5EZWNsYXJhdGlvbj4obm9kZTogVCwgY29udGV4dDogQ29udGV4dCk6IFJlZmVyZW5jZTxUPiB7XG4gICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSwgb3duaW5nTW9kdWxlKGNvbnRleHQpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uT3JNZXRob2RSZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4pOlxuICAgIHJlZiBpcyBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+IHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihyZWYubm9kZSkgfHxcbiAgICAgIHRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKHJlZi5ub2RlKTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbChcbiAgICB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSwgcmVqZWN0OiAodmFsdWU6IFJlc29sdmVkVmFsdWUpID0+IFJlc29sdmVkVmFsdWUpOiBSZXNvbHZlZFZhbHVlIHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgfVxuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHJldHVybiByZWplY3QodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmIChub2RlLnBhcmVudCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KG5vZGUucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBkZWNsTGlzdCA9IG5vZGUucGFyZW50O1xuICBpZiAoZGVjbExpc3QucGFyZW50ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoZGVjbExpc3QucGFyZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCB2YXJTdG10ID0gZGVjbExpc3QucGFyZW50O1xuICByZXR1cm4gdmFyU3RtdC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdmFyU3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRGVjbGFyZUtleXdvcmQpO1xufVxuXG5jb25zdCBFTVBUWSA9IHt9O1xuXG5mdW5jdGlvbiBqb2luTW9kdWxlQ29udGV4dChleGlzdGluZzogQ29udGV4dCwgbm9kZTogdHMuTm9kZSwgZGVjbDogRGVjbGFyYXRpb24pOiB7XG4gIGFic29sdXRlTW9kdWxlTmFtZT86IHN0cmluZyxcbiAgcmVzb2x1dGlvbkNvbnRleHQ/OiBzdHJpbmcsXG59IHtcbiAgaWYgKGRlY2wudmlhTW9kdWxlICE9PSBudWxsICYmIGRlY2wudmlhTW9kdWxlICE9PSBleGlzdGluZy5hYnNvbHV0ZU1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBkZWNsLnZpYU1vZHVsZSxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBFTVBUWTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvd25pbmdNb2R1bGUoY29udGV4dDogQ29udGV4dCwgb3ZlcnJpZGU6IE93bmluZ01vZHVsZXxudWxsID0gbnVsbCk6IE93bmluZ01vZHVsZXxudWxsIHtcbiAgbGV0IHNwZWNpZmllciA9IGNvbnRleHQuYWJzb2x1dGVNb2R1bGVOYW1lO1xuICBpZiAob3ZlcnJpZGUgIT09IG51bGwpIHtcbiAgICBzcGVjaWZpZXIgPSBvdmVycmlkZS5zcGVjaWZpZXI7XG4gIH1cbiAgaWYgKHNwZWNpZmllciAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7XG4gICAgICBzcGVjaWZpZXIsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogY29udGV4dC5yZXNvbHV0aW9uQ29udGV4dCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIHR5cGUgZ3VhcmQgdG8gd29ya2Fyb3VuZCBhIG5hcnJvd2luZyBsaW1pdGF0aW9uIGluIGczLCB3aGVyZSB0ZXN0aW5nIGZvclxuICogYGRlY2wubm9kZSAhPT0gbnVsbGAgd291bGQgbm90IG5hcnJvdyBgZGVjbGAgdG8gYmUgb2YgdHlwZSBgQ29uY3JldGVEZWNsYXJhdGlvbmAuXG4gKi9cbmZ1bmN0aW9uIGlzQ29uY3JldGVEZWNsYXJhdGlvbihkZWNsOiBEZWNsYXJhdGlvbik6IGRlY2wgaXMgQ29uY3JldGVEZWNsYXJhdGlvbiB7XG4gIHJldHVybiBkZWNsLm5vZGUgIT09IG51bGw7XG59XG4iXX0=