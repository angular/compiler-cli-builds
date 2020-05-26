(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSourceFileOrError = exports.stripExtension = exports.normalizeSeparators = void 0;
    var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
    /**
     * Convert Windows-style separators to POSIX separators.
     */
    function normalizeSeparators(path) {
        // TODO: normalize path only for OS that need it.
        return path.replace(/\\/g, '/');
    }
    exports.normalizeSeparators = normalizeSeparators;
    /**
     * Remove a .ts, .d.ts, or .js extension from a file name.
     */
    function stripExtension(path) {
        return path.replace(TS_DTS_JS_EXTENSION, '');
    }
    exports.stripExtension = stripExtension;
    function getSourceFileOrError(program, fileName) {
        var sf = program.getSourceFile(fileName);
        if (sf === undefined) {
            throw new Error("Program does not contain \"" + fileName + "\" - available files are " + program.getSourceFiles().map(function (sf) { return sf.fileName; }).join(', '));
        }
        return sf;
    }
    exports.getSourceFileOrError = getSourceFileOrError;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBVUEsSUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUVsRDs7T0FFRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLElBQVk7UUFDOUMsaURBQWlEO1FBQ2pELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUhELGtEQUdDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixjQUFjLENBQUMsSUFBWTtRQUN6QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUZELHdDQUVDO0lBRUQsU0FBZ0Isb0JBQW9CLENBQUMsT0FBbUIsRUFBRSxRQUF3QjtRQUNoRixJQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNDLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUE2QixRQUFRLGlDQUNqRCxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsRUFBRSxDQUFDLFFBQVEsRUFBWCxDQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQztTQUNuRTtRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQVBELG9EQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgVFNfRFRTX0pTX0VYVEVOU0lPTiA9IC8oPzpcXC5kKT9cXC50cyR8XFwuanMkLztcblxuLyoqXG4gKiBDb252ZXJ0IFdpbmRvd3Mtc3R5bGUgc2VwYXJhdG9ycyB0byBQT1NJWCBzZXBhcmF0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2VwYXJhdG9ycyhwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvLyBUT0RPOiBub3JtYWxpemUgcGF0aCBvbmx5IGZvciBPUyB0aGF0IG5lZWQgaXQuXG4gIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgYSAudHMsIC5kLnRzLCBvciAuanMgZXh0ZW5zaW9uIGZyb20gYSBmaWxlIG5hbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEV4dGVuc2lvbihwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcGF0aC5yZXBsYWNlKFRTX0RUU19KU19FWFRFTlNJT04sICcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZUZpbGVPckVycm9yKHByb2dyYW06IHRzLlByb2dyYW0sIGZpbGVOYW1lOiBBYnNvbHV0ZUZzUGF0aCk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBzZiA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBQcm9ncmFtIGRvZXMgbm90IGNvbnRhaW4gXCIke2ZpbGVOYW1lfVwiIC0gYXZhaWxhYmxlIGZpbGVzIGFyZSAke1xuICAgICAgICBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNmID0+IHNmLmZpbGVOYW1lKS5qb2luKCcsICcpfWApO1xuICB9XG4gIHJldHVybiBzZjtcbn1cbiJdfQ==