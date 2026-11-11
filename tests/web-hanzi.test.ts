import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  clearHanziData,
  hanziCharacters,
  isHanzi,
  loadHanziData,
  missingHanziCharacters,
  primeHanziData,
  type HanziGlyphData,
} from '../web/hanzi-data';
import {asBrushConfig,defaultWebConfig} from '../web/model';
import {buildWebBrush} from '../web/brush-engine';
import {prepareScene} from '../web/renderer';

function packagedGlyph(char:string):HanziGlyphData{
  const path=new URL(`../node_modules/hanzi-writer-data/${char}.json`,import.meta.url);
  return JSON.parse(readFileSync(path,'utf8'));
}

test.afterEach(()=>clearHanziData());

test('Chinese characters are detected without treating Latin letters as Han',()=>{
  assert.equal(isHanzi('张'),true);
  assert.equal(isHanzi('A'),false);
  assert.deepEqual(hanziCharacters('张A伟 张'),['张','伟']);
});

test('primed glyph data is discoverable and missing characters stay explicit',()=>{
  clearHanziData();
  primeHanziData({'你':packagedGlyph('你')});
  assert.deepEqual(missingHanziCharacters('你A好'),['好']);
  assert.deepEqual(missingHanziCharacters('Alex'),[]);
});

test('the loader fetches each missing Han character once and caches it',async()=>{
  clearHanziData();
  const calls:string[]=[];
  await loadHanziData('你好你',{
    baseUrl:'/assets/hanzi/',
    fetchImpl:async(url)=>{
      calls.push(String(url));
      const char=decodeURIComponent(String(url).slice('/assets/hanzi/'.length,-'.json'.length));
      return new Response(JSON.stringify(packagedGlyph(char)),{status:200});
    },
  });
  assert.deepEqual(calls,['/assets/hanzi/%E4%BD%A0.json','/assets/hanzi/%E5%A5%BD.json']);
  assert.deepEqual(missingHanziCharacters('你好'),[]);
});

test('Chinese strokes come from authored medians while Latin keeps its existing builder',()=>{
  clearHanziData();
  const glyphs={'你':packagedGlyph('你'),'好':packagedGlyph('好')};
  primeHanziData(glyphs);
  const web=defaultWebConfig();web.mode='single';web.people[0].name='Alex 你好';
  const brush=buildWebBrush(asBrushConfig(web.people[0],web),'classic');
  const expected=glyphs['你'].medians.length+glyphs['好'].medians.length;
  assert.equal(brush.strokes.filter(stroke=>stroke.char==='你'||stroke.char==='好').length,expected);
  assert.deepEqual([...new Set(brush.strokes.map(stroke=>stroke.char))],['A','l','e','x','你','好']);
  assert.ok(brush.strokes.every((stroke,index)=>index===0||stroke.start>=brush.strokes[index-1].start));
  assert.ok(brush.strokes.filter(stroke=>stroke.char==='你'||stroke.char==='好').every(stroke=>stroke.position==='han'));
  assert.ok(brush.strokes.filter(stroke=>/[A-Za-z]/.test(stroke.char)).every(stroke=>stroke.position!=='han'));
});

test('a missing Chinese glyph fails clearly instead of drawing a fallback dash',()=>{
  clearHanziData();
  const web=defaultWebConfig();web.mode='single';web.people[0].name='龙';
  assert.throws(()=>buildWebBrush(asBrushConfig(web.people[0],web),'classic'),/缺少笔顺数据/);
});

test('Chinese and mixed names fit every artboard in single and couple modes',()=>{
  clearHanziData();
  primeHanziData({'张':packagedGlyph('张'),'伟':packagedGlyph('伟'),'王':packagedGlyph('王')});
  for(const aspect of ['landscape','portrait','square'] as const)for(const mode of ['single','couple'] as const){
    const web=defaultWebConfig();web.canvas.aspect=aspect;web.mode=mode;web.people[0].name='张伟';web.people[1].name='Alex 王';
    const scene=prepareScene(web);
    assert.equal(scene.people.length,mode==='single'?1:2);
    for(const person of scene.people){
      assert.ok([person.bounds.minX,person.bounds.minY,person.bounds.maxX,person.bounds.maxY].every(Number.isFinite));
      assert.ok(person.bounds.minX>=0&&person.bounds.minY>=0&&person.bounds.maxX<=scene.width&&person.bounds.maxY<=scene.height);
      assert.equal(person.brush.strokes.some(stroke=>stroke.position==='han'),true);
    }
  }
});
