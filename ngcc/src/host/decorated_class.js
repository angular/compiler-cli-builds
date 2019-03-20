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
        define("@angular/compiler-cli/ngcc/src/host/decorated_class", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A simple container that holds the details of a decorated class that has been
     * found in a `DecoratedFile`.
     */
    var DecoratedClass = /** @class */ (function () {
        /**
         * Initialize a `DecoratedClass` that was found in a `DecoratedFile`.
         * @param name The name of the class that has been found. This is mostly used
         * for informational purposes.
         * @param declaration The TypeScript AST node where this class is declared
         * @param decorators The collection of decorators that have been found on this class.
         */
        function DecoratedClass(name, declaration, decorators) {
            this.name = name;
            this.declaration = declaration;
            this.decorators = decorators;
        }
        return DecoratedClass;
    }());
    exports.DecoratedClass = DecoratedClass;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGVkX2NsYXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZGVjb3JhdGVkX2NsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0g7OztPQUdHO0lBQ0g7UUFDRTs7Ozs7O1dBTUc7UUFDSCx3QkFDVyxJQUFZLEVBQVMsV0FBMkIsRUFBUyxVQUF1QjtZQUFoRixTQUFJLEdBQUosSUFBSSxDQUFRO1lBQVMsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUFLLENBQUM7UUFDbkcscUJBQUM7SUFBRCxDQUFDLEFBVkQsSUFVQztJQVZZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5cbi8qKlxuICogQSBzaW1wbGUgY29udGFpbmVyIHRoYXQgaG9sZHMgdGhlIGRldGFpbHMgb2YgYSBkZWNvcmF0ZWQgY2xhc3MgdGhhdCBoYXMgYmVlblxuICogZm91bmQgaW4gYSBgRGVjb3JhdGVkRmlsZWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWNvcmF0ZWRDbGFzcyB7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGEgYERlY29yYXRlZENsYXNzYCB0aGF0IHdhcyBmb3VuZCBpbiBhIGBEZWNvcmF0ZWRGaWxlYC5cbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNsYXNzIHRoYXQgaGFzIGJlZW4gZm91bmQuIFRoaXMgaXMgbW9zdGx5IHVzZWRcbiAgICogZm9yIGluZm9ybWF0aW9uYWwgcHVycG9zZXMuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgVHlwZVNjcmlwdCBBU1Qgbm9kZSB3aGVyZSB0aGlzIGNsYXNzIGlzIGRlY2xhcmVkXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIFRoZSBjb2xsZWN0aW9uIG9mIGRlY29yYXRvcnMgdGhhdCBoYXZlIGJlZW4gZm91bmQgb24gdGhpcyBjbGFzcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIG5hbWU6IHN0cmluZywgcHVibGljIGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbiwgcHVibGljIGRlY29yYXRvcnM6IERlY29yYXRvcltdLCApIHt9XG59XG4iXX0=