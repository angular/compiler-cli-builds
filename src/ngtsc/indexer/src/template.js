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
            // The source span of the requested AST starts at a location that is offset from the expression.
            var identifierStart = ast.sourceSpan.start - this.absoluteOffset;
            if (!this.expressionStr.substring(identifierStart).startsWith(ast.name)) {
                throw new Error("Impossible state: \"" + ast.name + "\" not found in \"" + this.expressionStr + "\" at location " + identifierStart);
            }
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
            // If the bound attribute has no value, it cannot have any identifiers in the value expression.
            if (attribute.valueSpan === undefined) {
                return;
            }
            var identifiers = ExpressionVisitor.getIdentifiers(attribute.value, attribute.valueSpan.toString(), attribute.valueSpan.start.offset, this.boundTemplate, this.targetToIdentifier.bind(this));
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
                // cast b/c pre-TypeScript 3.5 unions aren't well discriminated
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luZGV4ZXIvc3JjL3RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBNlQ7SUFDN1QsdUVBQTROO0lBaUI1Tjs7Ozs7Ozs7T0FRRztJQUNIO1FBQWdDLDZDQUFtQjtRQUdqRCwyQkFDcUIsYUFBcUIsRUFBbUIsY0FBc0IsRUFDOUQsYUFBeUMsRUFDekMsa0JBQTREO1lBSGpGLFlBSUUsaUJBQU8sU0FDUjtZQUpvQixtQkFBYSxHQUFiLGFBQWEsQ0FBUTtZQUFtQixvQkFBYyxHQUFkLGNBQWMsQ0FBUTtZQUM5RCxtQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFDekMsd0JBQWtCLEdBQWxCLGtCQUFrQixDQUEwQztZQUx4RSxpQkFBVyxHQUEyQixFQUFFLENBQUM7O1FBT2xELENBQUM7UUFFRDs7Ozs7Ozs7OztXQVVHO1FBQ0ksZ0NBQWMsR0FBckIsVUFDSSxHQUFRLEVBQUUsTUFBYyxFQUFFLGNBQXNCLEVBQUUsYUFBeUMsRUFDM0Ysa0JBQTREO1lBQzlELElBQU0sT0FBTyxHQUNULElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNyRixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUM3QixDQUFDO1FBRVEsaUNBQUssR0FBZCxVQUFlLEdBQVE7WUFDckIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBRVEsNkNBQWlCLEdBQTFCLFVBQTJCLEdBQWlCLEVBQUUsT0FBVztZQUN2RCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcs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SUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7WUFDL0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO0lBQzdCLENBQUM7SUFQRCx3REFPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBU1QsIEFTVFdpdGhTb3VyY2UsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5UmVhZCwgUHJvcGVydHlXcml0ZSwgUmVjdXJzaXZlQXN0VmlzaXRvciwgVG1wbEFzdEJvdW5kQXR0cmlidXRlLCBUbXBsQXN0Qm91bmRFdmVudCwgVG1wbEFzdEJvdW5kVGV4dCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVjdXJzaXZlVmlzaXRvciwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBBdHRyaWJ1dGVJZGVudGlmaWVyLCBFbGVtZW50SWRlbnRpZmllciwgSWRlbnRpZmllcktpbmQsIE1ldGhvZElkZW50aWZpZXIsIFByb3BlcnR5SWRlbnRpZmllciwgUmVmZXJlbmNlSWRlbnRpZmllciwgVGVtcGxhdGVOb2RlSWRlbnRpZmllciwgVG9wTGV2ZWxJZGVudGlmaWVyLCBWYXJpYWJsZUlkZW50aWZpZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50TWV0YX0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBBIHBhcnNlZCBub2RlIGluIGEgdGVtcGxhdGUsIHdoaWNoIG1heSBoYXZlIGEgbmFtZSAoaWYgaXQgaXMgYSBzZWxlY3Rvcikgb3JcbiAqIGJlIGFub255bW91cyAobGlrZSBhIHRleHQgc3BhbikuXG4gKi9cbmludGVyZmFjZSBIVE1MTm9kZSBleHRlbmRzIFRtcGxBc3ROb2RlIHtcbiAgdGFnTmFtZT86IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbn1cblxudHlwZSBFeHByZXNzaW9uSWRlbnRpZmllciA9IFByb3BlcnR5SWRlbnRpZmllcnxNZXRob2RJZGVudGlmaWVyO1xudHlwZSBUbXBsVGFyZ2V0ID0gVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGU7XG50eXBlIFRhcmdldElkZW50aWZpZXIgPSBSZWZlcmVuY2VJZGVudGlmaWVyfFZhcmlhYmxlSWRlbnRpZmllcjtcbnR5cGUgVGFyZ2V0SWRlbnRpZmllck1hcCA9IE1hcDxUbXBsVGFyZ2V0LCBUYXJnZXRJZGVudGlmaWVyPjtcblxuLyoqXG4gKiBWaXNpdHMgdGhlIEFTVCBvZiBhbiBBbmd1bGFyIHRlbXBsYXRlIHN5bnRheCBleHByZXNzaW9uLCBmaW5kaW5nIGludGVyZXN0aW5nXG4gKiBlbnRpdGllcyAodmFyaWFibGUgcmVmZXJlbmNlcywgZXRjLikuIENyZWF0ZXMgYW4gYXJyYXkgb2YgRW50aXRpZXMgZm91bmQgaW5cbiAqIHRoZSBleHByZXNzaW9uLCB3aXRoIHRoZSBsb2NhdGlvbiBvZiB0aGUgRW50aXRpZXMgYmVpbmcgcmVsYXRpdmUgdG8gdGhlXG4gKiBleHByZXNzaW9uLlxuICpcbiAqIFZpc2l0aW5nIGB0ZXh0IHt7cHJvcH19YCB3aWxsIHJldHVyblxuICogYFtUb3BMZXZlbElkZW50aWZpZXIge25hbWU6ICdwcm9wJywgc3Bhbjoge3N0YXJ0OiA3LCBlbmQ6IDExfX1dYC5cbiAqL1xuY2xhc3MgRXhwcmVzc2lvblZpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVBc3RWaXNpdG9yIHtcbiAgcmVhZG9ubHkgaWRlbnRpZmllcnM6IEV4cHJlc3Npb25JZGVudGlmaWVyW10gPSBbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBleHByZXNzaW9uU3RyOiBzdHJpbmcsIHByaXZhdGUgcmVhZG9ubHkgYWJzb2x1dGVPZmZzZXQ6IG51bWJlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRhcmdldFRvSWRlbnRpZmllcjogKHRhcmdldDogVG1wbFRhcmdldCkgPT4gVGFyZ2V0SWRlbnRpZmllcikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdG8gdmlzaXRcbiAgICogQHBhcmFtIHNvdXJjZSBleHByZXNzaW9uIEFTVCBzb3VyY2UgY29kZVxuICAgKiBAcGFyYW0gYWJzb2x1dGVPZmZzZXQgYWJzb2x1dGUgYnl0ZSBvZmZzZXQgZnJvbSBzdGFydCBvZiB0aGUgZmlsZSB0byB0aGUgc3RhcnQgb2YgdGhlIEFTVFxuICAgKiBzb3VyY2UgY29kZS5cbiAgICogQHBhcmFtIGJvdW5kVGVtcGxhdGUgYm91bmQgdGFyZ2V0IG9mIHRoZSBlbnRpcmUgdGVtcGxhdGUsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHF1ZXJ5IGZvciB0aGVcbiAgICogZW50aXRpZXMgZXhwcmVzc2lvbnMgdGFyZ2V0LlxuICAgKiBAcGFyYW0gdGFyZ2V0VG9JZGVudGlmaWVyIGNsb3N1cmUgY29udmVydGluZyBhIHRlbXBsYXRlIHRhcmdldCBub2RlIHRvIGl0cyBpZGVudGlmaWVyLlxuICAgKi9cbiAgc3RhdGljIGdldElkZW50aWZpZXJzKFxuICAgICAgYXN0OiBBU1QsIHNvdXJjZTogc3RyaW5nLCBhYnNvbHV0ZU9mZnNldDogbnVtYmVyLCBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPixcbiAgICAgIHRhcmdldFRvSWRlbnRpZmllcjogKHRhcmdldDogVG1wbFRhcmdldCkgPT4gVGFyZ2V0SWRlbnRpZmllcik6IFRvcExldmVsSWRlbnRpZmllcltdIHtcbiAgICBjb25zdCB2aXNpdG9yID1cbiAgICAgICAgbmV3IEV4cHJlc3Npb25WaXNpdG9yKHNvdXJjZSwgYWJzb2x1dGVPZmZzZXQsIGJvdW5kVGVtcGxhdGUsIHRhcmdldFRvSWRlbnRpZmllcik7XG4gICAgdmlzaXRvci52aXNpdChhc3QpO1xuICAgIHJldHVybiB2aXNpdG9yLmlkZW50aWZpZXJzO1xuICB9XG5cbiAgb3ZlcnJpZGUgdmlzaXQoYXN0OiBBU1QpIHtcbiAgICBhc3QudmlzaXQodGhpcyk7XG4gIH1cblxuICBvdmVycmlkZSB2aXNpdFByb3BlcnR5UmVhZChhc3Q6IFByb3BlcnR5UmVhZCwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5UmVhZChhc3QsIGNvbnRleHQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSwgY29udGV4dDoge30pIHtcbiAgICB0aGlzLnZpc2l0SWRlbnRpZmllcihhc3QsIElkZW50aWZpZXJLaW5kLlByb3BlcnR5KTtcbiAgICBzdXBlci52aXNpdFByb3BlcnR5V3JpdGUoYXN0LCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYW4gaWRlbnRpZmllciwgYWRkaW5nIGl0IHRvIHRoZSBpZGVudGlmaWVyIHN0b3JlIGlmIGl0IGlzIHVzZWZ1bCBmb3IgaW5kZXhpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBhc3QgZXhwcmVzc2lvbiBBU1QgdGhlIGlkZW50aWZpZXIgaXMgaW5cbiAgICogQHBhcmFtIGtpbmQgaWRlbnRpZmllciBraW5kXG4gICAqL1xuICBwcml2YXRlIHZpc2l0SWRlbnRpZmllcihcbiAgICAgIGFzdDogQVNUJntuYW1lOiBzdHJpbmcsIHJlY2VpdmVyOiBBU1R9LCBraW5kOiBFeHByZXNzaW9uSWRlbnRpZmllclsna2luZCddKSB7XG4gICAgLy8gVGhlIGRlZmluaXRpb24gb2YgYSBub24tdG9wLWxldmVsIHByb3BlcnR5IHN1Y2ggYXMgYGJhcmAgaW4gYHt7Zm9vLmJhcn19YCBpcyBjdXJyZW50bHlcbiAgICAvLyBpbXBvc3NpYmxlIHRvIGRldGVybWluZSBieSBhbiBpbmRleGVyIGFuZCB1bnN1cHBvcnRlZCBieSB0aGUgaW5kZXhpbmcgbW9kdWxlLlxuICAgIC8vIFRoZSBpbmRleGluZyBtb2R1bGUgYWxzbyBkb2VzIG5vdCBjdXJyZW50bHkgc3VwcG9ydCByZWZlcmVuY2VzIHRvIGlkZW50aWZpZXJzIGRlY2xhcmVkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIGl0c2VsZiwgd2hpY2ggaGF2ZSBhIG5vbi1udWxsIGV4cHJlc3Npb24gdGFyZ2V0LlxuICAgIGlmICghKGFzdC5yZWNlaXZlciBpbnN0YW5jZW9mIEltcGxpY2l0UmVjZWl2ZXIpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlIHNvdXJjZSBzcGFuIG9mIHRoZSByZXF1ZXN0ZWQgQVNUIHN0YXJ0cyBhdCBhIGxvY2F0aW9uIHRoYXQgaXMgb2Zmc2V0IGZyb20gdGhlIGV4cHJlc3Npb24uXG4gICAgY29uc3QgaWRlbnRpZmllclN0YXJ0ID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQgLSB0aGlzLmFic29sdXRlT2Zmc2V0O1xuICAgIGlmICghdGhpcy5leHByZXNzaW9uU3RyLnN1YnN0cmluZyhpZGVudGlmaWVyU3RhcnQpLnN0YXJ0c1dpdGgoYXN0Lm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGUgc3RhdGU6IFwiJHthc3QubmFtZX1cIiBub3QgZm91bmQgaW4gXCIke1xuICAgICAgICAgIHRoaXMuZXhwcmVzc2lvblN0cn1cIiBhdCBsb2NhdGlvbiAke2lkZW50aWZpZXJTdGFydH1gKTtcbiAgICB9XG5cbiAgICAvLyBKb2luIHRoZSByZWxhdGl2ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBub2RlIHdpdGggdGhlIGFic29sdXRlIHBvc2l0aW9uXG4gICAgLy8gb2YgdGhlIG5vZGUgdG8gZ2V0IHRoZSBhYnNvbHV0ZSBwb3NpdGlvbiBvZiB0aGUgZXhwcmVzc2lvbiBpbiB0aGUgc291cmNlIGNvZGUuXG4gICAgY29uc3QgYWJzb2x1dGVTdGFydCA9IHRoaXMuYWJzb2x1dGVPZmZzZXQgKyBpZGVudGlmaWVyU3RhcnQ7XG4gICAgY29uc3Qgc3BhbiA9IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oYWJzb2x1dGVTdGFydCwgYWJzb2x1dGVTdGFydCArIGFzdC5uYW1lLmxlbmd0aCk7XG5cbiAgICBjb25zdCB0YXJnZXRBc3QgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGNvbnN0IHRhcmdldCA9IHRhcmdldEFzdCA/IHRoaXMudGFyZ2V0VG9JZGVudGlmaWVyKHRhcmdldEFzdCkgOiBudWxsO1xuICAgIGNvbnN0IGlkZW50aWZpZXIgPSB7XG4gICAgICBuYW1lOiBhc3QubmFtZSxcbiAgICAgIHNwYW4sXG4gICAgICBraW5kLFxuICAgICAgdGFyZ2V0LFxuICAgIH0gYXMgRXhwcmVzc2lvbklkZW50aWZpZXI7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH1cbn1cblxuLyoqXG4gKiBWaXNpdHMgdGhlIEFTVCBvZiBhIHBhcnNlZCBBbmd1bGFyIHRlbXBsYXRlLiBEaXNjb3ZlcnMgYW5kIHN0b3Jlc1xuICogaWRlbnRpZmllcnMgb2YgaW50ZXJlc3QsIGRlZmVycmluZyB0byBhbiBgRXhwcmVzc2lvblZpc2l0b3JgIGFzIG5lZWRlZC5cbiAqL1xuY2xhc3MgVGVtcGxhdGVWaXNpdG9yIGV4dGVuZHMgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICAvLyBJZGVudGlmaWVycyBvZiBpbnRlcmVzdCBmb3VuZCBpbiB0aGUgdGVtcGxhdGUuXG4gIHJlYWRvbmx5IGlkZW50aWZpZXJzID0gbmV3IFNldDxUb3BMZXZlbElkZW50aWZpZXI+KCk7XG5cbiAgLy8gTWFwIG9mIHRhcmdldHMgaW4gYSB0ZW1wbGF0ZSB0byB0aGVpciBpZGVudGlmaWVycy5cbiAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXRJZGVudGlmaWVyQ2FjaGU6IFRhcmdldElkZW50aWZpZXJNYXAgPSBuZXcgTWFwKCk7XG5cbiAgLy8gTWFwIG9mIGVsZW1lbnRzIGFuZCB0ZW1wbGF0ZXMgdG8gdGhlaXIgaWRlbnRpZmllcnMuXG4gIHByaXZhdGUgcmVhZG9ubHkgZWxlbWVudEFuZFRlbXBsYXRlSWRlbnRpZmllckNhY2hlID1cbiAgICAgIG5ldyBNYXA8VG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlLCBFbGVtZW50SWRlbnRpZmllcnxUZW1wbGF0ZU5vZGVJZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgdGVtcGxhdGUgdmlzaXRvciBmb3IgYSBib3VuZCB0ZW1wbGF0ZSB0YXJnZXQuIFRoZSBib3VuZCB0YXJnZXQgY2FuIGJlIHVzZWQgd2hlblxuICAgKiBkZWZlcnJlZCB0byB0aGUgZXhwcmVzc2lvbiB2aXNpdG9yIHRvIGdldCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGFyZ2V0IG9mIGFuIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldFxuICAgKi9cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBib3VuZFRlbXBsYXRlOiBCb3VuZFRhcmdldDxDb21wb25lbnRNZXRhPikge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogVmlzaXRzIGEgbm9kZSBpbiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIG5vZGUgdG8gdmlzaXRcbiAgICovXG4gIHZpc2l0KG5vZGU6IEhUTUxOb2RlKSB7XG4gICAgbm9kZS52aXNpdCh0aGlzKTtcbiAgfVxuXG4gIHZpc2l0QWxsKG5vZGVzOiBUbXBsQXN0Tm9kZVtdKSB7XG4gICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHRoaXMudmlzaXQobm9kZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBpZGVudGlmaWVyIGZvciBhbiBIVE1MIGVsZW1lbnQgYW5kIHZpc2l0IGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICpcbiAgICogQHBhcmFtIGVsZW1lbnRcbiAgICovXG4gIG92ZXJyaWRlIHZpc2l0RWxlbWVudChlbGVtZW50OiBUbXBsQXN0RWxlbWVudCkge1xuICAgIGNvbnN0IGVsZW1lbnRJZGVudGlmaWVyID0gdGhpcy5lbGVtZW50T3JUZW1wbGF0ZVRvSWRlbnRpZmllcihlbGVtZW50KTtcblxuICAgIHRoaXMuaWRlbnRpZmllcnMuYWRkKGVsZW1lbnRJZGVudGlmaWVyKTtcblxuICAgIHRoaXMudmlzaXRBbGwoZWxlbWVudC5yZWZlcmVuY2VzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuaW5wdXRzKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbChlbGVtZW50LmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKGVsZW1lbnQub3V0cHV0cyk7XG4gIH1cbiAgb3ZlcnJpZGUgdmlzaXRUZW1wbGF0ZSh0ZW1wbGF0ZTogVG1wbEFzdFRlbXBsYXRlKSB7XG4gICAgY29uc3QgdGVtcGxhdGVJZGVudGlmaWVyID0gdGhpcy5lbGVtZW50T3JUZW1wbGF0ZVRvSWRlbnRpZmllcih0ZW1wbGF0ZSk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLmFkZCh0ZW1wbGF0ZUlkZW50aWZpZXIpO1xuXG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS52YXJpYWJsZXMpO1xuICAgIHRoaXMudmlzaXRBbGwodGVtcGxhdGUuYXR0cmlidXRlcyk7XG4gICAgdGhpcy52aXNpdEFsbCh0ZW1wbGF0ZS50ZW1wbGF0ZUF0dHJzKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLmNoaWxkcmVuKTtcbiAgICB0aGlzLnZpc2l0QWxsKHRlbXBsYXRlLnJlZmVyZW5jZXMpO1xuICB9XG4gIG92ZXJyaWRlIHZpc2l0Qm91bmRBdHRyaWJ1dGUoYXR0cmlidXRlOiBUbXBsQXN0Qm91bmRBdHRyaWJ1dGUpIHtcbiAgICAvLyBJZiB0aGUgYm91bmQgYXR0cmlidXRlIGhhcyBubyB2YWx1ZSwgaXQgY2Fubm90IGhhdmUgYW55IGlkZW50aWZpZXJzIGluIHRoZSB2YWx1ZSBleHByZXNzaW9uLlxuICAgIGlmIChhdHRyaWJ1dGUudmFsdWVTcGFuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBpZGVudGlmaWVycyA9IEV4cHJlc3Npb25WaXNpdG9yLmdldElkZW50aWZpZXJzKFxuICAgICAgICBhdHRyaWJ1dGUudmFsdWUsIGF0dHJpYnV0ZS52YWx1ZVNwYW4udG9TdHJpbmcoKSwgYXR0cmlidXRlLnZhbHVlU3Bhbi5zdGFydC5vZmZzZXQsXG4gICAgICAgIHRoaXMuYm91bmRUZW1wbGF0ZSwgdGhpcy50YXJnZXRUb0lkZW50aWZpZXIuYmluZCh0aGlzKSk7XG4gICAgaWRlbnRpZmllcnMuZm9yRWFjaChpZCA9PiB0aGlzLmlkZW50aWZpZXJzLmFkZChpZCkpO1xuICB9XG4gIG92ZXJyaWRlIHZpc2l0Qm91bmRFdmVudChhdHRyaWJ1dGU6IFRtcGxBc3RCb3VuZEV2ZW50KSB7XG4gICAgdGhpcy52aXNpdEV4cHJlc3Npb24oYXR0cmlidXRlLmhhbmRsZXIpO1xuICB9XG4gIG92ZXJyaWRlIHZpc2l0Qm91bmRUZXh0KHRleHQ6IFRtcGxBc3RCb3VuZFRleHQpIHtcbiAgICB0aGlzLnZpc2l0RXhwcmVzc2lvbih0ZXh0LnZhbHVlKTtcbiAgfVxuICBvdmVycmlkZSB2aXNpdFJlZmVyZW5jZShyZWZlcmVuY2U6IFRtcGxBc3RSZWZlcmVuY2UpIHtcbiAgICBjb25zdCByZWZlcmVuY2VJZGVudGlmZXIgPSB0aGlzLnRhcmdldFRvSWRlbnRpZmllcihyZWZlcmVuY2UpO1xuXG4gICAgdGhpcy5pZGVudGlmaWVycy5hZGQocmVmZXJlbmNlSWRlbnRpZmVyKTtcbiAgfVxuICBvdmVycmlkZSB2aXNpdFZhcmlhYmxlKHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICBjb25zdCB2YXJpYWJsZUlkZW50aWZpZXIgPSB0aGlzLnRhcmdldFRvSWRlbnRpZmllcih2YXJpYWJsZSk7XG5cbiAgICB0aGlzLmlkZW50aWZpZXJzLmFkZCh2YXJpYWJsZUlkZW50aWZpZXIpO1xuICB9XG5cbiAgLyoqIENyZWF0ZXMgYW4gaWRlbnRpZmllciBmb3IgYSB0ZW1wbGF0ZSBlbGVtZW50IG9yIHRlbXBsYXRlIG5vZGUuICovXG4gIHByaXZhdGUgZWxlbWVudE9yVGVtcGxhdGVUb0lkZW50aWZpZXIobm9kZTogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlKTogRWxlbWVudElkZW50aWZpZXJcbiAgICAgIHxUZW1wbGF0ZU5vZGVJZGVudGlmaWVyIHtcbiAgICAvLyBJZiB0aGlzIG5vZGUgaGFzIGFscmVhZHkgYmVlbiBzZWVuLCByZXR1cm4gdGhlIGNhY2hlZCByZXN1bHQuXG4gICAgaWYgKHRoaXMuZWxlbWVudEFuZFRlbXBsYXRlSWRlbnRpZmllckNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudEFuZFRlbXBsYXRlSWRlbnRpZmllckNhY2hlLmdldChub2RlKSE7XG4gICAgfVxuXG4gICAgbGV0IG5hbWU6IHN0cmluZztcbiAgICBsZXQga2luZDogSWRlbnRpZmllcktpbmQuRWxlbWVudHxJZGVudGlmaWVyS2luZC5UZW1wbGF0ZTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFRtcGxBc3RUZW1wbGF0ZSkge1xuICAgICAgbmFtZSA9IG5vZGUudGFnTmFtZTtcbiAgICAgIGtpbmQgPSBJZGVudGlmaWVyS2luZC5UZW1wbGF0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgIGtpbmQgPSBJZGVudGlmaWVyS2luZC5FbGVtZW50O1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VTcGFuID0gbm9kZS5zdGFydFNvdXJjZVNwYW47XG4gICAgLy8gQW4gZWxlbWVudCdzIG9yIHRlbXBsYXRlJ3Mgc291cmNlIHNwYW4gY2FuIGJlIG9mIHRoZSBmb3JtIGA8ZWxlbWVudD5gLCBgPGVsZW1lbnQgLz5gLCBvclxuICAgIC8vIGA8ZWxlbWVudD48L2VsZW1lbnQ+YC4gT25seSB0aGUgc2VsZWN0b3IgaXMgaW50ZXJlc3RpbmcgdG8gdGhlIGluZGV4ZXIsIHNvIHRoZSBzb3VyY2UgaXNcbiAgICAvLyBzZWFyY2hlZCBmb3IgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgdGhlIGVsZW1lbnQgKHNlbGVjdG9yKSBuYW1lLlxuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5nZXRTdGFydExvY2F0aW9uKG5hbWUsIHNvdXJjZVNwYW4pO1xuICAgIGNvbnN0IGFic29sdXRlU3BhbiA9IG5ldyBBYnNvbHV0ZVNvdXJjZVNwYW4oc3RhcnQsIHN0YXJ0ICsgbmFtZS5sZW5ndGgpO1xuXG4gICAgLy8gUmVjb3JkIHRoZSBub2RlcydzIGF0dHJpYnV0ZXMsIHdoaWNoIGFuIGluZGV4ZXIgY2FuIGxhdGVyIHRyYXZlcnNlIHRvIHNlZSBpZiBhbnkgb2YgdGhlbVxuICAgIC8vIHNwZWNpZnkgYSB1c2VkIGRpcmVjdGl2ZSBvbiB0aGUgbm9kZS5cbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gbm9kZS5hdHRyaWJ1dGVzLm1hcCgoe25hbWUsIHNvdXJjZVNwYW59KTogQXR0cmlidXRlSWRlbnRpZmllciA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lLFxuICAgICAgICBzcGFuOiBuZXcgQWJzb2x1dGVTb3VyY2VTcGFuKHNvdXJjZVNwYW4uc3RhcnQub2Zmc2V0LCBzb3VyY2VTcGFuLmVuZC5vZmZzZXQpLFxuICAgICAgICBraW5kOiBJZGVudGlmaWVyS2luZC5BdHRyaWJ1dGUsXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGNvbnN0IHVzZWREaXJlY3RpdmVzID0gdGhpcy5ib3VuZFRlbXBsYXRlLmdldERpcmVjdGl2ZXNPZk5vZGUobm9kZSkgfHwgW107XG5cbiAgICBjb25zdCBpZGVudGlmaWVyID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHNwYW46IGFic29sdXRlU3BhbixcbiAgICAgIGtpbmQsXG4gICAgICBhdHRyaWJ1dGVzOiBuZXcgU2V0KGF0dHJpYnV0ZXMpLFxuICAgICAgdXNlZERpcmVjdGl2ZXM6IG5ldyBTZXQodXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbm9kZTogZGlyLnJlZi5ub2RlLFxuICAgICAgICAgIHNlbGVjdG9yOiBkaXIuc2VsZWN0b3IsXG4gICAgICAgIH07XG4gICAgICB9KSksXG4gICAgICAvLyBjYXN0IGIvYyBwcmUtVHlwZVNjcmlwdCAzLjUgdW5pb25zIGFyZW4ndCB3ZWxsIGRpc2NyaW1pbmF0ZWRcbiAgICB9IGFzIEVsZW1lbnRJZGVudGlmaWVyIHxcbiAgICAgICAgVGVtcGxhdGVOb2RlSWRlbnRpZmllcjtcblxuICAgIHRoaXMuZWxlbWVudEFuZFRlbXBsYXRlSWRlbnRpZmllckNhY2hlLnNldChub2RlLCBpZGVudGlmaWVyKTtcbiAgICByZXR1cm4gaWRlbnRpZmllcjtcbiAgfVxuXG4gIC8qKiBDcmVhdGVzIGFuIGlkZW50aWZpZXIgZm9yIGEgdGVtcGxhdGUgcmVmZXJlbmNlIG9yIHRlbXBsYXRlIHZhcmlhYmxlIHRhcmdldC4gKi9cbiAgcHJpdmF0ZSB0YXJnZXRUb0lkZW50aWZpZXIobm9kZTogVG1wbEFzdFJlZmVyZW5jZXxUbXBsQXN0VmFyaWFibGUpOiBUYXJnZXRJZGVudGlmaWVyIHtcbiAgICAvLyBJZiB0aGlzIG5vZGUgaGFzIGFscmVhZHkgYmVlbiBzZWVuLCByZXR1cm4gdGhlIGNhY2hlZCByZXN1bHQuXG4gICAgaWYgKHRoaXMudGFyZ2V0SWRlbnRpZmllckNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMudGFyZ2V0SWRlbnRpZmllckNhY2hlLmdldChub2RlKSE7XG4gICAgfVxuXG4gICAgY29uc3Qge25hbWUsIHNvdXJjZVNwYW59ID0gbm9kZTtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMuZ2V0U3RhcnRMb2NhdGlvbihuYW1lLCBzb3VyY2VTcGFuKTtcbiAgICBjb25zdCBzcGFuID0gbmV3IEFic29sdXRlU291cmNlU3BhbihzdGFydCwgc3RhcnQgKyBuYW1lLmxlbmd0aCk7XG4gICAgbGV0IGlkZW50aWZpZXI6IFJlZmVyZW5jZUlkZW50aWZpZXJ8VmFyaWFibGVJZGVudGlmaWVyO1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgVG1wbEFzdFJlZmVyZW5jZSkge1xuICAgICAgLy8gSWYgdGhlIG5vZGUgaXMgYSByZWZlcmVuY2UsIHdlIGNhcmUgYWJvdXQgaXRzIHRhcmdldC4gVGhlIHRhcmdldCBjYW4gYmUgYW4gZWxlbWVudCwgYVxuICAgICAgLy8gdGVtcGxhdGUsIGEgZGlyZWN0aXZlIGFwcGxpZWQgb24gYSB0ZW1wbGF0ZSBvciBlbGVtZW50IChpbiB3aGljaCBjYXNlIHRoZSBkaXJlY3RpdmUgZmllbGRcbiAgICAgIC8vIGlzIG5vbi1udWxsKSwgb3Igbm90aGluZyBhdCBhbGwuXG4gICAgICBjb25zdCByZWZUYXJnZXQgPSB0aGlzLmJvdW5kVGVtcGxhdGUuZ2V0UmVmZXJlbmNlVGFyZ2V0KG5vZGUpO1xuICAgICAgbGV0IHRhcmdldCA9IG51bGw7XG4gICAgICBpZiAocmVmVGFyZ2V0KSB7XG4gICAgICAgIGlmIChyZWZUYXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0RWxlbWVudCB8fCByZWZUYXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VGVtcGxhdGUpIHtcbiAgICAgICAgICB0YXJnZXQgPSB7XG4gICAgICAgICAgICBub2RlOiB0aGlzLmVsZW1lbnRPclRlbXBsYXRlVG9JZGVudGlmaWVyKHJlZlRhcmdldCksXG4gICAgICAgICAgICBkaXJlY3RpdmU6IG51bGwsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0YXJnZXQgPSB7XG4gICAgICAgICAgICBub2RlOiB0aGlzLmVsZW1lbnRPclRlbXBsYXRlVG9JZGVudGlmaWVyKHJlZlRhcmdldC5ub2RlKSxcbiAgICAgICAgICAgIGRpcmVjdGl2ZTogcmVmVGFyZ2V0LmRpcmVjdGl2ZS5yZWYubm9kZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlkZW50aWZpZXIgPSB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHNwYW4sXG4gICAgICAgIGtpbmQ6IElkZW50aWZpZXJLaW5kLlJlZmVyZW5jZSxcbiAgICAgICAgdGFyZ2V0LFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRlbnRpZmllciA9IHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgc3BhbixcbiAgICAgICAga2luZDogSWRlbnRpZmllcktpbmQuVmFyaWFibGUsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMudGFyZ2V0SWRlbnRpZmllckNhY2hlLnNldChub2RlLCBpZGVudGlmaWVyKTtcbiAgICByZXR1cm4gaWRlbnRpZmllcjtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBzdGFydCBsb2NhdGlvbiBvZiBhIHN0cmluZyBpbiBhIFNvdXJjZVNwYW4gKi9cbiAgcHJpdmF0ZSBnZXRTdGFydExvY2F0aW9uKG5hbWU6IHN0cmluZywgY29udGV4dDogUGFyc2VTb3VyY2VTcGFuKTogbnVtYmVyIHtcbiAgICBjb25zdCBsb2NhbFN0ciA9IGNvbnRleHQudG9TdHJpbmcoKTtcbiAgICBpZiAoIWxvY2FsU3RyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGUgc3RhdGU6IFwiJHtuYW1lfVwiIG5vdCBmb3VuZCBpbiBcIiR7bG9jYWxTdHJ9XCJgKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQuc3RhcnQub2Zmc2V0ICsgbG9jYWxTdHIuaW5kZXhPZihuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWaXNpdHMgYSBub2RlJ3MgZXhwcmVzc2lvbiBhbmQgYWRkcyBpdHMgaWRlbnRpZmllcnMsIGlmIGFueSwgdG8gdGhlIHZpc2l0b3IncyBzdGF0ZS5cbiAgICogT25seSBBU1RzIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhlIGV4cHJlc3Npb24gc291cmNlIGFuZCBpdHMgbG9jYXRpb24gYXJlIHZpc2l0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIG5vZGUgd2hvc2UgZXhwcmVzc2lvbiB0byB2aXNpdFxuICAgKi9cbiAgcHJpdmF0ZSB2aXNpdEV4cHJlc3Npb24oYXN0OiBBU1QpIHtcbiAgICAvLyBPbmx5IGluY2x1ZGUgQVNUcyB0aGF0IGhhdmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlaXIgc291cmNlIGFuZCBhYnNvbHV0ZSBzb3VyY2Ugc3BhbnMuXG4gICAgaWYgKGFzdCBpbnN0YW5jZW9mIEFTVFdpdGhTb3VyY2UgJiYgYXN0LnNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgLy8gTWFrZSB0YXJnZXQgdG8gaWRlbnRpZmllciBtYXBwaW5nIGNsb3N1cmUgc3RhdGVmdWwgdG8gdGhpcyB2aXNpdG9yIGluc3RhbmNlLlxuICAgICAgY29uc3QgdGFyZ2V0VG9JZGVudGlmaWVyID0gdGhpcy50YXJnZXRUb0lkZW50aWZpZXIuYmluZCh0aGlzKTtcbiAgICAgIGNvbnN0IGFic29sdXRlT2Zmc2V0ID0gYXN0LnNvdXJjZVNwYW4uc3RhcnQ7XG4gICAgICBjb25zdCBpZGVudGlmaWVycyA9IEV4cHJlc3Npb25WaXNpdG9yLmdldElkZW50aWZpZXJzKFxuICAgICAgICAgIGFzdCwgYXN0LnNvdXJjZSwgYWJzb2x1dGVPZmZzZXQsIHRoaXMuYm91bmRUZW1wbGF0ZSwgdGFyZ2V0VG9JZGVudGlmaWVyKTtcbiAgICAgIGlkZW50aWZpZXJzLmZvckVhY2goaWQgPT4gdGhpcy5pZGVudGlmaWVycy5hZGQoaWQpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUcmF2ZXJzZXMgYSB0ZW1wbGF0ZSBBU1QgYW5kIGJ1aWxkcyBpZGVudGlmaWVycyBkaXNjb3ZlcmVkIGluIGl0LlxuICpcbiAqIEBwYXJhbSBib3VuZFRlbXBsYXRlIGJvdW5kIHRlbXBsYXRlIHRhcmdldCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yIHF1ZXJ5aW5nIGV4cHJlc3Npb24gdGFyZ2V0cy5cbiAqIEByZXR1cm4gaWRlbnRpZmllcnMgaW4gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRlbXBsYXRlSWRlbnRpZmllcnMoYm91bmRUZW1wbGF0ZTogQm91bmRUYXJnZXQ8Q29tcG9uZW50TWV0YT4pOlxuICAgIFNldDxUb3BMZXZlbElkZW50aWZpZXI+IHtcbiAgY29uc3QgdmlzaXRvciA9IG5ldyBUZW1wbGF0ZVZpc2l0b3IoYm91bmRUZW1wbGF0ZSk7XG4gIGlmIChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmlzaXRvci52aXNpdEFsbChib3VuZFRlbXBsYXRlLnRhcmdldC50ZW1wbGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHZpc2l0b3IuaWRlbnRpZmllcnM7XG59XG4iXX0=