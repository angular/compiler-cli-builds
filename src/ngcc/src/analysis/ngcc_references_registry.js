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
        define("@angular/compiler-cli/src/ngcc/src/analysis/ngcc_references_registry", ["require", "exports", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    /**
     * This is a place for DecoratorHandlers to register references that they
     * find in their analysis of the code.
     *
     * This registry is used to ensure that these references are publicly exported
     * from libraries that are compiled by ngcc.
     */
    var NgccReferencesRegistry = /** @class */ (function () {
        function NgccReferencesRegistry(host) {
            this.host = host;
            this.map = new Map();
        }
        /**
         * Register one or more references in the registry.
         * Only `ResolveReference` references are stored. Other types are ignored.
         * @param references A collection of references to register.
         */
        NgccReferencesRegistry.prototype.add = function (source) {
            var _this = this;
            var references = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                references[_i - 1] = arguments[_i];
            }
            references.forEach(function (ref) {
                // Only store relative references. We are not interested in literals.
                if (ref.bestGuessOwningModule === null && utils_1.hasNameIdentifier(ref.node)) {
                    var declaration = _this.host.getDeclarationOfIdentifier(ref.node.name);
                    if (declaration && utils_1.hasNameIdentifier(declaration.node)) {
                        _this.map.set(declaration.node.name, declaration);
                    }
                }
            });
        };
        /**
         * Create and return a mapping for the registered resolved references.
         * @returns A map of reference identifiers to reference declarations.
         */
        NgccReferencesRegistry.prototype.getDeclarationMap = function () { return this.map; };
        return NgccReferencesRegistry;
    }());
    exports.NgccReferencesRegistry = NgccReferencesRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9hbmFseXNpcy9uZ2NjX3JlZmVyZW5jZXNfcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFNSCxrRUFBMkM7SUFFM0M7Ozs7OztPQU1HO0lBQ0g7UUFHRSxnQ0FBb0IsSUFBb0I7WUFBcEIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7WUFGaEMsUUFBRyxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBRVQsQ0FBQztRQUU1Qzs7OztXQUlHO1FBQ0gsb0NBQUcsR0FBSCxVQUFJLE1BQXNCO1lBQTFCLGlCQVVDO1lBVjJCLG9CQUEwQztpQkFBMUMsVUFBMEMsRUFBMUMscUJBQTBDLEVBQTFDLElBQTBDO2dCQUExQyxtQ0FBMEM7O1lBQ3BFLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNwQixxRUFBcUU7Z0JBQ3JFLElBQUksR0FBRyxDQUFDLHFCQUFxQixLQUFLLElBQUksSUFBSSx5QkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3JFLElBQU0sV0FBVyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDeEUsSUFBSSxXQUFXLElBQUkseUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN0RCxLQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztxQkFDbEQ7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRDs7O1dBR0c7UUFDSCxrREFBaUIsR0FBakIsY0FBdUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRSw2QkFBQztJQUFELENBQUMsQUEzQkQsSUEyQkM7SUEzQlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2hhc05hbWVJZGVudGlmaWVyfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogVGhpcyBpcyBhIHBsYWNlIGZvciBEZWNvcmF0b3JIYW5kbGVycyB0byByZWdpc3RlciByZWZlcmVuY2VzIHRoYXQgdGhleVxuICogZmluZCBpbiB0aGVpciBhbmFseXNpcyBvZiB0aGUgY29kZS5cbiAqXG4gKiBUaGlzIHJlZ2lzdHJ5IGlzIHVzZWQgdG8gZW5zdXJlIHRoYXQgdGhlc2UgcmVmZXJlbmNlcyBhcmUgcHVibGljbHkgZXhwb3J0ZWRcbiAqIGZyb20gbGlicmFyaWVzIHRoYXQgYXJlIGNvbXBpbGVkIGJ5IG5nY2MuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5IGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPHRzLklkZW50aWZpZXIsIERlY2xhcmF0aW9uPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIG9uZSBvciBtb3JlIHJlZmVyZW5jZXMgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgKiBPbmx5IGBSZXNvbHZlUmVmZXJlbmNlYCByZWZlcmVuY2VzIGFyZSBzdG9yZWQuIE90aGVyIHR5cGVzIGFyZSBpZ25vcmVkLlxuICAgKiBAcGFyYW0gcmVmZXJlbmNlcyBBIGNvbGxlY3Rpb24gb2YgcmVmZXJlbmNlcyB0byByZWdpc3Rlci5cbiAgICovXG4gIGFkZChzb3VyY2U6IHRzLkRlY2xhcmF0aW9uLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICByZWZlcmVuY2VzLmZvckVhY2gocmVmID0+IHtcbiAgICAgIC8vIE9ubHkgc3RvcmUgcmVsYXRpdmUgcmVmZXJlbmNlcy4gV2UgYXJlIG5vdCBpbnRlcmVzdGVkIGluIGxpdGVyYWxzLlxuICAgICAgaWYgKHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwgJiYgaGFzTmFtZUlkZW50aWZpZXIocmVmLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKHJlZi5ub2RlLm5hbWUpO1xuICAgICAgICBpZiAoZGVjbGFyYXRpb24gJiYgaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICB0aGlzLm1hcC5zZXQoZGVjbGFyYXRpb24ubm9kZS5uYW1lLCBkZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIG1hcHBpbmcgZm9yIHRoZSByZWdpc3RlcmVkIHJlc29sdmVkIHJlZmVyZW5jZXMuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIHJlZmVyZW5jZSBpZGVudGlmaWVycyB0byByZWZlcmVuY2UgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25NYXAoKTogTWFwPHRzLklkZW50aWZpZXIsIERlY2xhcmF0aW9uPiB7IHJldHVybiB0aGlzLm1hcDsgfVxufVxuIl19