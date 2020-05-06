(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/shims/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zaGltcy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0nO1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHNpbmdsZSBzaGltIGZpbGUgZm9yIHRoZSBlbnRpcmUgcHJvZ3JhbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUb3BMZXZlbFNoaW1HZW5lcmF0b3Ige1xuICAvKipcbiAgICogV2hldGhlciB0aGlzIHNoaW0gc2hvdWxkIGJlIGVtaXR0ZWQgZHVyaW5nIFR5cGVTY3JpcHQgZW1pdC5cbiAgICovXG4gIHJlYWRvbmx5IHNob3VsZEVtaXQ6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIGB0cy5Tb3VyY2VGaWxlYCByZXByZXNlbnRpbmcgdGhlIHNoaW0sIHdpdGggdGhlIGNvcnJlY3QgZmlsZW5hbWUuXG4gICAqL1xuICBtYWtlVG9wTGV2ZWxTaGltKCk6IHRzLlNvdXJjZUZpbGU7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgc2hpbSBmaWxlIGZvciBlYWNoIG9yaWdpbmFsIGB0cy5Tb3VyY2VGaWxlYCBpbiB0aGUgdXNlcidzIHByb2dyYW0sIHdpdGggYSBmaWxlXG4gKiBleHRlbnNpb24gcHJlZml4LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlckZpbGVTaGltR2VuZXJhdG9yIHtcbiAgLyoqXG4gICAqIFRoZSBleHRlbnNpb24gcHJlZml4IHdoaWNoIHdpbGwgYmUgdXNlZCBmb3IgdGhlIHNoaW0uXG4gICAqXG4gICAqIEtub3dpbmcgdGhpcyBhbGxvd3MgdGhlIGB0cy5Db21waWxlckhvc3RgIGltcGxlbWVudGF0aW9uIHdoaWNoIGlzIGNvbnN1bWluZyB0aGlzIHNoaW0gZ2VuZXJhdG9yXG4gICAqIHRvIHByZWRpY3QgdGhlIHNoaW0gZmlsZW5hbWUsIHdoaWNoIGlzIHVzZWZ1bCB3aGVuIGEgcHJldmlvdXMgYHRzLlByb2dyYW1gIGFscmVhZHkgaW5jbHVkZXMgYVxuICAgKiBnZW5lcmF0ZWQgdmVyc2lvbiBvZiB0aGUgc2hpbS5cbiAgICovXG4gIHJlYWRvbmx5IGV4dGVuc2lvblByZWZpeDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHNoaW1zIHByb2R1Y2VkIGJ5IHRoaXMgZ2VuZXJhdG9yIHNob3VsZCBiZSBlbWl0dGVkIGR1cmluZyBUeXBlU2NyaXB0IGVtaXQuXG4gICAqL1xuICByZWFkb25seSBzaG91bGRFbWl0OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0aGUgc2hpbSBmb3IgYSBnaXZlbiBvcmlnaW5hbCBgdHMuU291cmNlRmlsZWAsIHdpdGggdGhlIGdpdmVuIGZpbGVuYW1lLlxuICAgKi9cbiAgZ2VuZXJhdGVTaGltRm9yRmlsZShcbiAgICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcmlvclNoaW1TZjogdHMuU291cmNlRmlsZXxudWxsKTogdHMuU291cmNlRmlsZTtcbn1cbiJdfQ==