import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestResponses,matchesState,validateResponse} from '../src/review-model.js';
const item={id:'one',version:'v2'};
const response=(extra={})=>({id:'first',itemId:'one',version:'v2',reviewerId:'poet',status:'approved',millis:1,...extra});
test('latest response per reviewer preserves disagreements and detects discussion',()=>{const responses=[response(),response({id:'second',millis:2,status:'keep'}),response({id:'owner',reviewerId:'owner',status:'approved'})];assert.equal(latestResponses(responses,item).length,2);assert.equal(matchesState(item,responses,'poet','discussion'),true);assert.equal(matchesState(item,responses,'poet','approved'),false);});
test('approval of an earlier revision does not count as current approval',()=>{const old=[response({version:'v1'})];assert.equal(matchesState(item,old,'poet','approved'),false);assert.equal(matchesState(item,old,'poet','pending'),true);});
test('latest stale response cannot revive an older approval',()=>{const responses=[response(),response({id:'second',version:'v1',millis:2})];assert.equal(matchesState(item,responses,'poet','pending'),true);});
test('empty suggestions and whitespace-only comments are caught before saving',()=>{assert.ok(validateResponse('comment','   ',''));assert.ok(validateResponse('suggested','','   '));assert.equal(validateResponse('approved','',''),'');assert.equal(validateResponse('suggested','','Alternative'), '');});

import {adjacentReviewItem} from '../src/review-model.js';
test('item navigation crosses chapters in sequence and stops at either end',()=>{
 const items=[{id:'a',order:0,articleId:'one'},{id:'b',order:1,articleId:'one'},{id:'c',order:2,articleId:'two'}];
 assert.equal(adjacentReviewItem(items,items[1],1).id,'c');
 assert.equal(adjacentReviewItem(items,items[2],-1).id,'b');
 assert.equal(adjacentReviewItem(items,items[0],-1),null);
 assert.equal(adjacentReviewItem(items,items[2],1),null);
});
test('saving an item in the pending filter does not skip the next remaining item',()=>{
 const current={id:'saved',order:3};const pending=[{id:'earlier',order:1},{id:'next',order:4},{id:'later',order:7}];
 assert.equal(adjacentReviewItem(pending,current,1).id,'next');
 assert.equal(adjacentReviewItem(pending,current,-1).id,'earlier');
 assert.equal(adjacentReviewItem([],current,1),null);
});

import {matchesReviewArea} from '../src/review-model.js';
test('review areas retain legacy editorial items and separate artwork decisions',()=>{
 assert.equal(matchesReviewArea({id:'old'},'editorial'),true);
 assert.equal(matchesReviewArea({id:'old'},'artwork'),false);
 assert.equal(matchesReviewArea({reviewArea:'artwork'},'editorial'),false);
 assert.equal(matchesReviewArea({reviewArea:'artwork'},'artwork'),true);
 assert.equal(matchesReviewArea({reviewArea:'artwork'},'all'),true);
});
