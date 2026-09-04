import Link from "next/link";

export const metadata = {
  title: "Friendly Photo Booth — Admin",
  description:
    "Internal admin dashboard for Friendly Party Rental's photo booth platform.",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/booths", label: "Booths" },
  { href: "/templates", label: "Templates" },
  { href: "/photos", label: "Photos" },
  { href: "/galleries", label: "Galleries" },
  { href: "/customers", label: "Customers" },
  { href: "/employees", label: "Employees" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0b0c10",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
        }}
      >
        <nav
          style={{
            width: "220px",
            flexShrink: 0,
            borderRight: "1px solid #1f2126",
            padding: "24px 16px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "24px" }}>
            <Link href="/" style={{ color: "#f5f5f5", textDecoration: "none" }}>
              Friendly Photo Booth
            </Link>
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{ color: "#c9c9c9", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div style={{ flex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
