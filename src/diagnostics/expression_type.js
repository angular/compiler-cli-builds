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
        define("@angular/compiler-cli/src/diagnostics/expression_type", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/diagnostics/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var symbols_1 = require("@angular/compiler-cli/src/diagnostics/symbols");
    var DiagnosticKind;
    (function (DiagnosticKind) {
        DiagnosticKind[DiagnosticKind["Error"] = 0] = "Error";
        DiagnosticKind[DiagnosticKind["Warning"] = 1] = "Warning";
    })(DiagnosticKind = exports.DiagnosticKind || (exports.DiagnosticKind = {}));
    var TypeDiagnostic = /** @class */ (function () {
        function TypeDiagnostic(kind, message, ast) {
            this.kind = kind;
            this.message = message;
            this.ast = ast;
        }
        return TypeDiagnostic;
    }());
    exports.TypeDiagnostic = TypeDiagnostic;
    // AstType calculatetype of the ast given AST element.
    var AstType = /** @class */ (function () {
        function AstType(scope, query, context) {
            this.scope = scope;
            this.query = query;
            this.context = context;
        }
        AstType.prototype.getType = function (ast) { return ast.visit(this); };
        AstType.prototype.getDiagnostics = function (ast) {
            this.diagnostics = [];
            var type = ast.visit(this);
            if (this.context.event && type.callable) {
                this.reportWarning('Unexpected callable expression. Expected a method call', ast);
            }
            return this.diagnostics;
        };
        AstType.prototype.visitBinary = function (ast) {
            var _this_1 = this;
            // Treat undefined and null as other.
            function normalize(kind, other) {
                switch (kind) {
                    case symbols_1.BuiltinType.Undefined:
                    case symbols_1.BuiltinType.Null:
                        return normalize(other, symbols_1.BuiltinType.Other);
                }
                return kind;
            }
            var getType = function (ast, operation) {
                var type = _this_1.getType(ast);
                if (type.nullable) {
                    switch (operation) {
                        case '&&':
                        case '||':
                        case '==':
                        case '!=':
                        case '===':
                        case '!==':
                            // Nullable allowed.
                            break;
                        default:
                            _this_1.reportError("The expression might be null", ast);
                            break;
                    }
                    return _this_1.query.getNonNullableType(type);
                }
                return type;
            };
            var leftType = getType(ast.left, ast.operation);
            var rightType = getType(ast.right, ast.operation);
            var leftRawKind = this.query.getTypeKind(leftType);
            var rightRawKind = this.query.getTypeKind(rightType);
            var leftKind = normalize(leftRawKind, rightRawKind);
            var rightKind = normalize(rightRawKind, leftRawKind);
            // The following swtich implements operator typing similar to the
            // type production tables in the TypeScript specification.
            // https://github.com/Microsoft/TypeScript/blob/v1.8.10/doc/spec.md#4.19
            var operKind = leftKind << 8 | rightKind;
            switch (ast.operation) {
                case '*':
                case '/':
                case '%':
                case '-':
                case '<<':
                case '>>':
                case '>>>':
                case '&':
                case '^':
                case '|':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        default:
                            var errorAst = ast.left;
                            switch (leftKind) {
                                case symbols_1.BuiltinType.Any:
                                case symbols_1.BuiltinType.Number:
                                    errorAst = ast.right;
                                    break;
                            }
                            return this.reportError('Expected a numeric type', errorAst);
                    }
                case '+':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Any:
                            return this.anyType;
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.String:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.String);
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Number:
                            return this.reportError('Expected a number type', ast.left);
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Other:
                            return this.reportError('Expected a number type', ast.right);
                        default:
                            return this.reportError('Expected operands to be a string or number type', ast);
                    }
                case '>':
                case '<':
                case '<=':
                case '>=':
                case '==':
                case '!=':
                case '===':
                case '!==':
                    switch (operKind) {
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Any << 8 | symbols_1.BuiltinType.Other:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Boolean << 8 | symbols_1.BuiltinType.Boolean:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Number << 8 | symbols_1.BuiltinType.Number:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.String << 8 | symbols_1.BuiltinType.String:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Any:
                        case symbols_1.BuiltinType.Other << 8 | symbols_1.BuiltinType.Other:
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
                        default:
                            return this.reportError('Expected the operants to be of similar type or any', ast);
                    }
                case '&&':
                    return rightType;
                case '||':
                    return this.query.getTypeUnion(leftType, rightType);
            }
            return this.reportError("Unrecognized operator " + ast.operation, ast);
        };
        AstType.prototype.visitChain = function (ast) {
            if (this.diagnostics) {
                // If we are producing diagnostics, visit the children
                compiler_1.visitAstChildren(ast, this);
            }
            // The type of a chain is always undefined.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
        };
        AstType.prototype.visitConditional = function (ast) {
            // The type of a conditional is the union of the true and false conditions.
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            return this.query.getTypeUnion(this.getType(ast.trueExp), this.getType(ast.falseExp));
        };
        AstType.prototype.visitFunctionCall = function (ast) {
            var _this_1 = this;
            // The type of a function call is the return type of the selected signature.
            // The signature is selected based on the types of the arguments. Angular doesn't
            // support contextual typing of arguments so this is simpler than TypeScript's
            // version.
            var args = ast.args.map(function (arg) { return _this_1.getType(arg); });
            var target = this.getType(ast.target);
            if (!target || !target.callable)
                return this.reportError('Call target is not callable', ast);
            var signature = target.selectSignature(args);
            if (signature)
                return signature.result;
            // TODO: Consider a better error message here.
            return this.reportError('Unable no compatible signature found for call', ast);
        };
        AstType.prototype.visitImplicitReceiver = function (ast) {
            var _this = this;
            // Return a pseudo-symbol for the implicit receiver.
            // The members of the implicit receiver are what is defined by the
            // scope passed into this class.
            return {
                name: '$implicit',
                kind: 'component',
                language: 'ng-template',
                type: undefined,
                container: undefined,
                callable: false,
                nullable: false,
                public: true,
                definition: undefined,
                members: function () { return _this.scope; },
                signatures: function () { return []; },
                selectSignature: function (types) { return undefined; },
                indexed: function (argument) { return undefined; }
            };
        };
        AstType.prototype.visitInterpolation = function (ast) {
            // If we are producing diagnostics, visit the children.
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            return this.undefinedType;
        };
        AstType.prototype.visitKeyedRead = function (ast) {
            var targetType = this.getType(ast.obj);
            var keyType = this.getType(ast.key);
            var result = targetType.indexed(keyType);
            return result || this.anyType;
        };
        AstType.prototype.visitKeyedWrite = function (ast) {
            // The write of a type is the type of the value being written.
            return this.getType(ast.value);
        };
        AstType.prototype.visitLiteralArray = function (ast) {
            var _a;
            var _this_1 = this;
            // A type literal is an array type of the union of the elements
            return this.query.getArrayType((_a = this.query).getTypeUnion.apply(_a, tslib_1.__spread(ast.expressions.map(function (element) { return _this_1.getType(element); }))));
        };
        AstType.prototype.visitLiteralMap = function (ast) {
            // If we are producing diagnostics, visit the children
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            // TODO: Return a composite type.
            return this.anyType;
        };
        AstType.prototype.visitLiteralPrimitive = function (ast) {
            // The type of a literal primitive depends on the value of the literal.
            switch (ast.value) {
                case true:
                case false:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
                case null:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Null);
                case undefined:
                    return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
                default:
                    switch (typeof ast.value) {
                        case 'string':
                            return this.query.getBuiltinType(symbols_1.BuiltinType.String);
                        case 'number':
                            return this.query.getBuiltinType(symbols_1.BuiltinType.Number);
                        default:
                            return this.reportError('Unrecognized primitive', ast);
                    }
            }
        };
        AstType.prototype.visitMethodCall = function (ast) {
            return this.resolveMethodCall(this.getType(ast.receiver), ast);
        };
        AstType.prototype.visitPipe = function (ast) {
            var _this_1 = this;
            // The type of a pipe node is the return type of the pipe's transform method. The table returned
            // by getPipes() is expected to contain symbols with the corresponding transform method type.
            var pipe = this.query.getPipes().get(ast.name);
            if (!pipe)
                return this.reportError("No pipe by the name " + ast.name + " found", ast);
            var expType = this.getType(ast.exp);
            var signature = pipe.selectSignature([expType].concat(ast.args.map(function (arg) { return _this_1.getType(arg); })));
            if (!signature)
                return this.reportError('Unable to resolve signature for pipe invocation', ast);
            return signature.result;
        };
        AstType.prototype.visitPrefixNot = function (ast) {
            // If we are producing diagnostics, visit the children
            if (this.diagnostics) {
                compiler_1.visitAstChildren(ast, this);
            }
            // The type of a prefix ! is always boolean.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
        };
        AstType.prototype.visitNonNullAssert = function (ast) {
            var expressionType = this.getType(ast.expression);
            return this.query.getNonNullableType(expressionType);
        };
        AstType.prototype.visitPropertyRead = function (ast) {
            return this.resolvePropertyRead(this.getType(ast.receiver), ast);
        };
        AstType.prototype.visitPropertyWrite = function (ast) {
            // The type of a write is the type of the value being written.
            return this.getType(ast.value);
        };
        AstType.prototype.visitQuote = function (ast) {
            // The type of a quoted expression is any.
            return this.query.getBuiltinType(symbols_1.BuiltinType.Any);
        };
        AstType.prototype.visitSafeMethodCall = function (ast) {
            return this.resolveMethodCall(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
        };
        AstType.prototype.visitSafePropertyRead = function (ast) {
            return this.resolvePropertyRead(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
        };
        Object.defineProperty(AstType.prototype, "anyType", {
            get: function () {
                var result = this._anyType;
                if (!result) {
                    result = this._anyType = this.query.getBuiltinType(symbols_1.BuiltinType.Any);
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstType.prototype, "undefinedType", {
            get: function () {
                var result = this._undefinedType;
                if (!result) {
                    result = this._undefinedType = this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        AstType.prototype.resolveMethodCall = function (receiverType, ast) {
            var _this_1 = this;
            if (this.isAny(receiverType)) {
                return this.anyType;
            }
            // The type of a method is the selected methods result type.
            var method = receiverType.members().get(ast.name);
            if (!method)
                return this.reportError("Unknown method '" + ast.name + "'", ast);
            if (!method.type)
                return this.reportError("Could not find a type for '" + ast.name + "'", ast);
            if (!method.type.callable)
                return this.reportError("Member '" + ast.name + "' is not callable", ast);
            var signature = method.type.selectSignature(ast.args.map(function (arg) { return _this_1.getType(arg); }));
            if (!signature)
                return this.reportError("Unable to resolve signature for call of method " + ast.name, ast);
            return signature.result;
        };
        AstType.prototype.resolvePropertyRead = function (receiverType, ast) {
            if (this.isAny(receiverType)) {
                return this.anyType;
            }
            // The type of a property read is the seelcted member's type.
            var member = receiverType.members().get(ast.name);
            if (!member) {
                var receiverInfo = receiverType.name;
                if (receiverInfo == '$implicit') {
                    receiverInfo =
                        'The component declaration, template variable declarations, and element references do';
                }
                else if (receiverType.nullable) {
                    return this.reportError("The expression might be null", ast.receiver);
                }
                else {
                    receiverInfo = "'" + receiverInfo + "' does";
                }
                return this.reportError("Identifier '" + ast.name + "' is not defined. " + receiverInfo + " not contain such a member", ast);
            }
            if (!member.public) {
                var receiverInfo = receiverType.name;
                if (receiverInfo == '$implicit') {
                    receiverInfo = 'the component';
                }
                else {
                    receiverInfo = "'" + receiverInfo + "'";
                }
                this.reportWarning("Identifier '" + ast.name + "' refers to a private member of " + receiverInfo, ast);
            }
            return member.type;
        };
        AstType.prototype.reportError = function (message, ast) {
            if (this.diagnostics) {
                this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Error, message, ast));
            }
            return this.anyType;
        };
        AstType.prototype.reportWarning = function (message, ast) {
            if (this.diagnostics) {
                this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Warning, message, ast));
            }
            return this.anyType;
        };
        AstType.prototype.isAny = function (symbol) {
            return !symbol || this.query.getTypeKind(symbol) == symbols_1.BuiltinType.Any ||
                (!!symbol.type && this.isAny(symbol.type));
        };
        return AstType;
    }());
    exports.AstType = AstType;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwcmVzc2lvbl90eXBlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9kaWFnbm9zdGljcy9leHByZXNzaW9uX3R5cGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJVO0lBRTNVLHlFQUF5RjtJQUl6RixJQUFZLGNBR1g7SUFIRCxXQUFZLGNBQWM7UUFDeEIscURBQUssQ0FBQTtRQUNMLHlEQUFPLENBQUE7SUFDVCxDQUFDLEVBSFcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFHekI7SUFFRDtRQUNFLHdCQUFtQixJQUFvQixFQUFTLE9BQWUsRUFBUyxHQUFRO1lBQTdELFNBQUksR0FBSixJQUFJLENBQWdCO1lBQVMsWUFBTyxHQUFQLE9BQU8sQ0FBUTtZQUFTLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFBRyxDQUFDO1FBQ3RGLHFCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSx3Q0FBYztJQUkzQixzREFBc0Q7SUFDdEQ7UUFJRSxpQkFDWSxLQUFrQixFQUFVLEtBQWtCLEVBQzlDLE9BQXFDO1lBRHJDLFVBQUssR0FBTCxLQUFLLENBQWE7WUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFhO1lBQzlDLFlBQU8sR0FBUCxPQUFPLENBQThCO1FBQUcsQ0FBQztRQUVyRCx5QkFBTyxHQUFQLFVBQVEsR0FBUSxJQUFZLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckQsZ0NBQWMsR0FBZCxVQUFlLEdBQVE7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDdEIsSUFBTSxJQUFJLEdBQVcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLElB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SUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQy9FO1lBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3RCLENBQUM7UUFFTywrQkFBYSxHQUFyQixVQUFzQixPQUFlLEVBQUUsR0FBUTtZQUM3QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDakY7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEIsQ0FBQztRQUVPLHVCQUFLLEdBQWIsVUFBYyxNQUFjO1lBQzFCLE9BQU8sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUkscUJBQVcsQ0FBQyxHQUFHO2dCQUMvRCxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNILGNBQUM7SUFBRCxDQUFDLEFBclpELElBcVpDO0lBclpZLDBCQUFPIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQXN0VmlzaXRvciwgQmluYXJ5LCBCaW5kaW5nUGlwZSwgQ2hhaW4sIENvbmRpdGlvbmFsLCBGdW5jdGlvbkNhbGwsIEltcGxpY2l0UmVjZWl2ZXIsIEludGVycG9sYXRpb24sIEtleWVkUmVhZCwgS2V5ZWRXcml0ZSwgTGl0ZXJhbEFycmF5LCBMaXRlcmFsTWFwLCBMaXRlcmFsUHJpbWl0aXZlLCBNZXRob2RDYWxsLCBOb25OdWxsQXNzZXJ0LCBQcmVmaXhOb3QsIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgUXVvdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCB2aXNpdEFzdENoaWxkcmVufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7QnVpbHRpblR5cGUsIFNpZ25hdHVyZSwgU3BhbiwgU3ltYm9sLCBTeW1ib2xRdWVyeSwgU3ltYm9sVGFibGV9IGZyb20gJy4vc3ltYm9scyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXhwcmVzc2lvbkRpYWdub3N0aWNzQ29udGV4dCB7IGV2ZW50PzogYm9vbGVhbjsgfVxuXG5leHBvcnQgZW51bSBEaWFnbm9zdGljS2luZCB7XG4gIEVycm9yLFxuICBXYXJuaW5nLFxufVxuXG5leHBvcnQgY2xhc3MgVHlwZURpYWdub3N0aWMge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMga2luZDogRGlhZ25vc3RpY0tpbmQsIHB1YmxpYyBtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyBhc3Q6IEFTVCkge31cbn1cblxuLy8gQXN0VHlwZSBjYWxjdWxhdGV0eXBlIG9mIHRoZSBhc3QgZ2l2ZW4gQVNUIGVsZW1lbnQuXG5leHBvcnQgY2xhc3MgQXN0VHlwZSBpbXBsZW1lbnRzIEFzdFZpc2l0b3Ige1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHVibGljIGRpYWdub3N0aWNzICE6IFR5cGVEaWFnbm9zdGljW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHNjb3BlOiBTeW1ib2xUYWJsZSwgcHJpdmF0ZSBxdWVyeTogU3ltYm9sUXVlcnksXG4gICAgICBwcml2YXRlIGNvbnRleHQ6IEV4cHJlc3Npb25EaWFnbm9zdGljc0NvbnRleHQpIHt9XG5cbiAgZ2V0VHlwZShhc3Q6IEFTVCk6IFN5bWJvbCB7IHJldHVybiBhc3QudmlzaXQodGhpcyk7IH1cblxuICBnZXREaWFnbm9zdGljcyhhc3Q6IEFTVCk6IFR5cGVEaWFnbm9zdGljW10ge1xuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBbXTtcbiAgICBjb25zdCB0eXBlOiBTeW1ib2wgPSBhc3QudmlzaXQodGhpcyk7XG4gICAgaWYgKHRoaXMuY29udGV4dC5ldmVudCAmJiB0eXBlLmNhbGxhYmxlKSB7XG4gICAgICB0aGlzLnJlcG9ydFdhcm5pbmcoJ1VuZXhwZWN0ZWQgY2FsbGFibGUgZXhwcmVzc2lvbi4gRXhwZWN0ZWQgYSBtZXRob2QgY2FsbCcsIGFzdCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzO1xuICB9XG5cbiAgdmlzaXRCaW5hcnkoYXN0OiBCaW5hcnkpOiBTeW1ib2wge1xuICAgIC8vIFRyZWF0IHVuZGVmaW5lZCBhbmQgbnVsbCBhcyBvdGhlci5cbiAgICBmdW5jdGlvbiBub3JtYWxpemUoa2luZDogQnVpbHRpblR5cGUsIG90aGVyOiBCdWlsdGluVHlwZSk6IEJ1aWx0aW5UeXBlIHtcbiAgICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlVuZGVmaW5lZDpcbiAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdWxsOlxuICAgICAgICAgIHJldHVybiBub3JtYWxpemUob3RoZXIsIEJ1aWx0aW5UeXBlLk90aGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBraW5kO1xuICAgIH1cblxuICAgIGNvbnN0IGdldFR5cGUgPSAoYXN0OiBBU1QsIG9wZXJhdGlvbjogc3RyaW5nKTogU3ltYm9sID0+IHtcbiAgICAgIGNvbnN0IHR5cGUgPSB0aGlzLmdldFR5cGUoYXN0KTtcbiAgICAgIGlmICh0eXBlLm51bGxhYmxlKSB7XG4gICAgICAgIHN3aXRjaCAob3BlcmF0aW9uKSB7XG4gICAgICAgICAgY2FzZSAnJiYnOlxuICAgICAgICAgIGNhc2UgJ3x8JzpcbiAgICAgICAgICBjYXNlICc9PSc6XG4gICAgICAgICAgY2FzZSAnIT0nOlxuICAgICAgICAgIGNhc2UgJz09PSc6XG4gICAgICAgICAgY2FzZSAnIT09JzpcbiAgICAgICAgICAgIC8vIE51bGxhYmxlIGFsbG93ZWQuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhpcy5yZXBvcnRFcnJvcihgVGhlIGV4cHJlc3Npb24gbWlnaHQgYmUgbnVsbGAsIGFzdCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXROb25OdWxsYWJsZVR5cGUodHlwZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHlwZTtcbiAgICB9O1xuXG4gICAgY29uc3QgbGVmdFR5cGUgPSBnZXRUeXBlKGFzdC5sZWZ0LCBhc3Qub3BlcmF0aW9uKTtcbiAgICBjb25zdCByaWdodFR5cGUgPSBnZXRUeXBlKGFzdC5yaWdodCwgYXN0Lm9wZXJhdGlvbik7XG4gICAgY29uc3QgbGVmdFJhd0tpbmQgPSB0aGlzLnF1ZXJ5LmdldFR5cGVLaW5kKGxlZnRUeXBlKTtcbiAgICBjb25zdCByaWdodFJhd0tpbmQgPSB0aGlzLnF1ZXJ5LmdldFR5cGVLaW5kKHJpZ2h0VHlwZSk7XG4gICAgY29uc3QgbGVmdEtpbmQgPSBub3JtYWxpemUobGVmdFJhd0tpbmQsIHJpZ2h0UmF3S2luZCk7XG4gICAgY29uc3QgcmlnaHRLaW5kID0gbm9ybWFsaXplKHJpZ2h0UmF3S2luZCwgbGVmdFJhd0tpbmQpO1xuXG4gICAgLy8gVGhlIGZvbGxvd2luZyBzd3RpY2ggaW1wbGVtZW50cyBvcGVyYXRvciB0eXBpbmcgc2ltaWxhciB0byB0aGVcbiAgICAvLyB0eXBlIHByb2R1Y3Rpb24gdGFibGVzIGluIHRoZSBUeXBlU2NyaXB0IHNwZWNpZmljYXRpb24uXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjEuOC4xMC9kb2Mvc3BlYy5tZCM0LjE5XG4gICAgY29uc3Qgb3BlcktpbmQgPSBsZWZ0S2luZCA8PCA4IHwgcmlnaHRLaW5kO1xuICAgIHN3aXRjaCAoYXN0Lm9wZXJhdGlvbikge1xuICAgICAgY2FzZSAnKic6XG4gICAgICBjYXNlICcvJzpcbiAgICAgIGNhc2UgJyUnOlxuICAgICAgY2FzZSAnLSc6XG4gICAgICBjYXNlICc8PCc6XG4gICAgICBjYXNlICc+Pic6XG4gICAgICBjYXNlICc+Pj4nOlxuICAgICAgY2FzZSAnJic6XG4gICAgICBjYXNlICdeJzpcbiAgICAgIGNhc2UgJ3wnOlxuICAgICAgICBzd2l0Y2ggKG9wZXJLaW5kKSB7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLk51bWJlcik7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGxldCBlcnJvckFzdCA9IGFzdC5sZWZ0O1xuICAgICAgICAgICAgc3dpdGNoIChsZWZ0S2luZCkge1xuICAgICAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgICAgICAgZXJyb3JBc3QgPSBhc3QucmlnaHQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignRXhwZWN0ZWQgYSBudW1lcmljIHR5cGUnLCBlcnJvckFzdCk7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgJysnOlxuICAgICAgICBzd2l0Y2ggKG9wZXJLaW5kKSB7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkJvb2xlYW4gPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFueVR5cGU7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkJvb2xlYW4gPDwgOCB8IEJ1aWx0aW5UeXBlLlN0cmluZzpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5Bbnk6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLkJvb2xlYW46XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuU3RyaW5nIDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk90aGVyIDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5TdHJpbmcpO1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdW1iZXIpO1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLk51bWJlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdFeHBlY3RlZCBhIG51bWJlciB0eXBlJywgYXN0LmxlZnQpO1xuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5Cb29sZWFuOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKCdFeHBlY3RlZCBhIG51bWJlciB0eXBlJywgYXN0LnJpZ2h0KTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoJ0V4cGVjdGVkIG9wZXJhbmRzIHRvIGJlIGEgc3RyaW5nIG9yIG51bWJlciB0eXBlJywgYXN0KTtcbiAgICAgICAgfVxuICAgICAgY2FzZSAnPic6XG4gICAgICBjYXNlICc8JzpcbiAgICAgIGNhc2UgJzw9JzpcbiAgICAgIGNhc2UgJz49JzpcbiAgICAgIGNhc2UgJz09JzpcbiAgICAgIGNhc2UgJyE9JzpcbiAgICAgIGNhc2UgJz09PSc6XG4gICAgICBjYXNlICchPT0nOlxuICAgICAgICBzd2l0Y2ggKG9wZXJLaW5kKSB7XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLkFueSA8PCA4IHwgQnVpbHRpblR5cGUuTnVtYmVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQW55IDw8IDggfCBCdWlsdGluVHlwZS5TdHJpbmc6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5BbnkgPDwgOCB8IEJ1aWx0aW5UeXBlLk90aGVyOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuQm9vbGVhbiA8PCA4IHwgQnVpbHRpblR5cGUuQm9vbGVhbjpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk51bWJlciA8PCA4IHwgQnVpbHRpblR5cGUuQW55OlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuTnVtYmVyIDw8IDggfCBCdWlsdGluVHlwZS5OdW1iZXI6XG4gICAgICAgICAgY2FzZSBCdWlsdGluVHlwZS5TdHJpbmcgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLlN0cmluZyA8PCA4IHwgQnVpbHRpblR5cGUuU3RyaW5nOlxuICAgICAgICAgIGNhc2UgQnVpbHRpblR5cGUuT3RoZXIgPDwgOCB8IEJ1aWx0aW5UeXBlLkFueTpcbiAgICAgICAgICBjYXNlIEJ1aWx0aW5UeXBlLk90aGVyIDw8IDggfCBCdWlsdGluVHlwZS5PdGhlcjpcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkJvb2xlYW4pO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignRXhwZWN0ZWQgdGhlIG9wZXJhbnRzIHRvIGJlIG9mIHNpbWlsYXIgdHlwZSBvciBhbnknLCBhc3QpO1xuICAgICAgICB9XG4gICAgICBjYXNlICcmJic6XG4gICAgICAgIHJldHVybiByaWdodFR5cGU7XG4gICAgICBjYXNlICd8fCc6XG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldFR5cGVVbmlvbihsZWZ0VHlwZSwgcmlnaHRUeXBlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcihgVW5yZWNvZ25pemVkIG9wZXJhdG9yICR7YXN0Lm9wZXJhdGlvbn1gLCBhc3QpO1xuICB9XG5cbiAgdmlzaXRDaGFpbihhc3Q6IENoYWluKSB7XG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIC8vIElmIHdlIGFyZSBwcm9kdWNpbmcgZGlhZ25vc3RpY3MsIHZpc2l0IHRoZSBjaGlsZHJlblxuICAgICAgdmlzaXRBc3RDaGlsZHJlbihhc3QsIHRoaXMpO1xuICAgIH1cbiAgICAvLyBUaGUgdHlwZSBvZiBhIGNoYWluIGlzIGFsd2F5cyB1bmRlZmluZWQuXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuVW5kZWZpbmVkKTtcbiAgfVxuXG4gIHZpc2l0Q29uZGl0aW9uYWwoYXN0OiBDb25kaXRpb25hbCkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgY29uZGl0aW9uYWwgaXMgdGhlIHVuaW9uIG9mIHRoZSB0cnVlIGFuZCBmYWxzZSBjb25kaXRpb25zLlxuICAgIGlmICh0aGlzLmRpYWdub3N0aWNzKSB7XG4gICAgICB2aXNpdEFzdENoaWxkcmVuKGFzdCwgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldFR5cGVVbmlvbih0aGlzLmdldFR5cGUoYXN0LnRydWVFeHApLCB0aGlzLmdldFR5cGUoYXN0LmZhbHNlRXhwKSk7XG4gIH1cblxuICB2aXNpdEZ1bmN0aW9uQ2FsbChhc3Q6IEZ1bmN0aW9uQ2FsbCkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgZnVuY3Rpb24gY2FsbCBpcyB0aGUgcmV0dXJuIHR5cGUgb2YgdGhlIHNlbGVjdGVkIHNpZ25hdHVyZS5cbiAgICAvLyBUaGUgc2lnbmF0dXJlIGlzIHNlbGVjdGVkIGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0aGUgYXJndW1lbnRzLiBBbmd1bGFyIGRvZXNuJ3RcbiAgICAvLyBzdXBwb3J0IGNvbnRleHR1YWwgdHlwaW5nIG9mIGFyZ3VtZW50cyBzbyB0aGlzIGlzIHNpbXBsZXIgdGhhbiBUeXBlU2NyaXB0J3NcbiAgICAvLyB2ZXJzaW9uLlxuICAgIGNvbnN0IGFyZ3MgPSBhc3QuYXJncy5tYXAoYXJnID0+IHRoaXMuZ2V0VHlwZShhcmcpKTtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldFR5cGUoYXN0LnRhcmdldCAhKTtcbiAgICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0LmNhbGxhYmxlKSByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignQ2FsbCB0YXJnZXQgaXMgbm90IGNhbGxhYmxlJywgYXN0KTtcbiAgICBjb25zdCBzaWduYXR1cmUgPSB0YXJnZXQuc2VsZWN0U2lnbmF0dXJlKGFyZ3MpO1xuICAgIGlmIChzaWduYXR1cmUpIHJldHVybiBzaWduYXR1cmUucmVzdWx0O1xuICAgIC8vIFRPRE86IENvbnNpZGVyIGEgYmV0dGVyIGVycm9yIG1lc3NhZ2UgaGVyZS5cbiAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignVW5hYmxlIG5vIGNvbXBhdGlibGUgc2lnbmF0dXJlIGZvdW5kIGZvciBjYWxsJywgYXN0KTtcbiAgfVxuXG4gIHZpc2l0SW1wbGljaXRSZWNlaXZlcihhc3Q6IEltcGxpY2l0UmVjZWl2ZXIpOiBTeW1ib2wge1xuICAgIGNvbnN0IF90aGlzID0gdGhpcztcbiAgICAvLyBSZXR1cm4gYSBwc2V1ZG8tc3ltYm9sIGZvciB0aGUgaW1wbGljaXQgcmVjZWl2ZXIuXG4gICAgLy8gVGhlIG1lbWJlcnMgb2YgdGhlIGltcGxpY2l0IHJlY2VpdmVyIGFyZSB3aGF0IGlzIGRlZmluZWQgYnkgdGhlXG4gICAgLy8gc2NvcGUgcGFzc2VkIGludG8gdGhpcyBjbGFzcy5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJyRpbXBsaWNpdCcsXG4gICAgICBraW5kOiAnY29tcG9uZW50JyxcbiAgICAgIGxhbmd1YWdlOiAnbmctdGVtcGxhdGUnLFxuICAgICAgdHlwZTogdW5kZWZpbmVkLFxuICAgICAgY29udGFpbmVyOiB1bmRlZmluZWQsXG4gICAgICBjYWxsYWJsZTogZmFsc2UsXG4gICAgICBudWxsYWJsZTogZmFsc2UsXG4gICAgICBwdWJsaWM6IHRydWUsXG4gICAgICBkZWZpbml0aW9uOiB1bmRlZmluZWQsXG4gICAgICBtZW1iZXJzKCk6IFN5bWJvbFRhYmxle3JldHVybiBfdGhpcy5zY29wZTt9LFxuICAgICAgc2lnbmF0dXJlcygpOiBTaWduYXR1cmVbXXtyZXR1cm4gW107fSxcbiAgICAgIHNlbGVjdFNpZ25hdHVyZSh0eXBlcyk6IFNpZ25hdHVyZSB8IHVuZGVmaW5lZHtyZXR1cm4gdW5kZWZpbmVkO30sXG4gICAgICBpbmRleGVkKGFyZ3VtZW50KTogU3ltYm9sIHwgdW5kZWZpbmVke3JldHVybiB1bmRlZmluZWQ7fVxuICAgIH07XG4gIH1cblxuICB2aXNpdEludGVycG9sYXRpb24oYXN0OiBJbnRlcnBvbGF0aW9uKTogU3ltYm9sIHtcbiAgICAvLyBJZiB3ZSBhcmUgcHJvZHVjaW5nIGRpYWdub3N0aWNzLCB2aXNpdCB0aGUgY2hpbGRyZW4uXG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIHZpc2l0QXN0Q2hpbGRyZW4oYXN0LCB0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudW5kZWZpbmVkVHlwZTtcbiAgfVxuXG4gIHZpc2l0S2V5ZWRSZWFkKGFzdDogS2V5ZWRSZWFkKTogU3ltYm9sIHtcbiAgICBjb25zdCB0YXJnZXRUeXBlID0gdGhpcy5nZXRUeXBlKGFzdC5vYmopO1xuICAgIGNvbnN0IGtleVR5cGUgPSB0aGlzLmdldFR5cGUoYXN0LmtleSk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGFyZ2V0VHlwZS5pbmRleGVkKGtleVR5cGUpO1xuICAgIHJldHVybiByZXN1bHQgfHwgdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgdmlzaXRLZXllZFdyaXRlKGFzdDogS2V5ZWRXcml0ZSk6IFN5bWJvbCB7XG4gICAgLy8gVGhlIHdyaXRlIG9mIGEgdHlwZSBpcyB0aGUgdHlwZSBvZiB0aGUgdmFsdWUgYmVpbmcgd3JpdHRlbi5cbiAgICByZXR1cm4gdGhpcy5nZXRUeXBlKGFzdC52YWx1ZSk7XG4gIH1cblxuICB2aXNpdExpdGVyYWxBcnJheShhc3Q6IExpdGVyYWxBcnJheSk6IFN5bWJvbCB7XG4gICAgLy8gQSB0eXBlIGxpdGVyYWwgaXMgYW4gYXJyYXkgdHlwZSBvZiB0aGUgdW5pb24gb2YgdGhlIGVsZW1lbnRzXG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QXJyYXlUeXBlKFxuICAgICAgICB0aGlzLnF1ZXJ5LmdldFR5cGVVbmlvbiguLi5hc3QuZXhwcmVzc2lvbnMubWFwKGVsZW1lbnQgPT4gdGhpcy5nZXRUeXBlKGVsZW1lbnQpKSkpO1xuICB9XG5cbiAgdmlzaXRMaXRlcmFsTWFwKGFzdDogTGl0ZXJhbE1hcCk6IFN5bWJvbCB7XG4gICAgLy8gSWYgd2UgYXJlIHByb2R1Y2luZyBkaWFnbm9zdGljcywgdmlzaXQgdGhlIGNoaWxkcmVuXG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIHZpc2l0QXN0Q2hpbGRyZW4oYXN0LCB0aGlzKTtcbiAgICB9XG4gICAgLy8gVE9ETzogUmV0dXJuIGEgY29tcG9zaXRlIHR5cGUuXG4gICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgfVxuXG4gIHZpc2l0TGl0ZXJhbFByaW1pdGl2ZShhc3Q6IExpdGVyYWxQcmltaXRpdmUpIHtcbiAgICAvLyBUaGUgdHlwZSBvZiBhIGxpdGVyYWwgcHJpbWl0aXZlIGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIHRoZSBsaXRlcmFsLlxuICAgIHN3aXRjaCAoYXN0LnZhbHVlKSB7XG4gICAgICBjYXNlIHRydWU6XG4gICAgICBjYXNlIGZhbHNlOlxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5Cb29sZWFuKTtcbiAgICAgIGNhc2UgbnVsbDpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuTnVsbCk7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuVW5kZWZpbmVkKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIGFzdC52YWx1ZSkge1xuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5TdHJpbmcpO1xuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5OdW1iZXIpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcignVW5yZWNvZ25pemVkIHByaW1pdGl2ZScsIGFzdCk7XG4gICAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2aXNpdE1ldGhvZENhbGwoYXN0OiBNZXRob2RDYWxsKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZU1ldGhvZENhbGwodGhpcy5nZXRUeXBlKGFzdC5yZWNlaXZlciksIGFzdCk7XG4gIH1cblxuICB2aXNpdFBpcGUoYXN0OiBCaW5kaW5nUGlwZSkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgcGlwZSBub2RlIGlzIHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgcGlwZSdzIHRyYW5zZm9ybSBtZXRob2QuIFRoZSB0YWJsZSByZXR1cm5lZFxuICAgIC8vIGJ5IGdldFBpcGVzKCkgaXMgZXhwZWN0ZWQgdG8gY29udGFpbiBzeW1ib2xzIHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgdHJhbnNmb3JtIG1ldGhvZCB0eXBlLlxuICAgIGNvbnN0IHBpcGUgPSB0aGlzLnF1ZXJ5LmdldFBpcGVzKCkuZ2V0KGFzdC5uYW1lKTtcbiAgICBpZiAoIXBpcGUpIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBObyBwaXBlIGJ5IHRoZSBuYW1lICR7YXN0Lm5hbWV9IGZvdW5kYCwgYXN0KTtcbiAgICBjb25zdCBleHBUeXBlID0gdGhpcy5nZXRUeXBlKGFzdC5leHApO1xuICAgIGNvbnN0IHNpZ25hdHVyZSA9XG4gICAgICAgIHBpcGUuc2VsZWN0U2lnbmF0dXJlKFtleHBUeXBlXS5jb25jYXQoYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLmdldFR5cGUoYXJnKSkpKTtcbiAgICBpZiAoIXNpZ25hdHVyZSkgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoJ1VuYWJsZSB0byByZXNvbHZlIHNpZ25hdHVyZSBmb3IgcGlwZSBpbnZvY2F0aW9uJywgYXN0KTtcbiAgICByZXR1cm4gc2lnbmF0dXJlLnJlc3VsdDtcbiAgfVxuXG4gIHZpc2l0UHJlZml4Tm90KGFzdDogUHJlZml4Tm90KSB7XG4gICAgLy8gSWYgd2UgYXJlIHByb2R1Y2luZyBkaWFnbm9zdGljcywgdmlzaXQgdGhlIGNoaWxkcmVuXG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIHZpc2l0QXN0Q2hpbGRyZW4oYXN0LCB0aGlzKTtcbiAgICB9XG4gICAgLy8gVGhlIHR5cGUgb2YgYSBwcmVmaXggISBpcyBhbHdheXMgYm9vbGVhbi5cbiAgICByZXR1cm4gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5Cb29sZWFuKTtcbiAgfVxuXG4gIHZpc2l0Tm9uTnVsbEFzc2VydChhc3Q6IE5vbk51bGxBc3NlcnQpIHtcbiAgICBjb25zdCBleHByZXNzaW9uVHlwZSA9IHRoaXMuZ2V0VHlwZShhc3QuZXhwcmVzc2lvbik7XG4gICAgcmV0dXJuIHRoaXMucXVlcnkuZ2V0Tm9uTnVsbGFibGVUeXBlKGV4cHJlc3Npb25UeXBlKTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZVByb3BlcnR5UmVhZCh0aGlzLmdldFR5cGUoYXN0LnJlY2VpdmVyKSwgYXN0KTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlXcml0ZShhc3Q6IFByb3BlcnR5V3JpdGUpIHtcbiAgICAvLyBUaGUgdHlwZSBvZiBhIHdyaXRlIGlzIHRoZSB0eXBlIG9mIHRoZSB2YWx1ZSBiZWluZyB3cml0dGVuLlxuICAgIHJldHVybiB0aGlzLmdldFR5cGUoYXN0LnZhbHVlKTtcbiAgfVxuXG4gIHZpc2l0UXVvdGUoYXN0OiBRdW90ZSkge1xuICAgIC8vIFRoZSB0eXBlIG9mIGEgcXVvdGVkIGV4cHJlc3Npb24gaXMgYW55LlxuICAgIHJldHVybiB0aGlzLnF1ZXJ5LmdldEJ1aWx0aW5UeXBlKEJ1aWx0aW5UeXBlLkFueSk7XG4gIH1cblxuICB2aXNpdFNhZmVNZXRob2RDYWxsKGFzdDogU2FmZU1ldGhvZENhbGwpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlTWV0aG9kQ2FsbCh0aGlzLnF1ZXJ5LmdldE5vbk51bGxhYmxlVHlwZSh0aGlzLmdldFR5cGUoYXN0LnJlY2VpdmVyKSksIGFzdCk7XG4gIH1cblxuICB2aXNpdFNhZmVQcm9wZXJ0eVJlYWQoYXN0OiBTYWZlUHJvcGVydHlSZWFkKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZVByb3BlcnR5UmVhZCh0aGlzLnF1ZXJ5LmdldE5vbk51bGxhYmxlVHlwZSh0aGlzLmdldFR5cGUoYXN0LnJlY2VpdmVyKSksIGFzdCk7XG4gIH1cblxuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBfYW55VHlwZSAhOiBTeW1ib2w7XG4gIHByaXZhdGUgZ2V0IGFueVR5cGUoKTogU3ltYm9sIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5fYW55VHlwZTtcbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgcmVzdWx0ID0gdGhpcy5fYW55VHlwZSA9IHRoaXMucXVlcnkuZ2V0QnVpbHRpblR5cGUoQnVpbHRpblR5cGUuQW55KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIF91bmRlZmluZWRUeXBlICE6IFN5bWJvbDtcbiAgcHJpdmF0ZSBnZXQgdW5kZWZpbmVkVHlwZSgpOiBTeW1ib2wge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLl91bmRlZmluZWRUeXBlO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSB0aGlzLl91bmRlZmluZWRUeXBlID0gdGhpcy5xdWVyeS5nZXRCdWlsdGluVHlwZShCdWlsdGluVHlwZS5VbmRlZmluZWQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlTWV0aG9kQ2FsbChyZWNlaXZlclR5cGU6IFN5bWJvbCwgYXN0OiBTYWZlTWV0aG9kQ2FsbHxNZXRob2RDYWxsKSB7XG4gICAgaWYgKHRoaXMuaXNBbnkocmVjZWl2ZXJUeXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBvZiBhIG1ldGhvZCBpcyB0aGUgc2VsZWN0ZWQgbWV0aG9kcyByZXN1bHQgdHlwZS5cbiAgICBjb25zdCBtZXRob2QgPSByZWNlaXZlclR5cGUubWVtYmVycygpLmdldChhc3QubmFtZSk7XG4gICAgaWYgKCFtZXRob2QpIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBVbmtub3duIG1ldGhvZCAnJHthc3QubmFtZX0nYCwgYXN0KTtcbiAgICBpZiAoIW1ldGhvZC50eXBlKSByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcihgQ291bGQgbm90IGZpbmQgYSB0eXBlIGZvciAnJHthc3QubmFtZX0nYCwgYXN0KTtcbiAgICBpZiAoIW1ldGhvZC50eXBlLmNhbGxhYmxlKSByZXR1cm4gdGhpcy5yZXBvcnRFcnJvcihgTWVtYmVyICcke2FzdC5uYW1lfScgaXMgbm90IGNhbGxhYmxlYCwgYXN0KTtcbiAgICBjb25zdCBzaWduYXR1cmUgPSBtZXRob2QudHlwZS5zZWxlY3RTaWduYXR1cmUoYXN0LmFyZ3MubWFwKGFyZyA9PiB0aGlzLmdldFR5cGUoYXJnKSkpO1xuICAgIGlmICghc2lnbmF0dXJlKVxuICAgICAgcmV0dXJuIHRoaXMucmVwb3J0RXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIHNpZ25hdHVyZSBmb3IgY2FsbCBvZiBtZXRob2QgJHthc3QubmFtZX1gLCBhc3QpO1xuICAgIHJldHVybiBzaWduYXR1cmUucmVzdWx0O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlUHJvcGVydHlSZWFkKHJlY2VpdmVyVHlwZTogU3ltYm9sLCBhc3Q6IFNhZmVQcm9wZXJ0eVJlYWR8UHJvcGVydHlSZWFkKSB7XG4gICAgaWYgKHRoaXMuaXNBbnkocmVjZWl2ZXJUeXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuYW55VHlwZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBvZiBhIHByb3BlcnR5IHJlYWQgaXMgdGhlIHNlZWxjdGVkIG1lbWJlcidzIHR5cGUuXG4gICAgY29uc3QgbWVtYmVyID0gcmVjZWl2ZXJUeXBlLm1lbWJlcnMoKS5nZXQoYXN0Lm5hbWUpO1xuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICBsZXQgcmVjZWl2ZXJJbmZvID0gcmVjZWl2ZXJUeXBlLm5hbWU7XG4gICAgICBpZiAocmVjZWl2ZXJJbmZvID09ICckaW1wbGljaXQnKSB7XG4gICAgICAgIHJlY2VpdmVySW5mbyA9XG4gICAgICAgICAgICAnVGhlIGNvbXBvbmVudCBkZWNsYXJhdGlvbiwgdGVtcGxhdGUgdmFyaWFibGUgZGVjbGFyYXRpb25zLCBhbmQgZWxlbWVudCByZWZlcmVuY2VzIGRvJztcbiAgICAgIH0gZWxzZSBpZiAocmVjZWl2ZXJUeXBlLm51bGxhYmxlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKGBUaGUgZXhwcmVzc2lvbiBtaWdodCBiZSBudWxsYCwgYXN0LnJlY2VpdmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlY2VpdmVySW5mbyA9IGAnJHtyZWNlaXZlckluZm99JyBkb2VzYDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlcG9ydEVycm9yKFxuICAgICAgICAgIGBJZGVudGlmaWVyICcke2FzdC5uYW1lfScgaXMgbm90IGRlZmluZWQuICR7cmVjZWl2ZXJJbmZvfSBub3QgY29udGFpbiBzdWNoIGEgbWVtYmVyYCxcbiAgICAgICAgICBhc3QpO1xuICAgIH1cbiAgICBpZiAoIW1lbWJlci5wdWJsaWMpIHtcbiAgICAgIGxldCByZWNlaXZlckluZm8gPSByZWNlaXZlclR5cGUubmFtZTtcbiAgICAgIGlmIChyZWNlaXZlckluZm8gPT0gJyRpbXBsaWNpdCcpIHtcbiAgICAgICAgcmVjZWl2ZXJJbmZvID0gJ3RoZSBjb21wb25lbnQnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVjZWl2ZXJJbmZvID0gYCcke3JlY2VpdmVySW5mb30nYDtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVwb3J0V2FybmluZyhcbiAgICAgICAgICBgSWRlbnRpZmllciAnJHthc3QubmFtZX0nIHJlZmVycyB0byBhIHByaXZhdGUgbWVtYmVyIG9mICR7cmVjZWl2ZXJJbmZvfWAsIGFzdCk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXIudHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVwb3J0RXJyb3IobWVzc2FnZTogc3RyaW5nLCBhc3Q6IEFTVCk6IFN5bWJvbCB7XG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaChuZXcgVHlwZURpYWdub3N0aWMoRGlhZ25vc3RpY0tpbmQuRXJyb3IsIG1lc3NhZ2UsIGFzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSByZXBvcnRXYXJuaW5nKG1lc3NhZ2U6IHN0cmluZywgYXN0OiBBU1QpOiBTeW1ib2wge1xuICAgIGlmICh0aGlzLmRpYWdub3N0aWNzKSB7XG4gICAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2gobmV3IFR5cGVEaWFnbm9zdGljKERpYWdub3N0aWNLaW5kLldhcm5pbmcsIG1lc3NhZ2UsIGFzdCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hbnlUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0FueShzeW1ib2w6IFN5bWJvbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhc3ltYm9sIHx8IHRoaXMucXVlcnkuZ2V0VHlwZUtpbmQoc3ltYm9sKSA9PSBCdWlsdGluVHlwZS5BbnkgfHxcbiAgICAgICAgKCEhc3ltYm9sLnR5cGUgJiYgdGhpcy5pc0FueShzeW1ib2wudHlwZSkpO1xuICB9XG59XG4iXX0=