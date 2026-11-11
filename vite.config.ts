import {defineConfig} from 'vite';
import {cp,readFile} from 'node:fs/promises';
import {extname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const hanziSource=fileURLToPath(new URL('./node_modules/hanzi-writer-data/',import.meta.url));

function hanziDataPlugin(){
  let outputDirectory='dist';
  return {
    name:'tyx-hanzi-data',
    configResolved(config:{root:string;build:{outDir:string}}){
      outputDirectory=resolve(config.root,config.build.outDir);
    },
    configureServer(server:{middlewares:{use:(handler:(request:{url?:string;method?:string},response:{setHeader:(name:string,value:string)=>void;end:(body?:unknown)=>void;statusCode:number},next:()=>void)=>void)=>void}}){
      server.middlewares.use((request,response,next)=>{
        const pathname=request.url?.split('?')[0]??'';
        if(!pathname.startsWith('/hanzi-data/'))return next();
        const file=decodeURIComponent(pathname.slice('/hanzi-data/'.length));
        if(!/^\p{Script=Han}\.json$/u.test(file)&&file!=='ARPHICPL.TXT')return next();
        void readFile(join(hanziSource,file)).then(body=>{
          response.setHeader('Content-Type',file.endsWith('.json')?'application/json; charset=utf-8':'text/plain; charset=utf-8');
          response.setHeader('Cache-Control','public, max-age=31536000, immutable');
          response.end(body);
        }).catch(()=>next());
      });
    },
    async closeBundle(){
      await cp(hanziSource,join(outputDirectory,'hanzi-data'),{
        recursive:true,
        filter:source=>source===hanziSource||extname(source)==='.json'||source.endsWith('ARPHICPL.TXT'),
      });
    },
  };
}

export default defineConfig({
  base:'./',
  plugins:[hanziDataPlugin()],
  build:{target:'es2022',outDir:'dist',chunkSizeWarningLimit:800},
  server:{port:5173,strictPort:true,fs:{deny:['**/.work/**','**/.runtime/**','**/workspaces/**','**/字体配套源码/**','**/.env*','**/.git/**','**/*.{crt,pem}']}},
});
