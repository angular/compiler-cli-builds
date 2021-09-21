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
                var directiveSymbol = tslib_1.__assign(tslib_1.__assign({}, symbol), { tsSymbol: symbol.tsSymbol, selector: meta.selector, isComponent: isComponent, ngModule: ngModule, kind: api_1.SymbolKind.Directive, isStructural: meta.isStructural });
                return directiveSymbol;
            })
                .filter(function (d) { return d !== null; });
        };
        SymbolBuilder.prototype.getDirectiveMeta = function (host, directiveDeclaration) {
            var _a;
            var directives = this.templateData.boundTarget.getDirectivesOfNode(host);
            // `getDirectivesOfNode` will not return the directives intended for an element
            // on a microsyntax template, for example `<div *ngFor="let user of users;" dir>`,
            // the `dir` will be skipped, but it's needed in language service.
            var firstChild = host.children[0];
            if (firstChild instanceof compiler_1.TmplAstElement) {
                var isMicrosyntaxTemplate = host instanceof compiler_1.TmplAstTemplate &&
                    sourceSpanEqual(firstChild.sourceSpan, host.sourceSpan);
                if (isMicrosyntaxTemplate) {
                    var firstChildDirectives = this.templateData.boundTarget.getDirectivesOfNode(firstChild);
                    if (firstChildDirectives !== null && directives !== null) {
                        directives = directives.concat(firstChildDirectives);
                    }
                    else {
                        directives = directives !== null && directives !== void 0 ? directives : firstChildDirectives;
                    }
                }
            }
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
            var withSpan = expression.sourceSpan;
            // The `name` part of a `PropertyWrite` and a non-safe `Call` does not have its own
            // AST so there is no way to retrieve a `Symbol` for just the `name` via a specific node.
            if (expression instanceof compiler_1.PropertyWrite) {
                withSpan = expression.nameSpan;
            }
            else if (expression instanceof compiler_1.Call && expression.receiver instanceof compiler_1.PropertyRead) {
                withSpan = expression.receiver.nameSpan;
            }
            var node = null;
            // Property reads in templates usually map to a `PropertyAccessExpression`
            // (e.g. `ctx.foo`) so try looking for one first.
            if (expression instanceof compiler_1.PropertyRead) {
                node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: withSpan, filter: ts.isPropertyAccessExpression });
            }
            // Otherwise fall back to searching for any AST node.
            if (node === null) {
                node = comments_1.findFirstMatchingNode(this.typeCheckBlock, { withSpan: withSpan, filter: anyNodeFilter });
            }
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
            if ((expression instanceof compiler_1.SafePropertyRead ||
                (expression instanceof compiler_1.Call && expression.receiver instanceof compiler_1.SafePropertyRead)) &&
                ts.isConditionalExpression(node)) {
                var whenTrueSymbol = (expression instanceof compiler_1.Call && ts.isCallExpression(node.whenTrue)) ?
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
    /** Filter predicate function that matches any AST node. */
    function anyNodeFilter(n) {
        return true;
    }
    function sourceSpanEqual(a, b) {
        return a.start.offset === b.start.offset && a.end.offset === b.end.offset;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF5UjtJQUN6UiwrQkFBaUM7SUFLakMsa0ZBQXFGO0lBQ3JGLHFFQUErUjtJQUUvUixtRkFBc0g7SUFFdEgsaUZBQTZDO0lBRTdDOzs7OztPQUtHO0lBQ0g7UUFHRSx1QkFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO1FBQzNELDhGQUE4RjtRQUM5RiwrQkFBK0I7UUFDZCxjQUFvQztZQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztZQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1lBRzFDLG1CQUFjLEdBQWQsY0FBYyxDQUFzQjtZQVRqRCxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBVTNELENBQUM7UUFLSixpQ0FBUyxHQUFULFVBQVUsSUFBcUI7WUFDN0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQzthQUNwQztZQUVELElBQUksTUFBTSxHQUFnQixJQUFJLENBQUM7WUFDL0IsSUFBSSxJQUFJLFlBQVksZ0NBQXFCLElBQUksSUFBSSxZQUFZLCtCQUFvQixFQUFFO2dCQUNqRiw0RkFBNEY7Z0JBQzVGLDZDQUE2QztnQkFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFB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O1FBQ0osQ0FBQztRQUVPLDhDQUFzQixHQUE5QixVQUErQixJQUFhO1lBQzFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbkQ7aUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDOUI7aUJBQU0sSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDM0M7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDeEI7UUFDSCxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBdmpCRCxJQXVqQkM7SUF2akJZLHNDQUFhO0lBeWpCMUIsMkRBQTJEO0lBQzNELFNBQVMsYUFBYSxDQUFDLENBQVU7UUFDL0IsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsQ0FBa0IsRUFBRSxDQUFrQjtRQUM3RCxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQzVFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEJpbmRpbmdQaXBlLCBDYWxsLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RUZXh0QXR0cmlidXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtpc0Fzc2lnbm1lbnQsIGlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtCaW5kaW5nU3ltYm9sLCBEaXJlY3RpdmVTeW1ib2wsIERvbUJpbmRpbmdTeW1ib2wsIEVsZW1lbnRTeW1ib2wsIEV4cHJlc3Npb25TeW1ib2wsIElucHV0QmluZGluZ1N5bWJvbCwgT3V0cHV0QmluZGluZ1N5bWJvbCwgUGlwZVN5bWJvbCwgUmVmZXJlbmNlU3ltYm9sLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgU3ltYm9sS2luZCwgVGVtcGxhdGVTeW1ib2wsIFRzTm9kZVN5bWJvbEluZm8sIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBWYXJpYWJsZVN5bWJvbH0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtFeHByZXNzaW9uSWRlbnRpZmllciwgZmluZEFsbE1hdGNoaW5nTm9kZXMsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZSwgaGFzRXhwcmVzc2lvbklkZW50aWZpZXJ9IGZyb20gJy4vY29tbWVudHMnO1xuaW1wb3J0IHtUZW1wbGF0ZURhdGF9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge2lzQWNjZXNzRXhwcmVzc2lvbn0gZnJvbSAnLi90c191dGlsJztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW5kIGNhY2hlcyBgU3ltYm9sYHMgZm9yIHZhcmlvdXMgdGVtcGxhdGUgc3RydWN0dXJlcyBmb3IgYSBnaXZlbiBjb21wb25lbnQuXG4gKlxuICogVGhlIGBTeW1ib2xCdWlsZGVyYCBpbnRlcm5hbGx5IGNhY2hlcyB0aGUgYFN5bWJvbGBzIGl0IGNyZWF0ZXMsIGFuZCBtdXN0IGJlIGRlc3Ryb3llZCBhbmRcbiAqIHJlcGxhY2VkIGlmIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBjaGFuZ2VzLlxuICovXG5leHBvcnQgY2xhc3MgU3ltYm9sQnVpbGRlciB7XG4gIHByaXZhdGUgc3ltYm9sQ2FjaGUgPSBuZXcgTWFwPEFTVHxUbXBsQXN0Tm9kZSwgU3ltYm9sfG51bGw+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrQmxvY2s6IHRzLk5vZGUsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlRGF0YTogVGVtcGxhdGVEYXRhLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnRTY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICAvLyBUaGUgYHRzLlR5cGVDaGVja2VyYCBkZXBlbmRzIG9uIHRoZSBjdXJyZW50IHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSwgYW5kIHNvIG11c3QgYmUgcmVxdWVzdGVkXG4gICAgICAvLyBvbi1kZW1hbmQgaW5zdGVhZCBvZiBjYWNoZWQuXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGdldFR5cGVDaGVja2VyOiAoKSA9PiB0cy5UeXBlQ2hlY2tlcixcbiAgKSB7fVxuXG4gIGdldFN5bWJvbChub2RlOiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQpOiBUZW1wbGF0ZVN5bWJvbHxFbGVtZW50U3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBUbXBsQXN0UmVmZXJlbmNlfFRtcGxBc3RWYXJpYWJsZSk6IFJlZmVyZW5jZVN5bWJvbHxWYXJpYWJsZVN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBTeW1ib2x8bnVsbCB7XG4gICAgaWYgKHRoaXMuc3ltYm9sQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zeW1ib2xDYWNoZS5nZXQobm9kZSkhO1xuICAgIH1cblxuICAgIGxldCBzeW1ib2w6IFN5bWJvbHxudWxsID0gbnVsbDtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSB8fCBub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRleHRBdHRyaWJ1dGUpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IGlucHV0IGFuZCBvdXRwdXQgYmluZGluZ3Mgb25seSByZXR1cm4gdGhlIGZpcnN0IGRpcmVjdGl2ZSBtYXRjaCBidXQgc2hvdWxkXG4gICAgICAvLyByZXR1cm4gYSBsaXN0IG9mIGJpbmRpbmdzIGZvciBhbGwgb2YgdGhlbS5cbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZJbnB1dEJpbmRpbmcobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mRWxlbWVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZWYXJpYWJsZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mUmVmZXJlbmNlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIEJpbmRpbmdQaXBlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mUGlwZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBBU1QpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24obm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRtcGxBc3RDb250ZW50LCBUbXBsQXN0SWN1XG4gICAgfVxuXG4gICAgdGhpcy5zeW1ib2xDYWNoZS5zZXQobm9kZSwgc3ltYm9sKTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkFzdFRlbXBsYXRlKHRlbXBsYXRlOiBUbXBsQXN0VGVtcGxhdGUpOiBUZW1wbGF0ZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKHRlbXBsYXRlKTtcbiAgICByZXR1cm4ge2tpbmQ6IFN5bWJvbEtpbmQuVGVtcGxhdGUsIGRpcmVjdGl2ZXMsIHRlbXBsYXRlTm9kZTogdGVtcGxhdGV9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZkVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpOiBFbGVtZW50U3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sRnJvbURlY2xhcmF0aW9uID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICBpZiAoc3ltYm9sRnJvbURlY2xhcmF0aW9uID09PSBudWxsIHx8IHN5bWJvbEZyb21EZWNsYXJhdGlvbi50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50KTtcbiAgICAvLyBBbGwgc3RhdGVtZW50cyBpbiB0aGUgVENCIGFyZSBgRXhwcmVzc2lvbmBzIHRoYXQgb3B0aW9uYWxseSBpbmNsdWRlIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgLy8gQW4gYEVsZW1lbnRTeW1ib2xgIHVzZXMgdGhlIGluZm9ybWF0aW9uIHJldHVybmVkIGZvciB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZXhwcmVzc2lvbixcbiAgICAvLyBhZGRzIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgZWxlbWVudCwgYW5kIHVwZGF0ZXMgdGhlIGBraW5kYCB0byBiZSBgU3ltYm9sS2luZC5FbGVtZW50YC5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uc3ltYm9sRnJvbURlY2xhcmF0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5FbGVtZW50LFxuICAgICAgZGlyZWN0aXZlcyxcbiAgICAgIHRlbXBsYXRlTm9kZTogZWxlbWVudCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IERpcmVjdGl2ZVN5bWJvbFtdIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcbiAgICBjb25zdCB0Y2JTb3VyY2VGaWxlID0gdGhpcy50eXBlQ2hlY2tCbG9jay5nZXRTb3VyY2VGaWxlKCk7XG4gICAgLy8gZGlyZWN0aXZlcyBjb3VsZCBiZSBlaXRoZXI6XG4gICAgLy8gLSB2YXIgX3QxOiBUZXN0RGlyIC8qVDpEKi8gPSAobnVsbCEpO1xuICAgIC8vIC0gdmFyIF90MSAvKlQ6RCovID0gX2N0b3IxKHt9KTtcbiAgICBjb25zdCBpc0RpcmVjdGl2ZURlY2xhcmF0aW9uID0gKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlR5cGVOb2RlfHRzLklkZW50aWZpZXIgPT5cbiAgICAgICAgKHRzLmlzVHlwZU5vZGUobm9kZSkgfHwgdHMuaXNJZGVudGlmaWVyKG5vZGUpKSAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpICYmXG4gICAgICAgIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyKHRjYlNvdXJjZUZpbGUsIG5vZGUsIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSk7XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IGlzRGlyZWN0aXZlRGVjbGFyYXRpb259KTtcbiAgICByZXR1cm4gbm9kZXNcbiAgICAgICAgLm1hcChub2RlID0+IHtcbiAgICAgICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUucGFyZW50KTtcbiAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8ICFpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbCkgfHxcbiAgICAgICAgICAgICAgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBtZXRhID0gdGhpcy5nZXREaXJlY3RpdmVNZXRhKGVsZW1lbnQsIHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKG1ldGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc0NvbXBvbmVudCA9IG1ldGEuaXNDb21wb25lbnQgPz8gbnVsbDtcbiAgICAgICAgICBjb25zdCBkaXJlY3RpdmVTeW1ib2w6IERpcmVjdGl2ZVN5bWJvbCA9IHtcbiAgICAgICAgICAgIC4uLnN5bWJvbCxcbiAgICAgICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgICAgICBzZWxlY3RvcjogbWV0YS5zZWxlY3RvcixcbiAgICAgICAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgICAgICAgbmdNb2R1bGUsXG4gICAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZSxcbiAgICAgICAgICAgIGlzU3RydWN0dXJhbDogbWV0YS5pc1N0cnVjdHVyYWwsXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlU3ltYm9sO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKChkKTogZCBpcyBEaXJlY3RpdmVTeW1ib2wgPT4gZCAhPT0gbnVsbCk7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1ldGEoXG4gICAgICBob3N0OiBUbXBsQXN0VGVtcGxhdGV8VG1wbEFzdEVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBsZXQgZGlyZWN0aXZlcyA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldERpcmVjdGl2ZXNPZk5vZGUoaG9zdCk7XG5cbiAgICAvLyBgZ2V0RGlyZWN0aXZlc09mTm9kZWAgd2lsbCBub3QgcmV0dXJuIHRoZSBkaXJlY3RpdmVzIGludGVuZGVkIGZvciBhbiBlbGVtZW50XG4gICAgLy8gb24gYSBtaWNyb3N5bnRheCB0ZW1wbGF0ZSwgZm9yIGV4YW1wbGUgYDxkaXYgKm5nRm9yPVwibGV0IHVzZXIgb2YgdXNlcnM7XCIgZGlyPmAsXG4gICAgLy8gdGhlIGBkaXJgIHdpbGwgYmUgc2tpcHBlZCwgYnV0IGl0J3MgbmVlZGVkIGluIGxhbmd1YWdlIHNlcnZpY2UuXG4gICAgY29uc3QgZmlyc3RDaGlsZCA9IGhvc3QuY2hpbGRyZW5bMF07XG4gICAgaWYgKGZpcnN0Q2hpbGQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgY29uc3QgaXNNaWNyb3N5bnRheFRlbXBsYXRlID0gaG9zdCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSAmJlxuICAgICAgICAgIHNvdXJjZVNwYW5FcXVhbChmaXJzdENoaWxkLnNvdXJjZVNwYW4sIGhvc3Quc291cmNlU3Bhbik7XG4gICAgICBpZiAoaXNNaWNyb3N5bnRheFRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0Q2hpbGREaXJlY3RpdmVzID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RGlyZWN0aXZlc09mTm9kZShmaXJzdENoaWxkKTtcbiAgICAgICAgaWYgKGZpcnN0Q2hpbGREaXJlY3RpdmVzICE9PSBudWxsICYmIGRpcmVjdGl2ZXMgIT09IG51bGwpIHtcbiAgICAgICAgICBkaXJlY3RpdmVzID0gZGlyZWN0aXZlcy5jb25jYXQoZmlyc3RDaGlsZERpcmVjdGl2ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpcmVjdGl2ZXMgPSBkaXJlY3RpdmVzID8/IGZpcnN0Q2hpbGREaXJlY3RpdmVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoZXZlbnRCaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHMgaW4gdGhlIFRDQiBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAgLy8gKiBfdDFbXCJvdXRwdXRGaWVsZFwiXS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgLy8gKiBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtcbiAgICAvLyBFdmVuIHdpdGggc3RyaWN0IG51bGwgY2hlY2tzIGRpc2FibGVkLCB3ZSBzdGlsbCBwcm9kdWNlIHRoZSBhY2Nlc3MgYXMgYSBzZXBhcmF0ZSBzdGF0ZW1lbnRcbiAgICAvLyBzbyB0aGF0IGl0IGNhbiBiZSBmb3VuZCBoZXJlLlxuICAgIGxldCBleHBlY3RlZEFjY2Vzczogc3RyaW5nO1xuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCBjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBleHBlY3RlZEFjY2VzcyA9ICdhZGRFdmVudExpc3RlbmVyJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmluZGluZ1Byb3BlcnR5TmFtZXMgPSBjb25zdW1lci5vdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShldmVudEJpbmRpbmcubmFtZSk7XG4gICAgICBpZiAoYmluZGluZ1Byb3BlcnR5TmFtZXMgPT09IG51bGwgfHwgYmluZGluZ1Byb3BlcnR5TmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gTm90ZSB0aGF0IHdlIG9ubHkgZ2V0IHRoZSBleHBlY3RlZEFjY2VzcyB0ZXh0IGZyb20gYSBzaW5nbGUgY29uc3VtZXIgb2YgdGhlIGJpbmRpbmcuIElmXG4gICAgICAvLyB0aGVyZSBhcmUgbXVsdGlwbGUgY29uc3VtZXJzIChub3Qgc3VwcG9ydGVkIGluIHRoZSBgYm91bmRUYXJnZXRgIEFQSSkgYW5kIG9uZSBvZiB0aGVtIGhhc1xuICAgICAgLy8gYW4gYWxpYXMsIGl0IHdpbGwgbm90IGdldCBtYXRjaGVkIGhlcmUuXG4gICAgICBleHBlY3RlZEFjY2VzcyA9IGJpbmRpbmdQcm9wZXJ0eU5hbWVzWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlcihuOiB0cy5Ob2RlKTogbiBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ge1xuICAgICAgaWYgKCFpc0FjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIG4ubmFtZS5nZXRUZXh0KCkgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRzLmlzU3RyaW5nTGl0ZXJhbChuLmFyZ3VtZW50RXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIG4uYXJndW1lbnRFeHByZXNzaW9uLnRleHQgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBvdXRwdXRGaWVsZEFjY2Vzc2VzID1cbiAgICAgICAgZmluZEFsbE1hdGNoaW5nTm9kZXModGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBldmVudEJpbmRpbmcua2V5U3BhbiwgZmlsdGVyfSk7XG5cbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBvdXRwdXRGaWVsZEFjY2VzcyBvZiBvdXRwdXRGaWVsZEFjY2Vzc2VzKSB7XG4gICAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWRkRXZlbnRMaXN0ZW5lciA9IG91dHB1dEZpZWxkQWNjZXNzLm5hbWU7XG4gICAgICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24oYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHNTeW1ib2wgPVxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0cHV0RmllbGRBY2Nlc3MuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgICB0c1R5cGUsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLk91dHB1dCwgYmluZGluZ3N9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZklucHV0QmluZGluZyhiaW5kaW5nOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVG1wbEFzdFRleHRBdHRyaWJ1dGUpOiBJbnB1dEJpbmRpbmdTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGJpbmRpbmcpO1xuICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG4gICAgICByZXR1cm4gaG9zdCAhPT0gbnVsbCA/IHtraW5kOiBTeW1ib2xLaW5kLkRvbUJpbmRpbmcsIGhvc3R9IDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGJpbmRpbmcuc291cmNlU3BhbiwgZmlsdGVyOiBpc0Fzc2lnbm1lbnR9KTtcbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAoIWlzQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmxlZnQpO1xuICAgICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwgfHwgc3ltYm9sSW5mby50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCwgY29uc3VtZXIpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sSW5mby50c1N5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLklucHV0LCBiaW5kaW5nc307XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24oXG4gICAgICBub2RlOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbnx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICB7aXNDb21wb25lbnQsIHNlbGVjdG9yLCBpc1N0cnVjdHVyYWx9OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IERpcmVjdGl2ZVN5bWJvbHxudWxsIHtcbiAgICAvLyBJbiBlaXRoZXIgY2FzZSwgYF90MVtcImluZGV4XCJdYCBvciBgX3QxLmluZGV4YCwgYG5vZGUuZXhwcmVzc2lvbmAgaXMgX3QxLlxuICAgIC8vIFRoZSByZXRyaWV2ZWQgc3ltYm9sIGZvciBfdDEgd2lsbCBiZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbD8uZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHwgdHNTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICBzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW2RlY2xhcmF0aW9uXSA9IHRzU3ltYm9sLmRlY2xhcmF0aW9ucztcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHxcbiAgICAgICAgIWhhc0V4cHJlc3Npb25JZGVudGlmaWVyKFxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaWRlbnRpZmllciBjb3VsZCBiZSBvbiB0aGUgdHlwZSAoZm9yIHJlZ3VsYXIgZGlyZWN0aXZlcykgb3IgdGhlIG5hbWVcbiAgICAgICAgICAgIC8vIChmb3IgZ2VuZXJpYyBkaXJlY3RpdmVzIGFuZCB0aGUgY3RvciBvcCkuXG4gICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCksIGRlY2xhcmF0aW9uLnR5cGUgPz8gZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUoZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sKSB8fFxuICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgaXNTdHJ1Y3R1cmFsLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBuZ01vZHVsZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlZhcmlhYmxlKHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpOiBWYXJpYWJsZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHZhcmlhYmxlLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAoZXhwcmVzc2lvblN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRzVHlwZTogZXhwcmVzc2lvblN5bWJvbC50c1R5cGUsXG4gICAgICB0c1N5bWJvbDogZXhwcmVzc2lvblN5bWJvbC50c1N5bWJvbCxcbiAgICAgIGluaXRpYWxpemVyTG9jYXRpb246IGV4cHJlc3Npb25TeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSxcbiAgICAgIGRlY2xhcmF0aW9uOiB2YXJpYWJsZSxcbiAgICAgIGxvY2FsVmFyTG9jYXRpb246IHtcbiAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUubmFtZSksXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gZm9yIHRoZSByZWZlcmVuY2VzIHZhcmlhYmxlLCB3aXRoIHRoZSBleGNlcHRpb24gb2YgdGVtcGxhdGUgcmVmc1xuICAgIC8vIHdoaWNoIGFyZSBvZiB0aGUgZm9ybSB2YXIgX3QzID0gKF90MiBhcyBhbnkgYXMgaTIuVGVtcGxhdGVSZWY8YW55PilcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBDb25zaWRlciBhZGRpbmcgYW4gYEV4cHJlc3Npb25JZGVudGlmaWVyYCB0byB0YWcgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICAvLyBpbml0aWFsaXplcnMgYXMgaW52YWxpZCBmb3Igc3ltYm9sIHJldHJpZXZhbC5cbiAgICBjb25zdCBvcmlnaW5hbERlY2xhcmF0aW9uID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgICAgdHMuaXNBc0V4cHJlc3Npb24obm9kZS5pbml0aWFsaXplci5leHByZXNzaW9uKSA/XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSkgOlxuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAob3JpZ2luYWxEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCByZWZlcmVuY2VWYXJTaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbiA9IHtcbiAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSksXG4gICAgfTtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24odGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSxcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZQaXBlKGV4cHJlc3Npb246IEJpbmRpbmdQaXBlKTogUGlwZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBtZXRob2RBY2Nlc3MgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssXG4gICAgICAgIHt3aXRoU3BhbjogZXhwcmVzc2lvbi5uYW1lU3BhbiwgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0pO1xuICAgIGlmIChtZXRob2RBY2Nlc3MgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVWYXJpYWJsZU5vZGUgPSBtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgICBjb25zdCBwaXBlRGVjbGFyYXRpb24gPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihwaXBlVmFyaWFibGVOb2RlKTtcbiAgICBpZiAocGlwZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgcGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZUluc3RhbmNlID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShwaXBlRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgLy8gVGhlIGluc3RhbmNlIHNob3VsZCBuZXZlciBiZSBudWxsLCBub3Igc2hvdWxkIHRoZSBzeW1ib2wgbGFjayBhIHZhbHVlIGRlY2xhcmF0aW9uLiBUaGlzXG4gICAgLy8gaXMgYmVjYXVzZSB0aGUgbm9kZSB1c2VkIHRvIGxvb2sgZm9yIHRoZSBgcGlwZUluc3RhbmNlYCBzeW1ib2wgaW5mbyBpcyBhIHZhbHVlXG4gICAgLy8gZGVjbGFyYXRpb24gb2YgYW5vdGhlciBzeW1ib2wgKGkuZS4gdGhlIGBwaXBlRGVjbGFyYXRpb25gIHN5bWJvbCkuXG4gICAgaWYgKHBpcGVJbnN0YW5jZSA9PT0gbnVsbCB8fCAhaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbihwaXBlSW5zdGFuY2UudHNTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShtZXRob2RBY2Nlc3MpO1xuICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5QaXBlLFxuICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgIGNsYXNzU3ltYm9sOiB7XG4gICAgICAgIC4uLnBpcGVJbnN0YW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHBpcGVJbnN0YW5jZS50c1N5bWJvbCxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24oZXhwcmVzc2lvbjogQVNUKTogVmFyaWFibGVTeW1ib2x8UmVmZXJlbmNlU3ltYm9sXG4gICAgICB8RXhwcmVzc2lvblN5bWJvbHxudWxsIHtcbiAgICBpZiAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIEFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLmFzdDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uVGFyZ2V0ID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChleHByZXNzaW9uKTtcbiAgICBpZiAoZXhwcmVzc2lvblRhcmdldCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sKGV4cHJlc3Npb25UYXJnZXQpO1xuICAgIH1cblxuICAgIGxldCB3aXRoU3BhbiA9IGV4cHJlc3Npb24uc291cmNlU3BhbjtcblxuICAgIC8vIFRoZSBgbmFtZWAgcGFydCBvZiBhIGBQcm9wZXJ0eVdyaXRlYCBhbmQgYSBub24tc2FmZSBgQ2FsbGAgZG9lcyBub3QgaGF2ZSBpdHMgb3duXG4gICAgLy8gQVNUIHNvIHRoZXJlIGlzIG5vIHdheSB0byByZXRyaWV2ZSBhIGBTeW1ib2xgIGZvciBqdXN0IHRoZSBgbmFtZWAgdmlhIGEgc3BlY2lmaWMgbm9kZS5cbiAgICBpZiAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUpIHtcbiAgICAgIHdpdGhTcGFuID0gZXhwcmVzc2lvbi5uYW1lU3BhbjtcbiAgICB9IGVsc2UgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBDYWxsICYmIGV4cHJlc3Npb24ucmVjZWl2ZXIgaW5zdGFuY2VvZiBQcm9wZXJ0eVJlYWQpIHtcbiAgICAgIHdpdGhTcGFuID0gZXhwcmVzc2lvbi5yZWNlaXZlci5uYW1lU3BhbjtcbiAgICB9XG5cbiAgICBsZXQgbm9kZTogdHMuTm9kZXxudWxsID0gbnVsbDtcblxuICAgIC8vIFByb3BlcnR5IHJlYWRzIGluIHRlbXBsYXRlcyB1c3VhbGx5IG1hcCB0byBhIGBQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb25gXG4gICAgLy8gKGUuZy4gYGN0eC5mb29gKSBzbyB0cnkgbG9va2luZyBmb3Igb25lIGZpcnN0LlxuICAgIGlmIChleHByZXNzaW9uIGluc3RhbmNlb2YgUHJvcGVydHlSZWFkKSB7XG4gICAgICBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbiwgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0pO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSBmYWxsIGJhY2sgdG8gc2VhcmNoaW5nIGZvciBhbnkgQVNUIG5vZGUuXG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUodGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuLCBmaWx0ZXI6IGFueU5vZGVGaWx0ZXJ9KTtcbiAgICB9XG5cbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gLSBJZiB3ZSBoYXZlIHNhZmUgcHJvcGVydHkgcmVhZCAoXCJhPy5iXCIpIHdlIHdhbnQgdG8gZ2V0IHRoZSBTeW1ib2wgZm9yIGIsIHRoZSBgd2hlblRydWVgXG4gICAgLy8gZXhwcmVzc2lvbi5cbiAgICAvLyAtIElmIG91ciBleHByZXNzaW9uIGlzIGEgcGlwZSBiaW5kaW5nIChcImEgfCB0ZXN0OmI6Y1wiKSwgd2Ugd2FudCB0aGUgU3ltYm9sIGZvciB0aGVcbiAgICAvLyBgdHJhbnNmb3JtYCBvbiB0aGUgcGlwZS5cbiAgICAvLyAtIE90aGVyd2lzZSwgd2UgcmV0cmlldmUgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgaXRzZWxmIHdpdGggbm8gc3BlY2lhbCBjb25zaWRlcmF0aW9uc1xuICAgIGlmICgoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHxcbiAgICAgICAgIChleHByZXNzaW9uIGluc3RhbmNlb2YgQ2FsbCAmJiBleHByZXNzaW9uLnJlY2VpdmVyIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCkpICYmXG4gICAgICAgIHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBjb25zdCB3aGVuVHJ1ZVN5bWJvbCA9IChleHByZXNzaW9uIGluc3RhbmNlb2YgQ2FsbCAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUud2hlblRydWUpKSA/XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlLmV4cHJlc3Npb24pIDpcbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUpO1xuICAgICAgaWYgKHdoZW5UcnVlU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi53aGVuVHJ1ZVN5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9uLFxuICAgICAgICAvLyBSYXRoZXIgdGhhbiB1c2luZyB0aGUgdHlwZSBvZiBvbmx5IHRoZSBgd2hlblRydWVgIHBhcnQgb2YgdGhlIGV4cHJlc3Npb24sIHdlIHNob3VsZFxuICAgICAgICAvLyBzdGlsbCBnZXQgdGhlIHR5cGUgb2YgdGhlIHdob2xlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdG8gaW5jbHVkZSBgfHVuZGVmaW5lZGAuXG4gICAgICAgIHRzVHlwZTogdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgIHJldHVybiBzeW1ib2xJbmZvID09PSBudWxsID8gbnVsbCA6IHsuLi5zeW1ib2xJbmZvLCBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb259O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUc05vZGUobm9kZTogdHMuTm9kZSk6IFRzTm9kZVN5bWJvbEluZm98bnVsbCB7XG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgbGV0IHRzU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuICAgIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLm5hbWUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUpO1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIElmIHdlIGNvdWxkIG5vdCBmaW5kIGEgc3ltYm9sLCBmYWxsIGJhY2sgdG8gdGhlIHN5bWJvbCBvbiB0aGUgdHlwZSBmb3IgdGhlIG5vZGUuXG4gICAgICAvLyBTb21lIG5vZGVzIHdvbid0IGhhdmUgYSBcInN5bWJvbCBhdCBsb2NhdGlvblwiIGJ1dCB3aWxsIGhhdmUgYSBzeW1ib2wgZm9yIHRoZSB0eXBlLlxuICAgICAgLy8gRXhhbXBsZXMgb2YgdGhpcyB3b3VsZCBiZSBsaXRlcmFscyBhbmQgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpYC5cbiAgICAgIHRzU3ltYm9sOiB0c1N5bWJvbCA/PyB0eXBlLnN5bWJvbCA/PyBudWxsLFxuICAgICAgdHNUeXBlOiB0eXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlOiB0cy5Ob2RlKTogbnVtYmVyIHtcbiAgICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLnR5cGVOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUucmlnaHQuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5uYW1lLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5hcmd1bWVudEV4cHJlc3Npb24uZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5vZGUuZ2V0U3RhcnQoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqIEZpbHRlciBwcmVkaWNhdGUgZnVuY3Rpb24gdGhhdCBtYXRjaGVzIGFueSBBU1Qgbm9kZS4gKi9cbmZ1bmN0aW9uIGFueU5vZGVGaWx0ZXIobjogdHMuTm9kZSk6IG4gaXMgdHMuTm9kZSB7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzb3VyY2VTcGFuRXF1YWwoYTogUGFyc2VTb3VyY2VTcGFuLCBiOiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgcmV0dXJuIGEuc3RhcnQub2Zmc2V0ID09PSBiLnN0YXJ0Lm9mZnNldCAmJiBhLmVuZC5vZmZzZXQgPT09IGIuZW5kLm9mZnNldDtcbn1cbiJdfQ==