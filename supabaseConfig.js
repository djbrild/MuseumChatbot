const supabaseUrl = 'https://wrxslyxgyofcddtvhrgs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyeHNseXhneW9mY2RkdHZocmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzOTc4NTQsImV4cCI6MjA2Mzk3Mzg1NH0.NKjSiJP4lNNtJq2Z2wn80X-X6jaN0yqBSRSsIC_ehOk';

console.log('Initializing Supabase...');
if (!window.supabase) {
    console.error('Supabase client not loaded!');
} else {
    console.log('Creating Supabase client...');
    window.supabaseInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created:', window.supabaseInstance);
}
