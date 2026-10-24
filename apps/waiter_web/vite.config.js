var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { assertProjectEnv, FIREBASE_KEYS } from '../../scripts/vite-env-guard';
export default defineConfig(function (_a) {
    var command = _a.command, mode = _a.mode;
    if (command === 'build')
        assertProjectEnv('waiter_web', mode, loadEnv(mode, __dirname, 'VITE_'), __spreadArray([], FIREBASE_KEYS, true));
    return {
        plugins: [react()],
        server: { port: 5178 },
    };
});
