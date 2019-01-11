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
        define("@angular/compiler-cli/src/ngtsc/entry_point/src/logic", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    function findFlatIndexEntryPoint(rootFiles) {
        var e_1, _a;
        // There are two ways for a file to be recognized as the flat module index:
        // 1) if it's the only file!!!!!!
        // 2) (deprecated) if it's named 'index.ts' and has the shortest path of all such files.
        var tsFiles = rootFiles.filter(function (file) { return typescript_1.isNonDeclarationTsPath(file); });
        if (tsFiles.length === 1) {
            // There's only one file - this is the flat module index.
            return tsFiles[0];
        }
        else {
            // In the event there's more than one TS file, one of them can still be selected as the
            // flat module index if it's named 'index.ts'. If there's more than one 'index.ts', the one
            // with the shortest path wins.
            //
            // This behavior is DEPRECATED and only exists to support existing usages.
            var indexFile = null;
            try {
                for (var tsFiles_1 = tslib_1.__values(tsFiles), tsFiles_1_1 = tsFiles_1.next(); !tsFiles_1_1.done; tsFiles_1_1 = tsFiles_1.next()) {
                    var tsFile = tsFiles_1_1.value;
                    if (tsFile.endsWith('/index.ts') &&
                        (indexFile === null || tsFile.length <= indexFile.length)) {
                        indexFile = tsFile;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (tsFiles_1_1 && !tsFiles_1_1.done && (_a = tsFiles_1.return)) _a.call(tsFiles_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return indexFile;
        }
    }
    exports.findFlatIndexEntryPoint = findFlatIndexEntryPoint;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2VudHJ5X3BvaW50L3NyYy9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxrRkFBaUU7SUFFakUsU0FBZ0IsdUJBQXVCLENBQUMsU0FBZ0M7O1FBQ3RFLDJFQUEyRTtRQUMzRSxpQ0FBaUM7UUFDakMsd0ZBQXdGO1FBQ3hGLElBQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxtQ0FBc0IsQ0FBQyxJQUFJLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDeEIseURBQXlEO1lBQ3pELE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ25CO2FBQU07WUFDTCx1RkFBdUY7WUFDdkYsMkZBQTJGO1lBQzNGLCtCQUErQjtZQUMvQixFQUFFO1lBQ0YsMEVBQTBFO1lBQzFFLElBQUksU0FBUyxHQUFnQixJQUFJLENBQUM7O2dCQUNsQyxLQUFxQixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO29CQUF6QixJQUFNLE1BQU0sb0JBQUE7b0JBQ2YsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQzt3QkFDNUIsQ0FBQyxTQUFTLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUM3RCxTQUFTLEdBQUcsTUFBTSxDQUFDO3FCQUNwQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxTQUFTLENBQUM7U0FDbEI7SUFDSCxDQUFDO0lBdkJELDBEQXVCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50KHJvb3RGaWxlczogUmVhZG9ubHlBcnJheTxzdHJpbmc+KTogc3RyaW5nfG51bGwge1xuICAvLyBUaGVyZSBhcmUgdHdvIHdheXMgZm9yIGEgZmlsZSB0byBiZSByZWNvZ25pemVkIGFzIHRoZSBmbGF0IG1vZHVsZSBpbmRleDpcbiAgLy8gMSkgaWYgaXQncyB0aGUgb25seSBmaWxlISEhISEhXG4gIC8vIDIpIChkZXByZWNhdGVkKSBpZiBpdCdzIG5hbWVkICdpbmRleC50cycgYW5kIGhhcyB0aGUgc2hvcnRlc3QgcGF0aCBvZiBhbGwgc3VjaCBmaWxlcy5cbiAgY29uc3QgdHNGaWxlcyA9IHJvb3RGaWxlcy5maWx0ZXIoZmlsZSA9PiBpc05vbkRlY2xhcmF0aW9uVHNQYXRoKGZpbGUpKTtcbiAgaWYgKHRzRmlsZXMubGVuZ3RoID09PSAxKSB7XG4gICAgLy8gVGhlcmUncyBvbmx5IG9uZSBmaWxlIC0gdGhpcyBpcyB0aGUgZmxhdCBtb2R1bGUgaW5kZXguXG4gICAgcmV0dXJuIHRzRmlsZXNbMF07XG4gIH0gZWxzZSB7XG4gICAgLy8gSW4gdGhlIGV2ZW50IHRoZXJlJ3MgbW9yZSB0aGFuIG9uZSBUUyBmaWxlLCBvbmUgb2YgdGhlbSBjYW4gc3RpbGwgYmUgc2VsZWN0ZWQgYXMgdGhlXG4gICAgLy8gZmxhdCBtb2R1bGUgaW5kZXggaWYgaXQncyBuYW1lZCAnaW5kZXgudHMnLiBJZiB0aGVyZSdzIG1vcmUgdGhhbiBvbmUgJ2luZGV4LnRzJywgdGhlIG9uZVxuICAgIC8vIHdpdGggdGhlIHNob3J0ZXN0IHBhdGggd2lucy5cbiAgICAvL1xuICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgREVQUkVDQVRFRCBhbmQgb25seSBleGlzdHMgdG8gc3VwcG9ydCBleGlzdGluZyB1c2FnZXMuXG4gICAgbGV0IGluZGV4RmlsZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGZvciAoY29uc3QgdHNGaWxlIG9mIHRzRmlsZXMpIHtcbiAgICAgIGlmICh0c0ZpbGUuZW5kc1dpdGgoJy9pbmRleC50cycpICYmXG4gICAgICAgICAgKGluZGV4RmlsZSA9PT0gbnVsbCB8fCB0c0ZpbGUubGVuZ3RoIDw9IGluZGV4RmlsZS5sZW5ndGgpKSB7XG4gICAgICAgIGluZGV4RmlsZSA9IHRzRmlsZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGluZGV4RmlsZTtcbiAgfVxufVxuIl19