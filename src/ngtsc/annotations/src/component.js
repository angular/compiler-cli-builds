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
    var EMPTY_ARRAY = [];
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(checker, reflector, scopeRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
            this.resourceLoader = resourceLoader;
            this.rootDirs = rootDirs;
            this.defaultPreserveWhitespaces = defaultPreserveWhitespaces;
            this.i18nUseExternalIds = i18nUseExternalIds;
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
            var e_1, _a;
            var meta = this._resolveLiteral(decorator);
            var component = metadata_1.reflectObjectLiteral(meta);
            var promises = [];
            var containingFile = node.getSourceFile().fileName;
            if (this.resourceLoader.preload !== undefined && component.has('templateUrl')) {
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = metadata_1.staticallyResolve(templateUrlExpr, this.reflector, this.checker);
                if (typeof templateUrl !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                }
                var promise = this.resourceLoader.preload(templateUrl, containingFile);
                if (promise !== undefined) {
                    promises.push(promise);
                }
            }
            var styleUrls = this._extractStyleUrls(component);
            if (this.resourceLoader.preload !== undefined && styleUrls !== null) {
                try {
                    for (var styleUrls_1 = tslib_1.__values(styleUrls), styleUrls_1_1 = styleUrls_1.next(); !styleUrls_1_1.done; styleUrls_1_1 = styleUrls_1.next()) {
                        var styleUrl = styleUrls_1_1.value;
                        var promise = this.resourceLoader.preload(styleUrl, containingFile);
                        if (promise !== undefined) {
                            promises.push(promise);
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (styleUrls_1_1 && !styleUrls_1_1.done && (_a = styleUrls_1.return)) _a.call(styleUrls_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            if (promises.length !== 0) {
                return Promise.all(promises).then(function () { return undefined; });
            }
            else {
                return undefined;
            }
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator) {
            var _this = this;
            var containingFile = node.getSourceFile().fileName;
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
                templateStr = this.resourceLoader.load(templateUrl, containingFile);
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
            var preserveWhitespaces = this.defaultPreserveWhitespaces;
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
            var relativeContextFilePath = this.rootDirs.reduce(function (previous, rootDir) {
                var candidate = path.posix.relative(rootDir, filePath);
                if (previous === undefined || candidate.length < previous.length) {
                    return candidate;
                }
                else {
                    return previous;
                }
            }, undefined);
            var template = compiler_1.parseTemplate(templateStr, node.getSourceFile().fileName + "#" + node.name.text + "/template.html", { preserveWhitespaces: preserveWhitespaces });
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
            var styleUrls = this._extractStyleUrls(component);
            if (styleUrls !== null) {
                if (styles === null) {
                    styles = [];
                }
                styles.push.apply(styles, tslib_1.__spread(styleUrls.map(function (styleUrl) { return _this.resourceLoader.load(styleUrl, containingFile); })));
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
                        pipes: EMPTY_MAP, directives: EMPTY_ARRAY, wrapDirectivesAndPipesInClosure: false, //
                        animations: animations,
                        viewProviders: viewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
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
                scope.directives.forEach(function (_a) {
                    var selector = _a.selector, meta = _a.meta;
                    matcher.addSelectables(compiler_1.CssSelector.parse(selector), meta);
                });
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
                var directives_1 = [];
                scope.directives.forEach(function (_a) {
                    var selector = _a.selector, meta = _a.meta;
                    return directives_1.push({ selector: selector, expression: meta.directive });
                });
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
        ComponentDecoratorHandler.prototype._extractStyleUrls = function (component) {
            if (!component.has('styleUrls')) {
                return null;
            }
            var styleUrlsExpr = component.get('styleUrls');
            var styleUrls = metadata_1.staticallyResolve(styleUrlsExpr, this.reflector, this.checker);
            if (!Array.isArray(styleUrls) || !styleUrls.every(function (url) { return typeof url === 'string'; })) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, styleUrlsExpr, 'styleUrls must be an array of strings');
            }
            return styleUrls;
        };
        return ComponentDecoratorHandler;
    }());
    exports.ComponentDecoratorHandler = ComponentDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE2UjtJQUM3UiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSxxRUFBc0o7SUFLdEosdUZBQTJIO0lBQzNILHFGQUF3RDtJQUV4RCw2RUFBK0U7SUFFL0UsSUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7SUFDaEQsSUFBTSxXQUFXLEdBQVUsRUFBRSxDQUFDO0lBUTlCOztPQUVHO0lBQ0g7UUFFRSxtQ0FDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZSxFQUM3RCxjQUE4QixFQUFVLFFBQWtCLEVBQzFELDBCQUFtQyxFQUFVLGtCQUEyQjtZQUh4RSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDN0QsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtZQUMxRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQVM7WUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVM7WUFFNUUsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUNoRSwwQkFBcUIsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7UUFId0IsQ0FBQztRQU14RiwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUF6RCxpQkFNQztZQUxDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBM0UsQ0FBMkUsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFFRCw4Q0FBVSxHQUFWLFVBQVcsSUFBeUIsRUFBRSxTQUFvQjs7WUFDeEQsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QyxJQUFNLFNBQVMsR0FBRywrQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFDO1lBQ3JDLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFFckQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDN0UsSUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUcsQ0FBQztnQkFDdkQsSUFBTSxXQUFXLEdBQUcsNEJBQWlCLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNyRixJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRTtvQkFDbkMsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO2lCQUN0RjtnQkFDRCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQ3pFLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtvQkFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDeEI7YUFDRjtZQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFOztvQkFDbkUsS0FBdUIsSUFBQSxjQUFBLGlCQUFBLFNBQVMsQ0FBQSxvQ0FBQSwyREFBRTt3QkFBN0IsSUFBTSxRQUFRLHNCQUFBO3dCQUNqQixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7d0JBQ3RFLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTs0QkFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzt5QkFDeEI7cUJBQ0Y7Ozs7Ozs7OzthQUNGO1lBQ0QsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDekIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsU0FBUyxFQUFULENBQVMsQ0FBQyxDQUFDO2FBQ3BEO2lCQUFNO2dCQUNMLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1FBQ0gsQ0FBQztRQUVELDJDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQXZELGlCQTZKQztZQTVKQyxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ3JELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFcEMsOEZBQThGO1lBQzlGLFNBQVM7WUFDVCxJQUFNLGVBQWUsR0FBRyxvQ0FBd0IsQ0FDNUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFDMUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQztZQUNqRSxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7Z0JBQ2pDLDRGQUE0RjtnQkFDNUYscUZBQXFGO2dCQUNyRixpQ0FBaUM7Z0JBQ2pDLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCwrQ0FBK0M7WUFDeEMsSUFBQSxxREFBaUIsRUFBRSxxQ0FBb0IsRUFBRSxtQ0FBUSxDQUFvQjtZQUU1RSxJQUFJLFdBQVcsR0FBZ0IsSUFBSSxDQUFDO1lBQ3BDLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDaEMsSUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUcsQ0FBQztnQkFDdkQsSUFBTSxXQUFXLEdBQUcsNEJBQWlCLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNyRixJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRTtvQkFDbkMsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLGVBQWUsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO2lCQUN0RjtnQkFDRCxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2FBQ3JFO2lCQUFNLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDcEMsSUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQztnQkFDakQsSUFBTSxnQkFBZ0IsR0FBRyw0QkFBaUIsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxRQUFRLEVBQUU7b0JBQ3hDLE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztpQkFDaEY7Z0JBQ0QsV0FBVyxHQUFHLGdCQUFnQixDQUFDO2FBQ2hDO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7YUFDOUY7WUFFRCxJQUFJLG1CQUFtQixHQUFZLElBQUksQ0FBQywwQkFBMEIsQ0FBQztZQUNuRSxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRTtnQkFDeEMsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBRyxDQUFDO2dCQUNwRCxJQUFNLEtBQUssR0FBRyw0QkFBaUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BFLElBQUksT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFO29CQUM5QixNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLHVDQUF1QyxDQUFDLENBQUM7aUJBQ3BGO2dCQUNELG1CQUFtQixHQUFHLEtBQUssQ0FBQzthQUM3QjtZQUVELElBQU0sYUFBYSxHQUFvQixTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25FLElBQUksMEJBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxDQUFDO1lBRVQseUZBQXlGO1lBQ3pGLGdDQUFnQztZQUNoQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQy9DLElBQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQW1CLFVBQUMsUUFBUSxFQUFFLE9BQU87Z0JBQ3ZGLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDekQsSUFBSSxRQUFRLEtBQUssU0FBUyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRTtvQkFDaEUsT0FBTyxTQUFTLENBQUM7aUJBQ2xCO3FCQUFNO29CQUNMLE9BQU8sUUFBUSxDQUFDO2lCQUNqQjtZQUNILENBQUMsRUFBRSxTQUFTLENBQUcsQ0FBQztZQUVoQixJQUFNLFFBQVEsR0FBRyx3QkFBYSxDQUMxQixXQUFXLEVBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsU0FBSSxJQUFJLENBQUMsSUFBSyxDQUFDLElBQUksbUJBQWdCLEVBQ2hGLEVBQUMsbUJBQW1CLHFCQUFBLEVBQUMsQ0FBQyxDQUFDO1lBQzNCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQ1gsOEJBQTRCLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFaLENBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQ3RGO1lBRUQsK0ZBQStGO1lBQy9GLHVGQUF1RjtZQUN2RixJQUFJLFFBQVEsQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLDRCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBTSxDQUFDLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsSUFBSSxxQkFDdkMsR0FBRyxLQUFBLEVBQ0gsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFNLENBQUMsSUFBSSxFQUN0QixTQUFTLEVBQUUsR0FBRyxFQUNkLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUMzQixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFDM0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQ3ZCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTyxFQUN6QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsWUFBWSxFQUFsQixDQUFrQixDQUFDLEVBQzFELFdBQVcsRUFBRSxJQUFJLElBQUssNkJBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFDbEUsQ0FBQzthQUNKO1lBRUQsc0NBQXNDO1lBQ3RDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO1lBQzdELElBQU0sbUJBQW1CLEdBQUcsNkJBQWlCLENBQ3pDLHVDQUE0QixDQUFDLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUN4RixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEIsSUFBTSxzQkFBc0IsR0FBRyw2QkFBaUIsQ0FDNUMsdUNBQTRCLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQzNGLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQixJQUFNLFdBQVcsb0JBQU8sbUJBQW1CLEVBQUssc0JBQXNCLENBQUMsQ0FBQztZQUV4RSxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzVCLElBQU0sb0JBQW9CLEdBQUcsdUNBQTJCLENBQ3BELFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFHLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0UsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxvQkFBb0IsQ0FBQyxJQUFJLEdBQUU7YUFDaEQ7WUFFRCxJQUFJLE1BQU0sR0FBa0IsSUFBSSxDQUFDO1lBQ2pDLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0IsTUFBTSxHQUFHLGdDQUFvQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbEY7WUFFRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEQsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUN0QixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7b0JBQ25CLE1BQU0sR0FBRyxFQUFFLENBQUM7aUJBQ2I7Z0JBQ0QsTUFBTSxDQUFDLElBQUksT0FBWCxNQUFNLG1CQUFTLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBQSxRQUFRLElBQUksT0FBQSxLQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLEVBQWxELENBQWtELENBQUMsR0FBRTthQUMvRjtZQUVELElBQUksYUFBYSxHQUFXLENBQUMsQ0FBQztZQUM5QixJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQ2xDLGFBQWEsR0FBRyxRQUFRLENBQUMsNEJBQWlCLENBQ3RDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFHLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFXLENBQUMsQ0FBQzthQUNoRjtZQUVELElBQUksVUFBVSxHQUFvQixJQUFJLENBQUM7WUFDdkMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUMvQixVQUFVLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFHLENBQUMsQ0FBQzthQUNqRTtZQUVELE9BQU87Z0JBQ0wsUUFBUSxFQUFFO29CQUNSLElBQUksdUJBQ0MsUUFBUSxJQUNYLFFBQVEsVUFBQTt3QkFDUixXQUFXLGFBQUE7d0JBQ1gsYUFBYSxlQUFBLEVBQ2IsTUFBTSxFQUFFLE1BQU0sSUFBSSxFQUFFO3dCQUVwQixzRkFBc0Y7d0JBQ3RGLDZFQUE2RTt3QkFDN0UsS0FBSyxFQUFFLFNBQVMsRUFDaEIsVUFBVSxFQUFFLFdBQVcsRUFDdkIsK0JBQStCLEVBQUUsS0FBSyxFQUFHLEVBQUU7d0JBQzNDLFVBQVUsWUFBQTt3QkFDVixhQUFhLGVBQUEsRUFDYixrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLHlCQUFBLEdBQ3JFO29CQUNELFlBQVksRUFBRSx1Q0FBNEIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO29CQUM3RSxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUs7aUJBQy9CO2dCQUNELFNBQVMsRUFBRSxJQUFJO2FBQ2hCLENBQUM7UUFDSixDQUFDO1FBRUQsNkNBQVMsR0FBVCxVQUFVLEdBQXFCLEVBQUUsSUFBb0IsRUFBRSxJQUEwQjtZQUMvRSxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BFLElBQU0sT0FBTyxHQUFHLElBQUksMEJBQWUsRUFBdUIsQ0FBQztZQUMzRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUNwQixVQUFDLEVBQWdCO3dCQUFmLHNCQUFRLEVBQUUsY0FBSTtvQkFBUSxPQUFPLENBQUMsY0FBYyxDQUFDLHNCQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixHQUFHLENBQUMsV0FBVyxDQUFDLElBQTJCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUM1RTtRQUNILENBQUM7UUFFRCwyQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxRQUE4QixFQUFFLElBQWtCO1lBRW5GLDZGQUE2RjtZQUM3Rix5Q0FBeUM7WUFDekMsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5RCxJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQzdCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtnQkFDbEIsNEZBQTRGO2dCQUM1RiwyRkFBMkY7Z0JBQzNGLGtCQUFrQjtnQkFDWCxJQUFBLG1CQUFLLEVBQUUsaURBQW9CLENBQVU7Z0JBQzVDLElBQU0sWUFBVSxHQUFpRCxFQUFFLENBQUM7Z0JBQ3BFLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUNwQixVQUFDLEVBQWdCO3dCQUFmLHNCQUFRLEVBQUUsY0FBSTtvQkFBTSxPQUFBLFlBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxRQUFRLFVBQUEsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBQyxDQUFDO2dCQUF2RCxDQUF1RCxDQUFDLENBQUM7Z0JBQ25GLElBQU0sK0JBQStCLEdBQVksQ0FBQyxDQUFDLG9CQUFvQixDQUFDO2dCQUN4RSxRQUFRLHdCQUFPLFFBQVEsSUFBRSxVQUFVLGNBQUEsRUFBRSxLQUFLLE9BQUEsRUFBRSwrQkFBK0IsaUNBQUEsR0FBQyxDQUFDO2FBQzlFO1lBRUQsSUFBTSxHQUFHLEdBQUcsdUNBQTRCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSw0QkFBaUIsRUFBRSxDQUFDLENBQUM7WUFFOUUsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUNsQyxJQUFJLFFBQVEsQ0FBQyxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUNsQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUN4QztZQUNELE9BQU87Z0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxZQUFBO2dCQUN2QyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7YUFDZixDQUFDO1FBQ0osQ0FBQztRQUVPLG1EQUFlLEdBQXZCLFVBQXdCLFNBQW9CO1lBQzFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFHLENBQUM7YUFDM0M7WUFDRCxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDMUQsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQy9DLHVEQUF1RCxDQUFDLENBQUM7YUFDOUQ7WUFDRCxJQUFNLElBQUksR0FBRyx1QkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkMsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLHlCQUF5QixFQUFFLElBQUksRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO2FBQ3ZGO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVPLHFEQUFpQixHQUF6QixVQUEwQixTQUFxQztZQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDL0IsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFHLENBQUM7WUFDbkQsSUFBTSxTQUFTLEdBQUcsNEJBQWlCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBdkIsQ0FBdUIsQ0FBQyxFQUFFO2dCQUNqRixNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLHVDQUF1QyxDQUFDLENBQUM7YUFDN0Y7WUFDRCxPQUFPLFNBQXFCLENBQUM7UUFDL0IsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQWhTRCxJQWdTQztJQWhTWSw4REFBeUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBDc3NTZWxlY3RvciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBFbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlc29sdmVkUmVmZXJlbmNlLCBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1R5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuXG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVNZXRhZGF0YSwgZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZSwgcXVlcmllc0Zyb21GaWVsZHN9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1Njb3BlRGlyZWN0aXZlLCBTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnlbXSA9IFtdO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YTtcbiAgcGFyc2VkVGVtcGxhdGU6IFRtcGxBc3ROb2RlW107XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxDb21wb25lbnRIYW5kbGVyRGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXIsIHByaXZhdGUgcm9vdERpcnM6IHN0cmluZ1tdLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbiwgcHJpdmF0ZSBpMThuVXNlRXh0ZXJuYWxJZHM6IGJvb2xlYW4pIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdDb21wb25lbnQnICYmICh0aGlzLmlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpKTtcbiAgfVxuXG4gIHByZWFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcik7XG4gICAgY29uc3QgY29tcG9uZW50ID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICBpZiAodGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkICE9PSB1bmRlZmluZWQgJiYgY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSAhO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSBzdGF0aWNhbGx5UmVzb2x2ZSh0ZW1wbGF0ZVVybEV4cHIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZVVybEV4cHIsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBwcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHRlbXBsYXRlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICBpZiAocHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5fZXh0cmFjdFN0eWxlVXJscyhjb21wb25lbnQpO1xuICAgIGlmICh0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQgIT09IHVuZGVmaW5lZCAmJiBzdHlsZVVybHMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQoc3R5bGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgaWYgKHByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHByb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHByb21pc2VzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEhhbmRsZXJEYXRhPiB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5jaGVja2VyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUsXG4gICAgICAgIHRoaXMuZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LmdldERlZmF1bHRDb21wb25lbnRFbGVtZW50TmFtZSgpKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0ZWRFbGVtZW50cywgZGVjb3JhdG9yOiBjb21wb25lbnQsIG1ldGFkYXRhfSA9IGRpcmVjdGl2ZVJlc3VsdDtcblxuICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpICE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlVXJsRXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHRlbXBsYXRlVXJsRXhwciwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHRlbXBsYXRlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZUV4cHIsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIGRlY29yYXRvci5ub2RlLCAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgIH1cblxuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gdGhpcy5kZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcztcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgncHJlc2VydmVXaGl0ZXNwYWNlcycpICE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKGV4cHIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgJ3ByZXNlcnZlV2hpdGVzcGFjZXMgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBjb25zdCB2aWV3UHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBjb21wb25lbnQuaGFzKCd2aWV3UHJvdmlkZXJzJykgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ3ZpZXdQcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBHbyB0aHJvdWdoIHRoZSByb290IGRpcmVjdG9yaWVzIGZvciB0aGlzIHByb2plY3QsIGFuZCBzZWxlY3QgdGhlIG9uZSB3aXRoIHRoZSBzbWFsbGVzdFxuICAgIC8vIHJlbGF0aXZlIHBhdGggcmVwcmVzZW50YXRpb24uXG4gICAgY29uc3QgZmlsZVBhdGggPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShyb290RGlyLCBmaWxlUGF0aCk7XG4gICAgICBpZiAocHJldmlvdXMgPT09IHVuZGVmaW5lZCB8fCBjYW5kaWRhdGUubGVuZ3RoIDwgcHJldmlvdXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKSAhO1xuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKFxuICAgICAgICB0ZW1wbGF0ZVN0ciwgYCR7bm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9IyR7bm9kZS5uYW1lIS50ZXh0fS90ZW1wbGF0ZS5odG1sYCxcbiAgICAgICAge3ByZXNlcnZlV2hpdGVzcGFjZXN9KTtcbiAgICBpZiAodGVtcGxhdGUuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXJyb3JzIHBhcnNpbmcgdGVtcGxhdGU6ICR7dGVtcGxhdGUuZXJyb3JzLm1hcChlID0+IGUudG9TdHJpbmcoKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIHNlbGVjdG9yLCBpdCBzaG91bGQgYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5YCBzb1xuICAgIC8vIHdoZW4gdGhpcyBjb21wb25lbnQgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZSBkZXRlcm1pbmVkLlxuICAgIGlmIChtZXRhZGF0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVmID0gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIG5vZGUubmFtZSAhKTtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZShub2RlLCB7XG4gICAgICAgIHJlZixcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICAgIHNlbGVjdG9yOiBtZXRhZGF0YS5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IG1ldGFkYXRhLmV4cG9ydEFzLFxuICAgICAgICBpbnB1dHM6IG1ldGFkYXRhLmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogbWV0YWRhdGEub3V0cHV0cyxcbiAgICAgICAgcXVlcmllczogbWV0YWRhdGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgICAgaXNDb21wb25lbnQ6IHRydWUsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHZpZXcgcXVlcmllcy5cbiAgICBjb25zdCBjb3JlTW9kdWxlID0gdGhpcy5pc0NvcmUgPyB1bmRlZmluZWQgOiAnQGFuZ3VsYXIvY29yZSc7XG4gICAgY29uc3Qgdmlld0NoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkJywgY29yZU1vZHVsZSksIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICB0aGlzLmNoZWNrZXIpO1xuICAgIGNvbnN0IHZpZXdDaGlsZHJlbkZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCB0aGlzLnJlZmxlY3RvcixcbiAgICAgICAgdGhpcy5jaGVja2VyKTtcbiAgICBjb25zdCB2aWV3UXVlcmllcyA9IFsuLi52aWV3Q2hpbGRGcm9tRmllbGRzLCAuLi52aWV3Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICAgIGlmIChjb21wb25lbnQuaGFzKCdxdWVyaWVzJykpIHtcbiAgICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID0gZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKFxuICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ3F1ZXJpZXMnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyLCB0aGlzLmlzQ29yZSk7XG4gICAgICB2aWV3UXVlcmllcy5wdXNoKC4uLnF1ZXJpZXNGcm9tRGVjb3JhdG9yLnZpZXcpO1xuICAgIH1cblxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgc3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgfVxuXG4gICAgbGV0IHN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50KTtcbiAgICBpZiAoc3R5bGVVcmxzICE9PSBudWxsKSB7XG4gICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHN0eWxlcyA9IFtdO1xuICAgICAgfVxuICAgICAgc3R5bGVzLnB1c2goLi4uc3R5bGVVcmxzLm1hcChzdHlsZVVybCA9PiB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQoc3R5bGVVcmwsIGNvbnRhaW5pbmdGaWxlKSkpO1xuICAgIH1cblxuICAgIGxldCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPSAwO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdlbmNhcHN1bGF0aW9uJykpIHtcbiAgICAgIGVuY2Fwc3VsYXRpb24gPSBwYXJzZUludChzdGF0aWNhbGx5UmVzb2x2ZShcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdlbmNhcHN1bGF0aW9uJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcikgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBsZXQgYW5pbWF0aW9uczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygnYW5pbWF0aW9ucycpKSB7XG4gICAgICBhbmltYXRpb25zID0gbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCdhbmltYXRpb25zJykgISk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgICB2aWV3UXVlcmllcyxcbiAgICAgICAgICBlbmNhcHN1bGF0aW9uLFxuICAgICAgICAgIHN0eWxlczogc3R5bGVzIHx8IFtdLFxuXG4gICAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICAgICAgZGlyZWN0aXZlczogRU1QVFlfQVJSQVksXG4gICAgICAgICAgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTogZmFsc2UsICAvL1xuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVycyxcbiAgICAgICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aFxuICAgICAgICB9LFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgcGFyc2VkVGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzLFxuICAgICAgfSxcbiAgICAgIHR5cGVDaGVjazogdHJ1ZSxcbiAgICB9O1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogdHMuRGVjbGFyYXRpb24sIG1ldGE6IENvbXBvbmVudEhhbmRsZXJEYXRhKTogdm9pZCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhub2RlKTtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxTY29wZURpcmVjdGl2ZTxhbnk+PigpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgc2NvcGUuZGlyZWN0aXZlcy5mb3JFYWNoKFxuICAgICAgICAgICh7c2VsZWN0b3IsIG1ldGF9KSA9PiB7IG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2Uoc2VsZWN0b3IpLCBtZXRhKTsgfSk7XG4gICAgICBjdHguYWRkVGVtcGxhdGUobm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uLCBtZXRhLnBhcnNlZFRlbXBsYXRlLCBtYXRjaGVyKTtcbiAgICB9XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRIYW5kbGVyRGF0YSwgcG9vbDogQ29uc3RhbnRQb29sKTpcbiAgICAgIENvbXBpbGVSZXN1bHQge1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgLy8gUmVwbGFjZSB0aGUgZW1wdHkgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBmcm9tIHRoZSBhbmFseXplKCkgc3RlcCB3aXRoIGEgZnVsbHkgZXhwYW5kZWRcbiAgICAgIC8vIHNjb3BlLiBUaGlzIGlzIHBvc3NpYmxlIG5vdyBiZWNhdXNlIGR1cmluZyBjb21waWxlKCkgdGhlIHdob2xlIGNvbXBpbGF0aW9uIHVuaXQgaGFzIGJlZW5cbiAgICAgIC8vIGZ1bGx5IGFuYWx5emVkLlxuICAgICAgY29uc3Qge3BpcGVzLCBjb250YWluc0ZvcndhcmREZWNsc30gPSBzY29wZTtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZXM6IHtzZWxlY3Rvcjogc3RyaW5nLCBleHByZXNzaW9uOiBFeHByZXNzaW9ufVtdID0gW107XG4gICAgICBzY29wZS5kaXJlY3RpdmVzLmZvckVhY2goXG4gICAgICAgICAgKHtzZWxlY3RvciwgbWV0YX0pID0+IGRpcmVjdGl2ZXMucHVzaCh7c2VsZWN0b3IsIGV4cHJlc3Npb246IG1ldGEuZGlyZWN0aXZlfSkpO1xuICAgICAgY29uc3Qgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTogYm9vbGVhbiA9ICEhY29udGFpbnNGb3J3YXJkRGVjbHM7XG4gICAgICBtZXRhZGF0YSA9IHsuLi5tZXRhZGF0YSwgZGlyZWN0aXZlcywgcGlwZXMsIHdyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmV9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YWRhdGEsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuXG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHJlcy5zdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIHN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQ29tcG9uZW50RGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbiwgc3RhdGVtZW50cyxcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSAhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBDb21wb25lbnQgZGVjb3JhdG9yYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5zZXQoZGVjb3JhdG9yLCBtZXRhKTtcbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPik6IHN0cmluZ1tdfG51bGwge1xuICAgIGlmICghY29tcG9uZW50Lmhhcygnc3R5bGVVcmxzJykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN0eWxlVXJsc0V4cHIgPSBjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKSAhO1xuICAgIGNvbnN0IHN0eWxlVXJscyA9IHN0YXRpY2FsbHlSZXNvbHZlKHN0eWxlVXJsc0V4cHIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzdHlsZVVybHMpIHx8ICFzdHlsZVVybHMuZXZlcnkodXJsID0+IHR5cGVvZiB1cmwgPT09ICdzdHJpbmcnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgc3R5bGVVcmxzRXhwciwgJ3N0eWxlVXJscyBtdXN0IGJlIGFuIGFycmF5IG9mIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0eWxlVXJscyBhcyBzdHJpbmdbXTtcbiAgfVxufVxuIl19