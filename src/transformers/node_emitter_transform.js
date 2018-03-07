"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var node_emitter_1 = require("./node_emitter");
var util_1 = require("./util");
function getPreamble(original) {
    return "/**\n * @fileoverview This file was generated by the Angular template compiler. Do not edit.\n * " + original + "\n * @suppress {suspiciousCode,uselessCode,missingProperties,missingOverride,checkTypes}\n * tslint:disable\n */";
}
/**
 * Returns a transformer that does two things for generated files (ngfactory etc):
 * - adds a fileoverview JSDoc comment containing Closure Compiler specific "suppress"ions in JSDoc.
 *   The new comment will contain any fileoverview comment text from the original source file this
 *   file was generated from.
 * - updates generated files that are not in the given map of generatedFiles to have an empty
 *   list of statements as their body.
 */
function getAngularEmitterTransformFactory(generatedFiles, program) {
    return function () {
        var emitter = new node_emitter_1.TypeScriptNodeEmitter();
        return function (sourceFile) {
            var g = generatedFiles.get(sourceFile.fileName);
            var orig = g && program.getSourceFile(g.srcFileUrl);
            var originalComment = '';
            if (orig)
                originalComment = getFileoverviewComment(orig);
            var preamble = getPreamble(originalComment);
            if (g && g.stmts) {
                var orig_1 = program.getSourceFile(g.srcFileUrl);
                var originalComment_1 = '';
                if (orig_1)
                    originalComment_1 = getFileoverviewComment(orig_1);
                var newSourceFile = emitter.updateSourceFile(sourceFile, g.stmts, preamble)[0];
                return newSourceFile;
            }
            else if (util_1.GENERATED_FILES.test(sourceFile.fileName)) {
                // The file should be empty, but emitter.updateSourceFile would still add imports
                // and various minutiae.
                // Clear out the source file entirely, only including the preamble comment, so that
                // ngc produces an empty .js file.
                return ts.updateSourceFileNode(sourceFile, [emitter.createCommentStatement(sourceFile, preamble)]);
            }
            return sourceFile;
        };
    };
}
exports.getAngularEmitterTransformFactory = getAngularEmitterTransformFactory;
/**
 * Parses and returns the comment text (without start and end markers) of a \@fileoverview comment
 * in the given source file. Returns the empty string if no such comment can be found.
 */
function getFileoverviewComment(sourceFile) {
    var trivia = sourceFile.getFullText().substring(0, sourceFile.getStart());
    var leadingComments = ts.getLeadingCommentRanges(trivia, 0);
    if (!leadingComments || leadingComments.length === 0)
        return '';
    var comment = leadingComments[0];
    if (comment.kind !== ts.SyntaxKind.MultiLineCommentTrivia)
        return '';
    // Only comments separated with a \n\n from the file contents are considered file-level comments
    // in TypeScript.
    if (sourceFile.getFullText().substring(comment.end, comment.end + 2) !== '\n\n')
        return '';
    var commentText = sourceFile.getFullText().substring(comment.pos, comment.end);
    // Closure Compiler ignores @suppress and similar if the comment contains @license.
    if (commentText.indexOf('@license') !== -1)
        return '';
    return commentText.replace(/^\/\*\*/, '').replace(/ ?\*\/$/, '');
}
//# sourceMappingURL=node_emitter_transform.js.map