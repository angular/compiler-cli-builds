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
        function ComponentDecoratorHandler(checker, reflector, scopeRegistry, isCore, resourceLoader) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
            this.resourceLoader = resourceLoader;
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
            var template = compiler_1.parseTemplate(templateStr, node.getSourceFile().fileName + "#" + node.name.text + "/template.html", { preserveWhitespaces: preserveWhitespaces });
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
            return {
                analysis: tslib_1.__assign({}, metadata, { template: template,
                    viewQueries: viewQueries,
                    encapsulation: encapsulation, styles: styles || [], 
                    // These will be replaced during the compilation step, after all `NgModule`s have been
                    // analyzed and the full compilation scope for the component can be realized.
                    pipes: EMPTY_MAP, directives: EMPTY_MAP, wrapDirectivesInClosure: false })
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzTDtJQUN0TCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSxxRUFBcUc7SUFJckcsdUZBQTJIO0lBRTNILDZFQUF1RDtJQUV2RCxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztJQUVoRDs7T0FFRztJQUNIO1FBQ0UsbUNBQ1ksT0FBdUIsRUFBVSxTQUF5QixFQUMxRCxhQUFvQyxFQUFVLE1BQWUsRUFDN0QsY0FBOEI7WUFGOUIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQzdELG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUVsQyxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1FBRjNCLENBQUM7UUFLOUMsMENBQU0sR0FBTixVQUFPLElBQW9CLEVBQUUsVUFBNEI7WUFBekQsaUJBTUM7WUFMQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLENBQUMsS0FBSSxDQUFDLE1BQU0sSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTNFLENBQTJFLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBRUQsOENBQVUsR0FBVixVQUFXLElBQXlCLEVBQUUsU0FB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SSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7YUFDdkY7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBMUxELElBMExDO0lBMUxZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IsIHBhcnNlRmllbGRBcnJheVZhbHVlLCBxdWVyaWVzRnJvbUZpZWxkc30gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtpc0FuZ3VsYXJDb3JlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcblxuLyoqXG4gKiBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggaGFuZGxlcyB0aGUgYEBDb21wb25lbnRgIGFubm90YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM0NvbXBvbmVudE1ldGFkYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlcikge31cblxuICBwcml2YXRlIGxpdGVyYWxDYWNoZSA9IG5ldyBNYXA8RGVjb3JhdG9yLCB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbj4oKTtcblxuXG4gIGRldGVjdChub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnQ29tcG9uZW50JyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVVcmxFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gcGF0aC5wb3NpeC5yZXNvbHZlKHBhdGguZGlybmFtZShub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSksIHRlbXBsYXRlVXJsKTtcbiAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQodXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxSM0NvbXBvbmVudE1ldGFkYXRhPiB7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcik7XG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuZGVsZXRlKGRlY29yYXRvcik7XG5cbiAgICAvLyBAQ29tcG9uZW50IGluaGVyaXRzIEBEaXJlY3RpdmUsIHNvIGJlZ2luIGJ5IGV4dHJhY3RpbmcgdGhlIEBEaXJlY3RpdmUgbWV0YWRhdGEgYW5kIGJ1aWxkaW5nXG4gICAgLy8gb24gaXQuXG4gICAgY29uc3QgZGlyZWN0aXZlUmVzdWx0ID1cbiAgICAgICAgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5jaGVja2VyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRlZEVsZW1lbnRzLCBkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGF9ID0gZGlyZWN0aXZlUmVzdWx0O1xuXG4gICAgbGV0IHRlbXBsYXRlU3RyOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVVcmxFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gcGF0aC5wb3NpeC5yZXNvbHZlKHBhdGguZGlybmFtZShub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSksIHRlbXBsYXRlVXJsKTtcbiAgICAgIHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHVybCk7XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZUV4cHIsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIGRlY29yYXRvci5ub2RlLCAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgIH1cblxuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gZmFsc2U7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSBzdGF0aWNhbGx5UmVzb2x2ZShleHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsICdwcmVzZXJ2ZVdoaXRlc3BhY2VzIG11c3QgYmUgYSBib29sZWFuJyk7XG4gICAgICB9XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzID0gdmFsdWU7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKFxuICAgICAgICB0ZW1wbGF0ZVN0ciwgYCR7bm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9IyR7bm9kZS5uYW1lIS50ZXh0fS90ZW1wbGF0ZS5odG1sYCxcbiAgICAgICAge3ByZXNlcnZlV2hpdGVzcGFjZXN9KTtcbiAgICBpZiAodGVtcGxhdGUuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXJyb3JzIHBhcnNpbmcgdGVtcGxhdGU6ICR7dGVtcGxhdGUuZXJyb3JzLm1hcChlID0+IGUudG9TdHJpbmcoKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIHNlbGVjdG9yLCBpdCBzaG91bGQgYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5YCBzb1xuICAgIC8vIHdoZW4gdGhpcyBjb21wb25lbnQgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZSBkZXRlcm1pbmVkLlxuICAgIGlmIChtZXRhZGF0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnJlZ2lzdGVyU2VsZWN0b3Iobm9kZSwgbWV0YWRhdGEuc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8vIENvbnN0cnVjdCB0aGUgbGlzdCBvZiB2aWV3IHF1ZXJpZXMuXG4gICAgY29uc3QgY29yZU1vZHVsZSA9IHRoaXMuaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIGNvbnN0IHZpZXdDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZCcsIGNvcmVNb2R1bGUpLCB0aGlzLnJlZmxlY3RvcixcbiAgICAgICAgdGhpcy5jaGVja2VyKTtcbiAgICBjb25zdCB2aWV3Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGRyZW4nLCBjb3JlTW9kdWxlKSwgdGhpcy5yZWZsZWN0b3IsXG4gICAgICAgIHRoaXMuY2hlY2tlcik7XG4gICAgY29uc3Qgdmlld1F1ZXJpZXMgPSBbLi4udmlld0NoaWxkRnJvbUZpZWxkcywgLi4udmlld0NoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgICBpZiAoY29tcG9uZW50LmhhcygncXVlcmllcycpKSB7XG4gICAgICBjb25zdCBxdWVyaWVzRnJvbURlY29yYXRvciA9IGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdxdWVyaWVzJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlciwgdGhpcy5pc0NvcmUpO1xuICAgICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgICB9XG5cbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50Lmhhcygnc3R5bGVzJykpIHtcbiAgICAgIHN0eWxlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGNvbXBvbmVudCwgJ3N0eWxlcycsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgIH1cblxuICAgIGxldCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPSAwO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdlbmNhcHN1bGF0aW9uJykpIHtcbiAgICAgIGVuY2Fwc3VsYXRpb24gPSBwYXJzZUludChzdGF0aWNhbGx5UmVzb2x2ZShcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdlbmNhcHN1bGF0aW9uJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcikgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICB2aWV3UXVlcmllcyxcbiAgICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgICAgc3R5bGVzOiBzdHlsZXMgfHwgW10sXG5cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgLy8gYW5hbHl6ZWQgYW5kIHRoZSBmdWxsIGNvbXBpbGF0aW9uIHNjb3BlIGZvciB0aGUgY29tcG9uZW50IGNhbiBiZSByZWFsaXplZC5cbiAgICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgICAgZGlyZWN0aXZlczogRU1QVFlfTUFQLFxuICAgICAgICB3cmFwRGlyZWN0aXZlc0luQ2xvc3VyZTogZmFsc2UsXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFIzQ29tcG9uZW50TWV0YWRhdGEsIHBvb2w6IENvbnN0YW50UG9vbCk6XG4gICAgICBDb21waWxlUmVzdWx0IHtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5Lmxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZSk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIGNvbXBpbGUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICBjb25zdCB7ZGlyZWN0aXZlcywgcGlwZXMsIGNvbnRhaW5zRm9yd2FyZERlY2xzfSA9IHNjb3BlO1xuICAgICAgY29uc3Qgd3JhcERpcmVjdGl2ZXNJbkNsb3N1cmU6IGJvb2xlYW4gPSAhIWNvbnRhaW5zRm9yd2FyZERlY2xzO1xuICAgICAgYW5hbHlzaXMgPSB7Li4uYW5hbHlzaXMsIGRpcmVjdGl2ZXMsIHBpcGVzLCB3cmFwRGlyZWN0aXZlc0luQ2xvc3VyZX07XG4gICAgfVxuXG4gICAgY29uc3QgcmVzID0gY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YShhbmFseXNpcywgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0NvbXBvbmVudERlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiByZXMuc3RhdGVtZW50cyxcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSAhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBDb21wb25lbnQgZGVjb3JhdG9yYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5zZXQoZGVjb3JhdG9yLCBtZXRhKTtcbiAgICByZXR1cm4gbWV0YTtcbiAgfVxufVxuIl19