// frontend/src/features/prescriptions/PatientPrescriptionsPage.jsx
import PatientPrescriptionsSection from './PatientPrescriptionsSection';

export default function PatientPrescriptionsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Prescriptions</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Medications prescribed by your care team. Tap a card for details.
        </p>
      </header>
      <PatientPrescriptionsSection />
    </section>
  );
}
