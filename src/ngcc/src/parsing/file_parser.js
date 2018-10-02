(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/parsing/file_parser", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZmlsZV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNlZF9maWxlJztcblxuLyoqXG4gKiBDbGFzc2VzIHRoYXQgaW1wbGVtZW50IHRoaXMgaW50ZXJmYWNlIGNhbiBwYXJzZSBhIGZpbGUgaW4gYSBwYWNrYWdlIHRvXG4gKiBmaW5kIHRoZSBcImRlY2xhcmF0aW9uc1wiIChyZXByZXNlbnRpbmcgZXhwb3J0ZWQgY2xhc3NlcyksIHRoYXQgYXJlIGRlY29yYXRlZCB3aXRoIGNvcmVcbiAqIGRlY29yYXRvcnMsIHN1Y2ggYXMgYEBDb21wb25lbnRgLCBgQEluamVjdGFibGVgLCBldGMuXG4gKlxuICogSWRlbnRpZnlpbmcgY2xhc3NlcyBjYW4gYmUgZGlmZmVyZW50IGRlcGVuZGluZyB1cG9uIHRoZSBmb3JtYXQgb2YgdGhlIHNvdXJjZSBmaWxlLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIC0gRVMyMDE1IGZpbGVzIGNvbnRhaW4gYGNsYXNzIFh4eHggey4uLn1gIHN0eWxlIGRlY2xhcmF0aW9uc1xuICogLSBFUzUgZmlsZXMgY29udGFpbiBgdmFyIFh4eHggPSAoZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBYeHh4KCkgeyAuLi4gfTsgcmV0dXJuIFh4eHg7IH0pKCk7YCBzdHlsZVxuICogICBkZWNsYXJhdGlvbnNcbiAqIC0gVU1EIGhhdmUgc2ltaWxhciBkZWNsYXJhdGlvbnMgdG8gRVM1IGZpbGVzIGJ1dCB0aGUgd2hvbGUgdGhpbmcgaXMgd3JhcHBlZCBpbiBJSUZFIG1vZHVsZVxuICogd3JhcHBlclxuICogICBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlUGFyc2VyIHtcbiAgLyoqXG4gICAqIFBhcnNlIGEgZmlsZSB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGNsYXNzZXMuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlIFRoZSB0aGUgZW50cnkgcG9pbnQgZmlsZSBmb3IgaWRlbnRpZnlpbmcgY2xhc3NlcyB0byBwcm9jZXNzLlxuICAgKiBAcmV0dXJucyBBIGBQYXJzZWRGaWxlc2AgY29sbGVjdGlvbiB0aGF0IGhvbGRzIHRoZSBkZWNvcmF0ZWQgY2xhc3NlcyBhbmQgaW1wb3J0IGluZm9ybWF0aW9uLlxuICAgKi9cbiAgcGFyc2VGaWxlKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBQYXJzZWRGaWxlW107XG59XG4iXX0=