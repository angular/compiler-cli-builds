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
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var typescript_version_1 = require("@angular/compiler-cli/src/diagnostics/typescript_version");
    /**
     * Minimum supported TypeScript version
     * ∀ supported typescript version v, v >= MIN_TS_VERSION
     */
    var MIN_TS_VERSION = '3.9.2';
    /**
     * Supremum of supported TypeScript versions
     * ∀ supported typescript version v, v < MAX_TS_VERSION
     * MAX_TS_VERSION is not considered as a supported TypeScript version
     */
    var MAX_TS_VERSION = '4.0.0';
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
     * Checks whether a given version ∈ [minVersion, maxVersion[
     * An error will be thrown if the following statements are simultaneously true:
     * - the given version ∉ [minVersion, maxVersion[,
     *
     * @param version The version on which the check will be performed
     * @param minVersion The lower bound version. A valid version needs to be greater than minVersion
     * @param maxVersion The upper bound version. A valid version needs to be strictly less than
     * maxVersion
     *
     * @throws Will throw an error if the given version ∉ [minVersion, maxVersion[
     */
    function checkVersion(version, minVersion, maxVersion) {
        if ((typescript_version_1.compareVersions(version, minVersion) < 0 || typescript_version_1.compareVersions(version, maxVersion) >= 0)) {
            throw new Error("The Angular Compiler requires TypeScript >=" + minVersion + " and <" + maxVersion + " but " + version + " was found instead.");
        }
    }
    exports.checkVersion = checkVersion;
    function verifySupportedTypeScriptVersion() {
        checkVersion(tsVersion, MIN_TS_VERSION, MAX_TS_VERSION);
    }
    exports.verifySupportedTypeScriptVersion = verifySupportedTypeScriptVersion;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdF9zdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90eXBlc2NyaXB0X3N1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBQ2pDLCtGQUFpRTtJQUVqRTs7O09BR0c7SUFDSCxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUM7SUFFL0I7Ozs7T0FJRztJQUNILElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQztJQUUvQjs7O09BR0c7SUFDSCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO0lBRTNCLFNBQWdCLDhCQUE4QixDQUFDLE9BQWU7UUFDNUQsU0FBUyxHQUFHLE9BQU8sQ0FBQztJQUN0QixDQUFDO0lBRkQsd0VBRUM7SUFFRCxTQUFnQixrQ0FBa0M7UUFDaEQsU0FBUyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDekIsQ0FBQztJQUZELGdGQUVDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLFVBQWtCLEVBQUUsVUFBa0I7UUFDbEYsSUFBSSxDQUFDLG9DQUFlLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxvQ0FBZSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUMzRixNQUFNLElBQUksS0FBSyxDQUFDLGdEQUE4QyxVQUFVLGNBQ3BFLFVBQVUsYUFBUSxPQUFPLHdCQUFxQixDQUFDLENBQUM7U0FDckQ7SUFDSCxDQUFDO0lBTEQsb0NBS0M7SUFFRCxTQUFnQixnQ0FBZ0M7UUFDOUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUZELDRFQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge2NvbXBhcmVWZXJzaW9uc30gZnJvbSAnLi9kaWFnbm9zdGljcy90eXBlc2NyaXB0X3ZlcnNpb24nO1xuXG4vKipcbiAqIE1pbmltdW0gc3VwcG9ydGVkIFR5cGVTY3JpcHQgdmVyc2lvblxuICog4oiAIHN1cHBvcnRlZCB0eXBlc2NyaXB0IHZlcnNpb24gdiwgdiA+PSBNSU5fVFNfVkVSU0lPTlxuICovXG5jb25zdCBNSU5fVFNfVkVSU0lPTiA9ICczLjkuMic7XG5cbi8qKlxuICogU3VwcmVtdW0gb2Ygc3VwcG9ydGVkIFR5cGVTY3JpcHQgdmVyc2lvbnNcbiAqIOKIgCBzdXBwb3J0ZWQgdHlwZXNjcmlwdCB2ZXJzaW9uIHYsIHYgPCBNQVhfVFNfVkVSU0lPTlxuICogTUFYX1RTX1ZFUlNJT04gaXMgbm90IGNvbnNpZGVyZWQgYXMgYSBzdXBwb3J0ZWQgVHlwZVNjcmlwdCB2ZXJzaW9uXG4gKi9cbmNvbnN0IE1BWF9UU19WRVJTSU9OID0gJzQuMC4wJztcblxuLyoqXG4gKiBUaGUgY3VycmVudGx5IHVzZWQgdmVyc2lvbiBvZiBUeXBlU2NyaXB0LCB3aGljaCBjYW4gYmUgYWRqdXN0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgdXNpbmdcbiAqIGBzZXRUeXBlU2NyaXB0VmVyc2lvbkZvclRlc3RpbmdgIGFuZCBgcmVzdG9yZVR5cGVTY3JpcHRWZXJzaW9uRm9yVGVzdGluZ2AgYmVsb3cuXG4gKi9cbmxldCB0c1ZlcnNpb24gPSB0cy52ZXJzaW9uO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0VHlwZVNjcmlwdFZlcnNpb25Gb3JUZXN0aW5nKHZlcnNpb246IHN0cmluZyk6IHZvaWQge1xuICB0c1ZlcnNpb24gPSB2ZXJzaW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZVR5cGVTY3JpcHRWZXJzaW9uRm9yVGVzdGluZygpOiB2b2lkIHtcbiAgdHNWZXJzaW9uID0gdHMudmVyc2lvbjtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIHZlcnNpb24g4oiIIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uW1xuICogQW4gZXJyb3Igd2lsbCBiZSB0aHJvd24gaWYgdGhlIGZvbGxvd2luZyBzdGF0ZW1lbnRzIGFyZSBzaW11bHRhbmVvdXNseSB0cnVlOlxuICogLSB0aGUgZ2l2ZW4gdmVyc2lvbiDiiIkgW21pblZlcnNpb24sIG1heFZlcnNpb25bLFxuICpcbiAqIEBwYXJhbSB2ZXJzaW9uIFRoZSB2ZXJzaW9uIG9uIHdoaWNoIHRoZSBjaGVjayB3aWxsIGJlIHBlcmZvcm1lZFxuICogQHBhcmFtIG1pblZlcnNpb24gVGhlIGxvd2VyIGJvdW5kIHZlcnNpb24uIEEgdmFsaWQgdmVyc2lvbiBuZWVkcyB0byBiZSBncmVhdGVyIHRoYW4gbWluVmVyc2lvblxuICogQHBhcmFtIG1heFZlcnNpb24gVGhlIHVwcGVyIGJvdW5kIHZlcnNpb24uIEEgdmFsaWQgdmVyc2lvbiBuZWVkcyB0byBiZSBzdHJpY3RseSBsZXNzIHRoYW5cbiAqIG1heFZlcnNpb25cbiAqXG4gKiBAdGhyb3dzIFdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZlcnNpb24g4oiJIFttaW5WZXJzaW9uLCBtYXhWZXJzaW9uW1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tWZXJzaW9uKHZlcnNpb246IHN0cmluZywgbWluVmVyc2lvbjogc3RyaW5nLCBtYXhWZXJzaW9uOiBzdHJpbmcpIHtcbiAgaWYgKChjb21wYXJlVmVyc2lvbnModmVyc2lvbiwgbWluVmVyc2lvbikgPCAwIHx8IGNvbXBhcmVWZXJzaW9ucyh2ZXJzaW9uLCBtYXhWZXJzaW9uKSA+PSAwKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGhlIEFuZ3VsYXIgQ29tcGlsZXIgcmVxdWlyZXMgVHlwZVNjcmlwdCA+PSR7bWluVmVyc2lvbn0gYW5kIDwke1xuICAgICAgICBtYXhWZXJzaW9ufSBidXQgJHt2ZXJzaW9ufSB3YXMgZm91bmQgaW5zdGVhZC5gKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb24oKTogdm9pZCB7XG4gIGNoZWNrVmVyc2lvbih0c1ZlcnNpb24sIE1JTl9UU19WRVJTSU9OLCBNQVhfVFNfVkVSU0lPTik7XG59XG4iXX0=