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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/host", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    exports.Decorator = {
        nodeForError: function (decorator) {
            if (decorator.node !== null) {
                return decorator.node;
            }
            else {
                // TODO(alxhub): we can't rely on narrowing until TS 3.6 is in g3.
                return decorator.synthesizedFor;
            }
        },
    };
    function isDecoratorIdentifier(exp) {
        return ts.isIdentifier(exp) ||
            ts.isPropertyAccessExpression(exp) && ts.isIdentifier(exp.expression);
    }
    exports.isDecoratorIdentifier = isDecoratorIdentifier;
    /**
     * An enumeration of possible kinds of class members.
     */
    var ClassMemberKind;
    (function (ClassMemberKind) {
        ClassMemberKind[ClassMemberKind["Constructor"] = 0] = "Constructor";
        ClassMemberKind[ClassMemberKind["Getter"] = 1] = "Getter";
        ClassMemberKind[ClassMemberKind["Setter"] = 2] = "Setter";
        ClassMemberKind[ClassMemberKind["Property"] = 3] = "Property";
        ClassMemberKind[ClassMemberKind["Method"] = 4] = "Method";
    })(ClassMemberKind = exports.ClassMemberKind || (exports.ClassMemberKind = {}));
    /**
     * Possible functions from TypeScript's helper library.
     */
    var TsHelperFn;
    (function (TsHelperFn) {
        /**
         * Indicates the `__spread` function.
         */
        TsHelperFn[TsHelperFn["Spread"] = 0] = "Spread";
    })(TsHelperFn = exports.TsHelperFn || (exports.TsHelperFn = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQWtFcEIsUUFBQSxTQUFTLEdBQUc7UUFDdkIsWUFBWSxFQUFFLFVBQUMsU0FBb0I7WUFDakMsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDM0IsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNMLGtFQUFrRTtnQkFDbEUsT0FBUSxTQUFnQyxDQUFDLGNBQWMsQ0FBQzthQUN6RDtRQUNILENBQUM7S0FDRixDQUFDO0lBUUYsU0FBZ0IscUJBQXFCLENBQUMsR0FBa0I7UUFDdEQsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztZQUN2QixFQUFFLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUhELHNEQUdDO0lBbUJEOztPQUVHO0lBQ0gsSUFBWSxlQU1YO0lBTkQsV0FBWSxlQUFlO1FBQ3pCLG1FQUFXLENBQUE7UUFDWCx5REFBTSxDQUFBO1FBQ04seURBQU0sQ0FBQTtRQUNOLDZEQUFRLENBQUE7UUFDUix5REFBTSxDQUFBO0lBQ1IsQ0FBQyxFQU5XLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBTTFCO0lBZ05EOztPQUVHO0lBQ0gsSUFBWSxVQUtYO0lBTEQsV0FBWSxVQUFVO1FBQ3BCOztXQUVHO1FBQ0gsK0NBQU0sQ0FBQTtJQUNSLENBQUMsRUFMVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQUtyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZyb20gYW4gaW5zdGFuY2Ugb2YgYSBkZWNvcmF0b3Igb24gYW5vdGhlciBkZWNsYXJhdGlvbiwgb3Igc3ludGhlc2l6ZWQgZnJvbVxuICogb3RoZXIgaW5mb3JtYXRpb24gYWJvdXQgYSBjbGFzcy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdG9yID0gQ29uY3JldGVEZWNvcmF0b3IgfCBTeW50aGV0aWNEZWNvcmF0b3I7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZURlY29yYXRvciB7XG4gIC8qKlxuICAgKiBOYW1lIGJ5IHdoaWNoIHRoZSBkZWNvcmF0b3Igd2FzIGludm9rZWQgaW4gdGhlIHVzZXIncyBjb2RlLlxuICAgKlxuICAgKiBUaGlzIGlzIGRpc3RpbmN0IGZyb20gdGhlIG5hbWUgYnkgd2hpY2ggdGhlIGRlY29yYXRvciB3YXMgaW1wb3J0ZWQgKHRob3VnaCBpbiBwcmFjdGljZSB0aGV5XG4gICAqIHdpbGwgdXN1YWxseSBiZSB0aGUgc2FtZSkuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElkZW50aWZpZXIgd2hpY2ggcmVmZXJzIHRvIHRoZSBkZWNvcmF0b3IgaW4gdGhlIHVzZXIncyBjb2RlLlxuICAgKi9cbiAgaWRlbnRpZmllcjogRGVjb3JhdG9ySWRlbnRpZmllcnxudWxsO1xuXG4gIC8qKlxuICAgKiBgSW1wb3J0YCBieSB3aGljaCB0aGUgZGVjb3JhdG9yIHdhcyBicm91Z2h0IGludG8gdGhlIG1vZHVsZSBpbiB3aGljaCBpdCB3YXMgaW52b2tlZCwgb3IgYG51bGxgXG4gICAqIGlmIHRoZSBkZWNvcmF0b3Igd2FzIGRlY2xhcmVkIGluIHRoZSBzYW1lIG1vZHVsZSBhbmQgbm90IGltcG9ydGVkLlxuICAgKi9cbiAgaW1wb3J0IDogSW1wb3J0IHwgbnVsbDtcblxuICAvKipcbiAgICogVHlwZVNjcmlwdCByZWZlcmVuY2UgdG8gdGhlIGRlY29yYXRvciBpdHNlbGYsIG9yIGBudWxsYCBpZiB0aGUgZGVjb3JhdG9yIGlzIHN5bnRoZXNpemVkIChlLmcuXG4gICAqIGluIG5nY2MpLlxuICAgKi9cbiAgbm9kZTogdHMuTm9kZXxudWxsO1xuXG4gIC8qKlxuICAgKiBBcmd1bWVudHMgb2YgdGhlIGludm9jYXRpb24gb2YgdGhlIGRlY29yYXRvciwgaWYgdGhlIGRlY29yYXRvciBpcyBpbnZva2VkLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgYXJnczogdHMuRXhwcmVzc2lvbltdfG51bGw7XG59XG5cbi8qKlxuICogTWV0YWRhdGEgZXh0cmFjdGVkIGZyb20gYW4gaW5zdGFuY2Ugb2YgYSBkZWNvcmF0b3Igb24gYW5vdGhlciBkZWNsYXJhdGlvbiwgd2hpY2ggd2FzIGFjdHVhbGx5XG4gKiBwcmVzZW50IGluIGEgZmlsZS5cbiAqXG4gKiBDb25jcmV0ZSBkZWNvcmF0b3JzIGFsd2F5cyBoYXZlIGFuIGBpZGVudGlmaWVyYCBhbmQgYSBgbm9kZWAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29uY3JldGVEZWNvcmF0b3IgZXh0ZW5kcyBCYXNlRGVjb3JhdG9yIHtcbiAgaWRlbnRpZmllcjogRGVjb3JhdG9ySWRlbnRpZmllcjtcbiAgbm9kZTogdHMuTm9kZTtcbn1cblxuLyoqXG4gKiBTeW50aGV0aWMgZGVjb3JhdG9ycyBuZXZlciBoYXZlIGFuIGBpZGVudGlmaWVyYCBvciBhIGBub2RlYCwgYnV0IGtub3cgdGhlIG5vZGUgZm9yIHdoaWNoIHRoZXlcbiAqIHdlcmUgc3ludGhlc2l6ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3ludGhldGljRGVjb3JhdG9yIGV4dGVuZHMgQmFzZURlY29yYXRvciB7XG4gIGlkZW50aWZpZXI6IG51bGw7XG4gIG5vZGU6IG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuTm9kZWAgZm9yIHdoaWNoIHRoaXMgZGVjb3JhdG9yIHdhcyBjcmVhdGVkLlxuICAgKi9cbiAgc3ludGhlc2l6ZWRGb3I6IHRzLk5vZGU7XG59XG5cbmV4cG9ydCBjb25zdCBEZWNvcmF0b3IgPSB7XG4gIG5vZGVGb3JFcnJvcjogKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuTm9kZSA9PiB7XG4gICAgaWYgKGRlY29yYXRvci5ub2RlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGVjb3JhdG9yLm5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE8oYWx4aHViKTogd2UgY2FuJ3QgcmVseSBvbiBuYXJyb3dpbmcgdW50aWwgVFMgMy42IGlzIGluIGczLlxuICAgICAgcmV0dXJuIChkZWNvcmF0b3IgYXMgU3ludGhldGljRGVjb3JhdG9yKS5zeW50aGVzaXplZEZvcjtcbiAgICB9XG4gIH0sXG59O1xuXG4vKipcbiAqIEEgZGVjb3JhdG9yIGlzIGlkZW50aWZpZWQgYnkgZWl0aGVyIGEgc2ltcGxlIGlkZW50aWZpZXIgKGUuZy4gYERlY29yYXRvcmApIG9yLCBpbiBzb21lIGNhc2VzLFxuICogYSBuYW1lc3BhY2VkIHByb3BlcnR5IGFjY2VzcyAoZS5nLiBgY29yZS5EZWNvcmF0b3JgKS5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdG9ySWRlbnRpZmllciA9IHRzLklkZW50aWZpZXIgfCBOYW1lc3BhY2VkSWRlbnRpZmllcjtcbmV4cG9ydCB0eXBlIE5hbWVzcGFjZWRJZGVudGlmaWVyID0gdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uICYge2V4cHJlc3Npb246IHRzLklkZW50aWZpZXJ9O1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVjb3JhdG9ySWRlbnRpZmllcihleHA6IHRzLkV4cHJlc3Npb24pOiBleHAgaXMgRGVjb3JhdG9ySWRlbnRpZmllciB7XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIoZXhwKSB8fFxuICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oZXhwKSAmJiB0cy5pc0lkZW50aWZpZXIoZXhwLmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRoZSBgdHMuRGVjbGFyYXRpb25gIG9mIGEgXCJjbGFzc1wiLlxuICpcbiAqIENsYXNzZXMgYXJlIHJlcHJlc2VudGVkIGRpZmZlcmVudGx5IGluIGRpZmZlcmVudCBjb2RlIGZvcm1hdHM6XG4gKiAtIEluIFRTIGNvZGUsIHRoZXkgYXJlIHR5cGljYWxseSBkZWZpbmVkIHVzaW5nIHRoZSBgY2xhc3NgIGtleXdvcmQuXG4gKiAtIEluIEVTMjAxNSBjb2RlLCB0aGV5IGFyZSB1c3VhbGx5IGRlZmluZWQgdXNpbmcgdGhlIGBjbGFzc2Aga2V5d29yZCwgYnV0IHRoZXkgY2FuIGFsc28gYmVcbiAqICAgdmFyaWFibGUgZGVjbGFyYXRpb25zLCB3aGljaCBhcmUgaW5pdGlhbGl6ZWQgdG8gYSBjbGFzcyBleHByZXNzaW9uIChlLmcuXG4gKiAgIGBsZXQgRm9vID0gRm9vMSA9IGNsYXNzIEZvbyB7fWApLlxuICogLSBJbiBFUzUgY29kZSwgdGhleSBhcmUgdHlwaWNhbGx5IGRlZmluZWQgYXMgdmFyaWFibGUgZGVjbGFyYXRpb25zIGJlaW5nIGFzc2lnbmVkIHRoZSByZXR1cm5cbiAqICAgdmFsdWUgb2YgYW4gSUlGRS4gVGhlIGFjdHVhbCBcImNsYXNzXCIgaXMgaW1wbGVtZW50ZWQgYXMgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBpbnNpZGUgdGhlIElJRkUsXG4gKiAgIGJ1dCB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gcmVwcmVzZW50cyB0aGUgXCJjbGFzc1wiIHRvIHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtLlxuICpcbiAqIEZvciBgUmVmbGVjdGlvbkhvc3RgIHB1cnBvc2VzLCBhIGNsYXNzIGRlY2xhcmF0aW9uIHNob3VsZCBhbHdheXMgaGF2ZSBhIGBuYW1lYCBpZGVudGlmaWVyLFxuICogYmVjYXVzZSB3ZSBuZWVkIHRvIGJlIGFibGUgdG8gcmVmZXJlbmNlIGl0IGluIG90aGVyIHBhcnRzIG9mIHRoZSBwcm9ncmFtLlxuICovXG5leHBvcnQgdHlwZSBDbGFzc0RlY2xhcmF0aW9uPFQgZXh0ZW5kcyB0cy5EZWNsYXJhdGlvbiA9IHRzLkRlY2xhcmF0aW9uPiA9IFQgJiB7bmFtZTogdHMuSWRlbnRpZmllcn07XG5cbi8qKlxuICogQW4gZW51bWVyYXRpb24gb2YgcG9zc2libGUga2luZHMgb2YgY2xhc3MgbWVtYmVycy5cbiAqL1xuZXhwb3J0IGVudW0gQ2xhc3NNZW1iZXJLaW5kIHtcbiAgQ29uc3RydWN0b3IsXG4gIEdldHRlcixcbiAgU2V0dGVyLFxuICBQcm9wZXJ0eSxcbiAgTWV0aG9kLFxufVxuXG4vKipcbiAqIEEgbWVtYmVyIG9mIGEgY2xhc3MsIHN1Y2ggYXMgYSBwcm9wZXJ0eSwgbWV0aG9kLCBvciBjb25zdHJ1Y3Rvci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc01lbWJlciB7XG4gIC8qKlxuICAgKiBUeXBlU2NyaXB0IHJlZmVyZW5jZSB0byB0aGUgY2xhc3MgbWVtYmVyIGl0c2VsZiwgb3IgbnVsbCBpZiBpdCBpcyBub3QgYXBwbGljYWJsZS5cbiAgICovXG4gIG5vZGU6IHRzLk5vZGV8bnVsbDtcblxuICAvKipcbiAgICogSW5kaWNhdGlvbiBvZiB3aGljaCB0eXBlIG9mIG1lbWJlciB0aGlzIGlzIChwcm9wZXJ0eSwgbWV0aG9kLCBldGMpLlxuICAgKi9cbiAga2luZDogQ2xhc3NNZW1iZXJLaW5kO1xuXG4gIC8qKlxuICAgKiBUeXBlU2NyaXB0IGB0cy5UeXBlTm9kZWAgcmVwcmVzZW50aW5nIHRoZSB0eXBlIG9mIHRoZSBtZW1iZXIsIG9yIGBudWxsYCBpZiBub3QgcHJlc2VudCBvclxuICAgKiBhcHBsaWNhYmxlLlxuICAgKi9cbiAgdHlwZTogdHMuVHlwZU5vZGV8bnVsbDtcblxuICAvKipcbiAgICogTmFtZSBvZiB0aGUgY2xhc3MgbWVtYmVyLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUeXBlU2NyaXB0IGB0cy5JZGVudGlmaWVyYCByZXByZXNlbnRpbmcgdGhlIG5hbWUgb2YgdGhlIG1lbWJlciwgb3IgYG51bGxgIGlmIG5vIHN1Y2ggbm9kZVxuICAgKiBpcyBwcmVzZW50LlxuICAgKlxuICAgKiBUaGUgYG5hbWVOb2RlYCBpcyB1c2VmdWwgaW4gd3JpdGluZyByZWZlcmVuY2VzIHRvIHRoaXMgbWVtYmVyIHRoYXQgd2lsbCBiZSBjb3JyZWN0bHkgc291cmNlLVxuICAgKiBtYXBwZWQgYmFjayB0byB0aGUgb3JpZ2luYWwgZmlsZS5cbiAgICovXG4gIG5hbWVOb2RlOiB0cy5JZGVudGlmaWVyfG51bGw7XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgYHRzLkV4cHJlc3Npb25gIHdoaWNoIHJlcHJlc2VudHMgdGhlIHZhbHVlIG9mIHRoZSBtZW1iZXIuXG4gICAqXG4gICAqIElmIHRoZSBtZW1iZXIgaXMgYSBwcm9wZXJ0eSwgdGhpcyB3aWxsIGJlIHRoZSBwcm9wZXJ0eSBpbml0aWFsaXplciBpZiB0aGVyZSBpcyBvbmUsIG9yIG51bGxcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbDtcblxuICAvKipcbiAgICogVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIHdoaWNoIHJlcHJlc2VudHMgdGhlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBtZW1iZXIuXG4gICAqXG4gICAqIEluIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGlkZW50aWNhbCB0byB0aGUgbm9kZSwgYnV0IGluIGRvd25sZXZlbGVkIGNvZGUgdGhpcyBzaG91bGQgYWx3YXlzIGJlXG4gICAqIHRoZSBEZWNsYXJhdGlvbiB3aGljaCBhY3R1YWxseSByZXByZXNlbnRzIHRoZSBtZW1iZXIncyBydW50aW1lIHZhbHVlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgdGhlIFRTIGNvZGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjbGFzcyBDbGF6eiB7XG4gICAqICAgc3RhdGljIGdldCBwcm9wZXJ0eSgpOiBzdHJpbmcge1xuICAgKiAgICAgcmV0dXJuICd2YWx1ZSc7XG4gICAqICAgfVxuICAgKiB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBEb3dubGV2ZWxzIHRvOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIENsYXp6ID0gKGZ1bmN0aW9uICgpIHtcbiAgICogICBmdW5jdGlvbiBDbGF6eigpIHtcbiAgICogICB9XG4gICAqICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KENsYXp6LCBcInByb3BlcnR5XCIsIHtcbiAgICogICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAqICAgICAgICAgICByZXR1cm4gJ3ZhbHVlJztcbiAgICogICAgICAgfSxcbiAgICogICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICogICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAqICAgfSk7XG4gICAqICAgcmV0dXJuIENsYXp6O1xuICAgKiB9KCkpO1xuICAgKiBgYGBcbiAgICpcbiAgICogSW4gdGhpcyBleGFtcGxlLCBmb3IgdGhlIHByb3BlcnR5IFwicHJvcGVydHlcIiwgdGhlIG5vZGUgd291bGQgYmUgdGhlIGVudGlyZVxuICAgKiBPYmplY3QuZGVmaW5lUHJvcGVydHkgRXhwcmVzc2lvblN0YXRlbWVudCwgYnV0IHRoZSBpbXBsZW1lbnRhdGlvbiB3b3VsZCBiZSB0aGlzXG4gICAqIEZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBmdW5jdGlvbiAoKSB7XG4gICAqICAgcmV0dXJuICd2YWx1ZSc7XG4gICAqIH0sXG4gICAqIGBgYFxuICAgKi9cbiAgaW1wbGVtZW50YXRpb246IHRzLkRlY2xhcmF0aW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIG1lbWJlciBpcyBzdGF0aWMgb3Igbm90LlxuICAgKi9cbiAgaXNTdGF0aWM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFueSBgRGVjb3JhdG9yYHMgd2hpY2ggYXJlIHByZXNlbnQgb24gdGhlIG1lbWJlciwgb3IgYG51bGxgIGlmIG5vbmUgYXJlIHByZXNlbnQuXG4gICAqL1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsO1xufVxuXG4vKipcbiAqIEEgcmVmZXJlbmNlIHRvIGEgdmFsdWUgdGhhdCBvcmlnaW5hdGVkIGZyb20gYSB0eXBlIHBvc2l0aW9uLlxuICpcbiAqIEZvciBleGFtcGxlLCBhIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBjb3VsZCBiZSBkZWNsYXJlZCBhcyBgZm9vOiBGb29gLiBBIGBUeXBlVmFsdWVSZWZlcmVuY2VgXG4gKiBleHRyYWN0ZWQgZnJvbSB0aGlzIHdvdWxkIHJlZmVyIHRvIHRoZSB2YWx1ZSBvZiB0aGUgY2xhc3MgYEZvb2AgKGFzc3VtaW5nIGl0IHdhcyBhY3R1YWxseSBhXG4gKiB0eXBlKS5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIGtpbmRzIG9mIHN1Y2ggcmVmZXJlbmNlcy4gQSByZWZlcmVuY2Ugd2l0aCBgbG9jYWw6IGZhbHNlYCByZWZlcnMgdG8gYSB0eXBlIHRoYXQgd2FzXG4gKiBpbXBvcnRlZCwgYW5kIGdpdmVzIHRoZSBzeW1ib2wgYG5hbWVgIGFuZCB0aGUgYG1vZHVsZU5hbWVgIG9mIHRoZSBpbXBvcnQuIE5vdGUgdGhhdCB0aGlzXG4gKiBgbW9kdWxlTmFtZWAgbWF5IGJlIGEgcmVsYXRpdmUgcGF0aCwgYW5kIHRodXMgaXMgbGlrZWx5IG9ubHkgdmFsaWQgd2l0aGluIHRoZSBjb250ZXh0IG9mIHRoZSBmaWxlXG4gKiB3aGljaCBjb250YWluZWQgdGhlIG9yaWdpbmFsIHR5cGUgcmVmZXJlbmNlLlxuICpcbiAqIEEgcmVmZXJlbmNlIHdpdGggYGxvY2FsOiB0cnVlYCByZWZlcnMgdG8gYW55IG90aGVyIGtpbmQgb2YgdHlwZSB2aWEgYSBgdHMuRXhwcmVzc2lvbmAgdGhhdCdzXG4gKiB2YWxpZCB3aXRoaW4gdGhlIGxvY2FsIGZpbGUgd2hlcmUgdGhlIHR5cGUgd2FzIHJlZmVyZW5jZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVWYWx1ZVJlZmVyZW5jZSA9IHtcbiAgbG9jYWw6IHRydWU7IGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247IGRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQ6IHRzLkltcG9ydERlY2xhcmF0aW9uIHwgbnVsbDtcbn0gfFxue1xuICBsb2NhbDogZmFsc2U7XG4gIG5hbWU6IHN0cmluZztcbiAgbW9kdWxlTmFtZTogc3RyaW5nO1xuICB2YWx1ZURlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbjtcbn07XG5cbi8qKlxuICogQSBwYXJhbWV0ZXIgdG8gYSBjb25zdHJ1Y3Rvci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDdG9yUGFyYW1ldGVyIHtcbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHBhcmFtZXRlciwgaWYgYXZhaWxhYmxlLlxuICAgKlxuICAgKiBTb21lIHBhcmFtZXRlcnMgZG9uJ3QgaGF2ZSBhIHNpbXBsZSBzdHJpbmcgbmFtZSAoZm9yIGV4YW1wbGUsIHBhcmFtZXRlcnMgd2hpY2ggYXJlIGRlc3RydWN0dXJlZFxuICAgKiBpbnRvIG11bHRpcGxlIHZhcmlhYmxlcykuIEluIHRoZXNlIGNhc2VzLCBgbmFtZWAgY2FuIGJlIGBudWxsYC5cbiAgICovXG4gIG5hbWU6IHN0cmluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBUeXBlU2NyaXB0IGB0cy5CaW5kaW5nTmFtZWAgcmVwcmVzZW50aW5nIHRoZSBuYW1lIG9mIHRoZSBwYXJhbWV0ZXIuXG4gICAqXG4gICAqIFRoZSBgbmFtZU5vZGVgIGlzIHVzZWZ1bCBpbiB3cml0aW5nIHJlZmVyZW5jZXMgdG8gdGhpcyBtZW1iZXIgdGhhdCB3aWxsIGJlIGNvcnJlY3RseSBzb3VyY2UtXG4gICAqIG1hcHBlZCBiYWNrIHRvIHRoZSBvcmlnaW5hbCBmaWxlLlxuICAgKi9cbiAgbmFtZU5vZGU6IHRzLkJpbmRpbmdOYW1lO1xuXG4gIC8qKlxuICAgKiBSZWZlcmVuY2UgdG8gdGhlIHZhbHVlIG9mIHRoZSBwYXJhbWV0ZXIncyB0eXBlIGFubm90YXRpb24sIGlmIGl0J3MgcG9zc2libGUgdG8gcmVmZXIgdG8gdGhlXG4gICAqIHBhcmFtZXRlcidzIHR5cGUgYXMgYSB2YWx1ZS5cbiAgICpcbiAgICogVGhpcyBjYW4gZWl0aGVyIGJlIGEgcmVmZXJlbmNlIHRvIGEgbG9jYWwgdmFsdWUsIGluIHdoaWNoIGNhc2UgaXQgaGFzIGBsb2NhbGAgc2V0IHRvIGB0cnVlYCBhbmRcbiAgICogY29udGFpbnMgYSBgdHMuRXhwcmVzc2lvbmAsIG9yIGl0J3MgYSByZWZlcmVuY2UgdG8gYW4gaW1wb3J0ZWQgdmFsdWUsIGluIHdoaWNoIGNhc2UgYGxvY2FsYCBpc1xuICAgKiBzZXQgdG8gYGZhbHNlYCBhbmQgdGhlIHN5bWJvbCBhbmQgbW9kdWxlIG5hbWUgb2YgdGhlIGltcG9ydGVkIHZhbHVlIGFyZSBwcm92aWRlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBJZiB0aGUgdHlwZSBpcyBub3QgcHJlc2VudCBvciBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgYW4gZXhwcmVzc2lvbiwgYHR5cGVWYWx1ZVJlZmVyZW5jZWAgaXNcbiAgICogYG51bGxgLlxuICAgKi9cbiAgdHlwZVZhbHVlUmVmZXJlbmNlOiBUeXBlVmFsdWVSZWZlcmVuY2V8bnVsbDtcblxuICAvKipcbiAgICogVHlwZVNjcmlwdCBgdHMuVHlwZU5vZGVgIHJlcHJlc2VudGluZyB0aGUgdHlwZSBub2RlIGZvdW5kIGluIHRoZSB0eXBlIHBvc2l0aW9uLlxuICAgKlxuICAgKiBUaGlzIGZpZWxkIGNhbiBiZSB1c2VkIGZvciBkaWFnbm9zdGljcyByZXBvcnRpbmcgaWYgYHR5cGVWYWx1ZVJlZmVyZW5jZWAgaXMgYG51bGxgLlxuICAgKlxuICAgKiBDYW4gYmUgbnVsbCwgaWYgdGhlIHBhcmFtIGhhcyBubyB0eXBlIGRlY2xhcmVkLlxuICAgKi9cbiAgdHlwZU5vZGU6IHRzLlR5cGVOb2RlfG51bGw7XG5cbiAgLyoqXG4gICAqIEFueSBgRGVjb3JhdG9yYHMgd2hpY2ggYXJlIHByZXNlbnQgb24gdGhlIHBhcmFtZXRlciwgb3IgYG51bGxgIGlmIG5vbmUgYXJlIHByZXNlbnQuXG4gICAqL1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsO1xufVxuXG4vKipcbiAqIERlZmluaXRpb24gb2YgYSBmdW5jdGlvbiBvciBtZXRob2QsIGluY2x1ZGluZyBpdHMgYm9keSBpZiBwcmVzZW50IGFuZCBhbnkgcGFyYW1ldGVycy5cbiAqXG4gKiBJbiBUeXBlU2NyaXB0IGNvZGUgdGhpcyBtZXRhZGF0YSB3aWxsIGJlIGEgc2ltcGxlIHJlZmxlY3Rpb24gb2YgdGhlIGRlY2xhcmF0aW9ucyBpbiB0aGUgbm9kZVxuICogaXRzZWxmLiBJbiBFUzUgY29kZSB0aGlzIGNhbiBiZSBtb3JlIGNvbXBsaWNhdGVkLCBhcyB0aGUgZGVmYXVsdCB2YWx1ZXMgZm9yIHBhcmFtZXRlcnMgbWF5XG4gKiBiZSBleHRyYWN0ZWQgZnJvbSBjZXJ0YWluIGJvZHkgc3RhdGVtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGdW5jdGlvbkRlZmluaXRpb24ge1xuICAvKipcbiAgICogQSByZWZlcmVuY2UgdG8gdGhlIG5vZGUgd2hpY2ggZGVjbGFyZXMgdGhlIGZ1bmN0aW9uLlxuICAgKi9cbiAgbm9kZTogdHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb258dHMuVmFyaWFibGVEZWNsYXJhdGlvbjtcblxuICAvKipcbiAgICogU3RhdGVtZW50cyBvZiB0aGUgZnVuY3Rpb24gYm9keSwgaWYgYSBib2R5IGlzIHByZXNlbnQsIG9yIG51bGwgaWYgbm8gYm9keSBpcyBwcmVzZW50IG9yIHRoZVxuICAgKiBmdW5jdGlvbiBpcyBpZGVudGlmaWVkIHRvIHJlcHJlc2VudCBhIHRzbGliIGhlbHBlciBmdW5jdGlvbiwgaW4gd2hpY2ggY2FzZSBgaGVscGVyYCB3aWxsXG4gICAqIGluZGljYXRlIHdoaWNoIGhlbHBlciB0aGlzIGZ1bmN0aW9uIHJlcHJlc2VudHMuXG4gICAqXG4gICAqIFRoaXMgbGlzdCBtYXkgaGF2ZSBiZWVuIGZpbHRlcmVkIHRvIGV4Y2x1ZGUgc3RhdGVtZW50cyB3aGljaCBwZXJmb3JtIHBhcmFtZXRlciBkZWZhdWx0IHZhbHVlXG4gICAqIGluaXRpYWxpemF0aW9uLlxuICAgKi9cbiAgYm9keTogdHMuU3RhdGVtZW50W118bnVsbDtcblxuICAvKipcbiAgICogVGhlIHR5cGUgb2YgdHNsaWIgaGVscGVyIGZ1bmN0aW9uLCBpZiB0aGUgZnVuY3Rpb24gaXMgZGV0ZXJtaW5lZCB0byByZXByZXNlbnQgYSB0c2xpYiBoZWxwZXJcbiAgICogZnVuY3Rpb24uIE90aGVyd2lzZSwgdGhpcyB3aWxsIGJlIG51bGwuXG4gICAqL1xuICBoZWxwZXI6IFRzSGVscGVyRm58bnVsbDtcblxuICAvKipcbiAgICogTWV0YWRhdGEgcmVnYXJkaW5nIHRoZSBmdW5jdGlvbidzIHBhcmFtZXRlcnMsIGluY2x1ZGluZyBwb3NzaWJsZSBkZWZhdWx0IHZhbHVlIGV4cHJlc3Npb25zLlxuICAgKi9cbiAgcGFyYW1ldGVyczogUGFyYW1ldGVyW107XG59XG5cbi8qKlxuICogUG9zc2libGUgZnVuY3Rpb25zIGZyb20gVHlwZVNjcmlwdCdzIGhlbHBlciBsaWJyYXJ5LlxuICovXG5leHBvcnQgZW51bSBUc0hlbHBlckZuIHtcbiAgLyoqXG4gICAqIEluZGljYXRlcyB0aGUgYF9fc3ByZWFkYCBmdW5jdGlvbi5cbiAgICovXG4gIFNwcmVhZCxcbn1cblxuLyoqXG4gKiBBIHBhcmFtZXRlciB0byBhIGZ1bmN0aW9uIG9yIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXIge1xuICAvKipcbiAgICogTmFtZSBvZiB0aGUgcGFyYW1ldGVyLCBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBuYW1lOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogRGVjbGFyYXRpb24gd2hpY2ggY3JlYXRlZCB0aGlzIHBhcmFtZXRlci5cbiAgICovXG4gIG5vZGU6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uO1xuXG4gIC8qKlxuICAgKiBFeHByZXNzaW9uIHdoaWNoIHJlcHJlc2VudHMgdGhlIGRlZmF1bHQgdmFsdWUgb2YgdGhlIHBhcmFtZXRlciwgaWYgYW55LlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI6IHRzLkV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBUaGUgc291cmNlIG9mIGFuIGltcG9ydGVkIHN5bWJvbCwgaW5jbHVkaW5nIHRoZSBvcmlnaW5hbCBzeW1ib2wgbmFtZSBhbmQgdGhlIG1vZHVsZSBmcm9tIHdoaWNoIGl0XG4gKiB3YXMgaW1wb3J0ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0IHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBpbXBvcnRlZCBzeW1ib2wgdW5kZXIgd2hpY2ggaXQgd2FzIGV4cG9ydGVkIChub3QgaW1wb3J0ZWQpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgbW9kdWxlIGZyb20gd2hpY2ggdGhlIHN5bWJvbCB3YXMgaW1wb3J0ZWQuXG4gICAqXG4gICAqIFRoaXMgY291bGQgZWl0aGVyIGJlIGFuIGFic29sdXRlIG1vZHVsZSBuYW1lIChAYW5ndWxhci9jb3JlIGZvciBleGFtcGxlKSBvciBhIHJlbGF0aXZlIHBhdGguXG4gICAqL1xuICBmcm9tOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQmFzZSB0eXBlIGZvciBhbGwgYERlY2xhcmF0aW9uYHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZURlY2xhcmF0aW9uPFQgZXh0ZW5kcyB0cy5EZWNsYXJhdGlvbiA9IHRzLkRlY2xhcmF0aW9uPiB7XG4gIC8qKlxuICAgKiBUaGUgYWJzb2x1dGUgbW9kdWxlIHBhdGggZnJvbSB3aGljaCB0aGUgc3ltYm9sIHdhcyBpbXBvcnRlZCBpbnRvIHRoZSBhcHBsaWNhdGlvbiwgaWYgdGhlIHN5bWJvbFxuICAgKiB3YXMgaW1wb3J0ZWQgdmlhIGFuIGFic29sdXRlIG1vZHVsZSAoZXZlbiB0aHJvdWdoIGEgY2hhaW4gb2YgcmUtZXhwb3J0cykuIElmIHRoZSBzeW1ib2wgaXMgcGFydFxuICAgKiBvZiB0aGUgYXBwbGljYXRpb24gYW5kIHdhcyBub3QgaW1wb3J0ZWQgZnJvbSBhbiBhYnNvbHV0ZSBwYXRoLCB0aGlzIHdpbGwgYmUgYG51bGxgLlxuICAgKi9cbiAgdmlhTW9kdWxlOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogVHlwZVNjcmlwdCByZWZlcmVuY2UgdG8gdGhlIGRlY2xhcmF0aW9uIGl0c2VsZiwgaWYgb25lIGV4aXN0cy5cbiAgICovXG4gIG5vZGU6IFR8bnVsbDtcbn1cblxuLyoqXG4gKiBBIGRlY2xhcmF0aW9uIHRoYXQgaGFzIGFuIGFzc29jaWF0ZWQgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gLlxuICpcbiAqIFRoZSBhbHRlcm5hdGl2ZSBpcyBhbiBgSW5saW5lRGVjbGFyYXRpb25gLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbmNyZXRlRGVjbGFyYXRpb248VCBleHRlbmRzIHRzLkRlY2xhcmF0aW9uID0gdHMuRGVjbGFyYXRpb24+IGV4dGVuZHNcbiAgICBCYXNlRGVjbGFyYXRpb248VD4ge1xuICBub2RlOiBUO1xufVxuXG4vKipcbiAqIEEgZGVjbGFyYXRpb24gdGhhdCBkb2VzIG5vdCBoYXZlIGFuIGFzc29jaWF0ZWQgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gLCBvbmx5IGFcbiAqIGB0cy5FeHByZXNzaW9uYC5cbiAqXG4gKiBUaGlzIGNhbiBvY2N1ciBpbiBzb21lIGRvd25sZXZlbGluZ3Mgd2hlbiBhbiBgZXhwb3J0IGNvbnN0IFZBUiA9IC4uLjtgIChhIGB0cy5EZWNsYXJhdGlvbmApIGlzXG4gKiB0cmFuc3BpbGVkIHRvIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50IChlLmcuIGBleHBvcnRzLlZBUiA9IC4uLjtgKS4gVGhlcmUgaXMgbm8gYHRzLkRlY2xhcmF0aW9uYFxuICogYXNzb2NpYXRlZCB3aXRoIGBWQVJgIGluIHRoYXQgY2FzZSwgb25seSBhbiBleHByZXNzaW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElubGluZURlY2xhcmF0aW9uIGV4dGVuZHMgQmFzZURlY2xhcmF0aW9uIHtcbiAgbm9kZTogbnVsbDtcblxuICAvKipcbiAgICogVGhlIGB0cy5FeHByZXNzaW9uYCB3aGljaCBjb25zdGl0dXRlcyB0aGUgdmFsdWUgb2YgdGhlIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVjbGFyYXRpb24gb2YgYSBzeW1ib2wsIGFsb25nIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgaG93IGl0IHdhcyBpbXBvcnRlZCBpbnRvIHRoZVxuICogYXBwbGljYXRpb24uXG4gKlxuICogVGhpcyBjYW4gZWl0aGVyIGJlIGEgYENvbmNyZXRlRGVjbGFyYXRpb25gIGlmIHRoZSB1bmRlcmx5aW5nIFR5cGVTY3JpcHQgbm9kZSBmb3IgdGhlIHN5bWJvbCBpcyBhblxuICogYWN0dWFsIGB0cy5EZWNsYXJhdGlvbmAsIG9yIGFuIGBJbmxpbmVEZWNsYXJhdGlvbmAgaWYgdGhlIGRlY2xhcmF0aW9uIHdhcyB0cmFuc3BpbGVkIGluIGNlcnRhaW5cbiAqIGRvd25sZXZlbGluZ3MgdG8gYSBgdHMuRXhwcmVzc2lvbmAgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjbGFyYXRpb248VCBleHRlbmRzIHRzLkRlY2xhcmF0aW9uID0gdHMuRGVjbGFyYXRpb24+ID1cbiAgICBDb25jcmV0ZURlY2xhcmF0aW9uPFQ+fCBJbmxpbmVEZWNsYXJhdGlvbjtcblxuLyoqXG4gKiBBYnN0cmFjdHMgcmVmbGVjdGlvbiBvcGVyYXRpb25zIG9uIGEgVHlwZVNjcmlwdCBBU1QuXG4gKlxuICogRGVwZW5kaW5nIG9uIHRoZSBmb3JtYXQgb2YgdGhlIGNvZGUgYmVpbmcgaW50ZXJwcmV0ZWQsIGRpZmZlcmVudCBjb25jZXB0cyBhcmUgcmVwcmVzZW50ZWRcbiAqIHdpdGggZGlmZmVyZW50IHN5bnRhY3RpY2FsIHN0cnVjdHVyZXMuIFRoZSBgUmVmbGVjdGlvbkhvc3RgIGFic3RyYWN0cyBvdmVyIHRob3NlIGRpZmZlcmVuY2VzIGFuZFxuICogcHJlc2VudHMgYSBzaW5nbGUgQVBJIGJ5IHdoaWNoIHRoZSBjb21waWxlciBjYW4gcXVlcnkgc3BlY2lmaWMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIEFTVC5cbiAqXG4gKiBBbGwgb3BlcmF0aW9ucyBvbiB0aGUgYFJlZmxlY3Rpb25Ib3N0YCByZXF1aXJlIHRoZSB1c2Ugb2YgVHlwZVNjcmlwdCBgdHMuTm9kZWBzIHdpdGggYmluZGluZ1xuICogaW5mb3JtYXRpb24gYWxyZWFkeSBhdmFpbGFibGUgKHRoYXQgaXMsIG5vZGVzIHRoYXQgY29tZSBmcm9tIGEgYHRzLlByb2dyYW1gIHRoYXQgaGFzIGJlZW5cbiAqIHR5cGUtY2hlY2tlZCwgYW5kIGFyZSBub3Qgc3ludGhldGljYWxseSBjcmVhdGVkKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWZsZWN0aW9uSG9zdCB7XG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW107XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbDtcblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgZnVuY3Rpb24gYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgcGFyYW1ldGVycyBhbmQgYm9keS5cbiAgICpcbiAgICogRnVuY3Rpb25zIGluIFR5cGVTY3JpcHQgYW5kIEVTNSBjb2RlIGhhdmUgZGlmZmVyZW50IEFTVCByZXByZXNlbnRhdGlvbnMsIGluIHBhcnRpY3VsYXIgYXJvdW5kXG4gICAqIGRlZmF1bHQgdmFsdWVzIGZvciBwYXJhbWV0ZXJzLiBBIFR5cGVTY3JpcHQgZnVuY3Rpb24gaGFzIGl0cyBkZWZhdWx0IHZhbHVlIGFzIHRoZSBpbml0aWFsaXplclxuICAgKiBvbiB0aGUgcGFyYW1ldGVyIGRlY2xhcmF0aW9uLCB3aGVyZWFzIGFuIEVTNSBmdW5jdGlvbiBoYXMgaXRzIGRlZmF1bHQgdmFsdWUgc2V0IGluIGEgc3RhdGVtZW50XG4gICAqIG9mIHRoZSBmb3JtOlxuICAgKlxuICAgKiBpZiAocGFyYW0gPT09IHZvaWQgMCkgeyBwYXJhbSA9IDM7IH1cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYWJzdHJhY3RzIG92ZXIgdGhlc2UgZGV0YWlscywgYW5kIGludGVycHJldHMgdGhlIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGFuZCBib2R5IHRvXG4gICAqIGV4dHJhY3QgcGFyYW1ldGVyIGRlZmF1bHQgdmFsdWVzIGFuZCB0aGUgXCJyZWFsXCIgYm9keS5cbiAgICpcbiAgICogQSBjdXJyZW50IGxpbWl0YXRpb24gaXMgdGhhdCB0aGlzIG1ldGFkYXRhIGhhcyBubyByZXByZXNlbnRhdGlvbiBmb3Igc2hvcnRoYW5kIGFzc2lnbm1lbnQgb2ZcbiAgICogcGFyYW1ldGVyIG9iamVjdHMgaW4gdGhlIGZ1bmN0aW9uIHNpZ25hdHVyZS5cbiAgICpcbiAgICogQHBhcmFtIGZuIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBmdW5jdGlvbiBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgYEZ1bmN0aW9uRGVmaW5pdGlvbmAgZ2l2aW5nIG1ldGFkYXRhIGFib3V0IHRoZSBmdW5jdGlvbiBkZWZpbml0aW9uLlxuICAgKi9cbiAgZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZm46IHRzLk5vZGUpOiBGdW5jdGlvbkRlZmluaXRpb258bnVsbDtcblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGlmIGFuIGlkZW50aWZpZXIgd2FzIGltcG9ydGVkIGZyb20gYW5vdGhlciBtb2R1bGUgYW5kIHJldHVybiBgSW1wb3J0YCBtZXRhZGF0YVxuICAgKiBkZXNjcmliaW5nIGl0cyBvcmlnaW4uXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZlcmAgdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBJbXBvcnRgIGlmIHRoZSBpZGVudGlmaWVyIHdhcyBpbXBvcnRlZCBmcm9tIGFub3RoZXIgbW9kdWxlLCBvclxuICAgKiBgbnVsbGAgaWYgdGhlIGlkZW50aWZpZXIgZG9lc24ndCByZXNvbHZlIHRvIGFuIGltcG9ydCBidXQgaW5zdGVhZCBpcyBsb2NhbGx5IGRlZmluZWQuXG4gICAqL1xuICBnZXRJbXBvcnRPZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBJbXBvcnR8bnVsbDtcblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSWYgdGhlIGRlY2xhcmF0aW9uIGlzIGluIGEgZGlmZmVyZW50IG1vZHVsZSwgYW5kIHRoYXQgbW9kdWxlIGlzIGltcG9ydGVkIHZpYSBhbiBhYnNvbHV0ZSBwYXRoLFxuICAgKiB0aGlzIG1ldGhvZCBhbHNvIHJldHVybnMgdGhlIGFic29sdXRlIHBhdGggb2YgdGhlIGltcG9ydGVkIG1vZHVsZS4gRm9yIGV4YW1wbGUsIGlmIHRoZSBjb2RlIGlzOlxuICAgKlxuICAgKiBgYGBcbiAgICogaW1wb3J0IHtSb3V0ZXJNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgKlxuICAgKiBleHBvcnQgY29uc3QgUk9VVEVTID0gUm91dGVyTW9kdWxlLmZvclJvb3QoWy4uLl0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYW5kIGlmIGBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcmAgaXMgY2FsbGVkIG9uIGBSb3V0ZXJNb2R1bGVgIGluIHRoZSBgUk9VVEVTYCBleHByZXNzaW9uLFxuICAgKiB0aGVuIGl0IHdvdWxkIHRyYWNlIGBSb3V0ZXJNb2R1bGVgIHZpYSBpdHMgaW1wb3J0IGZyb20gYEBhbmd1bGFyL2NvcmVgLCBhbmQgbm90ZSB0aGF0IHRoZVxuICAgKiBkZWZpbml0aW9uIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnRvIHRoZSBhcHBsaWNhdGlvbiB3aGVyZSBpdCB3YXMgcmVmZXJlbmNlZC5cbiAgICpcbiAgICogSWYgdGhlIGRlZmluaXRpb24gaXMgcmUtZXhwb3J0ZWQgc2V2ZXJhbCB0aW1lcyBmcm9tIGRpZmZlcmVudCBhYnNvbHV0ZSBtb2R1bGUgbmFtZXMsIG9ubHlcbiAgICogdGhlIGZpcnN0IG9uZSAodGhlIG9uZSBieSB3aGljaCB0aGUgYXBwbGljYXRpb24gcmVmZXJzIHRvIHRoZSBtb2R1bGUpIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBUaGlzIG1vZHVsZSBuYW1lIGlzIHJldHVybmVkIGluIHRoZSBgdmlhTW9kdWxlYCBmaWVsZCBvZiB0aGUgYERlY2xhcmF0aW9uYC4gSWYgVGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIHJlbGF0aXZlIHRvIHRoZSBhcHBsaWNhdGlvbiBpdHNlbGYgYW5kIHRoZXJlIHdhcyBubyBpbXBvcnQgdGhyb3VnaCBhbiBhYnNvbHV0ZSBwYXRoLCB0aGVuXG4gICAqIGB2aWFNb2R1bGVgIGlzIGBudWxsYC5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgdGhlIGRlY2xhcmF0aW9ucyBleHBvcnRlZCBmcm9tIGEgbW9kdWxlIGJ5IG5hbWUuXG4gICAqXG4gICAqIEl0ZXJhdGVzIG92ZXIgdGhlIGV4cG9ydHMgb2YgYSBtb2R1bGUgKGluY2x1ZGluZyByZS1leHBvcnRzKSBhbmQgcmV0dXJucyBhIG1hcCBvZiBleHBvcnRcbiAgICogbmFtZSB0byBpdHMgYERlY2xhcmF0aW9uYC4gSWYgYW4gZXhwb3J0ZWQgdmFsdWUgaXMgaXRzZWxmIHJlLWV4cG9ydGVkIGZyb20gYW5vdGhlciBtb2R1bGUsXG4gICAqIHRoZSBgRGVjbGFyYXRpb25gJ3MgYHZpYU1vZHVsZWAgd2lsbCByZWZsZWN0IHRoYXQuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGEgVHlwZVNjcmlwdCBgdHMuTm9kZWAgcmVwcmVzZW50aW5nIHRoZSBtb2R1bGUgKGZvciBleGFtcGxlIGEgYHRzLlNvdXJjZUZpbGVgKSBmb3JcbiAgICogd2hpY2ggdG8gY29sbGVjdCBleHBvcnRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBgRGVjbGFyYXRpb25gcyBmb3IgdGhlIG1vZHVsZSdzIGV4cG9ydHMsIGJ5IG5hbWUuXG4gICAqL1xuICBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlOiB0cy5Ob2RlKTogTWFwPHN0cmluZywgRGVjbGFyYXRpb24+fG51bGw7XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIG5vZGUgYWN0dWFsbHkgcmVwcmVzZW50cyBhIGNsYXNzLlxuICAgKi9cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBDbGFzc0RlY2xhcmF0aW9uO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGdpdmVuIGRlY2xhcmF0aW9uLCB3aGljaCBzaG91bGQgYmUgYSBjbGFzcywgaGFzIGEgYmFzZSBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKi9cbiAgaGFzQmFzZUNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogR2V0IGFuIGV4cHJlc3Npb24gcmVwcmVzZW50aW5nIHRoZSBiYXNlIGNsYXNzIChpZiBhbnkpIG9mIHRoZSBnaXZlbiBgY2xhenpgLlxuICAgKlxuICAgKiBUaGlzIGV4cHJlc3Npb24gaXMgbW9zdCBjb21tb25seSBhbiBJZGVudGlmaWVyLCBidXQgaXMgcG9zc2libGUgdG8gaW5oZXJpdCBmcm9tIGEgbW9yZSBkeW5hbWljXG4gICAqIGV4cHJlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiB0aGUgY2xhc3Mgd2hvc2UgYmFzZSB3ZSB3YW50IHRvIGdldC5cbiAgICovXG4gIGdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbnVtYmVyIG9mIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZ2l2ZW4gY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgdGhlIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLCBpZiBrbm93biwgb3IgYG51bGxgIGlmIHRoZSBkZWNsYXJhdGlvblxuICAgKiBpcyBub3QgYSBjbGFzcyBvciBoYXMgYW4gdW5rbm93biBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IG51bWJlcnxudWxsO1xuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBhc3NpZ25lZCB2YWx1ZSBvZiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBOb3JtYWxseSB0aGlzIHdpbGwgYmUgdGhlIGluaXRpYWxpemVyIG9mIHRoZSBkZWNsYXJhdGlvbiwgYnV0IHdoZXJlIHRoZSB2YXJpYWJsZSBpc1xuICAgKiBub3QgYSBgY29uc3RgIHdlIG1heSBuZWVkIHRvIGxvb2sgZWxzZXdoZXJlIGZvciB0aGUgdmFyaWFibGUncyB2YWx1ZS5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgd2hvc2UgdmFsdWUgd2Ugd2FudC5cbiAgICogQHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgYXMgYSBUeXBlU2NyaXB0IGV4cHJlc3Npb24gbm9kZSwgb3IgYHVuZGVmaW5lZGBcbiAgICogaWYgdGhlIHZhbHVlIGNhbm5vdCBiZSBjb21wdXRlZC5cbiAgICovXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGw7XG5cbiAgLyoqXG4gICAqIFRha2UgYW4gZXhwb3J0ZWQgZGVjbGFyYXRpb24gKG1heWJlIGEgY2xhc3MgZG93bi1sZXZlbGVkIHRvIGEgdmFyaWFibGUpIGFuZCBsb29rIHVwIHRoZVxuICAgKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSBpbiBhIHNlcGFyYXRlIC5kLnRzIHRyZWUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgYWxsb3dlZCB0byByZXR1cm4gYG51bGxgIGlmIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgZG9lcyBub3QgaGF2ZSBhXG4gICAqIHNlcGFyYXRlIC5kLnRzIHRyZWUuIFdoZW4gY29tcGlsaW5nIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2UgLmQudHMgZmlsZXNcbiAgICogYXJlIHByb2R1Y2VkIG9ubHkgZHVyaW5nIHRoZSBlbWl0IG9mIHN1Y2ggYSBjb21waWxhdGlvbi4gV2hlbiBjb21waWxpbmcgLmpzIGNvZGUsIGhvd2V2ZXIsXG4gICAqIHRoZXJlIGlzIGZyZXF1ZW50bHkgYSBwYXJhbGxlbCAuZC50cyB0cmVlIHdoaWNoIHRoaXMgbWV0aG9kIGV4cG9zZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYHRzLkRlY2xhcmF0aW9uYCByZXR1cm5lZCBmcm9tIHRoaXMgZnVuY3Rpb24gbWF5IG5vdCBiZSBmcm9tIHRoZSBzYW1lXG4gICAqIGB0cy5Qcm9ncmFtYCBhcyB0aGUgaW5wdXQgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXREdHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsO1xuXG4gIC8qKlxuICAgKiBHZXQgYSBgdHMuSWRlbnRpZmllcmAgZm9yIGEgZ2l2ZW4gYENsYXNzRGVjbGFyYXRpb25gIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHJlZmVyIHRvIHRoZSBjbGFzc1xuICAgKiB3aXRoaW4gaXRzIGRlZmluaXRpb24gKHN1Y2ggYXMgaW4gc3RhdGljIGZpZWxkcykuXG4gICAqXG4gICAqIFRoaXMgY2FuIGRpZmZlciBmcm9tIGBjbGF6ei5uYW1lYCB3aGVuIG5nY2MgcnVucyBvdmVyIEVTNSBjb2RlLCBzaW5jZSB0aGUgY2xhc3MgbWF5IGhhdmUgYVxuICAgKiBkaWZmZXJlbnQgbmFtZSB3aXRoaW4gaXRzIElJRkUgd3JhcHBlciB0aGFuIGl0IGRvZXMgZXh0ZXJuYWxseS5cbiAgICovXG4gIGdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyO1xuXG4gIC8qKlxuICAgKiBHZXQgYSBgdHMuSWRlbnRpZmllcmAgZm9yIGEgZ2l2ZW4gYENsYXNzRGVjbGFyYXRpb25gIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHJlZmVyIHRvIHRoZSBjbGFzc1xuICAgKiBmcm9tIHN0YXRlbWVudHMgdGhhdCBhcmUgXCJhZGphY2VudFwiLCBhbmQgY29uY2VwdHVhbGx5IHRpZ2h0bHkgYm91bmQsIHRvIHRoZSBjbGFzcyBidXQgbm90XG4gICAqIGFjdHVhbGx5IGluc2lkZSBpdC5cbiAgICpcbiAgICogU2ltaWxhciB0byBgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpYCwgdGhpcyBuYW1lIGNhbiBkaWZmZXIgZnJvbSBgY2xhenoubmFtZWAgd2hlbiBuZ2NjIHJ1bnNcbiAgICogb3ZlciBFUzUgY29kZSwgc2luY2UgdGhlc2UgXCJhZGphY2VudFwiIHN0YXRlbWVudHMgbmVlZCB0byBleGlzdCBpbiB0aGUgSUlGRSB3aGVyZSB0aGUgY2xhc3MgbWF5XG4gICAqIGhhdmUgYSBkaWZmZXJlbnQgbmFtZSB0aGFuIGl0IGRvZXMgZXh0ZXJuYWxseS5cbiAgICovXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyO1xufVxuIl19