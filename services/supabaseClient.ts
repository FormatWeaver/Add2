import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avvkrvdjxruzfyrhorkz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dmtydmRqeHJ1emZ5cmhvcmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUzNjUsImV4cCI6MjA3MjMzMTM2NX0.cMdtzUrtBHG2sVkPi9YuWHMsiJDHJME6NzTjhrnXi6M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
