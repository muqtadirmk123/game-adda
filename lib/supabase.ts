import { createClient } from '@supabase/supabase-js';

// Correct API URL (.supabase.co wala)
const supabaseUrl = 'https://lmfrifzbwsmnmxfwywcw.supabase.co';

// Teri exact Anon Key
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZnJpZnpid3Ntbm14Znd5d2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTMzODgsImV4cCI6MjA4OTA2OTM4OH0.YgkoKv0RqjICJY_kppAGuv0L-CjOtI3CUla6By1TE-g';

console.log("Connecting directly to:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);