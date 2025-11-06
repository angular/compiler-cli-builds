/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Logger, LogLevel } from '../..';
export declare class MockLogger implements Logger {
    level: LogLevel;
    constructor(level?: LogLevel);
    logs: {
        [P in Exclude<keyof Logger, 'level'>]: string[][];
    };
    debug(...args: string[]): void;
    info(...args: string[]): void;
    warn(...args: string[]): void;
    error(...args: string[]): void;
}
