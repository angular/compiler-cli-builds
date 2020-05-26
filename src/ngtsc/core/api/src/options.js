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
        define("@angular/compiler-cli/src/ngtsc/core/api/src/options", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9hcGkvc3JjL29wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXplbEFuZEczT3B0aW9ucywgSTE4bk9wdGlvbnMsIExlZ2FjeU5nY09wdGlvbnMsIE1pc2NPcHRpb25zLCBOZ2NDb21wYXRpYmlsaXR5T3B0aW9ucywgU3RyaWN0VGVtcGxhdGVPcHRpb25zfSBmcm9tICcuL3B1YmxpY19vcHRpb25zJztcblxuXG4vKipcbiAqIE5vbi1wdWJsaWMgb3B0aW9ucyB3aGljaCBhcmUgdXNlZnVsIGR1cmluZyB0ZXN0aW5nIG9mIHRoZSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZXN0T25seU9wdGlvbnMge1xuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgdGhlIENvbXBpbGVySG9zdCdzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHV0aWxpdHkgKGlmIGF2YWlsYWJsZSkgdG8gZ2VuZXJhdGVcbiAgICogaW1wb3J0IG1vZHVsZSBzcGVjaWZpZXJzLiBUaGlzIGlzIGZhbHNlIGJ5IGRlZmF1bHQsIGFuZCBleGlzdHMgdG8gc3VwcG9ydCBydW5uaW5nIG5ndHNjXG4gICAqIHdpdGhpbiBHb29nbGUuIFRoaXMgb3B0aW9uIGlzIGludGVybmFsIGFuZCBpcyB1c2VkIGJ5IHRoZSBuZ19tb2R1bGUuYnpsIHJ1bGUgdG8gc3dpdGNoXG4gICAqIGJlaGF2aW9yIGJldHdlZW4gQmF6ZWwgYW5kIEJsYXplLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFR1cm4gb24gdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpbiB0aGUgSXZ5IGNvbXBpbGVyLlxuICAgKlxuICAgKiBUaGlzIGlzIGFuIGludGVybmFsIGZsYWcgYmVpbmcgdXNlZCB0byByb2xsIG91dCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGluIG5ndHNjLiBUdXJuaW5nIGl0IG9uXG4gICAqIGJ5IGRlZmF1bHQgYmVmb3JlIGl0J3MgcmVhZHkgbWlnaHQgYnJlYWsgb3RoZXIgdXNlcnMgYXR0ZW1wdGluZyB0byB0ZXN0IHRoZSBuZXcgY29tcGlsZXInc1xuICAgKiBiZWhhdmlvci5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBpdnlUZW1wbGF0ZVR5cGVDaGVjaz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFuIG9wdGlvbiB0byBlbmFibGUgbmd0c2MncyBpbnRlcm5hbCBwZXJmb3JtYW5jZSB0cmFjaW5nLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBiZSBhIHBhdGggdG8gYSBKU09OIGZpbGUgd2hlcmUgdHJhY2UgaW5mb3JtYXRpb24gd2lsbCBiZSB3cml0dGVuLiBBbiBvcHRpb25hbCAndHM6J1xuICAgKiBwcmVmaXggd2lsbCBjYXVzZSB0aGUgdHJhY2UgdG8gYmUgd3JpdHRlbiB2aWEgdGhlIFRTIGhvc3QgaW5zdGVhZCBvZiBkaXJlY3RseSB0byB0aGUgZmlsZXN5c3RlbVxuICAgKiAobm90IGFsbCBob3N0cyBzdXBwb3J0IHRoaXMgbW9kZSBvZiBvcGVyYXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIGN1cnJlbnRseSBub3QgZXhwb3NlZCB0byB1c2VycyBhcyB0aGUgdHJhY2UgZm9ybWF0IGlzIHN0aWxsIHVuc3RhYmxlLlxuICAgKi9cbiAgdHJhY2VQZXJmb3JtYW5jZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIG1lcmdlZCBpbnRlcmZhY2Ugb2YgYWxsIG9mIHRoZSB2YXJpb3VzIEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9ucywgYXMgd2VsbCBhcyB0aGUgc3RhbmRhcmRcbiAqIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICpcbiAqIEFsc28gaW5jbHVkZXMgYSBmZXcgbWlzY2VsbGFuZW91cyBvcHRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nQ29tcGlsZXJPcHRpb25zIGV4dGVuZHMgdHMuQ29tcGlsZXJPcHRpb25zLCBMZWdhY3lOZ2NPcHRpb25zLCBCYXplbEFuZEczT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOZ2NDb21wYXRpYmlsaXR5T3B0aW9ucywgU3RyaWN0VGVtcGxhdGVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRlc3RPbmx5T3B0aW9ucywgSTE4bk9wdGlvbnMsIE1pc2NPcHRpb25zIHt9Il19