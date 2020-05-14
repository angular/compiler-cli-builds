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
     * Copyright Google Inc. All Rights Reserved.
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
            var sourceSpan = node.sourceSpan;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBeVU7SUFDelUsdUVBQTROO0lBaUI1Tjs7Ozs7Ozs7T0FRRztJQUNIO1FBQWdDLDZDQUFtQjtRQUdqRCwyQkFDcUIsYUFBcUIsRUFBbUIsY0FBc0IsRUFDOUQsYUFBeUMsRUFDekMsa0JBQTREO1lBSGpGLFlBSUUsaUJBQU8sU0FDUjtZQUpvQixtQkFBYSxHQUFiLGFBQWEsQ0FBUTtZQUFtQixvQkFBYyxHQUFkLGNBQWMsQ0FBUTtZQUM5RCxtQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFDekMsd0JBQWtCLEdBQWxCLGtCQUFrQixDQUEwQztZQUx4RSxpQkFBVyxHQUEyQixFQUFFLENBQUM7O1FBT2xELENBQUM7UUFFRDs7Ozs7Ozs7OztXQVVHO1FBQ0ksZ0NBQWMsR0FBckIsVUFDSSxHQUFRLEVBQUUsTUFBYyxFQUFFLGNBQXNCLEVBQUUsYUFBeUMsRUFDM0Ysa0JBQTREO1lBQzlELElBQU0sT0FBTyxHQUNULElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNyRixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUM3QixDQUFDO1FBRUQsaUNBQUssR0FBTCxVQUFNLEdBQVE7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLENBQUM7UUFFRCwyQ0FBZSxHQUFmLFVBQWdCLEdBQWUsRUFBRSxPQUFXO1lBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFF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RTtnQkFDdkQsK0VBQStFO2dCQUMvRSxJQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlELElBQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO2dCQUM1QyxJQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLENBQ2hELEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQzdFLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxLQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDO2FBQ3JEO1FBQ0gsQ0FBQztRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQXJPRCxDQUE4QixrQ0FBdUIsR0FxT3BEO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQixzQkFBc0IsQ0FBQyxhQUF5QztRQUU5RSxJQUFNLE9BQU8sR0FBRyxJQUFJLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNuRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRTtZQUMvQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDakQ7UUFDRCxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7SUFDN0IsQ0FBQztJQVBELHdEQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBNZXRob2RDYWxsLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgUmVjdXJzaXZlQXN0VmlzaXRvciwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVjdXJzaXZlVmlzaXRvciwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBBdHRyaWJ1dGVJZGVudGlmaWVyLCBFbGVtZW50SWRlbnRpZmllciwgSWRlbnRpZmllcktpbmQsIE1ldGhvZElkZW50aWZpZXIsIFByb3BlcnR5SWRlbnRpZmllciwgUmVmZXJlbmNlSWRlbnRpZmllciwgVGVtcGxhdGVOb2RlSWRlbnRpZmllciwgVG9wTGV2ZWxJZGVudGlmaWVyLCBWYXJpYWJsZUlkZW50aWZpZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50TWV0YX0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIHBhcnNlZCBub2RlIGluIGEgdGVtcGxhdGUsIHdoaWNoIG1heSBoYXZlIGEgbmFtZSAoaWYgaXQgaXMgYSBzZWxlY3Rvcikgb3JcbiAqIGJlIGFub255bW91cyAobGlrZSBhIHRleHQgc3BhbikuXG4gKi9cbmludGVyZmFjZSBIVE1MTm9kZSBleHRlbmRzIFRtcGxBc3ROb2RlIHtcbiAgdGFnTmFtZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxudHlwZSBFeHByZXNzaW9uSWRlbnRpZmllciA9IFByb3BlcnR5SWRlbnRpZmllcnxNZXRob2RJZGVudGlmaWVyO1xudHlwZSBUbXBsVGFyZ2V0ID0gVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGU7XG50eXBlIFRhcmdldElkZW50aWZpZXIgPSBSZWZlcmVuY2VJZGVudGlmaWVyfFZhcmlhYmxlSWRlbnRpZmllcjtcbnR5cGUgVGFyZ2V0SWRlbnRpZmllck1hcCA9IE1hcDxUbXBsVGFyZ2V0LCBUYXJnZXRJZGVudGlmaWVyPjtcblxuLyoqXG4gKiBWaXNpdHMgdGhlIEFTVCBvZiBhbiBBbmd1bGFyIHRlbXBsYXRlIHN5bnRheCBleHByZXNzaW9uLCBmaW5kaW5nIGludGVyZXN0aW5nXG4gKiBlbnRpdGllcyAodmFyaWFibGUgcmVmZXJlbmNlcywgZXRjLikuIENyZWF0ZXMgYW4gYXJyYXkgb2YgRW50aXRpZXMgZm91bmQgaW5cbiAqIHRoZSBleHByZXNzaW9uLCB3aXRoIHRoZSBsb2NhdGlvbiBvZiB0aGUgRW50aXRpZXMgYmVpbmcgcmVsYXRpdmUgdG8gdGhlXG4gKiBleHByZXNzaW9uLlxuICpcbiAqIFZpc2l0aW5nIGB0ZXh0IHt7cHJvcH19YCB3aWxsIHJldHVyblxuICogYFtUb3BMZXZlbElkZW50aWZpZXIge25hbWU6ICdwcm9wJywgc3Bhbjoge3N0YXJ0OiA3LCBlbmQ6IDExfX1dYC5cbiAqL1xuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVBc3RWaXNpdG9yIHtcbiAgcmVhZG9ubHkgaWRlbnRpZmllcnM6IEV4cHJlc3Npb25JZGVudGlmaWVyW10gPSBbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBleHByZXNzaW9uU3RyOiBzdHJpbmcsIHByaXZhdGUgcmVhZG9ubHkgYWJzb2x1dGVPZmZzZXQ6IG51bWJlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldFRvSWRlbnRpZmllcjogKHRhcmdldDogVG1wbFRhcmdldCkgPT4gVGFyZ2V0SWRlbnRpZmllcikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdG8gdmlzaXRcbiAgICogQHBhcmFtIHNvdXJjZSBleHByZXNzaW9uIEFTVCBzb3VyY2UgY29kZVxuICAgKiBAcGFyYW0gYWJzb2x1dGVPZmZzZXQgYWJzb2x1dGUgYnl0ZSBvZmZzZXQgZnJvbSBzdGFydCBvZiB0aGUgZmlsZSB0byB0aGUgc3RhcnQgb2YgdGhlIEFTVFxuICAgKiBzb3VyY2UgY29kZS5cbiAgICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGFyZ2V0IG9mIHRoZSBlbnRpcmUgdGVtcGxhdGUsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHF1ZXJ5IGZvciB0aGVcbiAgICogZW50aXRpZXMgZXhwcmVzc2lvbnMgdGFyZ2V0LlxuICAgKiBAcGFyYW0gdGFyZ2V0VG9JZGVudGlmaWVyIGNsb3N1cmUgY29udmVydGluZyBhIHRlbXBsYXRlIHRhcmdldCBub2RlIHRvIGl0cyBpZGVudGlmaWVyLlxuICAgKi9cbiAgc3RhdGljIGdldElkZW50aWZpZXJzKFxuICAgICAgYXN0OiBBU1QsIHNvdXJjZTogc3RyaW5nLCBhYnNvbHV0ZU9mZnNldDogbnVtYmVyLCBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPixcbiAgICAgIHRhcmdldFRvSWRlbnRpZmllcjogKHRhcmdldDogVG1wbFRhcmdldCkgPT4gVGFyZ2V0SWRlbnRpZmllcik6IFRvcExldmVsSWRlbnRpZmllcltdIHtcbiAgICBjb25zdCB2aXNpdG9yID1cbiAgICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKHNvdXJjZSwgYWJzb2x1dGVPZmZzZXQsIGJvdW5kVGVtcGxhdGUsIHRhcmdldFRvSWRlbnRpZmllcik7XG4gICAgdmlzaXRvci52aXNpdChhc3QpO1xuICAgIHJldHVybiB2aXNpdG9yLmlkZW50aWZpZXJzO1xuICB9XG5cbiAgdmlzaXQoYXN0OiBBU1QpIHtcbiAgICBhc3QudmlzaXQodGhpcyk7XG4gIH1cblxuICB2aXNpdE1ldGhvZENhbGwoYXN0OiBNZXRob2RDYWxsLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMudmlzaXRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuTWV0aG9kKTtcbiAgICBzdXBlci52aXNpdE1ldGhvZENhbGwoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlSZWFkKGFzdDogUHJvcGVydHlSZWFkLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMudmlzaXRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuUHJvcGVydHkpO1xuICAgIHN1cGVyLnZpc2l0UHJvcGVydHlSZWFkKGFzdCwgY29udGV4dCk7XG4gIH1cblxuICB2aXNpdFByb3BlcnR5V3JpdGUoYXN0OiBQcm9wZXJ0eVdyaXRlLCBjb250ZXh0OiB7fSkge1xuICAgIHRoaXMudmlzaXRJZGVudGlmaWVyKGFzdCwgSWRlbnRpZmllcktpbmQuUHJvcGVydHkpO1xuICAgIHN1cGVyLnZpc2l0UHJvcGVydHlXcml0ZShhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhbiBpZGVudGlmaWVyLCBhZGRpbmcgaXQgdG8gdGhlIGlkZW50aWZpZXIgc3RvcmUgaWYgaXQgaXMgdXNlZnVsIGZvciBpbmRleGluZy5cbiAgICpcbiAgICogQHBhcmFtIGFzdCBleHByZXNzaW9uIEFTVCB0aGUgaWRlbnRpZmllciBpcyBpblxuICAgKiBAcGFyYW0ga2luZCBpZGVudGlmaWVyIGtpbmRcbiAgICovXG4gIHByaXZhdGUgdmlzaXRJZGVudGlmaWVyKFxuICAgICAgYXN0OiBBU1Qme25hbWU6IHN0cmluZywgcmVjZWl2ZXI6IEFTVH0sIGtpbmQ6IEV4cHJlc3Npb25JZGVudGlmaWVyWydraW5kJ10pIHtcbiAgICAvLyBUaGUgZGVmaW5pdGlvbiBvZiBhIG5vbi10b3AtbGV2ZWwgcHJvcGVydHkgc3VjaCBhcyBgYmFyYCBpbiBge3tmb28uYmFyfX1gIGlzIGN1cnJlbnRseVxuICAgIC8vIGltcG9zc2libGUgdG8gZGV0ZXJtaW5lIGJ5IGFuIGluZGV4ZXIgYW5kIHVuc3VwcG9ydGVkIGJ5IHRoZSBpbmRleGluZyBtb2R1bGUuXG4gICAgLy8gVGhlIGluZGV4aW5nIG1vZHVsZSBhbHNvIGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IHJlZmVyZW5jZXMgdG8gaWRlbnRpZmllcnMgZGVjbGFyZWQgaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgaXRzZWxmLCB3aGljaCBoYXZlIGEgbm9uLW51bGwgZXhwcmVzc2lvbiB0YXJnZXQuXG4gICAgaWYgKCEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZXQgdGhlIGxvY2F0aW9uIG9mIHRoZSBpZGVudGlmaWVyIG9mIHJlYWwgaW50ZXJlc3QuXG4gICAgLy8gVGhlIGNvbXBpbGVyJ3MgZXhwcmVzc2lvbiBwYXJzZXIgcmVjb3JkcyB0aGUgbG9jYXRpb24gb2Ygc29tZSBleHByZXNzaW9ucyBpbiBhIG1hbm5lciBub3RcbiAgICAvLyB1c2VmdWwgdG8gdGhlIGluZGV4ZXIuIEZvciBleGFtcGxlLCBhIGBNZXRob2RDYWxsYCBgZm9vKGEsIGIpYCB3aWxsIHJlY29yZCB0aGUgc3BhbiBvZiB0aGVcbiAgICAvLyBlbnRpcmUgbWV0aG9kIGNhbGwsIGJ1dCB0aGUgaW5kZXhlciBpcyBpbnRlcmVzdGVkIG9ubHkgaW4gdGhlIG1ldGhvZCBpZGVudGlmaWVyLlxuICAgIGNvbnN0IGxvY2FsRXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvblN0ci5zdWJzdHIoYXN0LnNwYW4uc3RhcnQpO1xuICAgIGlmICghbG9jYWxFeHByZXNzaW9uLmluY2x1ZGVzKGFzdC5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlIHN0YXRlOiBcIiR7YXN0Lm5hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbEV4cHJlc3Npb259XCJgKTtcbiAgICB9XG4gICAgY29uc3QgaWRlbnRpZmllclN0YXJ0ID0gYXN0LnNwYW4uc3RhcnQgKyBsb2NhbEV4cHJlc3Npb24uaW5kZXhPZihhc3QubmFtZSk7XG5cbiAgICAvLyBKb2luIHRoZSByZWxhdGl2ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBub2RlIHdpdGggdGhlIGFic29sdXRlIHBvc2l0aW9uXG4gICAgLy8gb2YgdGhlIG5vZGUgdG8gZ2V0IHRoZSBhYnNvbHV0ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiBpbiB0aGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgYWJzb2x1dGVTdGFydCA9IHRoaXMuYWJzb2x1dGVPZmZzZXQgKyBpZGVudGlmaWVyU3RhcnQ7XG4gICAgY29uc3Qgc3BhbiA9IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oYWJzb2x1dGVTdGFydCwgYWJzb2x1dGVTdGFydCArIGFzdC5uYW1lLmxlbmd0aCk7XG5cbiAgICBjb25zdCB0YXJnZXRBc3QgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGNvbnN0IHRhcmdldCA9IHRhcmdldEFzdCA/IHRoaXMudGFyZ2V0VG9JZGVudGlmaWVyKHRhcmdldEFzdCkgOiBudWxsO1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB7XG4gICAgICBuYW1lOiBhc3QubmFtZSxcbiAgICAgIHNwYW4sXG4gICAgICBraW5kLFxuICAgICAgdGFyZ2V0LFxuICAgIH0gYXMgRXhwcmVzc2lvbklkZW50aWZpZXI7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cbn1cblxuLyoqXG4gKiBWaXNpdHMgdGhlIEFTVCBvZiBhIHBhcnNlZCBBbmd1bGFyIHRlbXBsYXRlLiBEaXNjb3ZlcnMgYW5kIHN0b3Jlc1xuICogaWRlbnRpZmllcnMgb2YgaW50ZXJlc3QsIGRlZmVycmluZyB0byBhbiBgRXhwcmVzc2lvblZpc2l0b3JgIGFzIG5lZWRlZC5cbiAqL1xuY2xhc3MgVGVtcGxhdGVWaXNpdG9yIGV4dGVuZHMgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICAvLyBJZGVudGlmaWVycyBvZiBpbnRlcmVzdCBmb3VuZCBpbiB0aGUgdGVtcGxhdGUuXG4gIHJlYWRvbmx5IGlkZW50aWZpZXJzID0gbmV3IFNldDxUb3BMZXZlbElkZW50aWZpZXI+KCk7XG5cbiAgLy8gTWFwIG9mIHRhcmdldHMgaW4gYSB0ZW1wbGF0ZSB0byB0aGVpciBpZGVudGlmaWVycy5cbiAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXRJZGVudGlmaWVyQ2FjaGU6IFRhcmdldElkZW50aWZpZXJNYXAgPSBuZXcgTWFwKCk7XG5cbiAgLy8gTWFwIG9mIGVsZW1lbnRzIGFuZCB0ZW1wbGF0ZXMgdG8gdGhlaXIgaWRlbnRpZmllcnMuXG4gIHByaXZhdGUgcmVhZG9ubHkgZWxlbWVudEFuZFRlbXBsYXRlSWRlbnRpZmllckNhY2hlID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBFbGVtZW50SWRlbnRpZmllcnxUZW1wbGF0ZU5vZGVJZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgdGVtcGxhdGUgdmlzaXRvciBmb3IgYSBib3VuZCB0ZW1wbGF0ZSB0YXJnZXQuIFRoZSBib3VuZCB0YXJnZXQgY2FuIGJlIHVzZWQgd2hlblxuICAgKiBkZWZlcnJlZCB0byB0aGUgZXhwcmVzc2lvbiB2aXNpdG9yIHRvIGdldCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGFyZ2V0IG9mIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldFxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXRzIGEgbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIG5vZGUgdG8gdmlzaXRcbiAgICovXG4gIHZpc2l0KG5vZGU6IEhUTUxOb2RlKSB7XG4gICAgbm9kZS52aXNpdCh0aGlzKTtcbiAgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiBUbXBsQXN0Tm9kZVtdKSB7XG4gICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHRoaXMudmlzaXQobm9kZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBpZGVudGlmaWVyIGZvciBhbiBIVE1MIGVsZW1lbnQgYW5kIHZpc2l0IGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICpcbiAgICogQHBhcmFtIGVsZW1lbnRcbiAgICovXG4gIHZpc2l0RWxlbWVudChlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIGNvbnN0IGVsZW1lbnRJZGVudGlmaWVyID0gdGhpcy5lbGVtZW50T3JUZW1wbGF0ZVRvSWRlbnRpZmllcihlbGVtZW50KTtcblxuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKGVsZW1lbnRJZGVudGlmaWVyKTtcblxuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQub3V0cHV0cyk7XG4gIH1cbiAgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgY29uc3QgdGVtcGxhdGVJZGVudGlmaWVyID0gdGhpcy5lbGVtZW50T3JUZW1wbGF0ZVRvSWRlbnRpZmllcih0ZW1wbGF0ZSk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLmFkZCh0ZW1wbGF0ZUlkZW50aWZpZXIpO1xuXG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICB9XG4gIHZpc2l0Qm91bmRBdHRyaWJ1dGUoYXR0cmlidXRlOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAvLyBBIEJvdW5kQXR0cmlidXRlJ3MgdmFsdWUgKHRoZSBwYXJlbnQgQVNUKSBtYXkgaGF2ZSBzdWJleHByZXNzaW9ucyAoY2hpbGRyZW4gQVNUcykgdGhhdCBoYXZlXG4gICAgLy8gcmVjb3JkZWQgc3BhbnMgZXh0ZW5kaW5nIHBhc3QgdGhlIHJlY29yZGVkIHNwYW4gb2YgdGhlIHBhcmVudC4gVGhlIG1vc3QgY29tbW9uIGV4YW1wbGUgb2ZcbiAgICAvLyB0aGlzIGlzIHdpdGggYCpuZ0ZvcmAuXG4gICAgLy8gVG8gcmVzb2x2ZSB0aGlzLCB1c2UgdGhlIGluZm9ybWF0aW9uIG9uIHRoZSBCb3VuZEF0dHJpYnV0ZSBUZW1wbGF0ZSBBU1QsIHdoaWNoIGlzIGFsd2F5c1xuICAgIC8vIGNvcnJlY3QsIHRvIGRldGVybWluZSBsb2NhdGlvbnMgb2YgaWRlbnRpZmllcnMgaW4gdGhlIGV4cHJlc3Npb24uXG4gICAgLy9cbiAgICAvLyBUT0RPKGF5YXpoYWZpeik6IFJlbW92ZSB0aGlzIHdoZW4gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9wdWxsLzMxODEzIGxhbmRzLlxuICAgIGNvbnN0IGF0dHJpYnV0ZVNyYyA9IGF0dHJpYnV0ZS5zb3VyY2VTcGFuLnRvU3RyaW5nKCk7XG4gICAgY29uc3QgYXR0cmlidXRlQWJzb2x1dGVQb3NpdGlvbiA9IGF0dHJpYnV0ZS5zb3VyY2VTcGFuLnN0YXJ0Lm9mZnNldDtcblxuICAgIC8vIFNraXAgdGhlIGJ5dGVzIG9mIHRoZSBhdHRyaWJ1dGUgbmFtZSBzbyB0aGF0IHRoZXJlIGFyZSBubyBjb2xsaXNpb25zIGJldHdlZW4gdGhlIGF0dHJpYnV0ZVxuICAgIC8vIG5hbWUgYW5kIGV4cHJlc3Npb24gaWRlbnRpZmllciBuYW1lcyBsYXRlci5cbiAgICBjb25zdCBuYW1lU2tpcE9mZmV0ID0gYXR0cmlidXRlU3JjLmluZGV4T2YoYXR0cmlidXRlLm5hbWUpICsgYXR0cmlidXRlLm5hbWUubGVuZ3RoO1xuICAgIGNvbnN0IGV4cHJlc3Npb25TcmMgPSBhdHRyaWJ1dGVTcmMuc3Vic3RyaW5nKG5hbWVTa2lwT2ZmZXQpO1xuICAgIGNvbnN0IGV4cHJlc3Npb25BYnNvbHV0ZVBvc2l0aW9uID0gYXR0cmlidXRlQWJzb2x1dGVQb3NpdGlvbiArIG5hbWVTa2lwT2ZmZXQ7XG5cbiAgICBjb25zdCBpZGVudGlmaWVycyA9IEV4cHJlc3Npb25WaXNpdG9yLmdldElkZW50aWZpZXJzKFxuICAgICAgICBhdHRyaWJ1dGUudmFsdWUsIGV4cHJlc3Npb25TcmMsIGV4cHJlc3Npb25BYnNvbHV0ZVBvc2l0aW9uLCB0aGlzLmJvdW5kVGVtcGxhdGUsXG4gICAgICAgIHRoaXMudGFyZ2V0VG9JZGVudGlmaWVyLmJpbmQodGhpcykpO1xuICAgIGlkZW50aWZpZXJzLmZvckVhY2goaWQgPT4gdGhpcy5pZGVudGlmaWVycy5hZGQoaWQpKTtcbiAgfVxuICB2aXNpdEJvdW5kRXZlbnQoYXR0cmlidXRlOiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgIHRoaXMudmlzaXRFeHByZXNzaW9uKGF0dHJpYnV0ZS5oYW5kbGVyKTtcbiAgfVxuICB2aXNpdEJvdW5kVGV4dCh0ZXh0OiBUbXBsQXN0Qm91bmRUZXh0KSB7XG4gICAgdGhpcy52aXNpdEV4cHJlc3Npb24odGV4dC52YWx1ZSk7XG4gIH1cbiAgdmlzaXRSZWZlcmVuY2UocmVmZXJlbmNlOiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgY29uc3QgcmVmZXJlbmNlSWRlbnRpZmVyID0gdGhpcy50YXJnZXRUb0lkZW50aWZpZXIocmVmZXJlbmNlKTtcblxuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKHJlZmVyZW5jZUlkZW50aWZlcik7XG4gIH1cbiAgdmlzaXRWYXJpYWJsZSh2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgY29uc3QgdmFyaWFibGVJZGVudGlmaWVyID0gdGhpcy50YXJnZXRUb0lkZW50aWZpZXIodmFyaWFibGUpO1xuXG4gICAgdGhpcy5pZGVudGlmaWVycy5hZGQodmFyaWFibGVJZGVudGlmaWVyKTtcbiAgfVxuXG4gIC8qKiBDcmVhdGVzIGFuIGlkZW50aWZpZXIgZm9yIGEgdGVtcGxhdGUgZWxlbWVudCBvciB0ZW1wbGF0ZSBub2RlLiAqL1xuICBwcml2YXRlIGVsZW1lbnRPclRlbXBsYXRlVG9JZGVudGlmaWVyKG5vZGU6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZSk6IEVsZW1lbnRJZGVudGlmaWVyXG4gICAgICB8VGVtcGxhdGVOb2RlSWRlbnRpZmllciB7XG4gICAgLy8gSWYgdGhpcyBub2RlIGhhcyBhbHJlYWR5IGJlZW4gc2VlbiwgcmV0dXJuIHRoZSBjYWNoZWQgcmVzdWx0LlxuICAgIGlmICh0aGlzLmVsZW1lbnRBbmRUZW1wbGF0ZUlkZW50aWZpZXJDYWNoZS5oYXMobm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsZW1lbnRBbmRUZW1wbGF0ZUlkZW50aWZpZXJDYWNoZS5nZXQobm9kZSkhO1xuICAgIH1cblxuICAgIGxldCBuYW1lOiBzdHJpbmc7XG4gICAgbGV0IGtpbmQ6IElkZW50aWZpZXJLaW5kLkVsZW1lbnR8SWRlbnRpZmllcktpbmQuVGVtcGxhdGU7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgIG5hbWUgPSBub2RlLnRhZ05hbWU7XG4gICAgICBraW5kID0gSWRlbnRpZmllcktpbmQuVGVtcGxhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICBraW5kID0gSWRlbnRpZmllcktpbmQuRWxlbWVudDtcbiAgICB9XG4gICAgY29uc3Qge3NvdXJjZVNwYW59ID0gbm9kZTtcbiAgICAvLyBBbiBlbGVtZW50J3Mgb3IgdGVtcGxhdGUncyBzb3VyY2Ugc3BhbiBjYW4gYmUgb2YgdGhlIGZvcm0gYDxlbGVtZW50PmAsIGA8ZWxlbWVudCAvPmAsIG9yXG4gICAgLy8gYDxlbGVtZW50PjwvZWxlbWVudD5gLiBPbmx5IHRoZSBzZWxlY3RvciBpcyBpbnRlcmVzdGluZyB0byB0aGUgaW5kZXhlciwgc28gdGhlIHNvdXJjZSBpc1xuICAgIC8vIHNlYXJjaGVkIGZvciB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiB0aGUgZWxlbWVudCAoc2VsZWN0b3IpIG5hbWUuXG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmdldFN0YXJ0TG9jYXRpb24obmFtZSwgc291cmNlU3Bhbik7XG4gICAgY29uc3QgYWJzb2x1dGVTcGFuID0gbmV3IEFic29sdXRlU291cmNlU3BhbihzdGFydCwgc3RhcnQgKyBuYW1lLmxlbmd0aCk7XG5cbiAgICAvLyBSZWNvcmQgdGhlIG5vZGVzJ3MgYXR0cmlidXRlcywgd2hpY2ggYW4gaW5kZXhlciBjYW4gbGF0ZXIgdHJhdmVyc2UgdG8gc2VlIGlmIGFueSBvZiB0aGVtXG4gICAgLy8gc3BlY2lmeSBhIHVzZWQgZGlyZWN0aXZlIG9uIHRoZSBub2RlLlxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXMubWFwKCh7bmFtZSwgc291cmNlU3Bhbn0pOiBBdHRyaWJ1dGVJZGVudGlmaWVyID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNwYW46IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oc291cmNlU3Bhbi5zdGFydC5vZmZzZXQsIHNvdXJjZVNwYW4uZW5kLm9mZnNldCksXG4gICAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLkF0dHJpYnV0ZSxcbiAgICAgIH07XG4gICAgfSk7XG4gICAgY29uc3QgdXNlZERpcmVjdGl2ZXMgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RGlyZWN0aXZlc09mTm9kZShub2RlKSB8fCBbXTtcblxuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB7XG4gICAgICBuYW1lLFxuICAgICAgc3BhbjogYWJzb2x1dGVTcGFuLFxuICAgICAga2luZCxcbiAgICAgIGF0dHJpYnV0ZXM6IG5ldyBTZXQoYXR0cmlidXRlcyksXG4gICAgICB1c2VkRGlyZWN0aXZlczogbmV3IFNldCh1c2VkRGlyZWN0aXZlcy5tYXAoZGlyID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBub2RlOiBkaXIucmVmLm5vZGUsXG4gICAgICAgICAgc2VsZWN0b3I6IGRpci5zZWxlY3RvcixcbiAgICAgICAgfTtcbiAgICAgIH0pKSxcbiAgICAgIC8vIGNhc3QgYi9jIHByZS1UeXBlU2NyaXB0IDMuNSB1bmlvbnMgYXJlbid0IHdlbGwgZGlzY3JpbWluYXRlZFxuICAgIH0gYXMgRWxlbWVudElkZW50aWZpZXIgfFxuICAgICAgICBUZW1wbGF0ZU5vZGVJZGVudGlmaWVyO1xuXG4gICAgdGhpcy5lbGVtZW50QW5kVGVtcGxhdGVJZGVudGlmaWVyQ2FjaGUuc2V0KG5vZGUsIGlkZW50aWZpZXIpO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgLyoqIENyZWF0ZXMgYW4gaWRlbnRpZmllciBmb3IgYSB0ZW1wbGF0ZSByZWZlcmVuY2Ugb3IgdGVtcGxhdGUgdmFyaWFibGUgdGFyZ2V0LiAqL1xuICBwcml2YXRlIHRhcmdldFRvSWRlbnRpZmllcihub2RlOiBUbXBsQXN0UmVmZXJlbmNlfFRtcGxBc3RWYXJpYWJsZSk6IFRhcmdldElkZW50aWZpZXIge1xuICAgIC8vIElmIHRoaXMgbm9kZSBoYXMgYWxyZWFkeSBiZWVuIHNlZW4sIHJldHVybiB0aGUgY2FjaGVkIHJlc3VsdC5cbiAgICBpZiAodGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICB9XG5cbiAgICBjb25zdCB7bmFtZSwgc291cmNlU3Bhbn0gPSBub2RlO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5nZXRTdGFydExvY2F0aW9uKG5hbWUsIHNvdXJjZVNwYW4pO1xuICAgIGNvbnN0IHNwYW4gPSBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHN0YXJ0LCBzdGFydCArIG5hbWUubGVuZ3RoKTtcbiAgICBsZXQgaWRlbnRpZmllcjogUmVmZXJlbmNlSWRlbnRpZmllcnxWYXJpYWJsZUlkZW50aWZpZXI7XG4gICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBUbXBsQXN0UmVmZXJlbmNlKSB7XG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyBhIHJlZmVyZW5jZSwgd2UgY2FyZSBhYm91dCBpdHMgdGFyZ2V0LiBUaGUgdGFyZ2V0IGNhbiBiZSBhbiBlbGVtZW50LCBhXG4gICAgICAvLyB0ZW1wbGF0ZSwgYSBkaXJlY3RpdmUgYXBwbGllZCBvbiBhIHRlbXBsYXRlIG9yIGVsZW1lbnQgKGluIHdoaWNoIGNhc2UgdGhlIGRpcmVjdGl2ZSBmaWVsZFxuICAgICAgLy8gaXMgbm9uLW51bGwpLCBvciBub3RoaW5nIGF0IGFsbC5cbiAgICAgIGNvbnN0IHJlZlRhcmdldCA9IHRoaXMuYm91bmRUZW1wbGF0ZS5nZXRSZWZlcmVuY2VUYXJnZXQobm9kZSk7XG4gICAgICBsZXQgdGFyZ2V0ID0gbnVsbDtcbiAgICAgIGlmIChyZWZUYXJnZXQpIHtcbiAgICAgICAgaWYgKHJlZlRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RFbGVtZW50IHx8IHJlZlRhcmdldCBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgICAgIHRhcmdldCA9IHtcbiAgICAgICAgICAgIG5vZGU6IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIocmVmVGFyZ2V0KSxcbiAgICAgICAgICAgIGRpcmVjdGl2ZTogbnVsbCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRhcmdldCA9IHtcbiAgICAgICAgICAgIG5vZGU6IHRoaXMuZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIocmVmVGFyZ2V0Lm5vZGUpLFxuICAgICAgICAgICAgZGlyZWN0aXZlOiByZWZUYXJnZXQuZGlyZWN0aXZlLnJlZi5ub2RlLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWRlbnRpZmllciA9IHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc3BhbixcbiAgICAgICAga2luZDogSWRlbnRpZmllcktpbmQuUmVmZXJlbmNlLFxuICAgICAgICB0YXJnZXQsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZGVudGlmaWVyID0ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBzcGFuLFxuICAgICAgICBraW5kOiBJZGVudGlmaWVyS2luZC5WYXJpYWJsZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXRJZGVudGlmaWVyQ2FjaGUuc2V0KG5vZGUsIGlkZW50aWZpZXIpO1xuICAgIHJldHVybiBpZGVudGlmaWVyO1xuICB9XG5cbiAgLyoqIEdldHMgdGhlIHN0YXJ0IGxvY2F0aW9uIG9mIGEgc3RyaW5nIGluIGEgU291cmNlU3BhbiAqL1xuICBwcml2YXRlIGdldFN0YXJ0TG9jYXRpb24obmFtZTogc3RyaW5nLCBjb250ZXh0OiBQYXJzZVNvdXJjZVNwYW4pOiBudW1iZXIge1xuICAgIGNvbnN0IGxvY2FsU3RyID0gY29udGV4dC50b1N0cmluZygpO1xuICAgIGlmICghbG9jYWxTdHIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZSBzdGF0ZTogXCIke25hbWV9XCIgbm90IGZvdW5kIGluIFwiJHtsb2NhbFN0cn1cImApO1xuICAgIH1cbiAgICByZXR1cm4gY29udGV4dC5zdGFydC5vZmZzZXQgKyBsb2NhbFN0ci5pbmRleE9mKG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFZpc2l0cyBhIG5vZGUncyBleHByZXNzaW9uIGFuZCBhZGRzIGl0cyBpZGVudGlmaWVycywgaWYgYW55LCB0byB0aGUgdmlzaXRvcidzIHN0YXRlLlxuICAgKiBPbmx5IEFTVHMgd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZXhwcmVzc2lvbiBzb3VyY2UgYW5kIGl0cyBsb2NhdGlvbiBhcmUgdmlzaXRlZC5cbiAgICpcbiAgICogQHBhcmFtIG5vZGUgbm9kZSB3aG9zZSBleHByZXNzaW9uIHRvIHZpc2l0XG4gICAqL1xuICBwcml2YXRlIHZpc2l0RXhwcmVzc2lvbihhc3Q6IEFTVCkge1xuICAgIC8vIE9ubHkgaW5jbHVkZSBBU1RzIHRoYXQgaGF2ZSBpbmZvcm1hdGlvbiBhYm91dCB0aGVpciBzb3VyY2UgYW5kIGFic29sdXRlIHNvdXJjZSBzcGFucy5cbiAgICBpZiAoYXN0IGluc3RhbmNlb2YgQVNUV2l0aFNvdXJjZSAmJiBhc3Quc291cmNlICE9PSBudWxsKSB7XG4gICAgICAvLyBNYWtlIHRhcmdldCB0byBpZGVudGlmaWVyIG1hcHBpbmcgY2xvc3VyZSBzdGF0ZWZ1bCB0byB0aGlzIHZpc2l0b3IgaW5zdGFuY2UuXG4gICAgICBjb25zdCB0YXJnZXRUb0lkZW50aWZpZXIgPSB0aGlzLnRhcmdldFRvSWRlbnRpZmllci5iaW5kKHRoaXMpO1xuICAgICAgY29uc3QgYWJzb2x1dGVPZmZzZXQgPSBhc3Quc291cmNlU3Bhbi5zdGFydDtcbiAgICAgIGNvbnN0IGlkZW50aWZpZXJzID0gRXhwcmVzc2lvblZpc2l0b3IuZ2V0SWRlbnRpZmllcnMoXG4gICAgICAgICAgYXN0LCBhc3Quc291cmNlLCBhYnNvbHV0ZU9mZnNldCwgdGhpcy5ib3VuZFRlbXBsYXRlLCB0YXJnZXRUb0lkZW50aWZpZXIpO1xuICAgICAgaWRlbnRpZmllcnMuZm9yRWFjaChpZCA9PiB0aGlzLmlkZW50aWZpZXJzLmFkZChpZCkpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRyYXZlcnNlcyBhIHRlbXBsYXRlIEFTVCBhbmQgYnVpbGRzIGlkZW50aWZpZXJzIGRpc2NvdmVyZWQgaW4gaXQuXG4gKlxuICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGVtcGxhdGUgdGFyZ2V0LCB3aGljaCBjYW4gYmUgdXNlZCBmb3IgcXVlcnlpbmcgZXhwcmVzc2lvbiB0YXJnZXRzLlxuICogQHJldHVybiBpZGVudGlmaWVycyBpbiB0ZW1wbGF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGVtcGxhdGVJZGVudGlmaWVycyhib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPik6XG4gICAgU2V0PFRvcExldmVsSWRlbnRpZmllcj4ge1xuICBjb25zdCB2aXNpdG9yID0gbmV3IFRlbXBsYXRlVmlzaXRvcihib3VuZFRlbXBsYXRlKTtcbiAgaWYgKGJvdW5kVGVtcGxhdGUudGFyZ2V0LnRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2aXNpdG9yLnZpc2l0QWxsKGJvdW5kVGVtcGxhdGUudGFyZ2V0LnRlbXBsYXRlKTtcbiAgfVxuICByZXR1cm4gdmlzaXRvci5pZGVudGlmaWVycztcbn1cbiJdfQ==