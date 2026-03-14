import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = 'https://heuaskaxlvblmlsisopq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldWFza2F4bHZibG1sc2lzb3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDcwNzIsImV4cCI6MjA4ODk4MzA3Mn0.mEPDtZglc9NEkFt0S9BrhCUM6jIrWYwGixNWkiASOBE';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
