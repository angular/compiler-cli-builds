(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.attachComments = exports.createTemplateTail = exports.createTemplateMiddle = exports.TypeScriptAstFactory = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var UNARY_OPERATORS = {
        '+': ts.SyntaxKind.PlusToken,
        '-': ts.SyntaxKind.MinusToken,
        '!': ts.SyntaxKind.ExclamationToken,
    };
    var BINARY_OPERATORS = {
        '&&': ts.SyntaxKind.AmpersandAmpersandToken,
        '>': ts.SyntaxKind.GreaterThanToken,
        '>=': ts.SyntaxKind.GreaterThanEqualsToken,
        '&': ts.SyntaxKind.AmpersandToken,
        '/': ts.SyntaxKind.SlashToken,
        '==': ts.SyntaxKind.EqualsEqualsToken,
        '===': ts.SyntaxKind.EqualsEqualsEqualsToken,
        '<': ts.SyntaxKind.LessThanToken,
        '<=': ts.SyntaxKind.LessThanEqualsToken,
        '-': ts.SyntaxKind.MinusToken,
        '%': ts.SyntaxKind.PercentToken,
        '*': ts.SyntaxKind.AsteriskToken,
        '!=': ts.SyntaxKind.ExclamationEqualsToken,
        '!==': ts.SyntaxKind.ExclamationEqualsEqualsToken,
        '||': ts.SyntaxKind.BarBarToken,
        '+': ts.SyntaxKind.PlusToken,
    };
    var VAR_TYPES = {
        'const': ts.NodeFlags.Const,
        'let': ts.NodeFlags.Let,
        'var': ts.NodeFlags.None,
    };
    /**
     * A TypeScript flavoured implementation of the AstFactory.
     */
    var TypeScriptAstFactory = /** @class */ (function () {
        function TypeScriptAstFactory() {
            this.externalSourceFiles = new Map();
            this.attachComments = attachComments;
            this.createArrayLiteral = ts.createArrayLiteral;
            this.createConditional = ts.createConditional;
            this.createElementAccess = ts.createElementAccess;
            this.createExpressionStatement = ts.createExpressionStatement;
            this.createIdentifier = ts.createIdentifier;
            this.createParenthesizedExpression = ts.createParen;
            this.createPropertyAccess = ts.createPropertyAccess;
            this.createThrowStatement = ts.createThrow;
            this.createTypeOfExpression = ts.createTypeOf;
        }
        TypeScriptAstFactory.prototype.createAssignment = function (target, value) {
            return ts.createBinary(target, ts.SyntaxKind.EqualsToken, value);
        };
        TypeScriptAstFactory.prototype.createBinaryExpression = function (leftOperand, operator, rightOperand) {
            return ts.createBinary(leftOperand, BINARY_OPERATORS[operator], rightOperand);
        };
        TypeScriptAstFactory.prototype.createBlock = function (body) {
            return ts.createBlock(body);
        };
        TypeScriptAstFactory.prototype.createCallExpression = function (callee, args, pure) {
            var call = ts.createCall(callee, undefined, args);
            if (pure) {
                ts.addSyntheticLeadingComment(call, ts.SyntaxKind.MultiLineCommentTrivia, '@__PURE__', /* trailing newline */ false);
            }
            return call;
        };
        TypeScriptAstFactory.prototype.createFunctionDeclaration = function (functionName, parameters, body) {
            if (!ts.isBlock(body)) {
                throw new Error("Invalid syntax, expected a block, but got " + ts.SyntaxKind[body.kind] + ".");
            }
            return ts.createFunctionDeclaration(undefined, undefined, undefined, functionName, undefined, parameters.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param); }), undefined, body);
        };
        TypeScriptAstFactory.prototype.createFunctionExpression = function (functionName, parameters, body) {
            if (!ts.isBlock(body)) {
                throw new Error("Invalid syntax, expected a block, but got " + ts.SyntaxKind[body.kind] + ".");
            }
            return ts.createFunctionExpression(undefined, undefined, functionName !== null && functionName !== void 0 ? functionName : undefined, undefined, parameters.map(function (param) { return ts.createParameter(undefined, undefined, undefined, param); }), undefined, body);
        };
        TypeScriptAstFactory.prototype.createIfStatement = function (condition, thenStatement, elseStatement) {
            return ts.createIf(condition, thenStatement, elseStatement !== null && elseStatement !== void 0 ? elseStatement : undefined);
        };
        TypeScriptAstFactory.prototype.createLiteral = function (value) {
            if (value === undefined) {
                return ts.createIdentifier('undefined');
            }
            else if (value === null) {
                return ts.createNull();
            }
            else {
                return ts.createLiteral(value);
            }
        };
        TypeScriptAstFactory.prototype.createNewExpression = function (expression, args) {
            return ts.createNew(expression, undefined, args);
        };
        TypeScriptAstFactory.prototype.createObjectLiteral = function (properties) {
            return ts.createObjectLiteral(properties.map(function (prop) { return ts.createPropertyAssignment(prop.quoted ? ts.createLiteral(prop.propertyName) :
                ts.createIdentifier(prop.propertyName), prop.value); }));
        };
        TypeScriptAstFactory.prototype.createReturnStatement = function (expression) {
            return ts.createReturn(expression !== null && expression !== void 0 ? expression : undefined);
        };
        TypeScriptAstFactory.prototype.createTaggedTemplate = function (tag, template) {
            var templateLiteral;
            var length = template.elements.length;
            var head = template.elements[0];
            if (length === 1) {
                templateLiteral = ts.createNoSubstitutionTemplateLiteral(head.cooked, head.raw);
            }
            else {
                var spans = [];
                // Create the middle parts
                for (var i = 1; i < length - 1; i++) {
                    var _a = template.elements[i], cooked = _a.cooked, raw = _a.raw, range = _a.range;
                    var middle = createTemplateMiddle(cooked, raw);
                    if (range !== null) {
                        this.setSourceMapRange(middle, range);
                    }
                    spans.push(ts.createTemplateSpan(template.expressions[i - 1], middle));
                }
                // Create the tail part
                var resolvedExpression = template.expressions[length - 2];
                var templatePart = template.elements[length - 1];
                var templateTail = createTemplateTail(templatePart.cooked, templatePart.raw);
                if (templatePart.range !== null) {
                    this.setSourceMapRange(templateTail, templatePart.range);
                }
                spans.push(ts.createTemplateSpan(resolvedExpression, templateTail));
                // Put it all together
                templateLiteral =
                    ts.createTemplateExpression(ts.createTemplateHead(head.cooked, head.raw), spans);
            }
            if (head.range !== null) {
                this.setSourceMapRange(templateLiteral, head.range);
            }
            return ts.createTaggedTemplate(tag, templateLiteral);
        };
        TypeScriptAstFactory.prototype.createUnaryExpression = function (operator, operand) {
            return ts.createPrefix(UNARY_OPERATORS[operator], operand);
        };
        TypeScriptAstFactory.prototype.createVariableDeclaration = function (variableName, initializer, type) {
            return ts.createVariableStatement(undefined, ts.createVariableDeclarationList([ts.createVariableDeclaration(variableName, undefined, initializer !== null && initializer !== void 0 ? initializer : undefined)], VAR_TYPES[type]));
        };
        TypeScriptAstFactory.prototype.setSourceMapRange = function (node, sourceMapRange) {
            if (sourceMapRange === null) {
                return node;
            }
            var url = sourceMapRange.url;
            if (!this.externalSourceFiles.has(url)) {
                this.externalSourceFiles.set(url, ts.createSourceMapSource(url, sourceMapRange.content, function (pos) { return pos; }));
            }
            var source = this.externalSourceFiles.get(url);
            ts.setSourceMapRange(node, { pos: sourceMapRange.start.offset, end: sourceMapRange.end.offset, source: source });
            return node;
        };
        return TypeScriptAstFactory;
    }());
    exports.TypeScriptAstFactory = TypeScriptAstFactory;
    // HACK: Use this in place of `ts.createTemplateMiddle()`.
    // Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed.
    function createTemplateMiddle(cooked, raw) {
        var node = ts.createTemplateHead(cooked, raw);
        node.kind = ts.SyntaxKind.TemplateMiddle;
        return node;
    }
    exports.createTemplateMiddle = createTemplateMiddle;
    // HACK: Use this in place of `ts.createTemplateTail()`.
    // Revert once https://github.com/microsoft/TypeScript/issues/35374 is fixed.
    function createTemplateTail(cooked, raw) {
        var node = ts.createTemplateHead(cooked, raw);
        node.kind = ts.SyntaxKind.TemplateTail;
        return node;
    }
    exports.createTemplateTail = createTemplateTail;
    /**
     * Attach the given `leadingComments` to the `statement` node.
     *
     * @param statement The statement that will have comments attached.
     * @param leadingComments The comments to attach to the statement.
     */
    function attachComments(statement, leadingComments) {
        var e_1, _a, e_2, _b;
        if (leadingComments === undefined) {
            return statement;
        }
        try {
            for (var leadingComments_1 = tslib_1.__values(leadingComments), leadingComments_1_1 = leadingComments_1.next(); !leadingComments_1_1.done; leadingComments_1_1 = leadingComments_1.next()) {
                var comment = leadingComments_1_1.value;
                var commentKind = comment.multiline ? ts.SyntaxKind.MultiLineCommentTrivia :
                    ts.SyntaxKind.SingleLineCommentTrivia;
                if (comment.multiline) {
                    ts.addSyntheticLeadingComment(statement, commentKind, comment.toString(), comment.trailingNewline);
                }
                else {
                    try {
                        for (var _c = (e_2 = void 0, tslib_1.__values(comment.toString().split('\n'))), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var line = _d.value;
                            ts.addSyntheticLeadingComment(statement, commentKind, line, comment.trailingNewline);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (leadingComments_1_1 && !leadingComments_1_1.done && (_a = leadingComments_1.return)) _a.call(leadingComments_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return statement;
    }
    exports.attachComments = attachComments;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9hc3RfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHlwZXNjcmlwdF9hc3RfZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDLElBQU0sZUFBZSxHQUFrRDtRQUNyRSxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTO1FBQzVCLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7UUFDN0IsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO0tBQ3BDLENBQUM7SUFFRixJQUFNLGdCQUFnQixHQUE4QztRQUNsRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUI7UUFDM0MsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO1FBQ25DLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQjtRQUMxQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjO1FBQ2pDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7UUFDN0IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCO1FBQ3JDLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtRQUM1QyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO1FBQ2hDLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtRQUN2QyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVO1FBQzdCLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVk7UUFDL0IsR0FBRyxFQUFF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SSxDQUFDLElBQXNCLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7UUFDMUQsT0FBTyxJQUF1QixDQUFDO0lBQ2pDLENBQUM7SUFKRCxnREFJQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsY0FBYyxDQUMxQixTQUFZLEVBQUUsZUFBMkM7O1FBQzNELElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUNqQyxPQUFPLFNBQVMsQ0FBQztTQUNsQjs7WUFFRCxLQUFzQixJQUFBLG9CQUFBLGlCQUFBLGVBQWUsQ0FBQSxnREFBQSw2RUFBRTtnQkFBbEMsSUFBTSxPQUFPLDRCQUFBO2dCQUNoQixJQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUM7b0JBQ3RDLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7Z0JBQzlFLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRTtvQkFDckIsRUFBRSxDQUFDLDBCQUEwQixDQUN6QixTQUFTLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQzFFO3FCQUFNOzt3QkFDTCxLQUFtQixJQUFBLG9CQUFBLGlCQUFBLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTs0QkFBOUMsSUFBTSxJQUFJLFdBQUE7NEJBQ2IsRUFBRSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQzt5QkFDdEY7Ozs7Ozs7OztpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBbkJELHdDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QXN0RmFjdG9yeSwgQmluYXJ5T3BlcmF0b3IsIExlYWRpbmdDb21tZW50LCBPYmplY3RMaXRlcmFsUHJvcGVydHksIFNvdXJjZU1hcFJhbmdlLCBUZW1wbGF0ZUxpdGVyYWwsIFVuYXJ5T3BlcmF0b3IsIFZhcmlhYmxlRGVjbGFyYXRpb25UeXBlfSBmcm9tICcuL2FwaS9hc3RfZmFjdG9yeSc7XG5cbmNvbnN0IFVOQVJZX09QRVJBVE9SUzogUmVjb3JkPFVuYXJ5T3BlcmF0b3IsIHRzLlByZWZpeFVuYXJ5T3BlcmF0b3I+ID0ge1xuICAnKyc6IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuLFxuICAnLSc6IHRzLlN5bnRheEtpbmQuTWludXNUb2tlbixcbiAgJyEnOiB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uVG9rZW4sXG59O1xuXG5jb25zdCBCSU5BUllfT1BFUkFUT1JTOiBSZWNvcmQ8QmluYXJ5T3BlcmF0b3IsIHRzLkJpbmFyeU9wZXJhdG9yPiA9IHtcbiAgJyYmJzogdHMuU3ludGF4S2luZC5BbXBlcnNhbmRBbXBlcnNhbmRUb2tlbixcbiAgJz4nOiB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW4sXG4gICc+PSc6IHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5FcXVhbHNUb2tlbixcbiAgJyYnOiB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZFRva2VuLFxuICAnLyc6IHRzLlN5bnRheEtpbmQuU2xhc2hUb2tlbixcbiAgJz09JzogdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNUb2tlbixcbiAgJz09PSc6IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzRXF1YWxzVG9rZW4sXG4gICc8JzogdHMuU3ludGF4S2luZC5MZXNzVGhhblRva2VuLFxuICAnPD0nOiB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW4sXG4gICctJzogdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLFxuICAnJSc6IHRzLlN5bnRheEtpbmQuUGVyY2VudFRva2VuLFxuICAnKic6IHRzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbixcbiAgJyE9JzogdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc1Rva2VuLFxuICAnIT09JzogdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuLFxuICAnfHwnOiB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuLFxuICAnKyc6IHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuLFxufTtcblxuY29uc3QgVkFSX1RZUEVTOiBSZWNvcmQ8VmFyaWFibGVEZWNsYXJhdGlvblR5cGUsIHRzLk5vZGVGbGFncz4gPSB7XG4gICdjb25zdCc6IHRzLk5vZGVGbGFncy5Db25zdCxcbiAgJ2xldCc6IHRzLk5vZGVGbGFncy5MZXQsXG4gICd2YXInOiB0cy5Ob2RlRmxhZ3MuTm9uZSxcbn07XG5cbi8qKlxuICogQSBUeXBlU2NyaXB0IGZsYXZvdXJlZCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgQXN0RmFjdG9yeS5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRBc3RGYWN0b3J5IGltcGxlbWVudHMgQXN0RmFjdG9yeTx0cy5TdGF0ZW1lbnQsIHRzLkV4cHJlc3Npb24+IHtcbiAgcHJpdmF0ZSBleHRlcm5hbFNvdXJjZUZpbGVzID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZU1hcFNvdXJjZT4oKTtcblxuICBhdHRhY2hDb21tZW50cyA9IGF0dGFjaENvbW1lbnRzO1xuXG4gIGNyZWF0ZUFycmF5TGl0ZXJhbCA9IHRzLmNyZWF0ZUFycmF5TGl0ZXJhbDtcblxuICBjcmVhdGVBc3NpZ25tZW50KHRhcmdldDogdHMuRXhwcmVzc2lvbiwgdmFsdWU6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KHRhcmdldCwgdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiwgdmFsdWUpO1xuICB9XG5cbiAgY3JlYXRlQmluYXJ5RXhwcmVzc2lvbihcbiAgICAgIGxlZnRPcGVyYW5kOiB0cy5FeHByZXNzaW9uLCBvcGVyYXRvcjogQmluYXJ5T3BlcmF0b3IsXG4gICAgICByaWdodE9wZXJhbmQ6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQmluYXJ5KGxlZnRPcGVyYW5kLCBCSU5BUllfT1BFUkFUT1JTW29wZXJhdG9yXSwgcmlnaHRPcGVyYW5kKTtcbiAgfVxuXG4gIGNyZWF0ZUJsb2NrKGJvZHk6IHRzLlN0YXRlbWVudFtdKTogdHMuU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlQmxvY2soYm9keSk7XG4gIH1cblxuICBjcmVhdGVDYWxsRXhwcmVzc2lvbihjYWxsZWU6IHRzLkV4cHJlc3Npb24sIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSwgcHVyZTogYm9vbGVhbik6IHRzLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IGNhbGwgPSB0cy5jcmVhdGVDYWxsKGNhbGxlZSwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgICBpZiAocHVyZSkge1xuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgICAgY2FsbCwgdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhLCAnQF9fUFVSRV9fJywgLyogdHJhaWxpbmcgbmV3bGluZSAqLyBmYWxzZSk7XG4gICAgfVxuICAgIHJldHVybiBjYWxsO1xuICB9XG5cbiAgY3JlYXRlQ29uZGl0aW9uYWwgPSB0cy5jcmVhdGVDb25kaXRpb25hbDtcblxuICBjcmVhdGVFbGVtZW50QWNjZXNzID0gdHMuY3JlYXRlRWxlbWVudEFjY2VzcztcblxuICBjcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50ID0gdHMuY3JlYXRlRXhwcmVzc2lvblN0YXRlbWVudDtcblxuICBjcmVhdGVGdW5jdGlvbkRlY2xhcmF0aW9uKGZ1bmN0aW9uTmFtZTogc3RyaW5nLCBwYXJhbWV0ZXJzOiBzdHJpbmdbXSwgYm9keTogdHMuU3RhdGVtZW50KTpcbiAgICAgIHRzLlN0YXRlbWVudCB7XG4gICAgaWYgKCF0cy5pc0Jsb2NrKGJvZHkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc3ludGF4LCBleHBlY3RlZCBhIGJsb2NrLCBidXQgZ290ICR7dHMuU3ludGF4S2luZFtib2R5LmtpbmRdfS5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGZ1bmN0aW9uTmFtZSwgdW5kZWZpbmVkLFxuICAgICAgICBwYXJhbWV0ZXJzLm1hcChwYXJhbSA9PiB0cy5jcmVhdGVQYXJhbWV0ZXIodW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcGFyYW0pKSxcbiAgICAgICAgdW5kZWZpbmVkLCBib2R5KTtcbiAgfVxuXG4gIGNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihmdW5jdGlvbk5hbWU6IHN0cmluZ3xudWxsLCBwYXJhbWV0ZXJzOiBzdHJpbmdbXSwgYm9keTogdHMuU3RhdGVtZW50KTpcbiAgICAgIHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICghdHMuaXNCbG9jayhib2R5KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHN5bnRheCwgZXhwZWN0ZWQgYSBibG9jaywgYnV0IGdvdCAke3RzLlN5bnRheEtpbmRbYm9keS5raW5kXX0uYCk7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVGdW5jdGlvbkV4cHJlc3Npb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBmdW5jdGlvbk5hbWUgPz8gdW5kZWZpbmVkLCB1bmRlZmluZWQsXG4gICAgICAgIHBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVBhcmFtZXRlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwYXJhbSkpLFxuICAgICAgICB1bmRlZmluZWQsIGJvZHkpO1xuICB9XG5cbiAgY3JlYXRlSWRlbnRpZmllciA9IHRzLmNyZWF0ZUlkZW50aWZpZXI7XG5cbiAgY3JlYXRlSWZTdGF0ZW1lbnQoXG4gICAgICBjb25kaXRpb246IHRzLkV4cHJlc3Npb24sIHRoZW5TdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCxcbiAgICAgIGVsc2VTdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudHxudWxsKTogdHMuU3RhdGVtZW50IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSWYoY29uZGl0aW9uLCB0aGVuU3RhdGVtZW50LCBlbHNlU3RhdGVtZW50ID8/IHVuZGVmaW5lZCk7XG4gIH1cblxuICBjcmVhdGVMaXRlcmFsKHZhbHVlOiBzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbHx1bmRlZmluZWQpOiB0cy5FeHByZXNzaW9uIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoJ3VuZGVmaW5lZCcpO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVOdWxsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cy5jcmVhdGVMaXRlcmFsKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVOZXdFeHByZXNzaW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVOZXcoZXhwcmVzc2lvbiwgdW5kZWZpbmVkLCBhcmdzKTtcbiAgfVxuXG4gIGNyZWF0ZU9iamVjdExpdGVyYWwocHJvcGVydGllczogT2JqZWN0TGl0ZXJhbFByb3BlcnR5PHRzLkV4cHJlc3Npb24+W10pOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChwcm9wZXJ0aWVzLm1hcChcbiAgICAgICAgcHJvcCA9PiB0cy5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgICBwcm9wLnF1b3RlZCA/IHRzLmNyZWF0ZUxpdGVyYWwocHJvcC5wcm9wZXJ0eU5hbWUpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlSWRlbnRpZmllcihwcm9wLnByb3BlcnR5TmFtZSksXG4gICAgICAgICAgICBwcm9wLnZhbHVlKSkpO1xuICB9XG5cbiAgY3JlYXRlUGFyZW50aGVzaXplZEV4cHJlc3Npb24gPSB0cy5jcmVhdGVQYXJlbjtcblxuICBjcmVhdGVQcm9wZXJ0eUFjY2VzcyA9IHRzLmNyZWF0ZVByb3BlcnR5QWNjZXNzO1xuXG4gIGNyZWF0ZVJldHVyblN0YXRlbWVudChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9ufG51bGwpOiB0cy5TdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVSZXR1cm4oZXhwcmVzc2lvbiA/PyB1bmRlZmluZWQpO1xuICB9XG5cbiAgY3JlYXRlVGFnZ2VkVGVtcGxhdGUodGFnOiB0cy5FeHByZXNzaW9uLCB0ZW1wbGF0ZTogVGVtcGxhdGVMaXRlcmFsPHRzLkV4cHJlc3Npb24+KTpcbiAgICAgIHRzLkV4cHJlc3Npb24ge1xuICAgIGxldCB0ZW1wbGF0ZUxpdGVyYWw6IHRzLlRlbXBsYXRlTGl0ZXJhbDtcbiAgICBjb25zdCBsZW5ndGggPSB0ZW1wbGF0ZS5lbGVtZW50cy5sZW5ndGg7XG4gICAgY29uc3QgaGVhZCA9IHRlbXBsYXRlLmVsZW1lbnRzWzBdO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAgIHRlbXBsYXRlTGl0ZXJhbCA9IHRzLmNyZWF0ZU5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKGhlYWQuY29va2VkLCBoZWFkLnJhdyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNwYW5zOiB0cy5UZW1wbGF0ZVNwYW5bXSA9IFtdO1xuICAgICAgLy8gQ3JlYXRlIHRoZSBtaWRkbGUgcGFydHNcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHtjb29rZWQsIHJhdywgcmFuZ2V9ID0gdGVtcGxhdGUuZWxlbWVudHNbaV07XG4gICAgICAgIGNvbnN0IG1pZGRsZSA9IGNyZWF0ZVRlbXBsYXRlTWlkZGxlKGNvb2tlZCwgcmF3KTtcbiAgICAgICAgaWYgKHJhbmdlICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZShtaWRkbGUsIHJhbmdlKTtcbiAgICAgICAgfVxuICAgICAgICBzcGFucy5wdXNoKHRzLmNyZWF0ZVRlbXBsYXRlU3Bhbih0ZW1wbGF0ZS5leHByZXNzaW9uc1tpIC0gMV0sIG1pZGRsZSkpO1xuICAgICAgfVxuICAgICAgLy8gQ3JlYXRlIHRoZSB0YWlsIHBhcnRcbiAgICAgIGNvbnN0IHJlc29sdmVkRXhwcmVzc2lvbiA9IHRlbXBsYXRlLmV4cHJlc3Npb25zW2xlbmd0aCAtIDJdO1xuICAgICAgY29uc3QgdGVtcGxhdGVQYXJ0ID0gdGVtcGxhdGUuZWxlbWVudHNbbGVuZ3RoIC0gMV07XG4gICAgICBjb25zdCB0ZW1wbGF0ZVRhaWwgPSBjcmVhdGVUZW1wbGF0ZVRhaWwodGVtcGxhdGVQYXJ0LmNvb2tlZCwgdGVtcGxhdGVQYXJ0LnJhdyk7XG4gICAgICBpZiAodGVtcGxhdGVQYXJ0LnJhbmdlICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UodGVtcGxhdGVUYWlsLCB0ZW1wbGF0ZVBhcnQucmFuZ2UpO1xuICAgICAgfVxuICAgICAgc3BhbnMucHVzaCh0cy5jcmVhdGVUZW1wbGF0ZVNwYW4ocmVzb2x2ZWRFeHByZXNzaW9uLCB0ZW1wbGF0ZVRhaWwpKTtcbiAgICAgIC8vIFB1dCBpdCBhbGwgdG9nZXRoZXJcbiAgICAgIHRlbXBsYXRlTGl0ZXJhbCA9XG4gICAgICAgICAgdHMuY3JlYXRlVGVtcGxhdGVFeHByZXNzaW9uKHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChoZWFkLmNvb2tlZCwgaGVhZC5yYXcpLCBzcGFucyk7XG4gICAgfVxuICAgIGlmIChoZWFkLnJhbmdlICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKHRlbXBsYXRlTGl0ZXJhbCwgaGVhZC5yYW5nZSk7XG4gICAgfVxuICAgIHJldHVybiB0cy5jcmVhdGVUYWdnZWRUZW1wbGF0ZSh0YWcsIHRlbXBsYXRlTGl0ZXJhbCk7XG4gIH1cblxuICBjcmVhdGVUaHJvd1N0YXRlbWVudCA9IHRzLmNyZWF0ZVRocm93O1xuXG4gIGNyZWF0ZVR5cGVPZkV4cHJlc3Npb24gPSB0cy5jcmVhdGVUeXBlT2Y7XG5cblxuICBjcmVhdGVVbmFyeUV4cHJlc3Npb24ob3BlcmF0b3I6IFVuYXJ5T3BlcmF0b3IsIG9wZXJhbmQ6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdHMuY3JlYXRlUHJlZml4KFVOQVJZX09QRVJBVE9SU1tvcGVyYXRvcl0sIG9wZXJhbmQpO1xuICB9XG5cbiAgY3JlYXRlVmFyaWFibGVEZWNsYXJhdGlvbihcbiAgICAgIHZhcmlhYmxlTmFtZTogc3RyaW5nLCBpbml0aWFsaXplcjogdHMuRXhwcmVzc2lvbnxudWxsLFxuICAgICAgdHlwZTogVmFyaWFibGVEZWNsYXJhdGlvblR5cGUpOiB0cy5TdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChcbiAgICAgICAgICAgIFt0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKHZhcmlhYmxlTmFtZSwgdW5kZWZpbmVkLCBpbml0aWFsaXplciA/PyB1bmRlZmluZWQpXSxcbiAgICAgICAgICAgIFZBUl9UWVBFU1t0eXBlXSksXG4gICAgKTtcbiAgfVxuXG4gIHNldFNvdXJjZU1hcFJhbmdlPFQgZXh0ZW5kcyB0cy5Ob2RlPihub2RlOiBULCBzb3VyY2VNYXBSYW5nZTogU291cmNlTWFwUmFuZ2V8bnVsbCk6IFQge1xuICAgIGlmIChzb3VyY2VNYXBSYW5nZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsID0gc291cmNlTWFwUmFuZ2UudXJsO1xuICAgIGlmICghdGhpcy5leHRlcm5hbFNvdXJjZUZpbGVzLmhhcyh1cmwpKSB7XG4gICAgICB0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuc2V0KFxuICAgICAgICAgIHVybCwgdHMuY3JlYXRlU291cmNlTWFwU291cmNlKHVybCwgc291cmNlTWFwUmFuZ2UuY29udGVudCwgcG9zID0+IHBvcykpO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuZ2V0KHVybCk7XG4gICAgdHMuc2V0U291cmNlTWFwUmFuZ2UoXG4gICAgICAgIG5vZGUsIHtwb3M6IHNvdXJjZU1hcFJhbmdlLnN0YXJ0Lm9mZnNldCwgZW5kOiBzb3VyY2VNYXBSYW5nZS5lbmQub2Zmc2V0LCBzb3VyY2V9KTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxufVxuXG4vLyBIQUNLOiBVc2UgdGhpcyBpbiBwbGFjZSBvZiBgdHMuY3JlYXRlVGVtcGxhdGVNaWRkbGUoKWAuXG4vLyBSZXZlcnQgb25jZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM1Mzc0IGlzIGZpeGVkLlxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlTWlkZGxlKGNvb2tlZDogc3RyaW5nLCByYXc6IHN0cmluZyk6IHRzLlRlbXBsYXRlTWlkZGxlIHtcbiAgY29uc3Qgbm9kZTogdHMuVGVtcGxhdGVMaXRlcmFsTGlrZU5vZGUgPSB0cy5jcmVhdGVUZW1wbGF0ZUhlYWQoY29va2VkLCByYXcpO1xuICAobm9kZS5raW5kIGFzIHRzLlN5bnRheEtpbmQpID0gdHMuU3ludGF4S2luZC5UZW1wbGF0ZU1pZGRsZTtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVNaWRkbGU7XG59XG5cbi8vIEhBQ0s6IFVzZSB0aGlzIGluIHBsYWNlIG9mIGB0cy5jcmVhdGVUZW1wbGF0ZVRhaWwoKWAuXG4vLyBSZXZlcnQgb25jZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzM1Mzc0IGlzIGZpeGVkLlxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRlbXBsYXRlVGFpbChjb29rZWQ6IHN0cmluZywgcmF3OiBzdHJpbmcpOiB0cy5UZW1wbGF0ZVRhaWwge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlVGFpbDtcbiAgcmV0dXJuIG5vZGUgYXMgdHMuVGVtcGxhdGVUYWlsO1xufVxuXG4vKipcbiAqIEF0dGFjaCB0aGUgZ2l2ZW4gYGxlYWRpbmdDb21tZW50c2AgdG8gdGhlIGBzdGF0ZW1lbnRgIG5vZGUuXG4gKlxuICogQHBhcmFtIHN0YXRlbWVudCBUaGUgc3RhdGVtZW50IHRoYXQgd2lsbCBoYXZlIGNvbW1lbnRzIGF0dGFjaGVkLlxuICogQHBhcmFtIGxlYWRpbmdDb21tZW50cyBUaGUgY29tbWVudHMgdG8gYXR0YWNoIHRvIHRoZSBzdGF0ZW1lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdHRhY2hDb21tZW50czxUIGV4dGVuZHMgdHMuU3RhdGVtZW50PihcbiAgICBzdGF0ZW1lbnQ6IFQsIGxlYWRpbmdDb21tZW50czogTGVhZGluZ0NvbW1lbnRbXXx1bmRlZmluZWQpOiBUIHtcbiAgaWYgKGxlYWRpbmdDb21tZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHN0YXRlbWVudDtcbiAgfVxuXG4gIGZvciAoY29uc3QgY29tbWVudCBvZiBsZWFkaW5nQ29tbWVudHMpIHtcbiAgICBjb25zdCBjb21tZW50S2luZCA9IGNvbW1lbnQubXVsdGlsaW5lID8gdHMuU3ludGF4S2luZC5NdWx0aUxpbmVDb21tZW50VHJpdmlhIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuU3ludGF4S2luZC5TaW5nbGVMaW5lQ29tbWVudFRyaXZpYTtcbiAgICBpZiAoY29tbWVudC5tdWx0aWxpbmUpIHtcbiAgICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KFxuICAgICAgICAgIHN0YXRlbWVudCwgY29tbWVudEtpbmQsIGNvbW1lbnQudG9TdHJpbmcoKSwgY29tbWVudC50cmFpbGluZ05ld2xpbmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgY29tbWVudC50b1N0cmluZygpLnNwbGl0KCdcXG4nKSkge1xuICAgICAgICB0cy5hZGRTeW50aGV0aWNMZWFkaW5nQ29tbWVudChzdGF0ZW1lbnQsIGNvbW1lbnRLaW5kLCBsaW5lLCBjb21tZW50LnRyYWlsaW5nTmV3bGluZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBzdGF0ZW1lbnQ7XG59XG4iXX0=