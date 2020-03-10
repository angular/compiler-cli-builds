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
        define("@angular/compiler-cli/src/transformers/lower_expressions", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/metadata/index"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var index_1 = require("@angular/compiler-cli/src/metadata/index");
    function toMap(items, select) {
        return new Map(items.map(function (i) { return [select(i), i]; }));
    }
    // We will never lower expressions in a nested lexical scope so avoid entering them.
    // This also avoids a bug in TypeScript 2.3 where the lexical scopes get out of sync
    // when using visitEachChild.
    function isLexicalScope(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ArrowFunction:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.TypeLiteral:
            case ts.SyntaxKind.ArrayType:
                return true;
        }
        return false;
    }
    function transformSourceFile(sourceFile, requests, context) {
        var inserts = [];
        // Calculate the range of interesting locations. The transform will only visit nodes in this
        // range to improve the performance on large files.
        var locations = Array.from(requests.keys());
        var min = Math.min.apply(Math, tslib_1.__spread(locations));
        var max = Math.max.apply(Math, tslib_1.__spread(locations));
        // Visit nodes matching the request and synthetic nodes added by tsickle
        function shouldVisit(pos, end) {
            return (pos <= max && end >= min) || pos == -1;
        }
        function visitSourceFile(sourceFile) {
            function topLevelStatement(node) {
                var declarations = [];
                function visitNode(node) {
                    // Get the original node before tsickle
                    var _a = ts.getOriginalNode(node), pos = _a.pos, end = _a.end, kind = _a.kind, originalParent = _a.parent;
                    var nodeRequest = requests.get(pos);
                    if (nodeRequest && nodeRequest.kind == kind && nodeRequest.end == end) {
                        // This node is requested to be rewritten as a reference to the exported name.
                        if (originalParent && originalParent.kind === ts.SyntaxKind.VariableDeclaration) {
                            // As the value represents the whole initializer of a variable declaration,
                            // just refer to that variable. This e.g. helps to preserve closure comments
                            // at the right place.
                            var varParent = originalParent;
                            if (varParent.name.kind === ts.SyntaxKind.Identifier) {
                                var varName = varParent.name.text;
                                var exportName_1 = nodeRequest.name;
                                declarations.push({
                                    name: exportName_1,
                                    node: ts.createIdentifier(varName),
                                    order: 1 /* AfterStmt */
                                });
                                return node;
                            }
                        }
                        // Record that the node needs to be moved to an exported variable with the given name
                        var exportName = nodeRequest.name;
                        declarations.push({ name: exportName, node: node, order: 0 /* BeforeStmt */ });
                        return ts.createIdentifier(exportName);
                    }
                    var result = node;
                    if (shouldVisit(pos, end) && !isLexicalScope(node)) {
                        result = ts.visitEachChild(node, visitNode, context);
                    }
                    return result;
                }
                // Get the original node before tsickle
                var _a = ts.getOriginalNode(node), pos = _a.pos, end = _a.end;
                var resultStmt;
                if (shouldVisit(pos, end)) {
                    resultStmt = ts.visitEachChild(node, visitNode, context);
                }
                else {
                    resultStmt = node;
                }
                if (declarations.length) {
                    inserts.push({ relativeTo: resultStmt, declarations: declarations });
                }
                return resultStmt;
            }
            var newStatements = sourceFile.statements.map(topLevelStatement);
            if (inserts.length) {
                // Insert the declarations relative to the rewritten statement that references them.
                var insertMap_1 = toMap(inserts, function (i) { return i.relativeTo; });
                var tmpStatements_1 = [];
                newStatements.forEach(function (statement) {
                    var insert = insertMap_1.get(statement);
                    if (insert) {
                        var before = insert.declarations.filter(function (d) { return d.order === 0 /* BeforeStmt */; });
                        if (before.length) {
                            tmpStatements_1.push(createVariableStatementForDeclarations(before));
                        }
                        tmpStatements_1.push(statement);
                        var after = insert.declarations.filter(function (d) { return d.order === 1 /* AfterStmt */; });
                        if (after.length) {
                            tmpStatements_1.push(createVariableStatementForDeclarations(after));
                        }
                    }
                    else {
                        tmpStatements_1.push(statement);
                    }
                });
                // Insert an exports clause to export the declarations
                tmpStatements_1.push(ts.createExportDeclaration(
                /* decorators */ undefined, 
                /* modifiers */ undefined, ts.createNamedExports(inserts
                    .reduce(function (accumulator, insert) { return tslib_1.__spread(accumulator, insert.declarations); }, [])
                    .map(function (declaration) { return ts.createExportSpecifier(
                /* propertyName */ undefined, declaration.name); }))));
                newStatements = tmpStatements_1;
            }
            // Note: We cannot use ts.updateSourcefile here as
            // it does not work well with decorators.
            // See https://github.com/Microsoft/TypeScript/issues/17384
            var newSf = ts.getMutableClone(sourceFile);
            if (!(sourceFile.flags & ts.NodeFlags.Synthesized)) {
                newSf.flags &= ~ts.NodeFlags.Synthesized;
            }
            newSf.statements = ts.setTextRange(ts.createNodeArray(newStatements), sourceFile.statements);
            return newSf;
        }
        return visitSourceFile(sourceFile);
    }
    function createVariableStatementForDeclarations(declarations) {
        var varDecls = declarations.map(function (i) { return ts.createVariableDeclaration(i.name, /* type */ undefined, i.node); });
        return ts.createVariableStatement(
        /* modifiers */ undefined, ts.createVariableDeclarationList(varDecls, ts.NodeFlags.Const));
    }
    function getExpressionLoweringTransformFactory(requestsMap, program) {
        // Return the factory
        return function (context) { return function (sourceFile) {
            // We need to use the original SourceFile for reading metadata, and not the transformed one.
            var originalFile = program.getSourceFile(sourceFile.fileName);
            if (originalFile) {
                var requests = requestsMap.getRequests(originalFile);
                if (requests && requests.size) {
                    return transformSourceFile(sourceFile, requests, context);
                }
            }
            return sourceFile;
        }; };
    }
    exports.getExpressionLoweringTransformFactory = getExpressionLoweringTransformFactory;
    function isEligibleForLowering(node) {
        if (node) {
            switch (node.kind) {
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.Decorator:
                    // Lower expressions that are local to the module scope or
                    // in a decorator.
                    return true;
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                case ts.SyntaxKind.EnumDeclaration:
                case ts.SyntaxKind.FunctionDeclaration:
                    // Don't lower expressions in a declaration.
                    return false;
                case ts.SyntaxKind.VariableDeclaration:
                    var isExported = (ts.getCombinedModifierFlags(node) &
                        ts.ModifierFlags.Export) == 0;
                    // This might be unnecessary, as the variable might be exported and only used as a reference
                    // in another expression. However, the variable also might be involved in provider
                    // definitions. If that's the case, there is a specific token (`ROUTES`) which the compiler
                    // attempts to understand deeply. Sub-expressions within that token (`loadChildren` for
                    // example) might also require lowering even if the top-level declaration is already
                    // properly exported.
                    var varNode = node;
                    return isExported || (varNode.initializer !== undefined &&
                        (ts.isObjectLiteralExpression(varNode.initializer) ||
                            ts.isArrayLiteralExpression(varNode.initializer) ||
                            ts.isCallExpression(varNode.initializer)));
            }
            return isEligibleForLowering(node.parent);
        }
        return true;
    }
    function isPrimitive(value) {
        return Object(value) !== value;
    }
    function isRewritten(value) {
        return index_1.isMetadataGlobalReferenceExpression(value) && compiler_1.isLoweredSymbol(value.name);
    }
    function isLiteralFieldNamed(node, names) {
        if (node.parent && node.parent.kind == ts.SyntaxKind.PropertyAssignment) {
            var property = node.parent;
            if (property.parent && property.parent.kind == ts.SyntaxKind.ObjectLiteralExpression &&
                property.name && property.name.kind == ts.SyntaxKind.Identifier) {
                var propertyName = property.name;
                return names.has(propertyName.text);
            }
        }
        return false;
    }
    var LowerMetadataTransform = /** @class */ (function () {
        function LowerMetadataTransform(lowerableFieldNames) {
            this.requests = new Map();
            this.lowerableFieldNames = new Set(lowerableFieldNames);
        }
        // RequestMap
        LowerMetadataTransform.prototype.getRequests = function (sourceFile) {
            var result = this.requests.get(sourceFile.fileName);
            if (!result) {
                // Force the metadata for this source file to be collected which
                // will recursively call start() populating the request map;
                this.cache.getMetadata(sourceFile);
                // If we still don't have the requested metadata, the file is not a module
                // or is a declaration file so return an empty map.
                result = this.requests.get(sourceFile.fileName) || new Map();
            }
            return result;
        };
        // MetadataTransformer
        LowerMetadataTransform.prototype.connect = function (cache) { this.cache = cache; };
        LowerMetadataTransform.prototype.start = function (sourceFile) {
            var _this = this;
            var identNumber = 0;
            var freshIdent = function () { return compiler_1.createLoweredSymbol(identNumber++); };
            var requests = new Map();
            this.requests.set(sourceFile.fileName, requests);
            var replaceNode = function (node) {
                var name = freshIdent();
                requests.set(node.pos, { name: name, kind: node.kind, location: node.pos, end: node.end });
                return { __symbolic: 'reference', name: name };
            };
            var isExportedSymbol = (function () {
                var exportTable;
                return function (node) {
                    if (node.kind == ts.SyntaxKind.Identifier) {
                        var ident = node;
                        if (!exportTable) {
                            exportTable = createExportTableFor(sourceFile);
                        }
                        return exportTable.has(ident.text);
                    }
                    return false;
                };
            })();
            var isExportedPropertyAccess = function (node) {
                if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    var pae = node;
                    if (isExportedSymbol(pae.expression)) {
                        return true;
                    }
                }
                return false;
            };
            var hasLowerableParentCache = new Map();
            var shouldBeLowered = function (node) {
                if (node === undefined) {
                    return false;
                }
                var lowerable = false;
                if ((node.kind === ts.SyntaxKind.ArrowFunction ||
                    node.kind === ts.SyntaxKind.FunctionExpression) &&
                    isEligibleForLowering(node)) {
                    lowerable = true;
                }
                else if (isLiteralFieldNamed(node, _this.lowerableFieldNames) && isEligibleForLowering(node) &&
                    !isExportedSymbol(node) && !isExportedPropertyAccess(node)) {
                    lowerable = true;
                }
                return lowerable;
            };
            var hasLowerableParent = function (node) {
                if (node === undefined) {
                    return false;
                }
                if (!hasLowerableParentCache.has(node)) {
                    hasLowerableParentCache.set(node, shouldBeLowered(node.parent) || hasLowerableParent(node.parent));
                }
                return hasLowerableParentCache.get(node);
            };
            var isLowerable = function (node) {
                if (node === undefined) {
                    return false;
                }
                return shouldBeLowered(node) && !hasLowerableParent(node);
            };
            return function (value, node) {
                if (!isPrimitive(value) && !isRewritten(value) && isLowerable(node)) {
                    return replaceNode(node);
                }
                return value;
            };
        };
        return LowerMetadataTransform;
    }());
    exports.LowerMetadataTransform = LowerMetadataTransform;
    function createExportTableFor(sourceFile) {
        var exportTable = new Set();
        // Lazily collect all the exports from the source file
        ts.forEachChild(sourceFile, function scan(node) {
            var e_1, _a;
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                    if ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) != 0) {
                        var classDeclaration = node;
                        var name = classDeclaration.name;
                        if (name)
                            exportTable.add(name.text);
                    }
                    break;
                case ts.SyntaxKind.VariableStatement:
                    var variableStatement = node;
                    try {
                        for (var _b = tslib_1.__values(variableStatement.declarationList.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var declaration = _c.value;
                            scan(declaration);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    break;
                case ts.SyntaxKind.VariableDeclaration:
                    var variableDeclaration = node;
                    if ((ts.getCombinedModifierFlags(variableDeclaration) & ts.ModifierFlags.Export) != 0 &&
                        variableDeclaration.name.kind == ts.SyntaxKind.Identifier) {
                        var name = variableDeclaration.name;
                        exportTable.add(name.text);
                    }
                    break;
                case ts.SyntaxKind.ExportDeclaration:
                    var exportDeclaration = node;
                    var moduleSpecifier = exportDeclaration.moduleSpecifier, exportClause = exportDeclaration.exportClause;
                    if (!moduleSpecifier && exportClause && ts.isNamedExports(exportClause)) {
                        exportClause.elements.forEach(function (spec) { exportTable.add(spec.name.text); });
                    }
            }
        });
        return exportTable;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG93ZXJfZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9sb3dlcl9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdUU7SUFDdkUsK0JBQWlDO0lBRWpDLGtFQUEwSTtJQXlCMUksU0FBUyxLQUFLLENBQU8sS0FBVSxFQUFFLE1BQXNCO1FBQ3JELE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBUyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFkLENBQWMsQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELG9GQUFvRjtJQUNwRixvRkFBb0Y7SUFDcEYsNkJBQTZCO0lBQzdCLFNBQVMsY0FBYyxDQUFDLElBQWE7UUFDbkMsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDO1lBQ3RDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1lBQ25DLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNwQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1lBQ2hDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDL0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENB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Q0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUM3RTthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NyZWF0ZUxvd2VyZWRTeW1ib2wsIGlzTG93ZXJlZFN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29sbGVjdG9yT3B0aW9ucywgTWV0YWRhdGFDb2xsZWN0b3IsIE1ldGFkYXRhVmFsdWUsIE1vZHVsZU1ldGFkYXRhLCBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbn0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuaW1wb3J0IHtNZXRhZGF0YUNhY2hlLCBNZXRhZGF0YVRyYW5zZm9ybWVyLCBWYWx1ZVRyYW5zZm9ybX0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG93ZXJpbmdSZXF1ZXN0IHtcbiAga2luZDogdHMuU3ludGF4S2luZDtcbiAgbG9jYXRpb246IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWVzdExvY2F0aW9uTWFwID0gTWFwPG51bWJlciwgTG93ZXJpbmdSZXF1ZXN0PjtcblxuY29uc3QgZW51bSBEZWNsYXJhdGlvbk9yZGVyIHsgQmVmb3JlU3RtdCwgQWZ0ZXJTdG10IH1cblxuaW50ZXJmYWNlIERlY2xhcmF0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBub2RlOiB0cy5Ob2RlO1xuICBvcmRlcjogRGVjbGFyYXRpb25PcmRlcjtcbn1cblxuaW50ZXJmYWNlIERlY2xhcmF0aW9uSW5zZXJ0IHtcbiAgZGVjbGFyYXRpb25zOiBEZWNsYXJhdGlvbltdO1xuICByZWxhdGl2ZVRvOiB0cy5Ob2RlO1xufVxuXG5mdW5jdGlvbiB0b01hcDxULCBLPihpdGVtczogVFtdLCBzZWxlY3Q6IChpdGVtOiBUKSA9PiBLKTogTWFwPEssIFQ+IHtcbiAgcmV0dXJuIG5ldyBNYXAoaXRlbXMubWFwPFtLLCBUXT4oaSA9PiBbc2VsZWN0KGkpLCBpXSkpO1xufVxuXG4vLyBXZSB3aWxsIG5ldmVyIGxvd2VyIGV4cHJlc3Npb25zIGluIGEgbmVzdGVkIGxleGljYWwgc2NvcGUgc28gYXZvaWQgZW50ZXJpbmcgdGhlbS5cbi8vIFRoaXMgYWxzbyBhdm9pZHMgYSBidWcgaW4gVHlwZVNjcmlwdCAyLjMgd2hlcmUgdGhlIGxleGljYWwgc2NvcGVzIGdldCBvdXQgb2Ygc3luY1xuLy8gd2hlbiB1c2luZyB2aXNpdEVhY2hDaGlsZC5cbmZ1bmN0aW9uIGlzTGV4aWNhbFNjb3BlKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXJyb3dGdW5jdGlvbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25FeHByZXNzaW9uOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0V4cHJlc3Npb246XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uVHlwZTpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHlwZUxpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkFycmF5VHlwZTpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtU291cmNlRmlsZShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZXF1ZXN0czogUmVxdWVzdExvY2F0aW9uTWFwLFxuICAgIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBpbnNlcnRzOiBEZWNsYXJhdGlvbkluc2VydFtdID0gW107XG5cbiAgLy8gQ2FsY3VsYXRlIHRoZSByYW5nZSBvZiBpbnRlcmVzdGluZyBsb2NhdGlvbnMuIFRoZSB0cmFuc2Zvcm0gd2lsbCBvbmx5IHZpc2l0IG5vZGVzIGluIHRoaXNcbiAgLy8gcmFuZ2UgdG8gaW1wcm92ZSB0aGUgcGVyZm9ybWFuY2Ugb24gbGFyZ2UgZmlsZXMuXG4gIGNvbnN0IGxvY2F0aW9ucyA9IEFycmF5LmZyb20ocmVxdWVzdHMua2V5cygpKTtcbiAgY29uc3QgbWluID0gTWF0aC5taW4oLi4ubG9jYXRpb25zKTtcbiAgY29uc3QgbWF4ID0gTWF0aC5tYXgoLi4ubG9jYXRpb25zKTtcblxuICAvLyBWaXNpdCBub2RlcyBtYXRjaGluZyB0aGUgcmVxdWVzdCBhbmQgc3ludGhldGljIG5vZGVzIGFkZGVkIGJ5IHRzaWNrbGVcbiAgZnVuY3Rpb24gc2hvdWxkVmlzaXQocG9zOiBudW1iZXIsIGVuZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChwb3MgPD0gbWF4ICYmIGVuZCA+PSBtaW4pIHx8IHBvcyA9PSAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZpc2l0U291cmNlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgZnVuY3Rpb24gdG9wTGV2ZWxTdGF0ZW1lbnQobm9kZTogdHMuU3RhdGVtZW50KTogdHMuU3RhdGVtZW50IHtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uczogRGVjbGFyYXRpb25bXSA9IFtdO1xuXG4gICAgICBmdW5jdGlvbiB2aXNpdE5vZGUobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUge1xuICAgICAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIG5vZGUgYmVmb3JlIHRzaWNrbGVcbiAgICAgICAgY29uc3Qge3BvcywgZW5kLCBraW5kLCBwYXJlbnQ6IG9yaWdpbmFsUGFyZW50fSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKTtcbiAgICAgICAgY29uc3Qgbm9kZVJlcXVlc3QgPSByZXF1ZXN0cy5nZXQocG9zKTtcbiAgICAgICAgaWYgKG5vZGVSZXF1ZXN0ICYmIG5vZGVSZXF1ZXN0LmtpbmQgPT0ga2luZCAmJiBub2RlUmVxdWVzdC5lbmQgPT0gZW5kKSB7XG4gICAgICAgICAgLy8gVGhpcyBub2RlIGlzIHJlcXVlc3RlZCB0byBiZSByZXdyaXR0ZW4gYXMgYSByZWZlcmVuY2UgdG8gdGhlIGV4cG9ydGVkIG5hbWUuXG4gICAgICAgICAgaWYgKG9yaWdpbmFsUGFyZW50ICYmIG9yaWdpbmFsUGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gQXMgdGhlIHZhbHVlIHJlcHJlc2VudHMgdGhlIHdob2xlIGluaXRpYWxpemVyIG9mIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sXG4gICAgICAgICAgICAvLyBqdXN0IHJlZmVyIHRvIHRoYXQgdmFyaWFibGUuIFRoaXMgZS5nLiBoZWxwcyB0byBwcmVzZXJ2ZSBjbG9zdXJlIGNvbW1lbnRzXG4gICAgICAgICAgICAvLyBhdCB0aGUgcmlnaHQgcGxhY2UuXG4gICAgICAgICAgICBjb25zdCB2YXJQYXJlbnQgPSBvcmlnaW5hbFBhcmVudCBhcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgaWYgKHZhclBhcmVudC5uYW1lLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICBjb25zdCB2YXJOYW1lID0gdmFyUGFyZW50Lm5hbWUudGV4dDtcbiAgICAgICAgICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IG5vZGVSZXF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBleHBvcnROYW1lLFxuICAgICAgICAgICAgICAgIG5vZGU6IHRzLmNyZWF0ZUlkZW50aWZpZXIodmFyTmFtZSksXG4gICAgICAgICAgICAgICAgb3JkZXI6IERlY2xhcmF0aW9uT3JkZXIuQWZ0ZXJTdG10XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjb3JkIHRoYXQgdGhlIG5vZGUgbmVlZHMgdG8gYmUgbW92ZWQgdG8gYW4gZXhwb3J0ZWQgdmFyaWFibGUgd2l0aCB0aGUgZ2l2ZW4gbmFtZVxuICAgICAgICAgIGNvbnN0IGV4cG9ydE5hbWUgPSBub2RlUmVxdWVzdC5uYW1lO1xuICAgICAgICAgIGRlY2xhcmF0aW9ucy5wdXNoKHtuYW1lOiBleHBvcnROYW1lLCBub2RlLCBvcmRlcjogRGVjbGFyYXRpb25PcmRlci5CZWZvcmVTdG10fSk7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwb3J0TmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlc3VsdCA9IG5vZGU7XG4gICAgICAgIGlmIChzaG91bGRWaXNpdChwb3MsIGVuZCkgJiYgIWlzTGV4aWNhbFNjb3BlKG5vZGUpKSB7XG4gICAgICAgICAgcmVzdWx0ID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXROb2RlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIG5vZGUgYmVmb3JlIHRzaWNrbGVcbiAgICAgIGNvbnN0IHtwb3MsIGVuZH0gPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSk7XG4gICAgICBsZXQgcmVzdWx0U3RtdDogdHMuU3RhdGVtZW50O1xuICAgICAgaWYgKHNob3VsZFZpc2l0KHBvcywgZW5kKSkge1xuICAgICAgICByZXN1bHRTdG10ID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXROb2RlLCBjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFN0bXQgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCkge1xuICAgICAgICBpbnNlcnRzLnB1c2goe3JlbGF0aXZlVG86IHJlc3VsdFN0bXQsIGRlY2xhcmF0aW9uc30pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFN0bXQ7XG4gICAgfVxuXG4gICAgbGV0IG5ld1N0YXRlbWVudHMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKHRvcExldmVsU3RhdGVtZW50KTtcblxuICAgIGlmIChpbnNlcnRzLmxlbmd0aCkge1xuICAgICAgLy8gSW5zZXJ0IHRoZSBkZWNsYXJhdGlvbnMgcmVsYXRpdmUgdG8gdGhlIHJld3JpdHRlbiBzdGF0ZW1lbnQgdGhhdCByZWZlcmVuY2VzIHRoZW0uXG4gICAgICBjb25zdCBpbnNlcnRNYXAgPSB0b01hcChpbnNlcnRzLCBpID0+IGkucmVsYXRpdmVUbyk7XG4gICAgICBjb25zdCB0bXBTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgICAgbmV3U3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICAgIGNvbnN0IGluc2VydCA9IGluc2VydE1hcC5nZXQoc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGluc2VydCkge1xuICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IGluc2VydC5kZWNsYXJhdGlvbnMuZmlsdGVyKGQgPT4gZC5vcmRlciA9PT0gRGVjbGFyYXRpb25PcmRlci5CZWZvcmVTdG10KTtcbiAgICAgICAgICBpZiAoYmVmb3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgdG1wU3RhdGVtZW50cy5wdXNoKGNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50Rm9yRGVjbGFyYXRpb25zKGJlZm9yZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0bXBTdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgICBjb25zdCBhZnRlciA9IGluc2VydC5kZWNsYXJhdGlvbnMuZmlsdGVyKGQgPT4gZC5vcmRlciA9PT0gRGVjbGFyYXRpb25PcmRlci5BZnRlclN0bXQpO1xuICAgICAgICAgIGlmIChhZnRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRtcFN0YXRlbWVudHMucHVzaChjcmVhdGVWYXJpYWJsZVN0YXRlbWVudEZvckRlY2xhcmF0aW9ucyhhZnRlcikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0bXBTdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEluc2VydCBhbiBleHBvcnRzIGNsYXVzZSB0byBleHBvcnQgdGhlIGRlY2xhcmF0aW9uc1xuICAgICAgdG1wU3RhdGVtZW50cy5wdXNoKHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgdHMuY3JlYXRlTmFtZWRFeHBvcnRzKFxuICAgICAgICAgICAgICBpbnNlcnRzXG4gICAgICAgICAgICAgICAgICAucmVkdWNlKFxuICAgICAgICAgICAgICAgICAgICAgIChhY2N1bXVsYXRvciwgaW5zZXJ0KSA9PiBbLi4uYWNjdW11bGF0b3IsIC4uLmluc2VydC5kZWNsYXJhdGlvbnNdLFxuICAgICAgICAgICAgICAgICAgICAgIFtdIGFzIERlY2xhcmF0aW9uW10pXG4gICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcHJvcGVydHlOYW1lICovIHVuZGVmaW5lZCwgZGVjbGFyYXRpb24ubmFtZSkpKSkpO1xuXG4gICAgICBuZXdTdGF0ZW1lbnRzID0gdG1wU3RhdGVtZW50cztcbiAgICB9XG4gICAgLy8gTm90ZTogV2UgY2Fubm90IHVzZSB0cy51cGRhdGVTb3VyY2VmaWxlIGhlcmUgYXNcbiAgICAvLyBpdCBkb2VzIG5vdCB3b3JrIHdlbGwgd2l0aCBkZWNvcmF0b3JzLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzE3Mzg0XG4gICAgY29uc3QgbmV3U2YgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoc291cmNlRmlsZSk7XG4gICAgaWYgKCEoc291cmNlRmlsZS5mbGFncyAmIHRzLk5vZGVGbGFncy5TeW50aGVzaXplZCkpIHtcbiAgICAgIG5ld1NmLmZsYWdzICY9IH50cy5Ob2RlRmxhZ3MuU3ludGhlc2l6ZWQ7XG4gICAgfVxuICAgIG5ld1NmLnN0YXRlbWVudHMgPSB0cy5zZXRUZXh0UmFuZ2UodHMuY3JlYXRlTm9kZUFycmF5KG5ld1N0YXRlbWVudHMpLCBzb3VyY2VGaWxlLnN0YXRlbWVudHMpO1xuICAgIHJldHVybiBuZXdTZjtcbiAgfVxuXG4gIHJldHVybiB2aXNpdFNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50Rm9yRGVjbGFyYXRpb25zKGRlY2xhcmF0aW9uczogRGVjbGFyYXRpb25bXSk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgY29uc3QgdmFyRGVjbHMgPSBkZWNsYXJhdGlvbnMubWFwKFxuICAgICAgaSA9PiB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKGkubmFtZSwgLyogdHlwZSAqLyB1bmRlZmluZWQsIGkubm9kZSBhcyB0cy5FeHByZXNzaW9uKSk7XG4gIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KHZhckRlY2xzLCB0cy5Ob2RlRmxhZ3MuQ29uc3QpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25Mb3dlcmluZ1RyYW5zZm9ybUZhY3RvcnkoXG4gICAgcmVxdWVzdHNNYXA6IFJlcXVlc3RzTWFwLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT5cbiAgICAoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkgPT4gdHMuU291cmNlRmlsZSB7XG4gIC8vIFJldHVybiB0aGUgZmFjdG9yeVxuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAvLyBXZSBuZWVkIHRvIHVzZSB0aGUgb3JpZ2luYWwgU291cmNlRmlsZSBmb3IgcmVhZGluZyBtZXRhZGF0YSwgYW5kIG5vdCB0aGUgdHJhbnNmb3JtZWQgb25lLlxuICAgIGNvbnN0IG9yaWdpbmFsRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBpZiAob3JpZ2luYWxGaWxlKSB7XG4gICAgICBjb25zdCByZXF1ZXN0cyA9IHJlcXVlc3RzTWFwLmdldFJlcXVlc3RzKG9yaWdpbmFsRmlsZSk7XG4gICAgICBpZiAocmVxdWVzdHMgJiYgcmVxdWVzdHMuc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJhbnNmb3JtU291cmNlRmlsZShzb3VyY2VGaWxlLCByZXF1ZXN0cywgY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2VGaWxlO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcXVlc3RzTWFwIHsgZ2V0UmVxdWVzdHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFJlcXVlc3RMb2NhdGlvbk1hcDsgfVxuXG5pbnRlcmZhY2UgTWV0YWRhdGFBbmRMb3dlcmluZ1JlcXVlc3RzIHtcbiAgbWV0YWRhdGE6IE1vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZDtcbiAgcmVxdWVzdHM6IFJlcXVlc3RMb2NhdGlvbk1hcDtcbn1cblxuZnVuY3Rpb24gaXNFbGlnaWJsZUZvckxvd2VyaW5nKG5vZGU6IHRzLk5vZGUgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGU6XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRGVjb3JhdG9yOlxuICAgICAgICAvLyBMb3dlciBleHByZXNzaW9ucyB0aGF0IGFyZSBsb2NhbCB0byB0aGUgbW9kdWxlIHNjb3BlIG9yXG4gICAgICAgIC8vIGluIGEgZGVjb3JhdG9yLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkVudW1EZWNsYXJhdGlvbjpcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAvLyBEb24ndCBsb3dlciBleHByZXNzaW9ucyBpbiBhIGRlY2xhcmF0aW9uLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgY29uc3QgaXNFeHBvcnRlZCA9ICh0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3Mobm9kZSBhcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKSAmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTW9kaWZpZXJGbGFncy5FeHBvcnQpID09IDA7XG4gICAgICAgIC8vIFRoaXMgbWlnaHQgYmUgdW5uZWNlc3NhcnksIGFzIHRoZSB2YXJpYWJsZSBtaWdodCBiZSBleHBvcnRlZCBhbmQgb25seSB1c2VkIGFzIGEgcmVmZXJlbmNlXG4gICAgICAgIC8vIGluIGFub3RoZXIgZXhwcmVzc2lvbi4gSG93ZXZlciwgdGhlIHZhcmlhYmxlIGFsc28gbWlnaHQgYmUgaW52b2x2ZWQgaW4gcHJvdmlkZXJcbiAgICAgICAgLy8gZGVmaW5pdGlvbnMuIElmIHRoYXQncyB0aGUgY2FzZSwgdGhlcmUgaXMgYSBzcGVjaWZpYyB0b2tlbiAoYFJPVVRFU2ApIHdoaWNoIHRoZSBjb21waWxlclxuICAgICAgICAvLyBhdHRlbXB0cyB0byB1bmRlcnN0YW5kIGRlZXBseS4gU3ViLWV4cHJlc3Npb25zIHdpdGhpbiB0aGF0IHRva2VuIChgbG9hZENoaWxkcmVuYCBmb3JcbiAgICAgICAgLy8gZXhhbXBsZSkgbWlnaHQgYWxzbyByZXF1aXJlIGxvd2VyaW5nIGV2ZW4gaWYgdGhlIHRvcC1sZXZlbCBkZWNsYXJhdGlvbiBpcyBhbHJlYWR5XG4gICAgICAgIC8vIHByb3Blcmx5IGV4cG9ydGVkLlxuICAgICAgICBjb25zdCB2YXJOb2RlID0gbm9kZSBhcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICByZXR1cm4gaXNFeHBvcnRlZCB8fCAodmFyTm9kZS5pbml0aWFsaXplciAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbih2YXJOb2RlLmluaXRpYWxpemVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbih2YXJOb2RlLmluaXRpYWxpemVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24odmFyTm9kZS5pbml0aWFsaXplcikpKTtcbiAgICB9XG4gICAgcmV0dXJuIGlzRWxpZ2libGVGb3JMb3dlcmluZyhub2RlLnBhcmVudCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIE9iamVjdCh2YWx1ZSkgIT09IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc1Jld3JpdHRlbih2YWx1ZTogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbih2YWx1ZSkgJiYgaXNMb3dlcmVkU3ltYm9sKHZhbHVlLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBpc0xpdGVyYWxGaWVsZE5hbWVkKG5vZGU6IHRzLk5vZGUsIG5hbWVzOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBpZiAobm9kZS5wYXJlbnQgJiYgbm9kZS5wYXJlbnQua2luZCA9PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QXNzaWdubWVudCkge1xuICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuICAgIGlmIChwcm9wZXJ0eS5wYXJlbnQgJiYgcHJvcGVydHkucGFyZW50LmtpbmQgPT0gdHMuU3ludGF4S2luZC5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiAmJlxuICAgICAgICBwcm9wZXJ0eS5uYW1lICYmIHByb3BlcnR5Lm5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHByb3BlcnR5Lm5hbWUgYXMgdHMuSWRlbnRpZmllcjtcbiAgICAgIHJldHVybiBuYW1lcy5oYXMocHJvcGVydHlOYW1lLnRleHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjbGFzcyBMb3dlck1ldGFkYXRhVHJhbnNmb3JtIGltcGxlbWVudHMgUmVxdWVzdHNNYXAsIE1ldGFkYXRhVHJhbnNmb3JtZXIge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBjYWNoZSAhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIHJlcXVlc3RzID0gbmV3IE1hcDxzdHJpbmcsIFJlcXVlc3RMb2NhdGlvbk1hcD4oKTtcbiAgcHJpdmF0ZSBsb3dlcmFibGVGaWVsZE5hbWVzOiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3Rvcihsb3dlcmFibGVGaWVsZE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMubG93ZXJhYmxlRmllbGROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPihsb3dlcmFibGVGaWVsZE5hbWVzKTtcbiAgfVxuXG4gIC8vIFJlcXVlc3RNYXBcbiAgZ2V0UmVxdWVzdHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFJlcXVlc3RMb2NhdGlvbk1hcCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMucmVxdWVzdHMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAvLyBGb3JjZSB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgc291cmNlIGZpbGUgdG8gYmUgY29sbGVjdGVkIHdoaWNoXG4gICAgICAvLyB3aWxsIHJlY3Vyc2l2ZWx5IGNhbGwgc3RhcnQoKSBwb3B1bGF0aW5nIHRoZSByZXF1ZXN0IG1hcDtcbiAgICAgIHRoaXMuY2FjaGUuZ2V0TWV0YWRhdGEoc291cmNlRmlsZSk7XG5cbiAgICAgIC8vIElmIHdlIHN0aWxsIGRvbid0IGhhdmUgdGhlIHJlcXVlc3RlZCBtZXRhZGF0YSwgdGhlIGZpbGUgaXMgbm90IGEgbW9kdWxlXG4gICAgICAvLyBvciBpcyBhIGRlY2xhcmF0aW9uIGZpbGUgc28gcmV0dXJuIGFuIGVtcHR5IG1hcC5cbiAgICAgIHJlc3VsdCA9IHRoaXMucmVxdWVzdHMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpIHx8IG5ldyBNYXA8bnVtYmVyLCBMb3dlcmluZ1JlcXVlc3Q+KCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBNZXRhZGF0YVRyYW5zZm9ybWVyXG4gIGNvbm5lY3QoY2FjaGU6IE1ldGFkYXRhQ2FjaGUpOiB2b2lkIHsgdGhpcy5jYWNoZSA9IGNhY2hlOyB9XG5cbiAgc3RhcnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFZhbHVlVHJhbnNmb3JtfHVuZGVmaW5lZCB7XG4gICAgbGV0IGlkZW50TnVtYmVyID0gMDtcbiAgICBjb25zdCBmcmVzaElkZW50ID0gKCkgPT4gY3JlYXRlTG93ZXJlZFN5bWJvbChpZGVudE51bWJlcisrKTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IG5ldyBNYXA8bnVtYmVyLCBMb3dlcmluZ1JlcXVlc3Q+KCk7XG4gICAgdGhpcy5yZXF1ZXN0cy5zZXQoc291cmNlRmlsZS5maWxlTmFtZSwgcmVxdWVzdHMpO1xuXG4gICAgY29uc3QgcmVwbGFjZU5vZGUgPSAobm9kZTogdHMuTm9kZSkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGZyZXNoSWRlbnQoKTtcbiAgICAgIHJlcXVlc3RzLnNldChub2RlLnBvcywge25hbWUsIGtpbmQ6IG5vZGUua2luZCwgbG9jYXRpb246IG5vZGUucG9zLCBlbmQ6IG5vZGUuZW5kfSk7XG4gICAgICByZXR1cm4ge19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lfTtcbiAgICB9O1xuXG4gICAgY29uc3QgaXNFeHBvcnRlZFN5bWJvbCA9ICgoKSA9PiB7XG4gICAgICBsZXQgZXhwb3J0VGFibGU6IFNldDxzdHJpbmc+O1xuICAgICAgcmV0dXJuIChub2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgY29uc3QgaWRlbnQgPSBub2RlIGFzIHRzLklkZW50aWZpZXI7XG5cbiAgICAgICAgICBpZiAoIWV4cG9ydFRhYmxlKSB7XG4gICAgICAgICAgICBleHBvcnRUYWJsZSA9IGNyZWF0ZUV4cG9ydFRhYmxlRm9yKHNvdXJjZUZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZXhwb3J0VGFibGUuaGFzKGlkZW50LnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSkoKTtcblxuICAgIGNvbnN0IGlzRXhwb3J0ZWRQcm9wZXJ0eUFjY2VzcyA9IChub2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgICBjb25zdCBwYWUgPSBub2RlIGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKGlzRXhwb3J0ZWRTeW1ib2wocGFlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgY29uc3QgaGFzTG93ZXJhYmxlUGFyZW50Q2FjaGUgPSBuZXcgTWFwPHRzLk5vZGUsIGJvb2xlYW4+KCk7XG5cbiAgICBjb25zdCBzaG91bGRCZUxvd2VyZWQgPSAobm9kZTogdHMuTm9kZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgbG93ZXJhYmxlOiBib29sZWFuID0gZmFsc2U7XG4gICAgICBpZiAoKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5BcnJvd0Z1bmN0aW9uIHx8XG4gICAgICAgICAgIG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GdW5jdGlvbkV4cHJlc3Npb24pICYmXG4gICAgICAgICAgaXNFbGlnaWJsZUZvckxvd2VyaW5nKG5vZGUpKSB7XG4gICAgICAgIGxvd2VyYWJsZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIGlzTGl0ZXJhbEZpZWxkTmFtZWQobm9kZSwgdGhpcy5sb3dlcmFibGVGaWVsZE5hbWVzKSAmJiBpc0VsaWdpYmxlRm9yTG93ZXJpbmcobm9kZSkgJiZcbiAgICAgICAgICAhaXNFeHBvcnRlZFN5bWJvbChub2RlKSAmJiAhaXNFeHBvcnRlZFByb3BlcnR5QWNjZXNzKG5vZGUpKSB7XG4gICAgICAgIGxvd2VyYWJsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG93ZXJhYmxlO1xuICAgIH07XG5cbiAgICBjb25zdCBoYXNMb3dlcmFibGVQYXJlbnQgPSAobm9kZTogdHMuTm9kZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWhhc0xvd2VyYWJsZVBhcmVudENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgICBoYXNMb3dlcmFibGVQYXJlbnRDYWNoZS5zZXQoXG4gICAgICAgICAgICBub2RlLCBzaG91bGRCZUxvd2VyZWQobm9kZS5wYXJlbnQpIHx8IGhhc0xvd2VyYWJsZVBhcmVudChub2RlLnBhcmVudCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc0xvd2VyYWJsZVBhcmVudENhY2hlLmdldChub2RlKSAhO1xuICAgIH07XG5cbiAgICBjb25zdCBpc0xvd2VyYWJsZSA9IChub2RlOiB0cy5Ob2RlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzaG91bGRCZUxvd2VyZWQobm9kZSkgJiYgIWhhc0xvd2VyYWJsZVBhcmVudChub2RlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSk6IE1ldGFkYXRhVmFsdWUgPT4ge1xuICAgICAgaWYgKCFpc1ByaW1pdGl2ZSh2YWx1ZSkgJiYgIWlzUmV3cml0dGVuKHZhbHVlKSAmJiBpc0xvd2VyYWJsZShub2RlKSkge1xuICAgICAgICByZXR1cm4gcmVwbGFjZU5vZGUobm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHBvcnRUYWJsZUZvcihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU2V0PHN0cmluZz4ge1xuICBjb25zdCBleHBvcnRUYWJsZSA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAvLyBMYXppbHkgY29sbGVjdCBhbGwgdGhlIGV4cG9ydHMgZnJvbSB0aGUgc291cmNlIGZpbGVcbiAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZ1bmN0aW9uIHNjYW4obm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgICBpZiAoKHRzLmdldENvbWJpbmVkTW9kaWZpZXJGbGFncyhub2RlIGFzIHRzLkRlY2xhcmF0aW9uKSAmIHRzLk1vZGlmaWVyRmxhZ3MuRXhwb3J0KSAhPSAwKSB7XG4gICAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9XG4gICAgICAgICAgICAgIG5vZGUgYXModHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24gfCB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IGNsYXNzRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgICBpZiAobmFtZSkgZXhwb3J0VGFibGUuYWRkKG5hbWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQ6XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlU3RhdGVtZW50ID0gbm9kZSBhcyB0cy5WYXJpYWJsZVN0YXRlbWVudDtcbiAgICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiB2YXJpYWJsZVN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSB7XG4gICAgICAgICAgc2NhbihkZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKCh0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3ModmFyaWFibGVEZWNsYXJhdGlvbikgJiB0cy5Nb2RpZmllckZsYWdzLkV4cG9ydCkgIT0gMCAmJlxuICAgICAgICAgICAgdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSBhcyB0cy5JZGVudGlmaWVyO1xuICAgICAgICAgIGV4cG9ydFRhYmxlLmFkZChuYW1lLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkV4cG9ydERlY2xhcmF0aW9uOlxuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuRXhwb3J0RGVjbGFyYXRpb247XG4gICAgICAgIGNvbnN0IHttb2R1bGVTcGVjaWZpZXIsIGV4cG9ydENsYXVzZX0gPSBleHBvcnREZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKCFtb2R1bGVTcGVjaWZpZXIgJiYgZXhwb3J0Q2xhdXNlICYmIHRzLmlzTmFtZWRFeHBvcnRzKGV4cG9ydENsYXVzZSkpIHtcbiAgICAgICAgICBleHBvcnRDbGF1c2UuZWxlbWVudHMuZm9yRWFjaChzcGVjID0+IHsgZXhwb3J0VGFibGUuYWRkKHNwZWMubmFtZS50ZXh0KTsgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZXhwb3J0VGFibGU7XG59XG4iXX0=