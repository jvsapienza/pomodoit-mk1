import PomodoroTimer from "@/components/pomodoro-timer";

import { createClient } from '@supabase/auth-js'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul>
      {todos?.map((todo) => (
        <li>{todo}</li>
      ))}
    </ul>
  )
}

export default function Home() {
  return (
    <div>
      <PomodoroTimer />
    </div>
  );
}