(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injector_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toR3InjectorMeta = exports.PartialInjectorLinkerVersion1 = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    var util_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareInjector()` call expressions.
     */
    var PartialInjectorLinkerVersion1 = /** @class */ (function () {
        function PartialInjectorLinkerVersion1() {
        }
        PartialInjectorLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = toR3InjectorMeta(metaObj);
            var def = (0, compiler_1.compileInjector)(meta);
            return def.expression;
        };
        return PartialInjectorLinkerVersion1;
    }());
    exports.PartialInjectorLinkerVersion1 = PartialInjectorLinkerVersion1;
    /**
     * Derives the `R3InjectorMetadata` structure from the AST object.
     */
    function toR3InjectorMeta(metaObj) {
        var typeExpr = metaObj.getValue('type');
        var typeName = typeExpr.getSymbolName();
        if (typeName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(typeExpr.expression, 'Unsupported type, its name could not be determined');
        }
        return {
            name: typeName,
            type: (0, util_1.wrapReference)(typeExpr.getOpaque()),
            internalType: metaObj.getOpaque('type'),
            providers: metaObj.has('providers') ? metaObj.getOpaque('providers') : null,
            imports: metaObj.has('imports') ? metaObj.getArray('imports').map(function (i) { return i.getOpaque(); }) : [],
        };
    }
    exports.toR3InjectorMeta = toR3InjectorMeta;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9pbmplY3Rvcl9saW5rZXJfMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy9wYXJ0aWFsX2luamVjdG9yX2xpbmtlcl8xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFxSTtJQUlySSwwRkFBMEQ7SUFHMUQsMEZBQXFDO0lBRXJDOztPQUVHO0lBQ0g7UUFBQTtRQVFBLENBQUM7UUFQQyw4REFBc0IsR0FBdEIsVUFDSSxZQUEwQixFQUMxQixPQUFxRDtZQUN2RCxJQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QyxJQUFNLEdBQUcsR0FBRyxJQUFBLDBCQUFlLEVBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3hCLENBQUM7UUFDSCxvQ0FBQztJQUFELENBQUMsQUFSRCxJQVFDO0lBUlksc0VBQTZCO0lBVTFDOztPQUVHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQzVCLE9BQTBEO1FBQzVELElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztTQUNoRjtRQUVELE9BQU87WUFDTCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxJQUFBLG9CQUFhLEVBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLFlBQVksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUN2QyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUMzRSxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQWIsQ0FBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7U0FDM0YsQ0FBQztJQUNKLENBQUM7SUFoQkQsNENBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NvbXBpbGVJbmplY3RvciwgQ29uc3RhbnRQb29sLCBSM0RlY2xhcmVJbmplY3Rvck1ldGFkYXRhLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzUGFydGlhbERlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QXN0T2JqZWN0fSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcbmltcG9ydCB7d3JhcFJlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVJbmplY3RvcigpYCBjYWxsIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbEluamVjdG9yTGlua2VyVmVyc2lvbjE8VEV4cHJlc3Npb24+IGltcGxlbWVudHMgUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICBsaW5rUGFydGlhbERlY2xhcmF0aW9uKFxuICAgICAgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsXG4gICAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNQYXJ0aWFsRGVjbGFyYXRpb24sIFRFeHByZXNzaW9uPik6IG8uRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbWV0YSA9IHRvUjNJbmplY3Rvck1ldGEobWV0YU9iaik7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZUluamVjdG9yKG1ldGEpO1xuICAgIHJldHVybiBkZWYuZXhwcmVzc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIERlcml2ZXMgdGhlIGBSM0luamVjdG9yTWV0YWRhdGFgIHN0cnVjdHVyZSBmcm9tIHRoZSBBU1Qgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SM0luamVjdG9yTWV0YTxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUluamVjdG9yTWV0YWRhdGEsIFRFeHByZXNzaW9uPik6IFIzSW5qZWN0b3JNZXRhZGF0YSB7XG4gIGNvbnN0IHR5cGVFeHByID0gbWV0YU9iai5nZXRWYWx1ZSgndHlwZScpO1xuICBjb25zdCB0eXBlTmFtZSA9IHR5cGVFeHByLmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHR5cGVOYW1lID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIHR5cGVFeHByLmV4cHJlc3Npb24sICdVbnN1cHBvcnRlZCB0eXBlLCBpdHMgbmFtZSBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCcpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiB0eXBlTmFtZSxcbiAgICB0eXBlOiB3cmFwUmVmZXJlbmNlKHR5cGVFeHByLmdldE9wYXF1ZSgpKSxcbiAgICBpbnRlcm5hbFR5cGU6IG1ldGFPYmouZ2V0T3BhcXVlKCd0eXBlJyksXG4gICAgcHJvdmlkZXJzOiBtZXRhT2JqLmhhcygncHJvdmlkZXJzJykgPyBtZXRhT2JqLmdldE9wYXF1ZSgncHJvdmlkZXJzJykgOiBudWxsLFxuICAgIGltcG9ydHM6IG1ldGFPYmouaGFzKCdpbXBvcnRzJykgPyBtZXRhT2JqLmdldEFycmF5KCdpbXBvcnRzJykubWFwKGkgPT4gaS5nZXRPcGFxdWUoKSkgOiBbXSxcbiAgfTtcbn1cbiJdfQ==