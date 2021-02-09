(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/metadata", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticDepGraphAdapter = void 0;
    var SemanticDepGraphAdapter = /** @class */ (function () {
        function SemanticDepGraphAdapter(updater) {
            this.updater = updater;
        }
        SemanticDepGraphAdapter.prototype.registerDirectiveMetadata = function (meta) {
            this.updater.addDirective(meta);
        };
        SemanticDepGraphAdapter.prototype.registerNgModuleMetadata = function (meta) {
            this.updater.addNgModule(meta);
        };
        SemanticDepGraphAdapter.prototype.registerPipeMetadata = function (meta) {
            this.updater.addPipe(meta);
        };
        return SemanticDepGraphAdapter;
    }());
    exports.SemanticDepGraphAdapter = SemanticDepGraphAdapter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL25nbW9kdWxlX3NlbWFudGljcy9zcmMvbWV0YWRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBVUE7UUFDRSxpQ0FBb0IsT0FBZ0M7WUFBaEMsWUFBTyxHQUFQLE9BQU8sQ0FBeUI7UUFBRyxDQUFDO1FBRXhELDJEQUF5QixHQUF6QixVQUEwQixJQUFtQjtZQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsMERBQXdCLEdBQXhCLFVBQXlCLElBQWtCO1lBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxzREFBb0IsR0FBcEIsVUFBcUIsSUFBYztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBZEQsSUFjQztJQWRZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlZ2lzdHJ5LCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1NlbWFudGljRGVwR3JhcGhVcGRhdGVyfSBmcm9tICcuL2dyYXBoJztcblxuZXhwb3J0IGNsYXNzIFNlbWFudGljRGVwR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdXBkYXRlcjogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIpIHt9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGVyLmFkZERpcmVjdGl2ZShtZXRhKTtcbiAgfVxuXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShtZXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZXIuYWRkTmdNb2R1bGUobWV0YSk7XG4gIH1cblxuICByZWdpc3RlclBpcGVNZXRhZGF0YShtZXRhOiBQaXBlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlci5hZGRQaXBlKG1ldGEpO1xuICB9XG59XG4iXX0=