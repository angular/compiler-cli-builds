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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
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
        function StaticInterpreter(host, checker, visitedFilesCb) {
            this.host = host;
            this.checker = checker;
            this.visitedFilesCb = visitedFilesCb;
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
                return dynamic_1.DynamicValue.fromUnknownExpressionType(node);
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
                    var spread = this.visitExpression(element.expression, context);
                    if (spread instanceof dynamic_1.DynamicValue) {
                        array.push(dynamic_1.DynamicValue.fromDynamicInput(element.expression, spread));
                    }
                    else if (!Array.isArray(spread)) {
                        throw new Error("Unexpected value in spread expression: " + spread);
                    }
                    else {
                        array.push.apply(array, tslib_1.__spread(spread));
                    }
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
                        throw new Error("Unexpected value in spread assignment: " + spread);
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
                return dynamic_1.DynamicValue.fromUnknownIdentifier(node);
            }
            var result = this.visitDeclaration(decl.node, tslib_1.__assign({}, context, joinModuleContext(context, node, decl)));
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
            if (this.visitedFilesCb) {
                this.visitedFilesCb(node.getSourceFile());
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
            if (node.argumentExpression === undefined) {
                throw new Error("Expected argument in ElementAccessExpression");
            }
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            var rhs = this.visitExpression(node.argumentExpression, context);
            if (rhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, rhs);
            }
            if (typeof rhs !== 'string' && typeof rhs !== 'number') {
                throw new Error("ElementAccessExpression index should be string or number, got " + typeof rhs + ": " + rhs);
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
                var value = _this.visitDeclaration(decl.node, tslib_1.__assign({}, context, joinModuleContext(context, node, decl)));
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
                    throw new Error("Invalid map access: [" + Array.from(lhs.keys()) + "] dot " + rhs);
                }
            }
            else if (Array.isArray(lhs)) {
                if (rhs === 'length') {
                    return lhs.length;
                }
                else if (rhs === 'slice') {
                    return new builtin_1.ArraySliceBuiltinFn(node, lhs);
                }
                if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
                    return dynamic_1.DynamicValue.fromUnknown(node);
                }
                if (rhs < 0 || rhs >= lhs.length) {
                    throw new Error("Index out of bounds: " + rhs + " vs " + lhs.length);
                }
                return lhs[rhs];
            }
            else if (lhs instanceof imports_1.Reference) {
                var ref = lhs.node;
                if (this.host.isClass(ref)) {
                    var module = owningModule(context, lhs.bestGuessOwningModule);
                    var value = undefined;
                    var member = this.host.getMembersOfClass(ref).find(function (member) { return member.isStatic && member.name === strIndex; });
                    if (member !== undefined) {
                        if (member.value !== null) {
                            value = this.visitExpression(member.value, context);
                        }
                        else if (member.implementation !== null) {
                            value = new imports_1.Reference(member.implementation, module);
                        }
                        else if (member.node) {
                            value = new imports_1.Reference(member.node, module);
                        }
                    }
                    return value;
                }
            }
            else if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            else {
                throw new Error("Invalid dot property access: " + lhs + " dot " + rhs);
            }
        };
        StaticInterpreter.prototype.visitCallExpression = function (node, context) {
            var _this = this;
            var lhs = this.visitExpression(node.expression, context);
            if (lhs instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, lhs);
            }
            // If the call refers to a builtin function, attempt to evaluate the function.
            if (lhs instanceof result_1.BuiltinFn) {
                return lhs.evaluate(node.arguments.map(function (arg) { return _this.visitExpression(arg, context); }));
            }
            if (!(lhs instanceof imports_1.Reference)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            else if (!isFunctionOrMethodReference(lhs)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node.expression, lhs);
            }
            var fn = this.host.getDefinitionOfFunction(lhs.node);
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
                    context = tslib_1.__assign({}, context, { absoluteModuleName: lhs.bestGuessOwningModule.specifier, resolutionContext: node.getSourceFile().fileName });
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
                throw new Error('Function body must have a single return statement only.');
            }
            var ret = body[0];
            var newScope = new Map();
            fn.parameters.forEach(function (param, index) {
                var value = undefined;
                if (index < node.arguments.length) {
                    var arg = node.arguments[index];
                    value = _this.visitExpression(arg, context);
                }
                if (value === undefined && param.initializer !== null) {
                    value = _this.visitExpression(param.initializer, context);
                }
                newScope.set(param.node, value);
            });
            return ret.expression !== undefined ?
                this.visitExpression(ret.expression, tslib_1.__assign({}, context, { scope: newScope })) :
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
                throw new Error("Unsupported prefix unary operator: " + ts.SyntaxKind[operatorKind]);
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
                throw new Error("Unsupported binary operator: " + ts.SyntaxKind[tokenKind]);
            }
            var opRecord = BINARY_OPERATORS.get(tokenKind);
            var lhs, rhs;
            if (opRecord.literal) {
                lhs = literal(this.visitExpression(node.left, context));
                rhs = literal(this.visitExpression(node.right, context));
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
    function literal(value) {
        if (value instanceof dynamic_1.DynamicValue || value === null || value === undefined ||
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        throw new Error("Value " + value + " is not literal and cannot be used in this context.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUVBQXdDO0lBSXhDLHlGQUE4QztJQUM5Qyx5RkFBdUM7SUFFdkMsdUZBQW1HO0lBY25HLFNBQVMsZUFBZSxDQUFDLEVBQTJCO1FBQ2xELE9BQU8sRUFBQyxFQUFFLElBQUEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBMkI7UUFDcEQsT0FBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBbUM7UUFDakUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEdBQUcsQ0FBQyxFQUFMLENBQUssQ0FBQyxDQUFDO1FBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxlQUFlLENB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QUcsSUFBSSxPQUFBLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQXpDLENBQXlDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBRWpCLFNBQVMsaUJBQWlCLENBQUMsUUFBaUIsRUFBRSxJQUFhLEVBQUUsSUFBaUI7UUFJNUUsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRTtZQUM3RSxPQUFPO2dCQUNMLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUNsQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTthQUNqRCxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsT0FBZ0IsRUFBRSxRQUFvQztRQUFwQyx5QkFBQSxFQUFBLGVBQW9DO1FBQzFFLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUMzQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDckIsU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUM7U0FDaEM7UUFDRCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7WUFDdEIsT0FBTztnQkFDTCxTQUFTLFdBQUE7Z0JBQ1QsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQjthQUM3QyxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtPd25pbmdNb2R1bGV9IGZyb20gJy4uLy4uL2ltcG9ydHMvc3JjL3JlZmVyZW5jZXMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge0FycmF5U2xpY2VCdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7Rm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIFZpc2l0ZWRGaWxlc0NhbGxiYWNrfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge0J1aWx0aW5GbiwgRW51bVZhbHVlLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4vcmVzdWx0JztcblxuXG4vKipcbiAqIFRyYWNrcyB0aGUgc2NvcGUgb2YgYSBmdW5jdGlvbiBib2R5LCB3aGljaCBpbmNsdWRlcyBgUmVzb2x2ZWRWYWx1ZWBzIGZvciB0aGUgcGFyYW1ldGVycyBvZiB0aGF0XG4gKiBib2R5LlxuICovXG50eXBlIFNjb3BlID0gTWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBSZXNvbHZlZFZhbHVlPjtcblxuaW50ZXJmYWNlIEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgbGl0ZXJhbDogYm9vbGVhbjtcbiAgb3A6IChhOiBhbnksIGI6IGFueSkgPT4gUmVzb2x2ZWRWYWx1ZTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbEJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogdHJ1ZX07XG59XG5cbmZ1bmN0aW9uIHJlZmVyZW5jZUJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogZmFsc2V9O1xufVxuXG5jb25zdCBCSU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCBCaW5hcnlPcGVyYXRvckRlZj4oW1xuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSArIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTWludXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC0gYildLFxuICBbdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgKiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAvIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkJhclRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgfCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkNhcmV0VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSBeIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDwgYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhbkVxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPD0gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+PiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBNYXRoLnBvdyhhLCBiKSldLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgJiYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgfHwgYildXG5dKTtcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCAoYTogYW55KSA9PiBhbnk+KFtcbiAgW3RzLlN5bnRheEtpbmQuVGlsZGVUb2tlbiwgYSA9PiB+YV0sIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGEgPT4gLWFdLFxuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGEgPT4gK2FdLCBbdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhID0+ICFhXVxuXSk7XG5cbmludGVyZmFjZSBDb250ZXh0IHtcbiAgLyoqXG4gICAqIFRoZSBtb2R1bGUgbmFtZSAoaWYgYW55KSB3aGljaCB3YXMgdXNlZCB0byByZWFjaCB0aGUgY3VycmVudGx5IHJlc29sdmluZyBzeW1ib2xzLlxuICAgKi9cbiAgYWJzb2x1dGVNb2R1bGVOYW1lOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogQSBmaWxlIG5hbWUgcmVwcmVzZW50aW5nIHRoZSBjb250ZXh0IGluIHdoaWNoIHRoZSBjdXJyZW50IGBhYnNvbHV0ZU1vZHVsZU5hbWVgLCBpZiBhbnksIHdhc1xuICAgKiByZXNvbHZlZC5cbiAgICovXG4gIHJlc29sdXRpb25Db250ZXh0OiBzdHJpbmc7XG4gIHNjb3BlOiBTY29wZTtcbiAgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXI/OiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcjtcbn1cblxuZXhwb3J0IGNsYXNzIFN0YXRpY0ludGVycHJldGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSB2aXNpdGVkRmlsZXNDYj86IFZpc2l0ZWRGaWxlc0NhbGxiYWNrKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHRzLkV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgbGV0IHJlc3VsdDogUmVzb2x2ZWRWYWx1ZTtcbiAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc1RlbXBsYXRlRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdFRlbXBsYXRlRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTnVtZXJpY0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KG5vZGUudGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRJZGVudGlmaWVyKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0Q2FsbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdENvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0UGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLnZpc2l0RWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTm9uTnVsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJlc3VsdCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgcmVzdWx0ID0gdGhpcy52aXNpdERlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duRXhwcmVzc2lvblR5cGUobm9kZSk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgJiYgcmVzdWx0Lm5vZGUgIT09IG5vZGUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByZXN1bHQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBhcnJheTogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gbm9kZS5lbGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgY29uc3Qgc3ByZWFkID0gdGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudC5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICAgIGFycmF5LnB1c2goRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoZWxlbWVudC5leHByZXNzaW9uLCBzcHJlYWQpKTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzcHJlYWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGluIHNwcmVhZCBleHByZXNzaW9uOiAke3NwcmVhZH1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhcnJheS5wdXNoKC4uLnNwcmVhZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5LnB1c2godGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudCwgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbWFwOiBSZXNvbHZlZFZhbHVlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5zdHJpbmdOYW1lRnJvbVByb3BlcnR5TmFtZShwcm9wZXJ0eS5uYW1lLCBjb250ZXh0KTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLnNldChuYW1lLCB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplciwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWFwLnNldChwcm9wZXJ0eS5uYW1lLnRleHQsIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihwcm9wZXJ0eSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCB0aGlzLnZpc2l0RGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cy5pc1NwcmVhZEFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIShzcHJlYWQgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGluIHNwcmVhZCBhc3NpZ25tZW50OiAke3NwcmVhZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBzcHJlYWQuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4gbWFwLnNldChrZXksIHZhbHVlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFRlbXBsYXRlRXhwcmVzc2lvbihub2RlOiB0cy5UZW1wbGF0ZUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBwaWVjZXM6IHN0cmluZ1tdID0gW25vZGUuaGVhZC50ZXh0XTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUudGVtcGxhdGVTcGFucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc3BhbiA9IG5vZGUudGVtcGxhdGVTcGFuc1tpXTtcbiAgICAgIGxldCB2YWx1ZSA9IHRoaXMudmlzaXQoc3Bhbi5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlc29sdmVkO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgIHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcGllY2VzLnB1c2goYCR7dmFsdWV9YCk7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljU3RyaW5nKHNwYW4uZXhwcmVzc2lvbikpO1xuICAgICAgfVxuICAgICAgcGllY2VzLnB1c2goc3Bhbi5saXRlcmFsLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gcGllY2VzLmpvaW4oJycpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdElkZW50aWZpZXIobm9kZTogdHMuSWRlbnRpZmllciwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2wgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIobm9kZSk7XG4gICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGUpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPVxuICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCB7Li4uY29udGV4dCwgLi4uam9pbk1vZHVsZUNvbnRleHQoY29udGV4dCwgbm9kZSwgZGVjbCl9KTtcbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICAvLyBPbmx5IHJlY29yZCBpZGVudGlmaWVycyB0byBub24tc3ludGhldGljIHJlZmVyZW5jZXMuIFN5bnRoZXRpYyByZWZlcmVuY2VzIG1heSBub3QgaGF2ZSB0aGVcbiAgICAgIC8vIHNhbWUgdmFsdWUgYXQgcnVudGltZSBhcyB0aGV5IGRvIGF0IGNvbXBpbGUgdGltZSwgc28gaXQncyBub3QgbGVnYWwgdG8gcmVmZXIgdG8gdGhlbSBieSB0aGVcbiAgICAgIC8vIGlkZW50aWZpZXIgaGVyZS5cbiAgICAgIGlmICghcmVzdWx0LnN5bnRoZXRpYykge1xuICAgICAgICByZXN1bHQuYWRkSWRlbnRpZmllcihub2RlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RGVjbGFyYXRpb24obm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAodGhpcy52aXNpdGVkRmlsZXNDYikge1xuICAgICAgdGhpcy52aXNpdGVkRmlsZXNDYihub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmFtZXRlcihub2RlKSAmJiBjb250ZXh0LnNjb3BlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIGNvbnRleHQuc2NvcGUuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydEFzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbnVtRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RW51bURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFNvdXJjZUZpbGUobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmhvc3QuZ2V0VmFyaWFibGVWYWx1ZShub2RlKTtcbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbih2YWx1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZTogdHMuRW51bURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpIGFzIFJlZmVyZW5jZTx0cy5FbnVtRGVjbGFyYXRpb24+O1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgbm9kZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG1lbWJlci5uYW1lLCBjb250ZXh0KTtcbiAgICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBtZW1iZXIuaW5pdGlhbGl6ZXIgJiYgdGhpcy52aXNpdChtZW1iZXIuaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgICBtYXAuc2V0KG5hbWUsIG5ldyBFbnVtVmFsdWUoZW51bVJlZiwgbmFtZSwgcmVzb2x2ZWQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJndW1lbnQgaW4gRWxlbWVudEFjY2Vzc0V4cHJlc3Npb25gKTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIGNvbnN0IHJocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAocmhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmhzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByaHMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByaHMgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIGluZGV4IHNob3VsZCBiZSBzdHJpbmcgb3IgbnVtYmVyLCBnb3QgJHt0eXBlb2YgcmhzfTogJHtyaHN9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzSGVscGVyKG5vZGUsIGxocywgcmhzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgY29uc3QgcmhzID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETzogaGFuZGxlIHJlZmVyZW5jZSB0byBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzSGVscGVyKG5vZGUsIGxocywgcmhzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRTb3VyY2VGaWxlKG5vZGU6IHRzLlNvdXJjZUZpbGUsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChkZWNsYXJhdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGRlY2xhcmF0aW9ucy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMudmlzaXREZWNsYXJhdGlvbihcbiAgICAgICAgICBkZWNsLm5vZGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAuLi5jb250ZXh0LCAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKSxcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgbWFwLnNldChuYW1lLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgYWNjZXNzSGVscGVyKFxuICAgICAgbm9kZTogdHMuRXhwcmVzc2lvbiwgbGhzOiBSZXNvbHZlZFZhbHVlLCByaHM6IHN0cmluZ3xudW1iZXIsXG4gICAgICBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgc3RySW5kZXggPSBgJHtyaHN9YDtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICBpZiAobGhzLmhhcyhzdHJJbmRleCkpIHtcbiAgICAgICAgcmV0dXJuIGxocy5nZXQoc3RySW5kZXgpICE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbWFwIGFjY2VzczogWyR7QXJyYXkuZnJvbShsaHMua2V5cygpKX1dIGRvdCAke3Joc31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobGhzKSkge1xuICAgICAgaWYgKHJocyA9PT0gJ2xlbmd0aCcpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGg7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ3NsaWNlJykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5U2xpY2VCdWlsdGluRm4obm9kZSwgbGhzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcmhzICE9PSAnbnVtYmVyJyB8fCAhTnVtYmVyLmlzSW50ZWdlcihyaHMpKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgICB9XG4gICAgICBpZiAocmhzIDwgMCB8fCByaHMgPj0gbGhzLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluZGV4IG91dCBvZiBib3VuZHM6ICR7cmhzfSB2cyAke2xocy5sZW5ndGh9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGhzW3Joc107XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGNvbnN0IHJlZiA9IGxocy5ub2RlO1xuICAgICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKHJlZikpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlID0gb3duaW5nTW9kdWxlKGNvbnRleHQsIGxocy5iZXN0R3Vlc3NPd25pbmdNb2R1bGUpO1xuICAgICAgICBsZXQgdmFsdWU6IFJlc29sdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMuaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhyZWYpLmZpbmQoXG4gICAgICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBzdHJJbmRleCk7XG4gICAgICAgIGlmIChtZW1iZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChtZW1iZXIudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24obWVtYmVyLnZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5pbXBsZW1lbnRhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVmZXJlbmNlKG1lbWJlci5pbXBsZW1lbnRhdGlvbiwgbW9kdWxlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5ub2RlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWZlcmVuY2UobWVtYmVyLm5vZGUsIG1vZHVsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkb3QgcHJvcGVydHkgYWNjZXNzOiAke2xoc30gZG90ICR7cmhzfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRDYWxsRXhwcmVzc2lvbihub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGNhbGwgcmVmZXJzIHRvIGEgYnVpbHRpbiBmdW5jdGlvbiwgYXR0ZW1wdCB0byBldmFsdWF0ZSB0aGUgZnVuY3Rpb24uXG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIEJ1aWx0aW5Gbikge1xuICAgICAgcmV0dXJuIGxocy5ldmFsdWF0ZShub2RlLmFyZ3VtZW50cy5tYXAoYXJnID0+IHRoaXMudmlzaXRFeHByZXNzaW9uKGFyZywgY29udGV4dCkpKTtcbiAgICB9XG5cbiAgICBpZiAoIShsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH0gZWxzZSBpZiAoIWlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShsaHMpKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZS5leHByZXNzaW9uLCBsaHMpO1xuICAgIH1cblxuICAgIGNvbnN0IGZuID0gdGhpcy5ob3N0LmdldERlZmluaXRpb25PZkZ1bmN0aW9uKGxocy5ub2RlKTtcblxuICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBmb3JlaWduIChkZWNsYXJlZCB0aHJvdWdoIGEgZC50cyBmaWxlKSwgYXR0ZW1wdCB0byByZXNvbHZlIGl0IHdpdGggdGhlXG4gICAgLy8gZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgaWYgKGZuLmJvZHkgPT09IG51bGwpIHtcbiAgICAgIGxldCBleHByOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgICAgaWYgKGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIpIHtcbiAgICAgICAgZXhwciA9IGNvbnRleHQuZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIobGhzLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgICBpZiAoZXhwciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoXG4gICAgICAgICAgICBub2RlLCBEeW5hbWljVmFsdWUuZnJvbUV4dGVybmFsUmVmZXJlbmNlKG5vZGUuZXhwcmVzc2lvbiwgbGhzKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBmdW5jdGlvbiBpcyBkZWNsYXJlZCBpbiBhIGRpZmZlcmVudCBmaWxlLCByZXNvbHZlIHRoZSBmb3JlaWduIGZ1bmN0aW9uIGV4cHJlc3Npb25cbiAgICAgIC8vIHVzaW5nIHRoZSBhYnNvbHV0ZSBtb2R1bGUgbmFtZSBvZiB0aGF0IGZpbGUgKGlmIGFueSkuXG4gICAgICBpZiAobGhzLmJlc3RHdWVzc093bmluZ01vZHVsZSAhPT0gbnVsbCkge1xuICAgICAgICBjb250ZXh0ID0ge1xuICAgICAgICAgIC4uLmNvbnRleHQsXG4gICAgICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBsaHMuYmVzdEd1ZXNzT3duaW5nTW9kdWxlLnNwZWNpZmllcixcbiAgICAgICAgICByZXNvbHV0aW9uQ29udGV4dDogbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpO1xuICAgICAgaWYgKHJlcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICAvLyBUaGlzIFJlZmVyZW5jZSB3YXMgY3JlYXRlZCBzeW50aGV0aWNhbGx5LCB2aWEgYSBmb3JlaWduIGZ1bmN0aW9uIHJlc29sdmVyLiBUaGUgcmVhbFxuICAgICAgICAvLyBydW50aW1lIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIG1heSBiZSBkaWZmZXJlbnQgdGhhbiB0aGUgZm9yZWlnbiBmdW5jdGlvblxuICAgICAgICAvLyByZXNvbHZlZCB2YWx1ZSwgc28gbWFyayB0aGUgUmVmZXJlbmNlIGFzIHN5bnRoZXRpYyB0byBhdm9pZCBpdCBiZWluZyBtaXNpbnRlcnByZXRlZC5cbiAgICAgICAgcmVzLnN5bnRoZXRpYyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBmbi5ib2R5O1xuICAgIGlmIChib2R5Lmxlbmd0aCAhPT0gMSB8fCAhdHMuaXNSZXR1cm5TdGF0ZW1lbnQoYm9keVswXSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRnVuY3Rpb24gYm9keSBtdXN0IGhhdmUgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudCBvbmx5LicpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBib2R5WzBdIGFzIHRzLlJldHVyblN0YXRlbWVudDtcblxuICAgIGNvbnN0IG5ld1Njb3BlOiBTY29wZSA9IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm4ucGFyYW1ldGVycy5mb3JFYWNoKChwYXJhbSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpbmRleCA8IG5vZGUuYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhcmcgPSBub2RlLmFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24oYXJnLCBjb250ZXh0KTtcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIHBhcmFtLmluaXRpYWxpemVyICE9PSBudWxsKSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24ocGFyYW0uaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgfVxuICAgICAgbmV3U2NvcGUuc2V0KHBhcmFtLm5vZGUsIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQuZXhwcmVzc2lvbiAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgdGhpcy52aXNpdEV4cHJlc3Npb24ocmV0LmV4cHJlc3Npb24sIHsuLi5jb250ZXh0LCBzY29wZTogbmV3U2NvcGV9KSA6XG4gICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuY29uZGl0aW9uLCBjb250ZXh0KTtcbiAgICBpZiAoY29uZGl0aW9uIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgY29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5GYWxzZSwgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgb3BlcmF0b3JLaW5kID0gbm9kZS5vcGVyYXRvcjtcbiAgICBpZiAoIVVOQVJZX09QRVJBVE9SUy5oYXMob3BlcmF0b3JLaW5kKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcmVmaXggdW5hcnkgb3BlcmF0b3I6ICR7dHMuU3ludGF4S2luZFtvcGVyYXRvcktpbmRdfWApO1xuICAgIH1cblxuICAgIGNvbnN0IG9wID0gVU5BUllfT1BFUkFUT1JTLmdldChvcGVyYXRvcktpbmQpICE7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLm9wZXJhbmQsIGNvbnRleHQpO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdG9rZW5LaW5kID0gbm9kZS5vcGVyYXRvclRva2VuLmtpbmQ7XG4gICAgaWYgKCFCSU5BUllfT1BFUkFUT1JTLmhhcyh0b2tlbktpbmQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGJpbmFyeSBvcGVyYXRvcjogJHt0cy5TeW50YXhLaW5kW3Rva2VuS2luZF19YCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BSZWNvcmQgPSBCSU5BUllfT1BFUkFUT1JTLmdldCh0b2tlbktpbmQpICE7XG4gICAgbGV0IGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBSZXNvbHZlZFZhbHVlO1xuICAgIGlmIChvcFJlY29yZC5saXRlcmFsKSB7XG4gICAgICBsaHMgPSBsaXRlcmFsKHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCkpO1xuICAgICAgcmhzID0gbGl0ZXJhbCh0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCk7XG4gICAgICByaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfSBlbHNlIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3BSZWNvcmQub3AobGhzLCByaHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlOiB0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobm9kZTogdHMuUHJvcGVydHlOYW1lLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgeyAgLy8gdHMuQ29tcHV0ZWRQcm9wZXJ0eU5hbWVcbiAgICAgIGNvbnN0IGxpdGVyYWwgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsaXRlcmFsID09PSAnc3RyaW5nJyA/IGxpdGVyYWwgOiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2Uobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZWZlcmVuY2Uge1xuICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKG5vZGUsIG93bmluZ01vZHVsZShjb250ZXh0KSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbk9yTWV0aG9kUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+KTpcbiAgICByZWYgaXMgUmVmZXJlbmNlPHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uPiB7XG4gIHJldHVybiB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8IHRzLmlzTWV0aG9kRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8XG4gICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihyZWYubm9kZSk7XG59XG5cbmZ1bmN0aW9uIGxpdGVyYWwodmFsdWU6IFJlc29sdmVkVmFsdWUpOiBhbnkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgVmFsdWUgJHt2YWx1ZX0gaXMgbm90IGxpdGVyYWwgYW5kIGNhbm5vdCBiZSB1c2VkIGluIHRoaXMgY29udGV4dC5gKTtcbn1cblxuZnVuY3Rpb24gaXNWYXJpYWJsZURlY2xhcmF0aW9uRGVjbGFyZWQobm9kZTogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAobm9kZS5wYXJlbnQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChub2RlLnBhcmVudCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgZGVjbExpc3QgPSBub2RlLnBhcmVudDtcbiAgaWYgKGRlY2xMaXN0LnBhcmVudCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KGRlY2xMaXN0LnBhcmVudCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgdmFyU3RtdCA9IGRlY2xMaXN0LnBhcmVudDtcbiAgcmV0dXJuIHZhclN0bXQubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHZhclN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkRlY2xhcmVLZXl3b3JkKTtcbn1cblxuY29uc3QgRU1QVFkgPSB7fTtcblxuZnVuY3Rpb24gam9pbk1vZHVsZUNvbnRleHQoZXhpc3Rpbmc6IENvbnRleHQsIG5vZGU6IHRzLk5vZGUsIGRlY2w6IERlY2xhcmF0aW9uKToge1xuICBhYnNvbHV0ZU1vZHVsZU5hbWU/OiBzdHJpbmcsXG4gIHJlc29sdXRpb25Db250ZXh0Pzogc3RyaW5nLFxufSB7XG4gIGlmIChkZWNsLnZpYU1vZHVsZSAhPT0gbnVsbCAmJiBkZWNsLnZpYU1vZHVsZSAhPT0gZXhpc3RpbmcuYWJzb2x1dGVNb2R1bGVOYW1lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFic29sdXRlTW9kdWxlTmFtZTogZGVjbC52aWFNb2R1bGUsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gRU1QVFk7XG4gIH1cbn1cblxuZnVuY3Rpb24gb3duaW5nTW9kdWxlKGNvbnRleHQ6IENvbnRleHQsIG92ZXJyaWRlOiBPd25pbmdNb2R1bGUgfCBudWxsID0gbnVsbCk6IE93bmluZ01vZHVsZXxudWxsIHtcbiAgbGV0IHNwZWNpZmllciA9IGNvbnRleHQuYWJzb2x1dGVNb2R1bGVOYW1lO1xuICBpZiAob3ZlcnJpZGUgIT09IG51bGwpIHtcbiAgICBzcGVjaWZpZXIgPSBvdmVycmlkZS5zcGVjaWZpZXI7XG4gIH1cbiAgaWYgKHNwZWNpZmllciAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7XG4gICAgICBzcGVjaWZpZXIsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogY29udGV4dC5yZXNvbHV0aW9uQ29udGV4dCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=