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
                var diag = diagnostics_2.makeTemplateDiagnostic(id, mapping, element.startSourceSpan, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SCHEMA_INVALID_ELEMENT), errorMsg);
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
                var diag = diagnostics_2.makeTemplateDiagnostic(id, mapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.SCHEMA_INVALID_ATTRIBUTE), errorMsg);
                this._diagnostics.push(diag);
            }
        };
        return RegistryDomSchemaChecker;
    }());
    exports.RegistryDomSchemaChecker = RegistryDomSchemaChecker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEc7SUFDNUcsK0JBQWlDO0lBRWpDLDJFQUF5RDtJQUd6RCx5RkFBaUc7SUFFakcsSUFBTSxRQUFRLEdBQUcsSUFBSSxtQ0FBd0IsRUFBRSxDQUFDO0lBQ2hELElBQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDO0lBNEN0Qzs7O09BR0c7SUFDSDtRQU9FLGtDQUFvQixRQUFnQztZQUFoQyxhQUFRLEdBQVIsUUFBUSxDQUF3QjtZQU41QyxpQkFBWSxHQUF5QixFQUFFLENBQUM7UUFNTyxDQUFDO1FBSnhELHNCQUFJLGlEQUFXO2lCQUFmO2dCQUNFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzQixDQUFDOzs7V0FBQTtRQUlELCtDQUFZLEdBQVosVUFBYSxFQUFjLEVBQUUsT0FBdUIsRUFBRSxPQUF5QjtZQUM3RSxxRkFBcUY7WUFDckYsd0ZBQXdGO1lBQ3hGLDJDQUEyQztZQUMzQyxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUUxRCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7Z0JBQ3ZDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5ELElBQUksUUFBUSxHQUFHLE1BQUksSUFBSSxnQ0FBNkIsQ0FBQztnQkFDckQsUUFBUTtvQkFDSixZQUFVLElBQUksNkVBQTBFLENBQUM7Z0JBQzdGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDMUIsUUFBUSxJQUFJLFlBQ1IsSUFBSSxrSUFBK0gsQ0FBQztpQkFDekk7cUJBQU07b0JBQ0wsUUFBUTt3QkFDSiw4RkFBOEYsQ0FBQztpQkFDcEc7Z0JBRUQsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQy9CLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUNqRSx5QkFBVyxDQUFDLHVCQUFTLENBQUMsc0JBQXNCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBRUQsZ0RBQWEsR0FBYixVQUNJLEVBQWMsRUFBRSxPQUF1QixFQUFFLElBQVksRUFBRSxJQUFxQixFQUM1RSxPQUF5QjtZQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRTtnQkFDdEQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFbkQsSUFBSSxRQUFRLEdBQ1Isb0JBQWtCLElBQUksOENBQXlDLE9BQU8sQ0FBQyxJQUFJLE9BQUksQ0FBQztnQkFDcEYsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDbEMsUUFBUTt3QkFDSixjQUNJLElBQUkscUdBQWtHOzRCQUMxRyxpR0FBaUcsQ0FBQztpQkFDdkc7cUJBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDekMsUUFBUTt3QkFDSixjQUFZLE9BQU8sQ0FBQyxJQUFJLDhDQUNwQixJQUFJLHlEQUFzRDs2QkFDOUQsY0FDSSxPQUFPO2lDQUNGLElBQUksa0lBQStILENBQUE7NEJBQzVJLGlHQUFpRyxDQUFDO2lCQUN2RztnQkFFRCxJQUFNLElBQUksR0FBRyxvQ0FBc0IsQ0FDL0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFDOUMseUJBQVcsQ0FBQyx1QkFBUyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQWpFRCxJQWlFQztJQWpFWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIFBhcnNlU291cmNlU3BhbiwgU2NoZW1hTWV0YWRhdGEsIFRtcGxBc3RFbGVtZW50fSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1RlbXBsYXRlSWR9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7bWFrZVRlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVEaWFnbm9zdGljLCBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL2RpYWdub3N0aWNzJztcblxuY29uc3QgUkVHSVNUUlkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG5jb25zdCBSRU1PVkVfWEhUTUxfUkVHRVggPSAvXjp4aHRtbDovO1xuXG4vKipcbiAqIENoZWNrcyBldmVyeSBub24tQW5ndWxhciBlbGVtZW50L3Byb3BlcnR5IHByb2Nlc3NlZCBpbiBhIHRlbXBsYXRlIGFuZCBwb3RlbnRpYWxseSBwcm9kdWNlc1xuICogYHRzLkRpYWdub3N0aWNgcyByZWxhdGVkIHRvIGltcHJvcGVyIHVzYWdlLlxuICpcbiAqIEEgYERvbVNjaGVtYUNoZWNrZXJgJ3Mgam9iIGlzIHRvIGNoZWNrIERPTSBub2RlcyBhbmQgdGhlaXIgYXR0cmlidXRlcyB3cml0dGVuIHVzZWQgaW4gdGVtcGxhdGVzXG4gKiBhbmQgcHJvZHVjZSBgdHMuRGlhZ25vc3RpY2BzIGlmIHRoZSBub2RlcyBkb24ndCBjb25mb3JtIHRvIHRoZSBET00gc3BlY2lmaWNhdGlvbi4gSXQgYWN0cyBhcyBhXG4gKiBjb2xsZWN0b3IgZm9yIHRoZXNlIGRpYWdub3N0aWNzLCBhbmQgY2FuIGJlIHF1ZXJpZWQgbGF0ZXIgdG8gcmV0cmlldmUgdGhlIGxpc3Qgb2YgYW55IHRoYXQgaGF2ZVxuICogYmVlbiBnZW5lcmF0ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9tU2NoZW1hQ2hlY2tlciB7XG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5EaWFnbm9zdGljYHMgdGhhdCBoYXZlIGJlZW4gZ2VuZXJhdGVkIHZpYSBgY2hlY2tFbGVtZW50YCBhbmQgYGNoZWNrUHJvcGVydHlgIGNhbGxzXG4gICAqIHRodXMgZmFyLlxuICAgKi9cbiAgcmVhZG9ubHkgZGlhZ25vc3RpY3M6IFJlYWRvbmx5QXJyYXk8VGVtcGxhdGVEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogQ2hlY2sgYSBub24tQW5ndWxhciBlbGVtZW50IGFuZCByZWNvcmQgYW55IGRpYWdub3N0aWNzIGFib3V0IGl0LlxuICAgKlxuICAgKiBAcGFyYW0gaWQgdGhlIHRlbXBsYXRlIElELCBzdWl0YWJsZSBmb3IgcmVzb2x1dGlvbiB3aXRoIGEgYFRjYlNvdXJjZVJlc29sdmVyYC5cbiAgICogQHBhcmFtIGVsZW1lbnQgdGhlIGVsZW1lbnQgbm9kZSBpbiBxdWVzdGlvbi5cbiAgICogQHBhcmFtIHNjaGVtYXMgYW55IGFjdGl2ZSBzY2hlbWFzIGZvciB0aGUgdGVtcGxhdGUsIHdoaWNoIG1pZ2h0IGFmZmVjdCB0aGUgdmFsaWRpdHkgb2YgdGhlXG4gICAqIGVsZW1lbnQuXG4gICAqL1xuICBjaGVja0VsZW1lbnQoaWQ6IHN0cmluZywgZWxlbWVudDogVG1wbEFzdEVsZW1lbnQsIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBDaGVjayBhIHByb3BlcnR5IGJpbmRpbmcgb24gYW4gZWxlbWVudCBhbmQgcmVjb3JkIGFueSBkaWFnbm9zdGljcyBhYm91dCBpdC5cbiAgICpcbiAgICogQHBhcmFtIGlkIHRoZSB0ZW1wbGF0ZSBJRCwgc3VpdGFibGUgZm9yIHJlc29sdXRpb24gd2l0aCBhIGBUY2JTb3VyY2VSZXNvbHZlcmAuXG4gICAqIEBwYXJhbSBlbGVtZW50IHRoZSBlbGVtZW50IG5vZGUgaW4gcXVlc3Rpb24uXG4gICAqIEBwYXJhbSBuYW1lIHRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSBiZWluZyBjaGVja2VkLlxuICAgKiBAcGFyYW0gc3BhbiB0aGUgc291cmNlIHNwYW4gb2YgdGhlIGJpbmRpbmcuIFRoaXMgaXMgcmVkdW5kYW50IHdpdGggYGVsZW1lbnQuYXR0cmlidXRlc2AgYnV0IGlzXG4gICAqIHBhc3NlZCBzZXBhcmF0ZWx5IHRvIGF2b2lkIGhhdmluZyB0byBsb29rIHVwIHRoZSBwYXJ0aWN1bGFyIHByb3BlcnR5IG5hbWUuXG4gICAqIEBwYXJhbSBzY2hlbWFzIGFueSBhY3RpdmUgc2NoZW1hcyBmb3IgdGhlIHRlbXBsYXRlLCB3aGljaCBtaWdodCBhZmZlY3QgdGhlIHZhbGlkaXR5IG9mIHRoZVxuICAgKiBwcm9wZXJ0eS5cbiAgICovXG4gIGNoZWNrUHJvcGVydHkoXG4gICAgICBpZDogc3RyaW5nLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgbmFtZTogc3RyaW5nLCBzcGFuOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdKTogdm9pZDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgbm9uLUFuZ3VsYXIgZWxlbWVudHMgYW5kIHByb3BlcnRpZXMgYWdhaW5zdCB0aGUgYERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeWAsIGEgc2NoZW1hXG4gKiBtYWludGFpbmVkIGJ5IHRoZSBBbmd1bGFyIHRlYW0gdmlhIGV4dHJhY3Rpb24gZnJvbSBhIGJyb3dzZXIgSURMLlxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnlEb21TY2hlbWFDaGVja2VyIGltcGxlbWVudHMgRG9tU2NoZW1hQ2hlY2tlciB7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNzOiBUZW1wbGF0ZURpYWdub3N0aWNbXSA9IFtdO1xuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PFRlbXBsYXRlRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLl9kaWFnbm9zdGljcztcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpIHt9XG5cbiAgY2hlY2tFbGVtZW50KGlkOiBUZW1wbGF0ZUlkLCBlbGVtZW50OiBUbXBsQXN0RWxlbWVudCwgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSk6IHZvaWQge1xuICAgIC8vIEhUTUwgZWxlbWVudHMgaW5zaWRlIGFuIFNWRyBgZm9yZWlnbk9iamVjdGAgYXJlIGRlY2xhcmVkIGluIHRoZSBgeGh0bWxgIG5hbWVzcGFjZS5cbiAgICAvLyBXZSBuZWVkIHRvIHN0cmlwIGl0IGJlZm9yZSBoYW5kaW5nIGl0IG92ZXIgdG8gdGhlIHJlZ2lzdHJ5IGJlY2F1c2UgYWxsIEhUTUwgdGFnIG5hbWVzXG4gICAgLy8gaW4gdGhlIHJlZ2lzdHJ5IGFyZSB3aXRob3V0IGEgbmFtZXNwYWNlLlxuICAgIGNvbnN0IG5hbWUgPSBlbGVtZW50Lm5hbWUucmVwbGFjZShSRU1PVkVfWEhUTUxfUkVHRVgsICcnKTtcblxuICAgIGlmICghUkVHSVNUUlkuaGFzRWxlbWVudChuYW1lLCBzY2hlbWFzKSkge1xuICAgICAgY29uc3QgbWFwcGluZyA9IHRoaXMucmVzb2x2ZXIuZ2V0U291cmNlTWFwcGluZyhpZCk7XG5cbiAgICAgIGxldCBlcnJvck1zZyA9IGAnJHtuYW1lfScgaXMgbm90IGEga25vd24gZWxlbWVudDpcXG5gO1xuICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICBgMS4gSWYgJyR7bmFtZX0nIGlzIGFuIEFuZ3VsYXIgY29tcG9uZW50LCB0aGVuIHZlcmlmeSB0aGF0IGl0IGlzIHBhcnQgb2YgdGhpcyBtb2R1bGUuXFxuYDtcbiAgICAgIGlmIChuYW1lLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAgIGVycm9yTXNnICs9IGAyLiBJZiAnJHtcbiAgICAgICAgICAgIG5hbWV9JyBpcyBhIFdlYiBDb21wb25lbnQgdGhlbiBhZGQgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50IHRvIHN1cHByZXNzIHRoaXMgbWVzc2FnZS5gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICAgIGAyLiBUbyBhbGxvdyBhbnkgZWxlbWVudCBhZGQgJ05PX0VSUk9SU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50LmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRpYWcgPSBtYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIGlkLCBtYXBwaW5nLCBlbGVtZW50LnN0YXJ0U291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5TQ0hFTUFfSU5WQUxJRF9FTEVNRU5UKSwgZXJyb3JNc2cpO1xuICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChkaWFnKTtcbiAgICB9XG4gIH1cblxuICBjaGVja1Byb3BlcnR5KFxuICAgICAgaWQ6IFRlbXBsYXRlSWQsIGVsZW1lbnQ6IFRtcGxBc3RFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHNwYW46IFBhcnNlU291cmNlU3BhbixcbiAgICAgIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10pOiB2b2lkIHtcbiAgICBpZiAoIVJFR0lTVFJZLmhhc1Byb3BlcnR5KGVsZW1lbnQubmFtZSwgbmFtZSwgc2NoZW1hcykpIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnJlc29sdmVyLmdldFNvdXJjZU1hcHBpbmcoaWQpO1xuXG4gICAgICBsZXQgZXJyb3JNc2cgPVxuICAgICAgICAgIGBDYW4ndCBiaW5kIHRvICcke25hbWV9JyBzaW5jZSBpdCBpc24ndCBhIGtub3duIHByb3BlcnR5IG9mICcke2VsZW1lbnQubmFtZX0nLmA7XG4gICAgICBpZiAoZWxlbWVudC5uYW1lLnN0YXJ0c1dpdGgoJ25nLScpKSB7XG4gICAgICAgIGVycm9yTXNnICs9XG4gICAgICAgICAgICBgXFxuMS4gSWYgJyR7XG4gICAgICAgICAgICAgICAgbmFtZX0nIGlzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLCB0aGVuIGFkZCAnQ29tbW9uTW9kdWxlJyB0byB0aGUgJ0BOZ01vZHVsZS5pbXBvcnRzJyBvZiB0aGlzIGNvbXBvbmVudC5gICtcbiAgICAgICAgICAgIGBcXG4yLiBUbyBhbGxvdyBhbnkgcHJvcGVydHkgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfSBlbHNlIGlmIChlbGVtZW50Lm5hbWUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgICAgZXJyb3JNc2cgKz1cbiAgICAgICAgICAgIGBcXG4xLiBJZiAnJHtlbGVtZW50Lm5hbWV9JyBpcyBhbiBBbmd1bGFyIGNvbXBvbmVudCBhbmQgaXQgaGFzICcke1xuICAgICAgICAgICAgICAgIG5hbWV9JyBpbnB1dCwgdGhlbiB2ZXJpZnkgdGhhdCBpdCBpcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLmAgK1xuICAgICAgICAgICAgYFxcbjIuIElmICcke1xuICAgICAgICAgICAgICAgIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLm5hbWV9JyBpcyBhIFdlYiBDb21wb25lbnQgdGhlbiBhZGQgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnIHRvIHRoZSAnQE5nTW9kdWxlLnNjaGVtYXMnIG9mIHRoaXMgY29tcG9uZW50IHRvIHN1cHByZXNzIHRoaXMgbWVzc2FnZS5gICtcbiAgICAgICAgICAgIGBcXG4zLiBUbyBhbGxvdyBhbnkgcHJvcGVydHkgYWRkICdOT19FUlJPUlNfU0NIRU1BJyB0byB0aGUgJ0BOZ01vZHVsZS5zY2hlbWFzJyBvZiB0aGlzIGNvbXBvbmVudC5gO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkaWFnID0gbWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgICBpZCwgbWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG5nRXJyb3JDb2RlKEVycm9yQ29kZS5TQ0hFTUFfSU5WQUxJRF9BVFRSSUJVVEUpLCBlcnJvck1zZyk7XG4gICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGRpYWcpO1xuICAgIH1cbiAgfVxufVxuIl19