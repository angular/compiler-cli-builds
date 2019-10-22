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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/registry", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * A registry of directive, pipe, and module metadata for types defined in the current compilation
     * unit, which supports both reading and registering.
     */
    var LocalMetadataRegistry = /** @class */ (function () {
        function LocalMetadataRegistry() {
            this.abstractDirectives = new Set();
            this.directives = new Map();
            this.ngModules = new Map();
            this.pipes = new Map();
        }
        LocalMetadataRegistry.prototype.isAbstractDirective = function (ref) {
            return this.abstractDirectives.has(ref.node);
        };
        LocalMetadataRegistry.prototype.getDirectiveMetadata = function (ref) {
            return this.directives.has(ref.node) ? this.directives.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.getNgModuleMetadata = function (ref) {
            return this.ngModules.has(ref.node) ? this.ngModules.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.getPipeMetadata = function (ref) {
            return this.pipes.has(ref.node) ? this.pipes.get(ref.node) : null;
        };
        LocalMetadataRegistry.prototype.registerAbstractDirective = function (clazz) { this.abstractDirectives.add(clazz); };
        LocalMetadataRegistry.prototype.registerDirectiveMetadata = function (meta) { this.directives.set(meta.ref.node, meta); };
        LocalMetadataRegistry.prototype.registerNgModuleMetadata = function (meta) { this.ngModules.set(meta.ref.node, meta); };
        LocalMetadataRegistry.prototype.registerPipeMetadata = function (meta) { this.pipes.set(meta.ref.node, meta); };
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
        CompoundMetadataRegistry.prototype.registerAbstractDirective = function (clazz) {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerAbstractDirective(clazz);
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
        CompoundMetadataRegistry.prototype.registerDirectiveMetadata = function (meta) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerDirectiveMetadata(meta);
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
        CompoundMetadataRegistry.prototype.registerNgModuleMetadata = function (meta) {
            var e_3, _a;
            try {
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerNgModuleMetadata(meta);
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
        CompoundMetadataRegistry.prototype.registerPipeMetadata = function (meta) {
            var e_4, _a;
            try {
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var registry = _c.value;
                    registry.registerPipeMetadata(meta);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        return CompoundMetadataRegistry;
    }());
    exports.CompoundMetadataRegistry = CompoundMetadataRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFPSDs7O09BR0c7SUFDSDtRQUFBO1lBQ1UsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7WUFDakQsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1lBQ3hELGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztZQUN0RCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7UUFtQnhELENBQUM7UUFqQkMsbURBQW1CLEdBQW5CLFVBQW9CLEdBQWdDO1lBQ2xELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELG9EQUFvQixHQUFwQixVQUFxQixHQUFnQztZQUNuRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDaEYsQ0FBQztRQUNELG1EQUFtQixHQUFuQixVQUFvQixHQUFnQztZQUNsRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDOUUsQ0FBQztRQUNELCtDQUFlLEdBQWYsVUFBZ0IsR0FBZ0M7WUFDOUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3RFLENBQUM7UUFFRCx5REFBeUIsR0FBekIsVUFBMEIsS0FBdUIsSUFBVSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRyx5REFBeUIsR0FBekIsVUFBMEIsSUFBbUIsSUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEcsd0RBQXdCLEdBQXhCLFVBQXlCLElBQWtCLElBQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLG9EQUFvQixHQUFwQixVQUFxQixJQUFjLElBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLDRCQUFDO0lBQUQsQ0FBQyxBQXZCRCxJQXVCQztJQXZCWSxzREFBcUI7SUF5QmxDOztPQUVHO0lBQ0g7UUFDRSxrQ0FBb0IsVUFBOEI7WUFBOUIsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7UUFBRyxDQUFDO1FBRXRELDREQUF5QixHQUF6QixVQUEwQixLQUF1Qjs7O2dCQUMvQyxLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbkMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDM0M7Ozs7Ozs7OztRQUNILENBQUM7UUFFRCw0REFBeUIsR0FBekIsVUFBMEIsSUFBbUI7OztnQkFDM0MsS0FBdUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQW5DLElBQU0sUUFBUSxXQUFBO29CQUNqQixRQUFRLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOzs7Z0JBQ3pDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6Qzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELHVEQUFvQixHQUFwQixVQUFxQixJQUFjOzs7Z0JBQ2pDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNyQzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFCRCxJQTBCQztJQTFCWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IG9mIGRpcmVjdGl2ZSwgcGlwZSwgYW5kIG1vZHVsZSBtZXRhZGF0YSBmb3IgdHlwZXMgZGVmaW5lZCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvblxuICogdW5pdCwgd2hpY2ggc3VwcG9ydHMgYm90aCByZWFkaW5nIGFuZCByZWdpc3RlcmluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsTWV0YWRhdGFSZWdpc3RyeSBpbXBsZW1lbnRzIE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyIHtcbiAgcHJpdmF0ZSBhYnN0cmFjdERpcmVjdGl2ZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG4gIHByaXZhdGUgZGlyZWN0aXZlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgcHJpdmF0ZSBuZ01vZHVsZXMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIE5nTW9kdWxlTWV0YT4oKTtcbiAgcHJpdmF0ZSBwaXBlcyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUGlwZU1ldGE+KCk7XG5cbiAgaXNBYnN0cmFjdERpcmVjdGl2ZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFic3RyYWN0RGlyZWN0aXZlcy5oYXMocmVmLm5vZGUpO1xuICB9XG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5kaXJlY3RpdmVzLmhhcyhyZWYubm9kZSkgPyB0aGlzLmRpcmVjdGl2ZXMuZ2V0KHJlZi5ub2RlKSAhIDogbnVsbDtcbiAgfVxuICBnZXROZ01vZHVsZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTmdNb2R1bGVNZXRhfG51bGwge1xuICAgIHJldHVybiB0aGlzLm5nTW9kdWxlcy5oYXMocmVmLm5vZGUpID8gdGhpcy5uZ01vZHVsZXMuZ2V0KHJlZi5ub2RlKSAhIDogbnVsbDtcbiAgfVxuICBnZXRQaXBlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBQaXBlTWV0YXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5waXBlcy5oYXMocmVmLm5vZGUpID8gdGhpcy5waXBlcy5nZXQocmVmLm5vZGUpICEgOiBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXJBYnN0cmFjdERpcmVjdGl2ZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQgeyB0aGlzLmFic3RyYWN0RGlyZWN0aXZlcy5hZGQoY2xhenopOyB9XG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YTogRGlyZWN0aXZlTWV0YSk6IHZvaWQgeyB0aGlzLmRpcmVjdGl2ZXMuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpOyB9XG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShtZXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHsgdGhpcy5uZ01vZHVsZXMuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpOyB9XG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKG1ldGE6IFBpcGVNZXRhKTogdm9pZCB7IHRoaXMucGlwZXMuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpOyB9XG59XG5cbi8qKlxuICogQSBgTWV0YWRhdGFSZWdpc3RyeWAgd2hpY2ggcmVnaXN0ZXJzIG1ldGRhdGEgd2l0aCBtdWx0aXBsZSBkZWxlZ2F0ZSBgTWV0YWRhdGFSZWdpc3RyeWAgaW5zdGFuY2VzLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVnaXN0cmllczogTWV0YWRhdGFSZWdpc3RyeVtdKSB7fVxuXG4gIHJlZ2lzdGVyQWJzdHJhY3REaXJlY3RpdmUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHJlZ2lzdHJ5IG9mIHRoaXMucmVnaXN0cmllcykge1xuICAgICAgcmVnaXN0cnkucmVnaXN0ZXJBYnN0cmFjdERpcmVjdGl2ZShjbGF6eik7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByZWdpc3RyeSBvZiB0aGlzLnJlZ2lzdHJpZXMpIHtcbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKG1ldGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVnaXN0cnkgb2YgdGhpcy5yZWdpc3RyaWVzKSB7XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEobWV0YTogUGlwZU1ldGEpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZ2lzdHJ5IG9mIHRoaXMucmVnaXN0cmllcykge1xuICAgICAgcmVnaXN0cnkucmVnaXN0ZXJQaXBlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG59XG4iXX0=