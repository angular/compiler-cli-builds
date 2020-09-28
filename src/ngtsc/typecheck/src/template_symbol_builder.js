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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block"], factory);
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
    var ts_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util");
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
            if (node instanceof compiler_1.TmplAstBoundAttribute || node instanceof compiler_1.TmplAstTextAttribute) {
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
            // directives could be either:
            // - var _t1: TestDir /*T:D*/ = (null!);
            // - var _t1 /*T:D*/ = _ctor1({});
            var isDirectiveDeclaration = function (node) {
                return (ts.isTypeNode(node) || ts.isIdentifier(node)) &&
                    comments_1.hasExpressionIdentifier(tcbSourceFile, node, comments_1.ExpressionIdentifier.DIRECTIVE);
            };
            var nodes = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
            return nodes
                .map(function (node) {
                var _a, _b;
                var symbol = (ts.isIdentifier(node) && ts.isVariableDeclaration(node.parent)) ?
                    _this.getSymbolOfVariableDeclaration(node.parent) :
                    _this.getSymbolOfTsNode(node);
                if (symbol === null || symbol.tsSymbol === null ||
                    symbol.tsSymbol.declarations.length === 0) {
                    return null;
                }
                var meta = _this.getDirectiveMeta(element, symbol.tsSymbol.declarations[0]);
                if (meta === null) {
                    return null;
                }
                var selector = (_a = meta.selector) !== null && _a !== void 0 ? _a : null;
                var isComponent = (_b = meta.isComponent) !== null && _b !== void 0 ? _b : null;
                var directiveSymbol = tslib_1.__assign(tslib_1.__assign({}, symbol), { tsSymbol: symbol.tsSymbol, selector: selector,
                    isComponent: isComponent, kind: api_1.SymbolKind.Directive });
                return directiveSymbol;
            })
                .filter(function (d) { return d !== null; });
        };
        SymbolBuilder.prototype.getDirectiveMeta = function (host, directiveDeclaration) {
            var _a;
            var directives = this.templateData.boundTarget.getDirectivesOfNode(host);
            if (directives === null) {
                return null;
            }
            return (_a = directives.find(function (m) { return m.ref.node === directiveDeclaration; })) !== null && _a !== void 0 ? _a : null;
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
            if (consumer === null || consumer instanceof compiler_1.TmplAstTemplate ||
                consumer instanceof compiler_1.TmplAstElement) {
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
            var target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
            if (target === null) {
                return null;
            }
            var positionInShimFile = this.getShimPositionForNode(outputFieldAccess);
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
        SymbolBuilder.prototype.getSymbolOfInputBinding = function (binding) {
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(binding);
            if (consumer === null) {
                return null;
            }
            if (consumer instanceof compiler_1.TmplAstElement || consumer instanceof compiler_1.TmplAstTemplate) {
                var host = this.getSymbol(consumer);
                return host !== null ? { kind: api_1.SymbolKind.DomBinding, host: host } : null;
            }
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: binding.sourceSpan, filter: typescript_1.isAssignment });
            if (node === null || !ts_util_1.isAccessExpression(node.left)) {
                return null;
            }
            var symbolInfo = this.getSymbolOfTsNode(node.left);
            if (symbolInfo === null || symbolInfo.tsSymbol === null) {
                return null;
            }
            var target = this.getDirectiveSymbolForAccessExpression(node.left, consumer);
            if (target === null) {
                return null;
            }
            return {
                kind: api_1.SymbolKind.Input,
                bindings: [tslib_1.__assign(tslib_1.__assign({}, symbolInfo), { tsSymbol: symbolInfo.tsSymbol, kind: api_1.SymbolKind.Binding, target: target })],
            };
        };
        SymbolBuilder.prototype.getDirectiveSymbolForAccessExpression = function (node, _a) {
            var _b;
            var isComponent = _a.isComponent, selector = _a.selector;
            // In either case, `_t1["index"]` or `_t1.index`, `node.expression` is _t1.
            // The retrieved symbol for _t1 will be the variable declaration.
            var tsSymbol = this.typeChecker.getSymbolAtLocation(node.expression);
            if (tsSymbol === undefined || tsSymbol.declarations.length === 0) {
                return null;
            }
            var _c = tslib_1.__read(tsSymbol.declarations, 1), declaration = _c[0];
            if (!ts.isVariableDeclaration(declaration) ||
                !comments_1.hasExpressionIdentifier(
                // The expression identifier could be on the type (for regular directives) or the name
                // (for generic directives and the ctor op).
                declaration.getSourceFile(), (_b = declaration.type) !== null && _b !== void 0 ? _b : declaration.name, comments_1.ExpressionIdentifier.DIRECTIVE)) {
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
                isComponent: isComponent,
                selector: selector,
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
            // The `name` part of a `PropertyWrite` and `MethodCall` does not have its own
            // AST so there is no way to retrieve a `Symbol` for just the `name` via a specific node.
            var withSpan = (expression instanceof compiler_1.PropertyWrite || expression instanceof compiler_1.MethodCall) ?
                expression.nameSpan :
                expression.sourceSpan;
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: withSpan, filter: function (n) { return true; } });
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
            if (ts.isPropertyAccessExpression(node)) {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node.name);
            }
            else if (ts.isElementAccessExpression(node)) {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node.argumentExpression);
            }
            else {
                tsSymbol = this.typeChecker.getSymbolAtLocation(node);
            }
            var positionInShimFile = this.getShimPositionForNode(node);
            var type = this.typeChecker.getTypeAtLocation(node);
            return {
                // If we could not find a symbol, fall back to the symbol on the type for the node.
                // Some nodes won't have a "symbol at location" but will have a symbol for the type.
                // Examples of this would be literals and `document.createElement('div')`.
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
        SymbolBuilder.prototype.getShimPositionForNode = function (node) {
            if (ts.isTypeReferenceNode(node)) {
                return this.getShimPositionForNode(node.typeName);
            }
            else if (ts.isQualifiedName(node)) {
                return node.right.getStart();
            }
            else if (ts.isPropertyAccessExpression(node)) {
                return node.name.getStart();
            }
            else if (ts.isElementAccessExpression(node)) {
                return node.argumentExpression.getStart();
            }
            else {
                return node.getStart();
            }
        };
        return SymbolBuilder;
    }());
    exports.SymbolBuilder = SymbolBuilder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFHakMsa0ZBQXVEO0lBQ3ZELHFFQUFzUDtJQUV0UCxtRkFBc0g7SUFFdEgsaUZBQTZDO0lBQzdDLG1HQUF5RDtJQUV6RDs7O09BR0c7SUFDSDtRQUNFLHVCQUNxQixXQUEyQixFQUFtQixRQUF3QixFQUN0RSxjQUF1QixFQUFtQixZQUEwQjtZQURwRSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBbUIsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDdEUsbUJBQWMsR0FBZCxjQUFjLENBQVM7WUFBbUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFBRyxDQUFDO1FBSzdGLGlDQUFTLEdBQVQsVUFBVSxJQUFxQjtZQUM3QixJQUFJLElBQUksWUFBWSxnQ0FBcUIsSUFBSSxJQUFJLFlBQVksK0JBQW9CLEVBQUU7Z0JBQ2pGLDRGQUE0RjtnQkFDNUYsNkNBQTZDO2dCQUM3QyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQztpQkFBTSxJQUFJLElBQUksWUFBWSw0QkFBaUIsRUFBRTtnQkFDNUMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDekM7aUJBQU0sSUFBSSxJQUFJLFlBQVkseUJBQWMsRUFBRTtnQkFDekMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEM7aUJBQU0sSUFBSSxJQUFJLFlBQVksMEJBQWUsRUFBRTtnQkFDMUMsT0FBTyxJQUFJ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QkFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQzdCO2lCQUFNLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM3QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUMzQztpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN4QjtRQUNILENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFwWkQsSUFvWkM7SUFwWlksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEJpbmRpbmdQaXBlLCBNZXRob2RDYWxsLCBQcm9wZXJ0eVdyaXRlLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzQXNzaWdubWVudH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgRG9tQmluZGluZ1N5bWJvbCwgRWxlbWVudFN5bWJvbCwgRXhwcmVzc2lvblN5bWJvbCwgSW5wdXRCaW5kaW5nU3ltYm9sLCBPdXRwdXRCaW5kaW5nU3ltYm9sLCBSZWZlcmVuY2VTeW1ib2wsIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2wsIFRzTm9kZVN5bWJvbEluZm8sIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBWYXJpYWJsZVN5bWJvbH0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtFeHByZXNzaW9uSWRlbnRpZmllciwgZmluZEFsbE1hdGNoaW5nTm9kZXMsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZSwgaGFzRXhwcmVzc2lvbklkZW50aWZpZXJ9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHtUZW1wbGF0ZURhdGF9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge2lzQWNjZXNzRXhwcmVzc2lvbn0gZnJvbSAnLi90c191dGlsJztcbmltcG9ydCB7VGNiRGlyZWN0aXZlT3V0cHV0c09wfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuXG4vKipcbiAqIEEgY2xhc3Mgd2hpY2ggZXh0cmFjdHMgaW5mb3JtYXRpb24gZnJvbSBhIHR5cGUgY2hlY2sgYmxvY2suXG4gKiBUaGlzIGNsYXNzIGlzIGVzc2VudGlhbGx5IHVzZWQgYXMganVzdCBhIGNsb3N1cmUgYXJvdW5kIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgY2xhc3MgU3ltYm9sQnVpbGRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVhZG9ubHkgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tCbG9jazogdHMuTm9kZSwgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogaW5wdXQgYW5kIG91dHB1dCBiaW5kaW5ncyBvbmx5IHJldHVybiB0aGUgZmlyc3QgZGlyZWN0aXZlIG1hdGNoIGJ1dCBzaG91bGRcbiAgICAgIC8vIHJldHVybiBhIGxpc3Qgb2YgYmluZGluZ3MgZm9yIGFsbCBvZiB0aGVtLlxuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbE9mQm91bmRFdmVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZFbGVtZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZSZWZlcmVuY2Uobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQVNUKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihub2RlKTtcbiAgICB9XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogVG1wbEFzdENvbnRlbnQsIFRtcGxBc3RJY3VcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKTogVGVtcGxhdGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZSh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLlRlbXBsYXRlLCBkaXJlY3RpdmVzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZFbGVtZW50KGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KTogRWxlbWVudFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9IHRoaXMuZ2V0U3ltYm9sT2ZWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmIChzeW1ib2xGcm9tRGVjbGFyYXRpb24gPT09IG51bGwgfHwgc3ltYm9sRnJvbURlY2xhcmF0aW9uLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQpO1xuICAgIC8vIEFsbCBzdGF0ZW1lbnRzIGluIHRoZSBUQ0IgYXJlIGBFeHByZXNzaW9uYHMgdGhhdCBvcHRpb25hbGx5IGluY2x1ZGUgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAvLyBBbiBgRWxlbWVudFN5bWJvbGAgdXNlcyB0aGUgaW5mb3JtYXRpb24gcmV0dXJuZWQgZm9yIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBleHByZXNzaW9uLFxuICAgIC8vIGFkZHMgdGhlIGRpcmVjdGl2ZXMgZm9yIHRoZSBlbGVtZW50LCBhbmQgdXBkYXRlcyB0aGUgYGtpbmRgIHRvIGJlIGBTeW1ib2xLaW5kLkVsZW1lbnRgLlxuICAgIHJldHVybiB7XG4gICAgICAuLi5zeW1ib2xGcm9tRGVjbGFyYXRpb24sXG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogRGlyZWN0aXZlU3ltYm9sW10ge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuICAgIGNvbnN0IHRjYlNvdXJjZUZpbGUgPSB0aGlzLnR5cGVDaGVja0Jsb2NrLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBkaXJlY3RpdmVzIGNvdWxkIGJlIGVpdGhlcjpcbiAgICAvLyAtIHZhciBfdDE6IFRlc3REaXIgLypUOkQqLyA9IChudWxsISk7XG4gICAgLy8gLSB2YXIgX3QxIC8qVDpEKi8gPSBfY3RvcjEoe30pO1xuICAgIGNvbnN0IGlzRGlyZWN0aXZlRGVjbGFyYXRpb24gPSAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuVHlwZU5vZGV8dHMuSWRlbnRpZmllciA9PlxuICAgICAgICAodHMuaXNUeXBlTm9kZShub2RlKSB8fCB0cy5pc0lkZW50aWZpZXIobm9kZSkpICYmXG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHRjYlNvdXJjZUZpbGUsIG5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IGlzRGlyZWN0aXZlRGVjbGFyYXRpb259KTtcbiAgICByZXR1cm4gbm9kZXNcbiAgICAgICAgLm1hcChub2RlID0+IHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSAodHMuaXNJZGVudGlmaWVyKG5vZGUpICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLnBhcmVudCkpID9cbiAgICAgICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpIDpcbiAgICAgICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBzeW1ib2wudHNTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbWV0YSA9IHRoaXMuZ2V0RGlyZWN0aXZlTWV0YShlbGVtZW50LCBzeW1ib2wudHNTeW1ib2wuZGVjbGFyYXRpb25zWzBdKTtcbiAgICAgICAgICBpZiAobWV0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBtZXRhLnNlbGVjdG9yID8/IG51bGw7XG4gICAgICAgICAgY29uc3QgaXNDb21wb25lbnQgPSBtZXRhLmlzQ29tcG9uZW50ID8/IG51bGw7XG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlU3ltYm9sOiBEaXJlY3RpdmVTeW1ib2wgPSB7XG4gICAgICAgICAgICAuLi5zeW1ib2wsXG4gICAgICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgICBpc0NvbXBvbmVudCxcbiAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlU3ltYm9sO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKChkKTogZCBpcyBEaXJlY3RpdmVTeW1ib2wgPT4gZCAhPT0gbnVsbCk7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1ldGEoXG4gICAgICBob3N0OiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShob3N0KTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpcmVjdGl2ZXMuZmluZChtID0+IG0ucmVmLm5vZGUgPT09IGRpcmVjdGl2ZURlY2xhcmF0aW9uKSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkJvdW5kRXZlbnQoZXZlbnRCaW5kaW5nOiBUbXBsQXN0Qm91bmRFdmVudCk6IE91dHB1dEJpbmRpbmdTeW1ib2x8bnVsbCB7XG4gICAgLy8gT3V0cHV0cyBhcmUgYSBgdHMuQ2FsbEV4cHJlc3Npb25gIHRoYXQgbG9vayBsaWtlIG9uZSBvZiB0aGUgdHdvOlxuICAgIC8vICogX291dHB1dEhlbHBlcihfdDFbXCJvdXRwdXRGaWVsZFwiXSkuc3Vic2NyaWJlKGhhbmRsZXIpO1xuICAgIC8vICogX3QxLmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlcik7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBldmVudEJpbmRpbmcuc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc0NhbGxFeHByZXNzaW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoZXZlbnRCaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHxcbiAgICAgICAgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgLy8gQmluZGluZ3MgdG8gZWxlbWVudCBvciB0ZW1wbGF0ZSBldmVudHMgcHJvZHVjZSBgYWRkRXZlbnRMaXN0ZW5lcmAgd2hpY2hcbiAgICAgIC8vIHdlIGNhbm5vdCBnZXQgdGhlIGZpZWxkIGZvci5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBvdXRwdXRGaWVsZEFjY2VzcyA9IFRjYkRpcmVjdGl2ZU91dHB1dHNPcC5kZWNvZGVPdXRwdXRDYWxsRXhwcmVzc2lvbihub2RlKTtcbiAgICBpZiAob3V0cHV0RmllbGRBY2Nlc3MgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy50eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG91dHB1dEZpZWxkQWNjZXNzKTtcbiAgICBjb25zdCB0c1R5cGUgPSB0aGlzLnR5cGVDaGVja2VyLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLk91dHB1dCxcbiAgICAgIGJpbmRpbmdzOiBbe1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgIHRzU3ltYm9sLFxuICAgICAgICB0c1R5cGUsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICB9XSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZklucHV0QmluZGluZyhiaW5kaW5nOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVG1wbEFzdFRleHRBdHRyaWJ1dGUpOiBJbnB1dEJpbmRpbmdTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGJpbmRpbmcpO1xuICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG4gICAgICByZXR1cm4gaG9zdCAhPT0gbnVsbCA/IHtraW5kOiBTeW1ib2xLaW5kLkRvbUJpbmRpbmcsIGhvc3R9IDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGJpbmRpbmcuc291cmNlU3BhbiwgZmlsdGVyOiBpc0Fzc2lnbm1lbnR9KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCAhaXNBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUubGVmdCk7XG4gICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwgfHwgc3ltYm9sSW5mby50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCwgY29uc3VtZXIpO1xuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLklucHV0LFxuICAgICAgYmluZGluZ3M6IFt7XG4gICAgICAgIC4uLnN5bWJvbEluZm8sXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2xJbmZvLnRzU3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgIHRhcmdldCxcbiAgICAgIH1dLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24oXG4gICAgICBub2RlOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbnx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICB7aXNDb21wb25lbnQsIHNlbGVjdG9yfTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiBEaXJlY3RpdmVTeW1ib2x8bnVsbCB7XG4gICAgLy8gSW4gZWl0aGVyIGNhc2UsIGBfdDFbXCJpbmRleFwiXWAgb3IgYF90MS5pbmRleGAsIGBub2RlLmV4cHJlc3Npb25gIGlzIF90MS5cbiAgICAvLyBUaGUgcmV0cmlldmVkIHN5bWJvbCBmb3IgX3QxIHdpbGwgYmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy50eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQgfHwgdHNTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW2RlY2xhcmF0aW9uXSA9IHRzU3ltYm9sLmRlY2xhcmF0aW9ucztcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHxcbiAgICAgICAgIWhhc0V4cHJlc3Npb25JZGVudGlmaWVyKFxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaWRlbnRpZmllciBjb3VsZCBiZSBvbiB0aGUgdHlwZSAoZm9yIHJlZ3VsYXIgZGlyZWN0aXZlcykgb3IgdGhlIG5hbWVcbiAgICAgICAgICAgIC8vIChmb3IgZ2VuZXJpYyBkaXJlY3RpdmVzIGFuZCB0aGUgY3RvciBvcCkuXG4gICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCksIGRlY2xhcmF0aW9uLnR5cGUgPz8gZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgc2VsZWN0b3IsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKTogVmFyaWFibGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiB2YXJpYWJsZS5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKGV4cHJlc3Npb25TeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7Li4uZXhwcmVzc2lvblN5bWJvbCwga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSwgZGVjbGFyYXRpb246IHZhcmlhYmxlfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRPRE8oYXRzY290dCk6IFNoaW0gbG9jYXRpb24gd2lsbCBuZWVkIHRvIGJlIGFkanVzdGVkXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5zeW1ib2wsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKGV4cHJlc3Npb246IEFTVCk6IFZhcmlhYmxlU3ltYm9sfFJlZmVyZW5jZVN5bWJvbFxuICAgICAgfEV4cHJlc3Npb25TeW1ib2x8bnVsbCB7XG4gICAgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5hc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoZXhwcmVzc2lvbik7XG4gICAgaWYgKGV4cHJlc3Npb25UYXJnZXQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbChleHByZXNzaW9uVGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAgYW5kIGBNZXRob2RDYWxsYCBkb2VzIG5vdCBoYXZlIGl0cyBvd25cbiAgICAvLyBBU1Qgc28gdGhlcmUgaXMgbm8gd2F5IHRvIHJldHJpZXZlIGEgYFN5bWJvbGAgZm9yIGp1c3QgdGhlIGBuYW1lYCB2aWEgYSBzcGVjaWZpYyBub2RlLlxuICAgIGNvbnN0IHdpdGhTcGFuID0gKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBNZXRob2RDYWxsKSA/XG4gICAgICAgIGV4cHJlc3Npb24ubmFtZVNwYW4gOlxuICAgICAgICBleHByZXNzaW9uLnNvdXJjZVNwYW47XG5cbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuLCBmaWx0ZXI6IChuOiB0cy5Ob2RlKTogbiBpcyB0cy5Ob2RlID0+IHRydWV9KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gLSBJZiB3ZSBoYXZlIHNhZmUgcHJvcGVydHkgcmVhZCAoXCJhPy5iXCIpIHdlIHdhbnQgdG8gZ2V0IHRoZSBTeW1ib2wgZm9yIGIsIHRoZSBgd2hlblRydWVgXG4gICAgLy8gZXhwcmVzc2lvbi5cbiAgICAvLyAtIElmIG91ciBleHByZXNzaW9uIGlzIGEgcGlwZSBiaW5kaW5nIChcImEgfCB0ZXN0OmI6Y1wiKSwgd2Ugd2FudCB0aGUgU3ltYm9sIGZvciB0aGVcbiAgICAvLyBgdHJhbnNmb3JtYCBvbiB0aGUgcGlwZS5cbiAgICAvLyAtIE90aGVyd2lzZSwgd2UgcmV0cmlldmUgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgaXRzZWxmIHdpdGggbm8gc3BlY2lhbCBjb25zaWRlcmF0aW9uc1xuICAgIGlmICgoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsKSAmJlxuICAgICAgICB0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgY29uc3Qgd2hlblRydWVTeW1ib2wgPVxuICAgICAgICAgIChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlLndoZW5UcnVlKSkgP1xuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZS5leHByZXNzaW9uKSA6XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlKTtcbiAgICAgIGlmICh3aGVuVHJ1ZVN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4ud2hlblRydWVTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbixcbiAgICAgICAgLy8gUmF0aGVyIHRoYW4gdXNpbmcgdGhlIHR5cGUgb2Ygb25seSB0aGUgYHdoZW5UcnVlYCBwYXJ0IG9mIHRoZSBleHByZXNzaW9uLCB3ZSBzaG91bGRcbiAgICAgICAgLy8gc3RpbGwgZ2V0IHRoZSB0eXBlIG9mIHRoZSB3aG9sZSBjb25kaXRpb25hbCBleHByZXNzaW9uIHRvIGluY2x1ZGUgYHx1bmRlZmluZWRgLlxuICAgICAgICB0c1R5cGU6IHRoaXMudHlwZUNoZWNrZXIuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSlcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgQmluZGluZ1BpcGUgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogQ3JlYXRlIGEgUGlwZVN5bWJvbCB0byBpbmNsdWRlIHN5bWJvbCBmb3IgdGhlIFBpcGUgY2xhc3NcbiAgICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVHNOb2RlKG5vZGU6IHRzLk5vZGUpOiBUc05vZGVTeW1ib2xJbmZvfG51bGwge1xuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIGxldCB0c1N5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy50eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMudHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy50eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKTtcbiAgICBjb25zdCB0eXBlID0gdGhpcy50eXBlQ2hlY2tlci5nZXRUeXBlQXRMb2NhdGlvbihub2RlKTtcbiAgICByZXR1cm4ge1xuICAgICAgLy8gSWYgd2UgY291bGQgbm90IGZpbmQgYSBzeW1ib2wsIGZhbGwgYmFjayB0byB0aGUgc3ltYm9sIG9uIHRoZSB0eXBlIGZvciB0aGUgbm9kZS5cbiAgICAgIC8vIFNvbWUgbm9kZXMgd29uJ3QgaGF2ZSBhIFwic3ltYm9sIGF0IGxvY2F0aW9uXCIgYnV0IHdpbGwgaGF2ZSBhIHN5bWJvbCBmb3IgdGhlIHR5cGUuXG4gICAgICAvLyBFeGFtcGxlcyBvZiB0aGlzIHdvdWxkIGJlIGxpdGVyYWxzIGFuZCBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylgLlxuICAgICAgdHNTeW1ib2w6IHRzU3ltYm9sID8/IHR5cGUuc3ltYm9sID8/IG51bGwsXG4gICAgICB0c1R5cGU6IHR5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiBUc05vZGVTeW1ib2xJbmZvXG4gICAgICB8bnVsbCB7XG4gICAgLy8gSW5zdGVhZCBvZiByZXR1cm5pbmcgdGhlIFN5bWJvbCBmb3IgdGhlIHRlbXBvcmFyeSB2YXJpYWJsZSwgd2Ugd2FudCB0byBnZXQgdGhlIGB0cy5TeW1ib2xgXG4gICAgLy8gZm9yOlxuICAgIC8vIC0gVGhlIHR5cGUgcmVmZXJlbmNlIGZvciBgdmFyIF90MjogTXlEaXIgPSB4eXpgIChwcmlvcml0aXplL3RydXN0IHRoZSBkZWNsYXJlZCB0eXBlKVxuICAgIC8vIC0gVGhlIGluaXRpYWxpemVyIGZvciBgdmFyIF90MiA9IF90MS5pbmRleGAuXG4gICAgaWYgKGRlY2xhcmF0aW9uLnR5cGUgJiYgdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShkZWNsYXJhdGlvbi50eXBlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUoZGVjbGFyYXRpb24udHlwZS50eXBlTmFtZSk7XG4gICAgfVxuICAgIGlmIChkZWNsYXJhdGlvbi5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlOiB0cy5Ob2RlKTogbnVtYmVyIHtcbiAgICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLnR5cGVOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUucmlnaHQuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5uYW1lLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5hcmd1bWVudEV4cHJlc3Npb24uZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5vZGUuZ2V0U3RhcnQoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==