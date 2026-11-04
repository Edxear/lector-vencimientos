export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#fff" fillOpacity="0.1" />
      <g fill="none" stroke="#9fb8cf" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
        <path d="M88 164V144Q88 128 104 128H128" />
        <path d="M424 164V144Q424 128 408 128H384" />
        <path d="M88 338V358Q88 374 104 374H128" />
        <path d="M424 338V358Q424 374 408 374H384" />
      </g>
      <g fill="#fff">
        {[[110, 16], [132, 8], [146, 8], [160, 24], [190, 8], [204, 16], [226, 8], [240, 24], [270, 16], [292, 8], [306, 8], [320, 16], [342, 24], [372, 8], [386, 16]].map(([x, w]) => (
          <rect key={x} x={x} y="176" width={w} height="150" />
        ))}
      </g>
      <rect x="84" y="246" width="344" height="12" rx="6" fill="#2dd4bf" />
    </svg>
  )
}
