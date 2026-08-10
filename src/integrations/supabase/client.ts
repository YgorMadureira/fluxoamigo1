import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = 'https://ojzipcmyafzximnhondm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qemlwY215YWZ6eGltbmhvbmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTIxOTUsImV4cCI6MjEwMTg4ODE5NX0.jC2mx7HHl66CCJoR4briWRmRietNo1uhWMh1NpZP078';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
