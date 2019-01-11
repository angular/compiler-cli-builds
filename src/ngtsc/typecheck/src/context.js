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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var type_check_block_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block");
    var type_constructor_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor");
    /**
     * A template type checking context for a program.
     *
     * The `TypeCheckContext` allows registration of components and their templates which need to be
     * type checked. It also allows generation of modified `ts.SourceFile`s which contain the type
     * checking code.
     */
    var TypeCheckContext = /** @class */ (function () {
        function TypeCheckContext() {
            /**
             * A `Set` of classes which will be used to generate type constructors.
             */
            this.typeCtors = new Set();
            /**
             * A `Map` of `ts.SourceFile`s that the context has seen to the operations (additions of methods
             * or type-check blocks) that need to be eventually performed on that file.
             */
            this.opMap = new Map();
        }
        /**
         * Record a template for the given component `node`, with a `SelectorMatcher` for directive
         * matching.
         *
         * @param node class of the node being recorded.
         * @param template AST nodes of the template being recorded.
         * @param matcher `SelectorMatcher` which tracks directives that are in scope for this template.
         */
        TypeCheckContext.prototype.addTemplate = function (node, template, matcher) {
            var _this = this;
            // Only write TCBs for named classes.
            if (node.name === undefined) {
                throw new Error("Assertion: class must be named");
            }
            // Bind the template, which will:
            //   - Extract the metadata needed to generate type check blocks.
            //   - Perform directive matching, which informs the context which directives are used in the
            //     template. This allows generation of type constructors for only those directives which
            //     are actually used by the templates.
            var binder = new compiler_1.R3TargetBinder(matcher);
            var boundTarget = binder.bind({ template: template });
            // Get all of the directives used in the template and record type constructors for all of them.
            boundTarget.getUsedDirectives().forEach(function (dir) {
                var dirNode = dir.ref.node;
                // Add a type constructor operation for the directive.
                _this.addTypeCtor(dirNode.getSourceFile(), dirNode, {
                    fnName: 'ngTypeCtor',
                    // The constructor should have a body if the directive comes from a .ts file, but not if it
                    // comes from a .d.ts file. .d.ts declarations don't have bodies.
                    body: !dirNode.getSourceFile().fileName.endsWith('.d.ts'),
                    fields: {
                        inputs: Object.keys(dir.inputs),
                        outputs: Object.keys(dir.outputs),
                        // TODO: support queries
                        queries: dir.queries,
                    },
                });
            });
            // Record the type check block operation for the template itself.
            this.addTypeCheckBlock(node.getSourceFile(), node, {
                boundTarget: boundTarget,
                fnName: node.name.text + "_TypeCheckBlock",
            });
        };
        /**
         * Record a type constructor for the given `node` with the given `ctorMetadata`.
         */
        TypeCheckContext.prototype.addTypeCtor = function (sf, node, ctorMeta) {
            if (this.hasTypeCtor(node)) {
                return;
            }
            // Lazily construct the operation map.
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            // Push a `TypeCtorOp` into the operation queue for the source file.
            ops.push(new TypeCtorOp(node, ctorMeta));
        };
        /**
         * Transform a `ts.SourceFile` into a version that includes type checking code.
         *
         * If this particular source file has no directives that require type constructors, or components
         * that require type check blocks, then it will be returned directly. Otherwise, a new
         * `ts.SourceFile` is parsed from modified text of the original. This is necessary to ensure the
         * added code has correct positional information associated with it.
         */
        TypeCheckContext.prototype.transform = function (sf) {
            // If there are no operations pending for this particular file, return it directly.
            if (!this.opMap.has(sf)) {
                return sf;
            }
            // Imports may need to be added to the file to support type-checking of directives used in the
            // template within it.
            var importManager = new translator_1.ImportManager(new imports_1.NoopImportRewriter(), '_i');
            // Each Op has a splitPoint index into the text where it needs to be inserted. Split the
            // original source text into chunks at these split points, where code will be inserted between
            // the chunks.
            var ops = this.opMap.get(sf).sort(orderOps);
            var textParts = splitStringAtPoints(sf.text, ops.map(function (op) { return op.splitPoint; }));
            // Use a `ts.Printer` to generate source code.
            var printer = ts.createPrinter({ omitTrailingSemicolon: true });
            // Begin with the intial section of the code text.
            var code = textParts[0];
            // Process each operation and use the printer to generate source code for it, inserting it into
            // the source code in between the original chunks.
            ops.forEach(function (op, idx) {
                var text = op.execute(importManager, sf, printer);
                code += text + textParts[idx + 1];
            });
            // Write out the imports that need to be added to the beginning of the file.
            var imports = importManager.getAllImports(sf.fileName)
                .map(function (i) { return "import * as " + i.as + " from '" + i.name + "';"; })
                .join('\n');
            code = imports + '\n' + code;
            // Parse the new source file and return it.
            return ts.createSourceFile(sf.fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        };
        /**
         * Whether the given `node` has a type constructor already.
         */
        TypeCheckContext.prototype.hasTypeCtor = function (node) { return this.typeCtors.has(node); };
        TypeCheckContext.prototype.addTypeCheckBlock = function (sf, node, tcbMeta) {
            if (!this.opMap.has(sf)) {
                this.opMap.set(sf, []);
            }
            var ops = this.opMap.get(sf);
            ops.push(new TcbOp(node, tcbMeta));
        };
        return TypeCheckContext;
    }());
    exports.TypeCheckContext = TypeCheckContext;
    /**
     * A type check block operation which produces type check code for a particular component.
     */
    var TcbOp = /** @class */ (function () {
        function TcbOp(node, meta) {
            this.node = node;
            this.meta = meta;
        }
        Object.defineProperty(TcbOp.prototype, "splitPoint", {
            /**
             * Type check blocks are inserted immediately after the end of the component class.
             */
            get: function () { return this.node.end + 1; },
            enumerable: true,
            configurable: true
        });
        TcbOp.prototype.execute = function (im, sf, printer) {
            var tcb = type_check_block_1.generateTypeCheckBlock(this.node, this.meta, im);
            return printer.printNode(ts.EmitHint.Unspecified, tcb, sf);
        };
        return TcbOp;
    }());
    /**
     * A type constructor operation which produces type constructor code for a particular directive.
     */
    var TypeCtorOp = /** @class */ (function () {
        function TypeCtorOp(node, meta) {
            this.node = node;
            this.meta = meta;
        }
        Object.defineProperty(TypeCtorOp.prototype, "splitPoint", {
            /**
             * Type constructor operations are inserted immediately before the end of the directive class.
             */
            get: function () { return this.node.end - 1; },
            enumerable: true,
            configurable: true
        });
        TypeCtorOp.prototype.execute = function (im, sf, printer) {
            var tcb = type_constructor_1.generateTypeCtor(this.node, this.meta);
            return printer.printNode(ts.EmitHint.Unspecified, tcb, sf);
        };
        return TypeCtorOp;
    }());
    /**
     * Compare two operations and return their split point ordering.
     */
    function orderOps(op1, op2) {
        return op1.splitPoint - op2.splitPoint;
    }
    /**
     * Split a string into chunks at any number of split points.
     */
    function splitStringAtPoints(str, points) {
        var splits = [];
        var start = 0;
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            splits.push(str.substring(start, point));
            start = point;
        }
        splits.push(str.substring(start));
        return splits;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStFO0lBQy9FLCtCQUFpQztJQUVqQyxtRUFBaUQ7SUFDakQseUVBQStDO0lBRy9DLG1HQUEwRDtJQUMxRCxtR0FBb0Q7SUFJcEQ7Ozs7OztPQU1HO0lBQ0g7UUFBQTtZQUNFOztlQUVHO1lBQ0ssY0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1lBRW5EOzs7ZUFHRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQWdJakQsQ0FBQztRQTlIQzs7Ozs7OztXQU9HO1FBQ0gsc0NBQVcsR0FBWCxVQUNJLElBQXlCLEVBQUUsUUFBdUIsRUFDbEQsT0FBb0Q7WUFGeEQsaUJBdUNDO1lBcENDLHFDQUFxQztZQUNyQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7YUFDbkQ7WUFFRCxpQ0FBaUM7WUFDakMsaUVBQWlFO1lBQ2pFLDZGQUE2RjtZQUM3Riw0RkFBNEY7WUFDNUYsMENBQTBDO1lBQzFDLElBQU0sTUFBTSxHQUFHLElBQUkseUJBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQyxDQUFDO1lBRTVDLCtGQUErRjtZQUMvRixXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUN6QyxJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFD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O1lBQ25ELE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQVpELElBWUM7SUFFRDs7T0FFRztJQUNILFNBQVMsUUFBUSxDQUFDLEdBQU8sRUFBRSxHQUFPO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsbUJBQW1CLENBQUMsR0FBVyxFQUFFLE1BQWdCO1FBQ3hELElBQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUM1QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDZjtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UjNUYXJnZXRCaW5kZXIsIFNlbGVjdG9yTWF0Y2hlciwgVG1wbEFzdE5vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05vb3BJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge1R5cGVDaGVja0Jsb2NrTWV0YWRhdGEsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ3Rvck1ldGFkYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUNoZWNrQmxvY2t9IGZyb20gJy4vdHlwZV9jaGVja19ibG9jayc7XG5pbXBvcnQge2dlbmVyYXRlVHlwZUN0b3J9IGZyb20gJy4vdHlwZV9jb25zdHJ1Y3Rvcic7XG5cblxuXG4vKipcbiAqIEEgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb250ZXh0IGZvciBhIHByb2dyYW0uXG4gKlxuICogVGhlIGBUeXBlQ2hlY2tDb250ZXh0YCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIGNvbXBvbmVudHMgYW5kIHRoZWlyIHRlbXBsYXRlcyB3aGljaCBuZWVkIHRvIGJlXG4gKiB0eXBlIGNoZWNrZWQuIEl0IGFsc28gYWxsb3dzIGdlbmVyYXRpb24gb2YgbW9kaWZpZWQgYHRzLlNvdXJjZUZpbGVgcyB3aGljaCBjb250YWluIHRoZSB0eXBlXG4gKiBjaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVHlwZUNoZWNrQ29udGV4dCB7XG4gIC8qKlxuICAgKiBBIGBTZXRgIG9mIGNsYXNzZXMgd2hpY2ggd2lsbCBiZSB1c2VkIHRvIGdlbmVyYXRlIHR5cGUgY29uc3RydWN0b3JzLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlQ3RvcnMgPSBuZXcgU2V0PHRzLkNsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHRlbXBsYXRlIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50IGBub2RlYCwgd2l0aCBhIGBTZWxlY3Rvck1hdGNoZXJgIGZvciBkaXJlY3RpdmVcbiAgICogbWF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGNsYXNzIG9mIHRoZSBub2RlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgQVNUIG5vZGVzIG9mIHRoZSB0ZW1wbGF0ZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIG1hdGNoZXIgYFNlbGVjdG9yTWF0Y2hlcmAgd2hpY2ggdHJhY2tzIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHRlbXBsYXRlOiBUbXBsQXN0Tm9kZVtdLFxuICAgICAgbWF0Y2hlcjogU2VsZWN0b3JNYXRjaGVyPFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPik6IHZvaWQge1xuICAgIC8vIE9ubHkgd3JpdGUgVENCcyBmb3IgbmFtZWQgY2xhc3Nlcy5cbiAgICBpZiAobm9kZS5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uOiBjbGFzcyBtdXN0IGJlIG5hbWVkYCk7XG4gICAgfVxuXG4gICAgLy8gQmluZCB0aGUgdGVtcGxhdGUsIHdoaWNoIHdpbGw6XG4gICAgLy8gICAtIEV4dHJhY3QgdGhlIG1ldGFkYXRhIG5lZWRlZCB0byBnZW5lcmF0ZSB0eXBlIGNoZWNrIGJsb2Nrcy5cbiAgICAvLyAgIC0gUGVyZm9ybSBkaXJlY3RpdmUgbWF0Y2hpbmcsIHdoaWNoIGluZm9ybXMgdGhlIGNvbnRleHQgd2hpY2ggZGlyZWN0aXZlcyBhcmUgdXNlZCBpbiB0aGVcbiAgICAvLyAgICAgdGVtcGxhdGUuIFRoaXMgYWxsb3dzIGdlbmVyYXRpb24gb2YgdHlwZSBjb25zdHJ1Y3RvcnMgZm9yIG9ubHkgdGhvc2UgZGlyZWN0aXZlcyB3aGljaFxuICAgIC8vICAgICBhcmUgYWN0dWFsbHkgdXNlZCBieSB0aGUgdGVtcGxhdGVzLlxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICBjb25zdCBib3VuZFRhcmdldCA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZX0pO1xuXG4gICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIHR5cGUgY29uc3RydWN0b3JzIGZvciBhbGwgb2YgdGhlbS5cbiAgICBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXIucmVmLm5vZGU7XG4gICAgICAvLyBBZGQgYSB0eXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbiBmb3IgdGhlIGRpcmVjdGl2ZS5cbiAgICAgIHRoaXMuYWRkVHlwZUN0b3IoZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCksIGRpck5vZGUsIHtcbiAgICAgICAgZm5OYW1lOiAnbmdUeXBlQ3RvcicsXG4gICAgICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBzaG91bGQgaGF2ZSBhIGJvZHkgaWYgdGhlIGRpcmVjdGl2ZSBjb21lcyBmcm9tIGEgLnRzIGZpbGUsIGJ1dCBub3QgaWYgaXRcbiAgICAgICAgLy8gY29tZXMgZnJvbSBhIC5kLnRzIGZpbGUuIC5kLnRzIGRlY2xhcmF0aW9ucyBkb24ndCBoYXZlIGJvZGllcy5cbiAgICAgICAgYm9keTogIWRpck5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpLFxuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBpbnB1dHM6IE9iamVjdC5rZXlzKGRpci5pbnB1dHMpLFxuICAgICAgICAgIG91dHB1dHM6IE9iamVjdC5rZXlzKGRpci5vdXRwdXRzKSxcbiAgICAgICAgICAvLyBUT0RPOiBzdXBwb3J0IHF1ZXJpZXNcbiAgICAgICAgICBxdWVyaWVzOiBkaXIucXVlcmllcyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gUmVjb3JkIHRoZSB0eXBlIGNoZWNrIGJsb2NrIG9wZXJhdGlvbiBmb3IgdGhlIHRlbXBsYXRlIGl0c2VsZi5cbiAgICB0aGlzLmFkZFR5cGVDaGVja0Jsb2NrKG5vZGUuZ2V0U291cmNlRmlsZSgpLCBub2RlLCB7XG4gICAgICBib3VuZFRhcmdldCxcbiAgICAgIGZuTmFtZTogYCR7bm9kZS5uYW1lLnRleHR9X1R5cGVDaGVja0Jsb2NrYCxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmQgYSB0eXBlIGNvbnN0cnVjdG9yIGZvciB0aGUgZ2l2ZW4gYG5vZGVgIHdpdGggdGhlIGdpdmVuIGBjdG9yTWV0YWRhdGFgLlxuICAgKi9cbiAgYWRkVHlwZUN0b3Ioc2Y6IHRzLlNvdXJjZUZpbGUsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGN0b3JNZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGFzVHlwZUN0b3Iobm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gTGF6aWx5IGNvbnN0cnVjdCB0aGUgb3BlcmF0aW9uIG1hcC5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpICE7XG5cbiAgICAvLyBQdXNoIGEgYFR5cGVDdG9yT3BgIGludG8gdGhlIG9wZXJhdGlvbiBxdWV1ZSBmb3IgdGhlIHNvdXJjZSBmaWxlLlxuICAgIG9wcy5wdXNoKG5ldyBUeXBlQ3Rvck9wKG5vZGUsIGN0b3JNZXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIGEgYHRzLlNvdXJjZUZpbGVgIGludG8gYSB2ZXJzaW9uIHRoYXQgaW5jbHVkZXMgdHlwZSBjaGVja2luZyBjb2RlLlxuICAgKlxuICAgKiBJZiB0aGlzIHBhcnRpY3VsYXIgc291cmNlIGZpbGUgaGFzIG5vIGRpcmVjdGl2ZXMgdGhhdCByZXF1aXJlIHR5cGUgY29uc3RydWN0b3JzLCBvciBjb21wb25lbnRzXG4gICAqIHRoYXQgcmVxdWlyZSB0eXBlIGNoZWNrIGJsb2NrcywgdGhlbiBpdCB3aWxsIGJlIHJldHVybmVkIGRpcmVjdGx5LiBPdGhlcndpc2UsIGEgbmV3XG4gICAqIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXJzZWQgZnJvbSBtb2RpZmllZCB0ZXh0IG9mIHRoZSBvcmlnaW5hbC4gVGhpcyBpcyBuZWNlc3NhcnkgdG8gZW5zdXJlIHRoZVxuICAgKiBhZGRlZCBjb2RlIGhhcyBjb3JyZWN0IHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gYXNzb2NpYXRlZCB3aXRoIGl0LlxuICAgKi9cbiAgdHJhbnNmb3JtKHNmOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIG9wZXJhdGlvbnMgcGVuZGluZyBmb3IgdGhpcyBwYXJ0aWN1bGFyIGZpbGUsIHJldHVybiBpdCBkaXJlY3RseS5cbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIHNmO1xuICAgIH1cblxuICAgIC8vIEltcG9ydHMgbWF5IG5lZWQgdG8gYmUgYWRkZWQgdG8gdGhlIGZpbGUgdG8gc3VwcG9ydCB0eXBlLWNoZWNraW5nIG9mIGRpcmVjdGl2ZXMgdXNlZCBpbiB0aGVcbiAgICAvLyB0ZW1wbGF0ZSB3aXRoaW4gaXQuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKSwgJ19pJyk7XG5cbiAgICAvLyBFYWNoIE9wIGhhcyBhIHNwbGl0UG9pbnQgaW5kZXggaW50byB0aGUgdGV4dCB3aGVyZSBpdCBuZWVkcyB0byBiZSBpbnNlcnRlZC4gU3BsaXQgdGhlXG4gICAgLy8gb3JpZ2luYWwgc291cmNlIHRleHQgaW50byBjaHVua3MgYXQgdGhlc2Ugc3BsaXQgcG9pbnRzLCB3aGVyZSBjb2RlIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlblxuICAgIC8vIHRoZSBjaHVua3MuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpICEuc29ydChvcmRlck9wcyk7XG4gICAgY29uc3QgdGV4dFBhcnRzID0gc3BsaXRTdHJpbmdBdFBvaW50cyhzZi50ZXh0LCBvcHMubWFwKG9wID0+IG9wLnNwbGl0UG9pbnQpKTtcblxuICAgIC8vIFVzZSBhIGB0cy5QcmludGVyYCB0byBnZW5lcmF0ZSBzb3VyY2UgY29kZS5cbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcih7b21pdFRyYWlsaW5nU2VtaWNvbG9uOiB0cnVlfSk7XG5cbiAgICAvLyBCZWdpbiB3aXRoIHRoZSBpbnRpYWwgc2VjdGlvbiBvZiB0aGUgY29kZSB0ZXh0LlxuICAgIGxldCBjb2RlID0gdGV4dFBhcnRzWzBdO1xuXG4gICAgLy8gUHJvY2VzcyBlYWNoIG9wZXJhdGlvbiBhbmQgdXNlIHRoZSBwcmludGVyIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlIGZvciBpdCwgaW5zZXJ0aW5nIGl0IGludG9cbiAgICAvLyB0aGUgc291cmNlIGNvZGUgaW4gYmV0d2VlbiB0aGUgb3JpZ2luYWwgY2h1bmtzLlxuICAgIG9wcy5mb3JFYWNoKChvcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gb3AuZXhlY3V0ZShpbXBvcnRNYW5hZ2VyLCBzZiwgcHJpbnRlcik7XG4gICAgICBjb2RlICs9IHRleHQgKyB0ZXh0UGFydHNbaWR4ICsgMV07XG4gICAgfSk7XG5cbiAgICAvLyBXcml0ZSBvdXQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpbGUuXG4gICAgbGV0IGltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpID0+IGBpbXBvcnQgKiBhcyAke2kuYXN9IGZyb20gJyR7aS5uYW1lfSc7YClcbiAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgY29kZSA9IGltcG9ydHMgKyAnXFxuJyArIGNvZGU7XG5cbiAgICAvLyBQYXJzZSB0aGUgbmV3IHNvdXJjZSBmaWxlIGFuZCByZXR1cm4gaXQuXG4gICAgcmV0dXJuIHRzLmNyZWF0ZVNvdXJjZUZpbGUoc2YuZmlsZU5hbWUsIGNvZGUsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIGBub2RlYCBoYXMgYSB0eXBlIGNvbnN0cnVjdG9yIGFscmVhZHkuXG4gICAqL1xuICBwcml2YXRlIGhhc1R5cGVDdG9yKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHsgcmV0dXJuIHRoaXMudHlwZUN0b3JzLmhhcyhub2RlKTsgfVxuXG4gIHByaXZhdGUgYWRkVHlwZUNoZWNrQmxvY2soXG4gICAgICBzZjogdHMuU291cmNlRmlsZSwgbm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgdGNiTWV0YTogVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikgITtcbiAgICBvcHMucHVzaChuZXcgVGNiT3Aobm9kZSwgdGNiTWV0YSkpO1xuICB9XG59XG5cbi8qKlxuICogQSBjb2RlIGdlbmVyYXRpb24gb3BlcmF0aW9uIHRoYXQgbmVlZHMgdG8gaGFwcGVuIHdpdGhpbiBhIGdpdmVuIHNvdXJjZSBmaWxlLlxuICovXG5pbnRlcmZhY2UgT3Age1xuICAvKipcbiAgICogVGhlIG5vZGUgaW4gdGhlIGZpbGUgd2hpY2ggd2lsbCBoYXZlIGNvZGUgZ2VuZXJhdGVkIGZvciBpdC5cbiAgICovXG4gIHJlYWRvbmx5IG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb247XG5cbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIHNvdXJjZSB0ZXh0IHdoZXJlIHRoZSBjb2RlIGdlbmVyYXRlZCBieSB0aGUgb3BlcmF0aW9uIHNob3VsZCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHJlYWRvbmx5IHNwbGl0UG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgb3BlcmF0aW9uIGFuZCByZXR1cm4gdGhlIGdlbmVyYXRlZCBjb2RlIGFzIHRleHQuXG4gICAqL1xuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcHJpbnRlcjogdHMuUHJpbnRlcik6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHR5cGUgY2hlY2sgYmxvY2sgb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY2hlY2sgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGNvbXBvbmVudC5cbiAqL1xuY2xhc3MgVGNiT3AgaW1wbGVtZW50cyBPcCB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHJlYWRvbmx5IG1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEpIHt9XG5cbiAgLyoqXG4gICAqIFR5cGUgY2hlY2sgYmxvY2tzIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgZW5kIG9mIHRoZSBjb21wb25lbnQgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5ub2RlLmVuZCArIDE7IH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcHJpbnRlcjogdHMuUHJpbnRlcik6IHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayh0aGlzLm5vZGUsIHRoaXMubWV0YSwgaW0pO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgcmVhZG9ubHkgbWV0YTogVHlwZUN0b3JNZXRhZGF0YSkge31cblxuICAvKipcbiAgICogVHlwZSBjb25zdHJ1Y3RvciBvcGVyYXRpb25zIGFyZSBpbnNlcnRlZCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgZGlyZWN0aXZlIGNsYXNzLlxuICAgKi9cbiAgZ2V0IHNwbGl0UG9pbnQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubm9kZS5lbmQgLSAxOyB9XG5cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHByaW50ZXI6IHRzLlByaW50ZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IHRjYiA9IGdlbmVyYXRlVHlwZUN0b3IodGhpcy5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=