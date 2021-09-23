(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toR3FactoryMeta = exports.PartialFactoryLinkerVersion1 = void 0;
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
     * A `PartialLinker` that is designed to process `ɵɵngDeclareFactory()` call expressions.
     */
    var PartialFactoryLinkerVersion1 = /** @class */ (function () {
        function PartialFactoryLinkerVersion1() {
        }
        PartialFactoryLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = toR3FactoryMeta(metaObj);
            var def = (0, compiler_1.compileFactoryFunction)(meta);
            return def.expression;
        };
        return PartialFactoryLinkerVersion1;
    }());
    exports.PartialFactoryLinkerVersion1 = PartialFactoryLinkerVersion1;
    /**
     * Derives the `R3FactoryMetadata` structure from the AST object.
     */
    function toR3FactoryMeta(metaObj) {
        var typeExpr = metaObj.getValue('type');
        var typeName = typeExpr.getSymbolName();
        if (typeName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(typeExpr.expression, 'Unsupported type, its name could not be determined');
        }
        return {
            name: typeName,
            type: (0, util_1.wrapReference)(typeExpr.getOpaque()),
            internalType: metaObj.getOpaque('type'),
            typeArgumentCount: 0,
            target: (0, util_1.parseEnum)(metaObj.getValue('target'), compiler_1.FactoryTarget),
            deps: getDependencies(metaObj, 'deps'),
        };
    }
    exports.toR3FactoryMeta = toR3FactoryMeta;
    function getDependencies(metaObj, propName) {
        if (!metaObj.has(propName)) {
            return null;
        }
        var deps = metaObj.getValue(propName);
        if (deps.isArray()) {
            return deps.getArray().map(function (dep) { return (0, util_1.getDependency)(dep.getObject()); });
        }
        if (deps.isString()) {
            return 'invalid';
        }
        return null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9mYWN0b3J5X2xpbmtlcl8xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvcGFydGlhbF9saW5rZXJzL3BhcnRpYWxfZmFjdG9yeV9saW5rZXJfMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0s7SUFJL0ssMEZBQTBEO0lBRzFELDBGQUErRDtJQUUvRDs7T0FFRztJQUNIO1FBQUE7UUFRQSxDQUFDO1FBUEMsNkRBQXNCLEdBQXRCLFVBQ0ksWUFBMEIsRUFDMUIsT0FBcUQ7WUFDdkQsSUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLElBQU0sR0FBRyxHQUFHLElBQUEsaUNBQXNCLEVBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3hCLENBQUM7UUFDSCxtQ0FBQztJQUFELENBQUMsQUFSRCxJQVFDO0lBUlksb0VBQTRCO0lBVXpDOztPQUVHO0lBQ0gsU0FBZ0IsZUFBZSxDQUMzQixPQUF5RDtRQUMzRCxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxQyxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLHFDQUFnQixDQUN0QixRQUFRLENBQUMsVUFBVSxFQUFFLG9EQUFvRCxDQUFDLENBQUM7U0FDaEY7UUFFRCxPQUFPO1lBQ0wsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsSUFBQSxvQkFBYSxFQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxZQUFZLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDdkMsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixNQUFNLEVBQUUsSUFBQSxnQkFBUyxFQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsd0JBQWEsQ0FBQztZQUM1RCxJQUFJLEVBQUUsZUFBZSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDdkMsQ0FBQztJQUNKLENBQUM7SUFqQkQsMENBaUJDO0lBRUQsU0FBUyxlQUFlLENBQ3BCLE9BQXlELEVBQ3pELFFBQXdDO1FBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLElBQUEsb0JBQWEsRUFBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBOUIsQ0FBOEIsQ0FBQyxDQUFDO1NBQ25FO1FBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDbkIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y29tcGlsZUZhY3RvcnlGdW5jdGlvbiwgQ29uc3RhbnRQb29sLCBGYWN0b3J5VGFyZ2V0LCBSM0RlY2xhcmVGYWN0b3J5TWV0YWRhdGEsIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0ZhY3RvcnlNZXRhZGF0YSwgUjNQYXJ0aWFsRGVjbGFyYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIG8gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL291dHB1dC9vdXRwdXRfYXN0JztcblxuaW1wb3J0IHtBc3RPYmplY3R9IGZyb20gJy4uLy4uL2FzdC9hc3RfdmFsdWUnO1xuaW1wb3J0IHtGYXRhbExpbmtlckVycm9yfSBmcm9tICcuLi8uLi9mYXRhbF9saW5rZXJfZXJyb3InO1xuXG5pbXBvcnQge1BhcnRpYWxMaW5rZXJ9IGZyb20gJy4vcGFydGlhbF9saW5rZXInO1xuaW1wb3J0IHtnZXREZXBlbmRlbmN5LCBwYXJzZUVudW0sIHdyYXBSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQSBgUGFydGlhbExpbmtlcmAgdGhhdCBpcyBkZXNpZ25lZCB0byBwcm9jZXNzIGDJtcm1bmdEZWNsYXJlRmFjdG9yeSgpYCBjYWxsIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgUGFydGlhbEZhY3RvcnlMaW5rZXJWZXJzaW9uMTxURXhwcmVzc2lvbj4gaW1wbGVtZW50cyBQYXJ0aWFsTGlua2VyPFRFeHByZXNzaW9uPiB7XG4gIGxpbmtQYXJ0aWFsRGVjbGFyYXRpb24oXG4gICAgICBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCxcbiAgICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM1BhcnRpYWxEZWNsYXJhdGlvbiwgVEV4cHJlc3Npb24+KTogby5FeHByZXNzaW9uIHtcbiAgICBjb25zdCBtZXRhID0gdG9SM0ZhY3RvcnlNZXRhKG1ldGFPYmopO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVGYWN0b3J5RnVuY3Rpb24obWV0YSk7XG4gICAgcmV0dXJuIGRlZi5leHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogRGVyaXZlcyB0aGUgYFIzRmFjdG9yeU1ldGFkYXRhYCBzdHJ1Y3R1cmUgZnJvbSB0aGUgQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUjNGYWN0b3J5TWV0YTxURXhwcmVzc2lvbj4oXG4gICAgbWV0YU9iajogQXN0T2JqZWN0PFIzRGVjbGFyZUZhY3RvcnlNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogUjNGYWN0b3J5TWV0YWRhdGEge1xuICBjb25zdCB0eXBlRXhwciA9IG1ldGFPYmouZ2V0VmFsdWUoJ3R5cGUnKTtcbiAgY29uc3QgdHlwZU5hbWUgPSB0eXBlRXhwci5nZXRTeW1ib2xOYW1lKCk7XG4gIGlmICh0eXBlTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKFxuICAgICAgICB0eXBlRXhwci5leHByZXNzaW9uLCAnVW5zdXBwb3J0ZWQgdHlwZSwgaXRzIG5hbWUgY291bGQgbm90IGJlIGRldGVybWluZWQnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbmFtZTogdHlwZU5hbWUsXG4gICAgdHlwZTogd3JhcFJlZmVyZW5jZSh0eXBlRXhwci5nZXRPcGFxdWUoKSksXG4gICAgaW50ZXJuYWxUeXBlOiBtZXRhT2JqLmdldE9wYXF1ZSgndHlwZScpLFxuICAgIHR5cGVBcmd1bWVudENvdW50OiAwLFxuICAgIHRhcmdldDogcGFyc2VFbnVtKG1ldGFPYmouZ2V0VmFsdWUoJ3RhcmdldCcpLCBGYWN0b3J5VGFyZ2V0KSxcbiAgICBkZXBzOiBnZXREZXBlbmRlbmNpZXMobWV0YU9iaiwgJ2RlcHMnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jaWVzPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlRmFjdG9yeU1ldGFkYXRhLCBURXhwcmVzc2lvbj4sXG4gICAgcHJvcE5hbWU6IGtleW9mIFIzRGVjbGFyZUZhY3RvcnlNZXRhZGF0YSk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118bnVsbHwnaW52YWxpZCcge1xuICBpZiAoIW1ldGFPYmouaGFzKHByb3BOYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGRlcHMgPSBtZXRhT2JqLmdldFZhbHVlKHByb3BOYW1lKTtcbiAgaWYgKGRlcHMuaXNBcnJheSgpKSB7XG4gICAgcmV0dXJuIGRlcHMuZ2V0QXJyYXkoKS5tYXAoZGVwID0+IGdldERlcGVuZGVuY3koZGVwLmdldE9iamVjdCgpKSk7XG4gIH1cbiAgaWYgKGRlcHMuaXNTdHJpbmcoKSkge1xuICAgIHJldHVybiAnaW52YWxpZCc7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=