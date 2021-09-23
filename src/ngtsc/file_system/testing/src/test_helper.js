(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/testing/src/test_helper", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers", "@angular/compiler-cli/src/ngtsc/file_system/src/invalid_file_system", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix", "@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initMockFileSystem = exports.runInEachFileSystem = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    /// <reference types="jasmine"/>
    var ts = require("typescript");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    var invalid_file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/invalid_file_system");
    var mock_file_system_native_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_native");
    var mock_file_system_posix_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_posix");
    var mock_file_system_windows_1 = require("@angular/compiler-cli/src/ngtsc/file_system/testing/src/mock_file_system_windows");
    var FS_NATIVE = 'Native';
    var FS_OS_X = 'OS/X';
    var FS_UNIX = 'Unix';
    var FS_WINDOWS = 'Windows';
    var FS_ALL = [FS_OS_X, FS_WINDOWS, FS_UNIX, FS_NATIVE];
    function runInEachFileSystemFn(callback) {
        FS_ALL.forEach(function (os) { return runInFileSystem(os, callback, false); });
    }
    function runInFileSystem(os, callback, error) {
        describe("<<FileSystem: " + os + ">>", function () {
            beforeEach(function () { return initMockFileSystem(os); });
            afterEach(function () { return (0, helpers_1.setFileSystem)(new invalid_file_system_1.InvalidFileSystem()); });
            callback(os);
            if (error) {
                afterAll(function () {
                    throw new Error("runInFileSystem limited to " + os + ", cannot pass");
                });
            }
        });
    }
    exports.runInEachFileSystem = runInEachFileSystemFn;
    exports.runInEachFileSystem.native = function (callback) {
        return runInFileSystem(FS_NATIVE, callback, true);
    };
    exports.runInEachFileSystem.osX = function (callback) {
        return runInFileSystem(FS_OS_X, callback, true);
    };
    exports.runInEachFileSystem.unix = function (callback) {
        return runInFileSystem(FS_UNIX, callback, true);
    };
    exports.runInEachFileSystem.windows = function (callback) {
        return runInFileSystem(FS_WINDOWS, callback, true);
    };
    function initMockFileSystem(os, cwd) {
        var fs = createMockFileSystem(os, cwd);
        (0, helpers_1.setFileSystem)(fs);
        monkeyPatchTypeScript(fs);
        return fs;
    }
    exports.initMockFileSystem = initMockFileSystem;
    function createMockFileSystem(os, cwd) {
        switch (os) {
            case 'OS/X':
                return new mock_file_system_posix_1.MockFileSystemPosix(/* isCaseSensitive */ false, cwd);
            case 'Unix':
                return new mock_file_system_posix_1.MockFileSystemPosix(/* isCaseSensitive */ true, cwd);
            case 'Windows':
                return new mock_file_system_windows_1.MockFileSystemWindows(/* isCaseSensitive*/ false, cwd);
            case 'Native':
                return new mock_file_system_native_1.MockFileSystemNative(cwd);
            default:
                throw new Error('FileSystem not supported');
        }
    }
    function monkeyPatchTypeScript(fs) {
        ts.sys.fileExists = function (path) {
            var absPath = fs.resolve(path);
            return fs.exists(absPath) && fs.stat(absPath).isFile();
        };
        ts.sys.getCurrentDirectory = function () { return fs.pwd(); };
        ts.sys.getDirectories = getDirectories;
        ts.sys.readFile = fs.readFile.bind(fs);
        ts.sys.resolvePath = fs.resolve.bind(fs);
        ts.sys.writeFile = fs.writeFile.bind(fs);
        ts.sys.directoryExists = directoryExists;
        ts.sys.readDirectory = readDirectory;
        function getDirectories(path) {
            return fs.readdir((0, helpers_1.absoluteFrom)(path)).filter(function (p) { return fs.stat(fs.resolve(path, p)).isDirectory(); });
        }
        function getFileSystemEntries(path) {
            var e_1, _a;
            var files = [];
            var directories = [];
            var absPath = fs.resolve(path);
            var entries = fs.readdir(absPath);
            try {
                for (var entries_1 = (0, tslib_1.__values)(entries), entries_1_1 = entries_1.next(); !entries_1_1.done; entries_1_1 = entries_1.next()) {
                    var entry = entries_1_1.value;
                    if (entry == '.' || entry === '..') {
                        continue;
                    }
                    var absPath_1 = fs.resolve(path, entry);
                    var stat = fs.stat(absPath_1);
                    if (stat.isDirectory()) {
                        directories.push(absPath_1);
                    }
                    else if (stat.isFile()) {
                        files.push(absPath_1);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) _a.call(entries_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return { files: files, directories: directories };
        }
        function realPath(path) {
            return fs.realpath(fs.resolve(path));
        }
        function directoryExists(path) {
            var absPath = fs.resolve(path);
            return fs.exists(absPath) && fs.stat(absPath).isDirectory();
        }
        // Rather than completely re-implementing we are using the `ts.matchFiles` function,
        // which is internal to the `ts` namespace.
        var tsMatchFiles = ts.matchFiles;
        function readDirectory(path, extensions, excludes, includes, depth) {
            return tsMatchFiles(path, extensions, excludes, includes, fs.isCaseSensitive(), fs.pwd(), depth, getFileSystemEntries, realPath, directoryExists);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdF9oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL3Rlc3Rpbmcvc3JjL3Rlc3RfaGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxnQ0FBZ0M7SUFDaEMsK0JBQWlDO0lBRWpDLG1GQUE4RDtJQUM5RCwyR0FBZ0U7SUFJaEUsMkhBQStEO0lBQy9ELHlIQUE2RDtJQUM3RCw2SEFBaUU7SUFnQmpFLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUMzQixJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDdkIsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLElBQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQztJQUM3QixJQUFNLE1BQU0sR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRXpELFNBQVMscUJBQXFCLENBQUMsUUFBOEI7UUFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLGVBQWUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFwQyxDQUFvQyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLEVBQVUsRUFBRSxRQUE4QixFQUFFLEtBQWM7UUFDakYsUUFBUSxDQUFDLG1CQUFpQixFQUFFLE9BQUksRUFBRTtZQUNoQyxVQUFVLENBQUMsY0FBTSxPQUFBLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUF0QixDQUFzQixDQUFDLENBQUM7WUFDekMsU0FBUyxDQUFDLGNBQU0sT0FBQSxJQUFBLHVCQUFhLEVBQUMsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDLEVBQXRDLENBQXNDLENBQUMsQ0FBQztZQUN4RCxR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QWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cImphc21pbmVcIi8+XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uL3NyYy9oZWxwZXJzJztcbmltcG9ydCB7SW52YWxpZEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uL3NyYy9pbnZhbGlkX2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL3NyYy90eXBlcyc7XG5cbmltcG9ydCB7TW9ja0ZpbGVTeXN0ZW19IGZyb20gJy4vbW9ja19maWxlX3N5c3RlbSc7XG5pbXBvcnQge01vY2tGaWxlU3lzdGVtTmF0aXZlfSBmcm9tICcuL21vY2tfZmlsZV9zeXN0ZW1fbmF0aXZlJztcbmltcG9ydCB7TW9ja0ZpbGVTeXN0ZW1Qb3NpeH0gZnJvbSAnLi9tb2NrX2ZpbGVfc3lzdGVtX3Bvc2l4JztcbmltcG9ydCB7TW9ja0ZpbGVTeXN0ZW1XaW5kb3dzfSBmcm9tICcuL21vY2tfZmlsZV9zeXN0ZW1fd2luZG93cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVzdEZpbGUge1xuICBuYW1lOiBBYnNvbHV0ZUZzUGF0aDtcbiAgY29udGVudHM6IHN0cmluZztcbiAgaXNSb290PzogYm9vbGVhbnx1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuSW5FYWNoRmlsZVN5c3RlbUZuIHtcbiAgKGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQ7XG4gIHdpbmRvd3MoY2FsbGJhY2s6IChvczogc3RyaW5nKSA9PiB2b2lkKTogdm9pZDtcbiAgdW5peChjYWxsYmFjazogKG9zOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkO1xuICBuYXRpdmUoY2FsbGJhY2s6IChvczogc3RyaW5nKSA9PiB2b2lkKTogdm9pZDtcbiAgb3NYKGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQ7XG59XG5cbmNvbnN0IEZTX05BVElWRSA9ICdOYXRpdmUnO1xuY29uc3QgRlNfT1NfWCA9ICdPUy9YJztcbmNvbnN0IEZTX1VOSVggPSAnVW5peCc7XG5jb25zdCBGU19XSU5ET1dTID0gJ1dpbmRvd3MnO1xuY29uc3QgRlNfQUxMID0gW0ZTX09TX1gsIEZTX1dJTkRPV1MsIEZTX1VOSVgsIEZTX05BVElWRV07XG5cbmZ1bmN0aW9uIHJ1bkluRWFjaEZpbGVTeXN0ZW1GbihjYWxsYmFjazogKG9zOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgRlNfQUxMLmZvckVhY2gob3MgPT4gcnVuSW5GaWxlU3lzdGVtKG9zLCBjYWxsYmFjaywgZmFsc2UpKTtcbn1cblxuZnVuY3Rpb24gcnVuSW5GaWxlU3lzdGVtKG9zOiBzdHJpbmcsIGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCwgZXJyb3I6IGJvb2xlYW4pIHtcbiAgZGVzY3JpYmUoYDw8RmlsZVN5c3RlbTogJHtvc30+PmAsICgpID0+IHtcbiAgICBiZWZvcmVFYWNoKCgpID0+IGluaXRNb2NrRmlsZVN5c3RlbShvcykpO1xuICAgIGFmdGVyRWFjaCgoKSA9PiBzZXRGaWxlU3lzdGVtKG5ldyBJbnZhbGlkRmlsZVN5c3RlbSgpKSk7XG4gICAgY2FsbGJhY2sob3MpO1xuICAgIGlmIChlcnJvcikge1xuICAgICAgYWZ0ZXJBbGwoKCkgPT4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHJ1bkluRmlsZVN5c3RlbSBsaW1pdGVkIHRvICR7b3N9LCBjYW5ub3QgcGFzc2ApO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGNvbnN0IHJ1bkluRWFjaEZpbGVTeXN0ZW06IFJ1bkluRWFjaEZpbGVTeXN0ZW1GbiA9XG4gICAgcnVuSW5FYWNoRmlsZVN5c3RlbUZuIGFzIFJ1bkluRWFjaEZpbGVTeXN0ZW1GbjtcblxucnVuSW5FYWNoRmlsZVN5c3RlbS5uYXRpdmUgPSAoY2FsbGJhY2s6IChvczogc3RyaW5nKSA9PiB2b2lkKSA9PlxuICAgIHJ1bkluRmlsZVN5c3RlbShGU19OQVRJVkUsIGNhbGxiYWNrLCB0cnVlKTtcbnJ1bkluRWFjaEZpbGVTeXN0ZW0ub3NYID0gKGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCkgPT5cbiAgICBydW5JbkZpbGVTeXN0ZW0oRlNfT1NfWCwgY2FsbGJhY2ssIHRydWUpO1xucnVuSW5FYWNoRmlsZVN5c3RlbS51bml4ID0gKGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCkgPT5cbiAgICBydW5JbkZpbGVTeXN0ZW0oRlNfVU5JWCwgY2FsbGJhY2ssIHRydWUpO1xucnVuSW5FYWNoRmlsZVN5c3RlbS53aW5kb3dzID0gKGNhbGxiYWNrOiAob3M6IHN0cmluZykgPT4gdm9pZCkgPT5cbiAgICBydW5JbkZpbGVTeXN0ZW0oRlNfV0lORE9XUywgY2FsbGJhY2ssIHRydWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdE1vY2tGaWxlU3lzdGVtKG9zOiBzdHJpbmcsIGN3ZD86IEFic29sdXRlRnNQYXRoKTogTW9ja0ZpbGVTeXN0ZW0ge1xuICBjb25zdCBmcyA9IGNyZWF0ZU1vY2tGaWxlU3lzdGVtKG9zLCBjd2QpO1xuICBzZXRGaWxlU3lzdGVtKGZzKTtcbiAgbW9ua2V5UGF0Y2hUeXBlU2NyaXB0KGZzKTtcbiAgcmV0dXJuIGZzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNb2NrRmlsZVN5c3RlbShvczogc3RyaW5nLCBjd2Q/OiBBYnNvbHV0ZUZzUGF0aCk6IE1vY2tGaWxlU3lzdGVtIHtcbiAgc3dpdGNoIChvcykge1xuICAgIGNhc2UgJ09TL1gnOlxuICAgICAgcmV0dXJuIG5ldyBNb2NrRmlsZVN5c3RlbVBvc2l4KC8qIGlzQ2FzZVNlbnNpdGl2ZSAqLyBmYWxzZSwgY3dkKTtcbiAgICBjYXNlICdVbml4JzpcbiAgICAgIHJldHVybiBuZXcgTW9ja0ZpbGVTeXN0ZW1Qb3NpeCgvKiBpc0Nhc2VTZW5zaXRpdmUgKi8gdHJ1ZSwgY3dkKTtcbiAgICBjYXNlICdXaW5kb3dzJzpcbiAgICAgIHJldHVybiBuZXcgTW9ja0ZpbGVTeXN0ZW1XaW5kb3dzKC8qIGlzQ2FzZVNlbnNpdGl2ZSovIGZhbHNlLCBjd2QpO1xuICAgIGNhc2UgJ05hdGl2ZSc6XG4gICAgICByZXR1cm4gbmV3IE1vY2tGaWxlU3lzdGVtTmF0aXZlKGN3ZCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZVN5c3RlbSBub3Qgc3VwcG9ydGVkJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbW9ua2V5UGF0Y2hUeXBlU2NyaXB0KGZzOiBNb2NrRmlsZVN5c3RlbSkge1xuICB0cy5zeXMuZmlsZUV4aXN0cyA9IHBhdGggPT4ge1xuICAgIGNvbnN0IGFic1BhdGggPSBmcy5yZXNvbHZlKHBhdGgpO1xuICAgIHJldHVybiBmcy5leGlzdHMoYWJzUGF0aCkgJiYgZnMuc3RhdChhYnNQYXRoKS5pc0ZpbGUoKTtcbiAgfTtcbiAgdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkgPSAoKSA9PiBmcy5wd2QoKTtcbiAgdHMuc3lzLmdldERpcmVjdG9yaWVzID0gZ2V0RGlyZWN0b3JpZXM7XG4gIHRzLnN5cy5yZWFkRmlsZSA9IGZzLnJlYWRGaWxlLmJpbmQoZnMpO1xuICB0cy5zeXMucmVzb2x2ZVBhdGggPSBmcy5yZXNvbHZlLmJpbmQoZnMpO1xuICB0cy5zeXMud3JpdGVGaWxlID0gZnMud3JpdGVGaWxlLmJpbmQoZnMpO1xuICB0cy5zeXMuZGlyZWN0b3J5RXhpc3RzID0gZGlyZWN0b3J5RXhpc3RzO1xuICB0cy5zeXMucmVhZERpcmVjdG9yeSA9IHJlYWREaXJlY3Rvcnk7XG5cbiAgZnVuY3Rpb24gZ2V0RGlyZWN0b3JpZXMocGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBmcy5yZWFkZGlyKGFic29sdXRlRnJvbShwYXRoKSkuZmlsdGVyKHAgPT4gZnMuc3RhdChmcy5yZXNvbHZlKHBhdGgsIHApKS5pc0RpcmVjdG9yeSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEZpbGVTeXN0ZW1FbnRyaWVzKHBhdGg6IHN0cmluZyk6IEZpbGVTeXN0ZW1FbnRyaWVzIHtcbiAgICBjb25zdCBmaWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBkaXJlY3Rvcmllczogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBhYnNQYXRoID0gZnMucmVzb2x2ZShwYXRoKTtcbiAgICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpcihhYnNQYXRoKTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeSA9PSAnLicgfHwgZW50cnkgPT09ICcuLicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBhYnNQYXRoID0gZnMucmVzb2x2ZShwYXRoLCBlbnRyeSk7XG4gICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdChhYnNQYXRoKTtcbiAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgZGlyZWN0b3JpZXMucHVzaChhYnNQYXRoKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICBmaWxlcy5wdXNoKGFic1BhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2ZpbGVzLCBkaXJlY3Rvcmllc307XG4gIH1cblxuICBmdW5jdGlvbiByZWFsUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBmcy5yZWFscGF0aChmcy5yZXNvbHZlKHBhdGgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpcmVjdG9yeUV4aXN0cyhwYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBhYnNQYXRoID0gZnMucmVzb2x2ZShwYXRoKTtcbiAgICByZXR1cm4gZnMuZXhpc3RzKGFic1BhdGgpICYmIGZzLnN0YXQoYWJzUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfVxuXG4gIC8vIFJhdGhlciB0aGFuIGNvbXBsZXRlbHkgcmUtaW1wbGVtZW50aW5nIHdlIGFyZSB1c2luZyB0aGUgYHRzLm1hdGNoRmlsZXNgIGZ1bmN0aW9uLFxuICAvLyB3aGljaCBpcyBpbnRlcm5hbCB0byB0aGUgYHRzYCBuYW1lc3BhY2UuXG4gIGNvbnN0IHRzTWF0Y2hGaWxlczogKFxuICAgICAgcGF0aDogc3RyaW5nLCBleHRlbnNpb25zOiBSZWFkb25seUFycmF5PHN0cmluZz58dW5kZWZpbmVkLFxuICAgICAgZXhjbHVkZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPnx1bmRlZmluZWQsIGluY2x1ZGVzOiBSZWFkb25seUFycmF5PHN0cmluZz58dW5kZWZpbmVkLFxuICAgICAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lczogYm9vbGVhbiwgY3VycmVudERpcmVjdG9yeTogc3RyaW5nLCBkZXB0aDogbnVtYmVyfHVuZGVmaW5lZCxcbiAgICAgIGdldEZpbGVTeXN0ZW1FbnRyaWVzOiAocGF0aDogc3RyaW5nKSA9PiBGaWxlU3lzdGVtRW50cmllcywgcmVhbHBhdGg6IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZyxcbiAgICAgIGRpcmVjdG9yeUV4aXN0czogKHBhdGg6IHN0cmluZykgPT4gYm9vbGVhbikgPT4gc3RyaW5nW10gPSAodHMgYXMgYW55KS5tYXRjaEZpbGVzO1xuXG4gIGZ1bmN0aW9uIHJlYWREaXJlY3RvcnkoXG4gICAgICBwYXRoOiBzdHJpbmcsIGV4dGVuc2lvbnM/OiBSZWFkb25seUFycmF5PHN0cmluZz4sIGV4Y2x1ZGVzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgaW5jbHVkZXM/OiBSZWFkb25seUFycmF5PHN0cmluZz4sIGRlcHRoPzogbnVtYmVyKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0c01hdGNoRmlsZXMoXG4gICAgICAgIHBhdGgsIGV4dGVuc2lvbnMsIGV4Y2x1ZGVzLCBpbmNsdWRlcywgZnMuaXNDYXNlU2Vuc2l0aXZlKCksIGZzLnB3ZCgpLCBkZXB0aCxcbiAgICAgICAgZ2V0RmlsZVN5c3RlbUVudHJpZXMsIHJlYWxQYXRoLCBkaXJlY3RvcnlFeGlzdHMpO1xuICB9XG59XG5cbmludGVyZmFjZSBGaWxlU3lzdGVtRW50cmllcyB7XG4gIHJlYWRvbmx5IGZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIHJlYWRvbmx5IGRpcmVjdG9yaWVzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59XG4iXX0=