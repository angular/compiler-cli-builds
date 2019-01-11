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
        define("@angular/compiler-cli/src/ngcc/src/analysis/ngcc_references_registry", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
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
                // Only store resolved references. We are not interested in literals.
                if (ref instanceof imports_1.ResolvedReference && utils_1.hasNameIdentifier(ref.node)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9hbmFseXNpcy9uZ2NjX3JlZmVyZW5jZXNfcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFJSCxtRUFBb0U7SUFFcEUsa0VBQTJDO0lBRTNDOzs7Ozs7T0FNRztJQUNIO1FBR0UsZ0NBQW9CLElBQW9CO1lBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBRmhDLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztRQUVULENBQUM7UUFFNUM7Ozs7V0FJRztRQUNILG9DQUFHLEdBQUgsVUFBSSxNQUFzQjtZQUExQixpQkFVQztZQVYyQixvQkFBMEM7aUJBQTFDLFVBQTBDLEVBQTFDLHFCQUEwQyxFQUExQyxJQUEwQztnQkFBMUMsbUNBQTBDOztZQUNwRSxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDcEIscUVBQXFFO2dCQUNyRSxJQUFJLEdBQUcsWUFBWSwyQkFBaUIsSUFBSSx5QkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ25FLElBQU0sV0FBVyxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDeEUsSUFBSSxXQUFXLElBQUkseUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN0RCxLQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztxQkFDbEQ7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRDs7O1dBR0c7UUFDSCxrREFBaUIsR0FBakIsY0FBdUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRSw2QkFBQztJQUFELENBQUMsQUEzQkQsSUEyQkM7SUEzQlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge1JlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2V9IGZyb20gJy4uLy4uLy4uL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uLy4uL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtoYXNOYW1lSWRlbnRpZmllcn0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFRoaXMgaXMgYSBwbGFjZSBmb3IgRGVjb3JhdG9ySGFuZGxlcnMgdG8gcmVnaXN0ZXIgcmVmZXJlbmNlcyB0aGF0IHRoZXlcbiAqIGZpbmQgaW4gdGhlaXIgYW5hbHlzaXMgb2YgdGhlIGNvZGUuXG4gKlxuICogVGhpcyByZWdpc3RyeSBpcyB1c2VkIHRvIGVuc3VyZSB0aGF0IHRoZXNlIHJlZmVyZW5jZXMgYXJlIHB1YmxpY2x5IGV4cG9ydGVkXG4gKiBmcm9tIGxpYnJhcmllcyB0aGF0IGFyZSBjb21waWxlZCBieSBuZ2NjLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeSBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDx0cy5JZGVudGlmaWVyLCBEZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBvbmUgb3IgbW9yZSByZWZlcmVuY2VzIGluIHRoZSByZWdpc3RyeS5cbiAgICogT25seSBgUmVzb2x2ZVJlZmVyZW5jZWAgcmVmZXJlbmNlcyBhcmUgc3RvcmVkLiBPdGhlciB0eXBlcyBhcmUgaWdub3JlZC5cbiAgICogQHBhcmFtIHJlZmVyZW5jZXMgQSBjb2xsZWN0aW9uIG9mIHJlZmVyZW5jZXMgdG8gcmVnaXN0ZXIuXG4gICAqL1xuICBhZGQoc291cmNlOiB0cy5EZWNsYXJhdGlvbiwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdKTogdm9pZCB7XG4gICAgcmVmZXJlbmNlcy5mb3JFYWNoKHJlZiA9PiB7XG4gICAgICAvLyBPbmx5IHN0b3JlIHJlc29sdmVkIHJlZmVyZW5jZXMuIFdlIGFyZSBub3QgaW50ZXJlc3RlZCBpbiBsaXRlcmFscy5cbiAgICAgIGlmIChyZWYgaW5zdGFuY2VvZiBSZXNvbHZlZFJlZmVyZW5jZSAmJiBoYXNOYW1lSWRlbnRpZmllcihyZWYubm9kZSkpIHtcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSB0aGlzLmhvc3QuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIocmVmLm5vZGUubmFtZSk7XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICAgIHRoaXMubWFwLnNldChkZWNsYXJhdGlvbi5ub2RlLm5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgbWFwcGluZyBmb3IgdGhlIHJlZ2lzdGVyZWQgcmVzb2x2ZWQgcmVmZXJlbmNlcy5cbiAgICogQHJldHVybnMgQSBtYXAgb2YgcmVmZXJlbmNlIGlkZW50aWZpZXJzIHRvIHJlZmVyZW5jZSBkZWNsYXJhdGlvbnMuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk1hcCgpOiBNYXA8dHMuSWRlbnRpZmllciwgRGVjbGFyYXRpb24+IHsgcmV0dXJuIHRoaXMubWFwOyB9XG59XG4iXX0=