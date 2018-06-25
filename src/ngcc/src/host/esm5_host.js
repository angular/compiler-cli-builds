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
        define("angular/packages/compiler-cli/src/ngcc/src/host/esm5_host", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    var Esm5ReflectionHost = /** @class */ (function () {
        function Esm5ReflectionHost(checker) {
            this.checker = checker;
        }
        Esm5ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            // This is different to ES2015 and TS
            throw new Error('Not implemented');
        };
        Esm5ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            throw new Error('Method not implemented.');
        };
        Esm5ReflectionHost.prototype.getConstructorParameters = function (declaration) {
            throw new Error('Method not implemented.');
        };
        Esm5ReflectionHost.prototype.getImportOfIdentifier = function (id) {
            throw new Error('Method not implemented.');
        };
        Esm5ReflectionHost.prototype.isClass = function (node) {
            throw new Error('Method not implemented');
        };
        return Esm5ReflectionHost;
    }());
    exports.Esm5ReflectionHost = Esm5ReflectionHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQU1IOzs7Ozs7Ozs7Ozs7T0FZRztJQUNIO1FBQ0UsNEJBQXNCLE9BQXVCO1lBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQUksQ0FBQztRQUVsRCx1REFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQscUNBQXFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsOENBQWlCLEdBQWpCLFVBQWtCLEtBQXFCO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQscURBQXdCLEdBQXhCLFVBQXlCLFdBQTJCO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsa0RBQXFCLEdBQXJCLFVBQXNCLEVBQWlCO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsb0NBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUF2QkQsSUF1QkM7SUF2QlksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IENsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIEltcG9ydCwgUGFyYW1ldGVyIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbi8qKlxuICogRVNNNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgSUlGRSBmdW5jdGlvbnMgdGhhdCBhY3QgbGlrZSBjbGFzc2VzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBDb21tb25Nb2R1bGUgPSAoZnVuY3Rpb24gKCkge1xuICogIGZ1bmN0aW9uIENvbW1vbk1vZHVsZSgpIHtcbiAqICB9XG4gKiAgQ29tbW9uTW9kdWxlLmRlY29yYXRvcnMgPSBbIC4uLiBdO1xuICogYGBgXG4gKlxuICogSXRlbXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHsgfVxuXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIC8vIFRoaXMgaXMgZGlmZmVyZW50IHRvIEVTMjAxNSBhbmQgVFNcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IFBhcmFtZXRlcltdIHwgbnVsbCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuRGVjbGFyYXRpb24ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZCcpO1xuICB9XG59XG4iXX0=