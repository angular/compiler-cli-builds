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
            get: function () { return this._diagnostics; },
            enumerable: true,
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
                    errorMsg +=
                        "2. If '" + name + "' is a Web Component then add 'CUSTOM_ELEMENTS_SCHEMA' to the '@NgModule.schemas' of this component to suppress this message.";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhDQUE0RztJQUM1RywrQkFBaUM7SUFFakMsMkVBQTRDO0lBRTVDLHlGQUF3RTtJQUV4RSxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUFDaEQsSUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUM7SUE0Q3RDOzs7T0FHRztJQUNIO1FBS0Usa0NBQW9CLFFBQTJCO1lBQTNCLGFBQVEsR0FBUixRQUFRLENBQW1CO1lBSnZDLGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQUlPLENBQUM7UUFGbkQsc0JBQUksaURBQVc7aUJBQWYsY0FBa0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFJN0UsK0NBQVksR0FBWixVQUFhLEVBQVUsRUFBRSxPQUF1QixFQUFFLE9BQXlCO1lBQ3pFLHFGQUFxRjtZQUNyRix3RkFBd0Y7WUFDeEYsMkNBQTJDO1lBQzNDLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBRTFELElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRTtnQkFDdkMsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFbkQsSUFBSSxRQUFRLEdBQUcsTUFBSSxJQUFJLGdDQUE2QixDQUFDO2dCQUNyRCxRQUFRO29CQUNKLFlBQVUsSUFBSSw2RUFBMEUsQ0FBQztnQkFDN0YsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO29CQUMxQixRQUFRO3dCQUNKLFlBQVUsSUFBSSxrSUFBK0gsQ0FBQztpQkFDbko7cUJBQU07b0JBQ0wsUUFBUTt3QkFDSiw4RkFBOEYsQ0FBQztpQkFDcEc7Z0JBRUQsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQy9CLE9BQU8sRUFBRSxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQ3hELHVCQUFTLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUVELGdEQUFhLEdBQWIsVUFDSSxFQUFVLEVBQUUsT0FBdUIsRUFBRSxJQUFZLEVBQUUsSUFBcUIsRUFDeEUsT0FBeUI7WUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3RELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUNSLG9CQUFrQixJQUFJLDhDQUF5QyxPQUFPLENBQUMsSUFBSSxPQUFJLENBQUM7Z0JBQ3BGLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2xDLFFBQVE7d0JBQ0osY0FBWSxJQUFJLHFHQUFrRzs0QkFDbEgsaUdBQWlHLENBQUM7aUJBQ3ZHO3FCQUFNLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7b0JBQ3pDLFFBQVE7d0JBQ0osY0FBWSxPQUFPLENBQUMsSUFBSSw4Q0FBeUMsSUFBSSx5REFBc0Q7NkJBQzNILGNBQVksT0FBTyxDQUFDLElBQUksa0lBQStILENBQUE7NEJBQ3ZKLGlHQUFpRyxDQUFDO2lCQUN2RztnQkFFRCxJQUFNLElBQUksR0FBRyxvQ0FBc0IsQ0FDL0IsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLHVCQUFTLENBQUMsd0JBQXdCLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzlGLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFERCxJQTBEQztJQTFEWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBQYXJzZVNvdXJjZVNwYW4sIFNjaGVtYU1ldGFkYXRhLCBUbXBsQXN0RWxlbWVudH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7VGNiU291cmNlUmVzb2x2ZXIsIG1ha2VUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuXG5jb25zdCBSRUdJU1RSWSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbmNvbnN0IFJFTU9WRV9YSFRNTF9SRUdFWCA9IC9eOnhodG1sOi87XG5cbi8qKlxuICogQ2hlY2tzIGV2ZXJ5IG5vbi1Bbmd1bGFyIGVsZW1lbnQvcHJvcGVydHkgcHJvY2Vzc2VkIGluIGEgdGVtcGxhdGUgYW5kIHBvdGVudGlhbGx5IHByb2R1Y2VzXG4gKiBgdHMuRGlhZ25vc3RpY2BzIHJlbGF0ZWQgdG8gaW1wcm9wZXIgdXNhZ2UuXG4gKlxuICogQSBgRG9tU2NoZW1hQ2hlY2tlcmAncyBqb2IgaXMgdG8gY2hlY2sgRE9NIG5vZGVzIGFuZCB0aGVpciBhdHRyaWJ1dGVzIHdyaXR0ZW4gdXNlZCBpbiB0ZW1wbGF0ZXNcbiAqIGFuZCBwcm9kdWNlIGB0cy5EaWFnbm9zdGljYHMgaWYgdGhlIG5vZGVzIGRvbid0IGNvbmZvcm0gdG8gdGhlIERPTSBzcGVjaWZpY2F0aW9uLiBJdCBhY3RzIGFzIGFcbiAqIGNvbGxlY3RvciBmb3IgdGhlc2UgZGlhZ25vc3RpY3MsIGFuZCBjYW4gYmUgcXVlcmllZCBsYXRlciB0byByZXRyaWV2ZSB0aGUgbGlzdCBvZiBhbnkgdGhhdCBoYXZlXG4gKiBiZWVuIGdlbmVyYXRlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEb21TY2hlbWFDaGVja2VyIHtcbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLkRpYWdub3N0aWNgcyB0aGF0IGhhdmUgYmVlbiBnZW5lcmF0ZWQgdmlhIGBjaGVja0VsZW1lbnRgIGFuZCBgY2hlY2tQcm9wZXJ0eWAgY2FsbHNcbiAgICogdGh1cyBmYXIuXG4gICAqL1xuICByZWFkb25seSBkaWFnbm9zdGljczogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogQ2hlY2sgYSBub24tQW5ndWxhciBlbGVtZW50IGFuZCByZWNvcmQgYW55IGRpYWdub3N0aWNzIGFib3V0IGl0LlxuICAgKlxuICAgKiBAcGFyYW0gaWQgdGhlIHRlbXBsYXRlIElELCBzdWl0YWJsZSBmb3IgcmVzb2x1dGlvbiB3aXRoIGEgYFRjYlNvdXJjZVJlc29sdmVyYC5cbiAgICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgbm9kZSBpbiBxdWVzdGlvbi5cbiAgICogQHBhcmFtIHNjaGVtYXMgYW55IGFjdGl2ZSBzY2hlbWFzIGZvciB0aGUgdGVtcGxhdGUsIHdoaWNoIG1pZ2h0IGFmZmVjdCB0aGUgdmFsaWRpdHkgb2YgdGhlXG4gICAqIGVsZW1lbnQuXG4gICAqL1xuICBjaGVja0VsZW1lbnQoaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBDaGVjayBhIHByb3BlcnR5IGJpbmRpbmcgb24gYW4gZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBuYW1lIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBiZWluZyBjaGVja2VkLlxuICAgKiBAcGFyYW0gc3BhbiB0aGUgc291cmNlIHNwYW4gb2YgdGhlIGJpbmRpbmcuIFRoaXMgaXMgcmVkdW5kYW50IHdpdGggYGVsZW1lbnQuYXR0cmlidXRlc2AgYnV0IGlzXG4gICAqIHBhc3NlZCBzZXBhcmF0ZWx5IHRvIGF2b2lkIGhhdmluZyB0byBsb29rIHVwIHRoZSBwYXJ0aWN1bGFyIHByb3BlcnR5IG5hbWUuXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBwcm9wZXJ0eS5cbiAgICovXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgbm9uLUFuZ3VsYXIgZWxlbWVudHMgYW5kIHByb3BlcnRpZXMgYWdhaW5zdCB0aGUgYERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeWAsIGEgc2NoZW1hXG4gKiBtYWludGFpbmVkIGJ5IHRoZSBBbmd1bGFyIHRlYW0gdmlhIGV4dHJhY3Rpb24gZnJvbSBhIGJyb3dzZXIgSURMLlxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyIGltcGxlbWVudHMgRG9tU2NoZW1hQ2hlY2tlciB7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7IHJldHVybiB0aGlzLl9kaWFnbm9zdGljczsgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb2x2ZXI6IFRjYlNvdXJjZVJlc29sdmVyKSB7fVxuXG4gIGNoZWNrRWxlbWVudChpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQge1xuICAgIC8vIEhUTUwgZWxlbWVudHMgaW5zaWRlIGFuIFNWRyBgZm9yZWlnbk9iamVjdGAgYXJlIGRlY2xhcmVkIGluIHRoZSBgeGh0bWxgIG5hbWVzcGFjZS5cbiAgICAvLyBXZSBuZWVkIHRvIHN0cmlwIGl0IGJlZm9yZSBoYW5kaW5nIGl0IG92ZXIgdG8gdGhlIHJlZ2lzdHJ5IGJlY2F1c2UgYWxsIEhUTUwgdGFnIG5hbWVzXG4gICAgLy8gaW4gdGhlIHJlZ2lzdHJ5IGFyZSB3aXRob3V0IGEgbmFtZXNwYWNlLlxuICAgIGNvbnN0IG5hbWUgPSBlbGVtZW50Lm5hbWUucmVwbGFjZShSRU1PVkVfWEhUTUxfUkVHRVgsICcnKTtcblxuICAgIGlmICghUkVHSVNUUlkuaGFzRWxlbWVudChuYW1lLCBzY2hlbWFzKSkge1xuICAgICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhpZCk7XG5cbiAgICAgIGxldCBlcnJvck1zZyA9IGAnJHtuYW1lfScgaXMgbm90IGEga25vd24gZWxlbWVudDpcXG5gO1xuICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICBgMS4gSWYgJyR7bmFtZX0nIGlzIGFuIEFuZ3VsYXIgY29tcG9uZW50LCB0aGVuIHZlcmlmeSB0aGF0IGl0IGlzIHBhcnQgb2YgdGhpcyBtb2R1bGUuXFxuYDtcbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgMi4gSWYgJyR7bmFtZX0nIGlzIGEgV2ViIENvbXBvbmVudCB0aGVuIGFkZCAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQgdG8gc3VwcHJlc3MgdGhpcyBtZXNzYWdlLmA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnJvck1zZyArPVxuICAgICAgICAgICAgYDIuIFRvIGFsbG93IGFueSBlbGVtZW50IGFkZCAnTk9fRVJST1JTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQuYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGlhZyA9IG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgbWFwcGluZywgZWxlbWVudC5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0VMRU1FTlQsIGVycm9yTXNnKTtcbiAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goZGlhZyk7XG4gICAgfVxuICB9XG5cbiAgY2hlY2tQcm9wZXJ0eShcbiAgICAgIGlkOiBzdHJpbmcsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkIHtcbiAgICBpZiAoIVJFR0lTVFJZLmhhc1Byb3BlcnR5KGVsZW1lbnQubmFtZSwgbmFtZSwgc2NoZW1hcykpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoaWQpO1xuXG4gICAgICBsZXQgZXJyb3JNc2cgPVxuICAgICAgICAgIGBDYW4ndCBiaW5kIHRvICcke25hbWV9JyBzaW5jZSBpdCBpc24ndCBhIGtub3duIHByb3BlcnR5IG9mICcke2VsZW1lbnQubmFtZX0nLmA7XG4gICAgICBpZiAoZWxlbWVudC5uYW1lLnN0YXJ0c1dpdGgoJ25nLScpKSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgXFxuMS4gSWYgJyR7bmFtZX0nIGlzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLCB0aGVuIGFkZCAnQ29tbW9uTW9kdWxlJyB0byB0aGUgJ0BOZ01vZHVsZS5pbXBvcnRzJyBvZiB0aGlzIGNvbXBvbmVudC5gICtcbiAgICAgICAgICAgIGBcXG4yLiBUbyBhbGxvdyBhbnkgcHJvcGVydHkgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfSBlbHNlIGlmIChlbGVtZW50Lm5hbWUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICAgIGBcXG4xLiBJZiAnJHtlbGVtZW50Lm5hbWV9JyBpcyBhbiBBbmd1bGFyIGNvbXBvbmVudCBhbmQgaXQgaGFzICcke25hbWV9JyBpbnB1dCwgdGhlbiB2ZXJpZnkgdGhhdCBpdCBpcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLmAgK1xuICAgICAgICAgICAgYFxcbjIuIElmICcke2VsZW1lbnQubmFtZX0nIGlzIGEgV2ViIENvbXBvbmVudCB0aGVuIGFkZCAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQScgdG8gdGhlICdATmdNb2R1bGUuc2NoZW1hcycgb2YgdGhpcyBjb21wb25lbnQgdG8gc3VwcHJlc3MgdGhpcyBtZXNzYWdlLmAgK1xuICAgICAgICAgICAgYFxcbjMuIFRvIGFsbG93IGFueSBwcm9wZXJ0eSBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpYWcgPSBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIG1hcHBpbmcsIHNwYW4sIHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvciwgRXJyb3JDb2RlLlNDSEVNQV9JTlZBTElEX0FUVFJJQlVURSwgZXJyb3JNc2cpO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==