import { createServerComponentClient } from '@supabase/auth-js'
import { cookies } from 'next/headers'

/**
 * Retorna uma instância do Supabase Client para uso no Server-Side (SSR).
 */
export const createServerSupabaseClient = () => 
  createServerComponentClient<Database>({ cookies })