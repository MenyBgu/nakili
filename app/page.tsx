import { NakiliApp } from "@/components/nakili-app";

export default function HomePage() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return <NakiliApp supabaseConfigured={supabaseConfigured} />;
}
