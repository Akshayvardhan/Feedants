import assert from 'node:assert/strict';
import { currentStatusForTest } from './test-utils';

assert.equal(currentStatusForTest(new Date(Date.now() - 1000), new Date(Date.now() + 1000)), 'open');
assert.equal(currentStatusForTest(new Date(Date.now() + 1000), new Date(Date.now() + 2000)), 'upcoming');
assert.equal(currentStatusForTest(new Date(Date.now() - 2000), new Date(Date.now() - 1000)), 'closed');
console.log('competition lifecycle tests passed');
