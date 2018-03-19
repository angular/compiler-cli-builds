"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("@angular/compiler");
const ts = require("typescript");
const index_1 = require("../metadata/index");
function toMap(items, select) {
    return new Map(items.map(i => [select(i), i]));
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
    const inserts = [];
    // Calculate the range of interesting locations. The transform will only visit nodes in this
    // range to improve the performance on large files.
    const locations = Array.from(requests.keys());
    const min = Math.min(...locations);
    const max = Math.max(...locations);
    // Visit nodes matching the request and synthetic nodes added by tsickle
    function shouldVisit(pos, end) {
        return (pos <= max && end >= min) || pos == -1;
    }
    function visitSourceFile(sourceFile) {
        function topLevelStatement(node) {
            const declarations = [];
            function visitNode(node) {
                // Get the original node before tsickle
                const { pos, end, kind, parent: originalParent } = ts.getOriginalNode(node);
                const nodeRequest = requests.get(pos);
                if (nodeRequest && nodeRequest.kind == kind && nodeRequest.end == end) {
                    // This node is requested to be rewritten as a reference to the exported name.
                    if (originalParent && originalParent.kind === ts.SyntaxKind.VariableDeclaration) {
                        // As the value represents the whole initializer of a variable declaration,
                        // just refer to that variable. This e.g. helps to preserve closure comments
                        // at the right place.
                        const varParent = originalParent;
                        if (varParent.name.kind === ts.SyntaxKind.Identifier) {
                            const varName = varParent.name.text;
                            const exportName = nodeRequest.name;
                            declarations.push({
                                name: exportName,
                                node: ts.createIdentifier(varName),
                                order: 1 /* AfterStmt */
                            });
                            return node;
                        }
                    }
                    // Record that the node needs to be moved to an exported variable with the given name
                    const exportName = nodeRequest.name;
                    declarations.push({ name: exportName, node, order: 0 /* BeforeStmt */ });
                    return ts.createIdentifier(exportName);
                }
                let result = node;
                if (shouldVisit(pos, end) && !isLexicalScope(node)) {
                    result = ts.visitEachChild(node, visitNode, context);
                }
                return result;
            }
            // Get the original node before tsickle
            const { pos, end } = ts.getOriginalNode(node);
            let resultStmt;
            if (shouldVisit(pos, end)) {
                resultStmt = ts.visitEachChild(node, visitNode, context);
            }
            else {
                resultStmt = node;
            }
            if (declarations.length) {
                inserts.push({ relativeTo: resultStmt, declarations });
            }
            return resultStmt;
        }
        let newStatements = sourceFile.statements.map(topLevelStatement);
        if (inserts.length) {
            // Insert the declarations relative to the rewritten statement that references them.
            const insertMap = toMap(inserts, i => i.relativeTo);
            const tmpStatements = [];
            newStatements.forEach(statement => {
                const insert = insertMap.get(statement);
                if (insert) {
                    const before = insert.declarations.filter(d => d.order === 0 /* BeforeStmt */);
                    if (before.length) {
                        tmpStatements.push(createVariableStatementForDeclarations(before));
                    }
                    tmpStatements.push(statement);
                    const after = insert.declarations.filter(d => d.order === 1 /* AfterStmt */);
                    if (after.length) {
                        tmpStatements.push(createVariableStatementForDeclarations(after));
                    }
                }
                else {
                    tmpStatements.push(statement);
                }
            });
            // Insert an exports clause to export the declarations
            tmpStatements.push(ts.createExportDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ undefined, ts.createNamedExports(inserts
                .reduce((accumulator, insert) => [...accumulator, ...insert.declarations], [])
                .map(declaration => ts.createExportSpecifier(
            /* propertyName */ undefined, declaration.name)))));
            newStatements = tmpStatements;
        }
        // Note: We cannot use ts.updateSourcefile here as
        // it does not work well with decorators.
        // See https://github.com/Microsoft/TypeScript/issues/17384
        const newSf = ts.getMutableClone(sourceFile);
        if (!(sourceFile.flags & ts.NodeFlags.Synthesized)) {
            newSf.flags &= ~ts.NodeFlags.Synthesized;
        }
        newSf.statements = ts.setTextRange(ts.createNodeArray(newStatements), sourceFile.statements);
        return newSf;
    }
    return visitSourceFile(sourceFile);
}
function createVariableStatementForDeclarations(declarations) {
    const varDecls = declarations.map(i => ts.createVariableDeclaration(i.name, /* type */ undefined, i.node));
    return ts.createVariableStatement(
    /* modifiers */ undefined, ts.createVariableDeclarationList(varDecls, ts.NodeFlags.Const));
}
function getExpressionLoweringTransformFactory(requestsMap, program) {
    // Return the factory
    return (context) => (sourceFile) => {
        // We need to use the original SourceFile for reading metadata, and not the transformed one.
        const originalFile = program.getSourceFile(sourceFile.fileName);
        if (originalFile) {
            const requests = requestsMap.getRequests(originalFile);
            if (requests && requests.size) {
                return transformSourceFile(sourceFile, requests, context);
            }
        }
        return sourceFile;
    };
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
                return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) == 0;
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
        const property = node.parent;
        if (property.parent && property.parent.kind == ts.SyntaxKind.ObjectLiteralExpression &&
            property.name && property.name.kind == ts.SyntaxKind.Identifier) {
            const propertyName = property.name;
            return names.has(propertyName.text);
        }
    }
    return false;
}
class LowerMetadataTransform {
    constructor(lowerableFieldNames) {
        this.requests = new Map();
        this.lowerableFieldNames = new Set(lowerableFieldNames);
    }
    // RequestMap
    getRequests(sourceFile) {
        let result = this.requests.get(sourceFile.fileName);
        if (!result) {
            // Force the metadata for this source file to be collected which
            // will recursively call start() populating the request map;
            this.cache.getMetadata(sourceFile);
            // If we still don't have the requested metadata, the file is not a module
            // or is a declaration file so return an empty map.
            result = this.requests.get(sourceFile.fileName) || new Map();
        }
        return result;
    }
    // MetadataTransformer
    connect(cache) { this.cache = cache; }
    start(sourceFile) {
        let identNumber = 0;
        const freshIdent = () => compiler_1.createLoweredSymbol(identNumber++);
        const requests = new Map();
        this.requests.set(sourceFile.fileName, requests);
        const replaceNode = (node) => {
            const name = freshIdent();
            requests.set(node.pos, { name, kind: node.kind, location: node.pos, end: node.end });
            return { __symbolic: 'reference', name };
        };
        const isExportedSymbol = (() => {
            let exportTable;
            return (node) => {
                if (node.kind == ts.SyntaxKind.Identifier) {
                    const ident = node;
                    if (!exportTable) {
                        exportTable = createExportTableFor(sourceFile);
                    }
                    return exportTable.has(ident.text);
                }
                return false;
            };
        })();
        const isExportedPropertyAccess = (node) => {
            if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
                const pae = node;
                if (isExportedSymbol(pae.expression)) {
                    return true;
                }
            }
            return false;
        };
        const hasLowerableParentCache = new Map();
        const shouldBeLowered = (node) => {
            if (node === undefined) {
                return false;
            }
            let lowerable = false;
            if ((node.kind === ts.SyntaxKind.ArrowFunction ||
                node.kind === ts.SyntaxKind.FunctionExpression) &&
                isEligibleForLowering(node)) {
                lowerable = true;
            }
            else if (isLiteralFieldNamed(node, this.lowerableFieldNames) && isEligibleForLowering(node) &&
                !isExportedSymbol(node) && !isExportedPropertyAccess(node)) {
                lowerable = true;
            }
            return lowerable;
        };
        const hasLowerableParent = (node) => {
            if (node === undefined) {
                return false;
            }
            if (!hasLowerableParentCache.has(node)) {
                hasLowerableParentCache.set(node, shouldBeLowered(node.parent) || hasLowerableParent(node.parent));
            }
            return hasLowerableParentCache.get(node);
        };
        const isLowerable = (node) => {
            if (node === undefined) {
                return false;
            }
            return shouldBeLowered(node) && !hasLowerableParent(node);
        };
        return (value, node) => {
            if (!isPrimitive(value) && !isRewritten(value) && isLowerable(node)) {
                return replaceNode(node);
            }
            return value;
        };
    }
}
exports.LowerMetadataTransform = LowerMetadataTransform;
function createExportTableFor(sourceFile) {
    const exportTable = new Set();
    // Lazily collect all the exports from the source file
    ts.forEachChild(sourceFile, function scan(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
                if ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) != 0) {
                    const classDeclaration = node;
                    const name = classDeclaration.name;
                    if (name)
                        exportTable.add(name.text);
                }
                break;
            case ts.SyntaxKind.VariableStatement:
                const variableStatement = node;
                for (const declaration of variableStatement.declarationList.declarations) {
                    scan(declaration);
                }
                break;
            case ts.SyntaxKind.VariableDeclaration:
                const variableDeclaration = node;
                if ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) != 0 &&
                    variableDeclaration.name.kind == ts.SyntaxKind.Identifier) {
                    const name = variableDeclaration.name;
                    exportTable.add(name.text);
                }
                break;
            case ts.SyntaxKind.ExportDeclaration:
                const exportDeclaration = node;
                const { moduleSpecifier, exportClause } = exportDeclaration;
                if (!moduleSpecifier && exportClause) {
                    exportClause.elements.forEach(spec => { exportTable.add(spec.name.text); });
                }
        }
    });
    return exportTable;
}
//# sourceMappingURL=lower_expressions.js.map