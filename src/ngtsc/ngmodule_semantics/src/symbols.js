(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/symbols", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgModuleSymbol = exports.ComponentSymbol = exports.DirectiveSymbol = exports.PipeSymbol = void 0;
    var tslib_1 = require("tslib");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util");
    /**
     * Represents an Angular pipe.
     */
    var PipeSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(PipeSymbol, _super);
        function PipeSymbol(path, decl, symbolName, name) {
            var _this = _super.call(this, path, decl, symbolName) || this;
            _this.name = name;
            return _this;
        }
        PipeSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof PipeSymbol)) {
                return true;
            }
            return this.name !== previousSymbol.name;
        };
        return PipeSymbol;
    }(api_1.SemanticSymbol));
    exports.PipeSymbol = PipeSymbol;
    /**
     * Represents an Angular directive. Components are represented by `ComponentSymbol`, which inherits
     * from this symbol.
     */
    var DirectiveSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(DirectiveSymbol, _super);
        function DirectiveSymbol(path, decl, symbolName, selector, inputs, outputs, exportAs) {
            var _this = _super.call(this, path, decl, symbolName) || this;
            _this.selector = selector;
            _this.inputs = inputs;
            _this.outputs = outputs;
            _this.exportAs = exportAs;
            return _this;
        }
        DirectiveSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            // Note: since components and directives have exactly the same items contributing to their
            // public API, it is okay for a directive to change into a component and vice versa without
            // the API being affected.
            if (!(previousSymbol instanceof DirectiveSymbol)) {
                return true;
            }
            // Directives and components have a public API of:
            //  1. Their selector.
            //  2. The binding names of their inputs and outputs; a change in ordering is also considered
            //     to be a change in public API.
            //  3. The list of exportAs names and its ordering.
            return this.selector !== previousSymbol.selector ||
                !util_1.isArrayEqual(this.inputs, previousSymbol.inputs) ||
                !util_1.isArrayEqual(this.outputs, previousSymbol.outputs) ||
                !util_1.isArrayEqual(this.exportAs, previousSymbol.exportAs);
        };
        return DirectiveSymbol;
    }(api_1.SemanticSymbol));
    exports.DirectiveSymbol = DirectiveSymbol;
    /**
     * Represents an Angular component.
     */
    var ComponentSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(ComponentSymbol, _super);
        function ComponentSymbol() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.usedDirectives = [];
            _this.usedPipes = [];
            _this.isRemotelyScoped = false;
            return _this;
        }
        ComponentSymbol.prototype.isEmitAffected = function (previousSymbol, publicApiAffected) {
            if (!(previousSymbol instanceof ComponentSymbol)) {
                return true;
            }
            // Create an equality function that considers symbols equal if they represent the same
            // declaration, but only if the symbol in the current compilation does not have its public API
            // affected.
            var isSymbolAffected = function (current, previous) {
                return util_1.isSymbolEqual(current, previous) && !publicApiAffected.has(current);
            };
            // The emit of a component is affected if either of the following is true:
            //  1. The component used to be remotely scoped but no longer is, or vice versa.
            //  2. The list of used directives has changed or any of those directives have had their public
            //     API changed. If the used directives have been reordered but not otherwise affected then
            //     the component must still be re-emitted, as this may affect directive instantiation order.
            //  3. The list of used pipes has changed, or any of those pipes have had their public API
            //     changed.
            return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped ||
                !util_1.isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolAffected) ||
                !util_1.isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolAffected);
        };
        return ComponentSymbol;
    }(DirectiveSymbol));
    exports.ComponentSymbol = ComponentSymbol;
    /**
     * Represents an Angular NgModule.
     */
    var NgModuleSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(NgModuleSymbol, _super);
        function NgModuleSymbol(path, decl, symbolName, rawDeclarations) {
            var _this = _super.call(this, path, decl, symbolName) || this;
            _this.rawDeclarations = rawDeclarations;
            _this.hasRemoteScopes = false;
            return _this;
        }
        NgModuleSymbol.prototype.connect = function (resolve) {
            var declarations = this.rawDeclarations.map(resolve);
            // An NgModule has remote scopes if any of its declared components is remotely scoped.
            this.hasRemoteScopes =
                declarations.some(function (symbol) { return symbol instanceof ComponentSymbol && symbol.isRemotelyScoped; });
        };
        NgModuleSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof NgModuleSymbol)) {
                return true;
            }
            // NgModules don't have a public API that could affect emit of Angular decorated classes.
            return false;
        };
        NgModuleSymbol.prototype.isEmitAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof NgModuleSymbol)) {
                return true;
            }
            // The NgModule needs to be re-emitted if it does no longer have any remote scopes, or vice
            // versa.
            return this.hasRemoteScopes !== previousSymbol.hasRemoteScopes;
        };
        return NgModuleSymbol;
    }(api_1.SemanticSymbol));
    exports.NgModuleSymbol = NgModuleSymbol;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvbmdtb2R1bGVfc2VtYW50aWNzL3NyYy9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFVQSxrRkFBcUQ7SUFDckQsb0ZBQW1EO0lBRW5EOztPQUVHO0lBQ0g7UUFBZ0Msc0NBQWM7UUFDNUMsb0JBQ0ksSUFBb0IsRUFBRSxJQUFzQixFQUFFLFVBQXVCLEVBQ3JELElBQVk7WUFGaEMsWUFHRSxrQkFBTSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxTQUM5QjtZQUZtQixVQUFJLEdBQUosSUFBSSxDQUFROztRQUVoQyxDQUFDO1FBRUQsd0NBQW1CLEdBQW5CLFVBQW9CLGNBQThCO1lBQ2hELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxVQUFVLENBQUMsRUFBRTtnQkFDM0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQzNDLENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFkRCxDQUFnQyxvQkFBYyxHQWM3QztJQWRZLGdDQUFVO0lBZ0J2Qjs7O09BR0c7SUFDSDtRQUFxQywyQ0FBYztRQUNqRCx5QkFDSSxJQUFvQixFQUFFLElBQXNCLEVBQUUsVUFBdUIsRUFDckQsUUFBcUIsRUFBa0IsTUFBZ0IsRUFDdkQsT0FBaUIsRUFBa0IsUUFBdUI7WUFIOUUsWUFJRSxrQkFBTSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxTQUM5QjtZQUhtQixjQUFRLEdBQVIsUUFBUSxDQUFhO1lBQWtCLFlBQU0sR0FBTixNQUFNLENBQVU7WUFDdkQsYUFBTyxHQUFQLE9BQU8sQ0FBVTtZQUFrQixjQUFRLEdBQVIsUUFBUSxDQUFlOztRQUU5RSxDQUFDO1FBRUQs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QyxDQUFDLGNBQWMsWUFBWSxjQUFjLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHlGQUF5RjtZQUN6RixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCx1Q0FBYyxHQUFkLFVBQWUsY0FBOEI7WUFDM0MsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsMkZBQTJGO1lBQzNGLFNBQVM7WUFDVCxPQUFPLElBQUksQ0FBQyxlQUFlLEtBQUssY0FBYyxDQUFDLGVBQWUsQ0FBQztRQUNqRSxDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBbkNELENBQW9DLG9CQUFjLEdBbUNqRDtJQW5DWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbCwgU3ltYm9sUmVzb2x2ZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7aXNBcnJheUVxdWFsLCBpc1N5bWJvbEVxdWFsfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBwaXBlLlxuICovXG5leHBvcnQgY2xhc3MgUGlwZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgc3ltYm9sTmFtZTogc3RyaW5nfG51bGwsXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgbmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIocGF0aCwgZGVjbCwgc3ltYm9sTmFtZSk7XG4gIH1cblxuICBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgUGlwZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm5hbWUgIT09IHByZXZpb3VzU3ltYm9sLm5hbWU7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLiBDb21wb25lbnRzIGFyZSByZXByZXNlbnRlZCBieSBgQ29tcG9uZW50U3ltYm9sYCwgd2hpY2ggaW5oZXJpdHNcbiAqIGZyb20gdGhpcyBzeW1ib2wuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcGF0aDogQWJzb2x1dGVGc1BhdGgsIGRlY2w6IENsYXNzRGVjbGFyYXRpb24sIHN5bWJvbE5hbWU6IHN0cmluZ3xudWxsLFxuICAgICAgcHVibGljIHJlYWRvbmx5IHNlbGVjdG9yOiBzdHJpbmd8bnVsbCwgcHVibGljIHJlYWRvbmx5IGlucHV0czogc3RyaW5nW10sXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgb3V0cHV0czogc3RyaW5nW10sIHB1YmxpYyByZWFkb25seSBleHBvcnRBczogc3RyaW5nW118bnVsbCkge1xuICAgIHN1cGVyKHBhdGgsIGRlY2wsIHN5bWJvbE5hbWUpO1xuICB9XG5cbiAgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICAvLyBOb3RlOiBzaW5jZSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBpdGVtcyBjb250cmlidXRpbmcgdG8gdGhlaXJcbiAgICAvLyBwdWJsaWMgQVBJLCBpdCBpcyBva2F5IGZvciBhIGRpcmVjdGl2ZSB0byBjaGFuZ2UgaW50byBhIGNvbXBvbmVudCBhbmQgdmljZSB2ZXJzYSB3aXRob3V0XG4gICAgLy8gdGhlIEFQSSBiZWluZyBhZmZlY3RlZC5cbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIERpcmVjdGl2ZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIGNvbXBvbmVudHMgaGF2ZSBhIHB1YmxpYyBBUEkgb2Y6XG4gICAgLy8gIDEuIFRoZWlyIHNlbGVjdG9yLlxuICAgIC8vICAyLiBUaGUgYmluZGluZyBuYW1lcyBvZiB0aGVpciBpbnB1dHMgYW5kIG91dHB1dHM7IGEgY2hhbmdlIGluIG9yZGVyaW5nIGlzIGFsc28gY29uc2lkZXJlZFxuICAgIC8vICAgICB0byBiZSBhIGNoYW5nZSBpbiBwdWJsaWMgQVBJLlxuICAgIC8vICAzLiBUaGUgbGlzdCBvZiBleHBvcnRBcyBuYW1lcyBhbmQgaXRzIG9yZGVyaW5nLlxuICAgIHJldHVybiB0aGlzLnNlbGVjdG9yICE9PSBwcmV2aW91c1N5bWJvbC5zZWxlY3RvciB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMuaW5wdXRzLCBwcmV2aW91c1N5bWJvbC5pbnB1dHMpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5vdXRwdXRzLCBwcmV2aW91c1N5bWJvbC5vdXRwdXRzKSB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMuZXhwb3J0QXMsIHByZXZpb3VzU3ltYm9sLmV4cG9ydEFzKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTeW1ib2wgZXh0ZW5kcyBEaXJlY3RpdmVTeW1ib2wge1xuICB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNTeW1ib2xbXSA9IFtdO1xuICB1c2VkUGlwZXM6IFNlbWFudGljU3ltYm9sW10gPSBbXTtcbiAgaXNSZW1vdGVseVNjb3BlZCA9IGZhbHNlO1xuXG4gIGlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCwgcHVibGljQXBpQWZmZWN0ZWQ6IFNldDxTZW1hbnRpY1N5bWJvbD4pOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBzeW1ib2xzIGVxdWFsIGlmIHRoZXkgcmVwcmVzZW50IHRoZSBzYW1lXG4gICAgLy8gZGVjbGFyYXRpb24sIGJ1dCBvbmx5IGlmIHRoZSBzeW1ib2wgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gZG9lcyBub3QgaGF2ZSBpdHMgcHVibGljIEFQSVxuICAgIC8vIGFmZmVjdGVkLlxuICAgIGNvbnN0IGlzU3ltYm9sQWZmZWN0ZWQgPSAoY3VycmVudDogU2VtYW50aWNTeW1ib2wsIHByZXZpb3VzOiBTZW1hbnRpY1N5bWJvbCkgPT5cbiAgICAgICAgaXNTeW1ib2xFcXVhbChjdXJyZW50LCBwcmV2aW91cykgJiYgIXB1YmxpY0FwaUFmZmVjdGVkLmhhcyhjdXJyZW50KTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgY29tcG9uZW50IGlzIGFmZmVjdGVkIGlmIGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIGlzIHRydWU6XG4gICAgLy8gIDEuIFRoZSBjb21wb25lbnQgdXNlZCB0byBiZSByZW1vdGVseSBzY29wZWQgYnV0IG5vIGxvbmdlciBpcywgb3IgdmljZSB2ZXJzYS5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIGhhcyBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSBkaXJlY3RpdmVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpY1xuICAgIC8vICAgICBBUEkgY2hhbmdlZC4gSWYgdGhlIHVzZWQgZGlyZWN0aXZlcyBoYXZlIGJlZW4gcmVvcmRlcmVkIGJ1dCBub3Qgb3RoZXJ3aXNlIGFmZmVjdGVkIHRoZW5cbiAgICAvLyAgICAgdGhlIGNvbXBvbmVudCBtdXN0IHN0aWxsIGJlIHJlLWVtaXR0ZWQsIGFzIHRoaXMgbWF5IGFmZmVjdCBkaXJlY3RpdmUgaW5zdGFudGlhdGlvbiBvcmRlci5cbiAgICAvLyAgMy4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpYyBBUElcbiAgICAvLyAgICAgY2hhbmdlZC5cbiAgICByZXR1cm4gdGhpcy5pc1JlbW90ZWx5U2NvcGVkICE9PSBwcmV2aW91c1N5bWJvbC5pc1JlbW90ZWx5U2NvcGVkIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkRGlyZWN0aXZlcywgcHJldmlvdXNTeW1ib2wudXNlZERpcmVjdGl2ZXMsIGlzU3ltYm9sQWZmZWN0ZWQpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkUGlwZXMsIHByZXZpb3VzU3ltYm9sLnVzZWRQaXBlcywgaXNTeW1ib2xBZmZlY3RlZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgTmdNb2R1bGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgcHJpdmF0ZSBoYXNSZW1vdGVTY29wZXMgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHBhdGg6IEFic29sdXRlRnNQYXRoLCBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBzeW1ib2xOYW1lOiBzdHJpbmd8bnVsbCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcmF3RGVjbGFyYXRpb25zOiBDbGFzc0RlY2xhcmF0aW9uW10pIHtcbiAgICBzdXBlcihwYXRoLCBkZWNsLCBzeW1ib2xOYW1lKTtcbiAgfVxuXG4gIGNvbm5lY3QocmVzb2x2ZTogU3ltYm9sUmVzb2x2ZXIpOiB2b2lkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSB0aGlzLnJhd0RlY2xhcmF0aW9ucy5tYXAocmVzb2x2ZSk7XG5cbiAgICAvLyBBbiBOZ01vZHVsZSBoYXMgcmVtb3RlIHNjb3BlcyBpZiBhbnkgb2YgaXRzIGRlY2xhcmVkIGNvbXBvbmVudHMgaXMgcmVtb3RlbHkgc2NvcGVkLlxuICAgIHRoaXMuaGFzUmVtb3RlU2NvcGVzID1cbiAgICAgICAgZGVjbGFyYXRpb25zLnNvbWUoc3ltYm9sID0+IHN5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCAmJiBzeW1ib2wuaXNSZW1vdGVseVNjb3BlZCk7XG4gIH1cblxuICBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBOZ01vZHVsZXMgZG9uJ3QgaGF2ZSBhIHB1YmxpYyBBUEkgdGhhdCBjb3VsZCBhZmZlY3QgZW1pdCBvZiBBbmd1bGFyIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgTmdNb2R1bGUgbmVlZHMgdG8gYmUgcmUtZW1pdHRlZCBpZiBpdCBkb2VzIG5vIGxvbmdlciBoYXZlIGFueSByZW1vdGUgc2NvcGVzLCBvciB2aWNlXG4gICAgLy8gdmVyc2EuXG4gICAgcmV0dXJuIHRoaXMuaGFzUmVtb3RlU2NvcGVzICE9PSBwcmV2aW91c1N5bWJvbC5oYXNSZW1vdGVTY29wZXM7XG4gIH1cbn1cbiJdfQ==