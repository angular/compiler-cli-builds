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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGVkX2NsYXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZGVjb3JhdGVkX2NsYXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBSUg7OztPQUdHO0lBQ0g7UUFDRTs7Ozs7O1dBTUc7UUFDSCx3QkFDVyxJQUFZLEVBQVMsV0FBNkIsRUFBUyxVQUF1QjtZQUFsRixTQUFJLEdBQUosSUFBSSxDQUFRO1lBQVMsZ0JBQVcsR0FBWCxXQUFXLENBQWtCO1lBQVMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUFHLENBQUM7UUFDbkcscUJBQUM7SUFBRCxDQUFDLEFBVkQsSUFVQztJQVZZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuXG4vKipcbiAqIEEgc2ltcGxlIGNvbnRhaW5lciB0aGF0IGhvbGRzIHRoZSBkZXRhaWxzIG9mIGEgZGVjb3JhdGVkIGNsYXNzIHRoYXQgaGFzIGJlZW5cbiAqIGZvdW5kIGluIGEgYERlY29yYXRlZEZpbGVgLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGVkQ2xhc3Mge1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhIGBEZWNvcmF0ZWRDbGFzc2AgdGhhdCB3YXMgZm91bmQgaW4gYSBgRGVjb3JhdGVkRmlsZWAuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBjbGFzcyB0aGF0IGhhcyBiZWVuIGZvdW5kLiBUaGlzIGlzIG1vc3RseSB1c2VkXG4gICAqIGZvciBpbmZvcm1hdGlvbmFsIHB1cnBvc2VzLlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIFR5cGVTY3JpcHQgQVNUIG5vZGUgd2hlcmUgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZFxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBUaGUgY29sbGVjdGlvbiBvZiBkZWNvcmF0b3JzIHRoYXQgaGF2ZSBiZWVuIGZvdW5kIG9uIHRoaXMgY2xhc3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcsIHB1YmxpYyBkZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbiwgcHVibGljIGRlY29yYXRvcnM6IERlY29yYXRvcltdKSB7fVxufVxuIl19