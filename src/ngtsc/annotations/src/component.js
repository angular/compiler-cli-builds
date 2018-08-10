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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "path", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var path = require("path");
    var ts = require("typescript");
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
        ComponentDecoratorHandler.prototype.detect = function (decorators) {
            var _this = this;
            return decorators.find(function (decorator) { return decorator.name === 'Component' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        ComponentDecoratorHandler.prototype.preanalyze = function (node, decorator) {
            var meta = this._resolveLiteral(decorator);
            var component = metadata_1.reflectObjectLiteral(meta);
            if (this.resourceLoader.preload !== undefined && component.has('templateUrl')) {
                var templateUrl = metadata_1.staticallyResolve(component.get('templateUrl'), this.reflector, this.checker);
                if (typeof templateUrl !== 'string') {
                    throw new Error("templateUrl should be a string");
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
                var templateUrl = metadata_1.staticallyResolve(component.get('templateUrl'), this.reflector, this.checker);
                if (typeof templateUrl !== 'string') {
                    throw new Error("templateUrl should be a string");
                }
                var url = path.posix.resolve(path.dirname(node.getSourceFile().fileName), templateUrl);
                templateStr = this.resourceLoader.load(url);
            }
            else if (component.has('template')) {
                var templateExpr = component.get('template');
                var resolvedTemplate = metadata_1.staticallyResolve(templateExpr, this.reflector, this.checker);
                if (typeof resolvedTemplate !== 'string') {
                    throw new Error("Template must statically resolve to a string: " + node.name.text);
                }
                templateStr = resolvedTemplate;
            }
            else {
                throw new Error("Component has no template or templateUrl");
            }
            var preserveWhitespaces = false;
            if (component.has('preserveWhitespaces')) {
                var value = metadata_1.staticallyResolve(component.get('preserveWhitespaces'), this.reflector, this.checker);
                if (typeof value !== 'boolean') {
                    throw new Error("preserveWhitespaces must resolve to a boolean if present");
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
            return {
                analysis: tslib_1.__assign({}, metadata, { template: template,
                    viewQueries: viewQueries, 
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
                statements: [],
                type: res.type,
            };
        };
        ComponentDecoratorHandler.prototype._resolveLiteral = function (decorator) {
            if (this.literalCache.has(decorator)) {
                return this.literalCache.get(decorator);
            }
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new Error("Incorrect number of arguments to @Component decorator");
            }
            var meta = util_1.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new Error("Decorator argument must be literal.");
            }
            this.literalCache.set(decorator, meta);
            return meta;
        };
        return ComponentDecoratorHandler;
    }());
    exports.ComponentDecoratorHandler = ComponentDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzTDtJQUN0TCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBR2pDLHFFQUFxRztJQUlyRyx1RkFBcUc7SUFFckcsNkVBQXVEO0lBRXZELElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBRWhEOztPQUVHO0lBQ0g7UUFDRSxtQ0FDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZSxFQUM3RCxjQUE4QjtZQUY5QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDN0QsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1lBRWxDLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7UUFGM0IsQ0FBQztRQUs5QywwQ0FBTSxHQUFOLFVBQU8sVUFBdUI7WUFBOUIsaUJBR0M7WUFGQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBM0UsQ0FBMkUsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFFRCw4Q0FBVSxHQUFWLFVBQVcsSUFBeUIsRUFBRSxTQUFvQjtZQUN4RCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdDLElBQU0sU0FBUyxH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QUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQzthQUN4RDtZQUVELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2QyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFsS0QsSUFrS0M7SUFsS1ksOERBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNEaXJlY3RpdmVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IsIHF1ZXJpZXNGcm9tRmllbGRzfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmUsIHVud3JhcEV4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPFIzQ29tcG9uZW50TWV0YWRhdGE+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlcikge31cblxuICBwcml2YXRlIGxpdGVyYWxDYWNoZSA9IG5ldyBNYXA8RGVjb3JhdG9yLCB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbj4oKTtcblxuXG4gIGRldGVjdChkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgIGRlY29yYXRvciA9PiBkZWNvcmF0b3IubmFtZSA9PT0gJ0NvbXBvbmVudCcgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICh0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQgIT09IHVuZGVmaW5lZCAmJiBjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9XG4gICAgICAgICAgc3RhdGljYWxseVJlc29sdmUoY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgdGVtcGxhdGVVcmwgc2hvdWxkIGJlIGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgICBjb25zdCB1cmwgPSBwYXRoLnBvc2l4LnJlc29sdmUocGF0aC5kaXJuYW1lKG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lKSwgdGVtcGxhdGVVcmwpO1xuICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZCh1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzQ29tcG9uZW50TWV0YWRhdGE+IHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPVxuICAgICAgICBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLmNoZWNrZXIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRpcmVjdGl2ZVJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhYCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIHRoZSBARGlyZWN0aXZlIGhhcyBgaml0OiB0cnVlYC4gSW4gdGhpc1xuICAgICAgLy8gY2FzZSwgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvciBpcyBza2lwcGVkLiBSZXR1cm5pbmcgYW4gZW1wdHkgb2JqZWN0IHNpZ25pZmllc1xuICAgICAgLy8gdGhhdCBubyBhbmFseXNpcyB3YXMgcHJvZHVjZWQuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLy8gTmV4dCwgcmVhZCB0aGUgYEBDb21wb25lbnRgLXNwZWNpZmljIGZpZWxkcy5cbiAgICBjb25zdCB7ZGVjb3JhdGVkRWxlbWVudHMsIGRlY29yYXRvcjogY29tcG9uZW50LCBtZXRhZGF0YX0gPSBkaXJlY3RpdmVSZXN1bHQ7XG5cbiAgICBsZXQgdGVtcGxhdGVTdHI6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPVxuICAgICAgICAgIHN0YXRpY2FsbHlSZXNvbHZlKGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHRlbXBsYXRlVXJsIHNob3VsZCBiZSBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gcGF0aC5wb3NpeC5yZXNvbHZlKHBhdGguZGlybmFtZShub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSksIHRlbXBsYXRlVXJsKTtcbiAgICAgIHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHVybCk7XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gc3RhdGljYWxseVJlc29sdmUodGVtcGxhdGVFeHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUZW1wbGF0ZSBtdXN0IHN0YXRpY2FsbHkgcmVzb2x2ZSB0byBhIHN0cmluZzogJHtub2RlLm5hbWUhLnRleHR9YCk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50IGhhcyBubyB0ZW1wbGF0ZSBvciB0ZW1wbGF0ZVVybGApO1xuICAgIH1cblxuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gZmFsc2U7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSkge1xuICAgICAgY29uc3QgdmFsdWUgPVxuICAgICAgICAgIHN0YXRpY2FsbHlSZXNvbHZlKGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHByZXNlcnZlV2hpdGVzcGFjZXMgbXVzdCByZXNvbHZlIHRvIGEgYm9vbGVhbiBpZiBwcmVzZW50YCk7XG4gICAgICB9XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzID0gdmFsdWU7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKFxuICAgICAgICB0ZW1wbGF0ZVN0ciwgYCR7bm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9IyR7bm9kZS5uYW1lIS50ZXh0fS90ZW1wbGF0ZS5odG1sYCxcbiAgICAgICAge3ByZXNlcnZlV2hpdGVzcGFjZXN9KTtcbiAgICBpZiAodGVtcGxhdGUuZXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXJyb3JzIHBhcnNpbmcgdGVtcGxhdGU6ICR7dGVtcGxhdGUuZXJyb3JzLm1hcChlID0+IGUudG9TdHJpbmcoKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgY29tcG9uZW50IGhhcyBhIHNlbGVjdG9yLCBpdCBzaG91bGQgYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5YCBzb1xuICAgIC8vIHdoZW4gdGhpcyBjb21wb25lbnQgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZSBkZXRlcm1pbmVkLlxuICAgIGlmIChtZXRhZGF0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnJlZ2lzdGVyU2VsZWN0b3Iobm9kZSwgbWV0YWRhdGEuc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8vIENvbnN0cnVjdCB0aGUgbGlzdCBvZiB2aWV3IHF1ZXJpZXMuXG4gICAgY29uc3QgY29yZU1vZHVsZSA9IHRoaXMuaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIGNvbnN0IHZpZXdDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZCcsIGNvcmVNb2R1bGUpLCB0aGlzLnJlZmxlY3RvcixcbiAgICAgICAgdGhpcy5jaGVja2VyKTtcbiAgICBjb25zdCB2aWV3Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGRyZW4nLCBjb3JlTW9kdWxlKSwgdGhpcy5yZWZsZWN0b3IsXG4gICAgICAgIHRoaXMuY2hlY2tlcik7XG4gICAgY29uc3Qgdmlld1F1ZXJpZXMgPSBbLi4udmlld0NoaWxkRnJvbUZpZWxkcywgLi4udmlld0NoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgICBpZiAoY29tcG9uZW50LmhhcygncXVlcmllcycpKSB7XG4gICAgICBjb25zdCBxdWVyaWVzRnJvbURlY29yYXRvciA9IGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdxdWVyaWVzJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlciwgdGhpcy5pc0NvcmUpO1xuICAgICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICB2aWV3UXVlcmllcyxcblxuICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICBwaXBlczogRU1QVFlfTUFQLFxuICAgICAgICBkaXJlY3RpdmVzOiBFTVBUWV9NQVAsXG4gICAgICAgIHdyYXBEaXJlY3RpdmVzSW5DbG9zdXJlOiBmYWxzZSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNDb21wb25lbnRNZXRhZGF0YSwgcG9vbDogQ29uc3RhbnRQb29sKTpcbiAgICAgIENvbXBpbGVSZXN1bHQge1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZShub2RlKTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIC8vIFJlcGxhY2UgdGhlIGVtcHR5IGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgZnJvbSB0aGUgYW5hbHl6ZSgpIHN0ZXAgd2l0aCBhIGZ1bGx5IGV4cGFuZGVkXG4gICAgICAvLyBzY29wZS4gVGhpcyBpcyBwb3NzaWJsZSBub3cgYmVjYXVzZSBkdXJpbmcgY29tcGlsZSgpIHRoZSB3aG9sZSBjb21waWxhdGlvbiB1bml0IGhhcyBiZWVuXG4gICAgICAvLyBmdWxseSBhbmFseXplZC5cbiAgICAgIGNvbnN0IHtkaXJlY3RpdmVzLCBwaXBlcywgY29udGFpbnNGb3J3YXJkRGVjbHN9ID0gc2NvcGU7XG4gICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0luQ2xvc3VyZTogYm9vbGVhbiA9ICEhY29udGFpbnNGb3J3YXJkRGVjbHM7XG4gICAgICBhbmFseXNpcyA9IHsuLi5hbmFseXNpcywgZGlyZWN0aXZlcywgcGlwZXMsIHdyYXBEaXJlY3RpdmVzSW5DbG9zdXJlfTtcbiAgICB9XG5cbiAgICBjb25zdCByZXMgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKGFuYWx5c2lzLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQ29tcG9uZW50RGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLmxpdGVyYWxDYWNoZS5oYXMoZGVjb3JhdG9yKSkge1xuICAgICAgcmV0dXJuIHRoaXMubGl0ZXJhbENhY2hlLmdldChkZWNvcmF0b3IpICE7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cbn1cbiJdfQ==