(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/typescript_support", ["require", "exports", "typescript", "@angular/compiler-cli/src/diagnostics/typescript_version"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.verifySupportedTypeScriptVersion = exports.checkVersion = exports.restoreTypeScriptVersionForTesting = exports.setTypeScriptVersionForTesting = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var typescript_version_1 = require("@angular/compiler-cli/src/diagnostics/typescript_version");
    /**
     * Minimum supported TypeScript version
     * ∀ supported typescript version v, v >= MIN_TS_VERSION
     *
     * Note: this check is disabled in g3, search for
     * `angularCompilerOptions.disableTypeScriptVersionCheck` config param value in g3.
     */
    var MIN_TS_VERSION = '4.2.3';
    /**
     * Supremum of supported TypeScript versions
     * ∀ supported typescript version v, v < MAX_TS_VERSION
     * MAX_TS_VERSION is not considered as a supported TypeScript version
     *
     * Note: this check is disabled in g3, search for
     * `angularCompilerOptions.disableTypeScriptVersionCheck` config param value in g3.
     */
    var MAX_TS_VERSION = '4.5.0';
    /**
     * The currently used version of TypeScript, which can be adjusted for testing purposes using
     * `setTypeScriptVersionForTesting` and `restoreTypeScriptVersionForTesting` below.
     */
    var tsVersion = ts.version;
    function setTypeScriptVersionForTesting(version) {
        tsVersion = version;
    }
    exports.setTypeScriptVersionForTesting = setTypeScriptVersionForTesting;
    function restoreTypeScriptVersionForTesting() {
        tsVersion = ts.version;
    }
    exports.restoreTypeScriptVersionForTesting = restoreTypeScriptVersionForTesting;
    /**
     * Checks whether a given version ∈ [minVersion, maxVersion[.
     * An error will be thrown when the given version ∉ [minVersion, maxVersion[.
     *
     * @param version The version on which the check will be performed
     * @param minVersion The lower bound version. A valid version needs to be greater than minVersion
     * @param maxVersion The upper bound version. A valid version needs to be strictly less than
     * maxVersion
     *
     * @throws Will throw an error if the given version ∉ [minVersion, maxVersion[
     */
    function checkVersion(version, minVersion, maxVersion) {
        if (((0, typescript_version_1.compareVersions)(version, minVersion) < 0 || (0, typescript_version_1.compareVersions)(version, maxVersion) >= 0)) {
            throw new Error("The Angular Compiler requires TypeScript >=" + minVersion + " and <" + maxVersion + " but " + version + " was found instead.");
        }
    }
    exports.checkVersion = checkVersion;
    function verifySupportedTypeScriptVersion() {
        checkVersion(tsVersion, MIN_TS_VERSION, MAX_TS_VERSION);
    }
    exports.verifySupportedTypeScriptVersion = verifySupportedTypeScriptVersion;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90eXBlc2NyaXB0X3N1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBQ2pDLCtGQUFpRTtJQUVqRTs7Ozs7O09BTUc7SUFDSCxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUM7SUFFL0I7Ozs7Ozs7T0FPRztJQUNILElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztJQUUvQjs7O09BR0c7SUFDSCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO0lBRTNCLFNBQWdCLDhCQUE4QixDQUFDLE9BQWU7UUFDNUQsU0FBUyxHQUFHLE9BQU8sQ0FBQztJQUN0QixDQUFDO0lBRkQsd0VBRUM7SUFFRCxTQUFnQixrQ0FBa0M7UUFDaEQsU0FBUyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDekIsQ0FBQztJQUZELGdGQUVDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILFNBQWdCLFlBQVksQ0FBQyxPQUFlLEVBQUUsVUFBa0IsRUFBRSxVQUFrQjtRQUNsRixJQUFJLENBQUMsSUFBQSxvQ0FBZSxFQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBQSxvQ0FBZSxFQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUMzRixNQUFNLElBQUksS0FBSyxDQUFDLGdEQUE4QyxVQUFVLGNBQ3BFLFVBQVUsYUFBUSxPQUFPLHdCQUFxQixDQUFDLENBQUM7U0FDckQ7SUFDSCxDQUFDO0lBTEQsb0NBS0M7SUFFRCxTQUFnQixnQ0FBZ0M7UUFDOUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUZELDRFQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Y29tcGFyZVZlcnNpb25zfSBmcm9tICcuL2RpYWdub3N0aWNzL3R5cGVzY3JpcHRfdmVyc2lvbic7XG5cbi8qKlxuICogTWluaW11bSBzdXBwb3J0ZWQgVHlwZVNjcmlwdCB2ZXJzaW9uXG4gKiDiiIAgc3VwcG9ydGVkIHR5cGVzY3JpcHQgdmVyc2lvbiB2LCB2ID49IE1JTl9UU19WRVJTSU9OXG4gKlxuICogTm90ZTogdGhpcyBjaGVjayBpcyBkaXNhYmxlZCBpbiBnMywgc2VhcmNoIGZvclxuICogYGFuZ3VsYXJDb21waWxlck9wdGlvbnMuZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2tgIGNvbmZpZyBwYXJhbSB2YWx1ZSBpbiBnMy5cbiAqL1xuY29uc3QgTUlOX1RTX1ZFUlNJT04gPSAnNC4yLjMnO1xuXG4vKipcbiAqIFN1cHJlbXVtIG9mIHN1cHBvcnRlZCBUeXBlU2NyaXB0IHZlcnNpb25zXG4gKiDiiIAgc3VwcG9ydGVkIHR5cGVzY3JpcHQgdmVyc2lvbiB2LCB2IDwgTUFYX1RTX1ZFUlNJT05cbiAqIE1BWF9UU19WRVJTSU9OIGlzIG5vdCBjb25zaWRlcmVkIGFzIGEgc3VwcG9ydGVkIFR5cGVTY3JpcHQgdmVyc2lvblxuICpcbiAqIE5vdGU6IHRoaXMgY2hlY2sgaXMgZGlzYWJsZWQgaW4gZzMsIHNlYXJjaCBmb3JcbiAqIGBhbmd1bGFyQ29tcGlsZXJPcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrYCBjb25maWcgcGFyYW0gdmFsdWUgaW4gZzMuXG4gKi9cbmNvbnN0IE1BWF9UU19WRVJTSU9OID0gJzQuNS4wJztcblxuLyoqXG4gKiBUaGUgY3VycmVudGx5IHVzZWQgdmVyc2lvbiBvZiBUeXBlU2NyaXB0LCB3aGljaCBjYW4gYmUgYWRqdXN0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgdXNpbmdcbiAqIGBzZXRUeXBlU2NyaXB0VmVyc2lvbkZvclRlc3RpbmdgIGFuZCBgcmVzdG9yZVR5cGVTY3JpcHRWZXJzaW9uRm9yVGVzdGluZ2AgYmVsb3cuXG4gKi9cbmxldCB0c1ZlcnNpb24gPSB0cy52ZXJzaW9uO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0VHlwZVNjcmlwdFZlcnNpb25Gb3JUZXN0aW5nKHZlcnNpb246IHN0cmluZyk6IHZvaWQge1xuICB0c1ZlcnNpb24gPSB2ZXJzaW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZVR5cGVTY3JpcHRWZXJzaW9uRm9yVGVzdGluZygpOiB2b2lkIHtcbiAgdHNWZXJzaW9uID0gdHMudmVyc2lvbjtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIHZlcnNpb24g4oiIIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uWy5cbiAqIEFuIGVycm9yIHdpbGwgYmUgdGhyb3duIHdoZW4gdGhlIGdpdmVuIHZlcnNpb24g4oiJIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uWy5cbiAqXG4gKiBAcGFyYW0gdmVyc2lvbiBUaGUgdmVyc2lvbiBvbiB3aGljaCB0aGUgY2hlY2sgd2lsbCBiZSBwZXJmb3JtZWRcbiAqIEBwYXJhbSBtaW5WZXJzaW9uIFRoZSBsb3dlciBib3VuZCB2ZXJzaW9uLiBBIHZhbGlkIHZlcnNpb24gbmVlZHMgdG8gYmUgZ3JlYXRlciB0aGFuIG1pblZlcnNpb25cbiAqIEBwYXJhbSBtYXhWZXJzaW9uIFRoZSB1cHBlciBib3VuZCB2ZXJzaW9uLiBBIHZhbGlkIHZlcnNpb24gbmVlZHMgdG8gYmUgc3RyaWN0bHkgbGVzcyB0aGFuXG4gKiBtYXhWZXJzaW9uXG4gKlxuICogQHRocm93cyBXaWxsIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2ZXJzaW9uIOKIiSBbbWluVmVyc2lvbiwgbWF4VmVyc2lvbltcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrVmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcsIG1pblZlcnNpb246IHN0cmluZywgbWF4VmVyc2lvbjogc3RyaW5nKSB7XG4gIGlmICgoY29tcGFyZVZlcnNpb25zKHZlcnNpb24sIG1pblZlcnNpb24pIDwgMCB8fCBjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgbWF4VmVyc2lvbikgPj0gMCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBBbmd1bGFyIENvbXBpbGVyIHJlcXVpcmVzIFR5cGVTY3JpcHQgPj0ke21pblZlcnNpb259IGFuZCA8JHtcbiAgICAgICAgbWF4VmVyc2lvbn0gYnV0ICR7dmVyc2lvbn0gd2FzIGZvdW5kIGluc3RlYWQuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9uKCk6IHZvaWQge1xuICBjaGVja1ZlcnNpb24odHNWZXJzaW9uLCBNSU5fVFNfVkVSU0lPTiwgTUFYX1RTX1ZFUlNJT04pO1xufVxuIl19