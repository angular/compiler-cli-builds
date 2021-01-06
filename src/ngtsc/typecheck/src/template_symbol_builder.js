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
            var e_1, _a;
            // Outputs in the TCB look like one of the two:
            // * _outputHelper(_t1["outputField"]).subscribe(handler);
            // * _t1.addEventListener(handler);
            // Even with strict null checks disabled, we still produce the access as a separate statement
            // so that it can be found here.
            var outputFieldAccesses = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter: ts_util_1.isAccessExpression });
            var bindings = [];
            try {
                for (var outputFieldAccesses_1 = tslib_1.__values(outputFieldAccesses), outputFieldAccesses_1_1 = outputFieldAccesses_1.next(); !outputFieldAccesses_1_1.done; outputFieldAccesses_1_1 = outputFieldAccesses_1.next()) {
                    var outputFieldAccess = outputFieldAccesses_1_1.value;
                    var consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
                    if (consumer === null) {
                        continue;
                    }
                    if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                        if (!ts.isPropertyAccessExpression(outputFieldAccess) ||
                            outputFieldAccess.name.text !== 'addEventListener') {
                            continue;
                        }
                        var addEventListener_1 = outputFieldAccess.name;
                        var tsSymbol = this.getTypeChecker().getSymbolAtLocation(addEventListener_1);
                        var tsType = this.getTypeChecker().getTypeAtLocation(addEventListener_1);
                        var positionInShimFile = this.getShimPositionForNode(addEventListener_1);
                        var target = this.getSymbol(consumer);
                        if (target === null || tsSymbol === undefined) {
                            continue;
                        }
                        bindings.push({
                            kind: api_1.SymbolKind.Binding,
                            tsSymbol: tsSymbol,
                            tsType: tsType,
                            target: target,
                            shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
                        });
                    }
                    else {
                        if (!ts.isElementAccessExpression(outputFieldAccess)) {
                            continue;
                        }
                        var tsSymbol = this.getTypeChecker().getSymbolAtLocation(outputFieldAccess.argumentExpression);
                        if (tsSymbol === undefined) {
                            continue;
                        }
                        var target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
                        if (target === null) {
                            continue;
                        }
                        var positionInShimFile = this.getShimPositionForNode(outputFieldAccess);
                        var tsType = this.getTypeChecker().getTypeAtLocation(outputFieldAccess);
                        bindings.push({
                            kind: api_1.SymbolKind.Binding,
                            tsSymbol: tsSymbol,
                            tsType: tsType,
                            target: target,
                            shimLocation: { shimPath: this.shimPath, positionInShimFile: positionInShimFile },
                        });
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (outputFieldAccesses_1_1 && !outputFieldAccesses_1_1.done && (_a = outputFieldAccesses_1.return)) _a.call(outputFieldAccesses_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (bindings.length === 0) {
                return null;
            }
            return { kind: api_1.SymbolKind.Output, bindings: bindings };
        };
        SymbolBuilder.prototype.getSymbolOfInputBinding = function (binding) {
            var e_2, _a;
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(binding);
            if (consumer === null) {
                return null;
            }
            if (consumer instanceof compiler_1.TmplAstElement || consumer instanceof compiler_1.TmplAstTemplate) {
                var host = this.getSymbol(consumer);
                return host !== null ? { kind: api_1.SymbolKind.DomBinding, host: host } : null;
            }
            var nodes = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: binding.sourceSpan, filter: typescript_1.isAssignment });
            var bindings = [];
            try {
                for (var nodes_1 = tslib_1.__values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
                    var node = nodes_1_1.value;
                    if (!ts_util_1.isAccessExpression(node.left)) {
                        continue;
                    }
                    var symbolInfo = this.getSymbolOfTsNode(node.left);
                    if (symbolInfo === null || symbolInfo.tsSymbol === null) {
                        continue;
                    }
                    var target = this.getDirectiveSymbolForAccessExpression(node.left, consumer);
                    if (target === null) {
                        continue;
                    }
                    bindings.push(tslib_1.__assign(tslib_1.__assign({}, symbolInfo), { tsSymbol: symbolInfo.tsSymbol, kind: api_1.SymbolKind.Binding, target: target }));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (bindings.length === 0) {
                return null;
            }
            return { kind: api_1.SymbolKind.Input, bindings: bindings };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFLakMsa0ZBQXVEO0lBQ3ZELHFFQUErUjtJQUUvUixtRkFBc0g7SUFFdEgsaUZBQTZDO0lBRTdDOzs7OztPQUtHO0lBQ0g7UUFHRSx1QkFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO1FBQzNELDhGQUE4RjtRQUM5RiwrQkFBK0I7UUFDZCxjQUFvQztZQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztZQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1lBRzFDLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtZQVRqRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBVTNELENBQUM7UUFLSixpQ0FBUyxHQUFULFVBQVUsSUFBcUI7WUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQzthQUNwQztZQUVELElBQUksTUFBTSxHQUFnQixJQUFJLENBQUM7WUFDL0IsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLElBQUksSUFBSSxZQUFZLCtCQUFvQixFQUFFO2dCQUNqRiw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFB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QUMsUUFBUSxFQUFFLENBQUM7YUFDM0M7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDeEI7UUFDSCxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBaGdCRCxJQWdnQkM7SUFoZ0JZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBU1RXaXRoU291cmNlLCBCaW5kaW5nUGlwZSwgTWV0aG9kQ2FsbCwgUHJvcGVydHlXcml0ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXJ9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNBc3NpZ25tZW50fSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7QmluZGluZ1N5bWJvbCwgRGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBFeHByZXNzaW9uU3ltYm9sLCBJbnB1dEJpbmRpbmdTeW1ib2wsIE91dHB1dEJpbmRpbmdTeW1ib2wsIFBpcGVTeW1ib2wsIFJlZmVyZW5jZVN5bWJvbCwgU2hpbUxvY2F0aW9uLCBTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlU3ltYm9sLCBUc05vZGVTeW1ib2xJbmZvLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVmFyaWFibGVTeW1ib2x9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGZpbmRBbGxNYXRjaGluZ05vZGVzLCBmaW5kRmlyc3RNYXRjaGluZ05vZGUsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7VGVtcGxhdGVEYXRhfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtpc0FjY2Vzc0V4cHJlc3Npb259IGZyb20gJy4vdHNfdXRpbCc7XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCBjYWNoZXMgYFN5bWJvbGBzIGZvciB2YXJpb3VzIHRlbXBsYXRlIHN0cnVjdHVyZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIFRoZSBgU3ltYm9sQnVpbGRlcmAgaW50ZXJuYWxseSBjYWNoZXMgdGhlIGBTeW1ib2xgcyBpdCBjcmVhdGVzLCBhbmQgbXVzdCBiZSBkZXN0cm95ZWQgYW5kXG4gKiByZXBsYWNlZCBpZiB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bWJvbEJ1aWxkZXIge1xuICBwcml2YXRlIHN5bWJvbENhY2hlID0gbmV3IE1hcDxBU1R8VG1wbEFzdE5vZGUsIFN5bWJvbHxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja0Jsb2NrOiB0cy5Ob2RlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgLy8gVGhlIGB0cy5UeXBlQ2hlY2tlcmAgZGVwZW5kcyBvbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFuZCBzbyBtdXN0IGJlIHJlcXVlc3RlZFxuICAgICAgLy8gb24tZGVtYW5kIGluc3RlYWQgb2YgY2FjaGVkLlxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRUeXBlQ2hlY2tlcjogKCkgPT4gdHMuVHlwZUNoZWNrZXIsXG4gICkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBsZXQgc3ltYm9sOiBTeW1ib2x8bnVsbCA9IG51bGw7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnB1dCBhbmQgb3V0cHV0IGJpbmRpbmdzIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBkaXJlY3RpdmUgbWF0Y2ggYnV0IHNob3VsZFxuICAgICAgLy8gcmV0dXJuIGEgbGlzdCBvZiBiaW5kaW5ncyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQm91bmRFdmVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkVsZW1lbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQXN0VGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlJlZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlBpcGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQVNUKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUbXBsQXN0Q29udGVudCwgVG1wbEFzdEljdVxuICAgIH1cblxuICAgIHRoaXMuc3ltYm9sQ2FjaGUuc2V0KG5vZGUsIHN5bWJvbCk7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKTogVGVtcGxhdGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZSh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLlRlbXBsYXRlLCBkaXJlY3RpdmVzLCB0ZW1wbGF0ZU5vZGU6IHRlbXBsYXRlfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZFbGVtZW50KGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KTogRWxlbWVudFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgaWYgKHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBzeW1ib2xGcm9tRGVjbGFyYXRpb24udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCk7XG4gICAgLy8gQWxsIHN0YXRlbWVudHMgaW4gdGhlIFRDQiBhcmUgYEV4cHJlc3Npb25gcyB0aGF0IG9wdGlvbmFsbHkgaW5jbHVkZSBtb3JlIGluZm9ybWF0aW9uLlxuICAgIC8vIEFuIGBFbGVtZW50U3ltYm9sYCB1c2VzIHRoZSBpbmZvcm1hdGlvbiByZXR1cm5lZCBmb3IgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGV4cHJlc3Npb24sXG4gICAgLy8gYWRkcyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGVsZW1lbnQsIGFuZCB1cGRhdGVzIHRoZSBga2luZGAgdG8gYmUgYFN5bWJvbEtpbmQuRWxlbWVudGAuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnN5bWJvbEZyb21EZWNsYXJhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZXMsXG4gICAgICB0ZW1wbGF0ZU5vZGU6IGVsZW1lbnQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiBEaXJlY3RpdmVTeW1ib2xbXSB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG4gICAgY29uc3QgdGNiU291cmNlRmlsZSA9IHRoaXMudHlwZUNoZWNrQmxvY2suZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIGRpcmVjdGl2ZXMgY291bGQgYmUgZWl0aGVyOlxuICAgIC8vIC0gdmFyIF90MTogVGVzdERpciAvKlQ6RCovID0gKG51bGwhKTtcbiAgICAvLyAtIHZhciBfdDEgLypUOkQqLyA9IF9jdG9yMSh7fSk7XG4gICAgY29uc3QgaXNEaXJlY3RpdmVEZWNsYXJhdGlvbiA9IChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5UeXBlTm9kZXx0cy5JZGVudGlmaWVyID0+XG4gICAgICAgICh0cy5pc1R5cGVOb2RlKG5vZGUpIHx8IHRzLmlzSWRlbnRpZmllcihub2RlKSkgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUucGFyZW50KSAmJlxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcih0Y2JTb3VyY2VGaWxlLCBub2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiBpc0RpcmVjdGl2ZURlY2xhcmF0aW9ufSk7XG4gICAgcmV0dXJuIG5vZGVzXG4gICAgICAgIC5tYXAobm9kZSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLnBhcmVudCk7XG4gICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLmdldERpcmVjdGl2ZU1ldGEoZWxlbWVudCwgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YS5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50ID0gbWV0YS5pc0NvbXBvbmVudCA/PyBudWxsO1xuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbDogRGlyZWN0aXZlU3ltYm9sID0ge1xuICAgICAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBtZXRhLnNlbGVjdG9yLFxuICAgICAgICAgICAgaXNDb21wb25lbnQsXG4gICAgICAgICAgICBuZ01vZHVsZSxcbiAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgICAgICAgaXNTdHJ1Y3R1cmFsOiBtZXRhLmlzU3RydWN0dXJhbCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlTWV0YShcbiAgICAgIGhvc3Q6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGhvc3QpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIC8vIE91dHB1dHMgaW4gdGhlIFRDQiBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAgLy8gKiBfb3V0cHV0SGVscGVyKF90MVtcIm91dHB1dEZpZWxkXCJdKS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgLy8gKiBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtcbiAgICAvLyBFdmVuIHdpdGggc3RyaWN0IG51bGwgY2hlY2tzIGRpc2FibGVkLCB3ZSBzdGlsbCBwcm9kdWNlIHRoZSBhY2Nlc3MgYXMgYSBzZXBhcmF0ZSBzdGF0ZW1lbnRcbiAgICAvLyBzbyB0aGF0IGl0IGNhbiBiZSBmb3VuZCBoZXJlLlxuICAgIGNvbnN0IG91dHB1dEZpZWxkQWNjZXNzZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBldmVudEJpbmRpbmcua2V5U3BhbiwgZmlsdGVyOiBpc0FjY2Vzc0V4cHJlc3Npb259KTtcblxuICAgIGNvbnN0IGJpbmRpbmdzOiBCaW5kaW5nU3ltYm9sW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG91dHB1dEZpZWxkQWNjZXNzIG9mIG91dHB1dEZpZWxkQWNjZXNzZXMpIHtcbiAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoZXZlbnRCaW5kaW5nKTtcbiAgICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcykgfHxcbiAgICAgICAgICAgIG91dHB1dEZpZWxkQWNjZXNzLm5hbWUudGV4dCAhPT0gJ2FkZEV2ZW50TGlzdGVuZXInKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhZGRFdmVudExpc3RlbmVyID0gb3V0cHV0RmllbGRBY2Nlc3MubmFtZTtcbiAgICAgICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgdHNUeXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUoYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0U3ltYm9sKGNvbnN1bWVyKTtcblxuICAgICAgICBpZiAodGFyZ2V0ID09PSBudWxsIHx8IHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgICB0c1R5cGUsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcykpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0c1N5bWJvbCA9XG4gICAgICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcy5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgICAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cblxuICAgICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MsIGNvbnN1bWVyKTtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG91dHB1dEZpZWxkQWNjZXNzKTtcbiAgICAgICAgY29uc3QgdHNUeXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzKTtcbiAgICAgICAgYmluZGluZ3MucHVzaCh7XG4gICAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICAgIHRzU3ltYm9sLFxuICAgICAgICAgIHRzVHlwZSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuT3V0cHV0LCBiaW5kaW5nc307XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKGJpbmRpbmc6IFRtcGxBc3RCb3VuZEF0dHJpYnV0ZXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUbXBsQXN0VGV4dEF0dHJpYnV0ZSk6IElucHV0QmluZGluZ1N5bWJvbHxEb21CaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoYmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCBjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMuZ2V0U3ltYm9sKGNvbnN1bWVyKTtcbiAgICAgIHJldHVybiBob3N0ICE9PSBudWxsID8ge2tpbmQ6IFN5bWJvbEtpbmQuRG9tQmluZGluZywgaG9zdH0gOiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGVzID0gZmluZEFsbE1hdGNoaW5nTm9kZXMoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogYmluZGluZy5zb3VyY2VTcGFuLCBmaWx0ZXI6IGlzQXNzaWdubWVudH0pO1xuICAgIGNvbnN0IGJpbmRpbmdzOiBCaW5kaW5nU3ltYm9sW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgIGlmICghaXNBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUubGVmdCk7XG4gICAgICBpZiAoc3ltYm9sSW5mbyA9PT0gbnVsbCB8fCBzeW1ib2xJbmZvLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0LCBjb25zdW1lcik7XG4gICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYmluZGluZ3MucHVzaCh7XG4gICAgICAgIC4uLnN5bWJvbEluZm8sXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2xJbmZvLnRzU3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgIHRhcmdldCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuSW5wdXQsIGJpbmRpbmdzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihcbiAgICAgIG5vZGU6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbixcbiAgICAgIHtpc0NvbXBvbmVudCwgc2VsZWN0b3IsIGlzU3RydWN0dXJhbH06IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhKTogRGlyZWN0aXZlU3ltYm9sfG51bGwge1xuICAgIC8vIEluIGVpdGhlciBjYXNlLCBgX3QxW1wiaW5kZXhcIl1gIG9yIGBfdDEuaW5kZXhgLCBgbm9kZS5leHByZXNzaW9uYCBpcyBfdDEuXG4gICAgLy8gVGhlIHJldHJpZXZlZCBzeW1ib2wgZm9yIF90MSB3aWxsIGJlIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuZXhwcmVzc2lvbik7XG4gICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQgfHwgdHNTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCB8fCBzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW2RlY2xhcmF0aW9uXSA9IHRzU3ltYm9sLmRlY2xhcmF0aW9ucztcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHxcbiAgICAgICAgIWhhc0V4cHJlc3Npb25JZGVudGlmaWVyKFxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaWRlbnRpZmllciBjb3VsZCBiZSBvbiB0aGUgdHlwZSAoZm9yIHJlZ3VsYXIgZGlyZWN0aXZlcykgb3IgdGhlIG5hbWVcbiAgICAgICAgICAgIC8vIChmb3IgZ2VuZXJpYyBkaXJlY3RpdmVzIGFuZCB0aGUgY3RvciBvcCkuXG4gICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCksIGRlY2xhcmF0aW9uLnR5cGUgPz8gZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUoZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsIHx8XG4gICAgICAgIHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5nZXREaXJlY3RpdmVNb2R1bGUoc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICBpc0NvbXBvbmVudCxcbiAgICAgIGlzU3RydWN0dXJhbCxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbmdNb2R1bGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKTogVmFyaWFibGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiB2YXJpYWJsZS5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5pbml0aWFsaXplcik7XG4gICAgaWYgKGV4cHJlc3Npb25TeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0c1R5cGU6IGV4cHJlc3Npb25TeW1ib2wudHNUeXBlLFxuICAgICAgdHNTeW1ib2w6IGV4cHJlc3Npb25TeW1ib2wudHNTeW1ib2wsXG4gICAgICBpbml0aWFsaXplckxvY2F0aW9uOiBleHByZXNzaW9uU3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuVmFyaWFibGUsXG4gICAgICBkZWNsYXJhdGlvbjogdmFyaWFibGUsXG4gICAgICBsb2NhbFZhckxvY2F0aW9uOiB7XG4gICAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLm5hbWUpLFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mUmVmZXJlbmNlKHJlZjogVG1wbEFzdFJlZmVyZW5jZSk6IFJlZmVyZW5jZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQocmVmKTtcbiAgICAvLyBGaW5kIHRoZSBub2RlIGZvciB0aGUgcmVmZXJlbmNlIGRlY2xhcmF0aW9uLCBpLmUuIGB2YXIgX3QyID0gX3QxO2BcbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiByZWYuc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCB0YXJnZXQgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGZvciB0aGUgcmVmZXJlbmNlcyB2YXJpYWJsZSwgd2l0aCB0aGUgZXhjZXB0aW9uIG9mIHRlbXBsYXRlIHJlZnNcbiAgICAvLyB3aGljaCBhcmUgb2YgdGhlIGZvcm0gdmFyIF90MyA9IChfdDIgYXMgYW55IGFzIGkyLlRlbXBsYXRlUmVmPGFueT4pXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogQ29uc2lkZXIgYWRkaW5nIGFuIGBFeHByZXNzaW9uSWRlbnRpZmllcmAgdG8gdGFnIHZhcmlhYmxlIGRlY2xhcmF0aW9uXG4gICAgLy8gaW5pdGlhbGl6ZXJzIGFzIGludmFsaWQgZm9yIHN5bWJvbCByZXRyaWV2YWwuXG4gICAgY29uc3Qgb3JpZ2luYWxEZWNsYXJhdGlvbiA9IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZS5pbml0aWFsaXplcikgJiZcbiAgICAgICAgICAgIHRzLmlzQXNFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIuZXhwcmVzc2lvbikgP1xuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLm5hbWUpIDpcbiAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5pbml0aWFsaXplcik7XG4gICAgaWYgKG9yaWdpbmFsRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUob3JpZ2luYWxEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb24gPSB7XG4gICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUpLFxuICAgIH07XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5SZWZlcmVuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVmLFxuICAgICAgICB0YXJnZXRMb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgICAgcmVmZXJlbmNlVmFyTG9jYXRpb246IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldC5kaXJlY3RpdmUucmVmLm5vZGUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVmLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldC5kaXJlY3RpdmUucmVmLm5vZGUsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mUGlwZShleHByZXNzaW9uOiBCaW5kaW5nUGlwZSk6IFBpcGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBleHByZXNzaW9uLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNDYWxsRXhwcmVzc2lvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8ICF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRob2RBY2Nlc3MgPSBub2RlLmV4cHJlc3Npb247XG4gICAgLy8gRmluZCB0aGUgbm9kZSBmb3IgdGhlIHBpcGUgdmFyaWFibGUgZnJvbSB0aGUgdHJhbnNmb3JtIHByb3BlcnR5IGFjY2Vzcy4gVGhpcyB3aWxsIGJlIG9uZSBvZlxuICAgIC8vIHR3byBmb3JtczogYF9waXBlMS50cmFuc2Zvcm1gIG9yIGAoX3BpcGUxIGFzIGFueSkudHJhbnNmb3JtYC5cbiAgICBjb25zdCBwaXBlVmFyaWFibGVOb2RlID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIHRzLmlzQXNFeHByZXNzaW9uKG1ldGhvZEFjY2Vzcy5leHByZXNzaW9uLmV4cHJlc3Npb24pID9cbiAgICAgICAgbWV0aG9kQWNjZXNzLmV4cHJlc3Npb24uZXhwcmVzc2lvbi5leHByZXNzaW9uIDpcbiAgICAgICAgbWV0aG9kQWNjZXNzLmV4cHJlc3Npb247XG4gICAgY29uc3QgcGlwZURlY2xhcmF0aW9uID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24ocGlwZVZhcmlhYmxlTm9kZSk7XG4gICAgaWYgKHBpcGVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IHBpcGVEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVJbnN0YW5jZSA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUocGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmIChwaXBlSW5zdGFuY2UgPT09IG51bGwgfHwgcGlwZUluc3RhbmNlLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShtZXRob2RBY2Nlc3MpO1xuICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5QaXBlLFxuICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgIGNsYXNzU3ltYm9sOiB7XG4gICAgICAgIC4uLnBpcGVJbnN0YW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHBpcGVJbnN0YW5jZS50c1N5bWJvbCxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24oZXhwcmVzc2lvbjogQVNUKTogVmFyaWFibGVTeW1ib2x8UmVmZXJlbmNlU3ltYm9sXG4gICAgICB8RXhwcmVzc2lvblN5bWJvbHxudWxsIHtcbiAgICBpZiAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIEFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLmFzdDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uVGFyZ2V0ID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChleHByZXNzaW9uKTtcbiAgICBpZiAoZXhwcmVzc2lvblRhcmdldCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sKGV4cHJlc3Npb25UYXJnZXQpO1xuICAgIH1cblxuICAgIC8vIFRoZSBgbmFtZWAgcGFydCBvZiBhIGBQcm9wZXJ0eVdyaXRlYCBhbmQgYE1ldGhvZENhbGxgIGRvZXMgbm90IGhhdmUgaXRzIG93blxuICAgIC8vIEFTVCBzbyB0aGVyZSBpcyBubyB3YXkgdG8gcmV0cmlldmUgYSBgU3ltYm9sYCBmb3IganVzdCB0aGUgYG5hbWVgIHZpYSBhIHNwZWNpZmljIG5vZGUuXG4gICAgY29uc3Qgd2l0aFNwYW4gPSAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUgfHwgZXhwcmVzc2lvbiBpbnN0YW5jZW9mIE1ldGhvZENhbGwpID9cbiAgICAgICAgZXhwcmVzc2lvbi5uYW1lU3BhbiA6XG4gICAgICAgIGV4cHJlc3Npb24uc291cmNlU3BhbjtcblxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW4sIGZpbHRlcjogKG46IHRzLk5vZGUpOiBuIGlzIHRzLk5vZGUgPT4gdHJ1ZX0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB3aGlsZSAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAtIElmIHdlIGhhdmUgc2FmZSBwcm9wZXJ0eSByZWFkIChcImE/LmJcIikgd2Ugd2FudCB0byBnZXQgdGhlIFN5bWJvbCBmb3IgYiwgdGhlIGB3aGVuVHJ1ZWBcbiAgICAvLyBleHByZXNzaW9uLlxuICAgIC8vIC0gSWYgb3VyIGV4cHJlc3Npb24gaXMgYSBwaXBlIGJpbmRpbmcgKFwiYSB8IHRlc3Q6YjpjXCIpLCB3ZSB3YW50IHRoZSBTeW1ib2wgZm9yIHRoZVxuICAgIC8vIGB0cmFuc2Zvcm1gIG9uIHRoZSBwaXBlLlxuICAgIC8vIC0gT3RoZXJ3aXNlLCB3ZSByZXRyaWV2ZSB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBpdHNlbGYgd2l0aCBubyBzcGVjaWFsIGNvbnNpZGVyYXRpb25zXG4gICAgaWYgKChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwpICYmXG4gICAgICAgIHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBjb25zdCB3aGVuVHJ1ZVN5bWJvbCA9XG4gICAgICAgICAgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUud2hlblRydWUpKSA/XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlLmV4cHJlc3Npb24pIDpcbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUpO1xuICAgICAgaWYgKHdoZW5UcnVlU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi53aGVuVHJ1ZVN5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9uLFxuICAgICAgICAvLyBSYXRoZXIgdGhhbiB1c2luZyB0aGUgdHlwZSBvZiBvbmx5IHRoZSBgd2hlblRydWVgIHBhcnQgb2YgdGhlIGV4cHJlc3Npb24sIHdlIHNob3VsZFxuICAgICAgICAvLyBzdGlsbCBnZXQgdGhlIHR5cGUgb2YgdGhlIHdob2xlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdG8gaW5jbHVkZSBgfHVuZGVmaW5lZGAuXG4gICAgICAgIHRzVHlwZTogdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgIHJldHVybiBzeW1ib2xJbmZvID09PSBudWxsID8gbnVsbCA6IHsuLi5zeW1ib2xJbmZvLCBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb259O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUc05vZGUobm9kZTogdHMuTm9kZSk6IFRzTm9kZVN5bWJvbEluZm98bnVsbCB7XG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgbGV0IHRzU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuICAgIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLm5hbWUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUpO1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIElmIHdlIGNvdWxkIG5vdCBmaW5kIGEgc3ltYm9sLCBmYWxsIGJhY2sgdG8gdGhlIHN5bWJvbCBvbiB0aGUgdHlwZSBmb3IgdGhlIG5vZGUuXG4gICAgICAvLyBTb21lIG5vZGVzIHdvbid0IGhhdmUgYSBcInN5bWJvbCBhdCBsb2NhdGlvblwiIGJ1dCB3aWxsIGhhdmUgYSBzeW1ib2wgZm9yIHRoZSB0eXBlLlxuICAgICAgLy8gRXhhbXBsZXMgb2YgdGhpcyB3b3VsZCBiZSBsaXRlcmFscyBhbmQgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpYC5cbiAgICAgIHRzU3ltYm9sOiB0c1N5bWJvbCA/PyB0eXBlLnN5bWJvbCA/PyBudWxsLFxuICAgICAgdHNUeXBlOiB0eXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlOiB0cy5Ob2RlKTogbnVtYmVyIHtcbiAgICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLnR5cGVOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUucmlnaHQuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5uYW1lLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5hcmd1bWVudEV4cHJlc3Npb24uZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5vZGUuZ2V0U3RhcnQoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==