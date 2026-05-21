import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://hndsnoindoixrigcbivd.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q';

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function checkColumns() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('User object keys:', Object.keys(data[0] || {}));
    }
}

checkColumns();
