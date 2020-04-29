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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi90YXNrcy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUF5RGEsUUFBQSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEpzb25PYmplY3R9IGZyb20gJy4uLy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGFydGlhbGx5T3JkZXJlZExpc3R9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdW5pdCBvZiB3b3JrIHRvIGJlIHVuZGVydGFrZW4gYnkgYW4gYEV4ZWN1dG9yYC5cbiAqXG4gKiBBIHRhc2sgY29uc2lzdHMgb2YgcHJvY2Vzc2luZyBhIHNwZWNpZmljIGZvcm1hdCBwcm9wZXJ0eSBvZiBhbiBlbnRyeS1wb2ludC5cbiAqIFRoaXMgbWF5IG9yIG1heSBub3QgYWxzbyBpbmNsdWRlIHByb2Nlc3NpbmcgdGhlIHR5cGluZ3MgZm9yIHRoYXQgZW50cnktcG9pbnQsIHdoaWNoIG9ubHkgbmVlZHMgdG9cbiAqIGhhcHBlbiBvbmNlIGFjcm9zcyBhbGwgdGhlIGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGFzayBleHRlbmRzIEpzb25PYmplY3Qge1xuICAvKiogVGhlIGBFbnRyeVBvaW50YCB3aGljaCBuZWVkcyB0byBiZSBwcm9jZXNzZWQgYXMgcGFydCBvZiB0aGUgdGFzay4gKi9cbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcblxuICAvKipcbiAgICogVGhlIGBwYWNrYWdlLmpzb25gIGZvcm1hdCBwcm9wZXJ0eSB0byBwcm9jZXNzIChpLmUuIHRoZSBwcm9wZXJ0eSB3aGljaCBwb2ludHMgdG8gdGhlIGZpbGUgdGhhdFxuICAgKiBpcyB0aGUgcHJvZ3JhbSBlbnRyeS1wb2ludCkuXG4gICAqL1xuICBmb3JtYXRQcm9wZXJ0eTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcblxuICAvKipcbiAgICogVGhlIGxpc3Qgb2YgYWxsIGZvcm1hdCBwcm9wZXJ0aWVzIChpbmNsdWRpbmcgYHRhc2suZm9ybWF0UHJvcGVydHlgKSB0aGF0IHNob3VsZCBiZSBtYXJrZWQgYXNcbiAgICogcHJvY2Vzc2VkIG9uY2UgdGhlIHRhc2sgaGFzIGJlZW4gY29tcGxldGVkLCBiZWNhdXNlIHRoZXkgcG9pbnQgdG8gdGhlIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZVxuICAgKiBwcm9jZXNzZWQgYXMgcGFydCBvZiB0aGUgdGFzay5cbiAgICovXG4gIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuXG4gIC8qKiBXaGV0aGVyIHRvIGFsc28gcHJvY2VzcyB0eXBpbmdzIGZvciB0aGlzIGVudHJ5LXBvaW50IGFzIHBhcnQgb2YgdGhlIHRhc2suICovXG4gIHByb2Nlc3NEdHM6IGJvb2xlYW47XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHBhcnRpYWxseSBvcmRlcmVkIGxpc3Qgb2YgdGFza3MuXG4gKlxuICogVGhlIG9yZGVyaW5nL3ByZWNlZGVuY2Ugb2YgdGFza3MgaXMgZGV0ZXJtaW5lZCBieSB0aGUgaW50ZXItZGVwZW5kZW5jaWVzIGJldHdlZW4gdGhlaXIgYXNzb2NpYXRlZFxuICogZW50cnktcG9pbnRzLiBTcGVjaWZpY2FsbHksIHRoZSB0YXNrcycgb3JkZXIvcHJlY2VkZW5jZSBpcyBzdWNoIHRoYXQgdGFza3MgYXNzb2NpYXRlZCB0b1xuICogZGVwZW5kZW50IGVudHJ5LXBvaW50cyBhbHdheXMgY29tZSBhZnRlciB0YXNrcyBhc3NvY2lhdGVkIHdpdGggdGhlaXIgZGVwZW5kZW5jaWVzLlxuICpcbiAqIEFzIHJlc3VsdCBvZiB0aGlzIG9yZGVyaW5nLCBpdCBpcyBndWFyYW50ZWVkIHRoYXQgLSBieSBwcm9jZXNzaW5nIHRhc2tzIGluIHRoZSBvcmRlciBpbiB3aGljaFxuICogdGhleSBhcHBlYXIgaW4gdGhlIGxpc3QgLSBhIHRhc2sncyBkZXBlbmRlbmNpZXMgd2lsbCBhbHdheXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCBiZWZvcmUgcHJvY2Vzc2luZ1xuICogdGhlIHRhc2sgaXRzZWxmLlxuICpcbiAqIFNlZSBgRGVwZW5kZW5jeVJlc29sdmVyI3NvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSgpYC5cbiAqL1xuZXhwb3J0IHR5cGUgUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gUGFydGlhbGx5T3JkZXJlZExpc3Q8VGFzaz47XG5cbi8qKlxuICogQSBtYXBwaW5nIGZyb20gVGFza3MgdG8gdGhlIFRhc2tzIHRoYXQgZGVwZW5kIHVwb24gdGhlbSAoZGVwZW5kZW50cykuXG4gKi9cbmV4cG9ydCB0eXBlIFRhc2tEZXBlbmRlbmNpZXMgPSBNYXA8VGFzaywgU2V0PFRhc2s+PjtcbmV4cG9ydCBjb25zdCBUYXNrRGVwZW5kZW5jaWVzID0gTWFwO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdG8gY3JlYXRlIGEgVGFza0NvbXBsZXRlZENhbGxiYWNrIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgdHlwZSBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sgPSAodGFza1F1ZXVlOiBUYXNrUXVldWUpID0+IFRhc2tDb21wbGV0ZWRDYWxsYmFjaztcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbmNlIGEgdGFzayBoYXMgYmVlbiBwcm9jZXNzZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFRhc2tDb21wbGV0ZWRDYWxsYmFjayA9XG4gICAgKHRhc2s6IFRhc2ssIG91dGNvbWU6IFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgbWVzc2FnZTogc3RyaW5nfG51bGwpID0+IHZvaWQ7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgb3V0Y29tZSBvZiBwcm9jZXNzaW5nIGEgYFRhc2tgLlxuICovXG5leHBvcnQgY29uc3QgZW51bSBUYXNrUHJvY2Vzc2luZ091dGNvbWUge1xuICAvKiogU3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZCB0aGUgdGFyZ2V0IGZvcm1hdCBwcm9wZXJ0eS4gKi9cbiAgUHJvY2Vzc2VkLFxuICAvKiogRmFpbGVkIHRvIHByb2Nlc3MgdGhlIHRhcmdldCBmb3JtYXQuICovXG4gIEZhaWxlZCxcbn1cblxuLyoqXG4gKiBBIHdyYXBwZXIgYXJvdW5kIGEgbGlzdCBvZiB0YXNrcyBhbmQgcHJvdmlkaW5nIHV0aWxpdHkgbWV0aG9kcyBmb3IgZ2V0dGluZyB0aGUgbmV4dCB0YXNrIG9mXG4gKiBpbnRlcmVzdCBhbmQgZGV0ZXJtaW5pbmcgd2hlbiBhbGwgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC5cbiAqXG4gKiAoVGhpcyBhbGxvd3MgZGlmZmVyZW50IGltcGxlbWVudGF0aW9ucyB0byBpbXBvc2UgZGlmZmVyZW50IGNvbnN0cmFpbnRzIG9uIHdoZW4gYSB0YXNrJ3NcbiAqIHByb2Nlc3NpbmcgY2FuIHN0YXJ0LilcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUYXNrUXVldWUge1xuICAvKiogV2hldGhlciBhbGwgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC4gKi9cbiAgYWxsVGFza3NDb21wbGV0ZWQ6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbmV4dCB0YXNrIHdob3NlIHByb2Nlc3NpbmcgY2FuIHN0YXJ0IChpZiBhbnkpLlxuICAgKlxuICAgKiBUaGlzIGltcGxpY2l0bHkgbWFya3MgdGhlIHRhc2sgYXMgaW4tcHJvZ3Jlc3MuXG4gICAqIChUaGlzIGluZm9ybWF0aW9uIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYWxsIHRhc2tzIGhhdmUgYmVlbiBjb21wbGV0ZWQuKVxuICAgKlxuICAgKiBAcmV0dXJuIFRoZSBuZXh0IHRhc2sgYXZhaWxhYmxlIGZvciBwcm9jZXNzaW5nIG9yIGBudWxsYCwgaWYgbm8gdGFzayBjYW4gYmUgcHJvY2Vzc2VkIGF0IHRoZVxuICAgKiAgICAgICAgIG1vbWVudCAoaW5jbHVkaW5nIGlmIHRoZXJlIGFyZSBubyBtb3JlIHVucHJvY2Vzc2VkIHRhc2tzKS5cbiAgICovXG4gIGdldE5leHRUYXNrKCk6IFRhc2t8bnVsbDtcblxuICAvKipcbiAgICogTWFyayBhIHRhc2sgYXMgY29tcGxldGVkLlxuICAgKlxuICAgKiBUaGlzIHJlbW92ZXMgdGhlIHRhc2sgZnJvbSB0aGUgaW50ZXJuYWwgbGlzdCBvZiBpbi1wcm9ncmVzcyB0YXNrcy5cbiAgICogKFRoaXMgaW5mb3JtYXRpb24gaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBhbGwgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC4pXG4gICAqXG4gICAqIEBwYXJhbSB0YXNrIFRoZSB0YXNrIHRvIG1hcmsgYXMgY29tcGxldGVkLlxuICAgKi9cbiAgbWFya0FzQ29tcGxldGVkKHRhc2s6IFRhc2spOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBNYXJrIGEgdGFzayBhcyBmYWlsZWQuXG4gICAqXG4gICAqIERvIG5vdCBwcm9jZXNzIHRoZSB0YXNrcyB0aGF0IGRlcGVuZCB1cG9uIHRoZSBnaXZlbiB0YXNrLlxuICAgKi9cbiAgbWFya0FzRmFpbGVkKHRhc2s6IFRhc2spOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBNYXJrIGEgdGFzayBhcyBub3QgcHJvY2Vzc2VkIChpLmUuIGFkZCBhbiBpbi1wcm9ncmVzcyB0YXNrIGJhY2sgdG8gdGhlIHF1ZXVlKS5cbiAgICpcbiAgICogVGhpcyByZW1vdmVzIHRoZSB0YXNrIGZyb20gdGhlIGludGVybmFsIGxpc3Qgb2YgaW4tcHJvZ3Jlc3MgdGFza3MgYW5kIGFkZHMgaXQgYmFjayB0byB0aGUgbGlzdFxuICAgKiBvZiBwZW5kaW5nIHRhc2tzLlxuICAgKlxuICAgKiBAcGFyYW0gdGFzayBUaGUgdGFzayB0byBtYXJrIGFzIG5vdCBwcm9jZXNzZWQuXG4gICAqL1xuICBtYXJrQXNVbnByb2Nlc3NlZCh0YXNrOiBUYXNrKTogdm9pZDtcblxuICAvKipcbiAgICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0YXNrIHF1ZXVlIChmb3IgZGVidWdnaW5nIHB1cnBvc2VzKS5cbiAgICpcbiAgICogQHJldHVybiBBIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFzayBxdWV1ZS5cbiAgICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZztcbn1cbiJdfQ==