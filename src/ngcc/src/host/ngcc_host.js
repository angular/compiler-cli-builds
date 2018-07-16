(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/host/ngcc_host", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L25nY2NfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBSZWZsZWN0aW9uSG9zdCB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuXG4vKipcbiAqIEEgcmVmbGVjdGlvbiBob3N0IHRoYXQgaGFzIGV4dHJhIG1ldGhvZHMgZm9yIGxvb2tpbmcgYXQgbm9uLVR5cGVzY3JpcHQgcGFja2FnZSBmb3JtYXRzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1JlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgUmVmbGVjdGlvbkhvc3Qge1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5TeW1ib2wgfCB1bmRlZmluZWQ7XG59XG4iXX0=