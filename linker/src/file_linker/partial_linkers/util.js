(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/src/file_linker/partial_linkers/util", ["require", "exports", "@angular/compiler-cli/linker/src/fatal_linker_error"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseEnum = exports.wrapReference = void 0;
    var fatal_linker_error_1 = require("@angular/compiler-cli/linker/src/fatal_linker_error");
    function wrapReference(wrapped) {
        return { value: wrapped, type: wrapped };
    }
    exports.wrapReference = wrapReference;
    /**
     * Parses the value of an enum from the AST value's symbol name.
     */
    function parseEnum(value, Enum) {
        var symbolName = value.getSymbolName();
        if (symbolName === null) {
            throw new fatal_linker_error_1.FatalLinkerError(value.expression, 'Expected value to have a symbol name');
        }
        var enumValue = Enum[symbolName];
        if (enumValue === undefined) {
            throw new fatal_linker_error_1.FatalLinkerError(value.expression, "Unsupported enum value for " + Enum);
        }
        return enumValue;
    }
    exports.parseEnum = parseEnum;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9saW5rZXIvc3JjL2ZpbGVfbGlua2VyL3BhcnRpYWxfbGlua2Vycy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVVBLDBGQUEwRDtJQUUxRCxTQUFnQixhQUFhLENBQWMsT0FBdUM7UUFDaEYsT0FBTyxFQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO0lBQ3pDLENBQUM7SUFGRCxzQ0FFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsU0FBUyxDQUNyQixLQUFxQyxFQUFFLElBQVc7UUFDcEQsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pDLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtZQUN2QixNQUFNLElBQUkscUNBQWdCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1NBQ3RGO1FBQ0QsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQStCLENBQUMsQ0FBQztRQUN4RCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7WUFDM0IsTUFBTSxJQUFJLHFDQUFnQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsZ0NBQThCLElBQU0sQ0FBQyxDQUFDO1NBQ3BGO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQVhELDhCQVdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1IzUmVmZXJlbmNlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBvIGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9vdXRwdXQvb3V0cHV0X2FzdCc7XG5pbXBvcnQge0FzdFZhbHVlfSBmcm9tICcuLi8uLi9hc3QvYXN0X3ZhbHVlJztcbmltcG9ydCB7RmF0YWxMaW5rZXJFcnJvcn0gZnJvbSAnLi4vLi4vZmF0YWxfbGlua2VyX2Vycm9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBSZWZlcmVuY2U8VEV4cHJlc3Npb24+KHdyYXBwZWQ6IG8uV3JhcHBlZE5vZGVFeHByPFRFeHByZXNzaW9uPik6IFIzUmVmZXJlbmNlIHtcbiAgcmV0dXJuIHt2YWx1ZTogd3JhcHBlZCwgdHlwZTogd3JhcHBlZH07XG59XG5cbi8qKlxuICogUGFyc2VzIHRoZSB2YWx1ZSBvZiBhbiBlbnVtIGZyb20gdGhlIEFTVCB2YWx1ZSdzIHN5bWJvbCBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFbnVtPFRFeHByZXNzaW9uLCBURW51bT4oXG4gICAgdmFsdWU6IEFzdFZhbHVlPHVua25vd24sIFRFeHByZXNzaW9uPiwgRW51bTogVEVudW0pOiBURW51bVtrZXlvZiBURW51bV0ge1xuICBjb25zdCBzeW1ib2xOYW1lID0gdmFsdWUuZ2V0U3ltYm9sTmFtZSgpO1xuICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbExpbmtlckVycm9yKHZhbHVlLmV4cHJlc3Npb24sICdFeHBlY3RlZCB2YWx1ZSB0byBoYXZlIGEgc3ltYm9sIG5hbWUnKTtcbiAgfVxuICBjb25zdCBlbnVtVmFsdWUgPSBFbnVtW3N5bWJvbE5hbWUgYXMga2V5b2YgdHlwZW9mIEVudW1dO1xuICBpZiAoZW51bVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxMaW5rZXJFcnJvcih2YWx1ZS5leHByZXNzaW9uLCBgVW5zdXBwb3J0ZWQgZW51bSB2YWx1ZSBmb3IgJHtFbnVtfWApO1xuICB9XG4gIHJldHVybiBlbnVtVmFsdWU7XG59XG4iXX0=