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
     * Implements `TcbSourceResolver` to resolve the source of a template based on these IDs.
     */
    var TcbSourceManager = /** @class */ (function () {
        function TcbSourceManager() {
            this.nextTcbId = 1;
            /**
             * This map keeps track of all template sources that have been type-checked by the id that is
             * attached to a TCB's function declaration as leading trivia. This enables translation of
             * diagnostics produced for TCB code to their source location in the template.
             */
            this.templateSources = new Map();
        }
        TcbSourceManager.prototype.captureSource = function (mapping, file) {
            var id = "tcb" + this.nextTcbId++;
            this.templateSources.set(id, new TemplateSource(mapping, file));
            return id;
        };
        TcbSourceManager.prototype.getSourceMapping = function (id) {
            if (!this.templateSources.has(id)) {
                throw new Error("Unexpected unknown TCB ID: " + id);
            }
            return this.templateSources.get(id).mapping;
        };
        TcbSourceManager.prototype.sourceLocationToSpan = function (location) {
            if (!this.templateSources.has(location.id)) {
                return null;
            }
            var templateSource = this.templateSources.get(location.id);
            return templateSource.toParseSourceSpan(location.start, location.end);
        };
        return TcbSourceManager;
    }());
    exports.TcbSourceManager = TcbSourceManager;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3NvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUFrRjtJQUlsRiw2RkFBc0Y7SUFFdEY7OztPQUdHO0lBQ0g7UUFHRSx3QkFBcUIsT0FBOEIsRUFBVSxJQUFxQjtZQUE3RCxZQUFPLEdBQVAsT0FBTyxDQUF1QjtZQUFVLFNBQUksR0FBSixJQUFJLENBQWlCO1lBRjFFLGVBQVUsR0FBa0IsSUFBSSxDQUFDO1FBRTRDLENBQUM7UUFFdEYsMENBQWlCLEdBQWpCLFVBQWtCLEtBQWEsRUFBRSxHQUFXO1lBQzFDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6QyxPQUFPLElBQUksMEJBQWUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVPLHdDQUFlLEdBQXZCLFVBQXdCLFFBQWdCO1lBQ3RDLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RDLElBQUEsMEVBQXlFLEVBQXhFLGNBQUksRUFBRSx3QkFBa0UsQ0FBQztZQUNoRixPQUFPLElBQUksd0JBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVPLDBDQUFpQixHQUF6QjtZQUNFLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsb0NBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMzRDtZQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN6QixDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBdkJELElBdUJDO0lBdkJZLHdDQUFjO0lBeUIzQjs7OztPQUlHO0lBQ0g7UUFBQTtZQUNVLGNBQVMsR0FBVyxDQUFDLENBQUM7WUFDOUI7Ozs7ZUFJRztZQUNLLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7UUFzQjlELENBQUM7UUFwQkMsd0NBQWEsR0FBYixVQUFjLE9BQThCLEVBQUUsSUFBcUI7WUFDakUsSUFBTSxFQUFFLEdBQUcsUUFBTSxJQUFJLENBQUMsU0FBUyxFQUFJLENBQUM7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELDJDQUFnQixHQUFoQixVQUFpQixFQUFVO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBOEIsRUFBSSxDQUFDLENBQUM7YUFDckQ7WUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRyxDQUFDLE9BQU8sQ0FBQztRQUNoRCxDQUFDO1FBRUQsK0NBQW9CLEdBQXBCLFVBQXFCLFFBQXdCO1lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzFDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFHLENBQUM7WUFDL0QsT0FBTyxjQUFjLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQTdCRCxJQTZCQztJQTdCWSw0Q0FBZ0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGFyc2VMb2NhdGlvbiwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVNvdXJjZVNwYW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hcHBpbmd9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7U291cmNlTG9jYXRpb24sIFRjYlNvdXJjZVJlc29sdmVyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcHV0ZUxpbmVTdGFydHNNYXAsIGdldExpbmVBbmRDaGFyYWN0ZXJGcm9tUG9zaXRpb259IGZyb20gJy4vbGluZV9tYXBwaW5ncyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc291cmNlIG9mIGEgdGVtcGxhdGUgdGhhdCB3YXMgcHJvY2Vzc2VkIGR1cmluZyB0eXBlLWNoZWNraW5nLiBUaGlzIGluZm9ybWF0aW9uIGlzXG4gKiB1c2VkIHdoZW4gdHJhbnNsYXRpbmcgcGFyc2Ugb2Zmc2V0cyBpbiBkaWFnbm9zdGljcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGxpbmUvY29sdW1uIGxvY2F0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVTb3VyY2Uge1xuICBwcml2YXRlIGxpbmVTdGFydHM6IG51bWJlcltdfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgcHJpdmF0ZSBmaWxlOiBQYXJzZVNvdXJjZUZpbGUpIHt9XG5cbiAgdG9QYXJzZVNvdXJjZVNwYW4oc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIGNvbnN0IHN0YXJ0TG9jID0gdGhpcy50b1BhcnNlTG9jYXRpb24oc3RhcnQpO1xuICAgIGNvbnN0IGVuZExvYyA9IHRoaXMudG9QYXJzZUxvY2F0aW9uKGVuZCk7XG4gICAgcmV0dXJuIG5ldyBQYXJzZVNvdXJjZVNwYW4oc3RhcnRMb2MsIGVuZExvYyk7XG4gIH1cblxuICBwcml2YXRlIHRvUGFyc2VMb2NhdGlvbihwb3NpdGlvbjogbnVtYmVyKSB7XG4gICAgY29uc3QgbGluZVN0YXJ0cyA9IHRoaXMuYWNxdWlyZUxpbmVTdGFydHMoKTtcbiAgICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IGdldExpbmVBbmRDaGFyYWN0ZXJGcm9tUG9zaXRpb24obGluZVN0YXJ0cywgcG9zaXRpb24pO1xuICAgIHJldHVybiBuZXcgUGFyc2VMb2NhdGlvbih0aGlzLmZpbGUsIHBvc2l0aW9uLCBsaW5lLCBjaGFyYWN0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBhY3F1aXJlTGluZVN0YXJ0cygpOiBudW1iZXJbXSB7XG4gICAgaWYgKHRoaXMubGluZVN0YXJ0cyA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5saW5lU3RhcnRzID0gY29tcHV0ZUxpbmVTdGFydHNNYXAodGhpcy5maWxlLmNvbnRlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5saW5lU3RhcnRzO1xuICB9XG59XG5cbi8qKlxuICogQXNzaWducyBJRHMgdG8gdGVtcGxhdGVzIGFuZCBrZWVwcyB0cmFjayBvZiB0aGVpciBvcmlnaW5zLlxuICpcbiAqIEltcGxlbWVudHMgYFRjYlNvdXJjZVJlc29sdmVyYCB0byByZXNvbHZlIHRoZSBzb3VyY2Ugb2YgYSB0ZW1wbGF0ZSBiYXNlZCBvbiB0aGVzZSBJRHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUY2JTb3VyY2VNYW5hZ2VyIGltcGxlbWVudHMgVGNiU291cmNlUmVzb2x2ZXIge1xuICBwcml2YXRlIG5leHRUY2JJZDogbnVtYmVyID0gMTtcbiAgLyoqXG4gICAqIFRoaXMgbWFwIGtlZXBzIHRyYWNrIG9mIGFsbCB0ZW1wbGF0ZSBzb3VyY2VzIHRoYXQgaGF2ZSBiZWVuIHR5cGUtY2hlY2tlZCBieSB0aGUgaWQgdGhhdCBpc1xuICAgKiBhdHRhY2hlZCB0byBhIFRDQidzIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGFzIGxlYWRpbmcgdHJpdmlhLiBUaGlzIGVuYWJsZXMgdHJhbnNsYXRpb24gb2ZcbiAgICogZGlhZ25vc3RpY3MgcHJvZHVjZWQgZm9yIFRDQiBjb2RlIHRvIHRoZWlyIHNvdXJjZSBsb2NhdGlvbiBpbiB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBwcml2YXRlIHRlbXBsYXRlU291cmNlcyA9IG5ldyBNYXA8c3RyaW5nLCBUZW1wbGF0ZVNvdXJjZT4oKTtcblxuICBjYXB0dXJlU291cmNlKG1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZywgZmlsZTogUGFyc2VTb3VyY2VGaWxlKTogc3RyaW5nIHtcbiAgICBjb25zdCBpZCA9IGB0Y2Ike3RoaXMubmV4dFRjYklkKyt9YDtcbiAgICB0aGlzLnRlbXBsYXRlU291cmNlcy5zZXQoaWQsIG5ldyBUZW1wbGF0ZVNvdXJjZShtYXBwaW5nLCBmaWxlKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgZ2V0U291cmNlTWFwcGluZyhpZDogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2VNYXBwaW5nIHtcbiAgICBpZiAoIXRoaXMudGVtcGxhdGVTb3VyY2VzLmhhcyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB1bmtub3duIFRDQiBJRDogJHtpZH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVTb3VyY2VzLmdldChpZCkgIS5tYXBwaW5nO1xuICB9XG5cbiAgc291cmNlTG9jYXRpb25Ub1NwYW4obG9jYXRpb246IFNvdXJjZUxvY2F0aW9uKTogUGFyc2VTb3VyY2VTcGFufG51bGwge1xuICAgIGlmICghdGhpcy50ZW1wbGF0ZVNvdXJjZXMuaGFzKGxvY2F0aW9uLmlkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gdGhpcy50ZW1wbGF0ZVNvdXJjZXMuZ2V0KGxvY2F0aW9uLmlkKSAhO1xuICAgIHJldHVybiB0ZW1wbGF0ZVNvdXJjZS50b1BhcnNlU291cmNlU3Bhbihsb2NhdGlvbi5zdGFydCwgbG9jYXRpb24uZW5kKTtcbiAgfVxufVxuIl19