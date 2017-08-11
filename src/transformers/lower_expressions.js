"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var tsc_wrapped_1 = require("@angular/tsc-wrapped");
var ts = require("typescript");
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
    var min = Math.min.apply(Math, locations);
    var max = Math.max.apply(Math, locations);
    // Visit nodes matching the request and synthetic nodes added by tsickle
    function shouldVisit(pos, end) {
        return (pos <= max && end >= min) || pos == -1;
    }
    function visitSourceFile(sourceFile) {
        function topLevelStatement(node) {
            var declarations = [];
            function visitNode(node) {
                // Get the original node before tsickle
                var _a = ts.getOriginalNode(node), pos = _a.pos, end = _a.end, kind = _a.kind;
                var nodeRequest = requests.get(pos);
                if (nodeRequest && nodeRequest.kind == kind && nodeRequest.end == end) {
                    // This node is requested to be rewritten as a reference to the exported name.
                    // Record that the node needs to be moved to an exported variable with the given name
                    var name_1 = nodeRequest.name;
                    declarations.push({ name: name_1, node: node });
                    return ts.createIdentifier(name_1);
                }
                var result = node;
                if (shouldVisit(pos, end) && !isLexicalScope(node)) {
                    result = ts.visitEachChild(node, visitNode, context);
                }
                return result;
            }
            // Get the original node before tsickle
            var _a = ts.getOriginalNode(node), pos = _a.pos, end = _a.end;
            var result = shouldVisit(pos, end) ? ts.visitEachChild(node, visitNode, context) : node;
            if (declarations.length) {
                inserts.push({ priorTo: result, declarations: declarations });
            }
            return result;
        }
        var traversedSource = ts.visitEachChild(sourceFile, topLevelStatement, context);
        if (inserts.length) {
            // Insert the declarations before the rewritten statement that references them.
            var insertMap = toMap(inserts, function (i) { return i.priorTo; });
            var newStatements = traversedSource.statements.slice();
            for (var i = newStatements.length; i >= 0; i--) {
                var statement = newStatements[i];
                var insert = insertMap.get(statement);
                if (insert) {
                    var declarations = insert.declarations.map(function (i) { return ts.createVariableDeclaration(i.name, /* type */ undefined, i.node); });
                    var statement_1 = ts.createVariableStatement(
                    /* modifiers */ undefined, ts.createVariableDeclarationList(declarations, ts.NodeFlags.Const));
                    newStatements.splice(i, 0, statement_1);
                }
            }
            // Insert an exports clause to export the declarations
            newStatements.push(ts.createExportDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ undefined, ts.createNamedExports(inserts
                .reduce(function (accumulator, insert) { return accumulator.concat(insert.declarations); }, [])
                .map(function (declaration) { return ts.createExportSpecifier(
            /* propertyName */ undefined, declaration.name); }))));
            return ts.updateSourceFileNode(traversedSource, newStatements);
        }
        return traversedSource;
    }
    return visitSourceFile(sourceFile);
}
function getExpressionLoweringTransformFactory(requestsMap) {
    // Return the factory
    return function (context) { return function (sourceFile) {
        var requests = requestsMap.getRequests(sourceFile);
        if (requests && requests.size) {
            return transformSourceFile(sourceFile, requests, context);
        }
        return sourceFile;
    }; };
}
exports.getExpressionLoweringTransformFactory = getExpressionLoweringTransformFactory;
function shouldLower(node) {
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
        return shouldLower(node.parent);
    }
    return true;
}
var LowerMetadataCache = (function () {
    function LowerMetadataCache(options, strict) {
        this.strict = strict;
        this.metadataCache = new Map();
        this.collector = new tsc_wrapped_1.MetadataCollector(options);
    }
    LowerMetadataCache.prototype.getMetadata = function (sourceFile) {
        return this.ensureMetadataAndRequests(sourceFile).metadata;
    };
    LowerMetadataCache.prototype.getRequests = function (sourceFile) {
        return this.ensureMetadataAndRequests(sourceFile).requests;
    };
    LowerMetadataCache.prototype.ensureMetadataAndRequests = function (sourceFile) {
        var result = this.metadataCache.get(sourceFile.fileName);
        if (!result) {
            result = this.getMetadataAndRequests(sourceFile);
            this.metadataCache.set(sourceFile.fileName, result);
        }
        return result;
    };
    LowerMetadataCache.prototype.getMetadataAndRequests = function (sourceFile) {
        var identNumber = 0;
        var freshIdent = function () { return '\u0275' + identNumber++; };
        var requests = new Map();
        var replaceNode = function (node) {
            var name = freshIdent();
            requests.set(node.pos, { name: name, kind: node.kind, location: node.pos, end: node.end });
            return { __symbolic: 'reference', name: name };
        };
        var substituteExpression = function (value, node) {
            if ((node.kind === ts.SyntaxKind.ArrowFunction ||
                node.kind === ts.SyntaxKind.FunctionExpression) &&
                shouldLower(node)) {
                return replaceNode(node);
            }
            return value;
        };
        var metadata = this.collector.getMetadata(sourceFile, this.strict, substituteExpression);
        return { metadata: metadata, requests: requests };
    };
    return LowerMetadataCache;
}());
exports.LowerMetadataCache = LowerMetadataCache;
//# sourceMappingURL=lower_expressions.js.map