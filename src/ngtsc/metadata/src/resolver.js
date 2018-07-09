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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/resolver", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * resolver.ts implements partial computation of expressions, resolving expressions to static
     * values where possible and returning a `DynamicValue` signal when not.
     */
    var ts = require("typescript");
    /**
     * Represents a value which cannot be determined statically.
     *
     * Use `isDynamicValue` to determine whether a `ResolvedValue` is a `DynamicValue`.
     */
    var DynamicValue = /** @class */ (function () {
        function DynamicValue() {
            /**
             * This is needed so the "is DynamicValue" assertion of `isDynamicValue` actually has meaning.
             *
             * Otherwise, "is DynamicValue" is akin to "is {}" which doesn't trigger narrowing.
             */
            this._isDynamic = true;
        }
        return DynamicValue;
    }());
    exports.DynamicValue = DynamicValue;
    /**
     * An internal flyweight for `DynamicValue`. Eventually the dynamic value will carry information
     * on the location of the node that could not be statically computed.
     */
    var DYNAMIC_VALUE = new DynamicValue();
    /**
     * Used to test whether a `ResolvedValue` is a `DynamicValue`.
     */
    function isDynamicValue(value) {
        return value === DYNAMIC_VALUE;
    }
    exports.isDynamicValue = isDynamicValue;
    /**
     * A reference to a `ts.Node`.
     *
     * For example, if an expression evaluates to a function or class definition, it will be returned
     * as a `Reference` (assuming references are allowed in evaluation).
     */
    var Reference = /** @class */ (function () {
        function Reference(node) {
            this.node = node;
        }
        return Reference;
    }());
    exports.Reference = Reference;
    /**
     * Statically resolve the given `ts.Expression` into a `ResolvedValue`.
     *
     * @param node the expression to statically resolve if possible
     * @param checker a `ts.TypeChecker` used to understand the expression
     * @returns a `ResolvedValue` representing the resolved value
     */
    function staticallyResolve(node, checker) {
        return new StaticInterpreter(checker, new Map(), 0 /* No */)
            .visit(node);
    }
    exports.staticallyResolve = staticallyResolve;
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
        function StaticInterpreter(checker, scope, allowReferences) {
            this.checker = checker;
            this.scope = scope;
            this.allowReferences = allowReferences;
        }
        StaticInterpreter.prototype.visit = function (node) { return this.visitExpression(node); };
        StaticInterpreter.prototype.visitExpression = function (node) {
            if (node.kind === ts.SyntaxKind.TrueKeyword) {
                return true;
            }
            else if (node.kind === ts.SyntaxKind.FalseKeyword) {
                return false;
            }
            else if (ts.isStringLiteral(node)) {
                return node.text;
            }
            else if (ts.isNumericLiteral(node)) {
                return parseFloat(node.text);
            }
            else if (ts.isObjectLiteralExpression(node)) {
                return this.visitObjectLiteralExpression(node);
            }
            else if (ts.isIdentifier(node)) {
                return this.visitIdentifier(node);
            }
            else if (ts.isPropertyAccessExpression(node)) {
                return this.visitPropertyAccessExpression(node);
            }
            else if (ts.isCallExpression(node)) {
                return this.visitCallExpression(node);
            }
            else if (ts.isConditionalExpression(node)) {
                return this.visitConditionalExpression(node);
            }
            else if (ts.isPrefixUnaryExpression(node)) {
                return this.visitPrefixUnaryExpression(node);
            }
            else if (ts.isBinaryExpression(node)) {
                return this.visitBinaryExpression(node);
            }
            else if (ts.isArrayLiteralExpression(node)) {
                return this.visitArrayLiteralExpression(node);
            }
            else if (ts.isParenthesizedExpression(node)) {
                return this.visitParenthesizedExpression(node);
            }
            else if (ts.isElementAccessExpression(node)) {
                return this.visitElementAccessExpression(node);
            }
            else if (ts.isAsExpression(node)) {
                return this.visitExpression(node.expression);
            }
            else if (ts.isNonNullExpression(node)) {
                return this.visitExpression(node.expression);
            }
            else if (ts.isClassDeclaration(node)) {
                return this.visitDeclaration(node);
            }
            else {
                return DYNAMIC_VALUE;
            }
        };
        StaticInterpreter.prototype.visitArrayLiteralExpression = function (node) {
            var array = [];
            for (var i = 0; i < node.elements.length; i++) {
                var element = node.elements[i];
                if (ts.isSpreadElement(element)) {
                    var spread = this.visitExpression(element.expression);
                    if (isDynamicValue(spread)) {
                        return DYNAMIC_VALUE;
                    }
                    if (!Array.isArray(spread)) {
                        throw new Error("Unexpected value in spread expression: " + spread);
                    }
                    array.push.apply(array, tslib_1.__spread(spread));
                }
                else {
                    var result = this.visitExpression(element);
                    if (isDynamicValue(result)) {
                        return DYNAMIC_VALUE;
                    }
                    array.push(result);
                }
            }
            return array;
        };
        StaticInterpreter.prototype.visitObjectLiteralExpression = function (node) {
            var map = new Map();
            for (var i = 0; i < node.properties.length; i++) {
                var property = node.properties[i];
                if (ts.isPropertyAssignment(property)) {
                    var name_1 = this.stringNameFromPropertyName(property.name);
                    // Check whether the name can be determined statically.
                    if (name_1 === undefined) {
                        return DYNAMIC_VALUE;
                    }
                    map.set(name_1, this.visitExpression(property.initializer));
                }
                else if (ts.isShorthandPropertyAssignment(property)) {
                    var symbol = this.checker.getShorthandAssignmentValueSymbol(property);
                    if (symbol === undefined || symbol.valueDeclaration === undefined) {
                        return DYNAMIC_VALUE;
                    }
                    map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration));
                }
                else if (ts.isSpreadAssignment(property)) {
                    var spread = this.visitExpression(property.expression);
                    if (isDynamicValue(spread)) {
                        return DYNAMIC_VALUE;
                    }
                    if (!(spread instanceof Map)) {
                        throw new Error("Unexpected value in spread assignment: " + spread);
                    }
                    spread.forEach(function (value, key) { return map.set(key, value); });
                }
                else {
                    return DYNAMIC_VALUE;
                }
            }
            return map;
        };
        StaticInterpreter.prototype.visitIdentifier = function (node) {
            var symbol = this.checker.getSymbolAtLocation(node);
            if (symbol === undefined) {
                return DYNAMIC_VALUE;
            }
            var result = this.visitSymbol(symbol);
            if (this.allowReferences === 1 /* Yes */ && isDynamicValue(result)) {
                return new Reference(node);
            }
            return result;
        };
        StaticInterpreter.prototype.visitSymbol = function (symbol) {
            var _this = this;
            while (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = this.checker.getAliasedSymbol(symbol);
            }
            if (symbol.declarations === undefined) {
                return DYNAMIC_VALUE;
            }
            if (symbol.valueDeclaration !== undefined) {
                return this.visitDeclaration(symbol.valueDeclaration);
            }
            return symbol.declarations.reduce(function (prev, decl) {
                if (!(isDynamicValue(prev) || prev instanceof Reference)) {
                    return prev;
                }
                return _this.visitDeclaration(decl);
            }, DYNAMIC_VALUE);
        };
        StaticInterpreter.prototype.visitDeclaration = function (node) {
            if (ts.isVariableDeclaration(node)) {
                if (!node.initializer) {
                    return undefined;
                }
                return this.visitExpression(node.initializer);
            }
            else if (ts.isParameter(node) && this.scope.has(node)) {
                return this.scope.get(node);
            }
            else if (ts.isExportAssignment(node)) {
                return this.visitExpression(node.expression);
            }
            else if (ts.isSourceFile(node)) {
                return this.visitSourceFile(node);
            }
            return this.allowReferences === 1 /* Yes */ ? new Reference(node) : DYNAMIC_VALUE;
        };
        StaticInterpreter.prototype.visitElementAccessExpression = function (node) {
            var lhs = this.withReferences.visitExpression(node.expression);
            if (node.argumentExpression === undefined) {
                throw new Error("Expected argument in ElementAccessExpression");
            }
            if (isDynamicValue(lhs)) {
                return DYNAMIC_VALUE;
            }
            var rhs = this.withNoReferences.visitExpression(node.argumentExpression);
            if (isDynamicValue(rhs)) {
                return DYNAMIC_VALUE;
            }
            if (typeof rhs !== 'string' && typeof rhs !== 'number') {
                throw new Error("ElementAccessExpression index should be string or number, got " + typeof rhs + ": " + rhs);
            }
            return this.accessHelper(lhs, rhs);
        };
        StaticInterpreter.prototype.visitPropertyAccessExpression = function (node) {
            var lhs = this.withReferences.visitExpression(node.expression);
            var rhs = node.name.text;
            // TODO: handle reference to class declaration.
            if (isDynamicValue(lhs)) {
                return DYNAMIC_VALUE;
            }
            return this.accessHelper(lhs, rhs);
        };
        StaticInterpreter.prototype.visitSourceFile = function (node) {
            var _this = this;
            var map = new Map();
            var symbol = this.checker.getSymbolAtLocation(node);
            if (symbol === undefined) {
                return DYNAMIC_VALUE;
            }
            var exports = this.checker.getExportsOfModule(symbol);
            exports.forEach(function (symbol) { return map.set(symbol.name, _this.visitSymbol(symbol)); });
            return map;
        };
        StaticInterpreter.prototype.accessHelper = function (lhs, rhs) {
            var _this = this;
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
                    return rhs.length;
                }
                if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
                    return DYNAMIC_VALUE;
                }
                if (rhs < 0 || rhs >= lhs.length) {
                    throw new Error("Index out of bounds: " + rhs + " vs " + lhs.length);
                }
                return lhs[rhs];
            }
            else if (lhs instanceof Reference) {
                var ref = lhs.node;
                if (ts.isClassDeclaration(ref)) {
                    var value = undefined;
                    var member = ref.members.filter(function (member) { return isStatic(member); })
                        .find(function (member) { return member.name !== undefined &&
                        _this.stringNameFromPropertyName(member.name) === strIndex; });
                    if (member !== undefined) {
                        if (ts.isPropertyDeclaration(member) && member.initializer !== undefined) {
                            value = this.visitExpression(member.initializer);
                        }
                        else if (ts.isMethodDeclaration(member)) {
                            value = this.allowReferences === 1 /* Yes */ ? new Reference(member) :
                                DYNAMIC_VALUE;
                        }
                    }
                    return value;
                }
            }
            throw new Error("Invalid dot property access: " + lhs + " dot " + rhs);
        };
        StaticInterpreter.prototype.visitCallExpression = function (node) {
            var _this = this;
            var lhs = this.withReferences.visitExpression(node.expression);
            if (!(lhs instanceof Reference)) {
                throw new Error("attempting to call something that is not a function: " + lhs);
            }
            else if (!isFunctionOrMethodDeclaration(lhs.node) || !lhs.node.body) {
                throw new Error("calling something that is not a function declaration? " + ts.SyntaxKind[lhs.node.kind]);
            }
            var fn = lhs.node;
            var body = fn.body;
            if (body.statements.length !== 1 || !ts.isReturnStatement(body.statements[0])) {
                throw new Error('Function body must have a single return statement only.');
            }
            var ret = body.statements[0];
            var newScope = new Map();
            fn.parameters.forEach(function (param, index) {
                var value = undefined;
                if (index < node.arguments.length) {
                    var arg = node.arguments[index];
                    value = _this.visitExpression(arg);
                }
                if (value === undefined && param.initializer !== undefined) {
                    value = _this.visitExpression(param.initializer);
                }
                newScope.set(param, value);
            });
            return ret.expression !== undefined ? this.withScope(newScope).visitExpression(ret.expression) :
                undefined;
        };
        StaticInterpreter.prototype.visitConditionalExpression = function (node) {
            var condition = this.withNoReferences.visitExpression(node.condition);
            if (isDynamicValue(condition)) {
                return condition;
            }
            if (condition) {
                return this.visitExpression(node.whenTrue);
            }
            else {
                return this.visitExpression(node.whenFalse);
            }
        };
        StaticInterpreter.prototype.visitPrefixUnaryExpression = function (node) {
            var operatorKind = node.operator;
            if (!UNARY_OPERATORS.has(operatorKind)) {
                throw new Error("Unsupported prefix unary operator: " + ts.SyntaxKind[operatorKind]);
            }
            var op = UNARY_OPERATORS.get(operatorKind);
            var value = this.visitExpression(node.operand);
            return isDynamicValue(value) ? DYNAMIC_VALUE : op(value);
        };
        StaticInterpreter.prototype.visitBinaryExpression = function (node) {
            var tokenKind = node.operatorToken.kind;
            if (!BINARY_OPERATORS.has(tokenKind)) {
                throw new Error("Unsupported binary operator: " + ts.SyntaxKind[tokenKind]);
            }
            var opRecord = BINARY_OPERATORS.get(tokenKind);
            var lhs, rhs;
            if (opRecord.literal) {
                var withNoReferences = this.withNoReferences;
                lhs = literal(withNoReferences.visitExpression(node.left));
                rhs = literal(withNoReferences.visitExpression(node.right));
            }
            else {
                lhs = this.visitExpression(node.left);
                rhs = this.visitExpression(node.right);
            }
            return isDynamicValue(lhs) || isDynamicValue(rhs) ? DYNAMIC_VALUE : opRecord.op(lhs, rhs);
        };
        StaticInterpreter.prototype.visitParenthesizedExpression = function (node) {
            return this.visitExpression(node.expression);
        };
        StaticInterpreter.prototype.stringNameFromPropertyName = function (node) {
            if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
                return node.text;
            }
            else { // ts.ComputedPropertyName
                var literal_1 = this.withNoReferences.visitExpression(node.expression);
                return typeof literal_1 === 'string' ? literal_1 : undefined;
            }
        };
        Object.defineProperty(StaticInterpreter.prototype, "withReferences", {
            get: function () {
                return this.allowReferences === 1 /* Yes */ ?
                    this :
                    new StaticInterpreter(this.checker, this.scope, 1 /* Yes */);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StaticInterpreter.prototype, "withNoReferences", {
            get: function () {
                return this.allowReferences === 0 /* No */ ?
                    this :
                    new StaticInterpreter(this.checker, this.scope, 0 /* No */);
            },
            enumerable: true,
            configurable: true
        });
        StaticInterpreter.prototype.withScope = function (scope) {
            return new StaticInterpreter(this.checker, scope, this.allowReferences);
        };
        return StaticInterpreter;
    }());
    function isStatic(element) {
        return element.modifiers !== undefined &&
            element.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.StaticKeyword; });
    }
    function isFunctionOrMethodDeclaration(node) {
        return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node);
    }
    function literal(value) {
        if (value === null || value === undefined || typeof value === 'string' ||
            typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (isDynamicValue(value)) {
            return DYNAMIC_VALUE;
        }
        throw new Error("Value " + value + " is not literal and cannot be used in this context.");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSDs7O09BR0c7SUFFSCwrQkFBaUM7SUFFakM7Ozs7T0FJRztJQUNIO1FBQUE7WUFDRTs7OztlQUlHO1lBQ0ssZUFBVSxHQUFHLElBQUksQ0FBQztRQUM1QixDQUFDO1FBQUQsbUJBQUM7SUFBRCxDQUFDLEFBUEQsSUFPQztJQVBZLG9DQUFZO0lBU3pCOzs7T0FHRztJQUNILElBQU0sYUFBYSxHQUFpQixJQUFJLFlBQVksRUFBRSxDQUFDO0lBRXZEOztPQUVHO0lBQ0gsd0JBQStCLEtBQVU7UUFDdkMsT0FBTyxLQUFLLEtBQUssYUFBYSxDQUFDO0lBQ2pDLENBQUM7SUFGRCx3Q0FFQztJQTRDRDs7Ozs7T0FLRztJQUNIO1FBQ0UsbUJBQXFCLElBQWE7WUFBYixTQUFJLEdBQUosSUFBSSxDQUFTO1FBQUcsQ0FBQztRQUN4QyxnQkFBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRlksOEJBQVM7SUFJdEI7Ozs7OztPQU1HO0lBQ0gsMkJBQWtDLElBQW1CLEVBQUUsT0FBdUI7UUFDNUUsT0FBTyxJQUFJLGlCQUFpQixDQUNqQixPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQTBDLGFBQXFCO2FBQ3JGLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBSkQsOENBSUM7SUFPRCx5QkFBeUIsRUFBMkI7UUFDbEQsT0FBTyxFQUFDLEVBQUUsSUFBQSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsMkJBQTJCLEVBQTJCO1FBQ3BELE9BQU8sRUFBQyxFQUFFLElBQUEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFD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LElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBeEMsQ0FBd0MsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRCx1Q0FBdUMsSUFBYTtRQUVsRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELGlCQUFpQixLQUFvQjtRQUNuQyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRO1lBQ2xFLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFDM0QsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLE9BQU8sYUFBYSxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFTLEtBQUssd0RBQXFELENBQUMsQ0FBQztJQUN2RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIHJlc29sdmVyLnRzIGltcGxlbWVudHMgcGFydGlhbCBjb21wdXRhdGlvbiBvZiBleHByZXNzaW9ucywgcmVzb2x2aW5nIGV4cHJlc3Npb25zIHRvIHN0YXRpY1xuICogdmFsdWVzIHdoZXJlIHBvc3NpYmxlIGFuZCByZXR1cm5pbmcgYSBgRHluYW1pY1ZhbHVlYCBzaWduYWwgd2hlbiBub3QuXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHZhbHVlIHdoaWNoIGNhbm5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHkuXG4gKlxuICogVXNlIGBpc0R5bmFtaWNWYWx1ZWAgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBgUmVzb2x2ZWRWYWx1ZWAgaXMgYSBgRHluYW1pY1ZhbHVlYC5cbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNWYWx1ZSB7XG4gIC8qKlxuICAgKiBUaGlzIGlzIG5lZWRlZCBzbyB0aGUgXCJpcyBEeW5hbWljVmFsdWVcIiBhc3NlcnRpb24gb2YgYGlzRHluYW1pY1ZhbHVlYCBhY3R1YWxseSBoYXMgbWVhbmluZy5cbiAgICpcbiAgICogT3RoZXJ3aXNlLCBcImlzIER5bmFtaWNWYWx1ZVwiIGlzIGFraW4gdG8gXCJpcyB7fVwiIHdoaWNoIGRvZXNuJ3QgdHJpZ2dlciBuYXJyb3dpbmcuXG4gICAqL1xuICBwcml2YXRlIF9pc0R5bmFtaWMgPSB0cnVlO1xufVxuXG4vKipcbiAqIEFuIGludGVybmFsIGZseXdlaWdodCBmb3IgYER5bmFtaWNWYWx1ZWAuIEV2ZW50dWFsbHkgdGhlIGR5bmFtaWMgdmFsdWUgd2lsbCBjYXJyeSBpbmZvcm1hdGlvblxuICogb24gdGhlIGxvY2F0aW9uIG9mIHRoZSBub2RlIHRoYXQgY291bGQgbm90IGJlIHN0YXRpY2FsbHkgY29tcHV0ZWQuXG4gKi9cbmNvbnN0IERZTkFNSUNfVkFMVUU6IER5bmFtaWNWYWx1ZSA9IG5ldyBEeW5hbWljVmFsdWUoKTtcblxuLyoqXG4gKiBVc2VkIHRvIHRlc3Qgd2hldGhlciBhIGBSZXNvbHZlZFZhbHVlYCBpcyBhIGBEeW5hbWljVmFsdWVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEeW5hbWljVmFsdWUodmFsdWU6IGFueSk6IHZhbHVlIGlzIER5bmFtaWNWYWx1ZSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gRFlOQU1JQ19WQUxVRTtcbn1cblxuLyoqXG4gKiBBIHZhbHVlIHJlc3VsdGluZyBmcm9tIHN0YXRpYyByZXNvbHV0aW9uLlxuICpcbiAqIFRoaXMgY291bGQgYmUgYSBwcmltaXRpdmUsIGNvbGxlY3Rpb24gdHlwZSwgcmVmZXJlbmNlIHRvIGEgYHRzLk5vZGVgIHRoYXQgZGVjbGFyZXMgYVxuICogbm9uLXByaW1pdGl2ZSB2YWx1ZSwgb3IgYSBzcGVjaWFsIGBEeW5hbWljVmFsdWVgIHR5cGUgd2hpY2ggaW5kaWNhdGVzIHRoZSB2YWx1ZSB3YXMgbm90XG4gKiBhdmFpbGFibGUgc3RhdGljYWxseS5cbiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZWRWYWx1ZSA9IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkIHwgUmVmZXJlbmNlIHxcbiAgICBSZXNvbHZlZFZhbHVlQXJyYXkgfCBSZXNvbHZlZFZhbHVlTWFwIHwgRHluYW1pY1ZhbHVlO1xuXG4vKipcbiAqIEFuIGFycmF5IG9mIGBSZXNvbHZlZFZhbHVlYHMuXG4gKlxuICogVGhpcyBpcyBhIHJlaWZpZWQgdHlwZSB0byBhbGxvdyB0aGUgY2lyY3VsYXIgcmVmZXJlbmNlIG9mIGBSZXNvbHZlZFZhbHVlYCAtPiBgUmVzb2x2ZWRWYWx1ZUFycmF5YFxuICogLT5cbiAqIGBSZXNvbHZlZFZhbHVlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFZhbHVlQXJyYXkgZXh0ZW5kcyBBcnJheTxSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgbWFwIG9mIHN0cmluZ3MgdG8gYFJlc29sdmVkVmFsdWVgcy5cbiAqXG4gKiBUaGlzIGlzIGEgcmVpZmllZCB0eXBlIHRvIGFsbG93IHRoZSBjaXJjdWxhciByZWZlcmVuY2Ugb2YgYFJlc29sdmVkVmFsdWVgIC0+IGBSZXNvbHZlZFZhbHVlTWFwYCAtPlxuICogYFJlc29sdmVkVmFsdWVgLlxuICovIGV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRWYWx1ZU1hcCBleHRlbmRzIE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+IHt9XG5cbi8qKlxuICogVHJhY2tzIHRoZSBzY29wZSBvZiBhIGZ1bmN0aW9uIGJvZHksIHdoaWNoIGluY2x1ZGVzIGBSZXNvbHZlZFZhbHVlYHMgZm9yIHRoZSBwYXJhbWV0ZXJzIG9mIHRoYXRcbiAqIGJvZHkuXG4gKi9cbnR5cGUgU2NvcGUgPSBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+O1xuXG4vKipcbiAqIFdoZXRoZXIgb3Igbm90IHRvIGFsbG93IHJlZmVyZW5jZXMgZHVyaW5nIHJlc29sdXRpb24uXG4gKlxuICogU2VlIGBTdGF0aWNJbnRlcnByZXRlcmAgZm9yIGRldGFpbHMuXG4gKi9cbmNvbnN0IGVudW0gQWxsb3dSZWZlcmVuY2VzIHtcbiAgTm8gPSAwLFxuICBZZXMgPSAxLFxufVxuXG4vKipcbiAqIEEgcmVmZXJlbmNlIHRvIGEgYHRzLk5vZGVgLlxuICpcbiAqIEZvciBleGFtcGxlLCBpZiBhbiBleHByZXNzaW9uIGV2YWx1YXRlcyB0byBhIGZ1bmN0aW9uIG9yIGNsYXNzIGRlZmluaXRpb24sIGl0IHdpbGwgYmUgcmV0dXJuZWRcbiAqIGFzIGEgYFJlZmVyZW5jZWAgKGFzc3VtaW5nIHJlZmVyZW5jZXMgYXJlIGFsbG93ZWQgaW4gZXZhbHVhdGlvbikuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2Uge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBub2RlOiB0cy5Ob2RlKSB7fVxufVxuXG4vKipcbiAqIFN0YXRpY2FsbHkgcmVzb2x2ZSB0aGUgZ2l2ZW4gYHRzLkV4cHJlc3Npb25gIGludG8gYSBgUmVzb2x2ZWRWYWx1ZWAuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIGV4cHJlc3Npb24gdG8gc3RhdGljYWxseSByZXNvbHZlIGlmIHBvc3NpYmxlXG4gKiBAcGFyYW0gY2hlY2tlciBhIGB0cy5UeXBlQ2hlY2tlcmAgdXNlZCB0byB1bmRlcnN0YW5kIHRoZSBleHByZXNzaW9uXG4gKiBAcmV0dXJucyBhIGBSZXNvbHZlZFZhbHVlYCByZXByZXNlbnRpbmcgdGhlIHJlc29sdmVkIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGF0aWNhbGx5UmVzb2x2ZShub2RlOiB0cy5FeHByZXNzaW9uLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IFJlc29sdmVkVmFsdWUge1xuICByZXR1cm4gbmV3IFN0YXRpY0ludGVycHJldGVyKFxuICAgICAgICAgICAgIGNoZWNrZXIsIG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCksIEFsbG93UmVmZXJlbmNlcy5ObylcbiAgICAgIC52aXNpdChub2RlKTtcbn1cblxuaW50ZXJmYWNlIEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgbGl0ZXJhbDogYm9vbGVhbjtcbiAgb3A6IChhOiBhbnksIGI6IGFueSkgPT4gUmVzb2x2ZWRWYWx1ZTtcbn1cblxuZnVuY3Rpb24gbGl0ZXJhbEJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogdHJ1ZX07XG59XG5cbmZ1bmN0aW9uIHJlZmVyZW5jZUJpbmFyeU9wKG9wOiAoYTogYW55LCBiOiBhbnkpID0+IGFueSk6IEJpbmFyeU9wZXJhdG9yRGVmIHtcbiAgcmV0dXJuIHtvcCwgbGl0ZXJhbDogZmFsc2V9O1xufVxuXG5jb25zdCBCSU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCBCaW5hcnlPcGVyYXRvckRlZj4oW1xuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSArIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTWludXNUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIC0gYildLFxuICBbdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgKiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLlNsYXNoVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSAvIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgJiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkJhclRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgfCBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkNhcmV0VG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSBeIGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDwgYildLFxuICBbdHMuU3ludGF4S2luZC5MZXNzVGhhbkVxdWFsc1Rva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPD0gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW4sIGxpdGVyYWxCaW5hcnlPcCgoYSwgYikgPT4gYSA+PSBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkxlc3NUaGFuTGVzc1RoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhIDw8IGIpXSxcbiAgW3RzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5HcmVhdGVyVGhhblRva2VuLCBsaXRlcmFsQmluYXJ5T3AoKGEsIGIpID0+IGEgPj4gYildLFxuICBbdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkdyZWF0ZXJUaGFuR3JlYXRlclRoYW5Ub2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBhID4+PiBiKV0sXG4gIFt0cy5TeW50YXhLaW5kLkFzdGVyaXNrQXN0ZXJpc2tUb2tlbiwgbGl0ZXJhbEJpbmFyeU9wKChhLCBiKSA9PiBNYXRoLnBvdyhhLCBiKSldLFxuICBbdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgJiYgYildLFxuICBbdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiwgcmVmZXJlbmNlQmluYXJ5T3AoKGEsIGIpID0+IGEgfHwgYildXG5dKTtcblxuY29uc3QgVU5BUllfT1BFUkFUT1JTID0gbmV3IE1hcDx0cy5TeW50YXhLaW5kLCAoYTogYW55KSA9PiBhbnk+KFtcbiAgW3RzLlN5bnRheEtpbmQuVGlsZGVUb2tlbiwgYSA9PiB+YV0sIFt0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sIGEgPT4gLWFdLFxuICBbdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sIGEgPT4gK2FdLCBbdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLCBhID0+ICFhXVxuXSk7XG5cbmNsYXNzIFN0YXRpY0ludGVycHJldGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHNjb3BlOiBTY29wZSxcbiAgICAgIHByaXZhdGUgYWxsb3dSZWZlcmVuY2VzOiBBbGxvd1JlZmVyZW5jZXMpIHt9XG5cbiAgdmlzaXQobm9kZTogdHMuRXhwcmVzc2lvbik6IFJlc29sdmVkVmFsdWUgeyByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZSk7IH1cblxuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihub2RlOiB0cy5FeHByZXNzaW9uKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0cy5pc051bWVyaWNMaXRlcmFsKG5vZGUpKSB7XG4gICAgICByZXR1cm4gcGFyc2VGbG9hdChub2RlLnRleHQpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRJZGVudGlmaWVyKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRDYWxsRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdENvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJlZml4VW5hcnlFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRCaW5hcnlFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQXNFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzTm9uTnVsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdERlY2xhcmF0aW9uKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRFlOQU1JQ19WQUxVRTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgYXJyYXk6IFJlc29sdmVkVmFsdWVBcnJheSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZWxlbWVudCA9IG5vZGUuZWxlbWVudHNbaV07XG4gICAgICBpZiAodHMuaXNTcHJlYWRFbGVtZW50KGVsZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IHNwcmVhZCA9IHRoaXMudmlzaXRFeHByZXNzaW9uKGVsZW1lbnQuZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChpc0R5bmFtaWNWYWx1ZShzcHJlYWQpKSB7XG4gICAgICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHNwcmVhZCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgdmFsdWUgaW4gc3ByZWFkIGV4cHJlc3Npb246ICR7c3ByZWFkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJyYXkucHVzaCguLi5zcHJlYWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy52aXNpdEV4cHJlc3Npb24oZWxlbWVudCk7XG4gICAgICAgIGlmIChpc0R5bmFtaWNWYWx1ZShyZXN1bHQpKSB7XG4gICAgICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgICAgIH1cblxuICAgICAgICBhcnJheS5wdXNoKHJlc3VsdCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IG1hcDogUmVzb2x2ZWRWYWx1ZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5wcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllc1tpXTtcbiAgICAgIGlmICh0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUocHJvcGVydHkubmFtZSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbmFtZSBjYW4gYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICAgICAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgICAgIH1cblxuICAgICAgICBtYXAuc2V0KG5hbWUsIHRoaXMudmlzaXRFeHByZXNzaW9uKHByb3BlcnR5LmluaXRpYWxpemVyKSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzU2hvcnRoYW5kUHJvcGVydHlBc3NpZ25tZW50KHByb3BlcnR5KSkge1xuICAgICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U2hvcnRoYW5kQXNzaWdubWVudFZhbHVlU3ltYm9sKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKHN5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gRFlOQU1JQ19WQUxVRTtcbiAgICAgICAgfVxuICAgICAgICBtYXAuc2V0KHByb3BlcnR5Lm5hbWUudGV4dCwgdGhpcy52aXNpdERlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzU3ByZWFkQXNzaWdubWVudChwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29uc3Qgc3ByZWFkID0gdGhpcy52aXNpdEV4cHJlc3Npb24ocHJvcGVydHkuZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChpc0R5bmFtaWNWYWx1ZShzcHJlYWQpKSB7XG4gICAgICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEoc3ByZWFkIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB2YWx1ZSBpbiBzcHJlYWQgYXNzaWdubWVudDogJHtzcHJlYWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ByZWFkLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IG1hcC5zZXQoa2V5LCB2YWx1ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0SWRlbnRpZmllcihub2RlOiB0cy5JZGVudGlmaWVyKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgbGV0IHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIGlmIChzeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudmlzaXRTeW1ib2woc3ltYm9sKTtcbiAgICBpZiAodGhpcy5hbGxvd1JlZmVyZW5jZXMgPT09IEFsbG93UmVmZXJlbmNlcy5ZZXMgJiYgaXNEeW5hbWljVmFsdWUocmVzdWx0KSkge1xuICAgICAgcmV0dXJuIG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0U3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgd2hpbGUgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChzeW1ib2wpO1xuICAgIH1cblxuICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBEWU5BTUlDX1ZBTFVFO1xuICAgIH1cblxuICAgIGlmIChzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdERlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3ltYm9sLmRlY2xhcmF0aW9ucy5yZWR1Y2U8UmVzb2x2ZWRWYWx1ZT4oKHByZXYsIGRlY2wpID0+IHtcbiAgICAgIGlmICghKGlzRHluYW1pY1ZhbHVlKHByZXYpIHx8IHByZXYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudmlzaXREZWNsYXJhdGlvbihkZWNsKTtcbiAgICB9LCBEWU5BTUlDX1ZBTFVFKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXREZWNsYXJhdGlvbihub2RlOiB0cy5EZWNsYXJhdGlvbik6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGlmICghbm9kZS5pbml0aWFsaXplcikge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQYXJhbWV0ZXIobm9kZSkgJiYgdGhpcy5zY29wZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlLmdldChub2RlKSAhO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFeHBvcnRBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU291cmNlRmlsZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudmlzaXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbGxvd1JlZmVyZW5jZXMgPT09IEFsbG93UmVmZXJlbmNlcy5ZZXMgPyBuZXcgUmVmZXJlbmNlKG5vZGUpIDogRFlOQU1JQ19WQUxVRTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbik6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMud2l0aFJlZmVyZW5jZXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgaWYgKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJndW1lbnQgaW4gRWxlbWVudEFjY2Vzc0V4cHJlc3Npb25gKTtcbiAgICB9XG4gICAgaWYgKGlzRHluYW1pY1ZhbHVlKGxocykpIHtcbiAgICAgIHJldHVybiBEWU5BTUlDX1ZBTFVFO1xuICAgIH1cbiAgICBjb25zdCByaHMgPSB0aGlzLndpdGhOb1JlZmVyZW5jZXMudmlzaXRFeHByZXNzaW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICBpZiAoaXNEeW5hbWljVmFsdWUocmhzKSkge1xuICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcmhzICE9PSAnc3RyaW5nJyAmJiB0eXBlb2YgcmhzICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFbGVtZW50QWNjZXNzRXhwcmVzc2lvbiBpbmRleCBzaG91bGQgYmUgc3RyaW5nIG9yIG51bWJlciwgZ290ICR7dHlwZW9mIHJoc306ICR7cmhzfWApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFjY2Vzc0hlbHBlcihsaHMsIHJocyk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbik6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGxocyA9IHRoaXMud2l0aFJlZmVyZW5jZXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgY29uc3QgcmhzID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgLy8gVE9ETzogaGFuZGxlIHJlZmVyZW5jZSB0byBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICBpZiAoaXNEeW5hbWljVmFsdWUobGhzKSkge1xuICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzSGVscGVyKGxocywgcmhzKTtcbiAgfVxuXG4gIHByaXZhdGUgdmlzaXRTb3VyY2VGaWxlKG5vZGU6IHRzLlNvdXJjZUZpbGUpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgUmVzb2x2ZWRWYWx1ZT4oKTtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlKTtcbiAgICBpZiAoc3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBEWU5BTUlDX1ZBTFVFO1xuICAgIH1cbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShzeW1ib2wpO1xuICAgIGV4cG9ydHMuZm9yRWFjaChzeW1ib2wgPT4gbWFwLnNldChzeW1ib2wubmFtZSwgdGhpcy52aXNpdFN5bWJvbChzeW1ib2wpKSk7XG5cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcHJpdmF0ZSBhY2Nlc3NIZWxwZXIobGhzOiBSZXNvbHZlZFZhbHVlLCByaHM6IHN0cmluZ3xudW1iZXIpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBzdHJJbmRleCA9IGAke3Joc31gO1xuICAgIGlmIChsaHMgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGlmIChsaHMuaGFzKHN0ckluZGV4KSkge1xuICAgICAgICByZXR1cm4gbGhzLmdldChzdHJJbmRleCkgITtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtYXAgYWNjZXNzOiBbJHtBcnJheS5mcm9tKGxocy5rZXlzKCkpfV0gZG90ICR7cmhzfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShsaHMpKSB7XG4gICAgICBpZiAocmhzID09PSAnbGVuZ3RoJykge1xuICAgICAgICByZXR1cm4gcmhzLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcmhzICE9PSAnbnVtYmVyJyB8fCAhTnVtYmVyLmlzSW50ZWdlcihyaHMpKSB7XG4gICAgICAgIHJldHVybiBEWU5BTUlDX1ZBTFVFO1xuICAgICAgfVxuICAgICAgaWYgKHJocyA8IDAgfHwgcmhzID49IGxocy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmRleCBvdXQgb2YgYm91bmRzOiAke3Joc30gdnMgJHtsaHMubGVuZ3RofWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxoc1tyaHNdO1xuICAgIH0gZWxzZSBpZiAobGhzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBjb25zdCByZWYgPSBsaHMubm9kZTtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmKSkge1xuICAgICAgICBsZXQgdmFsdWU6IFJlc29sdmVkVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHJlZi5tZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gaXNTdGF0aWMobWVtYmVyKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lbWJlciA9PiBtZW1iZXIubmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobWVtYmVyLm5hbWUpID09PSBzdHJJbmRleCk7XG4gICAgICAgIGlmIChtZW1iZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0cy5pc1Byb3BlcnR5RGVjbGFyYXRpb24obWVtYmVyKSAmJiBtZW1iZXIuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihtZW1iZXIuaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNNZXRob2REZWNsYXJhdGlvbihtZW1iZXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuYWxsb3dSZWZlcmVuY2VzID09PSBBbGxvd1JlZmVyZW5jZXMuWWVzID8gbmV3IFJlZmVyZW5jZShtZW1iZXIpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEWU5BTUlDX1ZBTFVFO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkb3QgcHJvcGVydHkgYWNjZXNzOiAke2xoc30gZG90ICR7cmhzfWApO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENhbGxFeHByZXNzaW9uKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgbGhzID0gdGhpcy53aXRoUmVmZXJlbmNlcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKTtcbiAgICBpZiAoIShsaHMgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGF0dGVtcHRpbmcgdG8gY2FsbCBzb21ldGhpbmcgdGhhdCBpcyBub3QgYSBmdW5jdGlvbjogJHtsaHN9YCk7XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbk9yTWV0aG9kRGVjbGFyYXRpb24obGhzLm5vZGUpIHx8ICFsaHMubm9kZS5ib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYGNhbGxpbmcgc29tZXRoaW5nIHRoYXQgaXMgbm90IGEgZnVuY3Rpb24gZGVjbGFyYXRpb24/ICR7dHMuU3ludGF4S2luZFtsaHMubm9kZS5raW5kXX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBmbiA9IGxocy5ub2RlO1xuICAgIGNvbnN0IGJvZHkgPSBmbi5ib2R5IGFzIHRzLkJsb2NrO1xuICAgIGlmIChib2R5LnN0YXRlbWVudHMubGVuZ3RoICE9PSAxIHx8ICF0cy5pc1JldHVyblN0YXRlbWVudChib2R5LnN0YXRlbWVudHNbMF0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Z1bmN0aW9uIGJvZHkgbXVzdCBoYXZlIGEgc2luZ2xlIHJldHVybiBzdGF0ZW1lbnQgb25seS4nKTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gYm9keS5zdGF0ZW1lbnRzWzBdIGFzIHRzLlJldHVyblN0YXRlbWVudDtcblxuICAgIGNvbnN0IG5ld1Njb3BlOiBTY29wZSA9IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCk7XG4gICAgZm4ucGFyYW1ldGVycy5mb3JFYWNoKChwYXJhbSwgaW5kZXgpID0+IHtcbiAgICAgIGxldCB2YWx1ZTogUmVzb2x2ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpbmRleCA8IG5vZGUuYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhcmcgPSBub2RlLmFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgIHZhbHVlID0gdGhpcy52aXNpdEV4cHJlc3Npb24oYXJnKTtcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIHBhcmFtLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihwYXJhbS5pbml0aWFsaXplcik7XG4gICAgICB9XG4gICAgICBuZXdTY29wZS5zZXQocGFyYW0sIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQuZXhwcmVzc2lvbiAhPT0gdW5kZWZpbmVkID8gdGhpcy53aXRoU2NvcGUobmV3U2NvcGUpLnZpc2l0RXhwcmVzc2lvbihyZXQuZXhwcmVzc2lvbikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdENvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlOiB0cy5Db25kaXRpb25hbEV4cHJlc3Npb24pOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLndpdGhOb1JlZmVyZW5jZXMudmlzaXRFeHByZXNzaW9uKG5vZGUuY29uZGl0aW9uKTtcbiAgICBpZiAoaXNEeW5hbWljVmFsdWUoY29uZGl0aW9uKSkge1xuICAgICAgcmV0dXJuIGNvbmRpdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLndoZW5GYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2aXNpdFByZWZpeFVuYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5QcmVmaXhVbmFyeUV4cHJlc3Npb24pOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBjb25zdCBvcGVyYXRvcktpbmQgPSBub2RlLm9wZXJhdG9yO1xuICAgIGlmICghVU5BUllfT1BFUkFUT1JTLmhhcyhvcGVyYXRvcktpbmQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByZWZpeCB1bmFyeSBvcGVyYXRvcjogJHt0cy5TeW50YXhLaW5kW29wZXJhdG9yS2luZF19YCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3AgPSBVTkFSWV9PUEVSQVRPUlMuZ2V0KG9wZXJhdG9yS2luZCkgITtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudmlzaXRFeHByZXNzaW9uKG5vZGUub3BlcmFuZCk7XG4gICAgcmV0dXJuIGlzRHluYW1pY1ZhbHVlKHZhbHVlKSA/IERZTkFNSUNfVkFMVUUgOiBvcCh2YWx1ZSk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0QmluYXJ5RXhwcmVzc2lvbihub2RlOiB0cy5CaW5hcnlFeHByZXNzaW9uKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgdG9rZW5LaW5kID0gbm9kZS5vcGVyYXRvclRva2VuLmtpbmQ7XG4gICAgaWYgKCFCSU5BUllfT1BFUkFUT1JTLmhhcyh0b2tlbktpbmQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGJpbmFyeSBvcGVyYXRvcjogJHt0cy5TeW50YXhLaW5kW3Rva2VuS2luZF19YCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BSZWNvcmQgPSBCSU5BUllfT1BFUkFUT1JTLmdldCh0b2tlbktpbmQpICE7XG4gICAgbGV0IGxoczogUmVzb2x2ZWRWYWx1ZSwgcmhzOiBSZXNvbHZlZFZhbHVlO1xuICAgIGlmIChvcFJlY29yZC5saXRlcmFsKSB7XG4gICAgICBjb25zdCB3aXRoTm9SZWZlcmVuY2VzID0gdGhpcy53aXRoTm9SZWZlcmVuY2VzO1xuICAgICAgbGhzID0gbGl0ZXJhbCh3aXRoTm9SZWZlcmVuY2VzLnZpc2l0RXhwcmVzc2lvbihub2RlLmxlZnQpKTtcbiAgICAgIHJocyA9IGxpdGVyYWwod2l0aE5vUmVmZXJlbmNlcy52aXNpdEV4cHJlc3Npb24obm9kZS5yaWdodCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaHMgPSB0aGlzLnZpc2l0RXhwcmVzc2lvbihub2RlLmxlZnQpO1xuICAgICAgcmhzID0gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5yaWdodCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlzRHluYW1pY1ZhbHVlKGxocykgfHwgaXNEeW5hbWljVmFsdWUocmhzKSA/IERZTkFNSUNfVkFMVUUgOiBvcFJlY29yZC5vcChsaHMsIHJocyk7XG4gIH1cblxuICBwcml2YXRlIHZpc2l0UGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZTogdHMuUGFyZW50aGVzaXplZEV4cHJlc3Npb24pOiBSZXNvbHZlZFZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy52aXNpdEV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgc3RyaW5nTmFtZUZyb21Qcm9wZXJ0eU5hbWUobm9kZTogdHMuUHJvcGVydHlOYW1lKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihub2RlKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOdW1lcmljTGl0ZXJhbChub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICB9IGVsc2UgeyAgLy8gdHMuQ29tcHV0ZWRQcm9wZXJ0eU5hbWVcbiAgICAgIGNvbnN0IGxpdGVyYWwgPSB0aGlzLndpdGhOb1JlZmVyZW5jZXMudmlzaXRFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgICByZXR1cm4gdHlwZW9mIGxpdGVyYWwgPT09ICdzdHJpbmcnID8gbGl0ZXJhbCA6IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldCB3aXRoUmVmZXJlbmNlcygpOiBTdGF0aWNJbnRlcnByZXRlciB7XG4gICAgcmV0dXJuIHRoaXMuYWxsb3dSZWZlcmVuY2VzID09PSBBbGxvd1JlZmVyZW5jZXMuWWVzID9cbiAgICAgICAgdGhpcyA6XG4gICAgICAgIG5ldyBTdGF0aWNJbnRlcnByZXRlcih0aGlzLmNoZWNrZXIsIHRoaXMuc2NvcGUsIEFsbG93UmVmZXJlbmNlcy5ZZXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgd2l0aE5vUmVmZXJlbmNlcygpOiBTdGF0aWNJbnRlcnByZXRlciB7XG4gICAgcmV0dXJuIHRoaXMuYWxsb3dSZWZlcmVuY2VzID09PSBBbGxvd1JlZmVyZW5jZXMuTm8gP1xuICAgICAgICB0aGlzIDpcbiAgICAgICAgbmV3IFN0YXRpY0ludGVycHJldGVyKHRoaXMuY2hlY2tlciwgdGhpcy5zY29wZSwgQWxsb3dSZWZlcmVuY2VzLk5vKTtcbiAgfVxuXG4gIHByaXZhdGUgd2l0aFNjb3BlKHNjb3BlOiBTY29wZSk6IFN0YXRpY0ludGVycHJldGVyIHtcbiAgICByZXR1cm4gbmV3IFN0YXRpY0ludGVycHJldGVyKHRoaXMuY2hlY2tlciwgc2NvcGUsIHRoaXMuYWxsb3dSZWZlcmVuY2VzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1N0YXRpYyhlbGVtZW50OiB0cy5DbGFzc0VsZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIGVsZW1lbnQubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGVsZW1lbnQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uT3JNZXRob2REZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBsaXRlcmFsKHZhbHVlOiBSZXNvbHZlZFZhbHVlKTogYW55IHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fFxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoaXNEeW5hbWljVmFsdWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSAke3ZhbHVlfSBpcyBub3QgbGl0ZXJhbCBhbmQgY2Fubm90IGJlIHVzZWQgaW4gdGhpcyBjb250ZXh0LmApO1xufVxuIl19