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
        client.from('media').select('*').eq('published',true).order('created_at',{ascending:false}),
        client.from('reels').select('*').eq('published',true).order('created_at',{ascending:false})
      ]);
      for(const r of [settings,plans,media,reels]) if(r.error) throw r.error;
      return {settings:settings.data,plans:plans.data||[],media:media.data||[],reels:reels.data||[]};
    },
    async saveSettings(s){const r=await client.from('site_settings').upsert({id:1,name:s.name,handle:s.handle,bio:s.bio,accent:s.accent,banner:s.banner,updated_at:new Date().toISOString()});if(r.error)throw r.error;},
    async savePlans(plans){
      const {data:old,error}=await client.from('plans').select('id'); if(error) throw error;
      const ids=plans.filter(p=>p.id && /^[0-9a-f-]{36}$/i.test(p.id)).map(p=>p.id);
      const gone=(old||[]).filter(x=>!ids.includes(x.id));
      if(gone.length){const r=await client.from('plans').delete().in('id',gone.map(x=>x.id));if(r.error)throw r.error;}
      for(let i=0;i<plans.length;i++){const p=plans[i],row={name:p.name,description:p.desc||'',price:Number(p.price)||0,months:Number(p.months)||1,active:!!p.active,sort_order:i};
        row.id=(p.id&&/^[0-9a-f-]{36}$/i.test(p.id))?p.id:crypto.randomUUID(); const r=await client.from('plans').upsert(row).select().single(); if(r.error)throw r.error; p.id=r.data.id;
      }
    },
    async saveMediaRows(rows){ for(const m of rows){ if(!m.id || !/^[0-9a-f-]{36}$/i.test(m.id)) continue; const wanted=m.access==='free'?'aylas-public':'aylas-private'; if(m.storage_bucket!==wanted){const dl=await client.storage.from(m.storage_bucket).download(m.storage_path);if(dl.error)throw dl.error;const newPath=m.storage_path.replace(/^.*\//,'')+'-'+Date.now();const up=await client.storage.from(wanted).upload(newPath,dl.data,{upsert:false});if(up.error)throw up.error;const rm=await client.storage.from(m.storage_bucket).remove([m.storage_path]);if(rm.error)throw rm.error;m.storage_bucket=wanted;m.storage_path=newPath;} const r=await client.from('media').update({title:m.title,type:m.type,album:m.album,access:m.access,price:Number(m.price)||0,is_new:!!m.isNew,storage_bucket:m.storage_bucket,storage_path:m.storage_path,published:true}).eq('id',m.id); if(r.error)throw r.error; } },
    async saveReelRows(rows){ for(const r0 of rows){ if(!r0.id || !/^[0-9a-f-]{36}$/i.test(r0.id)) continue; const wanted=r0.free?'aylas-public':'aylas-private'; if(r0.storage_bucket!==wanted){const dl=await client.storage.from(r0.storage_bucket).download(r0.storage_path);if(dl.error)throw dl.error;const newPath=r0.storage_path.replace(/^.*\//,'')+'-'+Date.now();const up=await client.storage.from(wanted).upload(newPath,dl.data,{upsert:false});if(up.error)throw up.error;const rm=await client.storage.from(r0.storage_bucket).remove([r0.storage_path]);if(rm.error)throw rm.error;r0.storage_bucket=wanted;r0.storage_path=newPath;} const r=await client.from('reels').update({title:r0.title,is_free:!!r0.free,storage_bucket:r0.storage_bucket,storage_path:r0.storage_path,published:true}).eq('id',r0.id); if(r.error)throw r.error; } },
    async uploadMedia(file,meta,isReel=false){
      const session=await this.session(); if(!session) throw new Error('Faça login.');
      const privateFile=isReel?!meta.free:meta.access!=='free'; const bucket=privateFile?'aylas-private':'aylas-public';
      const clean=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-');
      const path=`${session.user.id}/${Date.now()}-${clean}`;
      const up=await client.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type}); if(up.error) throw up.error;
      const row=isReel?{title:meta.title,storage_bucket:bucket,storage_path:path,is_free:!!meta.free,published:true}:{title:meta.title,type:file.type.startsWith('video/')?'video':'photo',album:meta.album||'Novidades',access:meta.access||'subs',price:Number(meta.price)||0,storage_bucket:bucket,storage_path:path,is_new:true,published:true};
      const ins=await client.from(isReel?'reels':'media').insert(row).select().single();
      if(ins.error){await client.storage.from(bucket).remove([path]);throw ins.error;} return ins.data;
    },
    async removeMedia(row,isReel=false){
      const table=isReel?'reels':'media'; const r=await client.from(table).delete().eq('id',row.id);if(r.error)throw r.error;
      if(row.storage_bucket&&row.storage_path){const d=await client.storage.from(row.storage_bucket).remove([row.storage_path]);if(d.error)console.warn(d.error);}
    },
    async mediaUrl(row){
      if(row.storage_bucket==='aylas-public') return client.storage.from(row.storage_bucket).getPublicUrl(row.storage_path).data.publicUrl;
      const {data,error}=await client.storage.from(row.storage_bucket).createSignedUrl(row.storage_path,300); if(error)throw error; return data.signedUrl;
    }
  };
})();
