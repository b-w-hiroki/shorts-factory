const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
test('visible research, generation and schedule labels disclose their limits', () => {
  assert.match(html, /走査デモ・実走査なし/);
  assert.match(html, /台本は未検証の下書き/);
  assert.match(html, /商品ページ本文は取得していません/);
  assert.match(html, /SCHEDULE 投稿候補（予約・投稿なし）/);
  assert.match(html, /入力 URL・商品名・特徴を Anthropic に送信/);
  assert.doesNotMatch(html, /投稿枠を自動予約しました|商品ページを走査中/);
});
test('every idle message remains explicit about simulation', () => {
  const source = html.match(/const idleStatuses = (\[[\s\S]*?\]);/)[1];
  const messages = vm.runInNewContext(source);
  for (const message of messages) assert.match(message, /デモ|シミュレーション|実動画は解析していません/);
});
test('all inline JavaScript remains syntactically valid', () => {
  for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script);
});
