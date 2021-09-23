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
            var def = (0, compiler_1.compileInjectable)(meta, /* resolveForwardRefs */ false);
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
            type: (0, util_1.wrapReference)(typeExpr.getOpaque()),
            internalType: typeExpr.getOpaque(),
            typeArgumentCount: 0,
            providedIn: metaObj.has('providedIn') ? (0, util_1.extractForwardRef)(metaObj.getValue('providedIn')) :
                (0, compiler_1.createR3ProviderExpression)(o.literal(null), false),
        };
        if (metaObj.has('useClass')) {
            meta.useClass = (0, util_1.extractForwardRef)(metaObj.getValue('useClass'));
        }
        if (metaObj.has('useFactory')) {
            meta.useFactory = metaObj.getOpaque('useFactory');
        }
        if (metaObj.has('useExisting')) {
            meta.useExisting = (0, util_1.extractForwardRef)(metaObj.getValue('useExisting'));
        }
        if (metaObj.has('useValue')) {
            meta.useValue = (0, util_1.extractForwardRef)(metaObj.getValue('useValue'));
        }
        if (metaObj.has('deps')) {
            meta.deps = metaObj.getArray('deps').map(function (dep) { return (0, util_1.getDependency)(dep.getObject()); });
        }
        return meta;
    }
    exports.toR3InjectableMeta = toR3InjectableMeta;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9pbmplY3RhYmxlX2xpbmtlcl8xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvcGFydGlhbF9saW5rZXJzL3BhcnRpYWxfaW5qZWN0YWJsZV9saW5rZXJfMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBdUs7SUFDdkssMkRBQTZEO0lBRzdELDBGQUEwRDtJQUcxRCwwRkFBdUU7SUFFdkU7O09BRUc7SUFDSDtRQUFBO1FBUUEsQ0FBQztRQVBDLGdFQUFzQixHQUF0QixVQUNJLFlBQTBCLEVBQzFCLE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLElBQU0sR0FBRyxHQUFHLElBQUEsNEJBQWlCLEVBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQztRQUN4QixDQUFDO1FBQ0gsc0NBQUM7SUFBRCxDQUFDLEFBUkQsSUFRQztJQVJZLDBFQUErQjtJQVU1Qzs7T0FFRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixPQUE0RDtRQUM5RCxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFDQUFnQixDQUN0QixRQUFRLENBQUMsVUFBVSxFQUFFLG9EQUFvRCxDQUFDLENBQUM7U0FDaEY7UUFFRCxJQUFNLElBQUksR0FBeUI7WUFDakMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsSUFBQSxvQkFBYSxFQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRTtZQUNsQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLHdCQUFpQixFQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxJQUFBLHFDQUEwQixFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDO1NBQzNGLENBQUM7UUFFRixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFBLHdCQUFpQixFQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztTQUNqRTtRQUNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDbkQ7UUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFBLHdCQUFpQixFQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztTQUN2RTtRQUNELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUEsd0JBQWlCLEVBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQ2pFO1FBRUQsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxJQUFBLG9CQUFhLEVBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQTlCLENBQThCLENBQUMsQ0FBQztTQUNqRjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQXBDRCxnREFvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tcGlsZUluamVjdGFibGUsIENvbnN0YW50UG9vbCwgY3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24sIFIzRGVjbGFyZUluamVjdGFibGVNZXRhZGF0YSwgUjNJbmplY3RhYmxlTWV0YWRhdGEsIFIzUGFydGlhbERlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QXN0T2JqZWN0fSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcbmltcG9ydCB7ZXh0cmFjdEZvcndhcmRSZWYsIGdldERlcGVuZGVuY3ksIHdyYXBSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQSBgUGFydGlhbExpbmtlcmAgdGhhdCBpcyBkZXNpZ25lZCB0byBwcm9jZXNzIGDJtcm1bmdEZWNsYXJlSW5qZWN0YWJsZSgpYCBjYWxsIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbEluamVjdGFibGVMaW5rZXJWZXJzaW9uMTxURXhwcmVzc2lvbj4gaW1wbGVtZW50cyBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBtZXRhID0gdG9SM0luamVjdGFibGVNZXRhKG1ldGFPYmopO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVJbmplY3RhYmxlKG1ldGEsIC8qIHJlc29sdmVGb3J3YXJkUmVmcyAqLyBmYWxzZSk7XG4gICAgcmV0dXJuIGRlZi5leHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogRGVyaXZlcyB0aGUgYFIzSW5qZWN0YWJsZU1ldGFkYXRhYCBzdHJ1Y3R1cmUgZnJvbSB0aGUgQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUjNJbmplY3RhYmxlTWV0YTxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUluamVjdGFibGVNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogUjNJbmplY3RhYmxlTWV0YWRhdGEge1xuICBjb25zdCB0eXBlRXhwciA9IG1ldGFPYmouZ2V0VmFsdWUoJ3R5cGUnKTtcbiAgY29uc3QgdHlwZU5hbWUgPSB0eXBlRXhwci5nZXRTeW1ib2xOYW1lKCk7XG4gIGlmICh0eXBlTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB0eXBlRXhwci5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgdHlwZSwgaXRzIG5hbWUgY291bGQgbm90IGJlIGRldGVybWluZWQnKTtcbiAgfVxuXG4gIGNvbnN0IG1ldGE6IFIzSW5qZWN0YWJsZU1ldGFkYXRhID0ge1xuICAgIG5hbWU6IHR5cGVOYW1lLFxuICAgIHR5cGU6IHdyYXBSZWZlcmVuY2UodHlwZUV4cHIuZ2V0T3BhcXVlKCkpLFxuICAgIGludGVybmFsVHlwZTogdHlwZUV4cHIuZ2V0T3BhcXVlKCksXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IDAsXG4gICAgcHJvdmlkZWRJbjogbWV0YU9iai5oYXMoJ3Byb3ZpZGVkSW4nKSA/IGV4dHJhY3RGb3J3YXJkUmVmKG1ldGFPYmouZ2V0VmFsdWUoJ3Byb3ZpZGVkSW4nKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVSM1Byb3ZpZGVyRXhwcmVzc2lvbihvLmxpdGVyYWwobnVsbCksIGZhbHNlKSxcbiAgfTtcblxuICBpZiAobWV0YU9iai5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICBtZXRhLnVzZUNsYXNzID0gZXh0cmFjdEZvcndhcmRSZWYobWV0YU9iai5nZXRWYWx1ZSgndXNlQ2xhc3MnKSk7XG4gIH1cbiAgaWYgKG1ldGFPYmouaGFzKCd1c2VGYWN0b3J5JykpIHtcbiAgICBtZXRhLnVzZUZhY3RvcnkgPSBtZXRhT2JqLmdldE9wYXF1ZSgndXNlRmFjdG9yeScpO1xuICB9XG4gIGlmIChtZXRhT2JqLmhhcygndXNlRXhpc3RpbmcnKSkge1xuICAgIG1ldGEudXNlRXhpc3RpbmcgPSBleHRyYWN0Rm9yd2FyZFJlZihtZXRhT2JqLmdldFZhbHVlKCd1c2VFeGlzdGluZycpKTtcbiAgfVxuICBpZiAobWV0YU9iai5oYXMoJ3VzZVZhbHVlJykpIHtcbiAgICBtZXRhLnVzZVZhbHVlID0gZXh0cmFjdEZvcndhcmRSZWYobWV0YU9iai5nZXRWYWx1ZSgndXNlVmFsdWUnKSk7XG4gIH1cblxuICBpZiAobWV0YU9iai5oYXMoJ2RlcHMnKSkge1xuICAgIG1ldGEuZGVwcyA9IG1ldGFPYmouZ2V0QXJyYXkoJ2RlcHMnKS5tYXAoZGVwID0+IGdldERlcGVuZGVuY3koZGVwLmdldE9iamVjdCgpKSk7XG4gIH1cblxuICByZXR1cm4gbWV0YTtcbn1cbiJdfQ==