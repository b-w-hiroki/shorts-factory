const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync,mkdirSync}=require('node:fs');
const assert=require('node:assert/strict');
const html=readFileSync(require('node:path').join(__dirname,'../index.html'));
const server=createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);}else res.writeHead(404).end();});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext();
  const outbound=[],errors=[];
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin===new URL(url).origin)return route.continue();
   outbound.push(route.request().url()); return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});await page.goto(url);
  assert.match(await page.locator('#research-title').innerText(),/実走査なし/);
  assert.match(await page.locator('#generator .demo-note').innerText(),/未検証の下書き/);
  await page.locator('#generate-btn').click();
  assert.match(await page.locator('#status-text').innerText(),/入力してください/);
  await page.locator('#product-url').fill('https://example.invalid/products/test-widget');
  await page.locator('#detail-toggle').click();
  await page.locator('#product-name').fill('テスト用の架空商品');
  await page.locator('#product-features').fill('検証用の説明');
  await page.locator('#generate-btn').click();
  await page.waitForFunction(()=>document.querySelector('#status-text').textContent.includes('下書き完成'));
  assert.equal(await page.locator('.gen-card.filled').count(),3);
  assert.match(await page.locator('#schedule').innerText(),/予約・投稿なし/);
  for(const id of ['a','b','c']) assert.ok((await page.locator('#card-'+id+' .script-line').count())>3);
  mkdirSync('qa-artifacts',{recursive:true});
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(width===390) assert.equal(await page.evaluate(()=>document.querySelector('#schedule').getBoundingClientRect().top>=document.querySelector('.gen-grid').getBoundingClientRect().bottom && document.querySelector('footer').getBoundingClientRect().top>=document.querySelector('main').getBoundingClientRect().bottom),true);
   await page.screenshot({path:`qa-artifacts/shorts-${width}.png`,fullPage:true});
  }
  await page.locator('#history-btn').click();assert.ok(await page.locator('#history-list').innerText());
  assert.deepEqual(outbound,[]);assert.deepEqual(errors,[]);
  console.log('PASS: offline three-script generation, disclosures, empty input, history, no outbound requests, 390/1280 overflow');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
