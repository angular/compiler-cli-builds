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
        function ComponentDecoratorHandler(checker, reflector, scopeRegistry, isCore) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
        }
        ComponentDecoratorHandler.prototype.detect = function (decorators) {
            var _this = this;
            return decorators.find(function (decorator) { return decorator.name === 'Component' && (_this.isCore || util_1.isAngularCore(decorator)); });
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
            var directiveMetadata = directive_1.extractDirectiveMetadata(node, decorator, this.checker, this.reflector, this.isCore);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzTDtJQUN0TCwrQkFBaUM7SUFHakMscUVBQXVFO0lBR3ZFLHVGQUFxRDtJQUVyRCw2RUFBcUM7SUFFckMsSUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7SUFFaEQ7O09BRUc7SUFDSDtRQUNFLG1DQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsYUFBb0MsRUFBVSxNQUFlO1lBRDdELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDMUQsa0JBQWEsR0FBYixhQUFhLENBQXVCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUFHLENBQUM7UUFFN0UsMENBQU0sR0FBTixVQUFPLFVBQXVCO1lBQTlCLGlCQUdDO1lBRkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLENBQUMsS0FBSSxDQUFDLE1BQU0sSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTNFLENBQTJFLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBRUQsMkNBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsU0FBb0I7WUFDckQsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzFELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQzthQUMxRTtZQUNELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJ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QUFJLHVCQUFZLEVBQUUsQ0FBQztZQUVoQyw2RkFBNkY7WUFDN0YseUNBQXlDO1lBQ3pDLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUQsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO2dCQUNsQiw0RkFBNEY7Z0JBQzVGLDJGQUEyRjtnQkFDM0Ysa0JBQWtCO2dCQUNsQixRQUFRLHdCQUFPLFFBQVEsRUFBSyxLQUFLLENBQUMsQ0FBQzthQUNwQztZQUVELElBQU0sR0FBRyxHQUFHLHVDQUE0QixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsNEJBQWlCLEVBQUUsQ0FBQyxDQUFDO1lBQzlFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUMzQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQzNCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTthQUNmLENBQUM7UUFDSixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBckdELElBcUdDO0lBckdZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtyZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmV9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPFIzQ29tcG9uZW50TWV0YWRhdGE+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KGRlY29yYXRvcnM6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnQ29tcG9uZW50JyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8UjNDb21wb25lbnRNZXRhZGF0YT4ge1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzWzBdO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVNZXRhZGF0YSA9XG4gICAgICAgIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGlyZWN0aXZlTWV0YWRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3QgY29tcG9uZW50ID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICAvLyBSZXNvbHZlIGFuZCBwYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZvciBub3csIGNvbXBvbmVudHMgbXVzdCBkaXJlY3RseSBoYXZlIGEgdGVtcGxhdGUuYCk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykgITtcbiAgICBjb25zdCB0ZW1wbGF0ZVN0ciA9IHN0YXRpY2FsbHlSZXNvbHZlKHRlbXBsYXRlRXhwciwgdGhpcy5jaGVja2VyKTtcbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlU3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUZW1wbGF0ZSBtdXN0IHN0YXRpY2FsbHkgcmVzb2x2ZSB0byBhIHN0cmluZzogJHtub2RlLm5hbWUhLnRleHR9YCk7XG4gICAgfVxuXG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSAhLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgcHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IHJlc29sdmUgdG8gYSBib29sZWFuIGlmIHByZXNlbnRgKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoXG4gICAgICAgIHRlbXBsYXRlU3RyLCBgJHtub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0jJHtub2RlLm5hbWUhLnRleHR9L3RlbXBsYXRlLmh0bWxgLFxuICAgICAgICB7cHJlc2VydmVXaGl0ZXNwYWNlc30pO1xuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFcnJvcnMgcGFyc2luZyB0ZW1wbGF0ZTogJHt0ZW1wbGF0ZS5lcnJvcnMubWFwKGUgPT4gZS50b1N0cmluZygpKS5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGNvbXBvbmVudCBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGRpcmVjdGl2ZU1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJTZWxlY3Rvcihub2RlLCBkaXJlY3RpdmVNZXRhZGF0YS5zZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIC4uLmRpcmVjdGl2ZU1ldGFkYXRhLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgdmlld1F1ZXJpZXM6IFtdLFxuXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX01BUCxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNDb21wb25lbnRNZXRhZGF0YSk6IENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHBvb2wgPSBuZXcgQ29uc3RhbnRQb29sKCk7XG5cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5Lmxvb2t1cENvbXBpbGF0aW9uU2NvcGUobm9kZSk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIGNvbXBpbGUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICBhbmFseXNpcyA9IHsuLi5hbmFseXNpcywgLi4uc2NvcGV9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEoYW5hbHlzaXMsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdDb21wb25lbnREZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogcG9vbC5zdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuIl19