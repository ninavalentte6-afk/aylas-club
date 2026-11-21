(function(){
  if (!window.supabase || !window.AYLAS_SUPABASE_URL || !window.AYLAS_SUPABASE_KEY) {
    window.AYLAS_DB_ERROR = 'Biblioteca ou credenciais do Supabase não carregadas.'; return;
  }
  const client = window.supabase.createClient(window.AYLAS_SUPABASE_URL, window.AYLAS_SUPABASE_KEY);
  window.AYLAS_DB = {
    client,
    async session(){ const {data,error}=await client.auth.getSession(); if(error) throw error; return data.session; },
    async isAdmin(){
      const session=await this.session(); if(!session) return false;
      const {data,error}=await client.from('profiles').select('is_admin').eq('id',session.user.id).single();
      if(error) throw error; return !!data?.is_admin;
    },
    async load(){
      const [settings,plans,media,reels]=await Promise.all([
        client.from('site_settings').select('*').eq('id',1).maybeSingle(),
        client.from('plans').select('*').order('sort_order'),
        client.from('media').select('*').eq('published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
        client.from('reels').select('*').eq('published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false})
      ]);
      for(const r of [settings,plans,media,reels]) if(r.error) throw r.error;
      return {settings:settings.data,plans:plans.data||[],media:media.data||[],reels:reels.data||[]};
    },
    async loadAdmin(){
      const [settings,plans,media,reels]=await Promise.all([
        client.from('site_settings').select('*').eq('id',1).maybeSingle(),
        client.from('plans').select('*').order('sort_order'),
        client.from('media').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false}),
        client.from('reels').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false})
      ]);
      for(const r of [settings,plans,media,reels]) if(r.error) throw r.error;
      return {settings:settings.data,plans:plans.data||[],media:media.data||[],reels:reels.data||[]};
    },
    async subscriptions(){
      const {data,error}=await client.from('subscriptions').select('id,user_id,plan_id,status,current_period_end,created_at').order('created_at',{ascending:false});
      if(error) throw error;
      const rows=data||[], userIds=[...new Set(rows.map(x=>x.user_id))], planIds=[...new Set(rows.map(x=>x.plan_id).filter(Boolean))];
      const [profiles,plans]=await Promise.all([
        userIds.length?client.from('profiles').select('id,display_name').in('id',userIds):Promise.resolve({data:[],error:null}),
        planIds.length?client.from('plans').select('id,name').in('id',planIds):Promise.resolve({data:[],error:null})
      ]);
      if(profiles.error) throw profiles.error; if(plans.error) throw plans.error;
      const pm=new Map((profiles.data||[]).map(x=>[x.id,x.display_name||'Utilizador']));
      const pl=new Map((plans.data||[]).map(x=>[x.id,x.name]));
      return rows.map(x=>({...x,effective_status:x.status==='active'&&x.current_period_end&&new Date(x.current_period_end)<=new Date()?'expired':x.status,member_name:pm.get(x.user_id)||x.user_id,plan_name:pl.get(x.plan_id)||'Plano removido'}));
    },
    async saveSettings(s){const r=await client.from('site_settings').upsert({id:1,name:s.name,handle:s.handle,bio:s.bio,accent:s.accent,banner:s.banner,metrics:Array.isArray(s.metrics)?s.metrics:[],content:s.content&&typeof s.content==='object'?s.content:{},updated_at:new Date().toISOString()});if(r.error)throw r.error;},
    async savePlans(plans){
      const {data:old,error}=await client.from('plans').select('id'); if(error) throw error;
      const ids=plans.filter(p=>p.id && /^[0-9a-f-]{36}$/i.test(p.id)).map(p=>p.id);
      // Não apagar planos antigos: podem estar ligados a assinaturas históricas.
      for(let i=0;i<plans.length;i++){const p=plans[i],row={name:p.name,description:p.desc||'',price:Number(p.price)||0,months:Number(p.months)||1,active:!!p.active,sort_order:i};
        row.id=(p.id&&/^[0-9a-f-]{36}$/i.test(p.id))?p.id:crypto.randomUUID(); const r=await client.from('plans').upsert(row).select().single(); if(r.error)throw r.error; p.id=r.data.id;
      }
    },
    async saveMediaRows(rows){ for(const m of rows){ if(!m.id || !/^[0-9a-f-]{36}$/i.test(m.id)) continue; const wanted=m.access==='free'?'aylas-public':'aylas-private'; if(m.storage_bucket!==wanted){const dl=await client.storage.from(m.storage_bucket).download(m.storage_path);if(dl.error)throw dl.error;const newPath=m.storage_path.replace(/^.*\//,'')+'-'+Date.now();const up=await client.storage.from(wanted).upload(newPath,dl.data,{upsert:false});if(up.error)throw up.error;const rm=await client.storage.from(m.storage_bucket).remove([m.storage_path]);if(rm.error)throw rm.error;m.storage_bucket=wanted;m.storage_path=newPath;} const r=await client.from('media').update({title:m.title,type:m.type,album:m.album,access:m.access,price:Number(m.price)||0,is_new:!!m.isNew,storage_bucket:m.storage_bucket,storage_path:m.storage_path,preview_bucket:m.preview_bucket||null,preview_path:m.preview_path||null,published:m.published!==false,sort_order:Number(m.sort_order)||0}).eq('id',m.id); if(r.error)throw r.error; } },
    async saveReelRows(rows){ for(const r0 of rows){ if(!r0.id || !/^[0-9a-f-]{36}$/i.test(r0.id)) continue; const wanted=r0.free?'aylas-public':'aylas-private'; if(r0.storage_bucket!==wanted){const dl=await client.storage.from(r0.storage_bucket).download(r0.storage_path);if(dl.error)throw dl.error;const newPath=r0.storage_path.replace(/^.*\//,'')+'-'+Date.now();const up=await client.storage.from(wanted).upload(newPath,dl.data,{upsert:false});if(up.error)throw up.error;const rm=await client.storage.from(r0.storage_bucket).remove([r0.storage_path]);if(rm.error)throw rm.error;r0.storage_bucket=wanted;r0.storage_path=newPath;} const r=await client.from('reels').update({title:r0.title,is_free:!!r0.free,storage_bucket:r0.storage_bucket,storage_path:r0.storage_path,published:r0.published!==false,sort_order:Number(r0.sort_order)||0}).eq('id',r0.id); if(r.error)throw r.error; } },
    async makeBlurPreview(file){
      if(!file.type.startsWith('image/')) return null;
      const objectUrl=URL.createObjectURL(file);
      try{
        const img=new Image(); img.src=objectUrl; await img.decode();
        const scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext('2d');ctx.filter='blur(12px)';ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.58));
        return blob;
      }finally{URL.revokeObjectURL(objectUrl);}
    },
    async uploadMedia(file,meta,isReel=false){
      const session=await this.session(); if(!session) throw new Error('Faça login.');
      const privateFile=isReel?!meta.free:meta.access!=='free'; const bucket=privateFile?'aylas-private':'aylas-public';
      const clean=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-');
      const path=`${session.user.id}/${Date.now()}-${clean}`;
      const up=await client.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type}); if(up.error) throw up.error;
      let preview_bucket=null,preview_path=null;
      if(!isReel && privateFile && file.type.startsWith('image/')){
        try{
          const blob=await this.makeBlurPreview(file);
          if(blob){preview_bucket='aylas-public';preview_path=`previews/${session.user.id}/${Date.now()}-preview.jpg`;
            const pu=await client.storage.from(preview_bucket).upload(preview_path,blob,{upsert:false,contentType:'image/jpeg'});
            if(pu.error) throw pu.error;
          }
        }catch(err){await client.storage.from(bucket).remove([path]);throw new Error('Não foi possível criar a prévia desfocada: '+err.message);}
      }
      const table=isReel?'reels':'media';
      const maxQ=await client.from(table).select('sort_order').order('sort_order',{ascending:false}).limit(1);
      if(maxQ.error && !/sort_order/i.test(maxQ.error.message)) { await client.storage.from(bucket).remove([path]); throw maxQ.error; }
      const nextOrder=(maxQ.data?.[0]?.sort_order||0)+1;
      const row=isReel?{title:meta.title,storage_bucket:bucket,storage_path:path,is_free:!!meta.free,published:true,sort_order:nextOrder}:{title:meta.title,type:file.type.startsWith('video/')?'video':'photo',album:meta.album||'Novidades',access:meta.access||'subs',price:Number(meta.price)||0,storage_bucket:bucket,storage_path:path,preview_bucket,preview_path,is_new:true,published:true,sort_order:nextOrder};
      const ins=await client.from(table).insert(row).select().single();
      if(ins.error){await client.storage.from(bucket).remove([path]);if(preview_path)await client.storage.from(preview_bucket).remove([preview_path]);throw ins.error;} return ins.data;
    },
    async removeMedia(row,isReel=false){
      const table=isReel?'reels':'media'; const r=await client.from(table).delete().eq('id',row.id);if(r.error)throw r.error;
      if(row.storage_bucket&&row.storage_path){const d=await client.storage.from(row.storage_bucket).remove([row.storage_path]);if(d.error)console.warn(d.error);}if(row.preview_bucket&&row.preview_path){const d=await client.storage.from(row.preview_bucket).remove([row.preview_path]);if(d.error)console.warn(d.error);}
    },
    async backfillBlurPreviews(rows){
      let count=0;
      for(const row of rows.filter(x=>x.access!=='free'&&x.type==='photo'&&x.storage_bucket==='aylas-private'&&x.storage_path&&!x.preview_path)){
        const dl=await client.storage.from(row.storage_bucket).download(row.storage_path);if(dl.error)throw dl.error;
        const blob=await this.makeBlurPreview(dl.data);if(!blob)continue;
        const session=await this.session();const previewPath=`previews/${session.user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
        const up=await client.storage.from('aylas-public').upload(previewPath,blob,{upsert:false,contentType:'image/jpeg'});if(up.error)throw up.error;
        const upd=await client.from('media').update({preview_bucket:'aylas-public',preview_path:previewPath}).eq('id',row.id);
        if(upd.error){await client.storage.from('aylas-public').remove([previewPath]);throw upd.error;}
        row.preview_bucket='aylas-public';row.preview_path=previewPath;count++;
      }
      return count;
    },
    async mediaUrl(row){
      if(row.storage_bucket==='aylas-public') return client.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data.publicUrl;
      const {data,error}=await client.storage.from(row.storage_bucket).createSignedUrl(row.storage_path,1800); if(error)throw error; return data.signedUrl;
    }
  };
})();
