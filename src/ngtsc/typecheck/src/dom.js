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
    exports.RegistryDomSchemaChecker = void 0;
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
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
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, element.sourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
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
                var diag = diagnostics_2.makeTemplateDiagnostic(mapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
                this._diagnostics.push(diag);
            }
        };
        return RegistryDomSchemaChecker;
    }());
    exports.RegistryDomSchemaChecker = RegistryDomSchemaChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEc7SUFDNUcsK0JBQWlDO0lBRWpDLDJFQUF5RDtJQUd6RCx5RkFBNkU7SUFFN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBd0IsRUFBRSxDQUFDO0lBQ2hELElBQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDO0lBNEN0Qzs7O09BR0c7SUFDSDtRQU9FLGtDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQU41QyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFNWSxDQUFDO1FBSnhELHNCQUFJLGlEQUFXO2lCQUFmO2dCQUNFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzQixDQUFDOzs7V0FBQTtRQUlELCtDQUFZLEdBQVosVUFBYSxFQUFjLEVBQUUsT0FBdUIsRUFBRSxPQUF5QjtZQUM3RSxxRkFBcUY7WUFDckYsd0ZBQXdGO1lBQ3hGLDJDQUEyQztZQUMzQyxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUUxRCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3ZDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUFHLE1BQUksSUFBSSxnQ0FBNkIsQ0FBQztnQkFDckQsUUFBUTtvQkFDSixZQUFVLElBQUksNkVBQTBFLENBQUM7Z0JBQzdGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDMUIsUUFBUSxJQUFJLFlBQ1IsSUFBSSxrSUFBK0gsQ0FBQztpQkFDekk7cUJBQU07b0JBQ0wsUUFBUTt3QkFDSiw4RkFBOEYsQ0FBQztpQkFDcEc7Z0JBRUQsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQy9CLE9BQU8sRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQ3hELHlCQUFXLENBQUMsdUJBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtRQUNILENBQUM7UUFFRCxnREFBYSxHQUFiLFVBQ0ksRUFBYyxFQUFFLE9BQXVCLEVBQUUsSUFBWSxFQUFFLElBQXFCLEVBQzVFLE9BQXlCO1lBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFO2dCQUN0RCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUVuRCxJQUFJLFFBQVEsR0FDUixvQkFBa0IsSUFBSSw4Q0FBeUMsT0FBTyxDQUFDLElBQUksT0FBSSxDQUFDO2dCQUNwRixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNsQyxRQUFRO3dCQUNKLGNBQ0ksSUFBSSxxR0FBa0c7NEJBQzFHLGlHQUFpRyxDQUFDO2lCQUN2RztxQkFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUN6QyxRQUFRO3dCQUNKLGNBQVksT0FBTyxDQUFDLElBQUksOENBQ3BCLElBQUkseURBQXNEOzZCQUM5RCxjQUNJLE9BQU87aUNBQ0YsSUFBSSxrSUFBK0gsQ0FBQTs0QkFDNUksaUdBQWlHLENBQUM7aUJBQ3ZHO2dCQUVELElBQU0sSUFBSSxHQUFHLG9DQUFzQixDQUMvQixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQzFDLHlCQUFXLENBQUMsdUJBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtRQUNILENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUFqRUQsSUFpRUM7SUFqRVksNERBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgUGFyc2VTb3VyY2VTcGFuLCBTY2hlbWFNZXRhZGF0YSwgVG1wbEFzdEVsZW1lbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtUZW1wbGF0ZUlkfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge21ha2VUZW1wbGF0ZURpYWdub3N0aWMsIFRlbXBsYXRlU291cmNlUmVzb2x2ZXJ9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuXG5jb25zdCBSRUdJU1RSWSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbmNvbnN0IFJFTU9WRV9YSFRNTF9SRUdFWCA9IC9eOnhodG1sOi87XG5cbi8qKlxuICogQ2hlY2tzIGV2ZXJ5IG5vbi1Bbmd1bGFyIGVsZW1lbnQvcHJvcGVydHkgcHJvY2Vzc2VkIGluIGEgdGVtcGxhdGUgYW5kIHBvdGVudGlhbGx5IHByb2R1Y2VzXG4gKiBgdHMuRGlhZ25vc3RpY2BzIHJlbGF0ZWQgdG8gaW1wcm9wZXIgdXNhZ2UuXG4gKlxuICogQSBgRG9tU2NoZW1hQ2hlY2tlcmAncyBqb2IgaXMgdG8gY2hlY2sgRE9NIG5vZGVzIGFuZCB0aGVpciBhdHRyaWJ1dGVzIHdyaXR0ZW4gdXNlZCBpbiB0ZW1wbGF0ZXNcbiAqIGFuZCBwcm9kdWNlIGB0cy5EaWFnbm9zdGljYHMgaWYgdGhlIG5vZGVzIGRvbid0IGNvbmZvcm0gdG8gdGhlIERPTSBzcGVjaWZpY2F0aW9uLiBJdCBhY3RzIGFzIGFcbiAqIGNvbGxlY3RvciBmb3IgdGhlc2UgZGlhZ25vc3RpY3MsIGFuZCBjYW4gYmUgcXVlcmllZCBsYXRlciB0byByZXRyaWV2ZSB0aGUgbGlzdCBvZiBhbnkgdGhhdCBoYXZlXG4gKiBiZWVuIGdlbmVyYXRlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEb21TY2hlbWFDaGVja2VyIHtcbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLkRpYWdub3N0aWNgcyB0aGF0IGhhdmUgYmVlbiBnZW5lcmF0ZWQgdmlhIGBjaGVja0VsZW1lbnRgIGFuZCBgY2hlY2tQcm9wZXJ0eWAgY2FsbHNcbiAgICogdGh1cyBmYXIuXG4gICAqL1xuICByZWFkb25seSBkaWFnbm9zdGljczogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogQ2hlY2sgYSBub24tQW5ndWxhciBlbGVtZW50IGFuZCByZWNvcmQgYW55IGRpYWdub3N0aWNzIGFib3V0IGl0LlxuICAgKlxuICAgKiBAcGFyYW0gaWQgdGhlIHRlbXBsYXRlIElELCBzdWl0YWJsZSBmb3IgcmVzb2x1dGlvbiB3aXRoIGEgYFRjYlNvdXJjZVJlc29sdmVyYC5cbiAgICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgbm9kZSBpbiBxdWVzdGlvbi5cbiAgICogQHBhcmFtIHNjaGVtYXMgYW55IGFjdGl2ZSBzY2hlbWFzIGZvciB0aGUgdGVtcGxhdGUsIHdoaWNoIG1pZ2h0IGFmZmVjdCB0aGUgdmFsaWRpdHkgb2YgdGhlXG4gICAqIGVsZW1lbnQuXG4gICAqL1xuICBjaGVja0VsZW1lbnQoaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBDaGVjayBhIHByb3BlcnR5IGJpbmRpbmcgb24gYW4gZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBuYW1lIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBiZWluZyBjaGVja2VkLlxuICAgKiBAcGFyYW0gc3BhbiB0aGUgc291cmNlIHNwYW4gb2YgdGhlIGJpbmRpbmcuIFRoaXMgaXMgcmVkdW5kYW50IHdpdGggYGVsZW1lbnQuYXR0cmlidXRlc2AgYnV0IGlzXG4gICAqIHBhc3NlZCBzZXBhcmF0ZWx5IHRvIGF2b2lkIGhhdmluZyB0byBsb29rIHVwIHRoZSBwYXJ0aWN1bGFyIHByb3BlcnR5IG5hbWUuXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBwcm9wZXJ0eS5cbiAgICovXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgbm9uLUFuZ3VsYXIgZWxlbWVudHMgYW5kIHByb3BlcnRpZXMgYWdhaW5zdCB0aGUgYERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeWAsIGEgc2NoZW1hXG4gKiBtYWludGFpbmVkIGJ5IHRoZSBBbmd1bGFyIHRlYW0gdmlhIGV4dHJhY3Rpb24gZnJvbSBhIGJyb3dzZXIgSURMLlxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyIGltcGxlbWVudHMgRG9tU2NoZW1hQ2hlY2tlciB7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMuX2RpYWdub3N0aWNzO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcikge31cblxuICBjaGVja0VsZW1lbnQoaWQ6IFRlbXBsYXRlSWQsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZCB7XG4gICAgLy8gSFRNTCBlbGVtZW50cyBpbnNpZGUgYW4gU1ZHIGBmb3JlaWduT2JqZWN0YCBhcmUgZGVjbGFyZWQgaW4gdGhlIGB4aHRtbGAgbmFtZXNwYWNlLlxuICAgIC8vIFdlIG5lZWQgdG8gc3RyaXAgaXQgYmVmb3JlIGhhbmRpbmcgaXQgb3ZlciB0byB0aGUgcmVnaXN0cnkgYmVjYXVzZSBhbGwgSFRNTCB0YWcgbmFtZXNcbiAgICAvLyBpbiB0aGUgcmVnaXN0cnkgYXJlIHdpdGhvdXQgYSBuYW1lc3BhY2UuXG4gICAgY29uc3QgbmFtZSA9IGVsZW1lbnQubmFtZS5yZXBsYWNlKFJFTU9WRV9YSFRNTF9SRUdFWCwgJycpO1xuXG4gICAgaWYgKCFSRUdJU1RSWS5oYXNFbGVtZW50KG5hbWUsIHNjaGVtYXMpKSB7XG4gICAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5yZXNvbHZlci5nZXRTb3VyY2VNYXBwaW5nKGlkKTtcblxuICAgICAgbGV0IGVycm9yTXNnID0gYCcke25hbWV9JyBpcyBub3QgYSBrbm93biBlbGVtZW50OlxcbmA7XG4gICAgICBlcnJvck1zZyArPVxuICAgICAgICAgIGAxLiBJZiAnJHtuYW1lfScgaXMgYW4gQW5ndWxhciBjb21wb25lbnQsIHRoZW4gdmVyaWZ5IHRoYXQgaXQgaXMgcGFydCBvZiB0aGlzIG1vZHVsZS5cXG5gO1xuICAgICAgaWYgKG5hbWUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgICAgZXJyb3JNc2cgKz0gYDIuIElmICcke1xuICAgICAgICAgICAgbmFtZX0nIGlzIGEgV2ViIENvbXBvbmVudCB0aGVuIGFkZCAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQgdG8gc3VwcHJlc3MgdGhpcyBtZXNzYWdlLmA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgYDIuIFRvIGFsbG93IGFueSBlbGVtZW50IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlhZyA9IG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgbWFwcGluZywgZWxlbWVudC5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0VMRU1FTlQpLCBlcnJvck1zZyk7XG4gICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGRpYWcpO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogVGVtcGxhdGVJZCwgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3BhbjogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQge1xuICAgIGlmICghUkVHSVNUUlkuaGFzUHJvcGVydHkoZWxlbWVudC5uYW1lLCBuYW1lLCBzY2hlbWFzKSkge1xuICAgICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhpZCk7XG5cbiAgICAgIGxldCBlcnJvck1zZyA9XG4gICAgICAgICAgYENhbid0IGJpbmQgdG8gJyR7bmFtZX0nIHNpbmNlIGl0IGlzbid0IGEga25vd24gcHJvcGVydHkgb2YgJyR7ZWxlbWVudC5uYW1lfScuYDtcbiAgICAgIGlmIChlbGVtZW50Lm5hbWUuc3RhcnRzV2l0aCgnbmctJykpIHtcbiAgICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICAgIGBcXG4xLiBJZiAnJHtcbiAgICAgICAgICAgICAgICBuYW1lfScgaXMgYW4gQW5ndWxhciBkaXJlY3RpdmUsIHRoZW4gYWRkICdDb21tb25Nb2R1bGUnIHRvIHRoZSAnQE5nTW9kdWxlLmltcG9ydHMnIG9mIHRoaXMgY29tcG9uZW50LmAgK1xuICAgICAgICAgICAgYFxcbjIuIFRvIGFsbG93IGFueSBwcm9wZXJ0eSBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICB9IGVsc2UgaWYgKGVsZW1lbnQubmFtZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgYFxcbjEuIElmICcke2VsZW1lbnQubmFtZX0nIGlzIGFuIEFuZ3VsYXIgY29tcG9uZW50IGFuZCBpdCBoYXMgJyR7XG4gICAgICAgICAgICAgICAgbmFtZX0nIGlucHV0LCB0aGVuIHZlcmlmeSB0aGF0IGl0IGlzIHBhcnQgb2YgdGhpcyBtb2R1bGUuYCArXG4gICAgICAgICAgICBgXFxuMi4gSWYgJyR7XG4gICAgICAgICAgICAgICAgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAubmFtZX0nIGlzIGEgV2ViIENvbXBvbmVudCB0aGVuIGFkZCAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQgdG8gc3VwcHJlc3MgdGhpcyBtZXNzYWdlLmAgK1xuICAgICAgICAgICAgYFxcbjMuIFRvIGFsbG93IGFueSBwcm9wZXJ0eSBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpYWcgPSBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIG1hcHBpbmcsIHNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBuZ0Vycm9yQ29kZShFcnJvckNvZGUuU0NIRU1BX0lOVkFMSURfQVRUUklCVVRFKSwgZXJyb3JNc2cpO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==