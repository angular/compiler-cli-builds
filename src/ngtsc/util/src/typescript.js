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
    exports.toUnredirectedSourceFile = exports.isAssignment = exports.resolveModuleName = exports.nodeDebugInfo = exports.getRootDirs = exports.isExported = exports.isNamedDeclaration = exports.isTypeDeclaration = exports.isValueDeclaration = exports.isDeclaration = exports.identifierOfNode = exports.getTokenAtPosition = exports.getSourceFileOrNull = exports.getSourceFile = exports.nodeNameForError = exports.isFromDtsFile = exports.isNonDeclarationTsPath = exports.isDtsPath = exports.isSymbolWithValueDeclaration = void 0;
    var tslib_1 = require("tslib");
    var TS = /\.tsx?$/i;
    var D_TS = /\.d\.ts$/i;
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    function isSymbolWithValueDeclaration(symbol) {
        // If there is a value declaration set, then the `declarations` property is never undefined. We
        // still check for the property to exist as this matches with the type that `symbol` is narrowed
        // to.
        return symbol != null && symbol.valueDeclaration !== undefined &&
            symbol.declarations !== undefined;
    }
    exports.isSymbolWithValueDeclaration = isSymbolWithValueDeclaration;
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
    function isNamedDeclaration(node) {
        var namedNode = node;
        return namedNode.name !== undefined && ts.isIdentifier(namedNode.name);
    }
    exports.isNamedDeclaration = isNamedDeclaration;
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
        var fs = (0, file_system_1.getFileSystem)();
        if (options.rootDirs !== undefined) {
            rootDirs.push.apply(rootDirs, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(options.rootDirs), false));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvdHlwZXNjcmlwdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsSUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLElBQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQztJQUV6QiwrQkFBaUM7SUFDakMsMkVBQWdFO0lBV2hFLFNBQWdCLDRCQUE0QixDQUFDLE1BQ1M7UUFDcEQsK0ZBQStGO1FBQy9GLGdHQUFnRztRQUNoRyxNQUFNO1FBQ04sT0FBTyxNQUFNLElBQUksSUFBSSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTO1lBQzFELE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxDQUFDO0lBQ3hDLENBQUM7SUFQRCxvRUFPQztJQUVELFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUZELDhCQUVDO0lBRUQsU0FBZ0Isc0JBQXNCLENBQUMsUUFBZ0I7UUFDckQsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRkQsd0RBRUM7SUFFRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxJQUFJLEVBQUUsR0FBNEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZELElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtZQUNwQixFQUFFLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUMvQztRQUNELE9BQU8sRUFBRSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUM7SUFDbEQsQ0FBQztJQU5ELHNDQU1DO0lBRUQsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBOEI7UUFDN0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3ZCO2FBQU07WUFDTCxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJQUFBLEtBQ0YsRUFBRSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFEcEUsSUFBSSxVQUFBLEVBQUUsU0FBUyxlQUNxRCxDQUFDO1lBQzVFLE9BQVUsSUFBSSxTQUFJLElBQUksU0FBSSxTQUFXLENBQUM7U0FDdkM7SUFDSCxDQUFDO0lBVEQsNENBU0M7SUFFRCxTQUFnQixhQUFhLENBQUMsSUFBYTtRQUN6QyxpR0FBaUc7UUFDakcsNkZBQTZGO1FBQzdGLHVDQUF1QztRQUN2QyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUErQixDQUFDO1FBQ25FLE9BQU8sUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RGLENBQUM7SUFORCxzQ0FNQztJQUVELFNBQWdCLG1CQUFtQixDQUFDLE9BQW1CLEVBQUUsUUFBd0I7UUFFL0UsT0FBTyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNqRCxDQUFDO0lBSEQsa0RBR0M7SUFHRCxTQUFnQixrQkFBa0IsQ0FBQyxFQUFpQixFQUFFLEdBQVc7UUFDL0QsMERBQTBEO1FBQzFELE9BQVEsRUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBSEQsZ0RBR0M7SUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUE4QjtRQUM3RCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3pELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztTQUNsQjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFORCw0Q0FNQztJQUVELFNBQWdCLGFBQWEsQ0FBQyxJQUFhO1FBQ3pDLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUZELHNDQUVDO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUMsSUFBYTtRQUU5QyxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO1lBQ2hFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBSkQsZ0RBSUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFhO1FBRTdDLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7WUFDaEUsRUFBRSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFKRCw4Q0FJQztJQUVELFNBQWdCLGtCQUFrQixDQUFDLElBQWE7UUFDOUMsSUFBTSxTQUFTLEdBQUcsSUFBOEIsQ0FBQztRQUNqRCxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFIRCxnREFHQztJQUVELFNBQWdCLFVBQVUsQ0FBQyxJQUFxQjtRQUM5QyxJQUFJLFFBQVEsR0FBWSxJQUFJLENBQUM7UUFDN0IsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvRSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDL0I7UUFDRCxPQUFPLFFBQVEsQ0FBQyxTQUFTLEtBQUssU0FBUztZQUNuQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFBLFFBQVEsSUFBSSxPQUFBLFFBQVEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQTdDLENBQTZDLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBUEQsZ0NBT0M7SUFFRCxTQUFnQixXQUFXLENBQ3ZCLElBQXlFLEVBQ3pFLE9BQTJCO1FBQzdCLElBQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUN2QyxJQUFNLEVBQUUsR0FBRyxJQUFBLDJCQUFhLEdBQUUsQ0FBQztRQUMzQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQ2xDLFFBQVEsQ0FBQyxJQUFJLE9BQWIsUUFBUSxxREFBUyxPQUFPLENBQUMsUUFBUSxXQUFFO1NBQ3BDO2FBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRTtZQUN4QyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNoQzthQUFNO1lBQ0wsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtRQUVELHFFQUFxRTtRQUNyRSxPQUFPO1FBQ1AsaUhBQWlIO1FBQ2pILDhFQUE4RTtRQUM5RSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBbkQsQ0FBbUQsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFuQkQsa0NBbUJDO0lBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQWE7UUFDekMsSUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUEsS0FBb0IsRUFBRSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQWpFLElBQUksVUFBQSxFQUFFLFNBQVMsZUFBa0QsQ0FBQztRQUN6RSxPQUFPLE1BQUksRUFBRSxDQUFDLFFBQVEsVUFBSyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBTSxJQUFJLFNBQUksU0FBUyxNQUFHLENBQUM7SUFDaEYsQ0FBQztJQUpELHNDQUlDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsVUFBa0IsRUFBRSxjQUFzQixFQUFFLGVBQW1DLEVBQy9FLFlBQWlGLEVBQ2pGLHFCQUFvRDtRQUN0RCxJQUFJLFlBQVksQ0FBQyxrQkFBa0IsRUFBRTtZQUNuQyxPQUFPLFlBQVksQ0FBQyxrQkFBa0IsQ0FDbEMsQ0FBQyxVQUFVLENBQUMsRUFBRSxjQUFjLEVBQzVCLFNBQVMsRUFBRyxjQUFjO1lBQzFCLFNBQVMsRUFBRyxzQkFBc0I7WUFDbEMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekI7YUFBTTtZQUNMLE9BQU8sRUFBRTtpQkFDSixpQkFBaUIsQ0FDZCxVQUFVLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQ3pELHFCQUFxQixLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztpQkFDdEUsY0FBYyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQztJQWpCRCw4Q0FpQkM7SUFFRCw0REFBNEQ7SUFDNUQsU0FBZ0IsWUFBWSxDQUFDLElBQWE7UUFDeEMsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7SUFDOUYsQ0FBQztJQUZELG9DQUVDO0lBd0JEOztPQUVHO0lBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsRUFBaUI7UUFDeEQsSUFBTSxZQUFZLEdBQUksRUFBMkIsQ0FBQyxZQUFZLENBQUM7UUFDL0QsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO1lBQzlCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFDRCxPQUFPLFlBQVksQ0FBQyxZQUFZLENBQUM7SUFDbkMsQ0FBQztJQU5ELDREQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmNvbnN0IFRTID0gL1xcLnRzeD8kL2k7XG5jb25zdCBEX1RTID0gL1xcLmRcXC50cyQvaTtcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBnZXRGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZX0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbi8qKlxuICogVHlwZSBkZXNjcmliaW5nIGEgc3ltYm9sIHRoYXQgaXMgZ3VhcmFudGVlZCB0byBoYXZlIGEgdmFsdWUgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCB0eXBlIFN5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uID0gdHMuU3ltYm9sJntcbiAgdmFsdWVEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGRlY2xhcmF0aW9uczogdHMuRGVjbGFyYXRpb25bXTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKHN5bWJvbDogdHMuU3ltYm9sfG51bGx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBzeW1ib2wgaXMgU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24ge1xuICAvLyBJZiB0aGVyZSBpcyBhIHZhbHVlIGRlY2xhcmF0aW9uIHNldCwgdGhlbiB0aGUgYGRlY2xhcmF0aW9uc2AgcHJvcGVydHkgaXMgbmV2ZXIgdW5kZWZpbmVkLiBXZVxuICAvLyBzdGlsbCBjaGVjayBmb3IgdGhlIHByb3BlcnR5IHRvIGV4aXN0IGFzIHRoaXMgbWF0Y2hlcyB3aXRoIHRoZSB0eXBlIHRoYXQgYHN5bWJvbGAgaXMgbmFycm93ZWRcbiAgLy8gdG8uXG4gIHJldHVybiBzeW1ib2wgIT0gbnVsbCAmJiBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBzeW1ib2wuZGVjbGFyYXRpb25zICE9PSB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0R0c1BhdGgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gRF9UUy50ZXN0KGZpbGVQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gVFMudGVzdChmaWxlUGF0aCkgJiYgIURfVFMudGVzdChmaWxlUGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Zyb21EdHNGaWxlKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgbGV0IHNmOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgIHNmID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgfVxuICByZXR1cm4gc2YgIT09IHVuZGVmaW5lZCAmJiBzZi5pc0RlY2xhcmF0aW9uRmlsZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lRm9yRXJyb3Iobm9kZTogdHMuTm9kZSZ7bmFtZT86IHRzLk5vZGV9KTogc3RyaW5nIHtcbiAgaWYgKG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZS50ZXh0O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGtpbmQgPSB0cy5TeW50YXhLaW5kW25vZGUua2luZF07XG4gICAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihub2RlLmdldFNvdXJjZUZpbGUoKSwgbm9kZS5nZXRTdGFydCgpKTtcbiAgICByZXR1cm4gYCR7a2luZH1AJHtsaW5lfToke2NoYXJhY3Rlcn1gO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VGaWxlKG5vZGU6IHRzLk5vZGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgLy8gSW4gY2VydGFpbiB0cmFuc2Zvcm1hdGlvbiBjb250ZXh0cywgYHRzLk5vZGUuZ2V0U291cmNlRmlsZSgpYCBjYW4gYWN0dWFsbHkgcmV0dXJuIGB1bmRlZmluZWRgLFxuICAvLyBkZXNwaXRlIHRoZSB0eXBlIHNpZ25hdHVyZSBub3QgYWxsb3dpbmcgaXQuIEluIHRoYXQgZXZlbnQsIGdldCB0aGUgYHRzLlNvdXJjZUZpbGVgIHZpYSB0aGVcbiAgLy8gb3JpZ2luYWwgbm9kZSBpbnN0ZWFkICh3aGljaCB3b3JrcykuXG4gIGNvbnN0IGRpcmVjdFNmID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkgYXMgdHMuU291cmNlRmlsZSB8IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGRpcmVjdFNmICE9PSB1bmRlZmluZWQgPyBkaXJlY3RTZiA6IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VGaWxlT3JOdWxsKHByb2dyYW06IHRzLlByb2dyYW0sIGZpbGVOYW1lOiBBYnNvbHV0ZUZzUGF0aCk6IHRzLlNvdXJjZUZpbGV8XG4gICAgbnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpIHx8IG51bGw7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRva2VuQXRQb3NpdGlvbihzZjogdHMuU291cmNlRmlsZSwgcG9zOiBudW1iZXIpOiB0cy5Ob2RlIHtcbiAgLy8gZ2V0VG9rZW5BdFBvc2l0aW9uIGlzIHBhcnQgb2YgVHlwZVNjcmlwdCdzIHByaXZhdGUgQVBJLlxuICByZXR1cm4gKHRzIGFzIGFueSkuZ2V0VG9rZW5BdFBvc2l0aW9uKHNmLCBwb3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZmllck9mTm9kZShkZWNsOiB0cy5Ob2RlJntuYW1lPzogdHMuTm9kZX0pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICBpZiAoZGVjbC5uYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkpIHtcbiAgICByZXR1cm4gZGVjbC5uYW1lO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkRlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIGlzVmFsdWVEZWNsYXJhdGlvbihub2RlKSB8fCBpc1R5cGVEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsdWVEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5DbGFzc0RlY2xhcmF0aW9ufFxuICAgIHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuVmFyaWFibGVEZWNsYXJhdGlvbiB7XG4gIHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpIHx8XG4gICAgICB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5FbnVtRGVjbGFyYXRpb258XG4gICAgdHMuVHlwZUFsaWFzRGVjbGFyYXRpb258dHMuSW50ZXJmYWNlRGVjbGFyYXRpb24ge1xuICByZXR1cm4gdHMuaXNFbnVtRGVjbGFyYXRpb24obm9kZSkgfHwgdHMuaXNUeXBlQWxpYXNEZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgdHMuaXNJbnRlcmZhY2VEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFtZWREZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5EZWNsYXJhdGlvbiZ7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICBjb25zdCBuYW1lZE5vZGUgPSBub2RlIGFzIHtuYW1lPzogdHMuSWRlbnRpZmllcn07XG4gIHJldHVybiBuYW1lZE5vZGUubmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcihuYW1lZE5vZGUubmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0V4cG9ydGVkKG5vZGU6IERlY2xhcmF0aW9uTm9kZSk6IGJvb2xlYW4ge1xuICBsZXQgdG9wTGV2ZWw6IHRzLk5vZGUgPSBub2RlO1xuICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qobm9kZS5wYXJlbnQpKSB7XG4gICAgdG9wTGV2ZWwgPSBub2RlLnBhcmVudC5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHRvcExldmVsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0b3BMZXZlbC5tb2RpZmllcnMuc29tZShtb2RpZmllciA9PiBtb2RpZmllci5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Um9vdERpcnMoXG4gICAgaG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDdXJyZW50RGlyZWN0b3J5J3wnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgY29uc3Qgcm9vdERpcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGN3ZCA9IGhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpO1xuICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgaWYgKG9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIHJvb3REaXJzLnB1c2goLi4ub3B0aW9ucy5yb290RGlycyk7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICByb290RGlycy5wdXNoKG9wdGlvbnMucm9vdERpcik7XG4gIH0gZWxzZSB7XG4gICAgcm9vdERpcnMucHVzaChjd2QpO1xuICB9XG5cbiAgLy8gSW4gV2luZG93cyB0aGUgYWJvdmUgbWlnaHQgbm90IGFsd2F5cyByZXR1cm4gcG9zaXggc2VwYXJhdGVkIHBhdGhzXG4gIC8vIFNlZTpcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvM2Y3MzU3ZDM3ZjY2Yzg0MmQ3MGQ4MzViYzkyNWVjMmE4NzNlY2ZlYy9zcmMvY29tcGlsZXIvc3lzLnRzI0w2NTBcbiAgLy8gQWxzbyBjb21waWxlciBvcHRpb25zIG1pZ2h0IGJlIHNldCB2aWEgYW4gQVBJIHdoaWNoIGRvZXNuJ3Qgbm9ybWFsaXplIHBhdGhzXG4gIHJldHVybiByb290RGlycy5tYXAocm9vdERpciA9PiBmcy5yZXNvbHZlKGN3ZCwgaG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShyb290RGlyKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9kZURlYnVnSW5mbyhub2RlOiB0cy5Ob2RlKTogc3RyaW5nIHtcbiAgY29uc3Qgc2YgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNmLCBub2RlLnBvcyk7XG4gIHJldHVybiBgWyR7c2YuZmlsZU5hbWV9OiAke3RzLlN5bnRheEtpbmRbbm9kZS5raW5kXX0gQCAke2xpbmV9OiR7Y2hhcmFjdGVyfV1gO1xufVxuXG4vKipcbiAqIFJlc29sdmUgdGhlIHNwZWNpZmllZCBgbW9kdWxlTmFtZWAgdXNpbmcgdGhlIGdpdmVuIGBjb21waWxlck9wdGlvbnNgIGFuZCBgY29tcGlsZXJIb3N0YC5cbiAqXG4gKiBUaGlzIGhlbHBlciB3aWxsIGF0dGVtcHQgdG8gdXNlIHRoZSBgQ29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcygpYCBtZXRob2QgaWYgYXZhaWxhYmxlLlxuICogT3RoZXJ3aXNlIGl0IHdpbGwgZmFsbGJhY2sgb24gdGhlIGB0cy5SZXNvbHZlTW9kdWxlTmFtZSgpYCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNb2R1bGVOYW1lKFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZywgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgY29tcGlsZXJIb3N0OiB0cy5Nb2R1bGVSZXNvbHV0aW9uSG9zdCZQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ3Jlc29sdmVNb2R1bGVOYW1lcyc+LFxuICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZTogdHMuTW9kdWxlUmVzb2x1dGlvbkNhY2hlfG51bGwpOiB0cy5SZXNvbHZlZE1vZHVsZXx1bmRlZmluZWQge1xuICBpZiAoY29tcGlsZXJIb3N0LnJlc29sdmVNb2R1bGVOYW1lcykge1xuICAgIHJldHVybiBjb21waWxlckhvc3QucmVzb2x2ZU1vZHVsZU5hbWVzKFxuICAgICAgICBbbW9kdWxlTmFtZV0sIGNvbnRhaW5pbmdGaWxlLFxuICAgICAgICB1bmRlZmluZWQsICAvLyByZXVzZWROYW1lc1xuICAgICAgICB1bmRlZmluZWQsICAvLyByZWRpcmVjdGVkUmVmZXJlbmNlXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucylbMF07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRzXG4gICAgICAgIC5yZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgICAgIG1vZHVsZU5hbWUsIGNvbnRhaW5pbmdGaWxlLCBjb21waWxlck9wdGlvbnMsIGNvbXBpbGVySG9zdCxcbiAgICAgICAgICAgIG1vZHVsZVJlc29sdXRpb25DYWNoZSAhPT0gbnVsbCA/IG1vZHVsZVJlc29sdXRpb25DYWNoZSA6IHVuZGVmaW5lZClcbiAgICAgICAgLnJlc29sdmVkTW9kdWxlO1xuICB9XG59XG5cbi8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIG5vZGUgaXMgYW4gYXNzaWdubWVudCBleHByZXNzaW9uLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBBc3NlcnRzIHRoYXQgdGhlIGtleXMgYEtgIGZvcm0gYSBzdWJzZXQgb2YgdGhlIGtleXMgb2YgYFRgLlxuICovXG5leHBvcnQgdHlwZSBTdWJzZXRPZktleXM8VCwgSyBleHRlbmRzIGtleW9mIFQ+ID0gSztcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSB0eXBlIGBUYCwgd2l0aCBhIHRyYW5zZm9ybWF0aW9uIGFwcGxpZWQgdGhhdCB0dXJucyBhbGwgbWV0aG9kcyAoZXZlbiBvcHRpb25hbFxuICogb25lcykgaW50byByZXF1aXJlZCBmaWVsZHMgKHdoaWNoIG1heSBiZSBgdW5kZWZpbmVkYCwgaWYgdGhlIG1ldGhvZCB3YXMgb3B0aW9uYWwpLlxuICovXG5leHBvcnQgdHlwZSBSZXF1aXJlZERlbGVnYXRpb25zPFQ+ID0ge1xuICBbTSBpbiBrZXlvZiBSZXF1aXJlZDxUPl06IFRbTV07XG59O1xuXG4vKipcbiAqIFNvdXJjZSBmaWxlcyBtYXkgYmVjb21lIHJlZGlyZWN0cyB0byBvdGhlciBzb3VyY2UgZmlsZXMgd2hlbiB0aGVpciBwYWNrYWdlIG5hbWUgYW5kIHZlcnNpb24gYXJlXG4gKiBpZGVudGljYWwuIFR5cGVTY3JpcHQgY3JlYXRlcyBhIHByb3h5IHNvdXJjZSBmaWxlIGZvciBzdWNoIHNvdXJjZSBmaWxlcyB3aGljaCBoYXMgYW4gaW50ZXJuYWxcbiAqIGByZWRpcmVjdEluZm9gIHByb3BlcnR5IHRoYXQgcmVmZXJzIHRvIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZS5cbiAqL1xuaW50ZXJmYWNlIFJlZGlyZWN0ZWRTb3VyY2VGaWxlIGV4dGVuZHMgdHMuU291cmNlRmlsZSB7XG4gIHJlZGlyZWN0SW5mbz86IHt1bnJlZGlyZWN0ZWQ6IHRzLlNvdXJjZUZpbGU7fTtcbn1cblxuLyoqXG4gKiBPYnRhaW5zIHRoZSBub24tcmVkaXJlY3RlZCBzb3VyY2UgZmlsZSBmb3IgYHNmYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCByZWRpcmVjdEluZm8gPSAoc2YgYXMgUmVkaXJlY3RlZFNvdXJjZUZpbGUpLnJlZGlyZWN0SW5mbztcbiAgaWYgKHJlZGlyZWN0SW5mbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHNmO1xuICB9XG4gIHJldHVybiByZWRpcmVjdEluZm8udW5yZWRpcmVjdGVkO1xufVxuIl19