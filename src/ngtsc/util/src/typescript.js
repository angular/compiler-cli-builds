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
        define("@angular/compiler-cli/src/ngtsc/util/src/typescript", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var TS = /\.tsx?$/i;
    var D_TS = /\.d\.ts$/i;
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    function isDtsPath(filePath) {
        return D_TS.test(filePath);
    }
    exports.isDtsPath = isDtsPath;
    function isNonDeclarationTsPath(filePath) {
        return TS.test(filePath) && !D_TS.test(filePath);
    }
    exports.isNonDeclarationTsPath = isNonDeclarationTsPath;
    function isFromDtsFile(node) {
        var sf = node.getSourceFile();
        if (sf === undefined) {
            sf = ts.getOriginalNode(node).getSourceFile();
        }
        return sf !== undefined && D_TS.test(sf.fileName);
    }
    exports.isFromDtsFile = isFromDtsFile;
    function nodeNameForError(node) {
        if (node.name !== undefined && ts.isIdentifier(node.name)) {
            return node.name.text;
        }
        else {
            var kind = ts.SyntaxKind[node.kind];
            var _a = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()), line = _a.line, character = _a.character;
            return kind + "@" + line + ":" + character;
        }
    }
    exports.nodeNameForError = nodeNameForError;
    function getSourceFile(node) {
        // In certain transformation contexts, `ts.Node.getSourceFile()` can actually return `undefined`,
        // despite the type signature not allowing it. In that event, get the `ts.SourceFile` via the
        // original node instead (which works).
        var directSf = node.getSourceFile();
        return directSf !== undefined ? directSf : ts.getOriginalNode(node).getSourceFile();
    }
    exports.getSourceFile = getSourceFile;
    function identifierOfNode(decl) {
        if (decl.name !== undefined && ts.isIdentifier(decl.name)) {
            return decl.name;
        }
        else {
            return null;
        }
    }
    exports.identifierOfNode = identifierOfNode;
    function isDeclaration(node) {
        return false || ts.isEnumDeclaration(node) || ts.isClassDeclaration(node) ||
            ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node);
    }
    exports.isDeclaration = isDeclaration;
    function isExported(node) {
        var topLevel = node;
        if (ts.isVariableDeclaration(node) && ts.isVariableDeclarationList(node.parent)) {
            topLevel = node.parent.parent;
        }
        return topLevel.modifiers !== undefined &&
            topLevel.modifiers.some(function (modifier) { return modifier.kind === ts.SyntaxKind.ExportKeyword; });
    }
    exports.isExported = isExported;
    function getRootDirs(host, options) {
        var rootDirs = [];
        if (options.rootDirs !== undefined) {
            rootDirs.push.apply(rootDirs, tslib_1.__spread(options.rootDirs));
        }
        else if (options.rootDir !== undefined) {
            rootDirs.push(options.rootDir);
        }
        else {
            rootDirs.push(host.getCurrentDirectory());
        }
        // In Windows the above might not always return posix separated paths
        // See:
        // https://github.com/Microsoft/TypeScript/blob/3f7357d37f66c842d70d835bc925ec2a873ecfec/src/compiler/sys.ts#L650
        // Also compiler options might be set via an API which doesn't normalize paths
        return rootDirs.map(function (rootDir) { return path_1.AbsoluteFsPath.from(rootDir); });
    }
    exports.getRootDirs = getRootDirs;
    function nodeDebugInfo(node) {
        var sf = getSourceFile(node);
        var _a = ts.getLineAndCharacterOfPosition(sf, node.pos), line = _a.line, character = _a.character;
        return "[" + sf.fileName + ": " + ts.SyntaxKind[node.kind] + " @ " + line + ":" + character + "]";
    }
    exports.nodeDebugInfo = nodeDebugInfo;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxJQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7SUFDdEIsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDO0lBRXpCLCtCQUFpQztJQUNqQyw2REFBMEM7SUFFMUMsU0FBZ0IsU0FBUyxDQUFDLFFBQWdCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRkQsOEJBRUM7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxRQUFnQjtRQUNyRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFGRCx3REFFQztJQUVELFNBQWdCLGFBQWEsQ0FBQyxJQUFhO1FBQ3pDLElBQUksRUFBRSxHQUE0QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkQsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO1lBQ3BCLEVBQUUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1NBQy9DO1FBQ0QsT0FBTyxFQUFFLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFORCxzQ0FNQztJQUVELFNBQWdCLGdCQUFnQixDQUFDLElBQWdDO1FBQy9ELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFD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SUFFRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxJQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsSUFBQSxtREFBa0UsRUFBakUsY0FBSSxFQUFFLHdCQUEyRCxDQUFDO1FBQ3pFLE9BQU8sTUFBSSxFQUFFLENBQUMsUUFBUSxVQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFNLElBQUksU0FBSSxTQUFTLE1BQUcsQ0FBQztJQUNoRixDQUFDO0lBSkQsc0NBSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmNvbnN0IFRTID0gL1xcLnRzeD8kL2k7XG5jb25zdCBEX1RTID0gL1xcLmRcXC50cyQvaTtcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9wYXRoJztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzRHRzUGF0aChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBEX1RTLnRlc3QoZmlsZVBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOb25EZWNsYXJhdGlvblRzUGF0aChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBUUy50ZXN0KGZpbGVQYXRoKSAmJiAhRF9UUy50ZXN0KGZpbGVQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRnJvbUR0c0ZpbGUobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc2YgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICB9XG4gIHJldHVybiBzZiAhPT0gdW5kZWZpbmVkICYmIERfVFMudGVzdChzZi5maWxlTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZUZvckVycm9yKG5vZGU6IHRzLk5vZGUgJiB7bmFtZT86IHRzLk5vZGV9KTogc3RyaW5nIHtcbiAgaWYgKG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGtpbmQgPSB0cy5TeW50YXhLaW5kW25vZGUua2luZF07XG4gICAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihub2RlLmdldFNvdXJjZUZpbGUoKSwgbm9kZS5nZXRTdGFydCgpKTtcbiAgICByZXR1cm4gYCR7a2luZH1AJHtsaW5lfToke2NoYXJhY3Rlcn1gO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VGaWxlKG5vZGU6IHRzLk5vZGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgLy8gSW4gY2VydGFpbiB0cmFuc2Zvcm1hdGlvbiBjb250ZXh0cywgYHRzLk5vZGUuZ2V0U291cmNlRmlsZSgpYCBjYW4gYWN0dWFsbHkgcmV0dXJuIGB1bmRlZmluZWRgLFxuICAvLyBkZXNwaXRlIHRoZSB0eXBlIHNpZ25hdHVyZSBub3QgYWxsb3dpbmcgaXQuIEluIHRoYXQgZXZlbnQsIGdldCB0aGUgYHRzLlNvdXJjZUZpbGVgIHZpYSB0aGVcbiAgLy8gb3JpZ2luYWwgbm9kZSBpbnN0ZWFkICh3aGljaCB3b3JrcykuXG4gIGNvbnN0IGRpcmVjdFNmID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkgYXMgdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGRpcmVjdFNmICE9PSB1bmRlZmluZWQgPyBkaXJlY3RTZiA6IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGlmaWVyT2ZOb2RlKGRlY2w6IHRzLk5vZGUgJiB7bmFtZT86IHRzLk5vZGV9KTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgaWYgKGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5EZWNsYXJhdGlvbiB7XG4gIHJldHVybiBmYWxzZSB8fCB0cy5pc0VudW1EZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cG9ydGVkKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGxldCB0b3BMZXZlbDogdHMuTm9kZSA9IG5vZGU7XG4gIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChub2RlLnBhcmVudCkpIHtcbiAgICB0b3BMZXZlbCA9IG5vZGUucGFyZW50LnBhcmVudDtcbiAgfVxuICByZXR1cm4gdG9wTGV2ZWwubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHRvcExldmVsLm1vZGlmaWVycy5zb21lKG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb290RGlycyhob3N0OiB0cy5Db21waWxlckhvc3QsIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IEFic29sdXRlRnNQYXRoW10ge1xuICBjb25zdCByb290RGlyczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKG9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIHJvb3REaXJzLnB1c2goLi4ub3B0aW9ucy5yb290RGlycyk7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICByb290RGlycy5wdXNoKG9wdGlvbnMucm9vdERpcik7XG4gIH0gZWxzZSB7XG4gICAgcm9vdERpcnMucHVzaChob3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKSk7XG4gIH1cblxuICAvLyBJbiBXaW5kb3dzIHRoZSBhYm92ZSBtaWdodCBub3QgYWx3YXlzIHJldHVybiBwb3NpeCBzZXBhcmF0ZWQgcGF0aHNcbiAgLy8gU2VlOlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi8zZjczNTdkMzdmNjZjODQyZDcwZDgzNWJjOTI1ZWMyYTg3M2VjZmVjL3NyYy9jb21waWxlci9zeXMudHMjTDY1MFxuICAvLyBBbHNvIGNvbXBpbGVyIG9wdGlvbnMgbWlnaHQgYmUgc2V0IHZpYSBhbiBBUEkgd2hpY2ggZG9lc24ndCBub3JtYWxpemUgcGF0aHNcbiAgcmV0dXJuIHJvb3REaXJzLm1hcChyb290RGlyID0+IEFic29sdXRlRnNQYXRoLmZyb20ocm9vdERpcikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9kZURlYnVnSW5mbyhub2RlOiB0cy5Ob2RlKTogc3RyaW5nIHtcbiAgY29uc3Qgc2YgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNmLCBub2RlLnBvcyk7XG4gIHJldHVybiBgWyR7c2YuZmlsZU5hbWV9OiAke3RzLlN5bnRheEtpbmRbbm9kZS5raW5kXX0gQCAke2xpbmV9OiR7Y2hhcmFjdGVyfV1gO1xufVxuIl19