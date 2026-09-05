-- ============================================================================
-- סימולציות שבת (5.9.2026): 20 טפסים מלאים (sim-2..sim-21) + 20 קצרים (short-1..short-20)
-- דטרמיניסטי: כל מאגר מעורבב לפי md5(id||'shabbat-2026-09-05') ונצרך לפי הסדר.
-- אפס חפיפה בין הטפסים ומול sim-1 (הפריטים של sim-1 מוחרגים מהמאגרים).
-- ============================================================================
do $$
declare
  seed constant text := 'shabbat-2026-09-05';
  f int; v_fid uuid; v_code text; v_ord int;
  v_d int; v_lec uuid; q record; v_pid uuid;
  cont_pattern int[];
begin
  -- ---------- מאגרים (temp) ----------
  create temp table pool_sc on commit drop as
    select id, difficulty_pos as d, row_number() over (partition by difficulty_pos order by md5(id::text||seed)) rn
    from sentence_completion_questions where is_published
      and id not in (select item_id from simulation_form_items where item_kind='sc');
  create temp table pool_rs on commit drop as
    select id, difficulty_level as d, row_number() over (partition by difficulty_level order by md5(id::text||seed)) rn
    from restatement_questions where is_published
      and id not in (select item_id from simulation_form_items where item_kind='restatement');
  create temp table pool_rp on commit drop as
    select id, difficulty as d, row_number() over (partition by difficulty order by md5(id::text||seed)) rn
    from reading_passages p where is_published
      and (select count(*) from reading_questions rq where rq.passage_id=p.id and rq.is_published) = 5
      and id not in (select rq.passage_id from simulation_form_items i join reading_questions rq on rq.id=i.item_id where i.item_kind='reading');
  create temp table pool_cont on commit drop as
    select id, difficulty as d, row_number() over (partition by difficulty order by md5(id::text||seed)) rn
    from listening_lectures where is_published and item_type='continuation'
      and id not in (select lecture_id from simulation_form_items where lecture_id is not null);
  create temp table pool_lqa on commit drop as
    select id, difficulty as d, row_number() over (partition by difficulty order by md5(id::text||seed)) rn
    from listening_lectures where is_published and item_type='lecture_qa'
      and id not in (select lecture_id from simulation_form_items where lecture_id is not null);
  create temp table cur (pool text, dd int, n int default 0, primary key(pool,dd)) on commit drop;

  -- ---------- 20 טפסים מלאים ----------
  for f in 2..21 loop
    v_code := 'sim-'||f;
    select id into v_fid from simulation_forms where simulation_forms.code = v_code;
    if v_fid is null then
      insert into simulation_forms(code,title,subtitle,total_questions,estimated_minutes,is_published)
        values (v_code, 'סימולציה מלאה '||(f-1), 'שמונה פרקים במבנה הבחינה, שעון נפרד לכל פרק', 32, 48, true) returning id into v_fid;
    else
      delete from simulation_form_items where form_id=v_fid;
      delete from simulation_form_sections where form_id=v_fid;
      update simulation_forms set title='סימולציה מלאה '||(f-1), subtitle='שמונה פרקים במבנה הבחינה, שעון נפרד לכל פרק',
        total_questions=32, estimated_minutes=48, is_published=true where id=v_fid;
    end if;

    insert into simulation_form_sections(form_id,section_no,section_kind,title,time_limit_seconds,is_pilot,time_source) values
      (v_fid,1,'sc','השלמת משפטים',240,false,'sourced'),
      (v_fid,2,'sc','השלמת משפטים',240,false,'sourced'),
      (v_fid,3,'reading','הבנת הנקרא',900,false,'sourced'),
      (v_fid,4,'restatement','ניסוח מחדש',360,false,'sourced'),
      (v_fid,5,'restatement','ניסוח מחדש',360,false,'sourced'),
      (v_fid,6,'sc','השלמת משפטים',240,false,'sourced'),
      (v_fid,7,'continuation','השלמת קטע',360,true,'estimate'),
      (v_fid,8,'lecture_qa','קטעי שמיעה',420,true,'estimate');

    v_ord := 0;
    -- פרקים 1,2,6: השלמת משפטים
    foreach v_d in array array[1,2,3,4] loop v_ord:=v_ord+1;
      insert into cur values('sc',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,1,'sc','sc',id,v_d from pool_sc where pool_sc.d=v_d and rn=(select n from cur where pool='sc' and cur.dd=v_d);
    end loop;
    foreach v_d in array array[3,4,5,6] loop v_ord:=v_ord+1;
      insert into cur values('sc',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,2,'sc','sc',id,v_d from pool_sc where pool_sc.d=v_d and rn=(select n from cur where pool='sc' and cur.dd=v_d);
    end loop;
    -- פרק 3: קטע קריאה אחד (קושי 4 בזוגי, 5 באי-זוגי) — 5 שאלות
    v_d := case when f % 2 = 0 then 4 else 5 end;
    insert into cur values('rp',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
    select id into v_pid from pool_rp where pool_rp.d=v_d and rn=(select n from cur where pool='rp' and cur.dd=v_d);
    for q in select id from reading_questions where passage_id=v_pid and is_published order by display_order, created_at loop
      v_ord:=v_ord+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty) values (v_fid,v_ord,3,'reading','reading',q.id,v_d);
    end loop;
    -- פרקים 4,5: ניסוח מחדש
    foreach v_d in array array[2,3,4] loop v_ord:=v_ord+1;
      insert into cur values('rs',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,4,'restatement','restatement',id,v_d from pool_rs where pool_rs.d=v_d and rn=(select n from cur where pool='rs' and cur.dd=v_d);
    end loop;
    foreach v_d in array array[3,4,5] loop v_ord:=v_ord+1;
      insert into cur values('rs',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,5,'restatement','restatement',id,v_d from pool_rs where pool_rs.d=v_d and rn=(select n from cur where pool='rs' and cur.dd=v_d);
    end loop;
    foreach v_d in array array[5,6,7,8] loop v_ord:=v_ord+1;
      insert into cur values('sc',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,6,'sc','sc',id,v_d from pool_sc where pool_sc.d=v_d and rn=(select n from cur where pool='sc' and cur.dd=v_d);
    end loop;
    -- פרק 7: השלמת קטע — 4 הרצאות, שאלה אחת כל אחת. המאגר ברמות 4-5 קטן (16+4),
    -- ולכן 15 הטפסים הראשונים מקבלים (2,3,3,4) וחמשת האחרונים (2,2,2,3).
    cont_pattern := case when f <= 16 then array[2,3,3,4] else array[2,2,2,3] end;
    foreach v_d in array cont_pattern loop
      insert into cur values('cont',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      select id into v_lec from pool_cont where pool_cont.d=v_d and rn=(select n from cur where pool='cont' and cur.dd=v_d);
      for q in select id from listening_questions where lecture_id=v_lec order by display_order, created_at limit 1 loop
        v_ord:=v_ord+1;
        insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,lecture_id,difficulty) values (v_fid,v_ord,7,'continuation','listening',q.id,v_lec,v_d);
      end loop;
    end loop;
    -- פרק 8: קטעי שמיעה — 3 הרצאות בסולם עולה (2→1 שאלה, 3→2, 4→2)
    foreach v_d in array array[2,3,4] loop
      insert into cur values('lqa',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      select id into v_lec from pool_lqa where pool_lqa.d=v_d and rn=(select n from cur where pool='lqa' and cur.dd=v_d);
      for q in select id from listening_questions where lecture_id=v_lec order by display_order, created_at loop
        v_ord:=v_ord+1;
        insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,lecture_id,difficulty) values (v_fid,v_ord,8,'lecture_qa','listening',q.id,v_lec,v_d);
      end loop;
    end loop;
    update simulation_forms set total_questions=v_ord where id=v_fid;
  end loop;

  -- ---------- 20 טפסים קצרים ----------
  for f in 1..20 loop
    v_code := 'short-'||f;
    insert into simulation_forms(code,title,subtitle,total_questions,estimated_minutes,is_published)
      values (v_code, 'סימולציה קצרה '||f, 'שלושה פרקים, כרבע שעה — השלמת משפטים, ניסוח מחדש וקטע שמיעה', 12, 17, true) returning id into v_fid;
    insert into simulation_form_sections(form_id,section_no,section_kind,title,time_limit_seconds,is_pilot,time_source) values
      (v_fid,1,'sc','השלמת משפטים',360,false,'sourced'),
      (v_fid,2,'restatement','ניסוח מחדש',480,false,'sourced'),
      (v_fid,3,'lecture_qa','קטע שמיעה',180,true,'estimate');
    v_ord := 0;
    foreach v_d in array array[1,2,3,4,5,6] loop v_ord:=v_ord+1;
      insert into cur values('sc',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,1,'sc','sc',id,v_d from pool_sc where pool_sc.d=v_d and rn=(select n from cur where pool='sc' and cur.dd=v_d);
    end loop;
    foreach v_d in array array[2,3,4,5] loop v_ord:=v_ord+1;
      insert into cur values('rs',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,difficulty)
        select v_fid,v_ord,2,'restatement','restatement',id,v_d from pool_rs where pool_rs.d=v_d and rn=(select n from cur where pool='rs' and cur.dd=v_d);
    end loop;
    v_d := 3;
    insert into cur values('lqa',v_d,1) on conflict(pool,dd) do update set n=cur.n+1;
    select id into v_lec from pool_lqa where pool_lqa.d=v_d and rn=(select n from cur where pool='lqa' and cur.dd=v_d);
    for q in select id from listening_questions where lecture_id=v_lec order by display_order, created_at loop
      v_ord:=v_ord+1;
      insert into simulation_form_items(form_id,item_order,section_no,section_kind,item_kind,item_id,lecture_id,difficulty) values (v_fid,v_ord,3,'lecture_qa','listening',q.id,v_lec,v_d);
    end loop;
    update simulation_forms set total_questions=v_ord where id=v_fid;
  end loop;
end $$;
