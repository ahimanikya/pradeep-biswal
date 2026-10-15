import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestResponses,matchesState,validateResponse} from '../src/review-model.js';
const item={id:'one',version:'v2'};
const response=(extra={})=>({id:'first',itemId:'one',version:'v2',reviewerId:'poet',status:'approved',millis:1,...extra});
test('latest response per reviewer preserves disagreements and detects discussion',()=>{const responses=[response(),response({id:'second',millis:2,status:'keep'}),response({id:'owner',reviewerId:'owner',status:'approved'})];assert.equal(latestResponses(responses,item).length,2);assert.equal(matchesState(item,responses,'poet','discussion'),true);assert.equal(matchesState(item,responses,'poet','approved'),false);});
test('approval of an earlier revision does not count as current approval',()=>{const old=[response({version:'v1'})];assert.equal(matchesState(item,old,'poet','approved'),false);assert.equal(matchesState(item,old,'poet','pending'),true);});
test('latest stale response cannot revive an older approval',()=>{const responses=[response(),response({id:'second',version:'v1',millis:2})];assert.equal(matchesState(item,responses,'poet','pending'),true);});
test('empty suggestions and whitespace-only comments are caught before saving',()=>{assert.ok(validateResponse('comment','   ',''));assert.ok(validateResponse('suggested','','   '));assert.equal(validateResponse('approved','',''),'');assert.equal(validateResponse('suggested','','Alternative'), '');});
