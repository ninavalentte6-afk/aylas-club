-- AYLA'S CLUB | Endurecimento de acesso a conteúdos privados
-- Aplicar uma vez no Supabase SQL Editor depois de confirmar as tabelas e buckets existentes.
-- Não apaga dados, utilizadores, planos nem assinaturas.

-- Conteúdos de assinantes só são legíveis com assinatura ativa e válida.
-- Conteúdos "extra" permanecem bloqueados até existir checkout/webhook confiável.
drop policy if exists "read public media or own access" on public.media;
create policy "read public media or own access" on public.media
for select to anon, authenticated
using (
  (published = true and access = 'free' and storage_bucket = 'aylas-public')
  or public.aylas_is_admin()
  or (
    auth.uid() is not null
    and published = true
    and access = 'subs'
    and storage_bucket = 'aylas-private'
    and exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
  )
);

drop policy if exists "read published reels" on public.reels;
create policy "read published reels" on public.reels
for select to anon, authenticated
using (
  (published = true and is_free = true and storage_bucket = 'aylas-public')
  or public.aylas_is_admin()
  or (
    auth.uid() is not null
    and published = true
    and is_free = false
    and storage_bucket = 'aylas-private'
    and exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
  )
);

-- O bucket privado não dá acesso indiscriminado a todos os objetos:
-- o objeto tem de estar associado a uma linha de mídia/reel que o utilizador pode ler.
drop policy if exists "active members read private files" on storage.objects;
create policy "active members read private files" on storage.objects
for select to authenticated
using (
  bucket_id = 'aylas-private'
  and (
    public.aylas_is_admin()
    or exists (
      select 1 from public.media m
      where m.storage_bucket = 'aylas-private'
        and m.storage_path = storage.objects.name
        and m.published = true
        and m.access = 'subs'
        and exists (
          select 1 from public.subscriptions s
          where s.user_id = auth.uid()
            and s.status = 'active'
            and (s.current_period_end is null or s.current_period_end > now())
        )
    )
    or exists (
      select 1 from public.reels r
      where r.storage_bucket = 'aylas-private'
        and r.storage_path = storage.objects.name
        and r.published = true
        and r.is_free = false
        and exists (
          select 1 from public.subscriptions s
          where s.user_id = auth.uid()
            and s.status = 'active'
            and (s.current_period_end is null or s.current_period_end > now())
        )
    )
  )
);

-- Nenhuma política de INSERT para assinaturas é criada para membros.
-- Ativação de assinatura deve ocorrer apenas por ação administrativa controlada
-- ou por função/webhook de servidor após confirmação do gateway.
