/** Stroke-order data sourced from Make Me a Hanzi via hanzi-writer-data. */
export type HanziGlyphData={
  strokes:string[];
  medians:number[][][];
  radStrokes?:number[];
};

type LoadOptions={
  baseUrl?:string;
  fetchImpl?:typeof fetch;
};

const glyphs=new Map<string,HanziGlyphData>();
const pending=new Map<string,Promise<HanziGlyphData>>();
const hanziPattern=/\p{Script=Han}/u;

export function isHanzi(char:string):boolean{
  return hanziPattern.test(char);
}

export function hanziCharacters(value:string):string[]{
  return [...new Set([...value].filter(isHanzi))];
}

export function primeHanziData(data:Record<string,HanziGlyphData>):void{
  for(const [char,glyph] of Object.entries(data)){
    if(!glyph||!Array.isArray(glyph.medians)||!glyph.medians.length)throw new Error(`汉字“${char}”的笔顺数据格式无效`);
    glyphs.set(char,glyph);
  }
}

export function clearHanziData():void{
  glyphs.clear();pending.clear();
}

export function getHanziData(char:string):HanziGlyphData|undefined{
  return glyphs.get(char);
}

export function missingHanziCharacters(value:string):string[]{
  return hanziCharacters(value).filter(char=>!glyphs.has(char));
}

function defaultDataBase():string{
  return `${import.meta.env.BASE_URL}hanzi-data/`;
}

export async function loadHanziData(value:string,options:LoadOptions={}):Promise<void>{
  const baseUrl=options.baseUrl??defaultDataBase();
  const fetchImpl=options.fetchImpl??fetch;
  const missing=missingHanziCharacters(value);
  await Promise.all(missing.map(char=>{
    const active=pending.get(char);
    if(active)return active;
    const request=(async()=>{
      const response=await fetchImpl(`${baseUrl}${encodeURIComponent(char)}.json`);
      if(!response.ok)throw new Error(`汉字“${char}”缺少笔顺数据，请更换姓名或补充该字的数据。`);
      const glyph=await response.json() as HanziGlyphData;
      if(!Array.isArray(glyph.medians)||!glyph.medians.length)throw new Error(`汉字“${char}”的笔顺数据格式无效。`);
      glyphs.set(char,glyph);
      return glyph;
    })().finally(()=>pending.delete(char));
    pending.set(char,request);
    return request;
  }));
}
