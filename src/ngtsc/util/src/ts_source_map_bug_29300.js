(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tsSourceMapBug29300Fixed = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var _tsSourceMapBug29300Fixed;
    /**
     * Test the current version of TypeScript to see if it has fixed the external SourceMap
     * file bug: https://github.com/Microsoft/TypeScript/issues/29300.
     *
     * The bug is fixed in TS 3.3+ but this check avoid us having to rely upon the version number,
     * and allows us to gracefully fail if the TS version still has the bug.
     *
     * We check for the bug by compiling a very small program `a;` and transforming it to `b;`,
     * where we map the new `b` identifier to an external source file, which has different lines to
     * the original source file.  If the bug is fixed then the output SourceMap should contain
     * mappings that correspond ot the correct line/col pairs for this transformed node.
     *
     * @returns true if the bug is fixed.
     */
    function tsSourceMapBug29300Fixed() {
        if (_tsSourceMapBug29300Fixed === undefined) {
            var writtenFiles_1 = {};
            var sourceFile_1 = ts.createSourceFile('test.ts', 'a;', ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
            var host = {
                getSourceFile: function () {
                    return sourceFile_1;
                },
                fileExists: function () {
                    return true;
                },
                readFile: function () {
                    return '';
                },
                writeFile: function (fileName, data) {
                    writtenFiles_1[fileName] = data;
                },
                getDefaultLibFileName: function () {
                    return '';
                },
                getCurrentDirectory: function () {
                    return '';
                },
                getDirectories: function () {
                    return [];
                },
                getCanonicalFileName: function () {
                    return '';
                },
                useCaseSensitiveFileNames: function () {
                    return true;
                },
                getNewLine: function () {
                    return '\n';
                },
            };
            var transform = function (context) {
                return function (node) { return ts.visitNode(node, visitor); };
                function visitor(node) {
                    if (ts.isIdentifier(node) && node.text === 'a') {
                        var newNode = ts.createIdentifier('b');
                        ts.setSourceMapRange(newNode, {
                            pos: 16,
                            end: 16,
                            source: ts.createSourceMapSource('test.html', 'abc\ndef\nghi\njkl\nmno\npqr')
                        });
                        return newNode;
                    }
                    return ts.visitEachChild(node, visitor, context);
                }
            };
            var program = ts.createProgram(['test.ts'], { sourceMap: true }, host);
            program.emit(sourceFile_1, undefined, undefined, undefined, { after: [transform] });
            // The first two mappings in the source map should look like:
            // [0,1,4,0] col 0 => source file 1, row 4, column 0)
            // [1,0,0,0] col 1 => source file 1, row 4, column 0)
            _tsSourceMapBug29300Fixed = /ACIA,CAAA/.test(writtenFiles_1['test.js.map']);
        }
        return _tsSourceMapBug29300Fixed;
    }
    exports.tsSourceMapBug29300Fixed = tsSourceMapBug29300Fixed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfc291cmNlX21hcF9idWdfMjkzMDAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3V0aWwvc3JjL3RzX3NvdXJjZV9tYXBfYnVnXzI5MzAwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQyxJQUFJLHlCQUE0QyxDQUFDO0lBRWpEOzs7Ozs7Ozs7Ozs7O09BYUc7SUFDSCxTQUFnQix3QkFBd0I7UUFDdEMsSUFBSSx5QkFBeUIsS0FBSyxTQUFTLEVBQUU7WUFDM0MsSUFBSSxjQUFZLEdBQWlDLEVBQUUsQ0FBQztZQUNwRCxJQUFNLFlBQVUsR0FDWixFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6RixJQUFNLElBQUksR0FBRztnQkFDWCxhQUFhLEVBQWI7b0JBRU0sT0FBTyxZQUFVLENBQUM7Z0JBQ3BCLENBQUM7Z0JBQ0wsVUFBVSxFQUFWO29CQUNFLE9BQU8sSUFBSSxDQUFDO2dCQUNkLENBQUM7Z0JBQ0QsUUFBUSxFQUFSO29CQUVNLE9BQU8sRUFBRSxDQUFDO2dCQUNaLENBQUM7Z0JBQ0wsU0FBUyxFQUFULFVBQVUsUUFBZ0IsRUFBRSxJQUFZO29CQUN0QyxjQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNoQyxDQUFDO2dCQUNELHFCQUFxQixFQUFyQjtvQkFDRSxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO2dCQUNELG1CQUFtQixFQUFuQjtvQkFDRSxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO2dCQUNELGNBQWMsRUFBZDtvQkFDRSxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO2dCQUNELG9CQUFvQixFQUFwQjtvQkFDRSxPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO2dCQUNELHlCQUF5QixFQUF6QjtvQkFDRSxPQUFPLElBQUksQ0FBQztnQkFDZCxDQUFDO2dCQUNELFVBQVUsRUFBVjtvQkFDRSxPQUFPLElBQUksQ0FBQztnQkFDZCxDQUFDO2FBQ0YsQ0FBQztZQUVGLElBQU0sU0FBUyxHQUFHLFVBQUMsT0FBaUM7Z0JBQ2xELE9BQU8sVUFBQyxJQUFtQixJQUFLLE9BQUEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQTNCLENBQTJCLENBQUM7Z0JBQzVELFNBQVMsT0FBTyxDQUFDLElBQWE7b0JBQzVCLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTt3QkFDOUMsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUN6QyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFOzRCQUM1QixHQUFHLEVBQUUsRUFBRTs0QkFDUCxHQUFHLEVBQUUsRUFBRTs0QkFDUCxNQUFNLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSw4QkFBOEIsQ0FBQzt5QkFDOUUsQ0FBQyxDQUFDO3dCQUNILE9BQU8sT0FBTyxDQUFDO3FCQUNoQjtvQkFDRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbkQsQ0FBQztZQUNILENBQUMsQ0FBQztZQUVGLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2RSxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUNoRiw2REFBNkQ7WUFDN0QscURBQXFEO1lBQ3JELHFEQUFxRDtZQUNyRCx5QkFBeUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1NBQzNFO1FBQ0QsT0FBTyx5QkFBeUIsQ0FBQztJQUNuQyxDQUFDO0lBaEVELDREQWdFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5sZXQgX3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZDogYm9vbGVhbnx1bmRlZmluZWQ7XG5cbi8qKlxuICogVGVzdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIFR5cGVTY3JpcHQgdG8gc2VlIGlmIGl0IGhhcyBmaXhlZCB0aGUgZXh0ZXJuYWwgU291cmNlTWFwXG4gKiBmaWxlIGJ1ZzogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTMwMC5cbiAqXG4gKiBUaGUgYnVnIGlzIGZpeGVkIGluIFRTIDMuMysgYnV0IHRoaXMgY2hlY2sgYXZvaWQgdXMgaGF2aW5nIHRvIHJlbHkgdXBvbiB0aGUgdmVyc2lvbiBudW1iZXIsXG4gKiBhbmQgYWxsb3dzIHVzIHRvIGdyYWNlZnVsbHkgZmFpbCBpZiB0aGUgVFMgdmVyc2lvbiBzdGlsbCBoYXMgdGhlIGJ1Zy5cbiAqXG4gKiBXZSBjaGVjayBmb3IgdGhlIGJ1ZyBieSBjb21waWxpbmcgYSB2ZXJ5IHNtYWxsIHByb2dyYW0gYGE7YCBhbmQgdHJhbnNmb3JtaW5nIGl0IHRvIGBiO2AsXG4gKiB3aGVyZSB3ZSBtYXAgdGhlIG5ldyBgYmAgaWRlbnRpZmllciB0byBhbiBleHRlcm5hbCBzb3VyY2UgZmlsZSwgd2hpY2ggaGFzIGRpZmZlcmVudCBsaW5lcyB0b1xuICogdGhlIG9yaWdpbmFsIHNvdXJjZSBmaWxlLiAgSWYgdGhlIGJ1ZyBpcyBmaXhlZCB0aGVuIHRoZSBvdXRwdXQgU291cmNlTWFwIHNob3VsZCBjb250YWluXG4gKiBtYXBwaW5ncyB0aGF0IGNvcnJlc3BvbmQgb3QgdGhlIGNvcnJlY3QgbGluZS9jb2wgcGFpcnMgZm9yIHRoaXMgdHJhbnNmb3JtZWQgbm9kZS5cbiAqXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBidWcgaXMgZml4ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWQoKSB7XG4gIGlmIChfdHNTb3VyY2VNYXBCdWcyOTMwMEZpeGVkID09PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgd3JpdHRlbkZpbGVzOiB7W2ZpbGVuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgY29uc3Qgc291cmNlRmlsZSA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ3Rlc3QudHMnLCAnYTsnLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgICBjb25zdCBob3N0ID0ge1xuICAgICAgZ2V0U291cmNlRmlsZSgpOiB0cy5Tb3VyY2VGaWxlIHxcbiAgICAgICAgICB1bmRlZmluZWQge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUZpbGU7XG4gICAgICAgICAgfSxcbiAgICAgIGZpbGVFeGlzdHMoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHJlYWRGaWxlKCk6IHN0cmluZyB8XG4gICAgICAgICAgdW5kZWZpbmVkIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICB9LFxuICAgICAgd3JpdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZykge1xuICAgICAgICB3cml0dGVuRmlsZXNbZmlsZU5hbWVdID0gZGF0YTtcbiAgICAgIH0sXG4gICAgICBnZXREZWZhdWx0TGliRmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfSxcbiAgICAgIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfSxcbiAgICAgIGdldERpcmVjdG9yaWVzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfSxcbiAgICAgIGdldENhbm9uaWNhbEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH0sXG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBnZXROZXdMaW5lKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnXFxuJztcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNvbnN0IHRyYW5zZm9ybSA9IChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICAgIHJldHVybiAobm9kZTogdHMuU291cmNlRmlsZSkgPT4gdHMudmlzaXROb2RlKG5vZGUsIHZpc2l0b3IpO1xuICAgICAgZnVuY3Rpb24gdmlzaXRvcihub2RlOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkgJiYgbm9kZS50ZXh0ID09PSAnYScpIHtcbiAgICAgICAgICBjb25zdCBuZXdOb2RlID0gdHMuY3JlYXRlSWRlbnRpZmllcignYicpO1xuICAgICAgICAgIHRzLnNldFNvdXJjZU1hcFJhbmdlKG5ld05vZGUsIHtcbiAgICAgICAgICAgIHBvczogMTYsXG4gICAgICAgICAgICBlbmQ6IDE2LFxuICAgICAgICAgICAgc291cmNlOiB0cy5jcmVhdGVTb3VyY2VNYXBTb3VyY2UoJ3Rlc3QuaHRtbCcsICdhYmNcXG5kZWZcXG5naGlcXG5qa2xcXG5tbm9cXG5wcXInKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuZXdOb2RlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cy52aXNpdEVhY2hDaGlsZChub2RlLCB2aXNpdG9yLCBjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oWyd0ZXN0LnRzJ10sIHtzb3VyY2VNYXA6IHRydWV9LCBob3N0KTtcbiAgICBwcm9ncmFtLmVtaXQoc291cmNlRmlsZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwge2FmdGVyOiBbdHJhbnNmb3JtXX0pO1xuICAgIC8vIFRoZSBmaXJzdCB0d28gbWFwcGluZ3MgaW4gdGhlIHNvdXJjZSBtYXAgc2hvdWxkIGxvb2sgbGlrZTpcbiAgICAvLyBbMCwxLDQsMF0gY29sIDAgPT4gc291cmNlIGZpbGUgMSwgcm93IDQsIGNvbHVtbiAwKVxuICAgIC8vIFsxLDAsMCwwXSBjb2wgMSA9PiBzb3VyY2UgZmlsZSAxLCByb3cgNCwgY29sdW1uIDApXG4gICAgX3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZCA9IC9BQ0lBLENBQUEvLnRlc3Qod3JpdHRlbkZpbGVzWyd0ZXN0LmpzLm1hcCddKTtcbiAgfVxuICByZXR1cm4gX3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZDtcbn0iXX0=