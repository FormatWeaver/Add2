
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bwmxfkftczbzfarwaefg.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_8bpAiMhsXX-0APcIunNtEg_CzqwKiTj';

const isPlaceholder = (val: string) => !val || val.includes('YOUR_') || val.length < 10;

const createMockClient = () => {
    return {
        auth: { 
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signInWithPassword: () => Promise.reject(new Error("Cloud unavailable")),
            signUp: () => Promise.reject(new Error("Cloud unavailable")),
            signOut: () => Promise.resolve(),
        },
        from: () => ({
            select: () => ({ 
                eq: () => Promise.resolve({ data: [], error: null }) 
            }),
            upsert: () => Promise.resolve({ error: null }),
            delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
        storage: {
            from: () => ({
                upload: () => Promise.reject(new Error("Cloud storage unavailable")),
                download: () => Promise.reject(new Error("Cloud storage unavailable")),
                list: () => Promise.resolve({ data: [], error: null }),
                remove: () => Promise.resolve({ error: null }),
                getPublicUrl: (path: string) => ({ data: { publicUrl: '' } })
            })
        }
    };
};

let supabase: any;

if (!isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true, // Enable persistence for better UX
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    } catch (e) {
        supabase = createMockClient();
    }
} else {
    supabase = createMockClient();
}

export { supabase };
