import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:fs.existsSync(edge)?{executablePath:edge}:{})});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('little-math-garden-v1')));
await page.goto(url);
for(const [width,height] of [[360,640],[390,844],[800,480],[1024,600],[1024,768],[1280,800]]){
 await page.setViewportSize({width,height});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow ${width}`);
 await page.screenshot({path:`test-results/home-${width}.png`,fullPage:true});
}
await page.setViewportSize({width:1024,height:768});
await page.getByRole('button',{name:'开始今天的练习'}).click();
assert.equal((await state()).session.level,'star');
const original=(await state()).session.questions;
for(const [width,height] of [[360,640],[390,844],[800,480],[1024,600],[1024,768],[1280,800]]){
 await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`quiz overflow ${width}`);
 await page.screenshot({path:`test-results/quiz-${width}.png`,fullPage:true});
}
await page.setViewportSize({width:1024,height:768});
await page.keyboard.type('999');await page.keyboard.press('Enter');
assert.equal((await state()).session.attempts[0],999);
await page.reload();assert.deepEqual((await state()).session.questions,original);assert.equal((await state()).session.attempts[0],999);
let answer=original[0].answer;await page.keyboard.type(String(answer));await page.keyboard.press('Enter');await page.getByRole('button',{name:'下一题',exact:true}).click();
await page.reload();assert.equal((await state()).session.index,1);
await page.getByRole('button',{name:'看图想一想'}).click();await page.getByRole('dialog').waitFor();await page.screenshot({path:'test-results/explanation.png'});await page.keyboard.press('Escape');
for(let i=1;i<18;i++){
 const q=(await state()).session.questions[i];
 if(i===2){await page.keyboard.type('999');await page.keyboard.press('Enter');await page.keyboard.type('998');await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}
 else{await page.keyboard.type(String(q.answer));await page.keyboard.press('Enter');}
 await page.getByRole('button',{name:i===17?'看看我的收获':'下一题',exact:true}).click();
}
await page.getByRole('heading',{name:'你的小花，开啦！'}).waitFor();
const complete=await state();assert.equal(complete.flowers,1);assert.equal(complete.session.records.length,18);
await page.screenshot({path:'test-results/results.png',fullPage:true});await page.reload();assert.equal((await state()).flowers,1);await page.getByRole('heading',{name:'你的小花，开啦！'}).waitFor();
await page.getByRole('button',{name:'回到花园'}).click();await page.getByRole('button',{name:'选一选',exact:true}).click();await page.getByRole('button',{name:'15 题',exact:true}).click();await page.getByRole('button',{name:'开始今天的练习'}).click();
for(let i=0;i<15;i++){const q=(await state()).session.questions[i];await page.getByRole('button',{name:String(q.answer),exact:true}).click();await page.getByRole('button',{name:i===14?'看看我的收获':'下一题',exact:true}).click();}
assert.equal((await state()).flowers,2);
await page.getByRole('button',{name:'家长设置'}).click();await page.getByRole('button',{name:'清空本机进度'}).click();await page.getByRole('button',{name:'确定清空'}).click();assert.equal((await state()).flowers,0);
await page.evaluate(()=>localStorage.setItem('little-math-garden-v1','{"version":1,"session":{}}'));await page.reload();await page.getByRole('button',{name:'开始今天的练习'}).waitFor();
const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked storage');};});const blockedPage=await blocked.newPage();await blockedPage.goto(url);await blockedPage.getByRole('button',{name:'开始今天的练习'}).click();await blockedPage.getByRole('heading',{name:'这道题，你会吗？'}).waitFor();await blockedPage.getByText('浏览器暂时无法保存',{exact:false}).waitFor();await blocked.close();
assert.deepEqual(errors,[]);console.log('PASS: six responsive sizes; full keypad and choice sessions; retries, hints, revealed answer, persistence, scoring, reset, corrupt and blocked storage; no browser errors.');await browser.close();
