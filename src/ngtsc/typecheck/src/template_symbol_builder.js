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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/comments", "@angular/compiler-cli/src/ngtsc/typecheck/src/ts_util"], factory);
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
            else if (node instanceof compiler_1.BindingPipe) {
                symbol = this.getSymbolOfPipe(node);
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
                    ngModule: ngModule, kind: api_1.SymbolKind.Directive, isStructural: meta.isStructural });
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
            // Outputs in the TCB look like one of the two:
            // * _outputHelper(_t1["outputField"]).subscribe(handler);
            // * _t1.addEventListener(handler);
            // Even with strict null checks disabled, we still produce the access as a separate statement
            // so that it can be found here.
            var outputFieldAccess = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter: ts_util_1.isAccessExpression });
            if (outputFieldAccess === null) {
                return null;
            }
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
            if (consumer === null) {
                return null;
            }
            if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                if (!ts.isPropertyAccessExpression(outputFieldAccess) ||
                    outputFieldAccess.name.text !== 'addEventListener') {
                    return null;
                }
                var addEventListener_1 = outputFieldAccess.name;
                var tsSymbol = this.getTypeChecker().getSymbolAtLocation(addEventListener_1);
                var tsType = this.getTypeChecker().getTypeAtLocation(addEventListener_1);
                var positionInShimFile = this.getShimPositionForNode(addEventListener_1);
                var target = this.getSymbol(consumer);
                if (target === null || tsSymbol === undefined) {
                    return null;
                }
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
            }
            else {
                if (!ts.isElementAccessExpression(outputFieldAccess)) {
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
                var tsType = this.getTypeChecker().getTypeAtLocation(outputFieldAccess);
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
            }
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
            var isComponent = _a.isComponent, selector = _a.selector, isStructural = _a.isStructural;
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
                isStructural: isStructural,
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
        SymbolBuilder.prototype.getSymbolOfPipe = function (expression) {
            var node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.sourceSpan, filter: ts.isCallExpression });
            if (node === null || !ts.isPropertyAccessExpression(node.expression)) {
                return null;
            }
            var methodAccess = node.expression;
            // Find the node for the pipe variable from the transform property access. This will be one of
            // two forms: `_pipe1.transform` or `(_pipe1 as any).transform`.
            var pipeVariableNode = ts.isParenthesizedExpression(methodAccess.expression) &&
                ts.isAsExpression(methodAccess.expression.expression) ?
                methodAccess.expression.expression.expression :
                methodAccess.expression;
            var pipeDeclaration = this.getTypeChecker().getSymbolAtLocation(pipeVariableNode);
            if (pipeDeclaration === undefined || pipeDeclaration.valueDeclaration === undefined) {
                return null;
            }
            var pipeInstance = this.getSymbolOfTsNode(pipeDeclaration.valueDeclaration);
            if (pipeInstance === null || pipeInstance.tsSymbol === null) {
                return null;
            }
            var symbolInfo = this.getSymbolOfTsNode(methodAccess);
            if (symbolInfo === null) {
                return null;
            }
            return tslib_1.__assign(tslib_1.__assign({ kind: api_1.SymbolKind.Pipe }, symbolInfo), { classSymbol: tslib_1.__assign(tslib_1.__assign({}, pipeInstance), { tsSymbol: pipeInstance.tsSymbol }) });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFLakMsa0ZBQXVEO0lBQ3ZELHFFQUFnUjtJQUVoUixtRkFBc0g7SUFFdEgsaUZBQTZDO0lBRTdDOzs7OztPQUtHO0lBQ0g7UUFHRSx1QkFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO1FBQzNELDhGQUE4RjtRQUM5RiwrQkFBK0I7UUFDZCxjQUFvQztZQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztZQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1lBRzFDLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtZQVRqRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBVTNELENBQUM7UUFLSixpQ0FBUyxHQUFULFVBQVUsSUFBcUI7WUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQzthQUNwQztZQUVELElBQUksTUFBTSxHQUFnQixJQUFJLENBQUM7WUFDL0IsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLElBQUksSUFBSSxZQUFZLCtCQUFvQixFQUFFO2dCQUNqRiw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFB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QUFJLENBQUMsQ0FBQztZQUMzRCxPQUFPO2dCQUNMLG1GQUFtRjtnQkFDbkYsb0ZBQW9GO2dCQUNwRiwwRUFBMEU7Z0JBQzFFLFFBQVEsUUFBRSxRQUFRLGFBQVIsUUFBUSxjQUFSLFFBQVEsR0FBSSxJQUFJLENBQUMsTUFBTSxtQ0FBSSxJQUFJO2dCQUN6QyxNQUFNLEVBQUUsSUFBSTtnQkFDWixZQUFZLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxrQkFBa0Isb0JBQUEsRUFBQzthQUM1RCxDQUFDO1FBQ0osQ0FBQztRQUVPLDhDQUFzQixHQUE5QixVQUErQixJQUFhO1lBQzFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbkQ7aUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDOUI7aUJBQU0sSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDM0M7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDeEI7UUFDSCxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBN2ZELElBNmZDO0lBN2ZZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBU1RXaXRoU291cmNlLCBCaW5kaW5nUGlwZSwgTWV0aG9kQ2FsbCwgUHJvcGVydHlXcml0ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXJ9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNBc3NpZ25tZW50fSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBFeHByZXNzaW9uU3ltYm9sLCBJbnB1dEJpbmRpbmdTeW1ib2wsIE91dHB1dEJpbmRpbmdTeW1ib2wsIFBpcGVTeW1ib2wsIFJlZmVyZW5jZVN5bWJvbCwgU2hpbUxvY2F0aW9uLCBTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlU3ltYm9sLCBUc05vZGVTeW1ib2xJbmZvLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVmFyaWFibGVTeW1ib2x9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGZpbmRBbGxNYXRjaGluZ05vZGVzLCBmaW5kRmlyc3RNYXRjaGluZ05vZGUsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7VGVtcGxhdGVEYXRhfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtpc0FjY2Vzc0V4cHJlc3Npb259IGZyb20gJy4vdHNfdXRpbCc7XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCBjYWNoZXMgYFN5bWJvbGBzIGZvciB2YXJpb3VzIHRlbXBsYXRlIHN0cnVjdHVyZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIFRoZSBgU3ltYm9sQnVpbGRlcmAgaW50ZXJuYWxseSBjYWNoZXMgdGhlIGBTeW1ib2xgcyBpdCBjcmVhdGVzLCBhbmQgbXVzdCBiZSBkZXN0cm95ZWQgYW5kXG4gKiByZXBsYWNlZCBpZiB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bWJvbEJ1aWxkZXIge1xuICBwcml2YXRlIHN5bWJvbENhY2hlID0gbmV3IE1hcDxBU1R8VG1wbEFzdE5vZGUsIFN5bWJvbHxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja0Jsb2NrOiB0cy5Ob2RlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgLy8gVGhlIGB0cy5UeXBlQ2hlY2tlcmAgZGVwZW5kcyBvbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFuZCBzbyBtdXN0IGJlIHJlcXVlc3RlZFxuICAgICAgLy8gb24tZGVtYW5kIGluc3RlYWQgb2YgY2FjaGVkLlxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRUeXBlQ2hlY2tlcjogKCkgPT4gdHMuVHlwZUNoZWNrZXIsXG4gICkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBsZXQgc3ltYm9sOiBTeW1ib2x8bnVsbCA9IG51bGw7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnB1dCBhbmQgb3V0cHV0IGJpbmRpbmdzIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBkaXJlY3RpdmUgbWF0Y2ggYnV0IHNob3VsZFxuICAgICAgLy8gcmV0dXJuIGEgbGlzdCBvZiBiaW5kaW5ncyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQm91bmRFdmVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkVsZW1lbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQXN0VGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlJlZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlBpcGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQVNUKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUbXBsQXN0Q29udGVudCwgVG1wbEFzdEljdVxuICAgIH1cblxuICAgIHRoaXMuc3ltYm9sQ2FjaGUuc2V0KG5vZGUsIHN5bWJvbCk7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKTogVGVtcGxhdGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZSh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLlRlbXBsYXRlLCBkaXJlY3RpdmVzLCB0ZW1wbGF0ZU5vZGU6IHRlbXBsYXRlfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZFbGVtZW50KGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KTogRWxlbWVudFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgaWYgKHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBzeW1ib2xGcm9tRGVjbGFyYXRpb24udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCk7XG4gICAgLy8gQWxsIHN0YXRlbWVudHMgaW4gdGhlIFRDQiBhcmUgYEV4cHJlc3Npb25gcyB0aGF0IG9wdGlvbmFsbHkgaW5jbHVkZSBtb3JlIGluZm9ybWF0aW9uLlxuICAgIC8vIEFuIGBFbGVtZW50U3ltYm9sYCB1c2VzIHRoZSBpbmZvcm1hdGlvbiByZXR1cm5lZCBmb3IgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGV4cHJlc3Npb24sXG4gICAgLy8gYWRkcyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGVsZW1lbnQsIGFuZCB1cGRhdGVzIHRoZSBga2luZGAgdG8gYmUgYFN5bWJvbEtpbmQuRWxlbWVudGAuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnN5bWJvbEZyb21EZWNsYXJhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZXMsXG4gICAgICB0ZW1wbGF0ZU5vZGU6IGVsZW1lbnQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiBEaXJlY3RpdmVTeW1ib2xbXSB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG4gICAgY29uc3QgdGNiU291cmNlRmlsZSA9IHRoaXMudHlwZUNoZWNrQmxvY2suZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIGRpcmVjdGl2ZXMgY291bGQgYmUgZWl0aGVyOlxuICAgIC8vIC0gdmFyIF90MTogVGVzdERpciAvKlQ6RCovID0gKG51bGwhKTtcbiAgICAvLyAtIHZhciBfdDEgLypUOkQqLyA9IF9jdG9yMSh7fSk7XG4gICAgY29uc3QgaXNEaXJlY3RpdmVEZWNsYXJhdGlvbiA9IChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5UeXBlTm9kZXx0cy5JZGVudGlmaWVyID0+XG4gICAgICAgICh0cy5pc1R5cGVOb2RlKG5vZGUpIHx8IHRzLmlzSWRlbnRpZmllcihub2RlKSkgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUucGFyZW50KSAmJlxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcih0Y2JTb3VyY2VGaWxlLCBub2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiBpc0RpcmVjdGl2ZURlY2xhcmF0aW9ufSk7XG4gICAgcmV0dXJuIG5vZGVzXG4gICAgICAgIC5tYXAobm9kZSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLnBhcmVudCk7XG4gICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLmdldERpcmVjdGl2ZU1ldGEoZWxlbWVudCwgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YS5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50ID0gbWV0YS5pc0NvbXBvbmVudCA/PyBudWxsO1xuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbDogRGlyZWN0aXZlU3ltYm9sID0ge1xuICAgICAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBtZXRhLnNlbGVjdG9yLFxuICAgICAgICAgICAgaXNDb21wb25lbnQsXG4gICAgICAgICAgICBuZ01vZHVsZSxcbiAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgICAgICAgaXNTdHJ1Y3R1cmFsOiBtZXRhLmlzU3RydWN0dXJhbCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlTWV0YShcbiAgICAgIGhvc3Q6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGhvc3QpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIC8vIE91dHB1dHMgaW4gdGhlIFRDQiBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAgLy8gKiBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgLy8gKiBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtcbiAgICAvLyBFdmVuIHdpdGggc3RyaWN0IG51bGwgY2hlY2tzIGRpc2FibGVkLCB3ZSBzdGlsbCBwcm9kdWNlIHRoZSBhY2Nlc3MgYXMgYSBzZXBhcmF0ZSBzdGF0ZW1lbnRcbiAgICAvLyBzbyB0aGF0IGl0IGNhbiBiZSBmb3VuZCBoZXJlLlxuICAgIGNvbnN0IG91dHB1dEZpZWxkQWNjZXNzID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGV2ZW50QmluZGluZy5rZXlTcGFuLCBmaWx0ZXI6IGlzQWNjZXNzRXhwcmVzc2lvbn0pO1xuICAgIGlmIChvdXRwdXRGaWVsZEFjY2VzcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRDb25zdW1lck9mQmluZGluZyhldmVudEJpbmRpbmcpO1xuICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpIHx8XG4gICAgICAgICAgb3V0cHV0RmllbGRBY2Nlc3MubmFtZS50ZXh0ICE9PSAnYWRkRXZlbnRMaXN0ZW5lcicpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFkZEV2ZW50TGlzdGVuZXIgPSBvdXRwdXRGaWVsZEFjY2Vzcy5uYW1lO1xuICAgICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0U3ltYm9sKGNvbnN1bWVyKTtcblxuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLk91dHB1dCxcbiAgICAgICAgYmluZGluZ3M6IFt7XG4gICAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICAgIHRzU3ltYm9sLFxuICAgICAgICAgIHRzVHlwZSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICAgIH1dLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzU3ltYm9sID1cbiAgICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcy5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUob3V0cHV0RmllbGRBY2Nlc3MpO1xuICAgICAgY29uc3QgdHNUeXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuT3V0cHV0LFxuICAgICAgICBiaW5kaW5nczogW3tcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfV0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcoYmluZGluZzogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRtcGxBc3RUZXh0QXR0cmlidXRlKTogSW5wdXRCaW5kaW5nU3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRDb25zdW1lck9mQmluZGluZyhiaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuICAgICAgcmV0dXJuIGhvc3QgIT09IG51bGwgPyB7a2luZDogU3ltYm9sS2luZC5Eb21CaW5kaW5nLCBob3N0fSA6IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBiaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogaXNBc3NpZ25tZW50fSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgIWlzQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmxlZnQpO1xuICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsIHx8IHN5bWJvbEluZm8udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnN1bWVyKTtcbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5JbnB1dCxcbiAgICAgIGJpbmRpbmdzOiBbe1xuICAgICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sSW5mby50c1N5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9XSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKFxuICAgICAgbm9kZTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb258dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLFxuICAgICAge2lzQ29tcG9uZW50LCBzZWxlY3RvciwgaXNTdHJ1Y3R1cmFsfTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiBEaXJlY3RpdmVTeW1ib2x8bnVsbCB7XG4gICAgLy8gSW4gZWl0aGVyIGNhc2UsIGBfdDFbXCJpbmRleFwiXWAgb3IgYF90MS5pbmRleGAsIGBub2RlLmV4cHJlc3Npb25gIGlzIF90MS5cbiAgICAvLyBUaGUgcmV0cmlldmVkIHN5bWJvbCBmb3IgX3QxIHdpbGwgYmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5leHByZXNzaW9uKTtcbiAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCB8fCB0c1N5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAwIHx8IHNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBbZGVjbGFyYXRpb25dID0gdHNTeW1ib2wuZGVjbGFyYXRpb25zO1xuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fFxuICAgICAgICAhaGFzRXhwcmVzc2lvbklkZW50aWZpZXIoXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBpZGVudGlmaWVyIGNvdWxkIGJlIG9uIHRoZSB0eXBlIChmb3IgcmVndWxhciBkaXJlY3RpdmVzKSBvciB0aGUgbmFtZVxuICAgICAgICAgICAgLy8gKGZvciBnZW5lcmljIGRpcmVjdGl2ZXMgYW5kIHRoZSBjdG9yIG9wKS5cbiAgICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSwgZGVjbGFyYXRpb24udHlwZSA/PyBkZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgaXNTdHJ1Y3R1cmFsLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBuZ01vZHVsZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlZhcmlhYmxlKHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpOiBWYXJpYWJsZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHZhcmlhYmxlLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAoZXhwcmVzc2lvblN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRzVHlwZTogZXhwcmVzc2lvblN5bWJvbC50c1R5cGUsXG4gICAgICB0c1N5bWJvbDogZXhwcmVzc2lvblN5bWJvbC50c1N5bWJvbCxcbiAgICAgIGluaXRpYWxpemVyTG9jYXRpb246IGV4cHJlc3Npb25TeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSxcbiAgICAgIGRlY2xhcmF0aW9uOiB2YXJpYWJsZSxcbiAgICAgIGxvY2FsVmFyTG9jYXRpb246IHtcbiAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUubmFtZSksXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gZm9yIHRoZSByZWZlcmVuY2VzIHZhcmlhYmxlLCB3aXRoIHRoZSBleGNlcHRpb24gb2YgdGVtcGxhdGUgcmVmc1xuICAgIC8vIHdoaWNoIGFyZSBvZiB0aGUgZm9ybSB2YXIgX3QzID0gKF90MiBhcyBhbnkgYXMgaTIuVGVtcGxhdGVSZWY8YW55PilcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBDb25zaWRlciBhZGRpbmcgYW4gYEV4cHJlc3Npb25JZGVudGlmaWVyYCB0byB0YWcgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICAvLyBpbml0aWFsaXplcnMgYXMgaW52YWxpZCBmb3Igc3ltYm9sIHJldHJpZXZhbC5cbiAgICBjb25zdCBvcmlnaW5hbERlY2xhcmF0aW9uID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgICAgdHMuaXNBc0V4cHJlc3Npb24obm9kZS5pbml0aWFsaXplci5leHByZXNzaW9uKSA/XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSkgOlxuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAob3JpZ2luYWxEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCByZWZlcmVuY2VWYXJTaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbiA9IHtcbiAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSksXG4gICAgfTtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24odGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSxcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZQaXBlKGV4cHJlc3Npb246IEJpbmRpbmdQaXBlKTogUGlwZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGV4cHJlc3Npb24uc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc0NhbGxFeHByZXNzaW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGhvZEFjY2VzcyA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICAvLyBGaW5kIHRoZSBub2RlIGZvciB0aGUgcGlwZSB2YXJpYWJsZSBmcm9tIHRoZSB0cmFuc2Zvcm0gcHJvcGVydHkgYWNjZXNzLiBUaGlzIHdpbGwgYmUgb25lIG9mXG4gICAgLy8gdHdvIGZvcm1zOiBgX3BpcGUxLnRyYW5zZm9ybWAgb3IgYChfcGlwZTEgYXMgYW55KS50cmFuc2Zvcm1gLlxuICAgIGNvbnN0IHBpcGVWYXJpYWJsZU5vZGUgPSB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG1ldGhvZEFjY2Vzcy5leHByZXNzaW9uKSAmJlxuICAgICAgICAgICAgdHMuaXNBc0V4cHJlc3Npb24obWV0aG9kQWNjZXNzLmV4cHJlc3Npb24uZXhwcmVzc2lvbikgP1xuICAgICAgICBtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbi5leHByZXNzaW9uLmV4cHJlc3Npb24gOlxuICAgICAgICBtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgICBjb25zdCBwaXBlRGVjbGFyYXRpb24gPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihwaXBlVmFyaWFibGVOb2RlKTtcbiAgICBpZiAocGlwZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgcGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZUluc3RhbmNlID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShwaXBlRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKHBpcGVJbnN0YW5jZSA9PT0gbnVsbCB8fCBwaXBlSW5zdGFuY2UudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG1ldGhvZEFjY2Vzcyk7XG4gICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLlBpcGUsXG4gICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgY2xhc3NTeW1ib2w6IHtcbiAgICAgICAgLi4ucGlwZUluc3RhbmNlLFxuICAgICAgICB0c1N5bWJvbDogcGlwZUluc3RhbmNlLnRzU3ltYm9sLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihleHByZXNzaW9uOiBBU1QpOiBWYXJpYWJsZVN5bWJvbHxSZWZlcmVuY2VTeW1ib2xcbiAgICAgIHxFeHByZXNzaW9uU3ltYm9sfG51bGwge1xuICAgIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYXN0O1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHJlc3Npb25UYXJnZXQgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGV4cHJlc3Npb24pO1xuICAgIGlmIChleHByZXNzaW9uVGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2woZXhwcmVzc2lvblRhcmdldCk7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBuYW1lYCBwYXJ0IG9mIGEgYFByb3BlcnR5V3JpdGVgIGFuZCBgTWV0aG9kQ2FsbGAgZG9lcyBub3QgaGF2ZSBpdHMgb3duXG4gICAgLy8gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWMgbm9kZS5cbiAgICBjb25zdCB3aXRoU3BhbiA9IChleHByZXNzaW9uIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgTWV0aG9kQ2FsbCkgP1xuICAgICAgICBleHByZXNzaW9uLm5hbWVTcGFuIDpcbiAgICAgICAgZXhwcmVzc2lvbi5zb3VyY2VTcGFuO1xuXG4gICAgbGV0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbiwgZmlsdGVyOiAobjogdHMuTm9kZSk6IG4gaXMgdHMuTm9kZSA9PiB0cnVlfSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIC0gSWYgd2UgaGF2ZSBzYWZlIHByb3BlcnR5IHJlYWQgKFwiYT8uYlwiKSB3ZSB3YW50IHRvIGdldCB0aGUgU3ltYm9sIGZvciBiLCB0aGUgYHdoZW5UcnVlYFxuICAgIC8vIGV4cHJlc3Npb24uXG4gICAgLy8gLSBJZiBvdXIgZXhwcmVzc2lvbiBpcyBhIHBpcGUgYmluZGluZyAoXCJhIHwgdGVzdDpiOmNcIiksIHdlIHdhbnQgdGhlIFN5bWJvbCBmb3IgdGhlXG4gICAgLy8gYHRyYW5zZm9ybWAgb24gdGhlIHBpcGUuXG4gICAgLy8gLSBPdGhlcndpc2UsIHdlIHJldHJpZXZlIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIGl0c2VsZiB3aXRoIG5vIHNwZWNpYWwgY29uc2lkZXJhdGlvbnNcbiAgICBpZiAoKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlUHJvcGVydHlSZWFkIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCkgJiZcbiAgICAgICAgdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIGNvbnN0IHdoZW5UcnVlU3ltYm9sID1cbiAgICAgICAgICAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSkpID9cbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUuZXhwcmVzc2lvbikgOlxuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZSk7XG4gICAgICBpZiAod2hlblRydWVTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLndoZW5UcnVlU3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb24sXG4gICAgICAgIC8vIFJhdGhlciB0aGFuIHVzaW5nIHRoZSB0eXBlIG9mIG9ubHkgdGhlIGB3aGVuVHJ1ZWAgcGFydCBvZiB0aGUgZXhwcmVzc2lvbiwgd2Ugc2hvdWxkXG4gICAgICAgIC8vIHN0aWxsIGdldCB0aGUgdHlwZSBvZiB0aGUgd2hvbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiB0byBpbmNsdWRlIGB8dW5kZWZpbmVkYC5cbiAgICAgICAgdHNUeXBlOiB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUpO1xuICAgICAgcmV0dXJuIHN5bWJvbEluZm8gPT09IG51bGwgPyBudWxsIDogey4uLnN5bWJvbEluZm8sIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbn07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlRzTm9kZShub2RlOiB0cy5Ob2RlKTogVHNOb2RlU3ltYm9sSW5mb3xudWxsIHtcbiAgICB3aGlsZSAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICBsZXQgdHNTeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSk7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihub2RlKTtcbiAgICByZXR1cm4ge1xuICAgICAgLy8gSWYgd2UgY291bGQgbm90IGZpbmQgYSBzeW1ib2wsIGZhbGwgYmFjayB0byB0aGUgc3ltYm9sIG9uIHRoZSB0eXBlIGZvciB0aGUgbm9kZS5cbiAgICAgIC8vIFNvbWUgbm9kZXMgd29uJ3QgaGF2ZSBhIFwic3ltYm9sIGF0IGxvY2F0aW9uXCIgYnV0IHdpbGwgaGF2ZSBhIHN5bWJvbCBmb3IgdGhlIHR5cGUuXG4gICAgICAvLyBFeGFtcGxlcyBvZiB0aGlzIHdvdWxkIGJlIGxpdGVyYWxzIGFuZCBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylgLlxuICAgICAgdHNTeW1ib2w6IHRzU3ltYm9sID8/IHR5cGUuc3ltYm9sID8/IG51bGwsXG4gICAgICB0c1R5cGU6IHR5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGU6IHRzLk5vZGUpOiBudW1iZXIge1xuICAgIGlmICh0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUudHlwZU5hbWUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5yaWdodC5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm5hbWUuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLmFyZ3VtZW50RXhwcmVzc2lvbi5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbm9kZS5nZXRTdGFydCgpO1xuICAgIH1cbiAgfVxufVxuIl19