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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/dom", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var REGISTRY = new compiler_1.DomElementSchemaRegistry();
    /**
     * Checks non-Angular elements and properties against the `DomElementSchemaRegistry`, a schema
     * maintained by the Angular team via extraction from a browser IDL.
     */
    var RegistryDomSchemaChecker = /** @class */ (function () {
        function RegistryDomSchemaChecker(resolver) {
            this.resolver = resolver;
            this._diagnostics = [];
        }
        Object.defineProperty(RegistryDomSchemaChecker.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        RegistryDomSchemaChecker.prototype.checkElement = function (id, element, schemas) {
            if (!REGISTRY.hasElement(element.name, schemas)) {
                var mapping = this.resolver.getSourceMapping(id);
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, element.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.SCHEMA_INVALID_ELEMENT, "'" + element.name + "' is not a valid HTML element.");
                this._diagnostics.push(diag);
            }
        };
        RegistryDomSchemaChecker.prototype.checkProperty = function (id, element, name, span, schemas) {
            if (!REGISTRY.hasProperty(element.name, name, schemas)) {
                var mapping = this.resolver.getSourceMapping(id);
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE, "'" + name + "' is not a valid property of <" + element.name + ">.");
                this._diagnostics.push(diag);
            }
        };
        return RegistryDomSchemaChecker;
    }());
    exports.RegistryDomSchemaChecker = RegistryDomSchemaChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0RztJQUM1RywrQkFBaUM7SUFFakMsMkVBQTRDO0lBRTVDLHlGQUF3RTtJQUV4RSxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUE0Q2hEOzs7T0FHRztJQUNIO1FBS0Usa0NBQW9CLFFBQTJCO1lBQTNCLGFBQVEsR0FBUixRQUFRLENBQW1CO1lBSnZDLGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQUlPLENBQUM7UUFGbkQsc0JBQUksaURBQVc7aUJBQWYsY0FBa0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFJN0UsK0NBQVksR0FBWixVQUFhLEVBQVUsRUFBRSxPQUF1QixFQUFFLE9BQXlCO1lBQ3pFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQy9DLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25ELElBQU0sSUFBSSxHQUFHLG9DQUFzQixDQUMvQixPQUFPLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUN4RCx1QkFBUyxDQUFDLHNCQUFzQixFQUFFLE1BQUksT0FBTyxDQUFDLElBQUksbUNBQWdDLENBQUMsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBRUQsZ0RBQWEsR0FBYixVQUNJLEVBQVUsRUFBRSxPQUF1QixFQUFFLElBQVksRUFBRSxJQUFxQixFQUN4RSxPQUF5QjtZQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRTtnQkFDdEQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkQsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQy9CLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSx1QkFBUyxDQUFDLHdCQUF3QixFQUM5RSxNQUFJLElBQUksc0NBQWlDLE9BQU8sQ0FBQyxJQUFJLE9BQUksQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtRQUNILENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUE1QkQsSUE0QkM7SUE1QlksNERBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgUGFyc2VTb3VyY2VTcGFuLCBTY2hlbWFNZXRhZGF0YSwgVG1wbEFzdEVsZW1lbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuXG5pbXBvcnQge1RjYlNvdXJjZVJlc29sdmVyLCBtYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcblxuY29uc3QgUkVHSVNUUlkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG5cbi8qKlxuICogQ2hlY2tzIGV2ZXJ5IG5vbi1Bbmd1bGFyIGVsZW1lbnQvcHJvcGVydHkgcHJvY2Vzc2VkIGluIGEgdGVtcGxhdGUgYW5kIHBvdGVudGlhbGx5IHByb2R1Y2VzXG4gKiBgdHMuRGlhZ25vc3RpY2BzIHJlbGF0ZWQgdG8gaW1wcm9wZXIgdXNhZ2UuXG4gKlxuICogQSBgRG9tU2NoZW1hQ2hlY2tlcmAncyBqb2IgaXMgdG8gY2hlY2sgRE9NIG5vZGVzIGFuZCB0aGVpciBhdHRyaWJ1dGVzIHdyaXR0ZW4gdXNlZCBpbiB0ZW1wbGF0ZXNcbiAqIGFuZCBwcm9kdWNlIGB0cy5EaWFnbm9zdGljYHMgaWYgdGhlIG5vZGVzIGRvbid0IGNvbmZvcm0gdG8gdGhlIERPTSBzcGVjaWZpY2F0aW9uLiBJdCBhY3RzIGFzIGFcbiAqIGNvbGxlY3RvciBmb3IgdGhlc2UgZGlhZ25vc3RpY3MsIGFuZCBjYW4gYmUgcXVlcmllZCBsYXRlciB0byByZXRyaWV2ZSB0aGUgbGlzdCBvZiBhbnkgdGhhdCBoYXZlXG4gKiBiZWVuIGdlbmVyYXRlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEb21TY2hlbWFDaGVja2VyIHtcbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLkRpYWdub3N0aWNgcyB0aGF0IGhhdmUgYmVlbiBnZW5lcmF0ZWQgdmlhIGBjaGVja0VsZW1lbnRgIGFuZCBgY2hlY2tQcm9wZXJ0eWAgY2FsbHNcbiAgICogdGh1cyBmYXIuXG4gICAqL1xuICByZWFkb25seSBkaWFnbm9zdGljczogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogQ2hlY2sgYSBub24tQW5ndWxhciBlbGVtZW50IGFuZCByZWNvcmQgYW55IGRpYWdub3N0aWNzIGFib3V0IGl0LlxuICAgKlxuICAgKiBAcGFyYW0gaWQgdGhlIHRlbXBsYXRlIElELCBzdWl0YWJsZSBmb3IgcmVzb2x1dGlvbiB3aXRoIGEgYFRjYlNvdXJjZVJlc29sdmVyYC5cbiAgICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgbm9kZSBpbiBxdWVzdGlvbi5cbiAgICogQHBhcmFtIHNjaGVtYXMgYW55IGFjdGl2ZSBzY2hlbWFzIGZvciB0aGUgdGVtcGxhdGUsIHdoaWNoIG1pZ2h0IGFmZmVjdCB0aGUgdmFsaWRpdHkgb2YgdGhlXG4gICAqIGVsZW1lbnQuXG4gICAqL1xuICBjaGVja0VsZW1lbnQoaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBDaGVjayBhIHByb3BlcnR5IGJpbmRpbmcgb24gYW4gZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBuYW1lIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBiZWluZyBjaGVja2VkLlxuICAgKiBAcGFyYW0gc3BhbiB0aGUgc291cmNlIHNwYW4gb2YgdGhlIGJpbmRpbmcuIFRoaXMgaXMgcmVkdW5kYW50IHdpdGggYGVsZW1lbnQuYXR0cmlidXRlc2AgYnV0IGlzXG4gICAqIHBhc3NlZCBzZXBhcmF0ZWx5IHRvIGF2b2lkIGhhdmluZyB0byBsb29rIHVwIHRoZSBwYXJ0aWN1bGFyIHByb3BlcnR5IG5hbWUuXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBwcm9wZXJ0eS5cbiAgICovXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgbm9uLUFuZ3VsYXIgZWxlbWVudHMgYW5kIHByb3BlcnRpZXMgYWdhaW5zdCB0aGUgYERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeWAsIGEgc2NoZW1hXG4gKiBtYWludGFpbmVkIGJ5IHRoZSBBbmd1bGFyIHRlYW0gdmlhIGV4dHJhY3Rpb24gZnJvbSBhIGJyb3dzZXIgSURMLlxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyIHtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHsgcmV0dXJuIHRoaXMuX2RpYWdub3N0aWNzOyB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZXNvbHZlcjogVGNiU291cmNlUmVzb2x2ZXIpIHt9XG5cbiAgY2hlY2tFbGVtZW50KGlkOiBzdHJpbmcsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZCB7XG4gICAgaWYgKCFSRUdJU1RSWS5oYXNFbGVtZW50KGVsZW1lbnQubmFtZSwgc2NoZW1hcykpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoaWQpO1xuICAgICAgY29uc3QgZGlhZyA9IG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgbWFwcGluZywgZWxlbWVudC5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0VMRU1FTlQsIGAnJHtlbGVtZW50Lm5hbWV9JyBpcyBub3QgYSB2YWxpZCBIVE1MIGVsZW1lbnQuYCk7XG4gICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGRpYWcpO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZCB7XG4gICAgaWYgKCFSRUdJU1RSWS5oYXNQcm9wZXJ0eShlbGVtZW50Lm5hbWUsIG5hbWUsIHNjaGVtYXMpKSB7XG4gICAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5yZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKGlkKTtcbiAgICAgIGNvbnN0IGRpYWcgPSBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIG1hcHBpbmcsIHNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvciwgRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0FUVFJJQlVURSxcbiAgICAgICAgICBgJyR7bmFtZX0nIGlzIG5vdCBhIHZhbGlkIHByb3BlcnR5IG9mIDwke2VsZW1lbnQubmFtZX0+LmApO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==