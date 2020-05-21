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
        define("@angular/compiler-cli/src/ngtsc/incremental/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbC9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uL2ZpbGVfc3lzdGVtJztcblxuLyoqXG4gKiBJbnRlcmZhY2Ugb2YgdGhlIGluY3JlbWVudGFsIGJ1aWxkIGVuZ2luZS5cbiAqXG4gKiBgV2AgaXMgYSBnZW5lcmljIHR5cGUgcmVwcmVzZW50aW5nIGEgdW5pdCBvZiB3b3JrLiBUaGlzIGlzIGdlbmVyaWMgdG8gYXZvaWQgYSBjeWNsaWMgZGVwZW5kZW5jeVxuICogYmV0d2VlbiB0aGUgaW5jcmVtZW50YWwgZW5naW5lIEFQSSBkZWZpbml0aW9uIGFuZCBpdHMgY29uc3VtZXIocykuXG4gKiBgVGAgaXMgYSBnZW5lcmljIHR5cGUgcmVwcmVzZW50aW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZGF0YSBmb3IgYSBwYXJ0aWN1bGFyIGZpbGUsIHdoaWNoIGlzXG4gKiBnZW5lcmljIGZvciB0aGUgc2FtZSByZWFzb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxCdWlsZDxXLCBUPiB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgcHJpb3IgYW5hbHlzaXMgd29yaywgaWYgYW55LCBkb25lIGZvciB0aGUgZ2l2ZW4gc291cmNlIGZpbGUuXG4gICAqL1xuICBwcmlvcldvcmtGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBXW118bnVsbDtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIHByaW9yIHR5cGUtY2hlY2tpbmcgd29yaywgaWYgYW55LCB0aGF0J3MgYmVlbiBkb25lIGZvciB0aGUgZ2l2ZW4gc291cmNlIGZpbGUuXG4gICAqL1xuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBUfG51bGw7XG59XG5cbi8qKlxuICogVHJhY2tzIGRlcGVuZGVuY2llcyBiZXR3ZWVuIHNvdXJjZSBmaWxlcyBvciByZXNvdXJjZXMgaW4gdGhlIGFwcGxpY2F0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVuY3lUcmFja2VyPFQgZXh0ZW5kcyB7ZmlsZU5hbWU6IHN0cmluZ30gPSB0cy5Tb3VyY2VGaWxlPiB7XG4gIC8qKlxuICAgKiBSZWNvcmQgdGhhdCB0aGUgZmlsZSBgZnJvbWAgZGVwZW5kcyBvbiB0aGUgZmlsZSBgb25gLlxuICAgKi9cbiAgYWRkRGVwZW5kZW5jeShmcm9tOiBULCBvbjogVCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlY29yZCB0aGF0IHRoZSBmaWxlIGBmcm9tYCBkZXBlbmRzIG9uIHRoZSByZXNvdXJjZSBmaWxlIGBvbmAuXG4gICAqL1xuICBhZGRSZXNvdXJjZURlcGVuZGVuY3koZnJvbTogVCwgb246IEFic29sdXRlRnNQYXRoKTogdm9pZDtcblxuICAvKipcbiAgICogUmVjb3JkIHRoYXQgdGhlIGZpbGUgYGZyb21gIGRlcGVuZHMgb24gdGhlIGZpbGUgYG9uYCBhcyB3ZWxsIGFzIGBvbmAncyBkaXJlY3QgZGVwZW5kZW5jaWVzLlxuICAgKlxuICAgKiBUaGlzIG9wZXJhdGlvbiBpcyByZWlmaWVkIGltbWVkaWF0ZWx5LCBzbyBpZiBmdXR1cmUgZGVwZW5kZW5jaWVzIGFyZSBhZGRlZCB0byBgb25gIHRoZXkgd2lsbFxuICAgKiBub3QgYXV0b21hdGljYWxseSBiZSBhZGRlZCB0byBgZnJvbWAuXG4gICAqL1xuICBhZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShmcm9tOiBULCBvbjogVCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlY29yZCB0aGF0IHRoZSBmaWxlIGBmcm9tYCBkZXBlbmRzIG9uIHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYHJlc291cmNlc09mYC5cbiAgICpcbiAgICogVGhpcyBvcGVyYXRpb24gaXMgcmVpZmllZCBpbW1lZGlhdGVseSwgc28gaWYgZnV0dXJlIHJlc291cmNlIGRlcGVuZGVuY2llcyBhcmUgYWRkZWQgdG9cbiAgICogYHJlc291cmNlc09mYCB0aGV5IHdpbGwgbm90IGF1dG9tYXRpY2FsbHkgYmUgYWRkZWQgdG8gYGZyb21gLlxuICAgKi9cbiAgYWRkVHJhbnNpdGl2ZVJlc291cmNlcyhmcm9tOiBULCByZXNvdXJjZXNPZjogVCk6IHZvaWQ7XG59XG4iXX0=