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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_MAP = new Map();
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(checker, reflector, scopeRegistry) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
        }
        ComponentDecoratorHandler.prototype.detect = function (decorators) {
            return decorators.find(function (decorator) { return decorator.name === 'Component' && util_1.isAngularCore(decorator); });
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator) {
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new Error("Incorrect number of arguments to @Component decorator");
            }
            var meta = decorator.args[0];
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new Error("Decorator argument must be literal.");
            }
            // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
            // on it.
            var directiveMetadata = directive_1.extractDirectiveMetadata(node, decorator, this.checker, this.reflector);
            if (directiveMetadata === undefined) {
                // `extractDirectiveMetadata` returns undefined when the @Directive has `jit: true`. In this
                // case, compilation of the decorator is skipped. Returning an empty object signifies
                // that no analysis was produced.
                return {};
            }
            // Next, read the `@Component`-specific fields.
            var component = metadata_1.reflectObjectLiteral(meta);
            // Resolve and parse the template.
            if (!component.has('template')) {
                throw new Error("For now, components must directly have a template.");
            }
            var templateExpr = component.get('template');
            var templateStr = metadata_1.staticallyResolve(templateExpr, this.checker);
            if (typeof templateStr !== 'string') {
                throw new Error("Template must statically resolve to a string: " + node.name.text);
            }
            var preserveWhitespaces = false;
            if (component.has('preserveWhitespaces')) {
                var value = metadata_1.staticallyResolve(component.get('preserveWhitespaces'), this.checker);
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
            if (directiveMetadata.selector !== null) {
                this.scopeRegistry.registerSelector(node, directiveMetadata.selector);
            }
            return {
                analysis: tslib_1.__assign({}, directiveMetadata, { template: template, viewQueries: [], 
                    // These will be replaced during the compilation step, after all `NgModule`s have been
                    // analyzed and the full compilation scope for the component can be realized.
                    pipes: EMPTY_MAP, directives: EMPTY_MAP })
            };
        };
        ComponentDecoratorHandler.prototype.compile = function (node, analysis) {
            var pool = new compiler_1.ConstantPool();
            // Check whether this component was registered with an NgModule. If so, it should be compiled
            // under that module's compilation scope.
            var scope = this.scopeRegistry.lookupCompilationScope(node);
            if (scope !== null) {
                // Replace the empty components and directives from the analyze() step with a fully expanded
                // scope. This is possible now because during compile() the whole compilation unit has been
                // fully analyzed.
                analysis = tslib_1.__assign({}, analysis, scope);
            }
            var res = compiler_1.compileComponentFromMetadata(analysis, pool, compiler_1.makeBindingParser());
            return {
                name: 'ngComponentDef',
                initializer: res.expression,
                statements: pool.statements,
                type: res.type,
            };
        };
        return ComponentDecoratorHandler;
    }());
    exports.ComponentDecoratorHandler = ComponentDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzTDtJQUN0TCwrQkFBaUM7SUFHakMscUVBQXVFO0lBR3ZFLHVGQUFxRDtJQUVyRCw2RUFBcUM7SUFFckMsSUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7SUFFaEQ7O09BRUc7SUFDSDtRQUNFLG1DQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsYUFBb0M7WUFEcEMsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMxRCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFBRyxDQUFDO1FBRXBELDBDQUFNLEdBQU4sVUFBTyxVQUF1QjtZQUM1QixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxFQUExRCxDQUEwRCxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUVELDJDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUMxRCxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7YUFDMUU7WUFDRCxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JB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QyxJQUFJLENBQUMsQ0FBQztZQUM5RCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLDRGQUE0RjtnQkFDNUYsMkZBQTJGO2dCQUMzRixrQkFBa0I7Z0JBQ2xCLFFBQVEsd0JBQU8sUUFBUSxFQUFLLEtBQUssQ0FBQyxDQUFDO2FBQ3BDO1lBRUQsSUFBTSxHQUFHLEdBQUcsdUNBQTRCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSw0QkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDOUUsT0FBTztnQkFDTCxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixXQUFXLEVBQUUsR0FBRyxDQUFDLFVBQVU7Z0JBQzNCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2FBQ2YsQ0FBQztRQUNKLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFwR0QsSUFvR0M7SUFwR1ksOERBQXlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNEaXJlY3RpdmVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge3JlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7U2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL3NlbGVjdG9yX3Njb3BlJztcbmltcG9ydCB7aXNBbmd1bGFyQ29yZX0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzIERlY29yYXRvckhhbmRsZXI8UjNDb21wb25lbnRNZXRhZGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnQ29tcG9uZW50JyAmJiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzQ29tcG9uZW50TWV0YWRhdGE+IHtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBDb21wb25lbnQgZGVjb3JhdG9yYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG5cbiAgICAvLyBAQ29tcG9uZW50IGluaGVyaXRzIEBEaXJlY3RpdmUsIHNvIGJlZ2luIGJ5IGV4dHJhY3RpbmcgdGhlIEBEaXJlY3RpdmUgbWV0YWRhdGEgYW5kIGJ1aWxkaW5nXG4gICAgLy8gb24gaXQuXG4gICAgY29uc3QgZGlyZWN0aXZlTWV0YWRhdGEgPVxuICAgICAgICBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLmNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKTtcbiAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3QgY29tcG9uZW50ID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICAvLyBSZXNvbHZlIGFuZCBwYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZvciBub3csIGNvbXBvbmVudHMgbXVzdCBkaXJlY3RseSBoYXZlIGEgdGVtcGxhdGUuYCk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykgITtcbiAgICBjb25zdCB0ZW1wbGF0ZVN0ciA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlRXhwciwgdGhpcy5jaGVja2VyKTtcbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlU3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUZW1wbGF0ZSBtdXN0IHN0YXRpY2FsbHkgcmVzb2x2ZSB0byBhIHN0cmluZzogJHtub2RlLm5hbWUhLnRleHR9YCk7XG4gICAgfVxuXG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSAhLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IHJlc29sdmUgdG8gYSBib29sZWFuIGlmIHByZXNlbnRgKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoXG4gICAgICAgIHRlbXBsYXRlU3RyLCBgJHtub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0jJHtub2RlLm5hbWUhLnRleHR9L3RlbXBsYXRlLmh0bWxgLFxuICAgICAgICB7cHJlc2VydmVXaGl0ZXNwYWNlc30pO1xuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFcnJvcnMgcGFyc2luZyB0ZW1wbGF0ZTogJHt0ZW1wbGF0ZS5lcnJvcnMubWFwKGUgPT4gZS50b1N0cmluZygpKS5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGNvbXBvbmVudCBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJTZWxlY3Rvcihub2RlLCBkaXJlY3RpdmVNZXRhZGF0YS5zZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIC4uLmRpcmVjdGl2ZU1ldGFkYXRhLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgdmlld1F1ZXJpZXM6IFtdLFxuXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX01BUCxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNDb21wb25lbnRNZXRhZGF0YSk6IENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG5cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5Lmxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZSk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIGNvbXBpbGUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICBhbmFseXNpcyA9IHsuLi5hbmFseXNpcywgLi4uc2NvcGV9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEoYW5hbHlzaXMsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdDb21wb25lbnREZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogcG9vbC5zdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuIl19