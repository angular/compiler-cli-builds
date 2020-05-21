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
        define("@angular/compiler-cli/src/transformers/metadata_cache", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MetadataCache = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    /**
     * Cache, and potentially transform, metadata as it is being collected.
     */
    var MetadataCache = /** @class */ (function () {
        function MetadataCache(collector, strict, transformers) {
            var e_1, _a;
            this.collector = collector;
            this.strict = strict;
            this.transformers = transformers;
            this.metadataCache = new Map();
            try {
                for (var transformers_1 = tslib_1.__values(transformers), transformers_1_1 = transformers_1.next(); !transformers_1_1.done; transformers_1_1 = transformers_1.next()) {
                    var transformer = transformers_1_1.value;
                    if (transformer.connect) {
                        transformer.connect(this);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (transformers_1_1 && !transformers_1_1.done && (_a = transformers_1.return)) _a.call(transformers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        MetadataCache.prototype.getMetadata = function (sourceFile) {
            var e_2, _a;
            if (this.metadataCache.has(sourceFile.fileName)) {
                return this.metadataCache.get(sourceFile.fileName);
            }
            var substitute = undefined;
            // Only process transformers on modules that are not declaration files.
            var declarationFile = sourceFile.isDeclarationFile;
            var moduleFile = ts.isExternalModule(sourceFile);
            if (!declarationFile && moduleFile) {
                var _loop_1 = function (transform) {
                    var transformSubstitute = transform.start(sourceFile);
                    if (transformSubstitute) {
                        if (substitute) {
                            var previous_1 = substitute;
                            substitute = function (value, node) {
                                return transformSubstitute(previous_1(value, node), node);
                            };
                        }
                        else {
                            substitute = transformSubstitute;
                        }
                    }
                };
                try {
                    for (var _b = tslib_1.__values(this.transformers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var transform = _c.value;
                        _loop_1(transform);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            var isTsFile = util_1.TS.test(sourceFile.fileName);
            var result = this.collector.getMetadata(sourceFile, this.strict && isTsFile, substitute);
            this.metadataCache.set(sourceFile.fileName, result);
            return result;
        };
        return MetadataCache;
    }());
    exports.MetadataCache = MetadataCache;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGFfY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9tZXRhZGF0YV9jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBS2pDLG9FQUEwQjtJQVMxQjs7T0FFRztJQUNIO1FBR0UsdUJBQ1ksU0FBNEIsRUFBbUIsTUFBZSxFQUM5RCxZQUFtQzs7WUFEbkMsY0FBUyxHQUFULFNBQVMsQ0FBbUI7WUFBbUIsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUM5RCxpQkFBWSxHQUFaLFlBQVksQ0FBdUI7WUFKdkMsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQzs7Z0JBS2xFLEtBQXdCLElBQUEsaUJBQUEsaUJBQUEsWUFBWSxDQUFBLDBDQUFBLG9FQUFFO29CQUFqQyxJQUFJLFdBQVcseUJBQUE7b0JBQ2xCLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRTt3QkFDdkIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDM0I7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRCxtQ0FBVyxHQUFYLFVBQVksVUFBeUI7O1lBQ25DLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNwRDtZQUNELElBQUksVUFBVSxHQUE2QixTQUFTLENBQUM7WUFFckQsdUVBQXVFO1lBQ3ZFLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztZQUNyRCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLGVBQWUsSUFBSSxVQUFVLEVBQUU7d0NBQ3pCLFNBQVM7b0JBQ2hCLElBQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDeEQsSUFBSSxtQkFBbUIsRUFBRTt3QkFDdkIsSUFBSSxVQUFVLEVBQUU7NEJBQ2QsSUFBTSxVQUFRLEdBQW1CLFVBQVUsQ0FBQzs0QkFDNUMsVUFBVSxHQUFHLFVBQUMsS0FBb0IsRUFBRSxJQUFhO2dDQUM3QyxPQUFBLG1CQUFtQixDQUFDLFVBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUFoRCxDQUFnRCxDQUFDO3lCQUN0RDs2QkFBTTs0QkFDTCxVQUFVLEdBQUcsbUJBQW1CLENBQUM7eUJBQ2xDO3FCQUNGOzs7b0JBVkgsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxZQUFZLENBQUEsZ0JBQUE7d0JBQWxDLElBQUksU0FBUyxXQUFBO2dDQUFULFNBQVM7cUJBV2pCOzs7Ozs7Ozs7YUFDRjtZQUVELElBQU0sUUFBUSxHQUFHLFNBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMzRixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3BELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUExQ0QsSUEwQ0M7SUExQ1ksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge01ldGFkYXRhQ29sbGVjdG9yLCBNZXRhZGF0YVZhbHVlLCBNb2R1bGVNZXRhZGF0YX0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuXG5pbXBvcnQge01ldGFkYXRhUHJvdmlkZXJ9IGZyb20gJy4vY29tcGlsZXJfaG9zdCc7XG5pbXBvcnQge1RTfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgdHlwZSBWYWx1ZVRyYW5zZm9ybSA9ICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSkgPT4gTWV0YWRhdGFWYWx1ZTtcblxuZXhwb3J0IGludGVyZmFjZSBNZXRhZGF0YVRyYW5zZm9ybWVyIHtcbiAgY29ubmVjdD8oY2FjaGU6IE1ldGFkYXRhQ2FjaGUpOiB2b2lkO1xuICBzdGFydChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogVmFsdWVUcmFuc2Zvcm18dW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIENhY2hlLCBhbmQgcG90ZW50aWFsbHkgdHJhbnNmb3JtLCBtZXRhZGF0YSBhcyBpdCBpcyBiZWluZyBjb2xsZWN0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUNhY2hlIGltcGxlbWVudHMgTWV0YWRhdGFQcm92aWRlciB7XG4gIHByaXZhdGUgbWV0YWRhdGFDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNvbGxlY3RvcjogTWV0YWRhdGFDb2xsZWN0b3IsIHByaXZhdGUgcmVhZG9ubHkgc3RyaWN0OiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSB0cmFuc2Zvcm1lcnM6IE1ldGFkYXRhVHJhbnNmb3JtZXJbXSkge1xuICAgIGZvciAobGV0IHRyYW5zZm9ybWVyIG9mIHRyYW5zZm9ybWVycykge1xuICAgICAgaWYgKHRyYW5zZm9ybWVyLmNvbm5lY3QpIHtcbiAgICAgICAgdHJhbnNmb3JtZXIuY29ubmVjdCh0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRNZXRhZGF0YShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTW9kdWxlTWV0YWRhdGF8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5tZXRhZGF0YUNhY2hlLmhhcyhzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHRoaXMubWV0YWRhdGFDYWNoZS5nZXQoc291cmNlRmlsZS5maWxlTmFtZSk7XG4gICAgfVxuICAgIGxldCBzdWJzdGl0dXRlOiBWYWx1ZVRyYW5zZm9ybXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICAvLyBPbmx5IHByb2Nlc3MgdHJhbnNmb3JtZXJzIG9uIG1vZHVsZXMgdGhhdCBhcmUgbm90IGRlY2xhcmF0aW9uIGZpbGVzLlxuICAgIGNvbnN0IGRlY2xhcmF0aW9uRmlsZSA9IHNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGU7XG4gICAgY29uc3QgbW9kdWxlRmlsZSA9IHRzLmlzRXh0ZXJuYWxNb2R1bGUoc291cmNlRmlsZSk7XG4gICAgaWYgKCFkZWNsYXJhdGlvbkZpbGUgJiYgbW9kdWxlRmlsZSkge1xuICAgICAgZm9yIChsZXQgdHJhbnNmb3JtIG9mIHRoaXMudHJhbnNmb3JtZXJzKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zZm9ybVN1YnN0aXR1dGUgPSB0cmFuc2Zvcm0uc3RhcnQoc291cmNlRmlsZSk7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1TdWJzdGl0dXRlKSB7XG4gICAgICAgICAgaWYgKHN1YnN0aXR1dGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzOiBWYWx1ZVRyYW5zZm9ybSA9IHN1YnN0aXR1dGU7XG4gICAgICAgICAgICBzdWJzdGl0dXRlID0gKHZhbHVlOiBNZXRhZGF0YVZhbHVlLCBub2RlOiB0cy5Ob2RlKSA9PlxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybVN1YnN0aXR1dGUocHJldmlvdXModmFsdWUsIG5vZGUpLCBub2RlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3Vic3RpdHV0ZSA9IHRyYW5zZm9ybVN1YnN0aXR1dGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaXNUc0ZpbGUgPSBUUy50ZXN0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY29sbGVjdG9yLmdldE1ldGFkYXRhKHNvdXJjZUZpbGUsIHRoaXMuc3RyaWN0ICYmIGlzVHNGaWxlLCBzdWJzdGl0dXRlKTtcbiAgICB0aGlzLm1ldGFkYXRhQ2FjaGUuc2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUsIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufSJdfQ==