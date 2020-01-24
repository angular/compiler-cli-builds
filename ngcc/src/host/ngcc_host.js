(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/host/ngcc_host", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    exports.PRE_R3_MARKER = '__PRE_R3__';
    exports.POST_R3_MARKER = '__POST_R3__';
    function isSwitchableVariableDeclaration(node) {
        return ts.isVariableDeclaration(node) && !!node.initializer &&
            ts.isIdentifier(node.initializer) && node.initializer.text.endsWith(exports.PRE_R3_MARKER);
    }
    exports.isSwitchableVariableDeclaration = isSwitchableVariableDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvbmdjY19ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSXBCLFFBQUEsYUFBYSxHQUFHLFlBQVksQ0FBQztJQUM3QixRQUFBLGNBQWMsR0FBRyxhQUFhLENBQUM7SUFHNUMsU0FBZ0IsK0JBQStCLENBQUMsSUFBYTtRQUUzRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVc7WUFDdkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFhLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBSkQsMEVBSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDb25jcmV0ZURlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5cbmV4cG9ydCBjb25zdCBQUkVfUjNfTUFSS0VSID0gJ19fUFJFX1IzX18nO1xuZXhwb3J0IGNvbnN0IFBPU1RfUjNfTUFSS0VSID0gJ19fUE9TVF9SM19fJztcblxuZXhwb3J0IHR5cGUgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB0cy5WYXJpYWJsZURlY2xhcmF0aW9uICYge2luaXRpYWxpemVyOiB0cy5JZGVudGlmaWVyfTtcbmV4cG9ydCBmdW5jdGlvbiBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmICEhbm9kZS5pbml0aWFsaXplciAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUuaW5pdGlhbGl6ZXIpICYmIG5vZGUuaW5pdGlhbGl6ZXIudGV4dC5lbmRzV2l0aChQUkVfUjNfTUFSS0VSKTtcbn1cblxuLyoqXG4gKiBBIHN0cnVjdHVyZSByZXR1cm5lZCBmcm9tIGBnZXRNb2R1bGVXaXRoUHJvdmlkZXJJbmZvYCB0aGF0IGRlc2NyaWJlcyBmdW5jdGlvbnNcbiAqIHRoYXQgcmV0dXJuIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24ge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGRlY2xhcmVkIGZ1bmN0aW9uLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3QuXG4gICAqL1xuICBkZWNsYXJhdGlvbjogdHMuU2lnbmF0dXJlRGVjbGFyYXRpb247XG4gIC8qKlxuICAgKiBEZWNsYXJhdGlvbiBvZiB0aGUgY29udGFpbmluZyBjbGFzcyAoaWYgdGhpcyBpcyBhIG1ldGhvZClcbiAgICovXG4gIGNvbnRhaW5lcjogdHMuRGVjbGFyYXRpb258bnVsbDtcbiAgLyoqXG4gICAqIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3MgdGhhdCB0aGUgYG5nTW9kdWxlYCBwcm9wZXJ0eSBvbiB0aGUgYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdFxuICAgKiByZWZlcnMgdG8uXG4gICAqL1xuICBuZ01vZHVsZTogQ29uY3JldGVEZWNsYXJhdGlvbjxDbGFzc0RlY2xhcmF0aW9uPjtcbn1cblxuLyoqXG4gKiBUaGUgc3ltYm9sIGNvcnJlc3BvbmRpbmcgdG8gYSBcImNsYXNzXCIgZGVjbGFyYXRpb24uIEkuZS4gYSBgdHMuU3ltYm9sYCB3aG9zZSBgdmFsdWVEZWNsYXJhdGlvbmAgaXNcbiAqIGEgYENsYXNzRGVjbGFyYXRpb25gLlxuICovXG5leHBvcnQgdHlwZSBDbGFzc1N5bWJvbCA9IHRzLlN5bWJvbCAmIHt2YWx1ZURlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9ufTtcblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGEgY2xhc3MgdGhhdCBhY2NvdW50cyBmb3IgdGhlIHBvdGVudGlhbCBleGlzdGVuY2Ugb2YgdHdvIGBDbGFzc1N5bWJvbGBzIGZvciBhXG4gKiBnaXZlbiBjbGFzcywgYXMgdGhlIGNvbXBpbGVkIEphdmFTY3JpcHQgYnVuZGxlcyB0aGF0IG5nY2MgcmVmbGVjdHMgb24gY2FuIGhhdmUgdHdvIGRlY2xhcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjQ2xhc3NTeW1ib2wge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBzeW1ib2wgY29ycmVzcG9uZGluZyB3aXRoIHRoZSBvdXRlciBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3MuIFRoaXMgc2hvdWxkIGJlXG4gICAqIGNvbnNpZGVyZWQgdGhlIHB1YmxpYyBjbGFzcyBzeW1ib2wsIGkuZS4gaXRzIGRlY2xhcmF0aW9uIGlzIHZpc2libGUgdG8gdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW0uXG4gICAqL1xuICBkZWNsYXJhdGlvbjogQ2xhc3NTeW1ib2w7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIHN5bWJvbCBjb3JyZXNwb25kaW5nIHdpdGggdGhlIGlubmVyIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcywgcmVmZXJyZWQgdG8gYXMgaXRzXG4gICAqIFwiaW1wbGVtZW50YXRpb25cIi4gVGhpcyBpcyBub3QgbmVjZXNzYXJpbHkgYSBgQ2xhc3NTeW1ib2xgIGJ1dCByYXRoZXIganVzdCBhIGB0cy5TeW1ib2xgLCBhcyB0aGVcbiAgICogaW5uZXIgZGVjbGFyYXRpb24gZG9lcyBub3QgbmVlZCB0byBzYXRpc2Z5IHRoZSByZXF1aXJlbWVudHMgaW1wb3NlZCBvbiBhIHB1YmxpY2x5IHZpc2libGUgY2xhc3NcbiAgICogZGVjbGFyYXRpb24uXG4gICAqL1xuICBpbXBsZW1lbnRhdGlvbjogdHMuU3ltYm9sO1xufVxuXG4vKipcbiAqIEEgcmVmbGVjdGlvbiBob3N0IHRoYXQgaGFzIGV4dHJhIG1ldGhvZHMgZm9yIGxvb2tpbmcgYXQgbm9uLVR5cGVzY3JpcHQgcGFja2FnZSBmb3JtYXRzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1JlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgUmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBkZWNsYXJhdGlvbiBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3RcbiAgICogYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIFRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW107XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhbGwgZGVjb3JhdG9ycyBvZiBhIGdpdmVuIGNsYXNzIHN5bWJvbC5cbiAgICogQHBhcmFtIHN5bWJvbCBDbGFzcyBzeW1ib2wgdGhhdCBjYW4gcmVmZXIgdG8gYSBkZWNsYXJhdGlvbiB3aGljaCBjYW4gaG9sZCBkZWNvcmF0b3JzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBkZWNvcmF0b3JzIG9yIG51bGwgaWYgbm9uZSBhcmUgZGVjbGFyZWQuXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYWxsIGNsYXNzIHN5bWJvbHMgb2YgYSBnaXZlbiBzb3VyY2UgZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgY2xhc3Nlcy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZm91bmQgY2xhc3Mgc3ltYm9scy5cbiAgICovXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdO1xuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGluZm8gaXRlbXMgYWJvdXQgZWFjaCBvZiB0aGUgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIE1vZHVsZVdpdGhQcm92aWRlcnNcbiAgICogb2JqZWN0cy5cbiAgICovXG4gIGdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZjogdHMuU291cmNlRmlsZSk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbltdO1xuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBsYXN0IG5vZGUgdGhhdCBpcyByZWxldmFudCB0byB0aGUgc3BlY2lmaWVkIGNsYXNzLlxuICAgKlxuICAgKiBBcyB3ZWxsIGFzIHRoZSBtYWluIGRlY2xhcmF0aW9uLCBjbGFzc2VzIGNhbiBoYXZlIGFkZGl0aW9uYWwgc3RhdGVtZW50cyBzdWNoIGFzIHN0YXRpY1xuICAgKiBwcm9wZXJ0aWVzIChgU29tZUNsYXNzLnN0YXRpY1Byb3AgPSAuLi47YCkgYW5kIGRlY29yYXRvcnMgKGBfX2RlY29yYXRlKFNvbWVDbGFzcywgLi4uKTtgKS5cbiAgICogSXQgaXMgdXNlZnVsIHRvIGtub3cgZXhhY3RseSB3aGVyZSB0aGUgY2xhc3MgXCJlbmRzXCIgc28gdGhhdCB3ZSBjYW4gaW5qZWN0IGFkZGl0aW9uYWxcbiAgICogc3RhdGVtZW50cyBhZnRlciB0aGF0IHBvaW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudHMgd2Ugd2FudC5cbiAgICovXG4gIGdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLk5vZGU7XG59XG4iXX0=