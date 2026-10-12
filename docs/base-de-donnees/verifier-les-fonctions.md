# Vérifier que les fonctions de la base s'exécutent vraiment

## Pourquoi

Les contrôles navigateur **simulent** la base : ils répondent eux-mêmes aux
appels `rpc`. Une fonction cassée *en base* leur est donc invisible.

C'est arrivé. Le 12 octobre 2026, les deux fonctions qui relient un parent à
l'enfant de son assistante maternelle échouaient à chaque appel :

- `claim_invite_token` comparait `token` (texte) à un `uuid` : PostgreSQL n'a
  pas cet opérateur ;
- `claim_invitations` appelait `norm_email()`, qui n'existait plus dans aucun
  schéma.

L'application appelait ces fonctions en silence et affichait quand même
« Enfant rattaché à votre espace ✓ ». La date du début de la panne n'est pas
connue : cinq invitations avaient été acceptées en juin et juillet, et les
journaux de la base ne remontent qu'à 24 heures.

## Comment

À lancer dans l'éditeur SQL de Supabase (ou par l'outil `execute_sql`) après
toute modification de fonction. **Rien n'est écrit** : l'extension d'analyse
est installée puis tout est annulé par l'exception finale, qui porte le
résultat.

```sql
do $o$
declare res text := ''; f record; t record; c record; n int := 0;
begin
  execute 'create extension plpgsql_check';
  for f in select p.oid, p.proname from pg_proc p join pg_language l on l.oid = p.prolang
           where p.pronamespace = 'public'::regnamespace and l.lanname = 'plpgsql'
             and p.prorettype <> 'trigger'::regtype loop
    for c in execute 'select level, message from plpgsql_check_function_tb($1, fatal_errors := false, other_warnings := false, performance_warnings := false, extra_warnings := false)' using f.oid loop
      if c.level = 'error' then n := n + 1; res := res || f.proname || ' : ' || c.message || ' || '; end if;
    end loop;
  end loop;
  for t in select distinct tg.tgfoid, tg.tgrelid, p.proname from pg_trigger tg join pg_proc p on p.oid = tg.tgfoid
           join pg_language l on l.oid = p.prolang
           where not tg.tgisinternal and p.pronamespace = 'public'::regnamespace and l.lanname = 'plpgsql' loop
    for c in execute 'select level, message from plpgsql_check_function_tb($1, $2, fatal_errors := false, other_warnings := false, performance_warnings := false, extra_warnings := false)' using t.tgfoid, t.tgrelid loop
      if c.level = 'error' then n := n + 1; res := res || t.proname || ' : ' || c.message || ' || '; end if;
    end loop;
  end loop;
  raise exception 'ANALYSE (annulee) : % erreur(s) : %', n, res;
end $o$;
```

Résultat attendu : `ANALYSE (annulee) : 0 erreur(s)`.

Preuve que l'analyse voit ce genre de panne : sur une copie de l'ancienne
`claim_invitations`, elle rend `function norm_email(text) does not exist` et
`operator does not exist: text = uuid`.

## État au 12 octobre 2026

15 fonctions PL/pgSQL et 7 fonctions de déclencheurs : 0 erreur. Les 6
fonctions SQL de l'application se recréent sans erreur.
