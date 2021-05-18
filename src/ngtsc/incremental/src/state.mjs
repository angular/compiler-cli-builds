/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Discriminant of the `IncrementalState` union.
 */
export var IncrementalStateKind;
(function (IncrementalStateKind) {
    IncrementalStateKind[IncrementalStateKind["Fresh"] = 0] = "Fresh";
    IncrementalStateKind[IncrementalStateKind["Delta"] = 1] = "Delta";
    IncrementalStateKind[IncrementalStateKind["Analyzed"] = 2] = "Analyzed";
})(IncrementalStateKind || (IncrementalStateKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFTSDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLG9CQUlYO0FBSkQsV0FBWSxvQkFBb0I7SUFDOUIsaUVBQUssQ0FBQTtJQUNMLGlFQUFLLENBQUE7SUFDTCx1RUFBUSxDQUFBO0FBQ1YsQ0FBQyxFQUpXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFJL0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtGaWxlVHlwZUNoZWNraW5nRGF0YX0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL3NyYy9jaGVja2VyJztcbmltcG9ydCB7U2VtYW50aWNEZXBHcmFwaH0gZnJvbSAnLi4vc2VtYW50aWNfZ3JhcGgnO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cbi8qKlxuICogRGlzY3JpbWluYW50IG9mIHRoZSBgSW5jcmVtZW50YWxTdGF0ZWAgdW5pb24uXG4gKi9cbmV4cG9ydCBlbnVtIEluY3JlbWVudGFsU3RhdGVLaW5kIHtcbiAgRnJlc2gsXG4gIERlbHRhLFxuICBBbmFseXplZCxcbn1cblxuLyoqXG4gKiBQbGFjZWhvbGRlciBzdGF0ZSBmb3IgYSBmcmVzaCBjb21waWxhdGlvbiB0aGF0IGhhcyBuZXZlciBiZWVuIHN1Y2Nlc3NmdWxseSBhbmFseXplZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaEluY3JlbWVudGFsU3RhdGUge1xuICBraW5kOiBJbmNyZW1lbnRhbFN0YXRlS2luZC5GcmVzaDtcbn1cblxuLyoqXG4gKiBTdGF0ZSBjYXB0dXJlZCBmcm9tIGEgY29tcGlsYXRpb24gdGhhdCBjb21wbGV0ZWQgYW5hbHlzaXMgc3VjY2Vzc2Z1bGx5LCB0aGF0IGNhbiBzZXJ2ZSBhcyBhXG4gKiBzdGFydGluZyBwb2ludCBmb3IgYSBmdXR1cmUgaW5jcmVtZW50YWwgYnVpbGQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRJbmNyZW1lbnRhbFN0YXRlIHtcbiAga2luZDogSW5jcmVtZW50YWxTdGF0ZUtpbmQuQW5hbHl6ZWQ7XG5cbiAgLyoqXG4gICAqIERlcGVuZGVuY3kgZ3JhcGggZXh0cmFjdGVkIGZyb20gdGhlIGJ1aWxkLCB0byBiZSB1c2VkIHRvIGRldGVybWluZSB0aGUgbG9naWNhbCBpbXBhY3Qgb2ZcbiAgICogcGh5c2ljYWwgZmlsZSBjaGFuZ2VzLlxuICAgKi9cbiAgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGg7XG5cbiAgLyoqXG4gICAqIFRoZSBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoIGZyb20gdGhlIGJ1aWxkLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gcGVyZm9ybSBpbi1kZXB0aCBjb21wYXJpc29uIG9mIEFuZ3VsYXIgZGVjb3JhdGVkIGNsYXNzZXMsIHRvIGRldGVybWluZVxuICAgKiB3aGljaCBmaWxlcyBoYXZlIHRvIGJlIHJlLWVtaXR0ZWQgYW5kL29yIHJlLXR5cGUtY2hlY2tlZC5cbiAgICovXG4gIHNlbWFudGljRGVwR3JhcGg6IFNlbWFudGljRGVwR3JhcGg7XG5cbiAgLyoqXG4gICAqIGBUcmFpdENvbXBpbGVyYCB3aGljaCBjb250YWlucyByZWNvcmRzIG9mIGFsbCBhbmFseXplZCBjbGFzc2VzIHdpdGhpbiB0aGUgYnVpbGQuXG4gICAqL1xuICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuXG4gIC8qKlxuICAgKiBBbGwgZ2VuZXJhdGVkIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZmlsZXMgcHJvZHVjZWQgYXMgcGFydCBvZiB0aGlzIGNvbXBpbGF0aW9uLCBvciBgbnVsbGAgaWZcbiAgICogdHlwZS1jaGVja2luZyB3YXMgbm90ICh5ZXQpIHBlcmZvcm1lZC5cbiAgICovXG4gIHR5cGVDaGVja1Jlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+fG51bGw7XG5cbiAgLyoqXG4gICAqIEN1bXVsYXRpdmUgc2V0IG9mIHNvdXJjZSBmaWxlIHBhdGhzIHdoaWNoIHdlcmUgZGVmaW5pdGl2ZWx5IGVtaXR0ZWQgYnkgdGhpcyBjb21waWxhdGlvbiBvclxuICAgKiBjYXJyaWVkIGZvcndhcmQgZnJvbSBhIHByaW9yIG9uZS5cbiAgICovXG4gIGVtaXR0ZWQ6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBzb3VyY2UgZmlsZSBwYXRocyB0byB0aGUgdmVyc2lvbiBvZiB0aGlzIGZpbGUgYXMgc2VlbiBpbiB0aGUgY29tcGlsYXRpb24uXG4gICAqL1xuICB2ZXJzaW9uczogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+fG51bGw7XG59XG5cbi8qKlxuICogSW5jcmVtZW50YWwgc3RhdGUgZm9yIGEgY29tcGlsYXRpb24gdGhhdCBoYXMgbm90IGJlZW4gc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLCBidXQgdGhhdCBjYW4gYmVcbiAqIGJhc2VkIG9uIGEgcHJldmlvdXMgY29tcGlsYXRpb24gd2hpY2ggd2FzLlxuICpcbiAqIFRoaXMgaXMgdGhlIHN0YXRlIHByb2R1Y2VkIGJ5IGFuIGluY3JlbWVlbnRhbCBjb21waWxhdGlvbiB1bnRpbCBpdHMgb3duIGFuYWx5c2lzIHN1Y2NlZWRzLiBJZlxuICogYW5hbHlzaXMgZmFpbHMsIHRoaXMgc3RhdGUgY2FycmllcyBmb3J3YXJkIGluZm9ybWF0aW9uIGFib3V0IHdoaWNoIGZpbGVzIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGVcbiAqIGxhc3Qgc3VjY2Vzc2Z1bCBidWlsZCAodGhlIGBsYXN0QW5hbHl6ZWRTdGF0ZWApLCBzbyB0aGF0IHRoZSBuZXh0IGluY3JlbWVudGFsIGJ1aWxkIGNhbiBjb25zaWRlclxuICogdGhlIHRvdGFsIGRlbHRhIGJldHdlZW4gdGhlIGBsYXN0QW5hbHl6ZWRTdGF0ZWAgYW5kIHRoZSBjdXJyZW50IHByb2dyYW0gaW4gaXRzIGluY3JlbWVudGFsXG4gKiBhbmFseXNpcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWx0YUluY3JlbWVudGFsU3RhdGUge1xuICBraW5kOiBJbmNyZW1lbnRhbFN0YXRlS2luZC5EZWx0YTtcblxuICAvKipcbiAgICogSWYgYXZhaWxhYmxlLCB0aGUgYEFuYWx5emVkSW5jcmVtZW50YWxTdGF0ZWAgZm9yIHRoZSBtb3N0IHJlY2VudCBhbmNlc3RvciBvZiB0aGUgY3VycmVudFxuICAgKiBwcm9ncmFtIHdoaWNoIHdhcyBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQuXG4gICAqL1xuICBsYXN0QW5hbHl6ZWRTdGF0ZTogQW5hbHl6ZWRJbmNyZW1lbnRhbFN0YXRlO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGBsYXN0QW5hbHl6ZWRTdGF0ZWAgY29tcGlsYXRpb24uXG4gICAqL1xuICBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIFNldCBvZiByZXNvdXJjZSBmaWxlIHBhdGhzIHdoaWNoIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgYGxhc3RBbmFseXplZFN0YXRlYCBjb21waWxhdGlvbi5cbiAgICovXG4gIGNoYW5nZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xufVxuXG4vKipcbiAqIFN0YXRlIHByb2R1Y2VkIGJ5IGEgY29tcGlsYXRpb24gdGhhdCdzIHVzYWJsZSBhcyB0aGUgc3RhcnRpbmcgcG9pbnQgZm9yIGEgc3Vic2VxdWVudCBjb21waWxhdGlvbi5cbiAqXG4gKiBEaXNjcmltaW5hdGVkIGJ5IHRoZSBgSW5jcmVtZW50YWxTdGF0ZUtpbmRgIGVudW0uXG4gKi9cbmV4cG9ydCB0eXBlIEluY3JlbWVudGFsU3RhdGUgPSBBbmFseXplZEluY3JlbWVudGFsU3RhdGV8RGVsdGFJbmNyZW1lbnRhbFN0YXRlfEZyZXNoSW5jcmVtZW50YWxTdGF0ZTtcbiJdfQ==