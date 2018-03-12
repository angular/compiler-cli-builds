"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const symbols_1 = require("./symbols");
var DiagnosticKind;
(function (DiagnosticKind) {
    DiagnosticKind[DiagnosticKind["Error"] = 0] = "Error";
    DiagnosticKind[DiagnosticKind["Warning"] = 1] = "Warning";
})(DiagnosticKind = exports.DiagnosticKind || (exports.DiagnosticKind = {}));
class TypeDiagnostic {
    constructor(kind, message, ast) {
        this.kind = kind;
        this.message = message;
        this.ast = ast;
    }
}
exports.TypeDiagnostic = TypeDiagnostic;
// AstType calculatetype of the ast given AST element.
class AstType {
    constructor(scope, query, context) {
        this.scope = scope;
        this.query = query;
        this.context = context;
    }
    getType(ast) { return ast.visit(this); }
    getDiagnostics(ast) {
        this.diagnostics = [];
        const type = ast.visit(this);
        if (this.context.event && type.callable) {
            this.reportWarning('Unexpected callable expression. Expected a method call', ast);
        }
        return this.diagnostics;
    }
    visitBinary(ast) {
        // Treat undefined and null as other.
        function normalize(kind, other) {
            switch (kind) {
                case symbols_1.BuiltinType.Undefined:
                case symbols_1.BuiltinType.Null:
                    return normalize(other, symbols_1.BuiltinType.Other);
            }
            return kind;
        }
        const getType = (ast, operation) => {
            const type = this.getType(ast);
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
                        this.reportError(`The expression might be null`, ast);
                        break;
                }
                return this.query.getNonNullableType(type);
            }
            return type;
        };
        const leftType = getType(ast.left, ast.operation);
        const rightType = getType(ast.right, ast.operation);
        const leftRawKind = this.query.getTypeKind(leftType);
        const rightRawKind = this.query.getTypeKind(rightType);
        const leftKind = normalize(leftRawKind, rightRawKind);
        const rightKind = normalize(rightRawKind, leftRawKind);
        // The following swtich implements operator typing similar to the
        // type production tables in the TypeScript specification.
        // https://github.com/Microsoft/TypeScript/blob/v1.8.10/doc/spec.md#4.19
        const operKind = leftKind << 8 | rightKind;
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
                        let errorAst = ast.left;
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
        return this.reportError(`Unrecognized operator ${ast.operation}`, ast);
    }
    visitChain(ast) {
        if (this.diagnostics) {
            // If we are producing diagnostics, visit the children
            compiler_1.visitAstChildren(ast, this);
        }
        // The type of a chain is always undefined.
        return this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
    }
    visitConditional(ast) {
        // The type of a conditional is the union of the true and false conditions.
        if (this.diagnostics) {
            compiler_1.visitAstChildren(ast, this);
        }
        return this.query.getTypeUnion(this.getType(ast.trueExp), this.getType(ast.falseExp));
    }
    visitFunctionCall(ast) {
        // The type of a function call is the return type of the selected signature.
        // The signature is selected based on the types of the arguments. Angular doesn't
        // support contextual typing of arguments so this is simpler than TypeScript's
        // version.
        const args = ast.args.map(arg => this.getType(arg));
        const target = this.getType(ast.target);
        if (!target || !target.callable)
            return this.reportError('Call target is not callable', ast);
        const signature = target.selectSignature(args);
        if (signature)
            return signature.result;
        // TODO: Consider a better error message here.
        return this.reportError('Unable no compatible signature found for call', ast);
    }
    visitImplicitReceiver(ast) {
        const _this = this;
        // Return a pseudo-symbol for the implicit receiver.
        // The members of the implicit receiver are what is defined by the
        // scope passed into this class.
        return {
            name: '$implict',
            kind: 'component',
            language: 'ng-template',
            type: undefined,
            container: undefined,
            callable: false,
            nullable: false,
            public: true,
            definition: undefined,
            members() { return _this.scope; },
            signatures() { return []; },
            selectSignature(types) { return undefined; },
            indexed(argument) { return undefined; }
        };
    }
    visitInterpolation(ast) {
        // If we are producing diagnostics, visit the children.
        if (this.diagnostics) {
            compiler_1.visitAstChildren(ast, this);
        }
        return this.undefinedType;
    }
    visitKeyedRead(ast) {
        const targetType = this.getType(ast.obj);
        const keyType = this.getType(ast.key);
        const result = targetType.indexed(keyType);
        return result || this.anyType;
    }
    visitKeyedWrite(ast) {
        // The write of a type is the type of the value being written.
        return this.getType(ast.value);
    }
    visitLiteralArray(ast) {
        // A type literal is an array type of the union of the elements
        return this.query.getArrayType(this.query.getTypeUnion(...ast.expressions.map(element => this.getType(element))));
    }
    visitLiteralMap(ast) {
        // If we are producing diagnostics, visit the children
        if (this.diagnostics) {
            compiler_1.visitAstChildren(ast, this);
        }
        // TODO: Return a composite type.
        return this.anyType;
    }
    visitLiteralPrimitive(ast) {
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
    }
    visitMethodCall(ast) {
        return this.resolveMethodCall(this.getType(ast.receiver), ast);
    }
    visitPipe(ast) {
        // The type of a pipe node is the return type of the pipe's transform method. The table returned
        // by getPipes() is expected to contain symbols with the corresponding transform method type.
        const pipe = this.query.getPipes().get(ast.name);
        if (!pipe)
            return this.reportError(`No pipe by the name ${ast.name} found`, ast);
        const expType = this.getType(ast.exp);
        const signature = pipe.selectSignature([expType].concat(ast.args.map(arg => this.getType(arg))));
        if (!signature)
            return this.reportError('Unable to resolve signature for pipe invocation', ast);
        return signature.result;
    }
    visitPrefixNot(ast) {
        // The type of a prefix ! is always boolean.
        return this.query.getBuiltinType(symbols_1.BuiltinType.Boolean);
    }
    visitNonNullAssert(ast) {
        const expressionType = this.getType(ast.expression);
        return this.query.getNonNullableType(expressionType);
    }
    visitPropertyRead(ast) {
        return this.resolvePropertyRead(this.getType(ast.receiver), ast);
    }
    visitPropertyWrite(ast) {
        // The type of a write is the type of the value being written.
        return this.getType(ast.value);
    }
    visitQuote(ast) {
        // The type of a quoted expression is any.
        return this.query.getBuiltinType(symbols_1.BuiltinType.Any);
    }
    visitSafeMethodCall(ast) {
        return this.resolveMethodCall(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
    }
    visitSafePropertyRead(ast) {
        return this.resolvePropertyRead(this.query.getNonNullableType(this.getType(ast.receiver)), ast);
    }
    get anyType() {
        let result = this._anyType;
        if (!result) {
            result = this._anyType = this.query.getBuiltinType(symbols_1.BuiltinType.Any);
        }
        return result;
    }
    get undefinedType() {
        let result = this._undefinedType;
        if (!result) {
            result = this._undefinedType = this.query.getBuiltinType(symbols_1.BuiltinType.Undefined);
        }
        return result;
    }
    resolveMethodCall(receiverType, ast) {
        if (this.isAny(receiverType)) {
            return this.anyType;
        }
        // The type of a method is the selected methods result type.
        const method = receiverType.members().get(ast.name);
        if (!method)
            return this.reportError(`Unknown method '${ast.name}'`, ast);
        if (!method.type)
            return this.reportError(`Could not find a type for '${ast.name}'`, ast);
        if (!method.type.callable)
            return this.reportError(`Member '${ast.name}' is not callable`, ast);
        const signature = method.type.selectSignature(ast.args.map(arg => this.getType(arg)));
        if (!signature)
            return this.reportError(`Unable to resolve signature for call of method ${ast.name}`, ast);
        return signature.result;
    }
    resolvePropertyRead(receiverType, ast) {
        if (this.isAny(receiverType)) {
            return this.anyType;
        }
        // The type of a property read is the seelcted member's type.
        const member = receiverType.members().get(ast.name);
        if (!member) {
            let receiverInfo = receiverType.name;
            if (receiverInfo == '$implict') {
                receiverInfo =
                    'The component declaration, template variable declarations, and element references do';
            }
            else if (receiverType.nullable) {
                return this.reportError(`The expression might be null`, ast.receiver);
            }
            else {
                receiverInfo = `'${receiverInfo}' does`;
            }
            return this.reportError(`Identifier '${ast.name}' is not defined. ${receiverInfo} not contain such a member`, ast);
        }
        if (!member.public) {
            let receiverInfo = receiverType.name;
            if (receiverInfo == '$implict') {
                receiverInfo = 'the component';
            }
            else {
                receiverInfo = `'${receiverInfo}'`;
            }
            this.reportWarning(`Identifier '${ast.name}' refers to a private member of ${receiverInfo}`, ast);
        }
        return member.type;
    }
    reportError(message, ast) {
        if (this.diagnostics) {
            this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Error, message, ast));
        }
        return this.anyType;
    }
    reportWarning(message, ast) {
        if (this.diagnostics) {
            this.diagnostics.push(new TypeDiagnostic(DiagnosticKind.Warning, message, ast));
        }
        return this.anyType;
    }
    isAny(symbol) {
        return !symbol || this.query.getTypeKind(symbol) == symbols_1.BuiltinType.Any ||
            (!!symbol.type && this.isAny(symbol.type));
    }
}
exports.AstType = AstType;
//# sourceMappingURL=expression_type.js.map