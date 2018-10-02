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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.checker, this.reflector, this.isCore);
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
                this.scopeRegistry.registerSelector(node, metadata.selector);
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
                animations =
                    metadata_1.staticallyResolve(component.get('animations'), this.reflector, this.checker);
                animations = animations ? animations.map(function (entry) { return convertMapToStringMap(entry); }) : null;
            }
            return {
                analysis: tslib_1.__assign({}, metadata, { template: template,
                    viewQueries: viewQueries,
                    encapsulation: encapsulation, styles: styles || [], 
                    // These will be replaced during the compilation step, after all `NgModule`s have been
                    // analyzed and the full compilation scope for the component can be realized.
                    pipes: EMPTY_MAP, directives: EMPTY_MAP, wrapDirectivesInClosure: false, animations: animations })
            };
        };
        ComponentDecoratorHandler.prototype.compile = function (node, analysis, pool) {
            // Check whether this component was registered with an NgModule. If so, it should be compiled
            // under that module's compilation scope.
            var scope = this.scopeRegistry.lookupCompilationScope(node);
            if (scope !== null) {
                // Replace the empty components and directives from the analyze() step with a fully expanded
                // scope. This is possible now because during compile() the whole compilation unit has been
                // fully analyzed.
                var directives = scope.directives, pipes = scope.pipes, containsForwardDecls = scope.containsForwardDecls;
                var wrapDirectivesInClosure = !!containsForwardDecls;
                analysis = tslib_1.__assign({}, analysis, { directives: directives, pipes: pipes, wrapDirectivesInClosure: wrapDirectivesInClosure });
            }
            var res = compiler_1.compileComponentFromMetadata(analysis, pool, compiler_1.makeBindingParser());
            return {
                name: 'ngComponentDef',
                initializer: res.expression,
                statements: res.statements,
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
    function convertMapToStringMap(map) {
        var stringMap = {};
        map.forEach(function (value, key) { stringMap[key] = value; });
        return stringMap;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzTDtJQUN0TCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSxxRUFBcUc7SUFJckcsdUZBQTJIO0lBRTNILDZFQUF1RDtJQUV2RCxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztJQUVoRDs7T0FFRztJQUNIO1FBQ0UsbUNBQ1ksT0FBdUIsRUFBVSxTQUF5QixFQUMxRCxhQUFvQyxFQUFVLE1BQWUsRUFDN0QsY0FBOEIsRUFBVSxRQUFrQjtZQUYxRCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDN0QsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtZQUU5RCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1FBRkMsQ0FBQztRQUsxRSwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUF6RCxpQkFNQztZQUxDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBM0UsQ0FBMkUsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7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QUFDO1FBQ2QsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQTlNRCxJQThNQztJQTlNWSw4REFBeUI7SUFnTnRDLFNBQVMscUJBQXFCLENBQUksR0FBbUI7UUFDbkQsSUFBTSxTQUFTLEdBQXVCLEVBQUUsQ0FBQztRQUN6QyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBUSxFQUFFLEdBQVcsSUFBTyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IsIHBhcnNlRmllbGRBcnJheVZhbHVlLCBxdWVyaWVzRnJvbUZpZWxkc30gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtpc0FuZ3VsYXJDb3JlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcblxuLyoqXG4gKiBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggaGFuZGxlcyB0aGUgYEBDb21wb25lbnRgIGFubm90YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM0NvbXBvbmVudE1ldGFkYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW10pIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG5cblxuICBkZXRlY3Qobm9kZTogdHMuRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZWNvcmF0b3J8dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgIGRlY29yYXRvciA9PiBkZWNvcmF0b3IubmFtZSA9PT0gJ0NvbXBvbmVudCcgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICh0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQgIT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpICE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlVXJsRXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHRlbXBsYXRlVXJsRXhwciwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVybCA9IHBhdGgucG9zaXgucmVzb2x2ZShwYXRoLmRpcm5hbWUobm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUpLCB0ZW1wbGF0ZVVybCk7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8UjNDb21wb25lbnRNZXRhZGF0YT4ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9XG4gICAgICAgIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0ZWRFbGVtZW50cywgZGVjb3JhdG9yOiBjb21wb25lbnQsIG1ldGFkYXRhfSA9IGRpcmVjdGl2ZVJlc3VsdDtcblxuICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpICE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlVXJsRXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHRlbXBsYXRlVXJsRXhwciwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVybCA9IHBhdGgucG9zaXgucmVzb2x2ZShwYXRoLmRpcm5hbWUobm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUpLCB0ZW1wbGF0ZVVybCk7XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZCh1cmwpO1xuICAgIH0gZWxzZSBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGVFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSAhO1xuICAgICAgY29uc3QgcmVzb2x2ZWRUZW1wbGF0ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlRXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHJlc29sdmVkVGVtcGxhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVFeHByLCAndGVtcGxhdGUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdGVtcGxhdGVTdHIgPSByZXNvbHZlZFRlbXBsYXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBkZWNvcmF0b3Iubm9kZSwgJ2NvbXBvbmVudCBpcyBtaXNzaW5nIGEgdGVtcGxhdGUnKTtcbiAgICB9XG5cbiAgICBsZXQgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbiA9IGZhbHNlO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgITtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3RhdGljYWxseVJlc29sdmUoZXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCBmaWxlUGF0aCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IHJlbGF0aXZlRmlsZVBhdGggPSB0aGlzLnJvb3REaXJzLnJlZHVjZTxzdHJpbmd8dW5kZWZpbmVkPigocHJldmlvdXMsIHJvb3REaXIpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGgucG9zaXgucmVsYXRpdmUocm9vdERpciwgZmlsZVBhdGgpO1xuICAgICAgaWYgKHByZXZpb3VzID09PSB1bmRlZmluZWQgfHwgY2FuZGlkYXRlLmxlbmd0aCA8IHByZXZpb3VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzO1xuICAgICAgfVxuICAgIH0sIHVuZGVmaW5lZCkgITtcblxuICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgdGVtcGxhdGVTdHIsIGAke25vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfSMke25vZGUubmFtZSEudGV4dH0vdGVtcGxhdGUuaHRtbGAsXG4gICAgICAgIHtwcmVzZXJ2ZVdoaXRlc3BhY2VzfSwgcmVsYXRpdmVGaWxlUGF0aCk7XG4gICAgaWYgKHRlbXBsYXRlLmVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEVycm9ycyBwYXJzaW5nIHRlbXBsYXRlOiAke3RlbXBsYXRlLmVycm9ycy5tYXAoZSA9PiBlLnRvU3RyaW5nKCkpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgYSBzZWxlY3RvciwgaXQgc2hvdWxkIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgYFNlbGVjdG9yU2NvcGVSZWdpc3RyeWAgc29cbiAgICAvLyB3aGVuIHRoaXMgY29tcG9uZW50IGFwcGVhcnMgaW4gYW4gYEBOZ01vZHVsZWAgc2NvcGUsIGl0cyBzZWxlY3RvciBjYW4gYmUgZGV0ZXJtaW5lZC5cbiAgICBpZiAobWV0YWRhdGEuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlclNlbGVjdG9yKG5vZGUsIG1ldGFkYXRhLnNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgdmlldyBxdWVyaWVzLlxuICAgIGNvbnN0IGNvcmVNb2R1bGUgPSB0aGlzLmlzQ29yZSA/IHVuZGVmaW5lZCA6ICdAYW5ndWxhci9jb3JlJztcbiAgICBjb25zdCB2aWV3Q2hpbGRGcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGQnLCBjb3JlTW9kdWxlKSwgdGhpcy5yZWZsZWN0b3IsXG4gICAgICAgIHRoaXMuY2hlY2tlcik7XG4gICAgY29uc3Qgdmlld0NoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkcmVuJywgY29yZU1vZHVsZSksIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICB0aGlzLmNoZWNrZXIpO1xuICAgIGNvbnN0IHZpZXdRdWVyaWVzID0gWy4uLnZpZXdDaGlsZEZyb21GaWVsZHMsIC4uLnZpZXdDaGlsZHJlbkZyb21GaWVsZHNdO1xuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3F1ZXJpZXMnKSkge1xuICAgICAgY29uc3QgcXVlcmllc0Zyb21EZWNvcmF0b3IgPSBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IoXG4gICAgICAgICAgY29tcG9uZW50LmdldCgncXVlcmllcycpICEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIsIHRoaXMuaXNDb3JlKTtcbiAgICAgIHZpZXdRdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3Iudmlldyk7XG4gICAgfVxuXG4gICAgbGV0IHN0eWxlczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICBzdHlsZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShjb21wb25lbnQsICdzdHlsZXMnLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICB9XG5cbiAgICBsZXQgZW5jYXBzdWxhdGlvbjogbnVtYmVyID0gMDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygnZW5jYXBzdWxhdGlvbicpKSB7XG4gICAgICBlbmNhcHN1bGF0aW9uID0gcGFyc2VJbnQoc3RhdGljYWxseVJlc29sdmUoXG4gICAgICAgICAgY29tcG9uZW50LmdldCgnZW5jYXBzdWxhdGlvbicpICEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpIGFzIHN0cmluZyk7XG4gICAgfVxuXG4gICAgbGV0IGFuaW1hdGlvbnM6IGFueVtdfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPVxuICAgICAgICAgIChzdGF0aWNhbGx5UmVzb2x2ZShjb21wb25lbnQuZ2V0KCdhbmltYXRpb25zJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcikgYXMgYW55IHxcbiAgICAgICAgICAgbnVsbFtdKTtcbiAgICAgIGFuaW1hdGlvbnMgPSBhbmltYXRpb25zID8gYW5pbWF0aW9ucy5tYXAoZW50cnkgPT4gY29udmVydE1hcFRvU3RyaW5nTWFwKGVudHJ5KSkgOiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIHZpZXdRdWVyaWVzLFxuICAgICAgICBlbmNhcHN1bGF0aW9uLFxuICAgICAgICBzdHlsZXM6IHN0eWxlcyB8fCBbXSxcblxuICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICBwaXBlczogRU1QVFlfTUFQLFxuICAgICAgICBkaXJlY3RpdmVzOiBFTVBUWV9NQVAsXG4gICAgICAgIHdyYXBEaXJlY3RpdmVzSW5DbG9zdXJlOiBmYWxzZSwgYW5pbWF0aW9ucyxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNDb21wb25lbnRNZXRhZGF0YSwgcG9vbDogQ29uc3RhbnRQb29sKTpcbiAgICAgIENvbXBpbGVSZXN1bHQge1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlKTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIC8vIFJlcGxhY2UgdGhlIGVtcHR5IGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgZnJvbSB0aGUgYW5hbHl6ZSgpIHN0ZXAgd2l0aCBhIGZ1bGx5IGV4cGFuZGVkXG4gICAgICAvLyBzY29wZS4gVGhpcyBpcyBwb3NzaWJsZSBub3cgYmVjYXVzZSBkdXJpbmcgY29tcGlsZSgpIHRoZSB3aG9sZSBjb21waWxhdGlvbiB1bml0IGhhcyBiZWVuXG4gICAgICAvLyBmdWxseSBhbmFseXplZC5cbiAgICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgY29udGFpbnNGb3J3YXJkRGVjbHN9ID0gc2NvcGU7XG4gICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0luQ2xvc3VyZTogYm9vbGVhbiA9ICEhY29udGFpbnNGb3J3YXJkRGVjbHM7XG4gICAgICBhbmFseXNpcyA9IHsuLi5hbmFseXNpcywgZGlyZWN0aXZlcywgcGlwZXMsIHdyYXBEaXJlY3RpdmVzSW5DbG9zdXJlfTtcbiAgICB9XG5cbiAgICBjb25zdCByZXMgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKGFuYWx5c2lzLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQ29tcG9uZW50RGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IHJlcy5zdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLmxpdGVyYWxDYWNoZS5oYXMoZGVjb3JhdG9yKSkge1xuICAgICAgcmV0dXJuIHRoaXMubGl0ZXJhbENhY2hlLmdldChkZWNvcmF0b3IpICE7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsIGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cblxuICAgIHRoaXMubGl0ZXJhbENhY2hlLnNldChkZWNvcmF0b3IsIG1ldGEpO1xuICAgIHJldHVybiBtZXRhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRNYXBUb1N0cmluZ01hcDxUPihtYXA6IE1hcDxzdHJpbmcsIFQ+KToge1trZXk6IHN0cmluZ106IFR9IHtcbiAgY29uc3Qgc3RyaW5nTWFwOiB7W2tleTogc3RyaW5nXTogVH0gPSB7fTtcbiAgbWFwLmZvckVhY2goKHZhbHVlOiBULCBrZXk6IHN0cmluZykgPT4geyBzdHJpbmdNYXBba2V5XSA9IHZhbHVlOyB9KTtcbiAgcmV0dXJuIHN0cmluZ01hcDtcbn1cbiJdfQ==