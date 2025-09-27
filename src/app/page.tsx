import React from "react";

export default function Page() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Spaces</h1>
      <p>Welcome. Visit the realtime agents demo:</p>
      <p>
        <a href="/demo" style={{ color: "#2563eb" }}>
          Go to /demo
        </a>
      </p>
      <p>
        If you were redirected here after login, go back to <a href="/demo" style={{ color: "#2563eb" }}>/demo</a>.
      </p>
    </div>
  );
}
