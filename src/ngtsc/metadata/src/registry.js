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
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                for (var _b = tslib_1.__values(this.registries), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            return this.classes.has(declaration) || util_1.hasInjectableFields(declaration, this.host);
        };
        return InjectableClassRegistry;
    }());
    exports.InjectableClassRegistry = InjectableClassRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUgsMEVBQTJDO0lBRTNDOzs7T0FHRztJQUNIO1FBQUE7WUFDVSxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQW1DLENBQUM7WUFDeEQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1lBQ3RELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztRQXFCeEQsQ0FBQztRQW5CQyxvREFBb0IsR0FBcEIsVUFBcUIsR0FBZ0M7WUFDbkQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9FLENBQUM7UUFDRCxtREFBbUIsR0FBbkIsVUFBb0IsR0FBZ0M7WUFDbEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzdFLENBQUM7UUFDRCwrQ0FBZSxHQUFmLFVBQWdCLEdBQWdDO1lBQzlDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRSxDQUFDO1FBRUQseURBQXlCLEdBQXpCLFVBQTBCLElBQW1CO1lBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCx3REFBd0IsR0FBeEIsVUFBeUIsSUFBa0I7WUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELG9EQUFvQixHQUFwQixVQUFxQixJQUFjO1lBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUF4QkQsSUF3QkM7SUF4Qlksc0RBQXFCO0lBMEJsQzs7T0FFRztJQUNIO1FBQ0Usa0NBQW9CLFVBQThCO1lBQTlCLGVBQVUsR0FBVixVQUFVLENBQW9CO1FBQUcsQ0FBQztRQUV0RCw0REFBeUIsR0FBekIsVUFBMEIsSUFBbUI7OztnQkFDM0MsS0FBdUIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQW5DLElBQU0sUUFBUSxXQUFBO29CQUNqQixRQUFRLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzFDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOzs7Z0JBQ3pDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6Qzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUVELHVEQUFvQixHQUFwQixVQUFxQixJQUFjOzs7Z0JBQ2pDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNyQzs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQXBCRCxJQW9CQztJQXBCWSw0REFBd0I7SUFzQnJDOzs7T0FHRztJQUNIO1FBR0UsaUNBQW9CLElBQW9CO1lBQXBCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBRmhDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztRQUVILENBQUM7UUFFNUMsb0RBQWtCLEdBQWxCLFVBQW1CLFdBQTZCO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCw4Q0FBWSxHQUFaLFVBQWEsV0FBNkI7WUFDeEMsd0ZBQXdGO1lBQ3hGLDJGQUEyRjtZQUMzRiw4QkFBOEI7WUFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSwwQkFBbUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUFmRCxJQWVDO0lBZlksMERBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtoYXNJbmplY3RhYmxlRmllbGRzfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgcmVnaXN0cnkgb2YgZGlyZWN0aXZlLCBwaXBlLCBhbmQgbW9kdWxlIG1ldGFkYXRhIGZvciB0eXBlcyBkZWZpbmVkIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uXG4gKiB1bml0LCB3aGljaCBzdXBwb3J0cyBib3RoIHJlYWRpbmcgYW5kIHJlZ2lzdGVyaW5nLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIge1xuICBwcml2YXRlIGRpcmVjdGl2ZXMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERpcmVjdGl2ZU1ldGE+KCk7XG4gIHByaXZhdGUgbmdNb2R1bGVzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBOZ01vZHVsZU1ldGE+KCk7XG4gIHByaXZhdGUgcGlwZXMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFBpcGVNZXRhPigpO1xuXG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5kaXJlY3RpdmVzLmhhcyhyZWYubm9kZSkgPyB0aGlzLmRpcmVjdGl2ZXMuZ2V0KHJlZi5ub2RlKSEgOiBudWxsO1xuICB9XG4gIGdldE5nTW9kdWxlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBOZ01vZHVsZU1ldGF8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmdNb2R1bGVzLmhhcyhyZWYubm9kZSkgPyB0aGlzLm5nTW9kdWxlcy5nZXQocmVmLm5vZGUpISA6IG51bGw7XG4gIH1cbiAgZ2V0UGlwZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogUGlwZU1ldGF8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucGlwZXMuaGFzKHJlZi5ub2RlKSA/IHRoaXMucGlwZXMuZ2V0KHJlZi5ub2RlKSEgOiBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5kaXJlY3RpdmVzLnNldChtZXRhLnJlZi5ub2RlLCBtZXRhKTtcbiAgfVxuICByZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEobWV0YTogTmdNb2R1bGVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5uZ01vZHVsZXMuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKG1ldGE6IFBpcGVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5waXBlcy5zZXQobWV0YS5yZWYubm9kZSwgbWV0YSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBNZXRhZGF0YVJlZ2lzdHJ5YCB3aGljaCByZWdpc3RlcnMgbWV0ZGF0YSB3aXRoIG11bHRpcGxlIGRlbGVnYXRlIGBNZXRhZGF0YVJlZ2lzdHJ5YCBpbnN0YW5jZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkgaW1wbGVtZW50cyBNZXRhZGF0YVJlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWdpc3RyaWVzOiBNZXRhZGF0YVJlZ2lzdHJ5W10pIHt9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCByZWdpc3RyeSBvZiB0aGlzLnJlZ2lzdHJpZXMpIHtcbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKG1ldGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcmVnaXN0cnkgb2YgdGhpcy5yZWdpc3RyaWVzKSB7XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEobWV0YTogUGlwZU1ldGEpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHJlZ2lzdHJ5IG9mIHRoaXMucmVnaXN0cmllcykge1xuICAgICAgcmVnaXN0cnkucmVnaXN0ZXJQaXBlTWV0YWRhdGEobWV0YSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVnaXN0cnkgdGhhdCBrZWVwcyB0cmFjayBvZiBjbGFzc2VzIHRoYXQgY2FuIGJlIGNvbnN0cnVjdGVkIHZpYSBkZXBlbmRlbmN5IGluamVjdGlvbiAoZS5nLlxuICogaW5qZWN0YWJsZXMsIGRpcmVjdGl2ZXMsIHBpcGVzKS5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBjbGFzc2VzID0gbmV3IFNldDxDbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgcmVnaXN0ZXJJbmplY3RhYmxlKGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5jbGFzc2VzLmFkZChkZWNsYXJhdGlvbik7XG4gIH1cblxuICBpc0luamVjdGFibGUoZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICAvLyBGaWd1cmUgb3V0IHdoZXRoZXIgdGhlIGNsYXNzIGlzIGluamVjdGFibGUgYmFzZWQgb24gdGhlIHJlZ2lzdGVyZWQgY2xhc3Nlcywgb3RoZXJ3aXNlXG4gICAgLy8gZmFsbCBiYWNrIHRvIGxvb2tpbmcgYXQgaXRzIG1lbWJlcnMgc2luY2Ugd2UgbWlnaHQgbm90IGhhdmUgYmVlbiBhYmxlIHJlZ2lzdGVyIHRoZSBjbGFzc1xuICAgIC8vIGlmIGl0IHdhcyBjb21waWxlZCBhbHJlYWR5LlxuICAgIHJldHVybiB0aGlzLmNsYXNzZXMuaGFzKGRlY2xhcmF0aW9uKSB8fCBoYXNJbmplY3RhYmxlRmllbGRzKGRlY2xhcmF0aW9uLCB0aGlzLmhvc3QpO1xuICB9XG59XG4iXX0=