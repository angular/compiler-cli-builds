/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AST, ASTWithSource, BindingPipe, MethodCall, PropertyWrite, SafeMethodCall, SafePropertyRead, TmplAstBoundAttribute, TmplAstBoundEvent, TmplAstElement, TmplAstReference, TmplAstTemplate, TmplAstTextAttribute, TmplAstVariable } from '@angular/compiler';
import * as ts from 'typescript';
import { isAssignment } from '../../util/src/typescript';
import { SymbolKind } from '../api';
import { ExpressionIdentifier, findAllMatchingNodes, findFirstMatchingNode, hasExpressionIdentifier } from './comments';
import { isAccessExpression } from './ts_util';
/**
 * Generates and caches `Symbol`s for various template structures for a given component.
 *
 * The `SymbolBuilder` internally caches the `Symbol`s it creates, and must be destroyed and
 * replaced if the component's template changes.
 */
export class SymbolBuilder {
    constructor(shimPath, typeCheckBlock, templateData, componentScopeReader, 
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
    getSymbol(node) {
        if (this.symbolCache.has(node)) {
            return this.symbolCache.get(node);
        }
        let symbol = null;
        if (node instanceof TmplAstBoundAttribute || node instanceof TmplAstTextAttribute) {
            // TODO(atscott): input and output bindings only return the first directive match but should
            // return a list of bindings for all of them.
            symbol = this.getSymbolOfInputBinding(node);
        }
        else if (node instanceof TmplAstBoundEvent) {
            symbol = this.getSymbolOfBoundEvent(node);
        }
        else if (node instanceof TmplAstElement) {
            symbol = this.getSymbolOfElement(node);
        }
        else if (node instanceof TmplAstTemplate) {
            symbol = this.getSymbolOfAstTemplate(node);
        }
        else if (node instanceof TmplAstVariable) {
            symbol = this.getSymbolOfVariable(node);
        }
        else if (node instanceof TmplAstReference) {
            symbol = this.getSymbolOfReference(node);
        }
        else if (node instanceof BindingPipe) {
            symbol = this.getSymbolOfPipe(node);
        }
        else if (node instanceof AST) {
            symbol = this.getSymbolOfTemplateExpression(node);
        }
        else {
            // TODO(atscott): TmplAstContent, TmplAstIcu
        }
        this.symbolCache.set(node, symbol);
        return symbol;
    }
    getSymbolOfAstTemplate(template) {
        const directives = this.getDirectivesOfNode(template);
        return { kind: SymbolKind.Template, directives, templateNode: template };
    }
    getSymbolOfElement(element) {
        var _a;
        const elementSourceSpan = (_a = element.startSourceSpan) !== null && _a !== void 0 ? _a : element.sourceSpan;
        const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: ts.isVariableDeclaration });
        if (node === null) {
            return null;
        }
        const symbolFromDeclaration = this.getSymbolOfTsNode(node);
        if (symbolFromDeclaration === null || symbolFromDeclaration.tsSymbol === null) {
            return null;
        }
        const directives = this.getDirectivesOfNode(element);
        // All statements in the TCB are `Expression`s that optionally include more information.
        // An `ElementSymbol` uses the information returned for the variable declaration expression,
        // adds the directives for the element, and updates the `kind` to be `SymbolKind.Element`.
        return Object.assign(Object.assign({}, symbolFromDeclaration), { kind: SymbolKind.Element, directives, templateNode: element });
    }
    getDirectivesOfNode(element) {
        var _a;
        const elementSourceSpan = (_a = element.startSourceSpan) !== null && _a !== void 0 ? _a : element.sourceSpan;
        const tcbSourceFile = this.typeCheckBlock.getSourceFile();
        // directives could be either:
        // - var _t1: TestDir /*T:D*/ = (null!);
        // - var _t1 /*T:D*/ = _ctor1({});
        const isDirectiveDeclaration = (node) => (ts.isTypeNode(node) || ts.isIdentifier(node)) && ts.isVariableDeclaration(node.parent) &&
            hasExpressionIdentifier(tcbSourceFile, node, ExpressionIdentifier.DIRECTIVE);
        const nodes = findAllMatchingNodes(this.typeCheckBlock, { withSpan: elementSourceSpan, filter: isDirectiveDeclaration });
        return nodes
            .map(node => {
            var _a;
            const symbol = this.getSymbolOfTsNode(node.parent);
            if (symbol === null || symbol.tsSymbol === null ||
                symbol.tsSymbol.valueDeclaration === undefined ||
                !ts.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
                return null;
            }
            const meta = this.getDirectiveMeta(element, symbol.tsSymbol.valueDeclaration);
            if (meta === null) {
                return null;
            }
            const ngModule = this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
            if (meta.selector === null) {
                return null;
            }
            const isComponent = (_a = meta.isComponent) !== null && _a !== void 0 ? _a : null;
            const directiveSymbol = Object.assign(Object.assign({}, symbol), { tsSymbol: symbol.tsSymbol, selector: meta.selector, isComponent,
                ngModule, kind: SymbolKind.Directive, isStructural: meta.isStructural });
            return directiveSymbol;
        })
            .filter((d) => d !== null);
    }
    getDirectiveMeta(host, directiveDeclaration) {
        var _a;
        const directives = this.templateData.boundTarget.getDirectivesOfNode(host);
        if (directives === null) {
            return null;
        }
        return (_a = directives.find(m => m.ref.node === directiveDeclaration)) !== null && _a !== void 0 ? _a : null;
    }
    getDirectiveModule(declaration) {
        const scope = this.componentScopeReader.getScopeForComponent(declaration);
        if (scope === null) {
            return null;
        }
        return scope.ngModule;
    }
    getSymbolOfBoundEvent(eventBinding) {
        const consumer = this.templateData.boundTarget.getConsumerOfBinding(eventBinding);
        if (consumer === null) {
            return null;
        }
        // Outputs in the TCB look like one of the two:
        // * _t1["outputField"].subscribe(handler);
        // * _t1.addEventListener(handler);
        // Even with strict null checks disabled, we still produce the access as a separate statement
        // so that it can be found here.
        let expectedAccess;
        if (consumer instanceof TmplAstTemplate || consumer instanceof TmplAstElement) {
            expectedAccess = 'addEventListener';
        }
        else {
            const bindingPropertyNames = consumer.outputs.getByBindingPropertyName(eventBinding.name);
            if (bindingPropertyNames === null || bindingPropertyNames.length === 0) {
                return null;
            }
            // Note that we only get the expectedAccess text from a single consumer of the binding. If
            // there are multiple consumers (not supported in the `boundTarget` API) and one of them has
            // an alias, it will not get matched here.
            expectedAccess = bindingPropertyNames[0].classPropertyName;
        }
        function filter(n) {
            if (!isAccessExpression(n)) {
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
        const outputFieldAccesses = findAllMatchingNodes(this.typeCheckBlock, { withSpan: eventBinding.keySpan, filter });
        const bindings = [];
        for (const outputFieldAccess of outputFieldAccesses) {
            if (consumer instanceof TmplAstTemplate || consumer instanceof TmplAstElement) {
                if (!ts.isPropertyAccessExpression(outputFieldAccess)) {
                    continue;
                }
                const addEventListener = outputFieldAccess.name;
                const tsSymbol = this.getTypeChecker().getSymbolAtLocation(addEventListener);
                const tsType = this.getTypeChecker().getTypeAtLocation(addEventListener);
                const positionInShimFile = this.getShimPositionForNode(addEventListener);
                const target = this.getSymbol(consumer);
                if (target === null || tsSymbol === undefined) {
                    continue;
                }
                bindings.push({
                    kind: SymbolKind.Binding,
                    tsSymbol,
                    tsType,
                    target,
                    shimLocation: { shimPath: this.shimPath, positionInShimFile },
                });
            }
            else {
                if (!ts.isElementAccessExpression(outputFieldAccess)) {
                    continue;
                }
                const tsSymbol = this.getTypeChecker().getSymbolAtLocation(outputFieldAccess.argumentExpression);
                if (tsSymbol === undefined) {
                    continue;
                }
                const target = this.getDirectiveSymbolForAccessExpression(outputFieldAccess, consumer);
                if (target === null) {
                    continue;
                }
                const positionInShimFile = this.getShimPositionForNode(outputFieldAccess);
                const tsType = this.getTypeChecker().getTypeAtLocation(outputFieldAccess);
                bindings.push({
                    kind: SymbolKind.Binding,
                    tsSymbol,
                    tsType,
                    target,
                    shimLocation: { shimPath: this.shimPath, positionInShimFile },
                });
            }
        }
        if (bindings.length === 0) {
            return null;
        }
        return { kind: SymbolKind.Output, bindings };
    }
    getSymbolOfInputBinding(binding) {
        const consumer = this.templateData.boundTarget.getConsumerOfBinding(binding);
        if (consumer === null) {
            return null;
        }
        if (consumer instanceof TmplAstElement || consumer instanceof TmplAstTemplate) {
            const host = this.getSymbol(consumer);
            return host !== null ? { kind: SymbolKind.DomBinding, host } : null;
        }
        const nodes = findAllMatchingNodes(this.typeCheckBlock, { withSpan: binding.sourceSpan, filter: isAssignment });
        const bindings = [];
        for (const node of nodes) {
            if (!isAccessExpression(node.left)) {
                continue;
            }
            const symbolInfo = this.getSymbolOfTsNode(node.left);
            if (symbolInfo === null || symbolInfo.tsSymbol === null) {
                continue;
            }
            const target = this.getDirectiveSymbolForAccessExpression(node.left, consumer);
            if (target === null) {
                continue;
            }
            bindings.push(Object.assign(Object.assign({}, symbolInfo), { tsSymbol: symbolInfo.tsSymbol, kind: SymbolKind.Binding, target }));
        }
        if (bindings.length === 0) {
            return null;
        }
        return { kind: SymbolKind.Input, bindings };
    }
    getDirectiveSymbolForAccessExpression(node, { isComponent, selector, isStructural }) {
        var _a;
        // In either case, `_t1["index"]` or `_t1.index`, `node.expression` is _t1.
        // The retrieved symbol for _t1 will be the variable declaration.
        const tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.expression);
        if (tsSymbol === undefined || tsSymbol.declarations.length === 0 || selector === null) {
            return null;
        }
        const [declaration] = tsSymbol.declarations;
        if (!ts.isVariableDeclaration(declaration) ||
            !hasExpressionIdentifier(
            // The expression identifier could be on the type (for regular directives) or the name
            // (for generic directives and the ctor op).
            declaration.getSourceFile(), (_a = declaration.type) !== null && _a !== void 0 ? _a : declaration.name, ExpressionIdentifier.DIRECTIVE)) {
            return null;
        }
        const symbol = this.getSymbolOfTsNode(declaration);
        if (symbol === null || symbol.tsSymbol === null ||
            symbol.tsSymbol.valueDeclaration === undefined ||
            !ts.isClassDeclaration(symbol.tsSymbol.valueDeclaration)) {
            return null;
        }
        const ngModule = this.getDirectiveModule(symbol.tsSymbol.valueDeclaration);
        return {
            kind: SymbolKind.Directive,
            tsSymbol: symbol.tsSymbol,
            tsType: symbol.tsType,
            shimLocation: symbol.shimLocation,
            isComponent,
            isStructural,
            selector,
            ngModule,
        };
    }
    getSymbolOfVariable(variable) {
        const node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: variable.sourceSpan, filter: ts.isVariableDeclaration });
        if (node === null || node.initializer === undefined) {
            return null;
        }
        const expressionSymbol = this.getSymbolOfTsNode(node.initializer);
        if (expressionSymbol === null) {
            return null;
        }
        return {
            tsType: expressionSymbol.tsType,
            tsSymbol: expressionSymbol.tsSymbol,
            initializerLocation: expressionSymbol.shimLocation,
            kind: SymbolKind.Variable,
            declaration: variable,
            localVarLocation: {
                shimPath: this.shimPath,
                positionInShimFile: this.getShimPositionForNode(node.name),
            }
        };
    }
    getSymbolOfReference(ref) {
        const target = this.templateData.boundTarget.getReferenceTarget(ref);
        // Find the node for the reference declaration, i.e. `var _t2 = _t1;`
        let node = findFirstMatchingNode(this.typeCheckBlock, { withSpan: ref.sourceSpan, filter: ts.isVariableDeclaration });
        if (node === null || target === null || node.initializer === undefined) {
            return null;
        }
        // Get the original declaration for the references variable, with the exception of template refs
        // which are of the form var _t3 = (_t2 as any as i2.TemplateRef<any>)
        // TODO(atscott): Consider adding an `ExpressionIdentifier` to tag variable declaration
        // initializers as invalid for symbol retrieval.
        const originalDeclaration = ts.isParenthesizedExpression(node.initializer) &&
            ts.isAsExpression(node.initializer.expression) ?
            this.getTypeChecker().getSymbolAtLocation(node.name) :
            this.getTypeChecker().getSymbolAtLocation(node.initializer);
        if (originalDeclaration === undefined || originalDeclaration.valueDeclaration === undefined) {
            return null;
        }
        const symbol = this.getSymbolOfTsNode(originalDeclaration.valueDeclaration);
        if (symbol === null || symbol.tsSymbol === null) {
            return null;
        }
        const referenceVarShimLocation = {
            shimPath: this.shimPath,
            positionInShimFile: this.getShimPositionForNode(node),
        };
        if (target instanceof TmplAstTemplate || target instanceof TmplAstElement) {
            return {
                kind: SymbolKind.Reference,
                tsSymbol: symbol.tsSymbol,
                tsType: symbol.tsType,
                target,
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
                kind: SymbolKind.Reference,
                tsSymbol: symbol.tsSymbol,
                tsType: symbol.tsType,
                declaration: ref,
                target: target.directive.ref.node,
                targetLocation: symbol.shimLocation,
                referenceVarLocation: referenceVarShimLocation,
            };
        }
    }
    getSymbolOfPipe(expression) {
        const methodAccess = findFirstMatchingNode(this.typeCheckBlock, { withSpan: expression.nameSpan, filter: ts.isPropertyAccessExpression });
        if (methodAccess === null) {
            return null;
        }
        const pipeVariableNode = methodAccess.expression;
        const pipeDeclaration = this.getTypeChecker().getSymbolAtLocation(pipeVariableNode);
        if (pipeDeclaration === undefined || pipeDeclaration.valueDeclaration === undefined) {
            return null;
        }
        const pipeInstance = this.getSymbolOfTsNode(pipeDeclaration.valueDeclaration);
        if (pipeInstance === null || pipeInstance.tsSymbol === null) {
            return null;
        }
        const symbolInfo = this.getSymbolOfTsNode(methodAccess);
        if (symbolInfo === null) {
            return null;
        }
        return Object.assign(Object.assign({ kind: SymbolKind.Pipe }, symbolInfo), { classSymbol: Object.assign(Object.assign({}, pipeInstance), { tsSymbol: pipeInstance.tsSymbol }) });
    }
    getSymbolOfTemplateExpression(expression) {
        if (expression instanceof ASTWithSource) {
            expression = expression.ast;
        }
        const expressionTarget = this.templateData.boundTarget.getExpressionTarget(expression);
        if (expressionTarget !== null) {
            return this.getSymbol(expressionTarget);
        }
        // The `name` part of a `PropertyWrite` and `MethodCall` does not have its own
        // AST so there is no way to retrieve a `Symbol` for just the `name` via a specific node.
        const withSpan = (expression instanceof PropertyWrite || expression instanceof MethodCall) ?
            expression.nameSpan :
            expression.sourceSpan;
        let node = findFirstMatchingNode(this.typeCheckBlock, { withSpan, filter: (n) => true });
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
        if ((expression instanceof SafePropertyRead || expression instanceof SafeMethodCall) &&
            ts.isConditionalExpression(node)) {
            const whenTrueSymbol = (expression instanceof SafeMethodCall && ts.isCallExpression(node.whenTrue)) ?
                this.getSymbolOfTsNode(node.whenTrue.expression) :
                this.getSymbolOfTsNode(node.whenTrue);
            if (whenTrueSymbol === null) {
                return null;
            }
            return Object.assign(Object.assign({}, whenTrueSymbol), { kind: SymbolKind.Expression, 
                // Rather than using the type of only the `whenTrue` part of the expression, we should
                // still get the type of the whole conditional expression to include `|undefined`.
                tsType: this.getTypeChecker().getTypeAtLocation(node) });
        }
        else {
            const symbolInfo = this.getSymbolOfTsNode(node);
            return symbolInfo === null ? null : Object.assign(Object.assign({}, symbolInfo), { kind: SymbolKind.Expression });
        }
    }
    getSymbolOfTsNode(node) {
        var _a;
        while (ts.isParenthesizedExpression(node)) {
            node = node.expression;
        }
        let tsSymbol;
        if (ts.isPropertyAccessExpression(node)) {
            tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.name);
        }
        else if (ts.isElementAccessExpression(node)) {
            tsSymbol = this.getTypeChecker().getSymbolAtLocation(node.argumentExpression);
        }
        else {
            tsSymbol = this.getTypeChecker().getSymbolAtLocation(node);
        }
        const positionInShimFile = this.getShimPositionForNode(node);
        const type = this.getTypeChecker().getTypeAtLocation(node);
        return {
            // If we could not find a symbol, fall back to the symbol on the type for the node.
            // Some nodes won't have a "symbol at location" but will have a symbol for the type.
            // Examples of this would be literals and `document.createElement('div')`.
            tsSymbol: (_a = tsSymbol !== null && tsSymbol !== void 0 ? tsSymbol : type.symbol) !== null && _a !== void 0 ? _a : null,
            tsType: type,
            shimLocation: { shimPath: this.shimPath, positionInShimFile },
        };
    }
    getShimPositionForNode(node) {
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
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBZSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaFIsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFLakMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZELE9BQU8sRUFBZ0wsVUFBVSxFQUErRSxNQUFNLFFBQVEsQ0FBQztBQUUvUixPQUFPLEVBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFdEgsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTdDOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFHeEIsWUFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO0lBQzNELDhGQUE4RjtJQUM5RiwrQkFBK0I7SUFDZCxjQUFvQztRQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztRQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBRzFDLG1CQUFjLEdBQWQs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QUFDLFFBQVEsRUFBRSxDQUFDO1NBQzlCO2FBQU0sSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQzdCO2FBQU0sSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0MsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDM0M7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3hCO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBBU1RXaXRoU291cmNlLCBCaW5kaW5nUGlwZSwgTWV0aG9kQ2FsbCwgUHJvcGVydHlXcml0ZSwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VGV4dEF0dHJpYnV0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXJ9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNBc3NpZ25tZW50fSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7QmluZGluZ1N5bWJvbCwgRGlyZWN0aXZlU3ltYm9sLCBEb21CaW5kaW5nU3ltYm9sLCBFbGVtZW50U3ltYm9sLCBFeHByZXNzaW9uU3ltYm9sLCBJbnB1dEJpbmRpbmdTeW1ib2wsIE91dHB1dEJpbmRpbmdTeW1ib2wsIFBpcGVTeW1ib2wsIFJlZmVyZW5jZVN5bWJvbCwgU2hpbUxvY2F0aW9uLCBTeW1ib2wsIFN5bWJvbEtpbmQsIFRlbXBsYXRlU3ltYm9sLCBUc05vZGVTeW1ib2xJbmZvLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVmFyaWFibGVTeW1ib2x9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGZpbmRBbGxNYXRjaGluZ05vZGVzLCBmaW5kRmlyc3RNYXRjaGluZ05vZGUsIGhhc0V4cHJlc3Npb25JZGVudGlmaWVyfSBmcm9tICcuL2NvbW1lbnRzJztcbmltcG9ydCB7VGVtcGxhdGVEYXRhfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtpc0FjY2Vzc0V4cHJlc3Npb259IGZyb20gJy4vdHNfdXRpbCc7XG5cbi8qKlxuICogR2VuZXJhdGVzIGFuZCBjYWNoZXMgYFN5bWJvbGBzIGZvciB2YXJpb3VzIHRlbXBsYXRlIHN0cnVjdHVyZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIFRoZSBgU3ltYm9sQnVpbGRlcmAgaW50ZXJuYWxseSBjYWNoZXMgdGhlIGBTeW1ib2xgcyBpdCBjcmVhdGVzLCBhbmQgbXVzdCBiZSBkZXN0cm95ZWQgYW5kXG4gKiByZXBsYWNlZCBpZiB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bWJvbEJ1aWxkZXIge1xuICBwcml2YXRlIHN5bWJvbENhY2hlID0gbmV3IE1hcDxBU1R8VG1wbEFzdE5vZGUsIFN5bWJvbHxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja0Jsb2NrOiB0cy5Ob2RlLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZURhdGE6IFRlbXBsYXRlRGF0YSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgLy8gVGhlIGB0cy5UeXBlQ2hlY2tlcmAgZGVwZW5kcyBvbiB0aGUgY3VycmVudCB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFuZCBzbyBtdXN0IGJlIHJlcXVlc3RlZFxuICAgICAgLy8gb24tZGVtYW5kIGluc3RlYWQgb2YgY2FjaGVkLlxuICAgICAgcHJpdmF0ZSByZWFkb25seSBnZXRUeXBlQ2hlY2tlcjogKCkgPT4gdHMuVHlwZUNoZWNrZXIsXG4gICkge31cblxuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFRlbXBsYXRlfFRtcGxBc3RFbGVtZW50KTogVGVtcGxhdGVTeW1ib2x8RWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2wobm9kZTogQVNUfFRtcGxBc3ROb2RlKTogU3ltYm9sfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBsZXQgc3ltYm9sOiBTeW1ib2x8bnVsbCA9IG51bGw7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUgfHwgbm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZXh0QXR0cmlidXRlKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnB1dCBhbmQgb3V0cHV0IGJpbmRpbmdzIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBkaXJlY3RpdmUgbWF0Y2ggYnV0IHNob3VsZFxuICAgICAgLy8gcmV0dXJuIGEgbGlzdCBvZiBiaW5kaW5ncyBmb3IgYWxsIG9mIHRoZW0uXG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mSW5wdXRCaW5kaW5nKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQm91bmRFdmVudChub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkVsZW1lbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mQXN0VGVtcGxhdGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVmFyaWFibGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlJlZmVyZW5jZShub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBCaW5kaW5nUGlwZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlBpcGUobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQVNUKSB7XG4gICAgICBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUbXBsQXN0Q29udGVudCwgVG1wbEFzdEljdVxuICAgIH1cblxuICAgIHRoaXMuc3ltYm9sQ2FjaGUuc2V0KG5vZGUsIHN5bWJvbCk7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZBc3RUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKTogVGVtcGxhdGVTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0aXZlcyA9IHRoaXMuZ2V0RGlyZWN0aXZlc09mTm9kZSh0ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLlRlbXBsYXRlLCBkaXJlY3RpdmVzLCB0ZW1wbGF0ZU5vZGU6IHRlbXBsYXRlfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZFbGVtZW50KGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50KTogRWxlbWVudFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBlbGVtZW50U291cmNlU3BhbiA9IGVsZW1lbnQuc3RhcnRTb3VyY2VTcGFuID8/IGVsZW1lbnQuc291cmNlU3BhbjtcblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgaWYgKHN5bWJvbEZyb21EZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBzeW1ib2xGcm9tRGVjbGFyYXRpb24udHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudCk7XG4gICAgLy8gQWxsIHN0YXRlbWVudHMgaW4gdGhlIFRDQiBhcmUgYEV4cHJlc3Npb25gcyB0aGF0IG9wdGlvbmFsbHkgaW5jbHVkZSBtb3JlIGluZm9ybWF0aW9uLlxuICAgIC8vIEFuIGBFbGVtZW50U3ltYm9sYCB1c2VzIHRoZSBpbmZvcm1hdGlvbiByZXR1cm5lZCBmb3IgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGV4cHJlc3Npb24sXG4gICAgLy8gYWRkcyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGVsZW1lbnQsIGFuZCB1cGRhdGVzIHRoZSBga2luZGAgdG8gYmUgYFN5bWJvbEtpbmQuRWxlbWVudGAuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnN5bWJvbEZyb21EZWNsYXJhdGlvbixcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZXMsXG4gICAgICB0ZW1wbGF0ZU5vZGU6IGVsZW1lbnQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlc09mTm9kZShlbGVtZW50OiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiBEaXJlY3RpdmVTeW1ib2xbXSB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG4gICAgY29uc3QgdGNiU291cmNlRmlsZSA9IHRoaXMudHlwZUNoZWNrQmxvY2suZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIGRpcmVjdGl2ZXMgY291bGQgYmUgZWl0aGVyOlxuICAgIC8vIC0gdmFyIF90MTogVGVzdERpciAvKlQ6RCovID0gKG51bGwhKTtcbiAgICAvLyAtIHZhciBfdDEgLypUOkQqLyA9IF9jdG9yMSh7fSk7XG4gICAgY29uc3QgaXNEaXJlY3RpdmVEZWNsYXJhdGlvbiA9IChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5UeXBlTm9kZXx0cy5JZGVudGlmaWVyID0+XG4gICAgICAgICh0cy5pc1R5cGVOb2RlKG5vZGUpIHx8IHRzLmlzSWRlbnRpZmllcihub2RlKSkgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUucGFyZW50KSAmJlxuICAgICAgICBoYXNFeHByZXNzaW9uSWRlbnRpZmllcih0Y2JTb3VyY2VGaWxlLCBub2RlLCBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpO1xuXG4gICAgY29uc3Qgbm9kZXMgPSBmaW5kQWxsTWF0Y2hpbmdOb2RlcyhcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBlbGVtZW50U291cmNlU3BhbiwgZmlsdGVyOiBpc0RpcmVjdGl2ZURlY2xhcmF0aW9ufSk7XG4gICAgcmV0dXJuIG5vZGVzXG4gICAgICAgIC5tYXAobm9kZSA9PiB7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLnBhcmVudCk7XG4gICAgICAgICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLmdldERpcmVjdGl2ZU1ldGEoZWxlbWVudCwgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YS5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50ID0gbWV0YS5pc0NvbXBvbmVudCA/PyBudWxsO1xuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbDogRGlyZWN0aXZlU3ltYm9sID0ge1xuICAgICAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBtZXRhLnNlbGVjdG9yLFxuICAgICAgICAgICAgaXNDb21wb25lbnQsXG4gICAgICAgICAgICBuZ01vZHVsZSxcbiAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgICAgICAgaXNTdHJ1Y3R1cmFsOiBtZXRhLmlzU3RydWN0dXJhbCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlTWV0YShcbiAgICAgIGhvc3Q6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGhvc3QpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoZXZlbnRCaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHMgaW4gdGhlIFRDQiBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAgLy8gKiBfdDFbXCJvdXRwdXRGaWVsZFwiXS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgLy8gKiBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtcbiAgICAvLyBFdmVuIHdpdGggc3RyaWN0IG51bGwgY2hlY2tzIGRpc2FibGVkLCB3ZSBzdGlsbCBwcm9kdWNlIHRoZSBhY2Nlc3MgYXMgYSBzZXBhcmF0ZSBzdGF0ZW1lbnRcbiAgICAvLyBzbyB0aGF0IGl0IGNhbiBiZSBmb3VuZCBoZXJlLlxuICAgIGxldCBleHBlY3RlZEFjY2Vzczogc3RyaW5nO1xuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCBjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBleHBlY3RlZEFjY2VzcyA9ICdhZGRFdmVudExpc3RlbmVyJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmluZGluZ1Byb3BlcnR5TmFtZXMgPSBjb25zdW1lci5vdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShldmVudEJpbmRpbmcubmFtZSk7XG4gICAgICBpZiAoYmluZGluZ1Byb3BlcnR5TmFtZXMgPT09IG51bGwgfHwgYmluZGluZ1Byb3BlcnR5TmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gTm90ZSB0aGF0IHdlIG9ubHkgZ2V0IHRoZSBleHBlY3RlZEFjY2VzcyB0ZXh0IGZyb20gYSBzaW5nbGUgY29uc3VtZXIgb2YgdGhlIGJpbmRpbmcuIElmXG4gICAgICAvLyB0aGVyZSBhcmUgbXVsdGlwbGUgY29uc3VtZXJzIChub3Qgc3VwcG9ydGVkIGluIHRoZSBgYm91bmRUYXJnZXRgIEFQSSkgYW5kIG9uZSBvZiB0aGVtIGhhc1xuICAgICAgLy8gYW4gYWxpYXMsIGl0IHdpbGwgbm90IGdldCBtYXRjaGVkIGhlcmUuXG4gICAgICBleHBlY3RlZEFjY2VzcyA9IGJpbmRpbmdQcm9wZXJ0eU5hbWVzWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlcihuOiB0cy5Ob2RlKTogbiBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ge1xuICAgICAgaWYgKCFpc0FjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIG4ubmFtZS5nZXRUZXh0KCkgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRzLmlzU3RyaW5nTGl0ZXJhbChuLmFyZ3VtZW50RXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIG4uYXJndW1lbnRFeHByZXNzaW9uLnRleHQgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBvdXRwdXRGaWVsZEFjY2Vzc2VzID1cbiAgICAgICAgZmluZEFsbE1hdGNoaW5nTm9kZXModGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBldmVudEJpbmRpbmcua2V5U3BhbiwgZmlsdGVyfSk7XG5cbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBvdXRwdXRGaWVsZEFjY2VzcyBvZiBvdXRwdXRGaWVsZEFjY2Vzc2VzKSB7XG4gICAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWRkRXZlbnRMaXN0ZW5lciA9IG91dHB1dEZpZWxkQWNjZXNzLm5hbWU7XG4gICAgICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24oYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHNTeW1ib2wgPVxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0cHV0RmllbGRBY2Nlc3MuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgICB0c1R5cGUsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLk91dHB1dCwgYmluZGluZ3N9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZklucHV0QmluZGluZyhiaW5kaW5nOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVG1wbEFzdFRleHRBdHRyaWJ1dGUpOiBJbnB1dEJpbmRpbmdTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGJpbmRpbmcpO1xuICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG4gICAgICByZXR1cm4gaG9zdCAhPT0gbnVsbCA/IHtraW5kOiBTeW1ib2xLaW5kLkRvbUJpbmRpbmcsIGhvc3R9IDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGJpbmRpbmcuc291cmNlU3BhbiwgZmlsdGVyOiBpc0Fzc2lnbm1lbnR9KTtcbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAoIWlzQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmxlZnQpO1xuICAgICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwgfHwgc3ltYm9sSW5mby50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCwgY29uc3VtZXIpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sSW5mby50c1N5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLklucHV0LCBiaW5kaW5nc307XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24oXG4gICAgICBub2RlOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbnx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICB7aXNDb21wb25lbnQsIHNlbGVjdG9yLCBpc1N0cnVjdHVyYWx9OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IERpcmVjdGl2ZVN5bWJvbHxudWxsIHtcbiAgICAvLyBJbiBlaXRoZXIgY2FzZSwgYF90MVtcImluZGV4XCJdYCBvciBgX3QxLmluZGV4YCwgYG5vZGUuZXhwcmVzc2lvbmAgaXMgX3QxLlxuICAgIC8vIFRoZSByZXRyaWV2ZWQgc3ltYm9sIGZvciBfdDEgd2lsbCBiZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkIHx8IHRzU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDAgfHwgc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IFtkZWNsYXJhdGlvbl0gPSB0c1N5bWJvbC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8XG4gICAgICAgICFoYXNFeHByZXNzaW9uSWRlbnRpZmllcihcbiAgICAgICAgICAgIC8vIFRoZSBleHByZXNzaW9uIGlkZW50aWZpZXIgY291bGQgYmUgb24gdGhlIHR5cGUgKGZvciByZWd1bGFyIGRpcmVjdGl2ZXMpIG9yIHRoZSBuYW1lXG4gICAgICAgICAgICAvLyAoZm9yIGdlbmVyaWMgZGlyZWN0aXZlcyBhbmQgdGhlIGN0b3Igb3ApLlxuICAgICAgICAgICAgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLCBkZWNsYXJhdGlvbi50eXBlID8/IGRlY2xhcmF0aW9uLm5hbWUsXG4gICAgICAgICAgICBFeHByZXNzaW9uSWRlbnRpZmllci5ESVJFQ1RJVkUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHN5bWJvbC50c1N5bWJvbCA9PT0gbnVsbCB8fFxuICAgICAgICBzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICF0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5EaXJlY3RpdmUsXG4gICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgaXNDb21wb25lbnQsXG4gICAgICBpc1N0cnVjdHVyYWwsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG5nTW9kdWxlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVmFyaWFibGUodmFyaWFibGU6IFRtcGxBc3RWYXJpYWJsZSk6IFZhcmlhYmxlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogdmFyaWFibGUuc291cmNlU3BhbiwgZmlsdGVyOiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb259KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cHJlc3Npb25TeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgIGlmIChleHByZXNzaW9uU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdHNUeXBlOiBleHByZXNzaW9uU3ltYm9sLnRzVHlwZSxcbiAgICAgIHRzU3ltYm9sOiBleHByZXNzaW9uU3ltYm9sLnRzU3ltYm9sLFxuICAgICAgaW5pdGlhbGl6ZXJMb2NhdGlvbjogZXhwcmVzc2lvblN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICBraW5kOiBTeW1ib2xLaW5kLlZhcmlhYmxlLFxuICAgICAgZGVjbGFyYXRpb246IHZhcmlhYmxlLFxuICAgICAgbG9jYWxWYXJMb2NhdGlvbjoge1xuICAgICAgICBzaGltUGF0aDogdGhpcy5zaGltUGF0aCxcbiAgICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZS5uYW1lKSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlJlZmVyZW5jZShyZWY6IFRtcGxBc3RSZWZlcmVuY2UpOiBSZWZlcmVuY2VTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0UmVmZXJlbmNlVGFyZ2V0KHJlZik7XG4gICAgLy8gRmluZCB0aGUgbm9kZSBmb3IgdGhlIHJlZmVyZW5jZSBkZWNsYXJhdGlvbiwgaS5lLiBgdmFyIF90MiA9IF90MTtgXG4gICAgbGV0IG5vZGUgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogcmVmLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgdGFyZ2V0ID09PSBudWxsIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBmb3IgdGhlIHJlZmVyZW5jZXMgdmFyaWFibGUsIHdpdGggdGhlIGV4Y2VwdGlvbiBvZiB0ZW1wbGF0ZSByZWZzXG4gICAgLy8gd2hpY2ggYXJlIG9mIHRoZSBmb3JtIHZhciBfdDMgPSAoX3QyIGFzIGFueSBhcyBpMi5UZW1wbGF0ZVJlZjxhbnk+KVxuICAgIC8vIFRPRE8oYXRzY290dCk6IENvbnNpZGVyIGFkZGluZyBhbiBgRXhwcmVzc2lvbklkZW50aWZpZXJgIHRvIHRhZyB2YXJpYWJsZSBkZWNsYXJhdGlvblxuICAgIC8vIGluaXRpYWxpemVycyBhcyBpbnZhbGlkIGZvciBzeW1ib2wgcmV0cmlldmFsLlxuICAgIGNvbnN0IG9yaWdpbmFsRGVjbGFyYXRpb24gPSB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUuaW5pdGlhbGl6ZXIpICYmXG4gICAgICAgICAgICB0cy5pc0FzRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyLmV4cHJlc3Npb24pID9cbiAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5uYW1lKSA6XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgIGlmIChvcmlnaW5hbERlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgb3JpZ2luYWxEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCA9PT0gbnVsbCB8fCBzeW1ib2wudHNTeW1ib2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uID0ge1xuICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICBwb3NpdGlvbkluU2hpbUZpbGU6IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKSxcbiAgICB9O1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgdGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIHRhcmdldCxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5SZWZlcmVuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBzeW1ib2wudHNTeW1ib2wsXG4gICAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgICAgZGVjbGFyYXRpb246IHJlZixcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgICB0YXJnZXRMb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgICAgcmVmZXJlbmNlVmFyTG9jYXRpb246IHJlZmVyZW5jZVZhclNoaW1Mb2NhdGlvbixcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlBpcGUoZXhwcmVzc2lvbjogQmluZGluZ1BpcGUpOiBQaXBlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IG1ldGhvZEFjY2VzcyA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jayxcbiAgICAgICAge3dpdGhTcGFuOiBleHByZXNzaW9uLm5hbWVTcGFuLCBmaWx0ZXI6IHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufSk7XG4gICAgaWYgKG1ldGhvZEFjY2VzcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZVZhcmlhYmxlTm9kZSA9IG1ldGhvZEFjY2Vzcy5leHByZXNzaW9uO1xuICAgIGNvbnN0IHBpcGVEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKHBpcGVWYXJpYWJsZU5vZGUpO1xuICAgIGlmIChwaXBlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBwaXBlRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwaXBlSW5zdGFuY2UgPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKHBpcGVEZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICBpZiAocGlwZUluc3RhbmNlID09PSBudWxsIHx8IHBpcGVJbnN0YW5jZS50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobWV0aG9kQWNjZXNzKTtcbiAgICBpZiAoc3ltYm9sSW5mbyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUGlwZSxcbiAgICAgIC4uLnN5bWJvbEluZm8sXG4gICAgICBjbGFzc1N5bWJvbDoge1xuICAgICAgICAuLi5waXBlSW5zdGFuY2UsXG4gICAgICAgIHRzU3ltYm9sOiBwaXBlSW5zdGFuY2UudHNTeW1ib2wsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVGVtcGxhdGVFeHByZXNzaW9uKGV4cHJlc3Npb246IEFTVCk6IFZhcmlhYmxlU3ltYm9sfFJlZmVyZW5jZVN5bWJvbFxuICAgICAgfEV4cHJlc3Npb25TeW1ib2x8bnVsbCB7XG4gICAgaWYgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBBU1RXaXRoU291cmNlKSB7XG4gICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5hc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwcmVzc2lvblRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoZXhwcmVzc2lvbik7XG4gICAgaWYgKGV4cHJlc3Npb25UYXJnZXQgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbChleHByZXNzaW9uVGFyZ2V0KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgYG5hbWVgIHBhcnQgb2YgYSBgUHJvcGVydHlXcml0ZWAgYW5kIGBNZXRob2RDYWxsYCBkb2VzIG5vdCBoYXZlIGl0cyBvd25cbiAgICAvLyBBU1Qgc28gdGhlcmUgaXMgbm8gd2F5IHRvIHJldHJpZXZlIGEgYFN5bWJvbGAgZm9yIGp1c3QgdGhlIGBuYW1lYCB2aWEgYSBzcGVjaWZpYyBub2RlLlxuICAgIGNvbnN0IHdpdGhTcGFuID0gKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBQcm9wZXJ0eVdyaXRlIHx8IGV4cHJlc3Npb24gaW5zdGFuY2VvZiBNZXRob2RDYWxsKSA/XG4gICAgICAgIGV4cHJlc3Npb24ubmFtZVNwYW4gOlxuICAgICAgICBleHByZXNzaW9uLnNvdXJjZVNwYW47XG5cbiAgICBsZXQgbm9kZSA9IGZpbmRGaXJzdE1hdGNoaW5nTm9kZShcbiAgICAgICAgdGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuLCBmaWx0ZXI6IChuOiB0cy5Ob2RlKTogbiBpcyB0cy5Ob2RlID0+IHRydWV9KTtcbiAgICBpZiAobm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gLSBJZiB3ZSBoYXZlIHNhZmUgcHJvcGVydHkgcmVhZCAoXCJhPy5iXCIpIHdlIHdhbnQgdG8gZ2V0IHRoZSBTeW1ib2wgZm9yIGIsIHRoZSBgd2hlblRydWVgXG4gICAgLy8gZXhwcmVzc2lvbi5cbiAgICAvLyAtIElmIG91ciBleHByZXNzaW9uIGlzIGEgcGlwZSBiaW5kaW5nIChcImEgfCB0ZXN0OmI6Y1wiKSwgd2Ugd2FudCB0aGUgU3ltYm9sIGZvciB0aGVcbiAgICAvLyBgdHJhbnNmb3JtYCBvbiB0aGUgcGlwZS5cbiAgICAvLyAtIE90aGVyd2lzZSwgd2UgcmV0cmlldmUgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgaXRzZWxmIHdpdGggbm8gc3BlY2lhbCBjb25zaWRlcmF0aW9uc1xuICAgIGlmICgoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVQcm9wZXJ0eVJlYWQgfHwgZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFNhZmVNZXRob2RDYWxsKSAmJlxuICAgICAgICB0cy5pc0NvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgY29uc3Qgd2hlblRydWVTeW1ib2wgPVxuICAgICAgICAgIChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlLndoZW5UcnVlKSkgP1xuICAgICAgICAgIHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS53aGVuVHJ1ZS5leHByZXNzaW9uKSA6XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlKTtcbiAgICAgIGlmICh3aGVuVHJ1ZVN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4ud2hlblRydWVTeW1ib2wsXG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbixcbiAgICAgICAgLy8gUmF0aGVyIHRoYW4gdXNpbmcgdGhlIHR5cGUgb2Ygb25seSB0aGUgYHdoZW5UcnVlYCBwYXJ0IG9mIHRoZSBleHByZXNzaW9uLCB3ZSBzaG91bGRcbiAgICAgICAgLy8gc3RpbGwgZ2V0IHRoZSB0eXBlIG9mIHRoZSB3aG9sZSBjb25kaXRpb25hbCBleHByZXNzaW9uIHRvIGluY2x1ZGUgYHx1bmRlZmluZWRgLlxuICAgICAgICB0c1R5cGU6IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihub2RlKVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3ltYm9sSW5mbyA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZSk7XG4gICAgICByZXR1cm4gc3ltYm9sSW5mbyA9PT0gbnVsbCA/IG51bGwgOiB7Li4uc3ltYm9sSW5mbywga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9ufTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mVHNOb2RlKG5vZGU6IHRzLk5vZGUpOiBUc05vZGVTeW1ib2xJbmZvfG51bGwge1xuICAgIHdoaWxlICh0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5leHByZXNzaW9uO1xuICAgIH1cblxuICAgIGxldCB0c1N5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZDtcbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5uYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZS5hcmd1bWVudEV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0c1N5bWJvbCA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlKTtcbiAgICBjb25zdCB0eXBlID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpO1xuICAgIHJldHVybiB7XG4gICAgICAvLyBJZiB3ZSBjb3VsZCBub3QgZmluZCBhIHN5bWJvbCwgZmFsbCBiYWNrIHRvIHRoZSBzeW1ib2wgb24gdGhlIHR5cGUgZm9yIHRoZSBub2RlLlxuICAgICAgLy8gU29tZSBub2RlcyB3b24ndCBoYXZlIGEgXCJzeW1ib2wgYXQgbG9jYXRpb25cIiBidXQgd2lsbCBoYXZlIGEgc3ltYm9sIGZvciB0aGUgdHlwZS5cbiAgICAgIC8vIEV4YW1wbGVzIG9mIHRoaXMgd291bGQgYmUgbGl0ZXJhbHMgYW5kIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKWAuXG4gICAgICB0c1N5bWJvbDogdHNTeW1ib2wgPz8gdHlwZS5zeW1ib2wgPz8gbnVsbCxcbiAgICAgIHRzVHlwZTogdHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZTogdHMuTm9kZSk6IG51bWJlciB7XG4gICAgaWYgKHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZS50eXBlTmFtZSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1F1YWxpZmllZE5hbWUobm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlLnJpZ2h0LmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUubmFtZS5nZXRTdGFydCgpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUuYXJndW1lbnRFeHByZXNzaW9uLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBub2RlLmdldFN0YXJ0KCk7XG4gICAgfVxuICB9XG59XG4iXX0=