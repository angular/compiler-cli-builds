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
        define("angular/packages/compiler-cli/src/ngcc/src/parser/parser", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var DecoratedClass = /** @class */ (function () {
        function DecoratedClass(name, declaration, decorators) {
            this.name = name;
            this.declaration = declaration;
            this.decorators = decorators;
        }
        return DecoratedClass;
    }());
    exports.DecoratedClass = DecoratedClass;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9wYXJzZXIvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0g7UUFDRSx3QkFDUyxJQUFZLEVBQ1osV0FBMkIsRUFDM0IsVUFBdUI7WUFGdkIsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUNaLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUMzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQzdCLENBQUM7UUFDTixxQkFBQztJQUFELENBQUMsQUFORCxJQU1DO0lBTlksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgRGVjb3JhdG9yIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5cbmV4cG9ydCBjbGFzcyBEZWNvcmF0ZWRDbGFzcyB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcsXG4gICAgcHVibGljIGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbixcbiAgICBwdWJsaWMgZGVjb3JhdG9yczogRGVjb3JhdG9yW10sXG4gICkge31cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlUGFyc2VyIHtcbiAgLyoqXG4gICAqIFBhcnNlIGEgc291cmNlIGZpbGUgYW5kIGlkZW50aWZ5IGFsbCB0aGUgZGVjbGFyYXRpb25zIHRoYXQgcmVwcmVzZW50IGV4cG9ydGVkIGNsYXNzZXMsXG4gICAqIHdoaWNoIGFyZSBhbHNvIGRlY29yYXRlZC5cbiAgICpcbiAgICogSWRlbnRpZnlpbmcgY2xhc3NlcyBjYW4gYmUgZGlmZmVyZW50IGRlcGVuZGluZyB1cG9uIHRoZSBmb3JtYXQgb2YgdGhlIHNvdXJjZSBmaWxlLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogLSBFUzIwMTUgZmlsZXMgY29udGFpbiBgY2xhc3MgWHh4eCB7Li4ufWAgc3R5bGUgZGVjbGFyYXRpb25zXG4gICAqIC0gRVM1IGZpbGVzIGNvbnRhaW4gYHZhciBYeHh4ID0gKGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gWHh4eCgpIHsgLi4uIH07IHJldHVybiBYeHh4OyB9KSgpO2Agc3R5bGVcbiAgICogICBkZWNsYXJhdGlvbnNcbiAgICogLSBVTUQgaGF2ZSBzaW1pbGFyIGRlY2xhcmF0aW9ucyB0byBFUzUgZmlsZXMgYnV0IHRoZSB3aG9sZSB0aGluZyBpcyB3cmFwcGVkIGluIElJRkUgbW9kdWxlIHdyYXBwZXJcbiAgICogICBmdW5jdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgdGhlIGZpbGUgY29udGFpbmluZyBjbGFzc2VzIHRvIHBhcnNlLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBUeXBlU2NyaXB0IGRlY2xhcmF0aW9uIG5vZGVzIHRoYXQgcmVwcmVzZW50IHRoZSBleHBvcnRlZCBjbGFzc2VzLlxuICAgKi9cbiAgZ2V0RGVjb3JhdGVkQ2xhc3Nlcyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogRGVjb3JhdGVkQ2xhc3NbXTtcbn1cbiJdfQ==