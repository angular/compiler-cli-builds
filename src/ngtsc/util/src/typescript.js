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
        define("@angular/compiler-cli/src/ngtsc/util/src/typescript", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        return rootDirs.map(function (rootDir) { return file_system_1.absoluteFrom(rootDir); });
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
            // FIXME: Additional parameters are required in TS3.6, but ignored in 3.5.
            // Remove the any cast once google3 is fully on TS3.6.
            return compilerHost
                .resolveModuleNames([moduleName], containingFile, undefined, undefined, compilerOptions)[0];
        }
        else {
            return ts
                .resolveModuleName(moduleName, containingFile, compilerOptions, compilerHost, moduleResolutionCache !== null ? moduleResolutionCache : undefined)
                .resolvedModule;
        }
    }
    exports.resolveModuleName = resolveModuleName;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxJQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7SUFDdEIsSUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDO0lBRXpCLCtCQUFpQztJQUNqQywyRUFBK0Q7SUFFL0QsU0FBZ0IsU0FBUyxDQUFDLFFBQWdCO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRkQsOEJBRUM7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxRQUFnQjtRQUNyRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFGRCx3REFFQztJQUVELFNBQWdCLGFBQWEsQ0FBQyxJQUFhO1FBQ3pDLElBQUksRUFBRSxHQUE0QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkQsSUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO1lBQ3BCLEVBQUUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1NBQy9DO1FBQ0QsT0FBTyxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUNsRCxDQUFDO0lBTkQsc0NBTUM7SUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFnQztRQUMvRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3pELE9BQU8sSUFBSSxD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O0lBQ0gsQ0FBQztJQWhCRCw4Q0FnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmNvbnN0IFRTID0gL1xcLnRzeD8kL2k7XG5jb25zdCBEX1RTID0gL1xcLmRcXC50cyQvaTtcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzRHRzUGF0aChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBEX1RTLnRlc3QoZmlsZVBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOb25EZWNsYXJhdGlvblRzUGF0aChmaWxlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBUUy50ZXN0KGZpbGVQYXRoKSAmJiAhRF9UUy50ZXN0KGZpbGVQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRnJvbUR0c0ZpbGUobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc2YgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICB9XG4gIHJldHVybiBzZiAhPT0gdW5kZWZpbmVkICYmIHNmLmlzRGVjbGFyYXRpb25GaWxlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9kZU5hbWVGb3JFcnJvcihub2RlOiB0cy5Ob2RlICYge25hbWU/OiB0cy5Ob2RlfSk6IHN0cmluZyB7XG4gIGlmIChub2RlLm5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgIHJldHVybiBub2RlLm5hbWUudGV4dDtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBraW5kID0gdHMuU3ludGF4S2luZFtub2RlLmtpbmRdO1xuICAgIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID1cbiAgICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24obm9kZS5nZXRTb3VyY2VGaWxlKCksIG5vZGUuZ2V0U3RhcnQoKSk7XG4gICAgcmV0dXJuIGAke2tpbmR9QCR7bGluZX06JHtjaGFyYWN0ZXJ9YDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlRmlsZShub2RlOiB0cy5Ob2RlKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEluIGNlcnRhaW4gdHJhbnNmb3JtYXRpb24gY29udGV4dHMsIGB0cy5Ob2RlLmdldFNvdXJjZUZpbGUoKWAgY2FuIGFjdHVhbGx5IHJldHVybiBgdW5kZWZpbmVkYCxcbiAgLy8gZGVzcGl0ZSB0aGUgdHlwZSBzaWduYXR1cmUgbm90IGFsbG93aW5nIGl0LiBJbiB0aGF0IGV2ZW50LCBnZXQgdGhlIGB0cy5Tb3VyY2VGaWxlYCB2aWEgdGhlXG4gIC8vIG9yaWdpbmFsIG5vZGUgaW5zdGVhZCAod2hpY2ggd29ya3MpLlxuICBjb25zdCBkaXJlY3RTZiA9IG5vZGUuZ2V0U291cmNlRmlsZSgpIGFzIHRzLlNvdXJjZUZpbGUgfCB1bmRlZmluZWQ7XG4gIHJldHVybiBkaXJlY3RTZiAhPT0gdW5kZWZpbmVkID8gZGlyZWN0U2YgOiB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U291cmNlRmlsZU9yTnVsbChwcm9ncmFtOiB0cy5Qcm9ncmFtLCBmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgpOiB0cy5Tb3VyY2VGaWxlfFxuICAgIG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKSB8fCBudWxsO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUb2tlbkF0UG9zaXRpb24oc2Y6IHRzLlNvdXJjZUZpbGUsIHBvczogbnVtYmVyKTogdHMuTm9kZSB7XG4gIC8vIGdldFRva2VuQXRQb3NpdGlvbiBpcyBwYXJ0IG9mIFR5cGVTY3JpcHQncyBwcml2YXRlIEFQSS5cbiAgcmV0dXJuICh0cyBhcyBhbnkpLmdldFRva2VuQXRQb3NpdGlvbihzZiwgcG9zKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZpZXJPZk5vZGUoZGVjbDogdHMuTm9kZSAmIHtuYW1lPzogdHMuTm9kZX0pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBpZiAoZGVjbC5uYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkRlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIGZhbHNlIHx8IHRzLmlzRW51bURlY2xhcmF0aW9uKG5vZGUpIHx8IHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpIHx8IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRXhwb3J0ZWQobm9kZTogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgbGV0IHRvcExldmVsOiB0cy5Ob2RlID0gbm9kZTtcbiAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KG5vZGUucGFyZW50KSkge1xuICAgIHRvcExldmVsID0gbm9kZS5wYXJlbnQucGFyZW50O1xuICB9XG4gIHJldHVybiB0b3BMZXZlbC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdG9wTGV2ZWwubW9kaWZpZXJzLnNvbWUobW9kaWZpZXIgPT4gbW9kaWZpZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvb3REaXJzKGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gIGNvbnN0IHJvb3REaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAob3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcm9vdERpcnMucHVzaCguLi5vcHRpb25zLnJvb3REaXJzKTtcbiAgfSBlbHNlIGlmIChvcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJvb3REaXJzLnB1c2gob3B0aW9ucy5yb290RGlyKTtcbiAgfSBlbHNlIHtcbiAgICByb290RGlycy5wdXNoKGhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpKTtcbiAgfVxuXG4gIC8vIEluIFdpbmRvd3MgdGhlIGFib3ZlIG1pZ2h0IG5vdCBhbHdheXMgcmV0dXJuIHBvc2l4IHNlcGFyYXRlZCBwYXRoc1xuICAvLyBTZWU6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iLzNmNzM1N2QzN2Y2NmM4NDJkNzBkODM1YmM5MjVlYzJhODczZWNmZWMvc3JjL2NvbXBpbGVyL3N5cy50cyNMNjUwXG4gIC8vIEFsc28gY29tcGlsZXIgb3B0aW9ucyBtaWdodCBiZSBzZXQgdmlhIGFuIEFQSSB3aGljaCBkb2Vzbid0IG5vcm1hbGl6ZSBwYXRoc1xuICByZXR1cm4gcm9vdERpcnMubWFwKHJvb3REaXIgPT4gYWJzb2x1dGVGcm9tKHJvb3REaXIpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vZGVEZWJ1Z0luZm8obm9kZTogdHMuTm9kZSk6IHN0cmluZyB7XG4gIGNvbnN0IHNmID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzZiwgbm9kZS5wb3MpO1xuICByZXR1cm4gYFske3NmLmZpbGVOYW1lfTogJHt0cy5TeW50YXhLaW5kW25vZGUua2luZF19IEAgJHtsaW5lfToke2NoYXJhY3Rlcn1dYDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlIHRoZSBzcGVjaWZpZWQgYG1vZHVsZU5hbWVgIHVzaW5nIHRoZSBnaXZlbiBgY29tcGlsZXJPcHRpb25zYCBhbmQgYGNvbXBpbGVySG9zdGAuXG4gKlxuICogVGhpcyBoZWxwZXIgd2lsbCBhdHRlbXB0IHRvIHVzZSB0aGUgYENvbXBpbGVySG9zdC5yZXNvbHZlTW9kdWxlTmFtZXMoKWAgbWV0aG9kIGlmIGF2YWlsYWJsZS5cbiAqIE90aGVyd2lzZSBpdCB3aWxsIGZhbGxiYWNrIG9uIHRoZSBgdHMuUmVzb2x2ZU1vZHVsZU5hbWUoKWAgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTW9kdWxlTmFtZShcbiAgICBtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcsIGNvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlIHwgbnVsbCk6IHRzLlJlc29sdmVkTW9kdWxlfHVuZGVmaW5lZCB7XG4gIGlmIChjb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKSB7XG4gICAgLy8gRklYTUU6IEFkZGl0aW9uYWwgcGFyYW1ldGVycyBhcmUgcmVxdWlyZWQgaW4gVFMzLjYsIGJ1dCBpZ25vcmVkIGluIDMuNS5cbiAgICAvLyBSZW1vdmUgdGhlIGFueSBjYXN0IG9uY2UgZ29vZ2xlMyBpcyBmdWxseSBvbiBUUzMuNi5cbiAgICByZXR1cm4gKGNvbXBpbGVySG9zdCBhcyBhbnkpXG4gICAgICAgIC5yZXNvbHZlTW9kdWxlTmFtZXMoW21vZHVsZU5hbWVdLCBjb250YWluaW5nRmlsZSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNvbXBpbGVyT3B0aW9ucylbMF07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRzXG4gICAgICAgIC5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBjb21waWxlck9wdGlvbnMsIGNvbXBpbGVySG9zdCxcbiAgICAgICAgICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZSAhPT0gbnVsbCA/IG1vZHVsZVJlc29sdXRpb25DYWNoZSA6IHVuZGVmaW5lZClcbiAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICB9XG59XG5cbi8qKlxuICogQXNzZXJ0cyB0aGF0IHRoZSBrZXlzIGBLYCBmb3JtIGEgc3Vic2V0IG9mIHRoZSBrZXlzIG9mIGBUYC5cbiAqL1xuZXhwb3J0IHR5cGUgU3Vic2V0T2ZLZXlzPFQsIEsgZXh0ZW5kcyBrZXlvZiBUPiA9IEs7XG4iXX0=