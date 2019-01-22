/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A value member of an enumeration.
     *
     * Contains a `Reference` to the enumeration itself, and the name of the referenced member.
     */
    var EnumValue = /** @class */ (function () {
        function EnumValue(enumRef, name, resolved) {
            this.enumRef = enumRef;
            this.name = name;
            this.resolved = resolved;
        }
        return EnumValue;
    }());
    exports.EnumValue = EnumValue;
    /**
     * An implementation of a builtin function, such as `Array.prototype.slice`.
     */
    var BuiltinFn = /** @class */ (function () {
        function BuiltinFn() {
        }
        return BuiltinFn;
    }());
    exports.BuiltinFn = BuiltinFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvcmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBbUNIOzs7O09BSUc7SUFDSDtRQUNFLG1CQUNhLE9BQXNDLEVBQVcsSUFBWSxFQUM3RCxRQUF1QjtZQUR2QixZQUFPLEdBQVAsT0FBTyxDQUErQjtZQUFXLFNBQUksR0FBSixJQUFJLENBQVE7WUFDN0QsYUFBUSxHQUFSLFFBQVEsQ0FBZTtRQUFHLENBQUM7UUFDMUMsZ0JBQUM7SUFBRCxDQUFDLEFBSkQsSUFJQztJQUpZLDhCQUFTO0lBTXRCOztPQUVHO0lBQ0g7UUFBQTtRQUE4RixDQUFDO1FBQUQsZ0JBQUM7SUFBRCxDQUFDLEFBQS9GLElBQStGO0lBQXpFLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcblxuXG4vKipcbiAqIEEgdmFsdWUgcmVzdWx0aW5nIGZyb20gc3RhdGljIHJlc29sdXRpb24uXG4gKlxuICogVGhpcyBjb3VsZCBiZSBhIHByaW1pdGl2ZSwgY29sbGVjdGlvbiB0eXBlLCByZWZlcmVuY2UgdG8gYSBgdHMuTm9kZWAgdGhhdCBkZWNsYXJlcyBhXG4gKiBub24tcHJpbWl0aXZlIHZhbHVlLCBvciBhIHNwZWNpYWwgYER5bmFtaWNWYWx1ZWAgdHlwZSB3aGljaCBpbmRpY2F0ZXMgdGhlIHZhbHVlIHdhcyBub3RcbiAqIGF2YWlsYWJsZSBzdGF0aWNhbGx5LlxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlZFZhbHVlID0gbnVtYmVyIHwgYm9vbGVhbiB8IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgfCBSZWZlcmVuY2UgfCBFbnVtVmFsdWUgfFxuICAgIFJlc29sdmVkVmFsdWVBcnJheSB8IFJlc29sdmVkVmFsdWVNYXAgfCBCdWlsdGluRm4gfCBEeW5hbWljVmFsdWU8e30+O1xuXG4vKipcbiAqIEFuIGFycmF5IG9mIGBSZXNvbHZlZFZhbHVlYHMuXG4gKlxuICogVGhpcyBpcyBhIHJlaWZpZWQgdHlwZSB0byBhbGxvdyB0aGUgY2lyY3VsYXIgcmVmZXJlbmNlIG9mIGBSZXNvbHZlZFZhbHVlYCAtPiBgUmVzb2x2ZWRWYWx1ZUFycmF5YFxuICogLT5cbiAqIGBSZXNvbHZlZFZhbHVlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFZhbHVlQXJyYXkgZXh0ZW5kcyBBcnJheTxSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgbWFwIG9mIHN0cmluZ3MgdG8gYFJlc29sdmVkVmFsdWVgcy5cbiAqXG4gKiBUaGlzIGlzIGEgcmVpZmllZCB0eXBlIHRvIGFsbG93IHRoZSBjaXJjdWxhciByZWZlcmVuY2Ugb2YgYFJlc29sdmVkVmFsdWVgIC0+IGBSZXNvbHZlZFZhbHVlTWFwYCAtPlxuICogYFJlc29sdmVkVmFsdWVgLlxuICovIGV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRWYWx1ZU1hcCBleHRlbmRzIE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+IHt9XG5cbi8qKlxuICogQSB2YWx1ZSBtZW1iZXIgb2YgYW4gZW51bWVyYXRpb24uXG4gKlxuICogQ29udGFpbnMgYSBgUmVmZXJlbmNlYCB0byB0aGUgZW51bWVyYXRpb24gaXRzZWxmLCBhbmQgdGhlIG5hbWUgb2YgdGhlIHJlZmVyZW5jZWQgbWVtYmVyLlxuICovXG5leHBvcnQgY2xhc3MgRW51bVZhbHVlIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBlbnVtUmVmOiBSZWZlcmVuY2U8dHMuRW51bURlY2xhcmF0aW9uPiwgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgcmVhZG9ubHkgcmVzb2x2ZWQ6IFJlc29sdmVkVmFsdWUpIHt9XG59XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYSBidWlsdGluIGZ1bmN0aW9uLCBzdWNoIGFzIGBBcnJheS5wcm90b3R5cGUuc2xpY2VgLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQnVpbHRpbkZuIHsgYWJzdHJhY3QgZXZhbHVhdGUoYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5KTogUmVzb2x2ZWRWYWx1ZTsgfVxuIl19