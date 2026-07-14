import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Sunucu Taraflı Bağlantısı (Admin/Service Role Client)
 * ---------------------------------------------------------------
 * Bu istemci SADECE sunucu ortamında kullanılmalıdır.
 * Service Role Key ile bağlanır → Tüm RLS politikalarını bypass eder.
 *
 * Tip tanımları için `any` kullanılmıştır çünkü Supabase CLI ile
 * otomatik tip üretimi yapılmamıştır. Prod'a geçmeden önce:
 * `npx supabase gen types typescript --local > src/types/database.types.ts`
 * komutuyla güncelleyin.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    '[Supabase Server] NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlı değil. ' +
    '.env.local dosyanızı kontrol edin.'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient<any>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseAdmin() {
  return createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
