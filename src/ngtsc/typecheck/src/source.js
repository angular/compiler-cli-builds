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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/source", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/src/line_mappings"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateSourceManager = exports.TemplateSource = void 0;
    var compiler_1 = require("@angular/compiler");
    var line_mappings_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/line_mappings");
    /**
     * Represents the source of a template that was processed during type-checking. This information is
     * used when translating parse offsets in diagnostics back to their original line/column location.
     */
    var TemplateSource = /** @class */ (function () {
        function TemplateSource(mapping, file) {
            this.mapping = mapping;
            this.file = file;
            this.lineStarts = null;
        }
        TemplateSource.prototype.toParseSourceSpan = function (start, end) {
            var startLoc = this.toParseLocation(start);
            var endLoc = this.toParseLocation(end);
            return new compiler_1.ParseSourceSpan(startLoc, endLoc);
        };
        TemplateSource.prototype.toParseLocation = function (position) {
            var lineStarts = this.acquireLineStarts();
            var _a = line_mappings_1.getLineAndCharacterFromPosition(lineStarts, position), line = _a.line, character = _a.character;
            return new compiler_1.ParseLocation(this.file, position, line, character);
        };
        TemplateSource.prototype.acquireLineStarts = function () {
            if (this.lineStarts === null) {
                this.lineStarts = line_mappings_1.computeLineStartsMap(this.file.content);
            }
            return this.lineStarts;
        };
        return TemplateSource;
    }());
    exports.TemplateSource = TemplateSource;
    /**
     * Assigns IDs to templates and keeps track of their origins.
     *
     * Implements `TemplateSourceResolver` to resolve the source of a template based on these IDs.
     */
    var TemplateSourceManager = /** @class */ (function () {
        function TemplateSourceManager() {
            this.nextTemplateId = 1;
            /**
             * This map keeps track of all template sources that have been type-checked by the id that is
             * attached to a TCB's function declaration as leading trivia. This enables translation of
             * diagnostics produced for TCB code to their source location in the template.
             */
            this.templateSources = new Map();
        }
        TemplateSourceManager.prototype.captureSource = function (mapping, file) {
            var id = "tcb" + this.nextTemplateId++;
            this.templateSources.set(id, new TemplateSource(mapping, file));
            return id;
        };
        TemplateSourceManager.prototype.getSourceMapping = function (id) {
            if (!this.templateSources.has(id)) {
                throw new Error("Unexpected unknown template ID: " + id);
            }
            return this.templateSources.get(id).mapping;
        };
        TemplateSourceManager.prototype.toParseSourceSpan = function (id, span) {
            if (!this.templateSources.has(id)) {
                return null;
            }
            var templateSource = this.templateSources.get(id);
            return templateSource.toParseSourceSpan(span.start, span.end);
        };
        return TemplateSourceManager;
    }());
    exports.TemplateSourceManager = TemplateSourceManager;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBc0c7SUFJdEcsNkZBQXNGO0lBRXRGOzs7T0FHRztJQUNIO1FBR0Usd0JBQXFCLE9BQThCLEVBQVUsSUFBcUI7WUFBN0QsWUFBTyxHQUFQLE9BQU8sQ0FBdUI7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFpQjtZQUYxRSxlQUFVLEdBQWtCLElBQUksQ0FBQztRQUU0QyxDQUFDO1FBRXRGLDBDQUFpQixHQUFqQixVQUFrQixLQUFhLEVBQUUsR0FBVztZQUMxQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsT0FBTyxJQUFJLDBCQUFlLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFTyx3Q0FBZSxHQUF2QixVQUF3QixRQUFnQjtZQUN0QyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN0QyxJQUFBLEtBQW9CLCtDQUErQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBeEUsSUFBSSxVQUFBLEVBQUUsU0FBUyxlQUF5RCxDQUFDO1lBQ2hGLE9BQU8sSUFBSSx3QkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRU8sMENBQWlCLEdBQXpCO1lBQ0UsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxvQ0FBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3pCLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUF2QkQsSUF1QkM7SUF2Qlksd0NBQWM7SUF5QjNCOzs7O09BSUc7SUFDSDtRQUFBO1lBQ1UsbUJBQWMsR0FBVyxDQUFDLENBQUM7WUFDbkM7Ozs7ZUFJRztZQUNLLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7UUFzQmxFLENBQUM7UUFwQkMsNkNBQWEsR0FBYixVQUFjLE9BQThCLEVBQUUsSUFBcUI7WUFDakUsSUFBTSxFQUFFLEdBQUcsUUFBTSxJQUFJLENBQUMsY0FBYyxFQUFrQixDQUFDO1lBQ3ZELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoRSxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCxnREFBZ0IsR0FBaEIsVUFBaUIsRUFBYztZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQW1DLEVBQUksQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxPQUFPLENBQUM7UUFDL0MsQ0FBQztRQUVELGlEQUFpQixHQUFqQixVQUFrQixFQUFjLEVBQUUsSUFBd0I7WUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7WUFDckQsT0FBTyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQTdCRCxJQTZCQztJQTdCWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVTb3VyY2VTcGFuLCBQYXJzZUxvY2F0aW9uLCBQYXJzZVNvdXJjZUZpbGUsIFBhcnNlU291cmNlU3Bhbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge1RlbXBsYXRlSWQsIFRlbXBsYXRlU291cmNlTWFwcGluZ30gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcHV0ZUxpbmVTdGFydHNNYXAsIGdldExpbmVBbmRDaGFyYWN0ZXJGcm9tUG9zaXRpb259IGZyb20gJy4vbGluZV9tYXBwaW5ncyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc291cmNlIG9mIGEgdGVtcGxhdGUgdGhhdCB3YXMgcHJvY2Vzc2VkIGR1cmluZyB0eXBlLWNoZWNraW5nLiBUaGlzIGluZm9ybWF0aW9uIGlzXG4gKiB1c2VkIHdoZW4gdHJhbnNsYXRpbmcgcGFyc2Ugb2Zmc2V0cyBpbiBkaWFnbm9zdGljcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGxpbmUvY29sdW1uIGxvY2F0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVTb3VyY2Uge1xuICBwcml2YXRlIGxpbmVTdGFydHM6IG51bWJlcltdfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgcHJpdmF0ZSBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpIHt9XG5cbiAgdG9QYXJzZVNvdXJjZVNwYW4oc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIGNvbnN0IHN0YXJ0TG9jID0gdGhpcy50b1BhcnNlTG9jYXRpb24oc3RhcnQpO1xuICAgIGNvbnN0IGVuZExvYyA9IHRoaXMudG9QYXJzZUxvY2F0aW9uKGVuZCk7XG4gICAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oc3RhcnRMb2MsIGVuZExvYyk7XG4gIH1cblxuICBwcml2YXRlIHRvUGFyc2VMb2NhdGlvbihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgY29uc3QgbGluZVN0YXJ0cyA9IHRoaXMuYWNxdWlyZUxpbmVTdGFydHMoKTtcbiAgICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGdldExpbmVBbmRDaGFyYWN0ZXJGcm9tUG9zaXRpb24obGluZVN0YXJ0cywgcG9zaXRpb24pO1xuICAgIHJldHVybiBuZXcgUGFyc2VMb2NhdGlvbih0aGlzLmZpbGUsIHBvc2l0aW9uLCBsaW5lLCBjaGFyYWN0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhY3F1aXJlTGluZVN0YXJ0cygpOiBudW1iZXJbXSB7XG4gICAgaWYgKHRoaXMubGluZVN0YXJ0cyA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5saW5lU3RhcnRzID0gY29tcHV0ZUxpbmVTdGFydHNNYXAodGhpcy5maWxlLmNvbnRlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5saW5lU3RhcnRzO1xuICB9XG59XG5cbi8qKlxuICogQXNzaWducyBJRHMgdG8gdGVtcGxhdGVzIGFuZCBrZWVwcyB0cmFjayBvZiB0aGVpciBvcmlnaW5zLlxuICpcbiAqIEltcGxlbWVudHMgYFRlbXBsYXRlU291cmNlUmVzb2x2ZXJgIHRvIHJlc29sdmUgdGhlIHNvdXJjZSBvZiBhIHRlbXBsYXRlIGJhc2VkIG9uIHRoZXNlIElEcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlU291cmNlTWFuYWdlciBpbXBsZW1lbnRzIFRlbXBsYXRlU291cmNlUmVzb2x2ZXIge1xuICBwcml2YXRlIG5leHRUZW1wbGF0ZUlkOiBudW1iZXIgPSAxO1xuICAvKipcbiAgICogVGhpcyBtYXAga2VlcHMgdHJhY2sgb2YgYWxsIHRlbXBsYXRlIHNvdXJjZXMgdGhhdCBoYXZlIGJlZW4gdHlwZS1jaGVja2VkIGJ5IHRoZSBpZCB0aGF0IGlzXG4gICAqIGF0dGFjaGVkIHRvIGEgVENCJ3MgZnVuY3Rpb24gZGVjbGFyYXRpb24gYXMgbGVhZGluZyB0cml2aWEuIFRoaXMgZW5hYmxlcyB0cmFuc2xhdGlvbiBvZlxuICAgKiBkaWFnbm9zdGljcyBwcm9kdWNlZCBmb3IgVENCIGNvZGUgdG8gdGhlaXIgc291cmNlIGxvY2F0aW9uIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVTb3VyY2VzID0gbmV3IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZVNvdXJjZT4oKTtcblxuICBjYXB0dXJlU291cmNlKG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgZmlsZTogUGFyc2VTb3VyY2VGaWxlKTogVGVtcGxhdGVJZCB7XG4gICAgY29uc3QgaWQgPSBgdGNiJHt0aGlzLm5leHRUZW1wbGF0ZUlkKyt9YCBhcyBUZW1wbGF0ZUlkO1xuICAgIHRoaXMudGVtcGxhdGVTb3VyY2VzLnNldChpZCwgbmV3IFRlbXBsYXRlU291cmNlKG1hcHBpbmcsIGZpbGUpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBnZXRTb3VyY2VNYXBwaW5nKGlkOiBUZW1wbGF0ZUlkKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nIHtcbiAgICBpZiAoIXRoaXMudGVtcGxhdGVTb3VyY2VzLmhhcyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB1bmtub3duIHRlbXBsYXRlIElEOiAke2lkfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZVNvdXJjZXMuZ2V0KGlkKSEubWFwcGluZztcbiAgfVxuXG4gIHRvUGFyc2VTb3VyY2VTcGFuKGlkOiBUZW1wbGF0ZUlkLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW4pOiBQYXJzZVNvdXJjZVNwYW58bnVsbCB7XG4gICAgaWYgKCF0aGlzLnRlbXBsYXRlU291cmNlcy5oYXMoaWQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLnRlbXBsYXRlU291cmNlcy5nZXQoaWQpITtcbiAgICByZXR1cm4gdGVtcGxhdGVTb3VyY2UudG9QYXJzZVNvdXJjZVNwYW4oc3Bhbi5zdGFydCwgc3Bhbi5lbmQpO1xuICB9XG59XG4iXX0=