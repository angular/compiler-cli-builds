/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export declare type HrTime = [number, number];
export declare function mark(): HrTime;
export declare function timeSinceInMicros(mark: HrTime): number;
