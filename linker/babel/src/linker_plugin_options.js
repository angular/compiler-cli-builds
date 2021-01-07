(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/linker/babel/src/linker_plugin_options", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX3BsdWdpbl9vcHRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL2xpbmtlci9iYWJlbC9zcmMvbGlua2VyX3BsdWdpbl9vcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7TGlua2VyT3B0aW9uc30gZnJvbSAnLi4vLi4nO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcblxuZXhwb3J0IGludGVyZmFjZSBMaW5rZXJQbHVnaW5PcHRpb25zIGV4dGVuZHMgUGFydGlhbDxMaW5rZXJPcHRpb25zPiB7XG4gIC8qKlxuICAgKiBGaWxlLXN5c3RlbSwgdXNlZCB0byBsb2FkIHVwIHRoZSBpbnB1dCBzb3VyY2UtbWFwIGFuZCBjb250ZW50LlxuICAgKi9cbiAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbTtcblxuICAvKipcbiAgICogTG9nZ2VyIHVzZWQgYnkgdGhlIGxpbmtlci5cbiAgICovXG4gIGxvZ2dlcjogTG9nZ2VyO1xufVxuIl19