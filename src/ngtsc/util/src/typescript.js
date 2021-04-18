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
        define("@angular/compiler-cli/src/ngtsc/util/src/typescript", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toUnredirectedSourceFile = exports.isAssignment = exports.resolveModuleName = exports.nodeDebugInfo = exports.getRootDirs = exports.isExported = exports.isTypeDeclaration = exports.isValueDeclaration = exports.isDeclaration = exports.identifierOfNode = exports.getTokenAtPosition = exports.getSourceFileOrNull = exports.getSourceFile = exports.nodeNameForError = exports.isFromDtsFile = exports.isNonDeclarationTsPath = exports.isDtsPath = void 0;
    var tslib_1 = require("tslib");
    var TS = /\.tsx?$/i;
    var D_TS = /\.d\.ts$/i;
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
        return sf !== undefined && sf.isDeclarationFile;
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
    function getSourceFileOrNull(program, fileName) {
        return program.getSourceFile(fileName) || null;
    }
    exports.getSourceFileOrNull = getSourceFileOrNull;
    function getTokenAtPosition(sf, pos) {
        // getTokenAtPosition is part of TypeScript's private API.
        return ts.getTokenAtPosition(sf, pos);
    }
    exports.getTokenAtPosition = getTokenAtPosition;
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
        return isValueDeclaration(node) || isTypeDeclaration(node);
    }
    exports.isDeclaration = isDeclaration;
    function isValueDeclaration(node) {
        return ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) ||
            ts.isVariableDeclaration(node);
    }
    exports.isValueDeclaration = isValueDeclaration;
    function isTypeDeclaration(node) {
        return ts.isEnumDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
            ts.isInterfaceDeclaration(node);
    }
    exports.isTypeDeclaration = isTypeDeclaration;
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
        var cwd = host.getCurrentDirectory();
        var fs = file_system_1.getFileSystem();
        if (options.rootDirs !== undefined) {
            rootDirs.push.apply(rootDirs, tslib_1.__spreadArray([], tslib_1.__read(options.rootDirs)));
        }
        else if (options.rootDir !== undefined) {
            rootDirs.push(options.rootDir);
        }
        else {
            rootDirs.push(cwd);
        }
        // In Windows the above might not always return posix separated paths
        // See:
        // https://github.com/Microsoft/TypeScript/blob/3f7357d37f66c842d70d835bc925ec2a873ecfec/src/compiler/sys.ts#L650
        // Also compiler options might be set via an API which doesn't normalize paths
        return rootDirs.map(function (rootDir) { return fs.resolve(cwd, host.getCanonicalFileName(rootDir)); });
    }
    exports.getRootDirs = getRootDirs;
    function nodeDebugInfo(node) {
        var sf = getSourceFile(node);
        var _a = ts.getLineAndCharacterOfPosition(sf, node.pos), line = _a.line, character = _a.character;
        return "[" + sf.fileName + ": " + ts.SyntaxKind[node.kind] + " @ " + line + ":" + character + "]";
    }
    exports.nodeDebugInfo = nodeDebugInfo;
    /**
     * Resolve the specified `moduleName` using the given `compilerOptions` and `compilerHost`.
     *
     * This helper will attempt to use the `CompilerHost.resolveModuleNames()` method if available.
     * Otherwise it will fallback on the `ts.ResolveModuleName()` function.
     */
    function resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache) {
        if (compilerHost.resolveModuleNames) {
            return compilerHost.resolveModuleNames([moduleName], containingFile, undefined, // reusedNames
            undefined, // redirectedReference
            compilerOptions)[0];
        }
        else {
            return ts
                .resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : undefined)
                .resolvedModule;
        }
    }
    exports.resolveModuleName = resolveModuleName;
    /** Returns true if the node is an assignment expression. */
    function isAssignment(node) {
        return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    }
    exports.isAssignment = isAssignment;
    /**
     * Obtains the non-redirected source file for `sf`.
     */
    function toUnredirectedSourceFile(sf) {
        var redirectInfo = sf.redirectInfo;
        if (redirectInfo === undefined) {
            return sf;
        }
        return redirectInfo.unredirected;
    }
    exports.toUnredirectedSourceFile = toUnredirectedSourceFile;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsSUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLElBQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQztJQUV6QiwrQkFBaUM7SUFDakMsMkVBQWdFO0lBR2hFLFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUZELDhCQUVDO0lBRUQsU0FBZ0Isc0JBQXNCLENBQUMsUUFBZ0I7UUFDckQsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRkQsd0RBRUM7SUFFRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxJQUFJLEVBQUUsR0FBNEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZELElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtZQUNwQixFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUMvQztRQUNELE9BQU8sRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7SUFDbEQsQ0FBQztJQU5ELHNDQU1DO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBOEI7UUFDN0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6RCxPQUFPLElBQUks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Ii8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5jb25zdCBUUyA9IC9cXC50c3g/JC9pO1xuY29uc3QgRF9UUyA9IC9cXC5kXFwudHMkL2k7XG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGV9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNEdHNQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIERfVFMudGVzdChmaWxlUGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05vbkRlY2xhcmF0aW9uVHNQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIFRTLnRlc3QoZmlsZVBhdGgpICYmICFEX1RTLnRlc3QoZmlsZVBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGcm9tRHRzRmlsZShub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIGxldCBzZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICBzZiA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gIH1cbiAgcmV0dXJuIHNmICE9PSB1bmRlZmluZWQgJiYgc2YuaXNEZWNsYXJhdGlvbkZpbGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZUZvckVycm9yKG5vZGU6IHRzLk5vZGUme25hbWU/OiB0cy5Ob2RlfSk6IHN0cmluZyB7XG4gIGlmIChub2RlLm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgIHJldHVybiBub2RlLm5hbWUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBraW5kID0gdHMuU3ludGF4S2luZFtub2RlLmtpbmRdO1xuICAgIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID1cbiAgICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24obm9kZS5nZXRTb3VyY2VGaWxlKCksIG5vZGUuZ2V0U3RhcnQoKSk7XG4gICAgcmV0dXJuIGAke2tpbmR9QCR7bGluZX06JHtjaGFyYWN0ZXJ9YDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlRmlsZShub2RlOiB0cy5Ob2RlKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEluIGNlcnRhaW4gdHJhbnNmb3JtYXRpb24gY29udGV4dHMsIGB0cy5Ob2RlLmdldFNvdXJjZUZpbGUoKWAgY2FuIGFjdHVhbGx5IHJldHVybiBgdW5kZWZpbmVkYCxcbiAgLy8gZGVzcGl0ZSB0aGUgdHlwZSBzaWduYXR1cmUgbm90IGFsbG93aW5nIGl0LiBJbiB0aGF0IGV2ZW50LCBnZXQgdGhlIGB0cy5Tb3VyY2VGaWxlYCB2aWEgdGhlXG4gIC8vIG9yaWdpbmFsIG5vZGUgaW5zdGVhZCAod2hpY2ggd29ya3MpLlxuICBjb25zdCBkaXJlY3RTZiA9IG5vZGUuZ2V0U291cmNlRmlsZSgpIGFzIHRzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQ7XG4gIHJldHVybiBkaXJlY3RTZiAhPT0gdW5kZWZpbmVkID8gZGlyZWN0U2YgOiB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlRmlsZU9yTnVsbChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgpOiB0cy5Tb3VyY2VGaWxlfFxuICAgIG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSB8fCBudWxsO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUb2tlbkF0UG9zaXRpb24oc2Y6IHRzLlNvdXJjZUZpbGUsIHBvczogbnVtYmVyKTogdHMuTm9kZSB7XG4gIC8vIGdldFRva2VuQXRQb3NpdGlvbiBpcyBwYXJ0IG9mIFR5cGVTY3JpcHQncyBwcml2YXRlIEFQSS5cbiAgcmV0dXJuICh0cyBhcyBhbnkpLmdldFRva2VuQXRQb3NpdGlvbihzZiwgcG9zKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZpZXJPZk5vZGUoZGVjbDogdHMuTm9kZSZ7bmFtZT86IHRzLk5vZGV9KTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgaWYgKGRlY2wubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgcmV0dXJuIGRlY2wubmFtZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5EZWNsYXJhdGlvbiB7XG4gIHJldHVybiBpc1ZhbHVlRGVjbGFyYXRpb24obm9kZSkgfHwgaXNUeXBlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbHVlRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuQ2xhc3NEZWNsYXJhdGlvbnxcbiAgICB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLlZhcmlhYmxlRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpIHx8IHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuRW51bURlY2xhcmF0aW9ufFxuICAgIHRzLlR5cGVBbGlhc0RlY2xhcmF0aW9ufHRzLkludGVyZmFjZURlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzRW51bURlY2xhcmF0aW9uKG5vZGUpIHx8IHRzLmlzVHlwZUFsaWFzRGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgIHRzLmlzSW50ZXJmYWNlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cG9ydGVkKG5vZGU6IERlY2xhcmF0aW9uTm9kZSk6IGJvb2xlYW4ge1xuICBsZXQgdG9wTGV2ZWw6IHRzLk5vZGUgPSBub2RlO1xuICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qobm9kZS5wYXJlbnQpKSB7XG4gICAgdG9wTGV2ZWwgPSBub2RlLnBhcmVudC5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHRvcExldmVsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0b3BMZXZlbC5tb2RpZmllcnMuc29tZShtb2RpZmllciA9PiBtb2RpZmllci5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vdERpcnMoXG4gICAgaG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDdXJyZW50RGlyZWN0b3J5J3wnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgY29uc3Qgcm9vdERpcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGN3ZCA9IGhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgaWYgKG9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIHJvb3REaXJzLnB1c2goLi4ub3B0aW9ucy5yb290RGlycyk7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICByb290RGlycy5wdXNoKG9wdGlvbnMucm9vdERpcik7XG4gIH0gZWxzZSB7XG4gICAgcm9vdERpcnMucHVzaChjd2QpO1xuICB9XG5cbiAgLy8gSW4gV2luZG93cyB0aGUgYWJvdmUgbWlnaHQgbm90IGFsd2F5cyByZXR1cm4gcG9zaXggc2VwYXJhdGVkIHBhdGhzXG4gIC8vIFNlZTpcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvM2Y3MzU3ZDM3ZjY2Yzg0MmQ3MGQ4MzViYzkyNWVjMmE4NzNlY2ZlYy9zcmMvY29tcGlsZXIvc3lzLnRzI0w2NTBcbiAgLy8gQWxzbyBjb21waWxlciBvcHRpb25zIG1pZ2h0IGJlIHNldCB2aWEgYW4gQVBJIHdoaWNoIGRvZXNuJ3Qgbm9ybWFsaXplIHBhdGhzXG4gIHJldHVybiByb290RGlycy5tYXAocm9vdERpciA9PiBmcy5yZXNvbHZlKGN3ZCwgaG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShyb290RGlyKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9kZURlYnVnSW5mbyhub2RlOiB0cy5Ob2RlKTogc3RyaW5nIHtcbiAgY29uc3Qgc2YgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNmLCBub2RlLnBvcyk7XG4gIHJldHVybiBgWyR7c2YuZmlsZU5hbWV9OiAke3RzLlN5bnRheEtpbmRbbm9kZS5raW5kXX0gQCAke2xpbmV9OiR7Y2hhcmFjdGVyfV1gO1xufVxuXG4vKipcbiAqIFJlc29sdmUgdGhlIHNwZWNpZmllZCBgbW9kdWxlTmFtZWAgdXNpbmcgdGhlIGdpdmVuIGBjb21waWxlck9wdGlvbnNgIGFuZCBgY29tcGlsZXJIb3N0YC5cbiAqXG4gKiBUaGlzIGhlbHBlciB3aWxsIGF0dGVtcHQgdG8gdXNlIHRoZSBgQ29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcygpYCBtZXRob2QgaWYgYXZhaWxhYmxlLlxuICogT3RoZXJ3aXNlIGl0IHdpbGwgZmFsbGJhY2sgb24gdGhlIGB0cy5SZXNvbHZlTW9kdWxlTmFtZSgpYCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNb2R1bGVOYW1lKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgY29tcGlsZXJIb3N0OiB0cy5Nb2R1bGVSZXNvbHV0aW9uSG9zdCZQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ3Jlc29sdmVNb2R1bGVOYW1lcyc+LFxuICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlfG51bGwpOiB0cy5SZXNvbHZlZE1vZHVsZXx1bmRlZmluZWQge1xuICBpZiAoY29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcykge1xuICAgIHJldHVybiBjb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgICBbbW9kdWxlTmFtZV0sIGNvbnRhaW5pbmdGaWxlLFxuICAgICAgICB1bmRlZmluZWQsICAvLyByZXVzZWROYW1lc1xuICAgICAgICB1bmRlZmluZWQsICAvLyByZWRpcmVjdGVkUmVmZXJlbmNlXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucylbMF07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRzXG4gICAgICAgIC5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBjb21waWxlck9wdGlvbnMsIGNvbXBpbGVySG9zdCxcbiAgICAgICAgICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZSAhPT0gbnVsbCA/IG1vZHVsZVJlc29sdXRpb25DYWNoZSA6IHVuZGVmaW5lZClcbiAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICB9XG59XG5cbi8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIG5vZGUgaXMgYW4gYXNzaWdubWVudCBleHByZXNzaW9uLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBBc3NlcnRzIHRoYXQgdGhlIGtleXMgYEtgIGZvcm0gYSBzdWJzZXQgb2YgdGhlIGtleXMgb2YgYFRgLlxuICovXG5leHBvcnQgdHlwZSBTdWJzZXRPZktleXM8VCwgSyBleHRlbmRzIGtleW9mIFQ+ID0gSztcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSB0eXBlIGBUYCwgd2l0aCBhIHRyYW5zZm9ybWF0aW9uIGFwcGxpZWQgdGhhdCB0dXJucyBhbGwgbWV0aG9kcyAoZXZlbiBvcHRpb25hbFxuICogb25lcykgaW50byByZXF1aXJlZCBmaWVsZHMgKHdoaWNoIG1heSBiZSBgdW5kZWZpbmVkYCwgaWYgdGhlIG1ldGhvZCB3YXMgb3B0aW9uYWwpLlxuICovXG5leHBvcnQgdHlwZSBSZXF1aXJlZERlbGVnYXRpb25zPFQ+ID0ge1xuICBbTSBpbiBrZXlvZiBSZXF1aXJlZDxUPl06IFRbTV07XG59O1xuXG4vKipcbiAqIFNvdXJjZSBmaWxlcyBtYXkgYmVjb21lIHJlZGlyZWN0cyB0byBvdGhlciBzb3VyY2UgZmlsZXMgd2hlbiB0aGVpciBwYWNrYWdlIG5hbWUgYW5kIHZlcnNpb24gYXJlXG4gKiBpZGVudGljYWwuIFR5cGVTY3JpcHQgY3JlYXRlcyBhIHByb3h5IHNvdXJjZSBmaWxlIGZvciBzdWNoIHNvdXJjZSBmaWxlcyB3aGljaCBoYXMgYW4gaW50ZXJuYWxcbiAqIGByZWRpcmVjdEluZm9gIHByb3BlcnR5IHRoYXQgcmVmZXJzIHRvIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZS5cbiAqL1xuaW50ZXJmYWNlIFJlZGlyZWN0ZWRTb3VyY2VGaWxlIGV4dGVuZHMgdHMuU291cmNlRmlsZSB7XG4gIHJlZGlyZWN0SW5mbz86IHt1bnJlZGlyZWN0ZWQ6IHRzLlNvdXJjZUZpbGU7fTtcbn1cblxuLyoqXG4gKiBPYnRhaW5zIHRoZSBub24tcmVkaXJlY3RlZCBzb3VyY2UgZmlsZSBmb3IgYHNmYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCByZWRpcmVjdEluZm8gPSAoc2YgYXMgUmVkaXJlY3RlZFNvdXJjZUZpbGUpLnJlZGlyZWN0SW5mbztcbiAgaWYgKHJlZGlyZWN0SW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHNmO1xuICB9XG4gIHJldHVybiByZWRpcmVjdEluZm8udW5yZWRpcmVjdGVkO1xufVxuIl19