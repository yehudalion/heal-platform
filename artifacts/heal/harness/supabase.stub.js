export const isSupabaseConfigured = true;
// Harness stub — fake Supabase for visual testing only.
const d = (y,m,day,h=10)=>new Date(y,m-1,day,h).toISOString();
const ROWS = {
  srs_review_log: [7,8,9,3,4,1].map(x=>({id:'r'+x, reviewed_at:d(2026,9,x), rating:'good'})),
  listening_question_responses: [8,9].map(x=>({id:'l'+x, responded_at:d(2026,9,x), is_correct:true})),
  restatement_attempts: [2,4,7,9].map(x=>({id:'p'+x, attempted_at:d(2026,9,x), is_correct:x%2===0})),
  reading_attempts: [{passage_id:'pa', created_at:d(2026,9,9)}],
  sc_attempts: [{id:'s1', created_at:d(2026,9,8), is_correct:true}],
  user_profiles: [{ user_id:'u1', display_name:'דניאל', exam_date:'2026-10-07', daily_time_minutes:20, onboarding_complete:true,
    created_at:d(2026,8,24), study_plan:{ started_at:d(2026,8,24), update_mode:'auto' }, email_reminders:false, vocab_pool:'core' }],
};
function q(table){
  let rows = ROWS[table] || [];
  const b = {
    select(){return b}, eq(){return b}, gte(){return b}, lte(){return b}, in(){return b}, order(){return b}, limit(n){rows=rows.slice(0,n);return b}, neq(){return b}, lt(){return b}, gt(){return b}, ilike(){return b}, like(){return b}, contains(){return b}, is(){return b}, not(){return b}, or(){return b}, range(){return b}, match(){return b},
    single(){ return Promise.resolve({data: rows[0]||null, error: rows[0]?null:{message:'none'}}) },
    maybeSingle(){ return Promise.resolve({data: rows[0]||null, error:null}) },
    upsert(v){ return { select(){ return { single(){ return Promise.resolve({data:v,error:null}) } } } } },
    insert(){ return Promise.resolve({data:null,error:null}) },
    update(){ return b }, delete(){ return b },
    then(res){ return Promise.resolve({data: rows, error:null}).then(res) },
  };
  return b;
}
export const supabase = {
  from: q,
  rpc: () => Promise.resolve({ data: [], error: null }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: { user: { id:'u1', email:'x@y.z', user_metadata:{ full_name:'דניאל כהן' } } } } }),
    onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    signOut: () => Promise.resolve(),
    signInWithOAuth: () => Promise.resolve({}),
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data:{ publicUrl:'' } }) }) },
};
export function isGuest(){ return false }
export async function getCurrentSession(){ const {data}=await supabase.auth.getSession(); return data.session }
export async function signOut(){}
export function getLevel(){ return null } export function setLevel(){}
