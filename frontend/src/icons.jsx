const paths = {
  api_keys: 'M14 3a6 6 0 1 1-3.9 10.6L4 20H1v-3l6.4-6.1A6 6 0 0 1 14 3Z M16 7h.01',
  conversations:
    'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H3V6a2 2 0 0 1 2-2Z M7 8h10M7 12h6',
  tickets: 'M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z M15 5v2m0 3v1m0 3v1m0 3v1',
  contacts:
    'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5V3Z M3 7h4M3 12h4M3 17h4 M10 16c0-3 7-3 7 0 M15.5 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  channels:
    'M8 12h8M7 10l10-5M7 14l10 5 M7 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M22 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M22 20a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  pipelines: 'M3 4h5v16H3V4Z M10 4h5v10h-5V4Z M17 4h4v13h-4V4Z',
  ai_agents: 'm12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z M20 2v4m-2-2h4',
  prompts: 'M6 3h9l4 4v14H6V3Z M14 3v5h5M9 12h7M9 16h5',
  tools: 'M14 5a5 5 0 0 0-5 7L3 18a2 2 0 0 0 3 3l6-6a5 5 0 0 0 7-6l-3 3-4-4 3-3Z',
  users:
    'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M5 21v-3a7 7 0 0 1 14 0v3 M18 4a3 3 0 0 1 0 6M20 14a5 5 0 0 1 3 4v3',
  collapse: 'M3 4h18v16H3V4Z M8 4v16m7-11-3 3 3 3',
  expand: 'M3 4h18v16H3V4Z M8 4v16m4-11 3 3-3 3',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  instagram:
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M17.5 6.5h.01',
  whatsapp:
    'M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.6-4.8a8.5 8.5 0 1 1 15.9-4.2Z M8.2 7.3l1.6 2.9-1.1 1.1c.8 1.6 1.9 2.7 3.6 3.5l1.1-1.1 2.9 1.6c-.5 1.5-1.2 1.9-2.5 1.5-4.1-1.3-6.5-3.7-7.2-7.1-.2-1 .3-1.8 1.6-2.4Z',
  email: 'M3 5h18v14H3V5Z m0 1 9 7 9-7',
  inbox: 'M5 4h14l3 10v6H2v-6L5 4Z M2 14h6l2 3h4l2-3h6',
  message: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3V6a2 2 0 0 1 2-2Z',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z m-2 5 6 6',
  chevron: 'm7 10 5 5 5-5',
  check: 'm5 12 4 4L19 6',
  pause: 'M8 5v14M16 5v14',
  play: 'm7 4 13 8-13 8V4Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  edit: 'm15 4 5 5M4 20l1-5L16 4a2 2 0 0 1 4 4L9 19l-5 1Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  info: 'M12 8h.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  arrow_left: 'M20 12H4m6-6-6 6 6 6',
  refresh: 'M20 8a8 8 0 1 0 1 8M20 3v6h-6',
  send: 'm3 3 18 9-18 9 4-9-4-9ZM7 12h14',
  close: 'M6 6l12 12M6 18 18 6',
  lock: 'M6 11h12v10H6V11Z M8 11V7a4 4 0 0 1 8 0v4',
  filters: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  plus: 'M12 5v14M5 12h14',
  arrow_in: 'M19 5 5 19M5 9v10h10',
  arrow_out: 'M5 19 19 5M9 5h10v10',
};

export function Icon({ name, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'grip' ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.message} />
    </svg>
  );
}

export const channelIcon = (kind) =>
  ['instagram', 'whatsapp', 'email'].includes(kind) ? kind : 'channels';

export function ChannelIcon({ kind }) {
  return <Icon name={channelIcon(kind)} className={`channel-icon channel-${channelIcon(kind)}`} />;
}
