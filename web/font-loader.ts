import {isHanzi} from './hanzi-data';
import {chineseFontChoices,englishFontChoices,type WebConfig} from './model';

type ChineseFontId=WebConfig['people'][number]['font']['chineseFont'];
type EnglishFontId=WebConfig['people'][number]['font']['englishFont'];

const chineseLoaders:Record<ChineseFontId,()=>Promise<unknown>>={
  'ma-shan-zheng':()=>import('@fontsource/ma-shan-zheng/chinese-simplified-400.css'),
  'zhi-mang-xing':()=>import('@fontsource/zhi-mang-xing/chinese-simplified-400.css'),
  'long-cang':()=>import('@fontsource/long-cang/chinese-simplified-400.css'),
  'liu-jian-mao-cao':()=>import('@fontsource/liu-jian-mao-cao/chinese-simplified-400.css'),
};
const englishLoaders:Record<EnglishFontId,()=>Promise<unknown>>={
  'great-vibes':()=>import('@fontsource/great-vibes/latin-400.css'),
  'tangerine':()=>import('@fontsource/tangerine/latin-400.css'),
  'italianno':()=>import('@fontsource/italianno/latin-400.css'),
  'alex-brush':()=>import('@fontsource/alex-brush/latin-400.css'),
  'caveat':()=>import('@fontsource/caveat/latin-400.css'),
};
const loaded=new Set<string>();

async function loadFamily(family:string,text:string,loader:()=>Promise<unknown>):Promise<void>{
  if(loaded.has(family))return;
  await loader();
  await document.fonts.load(`400 48px "${family}"`,text);
  loaded.add(family);
}

export async function loadConfigFonts(config:WebConfig):Promise<void>{
  if(typeof document==='undefined'||!document.fonts)return;
  const count=config.mode==='couple'?2:1,requests:Promise<void>[]=[];
  for(const person of config.people.slice(0,count)){
    if(person.font.mode!=='font')continue;
    if([...person.name].some(isHanzi)){
      const choice=chineseFontChoices.find(item=>item.id===person.font.chineseFont)!;
      requests.push(loadFamily(choice.family,person.name,chineseLoaders[person.font.chineseFont]));
    }
    if([...person.name].some(char=>/[A-Za-z]/.test(char))){
      const choice=englishFontChoices.find(item=>item.id===person.font.englishFont)!;
      requests.push(loadFamily(choice.family,person.name,englishLoaders[person.font.englishFont]));
    }
  }
  await Promise.all(requests);
  await document.fonts.ready;
}
