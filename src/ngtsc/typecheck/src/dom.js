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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/dom", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RegistryDomSchemaChecker = void 0;
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var REGISTRY = new compiler_1.DomElementSchemaRegistry();
    var REMOVE_XHTML_REGEX = /^:xhtml:/;
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
            get: function () {
                return this._diagnostics;
            },
            enumerable: false,
            configurable: true
        });
        RegistryDomSchemaChecker.prototype.checkElement = function (id, element, schemas) {
            // HTML elements inside an SVG `foreignObject` are declared in the `xhtml` namespace.
            // We need to strip it before handing it over to the registry because all HTML tag names
            // in the registry are without a namespace.
            var name = element.name.replace(REMOVE_XHTML_REGEX, '');
            if (!REGISTRY.hasElement(name, schemas)) {
                var mapping = this.resolver.getSourceMapping(id);
                var errorMsg = "'" + name + "' is not a known element:\n";
                errorMsg +=
                    "1. If '" + name + "' is an Angular component, then verify that it is part of this module.\n";
                if (name.indexOf('-') > -1) {
                    errorMsg += "2. If '" + name + "' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.";
                }
                else {
                    errorMsg +=
                        "2. To allow any element add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.";
                }
                var diag = (0, diagnostics_2.makeTemplateDiagnostic)(id, mapping, element.startSourceSpan, ts.DiagnosticCategory.Error, (0, diagnostics_1.ngErrorCode)(diagnostics_1.ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
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
                            ("\n2. If '" + element
                                .name + "' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.") +
                            "\n3. To allow any property add 'NO_ERRORS_SCHEMA' to the '@NgModule.schemas' of this component.";
                }
                var diag = (0, diagnostics_2.makeTemplateDiagnostic)(id, mapping, span, ts.DiagnosticCategory.Error, (0, diagnostics_1.ngErrorCode)(diagnostics_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
                this._diagnostics.push(diag);
            }
        };
        return RegistryDomSchemaChecker;
    }());
    exports.RegistryDomSchemaChecker = RegistryDomSchemaChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEc7SUFDNUcsK0JBQWlDO0lBRWpDLDJFQUF5RDtJQUV6RCxxRkFBc0Q7SUFJdEQsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBd0IsRUFBRSxDQUFDO0lBQ2hELElBQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDO0lBNEN0Qzs7O09BR0c7SUFDSDtRQU9FLGtDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQU41QyxpQkFBWSxHQUF5QixFQUFFLENBQUM7UUFNTyxDQUFDO1FBSnhELHNCQUFJLGlEQUFXO2lCQUFmO2dCQUNFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzQixDQUFDOzs7V0FBQTtRQUlELCtDQUFZLEdBQVosVUFBYSxFQUFjLEVBQUUsT0FBdUIsRUFBRSxPQUF5QjtZQUM3RSxxRkFBcUY7WUFDckYsd0ZBQXdGO1lBQ3hGLDJDQUEyQztZQUMzQyxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUUxRCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3ZDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUFHLE1BQUksSUFBSSxnQ0FBNkIsQ0FBQztnQkFDckQsUUFBUTtvQkFDSixZQUFVLElBQUksNkVBQTBFLENBQUM7Z0JBQzdGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDMUIsUUFBUSxJQUFJLFlBQ1IsSUFBSSxrSUFBK0gsQ0FBQztpQkFDekk7cUJBQU07b0JBQ0wsUUFBUTt3QkFDSiw4RkFBOEYsQ0FBQztpQkFDcEc7Z0JBRUQsSUFBTSxJQUFJLEdBQUcsSUFBQSxvQ0FBc0IsRUFDL0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQ2pFLElBQUEseUJBQVcsRUFBQyx1QkFBUyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUVELGdEQUFhLEdBQWIsVUFDSSxFQUFjLEVBQUUsT0FBdUIsRUFBRSxJQUFZLEVBQUUsSUFBcUIsRUFDNUUsT0FBeUI7WUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3RELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUNSLG9CQUFrQixJQUFJLDhDQUF5QyxPQUFPLENBQUMsSUFBSSxPQUFJLENBQUM7Z0JBQ3BGLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2xDLFFBQVE7d0JBQ0osY0FDSSxJQUFJLHFHQUFrRzs0QkFDMUcsaUdBQWlHLENBQUM7aUJBQ3ZHO3FCQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQ3pDLFFBQVE7d0JBQ0osY0FBWSxPQUFPLENBQUMsSUFBSSw4Q0FDcEIsSUFBSSx5REFBc0Q7NkJBQzlELGNBQ0ksT0FBTztpQ0FDRixJQUFJLGtJQUErSCxDQUFBOzRCQUM1SSxpR0FBaUcsQ0FBQztpQkFDdkc7Z0JBRUQsSUFBTSxJQUFJLEdBQUcsSUFBQSxvQ0FBc0IsRUFDL0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDOUMsSUFBQSx5QkFBVyxFQUFDLHVCQUFTLENBQUMsd0JBQXdCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBakVELElBaUVDO0lBakVZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgUGFyc2VTb3VyY2VTcGFuLCBTY2hlbWFNZXRhZGF0YSwgVG1wbEFzdEVsZW1lbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZUlkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VSZXNvbHZlcn0gZnJvbSAnLi90Y2JfdXRpbCc7XG5cbmNvbnN0IFJFR0lTVFJZID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuY29uc3QgUkVNT1ZFX1hIVE1MX1JFR0VYID0gL146eGh0bWw6LztcblxuLyoqXG4gKiBDaGVja3MgZXZlcnkgbm9uLUFuZ3VsYXIgZWxlbWVudC9wcm9wZXJ0eSBwcm9jZXNzZWQgaW4gYSB0ZW1wbGF0ZSBhbmQgcG90ZW50aWFsbHkgcHJvZHVjZXNcbiAqIGB0cy5EaWFnbm9zdGljYHMgcmVsYXRlZCB0byBpbXByb3BlciB1c2FnZS5cbiAqXG4gKiBBIGBEb21TY2hlbWFDaGVja2VyYCdzIGpvYiBpcyB0byBjaGVjayBET00gbm9kZXMgYW5kIHRoZWlyIGF0dHJpYnV0ZXMgd3JpdHRlbiB1c2VkIGluIHRlbXBsYXRlc1xuICogYW5kIHByb2R1Y2UgYHRzLkRpYWdub3N0aWNgcyBpZiB0aGUgbm9kZXMgZG9uJ3QgY29uZm9ybSB0byB0aGUgRE9NIHNwZWNpZmljYXRpb24uIEl0IGFjdHMgYXMgYVxuICogY29sbGVjdG9yIGZvciB0aGVzZSBkaWFnbm9zdGljcywgYW5kIGNhbiBiZSBxdWVyaWVkIGxhdGVyIHRvIHJldHJpZXZlIHRoZSBsaXN0IG9mIGFueSB0aGF0IGhhdmVcbiAqIGJlZW4gZ2VuZXJhdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERvbVNjaGVtYUNoZWNrZXIge1xuICAvKipcbiAgICogR2V0IHRoZSBgdHMuRGlhZ25vc3RpY2BzIHRoYXQgaGF2ZSBiZWVuIGdlbmVyYXRlZCB2aWEgYGNoZWNrRWxlbWVudGAgYW5kIGBjaGVja1Byb3BlcnR5YCBjYWxsc1xuICAgKiB0aHVzIGZhci5cbiAgICovXG4gIHJlYWRvbmx5IGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PFRlbXBsYXRlRGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIENoZWNrIGEgbm9uLUFuZ3VsYXIgZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBlbGVtZW50LlxuICAgKi9cbiAgY2hlY2tFbGVtZW50KGlkOiBzdHJpbmcsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcblxuICAvKipcbiAgICogQ2hlY2sgYSBwcm9wZXJ0eSBiaW5kaW5nIG9uIGFuIGVsZW1lbnQgYW5kIHJlY29yZCBhbnkgZGlhZ25vc3RpY3MgYWJvdXQgaXQuXG4gICAqXG4gICAqIEBwYXJhbSBpZCB0aGUgdGVtcGxhdGUgSUQsIHN1aXRhYmxlIGZvciByZXNvbHV0aW9uIHdpdGggYSBgVGNiU291cmNlUmVzb2x2ZXJgLlxuICAgKiBAcGFyYW0gZWxlbWVudCB0aGUgZWxlbWVudCBub2RlIGluIHF1ZXN0aW9uLlxuICAgKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSBvZiB0aGUgcHJvcGVydHkgYmVpbmcgY2hlY2tlZC5cbiAgICogQHBhcmFtIHNwYW4gdGhlIHNvdXJjZSBzcGFuIG9mIHRoZSBiaW5kaW5nLiBUaGlzIGlzIHJlZHVuZGFudCB3aXRoIGBlbGVtZW50LmF0dHJpYnV0ZXNgIGJ1dCBpc1xuICAgKiBwYXNzZWQgc2VwYXJhdGVseSB0byBhdm9pZCBoYXZpbmcgdG8gbG9vayB1cCB0aGUgcGFydGljdWxhciBwcm9wZXJ0eSBuYW1lLlxuICAgKiBAcGFyYW0gc2NoZW1hcyBhbnkgYWN0aXZlIHNjaGVtYXMgZm9yIHRoZSB0ZW1wbGF0ZSwgd2hpY2ggbWlnaHQgYWZmZWN0IHRoZSB2YWxpZGl0eSBvZiB0aGVcbiAgICogcHJvcGVydHkuXG4gICAqL1xuICBjaGVja1Byb3BlcnR5KFxuICAgICAgaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIG5vbi1Bbmd1bGFyIGVsZW1lbnRzIGFuZCBwcm9wZXJ0aWVzIGFnYWluc3QgdGhlIGBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnlgLCBhIHNjaGVtYVxuICogbWFpbnRhaW5lZCBieSB0aGUgQW5ndWxhciB0ZWFtIHZpYSBleHRyYWN0aW9uIGZyb20gYSBicm93c2VyIElETC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5RG9tU2NoZW1hQ2hlY2tlciBpbXBsZW1lbnRzIERvbVNjaGVtYUNoZWNrZXIge1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW10gPSBbXTtcblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTxUZW1wbGF0ZURpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlc29sdmVyOiBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyKSB7fVxuXG4gIGNoZWNrRWxlbWVudChpZDogVGVtcGxhdGVJZCwgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkIHtcbiAgICAvLyBIVE1MIGVsZW1lbnRzIGluc2lkZSBhbiBTVkcgYGZvcmVpZ25PYmplY3RgIGFyZSBkZWNsYXJlZCBpbiB0aGUgYHhodG1sYCBuYW1lc3BhY2UuXG4gICAgLy8gV2UgbmVlZCB0byBzdHJpcCBpdCBiZWZvcmUgaGFuZGluZyBpdCBvdmVyIHRvIHRoZSByZWdpc3RyeSBiZWNhdXNlIGFsbCBIVE1MIHRhZyBuYW1lc1xuICAgIC8vIGluIHRoZSByZWdpc3RyeSBhcmUgd2l0aG91dCBhIG5hbWVzcGFjZS5cbiAgICBjb25zdCBuYW1lID0gZWxlbWVudC5uYW1lLnJlcGxhY2UoUkVNT1ZFX1hIVE1MX1JFR0VYLCAnJyk7XG5cbiAgICBpZiAoIVJFR0lTVFJZLmhhc0VsZW1lbnQobmFtZSwgc2NoZW1hcykpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoaWQpO1xuXG4gICAgICBsZXQgZXJyb3JNc2cgPSBgJyR7bmFtZX0nIGlzIG5vdCBhIGtub3duIGVsZW1lbnQ6XFxuYDtcbiAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgYDEuIElmICcke25hbWV9JyBpcyBhbiBBbmd1bGFyIGNvbXBvbmVudCwgdGhlbiB2ZXJpZnkgdGhhdCBpdCBpcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLlxcbmA7XG4gICAgICBpZiAobmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgICBlcnJvck1zZyArPSBgMi4gSWYgJyR7XG4gICAgICAgICAgICBuYW1lfScgaXMgYSBXZWIgQ29tcG9uZW50IHRoZW4gYWRkICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudCB0byBzdXBwcmVzcyB0aGlzIG1lc3NhZ2UuYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgMi4gVG8gYWxsb3cgYW55IGVsZW1lbnQgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaWFnID0gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgICBpZCwgbWFwcGluZywgZWxlbWVudC5zdGFydFNvdXJjZVNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfRUxFTUVOVCksIGVycm9yTXNnKTtcbiAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goZGlhZyk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tQcm9wZXJ0eShcbiAgICAgIGlkOiBUZW1wbGF0ZUlkLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZCB7XG4gICAgaWYgKCFSRUdJU1RSWS5oYXNQcm9wZXJ0eShlbGVtZW50Lm5hbWUsIG5hbWUsIHNjaGVtYXMpKSB7XG4gICAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5yZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKGlkKTtcblxuICAgICAgbGV0IGVycm9yTXNnID1cbiAgICAgICAgICBgQ2FuJ3QgYmluZCB0byAnJHtuYW1lfScgc2luY2UgaXQgaXNuJ3QgYSBrbm93biBwcm9wZXJ0eSBvZiAnJHtlbGVtZW50Lm5hbWV9Jy5gO1xuICAgICAgaWYgKGVsZW1lbnQubmFtZS5zdGFydHNXaXRoKCduZy0nKSkge1xuICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgYFxcbjEuIElmICcke1xuICAgICAgICAgICAgICAgIG5hbWV9JyBpcyBhbiBBbmd1bGFyIGRpcmVjdGl2ZSwgdGhlbiBhZGQgJ0NvbW1vbk1vZHVsZScgdG8gdGhlICdATmdNb2R1bGUuaW1wb3J0cycgb2YgdGhpcyBjb21wb25lbnQuYCArXG4gICAgICAgICAgICBgXFxuMi4gVG8gYWxsb3cgYW55IHByb3BlcnR5IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5uYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgXFxuMS4gSWYgJyR7ZWxlbWVudC5uYW1lfScgaXMgYW4gQW5ndWxhciBjb21wb25lbnQgYW5kIGl0IGhhcyAnJHtcbiAgICAgICAgICAgICAgICBuYW1lfScgaW5wdXQsIHRoZW4gdmVyaWZ5IHRoYXQgaXQgaXMgcGFydCBvZiB0aGlzIG1vZHVsZS5gICtcbiAgICAgICAgICAgIGBcXG4yLiBJZiAnJHtcbiAgICAgICAgICAgICAgICBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIC5uYW1lfScgaXMgYSBXZWIgQ29tcG9uZW50IHRoZW4gYWRkICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudCB0byBzdXBwcmVzcyB0aGlzIG1lc3NhZ2UuYCArXG4gICAgICAgICAgICBgXFxuMy4gVG8gYWxsb3cgYW55IHByb3BlcnR5IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlhZyA9IG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgaWQsIG1hcHBpbmcsIHNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFKSwgZXJyb3JNc2cpO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==