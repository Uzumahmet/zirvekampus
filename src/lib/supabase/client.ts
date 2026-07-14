import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Supabase İstemci Taraflı Bağlantısı (Browser Client)
 * -------------------------------------------------------
 * Bu istemci, yalnızca genel okuma işlemleri için kullanılabilir.
 * Yazma işlemleri ve hassas okumalar için sunucu tarafındaki
 * `server.ts` istemcisini (Service Role Key ile) kullanın.
 *
 * Anon Key ile bağlanır — RLS politikalarına tabidir.
 * Not: Bu projede RLS aktif değil; güvenlik Next.js katmanında sağlanıyor.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase Client] NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil. ' +
    '.env.local dosyanızı kontrol edin.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Firebase Auth kullandığımız için Supabase'in kendi auth mekanizmasını devre dışı bırakıyoruz.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
