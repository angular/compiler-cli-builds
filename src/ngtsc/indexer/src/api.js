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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Describes the kind of identifier found in a template.
     */
    var IdentifierKind;
    (function (IdentifierKind) {
        IdentifierKind[IdentifierKind["Property"] = 0] = "Property";
        IdentifierKind[IdentifierKind["Method"] = 1] = "Method";
    })(IdentifierKind = exports.IdentifierKind || (exports.IdentifierKind = {}));
    /**
     * Describes the absolute byte offsets of a text anchor in a source code.
     */
    var AbsoluteSourceSpan = /** @class */ (function () {
        function AbsoluteSourceSpan(start, end) {
            this.start = start;
            this.end = end;
        }
        return AbsoluteSourceSpan;
    }());
    exports.AbsoluteSourceSpan = AbsoluteSourceSpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFNSDs7T0FFRztJQUNILElBQVksY0FHWDtJQUhELFdBQVksY0FBYztRQUN4QiwyREFBUSxDQUFBO1FBQ1IsdURBQU0sQ0FBQTtJQUNSLENBQUMsRUFIVyxjQUFjLEdBQWQsc0JBQWMsS0FBZCxzQkFBYyxRQUd6QjtJQUVEOztPQUVHO0lBQ0g7UUFDRSw0QkFBbUIsS0FBYSxFQUFTLEdBQVc7WUFBakMsVUFBSyxHQUFMLEtBQUssQ0FBUTtZQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBRyxDQUFDO1FBQzFELHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW50ZXJwb2xhdGlvbkNvbmZpZywgUGFyc2VTb3VyY2VGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1BhcnNlVGVtcGxhdGVPcHRpb25zfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy92aWV3L3RlbXBsYXRlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIERlc2NyaWJlcyB0aGUga2luZCBvZiBpZGVudGlmaWVyIGZvdW5kIGluIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBlbnVtIElkZW50aWZpZXJLaW5kIHtcbiAgUHJvcGVydHksXG4gIE1ldGhvZCxcbn1cblxuLyoqXG4gKiBEZXNjcmliZXMgdGhlIGFic29sdXRlIGJ5dGUgb2Zmc2V0cyBvZiBhIHRleHQgYW5jaG9yIGluIGEgc291cmNlIGNvZGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBBYnNvbHV0ZVNvdXJjZVNwYW4ge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgc3RhcnQ6IG51bWJlciwgcHVibGljIGVuZDogbnVtYmVyKSB7fVxufVxuXG4vKipcbiAqIERlc2NyaWJlcyBhIHNlbWFudGljYWxseS1pbnRlcmVzdGluZyBpZGVudGlmaWVyIGluIGEgdGVtcGxhdGUsIHN1Y2ggYXMgYW4gaW50ZXJwb2xhdGVkIHZhcmlhYmxlXG4gKiBvciBzZWxlY3Rvci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUlkZW50aWZpZXIge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNwYW46IEFic29sdXRlU291cmNlU3BhbjtcbiAga2luZDogSWRlbnRpZmllcktpbmQ7XG4gIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbn1cblxuLyoqXG4gKiBEZXNjcmliZXMgYW4gYW5hbHl6ZWQsIGluZGV4ZWQgY29tcG9uZW50IGFuZCBpdHMgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5kZXhlZENvbXBvbmVudCB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2VsZWN0b3I6IHN0cmluZ3xudWxsO1xuICBzb3VyY2VGaWxlOiBzdHJpbmc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgdGVtcGxhdGU6IHtcbiAgICBpZGVudGlmaWVyczogU2V0PFRlbXBsYXRlSWRlbnRpZmllcj4sXG4gICAgdXNlZENvbXBvbmVudHM6IFNldDx0cy5DbGFzc0RlY2xhcmF0aW9uPixcbiAgfTtcbn1cblxuLyoqXG4gKiBPcHRpb25zIGZvciByZXN0b3JpbmcgYSBwYXJzZWQgdGVtcGxhdGUuIFNlZSBgdGVtcGxhdGUudHMjcmVzdG9yZVRlbXBsYXRlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXN0b3JlVGVtcGxhdGVPcHRpb25zIGV4dGVuZHMgUGFyc2VUZW1wbGF0ZU9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIGludGVycG9sYXRpb24gY29uZmlndXJhdGlvbiBvZiB0aGUgdGVtcGxhdGUgaXMgbG9zdCBhZnRlciBpdCBhbHJlYWR5XG4gICAqIHBhcnNlZCwgc28gaXQgbXVzdCBiZSByZXNwZWNpZmllZC5cbiAgICovXG4gIGludGVycG9sYXRpb25Db25maWc6IEludGVycG9sYXRpb25Db25maWc7XG59XG4iXX0=