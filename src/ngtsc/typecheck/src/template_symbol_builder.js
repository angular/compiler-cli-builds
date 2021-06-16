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
                if (symbol === null || !typescript_1.isSymbolWithValueDeclaration(symbol.tsSymbol) ||
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
            if ((tsSymbol === null || tsSymbol === void 0 ? void 0 : tsSymbol.declarations) === undefined || tsSymbol.declarations.length === 0 ||
                selector === null) {
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
            if (symbol === null || !typescript_1.isSymbolWithValueDeclaration(symbol.tsSymbol) ||
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
            // The instance should never be null, nor should the symbol lack a value declaration. This
            // is because the node used to look for the `pipeInstance` symbol info is a value
            // declaration of another symbol (i.e. the `pipeDeclaration` symbol).
            if (pipeInstance === null || !typescript_1.isSymbolWithValueDeclaration(pipeInstance.tsSymbol)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUjtJQUNoUiwrQkFBaUM7SUFLakMsa0ZBQXFGO0lBQ3JGLHFFQUErUjtJQUUvUixtRkFBc0g7SUFFdEgsaUZBQTZDO0lBRTdDOzs7OztPQUtHO0lBQ0g7UUFHRSx1QkFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO1FBQzNELDhGQUE4RjtRQUM5RiwrQkFBK0I7UUFDZCxjQUFvQztZQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztZQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1lBRzFDLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtZQVRqRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBVTNELENBQUM7UUFLSixpQ0FBUyxHQUFULFVBQVUsSUFBcUI7WUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQzthQUNwQztZQUVELElBQUksTUFBTSxHQUFnQixJQUFJLENBQUM7WUFDL0IsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLElBQUksSUFBSSxZQUFZLCtCQUFvQixFQUFFO2dCQUNqRiw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFB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QSxFQUFDO2FBQzVELENBQUM7UUFDSixDQUFDO1FBRU8sOENBQXNCLEdBQTlCLFVBQStCLElBQWE7WUFDMUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNuRDtpQkFBTSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUM5QjtpQkFBTSxJQUFJLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQzdCO2lCQUFNLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM3QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUMzQztpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN4QjtRQUNILENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUF0aEJELElBc2hCQztJQXRoQlksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEJpbmRpbmdQaXBlLCBNZXRob2RDYWxsLCBQcm9wZXJ0eVdyaXRlLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtpc0Fzc2lnbm1lbnQsIGlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtCaW5kaW5nU3ltYm9sLCBEaXJlY3RpdmVTeW1ib2wsIERvbUJpbmRpbmdTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIEV4cHJlc3Npb25TeW1ib2wsIElucHV0QmluZGluZ1N5bWJvbCwgT3V0cHV0QmluZGluZ1N5bWJvbCwgUGlwZVN5bWJvbCwgUmVmZXJlbmNlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2wsIFRzTm9kZVN5bWJvbEluZm8sIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBWYXJpYWJsZVN5bWJvbH0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtFeHByZXNzaW9uSWRlbnRpZmllciwgZmluZEFsbE1hdGNoaW5nTm9kZXMsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZSwgaGFzRXhwcmVzc2lvbklkZW50aWZpZXJ9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHtUZW1wbGF0ZURhdGF9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge2lzQWNjZXNzRXhwcmVzc2lvbn0gZnJvbSAnLi90c191dGlsJztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW5kIGNhY2hlcyBgU3ltYm9sYHMgZm9yIHZhcmlvdXMgdGVtcGxhdGUgc3RydWN0dXJlcyBmb3IgYSBnaXZlbiBjb21wb25lbnQuXG4gKlxuICogVGhlIGBTeW1ib2xCdWlsZGVyYCBpbnRlcm5hbGx5IGNhY2hlcyB0aGUgYFN5bWJvbGBzIGl0IGNyZWF0ZXMsIGFuZCBtdXN0IGJlIGRlc3Ryb3llZCBhbmRcbiAqIHJlcGxhY2VkIGlmIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBjaGFuZ2VzLlxuICovXG5leHBvcnQgY2xhc3MgU3ltYm9sQnVpbGRlciB7XG4gIHByaXZhdGUgc3ltYm9sQ2FjaGUgPSBuZXcgTWFwPEFTVHxUbXBsQXN0Tm9kZSwgU3ltYm9sfG51bGw+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrQmxvY2s6IHRzLk5vZGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlRGF0YTogVGVtcGxhdGVEYXRhLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnRTY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICAvLyBUaGUgYHRzLlR5cGVDaGVja2VyYCBkZXBlbmRzIG9uIHRoZSBjdXJyZW50IHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSwgYW5kIHNvIG11c3QgYmUgcmVxdWVzdGVkXG4gICAgICAvLyBvbi1kZW1hbmQgaW5zdGVhZCBvZiBjYWNoZWQuXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldFR5cGVDaGVja2VyOiAoKSA9PiB0cy5UeXBlQ2hlY2tlcixcbiAgKSB7fVxuXG4gIGdldFN5bWJvbChub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQpOiBUZW1wbGF0ZVN5bWJvbHxFbGVtZW50U3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBUbXBsQXN0UmVmZXJlbmNlfFRtcGxBc3RWYXJpYWJsZSk6IFJlZmVyZW5jZVN5bWJvbHxWYXJpYWJsZVN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBTeW1ib2x8bnVsbCB7XG4gICAgaWYgKHRoaXMuc3ltYm9sQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zeW1ib2xDYWNoZS5nZXQobm9kZSkhO1xuICAgIH1cblxuICAgIGxldCBzeW1ib2w6IFN5bWJvbHxudWxsID0gbnVsbDtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fCBub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IGlucHV0IGFuZCBvdXRwdXQgYmluZGluZ3Mgb25seSByZXR1cm4gdGhlIGZpcnN0IGRpcmVjdGl2ZSBtYXRjaCBidXQgc2hvdWxkXG4gICAgICAvLyByZXR1cm4gYSBsaXN0IG9mIGJpbmRpbmdzIGZvciBhbGwgb2YgdGhlbS5cbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mRWxlbWVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZWYXJpYWJsZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mUmVmZXJlbmNlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mUGlwZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBBU1QpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRtcGxBc3RDb250ZW50LCBUbXBsQXN0SWN1XG4gICAgfVxuXG4gICAgdGhpcy5zeW1ib2xDYWNoZS5zZXQobm9kZSwgc3ltYm9sKTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkFzdFRlbXBsYXRlKHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpOiBUZW1wbGF0ZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKHRlbXBsYXRlKTtcbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuVGVtcGxhdGUsIGRpcmVjdGl2ZXMsIHRlbXBsYXRlTm9kZTogdGVtcGxhdGV9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpOiBFbGVtZW50U3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sRnJvbURlY2xhcmF0aW9uID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICBpZiAoc3ltYm9sRnJvbURlY2xhcmF0aW9uID09PSBudWxsIHx8IHN5bWJvbEZyb21EZWNsYXJhdGlvbi50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50KTtcbiAgICAvLyBBbGwgc3RhdGVtZW50cyBpbiB0aGUgVENCIGFyZSBgRXhwcmVzc2lvbmBzIHRoYXQgb3B0aW9uYWxseSBpbmNsdWRlIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgLy8gQW4gYEVsZW1lbnRTeW1ib2xgIHVzZXMgdGhlIGluZm9ybWF0aW9uIHJldHVybmVkIGZvciB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZXhwcmVzc2lvbixcbiAgICAvLyBhZGRzIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgZWxlbWVudCwgYW5kIHVwZGF0ZXMgdGhlIGBraW5kYCB0byBiZSBgU3ltYm9sS2luZC5FbGVtZW50YC5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uc3ltYm9sRnJvbURlY2xhcmF0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5FbGVtZW50LFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICAgIHRlbXBsYXRlTm9kZTogZWxlbWVudCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IERpcmVjdGl2ZVN5bWJvbFtdIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcbiAgICBjb25zdCB0Y2JTb3VyY2VGaWxlID0gdGhpcy50eXBlQ2hlY2tCbG9jay5nZXRTb3VyY2VGaWxlKCk7XG4gICAgLy8gZGlyZWN0aXZlcyBjb3VsZCBiZSBlaXRoZXI6XG4gICAgLy8gLSB2YXIgX3QxOiBUZXN0RGlyIC8qVDpEKi8gPSAobnVsbCEpO1xuICAgIC8vIC0gdmFyIF90MSAvKlQ6RCovID0gX2N0b3IxKHt9KTtcbiAgICBjb25zdCBpc0RpcmVjdGl2ZURlY2xhcmF0aW9uID0gKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlR5cGVOb2RlfHRzLklkZW50aWZpZXIgPT5cbiAgICAgICAgKHRzLmlzVHlwZU5vZGUobm9kZSkgfHwgdHMuaXNJZGVudGlmaWVyKG5vZGUpKSAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpICYmXG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHRjYlNvdXJjZUZpbGUsIG5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IGlzRGlyZWN0aXZlRGVjbGFyYXRpb259KTtcbiAgICByZXR1cm4gbm9kZXNcbiAgICAgICAgLm1hcChub2RlID0+IHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUucGFyZW50KTtcbiAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8ICFpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbCkgfHxcbiAgICAgICAgICAgICAgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBtZXRhID0gdGhpcy5nZXREaXJlY3RpdmVNZXRhKGVsZW1lbnQsIHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKG1ldGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudCA9IG1ldGEuaXNDb21wb25lbnQgPz8gbnVsbDtcbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVTeW1ib2w6IERpcmVjdGl2ZVN5bWJvbCA9IHtcbiAgICAgICAgICAgIC4uLnN5bWJvbCxcbiAgICAgICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgICAgICBzZWxlY3RvcjogbWV0YS5zZWxlY3RvcixcbiAgICAgICAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgICAgICAgbmdNb2R1bGUsXG4gICAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgICAgICAgIGlzU3RydWN0dXJhbDogbWV0YS5pc1N0cnVjdHVyYWwsXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlU3ltYm9sO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKChkKTogZCBpcyBEaXJlY3RpdmVTeW1ib2wgPT4gZCAhPT0gbnVsbCk7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1ldGEoXG4gICAgICBob3N0OiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShob3N0KTtcbiAgICBpZiAoZGlyZWN0aXZlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpcmVjdGl2ZXMuZmluZChtID0+IG0ucmVmLm5vZGUgPT09IGRpcmVjdGl2ZURlY2xhcmF0aW9uKSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVNb2R1bGUoZGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBDbGFzc0RlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChkZWNsYXJhdGlvbiBhcyBDbGFzc0RlY2xhcmF0aW9uKTtcbiAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc2NvcGUubmdNb2R1bGU7XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mQm91bmRFdmVudChldmVudEJpbmRpbmc6IFRtcGxBc3RCb3VuZEV2ZW50KTogT3V0cHV0QmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGV2ZW50QmluZGluZyk7XG4gICAgaWYgKGNvbnN1bWVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBPdXRwdXRzIGluIHRoZSBUQ0IgbG9vayBsaWtlIG9uZSBvZiB0aGUgdHdvOlxuICAgIC8vICogX3QxW1wib3V0cHV0RmllbGRcIl0uc3Vic2NyaWJlKGhhbmRsZXIpO1xuICAgIC8vICogX3QxLmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlcik7XG4gICAgLy8gRXZlbiB3aXRoIHN0cmljdCBudWxsIGNoZWNrcyBkaXNhYmxlZCwgd2Ugc3RpbGwgcHJvZHVjZSB0aGUgYWNjZXNzIGFzIGEgc2VwYXJhdGUgc3RhdGVtZW50XG4gICAgLy8gc28gdGhhdCBpdCBjYW4gYmUgZm91bmQgaGVyZS5cbiAgICBsZXQgZXhwZWN0ZWRBY2Nlc3M6IHN0cmluZztcbiAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgZXhwZWN0ZWRBY2Nlc3MgPSAnYWRkRXZlbnRMaXN0ZW5lcic7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJpbmRpbmdQcm9wZXJ0eU5hbWVzID0gY29uc3VtZXIub3V0cHV0cy5nZXRCeUJpbmRpbmdQcm9wZXJ0eU5hbWUoZXZlbnRCaW5kaW5nLm5hbWUpO1xuICAgICAgaWYgKGJpbmRpbmdQcm9wZXJ0eU5hbWVzID09PSBudWxsIHx8IGJpbmRpbmdQcm9wZXJ0eU5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIE5vdGUgdGhhdCB3ZSBvbmx5IGdldCB0aGUgZXhwZWN0ZWRBY2Nlc3MgdGV4dCBmcm9tIGEgc2luZ2xlIGNvbnN1bWVyIG9mIHRoZSBiaW5kaW5nLiBJZlxuICAgICAgLy8gdGhlcmUgYXJlIG11bHRpcGxlIGNvbnN1bWVycyAobm90IHN1cHBvcnRlZCBpbiB0aGUgYGJvdW5kVGFyZ2V0YCBBUEkpIGFuZCBvbmUgb2YgdGhlbSBoYXNcbiAgICAgIC8vIGFuIGFsaWFzLCBpdCB3aWxsIG5vdCBnZXQgbWF0Y2hlZCBoZXJlLlxuICAgICAgZXhwZWN0ZWRBY2Nlc3MgPSBiaW5kaW5nUHJvcGVydHlOYW1lc1swXS5jbGFzc1Byb3BlcnR5TmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXIobjogdHMuTm9kZSk6IG4gaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9uIHtcbiAgICAgIGlmICghaXNBY2Nlc3NFeHByZXNzaW9uKG4pKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG4pKSB7XG4gICAgICAgIHJldHVybiBuLm5hbWUuZ2V0VGV4dCgpID09PSBleHBlY3RlZEFjY2VzcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cy5pc1N0cmluZ0xpdGVyYWwobi5hcmd1bWVudEV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICBuLmFyZ3VtZW50RXhwcmVzc2lvbi50ZXh0ID09PSBleHBlY3RlZEFjY2VzcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3NlcyA9XG4gICAgICAgIGZpbmRBbGxNYXRjaGluZ05vZGVzKHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZXZlbnRCaW5kaW5nLmtleVNwYW4sIGZpbHRlcn0pO1xuXG4gICAgY29uc3QgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgb3V0cHV0RmllbGRBY2Nlc3Mgb2Ygb3V0cHV0RmllbGRBY2Nlc3Nlcykge1xuICAgICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcykpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFkZEV2ZW50TGlzdGVuZXIgPSBvdXRwdXRGaWVsZEFjY2Vzcy5uYW1lO1xuICAgICAgICBjb25zdCB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCB0c1R5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24oYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuXG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwgfHwgdHNTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYmluZGluZ3MucHVzaCh7XG4gICAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICAgIHRzU3ltYm9sLFxuICAgICAgICAgIHRzVHlwZSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRzU3ltYm9sID1cbiAgICAgICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG91dHB1dEZpZWxkQWNjZXNzLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihvdXRwdXRGaWVsZEFjY2VzcywgY29uc3VtZXIpO1xuICAgICAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwb3NpdGlvbkluU2hpbUZpbGUgPSB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUob3V0cHV0RmllbGRBY2Nlc3MpO1xuICAgICAgICBjb25zdCB0c1R5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24ob3V0cHV0RmllbGRBY2Nlc3MpO1xuICAgICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5PdXRwdXQsIGJpbmRpbmdzfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcoYmluZGluZzogVG1wbEFzdEJvdW5kQXR0cmlidXRlfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRtcGxBc3RUZXh0QXR0cmlidXRlKTogSW5wdXRCaW5kaW5nU3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRDb25zdW1lck9mQmluZGluZyhiaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBjb25zdCBob3N0ID0gdGhpcy5nZXRTeW1ib2woY29uc3VtZXIpO1xuICAgICAgcmV0dXJuIGhvc3QgIT09IG51bGwgPyB7a2luZDogU3ltYm9sS2luZC5Eb21CaW5kaW5nLCBob3N0fSA6IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBiaW5kaW5nLnNvdXJjZVNwYW4sIGZpbHRlcjogaXNBc3NpZ25tZW50fSk7XG4gICAgY29uc3QgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgaWYgKCFpc0FjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5sZWZ0KTtcbiAgICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsIHx8IHN5bWJvbEluZm8udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuZ2V0RGlyZWN0aXZlU3ltYm9sRm9yQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQsIGNvbnN1bWVyKTtcbiAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbEluZm8udHNTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChiaW5kaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5JbnB1dCwgYmluZGluZ3N9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKFxuICAgICAgbm9kZTogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb258dHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uLFxuICAgICAge2lzQ29tcG9uZW50LCBzZWxlY3RvciwgaXNTdHJ1Y3R1cmFsfTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEpOiBEaXJlY3RpdmVTeW1ib2x8bnVsbCB7XG4gICAgLy8gSW4gZWl0aGVyIGNhc2UsIGBfdDFbXCJpbmRleFwiXWAgb3IgYF90MS5pbmRleGAsIGBub2RlLmV4cHJlc3Npb25gIGlzIF90MS5cbiAgICAvLyBUaGUgcmV0cmlldmVkIHN5bWJvbCBmb3IgX3QxIHdpbGwgYmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5leHByZXNzaW9uKTtcbiAgICBpZiAodHNTeW1ib2w/LmRlY2xhcmF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8IHRzU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IFtkZWNsYXJhdGlvbl0gPSB0c1N5bWJvbC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8XG4gICAgICAgICFoYXNFeHByZXNzaW9uSWRlbnRpZmllcihcbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGlkZW50aWZpZXIgY291bGQgYmUgb24gdGhlIHR5cGUgKGZvciByZWd1bGFyIGRpcmVjdGl2ZXMpIG9yIHRoZSBuYW1lXG4gICAgICAgICAgICAvLyAoZm9yIGdlbmVyaWMgZGlyZWN0aXZlcyBhbmQgdGhlIGN0b3Igb3ApLlxuICAgICAgICAgICAgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLCBkZWNsYXJhdGlvbi50eXBlID8/IGRlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8ICFpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbCkgfHxcbiAgICAgICAgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5nZXREaXJlY3RpdmVNb2R1bGUoc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIHJldHVybiB7XG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICBzaGltTG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICBpc0NvbXBvbmVudCxcbiAgICAgIGlzU3RydWN0dXJhbCxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbmdNb2R1bGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKTogVmFyaWFibGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiB2YXJpYWJsZS5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5pbml0aWFsaXplcik7XG4gICAgaWYgKGV4cHJlc3Npb25TeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0c1R5cGU6IGV4cHJlc3Npb25TeW1ib2wudHNUeXBlLFxuICAgICAgdHNTeW1ib2w6IGV4cHJlc3Npb25TeW1ib2wudHNTeW1ib2wsXG4gICAgICBpbml0aWFsaXplckxvY2F0aW9uOiBleHByZXNzaW9uU3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuVmFyaWFibGUsXG4gICAgICBkZWNsYXJhdGlvbjogdmFyaWFibGUsXG4gICAgICBsb2NhbFZhckxvY2F0aW9uOiB7XG4gICAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLm5hbWUpLFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mUmVmZXJlbmNlKHJlZjogVG1wbEFzdFJlZmVyZW5jZSk6IFJlZmVyZW5jZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXRSZWZlcmVuY2VUYXJnZXQocmVmKTtcbiAgICAvLyBGaW5kIHRoZSBub2RlIGZvciB0aGUgcmVmZXJlbmNlIGRlY2xhcmF0aW9uLCBpLmUuIGB2YXIgX3QyID0gX3QxO2BcbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiByZWYuc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCB0YXJnZXQgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGZvciB0aGUgcmVmZXJlbmNlcyB2YXJpYWJsZSwgd2l0aCB0aGUgZXhjZXB0aW9uIG9mIHRlbXBsYXRlIHJlZnNcbiAgICAvLyB3aGljaCBhcmUgb2YgdGhlIGZvcm0gdmFyIF90MyA9IChfdDIgYXMgYW55IGFzIGkyLlRlbXBsYXRlUmVmPGFueT4pXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogQ29uc2lkZXIgYWRkaW5nIGFuIGBFeHByZXNzaW9uSWRlbnRpZmllcmAgdG8gdGFnIHZhcmlhYmxlIGRlY2xhcmF0aW9uXG4gICAgLy8gaW5pdGlhbGl6ZXJzIGFzIGludmFsaWQgZm9yIHN5bWJvbCByZXRyaWV2YWwuXG4gICAgY29uc3Qgb3JpZ2luYWxEZWNsYXJhdGlvbiA9IHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZS5pbml0aWFsaXplcikgJiZcbiAgICAgICAgICAgIHRzLmlzQXNFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIuZXhwcmVzc2lvbikgP1xuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLm5hbWUpIDpcbiAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5pbml0aWFsaXplcik7XG4gICAgaWYgKG9yaWdpbmFsRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUob3JpZ2luYWxEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb24gPSB7XG4gICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUpLFxuICAgIH07XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCB0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5SZWZlcmVuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVmLFxuICAgICAgICB0YXJnZXRMb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgICAgcmVmZXJlbmNlVmFyTG9jYXRpb246IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldC5kaXJlY3RpdmUucmVmLm5vZGUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICBkZWNsYXJhdGlvbjogcmVmLFxuICAgICAgICB0YXJnZXQ6IHRhcmdldC5kaXJlY3RpdmUucmVmLm5vZGUsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mUGlwZShleHByZXNzaW9uOiBCaW5kaW5nUGlwZSk6IFBpcGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgbWV0aG9kQWNjZXNzID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLFxuICAgICAgICB7d2l0aFNwYW46IGV4cHJlc3Npb24ubmFtZVNwYW4sIGZpbHRlcjogdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259KTtcbiAgICBpZiAobWV0aG9kQWNjZXNzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwaXBlVmFyaWFibGVOb2RlID0gbWV0aG9kQWNjZXNzLmV4cHJlc3Npb247XG4gICAgY29uc3QgcGlwZURlY2xhcmF0aW9uID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24ocGlwZVZhcmlhYmxlTm9kZSk7XG4gICAgaWYgKHBpcGVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IHBpcGVEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVJbnN0YW5jZSA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUocGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIC8vIFRoZSBpbnN0YW5jZSBzaG91bGQgbmV2ZXIgYmUgbnVsbCwgbm9yIHNob3VsZCB0aGUgc3ltYm9sIGxhY2sgYSB2YWx1ZSBkZWNsYXJhdGlvbi4gVGhpc1xuICAgIC8vIGlzIGJlY2F1c2UgdGhlIG5vZGUgdXNlZCB0byBsb29rIGZvciB0aGUgYHBpcGVJbnN0YW5jZWAgc3ltYm9sIGluZm8gaXMgYSB2YWx1ZVxuICAgIC8vIGRlY2xhcmF0aW9uIG9mIGFub3RoZXIgc3ltYm9sIChpLmUuIHRoZSBgcGlwZURlY2xhcmF0aW9uYCBzeW1ib2wpLlxuICAgIGlmIChwaXBlSW5zdGFuY2UgPT09IG51bGwgfHwgIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24ocGlwZUluc3RhbmNlLnRzU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobWV0aG9kQWNjZXNzKTtcbiAgICBpZiAoc3ltYm9sSW5mbyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUGlwZSxcbiAgICAgIC4uLnN5bWJvbEluZm8sXG4gICAgICBjbGFzc1N5bWJvbDoge1xuICAgICAgICAuLi5waXBlSW5zdGFuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBwaXBlSW5zdGFuY2UudHNTeW1ib2wsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKGV4cHJlc3Npb246IEFTVCk6IFZhcmlhYmxlU3ltYm9sfFJlZmVyZW5jZVN5bWJvbFxuICAgICAgfEV4cHJlc3Npb25TeW1ib2x8bnVsbCB7XG4gICAgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5hc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoZXhwcmVzc2lvbik7XG4gICAgaWYgKGV4cHJlc3Npb25UYXJnZXQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbChleHByZXNzaW9uVGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAgYW5kIGBNZXRob2RDYWxsYCBkb2VzIG5vdCBoYXZlIGl0cyBvd25cbiAgICAvLyBBU1Qgc28gdGhlcmUgaXMgbm8gd2F5IHRvIHJldHJpZXZlIGEgYFN5bWJvbGAgZm9yIGp1c3QgdGhlIGBuYW1lYCB2aWEgYSBzcGVjaWZpYyBub2RlLlxuICAgIGNvbnN0IHdpdGhTcGFuID0gKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBNZXRob2RDYWxsKSA/XG4gICAgICAgIGV4cHJlc3Npb24ubmFtZVNwYW4gOlxuICAgICAgICBleHByZXNzaW9uLnNvdXJjZVNwYW47XG5cbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuLCBmaWx0ZXI6IChuOiB0cy5Ob2RlKTogbiBpcyB0cy5Ob2RlID0+IHRydWV9KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gLSBJZiB3ZSBoYXZlIHNhZmUgcHJvcGVydHkgcmVhZCAoXCJhPy5iXCIpIHdlIHdhbnQgdG8gZ2V0IHRoZSBTeW1ib2wgZm9yIGIsIHRoZSBgd2hlblRydWVgXG4gICAgLy8gZXhwcmVzc2lvbi5cbiAgICAvLyAtIElmIG91ciBleHByZXNzaW9uIGlzIGEgcGlwZSBiaW5kaW5nIChcImEgfCB0ZXN0OmI6Y1wiKSwgd2Ugd2FudCB0aGUgU3ltYm9sIGZvciB0aGVcbiAgICAvLyBgdHJhbnNmb3JtYCBvbiB0aGUgcGlwZS5cbiAgICAvLyAtIE90aGVyd2lzZSwgd2UgcmV0cmlldmUgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgaXRzZWxmIHdpdGggbm8gc3BlY2lhbCBjb25zaWRlcmF0aW9uc1xuICAgIGlmICgoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsKSAmJlxuICAgICAgICB0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgY29uc3Qgd2hlblRydWVTeW1ib2wgPVxuICAgICAgICAgIChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlLndoZW5UcnVlKSkgP1xuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZS5leHByZXNzaW9uKSA6XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlKTtcbiAgICAgIGlmICh3aGVuVHJ1ZVN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4ud2hlblRydWVTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbixcbiAgICAgICAgLy8gUmF0aGVyIHRoYW4gdXNpbmcgdGhlIHR5cGUgb2Ygb25seSB0aGUgYHdoZW5UcnVlYCBwYXJ0IG9mIHRoZSBleHByZXNzaW9uLCB3ZSBzaG91bGRcbiAgICAgICAgLy8gc3RpbGwgZ2V0IHRoZSB0eXBlIG9mIHRoZSB3aG9sZSBjb25kaXRpb25hbCBleHByZXNzaW9uIHRvIGluY2x1ZGUgYHx1bmRlZmluZWRgLlxuICAgICAgICB0c1R5cGU6IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihub2RlKVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVHNOb2RlKG5vZGU6IHRzLk5vZGUpOiBUc05vZGVTeW1ib2xJbmZvfG51bGwge1xuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIGxldCB0c1N5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5uYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKTtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xuICAgIHJldHVybiB7XG4gICAgICAvLyBJZiB3ZSBjb3VsZCBub3QgZmluZCBhIHN5bWJvbCwgZmFsbCBiYWNrIHRvIHRoZSBzeW1ib2wgb24gdGhlIHR5cGUgZm9yIHRoZSBub2RlLlxuICAgICAgLy8gU29tZSBub2RlcyB3b24ndCBoYXZlIGEgXCJzeW1ib2wgYXQgbG9jYXRpb25cIiBidXQgd2lsbCBoYXZlIGEgc3ltYm9sIGZvciB0aGUgdHlwZS5cbiAgICAgIC8vIEV4YW1wbGVzIG9mIHRoaXMgd291bGQgYmUgbGl0ZXJhbHMgYW5kIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKWAuXG4gICAgICB0c1N5bWJvbDogdHNTeW1ib2wgPz8gdHlwZS5zeW1ib2wgPz8gbnVsbCxcbiAgICAgIHRzVHlwZTogdHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZTogdHMuTm9kZSk6IG51bWJlciB7XG4gICAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZS50eXBlTmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnJpZ2h0LmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubmFtZS5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBub2RlLmdldFN0YXJ0KCk7XG4gICAgfVxuICB9XG59XG4iXX0=