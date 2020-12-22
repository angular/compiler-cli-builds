(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/emit_scopes/iife_emit_scope", ["require", "exports", "tslib", "@angular/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IifeEmitScope = void 0;
    var tslib_1 = require("tslib");
    var emit_scope_1 = require("@angular/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope");
    /**
     * This class is a specialization of the `EmitScope` class that is designed for the situation where
     * there is no clear shared scope for constant statements. In this case they are bundled with the
     * translated definition inside an IIFE.
     */
    var IifeEmitScope = /** @class */ (function (_super) {
        tslib_1.__extends(IifeEmitScope, _super);
        function IifeEmitScope() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Translate the given Output AST definition expression into a generic `TExpression`.
         *
         * Wraps the output from `EmitScope.translateDefinition()` and `EmitScope.getConstantStatements()`
         * in an IIFE.
         */
        IifeEmitScope.prototype.translateDefinition = function (definition) {
            var factory = this.linkerEnvironment.factory;
            var constantStatements = _super.prototype.getConstantStatements.call(this);
            var returnStatement = factory.createReturnStatement(_super.prototype.translateDefinition.call(this, definition));
            var body = factory.createBlock(tslib_1.__spread(constantStatements, [returnStatement]));
            var fn = factory.createFunctionExpression(/* name */ null, /* args */ [], body);
            return factory.createCallExpression(fn, /* args */ [], /* pure */ false);
        };
        /**
         * It is not valid to call this method, since there will be no shared constant statements - they
         * are already emitted in the IIFE alongside the translated definition.
         */
        IifeEmitScope.prototype.getConstantStatements = function () {
            throw new Error('BUG - IifeEmitScope should not expose any constant statements');
        };
        return IifeEmitScope;
    }(emit_scope_1.EmitScope));
    exports.IifeEmitScope = IifeEmitScope;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWlmZV9lbWl0X3Njb3BlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvZW1pdF9zY29wZXMvaWlmZV9lbWl0X3Njb3BlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFRQSxrR0FBdUM7SUFFdkM7Ozs7T0FJRztJQUNIO1FBQTRELHlDQUFrQztRQUE5Rjs7UUF3QkEsQ0FBQztRQXZCQzs7Ozs7V0FLRztRQUNILDJDQUFtQixHQUFuQixVQUFvQixVQUF3QjtZQUNuQyxJQUFBLE9BQU8sR0FBSSxJQUFJLENBQUMsaUJBQWlCLFFBQTFCLENBQTJCO1lBQ3pDLElBQU0sa0JBQWtCLEdBQUcsaUJBQU0scUJBQXFCLFdBQUUsQ0FBQztZQUV6RCxJQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsaUJBQU0sbUJBQW1CLFlBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM3RixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsV0FBVyxrQkFBSyxrQkFBa0IsR0FBRSxlQUFlLEdBQUUsQ0FBQztZQUMzRSxJQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pGLE9BQU8sT0FBTyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsNkNBQXFCLEdBQXJCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQywrREFBK0QsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUF4QkQsQ0FBNEQsc0JBQVMsR0F3QnBFO0lBeEJZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5pbXBvcnQge0VtaXRTY29wZX0gZnJvbSAnLi9lbWl0X3Njb3BlJztcblxuLyoqXG4gKiBUaGlzIGNsYXNzIGlzIGEgc3BlY2lhbGl6YXRpb24gb2YgdGhlIGBFbWl0U2NvcGVgIGNsYXNzIHRoYXQgaXMgZGVzaWduZWQgZm9yIHRoZSBzaXR1YXRpb24gd2hlcmVcbiAqIHRoZXJlIGlzIG5vIGNsZWFyIHNoYXJlZCBzY29wZSBmb3IgY29uc3RhbnQgc3RhdGVtZW50cy4gSW4gdGhpcyBjYXNlIHRoZXkgYXJlIGJ1bmRsZWQgd2l0aCB0aGVcbiAqIHRyYW5zbGF0ZWQgZGVmaW5pdGlvbiBpbnNpZGUgYW4gSUlGRS5cbiAqL1xuZXhwb3J0IGNsYXNzIElpZmVFbWl0U2NvcGU8VFN0YXRlbWVudCwgVEV4cHJlc3Npb24+IGV4dGVuZHMgRW1pdFNjb3BlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiB7XG4gIC8qKlxuICAgKiBUcmFuc2xhdGUgdGhlIGdpdmVuIE91dHB1dCBBU1QgZGVmaW5pdGlvbiBleHByZXNzaW9uIGludG8gYSBnZW5lcmljIGBURXhwcmVzc2lvbmAuXG4gICAqXG4gICAqIFdyYXBzIHRoZSBvdXRwdXQgZnJvbSBgRW1pdFNjb3BlLnRyYW5zbGF0ZURlZmluaXRpb24oKWAgYW5kIGBFbWl0U2NvcGUuZ2V0Q29uc3RhbnRTdGF0ZW1lbnRzKClgXG4gICAqIGluIGFuIElJRkUuXG4gICAqL1xuICB0cmFuc2xhdGVEZWZpbml0aW9uKGRlZmluaXRpb246IG8uRXhwcmVzc2lvbik6IFRFeHByZXNzaW9uIHtcbiAgICBjb25zdCB7ZmFjdG9yeX0gPSB0aGlzLmxpbmtlckVudmlyb25tZW50O1xuICAgIGNvbnN0IGNvbnN0YW50U3RhdGVtZW50cyA9IHN1cGVyLmdldENvbnN0YW50U3RhdGVtZW50cygpO1xuXG4gICAgY29uc3QgcmV0dXJuU3RhdGVtZW50ID0gZmFjdG9yeS5jcmVhdGVSZXR1cm5TdGF0ZW1lbnQoc3VwZXIudHJhbnNsYXRlRGVmaW5pdGlvbihkZWZpbml0aW9uKSk7XG4gICAgY29uc3QgYm9keSA9IGZhY3RvcnkuY3JlYXRlQmxvY2soWy4uLmNvbnN0YW50U3RhdGVtZW50cywgcmV0dXJuU3RhdGVtZW50XSk7XG4gICAgY29uc3QgZm4gPSBmYWN0b3J5LmNyZWF0ZUZ1bmN0aW9uRXhwcmVzc2lvbigvKiBuYW1lICovIG51bGwsIC8qIGFyZ3MgKi9bXSwgYm9keSk7XG4gICAgcmV0dXJuIGZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oZm4sIC8qIGFyZ3MgKi9bXSwgLyogcHVyZSAqLyBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogSXQgaXMgbm90IHZhbGlkIHRvIGNhbGwgdGhpcyBtZXRob2QsIHNpbmNlIHRoZXJlIHdpbGwgYmUgbm8gc2hhcmVkIGNvbnN0YW50IHN0YXRlbWVudHMgLSB0aGV5XG4gICAqIGFyZSBhbHJlYWR5IGVtaXR0ZWQgaW4gdGhlIElJRkUgYWxvbmdzaWRlIHRoZSB0cmFuc2xhdGVkIGRlZmluaXRpb24uXG4gICAqL1xuICBnZXRDb25zdGFudFN0YXRlbWVudHMoKTogVFN0YXRlbWVudFtdIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0JVRyAtIElpZmVFbWl0U2NvcGUgc2hvdWxkIG5vdCBleHBvc2UgYW55IGNvbnN0YW50IHN0YXRlbWVudHMnKTtcbiAgfVxufVxuIl19