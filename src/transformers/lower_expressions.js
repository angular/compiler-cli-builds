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
function transformSourceFile(sourceFile, requests, context) {
    var inserts = [];
    // Calculate the range of intersting locations. The transform will only visit nodes in this
    // range to improve the performance on large files.
    var locations = Array.from(requests.keys());
    var min = Math.min.apply(Math, locations);
    var max = Math.max.apply(Math, locations);
    function visitSourceFile(sourceFile) {
        function topLevelStatement(node) {
            var declarations = [];
            function visitNode(node) {
                var nodeRequest = requests.get(node.pos);
                if (nodeRequest && nodeRequest.kind == node.kind && nodeRequest.end == node.end) {
                    // This node is requested to be rewritten as a reference to the exported name.
                    // Record that the node needs to be moved to an exported variable with the given name
                    var name_1 = nodeRequest.name;
                    declarations.push({ name: name_1, node: node });
                    return ts.createIdentifier(name_1);
                }
                if (node.pos <= max && node.end >= min)
                    return ts.visitEachChild(node, visitNode, context);
                return node;
            }
            var result = ts.visitEachChild(node, visitNode, context);
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
            if (node.kind === ts.SyntaxKind.ArrowFunction ||
                node.kind === ts.SyntaxKind.FunctionExpression) {
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