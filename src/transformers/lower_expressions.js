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
                    // Avoid lowering expressions already in an exported variable declaration
                    return (ts.getCombinedModifierFlags(node) &
                        ts.ModifierFlags.Export) == 0;
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
                    if (!moduleSpecifier && exportClause) {
                        exportClause.elements.forEach(function (spec) { exportTable.add(spec.name.text); });
                    }
            }
        });
        return exportTable;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG93ZXJfZXhwcmVzc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9sb3dlcl9leHByZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdUU7SUFDdkUsK0JBQWlDO0lBRWpDLGtFQUEwSTtJQXlCMUksU0FBUyxLQUFLLENBQU8sS0FBVSxFQUFFLE1BQXNCO1FBQ3JELE9BQU8sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBUyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFkLENBQWMsQ0FBQyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELG9GQUFvRjtJQUNwRixvRkFBb0Y7SUFDcEYsNkJBQTZCO0lBQzdCLFNBQVMsY0FBYyxDQUFDLElBQWE7UUFDbkMsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ2pCLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDO1lBQ3RDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUN2QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO1lBQ25DLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNwQyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO1lBQ2hDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDL0IsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVM7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENB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VUFBVSxDQUFDLG1CQUFtQjtvQkFDcEMsSUFBTSxtQkFBbUIsR0FBRyxJQUE4QixDQUFDO29CQUMzRCxJQUFJLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNqRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFO3dCQUM3RCxJQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxJQUFxQixDQUFDO3dCQUN2RCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDNUI7b0JBQ0QsTUFBTTtnQkFDUixLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCO29CQUNsQyxJQUFNLGlCQUFpQixHQUFHLElBQTRCLENBQUM7b0JBQ2hELElBQUEsbURBQWUsRUFBRSw2Q0FBWSxDQUFzQjtvQkFDMUQsSUFBSSxDQUFDLGVBQWUsSUFBSSxZQUFZLEVBQUU7d0JBQ3BDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxJQUFNLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUM3RTthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NyZWF0ZUxvd2VyZWRTeW1ib2wsIGlzTG93ZXJlZFN5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29sbGVjdG9yT3B0aW9ucywgTWV0YWRhdGFDb2xsZWN0b3IsIE1ldGFkYXRhVmFsdWUsIE1vZHVsZU1ldGFkYXRhLCBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbn0gZnJvbSAnLi4vbWV0YWRhdGEvaW5kZXgnO1xuaW1wb3J0IHtNZXRhZGF0YUNhY2hlLCBNZXRhZGF0YVRyYW5zZm9ybWVyLCBWYWx1ZVRyYW5zZm9ybX0gZnJvbSAnLi9tZXRhZGF0YV9jYWNoZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG93ZXJpbmdSZXF1ZXN0IHtcbiAga2luZDogdHMuU3ludGF4S2luZDtcbiAgbG9jYXRpb246IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgUmVxdWVzdExvY2F0aW9uTWFwID0gTWFwPG51bWJlciwgTG93ZXJpbmdSZXF1ZXN0PjtcblxuY29uc3QgZW51bSBEZWNsYXJhdGlvbk9yZGVyIHsgQmVmb3JlU3RtdCwgQWZ0ZXJTdG10IH1cblxuaW50ZXJmYWNlIERlY2xhcmF0aW9uIHtcbiAgbmFtZTogc3RyaW5nO1xuICBub2RlOiB0cy5Ob2RlO1xuICBvcmRlcjogRGVjbGFyYXRpb25PcmRlcjtcbn1cblxuaW50ZXJmYWNlIERlY2xhcmF0aW9uSW5zZXJ0IHtcbiAgZGVjbGFyYXRpb25zOiBEZWNsYXJhdGlvbltdO1xuICByZWxhdGl2ZVRvOiB0cy5Ob2RlO1xufVxuXG5mdW5jdGlvbiB0b01hcDxULCBLPihpdGVtczogVFtdLCBzZWxlY3Q6IChpdGVtOiBUKSA9PiBLKTogTWFwPEssIFQ+IHtcbiAgcmV0dXJuIG5ldyBNYXAoaXRlbXMubWFwPFtLLCBUXT4oaSA9PiBbc2VsZWN0KGkpLCBpXSkpO1xufVxuXG4vLyBXZSB3aWxsIG5ldmVyIGxvd2VyIGV4cHJlc3Npb25zIGluIGEgbmVzdGVkIGxleGljYWwgc2NvcGUgc28gYXZvaWQgZW50ZXJpbmcgdGhlbS5cbi8vIFRoaXMgYWxzbyBhdm9pZHMgYSBidWcgaW4gVHlwZVNjcmlwdCAyLjMgd2hlcmUgdGhlIGxleGljYWwgc2NvcGVzIGdldCBvdXQgb2Ygc3luY1xuLy8gd2hlbiB1c2luZyB2aXNpdEVhY2hDaGlsZC5cbmZ1bmN0aW9uIGlzTGV4aWNhbFNjb3BlKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgc3dpdGNoIChub2RlLmtpbmQpIHtcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXJyb3dGdW5jdGlvbjpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuRnVuY3Rpb25FeHByZXNzaW9uOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0V4cHJlc3Npb246XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsYXNzRGVjbGFyYXRpb246XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uVHlwZTpcbiAgICBjYXNlIHRzLlN5bnRheEtpbmQuVHlwZUxpdGVyYWw6XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLkFycmF5VHlwZTpcbiAgICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtU291cmNlRmlsZShcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZXF1ZXN0czogUmVxdWVzdExvY2F0aW9uTWFwLFxuICAgIGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBpbnNlcnRzOiBEZWNsYXJhdGlvbkluc2VydFtdID0gW107XG5cbiAgLy8gQ2FsY3VsYXRlIHRoZSByYW5nZSBvZiBpbnRlcmVzdGluZyBsb2NhdGlvbnMuIFRoZSB0cmFuc2Zvcm0gd2lsbCBvbmx5IHZpc2l0IG5vZGVzIGluIHRoaXNcbiAgLy8gcmFuZ2UgdG8gaW1wcm92ZSB0aGUgcGVyZm9ybWFuY2Ugb24gbGFyZ2UgZmlsZXMuXG4gIGNvbnN0IGxvY2F0aW9ucyA9IEFycmF5LmZyb20ocmVxdWVzdHMua2V5cygpKTtcbiAgY29uc3QgbWluID0gTWF0aC5taW4oLi4ubG9jYXRpb25zKTtcbiAgY29uc3QgbWF4ID0gTWF0aC5tYXgoLi4ubG9jYXRpb25zKTtcblxuICAvLyBWaXNpdCBub2RlcyBtYXRjaGluZyB0aGUgcmVxdWVzdCBhbmQgc3ludGhldGljIG5vZGVzIGFkZGVkIGJ5IHRzaWNrbGVcbiAgZnVuY3Rpb24gc2hvdWxkVmlzaXQocG9zOiBudW1iZXIsIGVuZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChwb3MgPD0gbWF4ICYmIGVuZCA+PSBtaW4pIHx8IHBvcyA9PSAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZpc2l0U291cmNlRmlsZShzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgZnVuY3Rpb24gdG9wTGV2ZWxTdGF0ZW1lbnQobm9kZTogdHMuU3RhdGVtZW50KTogdHMuU3RhdGVtZW50IHtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uczogRGVjbGFyYXRpb25bXSA9IFtdO1xuXG4gICAgICBmdW5jdGlvbiB2aXNpdE5vZGUobm9kZTogdHMuTm9kZSk6IHRzLk5vZGUge1xuICAgICAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIG5vZGUgYmVmb3JlIHRzaWNrbGVcbiAgICAgICAgY29uc3Qge3BvcywgZW5kLCBraW5kLCBwYXJlbnQ6IG9yaWdpbmFsUGFyZW50fSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKTtcbiAgICAgICAgY29uc3Qgbm9kZVJlcXVlc3QgPSByZXF1ZXN0cy5nZXQocG9zKTtcbiAgICAgICAgaWYgKG5vZGVSZXF1ZXN0ICYmIG5vZGVSZXF1ZXN0LmtpbmQgPT0ga2luZCAmJiBub2RlUmVxdWVzdC5lbmQgPT0gZW5kKSB7XG4gICAgICAgICAgLy8gVGhpcyBub2RlIGlzIHJlcXVlc3RlZCB0byBiZSByZXdyaXR0ZW4gYXMgYSByZWZlcmVuY2UgdG8gdGhlIGV4cG9ydGVkIG5hbWUuXG4gICAgICAgICAgaWYgKG9yaWdpbmFsUGFyZW50ICYmIG9yaWdpbmFsUGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgLy8gQXMgdGhlIHZhbHVlIHJlcHJlc2VudHMgdGhlIHdob2xlIGluaXRpYWxpemVyIG9mIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sXG4gICAgICAgICAgICAvLyBqdXN0IHJlZmVyIHRvIHRoYXQgdmFyaWFibGUuIFRoaXMgZS5nLiBoZWxwcyB0byBwcmVzZXJ2ZSBjbG9zdXJlIGNvbW1lbnRzXG4gICAgICAgICAgICAvLyBhdCB0aGUgcmlnaHQgcGxhY2UuXG4gICAgICAgICAgICBjb25zdCB2YXJQYXJlbnQgPSBvcmlnaW5hbFBhcmVudCBhcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgaWYgKHZhclBhcmVudC5uYW1lLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICBjb25zdCB2YXJOYW1lID0gdmFyUGFyZW50Lm5hbWUudGV4dDtcbiAgICAgICAgICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IG5vZGVSZXF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBleHBvcnROYW1lLFxuICAgICAgICAgICAgICAgIG5vZGU6IHRzLmNyZWF0ZUlkZW50aWZpZXIodmFyTmFtZSksXG4gICAgICAgICAgICAgICAgb3JkZXI6IERlY2xhcmF0aW9uT3JkZXIuQWZ0ZXJTdG10XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjb3JkIHRoYXQgdGhlIG5vZGUgbmVlZHMgdG8gYmUgbW92ZWQgdG8gYW4gZXhwb3J0ZWQgdmFyaWFibGUgd2l0aCB0aGUgZ2l2ZW4gbmFtZVxuICAgICAgICAgIGNvbnN0IGV4cG9ydE5hbWUgPSBub2RlUmVxdWVzdC5uYW1lO1xuICAgICAgICAgIGRlY2xhcmF0aW9ucy5wdXNoKHtuYW1lOiBleHBvcnROYW1lLCBub2RlLCBvcmRlcjogRGVjbGFyYXRpb25PcmRlci5CZWZvcmVTdG10fSk7XG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZUlkZW50aWZpZXIoZXhwb3J0TmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJlc3VsdCA9IG5vZGU7XG4gICAgICAgIGlmIChzaG91bGRWaXNpdChwb3MsIGVuZCkgJiYgIWlzTGV4aWNhbFNjb3BlKG5vZGUpKSB7XG4gICAgICAgICAgcmVzdWx0ID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXROb2RlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgdGhlIG9yaWdpbmFsIG5vZGUgYmVmb3JlIHRzaWNrbGVcbiAgICAgIGNvbnN0IHtwb3MsIGVuZH0gPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSk7XG4gICAgICBsZXQgcmVzdWx0U3RtdDogdHMuU3RhdGVtZW50O1xuICAgICAgaWYgKHNob3VsZFZpc2l0KHBvcywgZW5kKSkge1xuICAgICAgICByZXN1bHRTdG10ID0gdHMudmlzaXRFYWNoQ2hpbGQobm9kZSwgdmlzaXROb2RlLCBjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFN0bXQgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCkge1xuICAgICAgICBpbnNlcnRzLnB1c2goe3JlbGF0aXZlVG86IHJlc3VsdFN0bXQsIGRlY2xhcmF0aW9uc30pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdFN0bXQ7XG4gICAgfVxuXG4gICAgbGV0IG5ld1N0YXRlbWVudHMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKHRvcExldmVsU3RhdGVtZW50KTtcblxuICAgIGlmIChpbnNlcnRzLmxlbmd0aCkge1xuICAgICAgLy8gSW5zZXJ0IHRoZSBkZWNsYXJhdGlvbnMgcmVsYXRpdmUgdG8gdGhlIHJld3JpdHRlbiBzdGF0ZW1lbnQgdGhhdCByZWZlcmVuY2VzIHRoZW0uXG4gICAgICBjb25zdCBpbnNlcnRNYXAgPSB0b01hcChpbnNlcnRzLCBpID0+IGkucmVsYXRpdmVUbyk7XG4gICAgICBjb25zdCB0bXBTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdO1xuICAgICAgbmV3U3RhdGVtZW50cy5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICAgIGNvbnN0IGluc2VydCA9IGluc2VydE1hcC5nZXQoc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGluc2VydCkge1xuICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IGluc2VydC5kZWNsYXJhdGlvbnMuZmlsdGVyKGQgPT4gZC5vcmRlciA9PT0gRGVjbGFyYXRpb25PcmRlci5CZWZvcmVTdG10KTtcbiAgICAgICAgICBpZiAoYmVmb3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgdG1wU3RhdGVtZW50cy5wdXNoKGNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50Rm9yRGVjbGFyYXRpb25zKGJlZm9yZSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0bXBTdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgICBjb25zdCBhZnRlciA9IGluc2VydC5kZWNsYXJhdGlvbnMuZmlsdGVyKGQgPT4gZC5vcmRlciA9PT0gRGVjbGFyYXRpb25PcmRlci5BZnRlclN0bXQpO1xuICAgICAgICAgIGlmIChhZnRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRtcFN0YXRlbWVudHMucHVzaChjcmVhdGVWYXJpYWJsZVN0YXRlbWVudEZvckRlY2xhcmF0aW9ucyhhZnRlcikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0bXBTdGF0ZW1lbnRzLnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEluc2VydCBhbiBleHBvcnRzIGNsYXVzZSB0byBleHBvcnQgdGhlIGRlY2xhcmF0aW9uc1xuICAgICAgdG1wU3RhdGVtZW50cy5wdXNoKHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgdHMuY3JlYXRlTmFtZWRFeHBvcnRzKFxuICAgICAgICAgICAgICBpbnNlcnRzXG4gICAgICAgICAgICAgICAgICAucmVkdWNlKFxuICAgICAgICAgICAgICAgICAgICAgIChhY2N1bXVsYXRvciwgaW5zZXJ0KSA9PiBbLi4uYWNjdW11bGF0b3IsIC4uLmluc2VydC5kZWNsYXJhdGlvbnNdLFxuICAgICAgICAgICAgICAgICAgICAgIFtdIGFzIERlY2xhcmF0aW9uW10pXG4gICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uID0+IHRzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLyogcHJvcGVydHlOYW1lICovIHVuZGVmaW5lZCwgZGVjbGFyYXRpb24ubmFtZSkpKSkpO1xuXG4gICAgICBuZXdTdGF0ZW1lbnRzID0gdG1wU3RhdGVtZW50cztcbiAgICB9XG4gICAgLy8gTm90ZTogV2UgY2Fubm90IHVzZSB0cy51cGRhdGVTb3VyY2VmaWxlIGhlcmUgYXNcbiAgICAvLyBpdCBkb2VzIG5vdCB3b3JrIHdlbGwgd2l0aCBkZWNvcmF0b3JzLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzE3Mzg0XG4gICAgY29uc3QgbmV3U2YgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoc291cmNlRmlsZSk7XG4gICAgaWYgKCEoc291cmNlRmlsZS5mbGFncyAmIHRzLk5vZGVGbGFncy5TeW50aGVzaXplZCkpIHtcbiAgICAgIG5ld1NmLmZsYWdzICY9IH50cy5Ob2RlRmxhZ3MuU3ludGhlc2l6ZWQ7XG4gICAgfVxuICAgIG5ld1NmLnN0YXRlbWVudHMgPSB0cy5zZXRUZXh0UmFuZ2UodHMuY3JlYXRlTm9kZUFycmF5KG5ld1N0YXRlbWVudHMpLCBzb3VyY2VGaWxlLnN0YXRlbWVudHMpO1xuICAgIHJldHVybiBuZXdTZjtcbiAgfVxuXG4gIHJldHVybiB2aXNpdFNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50Rm9yRGVjbGFyYXRpb25zKGRlY2xhcmF0aW9uczogRGVjbGFyYXRpb25bXSk6IHRzLlZhcmlhYmxlU3RhdGVtZW50IHtcbiAgY29uc3QgdmFyRGVjbHMgPSBkZWNsYXJhdGlvbnMubWFwKFxuICAgICAgaSA9PiB0cy5jcmVhdGVWYXJpYWJsZURlY2xhcmF0aW9uKGkubmFtZSwgLyogdHlwZSAqLyB1bmRlZmluZWQsIGkubm9kZSBhcyB0cy5FeHByZXNzaW9uKSk7XG4gIHJldHVybiB0cy5jcmVhdGVWYXJpYWJsZVN0YXRlbWVudChcbiAgICAgIC8qIG1vZGlmaWVycyAqLyB1bmRlZmluZWQsIHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KHZhckRlY2xzLCB0cy5Ob2RlRmxhZ3MuQ29uc3QpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4cHJlc3Npb25Mb3dlcmluZ1RyYW5zZm9ybUZhY3RvcnkoXG4gICAgcmVxdWVzdHNNYXA6IFJlcXVlc3RzTWFwLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT5cbiAgICAoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSkgPT4gdHMuU291cmNlRmlsZSB7XG4gIC8vIFJldHVybiB0aGUgZmFjdG9yeVxuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlID0+IHtcbiAgICAvLyBXZSBuZWVkIHRvIHVzZSB0aGUgb3JpZ2luYWwgU291cmNlRmlsZSBmb3IgcmVhZGluZyBtZXRhZGF0YSwgYW5kIG5vdCB0aGUgdHJhbnNmb3JtZWQgb25lLlxuICAgIGNvbnN0IG9yaWdpbmFsRmlsZSA9IHByb2dyYW0uZ2V0U291cmNlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lKTtcbiAgICBpZiAob3JpZ2luYWxGaWxlKSB7XG4gICAgICBjb25zdCByZXF1ZXN0cyA9IHJlcXVlc3RzTWFwLmdldFJlcXVlc3RzKG9yaWdpbmFsRmlsZSk7XG4gICAgICBpZiAocmVxdWVzdHMgJiYgcmVxdWVzdHMuc2l6ZSkge1xuICAgICAgICByZXR1cm4gdHJhbnNmb3JtU291cmNlRmlsZShzb3VyY2VGaWxlLCByZXF1ZXN0cywgY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2VGaWxlO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcXVlc3RzTWFwIHsgZ2V0UmVxdWVzdHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFJlcXVlc3RMb2NhdGlvbk1hcDsgfVxuXG5pbnRlcmZhY2UgTWV0YWRhdGFBbmRMb3dlcmluZ1JlcXVlc3RzIHtcbiAgbWV0YWRhdGE6IE1vZHVsZU1ldGFkYXRhfHVuZGVmaW5lZDtcbiAgcmVxdWVzdHM6IFJlcXVlc3RMb2NhdGlvbk1hcDtcbn1cblxuZnVuY3Rpb24gaXNFbGlnaWJsZUZvckxvd2VyaW5nKG5vZGU6IHRzLk5vZGUgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGU6XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRGVjb3JhdG9yOlxuICAgICAgICAvLyBMb3dlciBleHByZXNzaW9ucyB0aGF0IGFyZSBsb2NhbCB0byB0aGUgbW9kdWxlIHNjb3BlIG9yXG4gICAgICAgIC8vIGluIGEgZGVjb3JhdG9yLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkVudW1EZWNsYXJhdGlvbjpcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAvLyBEb24ndCBsb3dlciBleHByZXNzaW9ucyBpbiBhIGRlY2xhcmF0aW9uLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgLy8gQXZvaWQgbG93ZXJpbmcgZXhwcmVzc2lvbnMgYWxyZWFkeSBpbiBhbiBleHBvcnRlZCB2YXJpYWJsZSBkZWNsYXJhdGlvblxuICAgICAgICByZXR1cm4gKHRzLmdldENvbWJpbmVkTW9kaWZpZXJGbGFncyhub2RlIGFzIHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pICZcbiAgICAgICAgICAgICAgICB0cy5Nb2RpZmllckZsYWdzLkV4cG9ydCkgPT0gMDtcbiAgICB9XG4gICAgcmV0dXJuIGlzRWxpZ2libGVGb3JMb3dlcmluZyhub2RlLnBhcmVudCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKHZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIE9iamVjdCh2YWx1ZSkgIT09IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc1Jld3JpdHRlbih2YWx1ZTogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBpc01ldGFkYXRhR2xvYmFsUmVmZXJlbmNlRXhwcmVzc2lvbih2YWx1ZSkgJiYgaXNMb3dlcmVkU3ltYm9sKHZhbHVlLm5hbWUpO1xufVxuXG5mdW5jdGlvbiBpc0xpdGVyYWxGaWVsZE5hbWVkKG5vZGU6IHRzLk5vZGUsIG5hbWVzOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBpZiAobm9kZS5wYXJlbnQgJiYgbm9kZS5wYXJlbnQua2luZCA9PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QXNzaWdubWVudCkge1xuICAgIGNvbnN0IHByb3BlcnR5ID0gbm9kZS5wYXJlbnQgYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuICAgIGlmIChwcm9wZXJ0eS5wYXJlbnQgJiYgcHJvcGVydHkucGFyZW50LmtpbmQgPT0gdHMuU3ludGF4S2luZC5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiAmJlxuICAgICAgICBwcm9wZXJ0eS5uYW1lICYmIHByb3BlcnR5Lm5hbWUua2luZCA9PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5TmFtZSA9IHByb3BlcnR5Lm5hbWUgYXMgdHMuSWRlbnRpZmllcjtcbiAgICAgIHJldHVybiBuYW1lcy5oYXMocHJvcGVydHlOYW1lLnRleHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjbGFzcyBMb3dlck1ldGFkYXRhVHJhbnNmb3JtIGltcGxlbWVudHMgUmVxdWVzdHNNYXAsIE1ldGFkYXRhVHJhbnNmb3JtZXIge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBjYWNoZSAhOiBNZXRhZGF0YUNhY2hlO1xuICBwcml2YXRlIHJlcXVlc3RzID0gbmV3IE1hcDxzdHJpbmcsIFJlcXVlc3RMb2NhdGlvbk1hcD4oKTtcbiAgcHJpdmF0ZSBsb3dlcmFibGVGaWVsZE5hbWVzOiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3Rvcihsb3dlcmFibGVGaWVsZE5hbWVzOiBzdHJpbmdbXSkge1xuICAgIHRoaXMubG93ZXJhYmxlRmllbGROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPihsb3dlcmFibGVGaWVsZE5hbWVzKTtcbiAgfVxuXG4gIC8vIFJlcXVlc3RNYXBcbiAgZ2V0UmVxdWVzdHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFJlcXVlc3RMb2NhdGlvbk1hcCB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMucmVxdWVzdHMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAvLyBGb3JjZSB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgc291cmNlIGZpbGUgdG8gYmUgY29sbGVjdGVkIHdoaWNoXG4gICAgICAvLyB3aWxsIHJlY3Vyc2l2ZWx5IGNhbGwgc3RhcnQoKSBwb3B1bGF0aW5nIHRoZSByZXF1ZXN0IG1hcDtcbiAgICAgIHRoaXMuY2FjaGUuZ2V0TWV0YWRhdGEoc291cmNlRmlsZSk7XG5cbiAgICAgIC8vIElmIHdlIHN0aWxsIGRvbid0IGhhdmUgdGhlIHJlcXVlc3RlZCBtZXRhZGF0YSwgdGhlIGZpbGUgaXMgbm90IGEgbW9kdWxlXG4gICAgICAvLyBvciBpcyBhIGRlY2xhcmF0aW9uIGZpbGUgc28gcmV0dXJuIGFuIGVtcHR5IG1hcC5cbiAgICAgIHJlc3VsdCA9IHRoaXMucmVxdWVzdHMuZ2V0KHNvdXJjZUZpbGUuZmlsZU5hbWUpIHx8IG5ldyBNYXA8bnVtYmVyLCBMb3dlcmluZ1JlcXVlc3Q+KCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBNZXRhZGF0YVRyYW5zZm9ybWVyXG4gIGNvbm5lY3QoY2FjaGU6IE1ldGFkYXRhQ2FjaGUpOiB2b2lkIHsgdGhpcy5jYWNoZSA9IGNhY2hlOyB9XG5cbiAgc3RhcnQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFZhbHVlVHJhbnNmb3JtfHVuZGVmaW5lZCB7XG4gICAgbGV0IGlkZW50TnVtYmVyID0gMDtcbiAgICBjb25zdCBmcmVzaElkZW50ID0gKCkgPT4gY3JlYXRlTG93ZXJlZFN5bWJvbChpZGVudE51bWJlcisrKTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IG5ldyBNYXA8bnVtYmVyLCBMb3dlcmluZ1JlcXVlc3Q+KCk7XG4gICAgdGhpcy5yZXF1ZXN0cy5zZXQoc291cmNlRmlsZS5maWxlTmFtZSwgcmVxdWVzdHMpO1xuXG4gICAgY29uc3QgcmVwbGFjZU5vZGUgPSAobm9kZTogdHMuTm9kZSkgPT4ge1xuICAgICAgY29uc3QgbmFtZSA9IGZyZXNoSWRlbnQoKTtcbiAgICAgIHJlcXVlc3RzLnNldChub2RlLnBvcywge25hbWUsIGtpbmQ6IG5vZGUua2luZCwgbG9jYXRpb246IG5vZGUucG9zLCBlbmQ6IG5vZGUuZW5kfSk7XG4gICAgICByZXR1cm4ge19fc3ltYm9saWM6ICdyZWZlcmVuY2UnLCBuYW1lfTtcbiAgICB9O1xuXG4gICAgY29uc3QgaXNFeHBvcnRlZFN5bWJvbCA9ICgoKSA9PiB7XG4gICAgICBsZXQgZXhwb3J0VGFibGU6IFNldDxzdHJpbmc+O1xuICAgICAgcmV0dXJuIChub2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAgIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgY29uc3QgaWRlbnQgPSBub2RlIGFzIHRzLklkZW50aWZpZXI7XG5cbiAgICAgICAgICBpZiAoIWV4cG9ydFRhYmxlKSB7XG4gICAgICAgICAgICBleHBvcnRUYWJsZSA9IGNyZWF0ZUV4cG9ydFRhYmxlRm9yKHNvdXJjZUZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZXhwb3J0VGFibGUuaGFzKGlkZW50LnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSkoKTtcblxuICAgIGNvbnN0IGlzRXhwb3J0ZWRQcm9wZXJ0eUFjY2VzcyA9IChub2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgICBjb25zdCBwYWUgPSBub2RlIGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKGlzRXhwb3J0ZWRTeW1ib2wocGFlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgY29uc3QgaGFzTG93ZXJhYmxlUGFyZW50Q2FjaGUgPSBuZXcgTWFwPHRzLk5vZGUsIGJvb2xlYW4+KCk7XG5cbiAgICBjb25zdCBzaG91bGRCZUxvd2VyZWQgPSAobm9kZTogdHMuTm9kZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgbG93ZXJhYmxlOiBib29sZWFuID0gZmFsc2U7XG4gICAgICBpZiAoKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5BcnJvd0Z1bmN0aW9uIHx8XG4gICAgICAgICAgIG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5GdW5jdGlvbkV4cHJlc3Npb24pICYmXG4gICAgICAgICAgaXNFbGlnaWJsZUZvckxvd2VyaW5nKG5vZGUpKSB7XG4gICAgICAgIGxvd2VyYWJsZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIGlzTGl0ZXJhbEZpZWxkTmFtZWQobm9kZSwgdGhpcy5sb3dlcmFibGVGaWVsZE5hbWVzKSAmJiBpc0VsaWdpYmxlRm9yTG93ZXJpbmcobm9kZSkgJiZcbiAgICAgICAgICAhaXNFeHBvcnRlZFN5bWJvbChub2RlKSAmJiAhaXNFeHBvcnRlZFByb3BlcnR5QWNjZXNzKG5vZGUpKSB7XG4gICAgICAgIGxvd2VyYWJsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG93ZXJhYmxlO1xuICAgIH07XG5cbiAgICBjb25zdCBoYXNMb3dlcmFibGVQYXJlbnQgPSAobm9kZTogdHMuTm9kZSB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWhhc0xvd2VyYWJsZVBhcmVudENhY2hlLmhhcyhub2RlKSkge1xuICAgICAgICBoYXNMb3dlcmFibGVQYXJlbnRDYWNoZS5zZXQoXG4gICAgICAgICAgICBub2RlLCBzaG91bGRCZUxvd2VyZWQobm9kZS5wYXJlbnQpIHx8IGhhc0xvd2VyYWJsZVBhcmVudChub2RlLnBhcmVudCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc0xvd2VyYWJsZVBhcmVudENhY2hlLmdldChub2RlKSAhO1xuICAgIH07XG5cbiAgICBjb25zdCBpc0xvd2VyYWJsZSA9IChub2RlOiB0cy5Ob2RlIHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzaG91bGRCZUxvd2VyZWQobm9kZSkgJiYgIWhhc0xvd2VyYWJsZVBhcmVudChub2RlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuICh2YWx1ZTogTWV0YWRhdGFWYWx1ZSwgbm9kZTogdHMuTm9kZSk6IE1ldGFkYXRhVmFsdWUgPT4ge1xuICAgICAgaWYgKCFpc1ByaW1pdGl2ZSh2YWx1ZSkgJiYgIWlzUmV3cml0dGVuKHZhbHVlKSAmJiBpc0xvd2VyYWJsZShub2RlKSkge1xuICAgICAgICByZXR1cm4gcmVwbGFjZU5vZGUobm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVFeHBvcnRUYWJsZUZvcihzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU2V0PHN0cmluZz4ge1xuICBjb25zdCBleHBvcnRUYWJsZSA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAvLyBMYXppbHkgY29sbGVjdCBhbGwgdGhlIGV4cG9ydHMgZnJvbSB0aGUgc291cmNlIGZpbGVcbiAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIGZ1bmN0aW9uIHNjYW4obm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbjpcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uOlxuICAgICAgICBpZiAoKHRzLmdldENvbWJpbmVkTW9kaWZpZXJGbGFncyhub2RlIGFzIHRzLkRlY2xhcmF0aW9uKSAmIHRzLk1vZGlmaWVyRmxhZ3MuRXhwb3J0KSAhPSAwKSB7XG4gICAgICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9XG4gICAgICAgICAgICAgIG5vZGUgYXModHMuQ2xhc3NEZWNsYXJhdGlvbiB8IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24gfCB0cy5JbnRlcmZhY2VEZWNsYXJhdGlvbik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IGNsYXNzRGVjbGFyYXRpb24ubmFtZTtcbiAgICAgICAgICBpZiAobmFtZSkgZXhwb3J0VGFibGUuYWRkKG5hbWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQ6XG4gICAgICAgIGNvbnN0IHZhcmlhYmxlU3RhdGVtZW50ID0gbm9kZSBhcyB0cy5WYXJpYWJsZVN0YXRlbWVudDtcbiAgICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiB2YXJpYWJsZVN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSB7XG4gICAgICAgICAgc2NhbihkZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIHRzLlN5bnRheEtpbmQuVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgY29uc3QgdmFyaWFibGVEZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKCh0cy5nZXRDb21iaW5lZE1vZGlmaWVyRmxhZ3ModmFyaWFibGVEZWNsYXJhdGlvbikgJiB0cy5Nb2RpZmllckZsYWdzLkV4cG9ydCkgIT0gMCAmJlxuICAgICAgICAgICAgdmFyaWFibGVEZWNsYXJhdGlvbi5uYW1lLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHZhcmlhYmxlRGVjbGFyYXRpb24ubmFtZSBhcyB0cy5JZGVudGlmaWVyO1xuICAgICAgICAgIGV4cG9ydFRhYmxlLmFkZChuYW1lLnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkV4cG9ydERlY2xhcmF0aW9uOlxuICAgICAgICBjb25zdCBleHBvcnREZWNsYXJhdGlvbiA9IG5vZGUgYXMgdHMuRXhwb3J0RGVjbGFyYXRpb247XG4gICAgICAgIGNvbnN0IHttb2R1bGVTcGVjaWZpZXIsIGV4cG9ydENsYXVzZX0gPSBleHBvcnREZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKCFtb2R1bGVTcGVjaWZpZXIgJiYgZXhwb3J0Q2xhdXNlKSB7XG4gICAgICAgICAgZXhwb3J0Q2xhdXNlLmVsZW1lbnRzLmZvckVhY2goc3BlYyA9PiB7IGV4cG9ydFRhYmxlLmFkZChzcGVjLm5hbWUudGV4dCk7IH0pO1xuICAgICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV4cG9ydFRhYmxlO1xufVxuIl19