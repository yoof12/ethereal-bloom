export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.2 9.3h3.1l4.4-3.6v12.6l-4.4-3.6H4.2z" />
      {muted ? (
        <path d="M16.2 9.4l4.4 5.2M20.6 9.4l-4.4 5.2" />
      ) : (
        <>
          <path d="M15.4 9a4.4 4.4 0 0 1 0 6" />
          <path d="M18 6.4a8 8 0 0 1 0 11.2" />
        </>
      )}
    </svg>
  );
}
