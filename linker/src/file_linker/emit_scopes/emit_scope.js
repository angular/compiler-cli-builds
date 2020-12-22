(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/emit_scopes/emit_scope", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/linker/src/linker_import_generator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EmitScope = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var linker_import_generator_1 = require("@angular/compiler-cli/linker/src/linker_import_generator");
    /**
     * This class represents (from the point of view of the `FileLinker`) the scope in which
     * statements and expressions related to a linked partial declaration will be emitted.
     *
     * It holds a copy of a `ConstantPool` that is used to capture any constant statements that need to
     * be emitted in this context.
     *
     * This implementation will emit the definition and the constant statements separately.
     */
    var EmitScope = /** @class */ (function () {
        function EmitScope(ngImport, linkerEnvironment) {
            this.ngImport = ngImport;
            this.linkerEnvironment = linkerEnvironment;
            this.constantPool = new compiler_1.ConstantPool();
        }
        /**
         * Translate the given Output AST definition expression into a generic `TExpression`.
         *
         * Use a `LinkerImportGenerator` to handle any imports in the definition.
         */
        EmitScope.prototype.translateDefinition = function (definition) {
            return this.linkerEnvironment.translator.translateExpression(definition, new linker_import_generator_1.LinkerImportGenerator(this.ngImport));
        };
        /**
         * Return any constant statements that are shared between all uses of this `EmitScope`.
         */
        EmitScope.prototype.getConstantStatements = function () {
            var translator = this.linkerEnvironment.translator;
            var importGenerator = new linker_import_generator_1.LinkerImportGenerator(this.ngImport);
            return this.constantPool.statements.map(function (statement) { return translator.translateStatement(statement, importGenerator); });
        };
        return EmitScope;
    }());
    exports.EmitScope = EmitScope;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdF9zY29wZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL2VtaXRfc2NvcGVzL2VtaXRfc2NvcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsOENBQStDO0lBRS9DLG9HQUFvRTtJQUdwRTs7Ozs7Ozs7T0FRRztJQUNIO1FBR0UsbUJBQ3VCLFFBQXFCLEVBQ3JCLGlCQUE2RDtZQUQ3RCxhQUFRLEdBQVIsUUFBUSxDQUFhO1lBQ3JCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBNEM7WUFKM0UsaUJBQVksR0FBRyxJQUFJLHVCQUFZLEVBQUUsQ0FBQztRQUk0QyxDQUFDO1FBRXhGOzs7O1dBSUc7UUFDSCx1Q0FBbUIsR0FBbkIsVUFBb0IsVUFBd0I7WUFDMUMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUN4RCxVQUFVLEVBQUUsSUFBSSwrQ0FBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCx5Q0FBcUIsR0FBckI7WUFDUyxJQUFBLFVBQVUsR0FBSSxJQUFJLENBQUMsaUJBQWlCLFdBQTFCLENBQTJCO1lBQzVDLElBQU0sZUFBZSxHQUFHLElBQUksK0NBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNuQyxVQUFBLFNBQVMsSUFBSSxPQUFBLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQXpELENBQXlELENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBQ0gsZ0JBQUM7SUFBRCxDQUFDLEFBMUJELElBMEJDO0lBMUJZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgbyBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuaW1wb3J0IHtMaW5rZXJJbXBvcnRHZW5lcmF0b3J9IGZyb20gJy4uLy4uL2xpbmtlcl9pbXBvcnRfZ2VuZXJhdG9yJztcbmltcG9ydCB7TGlua2VyRW52aXJvbm1lbnR9IGZyb20gJy4uL2xpbmtlcl9lbnZpcm9ubWVudCc7XG5cbi8qKlxuICogVGhpcyBjbGFzcyByZXByZXNlbnRzIChmcm9tIHRoZSBwb2ludCBvZiB2aWV3IG9mIHRoZSBgRmlsZUxpbmtlcmApIHRoZSBzY29wZSBpbiB3aGljaFxuICogc3RhdGVtZW50cyBhbmQgZXhwcmVzc2lvbnMgcmVsYXRlZCB0byBhIGxpbmtlZCBwYXJ0aWFsIGRlY2xhcmF0aW9uIHdpbGwgYmUgZW1pdHRlZC5cbiAqXG4gKiBJdCBob2xkcyBhIGNvcHkgb2YgYSBgQ29uc3RhbnRQb29sYCB0aGF0IGlzIHVzZWQgdG8gY2FwdHVyZSBhbnkgY29uc3RhbnQgc3RhdGVtZW50cyB0aGF0IG5lZWQgdG9cbiAqIGJlIGVtaXR0ZWQgaW4gdGhpcyBjb250ZXh0LlxuICpcbiAqIFRoaXMgaW1wbGVtZW50YXRpb24gd2lsbCBlbWl0IHRoZSBkZWZpbml0aW9uIGFuZCB0aGUgY29uc3RhbnQgc3RhdGVtZW50cyBzZXBhcmF0ZWx5LlxuICovXG5leHBvcnQgY2xhc3MgRW1pdFNjb3BlPFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPiB7XG4gIHJlYWRvbmx5IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCByZWFkb25seSBuZ0ltcG9ydDogVEV4cHJlc3Npb24sXG4gICAgICBwcm90ZWN0ZWQgcmVhZG9ubHkgbGlua2VyRW52aXJvbm1lbnQ6IExpbmtlckVudmlyb25tZW50PFRTdGF0ZW1lbnQsIFRFeHByZXNzaW9uPikge31cblxuICAvKipcbiAgICogVHJhbnNsYXRlIHRoZSBnaXZlbiBPdXRwdXQgQVNUIGRlZmluaXRpb24gZXhwcmVzc2lvbiBpbnRvIGEgZ2VuZXJpYyBgVEV4cHJlc3Npb25gLlxuICAgKlxuICAgKiBVc2UgYSBgTGlua2VySW1wb3J0R2VuZXJhdG9yYCB0byBoYW5kbGUgYW55IGltcG9ydHMgaW4gdGhlIGRlZmluaXRpb24uXG4gICAqL1xuICB0cmFuc2xhdGVEZWZpbml0aW9uKGRlZmluaXRpb246IG8uRXhwcmVzc2lvbik6IFRFeHByZXNzaW9uIHtcbiAgICByZXR1cm4gdGhpcy5saW5rZXJFbnZpcm9ubWVudC50cmFuc2xhdG9yLnRyYW5zbGF0ZUV4cHJlc3Npb24oXG4gICAgICAgIGRlZmluaXRpb24sIG5ldyBMaW5rZXJJbXBvcnRHZW5lcmF0b3IodGhpcy5uZ0ltcG9ydCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbnkgY29uc3RhbnQgc3RhdGVtZW50cyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBhbGwgdXNlcyBvZiB0aGlzIGBFbWl0U2NvcGVgLlxuICAgKi9cbiAgZ2V0Q29uc3RhbnRTdGF0ZW1lbnRzKCk6IFRTdGF0ZW1lbnRbXSB7XG4gICAgY29uc3Qge3RyYW5zbGF0b3J9ID0gdGhpcy5saW5rZXJFbnZpcm9ubWVudDtcbiAgICBjb25zdCBpbXBvcnRHZW5lcmF0b3IgPSBuZXcgTGlua2VySW1wb3J0R2VuZXJhdG9yKHRoaXMubmdJbXBvcnQpO1xuICAgIHJldHVybiB0aGlzLmNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChcbiAgICAgICAgc3RhdGVtZW50ID0+IHRyYW5zbGF0b3IudHJhbnNsYXRlU3RhdGVtZW50KHN0YXRlbWVudCwgaW1wb3J0R2VuZXJhdG9yKSk7XG4gIH1cbn1cbiJdfQ==