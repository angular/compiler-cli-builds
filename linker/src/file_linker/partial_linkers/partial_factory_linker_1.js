(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_factory_linker_1", ["require", "exports", "@angular/compiler", "@angular/compiler/src/output/output_ast", "@angular/compiler-cli/linker/src/fatal_linker_error", "@angular/compiler-cli/linker/src/file_linker/partial_linkers/util"], factory);
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
    var o = require("@angular/compiler/src/output/output_ast");
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
            var def = compiler_1.compileFactoryFunction(meta);
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
            type: util_1.wrapReference(typeExpr.getOpaque()),
            internalType: metaObj.getOpaque('type'),
            typeArgumentCount: 0,
            target: util_1.parseEnum(metaObj.getValue('target'), compiler_1.FactoryTarget),
            deps: getDeps(metaObj, 'deps'),
        };
    }
    exports.toR3FactoryMeta = toR3FactoryMeta;
    function getDeps(metaObj, propName) {
        if (!metaObj.has(propName)) {
            return null;
        }
        var deps = metaObj.getValue(propName);
        if (deps.isArray()) {
            return deps.getArray().map(function (dep) { return getDep(dep.getObject()); });
        }
        if (deps.isString()) {
            return 'invalid';
        }
        return null;
    }
    function getDep(depObj) {
        var isAttribute = depObj.has('attribute') && depObj.getBoolean('attribute');
        var token = depObj.getOpaque('token');
        // Normally `attribute` is a string literal and so its `attributeNameType` is the same string
        // literal. If the `attribute` is some other expression, the `attributeNameType` would be the
        // `unknown` type. It is not possible to generate this when linking, since it only deals with JS
        // and not typings. When linking the existence of the `attributeNameType` only acts as a marker to
        // change the injection instruction that is generated, so we just pass the literal string
        // `"unknown"`.
        var attributeNameType = isAttribute ? o.literal('unknown') : null;
        var dep = {
            token: token,
            attributeNameType: attributeNameType,
            host: depObj.has('host') && depObj.getBoolean('host'),
            optional: depObj.has('optional') && depObj.getBoolean('optional'),
            self: depObj.has('self') && depObj.getBoolean('self'),
            skipSelf: depObj.has('skipSelf') && depObj.getBoolean('skipSelf'),
        };
        return dep;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9mYWN0b3J5X2xpbmtlcl8xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9zcmMvZmlsZV9saW5rZXIvcGFydGlhbF9saW5rZXJzL3BhcnRpYWxfZmFjdG9yeV9saW5rZXJfMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBNE07SUFDNU0sMkRBQTZEO0lBRzdELDBGQUEwRDtJQUcxRCwwRkFBZ0Q7SUFFaEQ7O09BRUc7SUFDSDtRQUFBO1FBUUEsQ0FBQztRQVBDLDZEQUFzQixHQUF0QixVQUNJLFlBQTBCLEVBQzFCLE9BQXFEO1lBQ3ZELElBQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxJQUFNLEdBQUcsR0FBRyxpQ0FBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxPQUFPLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDeEIsQ0FBQztRQUNILG1DQUFDO0lBQUQsQ0FBQyxBQVJELElBUUM7SUFSWSxvRUFBNEI7SUFVekM7O09BRUc7SUFDSCxTQUFnQixlQUFlLENBQzNCLE9BQXlEO1FBQzNELElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUkscUNBQWdCLENBQ3RCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztTQUNoRjtRQUVELE9BQU87WUFDTCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxvQkFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxZQUFZLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDdkMsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixNQUFNLEVBQUUsZ0JBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLHdCQUFhLENBQUM7WUFDNUQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBakJELDBDQWlCQztJQUVELFNBQVMsT0FBTyxDQUNaLE9BQXlELEVBQ3pELFFBQXdDO1FBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBdkIsQ0FBdUIsQ0FBQyxDQUFDO1NBQzVEO1FBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDbkIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLE1BQU0sQ0FBYyxNQUEyRDtRQUV0RixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUUsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4Qyw2RkFBNkY7UUFDN0YsNkZBQTZGO1FBQzdGLGdHQUFnRztRQUNoRyxrR0FBa0c7UUFDbEcseUZBQXlGO1FBQ3pGLGVBQWU7UUFDZixJQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BFLElBQU0sR0FBRyxHQUF5QjtZQUNoQyxLQUFLLE9BQUE7WUFDTCxpQkFBaUIsbUJBQUE7WUFDakIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDckQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7WUFDakUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDckQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7U0FDbEUsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjb21waWxlRmFjdG9yeUZ1bmN0aW9uLCBDb25zdGFudFBvb2wsIEZhY3RvcnlUYXJnZXQsIFIzRGVjbGFyZURlcGVuZGVuY3lNZXRhZGF0YSwgUjNEZWNsYXJlRmFjdG9yeU1ldGFkYXRhLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNGYWN0b3J5TWV0YWRhdGEsIFIzUGFydGlhbERlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QXN0T2JqZWN0fSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcbmltcG9ydCB7cGFyc2VFbnVtLCB3cmFwUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgYFBhcnRpYWxMaW5rZXJgIHRoYXQgaXMgZGVzaWduZWQgdG8gcHJvY2VzcyBgybXJtW5nRGVjbGFyZUZhY3RvcnkoKWAgY2FsbCBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhcnRpYWxGYWN0b3J5TGlua2VyVmVyc2lvbjE8VEV4cHJlc3Npb24+IGltcGxlbWVudHMgUGFydGlhbExpbmtlcjxURXhwcmVzc2lvbj4ge1xuICBsaW5rUGFydGlhbERlY2xhcmF0aW9uKFxuICAgICAgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsXG4gICAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNQYXJ0aWFsRGVjbGFyYXRpb24sIFRFeHByZXNzaW9uPik6IG8uRXhwcmVzc2lvbiB7XG4gICAgY29uc3QgbWV0YSA9IHRvUjNGYWN0b3J5TWV0YShtZXRhT2JqKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRmFjdG9yeUZ1bmN0aW9uKG1ldGEpO1xuICAgIHJldHVybiBkZWYuZXhwcmVzc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIERlcml2ZXMgdGhlIGBSM0ZhY3RvcnlNZXRhZGF0YWAgc3RydWN0dXJlIGZyb20gdGhlIEFTVCBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1IzRmFjdG9yeU1ldGE8VEV4cHJlc3Npb24+KFxuICAgIG1ldGFPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVGYWN0b3J5TWV0YWRhdGEsIFRFeHByZXNzaW9uPik6IFIzRmFjdG9yeU1ldGFkYXRhIHtcbiAgY29uc3QgdHlwZUV4cHIgPSBtZXRhT2JqLmdldFZhbHVlKCd0eXBlJyk7XG4gIGNvbnN0IHR5cGVOYW1lID0gdHlwZUV4cHIuZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcihcbiAgICAgICAgdHlwZUV4cHIuZXhwcmVzc2lvbiwgJ1Vuc3VwcG9ydGVkIHR5cGUsIGl0cyBuYW1lIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6IHR5cGVOYW1lLFxuICAgIHR5cGU6IHdyYXBSZWZlcmVuY2UodHlwZUV4cHIuZ2V0T3BhcXVlKCkpLFxuICAgIGludGVybmFsVHlwZTogbWV0YU9iai5nZXRPcGFxdWUoJ3R5cGUnKSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogMCxcbiAgICB0YXJnZXQ6IHBhcnNlRW51bShtZXRhT2JqLmdldFZhbHVlKCd0YXJnZXQnKSwgRmFjdG9yeVRhcmdldCksXG4gICAgZGVwczogZ2V0RGVwcyhtZXRhT2JqLCAnZGVwcycpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXREZXBzPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlRmFjdG9yeU1ldGFkYXRhLCBURXhwcmVzc2lvbj4sXG4gICAgcHJvcE5hbWU6IGtleW9mIFIzRGVjbGFyZUZhY3RvcnlNZXRhZGF0YSk6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118bnVsbHwnaW52YWxpZCcge1xuICBpZiAoIW1ldGFPYmouaGFzKHByb3BOYW1lKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGRlcHMgPSBtZXRhT2JqLmdldFZhbHVlKHByb3BOYW1lKTtcbiAgaWYgKGRlcHMuaXNBcnJheSgpKSB7XG4gICAgcmV0dXJuIGRlcHMuZ2V0QXJyYXkoKS5tYXAoZGVwID0+IGdldERlcChkZXAuZ2V0T2JqZWN0KCkpKTtcbiAgfVxuICBpZiAoZGVwcy5pc1N0cmluZygpKSB7XG4gICAgcmV0dXJuICdpbnZhbGlkJztcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVwPFRFeHByZXNzaW9uPihkZXBPYmo6IEFzdE9iamVjdDxSM0RlY2xhcmVEZXBlbmRlbmN5TWV0YWRhdGEsIFRFeHByZXNzaW9uPik6XG4gICAgUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBpc0F0dHJpYnV0ZSA9IGRlcE9iai5oYXMoJ2F0dHJpYnV0ZScpICYmIGRlcE9iai5nZXRCb29sZWFuKCdhdHRyaWJ1dGUnKTtcbiAgY29uc3QgdG9rZW4gPSBkZXBPYmouZ2V0T3BhcXVlKCd0b2tlbicpO1xuICAvLyBOb3JtYWxseSBgYXR0cmlidXRlYCBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCBzbyBpdHMgYGF0dHJpYnV0ZU5hbWVUeXBlYCBpcyB0aGUgc2FtZSBzdHJpbmdcbiAgLy8gbGl0ZXJhbC4gSWYgdGhlIGBhdHRyaWJ1dGVgIGlzIHNvbWUgb3RoZXIgZXhwcmVzc2lvbiwgdGhlIGBhdHRyaWJ1dGVOYW1lVHlwZWAgd291bGQgYmUgdGhlXG4gIC8vIGB1bmtub3duYCB0eXBlLiBJdCBpcyBub3QgcG9zc2libGUgdG8gZ2VuZXJhdGUgdGhpcyB3aGVuIGxpbmtpbmcsIHNpbmNlIGl0IG9ubHkgZGVhbHMgd2l0aCBKU1xuICAvLyBhbmQgbm90IHR5cGluZ3MuIFdoZW4gbGlua2luZyB0aGUgZXhpc3RlbmNlIG9mIHRoZSBgYXR0cmlidXRlTmFtZVR5cGVgIG9ubHkgYWN0cyBhcyBhIG1hcmtlciB0b1xuICAvLyBjaGFuZ2UgdGhlIGluamVjdGlvbiBpbnN0cnVjdGlvbiB0aGF0IGlzIGdlbmVyYXRlZCwgc28gd2UganVzdCBwYXNzIHRoZSBsaXRlcmFsIHN0cmluZ1xuICAvLyBgXCJ1bmtub3duXCJgLlxuICBjb25zdCBhdHRyaWJ1dGVOYW1lVHlwZSA9IGlzQXR0cmlidXRlID8gby5saXRlcmFsKCd1bmtub3duJykgOiBudWxsO1xuICBjb25zdCBkZXA6IFIzRGVwZW5kZW5jeU1ldGFkYXRhID0ge1xuICAgIHRva2VuLFxuICAgIGF0dHJpYnV0ZU5hbWVUeXBlLFxuICAgIGhvc3Q6IGRlcE9iai5oYXMoJ2hvc3QnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignaG9zdCcpLFxuICAgIG9wdGlvbmFsOiBkZXBPYmouaGFzKCdvcHRpb25hbCcpICYmIGRlcE9iai5nZXRCb29sZWFuKCdvcHRpb25hbCcpLFxuICAgIHNlbGY6IGRlcE9iai5oYXMoJ3NlbGYnKSAmJiBkZXBPYmouZ2V0Qm9vbGVhbignc2VsZicpLFxuICAgIHNraXBTZWxmOiBkZXBPYmouaGFzKCdza2lwU2VsZicpICYmIGRlcE9iai5nZXRCb29sZWFuKCdza2lwU2VsZicpLFxuICB9O1xuICByZXR1cm4gZGVwO1xufVxuIl19