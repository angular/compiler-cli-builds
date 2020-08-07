/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/file_system/testing", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/test_helper"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var mock_file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system");
    Object.defineProperty(exports, "MockFileSystem", { enumerable: true, get: function () { return mock_file_system_1.MockFileSystem; } });
    var mock_file_system_native_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native");
    Object.defineProperty(exports, "MockFileSystemNative", { enumerable: true, get: function () { return mock_file_system_native_1.MockFileSystemNative; } });
    var mock_file_system_posix_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix");
    Object.defineProperty(exports, "MockFileSystemPosix", { enumerable: true, get: function () { return mock_file_system_posix_1.MockFileSystemPosix; } });
    var mock_file_system_windows_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows");
    Object.defineProperty(exports, "MockFileSystemWindows", { enumerable: true, get: function () { return mock_file_system_windows_1.MockFileSystemWindows; } });
    var test_helper_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/test_helper");
    Object.defineProperty(exports, "initMockFileSystem", { enumerable: true, get: function () { return test_helper_1.initMockFileSystem; } });
    Object.defineProperty(exports, "runInEachFileSystem", { enumerable: true, get: function () { return test_helper_1.runInEachFileSystem; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL3Rlc3RpbmcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw2R0FBOEQ7SUFBOUMsa0hBQUEsY0FBYyxPQUFBO0lBQzlCLDJIQUFtRTtJQUEzRCwrSEFBQSxvQkFBb0IsT0FBQTtJQUM1Qix5SEFBaUU7SUFBekQsNkhBQUEsbUJBQW1CLE9BQUE7SUFDM0IsNkhBQXFFO0lBQTdELGlJQUFBLHFCQUFxQixPQUFBO0lBQzdCLG1HQUFvRjtJQUE1RSxpSEFBQSxrQkFBa0IsT0FBQTtJQUFFLGtIQUFBLG1CQUFtQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7Rm9sZGVyLCBNb2NrRmlsZVN5c3RlbX0gZnJvbSAnLi9zcmMvbW9ja19maWxlX3N5c3RlbSc7XG5leHBvcnQge01vY2tGaWxlU3lzdGVtTmF0aXZlfSBmcm9tICcuL3NyYy9tb2NrX2ZpbGVfc3lzdGVtX25hdGl2ZSc7XG5leHBvcnQge01vY2tGaWxlU3lzdGVtUG9zaXh9IGZyb20gJy4vc3JjL21vY2tfZmlsZV9zeXN0ZW1fcG9zaXgnO1xuZXhwb3J0IHtNb2NrRmlsZVN5c3RlbVdpbmRvd3N9IGZyb20gJy4vc3JjL21vY2tfZmlsZV9zeXN0ZW1fd2luZG93cyc7XG5leHBvcnQge2luaXRNb2NrRmlsZVN5c3RlbSwgcnVuSW5FYWNoRmlsZVN5c3RlbSwgVGVzdEZpbGV9IGZyb20gJy4vc3JjL3Rlc3RfaGVscGVyJztcbiJdfQ==