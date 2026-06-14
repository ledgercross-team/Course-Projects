// frontend/src/features/dashboard/DashboardPage.jsx
import DashboardProfileCard from '@/features/profile/DashboardProfileCard';

export default function DashboardPage({ title, description }) {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
        )}
      </header>
      <DashboardProfileCard />
    </section>
  );
}
