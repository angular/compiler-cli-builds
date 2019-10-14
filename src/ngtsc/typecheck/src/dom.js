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
                var errorMsg = "'" + element.name + "' is not a known element:\n";
                errorMsg +=
                    "1. If '" + element.name + "' is an Angular component, then verify that it is part of this module.\n";
                if (element.name.indexOf('-') > -1) {
                    errorMsg +=
                        "2. If '" + element.name + "' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.";
                }
                else {
                    errorMsg +=
                        "2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.";
                }
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, element.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.SCHEMA_INVALID_ELEMENT, errorMsg);
                this._diagnostics.push(diag);
            }
        };
        RegistryDomSchemaChecker.prototype.checkProperty = function (id, element, name, span, schemas) {
            if (!REGISTRY.hasProperty(element.name, name, schemas)) {
                var mapping = this.resolver.getSourceMapping(id);
                var errorMsg = "Can't bind to '" + name + "' since it isn't a known property of '" + element.name + "'.";
                if (element.name.startsWith('ng-')) {
                    errorMsg +=
                        "\n1. If '" + name + "' is an Angular directive, then add 'CommonModule' to the '@NgModule.imports' of this component." +
                            "\n2. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.";
                }
                else if (element.name.indexOf('-') > -1) {
                    errorMsg +=
                        "\n1. If '" + element.name + "' is an Angular component and it has '" + name + "' input, then verify that it is part of this module." +
                            ("\n2. If '" + element.name + "' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.") +
                            "\n3. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.";
                }
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE, errorMsg);
                this._diagnostics.push(diag);
            }
        };
        return RegistryDomSchemaChecker;
    }());
    exports.RegistryDomSchemaChecker = RegistryDomSchemaChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0RztJQUM1RywrQkFBaUM7SUFFakMsMkVBQTRDO0lBRTVDLHlGQUF3RTtJQUV4RSxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUE0Q2hEOzs7T0FHRztJQUNIO1FBS0Usa0NBQW9CLFFBQTJCO1lBQTNCLGFBQVEsR0FBUixRQUFRLENBQW1CO1lBSnZDLGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQUlPLENBQUM7UUFGbkQsc0JBQUksaURBQVc7aUJBQWYsY0FBa0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFJN0UsK0NBQVksR0FBWixVQUFhLEVBQVUsRUFBRSxPQUF1QixFQUFFLE9BQXlCO1lBQ3pFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQy9DLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUFHLE1BQUksT0FBTyxDQUFDLElBQUksZ0NBQTZCLENBQUM7Z0JBQzdELFFBQVE7b0JBQ0osWUFBVSxPQUFPLENBQUMsSUFBSSw2RUFBMEUsQ0FBQztnQkFDckcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDbEMsUUFBUTt3QkFDSixZQUFVLE9BQU8sQ0FBQyxJQUFJLGtJQUErSCxDQUFDO2lCQUMzSjtxQkFBTTtvQkFDTCxRQUFRO3dCQUNKLDhGQUE4RixDQUFDO2lCQUNwRztnQkFFRCxJQUFNLElBQUksR0FBRyxvQ0FBc0IsQ0FDL0IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDeEQsdUJBQVMsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBRUQsZ0RBQWEsR0FBYixVQUNJLEVBQVUsRUFBRSxPQUF1QixFQUFFLElBQVksRUFBRSxJQUFxQixFQUN4RSxPQUF5QjtZQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRTtnQkFDdEQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFbkQsSUFBSSxRQUFRLEdBQ1Isb0JBQWtCLElBQUksOENBQXlDLE9BQU8sQ0FBQyxJQUFJLE9BQUksQ0FBQztnQkFDcEYsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDbEMsUUFBUTt3QkFDSixjQUFZLElBQUkscUdBQWtHOzRCQUNsSCxpR0FBaUcsQ0FBQztpQkFDdkc7cUJBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDekMsUUFBUTt3QkFDSixjQUFZLE9BQU8sQ0FBQyxJQUFJLDhDQUF5QyxJQUFJLHlEQUFzRDs2QkFDM0gsY0FBWSxPQUFPLENBQUMsSUFBSSxrSUFBK0gsQ0FBQTs0QkFDdkosaUdBQWlHLENBQUM7aUJBQ3ZHO2dCQUVELElBQU0sSUFBSSxHQUFHLG9DQUFzQixDQUMvQixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsdUJBQVMsQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDOUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBckRELElBcURDO0lBckRZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIFBhcnNlU291cmNlU3BhbiwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3RFbGVtZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtUY2JTb3VyY2VSZXNvbHZlciwgbWFrZVRlbXBsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5cbmNvbnN0IFJFR0lTVFJZID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4vKipcbiAqIENoZWNrcyBldmVyeSBub24tQW5ndWxhciBlbGVtZW50L3Byb3BlcnR5IHByb2Nlc3NlZCBpbiBhIHRlbXBsYXRlIGFuZCBwb3RlbnRpYWxseSBwcm9kdWNlc1xuICogYHRzLkRpYWdub3N0aWNgcyByZWxhdGVkIHRvIGltcHJvcGVyIHVzYWdlLlxuICpcbiAqIEEgYERvbVNjaGVtYUNoZWNrZXJgJ3Mgam9iIGlzIHRvIGNoZWNrIERPTSBub2RlcyBhbmQgdGhlaXIgYXR0cmlidXRlcyB3cml0dGVuIHVzZWQgaW4gdGVtcGxhdGVzXG4gKiBhbmQgcHJvZHVjZSBgdHMuRGlhZ25vc3RpY2BzIGlmIHRoZSBub2RlcyBkb24ndCBjb25mb3JtIHRvIHRoZSBET00gc3BlY2lmaWNhdGlvbi4gSXQgYWN0cyBhcyBhXG4gKiBjb2xsZWN0b3IgZm9yIHRoZXNlIGRpYWdub3N0aWNzLCBhbmQgY2FuIGJlIHF1ZXJpZWQgbGF0ZXIgdG8gcmV0cmlldmUgdGhlIGxpc3Qgb2YgYW55IHRoYXQgaGF2ZVxuICogYmVlbiBnZW5lcmF0ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9tU2NoZW1hQ2hlY2tlciB7XG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5EaWFnbm9zdGljYHMgdGhhdCBoYXZlIGJlZW4gZ2VuZXJhdGVkIHZpYSBgY2hlY2tFbGVtZW50YCBhbmQgYGNoZWNrUHJvcGVydHlgIGNhbGxzXG4gICAqIHRodXMgZmFyLlxuICAgKi9cbiAgcmVhZG9ubHkgZGlhZ25vc3RpY3M6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIENoZWNrIGEgbm9uLUFuZ3VsYXIgZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBlbGVtZW50LlxuICAgKi9cbiAgY2hlY2tFbGVtZW50KGlkOiBzdHJpbmcsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcblxuICAvKipcbiAgICogQ2hlY2sgYSBwcm9wZXJ0eSBiaW5kaW5nIG9uIGFuIGVsZW1lbnQgYW5kIHJlY29yZCBhbnkgZGlhZ25vc3RpY3MgYWJvdXQgaXQuXG4gICAqXG4gICAqIEBwYXJhbSBpZCB0aGUgdGVtcGxhdGUgSUQsIHN1aXRhYmxlIGZvciByZXNvbHV0aW9uIHdpdGggYSBgVGNiU291cmNlUmVzb2x2ZXJgLlxuICAgKiBAcGFyYW0gZWxlbWVudCB0aGUgZWxlbWVudCBub2RlIGluIHF1ZXN0aW9uLlxuICAgKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgYmVpbmcgY2hlY2tlZC5cbiAgICogQHBhcmFtIHNwYW4gdGhlIHNvdXJjZSBzcGFuIG9mIHRoZSBiaW5kaW5nLiBUaGlzIGlzIHJlZHVuZGFudCB3aXRoIGBlbGVtZW50LmF0dHJpYnV0ZXNgIGJ1dCBpc1xuICAgKiBwYXNzZWQgc2VwYXJhdGVseSB0byBhdm9pZCBoYXZpbmcgdG8gbG9vayB1cCB0aGUgcGFydGljdWxhciBwcm9wZXJ0eSBuYW1lLlxuICAgKiBAcGFyYW0gc2NoZW1hcyBhbnkgYWN0aXZlIHNjaGVtYXMgZm9yIHRoZSB0ZW1wbGF0ZSwgd2hpY2ggbWlnaHQgYWZmZWN0IHRoZSB2YWxpZGl0eSBvZiB0aGVcbiAgICogcHJvcGVydHkuXG4gICAqL1xuICBjaGVja1Byb3BlcnR5KFxuICAgICAgaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIG5vbi1Bbmd1bGFyIGVsZW1lbnRzIGFuZCBwcm9wZXJ0aWVzIGFnYWluc3QgdGhlIGBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnlgLCBhIHNjaGVtYVxuICogbWFpbnRhaW5lZCBieSB0aGUgQW5ndWxhciB0ZWFtIHZpYSBleHRyYWN0aW9uIGZyb20gYSBicm93c2VyIElETC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlciBpbXBsZW1lbnRzIERvbVNjaGVtYUNoZWNrZXIge1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlc29sdmVyOiBUY2JTb3VyY2VSZXNvbHZlcikge31cblxuICBjaGVja0VsZW1lbnQoaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkIHtcbiAgICBpZiAoIVJFR0lTVFJZLmhhc0VsZW1lbnQoZWxlbWVudC5uYW1lLCBzY2hlbWFzKSkge1xuICAgICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhpZCk7XG5cbiAgICAgIGxldCBlcnJvck1zZyA9IGAnJHtlbGVtZW50Lm5hbWV9JyBpcyBub3QgYSBrbm93biBlbGVtZW50OlxcbmA7XG4gICAgICBlcnJvck1zZyArPVxuICAgICAgICAgIGAxLiBJZiAnJHtlbGVtZW50Lm5hbWV9JyBpcyBhbiBBbmd1bGFyIGNvbXBvbmVudCwgdGhlbiB2ZXJpZnkgdGhhdCBpdCBpcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLlxcbmA7XG4gICAgICBpZiAoZWxlbWVudC5uYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgMi4gSWYgJyR7ZWxlbWVudC5uYW1lfScgaXMgYSBXZWIgQ29tcG9uZW50IHRoZW4gYWRkICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudCB0byBzdXBwcmVzcyB0aGlzIG1lc3NhZ2UuYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgMi4gVG8gYWxsb3cgYW55IGVsZW1lbnQgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaWFnID0gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgICBtYXBwaW5nLCBlbGVtZW50LnNvdXJjZVNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfRUxFTUVOVCwgZXJyb3JNc2cpO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cblxuICBjaGVja1Byb3BlcnR5KFxuICAgICAgaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQge1xuICAgIGlmICghUkVHSVNUUlkuaGFzUHJvcGVydHkoZWxlbWVudC5uYW1lLCBuYW1lLCBzY2hlbWFzKSkge1xuICAgICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhpZCk7XG5cbiAgICAgIGxldCBlcnJvck1zZyA9XG4gICAgICAgICAgYENhbid0IGJpbmQgdG8gJyR7bmFtZX0nIHNpbmNlIGl0IGlzbid0IGEga25vd24gcHJvcGVydHkgb2YgJyR7ZWxlbWVudC5uYW1lfScuYDtcbiAgICAgIGlmIChlbGVtZW50Lm5hbWUuc3RhcnRzV2l0aCgnbmctJykpIHtcbiAgICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICAgIGBcXG4xLiBJZiAnJHtuYW1lfScgaXMgYW4gQW5ndWxhciBkaXJlY3RpdmUsIHRoZW4gYWRkICdDb21tb25Nb2R1bGUnIHRvIHRoZSAnQE5nTW9kdWxlLmltcG9ydHMnIG9mIHRoaXMgY29tcG9uZW50LmAgK1xuICAgICAgICAgICAgYFxcbjIuIFRvIGFsbG93IGFueSBwcm9wZXJ0eSBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICB9IGVsc2UgaWYgKGVsZW1lbnQubmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgYFxcbjEuIElmICcke2VsZW1lbnQubmFtZX0nIGlzIGFuIEFuZ3VsYXIgY29tcG9uZW50IGFuZCBpdCBoYXMgJyR7bmFtZX0nIGlucHV0LCB0aGVuIHZlcmlmeSB0aGF0IGl0IGlzIHBhcnQgb2YgdGhpcyBtb2R1bGUuYCArXG4gICAgICAgICAgICBgXFxuMi4gSWYgJyR7ZWxlbWVudC5uYW1lfScgaXMgYSBXZWIgQ29tcG9uZW50IHRoZW4gYWRkICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudCB0byBzdXBwcmVzcyB0aGlzIG1lc3NhZ2UuYCArXG4gICAgICAgICAgICBgXFxuMy4gVG8gYWxsb3cgYW55IHByb3BlcnR5IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlhZyA9IG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgbWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFLCBlcnJvck1zZyk7XG4gICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGRpYWcpO1xuICAgIH1cbiAgfVxufVxuIl19