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
        function StaticInterpreter(host, checker, refResolver) {
            this.host = host;
            this.checker = checker;
            this.refResolver = refResolver;
        }
        StaticInterpreter.prototype.visit = function (node, context) {
            return this.visitExpression(node, context);
        };
        StaticInterpreter.prototype.visitExpression = function (node, context) {
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
                return this.visitTemplateExpression(node, context);
            }
            else if (ts.isNumericLiteral(node)) {
                return parseFloat(node.text);
            }
            else if (ts.isObjectLiteralExpression(node)) {
                return this.visitObjectLiteralExpression(node, context);
            }
            else if (ts.isIdentifier(node)) {
                return this.visitIdentifier(node, context);
            }
            else if (ts.isPropertyAccessExpression(node)) {
                return this.visitPropertyAccessExpression(node, context);
            }
            else if (ts.isCallExpression(node)) {
                return this.visitCallExpression(node, context);
            }
            else if (ts.isConditionalExpression(node)) {
                return this.visitConditionalExpression(node, context);
            }
            else if (ts.isPrefixUnaryExpression(node)) {
                return this.visitPrefixUnaryExpression(node, context);
            }
            else if (ts.isBinaryExpression(node)) {
                return this.visitBinaryExpression(node, context);
            }
            else if (ts.isArrayLiteralExpression(node)) {
                return this.visitArrayLiteralExpression(node, context);
            }
            else if (ts.isParenthesizedExpression(node)) {
                return this.visitParenthesizedExpression(node, context);
            }
            else if (ts.isElementAccessExpression(node)) {
                return this.visitElementAccessExpression(node, context);
            }
            else if (ts.isAsExpression(node)) {
                return this.visitExpression(node.expression, context);
            }
            else if (ts.isNonNullExpression(node)) {
                return this.visitExpression(node.expression, context);
            }
            else if (this.host.isClass(node)) {
                return this.visitDeclaration(node, context);
            }
            else {
                return dynamic_1.DynamicValue.fromUnknownExpressionType(node);
            }
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
                result.addIdentifier(node);
            }
            return result;
        };
        StaticInterpreter.prototype.visitDeclaration = function (node, context) {
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
                    var absoluteModuleName = context.absoluteModuleName;
                    if (lhs instanceof imports_1.NodeReference || lhs instanceof imports_1.AbsoluteReference) {
                        absoluteModuleName = lhs.moduleName || absoluteModuleName;
                    }
                    var value = undefined;
                    var member = this.host.getMembersOfClass(ref).find(function (member) { return member.isStatic && member.name === strIndex; });
                    if (member !== undefined) {
                        if (member.value !== null) {
                            value = this.visitExpression(member.value, context);
                        }
                        else if (member.implementation !== null) {
                            value = new imports_1.NodeReference(member.implementation, absoluteModuleName);
                        }
                        else if (member.node) {
                            value = new imports_1.NodeReference(member.node, absoluteModuleName);
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
                throw new Error("attempting to call something that is not a function: " + lhs);
            }
            else if (!isFunctionOrMethodReference(lhs)) {
                throw new Error("calling something that is not a function declaration? " + ts.SyntaxKind[lhs.node.kind] + " (" + node.getText() + ")");
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
                if ((lhs instanceof imports_1.NodeReference || lhs instanceof imports_1.AbsoluteReference) &&
                    lhs.moduleName !== null) {
                    context = tslib_1.__assign({}, context, { absoluteModuleName: lhs.moduleName, resolutionContext: node.getSourceFile().fileName });
                }
                return this.visitExpression(expr, context);
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
            return this.refResolver.resolve(node, context.absoluteModuleName, context.resolutionContext);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJwcmV0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL3NyYy9pbnRlcnByZXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUVBQWdIO0lBR2hILHlGQUE4QztJQUM5Qyx5RkFBdUM7SUFFdkMsdUZBQW1HO0lBY25HLFNBQVMsZUFBZSxDQUFDLEVBQTJCO1FBQ2xELE9BQU8sRUFBQyxFQUFFLElBQUEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsRUFBMkI7UUFDcEQsT0FBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBbUM7UUFDakUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLEdBQUcsQ0FBQyxFQUFMLENBQUssQ0FBQyxDQUFDO1FBQzVELENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxDQUFDLENBQUM7UUFDL0QsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxlQUFlLENB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QUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ2hDLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQ2xDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBekMsQ0FBeUMsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFRCxJQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7SUFFakIsU0FBUyxpQkFBaUIsQ0FBQyxRQUFpQixFQUFFLElBQWEsRUFBRSxJQUFpQjtRQUk1RSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLGtCQUFrQixFQUFFO1lBQzdFLE9BQU87Z0JBQ0wsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ2xDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRO2FBQ2pELENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBOb2RlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlZmVyZW5jZVJlc29sdmVyLCBSZXNvbHZlZFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7QXJyYXlTbGljZUJ1aWx0aW5Gbn0gZnJvbSAnLi9idWlsdGluJztcbmltcG9ydCB7RHluYW1pY1ZhbHVlfSBmcm9tICcuL2R5bmFtaWMnO1xuaW1wb3J0IHtGb3JlaWduRnVuY3Rpb25SZXNvbHZlcn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHtCdWlsdGluRm4sIEVudW1WYWx1ZSwgUmVzb2x2ZWRWYWx1ZSwgUmVzb2x2ZWRWYWx1ZUFycmF5LCBSZXNvbHZlZFZhbHVlTWFwfSBmcm9tICcuL3Jlc3VsdCc7XG5cblxuLyoqXG4gKiBUcmFja3MgdGhlIHNjb3BlIG9mIGEgZnVuY3Rpb24gYm9keSwgd2hpY2ggaW5jbHVkZXMgYFJlc29sdmVkVmFsdWVgcyBmb3IgdGhlIHBhcmFtZXRlcnMgb2YgdGhhdFxuICogYm9keS5cbiAqL1xudHlwZSBTY29wZSA9IE1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgUmVzb2x2ZWRWYWx1ZT47XG5cbmludGVyZmFjZSBCaW5hcnlPcGVyYXRvckRlZiB7XG4gIGxpdGVyYWw6IGJvb2xlYW47XG4gIG9wOiAoYTogYW55LCBiOiBhbnkpID0+IFJlc29sdmVkVmFsdWU7XG59XG5cbmZ1bmN0aW9uIGxpdGVyYWxCaW5hcnlPcChvcDogKGE6IGFueSwgYjogYW55KSA9PiBhbnkpOiBCaW5hcnlPcGVyYXRvckRlZiB7XG4gIHJldHVybiB7b3AsIGxpdGVyYWw6IHRydWV9O1xufVxuXG5mdW5jdGlvbiByZWZlcmVuY2VCaW5hcnlPcChvcDogKGE6IGFueSwgYjogYW55KSA9PiBhbnkpOiBCaW5hcnlPcGVyYXRvckRlZiB7XG4gIHJldHVybiB7b3AsIGxpdGVyYWw6IGZhbHNlfTtcbn1cblxuY29uc3QgQklOQVJZX09QRVJBVE9SUyA9IG5ldyBNYXA8dHMuU3ludGF4S2luZCwgQmluYXJ5T3BlcmF0b3JEZWY+KFtcbiAgW3RzLlN5bnRheEtpbmQuUGx1c1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgKyBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAtIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICogYildLFxuICBbdHMuU3ludGF4S2luZC5TbGFzaFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgLyBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLlBlcmNlbnRUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICUgYildLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhICYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIHwgYildLFxuICBbdHMuU3ludGF4S2luZC5DYXJldFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgXiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTGVzc1RoYW5FcXVhbHNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw9IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj0gYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhbkxlc3NUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA8PCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+Pj4gYildLFxuICBbdHMuU3ludGF4S2luZC5Bc3Rlcmlza0FzdGVyaXNrVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gTWF0aC5wb3coYSwgYikpXSxcbiAgW3RzLlN5bnRheEtpbmQuQW1wZXJzYW5kQW1wZXJzYW5kVG9rZW4sIHJlZmVyZW5jZUJpbmFyeU9wKChhLCBiKSA9PiBhICYmIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4sIHJlZmVyZW5jZUJpbmFyeU9wKChhLCBiKSA9PiBhIHx8IGIpXVxuXSk7XG5cbmNvbnN0IFVOQVJZX09QRVJBVE9SUyA9IG5ldyBNYXA8dHMuU3ludGF4S2luZCwgKGE6IGFueSkgPT4gYW55PihbXG4gIFt0cy5TeW50YXhLaW5kLlRpbGRlVG9rZW4sIGEgPT4gfmFdLCBbdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLCBhID0+IC1hXSxcbiAgW3RzLlN5bnRheEtpbmQuUGx1c1Rva2VuLCBhID0+ICthXSwgW3RzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbiwgYSA9PiAhYV1cbl0pO1xuXG5pbnRlcmZhY2UgQ29udGV4dCB7XG4gIC8qKlxuICAgKiBUaGUgbW9kdWxlIG5hbWUgKGlmIGFueSkgd2hpY2ggd2FzIHVzZWQgdG8gcmVhY2ggdGhlIGN1cnJlbnRseSByZXNvbHZpbmcgc3ltYm9scy5cbiAgICovXG4gIGFic29sdXRlTW9kdWxlTmFtZTogc3RyaW5nfG51bGw7XG5cbiAgLyoqXG4gICAqIEEgZmlsZSBuYW1lIHJlcHJlc2VudGluZyB0aGUgY29udGV4dCBpbiB3aGljaCB0aGUgY3VycmVudCBgYWJzb2x1dGVNb2R1bGVOYW1lYCwgaWYgYW55LCB3YXNcbiAgICogcmVzb2x2ZWQuXG4gICAqL1xuICByZXNvbHV0aW9uQ29udGV4dDogc3RyaW5nO1xuICBzY29wZTogU2NvcGU7XG4gIGZvcmVpZ25GdW5jdGlvblJlc29sdmVyPzogRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBTdGF0aWNJbnRlcnByZXRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBob3N0OiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmUmVzb2x2ZXI6IFJlZmVyZW5jZVJlc29sdmVyKSB7fVxuXG4gIHZpc2l0KG5vZGU6IHRzLkV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS50ZXh0O1xuICAgIH0gZWxzZSBpZiAodHMuaXNUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0VGVtcGxhdGVFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQobm9kZS50ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0SWRlbnRpZmllcihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0Q2FsbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1ByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRQcmVmaXhVbmFyeUV4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0FzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc05vbk51bGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdERlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duRXhwcmVzc2lvblR5cGUobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBhcnJheTogUmVzb2x2ZWRWYWx1ZUFycmF5ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gbm9kZS5lbGVtZW50c1tpXTtcbiAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoZWxlbWVudCkpIHtcbiAgICAgICAgY29uc3Qgc3ByZWFkID0gdGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudC5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHNwcmVhZCBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICAgIGFycmF5LnB1c2goRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQoZWxlbWVudC5leHByZXNzaW9uLCBzcHJlYWQpKTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShzcHJlYWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGluIHNwcmVhZCBleHByZXNzaW9uOiAke3NwcmVhZH1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhcnJheS5wdXNoKC4uLnNwcmVhZCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5LnB1c2godGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudCwgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0T2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbWFwOiBSZXNvbHZlZFZhbHVlTWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLnByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzW2ldO1xuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5zdHJpbmdOYW1lRnJvbVByb3BlcnR5TmFtZShwcm9wZXJ0eS5uYW1lLCBjb250ZXh0KTtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY1N0cmluZyhwcm9wZXJ0eS5uYW1lKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLnNldChuYW1lLCB0aGlzLnZpc2l0RXhwcmVzc2lvbihwcm9wZXJ0eS5pbml0aWFsaXplciwgY29udGV4dCkpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc1Nob3J0aGFuZFByb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFNob3J0aGFuZEFzc2lnbm1lbnRWYWx1ZVN5bWJvbChwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWFwLnNldChwcm9wZXJ0eS5uYW1lLnRleHQsIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihwcm9wZXJ0eSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hcC5zZXQocHJvcGVydHkubmFtZS50ZXh0LCB0aGlzLnZpc2l0RGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cy5pc1NwcmVhZEFzc2lnbm1lbnQocHJvcGVydHkpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoc3ByZWFkIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHNwcmVhZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIShzcHJlYWQgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGluIHNwcmVhZCBhc3NpZ25tZW50OiAke3NwcmVhZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBzcHJlYWQuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4gbWFwLnNldChrZXksIHZhbHVlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFRlbXBsYXRlRXhwcmVzc2lvbihub2RlOiB0cy5UZW1wbGF0ZUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBwaWVjZXM6IHN0cmluZ1tdID0gW25vZGUuaGVhZC50ZXh0XTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUudGVtcGxhdGVTcGFucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc3BhbiA9IG5vZGUudGVtcGxhdGVTcGFuc1tpXTtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy52aXNpdChzcGFuLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgIHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcGllY2VzLnB1c2goYCR7dmFsdWV9YCk7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljU3RyaW5nKHNwYW4uZXhwcmVzc2lvbikpO1xuICAgICAgfVxuICAgICAgcGllY2VzLnB1c2goc3Bhbi5saXRlcmFsLnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gcGllY2VzLmpvaW4oJycpO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdElkZW50aWZpZXIobm9kZTogdHMuSWRlbnRpZmllciwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGRlY2wgPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIobm9kZSk7XG4gICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGUpO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPVxuICAgICAgICB0aGlzLnZpc2l0RGVjbGFyYXRpb24oZGVjbC5ub2RlLCB7Li4uY29udGV4dCwgLi4uam9pbk1vZHVsZUNvbnRleHQoY29udGV4dCwgbm9kZSwgZGVjbCl9KTtcbiAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICByZXN1bHQuYWRkSWRlbnRpZmllcihub2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXREZWNsYXJhdGlvbihub2RlOiB0cy5EZWNsYXJhdGlvbiwgY29udGV4dDogQ29udGV4dCk6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmICh0aGlzLmhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmFtZXRlcihub2RlKSAmJiBjb250ZXh0LnNjb3BlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIGNvbnRleHQuc2NvcGUuZ2V0KG5vZGUpICE7XG4gICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydEFzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbnVtRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RW51bURlY2xhcmF0aW9uKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTb3VyY2VGaWxlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFNvdXJjZUZpbGUobm9kZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlZmVyZW5jZShub2RlLCBjb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmhvc3QuZ2V0VmFyaWFibGVWYWx1ZShub2RlKTtcbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbih2YWx1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChpc1ZhcmlhYmxlRGVjbGFyYXRpb25EZWNsYXJlZChub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZTogdHMuRW51bURlY2xhcmF0aW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgZW51bVJlZiA9IHRoaXMuZ2V0UmVmZXJlbmNlKG5vZGUsIGNvbnRleHQpIGFzIFJlZmVyZW5jZTx0cy5FbnVtRGVjbGFyYXRpb24+O1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFbnVtVmFsdWU+KCk7XG4gICAgbm9kZS5tZW1iZXJzLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnN0cmluZ05hbWVGcm9tUHJvcGVydHlOYW1lKG1lbWJlci5uYW1lLCBjb250ZXh0KTtcbiAgICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBtZW1iZXIuaW5pdGlhbGl6ZXIgJiYgdGhpcy52aXNpdChtZW1iZXIuaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgICBtYXAuc2V0KG5hbWUsIG5ldyBFbnVtVmFsdWUoZW51bVJlZiwgbmFtZSwgcmVzb2x2ZWQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgaWYgKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJndW1lbnQgaW4gRWxlbWVudEFjY2Vzc0V4cHJlc3Npb25gKTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfVxuICAgIGNvbnN0IHJocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAocmhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgcmhzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByaHMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByaHMgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIGluZGV4IHNob3VsZCBiZSBzdHJpbmcgb3IgbnVtYmVyLCBnb3QgJHt0eXBlb2YgcmhzfTogJHtyaHN9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzSGVscGVyKG5vZGUsIGxocywgcmhzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZTogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgY29uc3QgcmhzID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETzogaGFuZGxlIHJlZmVyZW5jZSB0byBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzSGVscGVyKG5vZGUsIGxocywgcmhzLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRTb3VyY2VGaWxlKG5vZGU6IHRzLlNvdXJjZUZpbGUsIGNvbnRleHQ6IENvbnRleHQpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLmhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChkZWNsYXJhdGlvbnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGRlY2xhcmF0aW9ucy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMudmlzaXREZWNsYXJhdGlvbihcbiAgICAgICAgICBkZWNsLm5vZGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAuLi5jb250ZXh0LCAuLi5qb2luTW9kdWxlQ29udGV4dChjb250ZXh0LCBub2RlLCBkZWNsKSxcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgbWFwLnNldChuYW1lLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHByaXZhdGUgYWNjZXNzSGVscGVyKFxuICAgICAgbm9kZTogdHMuRXhwcmVzc2lvbiwgbGhzOiBSZXNvbHZlZFZhbHVlLCByaHM6IHN0cmluZ3xudW1iZXIsXG4gICAgICBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgc3RySW5kZXggPSBgJHtyaHN9YDtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICBpZiAobGhzLmhhcyhzdHJJbmRleCkpIHtcbiAgICAgICAgcmV0dXJuIGxocy5nZXQoc3RySW5kZXgpICE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbWFwIGFjY2VzczogWyR7QXJyYXkuZnJvbShsaHMua2V5cygpKX1dIGRvdCAke3Joc31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobGhzKSkge1xuICAgICAgaWYgKHJocyA9PT0gJ2xlbmd0aCcpIHtcbiAgICAgICAgcmV0dXJuIGxocy5sZW5ndGg7XG4gICAgICB9IGVsc2UgaWYgKHJocyA9PT0gJ3NsaWNlJykge1xuICAgICAgICByZXR1cm4gbmV3IEFycmF5U2xpY2VCdWlsdGluRm4obm9kZSwgbGhzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcmhzICE9PSAnbnVtYmVyJyB8fCAhTnVtYmVyLmlzSW50ZWdlcihyaHMpKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVua25vd24obm9kZSk7XG4gICAgICB9XG4gICAgICBpZiAocmhzIDwgMCB8fCByaHMgPj0gbGhzLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluZGV4IG91dCBvZiBib3VuZHM6ICR7cmhzfSB2cyAke2xocy5sZW5ndGh9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGhzW3Joc107XG4gICAgfSBlbHNlIGlmIChsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGNvbnN0IHJlZiA9IGxocy5ub2RlO1xuICAgICAgaWYgKHRoaXMuaG9zdC5pc0NsYXNzKHJlZikpIHtcbiAgICAgICAgbGV0IGFic29sdXRlTW9kdWxlTmFtZSA9IGNvbnRleHQuYWJzb2x1dGVNb2R1bGVOYW1lO1xuICAgICAgICBpZiAobGhzIGluc3RhbmNlb2YgTm9kZVJlZmVyZW5jZSB8fCBsaHMgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZmVyZW5jZSkge1xuICAgICAgICAgIGFic29sdXRlTW9kdWxlTmFtZSA9IGxocy5tb2R1bGVOYW1lIHx8IGFic29sdXRlTW9kdWxlTmFtZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdmFsdWU6IFJlc29sdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMuaG9zdC5nZXRNZW1iZXJzT2ZDbGFzcyhyZWYpLmZpbmQoXG4gICAgICAgICAgICBtZW1iZXIgPT4gbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5uYW1lID09PSBzdHJJbmRleCk7XG4gICAgICAgIGlmIChtZW1iZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChtZW1iZXIudmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24obWVtYmVyLnZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1lbWJlci5pbXBsZW1lbnRhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgTm9kZVJlZmVyZW5jZShtZW1iZXIuaW1wbGVtZW50YXRpb24sIGFic29sdXRlTW9kdWxlTmFtZSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtZW1iZXIubm9kZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgTm9kZVJlZmVyZW5jZShtZW1iZXIubm9kZSwgYWJzb2x1dGVNb2R1bGVOYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRvdCBwcm9wZXJ0eSBhY2Nlc3M6ICR7bGhzfSBkb3QgJHtyaHN9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENhbGxFeHByZXNzaW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICBpZiAobGhzIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgbGhzKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY2FsbCByZWZlcnMgdG8gYSBidWlsdGluIGZ1bmN0aW9uLCBhdHRlbXB0IHRvIGV2YWx1YXRlIHRoZSBmdW5jdGlvbi5cbiAgICBpZiAobGhzIGluc3RhbmNlb2YgQnVpbHRpbkZuKSB7XG4gICAgICByZXR1cm4gbGhzLmV2YWx1YXRlKG5vZGUuYXJndW1lbnRzLm1hcChhcmcgPT4gdGhpcy52aXNpdEV4cHJlc3Npb24oYXJnLCBjb250ZXh0KSkpO1xuICAgIH1cblxuICAgIGlmICghKGxocyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgYXR0ZW1wdGluZyB0byBjYWxsIHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uOiAke2xoc31gKTtcbiAgICB9IGVsc2UgaWYgKCFpc0Z1bmN0aW9uT3JNZXRob2RSZWZlcmVuY2UobGhzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBjYWxsaW5nIHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uIGRlY2xhcmF0aW9uPyAke3RzLlN5bnRheEtpbmRbbGhzLm5vZGUua2luZF19ICgke25vZGUuZ2V0VGV4dCgpfSlgKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbiA9IHRoaXMuaG9zdC5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihsaHMubm9kZSk7XG5cbiAgICAvLyBJZiB0aGUgZnVuY3Rpb24gaXMgZm9yZWlnbiAoZGVjbGFyZWQgdGhyb3VnaCBhIGQudHMgZmlsZSksIGF0dGVtcHQgdG8gcmVzb2x2ZSBpdCB3aXRoIHRoZVxuICAgIC8vIGZvcmVpZ25GdW5jdGlvblJlc29sdmVyLCBpZiBvbmUgaXMgc3BlY2lmaWVkLlxuICAgIGlmIChmbi5ib2R5ID09PSBudWxsKSB7XG4gICAgICBsZXQgZXhwcjogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICAgIGlmIChjb250ZXh0LmZvcmVpZ25GdW5jdGlvblJlc29sdmVyKSB7XG4gICAgICAgIGV4cHIgPSBjb250ZXh0LmZvcmVpZ25GdW5jdGlvblJlc29sdmVyKGxocywgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgaWYgKGV4cHIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KFxuICAgICAgICAgICAgbm9kZSwgRHluYW1pY1ZhbHVlLmZyb21FeHRlcm5hbFJlZmVyZW5jZShub2RlLmV4cHJlc3Npb24sIGxocykpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgZnVuY3Rpb24gaXMgZGVjbGFyZWQgaW4gYSBkaWZmZXJlbnQgZmlsZSwgcmVzb2x2ZSB0aGUgZm9yZWlnbiBmdW5jdGlvbiBleHByZXNzaW9uXG4gICAgICAvLyB1c2luZyB0aGUgYWJzb2x1dGUgbW9kdWxlIG5hbWUgb2YgdGhhdCBmaWxlIChpZiBhbnkpLlxuICAgICAgaWYgKChsaHMgaW5zdGFuY2VvZiBOb2RlUmVmZXJlbmNlIHx8IGxocyBpbnN0YW5jZW9mIEFic29sdXRlUmVmZXJlbmNlKSAmJlxuICAgICAgICAgIGxocy5tb2R1bGVOYW1lICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnRleHQgPSB7XG4gICAgICAgICAgLi4uY29udGV4dCxcbiAgICAgICAgICBhYnNvbHV0ZU1vZHVsZU5hbWU6IGxocy5tb2R1bGVOYW1lLFxuICAgICAgICAgIHJlc29sdXRpb25Db250ZXh0OiBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKGV4cHIsIGNvbnRleHQpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHkgPSBmbi5ib2R5O1xuICAgIGlmIChib2R5Lmxlbmd0aCAhPT0gMSB8fCAhdHMuaXNSZXR1cm5TdGF0ZW1lbnQoYm9keVswXSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRnVuY3Rpb24gYm9keSBtdXN0IGhhdmUgYSBzaW5nbGUgcmV0dXJuIHN0YXRlbWVudCBvbmx5LicpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBib2R5WzBdIGFzIHRzLlJldHVyblN0YXRlbWVudDtcblxuICAgIGNvbnN0IG5ld1Njb3BlOiBTY29wZSA9IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm4ucGFyYW1ldGVycy5mb3JFYWNoKChwYXJhbSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpbmRleCA8IG5vZGUuYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhcmcgPSBub2RlLmFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24oYXJnLCBjb250ZXh0KTtcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIHBhcmFtLmluaXRpYWxpemVyICE9PSBudWxsKSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24ocGFyYW0uaW5pdGlhbGl6ZXIsIGNvbnRleHQpO1xuICAgICAgfVxuICAgICAgbmV3U2NvcGUuc2V0KHBhcmFtLm5vZGUsIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQuZXhwcmVzc2lvbiAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgdGhpcy52aXNpdEV4cHJlc3Npb24ocmV0LmV4cHJlc3Npb24sIHsuLi5jb250ZXh0LCBzY29wZTogbmV3U2NvcGV9KSA6XG4gICAgICAgIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZTogdHMuQ29uZGl0aW9uYWxFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTpcbiAgICAgIFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGNvbmRpdGlvbiA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuY29uZGl0aW9uLCBjb250ZXh0KTtcbiAgICBpZiAoY29uZGl0aW9uIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgY29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5GYWxzZSwgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24sIGNvbnRleHQ6IENvbnRleHQpOlxuICAgICAgUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3Qgb3BlcmF0b3JLaW5kID0gbm9kZS5vcGVyYXRvcjtcbiAgICBpZiAoIVVOQVJZX09QRVJBVE9SUy5oYXMob3BlcmF0b3JLaW5kKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcmVmaXggdW5hcnkgb3BlcmF0b3I6ICR7dHMuU3ludGF4S2luZFtvcGVyYXRvcktpbmRdfWApO1xuICAgIH1cblxuICAgIGNvbnN0IG9wID0gVU5BUllfT1BFUkFUT1JTLmdldChvcGVyYXRvcktpbmQpICE7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLm9wZXJhbmQsIGNvbnRleHQpO1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uLCBjb250ZXh0OiBDb250ZXh0KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdG9rZW5LaW5kID0gbm9kZS5vcGVyYXRvclRva2VuLmtpbmQ7XG4gICAgaWYgKCFCSU5BUllfT1BFUkFUT1JTLmhhcyh0b2tlbktpbmQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGJpbmFyeSBvcGVyYXRvcjogJHt0cy5TeW50YXhLaW5kW3Rva2VuS2luZF19YCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BSZWNvcmQgPSBCSU5BUllfT1BFUkFUT1JTLmdldCh0b2tlbktpbmQpICE7XG4gICAgbGV0IGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBSZXNvbHZlZFZhbHVlO1xuICAgIGlmIChvcFJlY29yZC5saXRlcmFsKSB7XG4gICAgICBsaHMgPSBsaXRlcmFsKHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCkpO1xuICAgICAgcmhzID0gbGl0ZXJhbCh0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxocyA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUubGVmdCwgY29udGV4dCk7XG4gICAgICByaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLnJpZ2h0LCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGxocyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGxocyk7XG4gICAgfSBlbHNlIGlmIChyaHMgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCByaHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3BSZWNvcmQub3AobGhzLCByaHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlOiB0cy5QYXJlbnRoZXNpemVkRXhwcmVzc2lvbiwgY29udGV4dDogQ29udGV4dCk6XG4gICAgICBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobm9kZTogdHMuUHJvcGVydHlOYW1lLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgeyAgLy8gdHMuQ29tcHV0ZWRQcm9wZXJ0eU5hbWVcbiAgICAgIGNvbnN0IGxpdGVyYWwgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIHR5cGVvZiBsaXRlcmFsID09PSAnc3RyaW5nJyA/IGxpdGVyYWwgOiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWZlcmVuY2Uobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnRleHQ6IENvbnRleHQpOiBSZWZlcmVuY2Uge1xuICAgIHJldHVybiB0aGlzLnJlZlJlc29sdmVyLnJlc29sdmUobm9kZSwgY29udGV4dC5hYnNvbHV0ZU1vZHVsZU5hbWUsIGNvbnRleHQucmVzb2x1dGlvbkNvbnRleHQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb25Pck1ldGhvZFJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPik6XG4gICAgcmVmIGlzIFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4ge1xuICByZXR1cm4gdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocmVmLm5vZGUpO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsKHZhbHVlOiBSZXNvbHZlZFZhbHVlKTogYW55IHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlIHx8IHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlICR7dmFsdWV9IGlzIG5vdCBsaXRlcmFsIGFuZCBjYW5ub3QgYmUgdXNlZCBpbiB0aGlzIGNvbnRleHQuYCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFyaWFibGVEZWNsYXJhdGlvbkRlY2xhcmVkKG5vZGU6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKG5vZGUucGFyZW50ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qobm9kZS5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IGRlY2xMaXN0ID0gbm9kZS5wYXJlbnQ7XG4gIGlmIChkZWNsTGlzdC5wYXJlbnQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNWYXJpYWJsZVN0YXRlbWVudChkZWNsTGlzdC5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHZhclN0bXQgPSBkZWNsTGlzdC5wYXJlbnQ7XG4gIHJldHVybiB2YXJTdG10Lm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB2YXJTdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5EZWNsYXJlS2V5d29yZCk7XG59XG5cbmNvbnN0IEVNUFRZID0ge307XG5cbmZ1bmN0aW9uIGpvaW5Nb2R1bGVDb250ZXh0KGV4aXN0aW5nOiBDb250ZXh0LCBub2RlOiB0cy5Ob2RlLCBkZWNsOiBEZWNsYXJhdGlvbik6IHtcbiAgYWJzb2x1dGVNb2R1bGVOYW1lPzogc3RyaW5nLFxuICByZXNvbHV0aW9uQ29udGV4dD86IHN0cmluZyxcbn0ge1xuICBpZiAoZGVjbC52aWFNb2R1bGUgIT09IG51bGwgJiYgZGVjbC52aWFNb2R1bGUgIT09IGV4aXN0aW5nLmFic29sdXRlTW9kdWxlTmFtZSkge1xuICAgIHJldHVybiB7XG4gICAgICBhYnNvbHV0ZU1vZHVsZU5hbWU6IGRlY2wudmlhTW9kdWxlLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEVNUFRZO1xuICB9XG59XG4iXX0=