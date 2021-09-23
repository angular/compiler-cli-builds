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
        define("@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry", ["require", "exports", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccReferencesRegistry = void 0;
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
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
                if (ref.bestGuessOwningModule === null && (0, utils_1.hasNameIdentifier)(ref.node)) {
                    var declaration = _this.host.getDeclarationOfIdentifier(ref.node.name);
                    if (declaration && (0, utils_1.hasNameIdentifier)(declaration.node)) {
                        _this.map.set(declaration.node.name, declaration);
                    }
                }
            });
        };
        /**
         * Create and return a mapping for the registered resolved references.
         * @returns A map of reference identifiers to reference declarations.
         */
        NgccReferencesRegistry.prototype.getDeclarationMap = function () {
            return this.map;
        };
        return NgccReferencesRegistry;
    }());
    exports.NgccReferencesRegistry = NgccReferencesRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2FuYWx5c2lzL25nY2NfcmVmZXJlbmNlc19yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFNSCw4REFBMkM7SUFFM0M7Ozs7OztPQU1HO0lBQ0g7UUFHRSxnQ0FBb0IsSUFBb0I7WUFBcEIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7WUFGaEMsUUFBRyxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBRVQsQ0FBQztRQUU1Qzs7OztXQUlHO1FBQ0gsb0NBQUcsR0FBSCxVQUFJLE1BQXVCO1lBQTNCLGlCQVVDO1lBVjRCLG9CQUEyQztpQkFBM0MsVUFBMkMsRUFBM0MscUJBQTJDLEVBQTNDLElBQTJDO2dCQUEzQyxtQ0FBMkM7O1lBQ3RFLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNwQixxRUFBcUU7Z0JBQ3JFLElBQUksR0FBRyxDQUFDLHFCQUFxQixLQUFLLElBQUksSUFBSSxJQUFBLHlCQUFpQixFQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDckUsSUFBTSxXQUFXLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN4RSxJQUFJLFdBQVcsSUFBSSxJQUFBLHlCQUFpQixFQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDdEQsS0FBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7cUJBQ2xEO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsa0RBQWlCLEdBQWpCO1lBQ0UsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ2xCLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUE3QkQsSUE2QkM7SUE3Qlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllcn0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFRoaXMgaXMgYSBwbGFjZSBmb3IgRGVjb3JhdG9ySGFuZGxlcnMgdG8gcmVnaXN0ZXIgcmVmZXJlbmNlcyB0aGF0IHRoZXlcbiAqIGZpbmQgaW4gdGhlaXIgYW5hbHlzaXMgb2YgdGhlIGNvZGUuXG4gKlxuICogVGhpcyByZWdpc3RyeSBpcyB1c2VkIHRvIGVuc3VyZSB0aGF0IHRoZXNlIHJlZmVyZW5jZXMgYXJlIHB1YmxpY2x5IGV4cG9ydGVkXG4gKiBmcm9tIGxpYnJhcmllcyB0aGF0IGFyZSBjb21waWxlZCBieSBuZ2NjLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeSBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDx0cy5JZGVudGlmaWVyLCBEZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBvbmUgb3IgbW9yZSByZWZlcmVuY2VzIGluIHRoZSByZWdpc3RyeS5cbiAgICogT25seSBgUmVzb2x2ZVJlZmVyZW5jZWAgcmVmZXJlbmNlcyBhcmUgc3RvcmVkLiBPdGhlciB0eXBlcyBhcmUgaWdub3JlZC5cbiAgICogQHBhcmFtIHJlZmVyZW5jZXMgQSBjb2xsZWN0aW9uIG9mIHJlZmVyZW5jZXMgdG8gcmVnaXN0ZXIuXG4gICAqL1xuICBhZGQoc291cmNlOiBEZWNsYXJhdGlvbk5vZGUsIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+W10pOiB2b2lkIHtcbiAgICByZWZlcmVuY2VzLmZvckVhY2gocmVmID0+IHtcbiAgICAgIC8vIE9ubHkgc3RvcmUgcmVsYXRpdmUgcmVmZXJlbmNlcy4gV2UgYXJlIG5vdCBpbnRlcmVzdGVkIGluIGxpdGVyYWxzLlxuICAgICAgaWYgKHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwgJiYgaGFzTmFtZUlkZW50aWZpZXIocmVmLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKHJlZi5ub2RlLm5hbWUpO1xuICAgICAgICBpZiAoZGVjbGFyYXRpb24gJiYgaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICB0aGlzLm1hcC5zZXQoZGVjbGFyYXRpb24ubm9kZS5uYW1lLCBkZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIHJldHVybiBhIG1hcHBpbmcgZm9yIHRoZSByZWdpc3RlcmVkIHJlc29sdmVkIHJlZmVyZW5jZXMuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIHJlZmVyZW5jZSBpZGVudGlmaWVycyB0byByZWZlcmVuY2UgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25NYXAoKTogTWFwPHRzLklkZW50aWZpZXIsIERlY2xhcmF0aW9uPiB7XG4gICAgcmV0dXJuIHRoaXMubWFwO1xuICB9XG59XG4iXX0=