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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/context", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IndexingContext = void 0;
    /**
     * A context for storing indexing infromation about components of a program.
     *
     * An `IndexingContext` collects component and template analysis information from
     * `DecoratorHandler`s and exposes them to be indexed.
     */
    var IndexingContext = /** @class */ (function () {
        function IndexingContext() {
            this.components = new Set();
        }
        /**
         * Adds a component to the context.
         */
        IndexingContext.prototype.addComponent = function (info) {
            this.components.add(info);
        };
        return IndexingContext;
    }());
    exports.IndexingContext = IndexingContext;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5kZXhlci9zcmMvY29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUF3Q0g7Ozs7O09BS0c7SUFDSDtRQUFBO1lBQ1csZUFBVSxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1FBUWpELENBQUM7UUFOQzs7V0FFRztRQUNILHNDQUFZLEdBQVosVUFBYSxJQUFtQjtZQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQztJQVRZLDBDQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0JvdW5kVGFyZ2V0LCBEaXJlY3RpdmVNZXRhLCBQYXJzZVNvdXJjZUZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50TWV0YSBleHRlbmRzIERpcmVjdGl2ZU1ldGEge1xuICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgLyoqXG4gICAqIFVucGFyc2VkIHNlbGVjdG9yIG9mIHRoZSBkaXJlY3RpdmUsIG9yIG51bGwgaWYgdGhlIGRpcmVjdGl2ZSBkb2VzIG5vdCBoYXZlIGEgc2VsZWN0b3IuXG4gICAqL1xuICBzZWxlY3Rvcjogc3RyaW5nfG51bGw7XG59XG5cbi8qKlxuICogQW4gaW50ZXJtZWRpYXRlIHJlcHJlc2VudGF0aW9uIG9mIGEgY29tcG9uZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEluZm8ge1xuICAvKiogQ29tcG9uZW50IFR5cGVTY3JpcHQgY2xhc3MgZGVjbGFyYXRpb24gKi9cbiAgZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb247XG5cbiAgLyoqIENvbXBvbmVudCB0ZW1wbGF0ZSBzZWxlY3RvciBpZiBpdCBleGlzdHMsIG90aGVyd2lzZSBudWxsLiAqL1xuICBzZWxlY3Rvcjogc3RyaW5nfG51bGw7XG5cbiAgLyoqXG4gICAqIEJvdW5kVGFyZ2V0IGNvbnRhaW5pbmcgdGhlIHBhcnNlZCB0ZW1wbGF0ZS4gQ2FuIGFsc28gYmUgdXNlZCB0byBxdWVyeSBmb3IgZGlyZWN0aXZlcyB1c2VkIGluXG4gICAqIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGJvdW5kVGVtcGxhdGU6IEJvdW5kVGFyZ2V0PENvbXBvbmVudE1ldGE+O1xuXG4gIC8qKiBNZXRhZGF0YSBhYm91dCB0aGUgdGVtcGxhdGUgKi9cbiAgdGVtcGxhdGVNZXRhOiB7XG4gICAgLyoqIFdoZXRoZXIgdGhlIGNvbXBvbmVudCB0ZW1wbGF0ZSBpcyBpbmxpbmUgKi9cbiAgICBpc0lubGluZTogYm9vbGVhbjtcblxuICAgIC8qKiBUZW1wbGF0ZSBmaWxlIHJlY29yZGVkIGJ5IHRlbXBsYXRlIHBhcnNlciAqL1xuICAgIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIGNvbnRleHQgZm9yIHN0b3JpbmcgaW5kZXhpbmcgaW5mcm9tYXRpb24gYWJvdXQgY29tcG9uZW50cyBvZiBhIHByb2dyYW0uXG4gKlxuICogQW4gYEluZGV4aW5nQ29udGV4dGAgY29sbGVjdHMgY29tcG9uZW50IGFuZCB0ZW1wbGF0ZSBhbmFseXNpcyBpbmZvcm1hdGlvbiBmcm9tXG4gKiBgRGVjb3JhdG9ySGFuZGxlcmBzIGFuZCBleHBvc2VzIHRoZW0gdG8gYmUgaW5kZXhlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEluZGV4aW5nQ29udGV4dCB7XG4gIHJlYWRvbmx5IGNvbXBvbmVudHMgPSBuZXcgU2V0PENvbXBvbmVudEluZm8+KCk7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21wb25lbnQgdG8gdGhlIGNvbnRleHQuXG4gICAqL1xuICBhZGRDb21wb25lbnQoaW5mbzogQ29tcG9uZW50SW5mbykge1xuICAgIHRoaXMuY29tcG9uZW50cy5hZGQoaW5mbyk7XG4gIH1cbn1cbiJdfQ==