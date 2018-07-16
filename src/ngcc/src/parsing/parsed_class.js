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
        define("@angular/compiler-cli/src/ngcc/src/parsing/parsed_class", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A simple container that holds the details of a decorated class that has been
     * parsed out of a package.
     */
    var ParsedClass = /** @class */ (function () {
        /**
         * Initialize a `DecoratedClass` that was found by parsing a package.
         * @param name The name of the class that has been found. This is mostly used
         * for informational purposes.
         * @param declaration The TypeScript AST node where this class is declared
         * @param decorators The collection of decorators that have been found on this class.
         */
        function ParsedClass(name, declaration, decorators) {
            this.name = name;
            this.declaration = declaration;
            this.decorators = decorators;
        }
        return ParsedClass;
    }());
    exports.ParsedClass = ParsedClass;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VkX2NsYXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9wYXJzaW5nL3BhcnNlZF9jbGFzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUtIOzs7T0FHRztJQUNIO1FBQ0U7Ozs7OztXQU1HO1FBQ0gscUJBQ1MsSUFBWSxFQUNaLFdBQTJCLEVBQzNCLFVBQXVCO1lBRnZCLFNBQUksR0FBSixJQUFJLENBQVE7WUFDWixnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFDM0IsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUM3QixDQUFDO1FBQ04sa0JBQUM7SUFBRCxDQUFDLEFBYkQsSUFhQztJQWJZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERlY29yYXRvciB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuXG4vKipcbiAqIEEgc2ltcGxlIGNvbnRhaW5lciB0aGF0IGhvbGRzIHRoZSBkZXRhaWxzIG9mIGEgZGVjb3JhdGVkIGNsYXNzIHRoYXQgaGFzIGJlZW5cbiAqIHBhcnNlZCBvdXQgb2YgYSBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgUGFyc2VkQ2xhc3Mge1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhIGBEZWNvcmF0ZWRDbGFzc2AgdGhhdCB3YXMgZm91bmQgYnkgcGFyc2luZyBhIHBhY2thZ2UuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBjbGFzcyB0aGF0IGhhcyBiZWVuIGZvdW5kLiBUaGlzIGlzIG1vc3RseSB1c2VkXG4gICAqIGZvciBpbmZvcm1hdGlvbmFsIHB1cnBvc2VzLlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIFR5cGVTY3JpcHQgQVNUIG5vZGUgd2hlcmUgdGhpcyBjbGFzcyBpcyBkZWNsYXJlZFxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBUaGUgY29sbGVjdGlvbiBvZiBkZWNvcmF0b3JzIHRoYXQgaGF2ZSBiZWVuIGZvdW5kIG9uIHRoaXMgY2xhc3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgbmFtZTogc3RyaW5nLFxuICAgIHB1YmxpYyBkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24sXG4gICAgcHVibGljIGRlY29yYXRvcnM6IERlY29yYXRvcltdLFxuICApIHt9XG59XG4iXX0=