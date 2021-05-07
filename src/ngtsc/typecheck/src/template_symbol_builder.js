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
            var consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
            if (consumer === null) {
                return null;
            }
            // Outputs in the TCB look like one of the two:
            // * _t1["outputField"].subscribe(handler);
            // * _t1.addEventListener(handler);
            // Even with strict null checks disabled, we still produce the access as a separate statement
            // so that it can be found here.
            var expectedAccess;
            if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                expectedAccess = 'addEventListener';
            }
            else {
                var bindingPropertyNames = consumer.outputs.getByBindingPropertyName(eventBinding.name);
                if (bindingPropertyNames === null || bindingPropertyNames.length === 0) {
                    return null;
                }
                // Note that we only get the expectedAccess text from a single consumer of the binding. If
                // there are multiple consumers (not supported in the `boundTarget` API) and one of them has
                // an alias, it will not get matched here.
                expectedAccess = bindingPropertyNames[0].classPropertyName;
            }
            function filter(n) {
                if (!ts_util_1.isAccessExpression(n)) {
                    return false;
                }
                if (ts.isPropertyAccessExpression(n)) {
                    return n.name.getText() === expectedAccess;
                }
                else {
                    return ts.isStringLiteral(n.argumentExpression) &&
                        n.argumentExpression.text === expectedAccess;
                }
            }
            var outputFieldAccesses = comments_1.findAllMatchingNodes(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter: filter });
            var bindings = [];
            try {
                for (var outputFieldAccesses_1 = tslib_1.__values(outputFieldAccesses), outputFieldAccesses_1_1 = outputFieldAccesses_1.next(); !outputFieldAccesses_1_1.done; outputFieldAccesses_1_1 = outputFieldAccesses_1.next()) {
                    var outputFieldAccess = outputFieldAccesses_1_1.value;
                    if (consumer instanceof compiler_1.TmplAstTemplate || consumer instanceof compiler_1.TmplAstElement) {
                        if (!ts.isPropertyAccessExpression(outputFieldAccess)) {
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
            var methodAccess = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.nameSpan, filter: ts.isPropertyAccessExpression });
            if (methodAccess === null) {
                return null;
            }
            var pipeVariableNode = methodAccess.expression;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFLakMsa0ZBQXVEO0lBQ3ZELHFFQUErUjtJQUUvUixtRkFBc0g7SUFFdEgsaUZBQTZDO0lBRTdDOzs7OztPQUtHO0lBQ0g7UUFHRSx1QkFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO1FBQzNELDhGQUE4RjtRQUM5RiwrQkFBK0I7UUFDZCxjQUFvQztZQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztZQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1lBRzFDLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtZQVRqRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBVTNELENBQUM7UUFLSixpQ0FBUyxHQUFULFVBQVUsSUFBcUI7WUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQzthQUNwQztZQUVELElBQUksTUFBTSxHQUFnQixJQUFJLENBQUM7WUFDL0IsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLElBQUksSUFBSSxZQUFZLCtCQUFvQixFQUFFO2dCQUNqRiw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFB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QUM7UUFFTyw4Q0FBc0IsR0FBOUIsVUFBK0IsSUFBYTtZQUMxQyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ25EO2lCQUFNLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQzlCO2lCQUFNLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDN0I7aUJBQU0sSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQzNDO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ3hCO1FBQ0gsQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQXBoQkQsSUFvaEJDO0lBcGhCWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQVNUV2l0aFNvdXJjZSwgQmluZGluZ1BpcGUsIE1ldGhvZENhbGwsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2lzQXNzaWdubWVudH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0JpbmRpbmdTeW1ib2wsIERpcmVjdGl2ZVN5bWJvbCwgRG9tQmluZGluZ1N5bWJvbCwgRWxlbWVudFN5bWJvbCwgRXhwcmVzc2lvblN5bWJvbCwgSW5wdXRCaW5kaW5nU3ltYm9sLCBPdXRwdXRCaW5kaW5nU3ltYm9sLCBQaXBlU3ltYm9sLCBSZWZlcmVuY2VTeW1ib2wsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVN5bWJvbCwgVHNOb2RlU3ltYm9sSW5mbywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFZhcmlhYmxlU3ltYm9sfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0V4cHJlc3Npb25JZGVudGlmaWVyLCBmaW5kQWxsTWF0Y2hpbmdOb2RlcywgZmluZEZpcnN0TWF0Y2hpbmdOb2RlLCBoYXNFeHByZXNzaW9uSWRlbnRpZmllcn0gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge1RlbXBsYXRlRGF0YX0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7aXNBY2Nlc3NFeHByZXNzaW9ufSBmcm9tICcuL3RzX3V0aWwnO1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhbmQgY2FjaGVzIGBTeW1ib2xgcyBmb3IgdmFyaW91cyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVzIGZvciBhIGdpdmVuIGNvbXBvbmVudC5cbiAqXG4gKiBUaGUgYFN5bWJvbEJ1aWxkZXJgIGludGVybmFsbHkgY2FjaGVzIHRoZSBgU3ltYm9sYHMgaXQgY3JlYXRlcywgYW5kIG11c3QgYmUgZGVzdHJveWVkIGFuZFxuICogcmVwbGFjZWQgaWYgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGNoYW5nZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW1ib2xCdWlsZGVyIHtcbiAgcHJpdmF0ZSBzeW1ib2xDYWNoZSA9IG5ldyBNYXA8QVNUfFRtcGxBc3ROb2RlLCBTeW1ib2x8bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tCbG9jazogdHMuTm9kZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVEYXRhOiBUZW1wbGF0ZURhdGEsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNvbXBvbmVudFNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlcixcbiAgICAgIC8vIFRoZSBgdHMuVHlwZUNoZWNrZXJgIGRlcGVuZHMgb24gdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBwcm9ncmFtLCBhbmQgc28gbXVzdCBiZSByZXF1ZXN0ZWRcbiAgICAgIC8vIG9uLWRlbWFuZCBpbnN0ZWFkIG9mIGNhY2hlZC5cbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZ2V0VHlwZUNoZWNrZXI6ICgpID0+IHRzLlR5cGVDaGVja2VyLFxuICApIHt9XG5cbiAgZ2V0U3ltYm9sKG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCk6IFRlbXBsYXRlU3ltYm9sfEVsZW1lbnRTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlKTogUmVmZXJlbmNlU3ltYm9sfFZhcmlhYmxlU3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsIHtcbiAgICBpZiAodGhpcy5zeW1ib2xDYWNoZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN5bWJvbENhY2hlLmdldChub2RlKSE7XG4gICAgfVxuXG4gICAgbGV0IHN5bWJvbDogU3ltYm9sfG51bGwgPSBudWxsO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogaW5wdXQgYW5kIG91dHB1dCBiaW5kaW5ncyBvbmx5IHJldHVybiB0aGUgZmlyc3QgZGlyZWN0aXZlIG1hdGNoIGJ1dCBzaG91bGRcbiAgICAgIC8vIHJldHVybiBhIGxpc3Qgb2YgYmluZGluZ3MgZm9yIGFsbCBvZiB0aGVtLlxuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZklucHV0QmluZGluZyhub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkJvdW5kRXZlbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZFbGVtZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkFzdFRlbXBsYXRlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RSZWZlcmVuY2UpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZSZWZlcmVuY2Uobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZQaXBlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIEFTVCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVG1wbEFzdENvbnRlbnQsIFRtcGxBc3RJY3VcbiAgICB9XG5cbiAgICB0aGlzLnN5bWJvbENhY2hlLnNldChub2RlLCBzeW1ib2wpO1xuICAgIHJldHVybiBzeW1ib2w7XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mQXN0VGVtcGxhdGUodGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSk6IFRlbXBsYXRlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUodGVtcGxhdGUpO1xuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5UZW1wbGF0ZSwgZGlyZWN0aXZlcywgdGVtcGxhdGVOb2RlOiB0ZW1wbGF0ZX07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mRWxlbWVudChlbGVtZW50OiBUbXBsQXN0RWxlbWVudCk6IEVsZW1lbnRTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG5cbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xGcm9tRGVjbGFyYXRpb24gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUpO1xuICAgIGlmIChzeW1ib2xGcm9tRGVjbGFyYXRpb24gPT09IG51bGwgfHwgc3ltYm9sRnJvbURlY2xhcmF0aW9uLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQpO1xuICAgIC8vIEFsbCBzdGF0ZW1lbnRzIGluIHRoZSBUQ0IgYXJlIGBFeHByZXNzaW9uYHMgdGhhdCBvcHRpb25hbGx5IGluY2x1ZGUgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAvLyBBbiBgRWxlbWVudFN5bWJvbGAgdXNlcyB0aGUgaW5mb3JtYXRpb24gcmV0dXJuZWQgZm9yIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBleHByZXNzaW9uLFxuICAgIC8vIGFkZHMgdGhlIGRpcmVjdGl2ZXMgZm9yIHRoZSBlbGVtZW50LCBhbmQgdXBkYXRlcyB0aGUgYGtpbmRgIHRvIGJlIGBTeW1ib2xLaW5kLkVsZW1lbnRgLlxuICAgIHJldHVybiB7XG4gICAgICAuLi5zeW1ib2xGcm9tRGVjbGFyYXRpb24sXG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgICAgdGVtcGxhdGVOb2RlOiBlbGVtZW50LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogRGlyZWN0aXZlU3ltYm9sW10ge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuICAgIGNvbnN0IHRjYlNvdXJjZUZpbGUgPSB0aGlzLnR5cGVDaGVja0Jsb2NrLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBkaXJlY3RpdmVzIGNvdWxkIGJlIGVpdGhlcjpcbiAgICAvLyAtIHZhciBfdDE6IFRlc3REaXIgLypUOkQqLyA9IChudWxsISk7XG4gICAgLy8gLSB2YXIgX3QxIC8qVDpEKi8gPSBfY3RvcjEoe30pO1xuICAgIGNvbnN0IGlzRGlyZWN0aXZlRGVjbGFyYXRpb24gPSAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuVHlwZU5vZGV8dHMuSWRlbnRpZmllciA9PlxuICAgICAgICAodHMuaXNUeXBlTm9kZShub2RlKSB8fCB0cy5pc0lkZW50aWZpZXIobm9kZSkpICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgJiZcbiAgICAgICAgaGFzRXhwcmVzc2lvbklkZW50aWZpZXIodGNiU291cmNlRmlsZSwgbm9kZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKTtcblxuICAgIGNvbnN0IG5vZGVzID0gZmluZEFsbE1hdGNoaW5nTm9kZXMoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogaXNEaXJlY3RpdmVEZWNsYXJhdGlvbn0pO1xuICAgIHJldHVybiBub2Rlc1xuICAgICAgICAubWFwKG5vZGUgPT4ge1xuICAgICAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5wYXJlbnQpO1xuICAgICAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgICAgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBtZXRhID0gdGhpcy5nZXREaXJlY3RpdmVNZXRhKGVsZW1lbnQsIHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKG1ldGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudCA9IG1ldGEuaXNDb21wb25lbnQgPz8gbnVsbDtcbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVTeW1ib2w6IERpcmVjdGl2ZVN5bWJvbCA9IHtcbiAgICAgICAgICAgIC4uLnN5bWJvbCxcbiAgICAgICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgICAgICBzZWxlY3RvcjogbWV0YS5zZWxlY3RvcixcbiAgICAgICAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgICAgICAgbmdNb2R1bGUsXG4gICAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgICAgICAgIGlzU3RydWN0dXJhbDogbWV0YS5pc1N0cnVjdHVyYWwsXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlU3ltYm9sO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKChkKTogZCBpcyBEaXJlY3RpdmVTeW1ib2wgPT4gZCAhPT0gbnVsbCk7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1ldGEoXG4gICAgICBob3N0OiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShob3N0KTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpcmVjdGl2ZXMuZmluZChtID0+IG0ucmVmLm5vZGUgPT09IGRpcmVjdGl2ZURlY2xhcmF0aW9uKSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVNb2R1bGUoZGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBDbGFzc0RlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChkZWNsYXJhdGlvbiBhcyBDbGFzc0RlY2xhcmF0aW9uKTtcbiAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc2NvcGUubmdNb2R1bGU7XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mQm91bmRFdmVudChldmVudEJpbmRpbmc6IFRtcGxBc3RCb3VuZEV2ZW50KTogT3V0cHV0QmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGV2ZW50QmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzIGluIHRoZSBUQ0IgbG9vayBsaWtlIG9uZSBvZiB0aGUgdHdvOlxuICAgIC8vICogX3QxW1wib3V0cHV0RmllbGRcIl0uc3Vic2NyaWJlKGhhbmRsZXIpO1xuICAgIC8vICogX3QxLmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlcik7XG4gICAgLy8gRXZlbiB3aXRoIHN0cmljdCBudWxsIGNoZWNrcyBkaXNhYmxlZCwgd2Ugc3RpbGwgcHJvZHVjZSB0aGUgYWNjZXNzIGFzIGEgc2VwYXJhdGUgc3RhdGVtZW50XG4gICAgLy8gc28gdGhhdCBpdCBjYW4gYmUgZm91bmQgaGVyZS5cbiAgICBsZXQgZXhwZWN0ZWRBY2Nlc3M6IHN0cmluZztcbiAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgZXhwZWN0ZWRBY2Nlc3MgPSAnYWRkRXZlbnRMaXN0ZW5lcic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJpbmRpbmdQcm9wZXJ0eU5hbWVzID0gY29uc3VtZXIub3V0cHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUoZXZlbnRCaW5kaW5nLm5hbWUpO1xuICAgICAgaWYgKGJpbmRpbmdQcm9wZXJ0eU5hbWVzID09PSBudWxsIHx8IGJpbmRpbmdQcm9wZXJ0eU5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIE5vdGUgdGhhdCB3ZSBvbmx5IGdldCB0aGUgZXhwZWN0ZWRBY2Nlc3MgdGV4dCBmcm9tIGEgc2luZ2xlIGNvbnN1bWVyIG9mIHRoZSBiaW5kaW5nLiBJZlxuICAgICAgLy8gdGhlcmUgYXJlIG11bHRpcGxlIGNvbnN1bWVycyAobm90IHN1cHBvcnRlZCBpbiB0aGUgYGJvdW5kVGFyZ2V0YCBBUEkpIGFuZCBvbmUgb2YgdGhlbSBoYXNcbiAgICAgIC8vIGFuIGFsaWFzLCBpdCB3aWxsIG5vdCBnZXQgbWF0Y2hlZCBoZXJlLlxuICAgICAgZXhwZWN0ZWRBY2Nlc3MgPSBiaW5kaW5nUHJvcGVydHlOYW1lc1swXS5jbGFzc1Byb3BlcnR5TmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXIobjogdHMuTm9kZSk6IG4gaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICAgIGlmICghaXNBY2Nlc3NFeHByZXNzaW9uKG4pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG4pKSB7XG4gICAgICAgIHJldHVybiBuLm5hbWUuZ2V0VGV4dCgpID09PSBleHBlY3RlZEFjY2VzcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cy5pc1N0cmluZ0xpdGVyYWwobi5hcmd1bWVudEV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICBuLmFyZ3VtZW50RXhwcmVzc2lvbi50ZXh0ID09PSBleHBlY3RlZEFjY2VzcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3NlcyA9XG4gICAgICAgIGZpbmRBbGxNYXRjaGluZ05vZGVzKHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZXZlbnRCaW5kaW5nLmtleVNwYW4sIGZpbHRlcn0pO1xuXG4gICAgY29uc3QgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3Mgb2Ygb3V0cHV0RmllbGRBY2Nlc3Nlcykge1xuICAgICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcykpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFkZEV2ZW50TGlzdGVuZXIgPSBvdXRwdXRGaWVsZEFjY2Vzcy5uYW1lO1xuICAgICAgICBjb25zdCB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCB0c1R5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24oYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuXG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwgfHwgdHNTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYmluZGluZ3MucHVzaCh7XG4gICAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICAgIHRzU3ltYm9sLFxuICAgICAgICAgIHRzVHlwZSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRzU3ltYm9sID1cbiAgICAgICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcywgY29uc3VtZXIpO1xuICAgICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUob3V0cHV0RmllbGRBY2Nlc3MpO1xuICAgICAgICBjb25zdCB0c1R5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24ob3V0cHV0RmllbGRBY2Nlc3MpO1xuICAgICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5PdXRwdXQsIGJpbmRpbmdzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcoYmluZGluZzogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRtcGxBc3RUZXh0QXR0cmlidXRlKTogSW5wdXRCaW5kaW5nU3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRDb25zdW1lck9mQmluZGluZyhiaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuICAgICAgcmV0dXJuIGhvc3QgIT09IG51bGwgPyB7a2luZDogU3ltYm9sS2luZC5Eb21CaW5kaW5nLCBob3N0fSA6IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBiaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogaXNBc3NpZ25tZW50fSk7XG4gICAgY29uc3QgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCFpc0FjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5sZWZ0KTtcbiAgICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsIHx8IHN5bWJvbEluZm8udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnN1bWVyKTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbEluZm8udHNTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChiaW5kaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5JbnB1dCwgYmluZGluZ3N9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKFxuICAgICAgbm9kZTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb258dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLFxuICAgICAge2lzQ29tcG9uZW50LCBzZWxlY3RvciwgaXNTdHJ1Y3R1cmFsfTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiBEaXJlY3RpdmVTeW1ib2x8bnVsbCB7XG4gICAgLy8gSW4gZWl0aGVyIGNhc2UsIGBfdDFbXCJpbmRleFwiXWAgb3IgYF90MS5pbmRleGAsIGBub2RlLmV4cHJlc3Npb25gIGlzIF90MS5cbiAgICAvLyBUaGUgcmV0cmlldmVkIHN5bWJvbCBmb3IgX3QxIHdpbGwgYmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5leHByZXNzaW9uKTtcbiAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCB8fCB0c1N5bWJvbC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAwIHx8IHNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBbZGVjbGFyYXRpb25dID0gdHNTeW1ib2wuZGVjbGFyYXRpb25zO1xuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSB8fFxuICAgICAgICAhaGFzRXhwcmVzc2lvbklkZW50aWZpZXIoXG4gICAgICAgICAgICAvLyBUaGUgZXhwcmVzc2lvbiBpZGVudGlmaWVyIGNvdWxkIGJlIG9uIHRoZSB0eXBlIChmb3IgcmVndWxhciBkaXJlY3RpdmVzKSBvciB0aGUgbmFtZVxuICAgICAgICAgICAgLy8gKGZvciBnZW5lcmljIGRpcmVjdGl2ZXMgYW5kIHRoZSBjdG9yIG9wKS5cbiAgICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSwgZGVjbGFyYXRpb24udHlwZSA/PyBkZWNsYXJhdGlvbi5uYW1lLFxuICAgICAgICAgICAgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgaXNTdHJ1Y3R1cmFsLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBuZ01vZHVsZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlZhcmlhYmxlKHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpOiBWYXJpYWJsZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHZhcmlhYmxlLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAoZXhwcmVzc2lvblN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRzVHlwZTogZXhwcmVzc2lvblN5bWJvbC50c1R5cGUsXG4gICAgICB0c1N5bWJvbDogZXhwcmVzc2lvblN5bWJvbC50c1N5bWJvbCxcbiAgICAgIGluaXRpYWxpemVyTG9jYXRpb246IGV4cHJlc3Npb25TeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSxcbiAgICAgIGRlY2xhcmF0aW9uOiB2YXJpYWJsZSxcbiAgICAgIGxvY2FsVmFyTG9jYXRpb246IHtcbiAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUubmFtZSksXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gZm9yIHRoZSByZWZlcmVuY2VzIHZhcmlhYmxlLCB3aXRoIHRoZSBleGNlcHRpb24gb2YgdGVtcGxhdGUgcmVmc1xuICAgIC8vIHdoaWNoIGFyZSBvZiB0aGUgZm9ybSB2YXIgX3QzID0gKF90MiBhcyBhbnkgYXMgaTIuVGVtcGxhdGVSZWY8YW55PilcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBDb25zaWRlciBhZGRpbmcgYW4gYEV4cHJlc3Npb25JZGVudGlmaWVyYCB0byB0YWcgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICAvLyBpbml0aWFsaXplcnMgYXMgaW52YWxpZCBmb3Igc3ltYm9sIHJldHJpZXZhbC5cbiAgICBjb25zdCBvcmlnaW5hbERlY2xhcmF0aW9uID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgICAgdHMuaXNBc0V4cHJlc3Npb24obm9kZS5pbml0aWFsaXplci5leHByZXNzaW9uKSA/XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSkgOlxuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAob3JpZ2luYWxEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCByZWZlcmVuY2VWYXJTaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbiA9IHtcbiAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSksXG4gICAgfTtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24odGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSxcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZQaXBlKGV4cHJlc3Npb246IEJpbmRpbmdQaXBlKTogUGlwZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBtZXRob2RBY2Nlc3MgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssXG4gICAgICAgIHt3aXRoU3BhbjogZXhwcmVzc2lvbi5uYW1lU3BhbiwgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0pO1xuICAgIGlmIChtZXRob2RBY2Nlc3MgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVWYXJpYWJsZU5vZGUgPSBtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgICBjb25zdCBwaXBlRGVjbGFyYXRpb24gPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihwaXBlVmFyaWFibGVOb2RlKTtcbiAgICBpZiAocGlwZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgcGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZUluc3RhbmNlID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShwaXBlRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKHBpcGVJbnN0YW5jZSA9PT0gbnVsbCB8fCBwaXBlSW5zdGFuY2UudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG1ldGhvZEFjY2Vzcyk7XG4gICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLlBpcGUsXG4gICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgY2xhc3NTeW1ib2w6IHtcbiAgICAgICAgLi4ucGlwZUluc3RhbmNlLFxuICAgICAgICB0c1N5bWJvbDogcGlwZUluc3RhbmNlLnRzU3ltYm9sLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihleHByZXNzaW9uOiBBU1QpOiBWYXJpYWJsZVN5bWJvbHxSZWZlcmVuY2VTeW1ib2xcbiAgICAgIHxFeHByZXNzaW9uU3ltYm9sfG51bGwge1xuICAgIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSkge1xuICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uYXN0O1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHJlc3Npb25UYXJnZXQgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRFeHByZXNzaW9uVGFyZ2V0KGV4cHJlc3Npb24pO1xuICAgIGlmIChleHByZXNzaW9uVGFyZ2V0ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2woZXhwcmVzc2lvblRhcmdldCk7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBuYW1lYCBwYXJ0IG9mIGEgYFByb3BlcnR5V3JpdGVgIGFuZCBgTWV0aG9kQ2FsbGAgZG9lcyBub3QgaGF2ZSBpdHMgb3duXG4gICAgLy8gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWMgbm9kZS5cbiAgICBjb25zdCB3aXRoU3BhbiA9IChleHByZXNzaW9uIGluc3RhbmNlb2YgUHJvcGVydHlXcml0ZSB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgTWV0aG9kQ2FsbCkgP1xuICAgICAgICBleHByZXNzaW9uLm5hbWVTcGFuIDpcbiAgICAgICAgZXhwcmVzc2lvbi5zb3VyY2VTcGFuO1xuXG4gICAgbGV0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbiwgZmlsdGVyOiAobjogdHMuTm9kZSk6IG4gaXMgdHMuTm9kZSA9PiB0cnVlfSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIC0gSWYgd2UgaGF2ZSBzYWZlIHByb3BlcnR5IHJlYWQgKFwiYT8uYlwiKSB3ZSB3YW50IHRvIGdldCB0aGUgU3ltYm9sIGZvciBiLCB0aGUgYHdoZW5UcnVlYFxuICAgIC8vIGV4cHJlc3Npb24uXG4gICAgLy8gLSBJZiBvdXIgZXhwcmVzc2lvbiBpcyBhIHBpcGUgYmluZGluZyAoXCJhIHwgdGVzdDpiOmNcIiksIHdlIHdhbnQgdGhlIFN5bWJvbCBmb3IgdGhlXG4gICAgLy8gYHRyYW5zZm9ybWAgb24gdGhlIHBpcGUuXG4gICAgLy8gLSBPdGhlcndpc2UsIHdlIHJldHJpZXZlIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIGl0c2VsZiB3aXRoIG5vIHNwZWNpYWwgY29uc2lkZXJhdGlvbnNcbiAgICBpZiAoKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlUHJvcGVydHlSZWFkIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCkgJiZcbiAgICAgICAgdHMuaXNDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIGNvbnN0IHdoZW5UcnVlU3ltYm9sID1cbiAgICAgICAgICAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZS53aGVuVHJ1ZSkpID9cbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUuZXhwcmVzc2lvbikgOlxuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZSk7XG4gICAgICBpZiAod2hlblRydWVTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLndoZW5UcnVlU3ltYm9sLFxuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb24sXG4gICAgICAgIC8vIFJhdGhlciB0aGFuIHVzaW5nIHRoZSB0eXBlIG9mIG9ubHkgdGhlIGB3aGVuVHJ1ZWAgcGFydCBvZiB0aGUgZXhwcmVzc2lvbiwgd2Ugc2hvdWxkXG4gICAgICAgIC8vIHN0aWxsIGdldCB0aGUgdHlwZSBvZiB0aGUgd2hvbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiB0byBpbmNsdWRlIGB8dW5kZWZpbmVkYC5cbiAgICAgICAgdHNUeXBlOiB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN5bWJvbEluZm8gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUpO1xuICAgICAgcmV0dXJuIHN5bWJvbEluZm8gPT09IG51bGwgPyBudWxsIDogey4uLnN5bWJvbEluZm8sIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbn07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlRzTm9kZShub2RlOiB0cy5Ob2RlKTogVHNOb2RlU3ltYm9sSW5mb3xudWxsIHtcbiAgICB3aGlsZSAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICBsZXQgdHNTeW1ib2w6IHRzLlN5bWJvbHx1bmRlZmluZWQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSk7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihub2RlKTtcbiAgICByZXR1cm4ge1xuICAgICAgLy8gSWYgd2UgY291bGQgbm90IGZpbmQgYSBzeW1ib2wsIGZhbGwgYmFjayB0byB0aGUgc3ltYm9sIG9uIHRoZSB0eXBlIGZvciB0aGUgbm9kZS5cbiAgICAgIC8vIFNvbWUgbm9kZXMgd29uJ3QgaGF2ZSBhIFwic3ltYm9sIGF0IGxvY2F0aW9uXCIgYnV0IHdpbGwgaGF2ZSBhIHN5bWJvbCBmb3IgdGhlIHR5cGUuXG4gICAgICAvLyBFeGFtcGxlcyBvZiB0aGlzIHdvdWxkIGJlIGxpdGVyYWxzIGFuZCBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylgLlxuICAgICAgdHNTeW1ib2w6IHRzU3ltYm9sID8/IHR5cGUuc3ltYm9sID8/IG51bGwsXG4gICAgICB0c1R5cGU6IHR5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGU6IHRzLk5vZGUpOiBudW1iZXIge1xuICAgIGlmICh0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUudHlwZU5hbWUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNRdWFsaWZpZWROYW1lKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5yaWdodC5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLm5hbWUuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLmFyZ3VtZW50RXhwcmVzc2lvbi5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbm9kZS5nZXRTdGFydCgpO1xuICAgIH1cbiAgfVxufVxuIl19