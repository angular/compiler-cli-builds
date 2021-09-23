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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/source", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/line_mappings"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateSourceManager = exports.TemplateSource = void 0;
    var compiler_1 = require("@angular/compiler");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
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
            var _a = (0, line_mappings_1.getLineAndCharacterFromPosition)(lineStarts, position), line = _a.line, character = _a.character;
            return new compiler_1.ParseLocation(this.file, position, line, character);
        };
        TemplateSource.prototype.acquireLineStarts = function () {
            if (this.lineStarts === null) {
                this.lineStarts = (0, line_mappings_1.computeLineStartsMap)(this.file.content);
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
            /**
             * This map keeps track of all template sources that have been type-checked by the id that is
             * attached to a TCB's function declaration as leading trivia. This enables translation of
             * diagnostics produced for TCB code to their source location in the template.
             */
            this.templateSources = new Map();
        }
        TemplateSourceManager.prototype.getTemplateId = function (node) {
            return (0, diagnostics_1.getTemplateId)(node);
        };
        TemplateSourceManager.prototype.captureSource = function (node, mapping, file) {
            var id = (0, diagnostics_1.getTemplateId)(node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBc0c7SUFJdEcscUZBQTZDO0lBRTdDLDZGQUFzRjtJQUd0Rjs7O09BR0c7SUFDSDtRQUdFLHdCQUFxQixPQUE4QixFQUFVLElBQXFCO1lBQTdELFlBQU8sR0FBUCxPQUFPLENBQXVCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBaUI7WUFGMUUsZUFBVSxHQUFrQixJQUFJLENBQUM7UUFFNEMsQ0FBQztRQUV0RiwwQ0FBaUIsR0FBakIsVUFBa0IsS0FBYSxFQUFFLEdBQVc7WUFDMUMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QyxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sSUFBSSwwQkFBZSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRU8sd0NBQWUsR0FBdkIsVUFBd0IsUUFBZ0I7WUFDdEMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDdEMsSUFBQSxLQUFvQixJQUFBLCtDQUErQixFQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBeEUsSUFBSSxVQUFBLEVBQUUsU0FBUyxlQUF5RCxDQUFDO1lBQ2hGLE9BQU8sSUFBSSx3QkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRU8sMENBQWlCLEdBQXpCO1lBQ0UsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFBLG9DQUFvQixFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDM0Q7WUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDekIsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQXZCRCxJQXVCQztJQXZCWSx3Q0FBYztJQXlCM0I7Ozs7T0FJRztJQUNIO1FBQUE7WUFDRTs7OztlQUlHO1lBQ0ssb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztRQTJCbEUsQ0FBQztRQXpCQyw2Q0FBYSxHQUFiLFVBQWMsSUFBeUI7WUFDckMsT0FBTyxJQUFBLDJCQUFhLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUVELDZDQUFhLEdBQWIsVUFBYyxJQUF5QixFQUFFLE9BQThCLEVBQUUsSUFBcUI7WUFFNUYsSUFBTSxFQUFFLEdBQUcsSUFBQSwyQkFBYSxFQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoRSxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCxnREFBZ0IsR0FBaEIsVUFBaUIsRUFBYztZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQW1DLEVBQUksQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQyxPQUFPLENBQUM7UUFDL0MsQ0FBQztRQUVELGlEQUFpQixHQUFqQixVQUFrQixFQUFjLEVBQUUsSUFBd0I7WUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7WUFDckQsT0FBTyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWpDRCxJQWlDQztJQWpDWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZVNvdXJjZVNwYW4sIFBhcnNlTG9jYXRpb24sIFBhcnNlU291cmNlRmlsZSwgUGFyc2VTb3VyY2VTcGFufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtUZW1wbGF0ZUlkLCBUZW1wbGF0ZVNvdXJjZU1hcHBpbmd9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge2dldFRlbXBsYXRlSWR9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtjb21wdXRlTGluZVN0YXJ0c01hcCwgZ2V0TGluZUFuZENoYXJhY3RlckZyb21Qb3NpdGlvbn0gZnJvbSAnLi9saW5lX21hcHBpbmdzJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VSZXNvbHZlcn0gZnJvbSAnLi90Y2JfdXRpbCc7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc291cmNlIG9mIGEgdGVtcGxhdGUgdGhhdCB3YXMgcHJvY2Vzc2VkIGR1cmluZyB0eXBlLWNoZWNraW5nLiBUaGlzIGluZm9ybWF0aW9uIGlzXG4gKiB1c2VkIHdoZW4gdHJhbnNsYXRpbmcgcGFyc2Ugb2Zmc2V0cyBpbiBkaWFnbm9zdGljcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGxpbmUvY29sdW1uIGxvY2F0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVTb3VyY2Uge1xuICBwcml2YXRlIGxpbmVTdGFydHM6IG51bWJlcltdfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgcHJpdmF0ZSBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpIHt9XG5cbiAgdG9QYXJzZVNvdXJjZVNwYW4oc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIGNvbnN0IHN0YXJ0TG9jID0gdGhpcy50b1BhcnNlTG9jYXRpb24oc3RhcnQpO1xuICAgIGNvbnN0IGVuZExvYyA9IHRoaXMudG9QYXJzZUxvY2F0aW9uKGVuZCk7XG4gICAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oc3RhcnRMb2MsIGVuZExvYyk7XG4gIH1cblxuICBwcml2YXRlIHRvUGFyc2VMb2NhdGlvbihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgY29uc3QgbGluZVN0YXJ0cyA9IHRoaXMuYWNxdWlyZUxpbmVTdGFydHMoKTtcbiAgICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGdldExpbmVBbmRDaGFyYWN0ZXJGcm9tUG9zaXRpb24obGluZVN0YXJ0cywgcG9zaXRpb24pO1xuICAgIHJldHVybiBuZXcgUGFyc2VMb2NhdGlvbih0aGlzLmZpbGUsIHBvc2l0aW9uLCBsaW5lLCBjaGFyYWN0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhY3F1aXJlTGluZVN0YXJ0cygpOiBudW1iZXJbXSB7XG4gICAgaWYgKHRoaXMubGluZVN0YXJ0cyA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5saW5lU3RhcnRzID0gY29tcHV0ZUxpbmVTdGFydHNNYXAodGhpcy5maWxlLmNvbnRlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5saW5lU3RhcnRzO1xuICB9XG59XG5cbi8qKlxuICogQXNzaWducyBJRHMgdG8gdGVtcGxhdGVzIGFuZCBrZWVwcyB0cmFjayBvZiB0aGVpciBvcmlnaW5zLlxuICpcbiAqIEltcGxlbWVudHMgYFRlbXBsYXRlU291cmNlUmVzb2x2ZXJgIHRvIHJlc29sdmUgdGhlIHNvdXJjZSBvZiBhIHRlbXBsYXRlIGJhc2VkIG9uIHRoZXNlIElEcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlU291cmNlTWFuYWdlciBpbXBsZW1lbnRzIFRlbXBsYXRlU291cmNlUmVzb2x2ZXIge1xuICAvKipcbiAgICogVGhpcyBtYXAga2VlcHMgdHJhY2sgb2YgYWxsIHRlbXBsYXRlIHNvdXJjZXMgdGhhdCBoYXZlIGJlZW4gdHlwZS1jaGVja2VkIGJ5IHRoZSBpZCB0aGF0IGlzXG4gICAqIGF0dGFjaGVkIHRvIGEgVENCJ3MgZnVuY3Rpb24gZGVjbGFyYXRpb24gYXMgbGVhZGluZyB0cml2aWEuIFRoaXMgZW5hYmxlcyB0cmFuc2xhdGlvbiBvZlxuICAgKiBkaWFnbm9zdGljcyBwcm9kdWNlZCBmb3IgVENCIGNvZGUgdG8gdGhlaXIgc291cmNlIGxvY2F0aW9uIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHByaXZhdGUgdGVtcGxhdGVTb3VyY2VzID0gbmV3IE1hcDxUZW1wbGF0ZUlkLCBUZW1wbGF0ZVNvdXJjZT4oKTtcblxuICBnZXRUZW1wbGF0ZUlkKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUZW1wbGF0ZUlkIHtcbiAgICByZXR1cm4gZ2V0VGVtcGxhdGVJZChub2RlKTtcbiAgfVxuXG4gIGNhcHR1cmVTb3VyY2Uobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpOlxuICAgICAgVGVtcGxhdGVJZCB7XG4gICAgY29uc3QgaWQgPSBnZXRUZW1wbGF0ZUlkKG5vZGUpO1xuICAgIHRoaXMudGVtcGxhdGVTb3VyY2VzLnNldChpZCwgbmV3IFRlbXBsYXRlU291cmNlKG1hcHBpbmcsIGZpbGUpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBnZXRTb3VyY2VNYXBwaW5nKGlkOiBUZW1wbGF0ZUlkKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nIHtcbiAgICBpZiAoIXRoaXMudGVtcGxhdGVTb3VyY2VzLmhhcyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB1bmtub3duIHRlbXBsYXRlIElEOiAke2lkfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50ZW1wbGF0ZVNvdXJjZXMuZ2V0KGlkKSEubWFwcGluZztcbiAgfVxuXG4gIHRvUGFyc2VTb3VyY2VTcGFuKGlkOiBUZW1wbGF0ZUlkLCBzcGFuOiBBYnNvbHV0ZVNvdXJjZVNwYW4pOiBQYXJzZVNvdXJjZVNwYW58bnVsbCB7XG4gICAgaWYgKCF0aGlzLnRlbXBsYXRlU291cmNlcy5oYXMoaWQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSB0aGlzLnRlbXBsYXRlU291cmNlcy5nZXQoaWQpITtcbiAgICByZXR1cm4gdGVtcGxhdGVTb3VyY2UudG9QYXJzZVNvdXJjZVNwYW4oc3Bhbi5zdGFydCwgc3Bhbi5lbmQpO1xuICB9XG59XG4iXX0=