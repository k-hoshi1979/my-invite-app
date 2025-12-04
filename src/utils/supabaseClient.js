import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ▼▼ 追加：ターミナルに中身を表示させる ▼▼
console.log("-----------------------------------")
console.log("DEBUG CHECK:")
console.log("URL:", supabaseUrl)
console.log("KEY:", supabaseKey)
console.log("-----------------------------------")
// ▲▲ 追加ここまで ▲▲

// URLがない場合はエラーになるので、一時的に空文字を入れてクラッシュを防ぐ
export const supabase = createClient(supabaseUrl || "", supabaseKey || "")