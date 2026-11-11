import {isHanzi} from './hanzi-data';
import {chineseFontChoices,englishFontChoices,type WebConfig} from './model';

export type FontTextGlyph={
  char:string;
  family:string;
  kind:'han'|'latin'|'space';
  x:number;
  width:number;
};
export type FontTextLayout={
  glyphs:FontTextGlyph[];
  width:number;
  fontSize:number;
  top:number;
  bottom:number;
};

type FontConfig=WebConfig['people'][number]['font'];
type Measure=(text:string,family:string,size:number)=>number;

function approximateWidth(text:string,size:number):number{
  if(text===' ')return size*.28;
  if(isHanzi(text))return size*.92;
  if(/[ilI1.,'`]/.test(text))return size*.25;
  if(/[mwMW@%]/.test(text))return size*.82;
  if(/[A-Z0-9]/.test(text))return size*.58;
  if(/[\-–—]/.test(text))return size*.48;
  return size*.50;
}

let measurementContext:CanvasRenderingContext2D|null|undefined;
export function measureFontText(text:string,family:string,size:number):number{
  if(measurementContext===undefined){
    const canvas=typeof document==='undefined'?null:document.createElement('canvas');
    measurementContext=canvas?.getContext('2d')??null;
  }
  if(!measurementContext)return approximateWidth(text,size);
  measurementContext.font=`400 ${size}px "${family}"`;
  return Math.max(.01,measurementContext.measureText(text).width);
}

export function fontFamilyForCharacter(char:string,font:FontConfig):Pick<FontTextGlyph,'family'|'kind'>{
  if(isHanzi(char)||char==='·'){
    return {family:chineseFontChoices.find(item=>item.id===font.chineseFont)?.family??'Ma Shan Zheng',kind:'han'};
  }
  if(char===' ')return {family:englishFontChoices.find(item=>item.id===font.englishFont)?.family??'Great Vibes',kind:'space'};
  return {family:englishFontChoices.find(item=>item.id===font.englishFont)?.family??'Great Vibes',kind:'latin'};
}

export function layoutFontText(name:string,font:FontConfig,size=font.size,measure:Measure=measureFontText):FontTextLayout{
  const glyphs:FontTextGlyph[]=[];
  let cursor=0;
  for(const char of name){
    const assigned=fontFamilyForCharacter(char,font),width=Math.max(.01,measure(char,assigned.family,size));
    glyphs.push({char,...assigned,x:cursor,width});
    cursor+=width;
  }
  return {glyphs,width:cursor,fontSize:size,top:-size*.93,bottom:size*.24};
}
