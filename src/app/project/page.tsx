import type { Metadata } from "next";
import Projects from "../projects/page";
export const metadata: Metadata = {
  title: "Projects",
  alternates: { canonical: "/projects/" },
  robots: { index: false, follow: true },
};
export default Projects;
