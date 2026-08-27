import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Portfolio workspace",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noarchive: true },
  },
};
const developmentFallback = "v7q4m9x2k8r5p3n6t1w0f4h7c9d2s8j5";
export default async function PrivateEditor({
  params,
}: {
  params: Promise<{ editorRoute: string }>;
}) {
  const { editorRoute } = await params;
  const secret = process.env.PORTFOLIO_EDITOR_SECRET || developmentFallback;
  if (editorRoute !== secret) notFound();
  return <AdminClient editorSecret={secret} />;
}
