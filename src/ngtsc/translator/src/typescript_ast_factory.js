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
    /**
     * Different optimizers use different annotations on a function or method call to indicate its pure
     * status.
     */
    var PureAnnotation;
    (function (PureAnnotation) {
        /**
         * Closure's annotation for purity is `@pureOrBreakMyCode`, but this needs to be in a semantic
         * (jsdoc) enabled comment. Thus, the actual comment text for Closure must include the `*` that
         * turns a `/*` comment into a `/**` comment, as well as surrounding whitespace.
         */
        PureAnnotation["CLOSURE"] = "* @pureOrBreakMyCode ";
        PureAnnotation["TERSER"] = "@__PURE__";
    })(PureAnnotation || (PureAnnotation = {}));
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
        function TypeScriptAstFactory(annotateForClosureCompiler) {
            this.annotateForClosureCompiler = annotateForClosureCompiler;
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
                ts.addSyntheticLeadingComment(call, ts.SyntaxKind.MultiLineCommentTrivia, this.annotateForClosureCompiler ? PureAnnotation.CLOSURE : PureAnnotation.TERSER, 
                /* trailing newline */ false);
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
    }
    exports.attachComments = attachComments;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9hc3RfZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNsYXRvci9zcmMvdHlwZXNjcmlwdF9hc3RfZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDOzs7T0FHRztJQUNILElBQUssY0FTSjtJQVRELFdBQUssY0FBYztRQUNqQjs7OztXQUlHO1FBQ0gsbURBQWlDLENBQUE7UUFFakMsc0NBQW9CLENBQUE7SUFDdEIsQ0FBQyxFQVRJLGNBQWMsS0FBZCxjQUFjLFFBU2xCO0lBRUQsSUFBTSxlQUFlLEdBQWtEO1FBQ3JFLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7UUFDNUIsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVTtRQUM3QixHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7S0FDcEMsQ0FBQztJQUVGLElBQU0sZ0JBQWdCLEdBQThDO1FBQ2xFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLHVCQUF1QjtRQUMzQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7UUFDbkMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCO1FBQzFDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWM7UUFDakMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVTtRQUM3QixJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUI7UUFDckMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCO1FBQzVDLEdBQUcsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWE7UUFDaEMsSUFBSSxF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QUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQzt5QkFDdEY7Ozs7Ozs7OztpQkFDRjthQUNGOzs7Ozs7Ozs7SUFDSCxDQUFDO0lBYkQsd0NBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FzdEZhY3RvcnksIEJpbmFyeU9wZXJhdG9yLCBMZWFkaW5nQ29tbWVudCwgT2JqZWN0TGl0ZXJhbFByb3BlcnR5LCBTb3VyY2VNYXBSYW5nZSwgVGVtcGxhdGVMaXRlcmFsLCBVbmFyeU9wZXJhdG9yLCBWYXJpYWJsZURlY2xhcmF0aW9uVHlwZX0gZnJvbSAnLi9hcGkvYXN0X2ZhY3RvcnknO1xuXG4vKipcbiAqIERpZmZlcmVudCBvcHRpbWl6ZXJzIHVzZSBkaWZmZXJlbnQgYW5ub3RhdGlvbnMgb24gYSBmdW5jdGlvbiBvciBtZXRob2QgY2FsbCB0byBpbmRpY2F0ZSBpdHMgcHVyZVxuICogc3RhdHVzLlxuICovXG5lbnVtIFB1cmVBbm5vdGF0aW9uIHtcbiAgLyoqXG4gICAqIENsb3N1cmUncyBhbm5vdGF0aW9uIGZvciBwdXJpdHkgaXMgYEBwdXJlT3JCcmVha015Q29kZWAsIGJ1dCB0aGlzIG5lZWRzIHRvIGJlIGluIGEgc2VtYW50aWNcbiAgICogKGpzZG9jKSBlbmFibGVkIGNvbW1lbnQuIFRodXMsIHRoZSBhY3R1YWwgY29tbWVudCB0ZXh0IGZvciBDbG9zdXJlIG11c3QgaW5jbHVkZSB0aGUgYCpgIHRoYXRcbiAgICogdHVybnMgYSBgLypgIGNvbW1lbnQgaW50byBhIGAvKipgIGNvbW1lbnQsIGFzIHdlbGwgYXMgc3Vycm91bmRpbmcgd2hpdGVzcGFjZS5cbiAgICovXG4gIENMT1NVUkUgPSAnKiBAcHVyZU9yQnJlYWtNeUNvZGUgJyxcblxuICBURVJTRVIgPSAnQF9fUFVSRV9fJyxcbn1cblxuY29uc3QgVU5BUllfT1BFUkFUT1JTOiBSZWNvcmQ8VW5hcnlPcGVyYXRvciwgdHMuUHJlZml4VW5hcnlPcGVyYXRvcj4gPSB7XG4gICcrJzogdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sXG4gICctJzogdHMuU3ludGF4S2luZC5NaW51c1Rva2VuLFxuICAnISc6IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25Ub2tlbixcbn07XG5cbmNvbnN0IEJJTkFSWV9PUEVSQVRPUlM6IFJlY29yZDxCaW5hcnlPcGVyYXRvciwgdHMuQmluYXJ5T3BlcmF0b3I+ID0ge1xuICAnJiYnOiB0cy5TeW50YXhLaW5kLkFtcGVyc2FuZEFtcGVyc2FuZFRva2VuLFxuICAnPic6IHRzLlN5bnRheEtpbmQuR3JlYXRlclRoYW5Ub2tlbixcbiAgJz49JzogdHMuU3ludGF4S2luZC5HcmVhdGVyVGhhbkVxdWFsc1Rva2VuLFxuICAnJic6IHRzLlN5bnRheEtpbmQuQW1wZXJzYW5kVG9rZW4sXG4gICcvJzogdHMuU3ludGF4S2luZC5TbGFzaFRva2VuLFxuICAnPT0nOiB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuLFxuICAnPT09JzogdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbixcbiAgJzwnOiB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW4sXG4gICc8PSc6IHRzLlN5bnRheEtpbmQuTGVzc1RoYW5FcXVhbHNUb2tlbixcbiAgJy0nOiB0cy5TeW50YXhLaW5kLk1pbnVzVG9rZW4sXG4gICclJzogdHMuU3ludGF4S2luZC5QZXJjZW50VG9rZW4sXG4gICcqJzogdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuLFxuICAnIT0nOiB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW4sXG4gICchPT0nOiB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzRXF1YWxzVG9rZW4sXG4gICd8fCc6IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4sXG4gICcrJzogdHMuU3ludGF4S2luZC5QbHVzVG9rZW4sXG59O1xuXG5jb25zdCBWQVJfVFlQRVM6IFJlY29yZDxWYXJpYWJsZURlY2xhcmF0aW9uVHlwZSwgdHMuTm9kZUZsYWdzPiA9IHtcbiAgJ2NvbnN0JzogdHMuTm9kZUZsYWdzLkNvbnN0LFxuICAnbGV0JzogdHMuTm9kZUZsYWdzLkxldCxcbiAgJ3Zhcic6IHRzLk5vZGVGbGFncy5Ob25lLFxufTtcblxuLyoqXG4gKiBBIFR5cGVTY3JpcHQgZmxhdm91cmVkIGltcGxlbWVudGF0aW9uIG9mIHRoZSBBc3RGYWN0b3J5LlxuICovXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdEFzdEZhY3RvcnkgaW1wbGVtZW50cyBBc3RGYWN0b3J5PHRzLlN0YXRlbWVudCwgdHMuRXhwcmVzc2lvbj4ge1xuICBwcml2YXRlIGV4dGVybmFsU291cmNlRmlsZXMgPSBuZXcgTWFwPHN0cmluZywgdHMuU291cmNlTWFwU291cmNlPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pIHt9XG5cbiAgYXR0YWNoQ29tbWVudHMgPSBhdHRhY2hDb21tZW50cztcblxuICBjcmVhdGVBcnJheUxpdGVyYWwgPSB0cy5jcmVhdGVBcnJheUxpdGVyYWw7XG5cbiAgY3JlYXRlQXNzaWdubWVudCh0YXJnZXQ6IHRzLkV4cHJlc3Npb24sIHZhbHVlOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeSh0YXJnZXQsIHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4sIHZhbHVlKTtcbiAgfVxuXG4gIGNyZWF0ZUJpbmFyeUV4cHJlc3Npb24oXG4gICAgICBsZWZ0T3BlcmFuZDogdHMuRXhwcmVzc2lvbiwgb3BlcmF0b3I6IEJpbmFyeU9wZXJhdG9yLFxuICAgICAgcmlnaHRPcGVyYW5kOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJpbmFyeShsZWZ0T3BlcmFuZCwgQklOQVJZX09QRVJBVE9SU1tvcGVyYXRvcl0sIHJpZ2h0T3BlcmFuZCk7XG4gIH1cblxuICBjcmVhdGVCbG9jayhib2R5OiB0cy5TdGF0ZW1lbnRbXSk6IHRzLlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUJsb2NrKGJvZHkpO1xuICB9XG5cbiAgY3JlYXRlQ2FsbEV4cHJlc3Npb24oY2FsbGVlOiB0cy5FeHByZXNzaW9uLCBhcmdzOiB0cy5FeHByZXNzaW9uW10sIHB1cmU6IGJvb2xlYW4pOiB0cy5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBjYWxsID0gdHMuY3JlYXRlQ2FsbChjYWxsZWUsIHVuZGVmaW5lZCwgYXJncyk7XG4gICAgaWYgKHB1cmUpIHtcbiAgICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KFxuICAgICAgICAgIGNhbGwsIHRzLlN5bnRheEtpbmQuTXVsdGlMaW5lQ29tbWVudFRyaXZpYSxcbiAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID8gUHVyZUFubm90YXRpb24uQ0xPU1VSRSA6IFB1cmVBbm5vdGF0aW9uLlRFUlNFUixcbiAgICAgICAgICAvKiB0cmFpbGluZyBuZXdsaW5lICovIGZhbHNlKTtcbiAgICB9XG4gICAgcmV0dXJuIGNhbGw7XG4gIH1cblxuICBjcmVhdGVDb25kaXRpb25hbCA9IHRzLmNyZWF0ZUNvbmRpdGlvbmFsO1xuXG4gIGNyZWF0ZUVsZW1lbnRBY2Nlc3MgPSB0cy5jcmVhdGVFbGVtZW50QWNjZXNzO1xuXG4gIGNyZWF0ZUV4cHJlc3Npb25TdGF0ZW1lbnQgPSB0cy5jcmVhdGVFeHByZXNzaW9uU3RhdGVtZW50O1xuXG4gIGNyZWF0ZUZ1bmN0aW9uRGVjbGFyYXRpb24oZnVuY3Rpb25OYW1lOiBzdHJpbmcsIHBhcmFtZXRlcnM6IHN0cmluZ1tdLCBib2R5OiB0cy5TdGF0ZW1lbnQpOlxuICAgICAgdHMuU3RhdGVtZW50IHtcbiAgICBpZiAoIXRzLmlzQmxvY2soYm9keSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzeW50YXgsIGV4cGVjdGVkIGEgYmxvY2ssIGJ1dCBnb3QgJHt0cy5TeW50YXhLaW5kW2JvZHkua2luZF19LmApO1xuICAgIH1cbiAgICByZXR1cm4gdHMuY3JlYXRlRnVuY3Rpb25EZWNsYXJhdGlvbihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZnVuY3Rpb25OYW1lLCB1bmRlZmluZWQsXG4gICAgICAgIHBhcmFtZXRlcnMubWFwKHBhcmFtID0+IHRzLmNyZWF0ZVBhcmFtZXRlcih1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwYXJhbSkpLFxuICAgICAgICB1bmRlZmluZWQsIGJvZHkpO1xuICB9XG5cbiAgY3JlYXRlRnVuY3Rpb25FeHByZXNzaW9uKGZ1bmN0aW9uTmFtZTogc3RyaW5nfG51bGwsIHBhcmFtZXRlcnM6IHN0cmluZ1tdLCBib2R5OiB0cy5TdGF0ZW1lbnQpOlxuICAgICAgdHMuRXhwcmVzc2lvbiB7XG4gICAgaWYgKCF0cy5pc0Jsb2NrKGJvZHkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgc3ludGF4LCBleHBlY3RlZCBhIGJsb2NrLCBidXQgZ290ICR7dHMuU3ludGF4S2luZFtib2R5LmtpbmRdfS5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbihcbiAgICAgICAgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGZ1bmN0aW9uTmFtZSA/PyB1bmRlZmluZWQsIHVuZGVmaW5lZCxcbiAgICAgICAgcGFyYW1ldGVycy5tYXAocGFyYW0gPT4gdHMuY3JlYXRlUGFyYW1ldGVyKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHBhcmFtKSksXG4gICAgICAgIHVuZGVmaW5lZCwgYm9keSk7XG4gIH1cblxuICBjcmVhdGVJZGVudGlmaWVyID0gdHMuY3JlYXRlSWRlbnRpZmllcjtcblxuICBjcmVhdGVJZlN0YXRlbWVudChcbiAgICAgIGNvbmRpdGlvbjogdHMuRXhwcmVzc2lvbiwgdGhlblN0YXRlbWVudDogdHMuU3RhdGVtZW50LFxuICAgICAgZWxzZVN0YXRlbWVudDogdHMuU3RhdGVtZW50fG51bGwpOiB0cy5TdGF0ZW1lbnQge1xuICAgIHJldHVybiB0cy5jcmVhdGVJZihjb25kaXRpb24sIHRoZW5TdGF0ZW1lbnQsIGVsc2VTdGF0ZW1lbnQgPz8gdW5kZWZpbmVkKTtcbiAgfVxuXG4gIGNyZWF0ZUxpdGVyYWwodmFsdWU6IHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfHVuZGVmaW5lZCk6IHRzLkV4cHJlc3Npb24ge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHMuY3JlYXRlSWRlbnRpZmllcigndW5kZWZpbmVkJyk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZU51bGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRzLmNyZWF0ZUxpdGVyYWwodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZU5ld0V4cHJlc3Npb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiwgYXJnczogdHMuRXhwcmVzc2lvbltdKTogdHMuRXhwcmVzc2lvbiB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZU5ldyhleHByZXNzaW9uLCB1bmRlZmluZWQsIGFyZ3MpO1xuICB9XG5cbiAgY3JlYXRlT2JqZWN0TGl0ZXJhbChwcm9wZXJ0aWVzOiBPYmplY3RMaXRlcmFsUHJvcGVydHk8dHMuRXhwcmVzc2lvbj5bXSk6IHRzLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKHByb3BlcnRpZXMubWFwKFxuICAgICAgICBwcm9wID0+IHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICAgIHByb3AucXVvdGVkID8gdHMuY3JlYXRlTGl0ZXJhbChwcm9wLnByb3BlcnR5TmFtZSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVJZGVudGlmaWVyKHByb3AucHJvcGVydHlOYW1lKSxcbiAgICAgICAgICAgIHByb3AudmFsdWUpKSk7XG4gIH1cblxuICBjcmVhdGVQYXJlbnRoZXNpemVkRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZVBhcmVuO1xuXG4gIGNyZWF0ZVByb3BlcnR5QWNjZXNzID0gdHMuY3JlYXRlUHJvcGVydHlBY2Nlc3M7XG5cbiAgY3JlYXRlUmV0dXJuU3RhdGVtZW50KGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb258bnVsbCk6IHRzLlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVJldHVybihleHByZXNzaW9uID8/IHVuZGVmaW5lZCk7XG4gIH1cblxuICBjcmVhdGVUYWdnZWRUZW1wbGF0ZSh0YWc6IHRzLkV4cHJlc3Npb24sIHRlbXBsYXRlOiBUZW1wbGF0ZUxpdGVyYWw8dHMuRXhwcmVzc2lvbj4pOlxuICAgICAgdHMuRXhwcmVzc2lvbiB7XG4gICAgbGV0IHRlbXBsYXRlTGl0ZXJhbDogdHMuVGVtcGxhdGVMaXRlcmFsO1xuICAgIGNvbnN0IGxlbmd0aCA9IHRlbXBsYXRlLmVsZW1lbnRzLmxlbmd0aDtcbiAgICBjb25zdCBoZWFkID0gdGVtcGxhdGUuZWxlbWVudHNbMF07XG4gICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuICAgICAgdGVtcGxhdGVMaXRlcmFsID0gdHMuY3JlYXRlTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwoaGVhZC5jb29rZWQsIGhlYWQucmF3KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3BhbnM6IHRzLlRlbXBsYXRlU3BhbltdID0gW107XG4gICAgICAvLyBDcmVhdGUgdGhlIG1pZGRsZSBwYXJ0c1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgY29uc3Qge2Nvb2tlZCwgcmF3LCByYW5nZX0gPSB0ZW1wbGF0ZS5lbGVtZW50c1tpXTtcbiAgICAgICAgY29uc3QgbWlkZGxlID0gY3JlYXRlVGVtcGxhdGVNaWRkbGUoY29va2VkLCByYXcpO1xuICAgICAgICBpZiAocmFuZ2UgIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnNldFNvdXJjZU1hcFJhbmdlKG1pZGRsZSwgcmFuZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHNwYW5zLnB1c2godHMuY3JlYXRlVGVtcGxhdGVTcGFuKHRlbXBsYXRlLmV4cHJlc3Npb25zW2kgLSAxXSwgbWlkZGxlKSk7XG4gICAgICB9XG4gICAgICAvLyBDcmVhdGUgdGhlIHRhaWwgcGFydFxuICAgICAgY29uc3QgcmVzb2x2ZWRFeHByZXNzaW9uID0gdGVtcGxhdGUuZXhwcmVzc2lvbnNbbGVuZ3RoIC0gMl07XG4gICAgICBjb25zdCB0ZW1wbGF0ZVBhcnQgPSB0ZW1wbGF0ZS5lbGVtZW50c1tsZW5ndGggLSAxXTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVGFpbCA9IGNyZWF0ZVRlbXBsYXRlVGFpbCh0ZW1wbGF0ZVBhcnQuY29va2VkLCB0ZW1wbGF0ZVBhcnQucmF3KTtcbiAgICAgIGlmICh0ZW1wbGF0ZVBhcnQucmFuZ2UgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5zZXRTb3VyY2VNYXBSYW5nZSh0ZW1wbGF0ZVRhaWwsIHRlbXBsYXRlUGFydC5yYW5nZSk7XG4gICAgICB9XG4gICAgICBzcGFucy5wdXNoKHRzLmNyZWF0ZVRlbXBsYXRlU3BhbihyZXNvbHZlZEV4cHJlc3Npb24sIHRlbXBsYXRlVGFpbCkpO1xuICAgICAgLy8gUHV0IGl0IGFsbCB0b2dldGhlclxuICAgICAgdGVtcGxhdGVMaXRlcmFsID1cbiAgICAgICAgICB0cy5jcmVhdGVUZW1wbGF0ZUV4cHJlc3Npb24odHMuY3JlYXRlVGVtcGxhdGVIZWFkKGhlYWQuY29va2VkLCBoZWFkLnJhdyksIHNwYW5zKTtcbiAgICB9XG4gICAgaWYgKGhlYWQucmFuZ2UgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2V0U291cmNlTWFwUmFuZ2UodGVtcGxhdGVMaXRlcmFsLCBoZWFkLnJhbmdlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVRhZ2dlZFRlbXBsYXRlKHRhZywgdGVtcGxhdGVMaXRlcmFsKTtcbiAgfVxuXG4gIGNyZWF0ZVRocm93U3RhdGVtZW50ID0gdHMuY3JlYXRlVGhyb3c7XG5cbiAgY3JlYXRlVHlwZU9mRXhwcmVzc2lvbiA9IHRzLmNyZWF0ZVR5cGVPZjtcblxuXG4gIGNyZWF0ZVVuYXJ5RXhwcmVzc2lvbihvcGVyYXRvcjogVW5hcnlPcGVyYXRvciwgb3BlcmFuZDogdHMuRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb24ge1xuICAgIHJldHVybiB0cy5jcmVhdGVQcmVmaXgoVU5BUllfT1BFUkFUT1JTW29wZXJhdG9yXSwgb3BlcmFuZCk7XG4gIH1cblxuICBjcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKFxuICAgICAgdmFyaWFibGVOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiB0cy5FeHByZXNzaW9ufG51bGwsXG4gICAgICB0eXBlOiBWYXJpYWJsZURlY2xhcmF0aW9uVHlwZSk6IHRzLlN0YXRlbWVudCB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KFxuICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24odmFyaWFibGVOYW1lLCB1bmRlZmluZWQsIGluaXRpYWxpemVyID8/IHVuZGVmaW5lZCldLFxuICAgICAgICAgICAgVkFSX1RZUEVTW3R5cGVdKSxcbiAgICApO1xuICB9XG5cbiAgc2V0U291cmNlTWFwUmFuZ2U8VCBleHRlbmRzIHRzLk5vZGU+KG5vZGU6IFQsIHNvdXJjZU1hcFJhbmdlOiBTb3VyY2VNYXBSYW5nZXxudWxsKTogVCB7XG4gICAgaWYgKHNvdXJjZU1hcFJhbmdlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmwgPSBzb3VyY2VNYXBSYW5nZS51cmw7XG4gICAgaWYgKCF0aGlzLmV4dGVybmFsU291cmNlRmlsZXMuaGFzKHVybCkpIHtcbiAgICAgIHRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5zZXQoXG4gICAgICAgICAgdXJsLCB0cy5jcmVhdGVTb3VyY2VNYXBTb3VyY2UodXJsLCBzb3VyY2VNYXBSYW5nZS5jb250ZW50LCBwb3MgPT4gcG9zKSk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZXh0ZXJuYWxTb3VyY2VGaWxlcy5nZXQodXJsKTtcbiAgICB0cy5zZXRTb3VyY2VNYXBSYW5nZShcbiAgICAgICAgbm9kZSwge3Bvczogc291cmNlTWFwUmFuZ2Uuc3RhcnQub2Zmc2V0LCBlbmQ6IHNvdXJjZU1hcFJhbmdlLmVuZC5vZmZzZXQsIHNvdXJjZX0pO1xuICAgIHJldHVybiBub2RlO1xuICB9XG59XG5cbi8vIEhBQ0s6IFVzZSB0aGlzIGluIHBsYWNlIG9mIGB0cy5jcmVhdGVUZW1wbGF0ZU1pZGRsZSgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWQuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVNaWRkbGUoY29va2VkOiBzdHJpbmcsIHJhdzogc3RyaW5nKTogdHMuVGVtcGxhdGVNaWRkbGUge1xuICBjb25zdCBub2RlOiB0cy5UZW1wbGF0ZUxpdGVyYWxMaWtlTm9kZSA9IHRzLmNyZWF0ZVRlbXBsYXRlSGVhZChjb29rZWQsIHJhdyk7XG4gIChub2RlLmtpbmQgYXMgdHMuU3ludGF4S2luZCkgPSB0cy5TeW50YXhLaW5kLlRlbXBsYXRlTWlkZGxlO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZU1pZGRsZTtcbn1cblxuLy8gSEFDSzogVXNlIHRoaXMgaW4gcGxhY2Ugb2YgYHRzLmNyZWF0ZVRlbXBsYXRlVGFpbCgpYC5cbi8vIFJldmVydCBvbmNlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzUzNzQgaXMgZml4ZWQuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGVtcGxhdGVUYWlsKGNvb2tlZDogc3RyaW5nLCByYXc6IHN0cmluZyk6IHRzLlRlbXBsYXRlVGFpbCB7XG4gIGNvbnN0IG5vZGU6IHRzLlRlbXBsYXRlTGl0ZXJhbExpa2VOb2RlID0gdHMuY3JlYXRlVGVtcGxhdGVIZWFkKGNvb2tlZCwgcmF3KTtcbiAgKG5vZGUua2luZCBhcyB0cy5TeW50YXhLaW5kKSA9IHRzLlN5bnRheEtpbmQuVGVtcGxhdGVUYWlsO1xuICByZXR1cm4gbm9kZSBhcyB0cy5UZW1wbGF0ZVRhaWw7XG59XG5cbi8qKlxuICogQXR0YWNoIHRoZSBnaXZlbiBgbGVhZGluZ0NvbW1lbnRzYCB0byB0aGUgYHN0YXRlbWVudGAgbm9kZS5cbiAqXG4gKiBAcGFyYW0gc3RhdGVtZW50IFRoZSBzdGF0ZW1lbnQgdGhhdCB3aWxsIGhhdmUgY29tbWVudHMgYXR0YWNoZWQuXG4gKiBAcGFyYW0gbGVhZGluZ0NvbW1lbnRzIFRoZSBjb21tZW50cyB0byBhdHRhY2ggdG8gdGhlIHN0YXRlbWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGF0dGFjaENvbW1lbnRzKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBsZWFkaW5nQ29tbWVudHM6IExlYWRpbmdDb21tZW50W10pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjb21tZW50IG9mIGxlYWRpbmdDb21tZW50cykge1xuICAgIGNvbnN0IGNvbW1lbnRLaW5kID0gY29tbWVudC5tdWx0aWxpbmUgPyB0cy5TeW50YXhLaW5kLk11bHRpTGluZUNvbW1lbnRUcml2aWEgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5TeW50YXhLaW5kLlNpbmdsZUxpbmVDb21tZW50VHJpdmlhO1xuICAgIGlmIChjb21tZW50Lm11bHRpbGluZSkge1xuICAgICAgdHMuYWRkU3ludGhldGljTGVhZGluZ0NvbW1lbnQoXG4gICAgICAgICAgc3RhdGVtZW50LCBjb21tZW50S2luZCwgY29tbWVudC50b1N0cmluZygpLCBjb21tZW50LnRyYWlsaW5nTmV3bGluZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBjb21tZW50LnRvU3RyaW5nKCkuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgIHRzLmFkZFN5bnRoZXRpY0xlYWRpbmdDb21tZW50KHN0YXRlbWVudCwgY29tbWVudEtpbmQsIGxpbmUsIGNvbW1lbnQudHJhaWxpbmdOZXdsaW5lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==