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
        define("@angular/compiler-cli/src/ngtools_api2", ["require", "exports", "typescript", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/transformers/compiler_host", "@angular/compiler-cli/src/transformers/program"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const ts = require("typescript");
    const perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    const compiler_host_1 = require("@angular/compiler-cli/src/transformers/compiler_host");
    const program_1 = require("@angular/compiler-cli/src/transformers/program");
    var EmitFlags;
    (function (EmitFlags) {
        EmitFlags[EmitFlags["DTS"] = 1] = "DTS";
        EmitFlags[EmitFlags["JS"] = 2] = "JS";
        EmitFlags[EmitFlags["Metadata"] = 4] = "Metadata";
        EmitFlags[EmitFlags["I18nBundle"] = 8] = "I18nBundle";
        EmitFlags[EmitFlags["Codegen"] = 16] = "Codegen";
        EmitFlags[EmitFlags["Default"] = 19] = "Default";
        EmitFlags[EmitFlags["All"] = 31] = "All";
    })(EmitFlags = exports.EmitFlags || (exports.EmitFlags = {}));
    // Wrapper for createProgram.
    function createProgram({ rootNames, options, host, oldProgram }) {
        return program_1.createProgram({ rootNames, options, host, oldProgram: oldProgram });
    }
    exports.createProgram = createProgram;
    // Wrapper for createCompilerHost.
    function createCompilerHost({ options, tsHost = ts.createCompilerHost(options, true) }) {
        return compiler_host_1.createCompilerHost({ options, tsHost });
    }
    exports.createCompilerHost = createCompilerHost;
    function formatDiagnostics(diags) {
        return perform_compile_1.formatDiagnostics(diags);
    }
    exports.formatDiagnostics = formatDiagnostics;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmd0b29sc19hcGkyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3Rvb2xzX2FwaTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFrQkgsaUNBQWlDO0lBRWpDLCtFQUE2RTtJQUU3RSx3RkFBc0Y7SUFDdEYsNEVBQTBFO0lBNEMxRSxJQUFZLFNBU1g7SUFURCxXQUFZLFNBQVM7UUFDbkIsdUNBQVksQ0FBQTtRQUNaLHFDQUFXLENBQUE7UUFDWCxpREFBaUIsQ0FBQTtRQUNqQixxREFBbUIsQ0FBQTtRQUNuQixnREFBZ0IsQ0FBQTtRQUVoQixnREFBNEIsQ0FBQTtRQUM1Qix3Q0FBZ0QsQ0FBQTtJQUNsRCxDQUFDLEVBVFcsU0FBUyxHQUFULGlCQUFTLEtBQVQsaUJBQVMsUUFTcEI7SUFnREQsNkJBQTZCO0lBQzdCLFNBQWdCLGFBQWEsQ0FDekIsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQ3dEO1FBRS9GLE9BQU8sdUJBQWlCLENBQUMsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBaUIsRUFBQyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUxELHNDQUtDO0lBRUQsa0NBQWtDO0lBQ2xDLFNBQWdCLGtCQUFrQixDQUM5QixFQUFDLE9BQU8sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFDQztRQUMxRCxPQUFPLGtDQUFrQixDQUFDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUpELGdEQUlDO0lBSUQsU0FBZ0IsaUJBQWlCLENBQUMsS0FBa0I7UUFDbEQsT0FBTyxtQ0FBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRkQsOENBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogVGhpcyBpcyBhIHByaXZhdGUgQVBJIGZvciBAbmd0b29scy93ZWJwYWNrLiBUaGlzIEFQSSBzaG91bGQgYmUgc3RhYmxlIGZvciBORyA1LlxuICpcbiAqIEl0IGNvbnRhaW5zIGNvcGllcyBvZiB0aGUgaW50ZXJmYWNlcyBuZWVkZWQgYW5kIHdyYXBwZXIgZnVuY3Rpb25zIHRvIGVuc3VyZSB0aGF0XG4gKiB0aGV5IGFyZSBub3QgYnJva2VuIGFjY2lkZW50YWxseS5cbiAqXG4gKiBPbmNlIHRoZSBuZ2MgYXBpIGlzIHB1YmxpYyBhbmQgc3RhYmxlLCB0aGlzIGNhbiBiZSByZW1vdmVkLlxuICovXG5cbi8qKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogQ2hhbmdlcyB0byB0aGlzIGZpbGUgbmVlZCB0byBiZSBhcHByb3ZlZCBieSB0aGUgQW5ndWxhciBDTEkgdGVhbS4gKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICovXG5cbmltcG9ydCB7UGFyc2VTb3VyY2VTcGFufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtmb3JtYXREaWFnbm9zdGljcyBhcyBmb3JtYXREaWFnbm9zdGljc09yaWd9IGZyb20gJy4vcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCB7UHJvZ3JhbSBhcyBQcm9ncmFtT3JpZ30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7Y3JlYXRlQ29tcGlsZXJIb3N0IGFzIGNyZWF0ZUNvbXBpbGVyT3JpZ30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvY29tcGlsZXJfaG9zdCc7XG5pbXBvcnQge2NyZWF0ZVByb2dyYW0gYXMgY3JlYXRlUHJvZ3JhbU9yaWd9IGZyb20gJy4vdHJhbnNmb3JtZXJzL3Byb2dyYW0nO1xuXG5cbi8vIEludGVyZmFjZXMgZnJvbSAuL3RyYW5zZm9ybWVycy9hcGk7XG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWMge1xuICBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBzcGFuPzogUGFyc2VTb3VyY2VTcGFuO1xuICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5O1xuICBjb2RlOiBudW1iZXI7XG4gIHNvdXJjZTogJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyBleHRlbmRzIHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VQYXRoPzogc3RyaW5nO1xuICBza2lwTWV0YWRhdGFFbWl0PzogYm9vbGVhbjtcbiAgc3RyaWN0TWV0YWRhdGFFbWl0PzogYm9vbGVhbjtcbiAgc2tpcFRlbXBsYXRlQ29kZWdlbj86IGJvb2xlYW47XG4gIGZsYXRNb2R1bGVPdXRGaWxlPzogc3RyaW5nO1xuICBmbGF0TW9kdWxlSWQ/OiBzdHJpbmc7XG4gIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcz86IGJvb2xlYW47XG4gIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyPzogYm9vbGVhbjtcbiAgYW5ub3RhdGlvbnNBcz86ICdkZWNvcmF0b3JzJ3wnc3RhdGljIGZpZWxkcyc7XG4gIHRyYWNlPzogYm9vbGVhbjtcbiAgZGlzYWJsZUV4cHJlc3Npb25Mb3dlcmluZz86IGJvb2xlYW47XG4gIGkxOG5PdXRMb2NhbGU/OiBzdHJpbmc7XG4gIGkxOG5PdXRGb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5PdXRGaWxlPzogc3RyaW5nO1xuICBpMThuSW5Gb3JtYXQ/OiBzdHJpbmc7XG4gIGkxOG5JbkxvY2FsZT86IHN0cmluZztcbiAgaTE4bkluRmlsZT86IHN0cmluZztcbiAgaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucz86ICdlcnJvcid8J3dhcm5pbmcnfCdpZ25vcmUnO1xuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzPzogYm9vbGVhbjtcbiAgZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2s/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVySG9zdCBleHRlbmRzIHRzLkNvbXBpbGVySG9zdCB7XG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lPyhtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlPzogc3RyaW5nKTogc3RyaW5nfG51bGw7XG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lPyhpbXBvcnRlZEZpbGVQYXRoOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nO1xuICByZXNvdXJjZU5hbWVUb0ZpbGVOYW1lPyhyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcbiAgdG9TdW1tYXJ5RmlsZU5hbWU/KGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIGZyb21TdW1tYXJ5RmlsZU5hbWU/KGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIHJlYWRSZXNvdXJjZT8oZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnxzdHJpbmc7XG59XG5cbmV4cG9ydCBlbnVtIEVtaXRGbGFncyB7XG4gIERUUyA9IDEgPDwgMCxcbiAgSlMgPSAxIDw8IDEsXG4gIE1ldGFkYXRhID0gMSA8PCAyLFxuICBJMThuQnVuZGxlID0gMSA8PCAzLFxuICBDb2RlZ2VuID0gMSA8PCA0LFxuXG4gIERlZmF1bHQgPSBEVFMgfCBKUyB8IENvZGVnZW4sXG4gIEFsbCA9IERUUyB8IEpTIHwgTWV0YWRhdGEgfCBJMThuQnVuZGxlIHwgQ29kZWdlbixcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDdXN0b21UcmFuc2Zvcm1lcnMge1xuICBiZWZvcmVUcz86IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdO1xuICBhZnRlclRzPzogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNFbWl0QXJndW1lbnRzIHtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaG9zdDogQ29tcGlsZXJIb3N0O1xuICBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHRhcmdldFNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlO1xuICB3cml0ZUZpbGU/OiB0cy5Xcml0ZUZpbGVDYWxsYmFjaztcbiAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbjtcbiAgZW1pdE9ubHlEdHNGaWxlcz86IGJvb2xlYW47XG4gIGN1c3RvbVRyYW5zZm9ybWVycz86IHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUc0VtaXRDYWxsYmFjayB7IChhcmdzOiBUc0VtaXRBcmd1bWVudHMpOiB0cy5FbWl0UmVzdWx0OyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF6eVJvdXRlIHtcbiAgbW9kdWxlOiB7bmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nfTtcbiAgcm91dGU6IHN0cmluZztcbiAgcmVmZXJlbmNlZE1vZHVsZToge25hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZ307XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3JhbSB7XG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtO1xuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfERpYWdub3N0aWM+O1xuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz47XG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+O1xuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lPzogc3RyaW5nLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xEaWFnbm9zdGljPjtcbiAgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPjtcbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdO1xuICBlbWl0KHtlbWl0RmxhZ3MsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsIGVtaXRDYWxsYmFja306IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2tcbiAgfSk6IHRzLkVtaXRSZXN1bHQ7XG59XG5cbi8vIFdyYXBwZXIgZm9yIGNyZWF0ZVByb2dyYW0uXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvZ3JhbShcbiAgICB7cm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtfTpcbiAgICAgICAge3Jvb3ROYW1lczogc3RyaW5nW10sIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgaG9zdDogQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogUHJvZ3JhbX0pOlxuICAgIFByb2dyYW0ge1xuICByZXR1cm4gY3JlYXRlUHJvZ3JhbU9yaWcoe3Jvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgb2xkUHJvZ3JhbTogb2xkUHJvZ3JhbSBhcyBhbnl9KTtcbn1cblxuLy8gV3JhcHBlciBmb3IgY3JlYXRlQ29tcGlsZXJIb3N0LlxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdChcbiAgICB7b3B0aW9ucywgdHNIb3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMsIHRydWUpfTpcbiAgICAgICAge29wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgdHNIb3N0PzogdHMuQ29tcGlsZXJIb3N0fSk6IENvbXBpbGVySG9zdCB7XG4gIHJldHVybiBjcmVhdGVDb21waWxlck9yaWcoe29wdGlvbnMsIHRzSG9zdH0pO1xufVxuXG4vLyBXcmFwcGVyIGZvciBmb3JtYXREaWFnbm9zdGljcy5cbmV4cG9ydCB0eXBlIERpYWdub3N0aWNzID0gUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfERpYWdub3N0aWM+O1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNzKGRpYWdzOiBEaWFnbm9zdGljcyk6IHN0cmluZyB7XG4gIHJldHVybiBmb3JtYXREaWFnbm9zdGljc09yaWcoZGlhZ3MpO1xufVxuIl19