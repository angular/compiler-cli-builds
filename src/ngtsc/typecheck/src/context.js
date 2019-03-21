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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/context", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_block", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_constructor"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        function TypeCheckContext(refEmitter) {
            this.refEmitter = refEmitter;
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
        TypeCheckContext.prototype.addTemplate = function (node, boundTarget) {
            var _this = this;
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
            var _this = this;
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
                var text = op.execute(importManager, sf, _this.refEmitter, printer);
                code += text + textParts[idx + 1];
            });
            // Write out the imports that need to be added to the beginning of the file.
            var imports = importManager.getAllImports(sf.fileName)
                .map(function (i) { return "import * as " + i.qualifier + " from '" + i.specifier + "';"; })
                .join('\n');
            code = imports + '\n' + code;
            // Parse the new source file and return it.
            return ts.createSourceFile(sf.fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        };
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
        TcbOp.prototype.execute = function (im, sf, refEmitter, printer) {
            var tcb = type_check_block_1.generateTypeCheckBlock(this.node, this.meta, im, refEmitter);
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
        TypeCtorOp.prototype.execute = function (im, sf, refEmitter, printer) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLG1FQUFtRTtJQUVuRSx5RUFBK0M7SUFHL0MsbUdBQTBEO0lBQzFELG1HQUFvRDtJQUlwRDs7Ozs7O09BTUc7SUFDSDtRQUNFLDBCQUFvQixVQUE0QjtZQUE1QixlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUVoRDs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFOSSxDQUFDO1FBUXBEOzs7Ozs7O1dBT0c7UUFDSCxzQ0FBVyxHQUFYLFVBQ0ksSUFBMkMsRUFDM0MsV0FBb0Q7WUFGeEQsaUJBMEJDO1lBdkJDLCtGQUErRjtZQUMvRixXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUN6QyxJQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQTZDLENBQUM7Z0JBQ3RFLHNEQUFzRDtnQkFDdEQsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFO29CQUNqRCxNQUFNLEVBQUUsWUFBWTtvQkFDcEIsMkZBQTJGO29CQUMzRixpRUFBaUU7b0JBQ2pFLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDekQsTUFBTSxFQUFFO3dCQUNOLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7d0JBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFP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RTtZQUN0QyxJQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDZjtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Qm91bmRUYXJnZXR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05vb3BJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi90cmFuc2xhdG9yJztcblxuaW1wb3J0IHtUeXBlQ2hlY2tCbG9ja01ldGFkYXRhLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUN0b3JNZXRhZGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDaGVja0Jsb2NrfSBmcm9tICcuL3R5cGVfY2hlY2tfYmxvY2snO1xuaW1wb3J0IHtnZW5lcmF0ZVR5cGVDdG9yfSBmcm9tICcuL3R5cGVfY29uc3RydWN0b3InO1xuXG5cblxuLyoqXG4gKiBBIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29udGV4dCBmb3IgYSBwcm9ncmFtLlxuICpcbiAqIFRoZSBgVHlwZUNoZWNrQ29udGV4dGAgYWxsb3dzIHJlZ2lzdHJhdGlvbiBvZiBjb21wb25lbnRzIGFuZCB0aGVpciB0ZW1wbGF0ZXMgd2hpY2ggbmVlZCB0byBiZVxuICogdHlwZSBjaGVja2VkLiBJdCBhbHNvIGFsbG93cyBnZW5lcmF0aW9uIG9mIG1vZGlmaWVkIGB0cy5Tb3VyY2VGaWxlYHMgd2hpY2ggY29udGFpbiB0aGUgdHlwZVxuICogY2hlY2tpbmcgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFR5cGVDaGVja0NvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIEEgYE1hcGAgb2YgYHRzLlNvdXJjZUZpbGVgcyB0aGF0IHRoZSBjb250ZXh0IGhhcyBzZWVuIHRvIHRoZSBvcGVyYXRpb25zIChhZGRpdGlvbnMgb2YgbWV0aG9kc1xuICAgKiBvciB0eXBlLWNoZWNrIGJsb2NrcykgdGhhdCBuZWVkIHRvIGJlIGV2ZW50dWFsbHkgcGVyZm9ybWVkIG9uIHRoYXQgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgb3BNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIE9wW10+KCk7XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHRlbXBsYXRlIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50IGBub2RlYCwgd2l0aCBhIGBTZWxlY3Rvck1hdGNoZXJgIGZvciBkaXJlY3RpdmVcbiAgICogbWF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIGNsYXNzIG9mIHRoZSBub2RlIGJlaW5nIHJlY29yZGVkLlxuICAgKiBAcGFyYW0gdGVtcGxhdGUgQVNUIG5vZGVzIG9mIHRoZSB0ZW1wbGF0ZSBiZWluZyByZWNvcmRlZC5cbiAgICogQHBhcmFtIG1hdGNoZXIgYFNlbGVjdG9yTWF0Y2hlcmAgd2hpY2ggdHJhY2tzIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBhZGRUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4sXG4gICAgICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+KTogdm9pZCB7XG4gICAgLy8gR2V0IGFsbCBvZiB0aGUgZGlyZWN0aXZlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgcmVjb3JkIHR5cGUgY29uc3RydWN0b3JzIGZvciBhbGwgb2YgdGhlbS5cbiAgICBib3VuZFRhcmdldC5nZXRVc2VkRGlyZWN0aXZlcygpLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGNvbnN0IGRpck5vZGUgPSBkaXIucmVmLm5vZGUgYXMgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPjtcbiAgICAgIC8vIEFkZCBhIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIGZvciB0aGUgZGlyZWN0aXZlLlxuICAgICAgdGhpcy5hZGRUeXBlQ3RvcihkaXJOb2RlLmdldFNvdXJjZUZpbGUoKSwgZGlyTm9kZSwge1xuICAgICAgICBmbk5hbWU6ICduZ1R5cGVDdG9yJyxcbiAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIHNob3VsZCBoYXZlIGEgYm9keSBpZiB0aGUgZGlyZWN0aXZlIGNvbWVzIGZyb20gYSAudHMgZmlsZSwgYnV0IG5vdCBpZiBpdFxuICAgICAgICAvLyBjb21lcyBmcm9tIGEgLmQudHMgZmlsZS4gLmQudHMgZGVjbGFyYXRpb25zIGRvbid0IGhhdmUgYm9kaWVzLlxuICAgICAgICBib2R5OiAhZGlyTm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJyksXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIGlucHV0czogT2JqZWN0LmtleXMoZGlyLmlucHV0cyksXG4gICAgICAgICAgb3V0cHV0czogT2JqZWN0LmtleXMoZGlyLm91dHB1dHMpLFxuICAgICAgICAgIC8vIFRPRE86IHN1cHBvcnQgcXVlcmllc1xuICAgICAgICAgIHF1ZXJpZXM6IGRpci5xdWVyaWVzLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBSZWNvcmQgdGhlIHR5cGUgY2hlY2sgYmxvY2sgb3BlcmF0aW9uIGZvciB0aGUgdGVtcGxhdGUgaXRzZWxmLlxuICAgIHRoaXMuYWRkVHlwZUNoZWNrQmxvY2sobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5vZGUsIHtcbiAgICAgIGJvdW5kVGFyZ2V0LFxuICAgICAgZm5OYW1lOiBgJHtub2RlLm5hbWUudGV4dH1fVHlwZUNoZWNrQmxvY2tgLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZCBhIHR5cGUgY29uc3RydWN0b3IgZm9yIHRoZSBnaXZlbiBgbm9kZWAgd2l0aCB0aGUgZ2l2ZW4gYGN0b3JNZXRhZGF0YWAuXG4gICAqL1xuICBhZGRUeXBlQ3RvcihcbiAgICAgIHNmOiB0cy5Tb3VyY2VGaWxlLCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgY3Rvck1ldGE6IFR5cGVDdG9yTWV0YWRhdGEpOiB2b2lkIHtcbiAgICAvLyBMYXppbHkgY29uc3RydWN0IHRoZSBvcGVyYXRpb24gbWFwLlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICB0aGlzLm9wTWFwLnNldChzZiwgW10pO1xuICAgIH1cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikgITtcblxuICAgIC8vIFB1c2ggYSBgVHlwZUN0b3JPcGAgaW50byB0aGUgb3BlcmF0aW9uIHF1ZXVlIGZvciB0aGUgc291cmNlIGZpbGUuXG4gICAgb3BzLnB1c2gobmV3IFR5cGVDdG9yT3Aobm9kZSwgY3Rvck1ldGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBgdHMuU291cmNlRmlsZWAgaW50byBhIHZlcnNpb24gdGhhdCBpbmNsdWRlcyB0eXBlIGNoZWNraW5nIGNvZGUuXG4gICAqXG4gICAqIElmIHRoaXMgcGFydGljdWxhciBzb3VyY2UgZmlsZSBoYXMgbm8gZGlyZWN0aXZlcyB0aGF0IHJlcXVpcmUgdHlwZSBjb25zdHJ1Y3RvcnMsIG9yIGNvbXBvbmVudHNcbiAgICogdGhhdCByZXF1aXJlIHR5cGUgY2hlY2sgYmxvY2tzLCB0aGVuIGl0IHdpbGwgYmUgcmV0dXJuZWQgZGlyZWN0bHkuIE90aGVyd2lzZSwgYSBuZXdcbiAgICogYHRzLlNvdXJjZUZpbGVgIGlzIHBhcnNlZCBmcm9tIG1vZGlmaWVkIHRleHQgb2YgdGhlIG9yaWdpbmFsLiBUaGlzIGlzIG5lY2Vzc2FyeSB0byBlbnN1cmUgdGhlXG4gICAqIGFkZGVkIGNvZGUgaGFzIGNvcnJlY3QgcG9zaXRpb25hbCBpbmZvcm1hdGlvbiBhc3NvY2lhdGVkIHdpdGggaXQuXG4gICAqL1xuICB0cmFuc2Zvcm0oc2Y6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gb3BlcmF0aW9ucyBwZW5kaW5nIGZvciB0aGlzIHBhcnRpY3VsYXIgZmlsZSwgcmV0dXJuIGl0IGRpcmVjdGx5LlxuICAgIGlmICghdGhpcy5vcE1hcC5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gc2Y7XG4gICAgfVxuXG4gICAgLy8gSW1wb3J0cyBtYXkgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgZmlsZSB0byBzdXBwb3J0IHR5cGUtY2hlY2tpbmcgb2YgZGlyZWN0aXZlcyB1c2VkIGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIHdpdGhpbiBpdC5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIobmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCAnX2knKTtcblxuICAgIC8vIEVhY2ggT3AgaGFzIGEgc3BsaXRQb2ludCBpbmRleCBpbnRvIHRoZSB0ZXh0IHdoZXJlIGl0IG5lZWRzIHRvIGJlIGluc2VydGVkLiBTcGxpdCB0aGVcbiAgICAvLyBvcmlnaW5hbCBzb3VyY2UgdGV4dCBpbnRvIGNodW5rcyBhdCB0aGVzZSBzcGxpdCBwb2ludHMsIHdoZXJlIGNvZGUgd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuXG4gICAgLy8gdGhlIGNodW5rcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLm9wTWFwLmdldChzZikgIS5zb3J0KG9yZGVyT3BzKTtcbiAgICBjb25zdCB0ZXh0UGFydHMgPSBzcGxpdFN0cmluZ0F0UG9pbnRzKHNmLnRleHQsIG9wcy5tYXAob3AgPT4gb3Auc3BsaXRQb2ludCkpO1xuXG4gICAgLy8gVXNlIGEgYHRzLlByaW50ZXJgIHRvIGdlbmVyYXRlIHNvdXJjZSBjb2RlLlxuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKHtvbWl0VHJhaWxpbmdTZW1pY29sb246IHRydWV9KTtcblxuICAgIC8vIEJlZ2luIHdpdGggdGhlIGludGlhbCBzZWN0aW9uIG9mIHRoZSBjb2RlIHRleHQuXG4gICAgbGV0IGNvZGUgPSB0ZXh0UGFydHNbMF07XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggb3BlcmF0aW9uIGFuZCB1c2UgdGhlIHByaW50ZXIgdG8gZ2VuZXJhdGUgc291cmNlIGNvZGUgZm9yIGl0LCBpbnNlcnRpbmcgaXQgaW50b1xuICAgIC8vIHRoZSBzb3VyY2UgY29kZSBpbiBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjaHVua3MuXG4gICAgb3BzLmZvckVhY2goKG9wLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBvcC5leGVjdXRlKGltcG9ydE1hbmFnZXIsIHNmLCB0aGlzLnJlZkVtaXR0ZXIsIHByaW50ZXIpO1xuICAgICAgY29kZSArPSB0ZXh0ICsgdGV4dFBhcnRzW2lkeCArIDFdO1xuICAgIH0pO1xuXG4gICAgLy8gV3JpdGUgb3V0IHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBhZGRlZCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaWxlLlxuICAgIGxldCBpbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNmLmZpbGVOYW1lKVxuICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaSA9PiBgaW1wb3J0ICogYXMgJHtpLnF1YWxpZmllcn0gZnJvbSAnJHtpLnNwZWNpZmllcn0nO2ApXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIGNvZGUgPSBpbXBvcnRzICsgJ1xcbicgKyBjb2RlO1xuXG4gICAgLy8gUGFyc2UgdGhlIG5ldyBzb3VyY2UgZmlsZSBhbmQgcmV0dXJuIGl0LlxuICAgIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKHNmLmZpbGVOYW1lLCBjb2RlLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVHlwZUNoZWNrQmxvY2soXG4gICAgICBzZjogdHMuU291cmNlRmlsZSwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPixcbiAgICAgIHRjYk1ldGE6IFR5cGVDaGVja0Jsb2NrTWV0YWRhdGEpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMub3BNYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5vcE1hcC5zZXQoc2YsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgb3BzID0gdGhpcy5vcE1hcC5nZXQoc2YpICE7XG4gICAgb3BzLnB1c2gobmV3IFRjYk9wKG5vZGUsIHRjYk1ldGEpKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29kZSBnZW5lcmF0aW9uIG9wZXJhdGlvbiB0aGF0IG5lZWRzIHRvIGhhcHBlbiB3aXRoaW4gYSBnaXZlbiBzb3VyY2UgZmlsZS5cbiAqL1xuaW50ZXJmYWNlIE9wIHtcbiAgLyoqXG4gICAqIFRoZSBub2RlIGluIHRoZSBmaWxlIHdoaWNoIHdpbGwgaGF2ZSBjb2RlIGdlbmVyYXRlZCBmb3IgaXQuXG4gICAqL1xuICByZWFkb25seSBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+O1xuXG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBzb3VyY2UgdGV4dCB3aGVyZSB0aGUgY29kZSBnZW5lcmF0ZWQgYnkgdGhlIG9wZXJhdGlvbiBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gICAqL1xuICByZWFkb25seSBzcGxpdFBvaW50OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIG9wZXJhdGlvbiBhbmQgcmV0dXJuIHRoZSBnZW5lcmF0ZWQgY29kZSBhcyB0ZXh0LlxuICAgKi9cbiAgZXhlY3V0ZShpbTogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaW50ZXI6IHRzLlByaW50ZXIpOlxuICAgICAgc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdHlwZSBjaGVjayBibG9jayBvcGVyYXRpb24gd2hpY2ggcHJvZHVjZXMgdHlwZSBjaGVjayBjb2RlIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICovXG5jbGFzcyBUY2JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCByZWFkb25seSBtZXRhOiBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhKSB7XG4gIH1cblxuICAvKipcbiAgICogVHlwZSBjaGVjayBibG9ja3MgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBlbmQgb2YgdGhlIGNvbXBvbmVudCBjbGFzcy5cbiAgICovXG4gIGdldCBzcGxpdFBvaW50KCk6IG51bWJlciB7IHJldHVybiB0aGlzLm5vZGUuZW5kICsgMTsgfVxuXG4gIGV4ZWN1dGUoaW06IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcmludGVyOiB0cy5QcmludGVyKTpcbiAgICAgIHN0cmluZyB7XG4gICAgY29uc3QgdGNiID0gZ2VuZXJhdGVUeXBlQ2hlY2tCbG9jayh0aGlzLm5vZGUsIHRoaXMubWV0YSwgaW0sIHJlZkVtaXR0ZXIpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHR5cGUgY29uc3RydWN0b3Igb3BlcmF0aW9uIHdoaWNoIHByb2R1Y2VzIHR5cGUgY29uc3RydWN0b3IgY29kZSBmb3IgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuY2xhc3MgVHlwZUN0b3JPcCBpbXBsZW1lbnRzIE9wIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBub2RlOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+LCByZWFkb25seSBtZXRhOiBUeXBlQ3Rvck1ldGFkYXRhKSB7fVxuXG4gIC8qKlxuICAgKiBUeXBlIGNvbnN0cnVjdG9yIG9wZXJhdGlvbnMgYXJlIGluc2VydGVkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBkaXJlY3RpdmUgY2xhc3MuXG4gICAqL1xuICBnZXQgc3BsaXRQb2ludCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5ub2RlLmVuZCAtIDE7IH1cblxuICBleGVjdXRlKGltOiBJbXBvcnRNYW5hZ2VyLCBzZjogdHMuU291cmNlRmlsZSwgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpbnRlcjogdHMuUHJpbnRlcik6XG4gICAgICBzdHJpbmcge1xuICAgIGNvbnN0IHRjYiA9IGdlbmVyYXRlVHlwZUN0b3IodGhpcy5ub2RlLCB0aGlzLm1ldGEpO1xuICAgIHJldHVybiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdGNiLCBzZik7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBvcGVyYXRpb25zIGFuZCByZXR1cm4gdGhlaXIgc3BsaXQgcG9pbnQgb3JkZXJpbmcuXG4gKi9cbmZ1bmN0aW9uIG9yZGVyT3BzKG9wMTogT3AsIG9wMjogT3ApOiBudW1iZXIge1xuICByZXR1cm4gb3AxLnNwbGl0UG9pbnQgLSBvcDIuc3BsaXRQb2ludDtcbn1cblxuLyoqXG4gKiBTcGxpdCBhIHN0cmluZyBpbnRvIGNodW5rcyBhdCBhbnkgbnVtYmVyIG9mIHNwbGl0IHBvaW50cy5cbiAqL1xuZnVuY3Rpb24gc3BsaXRTdHJpbmdBdFBvaW50cyhzdHI6IHN0cmluZywgcG9pbnRzOiBudW1iZXJbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc3BsaXRzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBvaW50ID0gcG9pbnRzW2ldO1xuICAgIHNwbGl0cy5wdXNoKHN0ci5zdWJzdHJpbmcoc3RhcnQsIHBvaW50KSk7XG4gICAgc3RhcnQgPSBwb2ludDtcbiAgfVxuICBzcGxpdHMucHVzaChzdHIuc3Vic3RyaW5nKHN0YXJ0KSk7XG4gIHJldHVybiBzcGxpdHM7XG59XG4iXX0=