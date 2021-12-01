(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_injectable_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler/src/output/output_ast", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toR3InjectableMeta = exports.PartialInjectableLinkerVersion1 = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var o = require("@angular/compiler/src/output/output_ast");
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    var util_1 = require("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareInjectable()` call expressions.
     */
    var PartialInjectableLinkerVersion1 = /** @class */ (function () {
        function PartialInjectableLinkerVersion1() {
        }
        PartialInjectableLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = toR3InjectableMeta(metaObj);
            var def = compiler_1.compileInjectable(meta, /* resolveForwardRefs */ false);
            return def.expression;
        };
        return PartialInjectableLinkerVersion1;
    }());
    exports.PartialInjectableLinkerVersion1 = PartialInjectableLinkerVersion1;
    /**
     * Derives the `R3InjectableMetadata` structure from the AST object.
     */
    function toR3InjectableMeta(metaObj) {
        var typeExpr = metaObj.getValue('type');
        var typeName = typeExpr.getSymbolName();
        if (typeName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(typeExpr.expression, 'Unsupported type, its name could not be determined');
        }
        var meta = {
            name: typeName,
            type: util_1.wrapReference(typeExpr.getOpaque()),
            internalType: typeExpr.getOpaque(),
            typeArgumentCount: 0,
            providedIn: metaObj.has('providedIn') ?
                util_1.extractForwardRef(metaObj.getValue('providedIn')) :
                compiler_1.createMayBeForwardRefExpression(o.literal(null), 0 /* None */),
        };
        if (metaObj.has('useClass')) {
            meta.useClass = util_1.extractForwardRef(metaObj.getValue('useClass'));
        }
        if (metaObj.has('useFactory')) {
            meta.useFactory = metaObj.getOpaque('useFactory');
        }
        if (metaObj.has('useExisting')) {
            meta.useExisting = util_1.extractForwardRef(metaObj.getValue('useExisting'));
        }
        if (metaObj.has('useValue')) {
            meta.useValue = util_1.extractForwardRef(metaObj.getValue('useValue'));
        }
        if (metaObj.has('deps')) {
            meta.deps = metaObj.getArray('deps').map(function (dep) { return util_1.getDependency(dep.getObject()); });
        }
        return meta;
    }
    exports.toR3InjectableMeta = toR3InjectableMeta;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9pbmplY3RhYmxlX2xpbmtlcl8xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvcGFydGlhbF9saW5rZXJzL3BhcnRpYWxfaW5qZWN0YWJsZV9saW5rZXJfMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBZ007SUFDaE0sMkRBQTZEO0lBRzdELDBGQUEwRDtJQUcxRCwwRkFBdUU7SUFFdkU7O09BRUc7SUFDSDtRQUFBO1FBUUEsQ0FBQztRQVBDLGdFQUFzQixHQUF0QixVQUNJLFlBQTBCLEVBQzFCLE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLElBQU0sR0FBRyxHQUFHLDRCQUFpQixDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwRSxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUNILHNDQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFSWSwwRUFBK0I7SUFVNUM7O09BRUc7SUFDSCxTQUFnQixrQkFBa0IsQ0FDOUIsT0FBNEQ7UUFDOUQsSUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDMUMsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE1BQU0sSUFBSSxxQ0FBZ0IsQ0FDdEIsUUFBUSxDQUFDLFVBQVUsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO1NBQ2hGO1FBRUQsSUFBTSxJQUFJLEdBQXlCO1lBQ2pDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLG9CQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLFlBQVksRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFO1lBQ2xDLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsd0JBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELDBDQUErQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQTBCO1NBQzlFLENBQUM7UUFFRixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyx3QkFBaUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7U0FDakU7UUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ25EO1FBQ0QsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsd0JBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsd0JBQWlCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQ2pFO1FBRUQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxvQkFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUE5QixDQUE4QixDQUFDLENBQUM7U0FDakY7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFyQ0QsZ0RBcUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NvbXBpbGVJbmplY3RhYmxlLCBDb25zdGFudFBvb2wsIGNyZWF0ZU1heUJlRm9yd2FyZFJlZkV4cHJlc3Npb24sIEZvcndhcmRSZWZIYW5kbGluZywgUjNEZWNsYXJlSW5qZWN0YWJsZU1ldGFkYXRhLCBSM0luamVjdGFibGVNZXRhZGF0YSwgUjNQYXJ0aWFsRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcblxuaW1wb3J0IHtBc3RPYmplY3R9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuXG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtleHRyYWN0Rm9yd2FyZFJlZiwgZ2V0RGVwZW5kZW5jeSwgd3JhcFJlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVJbmplY3RhYmxlKClgIGNhbGwgZXhwcmVzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsSW5qZWN0YWJsZUxpbmtlclZlcnNpb24xPFRFeHByZXNzaW9uPiBpbXBsZW1lbnRzIFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+IHtcbiAgbGlua1BhcnRpYWxEZWNsYXJhdGlvbihcbiAgICAgIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLFxuICAgICAgbWV0YU9iajogQXN0T2JqZWN0PFIzUGFydGlhbERlY2xhcmF0aW9uLCBURXhwcmVzc2lvbj4pOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG1ldGEgPSB0b1IzSW5qZWN0YWJsZU1ldGEobWV0YU9iaik7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZUluamVjdGFibGUobWV0YSwgLyogcmVzb2x2ZUZvcndhcmRSZWZzICovIGZhbHNlKTtcbiAgICByZXR1cm4gZGVmLmV4cHJlc3Npb247XG4gIH1cbn1cblxuLyoqXG4gKiBEZXJpdmVzIHRoZSBgUjNJbmplY3RhYmxlTWV0YWRhdGFgIHN0cnVjdHVyZSBmcm9tIHRoZSBBU1Qgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SM0luamVjdGFibGVNZXRhPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlSW5qZWN0YWJsZU1ldGFkYXRhLCBURXhwcmVzc2lvbj4pOiBSM0luamVjdGFibGVNZXRhZGF0YSB7XG4gIGNvbnN0IHR5cGVFeHByID0gbWV0YU9iai5nZXRWYWx1ZSgndHlwZScpO1xuICBjb25zdCB0eXBlTmFtZSA9IHR5cGVFeHByLmdldFN5bWJvbE5hbWUoKTtcbiAgaWYgKHR5cGVOYW1lID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsTGlua2VyRXJyb3IoXG4gICAgICAgIHR5cGVFeHByLmV4cHJlc3Npb24sICdVbnN1cHBvcnRlZCB0eXBlLCBpdHMgbmFtZSBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCcpO1xuICB9XG5cbiAgY29uc3QgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGEgPSB7XG4gICAgbmFtZTogdHlwZU5hbWUsXG4gICAgdHlwZTogd3JhcFJlZmVyZW5jZSh0eXBlRXhwci5nZXRPcGFxdWUoKSksXG4gICAgaW50ZXJuYWxUeXBlOiB0eXBlRXhwci5nZXRPcGFxdWUoKSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogMCxcbiAgICBwcm92aWRlZEluOiBtZXRhT2JqLmhhcygncHJvdmlkZWRJbicpID9cbiAgICAgICAgZXh0cmFjdEZvcndhcmRSZWYobWV0YU9iai5nZXRWYWx1ZSgncHJvdmlkZWRJbicpKSA6XG4gICAgICAgIGNyZWF0ZU1heUJlRm9yd2FyZFJlZkV4cHJlc3Npb24oby5saXRlcmFsKG51bGwpLCBGb3J3YXJkUmVmSGFuZGxpbmcuTm9uZSksXG4gIH07XG5cbiAgaWYgKG1ldGFPYmouaGFzKCd1c2VDbGFzcycpKSB7XG4gICAgbWV0YS51c2VDbGFzcyA9IGV4dHJhY3RGb3J3YXJkUmVmKG1ldGFPYmouZ2V0VmFsdWUoJ3VzZUNsYXNzJykpO1xuICB9XG4gIGlmIChtZXRhT2JqLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgbWV0YS51c2VGYWN0b3J5ID0gbWV0YU9iai5nZXRPcGFxdWUoJ3VzZUZhY3RvcnknKTtcbiAgfVxuICBpZiAobWV0YU9iai5oYXMoJ3VzZUV4aXN0aW5nJykpIHtcbiAgICBtZXRhLnVzZUV4aXN0aW5nID0gZXh0cmFjdEZvcndhcmRSZWYobWV0YU9iai5nZXRWYWx1ZSgndXNlRXhpc3RpbmcnKSk7XG4gIH1cbiAgaWYgKG1ldGFPYmouaGFzKCd1c2VWYWx1ZScpKSB7XG4gICAgbWV0YS51c2VWYWx1ZSA9IGV4dHJhY3RGb3J3YXJkUmVmKG1ldGFPYmouZ2V0VmFsdWUoJ3VzZVZhbHVlJykpO1xuICB9XG5cbiAgaWYgKG1ldGFPYmouaGFzKCdkZXBzJykpIHtcbiAgICBtZXRhLmRlcHMgPSBtZXRhT2JqLmdldEFycmF5KCdkZXBzJykubWFwKGRlcCA9PiBnZXREZXBlbmRlbmN5KGRlcC5nZXRPYmplY3QoKSkpO1xuICB9XG5cbiAgcmV0dXJuIG1ldGE7XG59XG4iXX0=