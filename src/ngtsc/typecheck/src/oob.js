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
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, ref.valueSpan || ref.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.MISSING_REFERENCE_TARGET, errorMsg));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.missingPipe = function (templateId, ast) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "No pipe found with name '" + ast.name + "'.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, ast.nameSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for usage of pipe '" + ast.name + "'.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.MISSING_PIPE, errorMsg));
        };
        OutOfBandDiagnosticRecorderImpl.prototype.illegalAssignmentToTemplateVar = function (templateId, assignment, target) {
            var mapping = this.resolver.getSourceMapping(templateId);
            var errorMsg = "Cannot use variable '" + assignment.name + "' as the left-hand side of an assignment expression. Template variables are read-only.";
            var sourceSpan = this.resolver.toParseSourceSpan(templateId, assignment.sourceSpan);
            if (sourceSpan === null) {
                throw new Error("Assertion failure: no SourceLocation found for property binding.");
            }
            this._diagnostics.push(diagnostics_2.makeTemplateDiagnostic(mapping, sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.WRITE_TO_READ_ONLY_VARIABLE, errorMsg, {
                text: "The variable " + assignment.name + " is declared here.",
                span: target.valueSpan || target.sourceSpan,
            }));
        };
        return OutOfBandDiagnosticRecorderImpl;
    }());
    exports.OutOfBandDiagnosticRecorderImpl = OutOfBandDiagnosticRecorderImpl;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib29iLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL29vYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBeUQ7SUFHekQseUZBQTZFO0lBd0M3RTtRQUdFLHlDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQUY1QyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFFWSxDQUFDO1FBRXhELHNCQUFJLHdEQUFXO2lCQUFmLGNBQWtELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRTdFLGdFQUFzQixHQUF0QixVQUF1QixVQUFzQixFQUFFLEdBQXFCO1lBQ2xFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0QsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUUvQixJQUFNLFFBQVEsR0FBRyx1Q0FBcUMsS0FBSyxPQUFJLENBQUM7WUFDaEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsb0NBQXNCLENBQ3pDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDckUsdUJBQVMsQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxxREFBVyxHQUFYLFVBQVksVUFBc0IsRUFBRSxHQUFnQjtZQUNsRCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNELElBQU0sUUFBUSxHQUFHLDhCQUE0QixHQUFHLENBQUMsSUFBSSxPQUFJLENBQUM7WUFFMUQsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdFLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtnQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FDWCxtRUFBaUUsR0FBRyxDQUFDLElBQUksT0FBSSxDQUFDLENBQUM7YUFDcEY7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxvQ0FBc0IsQ0FDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLHVCQUFTLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHdFQUE4QixHQUE5QixVQUNJLFVBQXNCLEVBQUUsVUFBeUIsRUFBRSxNQUF1QjtZQUM1RSxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNELElBQU0sUUFBUSxHQUNWLDBCQUF3QixVQUFVLENBQUMsSUFBSSwyRkFBd0YsQ0FBQztZQUVwSSxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEYsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7YUFDckY7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxvQ0FBc0IsQ0FDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLHVCQUFTLENBQUMsMkJBQTJCLEVBQ3ZGLFFBQVEsRUFBRTtnQkFDUixJQUFJLEVBQUUsa0JBQWdCLFVBQVUsQ0FBQyxJQUFJLHVCQUFvQjtnQkFDekQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLFVBQVU7YUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0gsc0NBQUM7SUFBRCxDQUFDLEFBL0NELElBK0NDO0lBL0NZLDBFQUErQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtCaW5kaW5nUGlwZSwgUHJvcGVydHlXcml0ZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFZhcmlhYmxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7VGVtcGxhdGVJZH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZVJlc29sdmVyLCBtYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcblxuXG5cbi8qKlxuICogQ29sbGVjdHMgYHRzLkRpYWdub3N0aWNgcyBvbiBwcm9ibGVtcyB3aGljaCBvY2N1ciBpbiB0aGUgdGVtcGxhdGUgd2hpY2ggYXJlbid0IGRpcmVjdGx5IHNvdXJjZWRcbiAqIGZyb20gVHlwZSBDaGVjayBCbG9ja3MuXG4gKlxuICogRHVyaW5nIHRoZSBjcmVhdGlvbiBvZiBhIFR5cGUgQ2hlY2sgQmxvY2ssIHRoZSB0ZW1wbGF0ZSBpcyB0cmF2ZXJzZWQgYW5kIHRoZVxuICogYE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcmAgaXMgY2FsbGVkIHRvIHJlY29yZCBjYXNlcyB3aGVuIGEgY29ycmVjdCBpbnRlcnByZXRhdGlvbiBmb3IgdGhlXG4gKiB0ZW1wbGF0ZSBjYW5ub3QgYmUgZm91bmQuIFRoZXNlIG9wZXJhdGlvbnMgY3JlYXRlIGB0cy5EaWFnbm9zdGljYHMgd2hpY2ggYXJlIHN0b3JlZCBieSB0aGVcbiAqIHJlY29yZGVyIGZvciBsYXRlciBkaXNwbGF5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciB7XG4gIHJlYWRvbmx5IGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIGEgYCNyZWY9XCJ0YXJnZXRcImAgZXhwcmVzc2lvbiBpbiB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIGEgdGFyZ2V0IGRpcmVjdGl2ZSBjb3VsZCBub3QgYmVcbiAgICogZm91bmQuXG4gICAqXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlkIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIElEIG9mIHRoZSB0ZW1wbGF0ZSB3aGljaCBjb250YWlucyB0aGUgYnJva2VuXG4gICAqIHJlZmVyZW5jZS5cbiAgICogQHBhcmFtIHJlZiB0aGUgYFRtcGxBc3RSZWZlcmVuY2VgIHdoaWNoIGNvdWxkIG5vdCBiZSBtYXRjaGVkIHRvIGEgZGlyZWN0aXZlLlxuICAgKi9cbiAgbWlzc2luZ1JlZmVyZW5jZVRhcmdldCh0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCByZWY6IFRtcGxBc3RSZWZlcmVuY2UpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBSZXBvcnRzIHVzYWdlIG9mIGEgYHwgcGlwZWAgZXhwcmVzc2lvbiBpbiB0aGUgdGVtcGxhdGUgZm9yIHdoaWNoIHRoZSBuYW1lZCBwaXBlIGNvdWxkIG5vdCBiZVxuICAgKiBmb3VuZC5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgSUQgb2YgdGhlIHRlbXBsYXRlIHdoaWNoIGNvbnRhaW5zIHRoZSB1bmtub3duXG4gICAqIHBpcGUuXG4gICAqIEBwYXJhbSBhc3QgdGhlIGBCaW5kaW5nUGlwZWAgaW52b2NhdGlvbiBvZiB0aGUgcGlwZSB3aGljaCBjb3VsZCBub3QgYmUgZm91bmQuXG4gICAqL1xuICBtaXNzaW5nUGlwZSh0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3Q6IEJpbmRpbmdQaXBlKTogdm9pZDtcblxuICBpbGxlZ2FsQXNzaWdubWVudFRvVGVtcGxhdGVWYXIoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3NpZ25tZW50OiBQcm9wZXJ0eVdyaXRlLCB0YXJnZXQ6IFRtcGxBc3RWYXJpYWJsZSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXJJbXBsIGltcGxlbWVudHMgT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyIHtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpIHt9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBtaXNzaW5nUmVmZXJlbmNlVGFyZ2V0KHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHJlZjogVG1wbEFzdFJlZmVyZW5jZSk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgdmFsdWUgPSByZWYudmFsdWUudHJpbSgpO1xuXG4gICAgY29uc3QgZXJyb3JNc2cgPSBgTm8gZGlyZWN0aXZlIGZvdW5kIHdpdGggZXhwb3J0QXMgJyR7dmFsdWV9Jy5gO1xuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgbWFwcGluZywgcmVmLnZhbHVlU3BhbiB8fCByZWYuc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICBFcnJvckNvZGUuTUlTU0lOR19SRUZFUkVOQ0VfVEFSR0VULCBlcnJvck1zZykpO1xuICB9XG5cbiAgbWlzc2luZ1BpcGUodGVtcGxhdGVJZDogVGVtcGxhdGVJZCwgYXN0OiBCaW5kaW5nUGlwZSk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgZXJyb3JNc2cgPSBgTm8gcGlwZSBmb3VuZCB3aXRoIG5hbWUgJyR7YXN0Lm5hbWV9Jy5gO1xuXG4gICAgY29uc3Qgc291cmNlU3BhbiA9IHRoaXMucmVzb2x2ZXIudG9QYXJzZVNvdXJjZVNwYW4odGVtcGxhdGVJZCwgYXN0Lm5hbWVTcGFuKTtcbiAgICBpZiAoc291cmNlU3BhbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBc3NlcnRpb24gZmFpbHVyZTogbm8gU291cmNlTG9jYXRpb24gZm91bmQgZm9yIHVzYWdlIG9mIHBpcGUgJyR7YXN0Lm5hbWV9Jy5gKTtcbiAgICB9XG4gICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICBtYXBwaW5nLCBzb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsIEVycm9yQ29kZS5NSVNTSU5HX1BJUEUsIGVycm9yTXNnKSk7XG4gIH1cblxuICBpbGxlZ2FsQXNzaWdubWVudFRvVGVtcGxhdGVWYXIoXG4gICAgICB0ZW1wbGF0ZUlkOiBUZW1wbGF0ZUlkLCBhc3NpZ25tZW50OiBQcm9wZXJ0eVdyaXRlLCB0YXJnZXQ6IFRtcGxBc3RWYXJpYWJsZSk6IHZvaWQge1xuICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcodGVtcGxhdGVJZCk7XG4gICAgY29uc3QgZXJyb3JNc2cgPVxuICAgICAgICBgQ2Fubm90IHVzZSB2YXJpYWJsZSAnJHthc3NpZ25tZW50Lm5hbWV9JyBhcyB0aGUgbGVmdC1oYW5kIHNpZGUgb2YgYW4gYXNzaWdubWVudCBleHByZXNzaW9uLiBUZW1wbGF0ZSB2YXJpYWJsZXMgYXJlIHJlYWQtb25seS5gO1xuXG4gICAgY29uc3Qgc291cmNlU3BhbiA9IHRoaXMucmVzb2x2ZXIudG9QYXJzZVNvdXJjZVNwYW4odGVtcGxhdGVJZCwgYXNzaWdubWVudC5zb3VyY2VTcGFuKTtcbiAgICBpZiAoc291cmNlU3BhbiA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbHVyZTogbm8gU291cmNlTG9jYXRpb24gZm91bmQgZm9yIHByb3BlcnR5IGJpbmRpbmcuYCk7XG4gICAgfVxuICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2gobWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgbWFwcGluZywgc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBFcnJvckNvZGUuV1JJVEVfVE9fUkVBRF9PTkxZX1ZBUklBQkxFLFxuICAgICAgICBlcnJvck1zZywge1xuICAgICAgICAgIHRleHQ6IGBUaGUgdmFyaWFibGUgJHthc3NpZ25tZW50Lm5hbWV9IGlzIGRlY2xhcmVkIGhlcmUuYCxcbiAgICAgICAgICBzcGFuOiB0YXJnZXQudmFsdWVTcGFuIHx8IHRhcmdldC5zb3VyY2VTcGFuLFxuICAgICAgICB9KSk7XG4gIH1cbn1cbiJdfQ==