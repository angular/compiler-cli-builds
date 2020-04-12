(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/tasks/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TaskDependencies = Map;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi90YXNrcy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUF5RGEsUUFBQSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEpzb25PYmplY3R9IGZyb20gJy4uLy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGFydGlhbGx5T3JkZXJlZExpc3R9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdW5pdCBvZiB3b3JrIHRvIGJlIHVuZGVydGFrZW4gYnkgYW4gYEV4ZWN1dG9yYC5cbiAqXG4gKiBBIHRhc2sgY29uc2lzdHMgb2YgcHJvY2Vzc2luZyBhIHNwZWNpZmljIGZvcm1hdCBwcm9wZXJ0eSBvZiBhbiBlbnRyeS1wb2ludC5cbiAqIFRoaXMgbWF5IG9yIG1heSBub3QgYWxzbyBpbmNsdWRlIHByb2Nlc3NpbmcgdGhlIHR5cGluZ3MgZm9yIHRoYXQgZW50cnktcG9pbnQsIHdoaWNoIG9ubHkgbmVlZHMgdG9cbiAqIGhhcHBlbiBvbmNlIGFjcm9zcyBhbGwgdGhlIGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGFzayBleHRlbmRzIEpzb25PYmplY3Qge1xuICAvKiogVGhlIGBFbnRyeVBvaW50YCB3aGljaCBuZWVkcyB0byBiZSBwcm9jZXNzZWQgYXMgcGFydCBvZiB0aGUgdGFzay4gKi9cbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcblxuICAvKipcbiAgICogVGhlIGBwYWNrYWdlLmpzb25gIGZvcm1hdCBwcm9wZXJ0eSB0byBwcm9jZXNzIChpLmUuIHRoZSBwcm9wZXJ0eSB3aGljaCBwb2ludHMgdG8gdGhlIGZpbGUgdGhhdFxuICAgKiBpcyB0aGUgcHJvZ3JhbSBlbnRyeS1wb2ludCkuXG4gICAqL1xuICBmb3JtYXRQcm9wZXJ0eTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcblxuICAvKipcbiAgICogVGhlIGxpc3Qgb2YgYWxsIGZvcm1hdCBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRhc2suZm9ybWF0UHJvcGVydHlgKSB0aGF0IHNob3VsZCBiZSBtYXJrZWQgYXNcbiAgICogcHJvY2Vzc2VkIG9uY2UgdGhlIHRhc2sgaGFzIGJlZW4gY29tcGxldGVkLCBiZWNhdXNlIHRoZXkgcG9pbnQgdG8gdGhlIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZVxuICAgKiBwcm9jZXNzZWQgYXMgcGFydCBvZiB0aGUgdGFzay5cbiAgICovXG4gIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuXG4gIC8qKiBXaGV0aGVyIHRvIGFsc28gcHJvY2VzcyB0eXBpbmdzIGZvciB0aGlzIGVudHJ5LXBvaW50IGFzIHBhcnQgb2YgdGhlIHRhc2suICovXG4gIHByb2Nlc3NEdHM6IGJvb2xlYW47XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHBhcnRpYWxseSBvcmRlcmVkIGxpc3Qgb2YgdGFza3MuXG4gKlxuICogVGhlIG9yZGVyaW5nL3ByZWNlZGVuY2Ugb2YgdGFza3MgaXMgZGV0ZXJtaW5lZCBieSB0aGUgaW50ZXItZGVwZW5kZW5jaWVzIGJldHdlZW4gdGhlaXIgYXNzb2NpYXRlZFxuICogZW50cnktcG9pbnRzLiBTcGVjaWZpY2FsbHksIHRoZSB0YXNrcycgb3JkZXIvcHJlY2VkZW5jZSBpcyBzdWNoIHRoYXQgdGFza3MgYXNzb2NpYXRlZCB0b1xuICogZGVwZW5kZW50IGVudHJ5LXBvaW50cyBhbHdheXMgY29tZSBhZnRlciB0YXNrcyBhc3NvY2lhdGVkIHdpdGggdGhlaXIgZGVwZW5kZW5jaWVzLlxuICpcbiAqIEFzIHJlc3VsdCBvZiB0aGlzIG9yZGVyaW5nLCBpdCBpcyBndWFyYW50ZWVkIHRoYXQgLSBieSBwcm9jZXNzaW5nIHRhc2tzIGluIHRoZSBvcmRlciBpbiB3aGljaFxuICogdGhleSBhcHBlYXIgaW4gdGhlIGxpc3QgLSBhIHRhc2sncyBkZXBlbmRlbmNpZXMgd2lsbCBhbHdheXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCBiZWZvcmUgcHJvY2Vzc2luZ1xuICogdGhlIHRhc2sgaXRzZWxmLlxuICpcbiAqIFNlZSBgRGVwZW5kZW5jeVJlc29sdmVyI3NvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSgpYC5cbiAqL1xuZXhwb3J0IHR5cGUgUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gUGFydGlhbGx5T3JkZXJlZExpc3Q8VGFzaz47XG5cbi8qKlxuICogQSBtYXBwaW5nIGZyb20gVGFza3MgdG8gdGhlIFRhc2tzIHRoYXQgZGVwZW5kIHVwb24gdGhlbSAoZGVwZW5kZW50cykuXG4gKi9cbmV4cG9ydCB0eXBlIFRhc2tEZXBlbmRlbmNpZXMgPSBNYXA8VGFzaywgU2V0PFRhc2s+PjtcbmV4cG9ydCBjb25zdCBUYXNrRGVwZW5kZW5jaWVzID0gTWFwO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdG8gY3JlYXRlIGEgVGFza0NvbXBsZXRlZENhbGxiYWNrIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgdHlwZSBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sgPSAodGFza1F1ZXVlOiBUYXNrUXVldWUpID0+IFRhc2tDb21wbGV0ZWRDYWxsYmFjaztcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbmNlIGEgdGFzayBoYXMgYmVlbiBwcm9jZXNzZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFRhc2tDb21wbGV0ZWRDYWxsYmFjayA9XG4gICAgKHRhc2s6IFRhc2ssIG91dGNvbWU6IFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgbWVzc2FnZTogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZDtcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBvdXRjb21lIG9mIHByb2Nlc3NpbmcgYSBgVGFza2AuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRhc2tQcm9jZXNzaW5nT3V0Y29tZSB7XG4gIC8qKiBTdWNjZXNzZnVsbHkgcHJvY2Vzc2VkIHRoZSB0YXJnZXQgZm9ybWF0IHByb3BlcnR5LiAqL1xuICBQcm9jZXNzZWQsXG4gIC8qKiBGYWlsZWQgdG8gcHJvY2VzcyB0aGUgdGFyZ2V0IGZvcm1hdC4gKi9cbiAgRmFpbGVkLFxufVxuXG4vKipcbiAqIEEgd3JhcHBlciBhcm91bmQgYSBsaXN0IG9mIHRhc2tzIGFuZCBwcm92aWRpbmcgdXRpbGl0eSBtZXRob2RzIGZvciBnZXR0aW5nIHRoZSBuZXh0IHRhc2sgb2ZcbiAqIGludGVyZXN0IGFuZCBkZXRlcm1pbmluZyB3aGVuIGFsbCB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLlxuICpcbiAqIChUaGlzIGFsbG93cyBkaWZmZXJlbnQgaW1wbGVtZW50YXRpb25zIHRvIGltcG9zZSBkaWZmZXJlbnQgY29uc3RyYWludHMgb24gd2hlbiBhIHRhc2snc1xuICogcHJvY2Vzc2luZyBjYW4gc3RhcnQuKVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tRdWV1ZSB7XG4gIC8qKiBXaGV0aGVyIGFsbCB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLiAqL1xuICBhbGxUYXNrc0NvbXBsZXRlZDogYm9vbGVhbjtcblxuICAvKipcbiAgICogR2V0IHRoZSBuZXh0IHRhc2sgd2hvc2UgcHJvY2Vzc2luZyBjYW4gc3RhcnQgKGlmIGFueSkuXG4gICAqXG4gICAqIFRoaXMgaW1wbGljaXRseSBtYXJrcyB0aGUgdGFzayBhcyBpbi1wcm9ncmVzcy5cbiAgICogKFRoaXMgaW5mb3JtYXRpb24gaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBhbGwgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC4pXG4gICAqXG4gICAqIEByZXR1cm4gVGhlIG5leHQgdGFzayBhdmFpbGFibGUgZm9yIHByb2Nlc3Npbmcgb3IgYG51bGxgLCBpZiBubyB0YXNrIGNhbiBiZSBwcm9jZXNzZWQgYXQgdGhlXG4gICAqICAgICAgICAgbW9tZW50IChpbmNsdWRpbmcgaWYgdGhlcmUgYXJlIG5vIG1vcmUgdW5wcm9jZXNzZWQgdGFza3MpLlxuICAgKi9cbiAgZ2V0TmV4dFRhc2soKTogVGFza3xudWxsO1xuXG4gIC8qKlxuICAgKiBNYXJrIGEgdGFzayBhcyBjb21wbGV0ZWQuXG4gICAqXG4gICAqIFRoaXMgcmVtb3ZlcyB0aGUgdGFzayBmcm9tIHRoZSBpbnRlcm5hbCBsaXN0IG9mIGluLXByb2dyZXNzIHRhc2tzLlxuICAgKiAoVGhpcyBpbmZvcm1hdGlvbiBpcyB1c2VkIHRvIGRldGVybWluZSB3aGV0aGVyIGFsbCB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLilcbiAgICpcbiAgICogQHBhcmFtIHRhc2sgVGhlIHRhc2sgdG8gbWFyayBhcyBjb21wbGV0ZWQuXG4gICAqL1xuICBtYXJrVGFza0NvbXBsZXRlZCh0YXNrOiBUYXNrKTogdm9pZDtcblxuICAvKipcbiAgICogTWFyayBhIHRhc2sgYXMgZmFpbGVkLlxuICAgKlxuICAgKiBEbyBub3QgcHJvY2VzcyB0aGUgdGFza3MgdGhhdCBkZXBlbmQgdXBvbiB0aGUgZ2l2ZW4gdGFzay5cbiAgICovXG4gIG1hcmtBc0ZhaWxlZCh0YXNrOiBUYXNrKTogdm9pZDtcblxuICAvKipcbiAgICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0YXNrIHF1ZXVlIChmb3IgZGVidWdnaW5nIHB1cnBvc2VzKS5cbiAgICpcbiAgICogQHJldHVybiBBIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFzayBxdWV1ZS5cbiAgICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZztcbn1cbiJdfQ==