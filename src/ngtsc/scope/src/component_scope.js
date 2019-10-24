(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/scope/src/component_scope", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * A noop registry that doesn't do anything.
     *
     * This can be used in tests and cases where we don't care about the compilation scopes
     * being registered.
     */
    var NoopComponentScopeRegistry = /** @class */ (function () {
        function NoopComponentScopeRegistry() {
        }
        NoopComponentScopeRegistry.prototype.registerComponentScope = function (clazz, scope) { };
        NoopComponentScopeRegistry.prototype.setComponentAsRequiringRemoteScoping = function (clazz) { };
        return NoopComponentScopeRegistry;
    }());
    exports.NoopComponentScopeRegistry = NoopComponentScopeRegistry;
    /**
     * A `ComponentScopeReader` that reads from an ordered set of child readers until it obtains the
     * requested scope.
     *
     * This is used to combine `ComponentScopeReader`s that read from different sources (e.g. from a
     * registry and from the incremental state).
     */
    var CompoundComponentScopeReader = /** @class */ (function () {
        function CompoundComponentScopeReader(readers) {
            this.readers = readers;
        }
        CompoundComponentScopeReader.prototype.getScopeForComponent = function (clazz) {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var meta = reader.getScopeForComponent(clazz);
                    if (meta !== null) {
                        return meta;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        CompoundComponentScopeReader.prototype.getRequiresRemoteScope = function (clazz) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(this.readers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var reader = _c.value;
                    var requiredScoping = reader.getRequiresRemoteScope(clazz);
                    if (requiredScoping !== null) {
                        return requiredScoping;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
        };
        return CompoundComponentScopeReader;
    }());
    exports.CompoundComponentScopeReader = CompoundComponentScopeReader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50X3Njb3BlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zY29wZS9zcmMvY29tcG9uZW50X3Njb3BlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQTBCQTs7Ozs7T0FLRztJQUNIO1FBQUE7UUFHQSxDQUFDO1FBRkMsMkRBQXNCLEdBQXRCLFVBQXVCLEtBQXVCLEVBQUUsS0FBdUIsSUFBUyxDQUFDO1FBQ2pGLHlFQUFvQyxHQUFwQyxVQUFxQyxLQUF1QixJQUFTLENBQUM7UUFDeEUsaUNBQUM7SUFBRCxDQUFDLEFBSEQsSUFHQztJQUhZLGdFQUEwQjtJQUt2Qzs7Ozs7O09BTUc7SUFDSDtRQUNFLHNDQUFvQixPQUErQjtZQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUFHLENBQUM7UUFFdkQsMkRBQW9CLEdBQXBCLFVBQXFCLEtBQXVCOzs7Z0JBQzFDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFBLGdCQUFBLDRCQUFFO29CQUE5QixJQUFNLE1BQU0sV0FBQTtvQkFDZixJQUFNLElBQUksR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2hELElBQUksSUFBSSxLQUFLLElBQUksRUFBRTt3QkFDakIsT0FBTyxJQUFJLENBQUM7cUJBQ2I7aUJBQ0Y7Ozs7Ozs7OztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELDZEQUFzQixHQUF0QixVQUF1QixLQUF1Qjs7O2dCQUM1QyxLQUFxQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBOUIsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsSUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUM3RCxJQUFJLGVBQWUsS0FBSyxJQUFJLEVBQUU7d0JBQzVCLE9BQU8sZUFBZSxDQUFDO3FCQUN4QjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsbUNBQUM7SUFBRCxDQUFDLEFBdEJELElBc0JDO0lBdEJZLG9FQUE0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGV9IGZyb20gJy4vbG9jYWwnO1xuXG4vKipcbiAqIFJlZ2lzdGVyIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBjb21wb25lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudFNjb3BlUmVnaXN0cnkge1xuICByZWdpc3RlckNvbXBvbmVudFNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBzY29wZTogTG9jYWxNb2R1bGVTY29wZSk6IHZvaWQ7XG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQ7XG59XG5cbi8qKlxuICogUmVhZCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgY29tcG9uZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRTY29wZVJlYWRlciB7XG4gIGdldFNjb3BlRm9yQ29tcG9uZW50KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsO1xuICBnZXRSZXF1aXJlc1JlbW90ZVNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbnxudWxsO1xufVxuXG4vKipcbiAqIEEgbm9vcCByZWdpc3RyeSB0aGF0IGRvZXNuJ3QgZG8gYW55dGhpbmcuXG4gKlxuICogVGhpcyBjYW4gYmUgdXNlZCBpbiB0ZXN0cyBhbmQgY2FzZXMgd2hlcmUgd2UgZG9uJ3QgY2FyZSBhYm91dCB0aGUgY29tcGlsYXRpb24gc2NvcGVzXG4gKiBiZWluZyByZWdpc3RlcmVkLlxuICovXG5leHBvcnQgY2xhc3MgTm9vcENvbXBvbmVudFNjb3BlUmVnaXN0cnkgaW1wbGVtZW50cyBDb21wb25lbnRTY29wZVJlZ2lzdHJ5IHtcbiAgcmVnaXN0ZXJDb21wb25lbnRTY29wZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgc2NvcGU6IExvY2FsTW9kdWxlU2NvcGUpOiB2b2lkIHt9XG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge31cbn1cblxuLyoqXG4gKiBBIGBDb21wb25lbnRTY29wZVJlYWRlcmAgdGhhdCByZWFkcyBmcm9tIGFuIG9yZGVyZWQgc2V0IG9mIGNoaWxkIHJlYWRlcnMgdW50aWwgaXQgb2J0YWlucyB0aGVcbiAqIHJlcXVlc3RlZCBzY29wZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWQgdG8gY29tYmluZSBgQ29tcG9uZW50U2NvcGVSZWFkZXJgcyB0aGF0IHJlYWQgZnJvbSBkaWZmZXJlbnQgc291cmNlcyAoZS5nLiBmcm9tIGFcbiAqIHJlZ2lzdHJ5IGFuZCBmcm9tIHRoZSBpbmNyZW1lbnRhbCBzdGF0ZSkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb3VuZENvbXBvbmVudFNjb3BlUmVhZGVyIGltcGxlbWVudHMgQ29tcG9uZW50U2NvcGVSZWFkZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRlcnM6IENvbXBvbmVudFNjb3BlUmVhZGVyW10pIHt9XG5cbiAgZ2V0U2NvcGVGb3JDb21wb25lbnQoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIGZvciAoY29uc3QgcmVhZGVyIG9mIHRoaXMucmVhZGVycykge1xuICAgICAgY29uc3QgbWV0YSA9IHJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChjbGF6eik7XG4gICAgICBpZiAobWV0YSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbWV0YTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRSZXF1aXJlc1JlbW90ZVNjb3BlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbnxudWxsIHtcbiAgICBmb3IgKGNvbnN0IHJlYWRlciBvZiB0aGlzLnJlYWRlcnMpIHtcbiAgICAgIGNvbnN0IHJlcXVpcmVkU2NvcGluZyA9IHJlYWRlci5nZXRSZXF1aXJlc1JlbW90ZVNjb3BlKGNsYXp6KTtcbiAgICAgIGlmIChyZXF1aXJlZFNjb3BpbmcgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHJlcXVpcmVkU2NvcGluZztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==