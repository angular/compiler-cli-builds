/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_MAP = new Map();
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(checker, reflector, scopeRegistry, isCore, resourceLoader, rootDirs) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
            this.resourceLoader = resourceLoader;
            this.rootDirs = rootDirs;
            this.literalCache = new Map();
            this.elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
        }
        ComponentDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (!decorators) {
                return undefined;
            }
            return decorators.find(function (decorator) { return decorator.name === 'Component' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        ComponentDecoratorHandler.prototype.preanalyze = function (node, decorator) {
            var meta = this._resolveLiteral(decorator);
            var component = metadata_1.reflectObjectLiteral(meta);
            if (this.resourceLoader.preload !== undefined && component.has('templateUrl')) {
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = metadata_1.staticallyResolve(templateUrlExpr, this.reflector, this.checker);
                if (typeof templateUrl !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                }
                var url = path.posix.resolve(path.dirname(node.getSourceFile().fileName), templateUrl);
                return this.resourceLoader.preload(url);
            }
            return undefined;
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator) {
            var meta = this._resolveLiteral(decorator);
            this.literalCache.delete(decorator);
            // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
            // on it.
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.checker, this.reflector, this.isCore, this.elementSchemaRegistry.getDefaultComponentElementName());
            if (directiveResult === undefined) {
                // `extractDirectiveMetadata` returns undefined when the @Directive has `jit: true`. In this
                // case, compilation of the decorator is skipped. Returning an empty object signifies
                // that no analysis was produced.
                return {};
            }
            // Next, read the `@Component`-specific fields.
            var decoratedElements = directiveResult.decoratedElements, component = directiveResult.decorator, metadata = directiveResult.metadata;
            var templateStr = null;
            if (component.has('templateUrl')) {
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = metadata_1.staticallyResolve(templateUrlExpr, this.reflector, this.checker);
                if (typeof templateUrl !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                }
                var url = path.posix.resolve(path.dirname(node.getSourceFile().fileName), templateUrl);
                templateStr = this.resourceLoader.load(url);
            }
            else if (component.has('template')) {
                var templateExpr = component.get('template');
                var resolvedTemplate = metadata_1.staticallyResolve(templateExpr, this.reflector, this.checker);
                if (typeof resolvedTemplate !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateExpr, 'template must be a string');
                }
                templateStr = resolvedTemplate;
            }
            else {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, decorator.node, 'component is missing a template');
            }
            var preserveWhitespaces = false;
            if (component.has('preserveWhitespaces')) {
                var expr = component.get('preserveWhitespaces');
                var value = metadata_1.staticallyResolve(expr, this.reflector, this.checker);
                if (typeof value !== 'boolean') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, 'preserveWhitespaces must be a boolean');
                }
                preserveWhitespaces = value;
            }
            var viewProviders = component.has('viewProviders') ?
                new compiler_1.WrappedNodeExpr(component.get('viewProviders')) :
                null;
            // Go through the root directories for this project, and select the one with the smallest
            // relative path representation.
            var filePath = node.getSourceFile().fileName;
            var relativeFilePath = this.rootDirs.reduce(function (previous, rootDir) {
                var candidate = path.posix.relative(rootDir, filePath);
                if (previous === undefined || candidate.length < previous.length) {
                    return candidate;
                }
                else {
                    return previous;
                }
            }, undefined);
            var template = compiler_1.parseTemplate(templateStr, node.getSourceFile().fileName + "#" + node.name.text + "/template.html", { preserveWhitespaces: preserveWhitespaces }, relativeFilePath);
            if (template.errors !== undefined) {
                throw new Error("Errors parsing template: " + template.errors.map(function (e) { return e.toString(); }).join(', '));
            }
            // If the component has a selector, it should be registered with the `SelectorScopeRegistry` so
            // when this component appears in an `@NgModule` scope, its selector can be determined.
            if (metadata.selector !== null) {
                var ref = new metadata_1.ResolvedReference(node, node.name);
                this.scopeRegistry.registerDirective(node, tslib_1.__assign({ ref: ref, name: node.name.text, directive: ref, selector: metadata.selector, exportAs: metadata.exportAs, inputs: metadata.inputs, outputs: metadata.outputs, queries: metadata.queries.map(function (query) { return query.propertyName; }), isComponent: true }, util_1.extractDirectiveGuards(node, this.reflector)));
            }
            // Construct the list of view queries.
            var coreModule = this.isCore ? undefined : '@angular/core';
            var viewChildFromFields = directive_1.queriesFromFields(metadata_1.filterToMembersWithDecorator(decoratedElements, 'ViewChild', coreModule), this.reflector, this.checker);
            var viewChildrenFromFields = directive_1.queriesFromFields(metadata_1.filterToMembersWithDecorator(decoratedElements, 'ViewChildren', coreModule), this.reflector, this.checker);
            var viewQueries = tslib_1.__spread(viewChildFromFields, viewChildrenFromFields);
            if (component.has('queries')) {
                var queriesFromDecorator = directive_1.extractQueriesFromDecorator(component.get('queries'), this.reflector, this.checker, this.isCore);
                viewQueries.push.apply(viewQueries, tslib_1.__spread(queriesFromDecorator.view));
            }
            var styles = null;
            if (component.has('styles')) {
                styles = directive_1.parseFieldArrayValue(component, 'styles', this.reflector, this.checker);
            }
            var encapsulation = 0;
            if (component.has('encapsulation')) {
                encapsulation = parseInt(metadata_1.staticallyResolve(component.get('encapsulation'), this.reflector, this.checker));
            }
            var animations = null;
            if (component.has('animations')) {
                animations = new compiler_1.WrappedNodeExpr(component.get('animations'));
            }
            return {
                analysis: {
                    meta: tslib_1.__assign({}, metadata, { template: template,
                        viewQueries: viewQueries,
                        encapsulation: encapsulation, styles: styles || [], 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        pipes: EMPTY_MAP, directives: EMPTY_MAP, wrapDirectivesAndPipesInClosure: false, //
                        animations: animations,
                        viewProviders: viewProviders }),
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.isCore),
                    parsedTemplate: template.nodes,
                },
                typeCheck: true,
            };
        };
        ComponentDecoratorHandler.prototype.typeCheck = function (ctx, node, meta) {
            var scope = this.scopeRegistry.lookupCompilationScopeAsRefs(node);
            var matcher = new compiler_1.SelectorMatcher();
            if (scope !== null) {
                scope.directives.forEach(function (meta, selector) { matcher.addSelectables(compiler_1.CssSelector.parse(selector), meta); });
                ctx.addTemplate(node, meta.parsedTemplate, matcher);
            }
        };
        ComponentDecoratorHandler.prototype.compile = function (node, analysis, pool) {
            // Check whether this component was registered with an NgModule. If so, it should be compiled
            // under that module's compilation scope.
            var scope = this.scopeRegistry.lookupCompilationScope(node);
            var metadata = analysis.meta;
            if (scope !== null) {
                // Replace the empty components and directives from the analyze() step with a fully expanded
                // scope. This is possible now because during compile() the whole compilation unit has been
                // fully analyzed.
                var pipes = scope.pipes, containsForwardDecls = scope.containsForwardDecls;
                var directives_1 = new Map();
                scope.directives.forEach(function (meta, selector) { return directives_1.set(selector, meta.directive); });
                var wrapDirectivesAndPipesInClosure = !!containsForwardDecls;
                metadata = tslib_1.__assign({}, metadata, { directives: directives_1, pipes: pipes, wrapDirectivesAndPipesInClosure: wrapDirectivesAndPipesInClosure });
            }
            var res = compiler_1.compileComponentFromMetadata(metadata, pool, compiler_1.makeBindingParser());
            var statements = res.statements;
            if (analysis.metadataStmt !== null) {
                statements.push(analysis.metadataStmt);
            }
            return {
                name: 'ngComponentDef',
                initializer: res.expression, statements: statements,
                type: res.type,
            };
        };
        ComponentDecoratorHandler.prototype._resolveLiteral = function (decorator) {
            if (this.literalCache.has(decorator)) {
                return this.literalCache.get(decorator);
            }
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, "Incorrect number of arguments to @Component decorator");
            }
            var meta = util_1.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "Decorator argument must be literal.");
            }
            this.literalCache.set(decorator, meta);
            return meta;
        };
        return ComponentDecoratorHandler;
    }());
    exports.ComponentDecoratorHandler = ComponentDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2UjtJQUM3UiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSxxRUFBc0o7SUFLdEosdUZBQTJIO0lBQzNILHFGQUF3RDtJQUV4RCw2RUFBK0U7SUFFL0UsSUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7SUFRaEQ7O09BRUc7SUFDSDtRQUVFLG1DQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsYUFBb0MsRUFBVSxNQUFlLEVBQzdELGNBQThCLEVBQVUsUUFBa0I7WUFGMUQsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQzdELG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQVU7WUFFOUQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUNoRSwwQkFBcUIsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7UUFIVSxDQUFDO1FBTTFFLDBDQUFNLEdBQU4sVUFBTyxJQUFvQixFQUFFLFVBQTRCO1lBQXpELGlCQU1DO1lBTEMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEs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RUFBRTtnQkFDcEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUcsQ0FBQzthQUMzQztZQUNELElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUMxRCxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLElBQUksRUFDL0MsdURBQXVELENBQUMsQ0FBQzthQUM5RDtZQUNELElBQU0sSUFBSSxHQUFHLHVCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqRCxJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QyxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMseUJBQXlCLEVBQUUsSUFBSSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7YUFDdkY7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBclBELElBcVBDO0lBclBZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgRXhwcmVzc2lvbiwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNEaXJlY3RpdmVNZXRhZGF0YSwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0ZW1lbnQsIFRtcGxBc3ROb2RlLCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEsIG1ha2VCaW5kaW5nUGFyc2VyLCBwYXJzZVRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2UsIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGF9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IsIHBhcnNlRmllbGRBcnJheVZhbHVlLCBxdWVyaWVzRnJvbUZpZWxkc30gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7U2NvcGVEaXJlY3RpdmUsIFNlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHMsIGlzQW5ndWxhckNvcmUsIHVud3JhcEV4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YTtcbiAgcGFyc2VkVGVtcGxhdGU6IFRtcGxBc3ROb2RlW107XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxDb21wb25lbnRIYW5kbGVyRGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXIsIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdKSB7fVxuXG4gIHByaXZhdGUgbGl0ZXJhbENhY2hlID0gbmV3IE1hcDxEZWNvcmF0b3IsIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcblxuXG4gIGRldGVjdChub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnQ29tcG9uZW50JyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVVcmxFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gcGF0aC5wb3NpeC5yZXNvbHZlKHBhdGguZGlybmFtZShub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSksIHRlbXBsYXRlVXJsKTtcbiAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQodXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxDb21wb25lbnRIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLmNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgdGhpcy5lbGVtZW50U2NoZW1hUmVnaXN0cnkuZ2V0RGVmYXVsdENvbXBvbmVudEVsZW1lbnROYW1lKCkpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRlZEVsZW1lbnRzLCBkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGF9ID0gZGlyZWN0aXZlUmVzdWx0O1xuXG4gICAgbGV0IHRlbXBsYXRlU3RyOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVVcmxFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gcGF0aC5wb3NpeC5yZXNvbHZlKHBhdGguZGlybmFtZShub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSksIHRlbXBsYXRlVXJsKTtcbiAgICAgIHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHVybCk7XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZUV4cHIsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIGRlY29yYXRvci5ub2RlLCAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgIH1cblxuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gZmFsc2U7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSBzdGF0aWNhbGx5UmVzb2x2ZShleHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsICdwcmVzZXJ2ZVdoaXRlc3BhY2VzIG11c3QgYmUgYSBib29sZWFuJyk7XG4gICAgICB9XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzID0gdmFsdWU7XG4gICAgfVxuXG4gICAgY29uc3Qgdmlld1Byb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID0gY29tcG9uZW50Lmhhcygndmlld1Byb3ZpZGVycycpID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCd2aWV3UHJvdmlkZXJzJykgISkgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gR28gdGhyb3VnaCB0aGUgcm9vdCBkaXJlY3RvcmllcyBmb3IgdGhpcyBwcm9qZWN0LCBhbmQgc2VsZWN0IHRoZSBvbmUgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHJlcHJlc2VudGF0aW9uLlxuICAgIGNvbnN0IGZpbGVQYXRoID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgcmVsYXRpdmVGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShyb290RGlyLCBmaWxlUGF0aCk7XG4gICAgICBpZiAocHJldmlvdXMgPT09IHVuZGVmaW5lZCB8fCBjYW5kaWRhdGUubGVuZ3RoIDwgcHJldmlvdXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKSAhO1xuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKFxuICAgICAgICB0ZW1wbGF0ZVN0ciwgYCR7bm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9IyR7bm9kZS5uYW1lIS50ZXh0fS90ZW1wbGF0ZS5odG1sYCxcbiAgICAgICAge3ByZXNlcnZlV2hpdGVzcGFjZXN9LCByZWxhdGl2ZUZpbGVQYXRoKTtcbiAgICBpZiAodGVtcGxhdGUuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXJyb3JzIHBhcnNpbmcgdGVtcGxhdGU6ICR7dGVtcGxhdGUuZXJyb3JzLm1hcChlID0+IGUudG9TdHJpbmcoKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIHNlbGVjdG9yLCBpdCBzaG91bGQgYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5YCBzb1xuICAgIC8vIHdoZW4gdGhpcyBjb21wb25lbnQgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZSBkZXRlcm1pbmVkLlxuICAgIGlmIChtZXRhZGF0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVmID0gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIG5vZGUubmFtZSAhKTtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZShub2RlLCB7XG4gICAgICAgIHJlZixcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICAgIHNlbGVjdG9yOiBtZXRhZGF0YS5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IG1ldGFkYXRhLmV4cG9ydEFzLFxuICAgICAgICBpbnB1dHM6IG1ldGFkYXRhLmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogbWV0YWRhdGEub3V0cHV0cyxcbiAgICAgICAgcXVlcmllczogbWV0YWRhdGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgICAgaXNDb21wb25lbnQ6IHRydWUsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHZpZXcgcXVlcmllcy5cbiAgICBjb25zdCBjb3JlTW9kdWxlID0gdGhpcy5pc0NvcmUgPyB1bmRlZmluZWQgOiAnQGFuZ3VsYXIvY29yZSc7XG4gICAgY29uc3Qgdmlld0NoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkJywgY29yZU1vZHVsZSksIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICB0aGlzLmNoZWNrZXIpO1xuICAgIGNvbnN0IHZpZXdDaGlsZHJlbkZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCB0aGlzLnJlZmxlY3RvcixcbiAgICAgICAgdGhpcy5jaGVja2VyKTtcbiAgICBjb25zdCB2aWV3UXVlcmllcyA9IFsuLi52aWV3Q2hpbGRGcm9tRmllbGRzLCAuLi52aWV3Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICAgIGlmIChjb21wb25lbnQuaGFzKCdxdWVyaWVzJykpIHtcbiAgICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID0gZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKFxuICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ3F1ZXJpZXMnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyLCB0aGlzLmlzQ29yZSk7XG4gICAgICB2aWV3UXVlcmllcy5wdXNoKC4uLnF1ZXJpZXNGcm9tRGVjb3JhdG9yLnZpZXcpO1xuICAgIH1cblxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgc3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgfVxuXG4gICAgbGV0IGVuY2Fwc3VsYXRpb246IG51bWJlciA9IDA7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2VuY2Fwc3VsYXRpb24nKSkge1xuICAgICAgZW5jYXBzdWxhdGlvbiA9IHBhcnNlSW50KHN0YXRpY2FsbHlSZXNvbHZlKFxuICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ2VuY2Fwc3VsYXRpb24nKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKSBhcyBzdHJpbmcpO1xuICAgIH1cblxuICAgIGxldCBhbmltYXRpb25zOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ2FuaW1hdGlvbnMnKSAhKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIC4uLm1ldGFkYXRhLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIHZpZXdRdWVyaWVzLFxuICAgICAgICAgIGVuY2Fwc3VsYXRpb24sXG4gICAgICAgICAgc3R5bGVzOiBzdHlsZXMgfHwgW10sXG5cbiAgICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgICAgICBkaXJlY3RpdmVzOiBFTVBUWV9NQVAsXG4gICAgICAgICAgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTogZmFsc2UsICAvL1xuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVyc1xuICAgICAgICB9LFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgcGFyc2VkVGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzLFxuICAgICAgfSxcbiAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogdHMuRGVjbGFyYXRpb24sIG1ldGE6IENvbXBvbmVudEhhbmRsZXJEYXRhKTogdm9pZCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlKTtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxTY29wZURpcmVjdGl2ZTxhbnk+PigpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgc2NvcGUuZGlyZWN0aXZlcy5mb3JFYWNoKFxuICAgICAgICAgIChtZXRhLCBzZWxlY3RvcikgPT4geyBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgbWV0YSk7IH0pO1xuICAgICAgY3R4LmFkZFRlbXBsYXRlKG5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YS5wYXJzZWRUZW1wbGF0ZSwgbWF0Y2hlcik7XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50SGFuZGxlckRhdGEsIHBvb2w6IENvbnN0YW50UG9vbCk6XG4gICAgICBDb21waWxlUmVzdWx0IHtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5Lmxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZSk7XG4gICAgbGV0IG1ldGFkYXRhID0gYW5hbHlzaXMubWV0YTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIC8vIFJlcGxhY2UgdGhlIGVtcHR5IGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgZnJvbSB0aGUgYW5hbHl6ZSgpIHN0ZXAgd2l0aCBhIGZ1bGx5IGV4cGFuZGVkXG4gICAgICAvLyBzY29wZS4gVGhpcyBpcyBwb3NzaWJsZSBub3cgYmVjYXVzZSBkdXJpbmcgY29tcGlsZSgpIHRoZSB3aG9sZSBjb21waWxhdGlvbiB1bml0IGhhcyBiZWVuXG4gICAgICAvLyBmdWxseSBhbmFseXplZC5cbiAgICAgIGNvbnN0IHtwaXBlcywgY29udGFpbnNGb3J3YXJkRGVjbHN9ID0gc2NvcGU7XG4gICAgICBjb25zdCBkaXJlY3RpdmVzID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG4gICAgICBzY29wZS5kaXJlY3RpdmVzLmZvckVhY2goKG1ldGEsIHNlbGVjdG9yKSA9PiBkaXJlY3RpdmVzLnNldChzZWxlY3RvciwgbWV0YS5kaXJlY3RpdmUpKTtcbiAgICAgIGNvbnN0IHdyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmU6IGJvb2xlYW4gPSAhIWNvbnRhaW5zRm9yd2FyZERlY2xzO1xuICAgICAgbWV0YWRhdGEgPSB7Li4ubWV0YWRhdGEsIGRpcmVjdGl2ZXMsIHBpcGVzLCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlfTtcbiAgICB9XG5cbiAgICBjb25zdCByZXMgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGFkYXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0NvbXBvbmVudERlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMubGl0ZXJhbENhY2hlLmhhcyhkZWNvcmF0b3IpKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXRlcmFsQ2FjaGUuZ2V0KGRlY29yYXRvcikgITtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cbn1cbiJdfQ==