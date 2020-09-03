(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/indexer/src/template", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/indexer/src/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getTemplateIdentifiers = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/indexer/src/api");
    /**
     * Visits the AST of an Angular template syntax expression, finding interesting
     * entities (variable references, etc.). Creates an array of Entities found in
     * the expression, with the location of the Entities being relative to the
     * expression.
     *
     * Visiting `text {{prop}}` will return
     * `[TopLevelIdentifier {name: 'prop', span: {start: 7, end: 11}}]`.
     */
    var ExpressionVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionVisitor, _super);
        function ExpressionVisitor(expressionStr, absoluteOffset, boundTemplate, targetToIdentifier) {
            var _this = _super.call(this) || this;
            _this.expressionStr = expressionStr;
            _this.absoluteOffset = absoluteOffset;
            _this.boundTemplate = boundTemplate;
            _this.targetToIdentifier = targetToIdentifier;
            _this.identifiers = [];
            return _this;
        }
        /**
         * Returns identifiers discovered in an expression.
         *
         * @param ast expression AST to visit
         * @param source expression AST source code
         * @param absoluteOffset absolute byte offset from start of the file to the start of the AST
         * source code.
         * @param boundTemplate bound target of the entire template, which can be used to query for the
         * entities expressions target.
         * @param targetToIdentifier closure converting a template target node to its identifier.
         */
        ExpressionVisitor.getIdentifiers = function (ast, source, absoluteOffset, boundTemplate, targetToIdentifier) {
            var visitor = new ExpressionVisitor(source, absoluteOffset, boundTemplate, targetToIdentifier);
            visitor.visit(ast);
            return visitor.identifiers;
        };
        ExpressionVisitor.prototype.visit = function (ast) {
            ast.visit(this);
        };
        ExpressionVisitor.prototype.visitMethodCall = function (ast, context) {
            this.visitIdentifier(ast, api_1.IdentifierKind.Method);
            _super.prototype.visitMethodCall.call(this, ast, context);
        };
        ExpressionVisitor.prototype.visitPropertyRead = function (ast, context) {
            this.visitIdentifier(ast, api_1.IdentifierKind.Property);
            _super.prototype.visitPropertyRead.call(this, ast, context);
        };
        ExpressionVisitor.prototype.visitPropertyWrite = function (ast, context) {
            this.visitIdentifier(ast, api_1.IdentifierKind.Property);
            _super.prototype.visitPropertyWrite.call(this, ast, context);
        };
        /**
         * Visits an identifier, adding it to the identifier store if it is useful for indexing.
         *
         * @param ast expression AST the identifier is in
         * @param kind identifier kind
         */
        ExpressionVisitor.prototype.visitIdentifier = function (ast, kind) {
            // The definition of a non-top-level property such as `bar` in `{{foo.bar}}` is currently
            // impossible to determine by an indexer and unsupported by the indexing module.
            // The indexing module also does not currently support references to identifiers declared in the
            // template itself, which have a non-null expression target.
            if (!(ast.receiver instanceof compiler_1.ImplicitReceiver)) {
                return;
            }
            // Get the location of the identifier of real interest.
            // The compiler's expression parser records the location of some expressions in a manner not
            // useful to the indexer. For example, a `MethodCall` `foo(a, b)` will record the span of the
            // entire method call, but the indexer is interested only in the method identifier.
            var localExpression = this.expressionStr.substr(ast.span.start);
            if (!localExpression.includes(ast.name)) {
                throw new Error("Impossible state: \"" + ast.name + "\" not found in \"" + localExpression + "\"");
            }
            var identifierStart = ast.span.start + localExpression.indexOf(ast.name);
            // Join the relative position of the expression within a node with the absolute position
            // of the node to get the absolute position of the expression in the source code.
            var absoluteStart = this.absoluteOffset + identifierStart;
            var span = new api_1.AbsoluteSourceSpan(absoluteStart, absoluteStart + ast.name.length);
            var targetAst = this.boundTemplate.getExpressionTarget(ast);
            var target = targetAst ? this.targetToIdentifier(targetAst) : null;
            var identifier = {
                name: ast.name,
                span: span,
                kind: kind,
                target: target,
            };
            this.identifiers.push(identifier);
        };
        return ExpressionVisitor;
    }(compiler_1.RecursiveAstVisitor));
    /**
     * Visits the AST of a parsed Angular template. Discovers and stores
     * identifiers of interest, deferring to an `ExpressionVisitor` as needed.
     */
    var TemplateVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(TemplateVisitor, _super);
        /**
         * Creates a template visitor for a bound template target. The bound target can be used when
         * deferred to the expression visitor to get information about the target of an expression.
         *
         * @param boundTemplate bound template target
         */
        function TemplateVisitor(boundTemplate) {
            var _this = _super.call(this) || this;
            _this.boundTemplate = boundTemplate;
            // Identifiers of interest found in the template.
            _this.identifiers = new Set();
            // Map of targets in a template to their identifiers.
            _this.targetIdentifierCache = new Map();
            // Map of elements and templates to their identifiers.
            _this.elementAndTemplateIdentifierCache = new Map();
            return _this;
        }
        /**
         * Visits a node in the template.
         *
         * @param node node to visit
         */
        TemplateVisitor.prototype.visit = function (node) {
            node.visit(this);
        };
        TemplateVisitor.prototype.visitAll = function (nodes) {
            var _this = this;
            nodes.forEach(function (node) { return _this.visit(node); });
        };
        /**
         * Add an identifier for an HTML element and visit its children recursively.
         *
         * @param element
         */
        TemplateVisitor.prototype.visitElement = function (element) {
            var elementIdentifier = this.elementOrTemplateToIdentifier(element);
            this.identifiers.add(elementIdentifier);
            this.visitAll(element.references);
            this.visitAll(element.inputs);
            this.visitAll(element.attributes);
            this.visitAll(element.children);
            this.visitAll(element.outputs);
        };
        TemplateVisitor.prototype.visitTemplate = function (template) {
            var templateIdentifier = this.elementOrTemplateToIdentifier(template);
            this.identifiers.add(templateIdentifier);
            this.visitAll(template.variables);
            this.visitAll(template.attributes);
            this.visitAll(template.templateAttrs);
            this.visitAll(template.children);
            this.visitAll(template.references);
        };
        TemplateVisitor.prototype.visitBoundAttribute = function (attribute) {
            var _this = this;
            // A BoundAttribute's value (the parent AST) may have subexpressions (children ASTs) that have
            // recorded spans extending past the recorded span of the parent. The most common example of
            // this is with `*ngFor`.
            // To resolve this, use the information on the BoundAttribute Template AST, which is always
            // correct, to determine locations of identifiers in the expression.
            //
            // TODO(ayazhafiz): Remove this when https://github.com/angular/angular/pull/31813 lands.
            var attributeSrc = attribute.sourceSpan.toString();
            var attributeAbsolutePosition = attribute.sourceSpan.start.offset;
            // Skip the bytes of the attribute name so that there are no collisions between the attribute
            // name and expression identifier names later.
            var nameSkipOffet = attributeSrc.indexOf(attribute.name) + attribute.name.length;
            var expressionSrc = attributeSrc.substring(nameSkipOffet);
            var expressionAbsolutePosition = attributeAbsolutePosition + nameSkipOffet;
            var identifiers = ExpressionVisitor.getIdentifiers(attribute.value, expressionSrc, expressionAbsolutePosition, this.boundTemplate, this.targetToIdentifier.bind(this));
            identifiers.forEach(function (id) { return _this.identifiers.add(id); });
        };
        TemplateVisitor.prototype.visitBoundEvent = function (attribute) {
            this.visitExpression(attribute.handler);
        };
        TemplateVisitor.prototype.visitBoundText = function (text) {
            this.visitExpression(text.value);
        };
        TemplateVisitor.prototype.visitReference = function (reference) {
            var referenceIdentifer = this.targetToIdentifier(reference);
            this.identifiers.add(referenceIdentifer);
        };
        TemplateVisitor.prototype.visitVariable = function (variable) {
            var variableIdentifier = this.targetToIdentifier(variable);
            this.identifiers.add(variableIdentifier);
        };
        /** Creates an identifier for a template element or template node. */
        TemplateVisitor.prototype.elementOrTemplateToIdentifier = function (node) {
            // If this node has already been seen, return the cached result.
            if (this.elementAndTemplateIdentifierCache.has(node)) {
                return this.elementAndTemplateIdentifierCache.get(node);
            }
            var name;
            var kind;
            if (node instanceof compiler_1.TmplAstTemplate) {
                name = node.tagName;
                kind = api_1.IdentifierKind.Template;
            }
            else {
                name = node.name;
                kind = api_1.IdentifierKind.Element;
            }
            var sourceSpan = node.startSourceSpan;
            // An element's or template's source span can be of the form `<element>`, `<element />`, or
            // `<element></element>`. Only the selector is interesting to the indexer, so the source is
            // searched for the first occurrence of the element (selector) name.
            var start = this.getStartLocation(name, sourceSpan);
            var absoluteSpan = new api_1.AbsoluteSourceSpan(start, start + name.length);
            // Record the nodes's attributes, which an indexer can later traverse to see if any of them
            // specify a used directive on the node.
            var attributes = node.attributes.map(function (_a) {
                var name = _a.name, sourceSpan = _a.sourceSpan;
                return {
                    name: name,
                    span: new api_1.AbsoluteSourceSpan(sourceSpan.start.offset, sourceSpan.end.offset),
                    kind: api_1.IdentifierKind.Attribute,
                };
            });
            var usedDirectives = this.boundTemplate.getDirectivesOfNode(node) || [];
            var identifier = {
                name: name,
                span: absoluteSpan,
                kind: kind,
                attributes: new Set(attributes),
                usedDirectives: new Set(usedDirectives.map(function (dir) {
                    return {
                        node: dir.ref.node,
                        selector: dir.selector,
                    };
                })),
            };
            this.elementAndTemplateIdentifierCache.set(node, identifier);
            return identifier;
        };
        /** Creates an identifier for a template reference or template variable target. */
        TemplateVisitor.prototype.targetToIdentifier = function (node) {
            // If this node has already been seen, return the cached result.
            if (this.targetIdentifierCache.has(node)) {
                return this.targetIdentifierCache.get(node);
            }
            var name = node.name, sourceSpan = node.sourceSpan;
            var start = this.getStartLocation(name, sourceSpan);
            var span = new api_1.AbsoluteSourceSpan(start, start + name.length);
            var identifier;
            if (node instanceof compiler_1.TmplAstReference) {
                // If the node is a reference, we care about its target. The target can be an element, a
                // template, a directive applied on a template or element (in which case the directive field
                // is non-null), or nothing at all.
                var refTarget = this.boundTemplate.getReferenceTarget(node);
                var target = null;
                if (refTarget) {
                    if (refTarget instanceof compiler_1.TmplAstElement || refTarget instanceof compiler_1.TmplAstTemplate) {
                        target = {
                            node: this.elementOrTemplateToIdentifier(refTarget),
                            directive: null,
                        };
                    }
                    else {
                        target = {
                            node: this.elementOrTemplateToIdentifier(refTarget.node),
                            directive: refTarget.directive.ref.node,
                        };
                    }
                }
                identifier = {
                    name: name,
                    span: span,
                    kind: api_1.IdentifierKind.Reference,
                    target: target,
                };
            }
            else {
                identifier = {
                    name: name,
                    span: span,
                    kind: api_1.IdentifierKind.Variable,
                };
            }
            this.targetIdentifierCache.set(node, identifier);
            return identifier;
        };
        /** Gets the start location of a string in a SourceSpan */
        TemplateVisitor.prototype.getStartLocation = function (name, context) {
            var localStr = context.toString();
            if (!localStr.includes(name)) {
                throw new Error("Impossible state: \"" + name + "\" not found in \"" + localStr + "\"");
            }
            return context.start.offset + localStr.indexOf(name);
        };
        /**
         * Visits a node's expression and adds its identifiers, if any, to the visitor's state.
         * Only ASTs with information about the expression source and its location are visited.
         *
         * @param node node whose expression to visit
         */
        TemplateVisitor.prototype.visitExpression = function (ast) {
            var _this = this;
            // Only include ASTs that have information about their source and absolute source spans.
            if (ast instanceof compiler_1.ASTWithSource && ast.source !== null) {
                // Make target to identifier mapping closure stateful to this visitor instance.
                var targetToIdentifier = this.targetToIdentifier.bind(this);
                var absoluteOffset = ast.sourceSpan.start;
                var identifiers = ExpressionVisitor.getIdentifiers(ast, ast.source, absoluteOffset, this.boundTemplate, targetToIdentifier);
                identifiers.forEach(function (id) { return _this.identifiers.add(id); });
            }
        };
        return TemplateVisitor;
    }(compiler_1.TmplAstRecursiveVisitor));
    /**
     * Traverses a template AST and builds identifiers discovered in it.
     *
     * @param boundTemplate bound template target, which can be used for querying expression targets.
     * @return identifiers in template
     */
    function getTemplateIdentifiers(boundTemplate) {
        var visitor = new TemplateVisitor(boundTemplate);
        if (boundTemplate.target.template !== undefined) {
            visitor.visitAll(boundTemplate.target.template);
        }
        return visitor.identifiers;
    }
    exports.getTemplateIdentifiers = getTemplateIdentifiers;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBeVU7SUFDelUsdUVBQTROO0lBaUI1Tjs7Ozs7Ozs7T0FRRztJQUNIO1FBQWdDLDZDQUFtQjtRQUdqRCwyQkFDcUIsYUFBcUIsRUFBbUIsY0FBc0IsRUFDOUQsYUFBeUMsRUFDekMsa0JBQTREO1lBSGpGLFlBSUUsaUJBQU8sU0FDUjtZQUpvQixtQkFBYSxHQUFiLGFBQWEsQ0FBUTtZQUFtQixvQkFBYyxHQUFkLGNBQWMsQ0FBUTtZQUM5RCxtQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFDekMsd0JBQWtCLEdBQWxCLGtCQUFrQixDQUEwQztZQUx4RSxpQkFBVyxHQUEyQixFQUFFLENBQUM7O1FBT2xELENBQUM7UUFFRDs7Ozs7Ozs7OztXQVVHO1FBQ0ksZ0NBQWMsR0FBckIsVUFDSSxHQUFRLEVBQUUsTUFBYyxFQUFFLGNBQXNCLEVBQUUsYUFBeUMsRUFDM0Ysa0JBQTREO1lBQzlELElBQU0sT0FBTyxHQUNULElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNyRixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUM3QixDQUFDO1FBRUQsaUNBQUssR0FBTCxVQUFNLEdBQVE7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLENBQUM7UUFFRCwyQ0FBZSxHQUFmLFVBQWdCLEdBQWUsRUFBRSxPQUFXO1lBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFF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SSxFQUFFO2dCQUN2RCwrRUFBK0U7Z0JBQy9FLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUQsSUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7Z0JBQzVDLElBQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLGNBQWMsQ0FDaEQsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQkFDN0UsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEtBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUM7YUFDckQ7UUFDSCxDQUFDO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBck9ELENBQThCLGtDQUF1QixHQXFPcEQ7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLGFBQXlDO1FBRTlFLElBQU0sT0FBTyxHQUFHLElBQUksZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ25ELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQy9DLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNqRDtRQUNELE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBUEQsd0RBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QVNULCBBU1RXaXRoU291cmNlLCBCb3VuZFRhcmdldCwgSW1wbGljaXRSZWNlaXZlciwgTWV0aG9kQ2FsbCwgUGFyc2VTb3VyY2VTcGFuLCBQcm9wZXJ0eVJlYWQsIFByb3BlcnR5V3JpdGUsIFJlY3Vyc2l2ZUFzdFZpc2l0b3IsIFRtcGxBc3RCb3VuZEF0dHJpYnV0ZSwgVG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3RCb3VuZFRleHQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3IsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0Fic29sdXRlU291cmNlU3BhbiwgQXR0cmlidXRlSWRlbnRpZmllciwgRWxlbWVudElkZW50aWZpZXIsIElkZW50aWZpZXJLaW5kLCBNZXRob2RJZGVudGlmaWVyLCBQcm9wZXJ0eUlkZW50aWZpZXIsIFJlZmVyZW5jZUlkZW50aWZpZXIsIFRlbXBsYXRlTm9kZUlkZW50aWZpZXIsIFRvcExldmVsSWRlbnRpZmllciwgVmFyaWFibGVJZGVudGlmaWVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NvbXBvbmVudE1ldGF9IGZyb20gJy4vY29udGV4dCc7XG5cbi8qKlxuICogQSBwYXJzZWQgbm9kZSBpbiBhIHRlbXBsYXRlLCB3aGljaCBtYXkgaGF2ZSBhIG5hbWUgKGlmIGl0IGlzIGEgc2VsZWN0b3IpIG9yXG4gKiBiZSBhbm9ueW1vdXMgKGxpa2UgYSB0ZXh0IHNwYW4pLlxuICovXG5pbnRlcmZhY2UgSFRNTE5vZGUgZXh0ZW5kcyBUbXBsQXN0Tm9kZSB7XG4gIHRhZ05hbWU/OiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG59XG5cbnR5cGUgRXhwcmVzc2lvbklkZW50aWZpZXIgPSBQcm9wZXJ0eUlkZW50aWZpZXJ8TWV0aG9kSWRlbnRpZmllcjtcbnR5cGUgVG1wbFRhcmdldCA9IFRtcGxBc3RSZWZlcmVuY2V8VG1wbEFzdFZhcmlhYmxlO1xudHlwZSBUYXJnZXRJZGVudGlmaWVyID0gUmVmZXJlbmNlSWRlbnRpZmllcnxWYXJpYWJsZUlkZW50aWZpZXI7XG50eXBlIFRhcmdldElkZW50aWZpZXJNYXAgPSBNYXA8VG1wbFRhcmdldCwgVGFyZ2V0SWRlbnRpZmllcj47XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYW4gQW5ndWxhciB0ZW1wbGF0ZSBzeW50YXggZXhwcmVzc2lvbiwgZmluZGluZyBpbnRlcmVzdGluZ1xuICogZW50aXRpZXMgKHZhcmlhYmxlIHJlZmVyZW5jZXMsIGV0Yy4pLiBDcmVhdGVzIGFuIGFycmF5IG9mIEVudGl0aWVzIGZvdW5kIGluXG4gKiB0aGUgZXhwcmVzc2lvbiwgd2l0aCB0aGUgbG9jYXRpb24gb2YgdGhlIEVudGl0aWVzIGJlaW5nIHJlbGF0aXZlIHRvIHRoZVxuICogZXhwcmVzc2lvbi5cbiAqXG4gKiBWaXNpdGluZyBgdGV4dCB7e3Byb3B9fWAgd2lsbCByZXR1cm5cbiAqIGBbVG9wTGV2ZWxJZGVudGlmaWVyIHtuYW1lOiAncHJvcCcsIHNwYW46IHtzdGFydDogNywgZW5kOiAxMX19XWAuXG4gKi9cbmNsYXNzIEV4cHJlc3Npb25WaXNpdG9yIGV4dGVuZHMgUmVjdXJzaXZlQXN0VmlzaXRvciB7XG4gIHJlYWRvbmx5IGlkZW50aWZpZXJzOiBFeHByZXNzaW9uSWRlbnRpZmllcltdID0gW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgZXhwcmVzc2lvblN0cjogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IGFic29sdXRlT2Zmc2V0OiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXRUb0lkZW50aWZpZXI6ICh0YXJnZXQ6IFRtcGxUYXJnZXQpID0+IFRhcmdldElkZW50aWZpZXIpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgaWRlbnRpZmllcnMgZGlzY292ZXJlZCBpbiBhbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYXN0IGV4cHJlc3Npb24gQVNUIHRvIHZpc2l0XG4gICAqIEBwYXJhbSBzb3VyY2UgZXhwcmVzc2lvbiBBU1Qgc291cmNlIGNvZGVcbiAgICogQHBhcmFtIGFic29sdXRlT2Zmc2V0IGFic29sdXRlIGJ5dGUgb2Zmc2V0IGZyb20gc3RhcnQgb2YgdGhlIGZpbGUgdG8gdGhlIHN0YXJ0IG9mIHRoZSBBU1RcbiAgICogc291cmNlIGNvZGUuXG4gICAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRhcmdldCBvZiB0aGUgZW50aXJlIHRlbXBsYXRlLCB3aGljaCBjYW4gYmUgdXNlZCB0byBxdWVyeSBmb3IgdGhlXG4gICAqIGVudGl0aWVzIGV4cHJlc3Npb25zIHRhcmdldC5cbiAgICogQHBhcmFtIHRhcmdldFRvSWRlbnRpZmllciBjbG9zdXJlIGNvbnZlcnRpbmcgYSB0ZW1wbGF0ZSB0YXJnZXQgbm9kZSB0byBpdHMgaWRlbnRpZmllci5cbiAgICovXG4gIHN0YXRpYyBnZXRJZGVudGlmaWVycyhcbiAgICAgIGFzdDogQVNULCBzb3VyY2U6IHN0cmluZywgYWJzb2x1dGVPZmZzZXQ6IG51bWJlciwgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4sXG4gICAgICB0YXJnZXRUb0lkZW50aWZpZXI6ICh0YXJnZXQ6IFRtcGxUYXJnZXQpID0+IFRhcmdldElkZW50aWZpZXIpOiBUb3BMZXZlbElkZW50aWZpZXJbXSB7XG4gICAgY29uc3QgdmlzaXRvciA9XG4gICAgICAgIG5ldyBFeHByZXNzaW9uVmlzaXRvcihzb3VyY2UsIGFic29sdXRlT2Zmc2V0LCBib3VuZFRlbXBsYXRlLCB0YXJnZXRUb0lkZW50aWZpZXIpO1xuICAgIHZpc2l0b3IudmlzaXQoYXN0KTtcbiAgICByZXR1cm4gdmlzaXRvci5pZGVudGlmaWVycztcbiAgfVxuXG4gIHZpc2l0KGFzdDogQVNUKSB7XG4gICAgYXN0LnZpc2l0KHRoaXMpO1xuICB9XG5cbiAgdmlzaXRNZXRob2RDYWxsKGFzdDogTWV0aG9kQ2FsbCwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLk1ldGhvZCk7XG4gICAgc3VwZXIudmlzaXRNZXRob2RDYWxsKGFzdCwgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdFByb3BlcnR5UmVhZChhc3Q6IFByb3BlcnR5UmVhZCwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5UmVhZChhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5V3JpdGUoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYW4gaWRlbnRpZmllciwgYWRkaW5nIGl0IHRvIHRoZSBpZGVudGlmaWVyIHN0b3JlIGlmIGl0IGlzIHVzZWZ1bCBmb3IgaW5kZXhpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdGhlIGlkZW50aWZpZXIgaXMgaW5cbiAgICogQHBhcmFtIGtpbmQgaWRlbnRpZmllciBraW5kXG4gICAqL1xuICBwcml2YXRlIHZpc2l0SWRlbnRpZmllcihcbiAgICAgIGFzdDogQVNUJntuYW1lOiBzdHJpbmcsIHJlY2VpdmVyOiBBU1R9LCBraW5kOiBFeHByZXNzaW9uSWRlbnRpZmllclsna2luZCddKSB7XG4gICAgLy8gVGhlIGRlZmluaXRpb24gb2YgYSBub24tdG9wLWxldmVsIHByb3BlcnR5IHN1Y2ggYXMgYGJhcmAgaW4gYHt7Zm9vLmJhcn19YCBpcyBjdXJyZW50bHlcbiAgICAvLyBpbXBvc3NpYmxlIHRvIGRldGVybWluZSBieSBhbiBpbmRleGVyIGFuZCB1bnN1cHBvcnRlZCBieSB0aGUgaW5kZXhpbmcgbW9kdWxlLlxuICAgIC8vIFRoZSBpbmRleGluZyBtb2R1bGUgYWxzbyBkb2VzIG5vdCBjdXJyZW50bHkgc3VwcG9ydCByZWZlcmVuY2VzIHRvIGlkZW50aWZpZXJzIGRlY2xhcmVkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIGl0c2VsZiwgd2hpY2ggaGF2ZSBhIG5vbi1udWxsIGV4cHJlc3Npb24gdGFyZ2V0LlxuICAgIGlmICghKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBsb2NhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBvZiByZWFsIGludGVyZXN0LlxuICAgIC8vIFRoZSBjb21waWxlcidzIGV4cHJlc3Npb24gcGFyc2VyIHJlY29yZHMgdGhlIGxvY2F0aW9uIG9mIHNvbWUgZXhwcmVzc2lvbnMgaW4gYSBtYW5uZXIgbm90XG4gICAgLy8gdXNlZnVsIHRvIHRoZSBpbmRleGVyLiBGb3IgZXhhbXBsZSwgYSBgTWV0aG9kQ2FsbGAgYGZvbyhhLCBiKWAgd2lsbCByZWNvcmQgdGhlIHNwYW4gb2YgdGhlXG4gICAgLy8gZW50aXJlIG1ldGhvZCBjYWxsLCBidXQgdGhlIGluZGV4ZXIgaXMgaW50ZXJlc3RlZCBvbmx5IGluIHRoZSBtZXRob2QgaWRlbnRpZmllci5cbiAgICBjb25zdCBsb2NhbEV4cHJlc3Npb24gPSB0aGlzLmV4cHJlc3Npb25TdHIuc3Vic3RyKGFzdC5zcGFuLnN0YXJ0KTtcbiAgICBpZiAoIWxvY2FsRXhwcmVzc2lvbi5pbmNsdWRlcyhhc3QubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke2FzdC5uYW1lfVwiIG5vdCBmb3VuZCBpbiBcIiR7bG9jYWxFeHByZXNzaW9ufVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IGlkZW50aWZpZXJTdGFydCA9IGFzdC5zcGFuLnN0YXJ0ICsgbG9jYWxFeHByZXNzaW9uLmluZGV4T2YoYXN0Lm5hbWUpO1xuXG4gICAgLy8gSm9pbiB0aGUgcmVsYXRpdmUgcG9zaXRpb24gb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluIGEgbm9kZSB3aXRoIHRoZSBhYnNvbHV0ZSBwb3NpdGlvblxuICAgIC8vIG9mIHRoZSBub2RlIHRvIGdldCB0aGUgYWJzb2x1dGUgcG9zaXRpb24gb2YgdGhlIGV4cHJlc3Npb24gaW4gdGhlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IGFic29sdXRlU3RhcnQgPSB0aGlzLmFic29sdXRlT2Zmc2V0ICsgaWRlbnRpZmllclN0YXJ0O1xuICAgIGNvbnN0IHNwYW4gPSBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKGFic29sdXRlU3RhcnQsIGFic29sdXRlU3RhcnQgKyBhc3QubmFtZS5sZW5ndGgpO1xuXG4gICAgY29uc3QgdGFyZ2V0QXN0ID0gdGhpcy5ib3VuZFRlbXBsYXRlLmdldEV4cHJlc3Npb25UYXJnZXQoYXN0KTtcbiAgICBjb25zdCB0YXJnZXQgPSB0YXJnZXRBc3QgPyB0aGlzLnRhcmdldFRvSWRlbnRpZmllcih0YXJnZXRBc3QpIDogbnVsbDtcbiAgICBjb25zdCBpZGVudGlmaWVyID0ge1xuICAgICAgbmFtZTogYXN0Lm5hbWUsXG4gICAgICBzcGFuLFxuICAgICAga2luZCxcbiAgICAgIHRhcmdldCxcbiAgICB9IGFzIEV4cHJlc3Npb25JZGVudGlmaWVyO1xuXG4gICAgdGhpcy5pZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG59XG5cbi8qKlxuICogVmlzaXRzIHRoZSBBU1Qgb2YgYSBwYXJzZWQgQW5ndWxhciB0ZW1wbGF0ZS4gRGlzY292ZXJzIGFuZCBzdG9yZXNcbiAqIGlkZW50aWZpZXJzIG9mIGludGVyZXN0LCBkZWZlcnJpbmcgdG8gYW4gYEV4cHJlc3Npb25WaXNpdG9yYCBhcyBuZWVkZWQuXG4gKi9cbmNsYXNzIFRlbXBsYXRlVmlzaXRvciBleHRlbmRzIFRtcGxBc3RSZWN1cnNpdmVWaXNpdG9yIHtcbiAgLy8gSWRlbnRpZmllcnMgb2YgaW50ZXJlc3QgZm91bmQgaW4gdGhlIHRlbXBsYXRlLlxuICByZWFkb25seSBpZGVudGlmaWVycyA9IG5ldyBTZXQ8VG9wTGV2ZWxJZGVudGlmaWVyPigpO1xuXG4gIC8vIE1hcCBvZiB0YXJnZXRzIGluIGEgdGVtcGxhdGUgdG8gdGhlaXIgaWRlbnRpZmllcnMuXG4gIHByaXZhdGUgcmVhZG9ubHkgdGFyZ2V0SWRlbnRpZmllckNhY2hlOiBUYXJnZXRJZGVudGlmaWVyTWFwID0gbmV3IE1hcCgpO1xuXG4gIC8vIE1hcCBvZiBlbGVtZW50cyBhbmQgdGVtcGxhdGVzIHRvIHRoZWlyIGlkZW50aWZpZXJzLlxuICBwcml2YXRlIHJlYWRvbmx5IGVsZW1lbnRBbmRUZW1wbGF0ZUlkZW50aWZpZXJDYWNoZSA9XG4gICAgICBuZXcgTWFwPFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSwgRWxlbWVudElkZW50aWZpZXJ8VGVtcGxhdGVOb2RlSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHRlbXBsYXRlIHZpc2l0b3IgZm9yIGEgYm91bmQgdGVtcGxhdGUgdGFyZ2V0LiBUaGUgYm91bmQgdGFyZ2V0IGNhbiBiZSB1c2VkIHdoZW5cbiAgICogZGVmZXJyZWQgdG8gdGhlIGV4cHJlc3Npb24gdmlzaXRvciB0byBnZXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRhcmdldCBvZiBhbiBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gYm91bmRUZW1wbGF0ZSBib3VuZCB0ZW1wbGF0ZSB0YXJnZXRcbiAgICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhIG5vZGUgaW4gdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSBub2RlIHRvIHZpc2l0XG4gICAqL1xuICB2aXNpdChub2RlOiBIVE1MTm9kZSkge1xuICAgIG5vZGUudmlzaXQodGhpcyk7XG4gIH1cblxuICB2aXNpdEFsbChub2RlczogVG1wbEFzdE5vZGVbXSkge1xuICAgIG5vZGVzLmZvckVhY2gobm9kZSA9PiB0aGlzLnZpc2l0KG5vZGUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gaWRlbnRpZmllciBmb3IgYW4gSFRNTCBlbGVtZW50IGFuZCB2aXNpdCBpdHMgY2hpbGRyZW4gcmVjdXJzaXZlbHkuXG4gICAqXG4gICAqIEBwYXJhbSBlbGVtZW50XG4gICAqL1xuICB2aXNpdEVsZW1lbnQoZWxlbWVudDogVG1wbEFzdEVsZW1lbnQpIHtcbiAgICBjb25zdCBlbGVtZW50SWRlbnRpZmllciA9IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIoZWxlbWVudCk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLmFkZChlbGVtZW50SWRlbnRpZmllcik7XG5cbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQucmVmZXJlbmNlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmlucHV0cyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5jaGlsZHJlbik7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50Lm91dHB1dHMpO1xuICB9XG4gIHZpc2l0VGVtcGxhdGUodGVtcGxhdGU6IFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgIGNvbnN0IHRlbXBsYXRlSWRlbnRpZmllciA9IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIodGVtcGxhdGUpO1xuXG4gICAgdGhpcy5pZGVudGlmaWVycy5hZGQodGVtcGxhdGVJZGVudGlmaWVyKTtcblxuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudmFyaWFibGVzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmF0dHJpYnV0ZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUudGVtcGxhdGVBdHRycyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5jaGlsZHJlbik7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS5yZWZlcmVuY2VzKTtcbiAgfVxuICB2aXNpdEJvdW5kQXR0cmlidXRlKGF0dHJpYnV0ZTogVG1wbEFzdEJvdW5kQXR0cmlidXRlKSB7XG4gICAgLy8gQSBCb3VuZEF0dHJpYnV0ZSdzIHZhbHVlICh0aGUgcGFyZW50IEFTVCkgbWF5IGhhdmUgc3ViZXhwcmVzc2lvbnMgKGNoaWxkcmVuIEFTVHMpIHRoYXQgaGF2ZVxuICAgIC8vIHJlY29yZGVkIHNwYW5zIGV4dGVuZGluZyBwYXN0IHRoZSByZWNvcmRlZCBzcGFuIG9mIHRoZSBwYXJlbnQuIFRoZSBtb3N0IGNvbW1vbiBleGFtcGxlIG9mXG4gICAgLy8gdGhpcyBpcyB3aXRoIGAqbmdGb3JgLlxuICAgIC8vIFRvIHJlc29sdmUgdGhpcywgdXNlIHRoZSBpbmZvcm1hdGlvbiBvbiB0aGUgQm91bmRBdHRyaWJ1dGUgVGVtcGxhdGUgQVNULCB3aGljaCBpcyBhbHdheXNcbiAgICAvLyBjb3JyZWN0LCB0byBkZXRlcm1pbmUgbG9jYXRpb25zIG9mIGlkZW50aWZpZXJzIGluIHRoZSBleHByZXNzaW9uLlxuICAgIC8vXG4gICAgLy8gVE9ETyhheWF6aGFmaXopOiBSZW1vdmUgdGhpcyB3aGVuIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvcHVsbC8zMTgxMyBsYW5kcy5cbiAgICBjb25zdCBhdHRyaWJ1dGVTcmMgPSBhdHRyaWJ1dGUuc291cmNlU3Bhbi50b1N0cmluZygpO1xuICAgIGNvbnN0IGF0dHJpYnV0ZUFic29sdXRlUG9zaXRpb24gPSBhdHRyaWJ1dGUuc291cmNlU3Bhbi5zdGFydC5vZmZzZXQ7XG5cbiAgICAvLyBTa2lwIHRoZSBieXRlcyBvZiB0aGUgYXR0cmlidXRlIG5hbWUgc28gdGhhdCB0aGVyZSBhcmUgbm8gY29sbGlzaW9ucyBiZXR3ZWVuIHRoZSBhdHRyaWJ1dGVcbiAgICAvLyBuYW1lIGFuZCBleHByZXNzaW9uIGlkZW50aWZpZXIgbmFtZXMgbGF0ZXIuXG4gICAgY29uc3QgbmFtZVNraXBPZmZldCA9IGF0dHJpYnV0ZVNyYy5pbmRleE9mKGF0dHJpYnV0ZS5uYW1lKSArIGF0dHJpYnV0ZS5uYW1lLmxlbmd0aDtcbiAgICBjb25zdCBleHByZXNzaW9uU3JjID0gYXR0cmlidXRlU3JjLnN1YnN0cmluZyhuYW1lU2tpcE9mZmV0KTtcbiAgICBjb25zdCBleHByZXNzaW9uQWJzb2x1dGVQb3NpdGlvbiA9IGF0dHJpYnV0ZUFic29sdXRlUG9zaXRpb24gKyBuYW1lU2tpcE9mZmV0O1xuXG4gICAgY29uc3QgaWRlbnRpZmllcnMgPSBFeHByZXNzaW9uVmlzaXRvci5nZXRJZGVudGlmaWVycyhcbiAgICAgICAgYXR0cmlidXRlLnZhbHVlLCBleHByZXNzaW9uU3JjLCBleHByZXNzaW9uQWJzb2x1dGVQb3NpdGlvbiwgdGhpcy5ib3VuZFRlbXBsYXRlLFxuICAgICAgICB0aGlzLnRhcmdldFRvSWRlbnRpZmllci5iaW5kKHRoaXMpKTtcbiAgICBpZGVudGlmaWVycy5mb3JFYWNoKGlkID0+IHRoaXMuaWRlbnRpZmllcnMuYWRkKGlkKSk7XG4gIH1cbiAgdmlzaXRCb3VuZEV2ZW50KGF0dHJpYnV0ZTogVG1wbEFzdEJvdW5kRXZlbnQpIHtcbiAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbihhdHRyaWJ1dGUuaGFuZGxlcik7XG4gIH1cbiAgdmlzaXRCb3VuZFRleHQodGV4dDogVG1wbEFzdEJvdW5kVGV4dCkge1xuICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKHRleHQudmFsdWUpO1xuICB9XG4gIHZpc2l0UmVmZXJlbmNlKHJlZmVyZW5jZTogVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgIGNvbnN0IHJlZmVyZW5jZUlkZW50aWZlciA9IHRoaXMudGFyZ2V0VG9JZGVudGlmaWVyKHJlZmVyZW5jZSk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLmFkZChyZWZlcmVuY2VJZGVudGlmZXIpO1xuICB9XG4gIHZpc2l0VmFyaWFibGUodmFyaWFibGU6IFRtcGxBc3RWYXJpYWJsZSkge1xuICAgIGNvbnN0IHZhcmlhYmxlSWRlbnRpZmllciA9IHRoaXMudGFyZ2V0VG9JZGVudGlmaWVyKHZhcmlhYmxlKTtcblxuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKHZhcmlhYmxlSWRlbnRpZmllcik7XG4gIH1cblxuICAvKiogQ3JlYXRlcyBhbiBpZGVudGlmaWVyIGZvciBhIHRlbXBsYXRlIGVsZW1lbnQgb3IgdGVtcGxhdGUgbm9kZS4gKi9cbiAgcHJpdmF0ZSBlbGVtZW50T3JUZW1wbGF0ZVRvSWRlbnRpZmllcihub2RlOiBUbXBsQXN0RWxlbWVudHxUbXBsQXN0VGVtcGxhdGUpOiBFbGVtZW50SWRlbnRpZmllclxuICAgICAgfFRlbXBsYXRlTm9kZUlkZW50aWZpZXIge1xuICAgIC8vIElmIHRoaXMgbm9kZSBoYXMgYWxyZWFkeSBiZWVuIHNlZW4sIHJldHVybiB0aGUgY2FjaGVkIHJlc3VsdC5cbiAgICBpZiAodGhpcy5lbGVtZW50QW5kVGVtcGxhdGVJZGVudGlmaWVyQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50QW5kVGVtcGxhdGVJZGVudGlmaWVyQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBsZXQgbmFtZTogc3RyaW5nO1xuICAgIGxldCBraW5kOiBJZGVudGlmaWVyS2luZC5FbGVtZW50fElkZW50aWZpZXJLaW5kLlRlbXBsYXRlO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgICBuYW1lID0gbm9kZS50YWdOYW1lO1xuICAgICAga2luZCA9IElkZW50aWZpZXJLaW5kLlRlbXBsYXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbm9kZS5uYW1lO1xuICAgICAga2luZCA9IElkZW50aWZpZXJLaW5kLkVsZW1lbnQ7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVNwYW4gPSBub2RlLnN0YXJ0U291cmNlU3BhbjtcbiAgICAvLyBBbiBlbGVtZW50J3Mgb3IgdGVtcGxhdGUncyBzb3VyY2Ugc3BhbiBjYW4gYmUgb2YgdGhlIGZvcm0gYDxlbGVtZW50PmAsIGA8ZWxlbWVudCAvPmAsIG9yXG4gICAgLy8gYDxlbGVtZW50PjwvZWxlbWVudD5gLiBPbmx5IHRoZSBzZWxlY3RvciBpcyBpbnRlcmVzdGluZyB0byB0aGUgaW5kZXhlciwgc28gdGhlIHNvdXJjZSBpc1xuICAgIC8vIHNlYXJjaGVkIGZvciB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgZWxlbWVudCAoc2VsZWN0b3IpIG5hbWUuXG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmdldFN0YXJ0TG9jYXRpb24obmFtZSwgc291cmNlU3Bhbik7XG4gICAgY29uc3QgYWJzb2x1dGVTcGFuID0gbmV3IEFic29sdXRlU291cmNlU3BhbihzdGFydCwgc3RhcnQgKyBuYW1lLmxlbmd0aCk7XG5cbiAgICAvLyBSZWNvcmQgdGhlIG5vZGVzJ3MgYXR0cmlidXRlcywgd2hpY2ggYW4gaW5kZXhlciBjYW4gbGF0ZXIgdHJhdmVyc2UgdG8gc2VlIGlmIGFueSBvZiB0aGVtXG4gICAgLy8gc3BlY2lmeSBhIHVzZWQgZGlyZWN0aXZlIG9uIHRoZSBub2RlLlxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXMubWFwKCh7bmFtZSwgc291cmNlU3Bhbn0pOiBBdHRyaWJ1dGVJZGVudGlmaWVyID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNwYW46IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIHNvdXJjZVNwYW4uZW5kLm9mZnNldCksXG4gICAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLkF0dHJpYnV0ZSxcbiAgICAgIH07XG4gICAgfSk7XG4gICAgY29uc3QgdXNlZERpcmVjdGl2ZXMgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKSB8fCBbXTtcblxuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB7XG4gICAgICBuYW1lLFxuICAgICAgc3BhbjogYWJzb2x1dGVTcGFuLFxuICAgICAga2luZCxcbiAgICAgIGF0dHJpYnV0ZXM6IG5ldyBTZXQoYXR0cmlidXRlcyksXG4gICAgICB1c2VkRGlyZWN0aXZlczogbmV3IFNldCh1c2VkRGlyZWN0aXZlcy5tYXAoZGlyID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBub2RlOiBkaXIucmVmLm5vZGUsXG4gICAgICAgICAgc2VsZWN0b3I6IGRpci5zZWxlY3RvcixcbiAgICAgICAgfTtcbiAgICAgIH0pKSxcbiAgICAgIC8vIGNhc3QgYi9jIHByZS1UeXBlU2NyaXB0IDMuNSB1bmlvbnMgYXJlbid0IHdlbGwgZGlzY3JpbWluYXRlZFxuICAgIH0gYXMgRWxlbWVudElkZW50aWZpZXIgfFxuICAgICAgICBUZW1wbGF0ZU5vZGVJZGVudGlmaWVyO1xuXG4gICAgdGhpcy5lbGVtZW50QW5kVGVtcGxhdGVJZGVudGlmaWVyQ2FjaGUuc2V0KG5vZGUsIGlkZW50aWZpZXIpO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgLyoqIENyZWF0ZXMgYW4gaWRlbnRpZmllciBmb3IgYSB0ZW1wbGF0ZSByZWZlcmVuY2Ugb3IgdGVtcGxhdGUgdmFyaWFibGUgdGFyZ2V0LiAqL1xuICBwcml2YXRlIHRhcmdldFRvSWRlbnRpZmllcihub2RlOiBUbXBsQXN0UmVmZXJlbmNlfFRtcGxBc3RWYXJpYWJsZSk6IFRhcmdldElkZW50aWZpZXIge1xuICAgIC8vIElmIHRoaXMgbm9kZSBoYXMgYWxyZWFkeSBiZWVuIHNlZW4sIHJldHVybiB0aGUgY2FjaGVkIHJlc3VsdC5cbiAgICBpZiAodGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBjb25zdCB7bmFtZSwgc291cmNlU3Bhbn0gPSBub2RlO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5nZXRTdGFydExvY2F0aW9uKG5hbWUsIHNvdXJjZVNwYW4pO1xuICAgIGNvbnN0IHNwYW4gPSBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHN0YXJ0LCBzdGFydCArIG5hbWUubGVuZ3RoKTtcbiAgICBsZXQgaWRlbnRpZmllcjogUmVmZXJlbmNlSWRlbnRpZmllcnxWYXJpYWJsZUlkZW50aWZpZXI7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyBhIHJlZmVyZW5jZSwgd2UgY2FyZSBhYm91dCBpdHMgdGFyZ2V0LiBUaGUgdGFyZ2V0IGNhbiBiZSBhbiBlbGVtZW50LCBhXG4gICAgICAvLyB0ZW1wbGF0ZSwgYSBkaXJlY3RpdmUgYXBwbGllZCBvbiBhIHRlbXBsYXRlIG9yIGVsZW1lbnQgKGluIHdoaWNoIGNhc2UgdGhlIGRpcmVjdGl2ZSBmaWVsZFxuICAgICAgLy8gaXMgbm9uLW51bGwpLCBvciBub3RoaW5nIGF0IGFsbC5cbiAgICAgIGNvbnN0IHJlZlRhcmdldCA9IHRoaXMuYm91bmRUZW1wbGF0ZS5nZXRSZWZlcmVuY2VUYXJnZXQobm9kZSk7XG4gICAgICBsZXQgdGFyZ2V0ID0gbnVsbDtcbiAgICAgIGlmIChyZWZUYXJnZXQpIHtcbiAgICAgICAgaWYgKHJlZlRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHJlZlRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgICAgIHRhcmdldCA9IHtcbiAgICAgICAgICAgIG5vZGU6IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIocmVmVGFyZ2V0KSxcbiAgICAgICAgICAgIGRpcmVjdGl2ZTogbnVsbCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRhcmdldCA9IHtcbiAgICAgICAgICAgIG5vZGU6IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIocmVmVGFyZ2V0Lm5vZGUpLFxuICAgICAgICAgICAgZGlyZWN0aXZlOiByZWZUYXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWRlbnRpZmllciA9IHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc3BhbixcbiAgICAgICAga2luZDogSWRlbnRpZmllcktpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZGVudGlmaWVyID0ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBzcGFuLFxuICAgICAgICBraW5kOiBJZGVudGlmaWVyS2luZC5WYXJpYWJsZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuc2V0KG5vZGUsIGlkZW50aWZpZXIpO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgLyoqIEdldHMgdGhlIHN0YXJ0IGxvY2F0aW9uIG9mIGEgc3RyaW5nIGluIGEgU291cmNlU3BhbiAqL1xuICBwcml2YXRlIGdldFN0YXJ0TG9jYXRpb24obmFtZTogc3RyaW5nLCBjb250ZXh0OiBQYXJzZVNvdXJjZVNwYW4pOiBudW1iZXIge1xuICAgIGNvbnN0IGxvY2FsU3RyID0gY29udGV4dC50b1N0cmluZygpO1xuICAgIGlmICghbG9jYWxTdHIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke25hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbFN0cn1cImApO1xuICAgIH1cbiAgICByZXR1cm4gY29udGV4dC5zdGFydC5vZmZzZXQgKyBsb2NhbFN0ci5pbmRleE9mKG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhIG5vZGUncyBleHByZXNzaW9uIGFuZCBhZGRzIGl0cyBpZGVudGlmaWVycywgaWYgYW55LCB0byB0aGUgdmlzaXRvcidzIHN0YXRlLlxuICAgKiBPbmx5IEFTVHMgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZXhwcmVzc2lvbiBzb3VyY2UgYW5kIGl0cyBsb2NhdGlvbiBhcmUgdmlzaXRlZC5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgbm9kZSB3aG9zZSBleHByZXNzaW9uIHRvIHZpc2l0XG4gICAqL1xuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihhc3Q6IEFTVCkge1xuICAgIC8vIE9ubHkgaW5jbHVkZSBBU1RzIHRoYXQgaGF2ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGVpciBzb3VyY2UgYW5kIGFic29sdXRlIHNvdXJjZSBzcGFucy5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSAmJiBhc3Quc291cmNlICE9PSBudWxsKSB7XG4gICAgICAvLyBNYWtlIHRhcmdldCB0byBpZGVudGlmaWVyIG1hcHBpbmcgY2xvc3VyZSBzdGF0ZWZ1bCB0byB0aGlzIHZpc2l0b3IgaW5zdGFuY2UuXG4gICAgICBjb25zdCB0YXJnZXRUb0lkZW50aWZpZXIgPSB0aGlzLnRhcmdldFRvSWRlbnRpZmllci5iaW5kKHRoaXMpO1xuICAgICAgY29uc3QgYWJzb2x1dGVPZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydDtcbiAgICAgIGNvbnN0IGlkZW50aWZpZXJzID0gRXhwcmVzc2lvblZpc2l0b3IuZ2V0SWRlbnRpZmllcnMoXG4gICAgICAgICAgYXN0LCBhc3Quc291cmNlLCBhYnNvbHV0ZU9mZnNldCwgdGhpcy5ib3VuZFRlbXBsYXRlLCB0YXJnZXRUb0lkZW50aWZpZXIpO1xuICAgICAgaWRlbnRpZmllcnMuZm9yRWFjaChpZCA9PiB0aGlzLmlkZW50aWZpZXJzLmFkZChpZCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRyYXZlcnNlcyBhIHRlbXBsYXRlIEFTVCBhbmQgYnVpbGRzIGlkZW50aWZpZXJzIGRpc2NvdmVyZWQgaW4gaXQuXG4gKlxuICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGVtcGxhdGUgdGFyZ2V0LCB3aGljaCBjYW4gYmUgdXNlZCBmb3IgcXVlcnlpbmcgZXhwcmVzc2lvbiB0YXJnZXRzLlxuICogQHJldHVybiBpZGVudGlmaWVycyBpbiB0ZW1wbGF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVJZGVudGlmaWVycyhib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPik6XG4gICAgU2V0PFRvcExldmVsSWRlbnRpZmllcj4ge1xuICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVmlzaXRvcihib3VuZFRlbXBsYXRlKTtcbiAgaWYgKGJvdW5kVGVtcGxhdGUudGFyZ2V0LnRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2aXNpdG9yLnZpc2l0QWxsKGJvdW5kVGVtcGxhdGUudGFyZ2V0LnRlbXBsYXRlKTtcbiAgfVxuICByZXR1cm4gdmlzaXRvci5pZGVudGlmaWVycztcbn1cbiJdfQ==