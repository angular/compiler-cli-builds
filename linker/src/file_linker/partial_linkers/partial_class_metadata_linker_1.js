(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/partial_class_metadata_linker_1", ["require", "exports", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toR3ClassMetadata = exports.PartialClassMetadataLinkerVersion1 = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    /**
     * A `PartialLinker` that is designed to process `ɵɵngDeclareClassMetadata()` call expressions.
     */
    var PartialClassMetadataLinkerVersion1 = /** @class */ (function () {
        function PartialClassMetadataLinkerVersion1() {
        }
        PartialClassMetadataLinkerVersion1.prototype.linkPartialDeclaration = function (constantPool, metaObj) {
            var meta = toR3ClassMetadata(metaObj);
            return (0, compiler_1.compileClassMetadata)(meta);
        };
        return PartialClassMetadataLinkerVersion1;
    }());
    exports.PartialClassMetadataLinkerVersion1 = PartialClassMetadataLinkerVersion1;
    /**
     * Derives the `R3ClassMetadata` structure from the AST object.
     */
    function toR3ClassMetadata(metaObj) {
        return {
            type: metaObj.getOpaque('type'),
            decorators: metaObj.getOpaque('decorators'),
            ctorParameters: metaObj.has('ctorParameters') ? metaObj.getOpaque('ctorParameters') : null,
            propDecorators: metaObj.has('propDecorators') ? metaObj.getOpaque('propDecorators') : null,
        };
    }
    exports.toR3ClassMetadata = toR3ClassMetadata;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbF9jbGFzc19tZXRhZGF0YV9saW5rZXJfMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy9wYXJ0aWFsX2NsYXNzX21ldGFkYXRhX2xpbmtlcl8xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFvSTtJQU9wSTs7T0FFRztJQUNIO1FBQUE7UUFPQSxDQUFDO1FBTkMsbUVBQXNCLEdBQXRCLFVBQ0ksWUFBMEIsRUFDMUIsT0FBcUQ7WUFDdkQsSUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsT0FBTyxJQUFBLCtCQUFvQixFQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDSCx5Q0FBQztJQUFELENBQUMsQUFQRCxJQU9DO0lBUFksZ0ZBQWtDO0lBUy9DOztPQUVHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLE9BQXVEO1FBQ3pELE9BQU87WUFDTCxJQUFJLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDL0IsVUFBVSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDO1lBQzNDLGNBQWMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUMxRixjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7U0FDM0YsQ0FBQztJQUNKLENBQUM7SUFSRCw4Q0FRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjb21waWxlQ2xhc3NNZXRhZGF0YSwgQ29uc3RhbnRQb29sLCBSM0NsYXNzTWV0YWRhdGEsIFIzRGVjbGFyZUNsYXNzTWV0YWRhdGEsIFIzUGFydGlhbERlY2xhcmF0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5cbmltcG9ydCB7QXN0T2JqZWN0fSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcblxuaW1wb3J0IHtQYXJ0aWFsTGlua2VyfSBmcm9tICcuL3BhcnRpYWxfbGlua2VyJztcblxuLyoqXG4gKiBBIGBQYXJ0aWFsTGlua2VyYCB0aGF0IGlzIGRlc2lnbmVkIHRvIHByb2Nlc3MgYMm1ybVuZ0RlY2xhcmVDbGFzc01ldGFkYXRhKClgIGNhbGwgZXhwcmVzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsQ2xhc3NNZXRhZGF0YUxpbmtlclZlcnNpb24xPFRFeHByZXNzaW9uPiBpbXBsZW1lbnRzIFBhcnRpYWxMaW5rZXI8VEV4cHJlc3Npb24+IHtcbiAgbGlua1BhcnRpYWxEZWNsYXJhdGlvbihcbiAgICAgIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLFxuICAgICAgbWV0YU9iajogQXN0T2JqZWN0PFIzUGFydGlhbERlY2xhcmF0aW9uLCBURXhwcmVzc2lvbj4pOiBvLkV4cHJlc3Npb24ge1xuICAgIGNvbnN0IG1ldGEgPSB0b1IzQ2xhc3NNZXRhZGF0YShtZXRhT2JqKTtcbiAgICByZXR1cm4gY29tcGlsZUNsYXNzTWV0YWRhdGEobWV0YSk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXJpdmVzIHRoZSBgUjNDbGFzc01ldGFkYXRhYCBzdHJ1Y3R1cmUgZnJvbSB0aGUgQVNUIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvUjNDbGFzc01ldGFkYXRhPFRFeHByZXNzaW9uPihcbiAgICBtZXRhT2JqOiBBc3RPYmplY3Q8UjNEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgVEV4cHJlc3Npb24+KTogUjNDbGFzc01ldGFkYXRhIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBtZXRhT2JqLmdldE9wYXF1ZSgndHlwZScpLFxuICAgIGRlY29yYXRvcnM6IG1ldGFPYmouZ2V0T3BhcXVlKCdkZWNvcmF0b3JzJyksXG4gICAgY3RvclBhcmFtZXRlcnM6IG1ldGFPYmouaGFzKCdjdG9yUGFyYW1ldGVycycpID8gbWV0YU9iai5nZXRPcGFxdWUoJ2N0b3JQYXJhbWV0ZXJzJykgOiBudWxsLFxuICAgIHByb3BEZWNvcmF0b3JzOiBtZXRhT2JqLmhhcygncHJvcERlY29yYXRvcnMnKSA/IG1ldGFPYmouZ2V0T3BhcXVlKCdwcm9wRGVjb3JhdG9ycycpIDogbnVsbCxcbiAgfTtcbn1cbiJdfQ==