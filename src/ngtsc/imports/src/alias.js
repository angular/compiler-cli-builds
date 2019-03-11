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
        define("@angular/compiler-cli/src/ngtsc/imports/src/alias", ["require", "exports", "@angular/compiler", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    // Escape anything that isn't alphanumeric, '/' or '_'.
    var CHARS_TO_ESCAPE = /[^a-zA-Z0-9/_]/g;
    var AliasGenerator = /** @class */ (function () {
        function AliasGenerator(fileToModuleHost) {
            this.fileToModuleHost = fileToModuleHost;
        }
        AliasGenerator.prototype.aliasSymbolName = function (decl, context) {
            if (!ts.isClassDeclaration(decl)) {
                throw new Error("Attempt to write an alias to something which isn't a class");
            }
            // The declared module is used to get the name of the alias.
            var declModule = this.fileToModuleHost.fileNameToModuleName(decl.getSourceFile().fileName, context.fileName);
            var replaced = declModule.replace(CHARS_TO_ESCAPE, '_').replace(/\//g, '$');
            return 'ɵng$' + replaced + '$$' + decl.name.text;
        };
        AliasGenerator.prototype.aliasTo = function (decl, via) {
            var name = this.aliasSymbolName(decl, via);
            // viaModule is the module it'll actually be imported from.
            var moduleName = this.fileToModuleHost.fileNameToModuleName(via.fileName, via.fileName);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return AliasGenerator;
    }());
    exports.AliasGenerator = AliasGenerator;
    var AliasStrategy = /** @class */ (function () {
        function AliasStrategy() {
        }
        AliasStrategy.prototype.emit = function (ref, context, importMode) {
            return ref.alias;
        };
        return AliasStrategy;
    }());
    exports.AliasStrategy = AliasStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2FsaWFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBQzNELCtCQUFpQztJQUtqQyx1REFBdUQ7SUFDdkQsSUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFFMUM7UUFDRSx3QkFBb0IsZ0JBQWtDO1lBQWxDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFBRyxDQUFDO1FBRTFELHdDQUFlLEdBQWYsVUFBZ0IsSUFBb0IsRUFBRSxPQUFzQjtZQUMxRCxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7YUFDL0U7WUFFRCw0REFBNEQ7WUFDNUQsSUFBTSxVQUFVLEdBQ1osSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRWhHLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDOUUsT0FBTyxNQUFNLEdBQUcsUUFBUSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBTSxDQUFDLElBQUksQ0FBQztRQUNyRCxDQUFDO1FBRUQsZ0NBQU8sR0FBUCxVQUFRLElBQW9CLEVBQUUsR0FBa0I7WUFDOUMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDN0MsMkRBQTJEO1lBQzNELElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBdEJELElBc0JDO0lBdEJZLHdDQUFjO0lBd0IzQjtRQUFBO1FBSUEsQ0FBQztRQUhDLDRCQUFJLEdBQUosVUFBSyxHQUF1QixFQUFFLE9BQXNCLEVBQUUsVUFBc0I7WUFDMUUsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ25CLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFKRCxJQUlDO0lBSlksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlVG9Nb2R1bGVIb3N0LCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3l9IGZyb20gJy4vZW1pdHRlcic7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9yZWZlcmVuY2VzJztcblxuLy8gRXNjYXBlIGFueXRoaW5nIHRoYXQgaXNuJ3QgYWxwaGFudW1lcmljLCAnLycgb3IgJ18nLlxuY29uc3QgQ0hBUlNfVE9fRVNDQVBFID0gL1teYS16QS1aMC05L19dL2c7XG5cbmV4cG9ydCBjbGFzcyBBbGlhc0dlbmVyYXRvciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZmlsZVRvTW9kdWxlSG9zdDogRmlsZVRvTW9kdWxlSG9zdCkge31cblxuICBhbGlhc1N5bWJvbE5hbWUoZGVjbDogdHMuRGVjbGFyYXRpb24sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcge1xuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gd3JpdGUgYW4gYWxpYXMgdG8gc29tZXRoaW5nIHdoaWNoIGlzbid0IGEgY2xhc3NgKTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZGVjbGFyZWQgbW9kdWxlIGlzIHVzZWQgdG8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBhbGlhcy5cbiAgICBjb25zdCBkZWNsTW9kdWxlID1cbiAgICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGRlY2wuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLCBjb250ZXh0LmZpbGVOYW1lKTtcblxuICAgIGNvbnN0IHJlcGxhY2VkID0gZGVjbE1vZHVsZS5yZXBsYWNlKENIQVJTX1RPX0VTQ0FQRSwgJ18nKS5yZXBsYWNlKC9cXC8vZywgJyQnKTtcbiAgICByZXR1cm4gJ8m1bmckJyArIHJlcGxhY2VkICsgJyQkJyArIGRlY2wubmFtZSAhLnRleHQ7XG4gIH1cblxuICBhbGlhc1RvKGRlY2w6IHRzLkRlY2xhcmF0aW9uLCB2aWE6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9uIHtcbiAgICBjb25zdCBuYW1lID0gdGhpcy5hbGlhc1N5bWJvbE5hbWUoZGVjbCwgdmlhKTtcbiAgICAvLyB2aWFNb2R1bGUgaXMgdGhlIG1vZHVsZSBpdCdsbCBhY3R1YWxseSBiZSBpbXBvcnRlZCBmcm9tLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLmZpbGVUb01vZHVsZUhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUodmlhLmZpbGVOYW1lLCB2aWEuZmlsZU5hbWUpO1xuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFsaWFzU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICByZXR1cm4gcmVmLmFsaWFzO1xuICB9XG59XG4iXX0=