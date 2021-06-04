/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AST, ASTWithSource, BindingPipe, MethodCall, PropertyWrite, SafeMethodCall, SafePropertyRead, TmplAstBoundAttribute, TmplAstBoundEvent, TmplAstElement, TmplAstReference, TmplAstTemplate, TmplAstTextAttribute, TmplAstVariable } from '@angular/compiler';
import * as ts from 'typescript';
import { isAssignment, isSymbolWithValueDeclaration } from '../../util/src/typescript';
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
            if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) ||
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
        if ((tsSymbol === null || tsSymbol === void 0 ? void 0 : tsSymbol.declarations) === undefined || tsSymbol.declarations.length === 0 ||
            selector === null) {
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
        if (symbol === null || !isSymbolWithValueDeclaration(symbol.tsSymbol) ||
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
        // The instance should never be null, nor should the symbol lack a value declaration. This
        // is because the node used to look for the `pipeInstance` symbol info is a value
        // declaration of another symbol (i.e. the `pipeDeclaration` symbol).
        if (pipeInstance === null || !isSymbolWithValueDeclaration(pipeInstance.tsSymbol)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBZSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaFIsT0FBTyxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFLakMsT0FBTyxFQUFDLFlBQVksRUFBRSw0QkFBNEIsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3JGLE9BQU8sRUFBZ0wsVUFBVSxFQUErRSxNQUFNLFFBQVEsQ0FBQztBQUUvUixPQUFPLEVBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFdEgsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTdDOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFHeEIsWUFDcUIsUUFBd0IsRUFDeEIsY0FBdUIsRUFDdkIsWUFBMEIsRUFDMUIsb0JBQTBDO0lBQzNELDhGQUE4RjtJQUM5RiwrQkFBK0I7SUFDZCxjQUFvQztRQU5wQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixtQkFBYyxHQUFkLGNBQWMsQ0FBUztRQUN2QixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMxQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBRzFD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Q0FBQyxFQUFFO1lBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUM5QjthQUFNLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUM3QjthQUFNLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQzNDO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUN4QjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQVNUV2l0aFNvdXJjZSwgQmluZGluZ1BpcGUsIE1ldGhvZENhbGwsIFByb3BlcnR5V3JpdGUsIFNhZmVNZXRob2RDYWxsLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUsIFRtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFRleHRBdHRyaWJ1dGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2lzQXNzaWdubWVudCwgaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0JpbmRpbmdTeW1ib2wsIERpcmVjdGl2ZVN5bWJvbCwgRG9tQmluZGluZ1N5bWJvbCwgRWxlbWVudFN5bWJvbCwgRXhwcmVzc2lvblN5bWJvbCwgSW5wdXRCaW5kaW5nU3ltYm9sLCBPdXRwdXRCaW5kaW5nU3ltYm9sLCBQaXBlU3ltYm9sLCBSZWZlcmVuY2VTeW1ib2wsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBTeW1ib2xLaW5kLCBUZW1wbGF0ZVN5bWJvbCwgVHNOb2RlU3ltYm9sSW5mbywgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGEsIFZhcmlhYmxlU3ltYm9sfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0V4cHJlc3Npb25JZGVudGlmaWVyLCBmaW5kQWxsTWF0Y2hpbmdOb2RlcywgZmluZEZpcnN0TWF0Y2hpbmdOb2RlLCBoYXNFeHByZXNzaW9uSWRlbnRpZmllcn0gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge1RlbXBsYXRlRGF0YX0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7aXNBY2Nlc3NFeHByZXNzaW9ufSBmcm9tICcuL3RzX3V0aWwnO1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhbmQgY2FjaGVzIGBTeW1ib2xgcyBmb3IgdmFyaW91cyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVzIGZvciBhIGdpdmVuIGNvbXBvbmVudC5cbiAqXG4gKiBUaGUgYFN5bWJvbEJ1aWxkZXJgIGludGVybmFsbHkgY2FjaGVzIHRoZSBgU3ltYm9sYHMgaXQgY3JlYXRlcywgYW5kIG11c3QgYmUgZGVzdHJveWVkIGFuZFxuICogcmVwbGFjZWQgaWYgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIGNoYW5nZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW1ib2xCdWlsZGVyIHtcbiAgcHJpdmF0ZSBzeW1ib2xDYWNoZSA9IG5ldyBNYXA8QVNUfFRtcGxBc3ROb2RlLCBTeW1ib2x8bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tCbG9jazogdHMuTm9kZSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVEYXRhOiBUZW1wbGF0ZURhdGEsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNvbXBvbmVudFNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlcixcbiAgICAgIC8vIFRoZSBgdHMuVHlwZUNoZWNrZXJgIGRlcGVuZHMgb24gdGhlIGN1cnJlbnQgdHlwZS1jaGVja2luZyBwcm9ncmFtLCBhbmQgc28gbXVzdCBiZSByZXF1ZXN0ZWRcbiAgICAgIC8vIG9uLWRlbWFuZCBpbnN0ZWFkIG9mIGNhY2hlZC5cbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZ2V0VHlwZUNoZWNrZXI6ICgpID0+IHRzLlR5cGVDaGVja2VyLFxuICApIHt9XG5cbiAgZ2V0U3ltYm9sKG5vZGU6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCk6IFRlbXBsYXRlU3ltYm9sfEVsZW1lbnRTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlKTogUmVmZXJlbmNlU3ltYm9sfFZhcmlhYmxlU3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbChub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IFN5bWJvbHxudWxsIHtcbiAgICBpZiAodGhpcy5zeW1ib2xDYWNoZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN5bWJvbENhY2hlLmdldChub2RlKSE7XG4gICAgfVxuXG4gICAgbGV0IHN5bWJvbDogU3ltYm9sfG51bGwgPSBudWxsO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEJvdW5kQXR0cmlidXRlIHx8IG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGV4dEF0dHJpYnV0ZSkge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogaW5wdXQgYW5kIG91dHB1dCBiaW5kaW5ncyBvbmx5IHJldHVybiB0aGUgZmlyc3QgZGlyZWN0aXZlIG1hdGNoIGJ1dCBzaG91bGRcbiAgICAgIC8vIHJldHVybiBhIGxpc3Qgb2YgYmluZGluZ3MgZm9yIGFsbCBvZiB0aGVtLlxuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZklucHV0QmluZGluZyhub2RlKTtcbiAgICB9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkJvdW5kRXZlbnQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZFbGVtZW50KG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZkFzdFRlbXBsYXRlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RWYXJpYWJsZSkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlZhcmlhYmxlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RSZWZlcmVuY2UpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZSZWZlcmVuY2Uobm9kZSk7XG4gICAgfSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgQmluZGluZ1BpcGUpIHtcbiAgICAgIHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZQaXBlKG5vZGUpO1xuICAgIH0gZWxzZSBpZiAobm9kZSBpbnN0YW5jZW9mIEFTVCkge1xuICAgICAgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRlbXBsYXRlRXhwcmVzc2lvbihub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVG1wbEFzdENvbnRlbnQsIFRtcGxBc3RJY3VcbiAgICB9XG5cbiAgICB0aGlzLnN5bWJvbENhY2hlLnNldChub2RlLCBzeW1ib2wpO1xuICAgIHJldHVybiBzeW1ib2w7XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mQXN0VGVtcGxhdGUodGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSk6IFRlbXBsYXRlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLmdldERpcmVjdGl2ZXNPZk5vZGUodGVtcGxhdGUpO1xuICAgIHJldHVybiB7a2luZDogU3ltYm9sS2luZC5UZW1wbGF0ZSwgZGlyZWN0aXZlcywgdGVtcGxhdGVOb2RlOiB0ZW1wbGF0ZX07XG4gIH1cblxuICBwcml2YXRlIGdldFN5bWJvbE9mRWxlbWVudChlbGVtZW50OiBUbXBsQXN0RWxlbWVudCk6IEVsZW1lbnRTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgZWxlbWVudFNvdXJjZVNwYW4gPSBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiA/PyBlbGVtZW50LnNvdXJjZVNwYW47XG5cbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGVsZW1lbnRTb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xGcm9tRGVjbGFyYXRpb24gPSB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUpO1xuICAgIGlmIChzeW1ib2xGcm9tRGVjbGFyYXRpb24gPT09IG51bGwgfHwgc3ltYm9sRnJvbURlY2xhcmF0aW9uLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVzID0gdGhpcy5nZXREaXJlY3RpdmVzT2ZOb2RlKGVsZW1lbnQpO1xuICAgIC8vIEFsbCBzdGF0ZW1lbnRzIGluIHRoZSBUQ0IgYXJlIGBFeHByZXNzaW9uYHMgdGhhdCBvcHRpb25hbGx5IGluY2x1ZGUgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAvLyBBbiBgRWxlbWVudFN5bWJvbGAgdXNlcyB0aGUgaW5mb3JtYXRpb24gcmV0dXJuZWQgZm9yIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBleHByZXNzaW9uLFxuICAgIC8vIGFkZHMgdGhlIGRpcmVjdGl2ZXMgZm9yIHRoZSBlbGVtZW50LCBhbmQgdXBkYXRlcyB0aGUgYGtpbmRgIHRvIGJlIGBTeW1ib2xLaW5kLkVsZW1lbnRgLlxuICAgIHJldHVybiB7XG4gICAgICAuLi5zeW1ib2xGcm9tRGVjbGFyYXRpb24sXG4gICAgICBraW5kOiBTeW1ib2xLaW5kLkVsZW1lbnQsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgICAgdGVtcGxhdGVOb2RlOiBlbGVtZW50LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZXNPZk5vZGUoZWxlbWVudDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogRGlyZWN0aXZlU3ltYm9sW10ge1xuICAgIGNvbnN0IGVsZW1lbnRTb3VyY2VTcGFuID0gZWxlbWVudC5zdGFydFNvdXJjZVNwYW4gPz8gZWxlbWVudC5zb3VyY2VTcGFuO1xuICAgIGNvbnN0IHRjYlNvdXJjZUZpbGUgPSB0aGlzLnR5cGVDaGVja0Jsb2NrLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBkaXJlY3RpdmVzIGNvdWxkIGJlIGVpdGhlcjpcbiAgICAvLyAtIHZhciBfdDE6IFRlc3REaXIgLypUOkQqLyA9IChudWxsISk7XG4gICAgLy8gLSB2YXIgX3QxIC8qVDpEKi8gPSBfY3RvcjEoe30pO1xuICAgIGNvbnN0IGlzRGlyZWN0aXZlRGVjbGFyYXRpb24gPSAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuVHlwZU5vZGV8dHMuSWRlbnRpZmllciA9PlxuICAgICAgICAodHMuaXNUeXBlTm9kZShub2RlKSB8fCB0cy5pc0lkZW50aWZpZXIobm9kZSkpICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgJiZcbiAgICAgICAgaGFzRXhwcmVzc2lvbklkZW50aWZpZXIodGNiU291cmNlRmlsZSwgbm9kZSwgRXhwcmVzc2lvbklkZW50aWZpZXIuRElSRUNUSVZFKTtcblxuICAgIGNvbnN0IG5vZGVzID0gZmluZEFsbE1hdGNoaW5nTm9kZXMoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssIHt3aXRoU3BhbjogZWxlbWVudFNvdXJjZVNwYW4sIGZpbHRlcjogaXNEaXJlY3RpdmVEZWNsYXJhdGlvbn0pO1xuICAgIHJldHVybiBub2Rlc1xuICAgICAgICAubWFwKG5vZGUgPT4ge1xuICAgICAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUobm9kZS5wYXJlbnQpO1xuICAgICAgICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sKSB8fFxuICAgICAgICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLmdldERpcmVjdGl2ZU1ldGEoZWxlbWVudCwgc3ltYm9sLnRzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChtZXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuZ2V0RGlyZWN0aXZlTW9kdWxlKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAobWV0YS5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGlzQ29tcG9uZW50ID0gbWV0YS5pc0NvbXBvbmVudCA/PyBudWxsO1xuICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZVN5bWJvbDogRGlyZWN0aXZlU3ltYm9sID0ge1xuICAgICAgICAgICAgLi4uc3ltYm9sLFxuICAgICAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBtZXRhLnNlbGVjdG9yLFxuICAgICAgICAgICAgaXNDb21wb25lbnQsXG4gICAgICAgICAgICBuZ01vZHVsZSxcbiAgICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgICAgICAgaXNTdHJ1Y3R1cmFsOiBtZXRhLmlzU3RydWN0dXJhbCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaXJlY3RpdmVTeW1ib2w7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoKGQpOiBkIGlzIERpcmVjdGl2ZVN5bWJvbCA9PiBkICE9PSBudWxsKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGlyZWN0aXZlTWV0YShcbiAgICAgIGhvc3Q6IFRtcGxBc3RUZW1wbGF0ZXxUbXBsQXN0RWxlbWVudCxcbiAgICAgIGRpcmVjdGl2ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSB0aGlzLnRlbXBsYXRlRGF0YS5ib3VuZFRhcmdldC5nZXREaXJlY3RpdmVzT2ZOb2RlKGhvc3QpO1xuICAgIGlmIChkaXJlY3RpdmVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlcy5maW5kKG0gPT4gbS5yZWYubm9kZSA9PT0gZGlyZWN0aXZlRGVjbGFyYXRpb24pID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZU1vZHVsZShkZWNsYXJhdGlvbjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRlY2xhcmF0aW9uIGFzIENsYXNzRGVjbGFyYXRpb24pO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzY29wZS5uZ01vZHVsZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZCb3VuZEV2ZW50KGV2ZW50QmluZGluZzogVG1wbEFzdEJvdW5kRXZlbnQpOiBPdXRwdXRCaW5kaW5nU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0Q29uc3VtZXJPZkJpbmRpbmcoZXZlbnRCaW5kaW5nKTtcbiAgICBpZiAoY29uc3VtZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHMgaW4gdGhlIFRDQiBsb29rIGxpa2Ugb25lIG9mIHRoZSB0d286XG4gICAgLy8gKiBfdDFbXCJvdXRwdXRGaWVsZFwiXS5zdWJzY3JpYmUoaGFuZGxlcik7XG4gICAgLy8gKiBfdDEuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyKTtcbiAgICAvLyBFdmVuIHdpdGggc3RyaWN0IG51bGwgY2hlY2tzIGRpc2FibGVkLCB3ZSBzdGlsbCBwcm9kdWNlIHRoZSBhY2Nlc3MgYXMgYSBzZXBhcmF0ZSBzdGF0ZW1lbnRcbiAgICAvLyBzbyB0aGF0IGl0IGNhbiBiZSBmb3VuZCBoZXJlLlxuICAgIGxldCBleHBlY3RlZEFjY2Vzczogc3RyaW5nO1xuICAgIGlmIChjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSB8fCBjb25zdW1lciBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICBleHBlY3RlZEFjY2VzcyA9ICdhZGRFdmVudExpc3RlbmVyJztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYmluZGluZ1Byb3BlcnR5TmFtZXMgPSBjb25zdW1lci5vdXRwdXRzLmdldEJ5QmluZGluZ1Byb3BlcnR5TmFtZShldmVudEJpbmRpbmcubmFtZSk7XG4gICAgICBpZiAoYmluZGluZ1Byb3BlcnR5TmFtZXMgPT09IG51bGwgfHwgYmluZGluZ1Byb3BlcnR5TmFtZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gTm90ZSB0aGF0IHdlIG9ubHkgZ2V0IHRoZSBleHBlY3RlZEFjY2VzcyB0ZXh0IGZyb20gYSBzaW5nbGUgY29uc3VtZXIgb2YgdGhlIGJpbmRpbmcuIElmXG4gICAgICAvLyB0aGVyZSBhcmUgbXVsdGlwbGUgY29uc3VtZXJzIChub3Qgc3VwcG9ydGVkIGluIHRoZSBgYm91bmRUYXJnZXRgIEFQSSkgYW5kIG9uZSBvZiB0aGVtIGhhc1xuICAgICAgLy8gYW4gYWxpYXMsIGl0IHdpbGwgbm90IGdldCBtYXRjaGVkIGhlcmUuXG4gICAgICBleHBlY3RlZEFjY2VzcyA9IGJpbmRpbmdQcm9wZXJ0eU5hbWVzWzBdLmNsYXNzUHJvcGVydHlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlcihuOiB0cy5Ob2RlKTogbiBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ge1xuICAgICAgaWYgKCFpc0FjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obikpIHtcbiAgICAgICAgcmV0dXJuIG4ubmFtZS5nZXRUZXh0KCkgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRzLmlzU3RyaW5nTGl0ZXJhbChuLmFyZ3VtZW50RXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIG4uYXJndW1lbnRFeHByZXNzaW9uLnRleHQgPT09IGV4cGVjdGVkQWNjZXNzO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBvdXRwdXRGaWVsZEFjY2Vzc2VzID1cbiAgICAgICAgZmluZEFsbE1hdGNoaW5nTm9kZXModGhpcy50eXBlQ2hlY2tCbG9jaywge3dpdGhTcGFuOiBldmVudEJpbmRpbmcua2V5U3BhbiwgZmlsdGVyfSk7XG5cbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBvdXRwdXRGaWVsZEFjY2VzcyBvZiBvdXRwdXRGaWVsZEFjY2Vzc2VzKSB7XG4gICAgICBpZiAoY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCkge1xuICAgICAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWRkRXZlbnRMaXN0ZW5lciA9IG91dHB1dEZpZWxkQWNjZXNzLm5hbWU7XG4gICAgICAgIGNvbnN0IHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24oYWRkRXZlbnRMaXN0ZW5lcik7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihhZGRFdmVudExpc3RlbmVyKTtcbiAgICAgICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKGFkZEV2ZW50TGlzdGVuZXIpO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG5cbiAgICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBiaW5kaW5ncy5wdXNoKHtcbiAgICAgICAgICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmcsXG4gICAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgICAgdHNUeXBlLFxuICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICBzaGltTG9jYXRpb246IHtzaGltUGF0aDogdGhpcy5zaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfSxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ob3V0cHV0RmllbGRBY2Nlc3MpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHNTeW1ib2wgPVxuICAgICAgICAgICAgdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0cHV0RmllbGRBY2Nlc3MuYXJndW1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG91dHB1dEZpZWxkQWNjZXNzLCBjb25zdW1lcik7XG4gICAgICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uSW5TaGltRmlsZSA9IHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGNvbnN0IHRzVHlwZSA9IHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRUeXBlQXRMb2NhdGlvbihvdXRwdXRGaWVsZEFjY2Vzcyk7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZyxcbiAgICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgICB0c1R5cGUsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIHNoaW1Mb2NhdGlvbjoge3NoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLk91dHB1dCwgYmluZGluZ3N9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZklucHV0QmluZGluZyhiaW5kaW5nOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGV8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVG1wbEFzdFRleHRBdHRyaWJ1dGUpOiBJbnB1dEJpbmRpbmdTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxudWxsIHtcbiAgICBjb25zdCBjb25zdW1lciA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldENvbnN1bWVyT2ZCaW5kaW5nKGJpbmRpbmcpO1xuICAgIGlmIChjb25zdW1lciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGNvbnN1bWVyIGluc3RhbmNlb2YgVG1wbEFzdEVsZW1lbnQgfHwgY29uc3VtZXIgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSB0aGlzLmdldFN5bWJvbChjb25zdW1lcik7XG4gICAgICByZXR1cm4gaG9zdCAhPT0gbnVsbCA/IHtraW5kOiBTeW1ib2xLaW5kLkRvbUJpbmRpbmcsIGhvc3R9IDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlcyA9IGZpbmRBbGxNYXRjaGluZ05vZGVzKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IGJpbmRpbmcuc291cmNlU3BhbiwgZmlsdGVyOiBpc0Fzc2lnbm1lbnR9KTtcbiAgICBjb25zdCBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBpZiAoIWlzQWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmxlZnQpO1xuICAgICAgaWYgKHN5bWJvbEluZm8gPT09IG51bGwgfHwgc3ltYm9sSW5mby50c1N5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5nZXREaXJlY3RpdmVTeW1ib2xGb3JBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCwgY29uc3VtZXIpO1xuICAgICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGJpbmRpbmdzLnB1c2goe1xuICAgICAgICAuLi5zeW1ib2xJbmZvLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sSW5mby50c1N5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5CaW5kaW5nLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGJpbmRpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtraW5kOiBTeW1ib2xLaW5kLklucHV0LCBiaW5kaW5nc307XG4gIH1cblxuICBwcml2YXRlIGdldERpcmVjdGl2ZVN5bWJvbEZvckFjY2Vzc0V4cHJlc3Npb24oXG4gICAgICBub2RlOiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbnx0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24sXG4gICAgICB7aXNDb21wb25lbnQsIHNlbGVjdG9yLCBpc1N0cnVjdHVyYWx9OiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSk6IERpcmVjdGl2ZVN5bWJvbHxudWxsIHtcbiAgICAvLyBJbiBlaXRoZXIgY2FzZSwgYF90MVtcImluZGV4XCJdYCBvciBgX3QxLmluZGV4YCwgYG5vZGUuZXhwcmVzc2lvbmAgaXMgX3QxLlxuICAgIC8vIFRoZSByZXRyaWV2ZWQgc3ltYm9sIGZvciBfdDEgd2lsbCBiZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuICAgIGlmICh0c1N5bWJvbD8uZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQgfHwgdHNTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICBzZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgW2RlY2xhcmF0aW9uXSA9IHRzU3ltYm9sLmRlY2xhcmF0aW9ucztcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHxcbiAgICAgICAgIWhhc0V4cHJlc3Npb25JZGVudGlmaWVyKFxuICAgICAgICAgICAgLy8gVGhlIGV4cHJlc3Npb24gaWRlbnRpZmllciBjb3VsZCBiZSBvbiB0aGUgdHlwZSAoZm9yIHJlZ3VsYXIgZGlyZWN0aXZlcykgb3IgdGhlIG5hbWVcbiAgICAgICAgICAgIC8vIChmb3IgZ2VuZXJpYyBkaXJlY3RpdmVzIGFuZCB0aGUgY3RvciBvcCkuXG4gICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCksIGRlY2xhcmF0aW9uLnR5cGUgPz8gZGVjbGFyYXRpb24ubmFtZSxcbiAgICAgICAgICAgIEV4cHJlc3Npb25JZGVudGlmaWVyLkRJUkVDVElWRSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0U3ltYm9sT2ZUc05vZGUoZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24oc3ltYm9sLnRzU3ltYm9sKSB8fFxuICAgICAgICAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN5bWJvbC50c1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmdldERpcmVjdGl2ZU1vZHVsZShzeW1ib2wudHNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuRGlyZWN0aXZlLFxuICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgIHRzVHlwZTogc3ltYm9sLnRzVHlwZSxcbiAgICAgIHNoaW1Mb2NhdGlvbjogc3ltYm9sLnNoaW1Mb2NhdGlvbixcbiAgICAgIGlzQ29tcG9uZW50LFxuICAgICAgaXNTdHJ1Y3R1cmFsLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBuZ01vZHVsZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTeW1ib2xPZlZhcmlhYmxlKHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpOiBWYXJpYWJsZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHZhcmlhYmxlLnNvdXJjZVNwYW4sIGZpbHRlcjogdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9ufSk7XG4gICAgaWYgKG5vZGUgPT09IG51bGwgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uU3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAoZXhwcmVzc2lvblN5bWJvbCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRzVHlwZTogZXhwcmVzc2lvblN5bWJvbC50c1R5cGUsXG4gICAgICB0c1N5bWJvbDogZXhwcmVzc2lvblN5bWJvbC50c1N5bWJvbCxcbiAgICAgIGluaXRpYWxpemVyTG9jYXRpb246IGV4cHJlc3Npb25TeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZSxcbiAgICAgIGRlY2xhcmF0aW9uOiB2YXJpYWJsZSxcbiAgICAgIGxvY2FsVmFyTG9jYXRpb246IHtcbiAgICAgICAgc2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsXG4gICAgICAgIHBvc2l0aW9uSW5TaGltRmlsZTogdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUubmFtZSksXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZSZWZlcmVuY2UocmVmOiBUbXBsQXN0UmVmZXJlbmNlKTogUmVmZXJlbmNlU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGVtcGxhdGVEYXRhLmJvdW5kVGFyZ2V0LmdldFJlZmVyZW5jZVRhcmdldChyZWYpO1xuICAgIC8vIEZpbmQgdGhlIG5vZGUgZm9yIHRoZSByZWZlcmVuY2UgZGVjbGFyYXRpb24sIGkuZS4gYHZhciBfdDIgPSBfdDE7YFxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW46IHJlZi5zb3VyY2VTcGFuLCBmaWx0ZXI6IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbn0pO1xuICAgIGlmIChub2RlID09PSBudWxsIHx8IHRhcmdldCA9PT0gbnVsbCB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gZm9yIHRoZSByZWZlcmVuY2VzIHZhcmlhYmxlLCB3aXRoIHRoZSBleGNlcHRpb24gb2YgdGVtcGxhdGUgcmVmc1xuICAgIC8vIHdoaWNoIGFyZSBvZiB0aGUgZm9ybSB2YXIgX3QzID0gKF90MiBhcyBhbnkgYXMgaTIuVGVtcGxhdGVSZWY8YW55PilcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBDb25zaWRlciBhZGRpbmcgYW4gYEV4cHJlc3Npb25JZGVudGlmaWVyYCB0byB0YWcgdmFyaWFibGUgZGVjbGFyYXRpb25cbiAgICAvLyBpbml0aWFsaXplcnMgYXMgaW52YWxpZCBmb3Igc3ltYm9sIHJldHJpZXZhbC5cbiAgICBjb25zdCBvcmlnaW5hbERlY2xhcmF0aW9uID0gdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgICAgdHMuaXNBc0V4cHJlc3Npb24obm9kZS5pbml0aWFsaXplci5leHByZXNzaW9uKSA/XG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNrZXIoKS5nZXRTeW1ib2xBdExvY2F0aW9uKG5vZGUubmFtZSkgOlxuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmluaXRpYWxpemVyKTtcbiAgICBpZiAob3JpZ2luYWxEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG9yaWdpbmFsRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShvcmlnaW5hbERlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgPT09IG51bGwgfHwgc3ltYm9sLnRzU3ltYm9sID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCByZWZlcmVuY2VWYXJTaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbiA9IHtcbiAgICAgIHNoaW1QYXRoOiB0aGlzLnNoaW1QYXRoLFxuICAgICAgcG9zaXRpb25JblNoaW1GaWxlOiB0aGlzLmdldFNoaW1Qb3NpdGlvbkZvck5vZGUobm9kZSksXG4gICAgfTtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlIHx8IHRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHN5bWJvbC50c1N5bWJvbCxcbiAgICAgICAgdHNUeXBlOiBzeW1ib2wudHNUeXBlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldExvY2F0aW9uOiBzeW1ib2wuc2hpbUxvY2F0aW9uLFxuICAgICAgICByZWZlcmVuY2VWYXJMb2NhdGlvbjogcmVmZXJlbmNlVmFyU2hpbUxvY2F0aW9uLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24odGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0c1N5bWJvbDogc3ltYm9sLnRzU3ltYm9sLFxuICAgICAgICB0c1R5cGU6IHN5bWJvbC50c1R5cGUsXG4gICAgICAgIGRlY2xhcmF0aW9uOiByZWYsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSxcbiAgICAgICAgdGFyZ2V0TG9jYXRpb246IHN5bWJvbC5zaGltTG9jYXRpb24sXG4gICAgICAgIHJlZmVyZW5jZVZhckxvY2F0aW9uOiByZWZlcmVuY2VWYXJTaGltTG9jYXRpb24sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZQaXBlKGV4cHJlc3Npb246IEJpbmRpbmdQaXBlKTogUGlwZVN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBtZXRob2RBY2Nlc3MgPSBmaW5kRmlyc3RNYXRjaGluZ05vZGUoXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQmxvY2ssXG4gICAgICAgIHt3aXRoU3BhbjogZXhwcmVzc2lvbi5uYW1lU3BhbiwgZmlsdGVyOiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0pO1xuICAgIGlmIChtZXRob2RBY2Nlc3MgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHBpcGVWYXJpYWJsZU5vZGUgPSBtZXRob2RBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgICBjb25zdCBwaXBlRGVjbGFyYXRpb24gPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihwaXBlVmFyaWFibGVOb2RlKTtcbiAgICBpZiAocGlwZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgcGlwZURlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcGlwZUluc3RhbmNlID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShwaXBlRGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgLy8gVGhlIGluc3RhbmNlIHNob3VsZCBuZXZlciBiZSBudWxsLCBub3Igc2hvdWxkIHRoZSBzeW1ib2wgbGFjayBhIHZhbHVlIGRlY2xhcmF0aW9uLiBUaGlzXG4gICAgLy8gaXMgYmVjYXVzZSB0aGUgbm9kZSB1c2VkIHRvIGxvb2sgZm9yIHRoZSBgcGlwZUluc3RhbmNlYCBzeW1ib2wgaW5mbyBpcyBhIHZhbHVlXG4gICAgLy8gZGVjbGFyYXRpb24gb2YgYW5vdGhlciBzeW1ib2wgKGkuZS4gdGhlIGBwaXBlRGVjbGFyYXRpb25gIHN5bWJvbCkuXG4gICAgaWYgKHBpcGVJbnN0YW5jZSA9PT0gbnVsbCB8fCAhaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbihwaXBlSW5zdGFuY2UudHNTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShtZXRob2RBY2Nlc3MpO1xuICAgIGlmIChzeW1ib2xJbmZvID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogU3ltYm9sS2luZC5QaXBlLFxuICAgICAgLi4uc3ltYm9sSW5mbyxcbiAgICAgIGNsYXNzU3ltYm9sOiB7XG4gICAgICAgIC4uLnBpcGVJbnN0YW5jZSxcbiAgICAgICAgdHNTeW1ib2w6IHBpcGVJbnN0YW5jZS50c1N5bWJvbCxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUZW1wbGF0ZUV4cHJlc3Npb24oZXhwcmVzc2lvbjogQVNUKTogVmFyaWFibGVTeW1ib2x8UmVmZXJlbmNlU3ltYm9sXG4gICAgICB8RXhwcmVzc2lvblN5bWJvbHxudWxsIHtcbiAgICBpZiAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIEFTVFdpdGhTb3VyY2UpIHtcbiAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLmFzdDtcbiAgICB9XG5cbiAgICBjb25zdCBleHByZXNzaW9uVGFyZ2V0ID0gdGhpcy50ZW1wbGF0ZURhdGEuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChleHByZXNzaW9uKTtcbiAgICBpZiAoZXhwcmVzc2lvblRhcmdldCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sKGV4cHJlc3Npb25UYXJnZXQpO1xuICAgIH1cblxuICAgIC8vIFRoZSBgbmFtZWAgcGFydCBvZiBhIGBQcm9wZXJ0eVdyaXRlYCBhbmQgYE1ldGhvZENhbGxgIGRvZXMgbm90IGhhdmUgaXRzIG93blxuICAgIC8vIEFTVCBzbyB0aGVyZSBpcyBubyB3YXkgdG8gcmV0cmlldmUgYSBgU3ltYm9sYCBmb3IganVzdCB0aGUgYG5hbWVgIHZpYSBhIHNwZWNpZmljIG5vZGUuXG4gICAgY29uc3Qgd2l0aFNwYW4gPSAoZXhwcmVzc2lvbiBpbnN0YW5jZW9mIFByb3BlcnR5V3JpdGUgfHwgZXhwcmVzc2lvbiBpbnN0YW5jZW9mIE1ldGhvZENhbGwpID9cbiAgICAgICAgZXhwcmVzc2lvbi5uYW1lU3BhbiA6XG4gICAgICAgIGV4cHJlc3Npb24uc291cmNlU3BhbjtcblxuICAgIGxldCBub2RlID0gZmluZEZpcnN0TWF0Y2hpbmdOb2RlKFxuICAgICAgICB0aGlzLnR5cGVDaGVja0Jsb2NrLCB7d2l0aFNwYW4sIGZpbHRlcjogKG46IHRzLk5vZGUpOiBuIGlzIHRzLk5vZGUgPT4gdHJ1ZX0pO1xuICAgIGlmIChub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB3aGlsZSAodHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgbm9kZSA9IG5vZGUuZXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAtIElmIHdlIGhhdmUgc2FmZSBwcm9wZXJ0eSByZWFkIChcImE/LmJcIikgd2Ugd2FudCB0byBnZXQgdGhlIFN5bWJvbCBmb3IgYiwgdGhlIGB3aGVuVHJ1ZWBcbiAgICAvLyBleHByZXNzaW9uLlxuICAgIC8vIC0gSWYgb3VyIGV4cHJlc3Npb24gaXMgYSBwaXBlIGJpbmRpbmcgKFwiYSB8IHRlc3Q6YjpjXCIpLCB3ZSB3YW50IHRoZSBTeW1ib2wgZm9yIHRoZVxuICAgIC8vIGB0cmFuc2Zvcm1gIG9uIHRoZSBwaXBlLlxuICAgIC8vIC0gT3RoZXJ3aXNlLCB3ZSByZXRyaWV2ZSB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBpdHNlbGYgd2l0aCBubyBzcGVjaWFsIGNvbnNpZGVyYXRpb25zXG4gICAgaWYgKChleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZVByb3BlcnR5UmVhZCB8fCBleHByZXNzaW9uIGluc3RhbmNlb2YgU2FmZU1ldGhvZENhbGwpICYmXG4gICAgICAgIHRzLmlzQ29uZGl0aW9uYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICBjb25zdCB3aGVuVHJ1ZVN5bWJvbCA9XG4gICAgICAgICAgKGV4cHJlc3Npb24gaW5zdGFuY2VvZiBTYWZlTWV0aG9kQ2FsbCAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUud2hlblRydWUpKSA/XG4gICAgICAgICAgdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlLndoZW5UcnVlLmV4cHJlc3Npb24pIDpcbiAgICAgICAgICB0aGlzLmdldFN5bWJvbE9mVHNOb2RlKG5vZGUud2hlblRydWUpO1xuICAgICAgaWYgKHdoZW5UcnVlU3ltYm9sID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi53aGVuVHJ1ZVN5bWJvbCxcbiAgICAgICAga2luZDogU3ltYm9sS2luZC5FeHByZXNzaW9uLFxuICAgICAgICAvLyBSYXRoZXIgdGhhbiB1c2luZyB0aGUgdHlwZSBvZiBvbmx5IHRoZSBgd2hlblRydWVgIHBhcnQgb2YgdGhlIGV4cHJlc3Npb24sIHdlIHNob3VsZFxuICAgICAgICAvLyBzdGlsbCBnZXQgdGhlIHR5cGUgb2YgdGhlIHdob2xlIGNvbmRpdGlvbmFsIGV4cHJlc3Npb24gdG8gaW5jbHVkZSBgfHVuZGVmaW5lZGAuXG4gICAgICAgIHRzVHlwZTogdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFR5cGVBdExvY2F0aW9uKG5vZGUpXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzeW1ib2xJbmZvID0gdGhpcy5nZXRTeW1ib2xPZlRzTm9kZShub2RlKTtcbiAgICAgIHJldHVybiBzeW1ib2xJbmZvID09PSBudWxsID8gbnVsbCA6IHsuLi5zeW1ib2xJbmZvLCBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb259O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0U3ltYm9sT2ZUc05vZGUobm9kZTogdHMuTm9kZSk6IFRzTm9kZVN5bWJvbEluZm98bnVsbCB7XG4gICAgd2hpbGUgKHRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgbGV0IHRzU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuICAgIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLm5hbWUpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgdHNTeW1ib2wgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0U3ltYm9sQXRMb2NhdGlvbihub2RlLmFyZ3VtZW50RXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRzU3ltYm9sID0gdGhpcy5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24obm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3QgcG9zaXRpb25JblNoaW1GaWxlID0gdGhpcy5nZXRTaGltUG9zaXRpb25Gb3JOb2RlKG5vZGUpO1xuICAgIGNvbnN0IHR5cGUgPSB0aGlzLmdldFR5cGVDaGVja2VyKCkuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIElmIHdlIGNvdWxkIG5vdCBmaW5kIGEgc3ltYm9sLCBmYWxsIGJhY2sgdG8gdGhlIHN5bWJvbCBvbiB0aGUgdHlwZSBmb3IgdGhlIG5vZGUuXG4gICAgICAvLyBTb21lIG5vZGVzIHdvbid0IGhhdmUgYSBcInN5bWJvbCBhdCBsb2NhdGlvblwiIGJ1dCB3aWxsIGhhdmUgYSBzeW1ib2wgZm9yIHRoZSB0eXBlLlxuICAgICAgLy8gRXhhbXBsZXMgb2YgdGhpcyB3b3VsZCBiZSBsaXRlcmFscyBhbmQgYGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpYC5cbiAgICAgIHRzU3ltYm9sOiB0c1N5bWJvbCA/PyB0eXBlLnN5bWJvbCA/PyBudWxsLFxuICAgICAgdHNUeXBlOiB0eXBlLFxuICAgICAgc2hpbUxvY2F0aW9uOiB7c2hpbVBhdGg6IHRoaXMuc2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX0sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlOiB0cy5Ob2RlKTogbnVtYmVyIHtcbiAgICBpZiAodHMuaXNUeXBlUmVmZXJlbmNlTm9kZShub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2hpbVBvc2l0aW9uRm9yTm9kZShub2RlLnR5cGVOYW1lKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUXVhbGlmaWVkTmFtZShub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGUucmlnaHQuZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5uYW1lLmdldFN0YXJ0KCk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZS5hcmd1bWVudEV4cHJlc3Npb24uZ2V0U3RhcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5vZGUuZ2V0U3RhcnQoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==