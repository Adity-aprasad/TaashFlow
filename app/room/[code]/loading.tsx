export default function RoomLoading() {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-muted)] font-[var(--font-body)]">
          Joining room...
        </p>
      </div>
    </div>
  )
}