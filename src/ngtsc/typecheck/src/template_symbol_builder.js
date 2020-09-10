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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SymbolBuilder = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var comments_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/comments");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    /**
     * A class which extracts information from a type check block.
     * This class is essentially used as just a closure around the constructor parameters.
     */
    var SymbolBuilder = /** @class */ (function () {
        function SymbolBuilder(typeChecker, shimPath, typeCheckBlock, templateData) {
            this.typeChecker = typeChecker;
            this.shimPath = shimPath;
            this.typeCheckBlock = typeCheckBlock;
            this.templateData = templateData;
        }
        SymbolBuilder.prototype.getSymbol = function (node) {
            if (node instanceof compiler_1.TmplAstBoundAttribute) {
                // TODO(atscott): input and output bindings only return the first directive match but should
                // return a list of bindings for all of them.
                return this.getSymbolOfInputBinding(node);
            }
            else if (node instanceof compiler_1.TmplAstBoundEvent) {
                return this.getSymbolOfBoundEvent(node);
            }
            else if (node instanceof compiler_1.TmplAstElement) {
                return this.getSymbolOfElement(node);
            }
            else if (node instanceof compiler_1.TmplAstTemplate) {
                return this.getSymbolOfAstTemplate(node);
            }
            else if (node instanceof compiler_1.TmplAstVariable) {
                return this.getSymbolOfVariable(node);
            }
            else if (node instanceof compiler_1.TmplAstReference) {
                return this.getSymbolOfReference(node);
            }
            else if (node instanceof compiler_1.AST) {
                return this.getSymbolOfTemplateExpression(node);
            }
            // TODO(atscott): TmplAstContent, TmplAstIcu
            return null;
        };
        SymbolBuilder.prototype.getSymbolOfAstTemplate = function (template) {
            var directives = this.getDirectivesOfNode(template);
            return { kind: api_1.SymbolKind.Template, directives: directives };
        };
        SymbolBuilder.prototype.getSymbolOfElement = function (element) {
            var _a;
            var elementSourceSpan = (_a = element.startSourceSpan) !== null && _a !== void 0 ? _a : element.sourceSpan;
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: ts.isVariableDeclaration });
            if (node === null) {
                return null;
            }
            var symbolFromDeclaration = this.getSymbolOfVariableDeclaration(node);
            if (symbolFromDeclaration === null || symbolFromDeclaration.tsSymbol === null) {
                return null;
            }
            var directives = this.getDirectivesOfNode(element);
            // All statements in the TCB are `Expression`s that optionally include more information.
            // An `ElementSymbol` uses the information returned for the variable declaration expression,
            // adds the directives for the element, and updates the `kind` to be `SymbolKind.Element`.
            return tslib_1.__assign(tslib_1.__assign({}, symbolFromDeclaration), { kind: api_1.SymbolKind.Element, directives: directives });
        };
        SymbolBuilder.prototype.getDirectivesOfNode = function (element) {
            var _this = this;
            var _a;
            var elementSourceSpan = (_a = element.startSourceSpan) !== null && _a !== void 0 ? _a : element.sourceSpan;
            var tcbSourceFile = this.typeCheckBlock.getSourceFile();
            var isDirectiveDeclaration = function (node) { return ts.isTypeNode(node) &&
                comments_1.hasExpressionIdentifier(tcbSourceFile, node, comments_1.ExpressionIdentifier.DIRECTIVE); };
            var nodes = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
            return nodes
                .map(function (node) {
                var symbol = _this.getSymbolOfTsNode(node);
                if (symbol === null || symbol.tsSymbol === null) {
                    return null;
                }
                var directiveSymbol = tslib_1.__assign(tslib_1.__assign({}, symbol), { tsSymbol: symbol.tsSymbol, kind: api_1.SymbolKind.Directive });
                return directiveSymbol;
            })
                .filter(function (d) { return d !== null; });
        };
        SymbolBuilder.prototype.getSymbolOfBoundEvent = function (eventBinding) {
            // Outputs are a `ts.CallExpression` that look like one of the two:
            // * _outputHelper(_t1["outputField"]).subscribe(handler);
            // * _t1.addEventListener(handler);
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: eventBinding.sourceSpan, filter: ts.isCallExpression });
            if (node === null) {
                return null;
            }
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
            if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                // Bindings to element or template events produce `addEventListener` which
                // we cannot get the field for.
                return null;
            }
            var outputFieldAccess = type_check_block_1.TcbDirectiveOutputsOp.decodeOutputCallExpression(node);
            if (outputFieldAccess === null) {
                return null;
            }
            var tsSymbol = this.typeChecker.getSymbolAtLocation(outputFieldAccess.argumentExpression);
            if (tsSymbol === undefined) {
                return null;
            }
            var target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess);
            if (target === null) {
                return null;
            }
            var positionInShimFile = outputFieldAccess.argumentExpression.getStart();
            var tsType = this.typeChecker.getTypeAtLocation(node);
            return {
                kind: api_1.SymbolKind.Output,
                bindings: [{
                        kind: api_1.SymbolKind.Binding,
                        tsSymbol: tsSymbol,
                        tsType: tsType,
                        target: target,
                        shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
                    }],
            };
        };
        SymbolBuilder.prototype.getSymbolOfInputBinding = function (attributeBinding) {
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: attributeBinding.sourceSpan, filter: typescript_1.isAssignment });
            if (node === null) {
                return null;
            }
            var tsSymbol;
            var positionInShimFile = null;
            var tsType;
            if (ts.isElementAccessExpression(node.left)) {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node.left.argumentExpression);
                positionInShimFile = node.left.argumentExpression.getStart();
                tsType = this.typeChecker.getTypeAtLocation(node.left.argumentExpression);
            }
            else if (ts.isPropertyAccessExpression(node.left)) {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node.left.name);
                positionInShimFile = node.left.name.getStart();
                tsType = this.typeChecker.getTypeAtLocation(node.left.name);
            }
            else {
                return null;
            }
            if (tsSymbol === undefined || positionInShimFile === null) {
                return null;
            }
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(attributeBinding);
            var target;
            if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                target = this.getSymbol(consumer);
            }
            else {
                target = this.getDirectiveSymbolForAccessExpression(node.left);
            }
            if (target === null) {
                return null;
            }
            return {
                kind: api_1.SymbolKind.Input,
                bindings: [{
                        kind: api_1.SymbolKind.Binding,
                        tsSymbol: tsSymbol,
                        tsType: tsType,
                        target: target,
                        shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
                    }],
            };
        };
        SymbolBuilder.prototype.getDirectiveSymbolForAccessExpression = function (node) {
            var _a;
            // In either case, `_t1["index"]` or `_t1.index`, `node.expression` is _t1.
            // The retrieved symbol for _t1 will be the variable declaration.
            var tsSymbol = this.typeChecker.getSymbolAtLocation(node.expression);
            if (tsSymbol === undefined || tsSymbol.declarations.length === 0) {
                return null;
            }
            var _b = tslib_1.__read(tsSymbol.declarations, 1), declaration = _b[0];
            if (!ts.isVariableDeclaration(declaration) ||
                !comments_1.hasExpressionIdentifier(
                // The expression identifier could be on the type (for regular directives) or the name
                // (for generic directives and the ctor op).
                declaration.getSourceFile(), (_a = declaration.type) !== null && _a !== void 0 ? _a : declaration.name, comments_1.ExpressionIdentifier.DIRECTIVE)) {
                return null;
            }
            var symbol = this.getSymbolOfVariableDeclaration(declaration);
            if (symbol === null || symbol.tsSymbol === null) {
                return null;
            }
            return {
                kind: api_1.SymbolKind.Directive,
                tsSymbol: symbol.tsSymbol,
                tsType: symbol.tsType,
                shimLocation: symbol.shimLocation,
            };
        };
        SymbolBuilder.prototype.getSymbolOfVariable = function (variable) {
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: variable.sourceSpan, filter: ts.isVariableDeclaration });
            if (node === null) {
                return null;
            }
            var expressionSymbol = this.getSymbolOfVariableDeclaration(node);
            if (expressionSymbol === null) {
                return null;
            }
            return tslib_1.__assign(tslib_1.__assign({}, expressionSymbol), { kind: api_1.SymbolKind.Variable, declaration: variable });
        };
        SymbolBuilder.prototype.getSymbolOfReference = function (ref) {
            var target = this.templateData.boundTarget.getReferenceTarget(ref);
            // Find the node for the reference declaration, i.e. `var _t2 = _t1;`
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: ref.sourceSpan, filter: ts.isVariableDeclaration });
            if (node === null || target === null || node.initializer === undefined) {
                return null;
            }
            // TODO(atscott): Shim location will need to be adjusted
            var symbol = this.getSymbolOfTsNode(node.name);
            if (symbol === null || symbol.tsSymbol === null) {
                return null;
            }
            if (target instanceof compiler_1.TmplAstTemplate || target instanceof compiler_1.TmplAstElement) {
                return tslib_1.__assign(tslib_1.__assign({}, symbol), { tsSymbol: symbol.tsSymbol, kind: api_1.SymbolKind.Reference, target: target, declaration: ref });
            }
            else {
                if (!ts.isClassDeclaration(target.directive.ref.node)) {
                    return null;
                }
                return tslib_1.__assign(tslib_1.__assign({}, symbol), { kind: api_1.SymbolKind.Reference, tsSymbol: symbol.tsSymbol, declaration: ref, target: target.directive.ref.node });
            }
        };
        SymbolBuilder.prototype.getSymbolOfTemplateExpression = function (expression) {
            if (expression instanceof compiler_1.ASTWithSource) {
                expression = expression.ast;
            }
            var expressionTarget = this.templateData.boundTarget.getExpressionTarget(expression);
            if (expressionTarget !== null) {
                return this.getSymbol(expressionTarget);
            }
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.sourceSpan, filter: function (n) { return true; } });
            if (node === null) {
                return null;
            }
            while (ts.isParenthesizedExpression(node)) {
                node = node.expression;
            }
            // - If we have safe property read ("a?.b") we want to get the Symbol for b, the `whenTrue`
            // expression.
            // - If our expression is a pipe binding ("a | test:b:c"), we want the Symbol for the
            // `transform` on the pipe.
            // - Otherwise, we retrieve the symbol for the node itself with no special considerations
            if ((expression instanceof compiler_1.SafePropertyRead || expression instanceof compiler_1.SafeMethodCall) &&
                ts.isConditionalExpression(node)) {
                var whenTrueSymbol = (expression instanceof compiler_1.SafeMethodCall && ts.isCallExpression(node.whenTrue)) ?
                    this.getSymbolOfTsNode(node.whenTrue.expression) :
                    this.getSymbolOfTsNode(node.whenTrue);
                if (whenTrueSymbol === null) {
                    return null;
                }
                return tslib_1.__assign(tslib_1.__assign({}, whenTrueSymbol), { kind: api_1.SymbolKind.Expression, 
                    // Rather than using the type of only the `whenTrue` part of the expression, we should
                    // still get the type of the whole conditional expression to include `|undefined`.
                    tsType: this.typeChecker.getTypeAtLocation(node) });
            }
            else if (expression instanceof compiler_1.BindingPipe && ts.isCallExpression(node)) {
                // TODO(atscott): Create a PipeSymbol to include symbol for the Pipe class
                var symbolInfo = this.getSymbolOfTsNode(node.expression);
                return symbolInfo === null ? null : tslib_1.__assign(tslib_1.__assign({}, symbolInfo), { kind: api_1.SymbolKind.Expression });
            }
            else {
                var symbolInfo = this.getSymbolOfTsNode(node);
                return symbolInfo === null ? null : tslib_1.__assign(tslib_1.__assign({}, symbolInfo), { kind: api_1.SymbolKind.Expression });
            }
        };
        SymbolBuilder.prototype.getSymbolOfTsNode = function (node) {
            var _a;
            while (ts.isParenthesizedExpression(node)) {
                node = node.expression;
            }
            var tsSymbol;
            var positionInShimFile;
            if (ts.isPropertyAccessExpression(node)) {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node.name);
                positionInShimFile = node.name.getStart();
            }
            else {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node);
                positionInShimFile = node.getStart();
            }
            var type = this.typeChecker.getTypeAtLocation(node);
            return {
                // If we could not find a symbol, fall back to the symbol on the type for the node.
                // Some nodes won't have a "symbol at location" but will have a symbol for the type.
                // One example of this would be literals.
                tsSymbol: (_a = tsSymbol !== null && tsSymbol !== void 0 ? tsSymbol : type.symbol) !== null && _a !== void 0 ? _a : null,
                tsType: type,
                shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
            };
        };
        SymbolBuilder.prototype.getSymbolOfVariableDeclaration = function (declaration) {
            // Instead of returning the Symbol for the temporary variable, we want to get the `ts.Symbol`
            // for:
            // - The type reference for `var _t2: MyDir = xyz` (prioritize/trust the declared type)
            // - The initializer for `var _t2 = _t1.index`.
            if (declaration.type && ts.isTypeReferenceNode(declaration.type)) {
                return this.getSymbolOfTsNode(declaration.type.typeName);
            }
            if (declaration.initializer === undefined) {
                return null;
            }
            var symbol = this.getSymbolOfTsNode(declaration.initializer);
            if (symbol === null) {
                return null;
            }
            return symbol;
        };
        return SymbolBuilder;
    }());
    exports.SymbolBuilder = SymbolBuilder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFtUDtJQUNuUCwrQkFBaUM7SUFHakMsa0ZBQXVEO0lBQ3ZELHFFQUF3TTtJQUV4TSxtRkFBc0g7SUFFdEgsbUdBQXlEO0lBR3pEOzs7T0FHRztJQUNIO1FBQ0UsdUJBQ3FCLFdBQTJCLEVBQW1CLFFBQXdCLEVBQ3RFLGNBQXVCLEVBQW1CLFlBQTBCO1lBRHBFLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFtQixhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN0RSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUFtQixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUFHLENBQUM7UUFLN0YsaUNBQVMsR0FBVCxVQUFVLElBQXFCO1lBQzdCLElBQUksSUFBSSxZQUFZLGdDQUFxQixFQUFFO2dCQUN6Qyw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0M7aUJBQU0sSUFBSSxJQUFJLFlBQVksNEJBQWlCLEVBQUU7Z0JBQzVDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3pDO2lCQUFNLElBQUksSUFBSSxZQUFZLHlCQUFjLEVBQUU7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNLElBQUksSUFBSSxZQUFZLDBCQUFlLEVBQUU7Z0JBQzFDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO2FB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UmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIEFTVCwgQVNUV2l0aFNvdXJjZSwgQmluZGluZ1BpcGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc0Fzc2lnbm1lbnR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIEV4cHJlc3Npb25TeW1ib2wsIElucHV0QmluZGluZ1N5bWJvbCwgT3V0cHV0QmluZGluZ1N5bWJvbCwgUmVmZXJlbmNlU3ltYm9sLCBTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlU3ltYm9sLCBUc05vZGVTeW1ib2xJbmZvLCBWYXJpYWJsZVN5bWJvbH0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtFeHByZXNzaW9uSWRlbnRpZmllciwgZmluZEFsbE1hdGNoaW5nTm9kZXMsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZSwgaGFzRXhwcmVzc2lvbklkZW50aWZpZXJ9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHtUZW1wbGF0ZURhdGF9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge1RjYkRpcmVjdGl2ZU91dHB1dHNPcH0gZnJvbSAnLi90eXBlX2NoZWNrX2Jsb2NrJztcblxuXG4vKipcbiAqIEEgY2xhc3Mgd2hpY2ggZXh0cmFjdHMgaW5mb3JtYXRpb24gZnJvbSBhIHR5cGUgY2hlY2sgYmxvY2suXG4gKiBUaGlzIGNsYXNzIGlzIGVzc2VudGlhbGx5IHVzZWQgYXMganVzdCBhIGNsb3N1cmUgYXJvdW5kIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgY2xhc3MgU3ltYm9sQnVpbGRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVhZG9ubHkgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tCbG9jazogdHMuTm9kZSwgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnB1dCBhbmQgb3V0cHV0IGJpbmRpbmdzIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBkaXJlY3RpdmUgbWF0Y2ggYnV0IHNob3VsZFxuICAgICAgLy8gcmV0dXJuIGEgbGlzdCBvZiBiaW5kaW5ncyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xPZklucHV0QmluZGluZyhub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xPZkVsZW1lbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xPZkFzdFRlbXBsYXRlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZWYXJpYWJsZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xPZlJlZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBBU1QpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKG5vZGUpO1xuICAgIH1cbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBUbXBsQXN0Q29udGVudCwgVG1wbEFzdEljdVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkFzdFRlbXBsYXRlKHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpOiBUZW1wbGF0ZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKHRlbXBsYXRlKTtcbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuVGVtcGxhdGUsIGRpcmVjdGl2ZXN9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpOiBFbGVtZW50U3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sRnJvbURlY2xhcmF0aW9uID0gdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBzeW1ib2xGcm9tRGVjbGFyYXRpb24udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCk7XG4gICAgLy8gQWxsIHN0YXRlbWVudHMgaW4gdGhlIFRDQiBhcmUgYEV4cHJlc3Npb25gcyB0aGF0IG9wdGlvbmFsbHkgaW5jbHVkZSBtb3JlIGluZm9ybWF0aW9uLlxuICAgIC8vIEFuIGBFbGVtZW50U3ltYm9sYCB1c2VzIHRoZSBpbmZvcm1hdGlvbiByZXR1cm5lZCBmb3IgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGV4cHJlc3Npb24sXG4gICAgLy8gYWRkcyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGVsZW1lbnQsIGFuZCB1cGRhdGVzIHRoZSBga2luZGAgdG8gYmUgYFN5bWJvbEtpbmQuRWxlbWVudGAuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnN5bWJvbEZyb21EZWNsYXJhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZXMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiBEaXJlY3RpdmVTeW1ib2xbXSB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG4gICAgY29uc3QgdGNiU291cmNlRmlsZSA9IHRoaXMudHlwZUNoZWNrQmxvY2suZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IGlzRGlyZWN0aXZlRGVjbGFyYXRpb24gPSAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuVHlwZU5vZGUgPT4gdHMuaXNUeXBlTm9kZShub2RlKSAmJlxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcih0Y2JTb3VyY2VGaWxlLCBub2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiBpc0RpcmVjdGl2ZURlY2xhcmF0aW9ufSk7XG4gICAgcmV0dXJuIG5vZGVzXG4gICAgICAgIC5tYXAobm9kZSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbDpcbiAgICAgICAgICAgICAgRGlyZWN0aXZlU3ltYm9sID0gey4uLnN5bWJvbCwgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCwga2luZDogU3ltYm9sS2luZC5EaXJlY3RpdmV9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIC8vIE91dHB1dHMgYXJlIGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGxvb2sgbGlrZSBvbmUgb2YgdGhlIHR3bzpcbiAgICAvLyAqIF9vdXRwdXRIZWxwZXIoX3QxW1wib3V0cHV0RmllbGRcIl0pLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICAvLyAqIF90MS5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIpO1xuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZXZlbnRCaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNDYWxsRXhwcmVzc2lvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGV2ZW50QmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIC8vIEJpbmRpbmdzIHRvIGVsZW1lbnQgb3IgdGVtcGxhdGUgZXZlbnRzIHByb2R1Y2UgYGFkZEV2ZW50TGlzdGVuZXJgIHdoaWNoXG4gICAgICAvLyB3ZSBjYW5ub3QgZ2V0IHRoZSBmaWVsZCBmb3IuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3MgPSBUY2JEaXJlY3RpdmVPdXRwdXRzT3AuZGVjb2RlT3V0cHV0Q2FsbEV4cHJlc3Npb24obm9kZSk7XG4gICAgaWYgKG91dHB1dEZpZWxkQWNjZXNzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0c1N5bWJvbCA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcy5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gb3V0cHV0RmllbGRBY2Nlc3MuYXJndW1lbnRFeHByZXNzaW9uLmdldFN0YXJ0KCk7XG4gICAgY29uc3QgdHNUeXBlID0gdGhpcy50eXBlQ2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihub2RlKTtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5PdXRwdXQsXG4gICAgICBiaW5kaW5nczogW3tcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgICAgfV0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcoYXR0cmlidXRlQmluZGluZzogVG1wbEFzdEJvdW5kQXR0cmlidXRlKTogSW5wdXRCaW5kaW5nU3ltYm9sXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBhdHRyaWJ1dGVCaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogaXNBc3NpZ25tZW50fSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCB0c1N5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcbiAgICBsZXQgcG9zaXRpb25JblNoaW1GaWxlOiBudW1iZXJ8bnVsbCA9IG51bGw7XG4gICAgbGV0IHRzVHlwZTogdHMuVHlwZTtcbiAgICBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmxlZnQuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZSA9IG5vZGUubGVmdC5hcmd1bWVudEV4cHJlc3Npb24uZ2V0U3RhcnQoKTtcbiAgICAgIHRzVHlwZSA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24obm9kZS5sZWZ0LmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmxlZnQubmFtZSk7XG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGUgPSBub2RlLmxlZnQubmFtZS5nZXRTdGFydCgpO1xuICAgICAgdHNUeXBlID0gdGhpcy50eXBlQ2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihub2RlLmxlZnQubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCB8fCBwb3NpdGlvbkluU2hpbUZpbGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoYXR0cmlidXRlQmluZGluZyk7XG4gICAgbGV0IHRhcmdldDogRWxlbWVudFN5bWJvbHxUZW1wbGF0ZVN5bWJvbHxEaXJlY3RpdmVTeW1ib2x8bnVsbDtcbiAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgdGFyZ2V0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXQgPSB0aGlzLmdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5JbnB1dCxcbiAgICAgIGJpbmRpbmdzOiBbe1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgIHRzU3ltYm9sLFxuICAgICAgICB0c1R5cGUsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICB9XSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKTogRGlyZWN0aXZlU3ltYm9sfG51bGwge1xuICAgIC8vIEluIGVpdGhlciBjYXNlLCBgX3QxW1wiaW5kZXhcIl1gIG9yIGBfdDEuaW5kZXhgLCBgbm9kZS5leHByZXNzaW9uYCBpcyBfdDEuXG4gICAgLy8gVGhlIHJldHJpZXZlZCBzeW1ib2wgZm9yIF90MSB3aWxsIGJlIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCB0c1N5bWJvbCA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHRzU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IFtkZWNsYXJhdGlvbl0gPSB0c1N5bWJvbC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8XG4gICAgICAgICFoYXNFeHByZXNzaW9uSWRlbnRpZmllcihcbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGlkZW50aWZpZXIgY291bGQgYmUgb24gdGhlIHR5cGUgKGZvciByZWd1bGFyIGRpcmVjdGl2ZXMpIG9yIHRoZSBuYW1lXG4gICAgICAgICAgICAvLyAoZm9yIGdlbmVyaWMgZGlyZWN0aXZlcyBhbmQgdGhlIGN0b3Igb3ApLlxuICAgICAgICAgICAgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLCBkZWNsYXJhdGlvbi50eXBlID8/IGRlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKTogVmFyaWFibGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiB2YXJpYWJsZS5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKGV4cHJlc3Npb25TeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7Li4uZXhwcmVzc2lvblN5bWJvbCwga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSwgZGVjbGFyYXRpb246IHZhcmlhYmxlfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYXRzY290dCk6IFNoaW0gbG9jYXRpb24gd2lsbCBuZWVkIHRvIGJlIGFkanVzdGVkXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5zeW1ib2wsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKGV4cHJlc3Npb246IEFTVCk6IFZhcmlhYmxlU3ltYm9sfFJlZmVyZW5jZVN5bWJvbFxuICAgICAgfEV4cHJlc3Npb25TeW1ib2x8bnVsbCB7XG4gICAgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5hc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoZXhwcmVzc2lvbik7XG4gICAgaWYgKGV4cHJlc3Npb25UYXJnZXQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbChleHByZXNzaW9uVGFyZ2V0KTtcbiAgICB9XG5cbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jayxcbiAgICAgICAge3dpdGhTcGFuOiBleHByZXNzaW9uLnNvdXJjZVNwYW4sIGZpbHRlcjogKG46IHRzLk5vZGUpOiBuIGlzIHRzLk5vZGUgPT4gdHJ1ZX0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB3aGlsZSAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAtIElmIHdlIGhhdmUgc2FmZSBwcm9wZXJ0eSByZWFkIChcImE/LmJcIikgd2Ugd2FudCB0byBnZXQgdGhlIFN5bWJvbCBmb3IgYiwgdGhlIGB3aGVuVHJ1ZWBcbiAgICAvLyBleHByZXNzaW9uLlxuICAgIC8vIC0gSWYgb3VyIGV4cHJlc3Npb24gaXMgYSBwaXBlIGJpbmRpbmcgKFwiYSB8IHRlc3Q6YjpjXCIpLCB3ZSB3YW50IHRoZSBTeW1ib2wgZm9yIHRoZVxuICAgIC8vIGB0cmFuc2Zvcm1gIG9uIHRoZSBwaXBlLlxuICAgIC8vIC0gT3RoZXJ3aXNlLCB3ZSByZXRyaWV2ZSB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBpdHNlbGYgd2l0aCBubyBzcGVjaWFsIGNvbnNpZGVyYXRpb25zXG4gICAgaWYgKChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwpICYmXG4gICAgICAgIHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBjb25zdCB3aGVuVHJ1ZVN5bWJvbCA9XG4gICAgICAgICAgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUud2hlblRydWUpKSA/XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlLmV4cHJlc3Npb24pIDpcbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUpO1xuICAgICAgaWYgKHdoZW5UcnVlU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi53aGVuVHJ1ZVN5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9uLFxuICAgICAgICAvLyBSYXRoZXIgdGhhbiB1c2luZyB0aGUgdHlwZSBvZiBvbmx5IHRoZSBgd2hlblRydWVgIHBhcnQgb2YgdGhlIGV4cHJlc3Npb24sIHdlIHNob3VsZFxuICAgICAgICAvLyBzdGlsbCBnZXQgdGhlIHR5cGUgb2YgdGhlIHdob2xlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdG8gaW5jbHVkZSBgfHVuZGVmaW5lZGAuXG4gICAgICAgIHRzVHlwZTogdGhpcy50eXBlQ2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihub2RlKVxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBDcmVhdGUgYSBQaXBlU3ltYm9sIHRvIGluY2x1ZGUgc3ltYm9sIGZvciB0aGUgUGlwZSBjbGFzc1xuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5leHByZXNzaW9uKTtcbiAgICAgIHJldHVybiBzeW1ib2xJbmZvID09PSBudWxsID8gbnVsbCA6IHsuLi5zeW1ib2xJbmZvLCBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb259O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgIHJldHVybiBzeW1ib2xJbmZvID09PSBudWxsID8gbnVsbCA6IHsuLi5zeW1ib2xJbmZvLCBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb259O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUc05vZGUobm9kZTogdHMuTm9kZSk6IFRzTm9kZVN5bWJvbEluZm98bnVsbCB7XG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgbGV0IHRzU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuICAgIGxldCBwb3NpdGlvbkluU2hpbUZpbGU6IG51bWJlcjtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy50eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSk7XG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGUgPSBub2RlLm5hbWUuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLnR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGUgPSBub2RlLmdldFN0YXJ0KCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZSA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIElmIHdlIGNvdWxkIG5vdCBmaW5kIGEgc3ltYm9sLCBmYWxsIGJhY2sgdG8gdGhlIHN5bWJvbCBvbiB0aGUgdHlwZSBmb3IgdGhlIG5vZGUuXG4gICAgICAvLyBTb21lIG5vZGVzIHdvbid0IGhhdmUgYSBcInN5bWJvbCBhdCBsb2NhdGlvblwiIGJ1dCB3aWxsIGhhdmUgYSBzeW1ib2wgZm9yIHRoZSB0eXBlLlxuICAgICAgLy8gT25lIGV4YW1wbGUgb2YgdGhpcyB3b3VsZCBiZSBsaXRlcmFscy5cbiAgICAgIHRzU3ltYm9sOiB0c1N5bWJvbCA/PyB0eXBlLnN5bWJvbCA/PyBudWxsLFxuICAgICAgdHNUeXBlOiB0eXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogVHNOb2RlU3ltYm9sSW5mb1xuICAgICAgfG51bGwge1xuICAgIC8vIEluc3RlYWQgb2YgcmV0dXJuaW5nIHRoZSBTeW1ib2wgZm9yIHRoZSB0ZW1wb3JhcnkgdmFyaWFibGUsIHdlIHdhbnQgdG8gZ2V0IHRoZSBgdHMuU3ltYm9sYFxuICAgIC8vIGZvcjpcbiAgICAvLyAtIFRoZSB0eXBlIHJlZmVyZW5jZSBmb3IgYHZhciBfdDI6IE15RGlyID0geHl6YCAocHJpb3JpdGl6ZS90cnVzdCB0aGUgZGVjbGFyZWQgdHlwZSlcbiAgICAvLyAtIFRoZSBpbml0aWFsaXplciBmb3IgYHZhciBfdDIgPSBfdDEuaW5kZXhgLlxuICAgIGlmIChkZWNsYXJhdGlvbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoZGVjbGFyYXRpb24udHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKGRlY2xhcmF0aW9uLnR5cGUudHlwZU5hbWUpO1xuICAgIH1cbiAgICBpZiAoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShkZWNsYXJhdGlvbi5pbml0aWFsaXplcik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxufVxuIl19