import { LANGUAGES, type Lang } from '@ks1j/shared';

import { Choice } from '@/components/ui';
import { useT } from '@/lib/i18n';

/** Four large chips, each language written in its own script, with the English name underneath. */
export function LanguagePicker() {
  const { lang, setLang, t } = useT();
  return (
    <Choice<Lang>
      label={t('common.language')}
      value={lang}
      onChange={(v) => void setLang(v)}
      options={LANGUAGES.map((l) => ({ value: l.code, label: l.name, note: l.code === 'en' ? undefined : l.english }))}
    />
  );
}
