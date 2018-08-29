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
        define("@angular/compiler-cli/src/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "fs", "typescript", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var fs_1 = require("fs");
    var ts = require("typescript");
    var fesm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host");
    var Esm2015ReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015ReflectionHost, _super);
        function Esm2015ReflectionHost(checker, dtsMapper) {
            var _this = _super.call(this, checker) || this;
            _this.dtsMapper = dtsMapper;
            return _this;
        }
        /**
         * Get the number of generic type parameters of a given class.
         *
         * @returns the number of type parameters of the class, if known, or `null` if the declaration
         * is not a class or has an unknown number of type parameters.
         */
        Esm2015ReflectionHost.prototype.getGenericArityOfClass = function (clazz) {
            if (ts.isClassDeclaration(clazz) && clazz.name) {
                var sourcePath = clazz.getSourceFile();
                var dtsPath = this.dtsMapper.getDtsFileNameFor(sourcePath.fileName);
                var dtsContents = fs_1.readFileSync(dtsPath, 'utf8');
                // TODO: investigate caching parsed .d.ts files as they're needed for several different
                // purposes in ngcc.
                var dtsFile = ts.createSourceFile(dtsPath, dtsContents, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
                for (var i = dtsFile.statements.length - 1; i >= 0; i--) {
                    var stmt = dtsFile.statements[i];
                    if (ts.isClassDeclaration(stmt) && stmt.name !== undefined &&
                        stmt.name.text === clazz.name.text) {
                        return stmt.typeParameters ? stmt.typeParameters.length : 0;
                    }
                }
            }
            return null;
        };
        return Esm2015ReflectionHost;
    }(fesm2015_host_1.Fesm2015ReflectionHost));
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCx5QkFBZ0M7SUFDaEMsK0JBQWlDO0lBR2pDLHVGQUF1RDtJQUV2RDtRQUEyQyxpREFBc0I7UUFDL0QsK0JBQVksT0FBdUIsRUFBWSxTQUFvQjtZQUFuRSxZQUF1RSxrQkFBTSxPQUFPLENBQUMsU0FBRztZQUF6QyxlQUFTLEdBQVQsU0FBUyxDQUFXOztRQUFvQixDQUFDO1FBRXhGOzs7OztXQUtHO1FBQ0gsc0RBQXNCLEdBQXRCLFVBQXVCLEtBQXFCO1lBQzFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQzlDLElBQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekMsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RFLElBQU0sV0FBVyxHQUFHLGlCQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNsRCx1RkFBdUY7Z0JBQ3ZGLG9CQUFvQjtnQkFDcEIsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUMvQixPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUUzRSxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN2RCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVM7d0JBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUN0QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzdEO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUE3QkQsQ0FBMkMsc0NBQXNCLEdBNkJoRTtJQTdCWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEdHNNYXBwZXJ9IGZyb20gJy4vZHRzX21hcHBlcic7XG5pbXBvcnQge0Zlc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vZmVzbTIwMTVfaG9zdCc7XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBGZXNtMjAxNVJlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IoY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByb3RlY3RlZCBkdHNNYXBwZXI6IER0c01hcHBlcikgeyBzdXBlcihjaGVja2VyKTsgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiBhIGdpdmVuIGNsYXNzLlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MsIGlmIGtub3duLCBvciBgbnVsbGAgaWYgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIG5vdCBhIGNsYXNzIG9yIGhhcyBhbiB1bmtub3duIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMuXG4gICAqL1xuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSAmJiBjbGF6ei5uYW1lKSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3QgZHRzUGF0aCA9IHRoaXMuZHRzTWFwcGVyLmdldER0c0ZpbGVOYW1lRm9yKHNvdXJjZVBhdGguZmlsZU5hbWUpO1xuICAgICAgY29uc3QgZHRzQ29udGVudHMgPSByZWFkRmlsZVN5bmMoZHRzUGF0aCwgJ3V0ZjgnKTtcbiAgICAgIC8vIFRPRE86IGludmVzdGlnYXRlIGNhY2hpbmcgcGFyc2VkIC5kLnRzIGZpbGVzIGFzIHRoZXkncmUgbmVlZGVkIGZvciBzZXZlcmFsIGRpZmZlcmVudFxuICAgICAgLy8gcHVycG9zZXMgaW4gbmdjYy5cbiAgICAgIGNvbnN0IGR0c0ZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgIGR0c1BhdGgsIGR0c0NvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5UUyk7XG5cbiAgICAgIGZvciAobGV0IGkgPSBkdHNGaWxlLnN0YXRlbWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgY29uc3Qgc3RtdCA9IGR0c0ZpbGUuc3RhdGVtZW50c1tpXTtcbiAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdG10KSAmJiBzdG10Lm5hbWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgc3RtdC5uYW1lLnRleHQgPT09IGNsYXp6Lm5hbWUudGV4dCkge1xuICAgICAgICAgIHJldHVybiBzdG10LnR5cGVQYXJhbWV0ZXJzID8gc3RtdC50eXBlUGFyYW1ldGVycy5sZW5ndGggOiAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=