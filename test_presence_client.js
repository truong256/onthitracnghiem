import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startPresence } from './js/presence.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture({storage = new Map(), fetcher = async()=>({ok:true,json:async()=>({count:3})})}={}) {
  const handlers = {}, timers = new Map(); let next=0;
  const element={dataset:{},textContent:'',title:''};
  const win={crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'},navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:k=>delete handlers[k],setInterval:fn=>{timers.set(++next,fn);return next;},clearInterval:k=>timers.delete(k)};
  const doc={visibilityState:'visible',addEventListener:(k,fn)=>handlers[k]=fn,removeEventListener:k=>delete handlers[k]};
  const calls=[];const fetch=async(...args)=>{calls.push(args);return fetcher(...args);};
  const stop=startPresence({element,window:win,document:doc,fetch});
  return {element,handlers,timers,calls,win,doc,stop};
}
test('shows shared count, keeps browser ID across tabs and refreshes on timer',async()=>{
  const storage=new Map();const one=fixture({storage});await flush();
  assert.equal(one.element.textContent,'3 người online');assert.equal(one.element.dataset.state,'connected');
  const two=fixture({storage});await flush();
  assert.equal(JSON.parse(one.calls[0][1].body).visitorId,JSON.parse(two.calls[0][1].body).visitorId);
  assert.equal(one.calls[0][0],'/api/presence');
  [...one.timers.values()][0]();await flush();assert.equal(one.calls.length,2);
  one.stop();two.stop();assert.equal(one.timers.size,0);assert.equal(Object.keys(one.handlers).length,0);
});
test('errors replace stale count; offline and hidden tabs send no heartbeats; returning resumes',async()=>{
  let failing=false;
  const f=fixture({fetcher:async()=> failing?{ok:false}:{ok:true,json:async()=>({count:1})}});await flush();
  failing=true;[...f.timers.values()][0]();await flush();assert.equal(f.element.textContent,'Online: chưa kết nối');
  const before=f.calls.length;f.doc.visibilityState='hidden';f.handlers.visibilitychange();[...f.timers.values()][0]();await flush();assert.equal(f.calls.length,before);
  f.doc.visibilityState='visible';failing=false;f.handlers.visibilitychange();await flush();assert.equal(f.element.textContent,'1 người online');
  f.win.navigator.onLine=false;f.handlers.offline();[...f.timers.values()][0]();await flush();assert.equal(f.element.textContent,'Online: mất mạng');
  f.win.navigator.onLine=true;f.handlers.online();await flush();assert.equal(f.element.textContent,'1 người online');
  f.handlers.pagehide();assert.equal(f.timers.size,0);f.handlers.pageshow();await flush();assert.equal(f.timers.size,1);
  f.stop();
});
test('slow requests do not overlap and malformed counts never display',async()=>{
  let resolve;const f=fixture({fetcher:()=>new Promise(r=>resolve=r)});[...f.timers.values()][0]();assert.equal(f.calls.length,1);
  resolve({ok:true,json:async()=>({count:-1})});await flush();assert.equal(f.element.textContent,'Online: chưa kết nối');f.stop();
});

test('tabs converge on shared identity after concurrent first-open storage writes',async()=>{
  const storage=new Map();const f=fixture({storage});await flush();
  const canonical='abcdefab-1234-4234-8234-123456789abc';
  storage.set('onthi_online_visitor_v1',canonical);
  f.handlers.storage({key:'onthi_online_visitor_v1'});await flush();
  assert.equal(JSON.parse(f.calls.at(-1)[1].body).visitorId,canonical);
  // A missed storage event still converges on the next periodic heartbeat.
  storage.set('onthi_online_visitor_v1','bbbbbbbb-1234-4234-8234-123456789abc');
  [...f.timers.values()][0]();await flush();
  assert.equal(JSON.parse(f.calls.at(-1)[1].body).visitorId,storage.get('onthi_online_visitor_v1'));
  f.stop();
});
