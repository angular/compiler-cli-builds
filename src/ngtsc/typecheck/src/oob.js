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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/oob", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var OutOfBandDiagnosticRecorderImpl = /** @class */ (function () {
        function OutOfBandDiagnosticRecorderImpl(resolver) {
            this.resolver = resolver;
            this._diagnostics = [];
        }
        Object.defineProperty(OutOfBandDiagnosticRecorderImpl.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        OutOfBandDiagnosticRecorderImpl.prototype.missingReferenceTarget = function (templateId, ref) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var value = ref.value.trim();
            var errorMsg = "No directive found with exportAs '" + value + "'.";
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, ref.valueSpan || ref.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.MISSING_REFERENCE_TARGET), errorMsg));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.missingPipe = function (templateId, ast) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "No pipe found with name '" + ast.name + "'.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, ast.nameSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for usage of pipe '" + ast.name + "'.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.MISSING_PIPE), errorMsg));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.illegalAssignmentToTemplateVar = function (templateId, assignment, target) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "Cannot use variable '" + assignment
                .name + "' as the left-hand side of an assignment expression. Template variables are read-only.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, assignment.sourceSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for property binding.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.WRITE_TO_READ_ONLY_VARIABLE), errorMsg, {
                text: "The variable " + assignment.name + " is declared here.",
                span: target.valueSpan || target.sourceSpan,
            }));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.duplicateTemplateVar = function (templateId, variable, firstDecl) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "Cannot redeclare variable '" + variable.name + "' as it was previously declared elsewhere for the same template.";
            // The allocation of the error here is pretty useless for variables declared in microsyntax,
            // since the sourceSpan refers to the entire microsyntax property, not a span for the specific
            // variable in question.
            //
            // TODO(alxhub): allocate to a tighter span once one is available.
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, variable.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.DUPLICATE_VARIABLE_DECLARATION), errorMsg, {
                text: "The variable '" + firstDecl.name + "' was first declared here.",
                span: firstDecl.sourceSpan,
            }));
        };
        return OutOfBandDiagnosticRecorderImpl;
    }());
    exports.OutOfBandDiagnosticRecorderImpl = OutOfBandDiagnosticRecorderImpl;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib29iLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL29vYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBeUQ7SUFHekQseUZBQTZFO0lBbUQ3RTtRQUdFLHlDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQUY1QyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFFWSxDQUFDO1FBRXhELHNCQUFJLHdEQUFXO2lCQUFmLGNBQWtELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTdFLGdFQUFzQixHQUF0QixVQUF1QixVQUFzQixFQUFFLEdBQXFCO1lBQ2xFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0QsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUUvQixJQUFNLFFBQVEsR0FBRyx1Q0FBcUMsS0FBSyxPQUFJLENBQUM7WUFDaEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsb0NBQXNCLENBQ3pDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDckUseUJBQVcsQ0FBQyx1QkFBUyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBRUQscURBQVcsR0FBWCxVQUFZLFVBQXNCLEVBQUUsR0FBZ0I7WUFDbEQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzRCxJQUFNLFFBQVEsR0FBRyw4QkFBNEIsR0FBRyxDQUFDLElBQUksT0FBSSxDQUFDO1lBRTFELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3RSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUVBQWlFLEdBQUcsQ0FBQyxJQUFJLE9BQUksQ0FBQyxDQUFDO2FBQ3BGO1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsb0NBQXNCLENBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSx5QkFBVyxDQUFDLHVCQUFTLENBQUMsWUFBWSxDQUFDLEVBQ3JGLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDakIsQ0FBQztRQUVELHdFQUE4QixHQUE5QixVQUNJLFVBQXNCLEVBQUUsVUFBeUIsRUFBRSxNQUF1QjtZQUM1RSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNELElBQU0sUUFBUSxHQUFHLDBCQUNiLFVBQVU7aUJBQ0wsSUFBSSwyRkFBd0YsQ0FBQztZQUV0RyxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEYsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7YUFDckY7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxvQ0FBc0IsQ0FDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUNoRCx5QkFBVyxDQUFDLHVCQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUU7Z0JBQzVELElBQUksRUFBRSxrQkFBZ0IsVUFBVSxDQUFDLElBQUksdUJBQW9CO2dCQUN6RCxJQUFJLEVBQUUsTUFBTSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsVUFBVTthQUM1QyxDQUFDLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCw4REFBb0IsR0FBcEIsVUFDSSxVQUFzQixFQUFFLFFBQXlCLEVBQUUsU0FBMEI7WUFDL0UsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMzRCxJQUFNLFFBQVEsR0FBRyxnQ0FDYixRQUFRLENBQUMsSUFBSSxxRUFBa0UsQ0FBQztZQUVwRiw0RkFBNEY7WUFDNUYsOEZBQThGO1lBQzlGLHdCQUF3QjtZQUN4QixFQUFFO1lBQ0Ysa0VBQWtFO1lBQ2xFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLG9DQUFzQixDQUN6QyxPQUFPLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUN6RCx5QkFBVyxDQUFDLHVCQUFTLENBQUMsOEJBQThCLENBQUMsRUFBRSxRQUFRLEVBQUU7Z0JBQy9ELElBQUksRUFBRSxtQkFBaUIsU0FBUyxDQUFDLElBQUksK0JBQTRCO2dCQUNqRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFVBQVU7YUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0gsc0NBQUM7SUFBRCxDQUFDLEFBcEVELElBb0VDO0lBcEVZLDBFQUErQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtCaW5kaW5nUGlwZSwgUHJvcGVydHlXcml0ZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7VGVtcGxhdGVJZH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZVJlc29sdmVyLCBtYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcblxuXG5cbi8qKlxuICogQ29sbGVjdHMgYHRzLkRpYWdub3N0aWNgcyBvbiBwcm9ibGVtcyB3aGljaCBvY2N1ciBpbiB0aGUgdGVtcGxhdGUgd2hpY2ggYXJlbid0IGRpcmVjdGx5IHNvdXJjZWRcbiAqIGZyb20gVHlwZSBDaGVjayBCbG9ja3MuXG4gKlxuICogRHVyaW5nIHRoZSBjcmVhdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2ssIHRoZSB0ZW1wbGF0ZSBpcyB0cmF2ZXJzZWQgYW5kIHRoZVxuICogYE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcmAgaXMgY2FsbGVkIHRvIHJlY29yZCBjYXNlcyB3aGVuIGEgY29ycmVjdCBpbnRlcnByZXRhdGlvbiBmb3IgdGhlXG4gKiB0ZW1wbGF0ZSBjYW5ub3QgYmUgZm91bmQuIFRoZXNlIG9wZXJhdGlvbnMgY3JlYXRlIGB0cy5EaWFnbm9zdGljYHMgd2hpY2ggYXJlIHN0b3JlZCBieSB0aGVcbiAqIHJlY29yZGVyIGZvciBsYXRlciBkaXNwbGF5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciB7XG4gIHJlYWRvbmx5IGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIGEgYCNyZWY9XCJ0YXJnZXRcImAgZXhwcmVzc2lvbiBpbiB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIGEgdGFyZ2V0IGRpcmVjdGl2ZSBjb3VsZCBub3QgYmVcbiAgICogZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlkIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIElEIG9mIHRoZSB0ZW1wbGF0ZSB3aGljaCBjb250YWlucyB0aGUgYnJva2VuXG4gICAqIHJlZmVyZW5jZS5cbiAgICogQHBhcmFtIHJlZiB0aGUgYFRtcGxBc3RSZWZlcmVuY2VgIHdoaWNoIGNvdWxkIG5vdCBiZSBtYXRjaGVkIHRvIGEgZGlyZWN0aXZlLlxuICAgKi9cbiAgbWlzc2luZ1JlZmVyZW5jZVRhcmdldCh0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCByZWY6IFRtcGxBc3RSZWZlcmVuY2UpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIHVzYWdlIG9mIGEgYHwgcGlwZWAgZXhwcmVzc2lvbiBpbiB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRoZSBuYW1lZCBwaXBlIGNvdWxkIG5vdCBiZVxuICAgKiBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgSUQgb2YgdGhlIHRlbXBsYXRlIHdoaWNoIGNvbnRhaW5zIHRoZSB1bmtub3duXG4gICAqIHBpcGUuXG4gICAqIEBwYXJhbSBhc3QgdGhlIGBCaW5kaW5nUGlwZWAgaW52b2NhdGlvbiBvZiB0aGUgcGlwZSB3aGljaCBjb3VsZCBub3QgYmUgZm91bmQuXG4gICAqL1xuICBtaXNzaW5nUGlwZSh0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3Q6IEJpbmRpbmdQaXBlKTogdm9pZDtcblxuICBpbGxlZ2FsQXNzaWdubWVudFRvVGVtcGxhdGVWYXIoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3NpZ25tZW50OiBQcm9wZXJ0eVdyaXRlLCB0YXJnZXQ6IFRtcGxBc3RWYXJpYWJsZSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJlcG9ydHMgYSBkdXBsaWNhdGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgSUQgb2YgdGhlIHRlbXBsYXRlIHdoaWNoIGNvbnRhaW5zIHRoZSBkdXBsaWNhdGVcbiAgICogZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSB2YXJpYWJsZSB0aGUgYFRtcGxBc3RWYXJpYWJsZWAgd2hpY2ggZHVwbGljYXRlcyBhIHByZXZpb3VzbHkgZGVjbGFyZWQgdmFyaWFibGUuXG4gICAqIEBwYXJhbSBmaXJzdERlY2wgdGhlIGZpcnN0IHZhcmlhYmxlIGRlY2xhcmF0aW9uIHdoaWNoIHVzZXMgdGhlIHNhbWUgbmFtZSBhcyBgdmFyaWFibGVgLlxuICAgKi9cbiAgZHVwbGljYXRlVGVtcGxhdGVWYXIoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCB2YXJpYWJsZTogVG1wbEFzdFZhcmlhYmxlLCBmaXJzdERlY2w6IFRtcGxBc3RWYXJpYWJsZSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsIGltcGxlbWVudHMgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyIHtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpIHt9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBtaXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHJlZjogVG1wbEFzdFJlZmVyZW5jZSk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgdmFsdWUgPSByZWYudmFsdWUudHJpbSgpO1xuXG4gICAgY29uc3QgZXJyb3JNc2cgPSBgTm8gZGlyZWN0aXZlIGZvdW5kIHdpdGggZXhwb3J0QXMgJyR7dmFsdWV9Jy5gO1xuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgbWFwcGluZywgcmVmLnZhbHVlU3BhbiB8fCByZWYuc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VUKSwgZXJyb3JNc2cpKTtcbiAgfVxuXG4gIG1pc3NpbmdQaXBlKHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIGFzdDogQmluZGluZ1BpcGUpOiB2b2lkIHtcbiAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5yZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKHRlbXBsYXRlSWQpO1xuICAgIGNvbnN0IGVycm9yTXNnID0gYE5vIHBpcGUgZm91bmQgd2l0aCBuYW1lICcke2FzdC5uYW1lfScuYDtcblxuICAgIGNvbnN0IHNvdXJjZVNwYW4gPSB0aGlzLnJlc29sdmVyLnRvUGFyc2VTb3VyY2VTcGFuKHRlbXBsYXRlSWQsIGFzdC5uYW1lU3Bhbik7XG4gICAgaWYgKHNvdXJjZVNwYW4gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXNzZXJ0aW9uIGZhaWx1cmU6IG5vIFNvdXJjZUxvY2F0aW9uIGZvdW5kIGZvciB1c2FnZSBvZiBwaXBlICcke2FzdC5uYW1lfScuYCk7XG4gICAgfVxuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgbWFwcGluZywgc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBuZ0Vycm9yQ29kZShFcnJvckNvZGUuTUlTU0lOR19QSVBFKSxcbiAgICAgICAgZXJyb3JNc2cpKTtcbiAgfVxuXG4gIGlsbGVnYWxBc3NpZ25tZW50VG9UZW1wbGF0ZVZhcihcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIGFzc2lnbm1lbnQ6IFByb3BlcnR5V3JpdGUsIHRhcmdldDogVG1wbEFzdFZhcmlhYmxlKTogdm9pZCB7XG4gICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcbiAgICBjb25zdCBlcnJvck1zZyA9IGBDYW5ub3QgdXNlIHZhcmlhYmxlICcke1xuICAgICAgICBhc3NpZ25tZW50XG4gICAgICAgICAgICAubmFtZX0nIGFzIHRoZSBsZWZ0LWhhbmQgc2lkZSBvZiBhbiBhc3NpZ25tZW50IGV4cHJlc3Npb24uIFRlbXBsYXRlIHZhcmlhYmxlcyBhcmUgcmVhZC1vbmx5LmA7XG5cbiAgICBjb25zdCBzb3VyY2VTcGFuID0gdGhpcy5yZXNvbHZlci50b1BhcnNlU291cmNlU3Bhbih0ZW1wbGF0ZUlkLCBhc3NpZ25tZW50LnNvdXJjZVNwYW4pO1xuICAgIGlmIChzb3VyY2VTcGFuID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbiBmYWlsdXJlOiBubyBTb3VyY2VMb2NhdGlvbiBmb3VuZCBmb3IgcHJvcGVydHkgYmluZGluZy5gKTtcbiAgICB9XG4gICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICBtYXBwaW5nLCBzb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5XUklURV9UT19SRUFEX09OTFlfVkFSSUFCTEUpLCBlcnJvck1zZywge1xuICAgICAgICAgIHRleHQ6IGBUaGUgdmFyaWFibGUgJHthc3NpZ25tZW50Lm5hbWV9IGlzIGRlY2xhcmVkIGhlcmUuYCxcbiAgICAgICAgICBzcGFuOiB0YXJnZXQudmFsdWVTcGFuIHx8IHRhcmdldC5zb3VyY2VTcGFuLFxuICAgICAgICB9KSk7XG4gIH1cblxuICBkdXBsaWNhdGVUZW1wbGF0ZVZhcihcbiAgICAgIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHZhcmlhYmxlOiBUbXBsQXN0VmFyaWFibGUsIGZpcnN0RGVjbDogVG1wbEFzdFZhcmlhYmxlKTogdm9pZCB7XG4gICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcbiAgICBjb25zdCBlcnJvck1zZyA9IGBDYW5ub3QgcmVkZWNsYXJlIHZhcmlhYmxlICcke1xuICAgICAgICB2YXJpYWJsZS5uYW1lfScgYXMgaXQgd2FzIHByZXZpb3VzbHkgZGVjbGFyZWQgZWxzZXdoZXJlIGZvciB0aGUgc2FtZSB0ZW1wbGF0ZS5gO1xuXG4gICAgLy8gVGhlIGFsbG9jYXRpb24gb2YgdGhlIGVycm9yIGhlcmUgaXMgcHJldHR5IHVzZWxlc3MgZm9yIHZhcmlhYmxlcyBkZWNsYXJlZCBpbiBtaWNyb3N5bnRheCxcbiAgICAvLyBzaW5jZSB0aGUgc291cmNlU3BhbiByZWZlcnMgdG8gdGhlIGVudGlyZSBtaWNyb3N5bnRheCBwcm9wZXJ0eSwgbm90IGEgc3BhbiBmb3IgdGhlIHNwZWNpZmljXG4gICAgLy8gdmFyaWFibGUgaW4gcXVlc3Rpb24uXG4gICAgLy9cbiAgICAvLyBUT0RPKGFseGh1Yik6IGFsbG9jYXRlIHRvIGEgdGlnaHRlciBzcGFuIG9uY2Ugb25lIGlzIGF2YWlsYWJsZS5cbiAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIG1hcHBpbmcsIHZhcmlhYmxlLnNvdXJjZVNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLkRVUExJQ0FURV9WQVJJQUJMRV9ERUNMQVJBVElPTiksIGVycm9yTXNnLCB7XG4gICAgICAgICAgdGV4dDogYFRoZSB2YXJpYWJsZSAnJHtmaXJzdERlY2wubmFtZX0nIHdhcyBmaXJzdCBkZWNsYXJlZCBoZXJlLmAsXG4gICAgICAgICAgc3BhbjogZmlyc3REZWNsLnNvdXJjZVNwYW4sXG4gICAgICAgIH0pKTtcbiAgfVxufVxuIl19