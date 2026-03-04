import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tuuctsouyazvyxlcwsnf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dWN0c291eWF6dnl4bGN3c25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTU2NjksImV4cCI6MjA4ODE5MTY2OX0.YGgNv-BdSrYTa6sxP14N9QwVI3cSykTP-IrBUMQmb7s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
