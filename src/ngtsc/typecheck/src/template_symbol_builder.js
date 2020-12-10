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
     * Generates and caches `Symbol`s for various template structures for a given component.
     *
     * The `SymbolBuilder` internally caches the `Symbol`s it creates, and must be destroyed and
     * replaced if the component's template changes.
     */
    var SymbolBuilder = /** @class */ (function () {
        function SymbolBuilder(shimPath, typeCheckBlock, templateData, componentScopeReader, 
        // The `ts.TypeChecker` depends on the current type-checking program, and so must be requested
        // on-demand instead of cached.
        getTypeChecker) {
            this.shimPath = shimPath;
            this.typeCheckBlock = typeCheckBlock;
            this.templateData = templateData;
            this.componentScopeReader = componentScopeReader;
            this.getTypeChecker = getTypeChecker;
            this.symbolCache = new Map();
        }
        SymbolBuilder.prototype.getSymbol = function (node) {
            if (this.symbolCache.has(node)) {
                return this.symbolCache.get(node);
            }
            var symbol = null;
            if (node instanceof compiler_1.TmplAstBoundAttribute || node instanceof compiler_1.TmplAstTextAttribute) {
                // TODO(atscott): input and output bindings only return the first directive match but should
                // return a list of bindings for all of them.
                symbol = this.getSymbolOfInputBinding(node);
            }
            else if (node instanceof compiler_1.TmplAstBoundEvent) {
                symbol = this.getSymbolOfBoundEvent(node);
            }
            else if (node instanceof compiler_1.TmplAstElement) {
                symbol = this.getSymbolOfElement(node);
            }
            else if (node instanceof compiler_1.TmplAstTemplate) {
                symbol = this.getSymbolOfAstTemplate(node);
            }
            else if (node instanceof compiler_1.TmplAstVariable) {
                symbol = this.getSymbolOfVariable(node);
            }
            else if (node instanceof compiler_1.TmplAstReference) {
                symbol = this.getSymbolOfReference(node);
            }
            else if (node instanceof compiler_1.AST) {
                symbol = this.getSymbolOfTemplateExpression(node);
            }
            else {
                // TODO(atscott): TmplAstContent, TmplAstIcu
            }
            this.symbolCache.set(node, symbol);
            return symbol;
        };
        SymbolBuilder.prototype.getSymbolOfAstTemplate = function (template) {
            var directives = this.getDirectivesOfNode(template);
            return { kind: api_1.SymbolKind.Template, directives: directives, templateNode: template };
        };
        SymbolBuilder.prototype.getSymbolOfElement = function (element) {
            var _a;
            var elementSourceSpan = (_a = element.startSourceSpan) !== null && _a !== void 0 ? _a : element.sourceSpan;
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: ts.isVariableDeclaration });
            if (node === null) {
                return null;
            }
            var symbolFromDeclaration = this.getSymbolOfTsNode(node);
            if (symbolFromDeclaration === null || symbolFromDeclaration.tsSymbol === null) {
                return null;
            }
            var directives = this.getDirectivesOfNode(element);
            // All statements in the TCB are `Expression`s that optionally include more information.
            // An `ElementSymbol` uses the information returned for the variable declaration expression,
            // adds the directives for the element, and updates the `kind` to be `SymbolKind.Element`.
            return tslib_1.__assign(tslib_1.__assign({}, symbolFromDeclaration), { kind: api_1.SymbolKind.Element, directives: directives, templateNode: element });
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
                return (ts.isTypeNode(node) || ts.isIdentifier(node)) && ts.isVariableDeclaration(node.parent) &&
                    comments_1.hasExpressionIdentifier(tcbSourceFile, node, comments_1.ExpressionIdentifier.DIRECTIVE);
            };
            var nodes = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
            return nodes
                .map(function (node) {
                var _a;
                var symbol = _this.getSymbolOfTsNode(node.parent);
                if (symbol === null || symbol.tsSymbol === null ||
                    symbol.tsSymbol.valueDeclaration === undefined ||
                    !ts.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
                    return null;
                }
                var meta = _this.getDirectiveMeta(element, symbol.tsSymbol.valueDeclaration);
                if (meta === null) {
                    return null;
                }
                var ngModule = _this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
                if (meta.selector === null) {
                    return null;
                }
                var isComponent = (_a = meta.isComponent) !== null && _a !== void 0 ? _a : null;
                var directiveSymbol = tslib_1.__assign(tslib_1.__assign({}, symbol), { tsSymbol: symbol.tsSymbol, selector: meta.selector, isComponent: isComponent,
                    ngModule: ngModule, kind: api_1.SymbolKind.Directive });
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
        SymbolBuilder.prototype.getDirectiveModule = function (declaration) {
            var scope = this.componentScopeReader.getScopeForComponent(declaration);
            if (scope === null) {
                return null;
            }
            return scope.ngModule;
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
            var tsSymbol = this.getTypeChecker().getSymbolAtLocation(outputFieldAccess.argumentExpression);
            if (tsSymbol === undefined) {
                return null;
            }
            var target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
            if (target === null) {
                return null;
            }
            var positionInShimFile = this.getShimPositionForNode(outputFieldAccess);
            var tsType = this.getTypeChecker().getTypeAtLocation(node);
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
            var tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.expression);
            if (tsSymbol === undefined || tsSymbol.declarations.length === 0 || selector === null) {
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
            var symbol = this.getSymbolOfTsNode(declaration);
            if (symbol === null || symbol.tsSymbol === null ||
                symbol.tsSymbol.valueDeclaration === undefined ||
                !ts.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
                return null;
            }
            var ngModule = this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
            return {
                kind: api_1.SymbolKind.Directive,
                tsSymbol: symbol.tsSymbol,
                tsType: symbol.tsType,
                shimLocation: symbol.shimLocation,
                isComponent: isComponent,
                selector: selector,
                ngModule: ngModule,
            };
        };
        SymbolBuilder.prototype.getSymbolOfVariable = function (variable) {
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: variable.sourceSpan, filter: ts.isVariableDeclaration });
            if (node === null || node.initializer === undefined) {
                return null;
            }
            var expressionSymbol = this.getSymbolOfTsNode(node.initializer);
            if (expressionSymbol === null) {
                return null;
            }
            return {
                tsType: expressionSymbol.tsType,
                tsSymbol: expressionSymbol.tsSymbol,
                initializerLocation: expressionSymbol.shimLocation,
                kind: api_1.SymbolKind.Variable,
                declaration: variable,
                localVarLocation: {
                    shimPath: this.shimPath,
                    positionInShimFile: this.getShimPositionForNode(node.name),
                }
            };
        };
        SymbolBuilder.prototype.getSymbolOfReference = function (ref) {
            var target = this.templateData.boundTarget.getReferenceTarget(ref);
            // Find the node for the reference declaration, i.e. `var _t2 = _t1;`
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: ref.sourceSpan, filter: ts.isVariableDeclaration });
            if (node === null || target === null || node.initializer === undefined) {
                return null;
            }
            // Get the original declaration for the references variable, with the exception of template refs
            // which are of the form var _t3 = (_t2 as any as i2.TemplateRef<any>)
            // TODO(atscott): Consider adding an `ExpressionIdentifier` to tag variable declaration
            // initializers as invalid for symbol retrieval.
            var originalDeclaration = ts.isParenthesizedExpression(node.initializer) &&
                ts.isAsExpression(node.initializer.expression) ?
                this.getTypeChecker().getSymbolAtLocation(node.name) :
                this.getTypeChecker().getSymbolAtLocation(node.initializer);
            if (originalDeclaration === undefined || originalDeclaration.valueDeclaration === undefined) {
                return null;
            }
            var symbol = this.getSymbolOfTsNode(originalDeclaration.valueDeclaration);
            if (symbol === null || symbol.tsSymbol === null) {
                return null;
            }
            var referenceVarShimLocation = {
                shimPath: this.shimPath,
                positionInShimFile: this.getShimPositionForNode(node),
            };
            if (target instanceof compiler_1.TmplAstTemplate || target instanceof compiler_1.TmplAstElement) {
                return {
                    kind: api_1.SymbolKind.Reference,
                    tsSymbol: symbol.tsSymbol,
                    tsType: symbol.tsType,
                    target: target,
                    declaration: ref,
                    targetLocation: symbol.shimLocation,
                    referenceVarLocation: referenceVarShimLocation,
                };
            }
            else {
                if (!ts.isClassDeclaration(target.directive.ref.node)) {
                    return null;
                }
                return {
                    kind: api_1.SymbolKind.Reference,
                    tsSymbol: symbol.tsSymbol,
                    tsType: symbol.tsType,
                    declaration: ref,
                    target: target.directive.ref.node,
                    targetLocation: symbol.shimLocation,
                    referenceVarLocation: referenceVarShimLocation,
                };
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
                    tsType: this.getTypeChecker().getTypeAtLocation(node) });
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
                tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.name);
            }
            else if (ts.isElementAccessExpression(node)) {
                tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.argumentExpression);
            }
            else {
                tsSymbol = this.getTypeChecker().getSymbolAtLocation(node);
            }
            var positionInShimFile = this.getShimPositionForNode(node);
            var type = this.getTypeChecker().getTypeAtLocation(node);
            return {
                // If we could not find a symbol, fall back to the symbol on the type for the node.
                // Some nodes won't have a "symbol at location" but will have a symbol for the type.
                // Examples of this would be literals and `document.createElement('div')`.
                tsSymbol: (_a = tsSymbol !== null && tsSymbol !== void 0 ? tsSymbol : type.symbol) !== null && _a !== void 0 ? _a : null,
                tsType: type,
                shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
            };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFLakMsa0ZBQXVEO0lBQ3ZELHFFQUFvUTtJQUVwUSxtRkFBc0g7SUFFdEgsaUZBQTZDO0lBQzdDLG1HQUF5RDtJQUV6RDs7Ozs7T0FLRztJQUNIO1FBR0UsdUJBQ3FCLFFBQXdCLEVBQ3hCLGNBQXVCLEVBQ3ZCLFlBQTBCLEVBQzFCLG9CQUEwQztRQUMzRCw4RkFBOEY7UUFDOUYsK0JBQStCO1FBQ2QsY0FBb0M7WUFOcEMsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDeEIsbUJBQWMsR0FBZCxjQUFjLENBQVM7WUFDdkIsaUJBQVksR0FBWixZQUFZLENBQWM7WUFDMUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtZQUcxQyxtQkFBYyxHQUFkLGNBQWMsQ0FBc0I7WUFUakQsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQVUzRCxDQUFDO1FBS0osaUNBQVMsR0FBVCxVQUFVLElBQXFCO1lBQzdCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7YUFDcEM7WUFFRCxJQUFJLE1BQU0sR0FBZ0IsSUFBSSxDQUFDO1lBQy9CLElBQUksSUFBSSxZQUFZLGdDQUFxQixJQUFJLElBQUksWUFBWSwrQkFBb0IsRUFBRTtnQkFDakYsNEZBQTRGO2dCQUM1Riw2Q0FBNkM7Z0JBQzdDLE1BQU0sR0FBRyxJ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QGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQVNUV2l0aFNvdXJjZSwgQmluZGluZ1BpcGUsIE1ldGhvZENhbGwsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2lzQXNzaWdubWVudH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgRG9tQmluZGluZ1N5bWJvbCwgRWxlbWVudFN5bWJvbCwgRXhwcmVzc2lvblN5bWJvbCwgSW5wdXRCaW5kaW5nU3ltYm9sLCBPdXRwdXRCaW5kaW5nU3ltYm9sLCBSZWZlcmVuY2VTeW1ib2wsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVN5bWJvbCwgVHNOb2RlU3ltYm9sSW5mbywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFZhcmlhYmxlU3ltYm9sfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0V4cHJlc3Npb25JZGVudGlmaWVyLCBmaW5kQWxsTWF0Y2hpbmdOb2RlcywgZmluZEZpcnN0TWF0Y2hpbmdOb2RlLCBoYXNFeHByZXNzaW9uSWRlbnRpZmllcn0gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge1RlbXBsYXRlRGF0YX0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7aXNBY2Nlc3NFeHByZXNzaW9ufSBmcm9tICcuL3RzX3V0aWwnO1xuaW1wb3J0IHtUY2JEaXJlY3RpdmVPdXRwdXRzT3B9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCBjYWNoZXMgYFN5bWJvbGBzIGZvciB2YXJpb3VzIHRlbXBsYXRlIHN0cnVjdHVyZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIFRoZSBgU3ltYm9sQnVpbGRlcmAgaW50ZXJuYWxseSBjYWNoZXMgdGhlIGBTeW1ib2xgcyBpdCBjcmVhdGVzLCBhbmQgbXVzdCBiZSBkZXN0cm95ZWQgYW5kXG4gKiByZXBsYWNlZCBpZiB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bWJvbEJ1aWxkZXIge1xuICBwcml2YXRlIHN5bWJvbENhY2hlID0gbmV3IE1hcDxBU1R8VG1wbEFzdE5vZGUsIFN5bWJvbHxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja0Jsb2NrOiB0cy5Ob2RlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgLy8gVGhlIGB0cy5UeXBlQ2hlY2tlcmAgZGVwZW5kcyBvbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFuZCBzbyBtdXN0IGJlIHJlcXVlc3RlZFxuICAgICAgLy8gb24tZGVtYW5kIGluc3RlYWQgb2YgY2FjaGVkLlxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRUeXBlQ2hlY2tlcjogKCkgPT4gdHMuVHlwZUNoZWNrZXIsXG4gICkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBsZXQgc3ltYm9sOiBTeW1ib2x8bnVsbCA9IG51bGw7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnB1dCBhbmQgb3V0cHV0IGJpbmRpbmdzIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBkaXJlY3RpdmUgbWF0Y2ggYnV0IHNob3VsZFxuICAgICAgLy8gcmV0dXJuIGEgbGlzdCBvZiBiaW5kaW5ncyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQm91bmRFdmVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkVsZW1lbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQXN0VGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlJlZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBBU1QpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRtcGxBc3RDb250ZW50LCBUbXBsQXN0SWN1XG4gICAgfVxuXG4gICAgdGhpcy5zeW1ib2xDYWNoZS5zZXQobm9kZSwgc3ltYm9sKTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkFzdFRlbXBsYXRlKHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpOiBUZW1wbGF0ZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKHRlbXBsYXRlKTtcbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuVGVtcGxhdGUsIGRpcmVjdGl2ZXMsIHRlbXBsYXRlTm9kZTogdGVtcGxhdGV9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpOiBFbGVtZW50U3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sRnJvbURlY2xhcmF0aW9uID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICBpZiAoc3ltYm9sRnJvbURlY2xhcmF0aW9uID09PSBudWxsIHx8IHN5bWJvbEZyb21EZWNsYXJhdGlvbi50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50KTtcbiAgICAvLyBBbGwgc3RhdGVtZW50cyBpbiB0aGUgVENCIGFyZSBgRXhwcmVzc2lvbmBzIHRoYXQgb3B0aW9uYWxseSBpbmNsdWRlIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgLy8gQW4gYEVsZW1lbnRTeW1ib2xgIHVzZXMgdGhlIGluZm9ybWF0aW9uIHJldHVybmVkIGZvciB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZXhwcmVzc2lvbixcbiAgICAvLyBhZGRzIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgZWxlbWVudCwgYW5kIHVwZGF0ZXMgdGhlIGBraW5kYCB0byBiZSBgU3ltYm9sS2luZC5FbGVtZW50YC5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uc3ltYm9sRnJvbURlY2xhcmF0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5FbGVtZW50LFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICAgIHRlbXBsYXRlTm9kZTogZWxlbWVudCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IERpcmVjdGl2ZVN5bWJvbFtdIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcbiAgICBjb25zdCB0Y2JTb3VyY2VGaWxlID0gdGhpcy50eXBlQ2hlY2tCbG9jay5nZXRTb3VyY2VGaWxlKCk7XG4gICAgLy8gZGlyZWN0aXZlcyBjb3VsZCBiZSBlaXRoZXI6XG4gICAgLy8gLSB2YXIgX3QxOiBUZXN0RGlyIC8qVDpEKi8gPSAobnVsbCEpO1xuICAgIC8vIC0gdmFyIF90MSAvKlQ6RCovID0gX2N0b3IxKHt9KTtcbiAgICBjb25zdCBpc0RpcmVjdGl2ZURlY2xhcmF0aW9uID0gKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlR5cGVOb2RlfHRzLklkZW50aWZpZXIgPT5cbiAgICAgICAgKHRzLmlzVHlwZU5vZGUobm9kZSkgfHwgdHMuaXNJZGVudGlmaWVyKG5vZGUpKSAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpICYmXG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHRjYlNvdXJjZUZpbGUsIG5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IGlzRGlyZWN0aXZlRGVjbGFyYXRpb259KTtcbiAgICByZXR1cm4gbm9kZXNcbiAgICAgICAgLm1hcChub2RlID0+IHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUucGFyZW50KTtcbiAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICAgICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbWV0YSA9IHRoaXMuZ2V0RGlyZWN0aXZlTWV0YShlbGVtZW50LCBzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5nZXREaXJlY3RpdmVNb2R1bGUoc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChtZXRhLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgaXNDb21wb25lbnQgPSBtZXRhLmlzQ29tcG9uZW50ID8/IG51bGw7XG4gICAgICAgICAgY29uc3QgZGlyZWN0aXZlU3ltYm9sOiBEaXJlY3RpdmVTeW1ib2wgPSB7XG4gICAgICAgICAgICAuLi5zeW1ib2wsXG4gICAgICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICAgICAgc2VsZWN0b3I6IG1ldGEuc2VsZWN0b3IsXG4gICAgICAgICAgICBpc0NvbXBvbmVudCxcbiAgICAgICAgICAgIG5nTW9kdWxlLFxuICAgICAgICAgICAga2luZDogU3ltYm9sS2luZC5EaXJlY3RpdmVcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlTWV0YShcbiAgICAgIGhvc3Q6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGhvc3QpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIC8vIE91dHB1dHMgYXJlIGEgYHRzLkNhbGxFeHByZXNzaW9uYCB0aGF0IGxvb2sgbGlrZSBvbmUgb2YgdGhlIHR3bzpcbiAgICAvLyAqIF9vdXRwdXRIZWxwZXIoX3QxW1wib3V0cHV0RmllbGRcIl0pLnN1YnNjcmliZShoYW5kbGVyKTtcbiAgICAvLyAqIF90MS5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIpO1xuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZXZlbnRCaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNDYWxsRXhwcmVzc2lvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGV2ZW50QmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyID09PSBudWxsIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8XG4gICAgICAgIGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIC8vIEJpbmRpbmdzIHRvIGVsZW1lbnQgb3IgdGVtcGxhdGUgZXZlbnRzIHByb2R1Y2UgYGFkZEV2ZW50TGlzdGVuZXJgIHdoaWNoXG4gICAgICAvLyB3ZSBjYW5ub3QgZ2V0IHRoZSBmaWVsZCBmb3IuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3MgPSBUY2JEaXJlY3RpdmVPdXRwdXRzT3AuZGVjb2RlT3V0cHV0Q2FsbEV4cHJlc3Npb24obm9kZSk7XG4gICAgaWYgKG91dHB1dEZpZWxkQWNjZXNzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0c1N5bWJvbCA9XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG91dHB1dEZpZWxkQWNjZXNzKTtcbiAgICBjb25zdCB0c1R5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuT3V0cHV0LFxuICAgICAgYmluZGluZ3M6IFt7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgIHRzVHlwZSxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgIH1dLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKGJpbmRpbmc6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk6IElucHV0QmluZGluZ1N5bWJvbHxEb21CaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoYmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCBjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMuZ2V0U3ltYm9sKGNvbnN1bWVyKTtcbiAgICAgIHJldHVybiBob3N0ICE9PSBudWxsID8ge2tpbmQ6IFN5bWJvbEtpbmQuRG9tQmluZGluZywgaG9zdH0gOiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogYmluZGluZy5zb3VyY2VTcGFuLCBmaWx0ZXI6IGlzQXNzaWdubWVudH0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8ICFpc0FjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5sZWZ0KTtcbiAgICBpZiAoc3ltYm9sSW5mbyA9PT0gbnVsbCB8fCBzeW1ib2xJbmZvLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0LCBjb25zdW1lcik7XG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuSW5wdXQsXG4gICAgICBiaW5kaW5nczogW3tcbiAgICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbEluZm8udHNTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfV0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihcbiAgICAgIG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbixcbiAgICAgIHtpc0NvbXBvbmVudCwgc2VsZWN0b3J9OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IERpcmVjdGl2ZVN5bWJvbHxudWxsIHtcbiAgICAvLyBJbiBlaXRoZXIgY2FzZSwgYF90MVtcImluZGV4XCJdYCBvciBgX3QxLmluZGV4YCwgYG5vZGUuZXhwcmVzc2lvbmAgaXMgX3QxLlxuICAgIC8vIFRoZSByZXRyaWV2ZWQgc3ltYm9sIGZvciBfdDEgd2lsbCBiZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHRzU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDAgfHwgc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IFtkZWNsYXJhdGlvbl0gPSB0c1N5bWJvbC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8XG4gICAgICAgICFoYXNFeHByZXNzaW9uSWRlbnRpZmllcihcbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGlkZW50aWZpZXIgY291bGQgYmUgb24gdGhlIHR5cGUgKGZvciByZWd1bGFyIGRpcmVjdGl2ZXMpIG9yIHRoZSBuYW1lXG4gICAgICAgICAgICAvLyAoZm9yIGdlbmVyaWMgZGlyZWN0aXZlcyBhbmQgdGhlIGN0b3Igb3ApLlxuICAgICAgICAgICAgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLCBkZWNsYXJhdGlvbi50eXBlID8/IGRlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCB8fFxuICAgICAgICBzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5EaXJlY3RpdmUsXG4gICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgaXNDb21wb25lbnQsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG5nTW9kdWxlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVmFyaWFibGUodmFyaWFibGU6IFRtcGxBc3RWYXJpYWJsZSk6IFZhcmlhYmxlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogdmFyaWFibGUuc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHJlc3Npb25TeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgIGlmIChleHByZXNzaW9uU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdHNUeXBlOiBleHByZXNzaW9uU3ltYm9sLnRzVHlwZSxcbiAgICAgIHRzU3ltYm9sOiBleHByZXNzaW9uU3ltYm9sLnRzU3ltYm9sLFxuICAgICAgaW5pdGlhbGl6ZXJMb2NhdGlvbjogZXhwcmVzc2lvblN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICBraW5kOiBTeW1ib2xLaW5kLlZhcmlhYmxlLFxuICAgICAgZGVjbGFyYXRpb246IHZhcmlhYmxlLFxuICAgICAgbG9jYWxWYXJMb2NhdGlvbjoge1xuICAgICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZS5uYW1lKSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlJlZmVyZW5jZShyZWY6IFRtcGxBc3RSZWZlcmVuY2UpOiBSZWZlcmVuY2VTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0UmVmZXJlbmNlVGFyZ2V0KHJlZik7XG4gICAgLy8gRmluZCB0aGUgbm9kZSBmb3IgdGhlIHJlZmVyZW5jZSBkZWNsYXJhdGlvbiwgaS5lLiBgdmFyIF90MiA9IF90MTtgXG4gICAgbGV0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogcmVmLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgdGFyZ2V0ID09PSBudWxsIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBmb3IgdGhlIHJlZmVyZW5jZXMgdmFyaWFibGUsIHdpdGggdGhlIGV4Y2VwdGlvbiBvZiB0ZW1wbGF0ZSByZWZzXG4gICAgLy8gd2hpY2ggYXJlIG9mIHRoZSBmb3JtIHZhciBfdDMgPSAoX3QyIGFzIGFueSBhcyBpMi5UZW1wbGF0ZVJlZjxhbnk+KVxuICAgIC8vIFRPRE8oYXRzY290dCk6IENvbnNpZGVyIGFkZGluZyBhbiBgRXhwcmVzc2lvbklkZW50aWZpZXJgIHRvIHRhZyB2YXJpYWJsZSBkZWNsYXJhdGlvblxuICAgIC8vIGluaXRpYWxpemVycyBhcyBpbnZhbGlkIGZvciBzeW1ib2wgcmV0cmlldmFsLlxuICAgIGNvbnN0IG9yaWdpbmFsRGVjbGFyYXRpb24gPSB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIpICYmXG4gICAgICAgICAgICB0cy5pc0FzRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyLmV4cHJlc3Npb24pID9cbiAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5uYW1lKSA6XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgIGlmIChvcmlnaW5hbERlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgb3JpZ2luYWxEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uID0ge1xuICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKSxcbiAgICB9O1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgdGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5SZWZlcmVuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgICB0YXJnZXRMb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgICAgcmVmZXJlbmNlVmFyTG9jYXRpb246IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbixcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihleHByZXNzaW9uOiBBU1QpOiBWYXJpYWJsZVN5bWJvbHxSZWZlcmVuY2VTeW1ib2xcbiAgICAgIHxFeHByZXNzaW9uU3ltYm9sfG51bGwge1xuICAgIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYXN0O1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHJlc3Npb25UYXJnZXQgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGV4cHJlc3Npb24pO1xuICAgIGlmIChleHByZXNzaW9uVGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2woZXhwcmVzc2lvblRhcmdldCk7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBuYW1lYCBwYXJ0IG9mIGEgYFByb3BlcnR5V3JpdGVgIGFuZCBgTWV0aG9kQ2FsbGAgZG9lcyBub3QgaGF2ZSBpdHMgb3duXG4gICAgLy8gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWMgbm9kZS5cbiAgICBjb25zdCB3aXRoU3BhbiA9IChleHByZXNzaW9uIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgTWV0aG9kQ2FsbCkgP1xuICAgICAgICBleHByZXNzaW9uLm5hbWVTcGFuIDpcbiAgICAgICAgZXhwcmVzc2lvbi5zb3VyY2VTcGFuO1xuXG4gICAgbGV0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbiwgZmlsdGVyOiAobjogdHMuTm9kZSk6IG4gaXMgdHMuTm9kZSA9PiB0cnVlfSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIC0gSWYgd2UgaGF2ZSBzYWZlIHByb3BlcnR5IHJlYWQgKFwiYT8uYlwiKSB3ZSB3YW50IHRvIGdldCB0aGUgU3ltYm9sIGZvciBiLCB0aGUgYHdoZW5UcnVlYFxuICAgIC8vIGV4cHJlc3Npb24uXG4gICAgLy8gLSBJZiBvdXIgZXhwcmVzc2lvbiBpcyBhIHBpcGUgYmluZGluZyAoXCJhIHwgdGVzdDpiOmNcIiksIHdlIHdhbnQgdGhlIFN5bWJvbCBmb3IgdGhlXG4gICAgLy8gYHRyYW5zZm9ybWAgb24gdGhlIHBpcGUuXG4gICAgLy8gLSBPdGhlcndpc2UsIHdlIHJldHJpZXZlIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIGl0c2VsZiB3aXRoIG5vIHNwZWNpYWwgY29uc2lkZXJhdGlvbnNcbiAgICBpZiAoKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlUHJvcGVydHlSZWFkIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCkgJiZcbiAgICAgICAgdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIGNvbnN0IHdoZW5UcnVlU3ltYm9sID1cbiAgICAgICAgICAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSkpID9cbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUuZXhwcmVzc2lvbikgOlxuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZSk7XG4gICAgICBpZiAod2hlblRydWVTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLndoZW5UcnVlU3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb24sXG4gICAgICAgIC8vIFJhdGhlciB0aGFuIHVzaW5nIHRoZSB0eXBlIG9mIG9ubHkgdGhlIGB3aGVuVHJ1ZWAgcGFydCBvZiB0aGUgZXhwcmVzc2lvbiwgd2Ugc2hvdWxkXG4gICAgICAgIC8vIHN0aWxsIGdldCB0aGUgdHlwZSBvZiB0aGUgd2hvbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiB0byBpbmNsdWRlIGB8dW5kZWZpbmVkYC5cbiAgICAgICAgdHNUeXBlOiB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSlcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgQmluZGluZ1BpcGUgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogQ3JlYXRlIGEgUGlwZVN5bWJvbCB0byBpbmNsdWRlIHN5bWJvbCBmb3IgdGhlIFBpcGUgY2xhc3NcbiAgICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVHNOb2RlKG5vZGU6IHRzLk5vZGUpOiBUc05vZGVTeW1ib2xJbmZvfG51bGwge1xuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIGxldCB0c1N5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5uYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKTtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xuICAgIHJldHVybiB7XG4gICAgICAvLyBJZiB3ZSBjb3VsZCBub3QgZmluZCBhIHN5bWJvbCwgZmFsbCBiYWNrIHRvIHRoZSBzeW1ib2wgb24gdGhlIHR5cGUgZm9yIHRoZSBub2RlLlxuICAgICAgLy8gU29tZSBub2RlcyB3b24ndCBoYXZlIGEgXCJzeW1ib2wgYXQgbG9jYXRpb25cIiBidXQgd2lsbCBoYXZlIGEgc3ltYm9sIGZvciB0aGUgdHlwZS5cbiAgICAgIC8vIEV4YW1wbGVzIG9mIHRoaXMgd291bGQgYmUgbGl0ZXJhbHMgYW5kIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKWAuXG4gICAgICB0c1N5bWJvbDogdHNTeW1ib2wgPz8gdHlwZS5zeW1ib2wgPz8gbnVsbCxcbiAgICAgIHRzVHlwZTogdHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZTogdHMuTm9kZSk6IG51bWJlciB7XG4gICAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZS50eXBlTmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnJpZ2h0LmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubmFtZS5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBub2RlLmdldFN0YXJ0KCk7XG4gICAgfVxuICB9XG59XG4iXX0=