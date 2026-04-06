import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = 'https://oejkzjqrretdpvmifrcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lamt6anFycmV0ZHB2bWlmcmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTcxMTIsImV4cCI6MjA5MTA3MzExMn0.avAVEXBc8UyFSXVCt3VRQsYkzRum1cafkQUgiTLWz8o';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
