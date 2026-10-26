import css from '@/components/dashboard.module.css';
import type { FormSection } from '@/components/form-section';

type FormSectionsProps = {
  sections: FormSection[];
};

/** Web groups the trade setup into cards. Plain sections keep their own chrome. */
export function FormSections({ sections }: FormSectionsProps) {
  return (
    <div className={css.stack}>
      {sections.map((section) =>
        section.plain ? (
          <div key={section.key} className={css.plain}>
            {section.children}
          </div>
        ) : (
          <section key={section.key} className={css.card}>
            <h2 className={css.kicker}>{section.title}</h2>
            {section.children}
          </section>
        ),
      )}
    </div>
  );
}
