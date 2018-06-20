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
        define("angular/packages/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    /**
     * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
     *
     * ```
     * var CommonModule = (function () {
     *  function CommonModule() {
     *  }
     *  CommonModule.decorators = [ ... ];
     * ```
     *
     * Items are decorated if they have a static property called `decorators`.
     *
     */
    var Esm5ReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(Esm5ReflectionHost, _super);
        function Esm5ReflectionHost(checker) {
            return _super.call(this, checker) || this;
        }
        Esm5ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            // This is different to ES2015 and TS
            throw new Error('Not implemented');
        };
        Esm5ReflectionHost.prototype.isClass = function (node) {
            // Is this enough? Perhaps we should also check that the initializer is an IIFE?
            return ts.isFunctionDeclaration(node) && startsWithUppercase(node.name);
        };
        Esm5ReflectionHost.prototype.getClassDecorators = function (classSymbol) {
            throw new Error("Method not implemented.");
        };
        Esm5ReflectionHost.prototype.getMemberDecorators = function (classSymbol) {
            throw new Error("Method not implemented.");
        };
        Esm5ReflectionHost.prototype.getConstructorParamDecorators = function (classSymbol) {
            throw new Error("Method not implemented.");
        };
        Esm5ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            throw new Error("Method not implemented.");
        };
        Esm5ReflectionHost.prototype.getConstructorParameters = function (declaration) {
            throw new Error("Method not implemented.");
        };
        return Esm5ReflectionHost;
    }(reflector_1.TypeScriptReflectionHost));
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
    function startsWithUppercase(name) {
        return !!name && /^[A-Z]/.test(name.getText());
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsb0ZBQWlGO0lBR2pGOzs7Ozs7Ozs7Ozs7T0FZRztJQUNIO1FBQXdDLDhDQUF3QjtRQUM5RCw0QkFBWSxPQUF1QjttQkFDakMsa0JBQU0sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCx1REFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQscUNBQXFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsb0NBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsZ0ZBQWdGO1lBQ2hGLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBRUQsK0NBQWtCLEdBQWxCLFVBQW1CLFdBQXNCO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0QsZ0RBQW1CLEdBQW5CLFVBQW9CLFdBQXNCO1lBQ3hDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0QsMERBQTZCLEdBQTdCLFVBQThCLFdBQXNCO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0QsOENBQWlCLEdBQWpCLFVBQWtCLEtBQXFCO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0QscURBQXdCLEdBQXhCLFVBQXlCLFdBQTJCO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBOUJELENBQXdDLG9DQUF3QixHQThCL0Q7SUE5QlksZ0RBQWtCO0lBZ0MvQiw2QkFBNkIsSUFBNkI7UUFDeEQsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDakQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBDbGFzc01lbWJlciwgRGVjb3JhdG9yLCBQYXJhbWV0ZXIsIFJlZmxlY3Rpb25Ib3N0IH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQgeyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yJztcbmltcG9ydCB7IE5nY2NSZWZsZWN0aW9uSG9zdCB9IGZyb20gJy4vbmdjY19ob3N0JztcblxuLyoqXG4gKiBFU001IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCBJSUZFIGZ1bmN0aW9ucyB0aGF0IGFjdCBsaWtlIGNsYXNzZXMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogdmFyIENvbW1vbk1vZHVsZSA9IChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gQ29tbW9uTW9kdWxlKCkge1xuICogIH1cbiAqICBDb21tb25Nb2R1bGUuZGVjb3JhdG9ycyA9IFsgLi4uIF07XG4gKiBgYGBcbiAqXG4gKiBJdGVtcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7XG4gICAgc3VwZXIoY2hlY2tlcik7XG4gIH1cblxuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICAvLyBUaGlzIGlzIGRpZmZlcmVudCB0byBFUzIwMTUgYW5kIFRTXG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbiAgfVxuXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuRGVjbGFyYXRpb24ge1xuICAgIC8vIElzIHRoaXMgZW5vdWdoPyBQZXJoYXBzIHdlIHNob3VsZCBhbHNvIGNoZWNrIHRoYXQgdGhlIGluaXRpYWxpemVyIGlzIGFuIElJRkU/XG4gICAgcmV0dXJuIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSAmJiBzdGFydHNXaXRoVXBwZXJjYXNlKG5vZGUubmFtZSk7XG4gIH1cblxuICBnZXRDbGFzc0RlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcbiAgfVxuICBnZXRNZW1iZXJEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICB9XG4gIGdldENvbnN0cnVjdG9yUGFyYW1EZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICB9XG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICB9XG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBQYXJhbWV0ZXJbXSB8IG51bGwge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0c1dpdGhVcHBlcmNhc2UobmFtZTogdHMuSWRlbnRpZmllcnx1bmRlZmluZWQpIHtcbiAgcmV0dXJuICEhbmFtZSAmJiAvXltBLVpdLy50ZXN0KG5hbWUuZ2V0VGV4dCgpKTtcbn0iXX0=