import { BloomExperience } from "@/components/BloomExperience";
import { ExperienceProvider } from "@/lib/experience/ExperienceProvider";

export default function Home() {
  return (
    <main>
      <ExperienceProvider>
        <BloomExperience />
      </ExperienceProvider>
    </main>
  );
}
