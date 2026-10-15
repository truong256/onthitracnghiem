import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from './api/presence.js';

const id = '12345678-1234-4234-8234-123456789abc';
function response() {
  return { headers: {}, setHeader(k,v) {this.headers[k]=v;}, status(n) {this.code=n;return this;}, json(v) {this.body=v;return this;} };
}
const request = body => ({ method: 'POST', headers: { host:'quiz.test', origin:'https://quiz.test' }, body });

test('presence requires POST and valid anonymous UUID', async () => {
  for (const [req,code] of [[{method:'GET',headers:{}},405],[request({visitorId:'bad'}),400],[request('invalid-json'),400],[{...request({visitorId:id}),headers:{'sec-fetch-site':'cross-site'}},403]]) {
    const res=response(); await handler(req,res); assert.equal(res.code,code);
    assert.equal(res.headers['Cache-Control'],'no-store');
  }
});
test('unconfigured server returns unavailable rather than a fake count', async () => {
  const saved={...process.env};
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  try {const res=response(); await handler(request({visitorId:id}),res);assert.equal(res.code,503);assert.equal(res.body.count,undefined);} finally {process.env=saved;}
});
test('shared Redis request is server-only, atomic and isolates previews', async () => {
  const saved={...process.env}, oldFetch=globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL='https://redis.test';process.env.UPSTASH_REDIS_REST_TOKEN='private-token';process.env.VERCEL_ENV='production';
  const calls=[];
  globalThis.fetch=async (url,options) => {calls.push({url,options,command:JSON.parse(options.body)});return {ok:true,json:async()=>({result:2})};};
  try {
    const res=response(); await handler(request({visitorId:id}),res);
    assert.equal(res.code,200);assert.deepEqual(res.body,{count:2});
    const [call]=calls;assert.equal(call.url,'https://redis.test');assert.equal(call.options.headers.Authorization,'Bearer private-token');
    assert.equal(call.command[0],'EVAL');assert.match(call.command[1],/ZREMRANGEBYSCORE/);assert.match(call.command[1],/ZADD/);assert.match(call.command[1],/ZCARD/);assert.match(call.command[1],/EXPIRE/);
    assert.equal(call.command[3].includes('production'),true);
    assert.equal(call.command.includes(id),true);
    process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='preview.test';
    await handler(request({visitorId:id}),response());assert.notEqual(calls[1].command[3],call.command[3]);
    globalThis.fetch=async()=>({ok:false});const fail=response();await handler(request({visitorId:id}),fail);assert.equal(fail.code,503);
    globalThis.fetch=async()=>({ok:true,json:async()=>({result:-1})});const invalid=response();await handler(request({visitorId:id}),invalid);assert.equal(invalid.code,503);
  } finally {globalThis.fetch=oldFetch;process.env=saved;}
});
