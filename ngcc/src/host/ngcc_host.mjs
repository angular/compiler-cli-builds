/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
export const PRE_R3_MARKER = '__PRE_R3__';
export const POST_R3_MARKER = '__POST_R3__';
export function isSwitchableVariableDeclaration(node) {
    return ts.isVariableDeclaration(node) && !!node.initializer &&
        ts.isIdentifier(node.initializer) && node.initializer.text.endsWith(PRE_R3_MARKER);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvbmdjY19ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBSWpDLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUM7QUFDMUMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQztBQUc1QyxNQUFNLFVBQVUsK0JBQStCLENBQUMsSUFBYTtJQUUzRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVc7UUFDdkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3pGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5cbmV4cG9ydCBjb25zdCBQUkVfUjNfTUFSS0VSID0gJ19fUFJFX1IzX18nO1xuZXhwb3J0IGNvbnN0IFBPU1RfUjNfTUFSS0VSID0gJ19fUE9TVF9SM19fJztcblxuZXhwb3J0IHR5cGUgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB0cy5WYXJpYWJsZURlY2xhcmF0aW9uJntpbml0aWFsaXplcjogdHMuSWRlbnRpZmllcn07XG5leHBvcnQgZnVuY3Rpb24gaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTpcbiAgICBub2RlIGlzIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSAmJiAhIW5vZGUuaW5pdGlhbGl6ZXIgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihub2RlLmluaXRpYWxpemVyKSAmJiBub2RlLmluaXRpYWxpemVyLnRleHQuZW5kc1dpdGgoUFJFX1IzX01BUktFUik7XG59XG5cbi8qKlxuICogVGhlIHN5bWJvbCBjb3JyZXNwb25kaW5nIHRvIGEgXCJjbGFzc1wiIGRlY2xhcmF0aW9uLiBJLmUuIGEgYHRzLlN5bWJvbGAgd2hvc2UgYHZhbHVlRGVjbGFyYXRpb25gIGlzXG4gKiBhIGBDbGFzc0RlY2xhcmF0aW9uYC5cbiAqL1xuZXhwb3J0IHR5cGUgQ2xhc3NTeW1ib2wgPSB0cy5TeW1ib2wme3ZhbHVlRGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb259O1xuXG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYSBjbGFzcyB0aGF0IGFjY291bnRzIGZvciB0aGUgcG90ZW50aWFsIGV4aXN0ZW5jZSBvZiB0d28gYENsYXNzU3ltYm9sYHMgZm9yIGFcbiAqIGdpdmVuIGNsYXNzLCBhcyB0aGUgY29tcGlsZWQgSmF2YVNjcmlwdCBidW5kbGVzIHRoYXQgbmdjYyByZWZsZWN0cyBvbiBjYW4gaGF2ZSB0d28gZGVjbGFyYXRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NDbGFzc1N5bWJvbCB7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIHN5bWJvbCBjb3JyZXNwb25kaW5nIHdpdGggdGhlIG91dGVyIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcy4gVGhpcyBzaG91bGQgYmVcbiAgICogY29uc2lkZXJlZCB0aGUgcHVibGljIGNsYXNzIHN5bWJvbCwgaS5lLiBpdHMgZGVjbGFyYXRpb24gaXMgdmlzaWJsZSB0byB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbS5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiBDbGFzc1N5bWJvbDtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgc3ltYm9sIGNvcnJlc3BvbmRpbmcgd2l0aCB0aGUgaW5uZXIgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzLCByZWZlcnJlZCB0byBhcyBpdHNcbiAgICogXCJpbXBsZW1lbnRhdGlvblwiLiBUaGlzIGlzIG5vdCBuZWNlc3NhcmlseSBhIGBDbGFzc1N5bWJvbGAgYnV0IHJhdGhlciBqdXN0IGEgYHRzLlN5bWJvbGAsIGFzIHRoZVxuICAgKiBpbm5lciBkZWNsYXJhdGlvbiBkb2VzIG5vdCBuZWVkIHRvIHNhdGlzZnkgdGhlIHJlcXVpcmVtZW50cyBpbXBvc2VkIG9uIGEgcHVibGljbHkgdmlzaWJsZSBjbGFzc1xuICAgKiBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGltcGxlbWVudGF0aW9uOiB0cy5TeW1ib2w7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIHN5bWJvbCBjb3JyZXNwb25kaW5nIHRvIGEgdmFyaWFibGUgd2l0aGluIGEgY2xhc3MgSUlGRSB0aGF0IG1heSBiZSB1c2VkIHRvXG4gICAqIGF0dGFjaCBzdGF0aWMgcHJvcGVydGllcyBvciBkZWNvcmF0ZWQuXG4gICAqL1xuICBhZGphY2VudD86IHRzLlN5bWJvbDtcbn1cblxuLyoqXG4gKiBBIHJlZmxlY3Rpb24gaG9zdCB0aGF0IGhhcyBleHRyYSBtZXRob2RzIGZvciBsb29raW5nIGF0IG5vbi1UeXBlc2NyaXB0IHBhY2thZ2UgZm9ybWF0c1xuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFJlZmxlY3Rpb25Ib3N0IHtcbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgZGVjbGFyYXRpb24gdGhhdCB3ZSB0aGluayBpcyBhIGNsYXNzLlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZ1xuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgZGVjbGFyYXRpb24gb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90XG4gICAqIGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgZ2l2ZW4gbW9kdWxlIGZvciB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW4gd2hpY2ggdGhlIGluaXRpYWxpemVyXG4gICAqIGlzIGFuIGlkZW50aWZpZXIgbWFya2VkIHdpdGggdGhlIGBQUkVfUjNfTUFSS0VSYC5cbiAgICogQHBhcmFtIG1vZHVsZSBUaGUgbW9kdWxlIGluIHdoaWNoIHRvIHNlYXJjaCBmb3Igc3dpdGNoYWJsZSBkZWNsYXJhdGlvbnMuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyB0aGF0IG1hdGNoLlxuICAgKi9cbiAgZ2V0U3dpdGNoYWJsZURlY2xhcmF0aW9ucyhtb2R1bGU6IHRzLk5vZGUpOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdO1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYWxsIGRlY29yYXRvcnMgb2YgYSBnaXZlbiBjbGFzcyBzeW1ib2wuXG4gICAqIEBwYXJhbSBzeW1ib2wgQ2xhc3Mgc3ltYm9sIHRoYXQgY2FuIHJlZmVyIHRvIGEgZGVjbGFyYXRpb24gd2hpY2ggY2FuIGhvbGQgZGVjb3JhdG9ycy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgYXJlIGRlY2xhcmVkLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogUmV0cmlldmVzIGFsbCBjbGFzcyBzeW1ib2xzIG9mIGEgZ2l2ZW4gc291cmNlIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSB0byBzZWFyY2ggZm9yIGNsYXNzZXMuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZvdW5kIGNsYXNzIHN5bWJvbHMuXG4gICAqL1xuICBmaW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBOZ2NjQ2xhc3NTeW1ib2xbXTtcblxuICAvKipcbiAgICogRmluZCB0aGUgbGFzdCBub2RlIHRoYXQgaXMgcmVsZXZhbnQgdG8gdGhlIHNwZWNpZmllZCBjbGFzcy5cbiAgICpcbiAgICogQXMgd2VsbCBhcyB0aGUgbWFpbiBkZWNsYXJhdGlvbiwgY2xhc3NlcyBjYW4gaGF2ZSBhZGRpdGlvbmFsIHN0YXRlbWVudHMgc3VjaCBhcyBzdGF0aWNcbiAgICogcHJvcGVydGllcyAoYFNvbWVDbGFzcy5zdGF0aWNQcm9wID0gLi4uO2ApIGFuZCBkZWNvcmF0b3JzIChgX19kZWNvcmF0ZShTb21lQ2xhc3MsIC4uLik7YCkuXG4gICAqIEl0IGlzIHVzZWZ1bCB0byBrbm93IGV4YWN0bHkgd2hlcmUgdGhlIGNsYXNzIFwiZW5kc1wiIHNvIHRoYXQgd2UgY2FuIGluamVjdCBhZGRpdGlvbmFsXG4gICAqIHN0YXRlbWVudHMgYWZ0ZXIgdGhhdCBwb2ludC5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqL1xuICBnZXRFbmRPZkNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5Ob2RlO1xuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgYERlY2xhcmF0aW9uYCBjb3JyZXNwb25kcyB3aXRoIGEga25vd24gZGVjbGFyYXRpb24gYW5kIHNldCBpdHMgYGtub3duYCBwcm9wZXJ0eVxuICAgKiB0byB0aGUgYXBwcm9wcmlhdGUgYEtub3duRGVjbGFyYXRpb25gLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbCBUaGUgYERlY2xhcmF0aW9uYCB0byBjaGVjay5cbiAgICogQHJldHVybiBUaGUgcGFzc2VkIGluIGBEZWNsYXJhdGlvbmAgKHBvdGVudGlhbGx5IGVuaGFuY2VkIHdpdGggYSBgS25vd25EZWNsYXJhdGlvbmApLlxuICAgKi9cbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFQpOiBUO1xufVxuIl19