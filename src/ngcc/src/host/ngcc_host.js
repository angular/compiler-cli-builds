(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/host/ngcc_host", ["require", "exports", "typescript"], factory);
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
    exports.PRE_NGCC_MARKER = '__PRE_NGCC__';
    exports.POST_NGCC_MARKER = '__POST_NGCC__';
    function isSwitchableVariableDeclaration(node) {
        return ts.isVariableDeclaration(node) && !!node.initializer &&
            ts.isIdentifier(node.initializer) && node.initializer.text.endsWith(exports.PRE_NGCC_MARKER);
    }
    exports.isSwitchableVariableDeclaration = isSwitchableVariableDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L25nY2NfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdwQixRQUFBLGVBQWUsR0FBRyxjQUFjLENBQUM7SUFDakMsUUFBQSxnQkFBZ0IsR0FBRyxlQUFlLENBQUM7SUFHaEQsU0FBZ0IsK0JBQStCLENBQUMsSUFBYTtRQUUzRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVc7WUFDdkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUFlLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBSkQsMEVBSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuXG5leHBvcnQgY29uc3QgUFJFX05HQ0NfTUFSS0VSID0gJ19fUFJFX05HQ0NfXyc7XG5leHBvcnQgY29uc3QgUE9TVF9OR0NDX01BUktFUiA9ICdfX1BPU1RfTkdDQ19fJztcblxuZXhwb3J0IHR5cGUgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB0cy5WYXJpYWJsZURlY2xhcmF0aW9uICYge2luaXRpYWxpemVyOiB0cy5JZGVudGlmaWVyfTtcbmV4cG9ydCBmdW5jdGlvbiBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmICEhbm9kZS5pbml0aWFsaXplciAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUuaW5pdGlhbGl6ZXIpICYmIG5vZGUuaW5pdGlhbGl6ZXIudGV4dC5lbmRzV2l0aChQUkVfTkdDQ19NQVJLRVIpO1xufVxuXG4vKipcbiAqIEEgcmVmbGVjdGlvbiBob3N0IHRoYXQgaGFzIGV4dHJhIG1ldGhvZHMgZm9yIGxvb2tpbmcgYXQgbm9uLVR5cGVzY3JpcHQgcGFja2FnZSBmb3JtYXRzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1JlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgUmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBkZWNsYXJhdGlvbiBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3RcbiAgICogYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKG5vZGU6IHRzLk5vZGUpOiB0cy5TeW1ib2x8dW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX05HQ0NfTUFSS0VSYC5cbiAgICogQHBhcmFtIG1vZHVsZSBUaGUgbW9kdWxlIGluIHdoaWNoIHRvIHNlYXJjaCBmb3Igc3dpdGNoYWJsZSBkZWNsYXJhdGlvbnMuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyB0aGF0IG1hdGNoLlxuICAgKi9cbiAgZ2V0U3dpdGNoYWJsZURlY2xhcmF0aW9ucyhtb2R1bGU6IHRzLk5vZGUpOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdO1xufVxuIl19