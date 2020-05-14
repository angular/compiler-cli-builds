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
        define("@angular/compiler-cli/ngcc/src/logging/logger", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LogLevel = void 0;
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["debug"] = 0] = "debug";
        LogLevel[LogLevel["info"] = 1] = "info";
        LogLevel[LogLevel["warn"] = 2] = "warn";
        LogLevel[LogLevel["error"] = 3] = "error";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2xvZ2dpbmcvbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQWNILElBQVksUUFLWDtJQUxELFdBQVksUUFBUTtRQUNsQix5Q0FBSyxDQUFBO1FBQ0wsdUNBQUksQ0FBQTtRQUNKLHVDQUFJLENBQUE7UUFDSix5Q0FBSyxDQUFBO0lBQ1AsQ0FBQyxFQUxXLFFBQVEsR0FBUixnQkFBUSxLQUFSLGdCQUFRLFFBS25CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vKipcbiAqIEltcGxlbWVudCB0aGlzIGludGVyZmFjZSBpZiB5b3Ugd2FudCB0byBwcm92aWRlIGRpZmZlcmVudCBsb2dnaW5nXG4gKiBvdXRwdXQgZnJvbSB0aGUgc3RhbmRhcmQgQ29uc29sZUxvZ2dlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dnZXIge1xuICBsZXZlbDogTG9nTGV2ZWw7XG4gIGRlYnVnKC4uLmFyZ3M6IHN0cmluZ1tdKTogdm9pZDtcbiAgaW5mbyguLi5hcmdzOiBzdHJpbmdbXSk6IHZvaWQ7XG4gIHdhcm4oLi4uYXJnczogc3RyaW5nW10pOiB2b2lkO1xuICBlcnJvciguLi5hcmdzOiBzdHJpbmdbXSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBlbnVtIExvZ0xldmVsIHtcbiAgZGVidWcsXG4gIGluZm8sXG4gIHdhcm4sXG4gIGVycm9yLFxufVxuIl19