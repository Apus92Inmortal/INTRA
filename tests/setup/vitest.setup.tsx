import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      priority?: boolean;
      fill?: boolean;
    }
  ) => {
    const { priority, fill, ...imgProps } = props;
    void priority;
    void fill;

    // eslint-disable-next-line @next/next/no-img-element
    return <img {...imgProps} alt={imgProps.alt ?? ""} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
