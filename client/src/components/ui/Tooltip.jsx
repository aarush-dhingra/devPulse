import { useState } from "react";

export default function Tooltip({ children, content, side = "top" }) {
  const [show, setShow] = useState(false);

  const positions = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={`absolute z-30 ${positions[side]}
            text-xs whitespace-nowrap rounded-lg px-2 py-1
            bg-bg-deep border border-white/10 text-ink shadow-soft animate-fadeIn`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
