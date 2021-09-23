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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/registry", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/metadata/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InjectableClassRegistry = exports.CompoundMetadataRegistry = exports.LocalMetadataRegistry = void 0;
    var tslib_1 = require("tslib");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/util");
    /**
     * A registry of directive, pipe, and module metadata for types defined in the current compilation
     * unit, which supports both reading and registering.
     */
    var LocalMetadataRegistry = /** @class */ (function () {
        function LocalMetadataRegistry() {
            this.directives = new Map();
            this.ngModules = new Map();
            this.pipes = new Map();
        }
        LocalMetadataRegistry.prototype.getDirectiveMetadata = function (ref) {
            return this.directives.has(ref.node) ? this.directives.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.getNgModuleMetadata = function (ref) {
            return this.ngModules.has(ref.node) ? this.ngModules.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.getPipeMetadata = function (ref) {
            return this.pipes.has(ref.node) ? this.pipes.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.registerDirectiveMetadata = function (meta) {
            this.directives.set(meta.ref.node, meta);
        };
        LocalMetadataRegistry.prototype.registerNgModuleMetadata = function (meta) {
            this.ngModules.set(meta.ref.node, meta);
        };
        LocalMetadataRegistry.prototype.registerPipeMetadata = function (meta) {
            this.pipes.set(meta.ref.node, meta);
        };
        return LocalMetadataRegistry;
    }());
    exports.LocalMetadataRegistry = LocalMetadataRegistry;
    /**
     * A `MetadataRegistry` which registers metdata with multiple delegate `MetadataRegistry` instances.
     */
    var CompoundMetadataRegistry = /** @class */ (function () {
        function CompoundMetadataRegistry(registries) {
            this.registries = registries;
        }
        CompoundMetadataRegistry.prototype.registerDirectiveMetadata = function (meta) {
            var e_1, _a;
            try {
                for (var _b = (0, tslib_1.__values)(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerDirectiveMetadata(meta);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        CompoundMetadataRegistry.prototype.registerNgModuleMetadata = function (meta) {
            var e_2, _a;
            try {
                for (var _b = (0, tslib_1.__values)(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerNgModuleMetadata(meta);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        CompoundMetadataRegistry.prototype.registerPipeMetadata = function (meta) {
            var e_3, _a;
            try {
                for (var _b = (0, tslib_1.__values)(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerPipeMetadata(meta);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        return CompoundMetadataRegistry;
    }());
    exports.CompoundMetadataRegistry = CompoundMetadataRegistry;
    /**
     * Registry that keeps track of classes that can be constructed via dependency injection (e.g.
     * injectables, directives, pipes).
     */
    var InjectableClassRegistry = /** @class */ (function () {
        function InjectableClassRegistry(host) {
            this.host = host;
            this.classes = new Set();
        }
        InjectableClassRegistry.prototype.registerInjectable = function (declaration) {
            this.classes.add(declaration);
        };
        InjectableClassRegistry.prototype.isInjectable = function (declaration) {
            // Figure out whether the class is injectable based on the registered classes, otherwise
            // fall back to looking at its members since we might not have been able register the class
            // if it was compiled already.
            return this.classes.has(declaration) || (0, util_1.hasInjectableFields)(declaration, this.host);
        };
        return InjectableClassRegistry;
    }());
    exports.InjectableClassRegistry = InjectableClassRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUgsMEVBQTJDO0lBRTNDOzs7T0FHRztJQUNIO1FBQUE7WUFDVSxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDeEQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1lBQ3RELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztRQXFCeEQsQ0FBQztRQW5CQyxvREFBb0IsR0FBcEIsVUFBcUIsR0FBZ0M7WUFDbkQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9FLENBQUM7UUFDRCxtREFBbUIsR0FBbkIsVUFBb0IsR0FBZ0M7WUFDbEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzdFLENBQUM7UUFDRCwrQ0FBZSxHQUFmLFVBQWdCLEdBQWdDO1lBQzlDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRSxDQUFDO1FBRUQseURBQXlCLEdBQXpCLFVBQTBCLElBQW1CO1lBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCx3REFBd0IsR0FBeEIsVUFBeUIsSUFBa0I7WUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELG9EQUFvQixHQUFwQixVQUFxQixJQUFjO1lBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUF4QkQsSUF3QkM7SUF4Qlksc0RBQXFCO0lBMEJsQzs7T0FFRztJQUNIO1FBQ0Usa0NBQW9CLFVBQThCO1lBQTlCLGVBQVUsR0FBVixVQUFVLENBQW9CO1FBQUcsQ0FBQztRQUV0RCw0REFBeUIsR0FBekIsVUFBMEIsSUFBbUI7OztnQkFDM0MsS0FBdUIsSUFBQSxLQUFBLHNCQUFBLElBQUksQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQW5DLElBQU0sUUFBUSxXQUFBO29CQUNqQixRQUFRLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOzs7Z0JBQ3pDLEtBQXVCLElBQUEsS0FBQSxzQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6Qzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELHVEQUFvQixHQUFwQixVQUFxQixJQUFjOzs7Z0JBQ2pDLEtBQXVCLElBQUEsS0FBQSxzQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNyQzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQXBCRCxJQW9CQztJQXBCWSw0REFBd0I7SUFzQnJDOzs7T0FHRztJQUNIO1FBR0UsaUNBQW9CLElBQW9CO1lBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBRmhDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztRQUVILENBQUM7UUFFNUMsb0RBQWtCLEdBQWxCLFVBQW1CLFdBQTZCO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCw4Q0FBWSxHQUFaLFVBQWEsV0FBNkI7WUFDeEMsd0ZBQXdGO1lBQ3hGLDJGQUEyRjtZQUMzRiw4QkFBOEI7WUFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFBLDBCQUFtQixFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQWZELElBZUM7SUFmWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7aGFzSW5qZWN0YWJsZUZpZWxkc30gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IG9mIGRpcmVjdGl2ZSwgcGlwZSwgYW5kIG1vZHVsZSBtZXRhZGF0YSBmb3IgdHlwZXMgZGVmaW5lZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvblxuICogdW5pdCwgd2hpY2ggc3VwcG9ydHMgYm90aCByZWFkaW5nIGFuZCByZWdpc3RlcmluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsTWV0YWRhdGFSZWdpc3RyeSBpbXBsZW1lbnRzIE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyIHtcbiAgcHJpdmF0ZSBkaXJlY3RpdmVzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICBwcml2YXRlIG5nTW9kdWxlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTmdNb2R1bGVNZXRhPigpO1xuICBwcml2YXRlIHBpcGVzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcblxuICBnZXREaXJlY3RpdmVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZGlyZWN0aXZlcy5oYXMocmVmLm5vZGUpID8gdGhpcy5kaXJlY3RpdmVzLmdldChyZWYubm9kZSkhIDogbnVsbDtcbiAgfVxuICBnZXROZ01vZHVsZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTmdNb2R1bGVNZXRhfG51bGwge1xuICAgIHJldHVybiB0aGlzLm5nTW9kdWxlcy5oYXMocmVmLm5vZGUpID8gdGhpcy5uZ01vZHVsZXMuZ2V0KHJlZi5ub2RlKSEgOiBudWxsO1xuICB9XG4gIGdldFBpcGVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IFBpcGVNZXRhfG51bGwge1xuICAgIHJldHVybiB0aGlzLnBpcGVzLmhhcyhyZWYubm9kZSkgPyB0aGlzLnBpcGVzLmdldChyZWYubm9kZSkhIDogbnVsbDtcbiAgfVxuXG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YTogRGlyZWN0aXZlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMuZGlyZWN0aXZlcy5zZXQobWV0YS5yZWYubm9kZSwgbWV0YSk7XG4gIH1cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKG1ldGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMubmdNb2R1bGVzLnNldChtZXRhLnJlZi5ub2RlLCBtZXRhKTtcbiAgfVxuICByZWdpc3RlclBpcGVNZXRhZGF0YShtZXRhOiBQaXBlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMucGlwZXMuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG59XG5cbi8qKlxuICogQSBgTWV0YWRhdGFSZWdpc3RyeWAgd2hpY2ggcmVnaXN0ZXJzIG1ldGRhdGEgd2l0aCBtdWx0aXBsZSBkZWxlZ2F0ZSBgTWV0YWRhdGFSZWdpc3RyeWAgaW5zdGFuY2VzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVnaXN0cmllczogTWV0YWRhdGFSZWdpc3RyeVtdKSB7fVxuXG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YTogRGlyZWN0aXZlTWV0YSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVnaXN0cnkgb2YgdGhpcy5yZWdpc3RyaWVzKSB7XG4gICAgICByZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKG1ldGEpO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShtZXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZ2lzdHJ5IG9mIHRoaXMucmVnaXN0cmllcykge1xuICAgICAgcmVnaXN0cnkucmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKG1ldGEpO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKG1ldGE6IFBpcGVNZXRhKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByZWdpc3RyeSBvZiB0aGlzLnJlZ2lzdHJpZXMpIHtcbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyUGlwZU1ldGFkYXRhKG1ldGEpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlZ2lzdHJ5IHRoYXQga2VlcHMgdHJhY2sgb2YgY2xhc3NlcyB0aGF0IGNhbiBiZSBjb25zdHJ1Y3RlZCB2aWEgZGVwZW5kZW5jeSBpbmplY3Rpb24gKGUuZy5cbiAqIGluamVjdGFibGVzLCBkaXJlY3RpdmVzLCBwaXBlcykuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSB7XG4gIHByaXZhdGUgY2xhc3NlcyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIHJlZ2lzdGVySW5qZWN0YWJsZShkZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMuY2xhc3Nlcy5hZGQoZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgaXNJbmplY3RhYmxlKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgLy8gRmlndXJlIG91dCB3aGV0aGVyIHRoZSBjbGFzcyBpcyBpbmplY3RhYmxlIGJhc2VkIG9uIHRoZSByZWdpc3RlcmVkIGNsYXNzZXMsIG90aGVyd2lzZVxuICAgIC8vIGZhbGwgYmFjayB0byBsb29raW5nIGF0IGl0cyBtZW1iZXJzIHNpbmNlIHdlIG1pZ2h0IG5vdCBoYXZlIGJlZW4gYWJsZSByZWdpc3RlciB0aGUgY2xhc3NcbiAgICAvLyBpZiBpdCB3YXMgY29tcGlsZWQgYWxyZWFkeS5cbiAgICByZXR1cm4gdGhpcy5jbGFzc2VzLmhhcyhkZWNsYXJhdGlvbikgfHwgaGFzSW5qZWN0YWJsZUZpZWxkcyhkZWNsYXJhdGlvbiwgdGhpcy5ob3N0KTtcbiAgfVxufVxuIl19