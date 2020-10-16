/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/typecheck/api/completion", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CompletionKind = void 0;
    /**
     * Discriminant of an autocompletion source (a `Completion`).
     */
    var CompletionKind;
    (function (CompletionKind) {
        CompletionKind[CompletionKind["ContextComponent"] = 0] = "ContextComponent";
        CompletionKind[CompletionKind["Reference"] = 1] = "Reference";
        CompletionKind[CompletionKind["Variable"] = 2] = "Variable";
    })(CompletionKind = exports.CompletionKind || (exports.CompletionKind = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaS9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQWdCSDs7T0FFRztJQUNILElBQVksY0FJWDtJQUpELFdBQVksY0FBYztRQUN4QiwyRUFBZ0IsQ0FBQTtRQUNoQiw2REFBUyxDQUFBO1FBQ1QsMkRBQVEsQ0FBQTtJQUNWLENBQUMsRUFKVyxjQUFjLEdBQWQsc0JBQWMsS0FBZCxzQkFBYyxRQUl6QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1RtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge1NoaW1Mb2NhdGlvbn0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBBbiBhdXRvY29tcGxldGlvbiBzb3VyY2Ugb2YgYW55IGtpbmQuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBsZXRpb24gPSBDb21wbGV0aW9uQ29udGV4dENvbXBvbmVudHxDb21wbGV0aW9uUmVmZXJlbmNlfENvbXBsZXRpb25WYXJpYWJsZTtcblxuLyoqXG4gKiBBbiBhdXRvY29tcGxldGlvbiBzb3VyY2UgdGhhdCBkcml2ZXMgY29tcGxldGlvbiBpbiBhIGdsb2JhbCBjb250ZXh0LlxuICovXG5leHBvcnQgdHlwZSBHbG9iYWxDb21wbGV0aW9uID0gQ29tcGxldGlvbkNvbnRleHRDb21wb25lbnR8Q29tcGxldGlvblJlZmVyZW5jZXxDb21wbGV0aW9uVmFyaWFibGU7XG5cbi8qKlxuICogRGlzY3JpbWluYW50IG9mIGFuIGF1dG9jb21wbGV0aW9uIHNvdXJjZSAoYSBgQ29tcGxldGlvbmApLlxuICovXG5leHBvcnQgZW51bSBDb21wbGV0aW9uS2luZCB7XG4gIENvbnRleHRDb21wb25lbnQsXG4gIFJlZmVyZW5jZSxcbiAgVmFyaWFibGUsXG59XG5cbi8qKlxuICogQW4gYXV0b2NvbXBsZXRpb24gc291cmNlIGJhY2tlZCBieSBhIHNoaW0gZmlsZSBwb3NpdGlvbiB3aGVyZSBUUyBBUElzIGNhbiBiZSB1c2VkIHRvIHJldHJpZXZlXG4gKiBjb21wbGV0aW9ucyBmb3IgdGhlIGNvbnRleHQgY29tcG9uZW50IG9mIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGlvbkNvbnRleHRDb21wb25lbnQgZXh0ZW5kcyBTaGltTG9jYXRpb24ge1xuICBraW5kOiBDb21wbGV0aW9uS2luZC5Db250ZXh0Q29tcG9uZW50O1xufVxuXG4vKipcbiAqIEFuIGF1dG9jb21wbGV0aW9uIHJlc3VsdCByZXByZXNlbnRpbmcgYSBsb2NhbCByZWZlcmVuY2UgZGVjbGFyZWQgaW4gdGhlIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBsZXRpb25SZWZlcmVuY2Uge1xuICBraW5kOiBDb21wbGV0aW9uS2luZC5SZWZlcmVuY2U7XG5cbiAgLyoqXG4gICAqIFRoZSBgVG1wbEFzdFJlZmVyZW5jZWAgZnJvbSB0aGUgdGVtcGxhdGUgd2hpY2ggc2hvdWxkIGJlIGF2YWlsYWJsZSBhcyBhIGNvbXBsZXRpb24uXG4gICAqL1xuICBub2RlOiBUbXBsQXN0UmVmZXJlbmNlO1xufVxuXG4vKipcbiAqIEFuIGF1dG9jb21wbGV0aW9uIHJlc3VsdCByZXByZXNlbnRpbmcgYSB2YXJpYWJsZSBkZWNsYXJlZCBpbiB0aGUgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGlvblZhcmlhYmxlIHtcbiAga2luZDogQ29tcGxldGlvbktpbmQuVmFyaWFibGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgVG1wbEFzdFZhcmlhYmxlYCBmcm9tIHRoZSB0ZW1wbGF0ZSB3aGljaCBzaG91bGQgYmUgYXZhaWxhYmxlIGFzIGEgY29tcGxldGlvbi5cbiAgICovXG4gIG5vZGU6IFRtcGxBc3RWYXJpYWJsZTtcbn1cbiJdfQ==