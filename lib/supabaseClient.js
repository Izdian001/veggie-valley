import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient("https://kfdxewdjfdpjqxmswurb.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZHhld2RqZmRwanF4bXN3dXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODg5NjQsImV4cCI6MjA3MDQ2NDk2NH0.LWX5ditKVBtlIdZlcXVnEAIEEe6nJDkzE2v-Suj6Q_I")
