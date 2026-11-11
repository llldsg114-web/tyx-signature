import test from 'node:test';
import assert from 'node:assert/strict';
import {asBrushConfig,defaultWebConfig} from '../web/model';
import {layoutFontText} from '../web/text-layout';
import {prepareScene} from '../web/renderer';
import {clearHanziData} from '../web/hanzi-data';
import {buildWebBrush} from '../web/brush-engine';

test('font layout assigns Chinese and English to their independent font families',()=>{
  const person=defaultWebConfig().people[0];
  person.font={...person.font,mode:'font',chineseFont:'zhi-mang-xing',englishFont:'alex-brush'};
  const layout=layoutFontText('Alex 王',person.font,100,(text,family)=>{
    if(family==='Zhi Mang Xing')return text.length*90;
    return text===' '?25:text.length*55;
  });
  assert.deepEqual(layout.glyphs.map(glyph=>glyph.char),['A','l','e','x',' ','王']);
  assert.ok(layout.glyphs.slice(0,4).every(glyph=>glyph.family==='Alex Brush'));
  assert.equal(layout.glyphs.at(-1)!.family,'Zhi Mang Xing');
  assert.deepEqual(layout.glyphs.map(glyph=>glyph.x),[0,55,110,165,220,245]);
  assert.equal(layout.width,335);
});

test('actual font mode prepares a scene without loading Hanzi stroke data',()=>{
  clearHanziData();
  const config=defaultWebConfig();config.mode='single';config.people[0].name='龙';
  config.people[0].font={...config.people[0].font,mode:'font',chineseFont:'long-cang'};
  const scene=prepareScene(config);
  assert.equal(scene.people.length,1);
  assert.equal(scene.people[0].config.font.mode,'font');
  assert.ok([scene.people[0].bounds.minX,scene.people[0].bounds.maxX].every(Number.isFinite));
});

test('stroke styles change actual brush geometry deterministically',()=>{
  const make=(style:'original'|'neat'|'soft'|'flowing'|'brush')=>{
    const config=defaultWebConfig();config.mode='single';config.people[0].name='Alex';
    config.people[0].font={...config.people[0].font,mode:'stroke',style};
    return buildWebBrush(asBrushConfig(config.people[0],config),'classic');
  };
  const original=make('original'),neat=make('neat'),soft=make('soft'),flowing=make('flowing'),brush=make('brush');
  assert.ok(neat.strokes[0].width<original.strokes[0].width);
  assert.ok(soft.strokes[0].width>original.strokes[0].width);
  assert.ok(brush.strokes[0].width>soft.strokes[0].width);
  const slantIndex=flowing.strokes[0].curve.points.findIndex(point=>point.y!==0);
  const slanted=flowing.strokes[0].curve.points[slantIndex];
  const straight=original.strokes[0].curve.points[slantIndex];
  assert.notDeepEqual(slanted,straight);
  for(const result of [original,neat,soft,flowing,brush]){
    assert.ok([result.box.minX,result.box.minY,result.box.maxX,result.box.maxY].every(Number.isFinite));
  }
});
